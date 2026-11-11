"use client";
import {useEffect,useState,useSyncExternalStore} from "react";
import type {Language} from "./i18n";
import {clearInstallPrompt,readInstallState,readServerInstallState,subscribeInstallState} from "./pwa-install-state";

export default function PwaInstall({language}:{language:Language}){
  const {installed,prompt:installEvent}=useSyncExternalStore(subscribeInstallState,readInstallState,readServerInstallState);
  const [busy,setBusy]=useState(false);
  const [ios,setIos]=useState(false);
  const [showSteps,setShowSteps]=useState(false);
  const t=(tr:string,en:string)=>language==="en"?en:tr;
  useEffect(()=>{
    setIos(/iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform==="MacIntel"&&navigator.maxTouchPoints>1));
  },[]);
  async function install(){
    if(!installEvent){setShowSteps(true);return;}
    if(busy)return;setBusy(true);
    try{await installEvent.prompt();await installEvent.userChoice;setShowSteps(false);}catch{setShowSteps(true);}finally{clearInstallPrompt();setBusy(false);}
  }
  return <section className="pwa-setting" aria-label={t("Uygulama kurulumu","App installation")}><div><img src="/brand/orman-emblem.png" alt=""/><span><strong>{t("Ana ekranında Orman Mühendisi","Orman Mühendisi on your home screen")}</strong><small>{t("Telefon ve tablette ekranına uyumlu uygulama görünümü.","An app-like layout tailored to phone and tablet screens.")}</small></span></div>{installed?<p role="status">{t("Uygulama görünümünde açıldı.","Opened in app mode.")}</p>:<><button type="button" disabled={busy} aria-busy={busy} onClick={()=>void install()}>{t("Ana ekrana ekle","Add to home screen")}</button>{showSteps&&<p role="status">{ios?t("Safari’de Paylaş düğmesine, ardından ‘Ana Ekrana Ekle’ye dokun.","In Safari, tap Share, then Add to Home Screen."):t("Tarayıcı menüsünden ‘Uygulamayı yükle’ veya ‘Ana ekrana ekle’yi seç.","Choose Install app or Add to Home Screen from the browser menu.")}</p>}</>}</section>;
}
