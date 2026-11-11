"use client";
import SearchSelect from "./search-select";
import { useEffect, useLayoutEffect, useRef, useState } from "react";
import type { Language } from "./i18n";
import type { FloraRecord, FloraResponse } from "./tubives-types";
import type { Plant } from "./plant-data";
import { catalogApiParams, emptyCatalog, type CatalogState } from "./catalog-state";
import { useDialogScrollLock } from "./use-dialog-scroll-lock";
import { siteRouteUrl } from "./navigation";
import { dialogEntry, withoutDialogEntry } from "./dialog-history";
import ProvincePicker from "./province-picker";
import FloraTools from "./flora-tools";
import { Icon } from "./icons";
export const floraValue = (value: string | undefined, language: Language) => !value || /^(bilinmiyor|\?|[-\s]*1--1)$/i.test(value.trim()) ? (language === "en" ? "Not supplied" : "Belirtilmemiş") : value;
const cache = new Map<string, { data: FloraResponse; at: number }>();
const panelMemory={filters:false,tools:false};
function cached(key: string) { const entry = cache.get(key); return entry && Date.now() - entry.at < 300000 ? entry.data : null; }
type Props = { language: Language; onOpen: (id: number) => void; onMap: (name: string) => void; onCreate: (id: number) => void; plants: Plant[]; state: CatalogState; onChange: (value: CatalogState) => void };
export default function TubiCatalog({ language, onOpen, onMap, onCreate, plants, state, onChange }: Props) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const params = catalogApiParams(state), queryString = params.toString();
  const [data, setData] = useState<FloraResponse | null>(() => cached(queryString));
  const [busy, setBusy] = useState(!cached(queryString)), [failed, setFailed] = useState(false), [retry, setRetry] = useState(0);
  const [preview, setPreview] = useState<FloraRecord | null>(null);
  const [filtersOpen,setFiltersOpen]=useState(()=>panelMemory.filters),[toolsOpen,setToolsOpen]=useState(()=>panelMemory.tools);
  const previewDialog = useRef<HTMLDialogElement>(null), results = useRef<HTMLDivElement>(null), previousPage = useRef(state.offset), immediate = useRef(false), previousQuery = useRef(state.q);
  useDialogScrollLock(previewDialog);
  const number = (n: number) => n.toLocaleString(language === "en" ? "en-GB" : "tr-TR");
  const rank = (row: FloraRecord) => row.rank === "variety" ? t("Varyete", "Variety") : row.rank === "subspecies" ? t("Alt tür", "Subspecies") : t("Tür", "Species");
  const update = (patch: Partial<CatalogState>, resetPage = true) => {
    // A filter chosen in a dismissed summary replaces its temporary modal entry.
    if(!document.querySelector("dialog[open]")&&dialogEntry(window.history.state))window.history.replaceState(withoutDialogEntry(window.history.state),"",window.location.href);
    onChange({ ...state, ...patch, ...(resetPage ? { offset: 0 } : {}) });
  };
  const reset = () => onChange({ ...emptyCatalog, layout: state.layout, sort: state.sort });
  const openRecord = (row: FloraRecord) => { previewDialog.current?.close(); onOpen(row.id); };
  const showPreview = (row: FloraRecord) => { setPreview(row); };
  // Commit the selected record before opening the native dialog: its title,
  // content and initial focus target must already exist on the first tap.
  useLayoutEffect(() => {
    const dialog = previewDialog.current;
    if (preview && dialog && !dialog.open) dialog.showModal();
  }, [preview]);
  useEffect(() => {
    // Typing may debounce; opening a page, choosing a filter or paging responds now.
    const delay = !immediate.current && previousQuery.current !== state.q ? 180 : 0;
    previousQuery.current = state.q; immediate.current = false;
    const cachedData = cached(queryString); setFailed(false);
    if (cachedData && !retry) { setData(cachedData); setBusy(false); return; }
    const controller = new AbortController(); setBusy(true);
    const timer = window.setTimeout(() => {
      fetch(`/api/flora?${queryString}`, { signal: controller.signal }).then(async response => {
        if (!response.ok) throw new Error(); return response.json() as Promise<FloraResponse>;
      }).then(result => {
        if (controller.signal.aborted) return;
        if (result.total > 0 && state.offset >= result.total) { update({ offset: Math.floor((result.total - 1) / 48) * 48 }, false); return; }
        if (cache.size >= 12) cache.delete(cache.keys().next().value!);
        cache.set(queryString, { data: result, at: Date.now() }); setData(result); setBusy(false);
      }).catch(() => { if (!controller.signal.aborted) { setFailed(true); setBusy(false); } });
    }, delay);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [queryString, retry]);
  useEffect(() => {
    if (!busy && !failed && previousPage.current !== state.offset) { results.current?.scrollIntoView({ block: "start", behavior: "instant" }); previousPage.current = state.offset; }
  }, [busy, failed, state.offset]);
  const filters: { label: string; clear: () => void }[] = [];
  if (state.q) filters.push({ label: `${t("Arama", "Search")}: ${state.q}`, clear: () => update({ q: "" }) });
  for (const [key, label] of [["family", t("Familya", "Family")], ["genus", t("Cins", "Genus")], ["province", t("İl", "Province")], ["grid", "Grid"], ["life", t("Yaşam", "Life")], ["form", t("Büyüme şekli", "Growth form")]] as const) if (state[key]) filters.push({ label: `${label}: ${state[key]}`, clear: () => update({ [key]: "", ...(key === "family" ? { genus: "" } : {}) }) });
  state.provinces.forEach(province => filters.push({ label: province, clear: () => update({ provinces: state.provinces.filter(value => value !== province) }) }));
  if (state.endemic) filters.push({ label: t("Endemik", "Endemic"), clear: () => update({ endemic: false }) });
  if (state.rank) filters.push({ label: rank({ rank: state.rank } as FloraRecord), clear: () => update({ rank: "" }) });
  const fields = (key: "family" | "genus" | "province" | "grid" | "life" | "form", label: string) => <label className="catalog-select">{label}<SearchSelect value={state[key]} onChange={event => update({ [key]: event.target.value, ...(key === "family" ? { genus: "" } : {}), ...(key === "province" ? { provinces: [] } : {}) })}><option value="">{t("Tümü", "All")}</option>{data?.facets[key]?.map(value => <option key={value} value={value}>{value}</option>)}</SearchSelect></label>;
  const pageCount = Math.ceil((data?.total || 0) / 48), currentPage = Math.floor(state.offset / 48) + 1;
  const recordLink = (row: FloraRecord) => <a href={siteRouteUrl(new URL("https://site.local/"), { view: "flora-record", flora: row.id, from: "database", catalogState: state, catalog: "flora" }).search} className="catalog-record-name" onClick={event => { if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); openRecord(row); } }}><strong data-user-content><i>{row.name}</i></strong><span className="catalog-turkish-name" data-user-content>{row.commonName || t("Türkçe ad kaynakta yok", "No sourced Turkish name")}</span><span>{row.family} <b>·</b> {rank(row)}</span></a>;
  return <section className="tubi-catalog content-panel catalog-workbench" aria-label={t("Bitki veri tabanı", "Plant database")}>
    <div className="catalog-masthead"><div><span className="eyebrow">{t("TÜRKİYE FLORASI", "FLORA OF TÜRKİYE")}</span><h2>{t("Aradığın bitkiyi bul.", "Find your plant.")}</h2></div><p>{data ? number(data.metadata.importedTaxa) : "10.478"} <span>{t("takson", "taxa")}</span><b> / </b>{data ? number(data.metadata.families) : "174"} <span>{t("familya", "families")}</span></p></div>
    <div className="catalog-search-surface"><form className="catalog-search" role="search" onSubmit={event => { event.preventDefault(); immediate.current = true; setRetry(value => value + 1); (event.currentTarget.elements.namedItem("catalog-query") as HTMLInputElement)?.blur(); }}><Icon name="search"/><input name="catalog-query" value={state.q} onChange={event => update({ q: event.target.value })} placeholder={t("Türkçe ad, bilimsel ad, familya veya il…", "Common name, scientific name, family or province…")} aria-label={t("Bitki arşivinde ara", "Search the plant archive")} autoComplete="off" enterKeyHint="search"/>{state.q && <button type="button" className="catalog-clear-query" onClick={() => update({ q: "" })} aria-label={t("Aramayı temizle", "Clear search")}><Icon name="close" /></button>}<button type="submit" className="solid-action">{t("Ara", "Search")}</button></form>
      <div className="catalog-mobile-controls"><button type="button" aria-expanded={filtersOpen} aria-controls="flora-filter-panel" onClick={()=>{panelMemory.filters=!filtersOpen;setFiltersOpen(panelMemory.filters);}}><Icon name="filter"/>{t("Filtreler", "Filters")}{filters.length>0&&<span>{filters.length}</span>}</button><button type="button" aria-expanded={toolsOpen} aria-controls="flora-tool-panel" onClick={()=>{panelMemory.tools=!toolsOpen;setToolsOpen(panelMemory.tools);}}><Icon name="menu"/>{t("Araçlar", "Tools")}</button></div>
      <div id="flora-tool-panel" className={`catalog-tool-panel ${toolsOpen?"is-open":""}`}><FloraTools language={language} onFilter={patch=>update(patch)} onOpen={onOpen}/></div>
      <div id="flora-filter-panel" className={`catalog-filter-panel ${filtersOpen?"is-open":""}`}><div className="catalog-primary-filters">{fields("family", t("Familya", "Family"))}{fields("province", t("İl", "Province"))}<button className={`catalog-endemic ${state.endemic ? "active" : ""}`} aria-pressed={state.endemic} onClick={() => update({ endemic: !state.endemic })}><Icon name="leaf" />{t("Endemikler", "Endemic taxa")}</button><details className="catalog-advanced"><summary><Icon name="filter" />{t("Diğer filtreler", "More filters")}</summary><div>{fields("genus", t("Cins", "Genus"))}{fields("grid", "Davis grid")}<label className="catalog-select">{t("Takson düzeyi", "Taxon rank")}<SearchSelect value={state.rank} onChange={event => update({ rank: event.target.value })}><option value="">{t("Tümü", "All")}</option>{["species", "subspecies", "variety"].map(value => <option key={value} value={value}>{rank({ rank: value } as FloraRecord)}</option>)}</SearchSelect></label>{fields("life", t("Yaşam süresi", "Life cycle"))}{fields("form", t("Büyüme şekli", "Growth form"))}</div></details></div>
      <ProvincePicker language={language} provinces={data?.facets.province || []} selected={state.provinces} onChange={provinces => update({ provinces, province: "" })}/>
      </div>
    </div>
    {filters.length > 0 && <div className="catalog-active-filters" aria-label={t("Seçili filtreler", "Active filters")}>{filters.map(filter => <button key={filter.label} onClick={filter.clear} aria-label={`${t("Filtreyi kaldır", "Remove filter")}: ${filter.label}`}><span>{filter.label}</span><Icon name="close" /></button>)}<button className="catalog-reset" onClick={reset}>{t("Tümünü temizle", "Clear all")}</button></div>}
    <div className={`catalog-result-toolbar ${toolsOpen?"tools-open":""}`} ref={results}><strong aria-live="polite">{busy ? t("Aranıyor…", "Searching…") : failed ? t("Katalog yüklenemedi", "Catalogue unavailable") : `${number(data?.total || 0)} ${t("sonuç", "results")}`}</strong><div><label><span className="sr-only">{t("Sırala", "Sort")}</span><SearchSelect value={state.sort} onChange={event => update({ sort: event.target.value as CatalogState["sort"] })}><option value="scientific">{t("Bilimsel ada göre", "Scientific name")}</option><option value="common">{t("Türkçe ada göre", "Common name")}</option><option value="family">{t("Familyaya göre", "Family")}</option></SearchSelect></label><div className="catalog-layout-switch" aria-label={t("Görünüm", "View")}><button aria-pressed={state.layout === "list"} onClick={() => update({ layout: "list" }, false)} aria-label={t("Liste görünümü", "List view")}><Icon name="menu"/></button><button aria-pressed={state.layout === "cards"} onClick={() => update({ layout: "cards" }, false)} aria-label={t("Kart görünümü", "Card view")}><Icon name="grid"/></button></div><a className="catalog-export" href={`/api/flora?${queryString}&format=csv`} download="orman-muhendisi-flora.csv">{t("CSV indir", "Download CSV")}</a></div></div>
    <div className={`catalog-results ${state.layout}`} aria-busy={busy}>
      {failed ? <div className="catalog-empty"><Icon name="grid"/><h3>{t("Kataloğa ulaşılamadı.", "The catalogue is unavailable.")}</h3><button className="solid-action" onClick={() => setRetry(value => value + 1)}>{t("Tekrar dene", "Retry")}</button></div> : busy ? <div className="catalog-skeleton" role="status"><span className="sr-only">{t("Bitki kayıtları yükleniyor…", "Loading plant records…")}</span>{Array.from({ length: 6 }, (_, i) => <div key={i}><span/><span/><span/></div>)}</div> : !data?.records.length ? <div className="catalog-empty"><Icon name="search"/><h3>{t("Bu seçimde kayıt bulunamadı.", "No records match this selection.")}</h3><p>{t("Bir filtreyi kaldır veya bitkinin adını daha kısa yaz.", "Remove a filter or use a shorter plant name.")}</p>{filters.length > 0 && <button className="solid-action" onClick={reset}>{t("Filtreleri temizle", "Clear filters")}</button>}</div> : <>{state.layout === "list" && <div className="catalog-list-heading"><span>{t("Bitki / familya", "Plant / family")}</span><span>{t("İl / grid", "Province / grid")}</span><span>{t("Rakım", "Elevation")}</span><span>{t("İşlemler", "Actions")}</span></div>}{data.records.map(row => {
        const photo = plants.find(plant => plant.latin === row.name);
        return <article className="catalog-record" key={row.id}>
          <div className="catalog-record-main">{photo?.image && <img src={photo.image} alt="" loading="lazy"/>}{recordLink(row)}{row.endemism.toLocaleLowerCase("tr") === "endemik" && <span className="catalog-endemic-badge">{t("Endemik", "Endemic")}</span>}</div>
          <div className="catalog-record-location"><Icon name="pin"/><span>{row.provinces.slice(0,2).join(", ") || t("İl kaydı yok", "No province record")}{row.provinces.length > 2 && ` +${row.provinces.length - 2}`}<small>{row.grids.join(" · ") || t("Grid belirtilmemiş", "Grid not supplied")}</small></span></div>
          <div className="catalog-record-elevation"><small>{t("Rakım", "Elevation")}</small><span>{floraValue(row.elevation, language)}{row.elevation && !/bilinmiyor|\?/i.test(row.elevation) ? " m" : ""}</span></div>
          <div className="catalog-record-actions"><button onClick={() => showPreview(row)} aria-label={`${row.commonName || row.name} · ${t("Hızlı özet", "Quick summary")}`}>{t("Özet", "Summary")}</button><button onClick={() => onMap(row.name)} aria-label={`${row.name} · ${t("Haritada gör", "View on map")}`}><Icon name="pin"/><span>{t("Harita", "Map")}</span></button></div>
          {state.layout === "cards" && <p className="catalog-record-habitat" data-user-content>{floraValue(row.habitat, language)}</p>}
        </article>;
      })}</>}
    </div>
    {!busy && !failed && Boolean(data?.total) && <nav className="catalog-pagination" aria-label={t("Sonuç sayfaları", "Result pages")}><button disabled={state.offset === 0} onClick={() => update({ offset: Math.max(0, state.offset - 48) }, false)}>{t("Önceki", "Previous")}</button><label><span>{t("Sayfa", "Page")}</span><SearchSelect aria-label={t("Sayfa seç", "Select page")} value={currentPage} onChange={event => update({ offset: (Number(event.target.value) - 1) * 48 }, false)}>{Array.from({ length: pageCount }, (_, i) => <option key={i} value={i + 1}>{i + 1} / {pageCount}</option>)}</SearchSelect></label><span>{number(state.offset + 1)}–{number(Math.min(state.offset + 48, data!.total))} / {number(data!.total)}</span><button disabled={state.offset + 48 >= data!.total} onClick={() => update({ offset: state.offset + 48 }, false)}>{t("Sonraki", "Next")}</button></nav>}
    <details className="flora-source-details"><summary>{t("Katalog ve kaynak hakkında", "About the catalogue and source")}</summary><p>{t("Tür, alt tür ve varyeteler ayrı kayıtlardır. Kaynakta bulunmayan bilgiler tamamlanmaz. İl ve grid kayıtları kesin gözlem koordinatları değildir. Tür adlarının kaynağı her künyede bulunur.", "Species, subspecies and varieties remain separate records. Missing source information is not filled in. Province and grid records are not exact observation coordinates. Each profile cites its name source.")}</p>{data && <p>{t("Aktarım tarihi", "Imported")}: {new Date(data.metadata.importedAt).toLocaleDateString(language === "en" ? "en-GB" : "tr-TR")}</p>}</details>
    <dialog className="catalog-preview" ref={previewDialog} aria-labelledby="catalog-preview-title" onClose={() => setPreview(null)} onClick={event => { if (event.target === event.currentTarget) previewDialog.current?.close(); }}>
      {preview && <><div className="dialog-title"><div><span className="eyebrow">{t("HIZLI ÖZET", "QUICK SUMMARY")}</span><h2 id="catalog-preview-title" data-user-content><i>{preview.name}</i></h2><p className="catalog-turkish-name" data-user-content>{preview.commonName || t("Türkçe ad kaynakta yok", "No sourced Turkish name")}</p></div><button onClick={() => previewDialog.current?.close()} aria-label={t("Kapat", "Close")} autoFocus><Icon name="close"/></button></div><div className="catalog-preview-tags"><button onClick={() => { previewDialog.current?.close(); update({ family: preview.family, genus: "" }); }}>{preview.family}</button><button onClick={() => { previewDialog.current?.close(); update({ family: preview.family, genus: preview.genus }); }}>{preview.genus}</button><span>{rank(preview)}</span></div><dl>{[[t("Habitat", "Habitat"), preview.habitat], [t("Rakım", "Elevation"), preview.elevation], [t("Yaşam süresi", "Life cycle"), preview.life], [t("Çiçeklenme", "Flowering"), preview.flowering], [t("Endemizm", "Endemism"), preview.endemism]].map(([label, value]) => <div key={label}><dt>{label}</dt><dd data-user-content>{floraValue(value, language)}</dd></div>)}</dl><h3>{t("Kayıtlı iller", "Recorded provinces")}</h3><div className="catalog-preview-provinces">{preview.provinces.length ? preview.provinces.map(province => <button key={province} onClick={() => { previewDialog.current?.close(); update({ province, provinces: [] }); }}>{province}</button>) : <p>{t("Belirtilmemiş", "Not supplied")}</p>}</div><div className="catalog-preview-actions"><button className="solid-action" onClick={() => openRecord(preview)}>{t("Tür künyesini aç", "Open species profile")}</button><button onClick={() => { previewDialog.current?.close(); onMap(preview.name); }}><Icon name="pin"/>{t("Haritada gör", "View on map")}</button><button onClick={() => { previewDialog.current?.close(); onCreate(preview.id); }}><Icon name="camera"/>{t("Gözlem ekle", "Add observation")}</button></div><a className="catalog-preview-source" href={preview.source} target="_blank" rel="noreferrer">{t("Özgün kaynak kaydı", "Original source record")}</a></>}
    </dialog>
  </section>;
}
