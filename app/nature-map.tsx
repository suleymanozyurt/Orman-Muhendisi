"use client";
import {useEffect,useMemo,useRef,useState} from "react";
import {createGeographicMap,type GeographicMap} from "./geographic-map";
import {recordExtent} from "./record-extent";
import type {NatureObservation} from "./nature-types";
import type {Language} from "./i18n";
export default function NatureMap({records,onSelect,selectedId,language="tr"}:{records:NatureObservation[];onSelect:(id:number)=>void;selectedId?:number;language?:Language}){
 const host=useRef<HTMLDivElement>(null),map=useRef<GeographicMap|undefined>(undefined),callback=useRef(onSelect),[ready,setReady]=useState(false),[error,setError]=useState(false),[satelliteFailed,setSatelliteFailed]=useState(false),[retry,setRetry]=useState(0);callback.current=onSelect;
 const points=useMemo(()=>records.filter(r=>r.point).map(r=>({id:r.id,lat:r.point![0],lng:r.point![1],name:r.name})),[records]);
 const extent=useMemo(()=>recordExtent(points),[points]);
 useEffect(()=>{let stopped=false;const abort=new AbortController();let created:GeographicMap|undefined;setReady(false);setError(false);setSatelliteFailed(false);
  void(async()=>{let key:string|null=null;try{const response=await fetch("/api/map-config",{signal:AbortSignal.any([abort.signal,AbortSignal.timeout(5000)])});if(response.ok)key=(await response.json() as {key:string|null}).key;}catch{}if(stopped||!host.current)return;
   try{created=await createGeographicMap(host.current,key,()=>{},()=>{if(!stopped)setSatelliteFailed(true);});if(stopped){created.remove();return;}map.current=created;setReady(true);}catch{if(!stopped)setError(true);}
  })();return()=>{stopped=true;abort.abort();created?.remove();map.current=undefined;};
 },[retry]);
 useEffect(()=>{if(!ready||!map.current)return;const current=map.current;if(extent)current.fitBounds(extent);else current.setView([39,35],5);const resize=new ResizeObserver(()=>current.invalidateSize());if(host.current)resize.observe(host.current);return()=>resize.disconnect();},[extent,ready]);
 useEffect(()=>{if(!ready||!map.current)return;const area=extent?`${extent[0][1]},${extent[0][0]},${extent[1][1]},${extent[1][0]}`:"26,35,45,43";map.current.draw(points,area,id=>callback.current(id),selectedId);const selected=points.find(p=>p.id===selectedId);if(selected)map.current.setView([selected.lat,selected.lng],11);},[points,extent,ready,selectedId]);
 return <div className="nature-map-wrap">{error&&<p role="alert">{language==="en"?"Map unavailable. You can use the record list.":"Harita yüklenemedi. Kayıt listesini kullanabilirsin."} <button onClick={()=>setRetry(n=>n+1)}>{language==="en"?"Retry":"Tekrar dene"}</button></p>}{satelliteFailed&&<p className="source-note">{language==="en"?"The satellite layer is unavailable; a standard map is shown when possible.":"Uydu katmanı açılamadı; mümkün olduğunda standart harita gösterilir."}</p>}<div className="nature-map" ref={host} aria-label={language==="en"?"Public observation locations from this page":"Bu sayfadaki açık gözlem konumları"}/><p className="source-note">{language==="en"?"Only public coordinates from this page are shown.":"Yalnız bu sayfadaki açık koordinatlar gösterilir."}</p></div>;
}
