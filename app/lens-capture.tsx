"use client";
import { lazy, Suspense, useCallback, useEffect, useImperativeHandle, useRef, useState, type CSSProperties, type PointerEvent, type TouchEvent, type RefObject } from "react";
import { Icon } from "./icons";
import LensModeIcon from "./lens-icons";
import {lensModes,type LensBlock,type LensMode} from "./lens-modes";
import {lensFieldActions} from "./lens-field-actions";
import {useLensHold} from "./lens-hold";
import { compactPhoto } from "./photo-prepare";
import { clampLensZoom, drawLensCrop, focusLensCrop, fullLensCrop, lensCropPixels, lensRegionCrop, lensViewfinder, mapLensRegionBox, moveLensCrop, type LensCrop } from "./lens-crop";
import { croppedLensPhoto } from "./lens-photo";
import type { LensAvailability, LensCandidate, LensNextShot, LensReply } from "./lens-types";
import { lensShotLabel } from "./lens-guidance";
import type { Language } from "./i18n";
const LensRecent = lazy(() => import("./lens-recent"));
const LensHistory = lazy(() => import("./lens-history"));
const LensAdvanced = lazy(() => import("./lens-advanced"));
const LensLive = lazy(() => import("./lens-live"));
const LensResults = lazy(() => import("./lens-results"));
export type LensCaptureControl = { start: () => void; stop: () => void; back: () => boolean; photoAction: (action: "retake" | "replace" | "full" | "observation" | "history" | "flash") => void };
type Props = { active: boolean; autoStart: boolean; language: Language; admin: boolean; authenticated: boolean; owner: string; control: RefObject<LensCaptureControl | null>; onPhotoState: (hasPhoto: boolean) => void; onControls: (controls:LensControls)=>void;
  onObservation: (files: File[], candidate?: LensCandidate) => Promise<boolean>; onTaxon: (id: string) => void; onConnect: () => void; onSignIn: () => void;
  /** Same-origin address that opens Lens outside an embedding frame; empty hides the link. */
  standaloneUrl?: string };
export type LensControls={mode:LensMode;torchAvailable:boolean;torchOn:boolean};
export type LensHistoryEntry = { id:number; file:File; crop:LensCrop; query:string; reply:LensReply; at:number };
type Photo = { file: File; url: string; width: number; height: number };
export default function LensCapture({ active, autoStart, language, admin, authenticated, owner, control, onPhotoState, onControls, onObservation, onTaxon, onConnect, onSignIn, standaloneUrl = "/?view=home&lens=1" }: Props) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const [photo, setPhoto] = useState<Photo | null>(null), [crop, setCrop] = useState<LensCrop>(fullLensCrop), [cropping, setCropping] = useState(false);
  const [camera, setCamera] = useState<"off" | "opening" | "on">("off"), [cameraReady, setCameraReady] = useState(false), [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [handoff, setHandoff] = useState(false);
  const [useDeviceCamera, setUseDeviceCamera] = useState(false);
  const [reply, setReply] = useState<LensReply | null>(null), [selected, setSelected] = useState(""), [error, setError] = useState("");
  const [availability, setAvailability] = useState<LensAvailability | null>(null), [dragging, setDragging] = useState(false), [authRequired, setAuthRequired] = useState(false);
  const [recent, setRecent] = useState<File[]>([]), [expanded, setExpanded] = useState(false), [sheetHeight, setSheetHeight] = useState<number | null>(null), [library, setLibrary] = useState<"gallery" | "history" | "ideas" | null>(null);
  const [history,setHistory]=useState<LensHistoryEntry[]>([]);
  // Earlier frames of the same subject stay with the session until it becomes an observation or is retaken.
  const [frames,setFrames]=useState<Photo[]>([]),[guidance,setGuidance]=useState<LensNextShot|null>(null);
  const earlier=useRef<Photo[]>([]),appending=useRef<LensNextShot|null>(null),current=useRef<Photo|null>(null);
  const keepFrames=(next:Photo[])=>{earlier.current=next;setFrames(next);};
  const dropFrames=()=>{earlier.current.forEach(frame=>URL.revokeObjectURL(frame.url));keepFrames([]);};
  const endAppend=()=>{appending.current=null;setGuidance(null);};
  const [mode,setMode]=useState<LensMode>("search"),[preset,setPreset]=useState(""),[overlay,setOverlay]=useState<LensBlock[]>([]);
  const [visited,setVisited]=useState<Exclude<LensMode,"search">[]>([]),[voiceQuestion,setVoiceQuestion]=useState<File|null>(null);
  const [selectedText,setSelectedText]=useState<number|null>(null),[textCopy,setTextCopy]=useState("");
  const [zoom,setZoom]=useState(1), [torchAvailable,setTorchAvailable]=useState(false), [torchOn,setTorchOn]=useState(false);
  const [screen, setScreen] = useState<"camera" | "photo">("camera"), [searchQuery, setSearchQuery] = useState("");
  const gallery = useRef<HTMLInputElement>(null), nativeCamera = useRef<HTMLInputElement>(null), video = useRef<HTMLVideoElement>(null), surface = useRef<HTMLDivElement>(null), viewfinder = useRef<HTMLDivElement>(null), guide = useRef<HTMLSpanElement>(null);
  const sheetContent=useRef<HTMLDivElement>(null);
  const modeDrag=useRef<{x:number;y:number}|null>(null),modeSwiped=useRef(false);
  const stream = useRef<MediaStream | null>(null), facing = useRef<"environment" | "user">("environment"), cameraSequence = useRef(0), photoSequence = useRef(0), requestSequence = useRef(0);
  const request = useRef<AbortController | null>(null), photoUrl = useRef(""), processing = useRef(false), submitting = useRef(false), cameraLive = useRef(false), enabled = useRef(active);
  const availabilityCurrent = useRef<LensAvailability | null>(null);
  const shooting = useRef(false), sheetDrag = useRef<{y:number; height:number; total:number; next:number; moved:boolean} | null>(null), sheetSwiped = useRef(false), [sheetMoving, setSheetMoving] = useState(false);
  const photoOwner = useRef(owner);
  const gesture = useRef<{y:number;x:number;distance:number;zoom:number} | null>(null);
  const drag = useRef<{ id: number; x: number; y: number; width: number; height: number; left: number; top: number; crop: LensCrop; corner?: string; draw: boolean; moved: boolean; next: LensCrop } | null>(null);
  const cancelAnalysis = useCallback(() => { requestSequence.current++; request.current?.abort(); request.current = null; setBusy(false); }, []);
  const stopCamera = useCallback(() => { cameraSequence.current++; stream.current?.getTracks().forEach(track => track.stop()); stream.current = null; cameraLive.current = false; setCameraReady(false); setCamera("off"); setTorchOn(false); setTorchAvailable(false); }, []);
  useImperativeHandle(control, () => ({ start: () => { enabled.current = true; void openCamera(); }, stop: () => { enabled.current = false; photoSequence.current++; cancelAnalysis(); stopCamera(); setLibrary(null); if (appending.current) cancelFrame(); }, back: () => { if (library) { setLibrary(null); return true; } if (appending.current) { cancelFrame(); return true; } if (screen === "photo") { void openCamera(false); return true; } return false; }, photoAction: action => { if (action === "retake") void openCamera(); else if (action === "replace") gallery.current?.click(); else if (action === "history") setLibrary("history"); else if(action==="flash")void toggleTorch(); else if (action === "full") { setMode("search"); changeCrop(fullLensCrop); setCropping(true); if (photo && authenticated && availability?.available) void identify(photo, fullLensCrop); } else void continueObservation(); } }));
  useEffect(() => { current.current = photo; onPhotoState(Boolean(photo) && screen === "photo"); }, [photo, screen, onPhotoState]);
  useEffect(()=>onControls({mode,torchAvailable,torchOn}),[mode,torchAvailable,torchOn,onControls]);
  useEffect(() => {
    if (!active) { if (!enabled.current) { cancelAnalysis(); stopCamera(); } return; }
    enabled.current = true;
    const controller = new AbortController();
    const check = () => { void fetch("/api/photo-identify", { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) return;
      const next = await response.json() as LensAvailability;
      if (controller.signal.aborted) return;
      setAvailability(next);
      availabilityCurrent.current = next;
      if (!next.available) setAuthRequired(false);
      if (next.available) setError(current => current === "IDENTIFICATION_NOT_CONFIGURED" ? "" : current);
    }).catch(() => {}); };
    check(); window.addEventListener("om-assistant-config", check);
    const hide = () => { if (document.hidden) { stopCamera(); cancelAnalysis(); } };
    document.addEventListener("visibilitychange", hide);
    return () => { controller.abort(); window.removeEventListener("om-assistant-config", check); document.removeEventListener("visibilitychange", hide); };
  }, [active, cancelAnalysis, stopCamera]);
  useEffect(() => { if (authenticated) setAuthRequired(false); }, [authenticated]);
  useEffect(()=>{setSelectedText(null);setTextCopy("");},[overlay,mode]);
  useEffect(() => {
    const previous = photoOwner.current; photoOwner.current = owner;
    if (previous === owner || previous === "guest") return;
    photoSequence.current++; cancelAnalysis(); stopCamera();
    if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); photoUrl.current = "";
    dropFrames(); endAppend();
    setPhoto(null); setRecent([]); setHistory([]); setReply(null); setSelected(""); setCrop(fullLensCrop); setCropping(false); setError(""); setAuthRequired(false);
  }, [owner, cancelAnalysis, stopCamera]);
  useEffect(() => () => { enabled.current = false; photoSequence.current++; cameraSequence.current++; request.current?.abort(); stream.current?.getTracks().forEach(track => track.stop()); if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); earlier.current.forEach(frame => URL.revokeObjectURL(frame.url)); }, []);
  useEffect(() => {
    const element=video.current, current=stream.current;
    if (camera !== "on" || !element || !current) return;
    const failed=()=>{if(stream.current!==current)return;stopCamera();setUseDeviceCamera(true);setError(t("Canlı görüntü kesildi. Deklanşörle cihaz kamerasını açabilir veya fotoğraf seçebilirsin.","Live preview stopped. Open the device camera with the shutter or choose a photo."));};
    const tracks=current.getVideoTracks();tracks.forEach(track=>track.addEventListener("ended",failed,{once:true}));
    element.srcObject=current;void element.play().catch(failed);
    return()=>{tracks.forEach(track=>track.removeEventListener("ended",failed));element.srcObject=null;};
  }, [camera,stopCamera,language]);
  async function choose(file?: File, analyse = false, initialCrop = fullLensCrop, restored?: LensHistoryEntry, intent?: {mode:LensMode;preset?:string;audio?:File}) {
    if (!file || !enabled.current || processing.current || submitting.current) return;
    let nextPhoto: Photo | undefined;
    const id = ++photoSequence.current; processing.current = true; setPreparing(true); setError(""); cancelAnalysis(); stopCamera();
    try {
      const prepared = restored ? file : await compactPhoto(file), url = URL.createObjectURL(prepared), image = new Image(); image.src = url;
      try { await image.decode(); } catch { URL.revokeObjectURL(url); throw new Error(); }
      if (id !== photoSequence.current) { URL.revokeObjectURL(url); return; }
      // A guided extra frame joins the same observation: the photo taken before it is kept, not replaced.
      const joining=!restored&&appending.current&&current.current;
      if (joining) keepFrames([...earlier.current, joining].slice(-3));
      else { if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); dropFrames(); }
      photoUrl.current = url; endAppend();
      nextPhoto = { file: prepared, url, width: image.naturalWidth, height: image.naturalHeight };
      const nextMode=restored||joining?"search":intent?.mode||mode;
      setMode(nextMode);setPreset(nextMode==="create"?(intent?.preset??preset):"");setVoiceQuestion(intent?.audio||null);
      setVisited(nextMode==="search"?[]:[nextMode]);setOverlay([]);setPhoto(nextPhoto); setScreen("photo"); setSearchQuery(restored?.query || ""); setCrop(initialCrop); setCropping(true); setReply(restored?.reply || null); setSelected(""); setAuthRequired(false); setExpanded(false); setSheetHeight(nextMode==="create"||nextMode==="talk"?52:40); setLibrary(null);
      setRecent(all => [prepared, ...all.filter(item => item.name !== prepared.name || item.size !== prepared.size)].slice(0, 12));
    } catch { if (id === photoSequence.current) setError(t("Fotoğraf okunamadı. En fazla 20 MB JPG, PNG veya WebP seç.", "Could not read this photo. Choose JPG, PNG or WebP up to 20 MB.")); }
    finally { processing.current = false; setPreparing(false); }
    if (nextPhoto && analyse && enabled.current && (earlier.current.length || (intent?.mode||mode) === "search")) {
      if (availabilityCurrent.current?.available !== false) void identify(nextPhoto, initialCrop, "", true);
    }
  }
  async function openCamera(useNativeFallback = true, append = false) {
    if (processing.current || submitting.current) return;
    if (!append) { endAppend(); dropFrames(); }
    cancelAnalysis(); stopCamera(); setScreen("camera"); setError(""); setUseDeviceCamera(false); setZoom(1); setAuthRequired(false); setExpanded(false); setSheetHeight(null); setLibrary(null);
    if (!navigator.mediaDevices?.getUserMedia) { setUseDeviceCamera(true); setError(t("Canlı kamera kullanılamıyor. Kamerayla çekebilir veya galeriden seçebilirsin.", "Live camera is unavailable. Take a photo or choose from your gallery.")); if (useNativeFallback) nativeCamera.current?.click(); return; }
    setCamera("opening");
    const id = ++cameraSequence.current;
    try {
      const next = await navigator.mediaDevices.getUserMedia({ audio: false, video: { facingMode: { ideal: facing.current }, width: { ideal: 1920 }, height: { ideal: 1440 } } });
      if (id !== cameraSequence.current || !enabled.current) { next.getTracks().forEach(track => track.stop()); return; }
      stream.current = next; cameraLive.current = true;
      const track=next.getVideoTracks()[0];
      let capabilities:(MediaTrackCapabilities & {torch?:boolean})|undefined;
      try { capabilities=track?.getCapabilities?.(); } catch { /* Torch is optional even when the stream works. */ }
      setTorchAvailable(capabilities?.torch === true);setCamera("on");
    } catch { if (id === cameraSequence.current) { setCamera("off"); setUseDeviceCamera(true); setError(t("Canlı kamera açılamadı. Deklanşörle cihaz kamerasını aç veya galeriden seç.", "Live camera unavailable. Use the shutter to open your device camera or pick a photo.")); } }
  }
  // Opening Lens from an explicit Add action starts the camera; closing it releases the stream.
  useEffect(()=>{if(active){setMode("search");setPreset("");setOverlay([]);if(autoStart)void openCamera(false);}},[active,autoStart]);
  async function shutter(intent?:{mode:LensMode;preset?:string;audio?:File}) {
    const source = video.current; if (!source?.videoWidth || !source.videoHeight || processing.current || shooting.current) return;
    shooting.current = true;
    const preview = viewfinder.current?.getBoundingClientRect() || source.getBoundingClientRect();
    const visible = lensCropPixels(lensViewfinder(source.videoWidth, source.videoHeight, preview.width, preview.height, zoom), source.videoWidth, source.videoHeight);
    const target = mode === "search" ? guide.current?.getBoundingClientRect() : undefined;
    const initialCrop = target && preview.width && preview.height ? drawLensCrop((target.left-preview.left)/preview.width,(target.top-preview.top)/preview.height,(target.right-preview.left)/preview.width,(target.bottom-preview.top)/preview.height) : fullLensCrop;
    const canvas = document.createElement("canvas"), scale = Math.min(1, 1920 / Math.max(visible.width, visible.height));
    canvas.width = Math.max(1, Math.round(visible.width * scale)); canvas.height = Math.max(1, Math.round(visible.height * scale));
    const context = canvas.getContext("2d"); if (!context) { shooting.current = false; return; }
    context.drawImage(source, visible.x, visible.y, visible.width, visible.height, 0, 0, canvas.width, canvas.height);
    const id = cameraSequence.current;
    try {
      const blob = await new Promise<Blob | null>(resolve => canvas.toBlob(resolve, "image/jpeg", .9));
      if (blob && id === cameraSequence.current && cameraLive.current && enabled.current) await choose(new File([blob], "kamera.jpg", { type: "image/jpeg" }), true, initialCrop, undefined, intent);
    } finally { shooting.current = false; }
  }
  /** Opens the camera for one more frame of the same subject; the current photo, answer and note stay. */
  function addFrame() {
    if (!photo || preparing || handoff || submitting.current) return;
    appending.current = reply?.nextShot || { part: "other", reason: "" }; setGuidance(appending.current); setMode("search");
    void openCamera(false, true);
  }
  function cancelFrame() { endAppend(); stopCamera(); setError(""); if (current.current) setScreen("photo"); }
  function removeFrame(index: number) {
    const frame = earlier.current[index]; if (!frame || busy) return;
    URL.revokeObjectURL(frame.url); keepFrames(earlier.current.filter((_, at) => at !== index));
  }
  function changeCrop(next: LensCrop) { cancelAnalysis(); setCrop(next); setReply(null); setSelected(""); }
  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    if (mode!=="search" || !cropping || !photo || preparing || handoff || event.button !== 0 || drag.current || (event.target as Element).closest(".lens-object-marker")) return;
    const target = (event.target as Element).closest<HTMLElement>("[data-crop-corner],[data-crop-move]");
    const rect = surface.current?.getBoundingClientRect(); if (!rect?.width || !rect.height) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    drag.current = { id: event.pointerId, x: event.clientX, y: event.clientY, width: rect.width, height: rect.height, left: rect.left, top: rect.top, crop, corner: target?.dataset.cropCorner, draw: !target, moved: false, next: crop };
  }
  function pointerMove(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current; if (start?.id !== event.pointerId) return;
    const dx = event.clientX - start.x, dy = event.clientY - start.y;
    if (!start.moved && Math.hypot(dx, dy) < 6) return;
    start.moved = true;
    start.next = start.draw ? drawLensCrop((start.x - start.left) / start.width, (start.y - start.top) / start.height, (event.clientX - start.left) / start.width, (event.clientY - start.top) / start.height) : moveLensCrop(start.crop, dx / start.width, dy / start.height, start.corner);
    changeCrop(start.next);
  }
  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    const start = drag.current; if (start?.id !== event.pointerId) return;
    const x=(event.clientX-start.left)/start.width,y=(event.clientY-start.top)/start.height;
    const objects=(reply?.regions||[]).filter(({box:[top,left,bottom,right]})=>x*1000>=left&&x*1000<=right&&y*1000>=top&&y*1000<=bottom);
    const object=objects.sort((a,b)=>(a.box[2]-a.box[0])*(a.box[3]-a.box[1])-(b.box[2]-b.box[0])*(b.box[3]-b.box[1]))[0];
    const next = start.moved ? start.next : start.corner ? crop : object ? lensRegionCrop(object.box) : focusLensCrop(x,y);
    drag.current = null; changeCrop(next);
    if (photo && availability?.available && authenticated && (start.moved || !start.corner)) void identify(photo, next);
  }
  async function identify(sourcePhoto = photo, sourceCrop = crop, query = searchQuery, discover = false) {
    if (!sourcePhoto || processing.current || submitting.current || Boolean(request.current)) return;
    if (availabilityCurrent.current?.available === false) { setAuthRequired(false); setError("IDENTIFICATION_NOT_CONFIGURED"); return; }
    if (!authenticated) { setAuthRequired(true); return; }
    cancelAnalysis(); const id = ++requestSequence.current, controller = new AbortController(); request.current = controller;
    setBusy(true); setReply(null); setError(""); setAuthRequired(false);
    try {
      const fullFrame=discover&&availabilityCurrent.current?.provider!=="plantnet";
      const submitted=fullFrame?fullLensCrop:sourceCrop;
      const image = await croppedLensPhoto(sourcePhoto.file, submitted); if (id !== requestSequence.current) return;
      const form = new FormData(); form.append("image", image); form.append("language", language); if (query.trim()) form.append("query", query.trim());
      const context = earlier.current.at(-1); if (context && availabilityCurrent.current?.provider !== "plantnet") form.append("context", context.file);
      if(fullFrame&&(sourceCrop.width<.99||sourceCrop.height<.99))form.append("focus",JSON.stringify([sourceCrop.y,sourceCrop.x,sourceCrop.y+sourceCrop.height,sourceCrop.x+sourceCrop.width].map(value=>Math.min(1000,Math.round(value*1000)))));
      const response = await fetch("/api/photo-identify", { method: "POST", body: form, signal: controller.signal });
      const result = await response.json() as LensReply & { error?: string };
      if (!response.ok) throw new Error(result.error || "IDENTIFICATION_UNAVAILABLE");
      if (id === requestSequence.current) {
        const mapped=result.regions ? {...result,regions:result.regions.map(region=>({...region,box:mapLensRegionBox(region.box,submitted)}))} : result;
        setReply(mapped); setSelected(""); setExpanded(false);
        const entry={id,file:sourcePhoto.file,crop:sourceCrop,query:query.trim(),reply:mapped,at:Date.now()};
        setHistory(previous=>[entry,...previous.filter(item=>item.file!==entry.file || item.query!==entry.query || JSON.stringify(item.crop)!==JSON.stringify(entry.crop))].slice(0,6));
      }
    } catch (cause) {
      if (id === requestSequence.current && !controller.signal.aborted) {
        if (cause instanceof Error && cause.message === "AUTH_REQUIRED") setAuthRequired(true);
        else setError(cause instanceof Error && cause.message === "IDENTIFICATION_NOT_CONFIGURED" ? cause.message : t("Tanıma servisine ulaşılamadı. Fotoğrafın burada duruyor; yeniden deneyebilirsin.", "The identification service is unavailable. Your photo remains here; you can retry."));
      }
    } finally { if (id === requestSequence.current) { setBusy(false); request.current = null; } }
  }
  async function continueObservation(candidate?: LensCandidate, sourcePhoto = photo) {
    if (!sourcePhoto || submitting.current || processing.current) return;
    submitting.current = true; setHandoff(true); cancelAnalysis();
    try { if (await onObservation([...earlier.current.map(frame => frame.file), sourcePhoto.file], candidate)) { if (photoUrl.current) URL.revokeObjectURL(photoUrl.current); photoUrl.current = ""; dropFrames(); setPhoto(null); setScreen("camera"); setCrop(fullLensCrop); setCropping(false); setReply(null); setSelected(""); setError(""); setAuthRequired(false); } }
    catch { setError(t("Gözlem açılamadı. Fotoğrafın burada duruyor; yeniden dene.", "Could not open the observation. Your photo remains here; retry.")); }
    finally { submitting.current = false; setHandoff(false); }
  }
  async function toggleTorch(){
    const track=stream.current?.getVideoTracks()[0];
    if(!track||!torchAvailable)return;
    try { await track.applyConstraints({advanced:[{torch:!torchOn} as MediaTrackConstraintSet]}); if(track===stream.current?.getVideoTracks()[0])setTorchOn(!torchOn); }
    catch { setTorchAvailable(false); }
  }
  const distance=(touches:TouchEvent["touches"])=>Math.hypot(touches[0].clientX-touches[1].clientX,touches[0].clientY-touches[1].clientY);
  const startGesture=(event:TouchEvent<HTMLDivElement>)=>{
    if(screen!=="camera"||library||preparing||(event.target as Element).closest("button,a"))return;
    const point=event.touches[0];if(!point)return;
    gesture.current={x:point.clientX,y:point.clientY,distance:event.touches.length===2?distance(event.touches):0,zoom};
  };
  const moveGesture=(event:TouchEvent<HTMLDivElement>)=>{const start=gesture.current;if(start&&start.distance>0&&event.touches.length===2&&camera==="on")setZoom(clampLensZoom(start.zoom*distance(event.touches)/start.distance));};
  const finishGesture=(event:TouchEvent<HTMLDivElement>)=>{
    const start=gesture.current;gesture.current=null;
    const point=event.changedTouches[0];
    if(!start||!point||start.distance)return;
    const dx=point.clientX-start.x,dy=point.clientY-start.y;
    if(dy<-54&&Math.abs(dx)<80)setLibrary("gallery");
    else if(Math.abs(dx)>62&&Math.abs(dx)>1.35*Math.abs(dy))stepMode(dx<0?1:-1);
  };
  function changeMode(next:LensMode){
    if(next===mode||preparing||handoff)return;
    setMode(next);setOverlay([]);setError("");setAuthRequired(false);
    if(screen==="camera"){setPreset("");return;}
    sheetContent.current?.scrollTo(0,0);
    cancelAnalysis();
    if(next!=="search")setVisited(previous=>previous.includes(next)?previous:[...previous,next]);
    else if(photo&&!reply&&availabilityCurrent.current?.available!==false)void identify(photo,crop,searchQuery,true);
  }
  function stepMode(direction:number){const next=lensModes[lensModes.indexOf(mode)+direction];if(next)changeMode(next);}
  const hold=useLensHold(active&&screen==="camera"&&mode==="search"&&cameraReady&&!library&&authenticated&&availability?.provider==="gemini",
    audio=>void shutter({mode:"talk",audio}),()=>setError(t("Ses alınamadı. Yeniden basılı tut veya fotoğraf çek.","No audio captured. Hold again or take a photo.")));
  const modeText:Record<LensMode,string>={search:t("Tür Bul","Identify"),translate:t("Metni Oku","Read Text"),talk:t("Canlı Sor","Ask Live"),create:t("Hazırla","Prepare")};
  const ideas=lensFieldActions(language);
  const useIdea=(label:string)=>{
    setPreset(label);setLibrary(null);
    if(cameraReady)void shutter({mode:"create",preset:label});
    else if(useDeviceCamera)nativeCamera.current?.click();
    else void openCamera(false);
  };
  const modeStrip=(inResult=false)=><div className={`lens-mode-switch${inResult?" lens-result-mode-switch":""}`} role="group" aria-label={t("Lens modları", "Lens modes")}
    onPointerDown={event=>{modeSwiped.current=false;modeDrag.current={x:event.clientX,y:event.clientY};}}
    onPointerCancel={()=>{modeDrag.current=null;}}
    onPointerUp={event=>{const origin=modeDrag.current;modeDrag.current=null;if(!origin)return;const dx=event.clientX-origin.x,dy=event.clientY-origin.y;if(Math.abs(dx)>42&&Math.abs(dx)>1.45*Math.abs(dy)){modeSwiped.current=true;stepMode(dx<0?1:-1);}}}>
    {lensModes.map(value=><button key={value} type="button" aria-pressed={mode===value} onClick={event=>{if(!modeSwiped.current||event.detail===0)changeMode(value);modeSwiped.current=false;}}><LensModeIcon mode={value}/><span>{modeText[value]}</span></button>)}
  </div>;
  const choice = reply?.candidates.find(candidate => candidate.taxonId === selected);
  const showingPhoto = Boolean(photo) && screen === "photo";
  const selectedLine=selectedText===null?null:overlay[selectedText];
  const searchLine=()=>{
    if(!photo||!selectedLine)return;
    const query=(selectedLine.original||selectedLine.text).trim().slice(0,320);
    setMode("search");setOverlay([]);setSearchQuery(query);setError("");setAuthRequired(false);changeCrop(fullLensCrop);
    void identify(photo,fullLensCrop,query);
  };
  const finishSheet = () => {
    const start = sheetDrag.current; sheetDrag.current = null; setSheetMoving(false);
    if (start?.moved) {
      sheetSwiped.current = true;
      const snap = [34, 52, 90].reduce((best, next) => Math.abs(next - start.next) < Math.abs(best - start.next) ? next : best);
      setSheetHeight(snap); setExpanded(snap > 70);
    }
  };
  return <div className="lens-capture" data-mode={mode} data-has-photo={showingPhoto} data-has-results={Boolean(reply) && showingPhoto} data-expanded={expanded} data-sheet-moving={sheetMoving}
    style={{ "--lens-aspect": photo ? photo.width / photo.height : 1, "--lens-sheet-height": `${sheetHeight ?? 40}%` } as CSSProperties} aria-busy={busy || preparing || handoff} onPaste={event=>{const image=Array.from(event.clipboardData.files).find(file=>file.type.startsWith("image/"));if(image){event.preventDefault();void choose(image,true);}}}>
    <div ref={viewfinder} className="lens-stage" inert={Boolean(library)} onTouchStart={startGesture} onTouchMove={moveGesture} onTouchEnd={finishGesture} onTouchCancel={()=>{gesture.current=null;}} data-has-photo={showingPhoto} data-camera={camera !== "off"} data-dragging={dragging}
      onDragOver={event => { event.preventDefault(); if (!preparing && !handoff) setDragging(true); }}
      onDragLeave={event => { if (!event.currentTarget.contains(event.relatedTarget as Node)) setDragging(false); }}
      onDrop={event => { event.preventDefault(); setDragging(false); void choose(event.dataTransfer.files[0], true); }}>
      {screen === "camera" ? <>
        {camera === "on" && <video ref={video} style={{transform:`scale(${zoom})`}} autoPlay playsInline muted onLoadedData={() => setCameraReady(true)} aria-label={t("Canlı kamera görüntüsü", "Live camera preview")}/>}
        {mode!=="create"&&mode!=="talk"&&<span ref={guide} className="lens-camera-guide" aria-hidden="true"><i/><i/><i/><i/></span>}
        {camera === "off" && !preparing && <div className="lens-fallback"><Icon name="lens"/><button type="button" onClick={()=>gallery.current?.click()}>{t("Fotoğraf seç","Choose a photo")}</button>{useDeviceCamera && standaloneUrl && typeof window!=="undefined" && window.top!==window && <a href={standaloneUrl} target="_blank" rel="noopener">{t("Kamerayı yeni sekmede aç","Open camera in a new tab")}</a>}</div>}
        {camera === "opening" && <p className="lens-camera-opening" role="status">{t("Kamera açılıyor…", "Opening camera…")}<button type="button" onClick={stopCamera}>{t("Vazgeç", "Cancel")}</button></p>}
      </> : photo && <div className="lens-photo-surface" ref={surface} style={{ "--lens-aspect": photo.width / photo.height, aspectRatio: `${photo.width}/${photo.height}` } as CSSProperties}
        onPointerDown={pointerDown} onPointerMove={pointerMove} onPointerUp={pointerUp} onPointerCancel={() => { drag.current = null; }}>
        <img src={photo.url} alt={t("Tanımlanacak fotoğraf", "Photo to identify")} draggable={false}/>
        {mode==="search"&&<div className="lens-crop-box" data-crop-move tabIndex={0} role="group" aria-label={t("Kadraj; ok tuşlarıyla taşı, Shift ve ok tuşlarıyla boyutlandır", "Crop; arrow keys move, Shift and arrows resize")}
          style={{ left: `${crop.x * 100}%`, top: `${crop.y * 100}%`, width: `${crop.width * 100}%`, height: `${crop.height * 100}%` }}
          onKeyDown={event => { if (!cropping || !event.key.startsWith("Arrow")) return; event.preventDefault(); const dx = event.key === "ArrowLeft" ? -.02 : event.key === "ArrowRight" ? .02 : 0, dy = event.key === "ArrowUp" ? -.02 : event.key === "ArrowDown" ? .02 : 0; changeCrop(moveLensCrop(crop, dx, dy, event.shiftKey ? "br" : undefined)); }}>
          {["tl", "tr", "bl", "br"].map(corner => <span key={corner} className={`lens-crop-handle ${corner}`} data-crop-corner={corner} aria-hidden="true"/>)}
        </div>}{mode==="search"&&!busy&&reply?.regions?.map(({box,label},index)=><button className="lens-object-marker" type="button" key={index} title={label} aria-label={t(`${label} alanında ara`,`Search the ${label} region`)} style={{left:`${(box[1]+box[3])/20}%`,top:`${(box[0]+box[2])/20}%`}} onClick={()=>{const next=lensRegionCrop(box);changeCrop(next);void identify(photo,next);}}><span/></button>)}{mode==="translate"&&<div className="lens-translation-layer">{overlay.map((block,index)=>{const [top,left,bottom,right]=block.box;return <button key={index} type="button" aria-pressed={selectedText===index} style={{left:`${left/10}%`,top:`${top/10}%`,width:`${(right-left)/10}%`,maxHeight:`${Math.max(10,(bottom-top)/10)}%`}} onClick={()=>{setSelectedText(selectedText===index?null:index);setTextCopy("");}}>{block.text}</button>;})}</div>}{busy && <div className="lens-scanning" aria-hidden="true"/>}
      </div>}
      {preparing && <div className="lens-preparing" role="status">{t("Fotoğraf hazırlanıyor…", "Preparing your photo…")}</div>}
    </div>
    {!showingPhoto && <div className="lens-camera-dock" inert={Boolean(library)}>
      {mode==="create"&&<div className="lens-create-ideas">{ideas.slice(0,2).map(idea=><button type="button" key={idea.id} disabled={camera==="opening"||preparing} onClick={()=>useIdea(idea.label)}><svg aria-hidden="true" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M20 13H8a4 4 0 0 1 0-8m7 3 5 5-5 5"/></svg>{idea.label}</button>)}<button type="button" onClick={()=>setLibrary("ideas")}>{t("Daha fazla fikir görün","See more ideas")}</button></div>}
      {cameraReady && zoom>1 && <button className="lens-zoom" type="button" aria-label={t("Kamera yakınlaştırmasını sıfırla","Reset camera zoom")} onClick={()=>setZoom(1)}>{Number(zoom.toFixed(1))}×</button>}
      {guidance && <div className="lens-frame-guide" role="status"><p><strong>{frames.length + 2}. {t("kare", "frame")} · {lensShotLabel(guidance.part, language)}</strong>{guidance.reason && <span data-user-content>{guidance.reason}</span>}<small>{t("Önceki fotoğrafın bu gözlemde saklanıyor.", "Your earlier photo stays with this observation.")}</small></p><button type="button" onClick={cancelFrame}>{t("Vazgeç", "Cancel")}</button></div>}
      <p className="lens-camera-hint" role="status" hidden={!error}>{error}</p>
      {hold.status!=="idle"&&<p className="lens-voice-capture" role="status">{hold.status==="opening"?t("Mikrofon açılıyor…","Opening microphone…"):hold.status==="recording"?t("Sorunu söyle · Bitirmek için bırak","Ask your question · Release when done"):t("Soru hazırlanıyor…","Preparing your question…")}</p>}
      <div className="lens-camera-controls">
        <button type="button" className="lens-gallery-control" disabled={preparing || handoff} onClick={() => recent.length?setLibrary("gallery"):gallery.current?.click()} aria-label={t("Galeriyi aç", "Open gallery")}><span>{photo ? <img src={photo.url} alt=""/> : <svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="18" height="18" rx="3"/><path d="m4 17 5-5 4 4 3-3 4 4"/><circle cx="16" cy="8" r="1"/></svg>}</span></button>
        {mode==="talk"&&camera==="on"&&active&&!library?<Suspense fallback={<button className="lens-shutter" type="button" disabled aria-label={t("Canlı mod açılıyor","Opening live mode")}><LensModeIcon mode="talk"/></button>}><LensLive camera={video} ready={cameraReady} zoom={zoom} language={language} authenticated={authenticated} onSignIn={onSignIn}/></Suspense>:<button type="button" className="lens-shutter" data-held={hold.status} disabled={camera === "opening" || camera === "on" && !cameraReady || preparing || handoff} onPointerDown={hold.onPointerDown} onPointerUp={hold.onPointerUp} onPointerCancel={hold.onPointerCancel} onContextMenu={hold.onContextMenu} onClick={event => {if(!hold.allowClick(event)||hold.status!=="idle")return;if(camera==="on")void shutter();else if(useDeviceCamera)nativeCamera.current?.click();else void openCamera();}} aria-label={camera === "on" ? t("Fotoğraf çek", "Take a photo") : useDeviceCamera ? t("Cihaz kamerasını aç", "Open device camera") : t("Kamerayı aç", "Open camera")} aria-description={mode==="search"&&cameraReady?t("Sesli soru için basılı tut ve bırak.","Hold and release to ask by voice."):undefined}>{mode!=="search"&&<LensModeIcon mode={mode}/>}</button>}
        {mode==="talk"&&camera==="on"&&<button type="button" className="lens-flip-control lens-photo-question" disabled={!cameraReady||preparing} onClick={()=>void shutter()} aria-label={t("Fotoğrafla sor","Ask with a photo")} title={t("Fotoğrafla sor","Ask with a photo")}><Icon name="camera"/></button>}
        {mode==="create"&&<button type="button" className="lens-flip-control" disabled={camera !== "on"} onClick={() => { facing.current = facing.current === "environment" ? "user" : "environment"; void openCamera(true, Boolean(appending.current)); }} aria-label={t("Kamerayı çevir", "Switch camera")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M20 8a8 8 0 0 0-14-3L3 8m0-5v5h5M4 16a8 8 0 0 0 14 3l3-3m0 5v-5h-5"/></svg></button>}
      </div>
      {modeStrip()}
    </div>}
    {showingPhoto && <div className="lens-bottom-panel" inert={Boolean(library)}>
      <button type="button" className="lens-sheet-handle" aria-label={expanded ? t("Sonuçları küçült", "Collapse results") : t("Sonuçları genişlet", "Expand results")} aria-expanded={expanded}
        onPointerDown={event => { const panel = event.currentTarget.parentElement!, root = panel.parentElement!; const total = root.getBoundingClientRect().height, height = panel.getBoundingClientRect().height; sheetDrag.current = { y: event.clientY, height, total, next: height / total * 100, moved: false }; sheetSwiped.current = false; event.currentTarget.setPointerCapture(event.pointerId); }}
        onPointerMove={event => { const start = sheetDrag.current; if (!start || !start.total || Math.abs(event.clientY - start.y) < 5 && !start.moved) return; if (!start.moved) setSheetMoving(true); start.moved = true; start.next = Math.max(28, Math.min(90, (start.height + start.y - event.clientY) / start.total * 100)); (event.currentTarget.closest(".lens-capture") as HTMLElement).style.setProperty("--lens-sheet-height", `${start.next}%`); }}
        onPointerUp={finishSheet} onPointerCancel={finishSheet}
        onClick={() => { if (sheetSwiped.current) { sheetSwiped.current = false; return; } setSheetHeight(expanded ? 40 : 90); setExpanded(!expanded); }}><span/></button>
      {modeStrip(true)}
      <div className="lens-sheet-content" ref={sheetContent}>
        {mode==="translate"&&selectedLine&&<div className="lens-picked-text"><p>{selectedLine.text}</p><div>
          <button type="button" onClick={()=>{void (async()=>{try{await navigator.clipboard.writeText(selectedLine.text);setTextCopy(t("Kopyalandı","Copied"));}catch{setTextCopy(t("Metni seçip kopyalayabilirsin.","Select the text to copy."));}})();}}><Icon name="copy"/>{t("Kopyala","Copy")}</button>
          <button type="button" onClick={searchLine}><Icon name="search"/>{t("Bu metinle tür ara","Search with this text")}</button>
        </div>{textCopy&&<span role="status">{textCopy}</span>}</div>}
        {photo&&visited.map(value=><div key={`${value}:${photo.url}`} hidden={mode!==value}><Suspense fallback={<p role="status">{t("Mod açılıyor…","Opening mode…")}</p>}><LensAdvanced mode={value} file={photo.file} sourceUrl={photo.url} language={language} authenticated={authenticated} available={availability?.provider==="gemini"} active={active&&mode===value&&!library} preset={value==="create"?preset:""} initialAudio={value==="talk"?voiceQuestion:null} onSignIn={onSignIn} onOverlay={setOverlay}/></Suspense></div>)}
        {mode==="search"&&<>
        <form className="lens-search-bar" onSubmit={event => { event.preventDefault(); void identify(); }}>
          <span className="lens-search-mark" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M8 3H6a3 3 0 0 0-3 3v2m13-5h2a3 3 0 0 1 3 3v2M3 16v2a3 3 0 0 0 3 3h2m8 0h2a3 3 0 0 0 3-3v-2"/><circle cx="12" cy="12" r="4"/></svg></span>
          <button type="button" className="lens-query-photo" onClick={() => gallery.current?.click()} aria-label={t("Fotoğrafı değiştir", "Replace photo")}><img src={photo!.url} alt=""/></button>
          <input value={searchQuery} maxLength={320} disabled={availability?.available === false || availability?.provider === "plantnet"} onChange={event => setSearchQuery(event.currentTarget.value)} placeholder={availability?.provider === "plantnet" ? t("Pl@ntNet · bitki fotoğrafında ara", "Pl@ntNet · search plant photo") : availability?.available === false ? t("Fotoğrafın hazır", "Your photo is ready") : t("Aramana ekle", "Add to your search")} aria-label={t("Fotoğraf aramasına bir soru veya özellik ekle", "Add a question or feature to your image search")} enterKeyHint="search"/>
          <button type="submit" className="lens-query-submit" disabled={preparing || handoff || busy || availability?.available === false} aria-label={t("Fotoğrafta ara", "Search photo")}><Icon name="search"/></button>
          {availability?.provider==="gemini"&&<button type="button" className="lens-query-submit" onClick={()=>changeMode("talk")} aria-label={t("Fotoğraf hakkında sesli sor","Ask by voice about this photo")}><LensModeIcon mode="talk"/></button>}
        </form>
        {busy && <div className="lens-loading" role="status"><div><Icon name="sparkles"/><span>{t("Aranıyor…", "Searching…")}</span><button type="button" onClick={cancelAnalysis}>{t("Durdur", "Stop")}</button></div><span/><span/></div>}
        {authRequired && availability?.available !== false && <div className="lens-notice" role="status"><p>{t("Fotoğrafla tür aramak için giriş yap.", "Sign in to search species by photo.")}</p><button type="button" onClick={onSignIn}>{t("Giriş yap", "Sign in")}</button></div>}
        {error && error !== "IDENTIFICATION_NOT_CONFIGURED" && <div className="lens-notice" role="status"><p>{error}</p><button type="button" onClick={() => void identify()}>{t("Yeniden dene", "Retry")}</button></div>}
        {(error === "IDENTIFICATION_NOT_CONFIGURED" || availability?.available === false) && <div className="lens-unavailable" role="status"><h3>{t("Tür tanıma bağlantısı gerekli", "Connect species identification")}</h3><p>{t("Fotoğrafı gözleme ekleyebilir veya türünü elle seçebilirsin.", "Add your photo to an observation or choose its species manually.")}</p>{admin && <button type="button" onClick={onConnect}>{t("Bağlantıyı ayarla", "Set up connection")}</button>}</div>}
        {frames.length > 0 && <div className="lens-frames" role="group" aria-label={t("Bu gözlemdeki kareler", "Frames in this observation")}><span>{t(`Bu gözlemde ${frames.length + 1} kare`, `${frames.length + 1} frames in this observation`)}</span><ul>{frames.map((frame, index) => <li key={frame.url}><img src={frame.url} alt={t(`${index + 1}. kare`, `Frame ${index + 1}`)}/><button type="button" disabled={busy} onClick={() => removeFrame(index)} aria-label={t(`${index + 1}. kareyi çıkar`, `Remove frame ${index + 1}`)}><Icon name="close"/></button></li>)}<li data-current="true"><img src={photo!.url} alt={t(`${frames.length + 1}. kare, şu an incelenen`, `Frame ${frames.length + 1}, shown now`)}/></li></ul></div>}
        {reply && <Suspense fallback={<p role="status">{t("Sonuçlar açılıyor…", "Opening results…")}</p>}><LensResults reply={reply} selected={selected} language={language} frames={frames.length + 1} onSelect={setSelected} onTaxon={onTaxon} onNextShot={frames.length < 3 ? addFrame : undefined}/></Suspense>}
        {!reply && !busy && !authRequired && availability?.available !== false && !error && <p className="lens-caption lens-crop-hint">{t("Aramak istediğin alana dokun veya kadrajın köşelerini sürükle.", "Tap what you want to search or drag the selection corners.")}</p>}
        </>}
        <button type="button" className="lens-save-unknown" disabled={preparing || handoff || busy} onClick={() => void continueObservation(choice)}><Icon name="plus"/>{handoff ? t("Gözlem açılıyor…", "Opening observation…") : frames.length ? choice ? t(`${frames.length + 1} fotoğraf ve türü gözleme ekle`, `Add ${frames.length + 1} photos and species to observation`) : t(`${frames.length + 1} fotoğrafı gözleme ekle`, `Add ${frames.length + 1} photos to observation`) : choice ? t("Fotoğraf ve türü gözleme ekle", "Add photo and species to observation") : t("Fotoğrafı gözleme ekle", "Add photo to observation")}</button>
        {frames.length < 3 && <button type="button" className="lens-add-frame" disabled={preparing || handoff || busy} onClick={addFrame}><Icon name="camera"/>{t("Aynı gözleme kare ekle", "Add a frame to this observation")}</button>}
      </div>
    </div>}
    {library && <aside className="lens-gallery-sheet" data-library={library} aria-labelledby="lens-library-title">
      <div><h3 id="lens-library-title">{library==="history"?t("Son aramalar", "Recent searches"):library==="ideas"?t("Hazırlama fikirleri","Preparation ideas"):t("Fotoğraflar", "Photos")}</h3><button type="button" autoFocus onClick={() => setLibrary(null)} aria-label={t("Paneli kapat", "Close panel")}><Icon name="close"/></button></div>
      {library==="gallery"?<><button type="button" className="lens-pick-more" onClick={() => gallery.current?.click()}><Icon name="grid"/>{t("Tüm fotoğraflar", "All photos")}</button><Suspense fallback={<p role="status">{t("Fotoğraflar açılıyor…", "Opening photos…")}</p>}><LensRecent active={active} owner={owner} language={language} files={recent} onChoose={file => void choose(file, true)}/></Suspense></>:library==="ideas"?<ul className="lens-idea-list">{ideas.map(idea=><li key={idea.id}><button type="button" onClick={()=>useIdea(idea.label)}><LensModeIcon mode="create"/>{idea.label}</button></li>)}</ul>:<Suspense fallback={<p role="status">{t("Aramalar açılıyor…", "Opening searches…")}</p>}><LensHistory entries={history} language={language} onChoose={entry=>void choose(entry.file,false,entry.crop,entry)} onClear={()=>setHistory([])}/></Suspense>}
    </aside>}
    <input ref={gallery} hidden type="file" accept="image/*" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choose(file, true); }} aria-label={t("Tanımlanacak fotoğrafı seç", "Choose a photo to identify")}/>
    <input ref={nativeCamera} hidden type="file" accept="image/*" capture="environment" onChange={event => { const file = event.currentTarget.files?.[0]; event.currentTarget.value = ""; void choose(file, true); }} aria-label={t("Tanımlanacak fotoğrafı çek", "Take a photo to identify")}/>
  </div>;
}
