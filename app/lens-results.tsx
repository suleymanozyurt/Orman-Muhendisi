"use client";
import { useEffect, useState } from "react";
import { Icon } from "./icons";
import type { Language } from "./i18n";
import type { LensCandidate, LensReply } from "./lens-types";
import { lensShotLabel } from "./lens-guidance";
import type { LifeImage } from "./life-types";

function SpeciesCard({ candidate, selected, lead, language, onSelect, onTaxon }: { candidate: LensCandidate; selected: boolean; lead: boolean; language: Language; onSelect: () => void; onTaxon: (id: string) => void }) {
  const [image, setImage] = useState<LifeImage | null>(null);
  const [broken, setBroken] = useState(false);
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  useEffect(() => {
    setImage(null); setBroken(false);
    if (!candidate.taxonId) return;
    const controller = new AbortController();
    void fetch(`/api/life?mode=cover&id=${encodeURIComponent(candidate.taxonId)}`, { signal: controller.signal }).then(async response => {
      if (!response.ok) return;
      const data = await response.json() as { image?: LifeImage };
      if (!controller.signal.aborted && data.image) setImage(data.image);
    }).catch(() => {});
    return () => controller.abort();
  }, [candidate.taxonId]);
  const evidence = candidate.evidence, lookalike = evidence?.lookalike;
  return <article className="lens-species-card" data-selected={selected}>
    <div className="lens-species-head">
      <button type="button" className="lens-species-image" disabled={!candidate.taxonId} onClick={()=>{if(candidate.taxonId)onTaxon(candidate.taxonId);}} aria-label={`${t("Tür künyesini aç", "Open species profile")}: ${candidate.commonName || candidate.scientificName}`}>
        {image && !broken ? <img src={image.url} alt={candidate.commonName || candidate.scientificName} loading="lazy" onError={() => setBroken(true)}/> : <span><Icon name="leaf"/>{t("Kaynak fotoğrafı yok", "No source photo")}</span>}
        {selected && <span className="lens-selected-mark"><Icon name="check"/></span>}
      </button>
      <div className="lens-species-body"><span className="lens-suggestion-tag">{t("Tür önerisi", "Suggestion")}</span><h4 data-user-content>{candidate.commonName || candidate.scientificName}</h4>{candidate.commonName && <p data-user-content><i>{candidate.scientificName}</i></p>}
        {image && !broken && <a className="lens-photo-credit" href={image.source} target="_blank" rel="noreferrer" title={`${image.credit} · ${image.license}`}>{image.credit || t("Fotoğraf kaynağı", "Photo source")}</a>}
      </div>
    </div>
    <details className="lens-why" open={lead}><summary>{t("Neden bu tür?", "Why this species?")}</summary>
      <p className="lens-why-reason" data-user-content>{candidate.reason}</p>
      {evidence && <dl>
        {evidence.seen.length > 0 && <div className="lens-why-seen"><dt>{t("Fotoğrafta görülen", "Seen in the photo")}</dt>{evidence.seen.map(item => <dd key={item} data-user-content><Icon name="check"/>{item}</dd>)}</div>}
        {evidence.notSeen.length > 0 && <div className="lens-why-missing"><dt>{t("Görülmedi", "Not seen")}</dt>{evidence.notSeen.map(item => <dd key={item} data-user-content><span aria-hidden="true">–</span>{item}</dd>)}</div>}
        {lookalike && <div className="lens-why-lookalike"><dt>{t("En çok karışan tür", "Most often confused with")}</dt><dd data-user-content><i>{lookalike.scientificName}</i></dd><dd data-user-content>{lookalike.difference}</dd></div>}
      </dl>}
      <p className="lens-why-origin"><span>{t("Yapay zekâ önerisi", "AI suggestion")}</span>{candidate.taxonId ? candidate.source && <a href={candidate.source} target="_blank" rel="noreferrer">{t("GBIF kaynak kaydı", "GBIF source record")}</a> : <em>{t("Kaynakla eşleşmedi; türü elle seç.", "No source match; choose the species manually.")}</em>}</p>
    </details>
    {candidate.taxonId && <div className="lens-species-actions"><button type="button" className="lens-species-select" aria-pressed={selected} onClick={onSelect}><Icon name={selected ? "check" : "plus"}/>{selected ? t("Seçildi", "Selected") : t("Bu türü seç", "Choose species")}</button><button type="button" onClick={() => onTaxon(candidate.taxonId!)}>{t("Tür künyesi", "Species profile")}</button></div>}
  </article>;
}

export default function LensResults({ reply, selected, language, frames = 1, onSelect, onTaxon, onNextShot }: { reply: LensReply; selected: string; language: Language; frames?: number; onSelect: (id: string) => void; onTaxon: (id: string) => void; onNextShot?: () => void }) {
  const [tab, setTab] = useState<"all" | "species">("all");
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const next = reply.nextShot;
  return <section className="lens-results" aria-labelledby="lens-results-title">
    {next && <div className="lens-next-shot" role="status"><Icon name="camera"/><div><strong>{t("Bir kare daha ayırt ettirir", "One more frame would settle it")} · {lensShotLabel(next.part, language)}</strong><p data-user-content>{next.reason}</p>
      {onNextShot ? <button type="button" onClick={onNextShot}>{t(`${frames + 1}. kareyi çek`, `Take frame ${frames + 1}`)}</button> : null}<small>{t("Çektiğin fotoğraf ve notun bu gözlemde kalır.", "The photo you took and your note stay with this observation.")}</small></div></div>}
    <div className="lens-result-tabs" role="tablist" aria-label={t("Arama sonuçları", "Search results")}>{(["all", "species"] as const).map(value => <button key={value} id={`lens-tab-${value}`} type="button" role="tab" aria-selected={tab === value} aria-controls={`lens-panel-${value}`} tabIndex={tab === value ? 0 : -1} onClick={() => setTab(value)} onKeyDown={event => { if (event.key === "ArrowRight" || event.key === "ArrowLeft") { event.preventDefault(); const next = value === "all" ? "species" : "all"; setTab(next); document.getElementById(`lens-tab-${next}`)?.focus(); } }}>{value === "all" ? t("Tümü", "All") : t("Görsel eşleşmeler", "Visual matches")}</button>)}</div>
    <div id="lens-panel-all" role="tabpanel" aria-labelledby="lens-tab-all" hidden={tab !== "all"}><div className="lens-result-overview"><span><Icon name="sparkles"/>{t("Fotoğraf incelemesi", "Photo analysis")}</span><p data-user-content>{reply.summary}</p></div></div>
    <div id="lens-panel-species" role={tab === "species" ? "tabpanel" : undefined} aria-labelledby="lens-tab-species"><h3 id="lens-results-title">{t("Tür eşleşmeleri", "Species matches")}</h3>
      {reply.taxonomyUnavailable && <p className="lens-caption" role="status">{t("Taksonomi kaynağına ulaşılamadı. Eşleşmeyen türler seçilemez.", "Taxonomy is unavailable. Unmatched species cannot be selected.")}</p>}
      {!reply.candidates.length && <p className="lens-caption">{t("Tür eşleşmesi bulunamadı. Daha yakın ve net bir fotoğraf dene.", "No species match. Try a closer, clearer photo.")}</p>}
      <div className="lens-species-grid">{reply.candidates.map((candidate, index) => <SpeciesCard key={candidate.predictedName} lead={index === 0} candidate={candidate} selected={Boolean(candidate.taxonId) && selected === candidate.taxonId} language={language} onSelect={() => { if (candidate.taxonId) onSelect(selected === candidate.taxonId ? "" : candidate.taxonId); }} onTaxon={onTaxon}/>)}</div>
    </div>
    <small className="lens-result-source">{reply.sample || `${reply.provider === "plantnet" ? "Pl@ntNet" : reply.provider === "gemini" ? "Google Gemini" : "OpenAI"} · GBIF`} · {t("Tür önerileri; kesin tanı değildir.", "Species suggestions; not confirmed identifications.")}</small>
  </section>;
}
