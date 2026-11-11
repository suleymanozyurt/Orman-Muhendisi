"use client";
import {useEffect,useRef,useState} from "react";
import type {Language} from "./i18n";
import type {Metric} from "web-vitals";
import {observeInstallation} from "./pwa-install-state";
let vitalsStarted=false;
type VitalsWindow=Window & {__ormanVitals?:Record<string,{value:number;rating:string}>};

export default function PwaRuntime({language}:{language:Language}){
  const [offline,setOffline]=useState(false),[update,setUpdate]=useState(false),[dismissed,setDismissed]=useState(false);
  const registration=useRef<ServiceWorkerRegistration|null>(null),reloading=useRef(false);
  const t=(tr:string,en:string)=>language==="en"?en:tr;
  useEffect(()=>{
    const stopInstall=observeInstallation(window);
    // Diagnostics stay in this page's memory. No tracking request or stored user identifier.
    if(!vitalsStarted){vitalsStarted=true;void import("web-vitals").then(({onCLS,onINP,onLCP})=>{
      const record=(metric:Metric)=>{const w=window as VitalsWindow;w.__ormanVitals??={};w.__ormanVitals[metric.name]={value:metric.value,rating:metric.rating};};
      onCLS(record,{reportAllChanges:true});onINP(record,{reportAllChanges:true});onLCP(record,{reportAllChanges:true});
    }).catch(()=>{});}
    setOffline(!navigator.onLine);
    let stopped=false,lastCheck=Date.now(),found:(()=>void)|undefined;
    const onOnline=()=>{setOffline(false);void registration.current?.update().catch(()=>{});};
    const onOffline=()=>setOffline(true);
    const changed=()=>{if(reloading.current)location.reload();};
    const resume=()=>{if(document.visibilityState==="visible"&&Date.now()-lastCheck>60000){lastCheck=Date.now();void registration.current?.update().catch(()=>{});}};
    window.addEventListener("online",onOnline);window.addEventListener("offline",onOffline);document.addEventListener("visibilitychange",resume);
    if("serviceWorker" in navigator&&(window.isSecureContext||location.hostname==="localhost")){
      navigator.serviceWorker.addEventListener("controllerchange",changed);
      void navigator.serviceWorker.register("/sw.js",{updateViaCache:"none"}).then(reg=>{
        if(stopped)return;registration.current=reg;
        if(reg.waiting&&navigator.serviceWorker.controller)setUpdate(true);
        found=()=>{const worker=reg.installing;if(!worker)return;worker.addEventListener("statechange",()=>{if(!stopped&&worker.state==="installed"&&navigator.serviceWorker.controller){setUpdate(true);setDismissed(false);}});};
        reg.addEventListener("updatefound",found);
      }).catch(()=>{});
    }
    return()=>{stopped=true;stopInstall();window.removeEventListener("online",onOnline);window.removeEventListener("offline",onOffline);document.removeEventListener("visibilitychange",resume);if("serviceWorker" in navigator)navigator.serviceWorker.removeEventListener("controllerchange",changed);if(found)registration.current?.removeEventListener("updatefound",found);};
  },[]);
  if(!offline&&(!update||dismissed))return null;
  return <aside className="app-runtime-notice" aria-live="polite"><p>{offline?t("Bağlantı yok. Fotoğraf ve notlarını saha defterinde cihazına saklayabilirsin.","You are offline. Keep photos and notes on your device in the field notebook."):t("Yeni sürüm hazır. Açık çalışmanı kaydettikten sonra yenileyebilirsin.","An update is ready. Save your work before refreshing.")}</p>{offline?<a href="/?view=create">{t("Saha defterini aç","Open field notebook")}</a>:<div><button type="button" onClick={()=>{const waiting=registration.current?.waiting;if(waiting){reloading.current=true;waiting.postMessage({type:"SKIP_WAITING"});}}}>{t("Yenile","Refresh")}</button><button type="button" onClick={()=>setDismissed(true)}>{t("Sonra","Later")}</button></div>}</aside>;
}
