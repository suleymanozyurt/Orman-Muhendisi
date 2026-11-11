export const gbifBases = ["HUMAN_OBSERVATION","MACHINE_OBSERVATION","OBSERVATION","PRESERVED_SPECIMEN","LIVING_SPECIMEN","FOSSIL_SPECIMEN","MATERIAL_SAMPLE","MATERIAL_CITATION","OCCURRENCE"] as const;
export type GbifQuery = {q:string;taxonKey:string;country:string;startYear:string;endYear:string;basis:string;dataset:string;coordinates:boolean;excludeIssues:boolean;images:boolean;status:string;offset:number};
export const gbifPageSize=40;
export const emptyGbif:GbifQuery={q:"",taxonKey:"",country:"TR",startYear:"",endYear:"",basis:"",dataset:"",coordinates:true,excludeIssues:true,images:false,status:"",offset:0};
const fields=Object.keys(emptyGbif) as (keyof GbifQuery)[];
export const gbifRouteKeys=fields.map(key=>`gbif-${key}`);
const validId=(value:string)=>!value||/^[1-9]\d{0,9}$/.test(value);
export const gbifDatasetId=(value:string)=>/^[a-f\d]{8}-(?:[a-f\d]{4}-){3}[a-f\d]{12}$/i.test(value);
export function readGbifQuery(params:URLSearchParams,route=false):GbifQuery|null{
  const result={...emptyGbif};
  for(const key of fields){
    const value=params.get(route?`gbif-${key}`:key);if(value===null)continue;
    if(["coordinates","excludeIssues","images"].includes(key)){
      if(!["0","1"].includes(value))return null;(result as unknown as Record<string,unknown>)[key]=value==="1";
    }else if(key==="offset"){
      if(!/^\d+$/.test(value))return null;result.offset=Number(value);
    }else (result as unknown as Record<string,unknown>)[key]=value.trim();
  }
  const current=new Date().getUTCFullYear();
  const year=(value:string)=>!value||/^\d{4}$/.test(value)&&Number(value)>=1500&&Number(value)<=current;
  if(result.q.length>200||!validId(result.taxonKey)||result.country&&!/^[A-Z]{2}$/.test(result.country)||!year(result.startYear)||!year(result.endYear)||result.startYear&&result.endYear&&Number(result.startYear)>Number(result.endYear)||result.basis&&!gbifBases.includes(result.basis as typeof gbifBases[number])||result.dataset&&!gbifDatasetId(result.dataset)||!Number.isSafeInteger(result.offset)||result.offset<0||result.offset>100000-gbifPageSize||!["","PRESENT","ABSENT"].includes(result.status))return null;
  return result;
}
export function gbifParams(query:GbifQuery,route=false){
  const params=new URLSearchParams();
  for(const key of fields){const value=query[key];params.set(route?`gbif-${key}`:key,typeof value==="boolean"?(value?"1":"0"):String(value));}
  return params;
}
export function gbifSourceParams(query:GbifQuery){
  const p=new URLSearchParams({limit:String(gbifPageSize),offset:String(query.offset)});
  for(const [field,key] of [["q","q"],["taxonKey","taxonKey"],["country","country"],["basis","basisOfRecord"],["dataset","datasetKey"],["status","occurrenceStatus"]] as const)if(query[field])p.set(key,query[field]);
  if(query.startYear||query.endYear)p.set("year",`${query.startYear||1500},${query.endYear||new Date().getUTCFullYear()}`);
  if(query.coordinates)p.set("hasCoordinate","true");if(query.excludeIssues)p.set("hasGeospatialIssue","false");if(query.images)p.set("mediaType","StillImage");
  return p;
}
export function gbifSearchLink(query:GbifQuery){
  const p=gbifSourceParams(query);p.delete("limit");p.delete("offset");
  const names:Record<string,string>={taxonKey:"taxon_key",basisOfRecord:"basis_of_record",datasetKey:"dataset_key",occurrenceStatus:"occurrence_status",hasCoordinate:"has_coordinate",hasGeospatialIssue:"has_geospatial_issue",mediaType:"media_type"};
  const link=new URL("https://www.gbif.org/occurrence/search");for(const [key,value] of p)link.searchParams.append(names[key]||key,value);return link.href;
}
export function gbifTileTemplate(query:GbifQuery){
  // The adhoc endpoint supports every occurrence-search filter. Density tiles
  // support fewer filters and would silently show a broader search.
  const p=gbifSourceParams(query);p.delete("limit");p.delete("offset");p.set("style","green.poly");p.set("bin","hex");p.set("hexPerTile","32");p.set("srs","EPSG:3857");
  return `https://api.gbif.org/v2/map/occurrence/adhoc/{z}/{x}/{y}@1x.png?${p}`;
}
