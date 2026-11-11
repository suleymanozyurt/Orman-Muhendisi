import type {RawDB} from "../../../db/runtime.ts";
import {taxonomySources,type TaxonomyNode,type TaxonomyPage,type TaxonomySource} from "../../taxonomy-types.ts";
import {COL_RELEASE,ICTV_RELEASE,externalPage,sourceJson,itisQuery,itisPath,colNode,gbifNode,powoNode,type TaxonomyFetch} from "../../taxonomy-adapters.ts";
import {saveNodes,savePage,storedNode} from "../../taxonomy-store.ts";
import {licensedPhotos} from "../../feed-data.ts";
const reply=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"private, max-age=30"}});
const validId=(source:TaxonomySource,id:string)=>source==="itis"||source==="gbif"?/^\d{1,12}$/.test(id):source==="powo"?/^urn:lsid:ipni\.org:names:\d+-\d+$/.test(id):/^[a-zA-Z0-9_.-]{1,120}$/.test(id);
const decode=(r:{data:string})=>JSON.parse(r.data) as TaxonomyNode;
export async function taxonomyDetail(source:TaxonomySource,id:string,db:RawDB|undefined,fetcher:TaxonomyFetch=fetch,version=source==="col"?COL_RELEASE:source==="ictv"?ICTV_RELEASE:"live"){
 if(!validId(source,id))throw new Error("INVALID_ID");
 if(!/^([0-9]+|MSL\d+\.v\d+|live)$/.test(version))throw new Error("INVALID_VERSION");
 const cached=await storedNode(db,source,id,version);
 if(source==="ictv"){
  const release=db?await db.prepare("SELECT complete FROM taxonomy_releases WHERE source='ictv' AND version=?").bind(version).first<{complete:number}>():null;
  if(release?.complete!==1)throw new Error("SOURCE_IMPORT_INCOMPLETE");
  if(!db||!cached)throw new Error("NOT_FOUND");
  const path:TaxonomyNode[]=[];const seen=new Set<string>();let n:TaxonomyNode|null=cached;
  while(n){if(seen.has(n.id))throw new Error("SOURCE_CYCLE");seen.add(n.id);path.unshift(n);n=n.parentId?await storedNode(db,source,n.parentId,version):null;}
  return {node:cached,path};
 }
 try{
  let node:TaxonomyNode,path:TaxonomyNode[];
  if(source==="itis"){
   const {data,records}=await itisQuery(`tsn:${id}`,"*",fetcher);if(!records[0])throw new Error("NOT_FOUND");node=records[0];
   const ids=itisPath(data.response.docs[0]).map(v=>v.id);
   const ancestors=ids.length?await itisQuery(`tsn:(${ids.join(" OR ")})`,"*",fetcher):{records:[]};
   const map=new Map(ancestors.records.map(v=>[v.id,v]));path=ids.map(key=>map.get(key)).filter((v):v is TaxonomyNode=>Boolean(v));
  }else if(source==="col"){
   const [d,p]=await Promise.all([sourceJson(`https://api.checklistbank.org/dataset/${version}/taxon/${encodeURIComponent(id)}/info`,fetcher),sourceJson(`https://api.checklistbank.org/dataset/${version}/tree/${encodeURIComponent(id)}`,fetcher)]);
   node=colNode(d,version);path=Array.isArray(p)?p.map(v=>colNode(v,version)).reverse():[];
  }else if(source==="gbif"){
   const [d,p]=await Promise.all([sourceJson(`https://api.gbif.org/v1/species/${id}`,fetcher),sourceJson(`https://api.gbif.org/v1/species/${id}/parents`,fetcher)]);node=gbifNode(d);path=(Array.isArray(p)?p:[]).map(gbifNode);path.push(node);
  }else{
   const d=await sourceJson(`https://powo.science.kew.org/api/2/taxon/${id}`,fetcher);node=powoNode(d);path=(Array.isArray(d.classification)?d.classification:[]).map(powoNode);if(!path.some(v=>v.id===id))path.push(node);
  }
  if(!path.some(v=>v.id===node.id))path.push(node);
  node.detailRetrievedAt=node.retrievedAt;
  const kingdom=path.find(v=>v.rank==="KINGDOM")?.name;if(kingdom){node.kingdom=kingdom;path=path.map(n=>({...n,kingdom}));}
  await saveNodes(db,[...path.filter(v=>v.id!==node.id),node]);return {node,path};
 }catch(error){
  if(!cached)throw error;
  const path:TaxonomyNode[]=[];let n:TaxonomyNode|null=cached;const seen=new Set<string>();
  while(n&&!seen.has(n.id)){seen.add(n.id);path.unshift(n);n=n.parentId?await storedNode(db,source,n.parentId,version):null;}
  return {node:cached,path,cached:true};
 }
}
async function ictvPage(db:RawDB,mode:string,id:string,q:string,cursor:string,rank:string,status:string,within:string,version:string):Promise<TaxonomyPage>{
 const offset=Number(cursor||0);if(!Number.isSafeInteger(offset)||offset<0)throw new Error("INVALID_CURSOR");
 const where=["source = ?","version = ?"],values:unknown[]=["ictv",version];
 if(mode==="roots")where.push("parent_id IS NULL");
 if(mode==="children"){where.push("parent_id = ?");values.push(id);}
 if(mode==="search"){
  where.push("(search_text LIKE ? ESCAPE '\\' OR source_id = ? OR source_id IN (SELECT source_id FROM taxonomy_changes WHERE source='ictv' AND version=? AND old_data LIKE ? ESCAPE '\\'))");
  const escaped=q.toLocaleLowerCase("tr").replace(/[\\%_]/g,"\\$&");values.push(`%${escaped}%`,q,version,`%${escaped}%`);
  if(rank){where.push("rank = ?");values.push(rank.replace(/\s/g,"").toUpperCase());}
  if(status){where.push("status = ?");values.push(status);}
 }
 // Real ancestry scope; a recursive CTE has no arbitrary rank/depth truncation.
 const prefix=within?"WITH RECURSIVE branch(source_id) AS (SELECT source_id FROM taxonomy_nodes WHERE source='ictv' AND version=? AND source_id=? UNION SELECT n.source_id FROM taxonomy_nodes n JOIN branch b ON n.parent_id=b.source_id WHERE n.source='ictv' AND n.version=?) ":"";
 if(within){where.push("source_id IN (SELECT source_id FROM branch)");values.unshift(version,within,version);}
 const condition=where.join(" AND ");
 const [count,rows]=await Promise.all([db.prepare(prefix+`SELECT COUNT(*) AS total FROM taxonomy_nodes WHERE ${condition}`).bind(...values).first<{total:number}>(),db.prepare(prefix+`SELECT data FROM taxonomy_nodes WHERE ${condition} ORDER BY name,source_id LIMIT 36 OFFSET ?`).bind(...values,offset).all<{data:string}>()]);
 const records=rows.results.map(decode),total=count?.total||0;return {records,total,next:offset+records.length<total?String(offset+records.length):null,version};
}
export async function handleTaxonomy(request:Request,db?:RawDB,fetcher:TaxonomyFetch=fetch){
 const p=new URL(request.url).searchParams,mode=p.get("mode")||"roots",source=(p.get("source")||"itis") as TaxonomySource;
 if(!taxonomySources.includes(source))return reply({error:"INVALID_SOURCE"},400);
 const id=p.get("id")||"",q=(p.get("q")||"").trim().slice(0,200),cursor=p.get("cursor")||"";
 const version=source==="col"?(p.get("version")||COL_RELEASE):source==="ictv"?(p.get("version")||ICTV_RELEASE):"live";
 if(cursor.length>2000||!/^([0-9]+|MSL\d+\.v\d+|live)$/.test(version))return reply({error:"INVALID_CURSOR_OR_VERSION"},400);
 if((mode==="node"||mode==="children")&&!validId(source,id))return reply({error:"INVALID_ID"},400);
 try{
  if(mode==="sync-plan"){
   if(!db)return reply({error:"DATABASE_UNAVAILABLE"},503);
   const offset=Number(cursor||0);if(!Number.isSafeInteger(offset)||offset<0)return reply({error:"INVALID_CURSOR"},400);
   const rows=await db.prepare("SELECT key FROM taxonomy_pages WHERE source != 'ictv' ORDER BY key LIMIT 36 OFFSET ?").bind(offset).all<{key:string}>();
   return reply({records:rows.results.map(r=>{const [source,version,mode,id,q,cursor,filters]=JSON.parse(r.key);return {source,version,mode,...(id?{id}:{}),...(q?{q}:{}),...(cursor?{cursor}:{}),...filters,refresh:"1"};}),next:rows.results.length===36?String(offset+36):null});
  }
  if(mode==="coverage"){
   if(!db)return reply({error:"DATABASE_UNAVAILABLE"},503);
   const [releases,counts]=await Promise.all([db.prepare("SELECT * FROM taxonomy_releases ORDER BY source,updated_at DESC").all(),db.prepare("SELECT n.source,n.version,COUNT(*) AS stored, SUM(CASE WHEN n.rank='SPECIES' THEN 1 ELSE 0 END) AS species, SUM(CASE WHEN n.parent_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM taxonomy_nodes p WHERE p.source=n.source AND p.version=n.version AND p.source_id=n.parent_id) THEN 1 ELSE 0 END) AS parents_not_yet_cached FROM taxonomy_nodes n GROUP BY n.source,n.version").all()]);
   return reply({releases:releases.results.map((r:any)=>({...r,data:JSON.parse(r.data)})),counts:counts.results,notice:"Tamlık yalnızca belirtilen kaynak sürümü ve doğrulanmış kayıt sayıları için geçerlidir. Diğer kaynakların kayıtları istek üzerine kalıcı veri tabanına alınır."});
  }
  if(mode==="changes"){
   if(!db)return reply({error:"DATABASE_UNAVAILABLE"},503);const offset=Number(cursor||0);if(!Number.isSafeInteger(offset)||offset<0)return reply({error:"INVALID_CURSOR"},400);
   const rows=await db.prepare("SELECT * FROM taxonomy_changes WHERE source=? AND version=? ORDER BY id LIMIT 36 OFFSET ?").bind(source,version,offset).all();return reply({records:rows.results,next:rows.results.length===36?String(offset+36):null});
  }
  if(mode==="node")return reply(await taxonomyDetail(source,id,db,fetcher,version));
  if(mode==="images"){
   if(source!=="gbif"||!validId(source,id))return reply({error:"GBIF_ID_REQUIRED"},400);
   const offset=Number(cursor||0);if(!Number.isSafeInteger(offset)||offset<0)return reply({error:"INVALID_CURSOR"},400);
   const {node}=await taxonomyDetail(source,id,db,fetcher,version),target=node.acceptedId||node.id;
   const params=new URLSearchParams({taxonKey:target,mediaType:"StillImage",occurrenceStatus:"PRESENT",limit:"36",offset:String(offset)});
   const data=await sourceJson(`https://api.gbif.org/v1/occurrence/search?${params}`,fetcher);
   if(!Array.isArray(data.results))throw new Error("INVALID_SOURCE_RESPONSE");
   const rankField:Record<string,string>={KINGDOM:"kingdomKey",PHYLUM:"phylumKey",CLASS:"classKey",ORDER:"orderKey",FAMILY:"familyKey",GENUS:"genusKey",SPECIES:"speciesKey"};
   const images=data.results.filter((r:any)=>!(r.issues||[]).some((v:string)=>["TAXON_MATCH_HIGHERRANK","TAXON_MATCH_NONE","TAXON_MATCH_FUZZY"].includes(v))).filter((r:any)=>String(r[rankField[node.rank]||"taxonKey"])===target).flatMap((r:any)=>licensedPhotos(r.media).filter(p=>p.credit||p.license.includes("publicdomain")).map(p=>({...p,subject:r.species||r.scientificName,source:p.reference||`https://www.gbif.org/occurrence/${r.key}`}))).filter((p:any)=>p.subject);
   return reply({images,next:data.endOfRecords||!data.results.length?null:String(offset+data.results.length),total:data.count});
  }
  if(!["roots","children","search"].includes(mode)||mode==="search"&&!q)return reply({error:"INVALID_QUERY"},400);
  const filters={rank:p.get("rank")||undefined,status:p.get("status")||undefined,kingdom:p.get("kingdom")||undefined,within:p.get("within")||undefined};
  if(Object.values(filters).some(v=>v&&v.length>120))return reply({error:"INVALID_FILTER"},400);
  if(source==="ictv"){if(!db)return reply({error:"DATABASE_UNAVAILABLE"},503);const release=await db.prepare("SELECT complete FROM taxonomy_releases WHERE source='ictv' AND version=?").bind(version).first<{complete:number}>();if(release?.complete!==1)return reply({error:"SOURCE_IMPORT_INCOMPLETE",records:[],next:null},503);return reply(await ictvPage(db,mode,id,q,cursor,filters.rank||"",filters.status||"",filters.within||"",version));}
  const key=JSON.stringify([source,version,mode,id,q,cursor,filters]);
  const stored=db?await db.prepare("SELECT data,fetched_at FROM taxonomy_pages WHERE key=?").bind(key).first<{data:string;fetched_at:string}>():null;
  if(stored&&Date.now()-Date.parse(stored.fetched_at)<86400000&&p.get("refresh")!=="1")return reply({...JSON.parse(stored.data),cached:true});
  try{
   const page=await externalPage(source,mode as "roots"|"children"|"search",id,q,cursor,filters,fetcher,version);await savePage(db,key,source,id||null,cursor,page);
   if(db)await db.prepare("INSERT INTO taxonomy_releases (key,source,version,source_url,license,expected_count,complete,data,updated_at) VALUES (?,?,?,?,?,?,0,?,?) ON CONFLICT(key) DO UPDATE SET updated_at=excluded.updated_at").bind(`${source}:${version}`,source,version,page.records[0]?.sourceUrl||"",page.records[0]?.license||"",null,JSON.stringify({mode:"on-demand",release:source==="col"?"2026-09-25 XR":null}),new Date().toISOString()).run();
   return reply(page);
  }catch(e){if(stored)return reply({...JSON.parse(stored.data),cached:true,warning:"Kaynak servisine ulaşılamadı; son kaydedilen sayfa gösteriliyor."});throw e;}
 }catch(error){const message=error instanceof Error?error.message:"SOURCE_UNAVAILABLE";return reply({error:message,records:[],next:null},message==="NOT_FOUND"?404:503);}
}
