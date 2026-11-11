"use client";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import { useDialogScrollLock } from "./use-dialog-scroll-lock";
import { Icon } from "./icons";
import ResponsivePhoto from "./responsive-photo";
import { downwardDismiss, type TouchPoint } from "./swipe-intent";
import type { Language } from "./i18n";
type Photo = { url: string; alt?: string; previewUrl?:string; srcSet?:string; width?:number; height?:number; credit?: string; license?: string; reference?: string; organ?: string };
export default function PhotoAlbum({ photos, name, language, onPhotoChange, priority=false }: { priority?:boolean; photos: Photo[]; name: string; language: Language; onPhotoChange?: (index: number) => void }) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const track = useRef<HTMLDivElement>(null), viewer = useRef<HTMLDialogElement>(null);
  const fullTrack = useRef<HTMLDivElement>(null), fullIndexRef = useRef(0), fullPendingSlide = useRef<number|null>(null);
  useDialogScrollLock(viewer);
  const indexRef = useRef(0), pointer = useRef({ x: 0, y: 0 });
  const pendingSlide = useRef<number|null>(null);
  const swipe=useRef<(TouchPoint & {id:number;at:number})|null>(null), touches = useRef(new Set<number>());
  const [viewerOpen,setViewerOpen] = useState(false);
  const [index, setIndex] = useState(0), [fullIndex, setFullIndex] = useState(0);
  const [unavailable, setUnavailable] = useState<string[]>([]);
  const [fullReady,setFullReady] = useState<string[]>([]);
  const albumIdentity=JSON.stringify([name,photos.map(photo=>photo.url)]);
  useLayoutEffect(()=>{
    viewer.current?.close();setViewerOpen(false);setFullIndex(0);fullIndexRef.current=0;setIndex(0);indexRef.current=0;pendingSlide.current=null;swipe.current=null;touches.current.clear();
    track.current?.scrollTo({left:0,behavior:"instant"});setUnavailable([]);setFullReady([]);
  },[albumIdentity]);
  const select = (value: number) => {
    const next = Math.max(0, Math.min(photos.length - 1, value));
    if(next===indexRef.current)return;
    indexRef.current = next; setIndex(next); onPhotoChange?.(next);
  };
  const move = (value: number) => {
    const node = track.current; if (!node) return;
    const next = Math.max(0, Math.min(photos.length - 1, value));
    select(next);pendingSlide.current=Math.abs(node.scrollLeft-next*node.clientWidth)<1?null:next;
    node.scrollTo({ left: next * node.clientWidth, behavior: node.closest(".reduced-motion")||window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth" });
  };
  const openViewer = (value:number) => {
    fullIndexRef.current=value;setFullIndex(value);setViewerOpen(true);
  };
  const moveViewer = (value:number) => {
    const node=fullTrack.current;if(!node)return;
    const next=Math.max(0,Math.min(photos.length-1,value));
    fullIndexRef.current=next;setFullIndex(next);
    fullPendingSlide.current=Math.abs(node.scrollLeft-next*node.clientWidth)<1?null:next;
    node.scrollTo({left:next*node.clientWidth,behavior:node.closest(".reduced-motion")||window.matchMedia("(prefers-reduced-motion: reduce)").matches?"instant":"smooth"});
  };
  useLayoutEffect(()=>{
    if(!viewerOpen)return;
    const dialog=viewer.current,node=fullTrack.current;if(!dialog||!node)return;
    if(!dialog.open)dialog.showModal();
    node.scrollTo({left:fullIndexRef.current*node.clientWidth,behavior:"instant"});
    const animation=!dialog.closest(".reduced-motion")&&!window.matchMedia("(prefers-reduced-motion:reduce)").matches&&typeof node.animate==="function"?node.animate([{transform:"translateY(12px) scale(.985)"},{transform:"translateY(0) scale(1)"}],{duration:160,easing:"cubic-bezier(.2,.8,.2,1)"}):null;
    const observer=typeof ResizeObserver==="function"?new ResizeObserver(()=>node.scrollTo({left:fullIndexRef.current*node.clientWidth,behavior:"instant"})):null;
    observer?.observe(node);return()=>{observer?.disconnect();animation?.cancel();};
  },[viewerOpen]);
  const resetDrag = () => { viewer.current?.style.removeProperty("--photo-drag"); viewer.current?.removeAttribute("data-dragging"); };
  const finishDrag = (event:{pointerId:number;clientX:number;clientY:number;timeStamp:number},canceled=false) => {
    touches.current.delete(event.pointerId);
    const start=swipe.current;swipe.current=null;resetDrag();
    if(!canceled && start?.id===event.pointerId && downwardDismiss(start,{x:event.clientX,y:event.clientY},window.visualViewport?.scale,event.timeStamp-start.at))viewer.current?.close();
  };
  useEffect(() => {
    const node = track.current; if (!node) return;
    if(typeof ResizeObserver!=="function")return;
    const observer = new ResizeObserver(() => node.scrollTo({ left: indexRef.current * node.clientWidth, behavior: "instant" }));
    observer.observe(node); return () => observer.disconnect();
  }, []);
  const photo = photos[fullIndex];
  return <div className="photo-album">
    <div className="photo-album-track" ref={track} onPointerDown={()=>{pendingSlide.current=null;}} onWheel={()=>{pendingSlide.current=null;}} onScroll={event => {
      const node=event.currentTarget,width=node.clientWidth;if(!width)return;
      if(pendingSlide.current!==null){if(Math.abs(node.scrollLeft-pendingSlide.current*width)>=1)return;pendingSlide.current=null;}
      select(Math.round(node.scrollLeft/width));
    }} aria-label={t("Gözlem fotoğrafları", "Observation photos")} tabIndex={0} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); move(indexRef.current + (event.key === "ArrowRight" ? 1 : -1)); } }}>
      {photos.map((item, i) => <button type="button" className="photo-album-slide" key={item.url} aria-label={`${t("Fotoğrafı tam aç", "Open full photo")} · ${i + 1}/${photos.length} · ${name}`} onPointerDown={event => { pointer.current = { x: event.clientX, y: event.clientY }; }} onClick={event => {
        if (event.detail && (Math.abs(event.clientX - pointer.current.x) > 8 || Math.abs(event.clientY - pointer.current.y) > 8)) return;
        openViewer(i);
      }}>{unavailable.includes(item.url) ? <span className="photo-unavailable"><Icon name="camera" />{t("Kaynak fotoğrafı yüklenemedi", "Source photo unavailable")}</span> : <ResponsivePhoto priority={priority&&i===0} sizes="(max-width:700px) 100vw, 680px" src={item.previewUrl||item.url} srcSet={item.srcSet} width={item.width} height={item.height} alt={item.alt||`${name} · ${item.organ || `${i + 1}/${photos.length}`}`} loading="lazy" decoding="async" onError={() => setUnavailable(items => [...items, item.url])} />}</button>)}
    </div>
    {photos.length > 1 && <span className="photo-album-count" aria-live="polite">{index + 1} / {photos.length}</span>}
    <button className="photo-album-expand" onClick={() => openViewer(index)} aria-label={t("Fotoğrafı tam aç", "Open full photo")}><Icon name="expand" /></button>
    {photos.length > 1 && <><button className="photo-album-prev" disabled={index === 0} onClick={() => move(index - 1)} aria-label={t("Önceki fotoğraf", "Previous photo")}>‹</button><button className="photo-album-next" disabled={index === photos.length - 1} onClick={() => move(index + 1)} aria-label={t("Sonraki fotoğraf", "Next photo")}>›</button><div className="photo-album-dots" aria-label={t("Fotoğraf seç", "Select photo")}>{photos.map((item, i) => ({item,i})).filter(({i})=>photos.length<=7 || (i>=Math.max(0,Math.min(index-3,photos.length-7)) && i<Math.max(0,Math.min(index-3,photos.length-7))+7)).map(({item,i}) => <button key={item.url} aria-label={`${t("Fotoğraf", "Photo")} ${i + 1}`} aria-pressed={index === i} onClick={() => move(i)}><span /></button>)}</div></>}
    <dialog className="photo-viewer" ref={viewer} onClose={()=>{setViewerOpen(false);swipe.current=null;touches.current.clear();resetDrag();move(fullIndexRef.current);}} aria-label={t("Tam fotoğraf", "Full photo")} onClick={event => { if (event.target === event.currentTarget) viewer.current?.close(); }} onKeyDown={event => { if (event.key === "ArrowLeft" || event.key === "ArrowRight") { event.preventDefault(); moveViewer(fullIndexRef.current+(event.key==="ArrowRight"?1:-1)); } }}>
      <header><div><strong>{name}</strong><span>{fullIndex + 1} / {photos.length}</span></div><button onClick={() => viewer.current?.close()} aria-label={t("Kapat", "Close")} autoFocus><Icon name="close" /></button></header>
      <div className="photo-viewer-track" ref={fullTrack} tabIndex={0} aria-label={t("Fotoğraflar", "Photos")}
        onScroll={event=>{const node=event.currentTarget,width=node.clientWidth;if(!width)return;if(fullPendingSlide.current!==null){if(Math.abs(node.scrollLeft-fullPendingSlide.current*width)>=1)return;fullPendingSlide.current=null;}const next=Math.max(0,Math.min(photos.length-1,Math.round(node.scrollLeft/width)));if(next!==fullIndexRef.current){fullIndexRef.current=next;setFullIndex(next);}}}
        onPointerDown={event=>{fullPendingSlide.current=null;if(event.pointerType!=="touch"&&event.pointerType!=="pen")return;touches.current.add(event.pointerId);if(touches.current.size>1)resetDrag();swipe.current=touches.current.size===1?{x:event.clientX,y:event.clientY,id:event.pointerId,at:event.timeStamp}:null;}}
        onPointerMove={event=>{const start=swipe.current;if(!start||touches.current.size!==1||(window.visualViewport?.scale||1)>1.01)return;const y=event.clientY-start.y,x=event.clientX-start.x;if(y>12&&y>Math.abs(x)*1.6){if(!event.currentTarget.hasPointerCapture(event.pointerId))event.currentTarget.setPointerCapture(event.pointerId);viewer.current?.setAttribute("data-dragging","true");viewer.current?.style.setProperty("--photo-drag",`${Math.min(y,window.innerHeight*.65)}px`);}}}
        onPointerUp={event=>finishDrag(event)} onPointerCancel={event=>finishDrag(event,true)}>
        {viewerOpen&&photos.map((item,i)=><div className="photo-viewer-slide" key={item.url}>{unavailable.includes(item.url)?<p>{t("Kaynak fotoğrafı yüklenemedi", "Source photo unavailable")}</p>:<>{item.previewUrl&&item.previewUrl!==item.url&&!fullReady.includes(item.url)&&<span className="photo-viewer-preview" aria-hidden="true"><ResponsivePhoto loading={Math.abs(i-fullIndex)<=1?"eager":"lazy"} sizes="100vw" src={item.previewUrl} alt=""/></span>}<ResponsivePhoto className={`photo-viewer-original ${!item.previewUrl||item.previewUrl===item.url||fullReady.includes(item.url)?"is-ready":""}`} priority={i===fullIndex} loading={Math.abs(i-fullIndex)<=1?"eager":"lazy"} sizes="100vw" src={item.url} alt={item.alt||`${name} · ${i+1}/${photos.length}`} onLoad={()=>setFullReady(items=>items.includes(item.url)?items:[...items,item.url])} onError={()=>setUnavailable(items=>items.includes(item.url)?items:[...items,item.url])}/></>}</div>)}
      </div>
      <footer>{photos.length>1&&<div className="photo-viewer-controls"><button disabled={fullIndex === 0} onClick={() => moveViewer(fullIndexRef.current-1)}>{t("Önceki", "Previous")}</button><button disabled={fullIndex === photos.length - 1} onClick={() => moveViewer(fullIndexRef.current+1)}>{t("Sonraki", "Next")}</button></div>}{photo?.credit && <p data-user-content>{photo.credit}</p>}<div>{photo?.license && <a href={photo.license} target="_blank" rel="noreferrer">{t("Fotoğraf lisansı", "Photo licence")}</a>}{photo?.reference && <a href={photo.reference} target="_blank" rel="noreferrer">{t("Kaynak kayıt", "Source record")}</a>}</div></footer>
    </dialog>
  </div>;
}
