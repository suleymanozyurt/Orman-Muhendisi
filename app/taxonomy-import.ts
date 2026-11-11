import manifest from "../data/taxonomy-import/manifest.json" with {type:"json"};
import type {RawDB,Statement} from "../db/runtime.ts";
import type {TaxonomyNode} from "./taxonomy-types.ts";
import {searchText} from "./taxonomy-store.ts";

// Only the hashes of a validated official release enter the Worker bundle.
// Large source batches stay in the Git checkout and are sent by the owner updater.
export const ictvImportManifest=manifest;
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
const receiptKey=(index:number)=>`import:ictv:${manifest.version}:${index}`;
async function status(db:RawDB){
 const rows=await db.prepare("SELECT key,data FROM taxonomy_pages WHERE source='ictv' AND version=? AND key LIKE ?").bind(manifest.version,`import:ictv:${manifest.version}:%`).all<{key:string;data:string}>();
 const receipts=new Map(rows.results.map(r=>[r.key,r.data]));
 const missing=manifest.chunks.filter(c=>receipts.get(receiptKey(c.index))!==c.sha256).map(c=>c.index);
 const release=await db.prepare("SELECT complete FROM taxonomy_releases WHERE key=?").bind(`ictv:${manifest.version}`).first<{complete:number}>();
 return {version:manifest.version,totalChunks:manifest.chunks.length,completedChunks:manifest.chunks.length-missing.length,missing,complete:release?.complete===1};
}
export async function handleTaxonomyImport(request:Request,db?:RawDB){
 if(!db)return reply({error:"DATABASE_UNAVAILABLE"},503);
 const origin=request.headers.get("origin");
 if(origin&&origin!==new URL(request.url).origin)return reply({error:"INVALID_ORIGIN"},403);
 try{
  if(request.method==="GET")return reply(await status(db));
  if(request.method!=="POST")return reply({error:"METHOD_NOT_ALLOWED"},405);
  if(Number(request.headers.get("content-length")||0)>64000)return reply({error:"BATCH_TOO_LARGE"},413);
  const raw=await request.text();if(new TextEncoder().encode(raw).length>64000)return reply({error:"BATCH_TOO_LARGE"},413);
  const input=JSON.parse(raw);
  if(input.version!==manifest.version)return reply({error:"UNKNOWN_RELEASE"},400);
  if(input.action==="finalize"){
   const progress=await status(db);if(progress.missing.length)return reply({error:"IMPORT_INCOMPLETE",...progress},409);
   const [counts,missingParents,history]=await Promise.all([
    db.prepare("SELECT rank,COUNT(*) AS n FROM taxonomy_nodes WHERE source='ictv' AND version=? GROUP BY rank").bind(manifest.version).all<{rank:string;n:number}>(),
    db.prepare("SELECT COUNT(*) AS n FROM taxonomy_nodes n WHERE n.source='ictv' AND n.version=? AND n.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM taxonomy_nodes p WHERE p.source=n.source AND p.version=n.version AND p.source_id=n.parent_id)").bind(manifest.version).first<{n:number}>(),
    db.prepare("SELECT COUNT(*) AS n FROM taxonomy_changes WHERE source='ictv' AND version=? AND id LIKE ?").bind(manifest.version,`ictv:${manifest.version}:historical:%`).first<{n:number}>()
   ]);
   const expected:Record<string,number>=manifest.meta.rankCounts;
   if(counts.results.length!==Object.keys(expected).length||counts.results.some(r=>r.n!==expected[r.rank])||missingParents?.n!==0||history?.n!==manifest.meta.historicalChanges)
    return reply({error:"RELEASE_VALIDATION_FAILED",counts:counts.results,missingParents:missingParents?.n,history:history?.n},409);
   await db.prepare("INSERT INTO taxonomy_releases (key,source,version,source_url,license,expected_count,complete,data,updated_at) VALUES (?,?,?,?,?,?,1,?,?) ON CONFLICT(key) DO UPDATE SET complete=1,data=excluded.data,expected_count=excluded.expected_count,updated_at=excluded.updated_at").bind(`ictv:${manifest.version}`,"ictv",manifest.version,manifest.sourceUrl,manifest.license,manifest.meta.total,JSON.stringify({...manifest.meta,importMethod:"verified-batches",verifiedChunks:manifest.chunks.length}),new Date().toISOString()).run();
   return reply({complete:true,version:manifest.version,taxa:manifest.meta.total,species:manifest.meta.species,history:history?.n});
  }
  const index=input.index;
  if(input.action!=="chunk"||!Number.isSafeInteger(index)||index<0||index>=manifest.chunks.length||typeof input.payload!=="string")return reply({error:"INVALID_BATCH"},400);
  const chunk=manifest.chunks[index],bytes=new TextEncoder().encode(input.payload);
  const hash=Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",bytes)),b=>b.toString(16).padStart(2,"0")).join("");
  if(bytes.length!==chunk.bytes||hash!==chunk.sha256)return reply({error:"SOURCE_CHECKSUM_MISMATCH"},400);
  const existing=await db.prepare("SELECT data FROM taxonomy_pages WHERE key=?").bind(receiptKey(index)).first<{data:string}>();
  if(existing?.data===hash)return reply({index,persisted:true,reused:true});
  const payload=JSON.parse(input.payload) as {nodes:TaxonomyNode[];changes:{id:string;sourceId:string|null;kind:string;old:unknown;new:unknown}[]};
  const statements:Statement[]=[];
  for(const n of payload.nodes)statements.push(db.prepare("INSERT INTO taxonomy_nodes (key,source,version,source_id,parent_id,name,rank,status,search_text,data,fetched_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET parent_id=excluded.parent_id,name=excluded.name,rank=excluded.rank,status=excluded.status,search_text=excluded.search_text,data=excluded.data,fetched_at=excluded.fetched_at").bind(n.key,n.source,n.version,n.id,n.parentId,n.name,n.rank,n.status,searchText(n),JSON.stringify(n),n.retrievedAt));
  for(const c of payload.changes)statements.push(db.prepare("INSERT OR IGNORE INTO taxonomy_changes (id,source,version,source_id,kind,old_data,new_data,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(c.id,"ictv",manifest.version,c.sourceId,c.kind,JSON.stringify(c.old),JSON.stringify(c.new),manifest.retrievedAt));
  statements.push(db.prepare("INSERT INTO taxonomy_pages (key,source,version,parent_id,cursor,data,fetched_at) VALUES (?,?,?,NULL,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,fetched_at=excluded.fetched_at").bind(receiptKey(index),"ictv",manifest.version,String(index),hash,new Date().toISOString()));
  // D1 batch is atomic: the receipt is committed with the data or rolled back.
  await db.batch(statements);
  return reply({index,persisted:true,reused:false,nodes:payload.nodes.length,changes:payload.changes.length});
 }catch(error){console.error("taxonomy-import",error instanceof Error?error.message:"IMPORT_FAILED");return reply({error:"IMPORT_FAILED"},503);}
}
