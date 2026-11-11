"use client";
import {useEffect,useRef,useState} from "react";
import type {Plant} from "./plant-data";
import type {Language} from "./i18n";
import type {FloraResponse} from "./tubives-types";
import type {LifeQuery} from "./life-types";
import type {TaxonomyPage,TaxonomySelection} from "./taxonomy-types";
import {Icon} from "./icons";
import {matchingPlants} from "./search-matches";

type Source="flora"|"col"|"gbif";
type Hit={id:string;name:string;subtitle:string;taxon?:TaxonomySelection};
type Group={records:Hit[];next:string|null;busy:boolean;failed:boolean};
const sources:Source[]=["flora","col","gbif"];
const empty=():Record<Source,Group>=>{const group=():Group=>({records:[],next:null,busy:false,failed:false});return {flora:group(),col:group(),gbif:group()};};
export default function SearchResults({query,language,plants,onSearch,onPlant,onFlora,onTaxon,onLife}:{query:string;language:Language;plants:Plant[];onSearch:(q:string)=>void;onPlant:(id:string)=>void;onFlora:(id:number)=>void;onTaxon:(node:TaxonomySelection)=>void;onLife:(id:string)=>void}) {
 const t=(tr:string,en:string)=>language==="en"?en:tr;
 const [draft,setDraft]=useState(query),[data,setData]=useState({query,groups:empty()});
 const controller=useRef<AbortController|null>(null);
 const local=matchingPlants(plants,query);
 const update=(source:Source,change:(group:Group)=>Group)=>setData(previous=>previous.query===query?{...previous,groups:{...previous.groups,[source]:change(previous.groups[source])}}:previous);
 const load=async(source:Source,cursor:string|null,signal:AbortSignal)=>{
  update(source,g=>({...g,busy:true,failed:false}));
  try {
   const params=new URLSearchParams({q:query.trim().slice(0,160)});
   let path:string;
   if(source==="flora"){params.set("limit","36");params.set("offset",cursor||"0");path="/api/flora";}
   else if(source==="col"){params.set("mode","search");params.set("source","col");if(cursor)params.set("cursor",cursor);path="/api/taxonomy";}
   else{params.set("mode","search");params.set("offset",cursor||"0");path="/api/life";}
   const response=await fetch(`${path}?${params}`,{signal});if(!response.ok)throw new Error();
   let records:Hit[],next:string|null;
   if(source==="flora") {const page=await response.json() as FloraResponse;records=page.records.map(r=>({id:String(r.id),name:r.name,subtitle:[r.commonName,r.family].filter(Boolean).join(" · ")}));const offset=Number(cursor||0)+page.records.length;next=offset<page.total?String(offset):null;}
   else if(source==="col"){const page=await response.json() as TaxonomyPage;records=page.records.map(r=>({id:r.key,name:r.name,subtitle:[r.turkishName,r.rank,r.status].filter(Boolean).join(" · "),taxon:{source:r.source,id:r.id,version:r.version}}));next=page.next;}
   else {const page=await response.json() as LifeQuery;records=page.records.map(r=>({id:r.id,name:r.scientificName,subtitle:[r.turkishName||r.commonName,r.rank,r.status].filter(Boolean).join(" · ")}));next=page.hasMore?String(page.nextOffset):null;}
   if(signal.aborted)return;
   update(source,g=>({records:[...new Map([...(cursor?g.records:[]),...records].map(r=>[r.id,r])).values()],next,busy:false,failed:false}));
  }catch{if(!signal.aborted)update(source,g=>({...g,busy:false,failed:true}));}
 };
 useEffect(()=>{
  setDraft(query);setData({query,groups:empty()});
  const abort=new AbortController();controller.current=abort;
  if(query.trim().length>=2)for(const source of sources)void load(source,null,abort.signal);
  return()=>abort.abort();
 // Each submitted query owns its requests; typing only changes the draft.
 // eslint-disable-next-line react-hooks/exhaustive-deps
 },[query]);
 const groups=data.query===query?data.groups:empty();
 const hasRemote=sources.some(s=>groups[s].records.length);
 const busy=sources.some(s=>groups[s].busy);
 const failed=sources.some(s=>groups[s].failed);
 const labels={flora:t("Türkiye florası","Türkiye flora"),col:"Catalogue of Life",gbif:"GBIF"};
 return <section className="unified-results">
  <h1>{t("Arama sonuçları","Search results")}</h1>
  <form className="results-search" onSubmit={event=>{event.preventDefault();if(draft.trim())onSearch(draft.trim());}}>
   <Icon name="search"/><input type="search" aria-label={t("Canlılar dünyasında ara","Search the living world")} value={draft} onChange={e=>setDraft(e.target.value)} enterKeyHint="search" placeholder={t("Tür, Türkçe ad veya bilimsel ad…","Species, common or scientific name…")}/>
   {draft&&<button type="button" aria-label={t("Aramayı temizle","Clear search")} onClick={()=>setDraft("")}><Icon name="close"/></button>}
   <button type="submit" className="search-submit">{t("Ara","Search")}</button>
  </form>
  <p className="results-query" role="status">{query.trim()?<>“<span data-user-content>{query}</span>” {t("için sonuçlar","results")}</>:t("Aramak istediğin adı yaz.","Enter a name to search.")}</p>
  {local.length>0&&<section className="search-result-group"><h2>{t("Tür künyeleri","Species profiles")}</h2>{local.map(p=><button type="button" className="unified-result" key={p.id} onClick={()=>onPlant(p.id)}><span><small>Orman Mühendisi · {p.family}</small><strong>{p.name}</strong><i>{p.latin}</i></span><span className="result-chevron" aria-hidden="true">›</span></button>)}</section>}
  {query.trim().length<2&&query.trim()&&<p>{t("Bilimsel kaynaklarda aramak için en az iki karakter yaz.","Use at least two characters to search scientific sources.")}</p>}
  {query.trim().length>=2&&sources.map(source=>{const group=groups[source];return <section className="search-result-group" key={source} aria-busy={group.busy}>
   <h2>{labels[source]}</h2>
   {group.records.map(hit=><button type="button" className="unified-result" key={hit.id} onClick={()=>source==="flora"?onFlora(Number(hit.id)):hit.taxon?onTaxon(hit.taxon):onLife(hit.id)}><span><small>{labels[source]}</small><strong data-user-content>{hit.name}</strong>{hit.subtitle&&<span data-user-content>{hit.subtitle}</span>}</span><span className="result-chevron" aria-hidden="true">›</span></button>)}
   {group.busy&&<p role="status">{t("Aranıyor…","Searching…")}</p>}
   {group.failed&&<div className="search-source-error"><p>{t("Bu kaynağa şu an ulaşılamadı.","This source is currently unavailable.")}</p><button type="button" onClick={()=>{if(controller.current&&!group.busy)void load(source,group.next,controller.current.signal);}}>{t("Yeniden dene","Retry")}</button></div>}
   {!group.busy&&!group.failed&&!group.records.length&&<p className="results-muted">{t("Bu kaynakta eşleşme bulunamadı.","No matches in this source.")}</p>}
   {group.next&&!group.failed&&<button className="results-more" type="button" disabled={group.busy} onClick={()=>{if(controller.current)void load(source,group.next,controller.current.signal);}}>{t("Daha fazla sonuç","More results")} <span aria-hidden="true">↓</span></button>}
  </section>;})}
  {query.trim().length>=2&&!local.length&&!hasRemote&&!busy&&!failed&&<p role="status">{t("Eşleşen kayıt yok. Farklı bir ad veya bilimsel ad deneyebilirsin.","No matching records. Try another common or scientific name.")}</p>}
 </section>;
}
