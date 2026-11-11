"use client";
import {useEffect,useRef,useState,type FormEvent} from "react";
import {Icon} from "./icons";
import {lensAudioWav,type LensBlock,type LensMode} from "./lens-modes";
import {lensFieldActions,lensFieldPrompt} from "./lens-field-actions";
import type {Language} from "./i18n";

type Translation={original:string;translation:string;sourceLanguage:string;blocks:LensBlock[]};
type Turn={heard:string;answer:string};
const targets=[["tr","Türkçe"],["en","English"],["de","Deutsch"],["fr","Français"],["es","Español"],["it","Italiano"],["ar","العربية"],["ru","Русский"]];
type Props={mode:Exclude<LensMode,"search">;file:File;sourceUrl:string;language:Language;authenticated:boolean;available:boolean;active:boolean;preset:string;initialAudio:File|null;onSignIn:()=>void;onOverlay:(blocks:LensBlock[])=>void};
export default function LensAdvanced({mode,file,sourceUrl,language,authenticated,available,active,preset,initialAudio,onSignIn,onOverlay}:Props){
 const t=(tr:string,en:string)=>language==="en"?en:tr;
 const [target,setTarget]=useState<string>(language),[prompt,setPrompt]=useState(preset),[busy,setBusy]=useState(false),[error,setError]=useState("");
 const [result,setResult]=useState<Translation|null>(null),[overlayMode,setOverlayMode]=useState<"translation"|"original"|"none">("translation"),[turns,setTurns]=useState<Turn[]>([]),[edited,setEdited]=useState("");
 const [copyStatus,setCopyStatus]=useState("");
 const [compare,setCompare]=useState(false);
 const initialRequest=useRef(false);
 const [recording,setRecording]=useState(false),[opening,setOpening]=useState(false);
 const request=useRef<AbortController|null>(null),url=useRef(""),audioStream=useRef<MediaStream|null>(null),recorder=useRef<MediaRecorder|null>(null),recordTimer=useRef<number|null>(null),run=useRef(0),sending=useRef(false);
 const ready=active&&authenticated&&available;
 const stopTracks=()=>{audioStream.current?.getTracks().forEach(track=>track.stop());audioStream.current=null;if(recordTimer.current!==null){clearTimeout(recordTimer.current);recordTimer.current=null;}};
 useEffect(()=>{
  if(mode!=="translate"||!active)return;
  onOverlay(overlayMode==="none"?[]:(result?.blocks||[]).flatMap(block=>overlayMode==="original"?(block.original?[{box:block.box,text:block.original}]:[]):[block]));
  return()=>onOverlay([]);
 },[mode,active,result,overlayMode,onOverlay]);
 useEffect(()=>()=>{run.current++;request.current?.abort();stopTracks();if(recorder.current?.state==="recording")recorder.current.stop();if(url.current)URL.revokeObjectURL(url.current);},[]);
 useEffect(()=>{
  const stop=()=>{run.current++;request.current?.abort();stopTracks();if(recorder.current?.state==="recording")recorder.current.stop();setRecording(false);setOpening(false);setBusy(false);sending.current=false;};
  const hidden=()=>{if(document.hidden)stop();};
  if(!active)stop();document.addEventListener("visibilitychange",hidden);return()=>document.removeEventListener("visibilitychange",hidden);
 },[active]);
 async function send(question:string,audio?:File,targetOverride?:string){
  if(!ready||sending.current)return;
  const controller=new AbortController();request.current?.abort();request.current=controller;sending.current=true;setBusy(true);setError("");
  try{
   const form=new FormData();form.set("mode",mode);form.set("image",file);form.set("language",language);form.set("target",targetOverride||target);if(question)form.set("prompt",(mode==="create"?lensFieldPrompt(question,language):question).slice(0,600));if(audio)form.set("audio",audio);
   if(mode==="talk"&&turns.length)form.set("context",JSON.stringify(turns.slice(-4)).slice(0,3200));
   const response=await fetch("/api/lens-mode",{method:"POST",body:form,signal:controller.signal});
   if(!response.ok){if(response.status===401)throw new Error("SIGN_IN");if(response.status===429)throw new Error("QUOTA");throw new Error("FAILED");}
   if(mode==="create"){
    const blob=await response.blob();if(controller.signal.aborted)return;if(url.current)URL.revokeObjectURL(url.current);url.current=URL.createObjectURL(blob);setEdited(url.current);setCompare(false);
   }else if(mode==="translate"){
    const data=await response.json() as Translation;if(!controller.signal.aborted){setResult(data);setOverlayMode("translation");}
   }else{
    const data=await response.json() as Turn;if(!controller.signal.aborted){setTurns(current=>[...current,data].slice(-8));setPrompt("");}
   }
  }catch(e){if(!controller.signal.aborted){const code=e instanceof Error?e.message:"";setError(code==="QUOTA"?t("İşlem sınırına ulaşıldı. Biraz sonra yeniden dene.","Request limit reached. Try again shortly."):code==="SIGN_IN"?t("Devam etmek için tekrar giriş yap.","Sign in again to continue."):t("İşlem tamamlanamadı. Fotoğrafın duruyor; tekrar dene.","The request failed. Your photo is still here; try again."));}}
  finally{if(request.current===controller){sending.current=false;setBusy(false);}}
 }
 useEffect(()=>{
  if(!ready)return;
  if(mode==="translate"&&!result)void send("");
  if(initialRequest.current)return;
  if(mode==="create"&&preset){initialRequest.current=true;void send(preset);}
  if(mode==="talk"&&initialAudio){initialRequest.current=true;void send("",initialAudio);}
 },[ready,mode,preset,initialAudio]);
 async function startRecording(){
  if(recording){recorder.current?.stop();return;}
  if(!ready||opening||busy)return;
  if(!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined"){setError(t("Mikrofon bu tarayıcıda kullanılamıyor. Sorunu yazabilirsin.","The microphone is unavailable in this browser. You can type your question."));return;}
  setOpening(true);setError("");const id=++run.current;
  try{
   const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true},video:false});
   if(run.current!==id){stream.getTracks().forEach(track=>track.stop());return;}
   audioStream.current=stream;
   const mimeType=["audio/webm;codecs=opus","audio/mp4"].find(type=>MediaRecorder.isTypeSupported(type));
   const capture=new MediaRecorder(stream,mimeType?{mimeType}:undefined),parts:Blob[]=[];recorder.current=capture;
   capture.ondataavailable=event=>{if(event.data.size)parts.push(event.data);};
   capture.onerror=()=>{if(run.current!==id)return;run.current++;stopTracks();setRecording(false);setBusy(false);setError(t("Ses kaydedilemedi. Sorunu yazabilirsin.","The recording failed. You can type your question."));};
   capture.onstop=async()=>{
    if(run.current!==id)return;
    stopTracks();setRecording(false);setBusy(true);
    try {const wave=await lensAudioWav(new Blob(parts,{type:capture.mimeType}));if(run.current===id)void send("",wave);}
    catch {if(run.current===id){setBusy(false);setError(t("Ses okunamadı. Yeniden kaydet veya sorunu yaz.","Couldn't read the recording. Record again or type your question."));}}
   };
   capture.start();setRecording(true);recordTimer.current=window.setTimeout(()=>{if(capture.state==="recording")capture.stop();},25_000);
  }catch{if(run.current===id){stopTracks();setError(t("Mikrofon açılamadı. İzni kontrol et veya sorunu yaz.","The microphone could not be opened. Check its permission or type your question."));}}
  finally{if(run.current===id)setOpening(false);}
 }
 async function copy(value:string){
  try{await navigator.clipboard.writeText(value);setCopyStatus(t("Metin kopyalandı.","Text copied."));}
  catch{setCopyStatus(t("Kopyalamak için metni seçip basılı tut.","Select and hold the text to copy it."));}
 }
 const submit=(event:FormEvent)=>{event.preventDefault();if(prompt.trim())void send(prompt.trim());};
 return <section className="lens-advanced" aria-busy={busy||opening}>
  {!authenticated?<div className="lens-notice"><p>{t("Bu modu kullanmak için giriş yap.","Sign in to use this mode.")}</p><button type="button" onClick={onSignIn}>{t("Giriş yap","Sign in")}</button></div>:!available?<p className="lens-notice">{t("Bu mod için Gemini bağlantısı gerekiyor.","This mode requires a Gemini connection.")}</p>:null}
  {mode==="translate"&&<>
    <div className="lens-language-row"><span>{result?.sourceLanguage||t("Dili algıla","Detect language")}</span><span aria-hidden="true">→</span><label><span className="sr-only">{t("Çeviri dili","Translation language")}</span><select value={target} disabled={!ready||busy} onChange={event=>{const next=event.currentTarget.value;setTarget(next);void send("",undefined,next);}}>{targets.map(([id,name])=><option key={id} value={id}>{name}</option>)}</select></label></div>
    {result&&(result.original||result.translation?<><div className="lens-mode-result">
      {result.translation&&<><strong>{t("Çeviri","Translation")}</strong><p className="lens-selectable" data-user-content>{result.translation}</p></>}
      <div className="lens-read-actions">
        {result.blocks.length>0&&<button type="button" aria-pressed={overlayMode==="translation"} onClick={()=>setOverlayMode(value=>value==="translation"?"none":"translation")}>{t("Çeviriyi göster","Show translation")}</button>}
        {result.blocks.some(block=>block.original)&&<button type="button" aria-pressed={overlayMode==="original"} onClick={()=>setOverlayMode(value=>value==="original"?"none":"original")}>{t("Metni göster","Show source text")}</button>}
        {result.translation&&<button type="button" onClick={()=>void copy(result.translation)}>{t("Çeviriyi kopyala","Copy translation")}</button>}
      </div>
    </div>{result.original&&<details open={!result.translation}><summary>{t("Okunan metin","Recognized text")}</summary><p className="lens-selectable" data-user-content>{result.original}</p><button type="button" onClick={()=>void copy(result.original)}>{t("Metni kopyala","Copy text")}</button></details>}{copyStatus&&<p role="status">{copyStatus}</p>}</>:<p>{t("Fotoğrafta okunabilir metin bulunamadı.","No readable text was found in the photo.")}</p>)}
    {error&&<button type="button" disabled={!ready||busy} onClick={()=>void send("")}>{t("Tekrar oku","Read again")}</button>}
  </>}
  {mode==="talk"&&<><p className="lens-mode-intro">{t("Fotoğraf hakkında konuş ya da sorunu yaz.","Speak or type a question about the photo.")}</p>{turns.map((turn,i)=><article className="lens-mode-result" key={i}>{turn.heard&&<strong data-user-content>{turn.heard}</strong>}<p data-user-content>{turn.answer}</p>{typeof window!=="undefined"&&"speechSynthesis" in window&&<button type="button" onClick={()=>{const audio=new SpeechSynthesisUtterance(turn.answer);audio.lang=language==="en"?"en-US":"tr-TR";window.speechSynthesis.speak(audio);}}>{t("Dinle","Listen")}</button>}</article>)}<form className="lens-mode-form" onSubmit={submit}><label className="sr-only" htmlFor="lens-talk-question">{t("Fotoğrafla ilgili soru","Question about the photo")}</label><input id="lens-talk-question" value={prompt} onChange={event=>setPrompt(event.currentTarget.value)} maxLength={600} placeholder={t("Bir soru sor…","Ask a question…")} disabled={recording}/><button type="submit" disabled={!ready||busy||recording||!prompt.trim()}>{t("Gönder","Send")}</button></form><button type="button" className="lens-talk-button" aria-pressed={recording} disabled={!ready||busy||opening} onClick={()=>void startRecording()}>{recording?t("Kaydı bitir ve gönder","Finish and send"):opening?t("Mikrofon açılıyor…","Opening microphone…"):t("Konuşmak için dokun","Tap to speak")}</button></>}
  {mode==="create"&&<>
    {edited&&<figure className="lens-edited"><img src={compare?sourceUrl:edited} alt={compare?t("Özgün saha fotoğrafı","Original field photo"):t("Düzenlenmiş saha fotoğrafı","Edited field photo")}/><figcaption>
      <div className="lens-read-actions" role="group" aria-label={t("Fotoğrafları karşılaştır","Compare photos")}><button type="button" aria-pressed={compare} onClick={()=>setCompare(true)}>{t("Özgün","Original")}</button><button type="button" aria-pressed={!compare} onClick={()=>setCompare(false)}>{t("Düzenlenen","Edited")}</button></div>
      <a href={edited} download="orman-lens-gorsel">{t("Düzenlenen kopyayı indir","Download edited copy")}</a>
    </figcaption></figure>}
    <form className="lens-mode-form" onSubmit={submit}><label className="sr-only" htmlFor="lens-create-prompt">{t("Görseli nasıl değiştirelim?","How should the photo change?")}</label><input id="lens-create-prompt" value={prompt} onChange={event=>setPrompt(event.currentTarget.value)} maxLength={600} placeholder={t("Fotoğrafta ne değişsin?","What should change in the photo?")}/><button type="submit" disabled={!ready||busy||!prompt.trim()}>{t("Hazırla","Prepare")}</button></form>
    {!busy&&!edited&&!preset&&<div className="lens-read-actions">{lensFieldActions(language).slice(0,3).map(idea=><button type="button" key={idea.id} disabled={!ready} onClick={()=>{setPrompt(idea.label);void send(idea.label);}}>{idea.label}</button>)}</div>}
  </>}
  {busy&&<p className="lens-mode-status" role="status">{mode==="translate"?t("Çevriliyor…","Translating…"):mode==="create"?t("Görsel oluşturuluyor…","Creating image…"):t("Yanıt hazırlanıyor…","Preparing an answer…")}</p>}
  {error&&<p className="lens-mode-error" role="alert">{error}</p>}
 </section>;
}
