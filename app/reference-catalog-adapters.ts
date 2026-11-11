import type {CatalogNode} from "./catalog-types.ts";
const text=(value:unknown)=>typeof value==="string"?value:"";
const strings=(value:unknown):string[]=>Array.isArray(value)?value.filter(v=>typeof v==="string"):[];
const records=(value:unknown):Record<string,unknown>[]=>Array.isArray(value)?value.filter(v=>v&&typeof v==="object"):[];
export const powoId=(value:string)=>/^urn:lsid:ipni\.org:names:\d+-\d+$/.test(value);
export function powoTaxon(row:Record<string,unknown>):CatalogNode {
 const id=text(row.fqId),classification=records(row.classification);
 return {id,name:text(row.name),canonicalName:text(row.name),commonName:"",rank:text(row.rank).toLowerCase(),source:`https://powo.science.kew.org/taxon/${id}`,
  author:text(row.authors)||text(row.author),family:text(row.family),genus:text(row.genus),modified:text(row.modified),
  taxonomicStatus:text(row.taxonomicStatus)||(typeof row.accepted==="boolean"?row.accepted?"Accepted":"Synonym":""),publishedIn:text(row.reference),
  ancestry:classification.filter(r=>powoId(text(r.fqId))&&text(r.name)).map(r=>({id:text(r.fqId),name:text(r.name),rank:text(r.rank).toLowerCase()})),
  synonyms:records(row.synonyms).filter(r=>text(r.name)).map(r=>({name:text(r.name),reference:[text(r.author),text(r.taxonomicStatus)].filter(Boolean).join(" · ")})),
  citations:[text(row.bibliographicCitation)].filter(Boolean)};
}
export function itisTaxon(row:Record<string,unknown>):CatalogNode {
 const id=text(row.tsn),ids=(strings(row.hierarchyTSN)[0]||"").split("$").filter(Boolean);
 const path=(strings(row.hierarchySoFarWRanks)[0]||"").split("$").slice(1).filter(Boolean);
 const ancestry=path.map((s,i)=>{const split=s.indexOf(":");return {id:ids[i]||"",rank:s.slice(0,split).toLowerCase(),name:s.slice(split+1).trim()};}).filter(r=>/^\d+$/.test(r.id)&&r.name);
 const vernacular=strings(row.vernacular).map(s=>s.split("$")).find(s=>s[2]==="Turkish")||strings(row.vernacular).map(s=>s.split("$"))[0];
 return {id,name:text(row.nameWOInd),canonicalName:text(row.nameWOInd),commonName:vernacular?.[1]||"",rank:text(row.rank).toLowerCase(),source:`https://www.itis.gov/servlet/SingleRpt/SingleRpt?search_topic=TSN&search_value=${id}`,
  author:text(row.taxonAuthor),taxonomicStatus:text(row.usage),modified:text(row.updateDate),ancestry,
  family:ancestry.find(r=>r.rank==="family")?.name,genus:ancestry.find(r=>r.rank==="genus")?.name,
  citations:strings(row.publication).map(s=>s.split("$").filter(Boolean).join(" · ").slice(0,1000)),
  synonyms:strings(row.synonyms).flatMap(s=>s.split("$").slice(1).filter(Boolean).map(name=>({name,reference:"ITIS"})))};
}
// Escape user text as literals; it must never become Solr query syntax.
export const solrLiteral=(value:string)=>value.replace(/([+\-!(){}\[\]^"~*?:\\/$&|])/g,"\\$1");
