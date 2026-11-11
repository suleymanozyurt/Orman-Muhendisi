import {licensedPhotos} from "../../feed-data.ts";
import {gbifDatasetId,gbifPageSize,gbifParams,gbifSearchLink,gbifSourceParams,gbifTileTemplate,readGbifQuery} from "../../gbif-query.ts";
import type {GbifOccurrence,GbifDataset,GbifFacet} from "../../gbif-types";
import {ResolvedSourceCache} from "../../resolved-source-cache.ts";
type Raw=Record<string,any>;
const cache=new ResolvedSourceCache<any>(4*1024*1024,80);
const text=(value:unknown,max=300)=>typeof value==="string"?value.slice(0,max):"";
const url=(value:unknown)=>{try{const u=new URL(String(value));return u.protocol==="https:"&&!u.username&&!u.password?u.href:"";}catch{return "";}};
const number=(value:unknown)=>typeof value==="number"&&Number.isFinite(value)&&value>=0?value:undefined;
export function gbifLicense(value:unknown){
  const aliases:Record<string,string>={CC0_1_0:"https://creativecommons.org/publicdomain/zero/1.0/",CC_BY_4_0:"https://creativecommons.org/licenses/by/4.0/",CC_BY_NC_4_0:"https://creativecommons.org/licenses/by-nc/4.0/"};
  return typeof value==="string"?aliases[value]||text(value):"";
}
export function gbifOccurrence(r:Raw):GbifOccurrence|null{
  if(!Number.isSafeInteger(r.key)||r.key<=0)return null;
  const lat=r.decimalLatitude,lng=r.decimalLongitude;
  const withheld=text(r.informationWithheld,1000),generalization=text(r.dataGeneralizations,1000);
  // Use only the coordinates actually published by the source. Do not recover
  // locations withheld by the publisher from another field or dataset.
  const point=typeof lat==="number"&&typeof lng==="number"&&Number.isFinite(lat)&&Number.isFinite(lng)&&Math.abs(lat)<=90&&Math.abs(lng)<=180?[lat,lng] as [number,number]:undefined;
  const taxonKey=Number.isSafeInteger(r.taxonKey)&&r.taxonKey>0?r.taxonKey:undefined;
  return {id:r.key,taxonKey,name:text(r.scientificName||r.species),acceptedName:text(r.acceptedScientificName),rank:text(r.taxonRank),status:text(r.occurrenceStatus),basis:text(r.basisOfRecord),date:text(r.eventDate,100),year:number(r.year),place:[r.locality,r.stateProvince,r.country].filter(v=>typeof v==="string"&&v).map(v=>text(v)).join(" · "),country:text(r.countryCode,2),point,uncertainty:number(r.coordinateUncertaintyInMeters),datasetKey:gbifDatasetId(String(r.datasetKey||""))?r.datasetKey:"",datasetTitle:text(r.datasetName),publisher:text(r.publisher),recordedBy:text(r.recordedBy),identifiedBy:text(r.identifiedBy),institution:text(r.institutionCode),collection:text(r.collectionCode),catalogueNumber:text(r.catalogNumber),occurrenceId:text(r.occurrenceID,1000),license:gbifLicense(r.license),issues:(Array.isArray(r.issues)?r.issues:[]).filter((v:unknown)=>typeof v==="string").slice(0,40),informationWithheld:withheld,generalization,classification:["kingdom","phylum","class","order","family","genus","species"].flatMap(rank=>typeof r[rank]==="string"&&r[rank]?[{rank,name:text(r[rank])}]:[]),photos:licensedPhotos(r.media).filter(p=>p.credit||p.license.includes("publicdomain")),hasMedia:Array.isArray(r.media)&&r.media.some((m:Raw)=>m.type==="StillImage"),source:`https://www.gbif.org/occurrence/${r.key}`};
}
const csvCell=(value:unknown)=>'"'+String(value??"").replace(/^\s*[=+@-]/,"'$&").replace(/"/g,'""')+'"';
export function gbifCsv(records:GbifOccurrence[]){
  const columns=["gbifID","scientificName","acceptedName","basisOfRecord","eventDate","countryCode","locality","decimalLatitude","decimalLongitude","coordinateUncertaintyInMeters","datasetKey","recordedBy","license","issues","source"];
  return [columns.map(csvCell).join(","),...records.map(r=>[r.id,r.name,r.acceptedName,r.basis,r.date,r.country,r.place,r.point?.[0],r.point?.[1],r.uncertainty,r.datasetKey,r.recordedBy,r.license,r.issues.join(";"),r.source].map(csvCell).join(","))].join("\r\n");
}
export async function handleGbif(request:Request,fetcher:typeof fetch=fetch){
  if(request.method!=="GET")return Response.json({error:"METHOD_NOT_ALLOWED"},{status:405});
  const p=new URL(request.url).searchParams,mode=p.get("mode")||"search",query=readGbifQuery(p),id=p.get("id")||"",format=p.get("format")||"json";
  if(!query||!["search","record","dataset","taxa","countries"].includes(mode)||!["json","csv"].includes(format)||mode==="record"&&(!/^[1-9]\d{0,15}$/.test(id)||!Number.isSafeInteger(Number(id)))||mode==="dataset"&&!gbifDatasetId(id)||mode==="taxa"&&id&&!/^[1-9]\d{0,9}$/.test(id)||format==="csv"&&mode!=="search")return Response.json({error:"INVALID_QUERY"},{status:400});
  async function get(path:string){
    const key="https://api.gbif.org/v1"+path,existing=fetcher===fetch?cache.get(key):undefined;if(existing!==undefined)return existing;
    const response=await fetcher(key,{headers:{Accept:"application/json"},signal:AbortSignal.timeout(path.startsWith("/occurrence/search")?25000:12000)});if(!response.ok)throw new Error(response.status===404?"NOT_FOUND":"SOURCE_UNAVAILABLE");const raw=await response.text();if(raw.length>2500000)throw new Error("SOURCE_TOO_LARGE");const data=JSON.parse(raw);
    if(fetcher===fetch)cache.set(key,data,180000);return data;
  }
  const respond=(data:unknown)=>Response.json(data,{headers:{"Cache-Control":"public, max-age=180"}});
  try{
    const retrievedAt=new Date().toISOString();
    if(mode==="countries"){
      const rows=await get("/enumeration/country");if(!Array.isArray(rows))throw new Error("INVALID_SOURCE");
      return respond({countries:rows.filter((row:Raw)=>/^[A-Z]{2}$/.test(row.iso2)).map((row:Raw)=>({code:row.iso2,title:text(row.title)}))});
    }
    if(mode==="taxa"){
      if(id){const row=await get(`/species/${id}`);if(row.key!==Number(id))throw new Error("NOT_FOUND");return respond({taxa:[{id:row.key,name:text(row.scientificName||row.canonicalName),rank:text(row.rank),family:text(row.family),status:text(row.taxonomicStatus)}],retrievedAt});}
      if(query.q.length<2)return respond({taxa:[]});
      const r=await get(`/species/search?${new URLSearchParams({q:query.q,limit:"12",datasetKey:"d7dddbf4-2cf0-4f39-9b2a-bb099caae36c"})}`);
      if(!Array.isArray(r.results))throw new Error("INVALID_SOURCE");
      return respond({taxa:r.results.filter((row:Raw)=>Number.isSafeInteger(row.key)&&row.key>0).map((row:Raw)=>({id:row.key,name:text(row.scientificName||row.canonicalName),rank:text(row.rank),family:text(row.family),status:text(row.taxonomicStatus)})),retrievedAt});
    }
    if(mode==="record"){
      const raw=await get(`/occurrence/${id}`);if(raw.key!==Number(id))throw new Error("NOT_FOUND");const record=gbifOccurrence(raw);if(!record)throw new Error("NOT_FOUND");return respond({record,retrievedAt});
    }
    if(mode==="dataset"){
      const r=await get(`/dataset/${id}`);if(r.key!==id)throw new Error("NOT_FOUND");
      let publisher="";if(gbifDatasetId(String(r.publishingOrganizationKey||"")))try{publisher=text((await get(`/organization/${r.publishingOrganizationKey}`)).title);}catch{/* Dataset identity remains available if its publisher service fails. */}
      const dataset:GbifDataset={id,title:text(r.title),type:text(r.type),description:text(r.description,900).replace(/<[^>]*>/g," ").replace(/\s+/g," ").trim(),license:gbifLicense(r.license),doi:text(r.doi),citation:text(r.citation?.text||r.citation,1200),publisher,homepage:url(r.homepage),source:`https://www.gbif.org/dataset/${id}`,retrievedAt};return respond({dataset});
    }
    const search=gbifSourceParams(query);for(const field of ["country","basisOfRecord","year","datasetKey"])search.append("facet",field);search.set("facetLimit","12");
    const r=await get(`/occurrence/search?${search}`);if(!Array.isArray(r.results)||!Number.isSafeInteger(r.count)||r.count<0)throw new Error("INVALID_SOURCE");
    const records=[...new Map(r.results.map(gbifOccurrence).filter((row:GbifOccurrence|null):row is GbifOccurrence=>row!==null).map((row:GbifOccurrence)=>[row.id,row])).values()] as GbifOccurrence[];
    if(format==="csv")return new Response("\uFEFF"+gbifCsv(records),{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=orman-muhendisi-gbif-sayfa.csv","Cache-Control":"public, max-age=180"}});
    const facets:GbifFacet[]=(Array.isArray(r.facets)?r.facets:[]).filter((f:Raw)=>["COUNTRY","BASIS_OF_RECORD","YEAR","DATASET_KEY"].includes(f.field)).map((f:Raw)=>({field:f.field,counts:(Array.isArray(f.counts)?f.counts:[]).filter((c:Raw)=>typeof c.name==="string"&&Number.isSafeInteger(c.count)&&c.count>=0).map((c:Raw)=>({name:text(c.name,100),count:c.count}))}));
    return respond({records,total:r.count,offset:query.offset,hasMore:!r.endOfRecords&&query.offset+gbifPageSize<Math.min(r.count,100000),facets,retrievedAt,source:gbifSearchLink(query),map:gbifTileTemplate(query),queryKey:gbifParams(query).toString()});
  }catch(error){return Response.json({error:error instanceof Error&&error.message==="NOT_FOUND"?"NOT_FOUND":"SOURCE_UNAVAILABLE"},{status:error instanceof Error&&error.message==="NOT_FOUND"?404:503,headers:{"Cache-Control":"no-store"}});}
}
