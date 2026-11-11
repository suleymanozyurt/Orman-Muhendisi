"use client";
import {useEffect,useState} from "react";
import {archiveLifePage,lifeArchive} from "./life-catalog";
import type {LifePage,LifeTaxon} from "./life-types";
import type {Language} from "./i18n";

function archived(name:string){const record=Object.values(lifeArchive.records).find(r=>r.taxonomicStatus==="ACCEPTED"&&(r.canonicalName===name||r.scientificName===name));return record?archiveLifePage(`gbif-${record.key}`):null;}
// This is a separate current-source path, never a replacement for a historical flora hierarchy.
export default function LifePath({name,language,onSelect}:{name:string;language:Language;onSelect:(id:string)=>void}){
 const [page,setPage]=useState<LifePage|null>(()=>archived(name));
 useEffect(()=>{const cached=archived(name);setPage(cached);if(cached)return;const c=new AbortController();fetch(`/api/life?mode=resolve&name=${encodeURIComponent(name)}`,{signal:c.signal}).then(async r=>{if(!r.ok)throw new Error();return r.json() as Promise<{taxon:LifeTaxon|null}>;}).then(async d=>{if(!d.taxon)return;const r=await fetch(`/api/life?id=${d.taxon.id}`,{signal:c.signal});if(!r.ok)throw new Error();const p=await r.json() as LifePage;if(!c.signal.aborted)setPage(p);}).catch(()=>{});return()=>c.abort();},[name]);
 if(!page)return null;
 return <div className="life-profile-path"><small>{language==="en"?"Source taxonomy":"Kaynak takson yolu"}</small><nav className="life-breadcrumb" aria-label={language==="en"?"Source taxon path":"Kaynak takson yolu"}>{page.ancestry.map((r,i)=><span key={r.id}>{i>0&&<span aria-hidden="true">›</span>}<button onClick={()=>onSelect(r.id)}>{r.rank==="LIFE"?(language==="en"?"Life":"Yaşam"):r.scientificName}</button></span>)}</nav></div>;
}
