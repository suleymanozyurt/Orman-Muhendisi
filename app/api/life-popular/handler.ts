import type {RawDB} from "../../../db/runtime.ts";
import type {LifeTaxon} from "../../life-types.ts";
const validId=(id:unknown):id is string=>typeof id==="string"&&/^gbif-[1-9]\d{0,9}$/.test(id);
const cutOff=(now:Date)=>new Date(now.getTime()-89*86400000).toISOString().slice(0,10);
export async function handleLifePopular(request:Request,db:RawDB|undefined,resolve:(id:string)=>Promise<LifeTaxon|null>,now=new Date()){
 const headers={"Cache-Control":"no-store"};if(!db)return Response.json({error:"STORAGE_UNAVAILABLE"},{status:503,headers});
 try{
  if(request.method==="GET"){
   const rows=await db.prepare("SELECT taxon_id,taxon,count(*) AS count FROM taxon_visits WHERE day >= ? GROUP BY taxon_id ORDER BY count DESC, taxon_id ASC LIMIT 24").bind(cutOff(now)).all<{taxon_id:string;taxon:string;count:number}>();
   const records=rows.results.flatMap(row=>{try{const node=JSON.parse(row.taxon) as LifeTaxon;return validId(node.id)&&node.id===row.taxon_id?[{node,count:row.count}]:[];}catch{return [];}});
   return Response.json({records,days:90},{headers});
  }
  if(request.method!=="POST")return Response.json({error:"METHOD_NOT_ALLOWED"},{status:405,headers});
  if(request.headers.get("origin")!==new URL(request.url).origin)return Response.json({error:"INVALID_ORIGIN"},{status:403,headers});
  if(Number(request.headers.get("content-length")||0)>1024)return Response.json({error:"INVALID_INPUT"},{status:400,headers});
  let id:unknown;try{const text=await request.text();if(text.length>1024)throw new Error();id=(JSON.parse(text) as {id?:unknown}).id;}catch{return Response.json({error:"INVALID_INPUT"},{status:400,headers});}
  if(!validId(id))return Response.json({error:"INVALID_INPUT"},{status:400,headers});
  const node=await resolve(id);if(!node||node.status!=="ACCEPTED"||node.rank!=="SPECIES")return Response.json({error:"SPECIES_REQUIRED"},{status:400,headers});
  const cookie=request.headers.get("cookie")?.match(/(?:^|;\s*)om_explore_visitor=([a-f0-9-]{36})(?:;|$)/)?.[1];
  const visitor=cookie&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(cookie)?cookie:crypto.randomUUID();
  const cutoff=cutOff(now),day=now.toISOString().slice(0,10);
  await db.batch([
   db.prepare("DELETE FROM taxon_visits WHERE day < ?").bind(cutoff),
   db.prepare("INSERT INTO taxon_visits (taxon_id,visitor_id,day,taxon) SELECT ?,?,?,? WHERE (SELECT count(*) FROM taxon_visits WHERE visitor_id=? AND day=?) < 100 ON CONFLICT(taxon_id,visitor_id,day) DO NOTHING").bind(id,visitor,day,JSON.stringify(node),visitor,day),
  ]);
  return Response.json({ok:true},{headers:{...headers,...(!cookie?{"Set-Cookie":`om_explore_visitor=${visitor}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=7776000`}:{})}});
 }catch{return Response.json({error:"STORAGE_UNAVAILABLE"},{status:503,headers});}
}
