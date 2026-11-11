"use client";
import { lazy, Suspense, useEffect, useRef, useState, type RefObject } from "react";
import { Icon } from "./icons";
import { useDialogScrollLock } from "./use-dialog-scroll-lock";
import type { Language } from "./i18n";
import type {LensCaptureControl,LensControls} from "./lens-capture";
import type { LensCandidate } from "./lens-types";
import { routeLoaders } from "./route-components";
import { reusableImport } from "./route-loading";
const loadLensCapture=reusableImport(()=>import("./lens-capture"));
export function warmLens(){void loadLensCapture().catch(()=>{});}
const LensCapture=lazy(loadLensCapture);
const AssistantSettings = lazy(routeLoaders.assistantSettings);

type Props = { autoStart: boolean; dialog: RefObject<HTMLDialogElement | null>; language: Language; admin: boolean; authenticated: boolean; owner: string; captureControl: RefObject<LensCaptureControl | null>; onClose: () => void; onPhotos: (files: File[]) => void; onWrite: () => void; onIdentify: () => void; onDrafts: () => void;
  onCapture: (files: File[], candidate?: LensCandidate) => Promise<boolean>; onTaxon: (id: string) => void; onConnect: () => void; onSignIn: () => void; standaloneUrl?: string };
export default function AddMenu({ dialog, autoStart, language, admin, authenticated, owner, captureControl, onClose, onPhotos, onWrite, onIdentify, onDrafts, onCapture, onTaxon, onConnect, onSignIn, standaloneUrl }: Props) {
  const photos = useRef<HTMLInputElement>(null);
  const [active, setActive] = useState(false);
  const [opened, setOpened] = useState(false);
  const [connecting, setConnecting] = useState(false);
  const [options, setOptions] = useState(false);
  const [hasPhoto, setHasPhoto] = useState(false);
  const [controls,setControls]=useState<LensControls>({mode:"search",torchAvailable:false,torchOn:false});
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  useDialogScrollLock(dialog);
  useEffect(() => { const element = dialog.current; if (!element) return; const synchronize = () => { setActive(element.open); if (element.open) setOpened(true); else { captureControl.current?.stop(); setOptions(false); setConnecting(false); } }; const observer = new MutationObserver(synchronize); observer.observe(element, { attributes: true, attributeFilter: ["open"] }); synchronize(); return () => observer.disconnect(); }, [dialog, captureControl]);
  const choose = (input: HTMLInputElement) => { const files = Array.from(input.files || []); input.value = ""; if (files.length) onPhotos(files); };
  const closeOrBack=()=>{if(options)setOptions(false);else if(!captureControl.current?.back())dialog.current?.close();};
  return <dialog ref={dialog} id="add-observation-menu" className="action-sheet add-menu lens-menu" aria-labelledby="add-menu-title" onCancel={event=>{if(options||captureControl.current?.back()){event.preventDefault();setOptions(false);}}} onClose={() => { captureControl.current?.stop(); setActive(false); setOptions(false); setConnecting(false); onClose(); }} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="dialog-title lens-topbar"><button type="button" autoFocus onClick={closeOrBack} aria-label={hasPhoto?t("Geri dön", "Go back"):t("Kapat","Close")} >{hasPhoto?<svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg>:<Icon name="close"/>}</button><span className="lens-flash-slot">{!hasPhoto&&controls.mode!=="create"&&<button type="button" disabled={!controls.torchAvailable} aria-label={t("Flaş", "Flash")} aria-pressed={controls.torchOn} onClick={()=>captureControl.current?.photoAction("flash")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m13 2-9 12h7l-1 8 10-12h-7z"/>{!controls.torchOn&&<path d="M3 3l18 18"/>}</svg></button>}</span><h2 id="add-menu-title">Orman Lens</h2><button type="button" onClick={()=>captureControl.current?.photoAction("history")} aria-label={t("Son aramalar", "Recent searches")}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 11a9 9 0 1 1 2 7M3 4v7h7m2-4v5l3 2"/></svg></button><button type="button" aria-label={t("Ekle seçenekleri", "Add options")} aria-expanded={options} aria-controls="lens-add-options" onClick={()=>setOptions(!options)}><svg viewBox="0 0 24 24" aria-hidden="true"><circle cx="5" cy="12" r="1"/><circle cx="12" cy="12" r="1"/><circle cx="19" cy="12" r="1"/></svg></button></div>
    {opened&&<Suspense fallback={<div className="lens-opening" role="status"><Icon name="lens"/><p>{t("Kamera hazırlanıyor…","Preparing camera…")}</p><button type="button" onClick={()=>photos.current?.click()}>{t("Fotoğraflı gözlem ekle","Add a photo observation")}</button></div>}><LensCapture control={captureControl} owner={owner} onPhotoState={setHasPhoto} onControls={setControls} active={active} autoStart={autoStart} language={language} admin={admin} authenticated={authenticated} onObservation={onCapture} standaloneUrl={standaloneUrl} onTaxon={onTaxon} onConnect={()=>{if(admin){setConnecting(true);setOptions(true);}else onConnect();}} onSignIn={onSignIn}/></Suspense>}
    <div id="lens-add-options" className="lens-options-drawer" hidden={!options}><div className="lens-options-title"><h3>{t("Ekle seçenekleri", "Add options")}</h3><button type="button" onClick={()=>setOptions(false)} aria-label={t("Seçenekleri kapat", "Close options")}><Icon name="close"/></button></div>{admin && connecting && <section className="lens-connections"><Suspense fallback={<p role="status">{t("Bağlantı ayarı açılıyor…", "Opening connection settings…")}</p>}><AssistantSettings language={language}/></Suspense></section>}
    <div className="lens-other-options">
    <div className="add-menu-options">
      {hasPhoto && <><button type="button" onClick={()=>{setOptions(false);captureControl.current?.photoAction("observation");}}><Icon name="paper"/><span><strong>{t("Fotoğrafı gözleme ekle", "Add photo to an observation")}</strong></span></button><button type="button" onClick={()=>{setOptions(false);captureControl.current?.photoAction("full");}}><Icon name="expand"/><span><strong>{t("Fotoğrafın tamamında ara", "Search the full photo")}</strong></span></button><button type="button" onClick={()=>{setOptions(false);captureControl.current?.photoAction("replace");}}><Icon name="grid"/><span><strong>{t("Fotoğrafı değiştir", "Replace photo")}</strong></span></button></>}
      <button type="button" onClick={() => photos.current?.click()}><Icon name="grid" /><span><strong>{t("Fotoğraflı gözlem", "Photo observation")}</strong><small>{t("Tanımlamadan ekle · En fazla 100 fotoğraf", "Add without identification · Up to 100 photos")}</small></span><span aria-hidden="true">›</span></button>
      <button type="button" onClick={onWrite}><Icon name="paper" /><span><strong>{t("Gözlem yaz", "Write an observation")}</strong><small>{t("Not, tür, tarih ve isteğe bağlı konum", "Note, species, date and optional location")}</small></span><span aria-hidden="true">›</span></button>
      <button type="button" onClick={onIdentify}><Icon name="leaf" /><span><strong>{t("Türü elle seç", "Choose a species manually")}</strong><small>{t("Türleri özellikleriyle karşılaştır", "Compare species and their characteristics")}</small></span><span aria-hidden="true">›</span></button>
      <button type="button" onClick={onDrafts}><Icon name="save" /><span><strong>{t("Taslaklarım", "My drafts")}</strong><small>{t("Cihazında saklanan gözleme devam et", "Continue an observation saved on this device")}</small></span><span aria-hidden="true">›</span></button>
    </div>
    </div></div>
    <input ref={photos} hidden type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={e => choose(e.currentTarget)} aria-label={t("Gözlem fotoğraflarını seç", "Choose observation photos")} />
  </dialog>;
}
