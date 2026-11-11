import type { RawDB } from "../../../db/runtime.ts";
import { isSocialMediaKey, socialMediaPath } from "../../social-media-key.ts";

type Part = { partNumber: number; etag: string; bytes: number; checksum: string };
type Upload = { uploadId: string; uploadPart(number: number, bytes: ArrayBuffer): Promise<{etag:string}>; complete(parts:{partNumber:number;etag:string}[]):Promise<unknown>; abort():Promise<unknown> };
export type ArchiveBucket = {
  put(key:string,bytes:ArrayBuffer,options:unknown):Promise<unknown>;
  head?(key:string):Promise<{size:number}|null>;
  get?(key:string):Promise<{body:ReadableStream<Uint8Array>}|null>;
  createMultipartUpload?(key:string,options:unknown):Promise<Upload>;
  resumeMultipartUpload?(key:string,id:string):Upload;
};
type State = { key:string; uploadId:string; size:number; type:string; parts:Part[] };
const partSize=8*1024*1024;
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const settingKey=(key:string)=>"source-archive:media:"+key;
const hash=async(bytes:ArrayBuffer)=>Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),value=>value.toString(16).padStart(2,"0")).join("");
export function validMediaBytes(type:string,bytes:Uint8Array){
  const ascii=(start:number,end:number)=>String.fromCharCode(...bytes.slice(start,end));
  return type==="image/jpeg"?bytes[0]===255&&bytes[1]===216:type==="image/png"?bytes[0]===137&&ascii(1,4)==="PNG":type==="image/webp"?ascii(0,4)==="RIFF"&&ascii(8,12)==="WEBP":type==="video/mp4"?ascii(4,8)==="ftyp":type==="video/webm"&&ascii(0,4)==="\x1aE\xdf\xa3";
}
async function stored(db:RawDB,key:string){return db.prepare("SELECT value FROM site_settings WHERE key=?").bind(settingKey(key)).first<{value:string}>();}
export async function multipartAction(body:{action:string;key?:unknown;size?:unknown;type?:unknown},db:RawDB,bucket:ArchiveBucket|undefined,actor:string){
  const key=body.key;if(!isSocialMediaKey(key,"video"))return reply({error:"INVALID_MEDIA_KEY"},400);
  if(!bucket?.head||!bucket.get||!bucket.createMultipartUpload||!bucket.resumeMultipartUpload)return reply({error:"MEDIA_UNAVAILABLE"},503);
  const owner=await db.prepare("SELECT user_id FROM uploads WHERE key=?").bind(key).first<{user_id:string}>();
  if(owner&&owner.user_id!==actor)return reply({error:"MEDIA_CONFLICT"},409);
  if(owner&&(await bucket.head(key)))return reply({key,url:socialMediaPath(key),complete:true});
  const row=await stored(db,key);
  if(body.action==="startMedia"){
    const size=body.size,type=body.type;
    if(typeof size!=="number"||!Number.isSafeInteger(size)||size<=partSize||size>512*1024*1024||typeof type!=="string"||type!==(key.endsWith(".mp4")?"video/mp4":"video/webm"))return reply({error:"INVALID_MEDIA"},400);
    if(row){const state=JSON.parse(row.value) as State;if(state.size!==size||state.type!==type)return reply({error:"MEDIA_CONFLICT"},409);return reply({parts:state.parts.map(part=>part.partNumber)});}
    const upload=await bucket.createMultipartUpload(key,{httpMetadata:{contentType:type}}),state:State={key,uploadId:upload.uploadId,size,type,parts:[]};
    const inserted=await db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO NOTHING RETURNING key").bind(settingKey(key),JSON.stringify(state),new Date().toISOString()).first();
    if(!inserted){await upload.abort();return reply({error:"MEDIA_CONFLICT"},409);}
    return reply({parts:[]});
  }
  if(!row)return reply({error:"UPLOAD_NOT_STARTED"},409);
  const state=JSON.parse(row.value) as State,count=Math.ceil(state.size/partSize);
  if(state.parts.length!==count||state.parts.some((part,index)=>part.partNumber!==index+1||part.bytes!==Math.min(partSize,state.size-index*partSize)))return reply({error:"MISSING_PARTS"},409);
  const DigestStream=(crypto as unknown as {DigestStream?:new(algorithm:string)=>WritableStream<Uint8Array>&{digest:Promise<ArrayBuffer>}}).DigestStream;
  if(!DigestStream)return reply({error:"STREAM_VERIFICATION_UNAVAILABLE"},503);
  let info=await bucket.head(key);
  if(!info){await bucket.resumeMultipartUpload(key,state.uploadId).complete(state.parts.map(({partNumber,etag})=>({partNumber,etag})));info=await bucket.head(key);}
  if(!info||info.size!==state.size)return reply({error:"MEDIA_SIZE_MISMATCH"},400);
  const object=await bucket.get(key);if(!object)return reply({error:"MEDIA_UNAVAILABLE"},503);
  const digest=new DigestStream("SHA-256");await object.body.pipeTo(digest);
  const checksum=Array.from(new Uint8Array(await digest.digest),value=>value.toString(16).padStart(2,"0")).join("");
  if(key.split(".")[0].replaceAll("-","")!==checksum.slice(0,32))return reply({error:"MEDIA_CHECKSUM_MISMATCH"},400);
  await db.prepare("INSERT INTO uploads(key,user_id,created_at) VALUES(?,?,?) ON CONFLICT(key) DO NOTHING").bind(key,actor,new Date().toISOString()).run();
  await db.prepare("DELETE FROM site_settings WHERE key=?").bind(settingKey(key)).run();
  return reply({key,url:socialMediaPath(key),complete:true});
}
export async function multipartPart(request:Request,key:string,db:RawDB,bucket:ArchiveBucket|undefined){
  if(!isSocialMediaKey(key,"video"))return reply({error:"INVALID_MEDIA_KEY"},400);
  if(!bucket?.resumeMultipartUpload)return reply({error:"MEDIA_UNAVAILABLE"},503);
  const number=Number(new URL(request.url).searchParams.get("number")),row=await stored(db,key);
  if(!row)return reply({error:"UPLOAD_NOT_STARTED"},409);
  const state=JSON.parse(row.value) as State;
  if(!Number.isInteger(number)||number<1||number>Math.ceil(state.size/partSize))return reply({error:"INVALID_PART"},400);
  if(request.headers.get("content-type")?.split(";")[0]!==state.type)return reply({error:"INVALID_MEDIA"},415);
  const expected=Math.min(partSize,state.size-(number-1)*partSize),reader=request.body?.getReader();if(!reader)return reply({error:"EMPTY_MEDIA"},400);
  if(Number(request.headers.get("content-length"))>expected)return reply({error:"INVALID_PART_SIZE"},413);
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const next=await reader.read();if(next.done)break;size+=next.value.byteLength;if(size>expected){await reader.cancel();return reply({error:"INVALID_PART_SIZE"},413);}chunks.push(next.value);}
  if(size!==expected)return reply({error:"INVALID_PART_SIZE"},400);
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  if(number===1&&!validMediaBytes(state.type,bytes))return reply({error:"INVALID_MEDIA"},415);
  const checksum=await hash(bytes.buffer),previous=state.parts.find(part=>part.partNumber===number);
  if(previous)return checksum===previous.checksum?reply({part:number,complete:true}):reply({error:"PART_CONFLICT"},409);
  const uploaded=await bucket.resumeMultipartUpload(key,state.uploadId).uploadPart(number,bytes.buffer);
  state.parts.push({partNumber:number,etag:uploaded.etag,bytes:size,checksum});state.parts.sort((a,b)=>a.partNumber-b.partNumber);
  const changed=await db.prepare("UPDATE site_settings SET value=?,updated_at=? WHERE key=? AND value=? RETURNING key").bind(JSON.stringify(state),new Date().toISOString(),settingKey(key),row.value).first();
  return changed?reply({part:number,complete:true}):reply({error:"PART_CONFLICT"},409);
}
