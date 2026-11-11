"use client";
import { useEffect, useId, useMemo, useState } from "react";
import SearchSelect from "./search-select";
import { isSpeciesRank, type LifeQuery, type LifePage } from "./life-types";
import type { Plant } from "./plant-data";
import type { Language } from "./i18n";
type Option = { value: string; label: string };
export default function ObservationTaxonSelect({ language, plants, value, label, onChange, offlineOnly = false, disabled = false }: {
  language: Language; plants: Plant[]; value: string; label?: string; onChange: (value: string, label: string) => void; offlineOnly?: boolean; disabled?: boolean;
}) {
  const t = (tr: string, en: string) => language === "en" ? en : tr, id = useId();
  const [query, setQuery] = useState(""), [results, setResults] = useState<Option[]>([]), [retained, setRetained] = useState<Option | null>(null);
  const [busy, setBusy] = useState(false), [unavailable, setUnavailable] = useState(false);
  useEffect(() => {
    if (!value.startsWith("gbif-") || label || offlineOnly) return;
    const controller = new AbortController();
    void fetch("/api/life?id=" + encodeURIComponent(value), { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const page = await response.json() as LifePage;
      if (page.node.id === value) setRetained({ value, label: [page.node.turkishName, page.node.scientificName].filter(Boolean).join(" · ") });
    }).catch(() => {});
    return () => controller.abort();
  }, [value, label, offlineOnly]);
  useEffect(() => {
    if (offlineOnly || query.trim().length < 2) { setBusy(false); return; }
    const controller = new AbortController();
    const options = (data: LifeQuery): Option[] => [
      ...data.records.filter(node => isSpeciesRank(node.rank) && node.status === "ACCEPTED").map(node => ({ value: node.id, label: [language === "en" ? node.commonName : node.turkishName, node.scientificName].filter(Boolean).join(" · ") })),
      ...data.flora.map(node => ({ value: "flora-" + node.id, label: [node.turkishName, node.name].filter(Boolean).join(" · ") })),
    ];
    const timer = setTimeout(async () => {
      setBusy(true); setUnavailable(false); let found: Option[] = [];
      const path = "/api/life?mode=search&q=" + encodeURIComponent(query);
      try {
        const archive = await fetch(path + "&scope=archive", { signal: controller.signal });
        if (archive.ok) { found = options(await archive.json() as LifeQuery); setResults(found); }
        const live = await fetch(path, { signal: controller.signal });
        if (!live.ok) throw new Error();
        const merged = new Map([...found, ...options(await live.json() as LifeQuery)].map(option => [option.value, option]));
        if (!controller.signal.aborted) setResults([...merged.values()]);
      } catch { if (!controller.signal.aborted) { setResults(found); setUnavailable(true); } }
      finally { if (!controller.signal.aborted) setBusy(false); }
    }, 250);
    return () => { controller.abort(); clearTimeout(timer); };
  }, [query, offlineOnly, language]);
  const choices = useMemo(() => {
    const rows: Option[] = [{ value: "", label: t("Bilmiyorum / tür bekliyor", "Unknown / needs identification") },
      ...plants.map(plant => ({ value: plant.id, label: plant.name + " · " + plant.latin })), ...results];
    if (value && !rows.some(row => row.value === value)) rows.push({ value, label: label || (retained?.value === value ? retained.label : (value.startsWith("flora-") ? t("Flora kaydı", "Flora record") : t("Kaynaklı canlı türü", "Sourced living taxon")) + " #" + value.replace(/^(flora-|gbif-)/, "")) });
    return [...new Map(rows.map(row => [row.value, row])).values()];
  }, [plants, results, value, label, retained, language]);
  return <div className="observation-taxon-select"><label htmlFor={id}>{t("Tür (isteğe bağlı)", "Species (optional)")}</label><SearchSelect id={id} value={value} disabled={disabled} onSearch={setQuery} searchLoading={busy} onChange={event => {
    const next = event.target.value, selected = choices.find(option => option.value === next);
    setRetained(selected || null); onChange(next, next ? selected?.label || "" : "");
  }}>{choices.map(option => <option key={option.value} value={option.value}>{option.label}</option>)}</SearchSelect>
    <small>{offlineOnly ? t("Çevrimdışıyken türü boş bırakabilirsin. Bağlantı geldiğinde belirle.", "You can leave the species unknown offline and identify it when connected.") : t("Bitki, mantar veya hayvan türünün adını yazarak ara.", "Type the name of a plant, fungus or animal species.")}</small>
    {unavailable && <small role="status">{t("Canlı kaynağa ulaşılamadı; arşiv sonuçları gösteriliyor.", "Live source unavailable; archived matches are shown.")}</small>}
  </div>;
}
