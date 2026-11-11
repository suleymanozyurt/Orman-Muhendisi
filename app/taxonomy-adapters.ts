import type {TaxonomyNode,TaxonomyPage,TaxonomySource} from "./taxonomy-types.ts";
import {solrLiteral} from "./reference-catalog-adapters.ts";
type Row=Record<string,any>; // External JSON is normalized into typed records at this boundary.
export const COL_RELEASE="316441";
export const ICTV_RELEASE="MSL41.v1";
export const ITIS_ROOT_IDS=["202423","202422","555705","630578","630577","50","935939"];
export const normalizedRank=(rank:string)=>rank.replace(/[\s_-]/g,"").toUpperCase();
const array=(v:unknown):Row[]=>Array.isArray(v)?v:[];
const strings=(v:unknown):string[]=>Array.isArray(v)?v.filter(x=>typeof x==="string"):[];
const text=(v:unknown)=>typeof v==="string"?v:"";
function base(source:TaxonomySource,id:string,version:string,name:string,rank:string,parentId:string|null,status:string,url:string,license:string):TaxonomyNode{
 if(!id||!name)throw new Error("INVALID_SOURCE_RECORD");
 return {source,id,version,key:`${source}:${version}:${id}`,name,rank:normalizedRank(rank)||"UNRANKED",parentId,status,commonNames:[],synonyms:[],sourceUrl:url,license,retrievedAt:new Date().toISOString()};
}
export function itisNode(r:Row):TaxonomyNode{
 const id=String(r.tsn),n=base("itis",id,"live",text(r.nameWOInd),text(r.rank),r.parentTSN&&String(r.parentTSN)!=="0"?String(r.parentTSN):null,text(r.usage),`https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=${id}`,"CC0 · ITIS tarafından üretilen taksonomi verileri");
 n.author=text(r.taxonAuthor);n.kingdom=text(r.kingdom);n.sourceDate=text(r.updateDate);
 n.commonNames=strings(r.vernacular).map(v=>{const p=v.split("$");return {name:p[1]||"",language:p[2]||""};}).filter(v=>v.name);
 n.turkishName=n.commonNames.find(v=>/^(turkish|tur|tr)$/i.test(v.language))?.name;
 const names=strings(r.synonyms).flatMap(v=>v.split("$").slice(1).filter(Boolean));
 n.synonyms=names.map(name=>({id:"",name})); // The Solr arrays do not establish a name–ID pairing.
 n.acceptedId=strings(r.acceptedTSN).flatMap(v=>v.split("$").filter(v=>/^\d+$/.test(v)))[0]||(/^\d+$/.test(String(r.acceptedTSN||""))?String(r.acceptedTSN):undefined);
 n.publication=strings(r.publication).map(v=>v.split("$").filter(Boolean).join(" · ")).join("; ");
 n.facts=[{label:"ITIS kapsam derecesi",value:text(r.completenessRating)},{label:"ITIS güvenilirlik değerlendirmesi",value:text(r.credibilityRating)}].filter(v=>v.value);
 return n;
}
export function colNode(r:Row,version=COL_RELEASE):TaxonomyNode{
 const u=r.usage||r,name=u.name||{},id=String(u.id),n=base("col",id,version,text(name.scientificName)||text(u.name),text(name.rank)||text(u.rank),u.parentId?String(u.parentId):null,text(u.status),`https://www.checklistbank.org/dataset/${version}/taxon/${encodeURIComponent(id)}`,"CC BY · Catalogue of Life ve kaynak veri sağlayıcıları");
 n.author=text(name.authorship)||text(u.authorship);n.sourceDate=text(u.modified);n.acceptedId=u.accepted?.id;
 n.kingdom=n.rank==="KINGDOM"?n.name:array(r.classification).find(v=>v.rank==="kingdom")?.name;
 n.commonNames=array(r.vernacularNames).map(v=>({name:text(v.name),language:text(v.language)})).filter(v=>v.name);
 n.turkishName=n.commonNames.find(v=>/^(tur|tr|turkish)$/i.test(v.language))?.name;
 if(typeof u.childCount==="number")n.childCount=u.childCount;
 n.identifiers=strings(name.identifier);n.publication=text(r.publishedIn?.citation);
 n.synonyms=Object.values(r.synonyms||{}).flatMap(v=>array(v)).map(v=>({id:String(v.id),name:text(v.name?.scientificName),status:text(v.status)})).filter(v=>v.name);
 return n;
}
export function gbifNode(r:Row):TaxonomyNode{
 const id=String(r.key),n=base("gbif",id,"live",text(r.canonicalName)||text(r.scientificName),text(r.rank),r.parentKey?String(r.parentKey):null,text(r.taxonomicStatus),`https://www.gbif.org/species/${id}`,"GBIF · veri setinin lisans ve atıf koşulları");
 n.author=text(r.authorship);n.kingdom=text(r.kingdom);n.sourceDate=text(r.lastInterpreted);n.acceptedId=r.acceptedKey?String(r.acceptedKey):undefined;n.identifiers=[text(r.datasetKey)].filter(Boolean);return n;
}
export function powoNode(r:Row):TaxonomyNode{
 const id=text(r.fqId),path=array(r.classification).filter(v=>v.fqId!==id),n=base("powo",id,"live",text(r.name),text(r.rank),path.at(-1)?.fqId||null,text(r.taxonomicStatus)||(r.accepted===true?"accepted":r.accepted===false?"synonym":"unknown"),`https://powo.science.kew.org/taxon/${id}`,"IPNI / WCVP · CC BY 3.0; Kew ve veri katkıcılarına atıf");
 n.author=text(r.authors)||text(r.author);n.publication=text(r.reference);n.sourceDate=text(r.modified);
 n.synonyms=array(r.synonyms).map(v=>({id:text(v.fqId),name:text(v.name)})).filter(v=>v.name);n.acceptedId=r.acceptedName?.fqId||r.synonymOf?.fqId;n.kingdom=text(r.kingdom);if(Array.isArray(r.childNameUsages))n.childCount=r.childNameUsages.length;return n;
}
export type TaxonomyFetch=typeof fetch;
export async function sourceJson(url:URL|string,fetcher:TaxonomyFetch=fetch):Promise<any>{
 const response=await fetcher(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(14000)});
 if(!response.ok)throw new Error(`SOURCE_HTTP_${response.status}`);return response.json();
}
export function itisPath(r:Row):{id:string;name:string;rank:string}[]{
 const ids=(strings(r.hierarchyTSN)[0]||"").split("$").filter(Boolean),parts=(strings(r.hierarchySoFarWRanks)[0]||"").split("$").slice(1).filter(Boolean);
 return parts.map((p,i)=>{const at=p.indexOf(":");return {id:ids[i],rank:p.slice(0,at),name:p.slice(at+1)};}).filter(v=>v.id&&v.name);
}
export async function itisQuery(q:string,cursor:string,fetcher:TaxonomyFetch,filters:string[]=[]){
 const url=new URL("https://services.itis.gov/"),p=url.searchParams;p.set("q",q);p.set("wt","json");p.set("rows","36");p.set("sort","tsn asc");p.set("cursorMark",cursor||"*");filters.forEach(f=>p.append("fq",f));
 const data=await sourceJson(url,fetcher);if(!data.response?.docs)throw new Error("INVALID_ITIS_RESPONSE");
 return {data,records:data.response.docs.map(itisNode) as TaxonomyNode[],total:data.response.numFound as number,next:data.nextCursorMark&&data.nextCursorMark!==(cursor||"*")&&data.response.docs.length?String(data.nextCursorMark):null};
}
export async function externalPage(source:Exclude<TaxonomySource,"ictv">,mode:"roots"|"children"|"search",id:string,q:string,cursor:string,filters:{rank?:string;status?:string;kingdom?:string;within?:string},fetcher:TaxonomyFetch,version=COL_RELEASE):Promise<TaxonomyPage>{
 if(source==="itis"){
  const clauses:string[]=[];
  if(filters.rank)clauses.push(`rank:"${solrLiteral(filters.rank.charAt(0).toUpperCase()+filters.rank.slice(1).toLowerCase())}"`);
  if(filters.status)clauses.push(filters.status==="accepted"?"usage:(accepted OR valid)":`usage:"${solrLiteral(filters.status)}"`);
  if(filters.kingdom)clauses.push(`kingdom:"${solrLiteral(filters.kingdom)}"`);
  if(filters.within){if(!/^\d+$/.test(filters.within))throw new Error("INVALID_SCOPE");clauses.push(`hierarchyTSN:*$${filters.within}$*`);}
  const query=mode==="roots"?`tsn:(${ITIS_ROOT_IDS.join(" OR ")})`:mode==="children"?`parentTSN:${id}`:/^\d+$/.test(q)?`tsn:${q}`:`nameWOInd:"${solrLiteral(q)}"^10 OR nameWOInd:${solrLiteral(q).replace(/ /g,"\\ ")}*^5 OR (${q.split(/\s+/).map(token=>`nameWOInd:${solrLiteral(token)}~1`).join(" AND ")}) OR vernacular:*${solrLiteral(q).replace(/ /g,"\\ ")}* OR synonyms:*${solrLiteral(q).replace(/ /g,"\\ ")}*`;
  const result=await itisQuery(query,cursor,fetcher,clauses);return {records:mode==="roots"?result.records.sort((a,b)=>ITIS_ROOT_IDS.indexOf(a.id)-ITIS_ROOT_IDS.indexOf(b.id)):result.records,total:result.total,next:result.next,version:"live"};
 }
 const offset=source!=="powo"&&cursor?Number(cursor):0;if(!Number.isSafeInteger(offset)||offset<0)throw new Error("INVALID_CURSOR");
 if(source==="col"){
  if(mode==="search"&&/^[A-Z0-9]{1,10}$/.test(q)){try{const d=await sourceJson(`https://api.checklistbank.org/dataset/${version}/taxon/${encodeURIComponent(q)}/info`,fetcher);return {records:[colNode(d,version)],total:1,next:null,version};}catch{/* A scientific name can resemble an identifier. */}}
  const path=mode==="roots"?"tree":mode==="children"?`tree/${encodeURIComponent(id)}/children`:"nameusage/search";
  const url=new URL(`https://api.checklistbank.org/dataset/${version}/${path}`);url.searchParams.set("limit","36");url.searchParams.set("offset",String(offset));
  if(mode==="search"){url.searchParams.set("q",q);url.searchParams.set("type","standard");url.searchParams.append("content","SCIENTIFIC_NAME");url.searchParams.append("content","VERNACULAR_NAME");if(filters.rank)url.searchParams.set("rank",filters.rank.toLowerCase());if(filters.status)url.searchParams.set("status",filters.status);if(filters.within)url.searchParams.set("taxonID",filters.within);}
  let d=await sourceJson(url,fetcher);
  if(mode==="search"&&d.total===0){url.searchParams.set("type","fuzzy");d=await sourceJson(url,fetcher);}
  const records=array(d.result).map(r=>colNode(r,version));return {records,total:typeof d.total==="number"?d.total:null,next:d.last===true||!records.length||(typeof d.total==="number"&&offset+records.length>=d.total)?null:String(offset+records.length),version};
 }
 if(source==="gbif"){
  if(mode==="search"&&/^\d+$/.test(q)){const d=await sourceJson(`https://api.gbif.org/v1/species/${q}`,fetcher);return {records:[gbifNode(d)],total:1,next:null,version:"live"};}
  const url=new URL(mode!=="children"?"https://api.gbif.org/v1/species/search":`https://api.gbif.org/v1/species/${id}/children`);if(mode==="roots"){url.searchParams.set("rank","KINGDOM");url.searchParams.set("datasetKey","d7dddbf4-2cf0-4f39-9b2a-bb099caae36c");}url.searchParams.set("limit","36");url.searchParams.set("offset",String(offset));
  if(mode==="search"){url.searchParams.set("q",q);if(filters.rank)url.searchParams.set("rank",filters.rank);if(filters.status)url.searchParams.set("status",filters.status);if(filters.kingdom)url.searchParams.set("kingdom",filters.kingdom);if(filters.within)url.searchParams.set("highertaxonKey",filters.within);}
  const d=await sourceJson(url,fetcher),records=array(d.results).map(gbifNode);return {records,total:typeof d.count==="number"?d.count:null,next:d.endOfRecords||!records.length?null:String(offset+records.length),version:"live"};
 }
 if(source==="powo"&&mode==="search"&&(filters.status||filters.within))throw new Error("POWO_STATUS_OR_SUBTREE_SEARCH_NOT_SUPPORTED_USE_ITIS_OR_COL");
 if(source==="powo"&&mode==="search"&&/^urn:lsid:ipni.org:names:\d+-\d+$/.test(q)){const d=await sourceJson(`https://powo.science.kew.org/api/2/taxon/${q}`,fetcher);return {records:[powoNode(d)],total:1,next:null,version:"live"};}
 if(source==="powo"&&mode!=="search"){
  if(mode==="roots")throw new Error("POWO_HAS_NO_COMPLETE_KINGDOM_TREE_USE_ITIS_OR_COL");
  const d=await sourceJson(`https://powo.science.kew.org/api/2/taxon/${id}`,fetcher);
  if(!Array.isArray(d.childNameUsages))throw new Error("POWO_CHILDREN_NOT_PROVIDED");
  const start=Number(cursor||0);if(!Number.isSafeInteger(start)||start<0)throw new Error("INVALID_CURSOR");
  const records=d.childNameUsages.slice(start,start+36).map((r:Row)=>{const n=powoNode(r);n.parentId=id;return n;});
  return {records,total:d.childNameUsages.length,next:start+records.length<d.childNameUsages.length?String(start+records.length):null,version:"live"};
 }
 // POWO's official search API uses a cursor. No synthetic rank levels are created.
 const url=new URL("https://powo.science.kew.org/api/2/search");url.searchParams.set("perPage","36");url.searchParams.set("cursor",cursor||"*");
 if(filters.rank){const f:Record<string,string>={GENUS:"genus_f",SPECIES:"species_f",FAMILY:"families_f"};const value=f[normalizedRank(filters.rank)];if(!value)throw new Error("POWO_RANK_SEARCH_NOT_SUPPORTED");url.searchParams.set("f",value);}
 url.searchParams.set("q",mode==="search"?q:mode==="roots"?"family:*":`parent:${id}`);
 const d=await sourceJson(url,fetcher),records=array(d.results).map(powoNode);return {records,total:typeof d.totalResults==="number"?d.totalResults:null,next:d.cursor&&d.cursor!==(cursor||"*")?String(d.cursor):null,version:"live"};
}
