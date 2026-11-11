/**
 * Orman Lens önizlemesi: canlı sitedeki AddMenu / LensCapture bileşenlerini, sunucu yerine
 * service.ts ile çalıştırır. Gerçek kullanıcı verisi, anahtar ve canlı site bağlantısı içermez.
 */
import { useCallback, useEffect, useRef, useState } from "react";
import { createRoot } from "react-dom/client";
import AddMenu from "../../app/add-menu";
import type { LensCaptureControl } from "../../app/lens-capture";
import type { LensCandidate } from "../../app/lens-types";
import { scenarios, type ScenarioId } from "./samples";
import { connectClaude, installPreviewService, preview, type Source } from "./service";

type Draft = { id: string; at: number; note: string; species: string; photos: Blob[] };
type Pending = { files: File[]; candidate?: LensCandidate };

// Drafts stay in this browser only (IndexedDB); memory is the fallback when storage is blocked.
const memory = new Map<string, Draft>();
function store(): Promise<IDBDatabase> {
  return new Promise((resolve, reject) => {
    const open = indexedDB.open("orman-lens-onizleme", 1);
    open.onupgradeneeded = () => open.result.createObjectStore("taslaklar", { keyPath: "id" });
    open.onsuccess = () => resolve(open.result); open.onerror = () => reject(open.error);
  });
}
async function drafts(action: "list" | "put" | "delete", value?: Draft | string): Promise<Draft[]> {
  try {
    const db = await store(), table = db.transaction("taslaklar", action === "list" ? "readonly" : "readwrite").objectStore("taslaklar");
    const run = <T,>(request: IDBRequest<T>) => new Promise<T>((resolve, reject) => { request.onsuccess = () => resolve(request.result); request.onerror = () => reject(request.error); });
    if (action === "put") await run(table.put(value as Draft));
    if (action === "delete") await run(table.delete(value as string));
    const all = await run(db.transaction("taslaklar").objectStore("taslaklar").getAll() as IDBRequest<Draft[]>);
    db.close(); return all.sort((a, b) => b.at - a.at);
  } catch {
    if (action === "put") memory.set((value as Draft).id, value as Draft);
    if (action === "delete") memory.delete(value as string);
    return [...memory.values()].sort((a, b) => b.at - a.at);
  }
}
const remember = (key: string, value?: string) => { try { if (value === undefined) return localStorage.getItem(key); localStorage.setItem(key, value); } catch { /* storage may be blocked */ } return null; };
const day = (at: number) => new Intl.DateTimeFormat("tr-TR", { day: "numeric", month: "long", hour: "2-digit", minute: "2-digit" }).format(at);

function Thumb({ photo, alt }: { photo: Blob; alt: string }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const next = URL.createObjectURL(photo); setUrl(next); return () => URL.revokeObjectURL(next); }, [photo]);
  return url ? <img src={url} alt={alt}/> : <span/>;
}

function Preview() {
  const lens = useRef<HTMLDialogElement>(null), composer = useRef<HTMLDialogElement>(null), control = useRef<LensCaptureControl | null>(null);
  const [live, setLive] = useState<boolean | null>(null), [source, setSource] = useState<Source>("ornek"), [scenario, setScenario] = useState<ScenarioId>("karacam");
  const [backdrop, setBackdrop] = useState(false), [saved, setSaved] = useState<Draft[]>([]), [pending, setPending] = useState<Pending | null>(null), [note, setNote] = useState(""), [toast, setToast] = useState("");
  const toastTimer = useRef(0), toastBox = useRef<HTMLParagraphElement>(null);
  // A manual popover joins the top layer, so the message stays above whichever dialog is open.
  const say = useCallback((text: string) => {
    const box = toastBox.current; setToast(text); clearTimeout(toastTimer.current);
    try { if (box?.matches(":popover-open")) box.hidePopover(); box?.showPopover(); } catch { /* shown in the page instead */ }
    toastTimer.current = window.setTimeout(() => { setToast(""); try { box?.hidePopover(); } catch { /* already closed */ } }, 3800);
  }, []);
  useEffect(() => {
    void drafts("list").then(setSaved);
    const wanted = remember("kaynak"), last = remember("senaryo");
    if (last && scenarios.some(item => item.id === last)) { preview.scenario = last as ScenarioId; setScenario(last as ScenarioId); }
    void connectClaude().then(available => { setLive(available); if (available && wanted !== "ornek") { preview.source = "claude"; setSource("claude"); } });
  }, []);
  const refresh = () => window.dispatchEvent(new Event("om-assistant-config"));
  const chooseSource = (next: Source) => { preview.source = next; setSource(next); remember("kaynak", next); refresh(); };
  const chooseScenario = (next: ScenarioId) => { preview.scenario = next; setScenario(next); remember("senaryo", next); refresh(); };
  const open = () => { if (!lens.current?.open) lens.current?.showModal(); };
  const compose = (next: Pending) => { setPending(next); setNote(""); lens.current?.close(); composer.current?.showModal(); };
  const save = async () => {
    if (!pending) return;
    const species = pending.candidate ? [pending.candidate.commonName, pending.candidate.scientificName].filter(Boolean).join(" · ") : "";
    setSaved(await drafts("put", { id: `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`, at: Date.now(), note: note.trim(), species, photos: pending.files }));
    composer.current?.close(); setPending(null); say("Taslak bu cihaza kaydedildi. Yayımlanmadı.");
  };
  const notHere = (what: string) => () => say(`${what} bu önizlemede bağlı değil.`);
  return <div className="app-shell atlas-workbench preview-shell" data-backdrop={backdrop}>
    <main className="preview-page">
      <header>
        <p className="preview-eyebrow">Orman Mühendisi · Doğa Atlası</p>
        <h1>Orman Lens önizlemesi</h1>
        <p>Fotoğraf çek, önerinin gerekçesini gör, gerekiyorsa ikinci kareyi aynı gözleme ekle, taslağı kaydet.</p>
        <button type="button" className="preview-open" onClick={open}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M8 3H6a3 3 0 0 0-3 3v2m13-5h2a3 3 0 0 1 3 3v2M3 16v2a3 3 0 0 0 3 3h2m8 0h2a3 3 0 0 0 3-3v-2"/><circle cx="12" cy="12" r="4"/></svg>Orman Lens’i aç</button>
      </header>
      <section aria-labelledby="kaynak-baslik">
        <h2 id="kaynak-baslik">Tanıma kaynağı</h2>
        <div className="preview-switch" role="group" aria-label="Tanıma kaynağı">
          <button type="button" id="kaynak-claude" aria-pressed={source === "claude"} disabled={!live} onClick={() => chooseSource("claude")}>Claude ile gerçek tanıma</button>
          <button type="button" id="kaynak-ornek" aria-pressed={source === "ornek"} onClick={() => chooseSource("ornek")}>Örnek senaryo</button>
        </div>
        {source === "claude"
          ? <p className="preview-note">Deklanşöre bastığında fotoğrafın Claude’a sorulur; ilk seferde izin istenir. Bu yalnız önizlemeye özgüdür: canlı sitede sağlayıcı ayrı ayarlanır ve adaylar GBIF ile eşleştirilir.</p>
          : <><label className="preview-field" htmlFor="senaryo">Senaryo<select id="senaryo" value={scenario} onChange={event => chooseScenario(event.currentTarget.value as ScenarioId)}>{scenarios.map(item => <option key={item.id} value={item.id}>{item.name}</option>)}</select></label>
            <p className="preview-note">Örnek yanıtlar sabittir; çektiğin fotoğraf incelenmez. {live === false && "Bu görünümde Claude ile gerçek tanıma kullanılamıyor."}{live === null && "Gerçek tanıma denetleniyor…"}</p></>}
        <label className="preview-check" htmlFor="ornek-kare"><input id="ornek-kare" type="checkbox" checked={backdrop} onChange={event => setBackdrop(event.currentTarget.checked)}/><span>Kamera açılmadığında yerleşimi örnek kareyle göster <small>Canlı görüntü değildir; yalnız ölçüleri karşılaştırmak içindir.</small></span></label>
      </section>
      <section aria-labelledby="taslak-baslik">
        <h2 id="taslak-baslik">Bu cihazdaki taslaklar</h2>
        {saved.length === 0 ? <p className="preview-note">Henüz taslak yok. Lens’te “gözleme ekle” dediğinde burada görünür.</p> : <ul className="preview-drafts">{saved.map(draft => <li key={draft.id}>
          <div className="preview-draft-photos">{draft.photos.map((photo, index) => <Thumb key={index} photo={photo} alt={`${index + 1}. kare`}/>)}</div>
          <div><strong>{draft.species || "Tür seçilmedi"}</strong>{draft.species && <span className="preview-tag">Tür önerisi</span>}<p>{draft.photos.length} fotoğraf · {day(draft.at)}</p>{draft.note && <p className="preview-draft-note">{draft.note}</p>}</div>
          <button type="button" onClick={() => void drafts("delete", draft.id).then(setSaved)} aria-label="Taslağı sil">Sil</button>
        </li>)}</ul>}
      </section>
      <section aria-labelledby="sinir-baslik">
        <h2 id="sinir-baslik">Bu önizlemede ne gerçek?</h2>
        <dl className="preview-facts">
          <div><dt>Gerçek</dt><dd>Arayüz kodu çalışma dalındakiyle aynı bileşenlerdir. Fotoğraf çekme ve seçme, kadraj, “Neden bu tür?” kartı, ikinci kare ve taslak kaydı çalışır.</dd></div>
          <div><dt>Önizlemeye özgü</dt><dd>Tanıma Claude ile yapılır ya da örnek veriden gelir. GBIF eşleşmesi, tür künyesi, giriş ve yayımlama yoktur. Hazırla’da yalnız kontrast, gölge ve dikey kadraj hazır önerileri cihazda uygulanır.</dd></div>
          <div><dt>Bağlı değil</dt><dd>Canlı Sor’un sesli akışı, sesli soru ve Hazırla’nın serbest istekleri.</dd></div>
          <div><dt>Kamera</dt><dd>Canlı vizör, sayfa kendi HTTPS adresinde açıldığında ve kamera izni verildiğinde çalışır. Açılamadığında deklanşör telefonun kendi kamerasını açar.</dd></div>
        </dl>
      </section>
    </main>
    <AddMenu dialog={lens} autoStart language="tr" admin={false} authenticated owner="onizleme" captureControl={control} standaloneUrl=""
      onClose={() => {}} onPhotos={files => compose({ files })} onWrite={notHere("Yazılı gözlem")} onIdentify={notHere("Elle tür seçimi")}
      onDrafts={() => { lens.current?.close(); document.getElementById("taslak-baslik")?.scrollIntoView({ block: "start" }); }}
      onCapture={async (files, candidate) => { compose({ files, candidate }); return true; }}
      onTaxon={notHere("Tür künyesi")} onConnect={notHere("Bağlantı ayarı")} onSignIn={notHere("Giriş")}/>
    <dialog ref={composer} className="preview-composer" aria-labelledby="taslak-form-baslik" onClose={() => setPending(null)}>
      {pending && <form onSubmit={event => { event.preventDefault(); void save(); }}>
        <h2 id="taslak-form-baslik">Gözlem taslağı</h2>
        <div className="preview-draft-photos" data-large="true">{pending.files.map((file, index) => <Thumb key={index} photo={file} alt={`${index + 1}. kare`}/>)}</div>
        <p className="preview-species">{pending.candidate ? <><strong>{pending.candidate.commonName || pending.candidate.scientificName}</strong>{pending.candidate.commonName && <i>{pending.candidate.scientificName}</i>}<span className="preview-tag">Tür önerisi · doğrulanmadı</span></> : <strong>Tür seçilmedi</strong>}</p>
        <label className="preview-field" htmlFor="taslak-not">Saha notu<textarea id="taslak-not" rows={3} maxLength={600} value={note} onChange={event => setNote(event.currentTarget.value)} placeholder="Nerede, nasıl bir ortamda gördün?"/></label>
        <p className="preview-note">Konum eklenmedi. Taslak yalnız bu cihazda saklanır ve yayımlanmaz.</p>
        <div className="preview-actions"><button type="button" onClick={() => composer.current?.close()}>Vazgeç</button><button type="submit" className="preview-primary">Taslağı kaydet</button></div>
      </form>}
    </dialog>
    <p ref={toastBox} className="preview-toast" role="status" popover="manual">{toast}</p>
  </div>;
}

installPreviewService();
createRoot(document.getElementById("orman-lens")!).render(<Preview/>);
