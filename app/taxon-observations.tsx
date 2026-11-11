"use client";
import { useEffect, useState } from "react";
import LinkPreviewCard from "./link-preview-card";
import type { LinkPreview } from "./link-preview";
import { requestShare } from "./share";
import PhotoAlbum from "./photo-album";
import type { Language } from "./i18n";
type Observation = { linkPreview?: LinkPreview; id: string; author: string; text: string; observedAt?: string; image?: string; photos: { url: string; organ?: string }[] };
type Batch = { records: Observation[]; nextOffset: number; hasMore: boolean };
export default function TaxonObservations({ id, name, language, onCreate }: { id: string; name: string; language: Language; onCreate: () => void }) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const [records, setRecords] = useState<Observation[]>([]), [busy, setBusy] = useState(true), [error, setError] = useState(false);
  const [offset, setOffset] = useState(0), [more, setMore] = useState(false), [retry, setRetry] = useState(0);
  useEffect(() => {
    const controller = new AbortController(); setRecords([]); setBusy(true); setError(false); setOffset(0); setMore(false);
    void fetch("/api/community-observations?taxon=" + encodeURIComponent(id), { signal: controller.signal, cache: "no-store" }).then(async response => {
      if (!response.ok) throw new Error(); const data = await response.json() as Batch;
      setRecords(data.records); setOffset(data.nextOffset); setMore(data.hasMore);
    }).catch(() => { if (!controller.signal.aborted) setError(true); }).finally(() => { if (!controller.signal.aborted) setBusy(false); });
    return () => controller.abort();
  }, [id, retry]);
  async function next() {
    if (busy) return; setBusy(true); setError(false);
    try { const response = await fetch("/api/community-observations?taxon=" + encodeURIComponent(id) + "&offset=" + offset, { cache: "no-store" }); if (!response.ok) throw new Error(); const data = await response.json() as Batch;
      setRecords(previous => [...new Map([...previous, ...data.records].map(record => [record.id, record])).values()]); setOffset(data.nextOffset); setMore(data.hasMore);
    } catch { setError(true); } finally { setBusy(false); }
  }
  return <section className="taxon-community" aria-labelledby="taxon-community-title">
    <div className="life-section-heading"><div><h3 id="taxon-community-title">{t("Topluluğun gözünden", "Through the community’s eyes")}</h3><p>{t("Bu türe bağlanan ve yayın için onaylanan saha gözlemleri.", "Field observations linked to this taxon and approved for publication.")}</p></div><button className="life-secondary" onClick={onCreate}>{t("Gözlem ekle", "Add observation")}</button></div>
    <div className="taxon-community-grid">{records.map(record => <article key={record.id}>{(record.photos.length || record.image) ? <PhotoAlbum language={language} name={name} photos={record.photos.length ? record.photos : [{ url: record.image! }]} /> : null}<div><strong data-user-content>{record.author}</strong><small>{record.observedAt}</small>{record.text && <p data-user-content>{record.text}</p>}{record.linkPreview && <LinkPreviewCard preview={record.linkPreview}/>}<button type="button" className="life-secondary" onClick={()=>requestShare({url:"/?view=home&observation="+encodeURIComponent(record.id),title:record.author+" · "+name,image:record.image||record.photos[0]?.url})}>{t("Paylaş","Share")}</button></div></article>)}</div>
    {busy && <p className="life-loading" role="status">{t("Gözlemler yükleniyor…", "Loading observations…")}</p>}
    {error && <p className="life-inline-note" role="alert">{t("Gözlemler yüklenemedi.", "Observations could not be loaded.")} <button onClick={() => records.length ? void next() : setRetry(value => value + 1)}>{t("Tekrar dene", "Retry")}</button></p>}
    {!busy && !error && !records.length && <p className="life-meta">{t("Henüz onaylanan gözlem yok. İlk saha kaydını sen ekleyebilirsin.", "No approved observations yet. You can add the first field record.")}</p>}
    {more && <button className="life-more" disabled={busy} onClick={() => void next()}>{t("Daha fazla gözlem", "More observations")}</button>}
  </section>;
}
