"use client";
import { useEffect, useState } from "react";
import type { LinkPreview } from "./link-preview";
export default function LinkPreviewCard({ preview }: { preview: LinkPreview }) {
  const [broken, setBroken] = useState(false);
  useEffect(() => setBroken(false), [preview.image]);
  return <a className="link-preview-card" href={preview.url} target="_blank" rel="noopener noreferrer" data-user-content>
    {preview.image && !broken && <img src={preview.image} width="640" height="336" alt="" loading="lazy" decoding="async" referrerPolicy="no-referrer" onError={() => setBroken(true)} />}
    <span className="link-preview-copy"><small>{new URL(preview.url).hostname.replace(/^www\./, '')}</small><strong>{preview.title || preview.siteName}</strong>{preview.description && <span>{preview.description}</span>}</span>
  </a>;
}
