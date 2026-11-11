"use client";
import {useCallback,useEffect,useRef,useState,type RefObject} from "react";
import {lensLiveInput,lensLiveServerMessage,lensLiveSocket,lensLiveTime} from "./lens-live-protocol";
import {lensCropPixels,lensViewfinder} from "./lens-crop";
import LensModeIcon from "./lens-icons";
import type {Language} from "./i18n";

type Session = {
  abort: AbortController; context: AudioContext; microphone?: MediaStream; node?:AudioWorkletNode;
  socket?:WebSocket; timer?:number; frames?:number; deadline?:number; sources:Set<AudioBufferSourceNode>;
  playAt:number; paused:boolean; shareVideo:boolean; disposed:boolean; ready:boolean;
};
function dispose(session:Session){
  session.disposed=true;
  session.abort.abort();
  clearTimeout(session.timer);clearTimeout(session.deadline);clearInterval(session.frames);
  session.node?.disconnect();session.node?.port.close();
  session.microphone?.getTracks().forEach(track=>track.stop());
  session.sources.forEach(source=>{try{source.stop();}catch{}});
  if(session.socket&&session.socket.readyState<2)session.socket.close();
  void session.context.close().catch(()=>{});
}
const encoded=(packet:ArrayBuffer)=>btoa(String.fromCharCode(...new Uint8Array(packet)));

export default function LensLive({camera,ready,zoom,language,authenticated,onSignIn}:{
  camera:RefObject<HTMLVideoElement|null>;ready:boolean;zoom:number;language:Language;authenticated:boolean;onSignIn:()=>void;
}){
  const t=(tr:string,en:string)=>language==="en"?en:tr;
  const session=useRef<Session|null>(null), cameraZoom=useRef(zoom);cameraZoom.current=zoom;
  const [state,setState]=useState<"idle"|"opening"|"live">("idle"),[error,setError]=useState(""),[caption,setCaption]=useState(""),[muted,setMuted]=useState(false);
  const [sharing,setSharing]=useState(true);
  const close=useCallback(()=>{
    const current=session.current;session.current=null;if(current)dispose(current);
  },[]);
  const stop=useCallback(()=>{
    close();setState("idle");setMuted(false);setSharing(true);
  },[close]);
  useEffect(()=>{
    const hide=()=>{if(document.hidden)stop();};
    document.addEventListener("visibilitychange",hide);
    return()=>{document.removeEventListener("visibilitychange",hide);close();};
  },[close,stop]);
  useEffect(()=>{if(!ready||!authenticated)stop();},[ready,authenticated,stop]);
  async function start(){
    if(!authenticated){onSignIn();return;}
    if(!ready||session.current)return;
    setCaption("");setError("");setMuted(false);
    if(!navigator.mediaDevices?.getUserMedia||typeof AudioContext==="undefined"){
      setError(t("Canlı ses bu tarayıcıda açılamıyor. Fotoğrafla sorabilirsin.","Live audio is unavailable in this browser. Ask about a photo instead."));return;
    }
    let context:AudioContext;
    try{context=new AudioContext();}catch{setError(t("Ses açılamadı. Fotoğrafla sorabilirsin.","Could not open audio. Ask about a photo instead."));return;}
    const current:Session={context,abort:new AbortController(),sources:new Set(),playAt:0,paused:false,shareVideo:true,disposed:false,ready:false};
    session.current=current;setState("opening");
    const failed=(message:string)=>{if(session.current===current){stop();setError(message);}};
    const unavailable=t("Canlı bağlantı açılamadı. Tekrar dene ya da fotoğrafla sor.","Live connection unavailable. Try again or ask about a photo.");
    current.timer=window.setTimeout(()=>failed(unavailable),25_000);
    try{
      await context.resume();
      if(current.disposed)return;
      if(!context.audioWorklet)throw new Error("AUDIO_UNAVAILABLE");
      const microphone=await navigator.mediaDevices.getUserMedia({audio:{channelCount:1,echoCancellation:true,noiseSuppression:true},video:false});
      if(current.disposed){microphone.getTracks().forEach(track=>track.stop());return;}
      current.microphone=microphone;
      microphone.getAudioTracks().forEach(track=>track.addEventListener("ended",()=>failed(t("Mikrofon bağlantısı kesildi.","The microphone disconnected.")),{once:true}));
      const [response]=await Promise.all([
        fetch(`/api/lens-live?language=${language}`,{method:"POST",signal:current.abort.signal,cache:"no-store"}),
        context.audioWorklet.addModule("/lens-live-audio.js"),
      ]);
      if(current.disposed)return;
      if(!response.ok)throw new Error("LIVE_UNAVAILABLE");
      const {token,setup}=await response.json() as {token?:string;setup?:unknown};
      if(current.disposed)return;
      if(!token?.startsWith("auth_tokens/")||!setup)throw new Error("LIVE_UNAVAILABLE");
      const url=new URL(lensLiveSocket);url.searchParams.set("access_token",token);
      const socket=current.socket=new WebSocket(url);socket.binaryType="arraybuffer";
      const canvas=document.createElement("canvas"),ctx=canvas.getContext("2d");
      const send=(kind:"audio"|"video",data:string)=>{
        if(!current.disposed&&current.ready&&(kind==="audio"||current.shareVideo)&&socket.readyState===WebSocket.OPEN&&socket.bufferedAmount<192_000)socket.send(JSON.stringify(lensLiveInput(kind,data)));
      };
      let capturing=false, newCaption=true;
      const frame=()=>{
        const video=camera.current;
        if(!video?.videoWidth||!video.videoHeight||!ctx||capturing||current.disposed||!current.shareVideo||socket.bufferedAmount>96_000)return;
        const rect=video.parentElement?.getBoundingClientRect()||video.getBoundingClientRect();
        const crop=lensCropPixels(lensViewfinder(video.videoWidth,video.videoHeight,rect.width,rect.height,cameraZoom.current),video.videoWidth,video.videoHeight);
        const scale=Math.min(1,640/Math.max(crop.width,crop.height));
        canvas.width=Math.max(1,Math.round(crop.width*scale));canvas.height=Math.max(1,Math.round(crop.height*scale));
        ctx.drawImage(video,crop.x,crop.y,crop.width,crop.height,0,0,canvas.width,canvas.height);
        capturing=true;
        canvas.toBlob(blob=>{capturing=false;if(!blob||current.disposed)return;
          const reader=new FileReader();reader.onload=()=>{const data=typeof reader.result==="string"?reader.result.split(",")[1]:"";if(data)send("video",data);};reader.readAsDataURL(blob);
        },"image/jpeg",.68);
      };
      socket.onopen=()=>{if(!current.disposed)socket.send(JSON.stringify({setup}));};
      socket.onerror=()=>failed(unavailable);
      socket.onclose=()=>failed(current.ready?t("Canlı oturum sona erdi. Yeniden başlatabilirsin.","Live session ended. You can start again."):unavailable);
      socket.onmessage=({data})=>{
        if(current.disposed)return;
        try{
          const message=lensLiveServerMessage(JSON.parse(typeof data==="string"?data:new TextDecoder().decode(data)));
          if(message.ready&&!current.ready){
            current.ready=true;clearTimeout(current.timer);
            const node=current.node=new AudioWorkletNode(context,"lens-microphone",{numberOfInputs:1,numberOfOutputs:1,channelCount:1,outputChannelCount:[1]});
            node.port.onmessage=({data:packet})=>{if(!current.paused&&packet instanceof ArrayBuffer)send("audio",encoded(packet));};
            node.onprocessorerror=()=>failed(unavailable);
            context.createMediaStreamSource(microphone).connect(node);node.connect(context.destination);
            setState("live");frame();current.frames=window.setInterval(frame,1100);
            current.deadline=window.setTimeout(()=>failed(t("Canlı oturum sona erdi. Yeniden başlatabilirsin.","Live session ended. You can start again.")),lensLiveTime);
          }
          if(message.interrupted){current.sources.forEach(source=>{try{source.stop();}catch{}});current.playAt=0;newCaption=true;}
          if(message.text){const reset=newCaption;setCaption(previous=>(reset?message.text:previous+message.text).slice(-450));newCaption=false;}
          if(message.turnComplete)newCaption=true;
          for(const clip of message.audio){
            const bytes=Uint8Array.from(atob(clip.data),ch=>ch.charCodeAt(0)), samples=Math.floor(bytes.length/2);
            if(!samples)continue;
            const buffer=context.createBuffer(1,samples,clip.rate),view=new DataView(bytes.buffer),output=buffer.getChannelData(0);
            for(let i=0;i<samples;i++)output[i]=view.getInt16(i*2,true)/32768;
            const source=context.createBufferSource();source.buffer=buffer;source.connect(context.destination);
            const at=Math.max(context.currentTime+.035,current.playAt);
            if(at-context.currentTime>16)break;
            current.sources.add(source);source.onended=()=>current.sources.delete(source);source.start(at);current.playAt=at+buffer.duration;
          }
        }catch{failed(unavailable);}
      };
    }catch(cause){
      const denied=cause instanceof DOMException&&(cause.name==="NotAllowedError"||cause.name==="NotFoundError");
      failed(denied?t("Mikrofon açılamadı. İzni kontrol et ya da fotoğrafla sor.","Microphone unavailable. Check its permission or ask about a photo."):unavailable);
    }
  }
  function mute(){
    const current=session.current;
    if(!current?.ready)return;
    current.paused=!current.paused;
    current.microphone?.getAudioTracks().forEach(track=>{track.enabled=!current.paused;});
    if(current.paused&&current.socket?.readyState===WebSocket.OPEN)current.socket.send(JSON.stringify({realtimeInput:{audioStreamEnd:true}}));
    setMuted(current.paused);
  }
  return <>
    <div className="lens-live-feedback">
      <p role="status">{error || (state==="live"?(muted?t("Mikrofon kapalı","Microphone muted"):t("Canlı · Dinliyor","Live · Listening")):state==="opening"?t("Bağlanıyor…","Connecting…"):t("Canlı oturumda görüntü ve ses Gemini’ye iletilir.","During a live session, video and audio are sent to Gemini."))}</p>
      {caption&&<p className="lens-live-caption" data-user-content>{caption}</p>}
      {state==="live"&&<div className="lens-live-toggles">
        <button type="button" onClick={mute} aria-pressed={muted}>{muted?t("Mikrofonu aç","Unmute"):t("Mikrofonu kapat","Mute")}</button>
        <button type="button" onClick={()=>{const current=session.current;if(current){current.shareVideo=!current.shareVideo;setSharing(current.shareVideo);}}} aria-pressed={sharing}>{sharing?t("Görüntüyü durdur","Stop sharing video"):t("Görüntüyü paylaş","Share video")}</button>
      </div>}
    </div>
    <button type="button" className="lens-shutter" data-live={state} disabled={!ready&&state==="idle"} onClick={()=>state==="idle"?void start():stop()} aria-label={state==="idle"?t("Canlı soruyu başlat","Start live conversation"):t("Canlı oturumu bitir","End live session")}>
      {state==="idle"?<LensModeIcon mode="talk"/>:<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="6" y="6" width="12" height="12" rx="3" fill="currentColor"/></svg>}
    </button>
  </>;
}
