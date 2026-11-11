import type { Region } from "../../region-types";
export const dynamic="force-dynamic";
type Feature={geometry?:{coordinates?:number[]};properties?:{osm_id?:number;osm_type?:string;name?:string;state?:string;city?:string;country?:string;countrycode?:string;type?:string;osm_value?:string;extent?:number[]}};
const cache=new Map<string,{at:number;regions:Region[]}>();
const pending=new Map<string,Promise<Region[]>>();
export function regionFromFeature(feature:Feature,language:string):Region|null {
 const p=feature.properties,c=feature.geometry?.coordinates;if(!p||!c||c.length!==2||c.some(x=>!Number.isFinite(x))||Math.abs(c[0])>180||Math.abs(c[1])>85)return null;
 const kind=p.type==="country"||p.osm_value==="country"?"country":p.type==="state"||["state","province","region"].includes(p.osm_value||"")?"state":"city";
 const code=(p.countrycode||"").toUpperCase();
 const countryName=/^[A-Z]{2}$/.test(code)?new Intl.DisplayNames([language],{type:"region"}).of(code):p.country;
 const parts=kind==="country"?[countryName||p.name]:[p.name||p.city||p.state,p.state,countryName];
 const label=[...new Set(parts.filter(Boolean))].join(" · ");if(!label)return null;
 const extent=p.extent;let bounds:Region["bounds"]|undefined;
 // Photon extents are west, north, east, south; output is west, south, east, north.
 if(extent?.length===4&&extent.every(Number.isFinite)&&extent[0]>=-180&&extent[2]<=180&&extent[3]>=-85&&extent[1]<=85&&extent[0]<extent[2]&&extent[3]<extent[1])bounds=[extent[0],extent[3],extent[2],extent[1]];
 const approximate=!bounds;
 if(!bounds){const radius=kind==="country"?4:kind==="state"?1:.25;bounds=[Math.max(-180,c[0]-radius),Math.max(-85,c[1]-radius),Math.min(180,c[0]+radius),Math.min(85,c[1]+radius)];}
 return {id:`${p.osm_type||"place"}-${p.osm_id||label}`,label,kind,country:/^[A-Z]{2}$/.test(code)?code:"",bounds,approximate};
}
export async function GET(request:Request){
 const input=new URL(request.url).searchParams,q=(input.get("q")||"").trim(),reverse=input.has("lat")||input.has("lng"),language=input.get("language")==="en"?"en":"tr";
 const lat=Number(input.get("lat")),lng=Number(input.get("lng"));
 if(reverse?(!input.get("lat")||!input.get("lng")||!Number.isFinite(lat)||!Number.isFinite(lng)||Math.abs(lat)>85||Math.abs(lng)>180):(q.length<2||q.length>120))return Response.json({error:"INVALID_REGION"},{status:400});
 const params=new URLSearchParams({limit:reverse?"1":"10"});
 if(reverse){params.set("lat",lat.toFixed(3));params.set("lon",lng.toFixed(3));params.set("radius","40");}else params.set("q",q);
 for(const layer of ["country","state","city"])params.append("layer",layer);
 const key=`${reverse?"reverse":"api"}?${params}&language=${language}`;
 try{
  const found=cache.get(key);let regions:Region[];
  if(found&&Date.now()-found.at<86400000)regions=found.regions;
  else {
   let task=pending.get(key);
   if(!task){task=(async()=>{
    const response=await fetch(`https://photon.komoot.io/${reverse?"reverse":"api"}/?${params}`,{headers:{Accept:"application/json","Accept-Language":language,"User-Agent":"OrmanMuhendisi regional plant explorer"},signal:AbortSignal.timeout(12000)});
    if(!response.ok)throw new Error("REGION_SERVICE_UNAVAILABLE");const data=await response.json() as {features:Feature[]};if(!Array.isArray(data.features))throw new Error("INVALID_RESPONSE");
    const regions=data.features.map(feature=>regionFromFeature(feature,language)).filter((r):r is Region=>Boolean(r));
    if(cache.size>=300)cache.delete(cache.keys().next().value!);cache.set(key,{at:Date.now(),regions});return regions;
   })();pending.set(key,task);}
   try{regions=await task;}finally{pending.delete(key);}
  }
  return Response.json({regions,source:"OpenStreetMap / Photon"},{headers:{"Cache-Control":reverse?"private, max-age=3600":"public, max-age=86400"}});
 }catch{return Response.json({error:"REGION_SERVICE_UNAVAILABLE"},{status:503});}
}
