"use client";
import {useEffect,useRef,useState} from "react";
import type {Map as LeafletMap,TileLayer,LayerGroup} from "leaflet";
import type {GbifOccurrence} from "./gbif-types";
import type {Language} from "./i18n";
export default function GbifMap({records,tiles,country,language,onSelect}:{records:GbifOccurrence[];tiles:string;country:string;language:Language;onSelect:(record:GbifOccurrence)=>void}){
 const host=useRef<HTMLDivElement>(null),map=useRef<LeafletMap|null>(null),density=useRef<TileLayer|null>(null),markers=useRef<LayerGroup|null>(null),select=useRef(onSelect);select.current=onSelect;
 const [ready,setReady]=useState(false),[failed,setFailed]=useState(false),[tilesFailed,setTilesFailed]=useState(false),[retry,setRetry]=useState(0);
 const t=(tr:string,en:string)=>language==="en"?en:tr;
 useEffect(()=>{let stopped=false;let resize:ResizeObserver|undefined;setFailed(false);setReady(false);
  void import("leaflet").then(L=>{if(stopped||!host.current)return;const m=L.map(host.current,{scrollWheelZoom:false,minZoom:1,maxZoom:18,worldCopyJump:true}).setView([39,34],5);map.current=m;
   L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png",{maxZoom:19,attribution:'&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a>'}).addTo(m);markers.current=L.layerGroup().addTo(m);
   if(typeof ResizeObserver==="function"){resize=new ResizeObserver(()=>m.invalidateSize());resize.observe(host.current);}setReady(true);
  }).catch(()=>{if(!stopped)setFailed(true);});
  return()=>{stopped=true;resize?.disconnect();map.current?.remove();map.current=null;density.current=null;markers.current=null;};
 },[retry]);
 useEffect(()=>{if(!ready||!map.current)return;setTilesFailed(false);let stopped=false;
  void import("leaflet").then(L=>{if(stopped||!map.current)return;density.current?.remove();density.current=L.tileLayer(tiles,{maxNativeZoom:14,maxZoom:18,opacity:.72,attribution:'<a href="https://www.gbif.org/">GBIF</a>',crossOrigin:true}).on("tileerror",()=>{if(!stopped){setTilesFailed(true);density.current?.remove();}}).addTo(map.current);density.current.setZIndex(2);});
  return()=>{stopped=true;};
 },[ready,tiles,retry]);
 useEffect(()=>{if(!ready||!map.current||!markers.current)return;let stopped=false;
  void import("leaflet").then(L=>{if(stopped||!markers.current)return;markers.current.clearLayers();for(const r of records){if(!r.point||Math.abs(r.point[0])>85.051129)continue;const label=document.createElement("span");label.textContent=r.name;
    L.circleMarker(r.point,{radius:6,color:"#fff",weight:2,fillColor:"#1b5e20",fillOpacity:1}).bindTooltip(label).on("click",()=>select.current(r)).addTo(markers.current);
   }});return()=>{stopped=true;};
 },[ready,records]);
 useEffect(()=>{if(!ready||!map.current)return;if(country==="TR")map.current.fitBounds([[35.5,25.5],[42.5,45]],{padding:[20,20]});else map.current.setView([20,0],2);},[country,ready]);
 return <section className="gbif-map-panel"><div ref={host} className="gbif-map" role="region" aria-label={t("GBIF kayıt haritası","GBIF occurrence map")}/>{!ready&&!failed&&<p role="status">{t("Harita açılıyor…","Opening map…")}</p>}{failed&&<p role="alert">{t("Harita açılamadı.","Map could not be loaded.")} <button onClick={()=>setRetry(n=>n+1)}>{t("Yeniden dene","Retry")}</button></p>}
  <div className="gbif-map-legend">{!tilesFailed&&<span><i className="gbif-map-density"/>{t("Yeşil katman: tüm eşleşen konumlu kayıtların yoğunluğu","Green layer: density of all matching georeferenced records")}</span>}<span><i className="gbif-map-point"/>{t("Çerçeveli noktalar: bu sayfadaki kayıtlar; ayrıntı için dokun","Outlined dots: this page’s records; tap for details")}</span></div>
  {tilesFailed&&<p role="status">{t("GBIF yoğunluk katmanı şu anda yüklenemedi. Bu sayfadaki noktalar gösteriliyor.","GBIF density tiles are unavailable. Points from this page remain visible.")} <button onClick={()=>setRetry(n=>n+1)}>{t("Haritayı yenile","Reload map")}</button></p>}
 </section>;
}
