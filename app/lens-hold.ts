"use client";
import {useEffect,useRef,useState,type PointerEvent, type MouseEvent} from "react";

type Status="idle"|"opening"|"recording"|"finishing";
type Hold={timer:number;limit?:number;pointer:number;held:boolean;released:boolean;stream?:MediaStream;recorder?:MediaRecorder;started?:number};
const holdMs=420,maxMs=15_000;
function releaseMedia(hold:Hold){
  clearTimeout(hold.timer);clearTimeout(hold.limit);
  if(hold.recorder?.state==="recording")hold.recorder.stop();
  hold.stream?.getTracks().forEach(track=>track.stop());
}
export function useLensHold(enabled:boolean,onAudio:(audio:File)=>void,onFailure:()=>void){
  const [status,setStatus]=useState<Status>("idle");
  const gesture=useRef<Hold|null>(null),skipClick=useRef(false);
  const callbacks=useRef({onAudio,onFailure});callbacks.current={onAudio,onFailure};
  const cancel=()=>{
    const item=gesture.current;gesture.current=null;
    if(item)releaseMedia(item);
  };
  useEffect(()=>{
    if(!enabled){cancel();setStatus("idle");}
    const hidden=()=>{if(document.hidden){cancel();setStatus("idle");}};
    document.addEventListener("visibilitychange",hidden);
    return()=>{document.removeEventListener("visibilitychange",hidden);cancel();};
  },[enabled]);
  function abort(item:Hold){
    if(gesture.current!==item)return;
    cancel();setStatus("idle");callbacks.current.onFailure();
  }
  async function start(item:Hold){
    if(gesture.current!==item)return;
    item.held=true;skipClick.current=true;setStatus("opening");
    try{
      const stream=await navigator.mediaDevices.getUserMedia({audio:{echoCancellation:true,noiseSuppression:true,channelCount:1},video:false});
      if(gesture.current!==item||item.released){stream.getTracks().forEach(track=>track.stop());return;}
      item.stream=stream;
      const mime=["audio/mp4","audio/webm;codecs=opus"].find(type=>MediaRecorder.isTypeSupported(type));
      const recorder=item.recorder=new MediaRecorder(stream,mime?{mimeType:mime}:undefined),parts:Blob[]=[];
      recorder.ondataavailable=event=>{if(event.data.size)parts.push(event.data);};
      recorder.onerror=()=>abort(item);
      recorder.onstop=async()=>{
        if(gesture.current!==item)return;
        item.stream?.getTracks().forEach(track=>track.stop());
        if(!parts.length||performance.now()-(item.started||0)<220){abort(item);return;}
        setStatus("finishing");
        try{
          const {lensAudioWav}=await import("./lens-modes");
          const audio=await lensAudioWav(new Blob(parts,{type:recorder.mimeType}));
          if(gesture.current===item){cancel();setStatus("idle");callbacks.current.onAudio(audio);}
        }catch{abort(item);}
      };
      recorder.start();item.started=performance.now();setStatus("recording");
      item.limit=window.setTimeout(()=>{if(recorder.state==="recording")recorder.stop();},maxMs);
    }catch{abort(item);}
  }
  return {
    status,
    onPointerDown(event:PointerEvent<HTMLButtonElement>){
      skipClick.current=false;
      if(!enabled||event.button!==0||!event.isPrimary||gesture.current||!navigator.mediaDevices?.getUserMedia||typeof MediaRecorder==="undefined")return;
      const item:Hold={timer:0,pointer:event.pointerId,held:false,released:false};
      item.timer=window.setTimeout(()=>void start(item),holdMs);
      gesture.current=item;event.currentTarget.setPointerCapture(event.pointerId);
    },
    onPointerUp(event:PointerEvent<HTMLButtonElement>){
      const item=gesture.current;
      if(!item||event.pointerId!==item.pointer)return;
      clearTimeout(item.timer);
      if(!item.held){gesture.current=null;return;}
      item.released=true;
      if(item.recorder?.state==="recording"){setStatus("finishing");item.recorder.stop();}
      else if(!item.recorder)abort(item);
    },
    onPointerCancel(){if(gesture.current){cancel();setStatus("idle");}},
    onContextMenu(event:MouseEvent<HTMLButtonElement>){if(enabled)event.preventDefault();},
    allowClick(event:MouseEvent<HTMLButtonElement>){const skip=skipClick.current;skipClick.current=false;return !skip||event.detail===0;}
  };
}
