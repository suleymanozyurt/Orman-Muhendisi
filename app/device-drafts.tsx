"use client";
import { useEffect, useState } from "react";
import { deleteFieldDraft, listFieldDrafts } from "./field-storage";
import type { FieldDraft } from "./field-draft";
import type { Language } from "./i18n";
import { Icon } from "./icons";
export const fieldDraftEvent = "om-field-drafts";
export default function DeviceDrafts({ owner, language, onOpen, activeId }: {
  owner: string; language: Language; onOpen: (id: string) => void; activeId?: string;
}) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const [drafts, setDrafts] = useState<FieldDraft[]>([]), [error, setError] = useState(false), [confirm, setConfirm] = useState("");
  useEffect(() => {
    let stopped = false;
    const load = () => { void Promise.all([listFieldDrafts(owner), owner === "guest" ? Promise.resolve([]) : listFieldDrafts("guest")]).then(groups => { if (!stopped) { setDrafts(groups.flat().sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))); setError(false); } }).catch(() => { if (!stopped) setError(true); }); };
    load(); window.addEventListener(fieldDraftEvent, load);
    return () => { stopped = true; window.removeEventListener(fieldDraftEvent, load); };
  }, [owner]);
  if (!drafts.length && !error) return null;
  return <section className="device-drafts" aria-labelledby="device-drafts-title">
    <div className="device-drafts-heading"><Icon name="save" /><div><h3 id="device-drafts-title">{t("Cihazındaki taslaklar", "Drafts on this device")}</h3><p>{t("Henüz paylaşılmadı. Hesabına göndermeden önce düzenleyebilirsin.", "Not shared yet. Edit before sending to your account.")}</p></div><span>{drafts.length}</span></div>
    {error && <p role="status">{t("Cihaz kayıtları açılamadı. Tarayıcının depolama iznini kontrol et.", "Device drafts could not be opened. Check browser storage permissions.")}</p>}
    <div className="device-drafts-list">{drafts.map(draft => <article key={draft.id} data-active={activeId === draft.id}>
      <button type="button" className="device-draft-open" onClick={() => onOpen(draft.id)} aria-current={activeId === draft.id ? "true" : undefined}>
        <span className="device-draft-icon"><Icon name={draft.photos.length ? "camera" : "paper"} /></span>
        <span><strong>{draft.text.trim().slice(0, 80) || t("Fotoğraflı gözlem", "Photo observation")}</strong><small>{draft.photos.length} {t("fotoğraf", "photos")} · {new Date(draft.updatedAt).toLocaleDateString(language === "en" ? "en-GB" : "tr-TR")}</small></span>
      </button>
      {confirm === draft.id ? <div className="device-draft-delete"><span>{t("Taslak silinsin mi?", "Delete this draft?")}</span><button type="button" onClick={() => { void deleteFieldDraft(draft.id, draft.owner).then(() => { setConfirm(""); window.dispatchEvent(new Event(fieldDraftEvent)); }).catch(() => setError(true)); }}>{t("Sil", "Delete")}</button><button type="button" onClick={() => setConfirm("")}>{t("Vazgeç", "Cancel")}</button></div> : <button type="button" className="device-draft-remove" disabled={activeId === draft.id} onClick={() => setConfirm(draft.id)} aria-label={`${t("Taslağı sil", "Delete draft")}: ${draft.text.slice(0, 40)}`}><Icon name="close" /></button>}
    </article>)}</div>
  </section>;
}
