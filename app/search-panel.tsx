"use client";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { type Language, translate } from "./i18n";
import type { FloraRecord } from "./tubives-types";
import type { Plant } from "./plant-data";
import { Icon } from "./icons";
import {lifeRankLabel,type LifeTaxon,type LifeQuery} from "./life-types";
import ResponsivePhoto from "./responsive-photo";
const normalize = (value: string) => value.toLocaleLowerCase("tr").replace(/ı/g, "i").normalize("NFD").replace(/[\u0300-\u036f]/g, "");
type Props = { query: string; onQuery: (q: string) => void; language: Language; plants: Plant[]; onOpenFlora: (id: number) => void; onOpenPlant: (id: string) => void; onOpenGlobal: (name: string) => void; onOpenTreeTaxon?:(selection:import("./taxonomy-types").TaxonomySelection)=>void; onOpenTaxon?: (id:string)=>void; onBirds?:(q:string)=>void;onNature?:(q:string)=>void;onFungi?:(q:string)=>void;onSubmitQuery?: (q: string) => void };
export function SearchPanel({ query, onQuery, language, plants, onOpenPlant, onOpenFlora, onOpenGlobal, onOpenTaxon, onOpenTreeTaxon, onSubmitQuery, onNature,onFungi,onBirds }: Props) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const listId = useId();
  const allGroups=Boolean(onOpenTaxon);
  const input=useRef<HTMLInputElement>(null);
  const [remote, setRemote] = useState<{ name: string; family?: string }[]>([]), [flora, setFlora] = useState<FloraRecord[]>([]);
  const [treeTaxa,setTreeTaxa]=useState<import("./taxonomy-types").TaxonomyNode[]>([]);
  const [taxa,setTaxa]=useState<LifeTaxon[]>([]);
  const [busy, setBusy] = useState(false), [failed, setFailed] = useState(false), [focused, setFocused] = useState(false), [activeKey,setActiveKey]=useState<string|null>(null);
  const indexedPlants = useMemo(() => plants.map(plant => ({ plant, text: normalize(`${plant.name} ${translate(plant.name, "en")} ${plant.latin} ${plant.genus} ${plant.family}`) })), [plants]);
  const term = normalize(query.trim());
  const local = term ? indexedPlants.filter(item => item.text.includes(term)).slice(0, 3).map(item => item.plant) : [];
  useEffect(() => {
    const controller = new AbortController(); setRemote([]); setFlora([]); setTaxa([]); setTreeTaxa([]); setFailed(false); setActiveKey(null);
    if (!focused || query.trim().length < 2) { setBusy(false); return; }
    setBusy(true);
    const timer = setTimeout(async () => {
      const q=encodeURIComponent(query.trim());
      const read=async<T,>(url:string)=>{const response=await fetch(url,{signal:controller.signal});if(!response.ok)throw new Error();return response.json() as Promise<T>;};
      const publish=<T,>(promise:Promise<T>,apply:(value:T)=>void)=>promise.then(value=>{if(!controller.signal.aborted)apply(value);}).catch(()=>{if(!controller.signal.aborted)setFailed(true);});
      const updateTaxa=(data:LifeQuery)=>setTaxa(previous=>[...new Map([...data.records,...previous].map(record=>[record.id,record])).values()]);
      // Local matches appear immediately; a slow external source cannot hold them back.
      const requests=[publish(read<{records:FloraRecord[]}>(`/api/flora?q=${q}&limit=5`),data=>setFlora(data.records))];
      if(onOpenTaxon){requests.push(publish(read<LifeQuery>(`/api/life?mode=search&scope=archive&q=${q}`),updateTaxa),publish(read<LifeQuery>(`/api/life?mode=search&q=${q}`),updateTaxa));}
      else requests.push(publish(read<{results:{name:string;family?:string}[]}>(`/api/taxa?q=${q}`),data=>setRemote(data.results)));
      if(onOpenTreeTaxon)requests.push(publish(read<import("./taxonomy-types").TaxonomyPage>(`/api/taxonomy?mode=search&source=col&q=${q}`),data=>setTreeTaxa(data.records)));
      await Promise.allSettled(requests);
      if (controller.signal.aborted) return;
      setBusy(false);
    }, 180);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [query,allGroups,focused]);
  const names = new Set(local.map(p => p.latin));
  const suggestions = [
    ...local.map(p => ({ key: p.id, title: p.latin, subtitle: translate(p.name, language), source: t("Fotoğraflı künye", "Photo profile"), image: p.image, open: () => onOpenPlant(p.id) })),
    ...flora.filter(r => !names.has(r.name)).map(r => ({ key: `flora-${r.id}`, title: r.name, subtitle: r.commonName || t("Türkçe ad kaynakta yok", "No sourced Turkish name"), source: t("Flora arşivi", "Flora archive"), image: undefined, open: () => onOpenFlora(r.id) })),
    ...treeTaxa.slice(0,6).map(r=>({key:r.key,title:r.name,subtitle:r.turkishName||r.kingdom||"",source:`Catalogue of Life · ${lifeRankLabel(r.rank,language)}`,image:undefined,open:()=>onOpenTreeTaxon?.(r)})),
    ...taxa.filter(r=>!names.has(r.scientificName)).slice(0,6).map(r=>({key:r.id,title:r.scientificName,subtitle:(language==="tr"?r.turkishName:r.commonName)||r.kingdom||"",source:lifeRankLabel(r.rank,language),image:undefined,open:()=>onOpenTaxon?.(r.id)})),
    ...remote.filter(r => !names.has(r.name) && !flora.some(f => f.name === r.name)).slice(0, 3).map(r => ({ key: `gbif-${r.name}`, title: r.name, subtitle: r.family, source: t("Küresel tür kaydı", "Global taxon record"), image: undefined, open: () => onOpenGlobal(r.name) }))
  ];
  const active=suggestions.findIndex(item=>item.key===activeKey);
  useEffect(()=>{if(active>=0)document.getElementById(`${listId}-${active}`)?.scrollIntoView({block:"nearest"});},[active,listId]);
  const expanded = focused && Boolean(query.trim());
  const open = (index: number) => { setFocused(false); setActiveKey(null); suggestions[index]?.open(); };
  const submit = () => { if (onSubmitQuery) { if (!query.trim()) { input.current?.focus(); return; } setFocused(false); onSubmitQuery(query.trim()); } else if (active >= 0 && expanded) open(active); else if (suggestions.length) open(0); };
  return <div className="universal-search" onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget as Node | null)) { setFocused(false); setActiveKey(null); } }}>
    <form onSubmit={event => { event.preventDefault(); submit(); }}><Icon name="search"/><input ref={input} type="search" autoComplete="off" autoCorrect="off" spellCheck={false} enterKeyHint="search" role="combobox" aria-autocomplete="list" aria-expanded={expanded} aria-controls={expanded ? listId : undefined} aria-activedescendant={expanded && active >= 0 ? `${listId}-${active}` : undefined} value={query} onChange={event => { onQuery(event.target.value); setFocused(true); setActiveKey(null); }} onFocus={() => setFocused(true)} onKeyDown={event => {
      if (event.nativeEvent.isComposing) return;
      if (event.key === "Enter" && expanded && active >= 0) { event.preventDefault(); open(active); }
      else if (event.key === "Escape" && expanded) { event.preventDefault(); event.stopPropagation(); setFocused(false); setActiveKey(null); }
      else if (["ArrowDown", "ArrowUp"].includes(event.key) && suggestions.length) { event.preventDefault(); setFocused(true); const next=active<0?(event.key==="ArrowDown"?0:suggestions.length-1):(active+(event.key==="ArrowDown"?1:-1)+suggestions.length)%suggestions.length;setActiveKey(suggestions[next].key); }
    }} placeholder={allGroups?t("Tür veya grup ara…","Species or group…"):t("Bitki, bilimsel ad, familya veya il ara…", "Search plants, scientific names, families or provinces…")} aria-label={allGroups?t("Canlılar dünyasında ara","Search the living world"):t("Tüm bitkilerde ara", "Search all plants")}/>{query && <button type="button" aria-label={t("Aramayı temizle", "Clear search")} onClick={() => { onQuery(""); setActiveKey(null); input.current?.focus(); }}><Icon name="close"/></button>}<button className="search-submit" type="submit">{t("Ara", "Search")}</button></form>
    {expanded && <div className="search-suggestions"><div className="suggestions-title">{t("Doğrudan aç", "Open directly")}<button type="button" onClick={() => setFocused(false)} aria-label={t("Önerileri kapat", "Close suggestions")}><Icon name="close"/></button></div><div id={listId} role="listbox" aria-label={t("Arama önerileri", "Search suggestions")}>{suggestions.map((item, index) => <button type="button" role="option" aria-selected={active === index} id={`${listId}-${index}`} className={`search-suggestion ${active === index ? "active" : ""}`} key={item.key} onClick={() => open(index)}>{item.image ? <ResponsivePhoto src={item.image} alt="" sizes="40px"/> : <span className="search-gbif-icon"><Icon name="grid"/></span>}<span><strong data-user-content>{item.title}</strong><em data-user-content>{item.subtitle}</em></span><small>{item.source}</small></button>)}</div>{busy && <p role="status">{t("Kayıtlar aranıyor…", "Searching records…")}</p>}{!busy && !suggestions.length && <p>{query.trim().length < 2 ? t("Öneriler için en az iki harf yazın.", "Type at least two characters for suggestions.") : t("Eşleşen kayıt bulunamadı.", "No matching records found.")}</p>}{failed && <p>{t("Bazı kaynaklara ulaşılamadı. Veri tabanında aramaya devam edebilirsiniz.", "Some sources are unavailable. You can continue searching the database.")}</p>}{onNature&&<button type="button" className="search-all-results" onClick={()=>{setFocused(false);onNature(query.trim());}}>{t("Doğa gözlemlerinde ara","Search nature observations")}</button>}{onBirds&&<button type="button" className="search-all-results" onClick={()=>{setFocused(false);onBirds(query.trim());}}>{t("Kuşlarda ara","Search birds")}</button>}{onFungi&&<button type="button" className="search-all-results" onClick={()=>{setFocused(false);onFungi(query.trim());}}>{t("Mantarlarda ara","Search fungi")}</button>}{onSubmitQuery && <button type="button" className="search-all-results" onClick={() => { setFocused(false); onSubmitQuery(query.trim()); }}>{t("Tüm sonuçları göster", "Show all results")} <span>→</span></button>}</div>}
  </div>;
}
