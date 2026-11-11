"use client";
import { useEffect, useState } from "react";
import type { Language } from "./i18n";
type RecentPhoto = { id: string; file: File };
function Thumbnail({ photo, onChoose, language }: { photo: RecentPhoto; onChoose: (file: File) => void; language: Language }) {
  const [url, setUrl] = useState("");
  useEffect(() => { const next = URL.createObjectURL(photo.file); setUrl(next); return () => URL.revokeObjectURL(next); }, [photo.file]);
  return <button type="button" onClick={() => onChoose(photo.file)} aria-label={`${language === "en" ? "Use photo" : "Fotoğrafı kullan"}: ${photo.file.name}`}>{url && <img src={url} alt=""/>}</button>;
}
export default function LensRecent({ active, owner, language, files, onChoose }: { active: boolean; owner: string; language: Language; files: File[]; onChoose: (file: File) => void }) {
  const [stored, setStored] = useState<RecentPhoto[]>([]);
  useEffect(() => {
    setStored([]); if (!active) return;
    let stopped = false;
    void import("./field-storage").then(async storage => {
      const drafts = await storage.listFieldDrafts(owner);
      const recent: RecentPhoto[] = [];
      for (const draft of drafts.slice(0, 6)) {
        if (stopped) return;
        const photo = draft.photos[0]; if (!photo) continue;
        try { const blob = await storage.readFieldFile(draft.id, photo.id); if (!stopped) recent.push({ id: `${draft.id}:${photo.id}`, file: new File([blob], photo.name, { type: photo.type }) }); } catch { /* A removed local photo is omitted. */ }
      }
      if (!stopped) setStored(recent);
    }).catch(() => {});
    return () => { stopped = true; };
  }, [active, owner]);
  const seen = new Set<string>();
  const photos = [...files.map((file, index) => ({ id: `selected-${index}-${file.name}`, file })), ...stored].filter(photo => {
    const key = `${photo.file.name}:${photo.file.size}`; if (seen.has(key)) return false; seen.add(key); return true;
  }).slice(0, 12);
  if (!photos.length) return <p className="lens-library-empty">{language === "en" ? "Photos you use with Lens appear here." : "Lens’te kullandığın fotoğraflar burada görünür."}</p>;
  return <section className="lens-recent" aria-label={language === "en" ? "Photos selected on this device" : "Bu cihazda seçilen fotoğraflar"}><span>{language === "en" ? "Selected on this device" : "Bu cihazda seçtiklerin"}</span><div>{photos.map(photo => <Thumbnail key={photo.id} photo={photo} onChoose={onChoose} language={language}/>)}</div></section>;
}
