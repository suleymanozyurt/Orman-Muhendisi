"use client";
import {clientId} from "./client-id";
import SearchSelect from "./search-select";
import ObservationTaxonSelect from "./observation-taxon-select";
import { compactPhoto } from "./photo-prepare";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import type { Plant } from "./plant-data";
import type { Language } from "./i18n";
import { fieldSignature, FieldUploadError, submitFieldDraft, validateFieldDraft, type FieldDraft } from "./field-draft";
import { claimGuestFieldDraft, deleteFieldDraft, loadFieldDraft, readFieldFile, rememberFieldOwner, saveFieldDraft } from "./field-storage";
import DeviceDrafts, { fieldDraftEvent } from "./device-drafts";
import { registerFieldNavigation } from "./field-navigation";
import type { ObservationPhotoBatch } from "./lens-types";
import LinkPreviewEditor from "./link-preview-editor";
import type { LinkPreview } from "./link-preview";
type Photo = { id: string; file: File; url: string; organ: string; uploadedKey?: string };
type Props = { language: Language; plants: Plant[]; initialPlant: string; initialFile?: File | null; initialNote?: string; incomingPhotos?: ObservationPhotoBatch; onPhotosConsumed?: (id: string) => void;
  owner?: string; initialDraftId?: string; offlineOnly?: boolean; authenticated?: boolean; onSaved: () => void };
export default function ObservationComposer({ language, plants, initialPlant, initialFile, initialNote, incomingPhotos, onPhotosConsumed, owner = "guest", initialDraftId, offlineOnly = false, authenticated = true, onSaved }: Props) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const [linkUrl, setLinkUrl] = useState(""), [linkPreview, setLinkPreview] = useState<LinkPreview>(), [dismissedLink, setDismissedLink] = useState("");
  const [taxonLabel, setTaxonLabel] = useState("");
  const [photos, setPhotos] = useState<Photo[]>([]), [text, setText] = useState(initialNote || ""), [plantId, setPlantId] = useState(initialPlant);
  const [date, setDate] = useState(new Date().toLocaleDateString("sv-SE")), [share, setShare] = useState(false), [position, setPosition] = useState({ latitude: "", longitude: "" });
  const [error, setError] = useState(""), [message, setMessage] = useState(""), [busy, setBusy] = useState(false), [preparing, setPreparing] = useState(false), [savingDevice, setSavingDevice] = useState(false);
  const [progress, setProgress] = useState(0);
  const [dragging, setDragging] = useState(false), [online, setOnline] = useState(true), [draftId, setDraftId] = useState(initialDraftId || ""), [storedSignature, setStoredSignature] = useState("");
  const input = useRef<HTMLInputElement>(null), urls = useRef(new Set<string>()), count = useRef(0), persistedPhotos = useRef(new Set<string>()), uploadIdentity = useRef({ clientId: "", signature: "" });
  const failedAutosave = useRef("");
  const consumedPhotos = useRef(new Set<string>());
  const loading = useRef(false), saving = useRef(false), processing = useRef(false), published = useRef(false), note = useRef<HTMLTextAreaElement>(null);
  useEffect(() => () => { urls.current.forEach(url => URL.revokeObjectURL(url)); }, []);
  useEffect(() => { rememberFieldOwner(owner); const update = () => setOnline(navigator.onLine); update(); window.addEventListener("online", update); window.addEventListener("offline", update); return () => { window.removeEventListener("online", update); window.removeEventListener("offline", update); }; }, [owner]);
  useEffect(() => { try { localStorage.setItem("om.fieldLanguage", language); } catch { /* Preference only. */ } }, [language]);
  function explain(cause: unknown) {
    const code = cause instanceof Error ? cause.message : "";
    if (code === "EMPTY_DRAFT") return t("Bir fotoğraf veya not ekle.", "Add a photo or note.");
    if (code === "INVALID_LINK") return t("Geçerli bir bağlantı gir veya bağlantıyı kaldır.", "Enter a valid link or remove the link.");
    if (code === "INVALID_LOCATION") return t("Geçerli enlem ve boylam gir.", "Enter valid latitude and longitude.");
    if (code === "INVALID_DATE") return t("Geçerli bir gözlem tarihi gir.", "Enter a valid observation date.");
    if (code === "DRAFT_UNAVAILABLE" || code === "PHOTO_UNAVAILABLE") return t("Bu taslak veya fotoğraf cihazda bulunamadı. Diğer taslaklarını açabilirsin.", "This draft or photo is unavailable on this device. You can open another draft.");
    if (cause instanceof FieldUploadError) {
      const problem = code === "AUTH_REQUIRED" ? t("Hesabına göndermek için yeniden giriş yap.", "Sign in again to send to your account.") : code === "OFFLINE" ? t("Bağlantı kesildi.", "Connection lost.") : t("Gönderim tamamlanamadı.", "Sending did not finish.");
      return problem + " " + (cause.deviceSaved ? t("Taslağın cihazında duruyor; yeniden gönderebilirsin.", "Your draft remains on this device; you can send again.") : t("Fotoğrafların bu açık ekranda duruyor. Ekranı kapatmadan yeniden dene.", "Your photos remain in this open editor. Retry before closing it."));
    }
    return t("Cihaza kaydedilemedi. Depolama alanını ve tarayıcı izinlerini kontrol et. Açık gözlemini kapatma.", "Could not save to this device. Check storage and browser permissions. Keep this observation open.");
  }
  const add = async (files: File[]) => {
    if (busy || preparing || processing.current || loading.current) return false;
    if (count.current + files.length > 100) { setError(t("Bir gözleme en fazla 100 fotoğraf ekleyebilirsin.", "Add up to 100 photos per observation.")); return false; }
    const before = count.current;
    processing.current = true; setPreparing(true); setError(""); let invalid = 0;
    for (const file of files) { try { const processed = await compactPhoto(file), url = URL.createObjectURL(processed); urls.current.add(url); count.current++; setPhotos(all => [...all, { id: clientId(), file: processed, url, organ: "Genel görünüş" }]); } catch { invalid++; } }
    if (invalid) setError(t(`${invalid} fotoğraf okunamadı. JPG, PNG veya WebP seç (en fazla 20 MB).`, `${invalid} photos could not be read. Use JPG, PNG or WebP (up to 20 MB).`));
    processing.current = false; setPreparing(false);
    return count.current > before;
  };
  useEffect(() => { if (initialFile && !initialDraftId) void add([initialFile]); }, []);
  function snapshot(): FieldDraft {
    const base = { id: draftId || clientId(), owner, updatedAt: new Date().toISOString(), text, plantId, taxonLabel, observedAt: date, share, position, linkUrl, linkPreview, dismissedLink,
      photos: photos.map(p => ({ id: p.id, name: p.file.name, type: p.file.type, size: p.file.size, organ: p.organ, uploadedKey: p.uploadedKey })) };
    const signature = fieldSignature(base);
    if (uploadIdentity.current.signature !== signature) uploadIdentity.current = { clientId: uploadIdentity.current.clientId || clientId(), signature };
    return { ...base, ...uploadIdentity.current };
  }
  async function persist(current: FieldDraft) {
    await saveFieldDraft(current, photos.filter(p => !persistedPhotos.current.has(p.id)).map(p => ({ draftId: current.id, id: p.id, blob: p.file })));
    persistedPhotos.current = new Set(current.photos.map(p => p.id)); setDraftId(current.id); setStoredSignature(current.signature);
    window.dispatchEvent(new Event(fieldDraftEvent));
  }
  async function saveDevice(automatic = false) {
    if (saving.current || busy || preparing) return;
    saving.current = true; setSavingDevice(true); setError("");
    try { const current = snapshot(); validateFieldDraft(current, true); await persist(current); setMessage(t("Taslağın bu cihazda saklandı. Paylaşılmadı.", "Draft saved on this device. It has not been shared.")); }
    catch (cause) { if(automatic) failedAutosave.current=currentSignature; setError(explain(cause)); }
    finally { saving.current = false; setSavingDevice(false); }
  }
  async function discardEmptyDraft() {
    if (!draftId) return true;
    try { await deleteFieldDraft(draftId, owner); setDraftId(""); setStoredSignature(""); persistedPhotos.current.clear(); uploadIdentity.current={clientId:"",signature:""}; window.dispatchEvent(new Event(fieldDraftEvent)); return true; }
    catch (cause) { setError(explain(cause)); return false; }
  }
  async function openDraft(id: string, initial = false) {
    if (busy || preparing || saving.current || loading.current) return;
    loading.current = true; setPreparing(true); setError("");
    try {
      if (!initial && (text.trim() || photos.length || linkUrl)) { const current = snapshot(); validateFieldDraft(current, true); await persist(current); }
      await claimGuestFieldDraft(id, owner);
      const draft = await loadFieldDraft(id, owner); if (!draft) throw new Error("DRAFT_UNAVAILABLE");
      const restored: Photo[] = [];
      for (const photo of draft.photos) { const blob = await readFieldFile(draft.id, photo.id), file = new File([blob], photo.name, { type: photo.type }), url = URL.createObjectURL(file); urls.current.add(url); restored.push({ ...photo, file, url }); }
      for (const photo of photos) { URL.revokeObjectURL(photo.url); urls.current.delete(photo.url); }
      count.current = restored.length; persistedPhotos.current = new Set(restored.map(p => p.id)); uploadIdentity.current = { clientId: draft.clientId, signature: draft.signature };
      setLinkUrl(draft.linkUrl || ""); setLinkPreview(draft.linkPreview); setDismissedLink(draft.dismissedLink || "");
      setPhotos(restored); setText(draft.text); setPlantId(draft.plantId); setTaxonLabel(draft.taxonLabel || ""); setDate(draft.observedAt); setShare(draft.share); setPosition(draft.position); setDraftId(draft.id); setStoredSignature(draft.signature);
      setMessage(t("Cihazdaki taslağın açıldı.", "Your device draft is open.")); note.current?.focus();
    } catch (cause) { setError(explain(cause)); }
    finally { loading.current = false; setPreparing(false); }
  }
  useEffect(() => { if (initialDraftId) void openDraft(initialDraftId, true); }, [initialDraftId]);
  useEffect(() => {
    if (!incomingPhotos || consumedPhotos.current.has(incomingPhotos.id) || busy || preparing || savingDevice || processing.current || loading.current) return;
    const batch = incomingPhotos;
    consumedPhotos.current.add(batch.id);
    void add(batch.files).then(added => { if (added && batch.taxon) { setPlantId(batch.taxon.id); setTaxonLabel(batch.taxon.label); setMessage(t("Fotoğraftan seçtiğin tür gözlemine eklendi. Kaydetmeden önce kontrol edebilirsin.", "The species you chose from the photo was added. You can review it before saving.")); } }).finally(() => onPhotosConsumed?.(batch.id));
  }, [incomingPhotos, busy, preparing, savingDevice, onPhotosConsumed]);
  const currentSignature = fieldSignature({ text, plantId, observedAt: date, share, position, linkUrl, linkPreview, dismissedLink, photos: photos.map(p => ({ id: p.id, name: p.file.name, size: p.file.size, type: p.file.type, organ: p.organ })) });
  useEffect(() => {
    if (!text.trim() && !photos.length && !linkUrl && draftId && storedSignature && !busy && !preparing && !savingDevice && !loading.current && !published.current) {
      const timer=setTimeout(()=>{void discardEmptyDraft();},1200);return()=>clearTimeout(timer);
    }
    if ((!text.trim() && !photos.length && !linkUrl) || currentSignature === failedAutosave.current || busy || preparing || savingDevice || currentSignature === storedSignature || loading.current || published.current) return;
    const timer = setTimeout(() => { void saveDevice(true); }, 1200); return () => clearTimeout(timer);
  }, [draftId, currentSignature, storedSignature, busy, preparing, savingDevice]);
  useEffect(() => registerFieldNavigation(async () => {
    if (published.current || currentSignature === storedSignature) return true;
    if (!text.trim() && !photos.length && !linkUrl && !loading.current) return discardEmptyDraft();
    if (busy || preparing || saving.current || loading.current) { setError(t("Gözlemin hazırlanıyor veya saklanıyor. Biraz sonra yeniden dene.", "Your observation is being prepared or saved. Try again shortly.")); return false; }
    saving.current = true; setSavingDevice(true);
    try { const current = snapshot(); validateFieldDraft(current, true); await persist(current); return true; }
    catch (cause) { setError(explain(cause)); return false; }
    finally { saving.current = false; setSavingDevice(false); }
  }), [currentSignature, storedSignature, busy, preparing, owner]);
  useEffect(() => {
    const guard = (event: BeforeUnloadEvent) => { if (!published.current && (text.trim() || photos.length || linkUrl) && currentSignature !== storedSignature) { event.preventDefault(); event.returnValue = ""; } };
    window.addEventListener("beforeunload", guard); return () => window.removeEventListener("beforeunload", guard);
  }, [currentSignature, storedSignature, text, photos.length]);
  async function save(event: React.FormEvent) {
    event.preventDefault(); if (busy || preparing || saving.current) return;
    if (offlineOnly || !online || !authenticated) { await saveDevice(); return; }
    setBusy(true); setError(""); setProgress(0);
    try {
      const current = snapshot();
      await submitFieldDraft(current, id => { const photo = photos.find(p => p.id === id); return photo ? Promise.resolve(photo.file) : readFieldFile(current.id, id); }, {
        backup: (updated, initial) => initial ? persist(updated) : saveFieldDraft(updated),
        onBackupUnavailable: () => setMessage(t("Bu cihazda yedek saklanamıyor. Hesabına gönderirken bu ekranı açık tut.", "This device cannot keep a backup. Keep this editor open while sending to your account.")),
        onProgress: setProgress, onCheckpoint: async updated => {
          setPhotos(previous => previous.map(p => ({ ...p, uploadedKey: updated.photos.find(f => f.id === p.id)?.uploadedKey })));
        },
      });
      published.current = true; setStoredSignature(current.signature);
      // A failed local cleanup cannot turn an acknowledged account save into a failure.
      try { await deleteFieldDraft(current.id, owner); window.dispatchEvent(new Event(fieldDraftEvent)); } catch { /* Stable client id makes a remaining copy safe to retry. */ }
      onSaved();
    } catch (cause) { setError(explain(cause)); }
    finally { setBusy(false); }
  }
  const remove = (photo: Photo) => { URL.revokeObjectURL(photo.url); urls.current.delete(photo.url); count.current--; setPhotos(all => all.filter(p => p.id !== photo.id)); };
  const organNames: Record<string, string> = { "Genel görünüş": "Habit", Yaprak: "Leaf", Çiçek: "Flower", Meyve: "Fruit", Kozalak: "Cone", Kabuk: "Bark", Gövde: "Stem", "Mantar şapkası": "Mushroom cap", "Mantar alt yüzü": "Mushroom underside", "Canlı ayrıntısı": "Organism detail" };
  return <form className="composer" onSubmit={save} aria-busy={busy || preparing}>
    <div className="composer-heading"><div><span className="eyebrow">{t("SAHA DEFTERİN", "YOUR FIELD JOURNAL")}</span><h2>{t("Doğadan bir an.", "A moment in nature.")}</h2><p>{t("Fotoğraflarını ve notunu ekle. Nerede paylaşacağına sen karar ver.", "Add your photos and note. You decide where to share.")}</p></div><span className="composer-status"><Icon name="save" />{offlineOnly || !online ? t("Çevrimdışı saha modu", "Offline field mode") : share ? t("Onay sonrası paylaşılır", "Shared after approval") : t("Özel taslak", "Private draft")}</span></div>
    <DeviceDrafts owner={owner} language={language} onOpen={id => void openDraft(id)} activeId={draftId} />
    <div className="composer-layout"><section>
      <div className="composer-drop" data-has-photos={photos.length > 0} data-dragging={dragging} onDragOver={e => { e.preventDefault(); setDragging(true); }} onDragLeave={e => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setDragging(false); }} onDrop={e => { e.preventDefault(); setDragging(false); void add(Array.from(e.dataTransfer.files)); }}>
        <input ref={input} type="file" accept="image/jpeg,image/png,image/webp" multiple hidden onChange={e => { void add(Array.from(e.target.files || [])); e.target.value = ""; }} /><Icon name="camera" /><h3>{t("Fotoğraflarını ekle", "Add your photos")}</h3><p>{t("Tek seferde 100 fotoğrafa kadar. Büyük fotoğraflar otomatik küçültülür.", "Up to 100 photos at once. Large photos are resized automatically.")}</p><button type="button" disabled={busy || preparing || photos.length === 100} onClick={() => input.current?.click()}>{preparing ? t("Hazırlanıyor…", "Preparing…") : t("Fotoğraf seç", "Choose photos")}</button><small>JPG · PNG · WebP / {photos.length}/100</small>
      </div>
      {!!photos.length && <><div className="composer-gallery-head"><strong>{photos.length} {t("fotoğraf", "photos")}</strong><span>{t("İlk fotoğraf kapaktır.", "The first photo is the cover.")}</span></div><div className="composer-gallery">{photos.map((p, i) => <article key={p.id}><div><img width="320" height="320" loading="lazy" decoding="async" src={p.url} alt={t(`Gözlem fotoğrafı ${i + 1}`, `Observation photo ${i + 1}`)} /><button disabled={busy || preparing} type="button" aria-label={t("Fotoğrafı kaldır", "Remove photo")} onClick={() => remove(p)}>×</button>{i === 0 && <span>{t("Kapak", "Cover")}</span>}</div><label className="sr-only" htmlFor={p.id}>{t("Fotoğrafın konusu", "Photo subject")}</label><SearchSelect disabled={busy || preparing} id={p.id} value={p.organ} onChange={e => setPhotos(all => all.map(photo => photo.id === p.id ? { ...photo, organ: e.target.value } : photo))}>{Object.entries(organNames).map(([tr, en]) => <option key={tr} value={tr}>{t(tr, en)}</option>)}</SearchSelect>{i > 0 && <button disabled={busy || preparing} type="button" onClick={() => setPhotos(all => [p, ...all.filter(x => x.id !== p.id)])}>{t("Kapak yap", "Set as cover")}</button>}</article>)}</div></>}
    </section><section className="composer-details"><fieldset disabled={busy || preparing}>
      <legend>{t("Gözlem bilgileri", "Observation details")}</legend><label>{t("Gözlem notu", "Field note")}<textarea ref={note} value={text} onChange={e => setText(e.target.value)} maxLength={1500} rows={4} placeholder={t("Nerede gördün, neler dikkatini çekti?", "Where did you find it? What stood out?")} /><small>{text.length}/1500</small></label>
      <LinkPreviewEditor text={text} url={linkUrl} preview={linkPreview} dismissed={dismissedLink} offline={offlineOnly || !online} language={language} onChange={(url, preview, dismissed = dismissedLink) => { setLinkUrl(url); setLinkPreview(preview); setDismissedLink(dismissed); }} />
      <label>{t("Gözlem tarihi", "Observed on")}<input type="date" value={date} onChange={e => setDate(e.target.value)} required /></label>
      <ObservationTaxonSelect language={language} plants={plants} value={plantId} label={taxonLabel} offlineOnly={offlineOnly || !online} disabled={busy || preparing} onChange={(value,label)=>{setPlantId(value);setTaxonLabel(label);}} />
      <div className="composer-location"><strong>{t("Konum (isteğe bağlı)", "Location (optional)")}</strong><div><label>{t("Enlem", "Latitude")}<input type="number" step="any" min="-90" max="90" value={position.latitude} onChange={e => setPosition(p => ({ ...p, latitude: e.target.value }))} /></label><label>{t("Boylam", "Longitude")}<input type="number" step="any" min="-180" max="180" value={position.longitude} onChange={e => setPosition(p => ({ ...p, longitude: e.target.value }))} /></label></div>
        <button type="button" onClick={() => { if (!navigator.geolocation) { setError(t("Konum desteklenmiyor.", "Location is not supported.")); return; } navigator.geolocation.getCurrentPosition(p => setPosition({ latitude: p.coords.latitude.toFixed(5), longitude: p.coords.longitude.toFixed(5) }), () => setError(t("Konum alınamadı. Elle girebilirsin.", "Location unavailable. You can enter it manually.")), { timeout: 10000 }); }}>{t("Konumumu kullan", "Use my location")}</button>{position.latitude && <button type="button" onClick={() => setPosition({ latitude: "", longitude: "" })}>{t("Konumu kaldır", "Remove location")}</button>}
      </div>
    </fieldset>
      <div className="composer-visibility"><Icon name={share ? "share" : "save"} /><div><strong>{share ? t("Toplulukla paylaş", "Share with the community") : t("Yalnızca bana özel", "Only me")}</strong><p>{share ? t("Hesabına gönderdiğinde yönetici onayını bekler. Onay sonrası ilgili tür ve akışta görünür.", "When sent to your account, it awaits administrator approval. Once approved it appears with the taxon and in the feed.") : t("Hesabına özel olarak gönderebilir veya bu cihazda taslak tutabilirsin.", "Send privately to your account or keep a draft on this device.")}</p></div><input disabled={busy || preparing} type="checkbox" checked={share} onChange={e => setShare(e.target.checked)} aria-label={t("Toplulukla paylaş", "Share with the community")} /></div>
      {busy && <div role="status"><progress value={progress} max={Math.max(1, photos.length)} /><p>{progress}/{photos.length} {t("fotoğraf yüklendi", "photos uploaded")}</p></div>}
      {error && <p className="form-error" role="alert">{error}</p>}{message && <p className="field-saved-message" role="status"><Icon name="check" />{message}</p>}
      <div className="composer-save-actions"><button className="field-device-save" type="button" disabled={busy || preparing || savingDevice} onClick={() => void saveDevice()}><Icon name="save" />{savingDevice ? t("Saklanıyor…", "Saving…") : t("Cihazda sakla", "Save on device")}</button>{!offlineOnly && online && authenticated && <button className="submit-button" disabled={busy || preparing || savingDevice} type="submit">{busy ? t("Gönderiliyor…", "Sending…") : share ? t("Onaya gönder", "Submit for approval") : t("Hesabıma özel kaydet", "Save privately to my account")}</button>}</div>
      <p className="field-storage-note">{t("Düzenlerken cihazına otomatik saklanır; paylaşılmaz. Tarayıcı verilerini silersen taslaklar silinir. Hesabına gönderdiğinde kalıcı olarak saklanır.", "Edits are saved automatically on this device and are not shared. Clearing browser data removes drafts. Sending to your account saves them permanently.")}</p>
      {offlineOnly && online && <a className="field-reconnect" href={draftId ? `/?view=create&deviceDraft=${encodeURIComponent(draftId)}` : "/?view=create"}>{t("Bağlantı geldi · hesabımda devam et", "Connected · continue in my account")}</a>}
    </section></div>
  </form>;
}
