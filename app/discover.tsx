"use client";
import SearchSelect from "./search-select";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Icon } from "./icons";
import { SearchPanel } from "./search-panel";
import { translate, type Language } from "./i18n";
import type { Plant } from "./plant-data";
import type { FeedRecord } from "./feed-data";

type Props = {
  onTaxonomy?:()=>void; language: Language; plants: Plant[]; query: string; onQuery: (value: string) => void;
  saved: string[]; onToggle: (kind: "saved", id: string) => Promise<boolean>;
  onFlora: (id: number) => void; onPlant: (id: string) => void; onGlobal: (name: string) => void;
  onNavigate: (view: "map" | "identify" | "flora" | "care" | "database" | "library") => void;
};
type Batch = { records: FeedRecord[]; nextOffset: number; hasMore: boolean };
const normalize = (value: string) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");

export default function Discover({ onTaxonomy, language, plants, query, onQuery, saved, onToggle, onPlant, onFlora, onGlobal, onNavigate }: Props) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const [mode, setMode] = useState<"photos" | "species">("photos");
  const [scope, setScope] = useState("TR");
  const [species, setSpecies] = useState("");
  const [category, setCategory] = useState("");
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [cursor, setCursor] = useState(0);
  const [hasMore, setHasMore] = useState(true);
  const [busy, setBusy] = useState(false);
  const [failed, setFailed] = useState(false);
  const [focused, setFocused] = useState<FeedRecord | null>(null);
  const [photoIndex, setPhotoIndex] = useState(0);
  const [saving, setSaving] = useState(false);
  const [notice, setNotice] = useState("");
  const controller = useRef<AbortController | null>(null);
  const dialog = useRef<HTMLDialogElement>(null);
  const load = useCallback(async (offset: number, replace: boolean) => {
    controller.current?.abort();
    const abort = new AbortController(); controller.current = abort;
    setBusy(true); setFailed(false);
    if (replace) { setRecords([]); setCursor(0); setHasMore(true); }
    try {
      let batch: Batch; let next = offset;
      // Some source pages contain only restricted photographs. Advance without repeating them.
      for (let attempt = 0; ; attempt++) {
        const params = new URLSearchParams({ scope, offset: String(next) });
        if (species) params.set("name", species);
        const response = await fetch(`/api/feed?${params}`, { signal: abort.signal });
        if (!response.ok) throw new Error();
        batch = await response.json() as Batch;
        next = batch.nextOffset;
        if (batch.records.length || !batch.hasMore || attempt >= 3) break;
      }
      if (abort.signal.aborted) return;
      setRecords(previous => { const combined = replace ? batch.records : [...previous, ...batch.records]; return [...new Map(combined.map(row => [row.id, row])).values()]; });
      setCursor(next); setHasMore(batch.hasMore);
    } catch { if (!abort.signal.aborted) setFailed(true); }
    finally { if (!abort.signal.aborted) setBusy(false); }
  }, [scope, species]);
  useEffect(() => { void load(0, true); return () => controller.current?.abort(); }, [load]);
  useEffect(() => {
    const element = dialog.current;
    if (focused && element && !element.open) element.showModal();
    if (!focused && element?.open) element.close();
  }, [focused]);
  useEffect(() => {
    if (!focused) return;
    const previous = document.body.style.overflow; document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [focused]);
  const categories = [...new Set(plants.map(plant => plant.category))];
  const matches = useMemo(() => plants.filter(plant => (query.trim() || !category || plant.category === category) && normalize(`${plant.name} ${translate(plant.name, "en")} ${plant.latin} ${plant.family} ${plant.genus}`).includes(normalize(query.trim()))), [plants, query, category]);
  const selectedPlant = plants.find(plant => plant.latin === species);
  const localTiles = selectedPlant ? [selectedPlant] : [...plants].sort((a, b) => Number(b.id === "pinus-pinea") - Number(a.id === "pinus-pinea"));
  const matchingPlant = focused ? plants.find(plant => normalize(plant.latin).startsWith(normalize(focused.name))) : undefined;
  const photo = focused?.photos[photoIndex];
  const close = () => { setFocused(null); setNotice(""); };
  const focus = (row: FeedRecord) => { setPhotoIndex(0); setNotice(""); setFocused(row); };
  const adjacent = (direction: number) => {
    if (!focused) return;
    const index = records.findIndex(record => record.id === focused.id);
    const next = records[index + direction]; if (next) focus(next);
  };
  const openFocused = () => { if (!focused) return; close(); if (matchingPlant) onPlant(matchingPlant.id); else onGlobal(focused.name); };

  return <section className="discover-workspace">
    <header className="discover-masthead"><div className="discover-title"><span>{t("BİTKİLER / GÖZLEMLER", "PLANTS / OBSERVATIONS")}</span><h1>{t("Keşfet", "Explore")}<i>.</i></h1></div>
      <div className="discover-search"><SearchPanel query={query} onQuery={onQuery} language={language} plants={plants} onOpenPlant={onPlant} onOpenFlora={onFlora} onOpenGlobal={onGlobal} /></div>
    </header>
    <div className="discover-shortcuts">
      {onTaxonomy&&<button onClick={onTaxonomy}><Icon name="tree"/><span><strong>{t("Taksonomi", "Taxonomy")}</strong><small>{t("Âlemlerden türlere", "From kingdoms to species")}</small></span></button>}
      <button onClick={() => onNavigate("map")}><Icon name="pin" /><span><strong>{t("Haritada keşfet", "Explore the map")}</strong><small>{t("Bölgeye göre gözlemler", "Observations by region")}</small></span></button>
      <button onClick={() => onNavigate("flora")}><Icon name="leaf" /><span><strong>{t("Türkiye florası", "Flora of Türkiye")}</strong><small>{t("İl, grid ve endemizm", "Province, grid & endemism")}</small></span></button>
      <button onClick={() => onNavigate("identify")}><Icon name="camera" /><span><strong>{t("Bitkini tanı", "Identify your plant")}</strong><small>{t("Fotoğraf ve tür önerileri", "Photos & species suggestions")}</small></span></button>
    </div>
    {!query.trim() && <>
      <div className="discover-toolbar"><div className="discover-tabs" aria-label={t("Keşfet görünümü", "Explore view")}>
        <button aria-pressed={mode === "photos"} onClick={() => setMode("photos")}>{t("Fotoğraflar", "Photos")}</button>
        <button aria-pressed={mode === "species"} onClick={() => setMode("species")}>{t("Türler", "Species")}</button>
      </div>{mode === "photos" ? <label className="discover-scope"><Icon name="pin" /><span className="sr-only">{t("Gözlem bölgesi", "Observation region")}</span><SearchSelect value={scope} onChange={event => setScope(event.target.value)}><option value="TR">{t("Türkiye", "Türkiye")}</option><option value="world">{t("Dünya", "Worldwide")}</option></SearchSelect></label> : <button className="discover-catalogue-link" onClick={() => onNavigate("database")}>{t("Ayrıntılı filtreler", "Detailed filters")}</button>}</div>
      <div className={`discover-chips ${mode === "photos" ? "discover-photo-topics" : ""}`} aria-label={mode === "photos" ? t("Fotoğraflarda tür seç", "Choose a species for photos") : t("Bitki kategorileri", "Plant categories")}>
        <button className="discover-all-topic" aria-pressed={mode === "photos" ? !species : !category} onClick={() => mode === "photos" ? setSpecies("") : setCategory("")}>{mode === "photos" && <Icon name="compass" />}<span>{t("Tümü", "All")}</span></button>
        {mode === "photos" ? plants.map(plant => <button key={plant.id} aria-pressed={species === plant.latin} onClick={() => setSpecies(plant.latin)}>{plant.image && <img src={plant.image} alt="" loading="lazy" />}<span>{translate(plant.name, language)}</span></button>) : categories.map(value => <button key={value} aria-pressed={category === value} onClick={() => setCategory(value)}>{translate(value, language)}</button>)}
      </div>
    </>}
    {query.trim() || mode === "species" ? <>
      <div className="discover-section-heading"><h2>{query.trim() ? t("Katalogdaki eşleşmeler", "Catalogue matches") : t("Türleri yakından tanı", "Get to know the species")}</h2><span>{matches.length} {t("tür", "species")}</span></div>
      <div className="discover-species-grid">{matches.map(plant => <button className="discover-species-card" key={plant.id} onClick={() => onPlant(plant.id)}>
        <span className="discover-species-photo">{plant.image ? <img src={plant.image} alt={translate(plant.name, language)} loading="lazy" decoding="async" /> : <Icon name="leaf" />}</span>
        <span className="discover-species-body"><small>{plant.family}</small><strong>{translate(plant.name, language)}</strong><i>{plant.latin}</i><span>{translate(plant.category, language)}</span></span><span className="discover-card-open"><Icon name="leaf" />{t("Tür künyesi", "Species profile")}</span>
      </button>)}</div>
      {!matches.length && <div className="discover-empty"><Icon name="leaf" /><h3>{t("Katalogda eşleşme bulunamadı", "No catalogue matches")}</h3><p>{t("Arama önerilerini inceleyebilir veya farklı bir ad deneyebilirsin.", "Check the search suggestions or try a different name.")}</p><button onClick={() => { onQuery(""); setCategory(""); }}>{t("Aramayı temizle", "Clear search")}</button></div>}
      <div className="discover-footer-links"><button onClick={() => onNavigate("library")}>{t("Familya ve cins dizini", "Family & genus index")}</button><button onClick={() => onNavigate("care")}>{t("Bitki bakım rehberleri", "Plant care guides")}</button></div>
    </> : <>
      <div className="discover-section-heading"><h2>{selectedPlant ? translate(selectedPlant.name, language) : t("Doğadan kareler", "Scenes from nature")}</h2><span><Icon name="camera" />{t("Tür künyeleri ve saha fotoğrafları", "Species profiles and field photos")}</span></div>
      <div className="discover-mosaic" aria-busy={busy}>
        {localTiles.filter(plant => plant.image).map((plant, index) => <button key={plant.id} className={`discover-tile catalogue-tile ${index === 0 ? "discover-featured-tile" : ""}`} onClick={() => onPlant(plant.id)} aria-label={`${translate(plant.name, language)} · ${t("Tür künyesini aç", "Open species profile")}`}>
          <span className="discover-tile-photo"><img src={plant.image} alt={translate(plant.name, language)} loading={index === 0 ? "eager" : "lazy"} decoding="async" /><span className="discover-tile-badge"><Icon name="leaf" />{plant.family}</span></span>
          <span className="discover-tile-caption"><strong>{translate(plant.name, language)}</strong><i>{plant.latin}</i>{index === 0 && <span className="discover-feature-range">{translate(plant.range, language)}</span>}<span className="discover-tile-action"><Icon name="leaf" />{t("Tür künyesi", "Species profile")}</span></span>
        </button>)}
        {records.map(row => <button key={row.id} className="discover-tile discover-observation-tile" onClick={() => focus(row)} aria-label={`${row.name} · ${row.location} · ${t("Fotoğrafı büyüt", "Enlarge photo")}`}>
          <span className="discover-tile-photo"><img src={row.photos[0].url} alt={row.name} loading="lazy" decoding="async" /><span className="discover-tile-badge">{row.photos.length > 1 ? <><Icon name="camera" />{row.photos.length}</> : t("Saha kaydı", "Field record")}</span>{saved.includes(row.id) && <span className="discover-saved-marker"><Icon name="save" /><span className="sr-only">{t("Kaydedildi", "Saved")}</span></span>}</span>
          <span className="discover-tile-caption"><strong>{row.name}</strong><span className="discover-record-place"><Icon name="pin" />{row.location || row.family}</span><span className="discover-tile-action"><Icon name="camera" />{t("Gözlemi aç", "Open observation")}</span></span>
        </button>)}
      </div>
      <div className="discover-load" aria-live="polite">
        {busy ? <span role="status"><span className="feed-spinner" />{t("Yeni fotoğraflar yükleniyor…", "Loading more photos…")}</span> : failed ? <><p>{t("Gözlemler şu anda yüklenemedi. Tür kayıtlarını incelemeye devam edebilirsin.", "Observations could not be loaded. You can still explore the species records.")}</p><button onClick={() => void load(cursor, false)}>{t("Tekrar dene", "Try again")}</button></> : hasMore ? <button onClick={() => void load(cursor, false)}>{t("Daha fazla keşfet", "Discover more")}</button> : <p>{records.length ? t("Bu seçime ait fotoğrafların sonuna ulaştın.", "You've reached the end of photos for this selection.") : t("Bu bölgede paylaşılabilir fotoğraf kaydı bulunamadı.", "No reusable photo records were found in this region.")}</p>}
      </div>
      <details className="discover-source-note"><summary>{t("Fotoğraflar hakkında", "About these photos")}</summary><p>{t("Tür kayıtları site kataloğundan, gözlem fotoğrafları GBIF’in açık lisanslı kayıtlarından gelir. Fotoğrafları açarak tarih, yer, fotoğrafçı ve lisans bilgisini görebilirsin. GBIF tür adları kaynak gözlemin tanımlamasıdır.", "Species records come from the site catalogue; observation photos come from openly licensed GBIF records. Open a photo to see its date, location, photographer and licence. GBIF species names reflect the source observation's identification.")}</p></details>
    </>}
    <dialog ref={dialog} className="discover-lightbox" aria-labelledby="discover-photo-title" onCancel={close} onClose={close} onClick={event => { if (event.target === event.currentTarget) close(); }} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); adjacent(event.key === "ArrowRight" ? 1 : -1); } }}>
      {focused && photo && <div className="discover-lightbox-layout">
        <div className="discover-lightbox-image"><img src={photo.url} alt={focused.name} /><button className="discover-lightbox-close" onClick={close} aria-label={t("Kapat", "Close")} autoFocus>×</button>
          {focused.photos.length > 1 && <div className="discover-album-controls"><button disabled={!photoIndex} onClick={() => setPhotoIndex(value => value - 1)} aria-label={t("Önceki fotoğraf", "Previous photo")}>‹</button><span>{photoIndex + 1} / {focused.photos.length}</span><button disabled={photoIndex === focused.photos.length - 1} onClick={() => setPhotoIndex(value => value + 1)} aria-label={t("Sonraki fotoğraf", "Next photo")}>›</button></div>}
        </div>
        <div className="discover-lightbox-info"><span className="discover-record-label">{t("Bitki gözlemi", "Plant observation")}</span><h2 id="discover-photo-title">{focused.name}</h2><p className="discover-photo-family">{focused.family}</p>
          {focused.location && <p className="discover-photo-location"><Icon name="pin" />{focused.location}</p>}
          {focused.date && <p>{t("Gözlem tarihi", "Observation date")}: <time>{focused.date}</time></p>}
          <button className="discover-profile-button" onClick={openFocused}>{t("Tür künyesi ve yayılış", "Species profile & distribution")}</button>
          <button className={`discover-save ${saved.includes(focused.id) ? "selected" : ""}`} disabled={saving} aria-pressed={saved.includes(focused.id)} onClick={async () => { setSaving(true); try { const ok = await onToggle("saved", focused.id); setNotice(ok ? "" : t("Kaydedilemedi. Tekrar deneyebilirsin.", "Could not save. Please try again.")); } finally { setSaving(false); } }}><Icon name="save" />{saving ? t("Kaydediliyor…", "Saving…") : saved.includes(focused.id) ? t("Kaydedildi", "Saved") : t("Fotoğrafı kaydet", "Save photo")}</button>
          {notice && <p role="status">{notice}</p>}
          <div className="discover-photo-credit"><strong>{t("Fotoğraf", "Photo")}</strong><p>{photo.credit || t("Kaynakta belirtilmemiş", "Not provided by source")}</p><a href={photo.license} target="_blank" rel="noreferrer">{t("Fotoğraf lisansı", "Photo licence")}</a>{photo.reference && <a href={photo.reference} target="_blank" rel="noreferrer">{t("Özgün gözlem kaydı", "Original observation record")}</a>}</div>
          <div className="discover-adjacent"><button disabled={records[0]?.id === focused.id} onClick={() => adjacent(-1)}>{t("Önceki gözlem", "Previous observation")}</button><button disabled={records.at(-1)?.id === focused.id} onClick={() => adjacent(1)}>{t("Sonraki gözlem", "Next observation")}</button></div>
        </div>
      </div>}
    </dialog>
  </section>;
}
