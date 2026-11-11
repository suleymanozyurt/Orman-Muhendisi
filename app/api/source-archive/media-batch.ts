import type { RawDB } from "../../../db/runtime.ts";
import { isSocialMediaKey } from "../../social-media-key.ts";
import { validMediaBytes, type ArchiveBucket } from "./multipart.ts";

type Entry = { key: string; type: string; size: number };
const limit=8*1024*1024;
const send=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});

// A length-prefixed manifest followed by the original encoded photo bytes.
// Authorization is performed by the parent handler before this bounded reader.
export async function mediaBatch(request:Request,db:RawDB,bucket:ArchiveBucket|undefined,actor:string){
  if(!bucket||request.headers.get("content-type")!=="application/octet-stream")return send({error:"MEDIA_UNAVAILABLE"},400);
  if(Number(request.headers.get("content-length"))>limit)return send({error:"MEDIA_TOO_LARGE"},413);
  const reader=request.body?.getReader();if(!reader)return send({error:"EMPTY_MEDIA"},400);
  const chunks:Uint8Array[]=[];let size=0;
  while(true){const part=await reader.read();if(part.done)break;size+=part.value.byteLength;if(size>limit){await reader.cancel();return send({error:"MEDIA_TOO_LARGE"},413);}chunks.push(part.value);}
  if(size<5)return send({error:"INVALID_MEDIA_BATCH"},400);
  const bytes=new Uint8Array(size);let offset=0;for(const chunk of chunks){bytes.set(chunk,offset);offset+=chunk.byteLength;}
  const length=new DataView(bytes.buffer).getUint32(0);
  if(length<2||length>16000||length+4>size)return send({error:"INVALID_MEDIA_BATCH"},400);
  let entries:Entry[];try{entries=JSON.parse(new TextDecoder("utf-8",{fatal:true}).decode(bytes.subarray(4,4+length)));}catch{return send({error:"INVALID_MEDIA_BATCH"},400);}
  if(!Array.isArray(entries)||!entries.length||entries.length>40||entries.some(e=>!e||!isSocialMediaKey(e.key,"image")||!Number.isSafeInteger(e.size)||e.size<1||e.size>1500000||e.type!==(e.key.endsWith(".webp")?"image/webp":e.key.endsWith(".png")?"image/png":"image/jpeg"))||new Set(entries.map(e=>e.key)).size!==entries.length||entries.reduce((n,e)=>n+e.size,4+length)!==size)return send({error:"INVALID_MEDIA_BATCH"},400);
  const files:{entry:Entry;bytes:Uint8Array<ArrayBuffer>}[]=[];offset=4+length;
  for(const entry of entries){
    const data=bytes.slice(offset,offset+entry.size);offset+=entry.size;
    if(!validMediaBytes(entry.type,data))return send({error:"INVALID_MEDIA"},415);
    const digest=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",data)),v=>v.toString(16).padStart(2,"0")).join("");
    if(entry.key.split(".")[0].replaceAll("-","")!==digest.slice(0,32))return send({error:"MEDIA_CHECKSUM_MISMATCH"},400);
    files.push({entry,bytes:data});
  }
  const owners=await db.prepare(`SELECT key,user_id FROM uploads WHERE key IN (${entries.map(()=>"?").join(",")})`).bind(...entries.map(e=>e.key)).all<{key:string;user_id:string}>();
  if(owners.results.some(row=>row.user_id!==actor))return send({error:"MEDIA_CONFLICT"},409);
  for(let i=0;i<files.length;i+=4)await Promise.all(files.slice(i,i+4).map(file=>bucket.put(file.entry.key,file.bytes.buffer,{httpMetadata:{contentType:file.entry.type}})));
  await db.batch(entries.map(e=>db.prepare("INSERT INTO uploads(key,user_id,created_at) VALUES(?,?,?) ON CONFLICT(key) DO NOTHING").bind(e.key,actor,new Date().toISOString())));
  return send({keys:entries.map(e=>e.key)});
}
