import type {RawDB} from "../db/runtime.ts";
import type {TaxonomyNode,TaxonomyPage,TaxonomySource} from "./taxonomy-types.ts";
export const searchText=(n:TaxonomyNode)=>[n.name,n.id,n.turkishName,...n.commonNames.map(v=>v.name),...n.synonyms.map(v=>v.name)].filter(Boolean).join(" | ").toLocaleLowerCase("tr").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/ı/g,"i");
export async function saveNodes(db:RawDB|undefined,nodes:TaxonomyNode[]){
 if(!db||!nodes.length)return;
 for(let i=0;i<nodes.length;i+=40){
  const part=nodes.slice(i,i+40); const statements=[];
  const existing=await db.prepare(`SELECT key,data FROM taxonomy_nodes WHERE key IN (${part.map(()=>"?").join(",")})`).bind(...part.map(n=>n.key)).all<{key:string;data:string}>();
  const oldNodes=new Map(existing.results.map(r=>[r.key,r]));
  for(const incoming of part){
   const old=oldNodes.get(incoming.key),previous=old?JSON.parse(old.data) as TaxonomyNode:null;
   // A compact child/search row must not erase fields from a complete profile.
   const n=previous?.detailRetrievedAt&&!incoming.detailRetrievedAt?{...incoming,detailRetrievedAt:previous.detailRetrievedAt,author:incoming.author||previous.author,publication:incoming.publication||previous.publication,turkishName:incoming.turkishName||previous.turkishName,commonNames:incoming.commonNames.length?incoming.commonNames:previous.commonNames,synonyms:incoming.synonyms.length?incoming.synonyms:previous.synonyms,identifiers:incoming.identifiers?.length?incoming.identifiers:previous.identifiers,facts:incoming.facts?.length?incoming.facts:previous.facts,acceptedId:incoming.acceptedId||previous.acceptedId}:incoming;
   const data=JSON.stringify(n);
   if(previous){
    if(previous.name!==n.name||previous.parentId!==n.parentId||previous.status!==n.status||previous.acceptedId!==n.acceptedId)
     statements.push(db.prepare("INSERT INTO taxonomy_changes (id,source,version,source_id,kind,old_data,new_data,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(crypto.randomUUID(),n.source,n.version,n.id,"record_updated",JSON.stringify(previous),data,n.retrievedAt));
   }
   statements.push(db.prepare("INSERT INTO taxonomy_nodes (key,source,version,source_id,parent_id,name,rank,status,search_text,data,fetched_at) VALUES (?,?,?,?,?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET parent_id=excluded.parent_id,name=excluded.name,rank=excluded.rank,status=excluded.status,search_text=excluded.search_text,data=excluded.data,fetched_at=excluded.fetched_at").bind(n.key,n.source,n.version,n.id,n.parentId,n.name,n.rank,n.status,searchText(n),data,n.retrievedAt));
  }
  await db.batch(statements);
 }
}
export async function storedNode(db:RawDB|undefined,source:TaxonomySource,id:string,version?:string){
 if(!db)return null;
 const row=await db.prepare(`SELECT data FROM taxonomy_nodes WHERE source = ? AND source_id = ? ${version?"AND version = ?":""} ORDER BY fetched_at DESC LIMIT 1`).bind(source,id,...(version?[version]:[])).first<{data:string}>();
 return row?JSON.parse(row.data) as TaxonomyNode:null;
}
export async function savePage(db:RawDB|undefined,key:string,source:TaxonomySource,parentId:string|null,cursor:string,page:TaxonomyPage){
 if(!db)return;await saveNodes(db,page.records);
 await db.prepare("INSERT INTO taxonomy_pages (key,source,version,parent_id,cursor,data,fetched_at) VALUES (?,?,?,?,?,?,?) ON CONFLICT(key) DO UPDATE SET data=excluded.data,fetched_at=excluded.fetched_at").bind(key,source,page.version,parentId,cursor,JSON.stringify(page),new Date().toISOString()).run();
}
