import type {NatureObservation,NatureTaxon,NaturePhoto,NatureSuggestion} from "../../nature-types.ts";
import snapshot from "../../data/nature-cache.json" with {type:"json"};
import {ResolvedSourceCache} from "../../resolved-source-cache.ts";
const allowed=new Set(['cc0','cc-by','cc-by-sa']);
const upstream="https://api.inaturalist.org/v1/";
const cache=new ResolvedSourceCache<{total_results:number;results:Record<string,any>[]}>(4*1024*1024,100);
const groupIds:Record<string,string>={plants:'47126',fungi:'47170',birds:'3'};
const imageURL=(x:unknown)=>{try{const u=new URL(String(x));return u.protocol==='https:'&&['static.inaturalist.org','inaturalist-open-data.s3.amazonaws.com','inaturalist-open-data.s3.us-east-1.amazonaws.com'].includes(u.hostname)?u.href:null;}catch{return null;}};
const clean=(x:unknown,max=300)=>typeof x==='string'?x.slice(0,max):'';
const normalized=(x:string)=>x.toLocaleLowerCase('tr').replace(/ı/g,'i').normalize('NFD').replace(/[\u0300-\u036f]/g,'').trim();
export const natureLicenseUrl=(license:string)=>license==='cc0'?'https://creativecommons.org/publicdomain/zero/1.0/':`https://creativecommons.org/licenses/${license==='cc-by-sa'?'by-sa':'by'}/4.0/`;
export function natureObservation(o:Record<string,any>):NatureObservation|null{
 if(!Number.isSafeInteger(o.id)||!o.taxon||!allowed.has(o.license_code))return null;
 const photos:NaturePhoto[]=(o.photos||[]).flatMap((p:Record<string,any>)=>{const url=imageURL(p.medium_url||p.url);return url&&allowed.has(p.license_code)&&Number.isSafeInteger(p.id)?[{url:url.replace('/square.','/medium.'),credit:clean(p.attribution||p.attribution_name||o.user?.login),license:p.license_code,source:`https://www.inaturalist.org/photos/${p.id}`}]:[];}).slice(0,6);if(!photos.length)return null;
 const hidden=Boolean(o.obscured||['obscured','private'].includes(o.geoprivacy)||['obscured','private'].includes(o.taxon_geoprivacy)),p=o.geojson?.coordinates;
 const point=!hidden&&Array.isArray(p)&&p.length===2&&p.every((v:unknown)=>typeof v==='number'&&Number.isFinite(v))&&Math.abs(p[0])<=180&&Math.abs(p[1])<=90?[p[1],p[0]] as [number,number]:undefined;
 return {id:o.id,name:clean(o.taxon.name),commonName:clean(o.taxon.preferred_common_name),taxonId:Number(o.taxon.id),group:clean(o.taxon.iconic_taxon_name),date:clean(o.observed_on,20),author:clean(o.user?.name||o.user?.login,100),place:hidden?'Konum gizlenmiş':clean(o.place_guess),point,quality:clean(o.quality_grade),license:o.license_code,photos,source:`https://www.inaturalist.org/observations/${o.id}`,obscured:hidden};
}
const validDate=(s:string)=>!s||/^\d{4}-\d{2}-\d{2}$/.test(s)&&Number.isFinite(Date.parse(s))&&new Date(s).toISOString().slice(0,10)===s&&s>='1500-01-01'&&s<=new Date().toISOString().slice(0,10);
export async function handleNature(request:Request,fetcher:typeof fetch=fetch){
 const p=new URL(request.url).searchParams,mode=p.get('mode')||'observations',q=p.get('q')?.trim()||'',group=p.get('group')||'plants',page=Number(p.get('page')||1),scope=p.get('scope')||'turkey',locale=p.get('language')==='en'?'en':'tr',start=p.get('start')||'',end=p.get('end')||'';
 const bounds=p.has('bounds')?(p.get('bounds')||'').split(',').map(Number):undefined;
 const validBounds=!bounds||bounds.length===4&&bounds.every(Number.isFinite)&&bounds[0]>=-180&&bounds[2]<=180&&bounds[1]>=-90&&bounds[3]<=90&&bounds[0]<bounds[2]&&bounds[1]<bounds[3];
 if(!['observations','taxon'].includes(mode)||!['all','plants','fungi','birds'].includes(group)||!['turkey','world','area'].includes(scope)||!Number.isInteger(page)||page<1||page>400||q.length>200||!validBounds||scope==='area'&&!bounds||!validDate(start)||!validDate(end)||start&&end&&start>end)return Response.json({error:'Arama bilgileri geçersiz.'},{status:400});
 const id=p.get('id');if(id&&!/^[1-9]\d{0,8}$/.test(id))return Response.json({error:'Takson geçersiz.'},{status:400});
 try{
  const get=async(url:URL)=>{
   const key=url.href,existing=fetcher===fetch?cache.get(key):undefined;if(existing)return existing;
   const read=async()=>{const response=await fetcher(url,{headers:{Accept:'application/json','User-Agent':'https://ormanmuhendisi.suleymanozyurt49.chatgpt.site'},signal:AbortSignal.timeout(12000)});if(!response.ok)throw new Error('Nature service unavailable');const d=await response.json() as {total_results:number;results:Record<string,any>[]};if(!Array.isArray(d.results)||!Number.isSafeInteger(d.total_results))throw new Error('invalid upstream');return d;};
   const data=await read();if(fetcher===fetch)cache.set(key,data,url.pathname.includes('/taxa')?600000:180000);return data;
  };
  if(mode==='taxon'){
   if(!id)return Response.json({error:'Takson gerekli.'},{status:400});const url=new URL(`taxa/${id}`,upstream);url.searchParams.set('locale',locale);const d=await get(url),r=d.results[0];if(!r||!Number.isSafeInteger(r.id))return Response.json({error:'Takson bulunamadı.'},{status:404});
   const taxon:NatureTaxon={id:r.id,name:clean(r.name),commonName:clean(r.preferred_common_name),rank:clean(r.rank),observations:Number(r.observations_count)||0,ancestry:[...(r.ancestors||[]),r].map(n=>({id:Number(n.id),name:clean(n.name),rank:clean(n.rank)})),source:`https://www.inaturalist.org/taxa/${r.id}`};return Response.json({taxon},{headers:{'Cache-Control':'public,max-age=600'}});
  }
  let searchId=id;
  if(q&&!id){
   const lookup=new URL('taxa/autocomplete',upstream);lookup.searchParams.set('q',q);lookup.searchParams.set('locale',locale);if(groupIds[group])lookup.searchParams.set('taxon_id',groupIds[group]);
   const taxa=(await get(lookup)).results.filter(t=>Number.isSafeInteger(t.id));
   const exact=taxa.filter(t=>[t.name,t.preferred_common_name,...(t.names||[]).map((n:Record<string,any>)=>n.name)].some(n=>typeof n==='string'&&normalized(n)===normalized(q)));
   if(exact.length!==1){const suggestions:NatureSuggestion[]=taxa.slice(0,8).map(t=>({id:t.id,name:clean(t.name),commonName:clean(t.preferred_common_name),rank:clean(t.rank)}));return Response.json({records:[],total:0,page,hasMore:false,suggestions,needsSelection:true},{headers:{'Cache-Control':'public,max-age=180'}});}
   searchId=String(exact[0].id);
  }
  const url=new URL('observations',upstream);url.searchParams.set('page',String(page));url.searchParams.set('per_page','24');url.searchParams.set('order_by','observed_on');url.searchParams.set('order','desc');url.searchParams.set('locale',locale);url.searchParams.set('photos','true');url.searchParams.set('license','cc0,cc-by,cc-by-sa');url.searchParams.set('photo_license','cc0,cc-by,cc-by-sa');
  if(scope==='turkey')url.searchParams.set('place_id','7183');if(scope==='area'&&bounds){for(const [key,value] of [['swlng',bounds[0]],['swlat',bounds[1]],['nelng',bounds[2]],['nelat',bounds[3]]] as const)url.searchParams.set(key,String(value));}
  if(searchId)url.searchParams.set('taxon_id',searchId);else if(groupIds[group])url.searchParams.set('taxon_id',groupIds[group]);if(start)url.searchParams.set('d1',start);if(end)url.searchParams.set('d2',end);if(p.get('quality')==='research')url.searchParams.set('quality_grade','research');
  const d=await get(url);
  return Response.json({records:d.results.map(natureObservation).filter(Boolean),total:d.total_results,page,hasMore:page*24<d.total_results,retrievedAt:new Date().toISOString(),scope},{headers:{'Cache-Control':'public,max-age=180'}});
 }catch{
  // The archived first pages are only valid for this exact Türkiye / reviewed query.
  // Their count is the cached sample size, never the source archive's historical total.
  if(mode==='observations'&&!q&&!id&&scope==='turkey'&&!start&&!end&&page===1&&p.get('quality')==='research'){
   const sample=snapshot.groups[group as keyof typeof snapshot.groups];
   return Response.json({records:sample.records,total:sample.records.length,page,hasMore:false,cached:true,fetchedAt:snapshot.fetchedAt,scope},{headers:{'Cache-Control':'public,max-age=60'}});
  }
  return Response.json({error:'Fotoğraflı doğa kayıtlarına şu an ulaşılamıyor. Yeniden dene.'},{status:503});
 }
}
