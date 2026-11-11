"use client";
import { useState } from "react";
import ObservationTaxonSelect from "./observation-taxon-select";
import type { Plant } from "./plant-data";
import type { Language } from "./i18n";
export type ReviewPost = { id: string; author: string; text: string; image?: string; photos?: { url: string; organ?: string }[]; plantId?: string; status?: string; observedAt?: string; reviewNote?: string };
export default function ObservationReview({ posts, plants, language, onDecision }: { posts: ReviewPost[]; plants: Plant[]; language: Language; onDecision: (id: string, status: string, plantId: string) => void }) {
  const t = (tr: string, en: string) => language === "en" ? en : tr, pending = posts.filter(post => post.status === "pending");
  const [targets, setTargets] = useState<Record<string, { value: string; label: string }>>({}), [notes, setNotes] = useState<Record<string, string>>({});
  const [busy, setBusy] = useState(""), [error, setError] = useState("");
  async function review(post: ReviewPost, decision: string) {
    if (busy) return;
    const target = targets[post.id]?.value ?? post.plantId ?? "";
    if (decision === "approved" && !target) { setError(t("Onaydan önce ilgili türü seç.", "Choose the linked species before approval.")); return; }
    setBusy(post.id); setError("");
    try {
      const response = await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "review-observation", id: post.id, decision, plantId: target, reviewNote: notes[post.id] || "" }) });
      const data = await response.json() as { error?: string };
      if (!response.ok) throw new Error(data.error);
      onDecision(post.id, decision, target);
    } catch (cause) { setError(cause instanceof Error ? cause.message : t("İşlem tamamlanamadı.", "Review failed.")); }
    finally { setBusy(""); }
  }
  return <section className="content-panel review-panel" aria-busy={Boolean(busy)}>
    <div className="review-heading"><div><span className="eyebrow">{t("YAYIN MASASI", "REVIEW DESK")}</span><h2>{t("Sahadan kütüphaneye.", "From the field to the library.")}</h2><p>{t("Türü, fotoğrafları ve kaynak kimliğini kontrol et. Onaylanan kayıtlar ilgili canlı türünün altında yayımlanır.", "Check the species, photos and source identity. Approved records appear under the linked living taxon.")}</p></div><strong>{pending.length}<small>{t("onay bekliyor", "awaiting review")}</small></strong></div>
    {error && <p role="alert" className="form-error">{error}</p>}
    {pending.length ? pending.map(post => <article className="review-item" key={post.id}>
      <div className="review-photos">{(post.photos?.length ? post.photos : post.image ? [{ url: post.image }] : []).map((photo, index) => <a key={photo.url} href={photo.url} target="_blank" rel="noreferrer"><img src={photo.url} width="240" height="240" loading="lazy" alt={t("İnceleme fotoğrafı ", "Review photo ") + (index + 1)} /></a>)}</div>
      <div><strong data-user-content>{post.author}</strong><small>{post.observedAt}</small><p data-user-content>{post.text}</p>
        <ObservationTaxonSelect language={language} plants={plants} value={targets[post.id]?.value ?? post.plantId ?? ""} label={targets[post.id]?.label} disabled={Boolean(busy)} onChange={(value, label) => setTargets(previous => ({ ...previous, [post.id]: { value, label } }))} />
        <label>{t("İnceleme notu", "Review note")}<textarea disabled={Boolean(busy)} value={notes[post.id] || ""} maxLength={500} rows={2} onChange={event => setNotes(previous => ({ ...previous, [post.id]: event.target.value }))} /></label>
        <div className="review-actions"><button disabled={Boolean(busy)} onClick={() => void review(post, "approved")}>{busy === post.id ? t("Kaydediliyor…", "Saving…") : t("Onayla ve yayımla", "Approve and publish")}</button><button disabled={Boolean(busy)} onClick={() => void review(post, "rejected")}>{t("Düzeltme iste", "Request revision")}</button></div>
      </div>
    </article>) : <div className="review-empty"><span aria-hidden="true">✓</span><p>{t("Bekleyen gözlem yok. Yeni paylaşımlar burada görünür.", "No observations are awaiting review. New submissions appear here.")}</p></div>}
  </section>;
}
