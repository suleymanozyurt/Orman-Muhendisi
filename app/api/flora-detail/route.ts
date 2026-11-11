import source from "../../data/tubives.json" with {type:"json"};
import type {FloraRecord} from "../../tubives-types";
import {parseOriginalDetail} from "../../tubives-detail-source";
import {rawDatabase} from "../../../db/runtime";
export const dynamic="force-dynamic";
export async function GET(request:Request){
 const id=Number(new URL(request.url).searchParams.get("id"));const record=(source.records as FloraRecord[]).find(r=>r.id===id);if(!Number.isInteger(id)||!record)return Response.json({error:"NOT_FOUND"},{status:404});
 const db=await rawDatabase();
 try{const saved=await db?.prepare("SELECT data,fetched_at FROM flora_details WHERE id=?").bind(id).first<{data:string;fetched_at:string}>();if(saved)return Response.json({record:{...record,...JSON.parse(saved.data)},detailStatus:"verified",detailCheckedAt:saved.fetched_at},{headers:{"Cache-Control":"private, max-age=3600"}});}catch(e){console.error("flora detail cache read failed",e);}
 if(record.sourcePublishedName)return Response.json({record,detailStatus:"verified"},{headers:{"Cache-Control":"public, max-age=3600"}});
 if(!request.headers.get("oai-authenticated-user-id"))return Response.json({record,detailStatus:"unavailable"},{headers:{"Cache-Control":"no-store"}});
 try{const response=await fetch(`http://194.27.225.161/yasin/tubives/index.php?sayfa=1&tax_id=${id}`,{headers:{"User-Agent":"Orman Muhendisi factual catalogue verification"},signal:AbortSignal.timeout(22000)});if(!response.ok)throw new Error("SOURCE_UNAVAILABLE");const raw=await response.text();if(raw.length>100000)throw new Error("SOURCE_TOO_LARGE");const details=parseOriginalDetail(raw,record),checkedAt=new Date().toISOString();if(db){try{await db.prepare("INSERT INTO flora_details (id,data,fetched_at) VALUES (?,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,fetched_at=excluded.fetched_at").bind(id,JSON.stringify(details),checkedAt).run();}catch(e){console.error("flora detail cache write failed",e);}}return Response.json({record:{...record,...details},detailStatus:"verified",detailCheckedAt:checkedAt},{headers:{"Cache-Control":"private, max-age=3600"}});}catch{ return Response.json({record,detailStatus:"unavailable"},{headers:{"Cache-Control":"no-store"}});}
}
