import {archiveLifePage,archiveLifeSearch,contextualTaxon,lifeTaxon,lifeAncestry,lifeArchive,lifeGroups} from "../../life-catalog.ts";
import type {LifePage,LifeOccurrence} from "../../life-types.ts";
import {isSpeciesRank} from "../../life-types.ts";
import flora from "../../data/tubives.json" with {type:"json"};
import medicinal from "../../data/medicinal-taxa.json" with {type:"json"};
import {licensedPhotos} from "../../feed-data.ts";
import {ResolvedSourceCache} from "../../resolved-source-cache.ts";
type Raw=Record<string,any>;
const API="https://api.gbif.org/v1",cache=new ResolvedSourceCache<any>(4*1024*1024,120);
const norm=(s:string)=>s.toLocaleLowerCase("tr").replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export async function handleLife(request:Request,fetcher:typeof fetch=fetch){
 const p=new URL(request.url).searchParams,mode=p.get("mode")||"node",id=p.get("id")||"life",offset=Number(p.get("offset")||0),q=(p.get("q")||"").trim(),name=(p.get("name")||"").trim(),fresh=p.get("fresh")==="1";
 if(!["node","children","search","resolve","species","media","cover","occurrences","collections"].includes(mode)||!(/^(gbif-[1-9]\d{0,9}|life|domain-(eukarya|bacteria|archaea))$/).test(id)||!Number.isInteger(offset)||offset<0||offset>99000||q.length>160||name.length>200)return Response.json({error:"INVALID_QUERY"},{status:400});
 const year=p.get("year");if(year){const current=new Date().getFullYear();if(!/^\d{4},\d{4}$/.test(year))return Response.json({error:"INVALID_YEAR"},{status:400});const[a,b]=year.split(",").map(Number);if(a<1500||b>current||a>b)return Response.json({error:"INVALID_YEAR"},{status:400});}
 const bounds=p.get("bounds")?.split(",").map(Number),country=p.get("country");
 if(country&&!/^[A-Z]{2}$/.test(country)||bounds&&(bounds.length!==4||bounds.some(n=>!Number.isFinite(n))||bounds[0]<-180||bounds[2]>180||bounds[1]<-85||bounds[3]>85||bounds[0]>=bounds[2]||bounds[1]>=bounds[3]))return Response.json({error:"INVALID_REGION"},{status:400});
 async function get(path:string){const url=API+path,previous=fetcher===fetch&&!fresh?cache.get(url):undefined;if(previous!==undefined)return previous;const response=await fetcher(url,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error(`UPSTREAM_${response.status}`);const data=response.status===204?null:await response.json();if(fetcher===fetch)cache.set(url,data,600000);return data;}
 const respond=(data:unknown,seconds=600)=>Response.json(data,{headers:{"Cache-Control":`public, max-age=${seconds}`}});
 const key=id.replace("gbif-","");
 function floraLinks(r:Raw,node:LifePage["node"]){
  if(r.kingdom!=="Plantae"||!isSpeciesRank(r.rank)||!r.canonicalName||node.status!=="ACCEPTED")return node;
  const fields:[[string,string],...Array<[string,string]>]=[["Habitat","habitat"],["Yaşam süresi","life"],["Büyüme şekli","form"],["Çiçeklenme ayları","flowering"],["Rakım (metre)","elevation"],["Türkiye’de yayılış","turkeyRange"],["Dünya yayılışı","globalRange"],["Endemizm","endemism"],["Fitocoğrafik bölge","floristicRegion"]];
  const rows=flora.records.filter(f=>norm(f.name)===norm(r.canonicalName)&&f.rank.toUpperCase()===r.rank&&(!r.family||f.family===r.family));
  return {...node,floraRecords:rows.map(f=>({id:f.id,name:f.name,rank:f.rank,source:f.source,fields:fields.map(([label,key])=>({label,value:String((f as unknown as Record<string,unknown>)[key]||"")})).filter(v=>v.value&&!/^(\?|bilinmiyor)$/i.test(v.value)),}))};
 }
 function enrich(page:LifePage|null){if(!page)return null;const r=lifeArchive.records[page.node.id.replace("gbif-","")];return r?{...page,node:floraLinks(r,page.node)}:page;}

 try{
  if(mode==="resolve"){
   if(!name)return Response.json({error:"NAME_REQUIRED"},{status:400});
   const found=Object.values(lifeArchive.records).filter(r=>r.taxonomicStatus==="ACCEPTED"&&[r.canonicalName,r.scientificName].some(n=>typeof n==="string"&&norm(n)===norm(name))).map(r=>lifeTaxon(r,lifeArchive.details[r.key]));
   if(found.length===1)return respond({taxon:found[0],cached:true});
   const m=await get(`/species/match?strict=true&name=${encodeURIComponent(name)}`);
   if(m?.matchType!=="EXACT"||!m.usageKey)return respond({taxon:null,unmatched:true});
   const raw=await get(`/species/${m.acceptedUsageKey||m.usageKey}`);return respond({taxon:lifeTaxon(raw,{},new Date().toISOString()),cached:false});
  }
  if(mode==="search"){
   if(q.length<2)return respond({records:[],flora:[],hasMore:false,nextOffset:0,cached:true});
   const local=archiveLifeSearch(q),value=norm(q);const localFlora=offset?[]:flora.records.filter(r=>norm([r.name,r.commonName,r.genus,r.family].join(" ")).includes(value)).slice(0,12).map(r=>({id:r.id,name:r.name,turkishName:r.commonName||"",family:r.family}));
   if(p.get("scope")==="archive")return respond({records:offset?[]:local,flora:localFlora,hasMore:false,nextOffset:0,cached:true},300);
   try{const data=await get(`/species/search?datasetKey=${lifeArchive.datasetId}&status=ACCEPTED&limit=24&offset=${offset}&q=${encodeURIComponent(q)}`);const records=(data.results||[]).filter((r:Raw)=>r.taxonomicStatus==="ACCEPTED").map((r:Raw)=>lifeTaxon(r,{},new Date().toISOString()));return respond({records:[...new Map([...(!offset?local:[]),...records].map(r=>[r.id,r])).values()],flora:localFlora,hasMore:!data.endOfRecords,nextOffset:offset+24,cached:false},300);}catch{if(local.length||localFlora.length)return respond({records:offset?[]:local,flora:localFlora,hasMore:false,nextOffset:0,cached:true},60);throw new Error("SEARCH_UNAVAILABLE");}
  }
  if(mode==="collections"){
   const collection=p.get("collection")||"trees",month=new Date().getUTCMonth()+1;
   if(!["trees","shrubs","herbs","climbers","ferns","mosses","aquatic","endemic","medicinal","season","recent"].includes(collection))return Response.json({error:"INVALID_COLLECTION"},{status:400});
   if(collection==="recent"){const records=Object.values(lifeArchive.records).filter(r=>r.taxonomicStatus==="ACCEPTED"&&isSpeciesRank(r.rank)).sort((a,b)=>(lifeArchive.importedAt[b.key]||"").localeCompare(lifeArchive.importedAt[a.key]||""));return respond({records:records.slice(offset,offset+24).map(r=>lifeTaxon(r,lifeArchive.details[r.key])),flora:[],total:records.length,hasMore:offset+24<records.length,nextOffset:offset+24});}
   const matches=flora.records.filter(r=>{
    const form=norm(r.form),habitat=norm(r.habitat),n=norm(r.name);
    if(collection==="trees")return form.includes("agac")&&!form.includes("agaccik");if(collection==="shrubs")return /cali|agaccik/.test(form);if(collection==="herbs")return /(^|\s)ot($|\s)|otsu/.test(form);if(collection==="climbers")return /sarilici|tirmanici/.test(form);if(collection==="endemic")return norm(r.endemism)==="endemik";
    if(collection==="ferns")return r.hierarchy?.some((x:{name:string})=>["Pteridophyta","Pteridopsida","Polypodiopsida","Filicopsida"].includes(x.name));if(collection==="mosses")return r.hierarchy?.some((x:{name:string})=>["Bryophyta","Bryopsida"].includes(x.name));if(collection==="aquatic")return /sucul|su ici|su bitki/.test(form)||/su icinde|sucul|tatli sularda|durgun sularda/.test(habitat);
    if(collection==="season"){const range=r.flowering.match(/^\s*(\d{1,2})\s*[-–]\s*(\d{1,2})\s*$/);if(!range)return false;const a=Number(range[1]),b=Number(range[2]);return a>=1&&a<=12&&b>=1&&b<=12&&(a<=b?month>=a&&month<=b:month>=a||month<=b);}
    if(collection==="medicinal")return medicinal.records.some(tag=>tag.name===r.name&&tag.rank===r.rank);
    return false;
   });return respond({flora:matches.slice(offset,offset+24).map(r=>({id:r.id,name:r.name,turkishName:r.commonName||"",family:r.family,monograph:collection==="medicinal"?medicinal.records.find(tag=>tag.name===r.name&&tag.rank===r.rank):undefined})),total:matches.length,hasMore:offset+24<matches.length,nextOffset:offset+24,collection,month,source:"Türkiye flora kaynak kayıtları",note:"Keşif filtreleri taksonomik rütbe değildir."});
  }
  if(mode==="cover"){const photo=archiveLifePage(id)?.node.images[0];if(photo)return respond({image:photo,cached:true});}
  if(["media","cover","occurrences"].includes(mode)){
   const params=new URLSearchParams({occurrenceStatus:"PRESENT",hasGeospatialIssue:"false",checklistKey:lifeArchive.datasetId,limit:mode==="cover"?"12":mode==="media"?"24":"120",offset:String(offset)});if(id.startsWith("gbif-"))params.set("taxonKey",key);else for(const g of lifeGroups.filter(g=>id==="life"||`domain-${g.domain}`===id))params.append("kingdomKey",String(g.key));
   if(mode==="media"||mode==="cover")params.set("mediaType","StillImage");else params.set("hasCoordinate","true");if(country)params.set("country",country);if(year)params.set("year",year);if(bounds){const[w,s,e,n]=bounds;params.set("geometry",`POLYGON((${w} ${s},${e} ${s},${e} ${n},${w} ${n},${w} ${s}))`);}
   const d=await get(`/occurrence/search?${params}`),at=new Date().toISOString();
   if(mode==="cover"||mode==="media"){
    const current=lifeArchive.records[key],photos=(d.results||[]).filter((r:Raw)=>!(Array.isArray(r.issues)?r.issues:Array.isArray(r.issue)?r.issue:[]).some(issue=>["TAXON_MATCH_HIGHERRANK","TAXON_MATCH_NONE","TAXON_MATCH_FUZZY"].includes(String(issue)))).filter((r:Raw)=>!current||current.rank!=="SPECIES"||r.speciesKey===Number(key)).flatMap((r:Raw)=>licensedPhotos(r.media).filter(photo=>Boolean(photo.credit)||photo.license.includes("publicdomain")).map(photo=>({url:photo.url,credit:photo.credit,license:photo.license,source:photo.reference||`https://www.gbif.org/occurrence/${r.key}`,subject:r.species||r.scientificName}))).filter((p:{subject?:string})=>Boolean(p.subject));
    return mode==="cover"?respond({image:photos[0]||null,retrievedAt:at}):respond({images:photos,hasMore:!d.endOfRecords,nextOffset:offset+24,retrievedAt:at});
   }
   const records:LifeOccurrence[]=(d.results||[]).filter((r:Raw)=>Number.isSafeInteger(r.key)&&Number.isSafeInteger(r.speciesKey||r.taxonKey)&&typeof r.decimalLatitude==="number"&&typeof r.decimalLongitude==="number"&&Math.abs(r.decimalLatitude)<=85&&Math.abs(r.decimalLongitude)<=180).map((r:Raw)=>({id:r.key,taxonId:`gbif-${r.speciesKey||r.taxonKey}`,name:String(r.species||r.scientificName||""),point:[r.decimalLatitude,r.decimalLongitude],place:[r.locality||r.stateProvince,r.country].filter(Boolean).join(" · "),date:String(r.eventDate||"").split("T")[0],source:`https://www.gbif.org/occurrence/${r.key}`}));return respond({records,total:d.count,hasMore:!d.endOfRecords,nextOffset:offset+120,retrievedAt:at},300);
  }
  if(contextualTaxon(id))return respond(archiveLifePage(id));
  const cached=archiveLifePage(id);
  if(mode==="node"&&cached&&!fresh&&lifeArchive.children[key])return respond(enrich(cached));
  if(mode==="children"&&offset===0&&!fresh&&lifeArchive.children[key])return respond(enrich(cached));
  if(mode==="species"){
   const d=await get(`/species/search?datasetKey=${lifeArchive.datasetId}&status=ACCEPTED&rank=SPECIES&highertaxon_key=${key}&limit=24&offset=${offset}`);return respond({records:(d.results||[]).filter((r:Raw)=>r.key!==Number(key)&&r.taxonomicStatus==="ACCEPTED"&&r.rank==="SPECIES").map((r:Raw)=>lifeTaxon(r)),hasMore:!d.endOfRecords,nextOffset:offset+24,total:d.count});
  }
  if(mode==="children"&&cached&&!fresh){const c=await get(`/species/${key}/children?limit=48&offset=${offset}`);return respond({...cached,children:(c.results||[]).filter((r:Raw)=>r.taxonomicStatus==="ACCEPTED").map((r:Raw)=>lifeTaxon(r)),offset,nextOffset:offset+48,hasMore:!c.endOfRecords});}
  const details:Record<string,{results:Raw[]}>=fresh?{}:lifeArchive.details[key]||{};
  const [r,parents,children,status]=await Promise.all([get(`/species/${key}`),get(`/species/${key}/parents`),get(`/species/${key}/children?limit=48&offset=${offset}`),get(`/species/${key}/iucnRedListCategory`).catch(()=>null),...(!lifeArchive.details[key]||fresh?["vernacularNames","descriptions","distributions","synonyms"].map(async field=>{try{details[field]=await get(`/species/${key}/${field}?limit=30`);}catch{details[field]={results:[]};}}):[])]),at=new Date().toISOString();
  const node=floraLinks(r,lifeTaxon(r,details,at));if(status?.category)node.conservation={status:String(status.category),source:`https://www.gbif.org/species/${key}`};
  const page:LifePage={node,ancestry:lifeAncestry(r,parents,at),children:(children.results||[]).filter((r:Raw)=>r.taxonomicStatus==="ACCEPTED").map((r:Raw)=>lifeTaxon(r,{},at)).sort((a:LifePage["node"],b:LifePage["node"])=>(b.descendants||0)-(a.descendants||0)),offset,nextOffset:offset+48,hasMore:!children.endOfRecords,cached:false,retrievedAt:at};return respond(page);
 }catch{if(mode==="node"&&offset===0){const cached=archiveLifePage(id);if(cached)return respond({...enrich(cached),unavailable:true},60);}return Response.json({error:"SOURCE_UNAVAILABLE"},{status:503});}
}
