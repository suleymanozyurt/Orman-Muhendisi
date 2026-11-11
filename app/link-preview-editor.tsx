"use client";
import { useEffect, useState } from "react";
import { firstLink, previewUrl, type LinkPreview } from "./link-preview";
import LinkPreviewCard from "./link-preview-card";
import type { Language } from "./i18n";
export default function LinkPreviewEditor({ text, url, preview, dismissed, offline, language, onChange }: {
  text: string; url: string; preview?: LinkPreview; dismissed: string; offline: boolean; language: Language;
  onChange: (url: string, preview?: LinkPreview, dismissed?: string) => void;
}) {
  const t = (tr: string, en: string) => language === 'en' ? en : tr;
  const detected = firstLink(text), selected = (url ? previewUrl(url) || url : '') || (detected !== dismissed ? detected : '');
  const [status, setStatus] = useState(''), [attempt, setAttempt] = useState(0);
  useEffect(() => {
    if (!selected || preview?.url === selected || !previewUrl(selected)) { setStatus(''); return; }
    if (offline) { setStatus('offline'); return; }
    const controller = new AbortController(); setStatus('loading');
    const timer = setTimeout(() => {
      void fetch('/api/link-preview', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ url: selected }), signal: controller.signal })
        .then(async response => { const data = await response.json() as { preview?: LinkPreview }; if (!response.ok || !data.preview) throw new Error(); if (!controller.signal.aborted) { onChange(selected, data.preview); setStatus(''); } })
        .catch(() => { if (!controller.signal.aborted) setStatus('failed'); });
    }, 350);
    return () => { clearTimeout(timer); controller.abort(); };
  }, [selected, preview?.url, offline, attempt]);
  // Preserve the detected URL even before metadata arrives, including offline drafts.
  useEffect(() => { if (selected && !url) onChange(selected, preview?.url === selected ? preview : undefined); }, [selected, url]);
  return <section className="link-preview-editor" aria-label={t('Bağlantı ekle', 'Add a link')}>
    <label htmlFor="observation-link">{t('Bağlantı', 'Link')} <span>{t('(isteğe bağlı)', '(optional)')}</span></label>
    <div className="link-preview-input"><input id="observation-link" type="url" inputMode="url" autoCapitalize="none" spellCheck={false} maxLength={2000} value={url} placeholder="https://…" onChange={event => onChange(event.target.value, undefined, dismissed)} />
      {selected && <button type="button" aria-label={t('Bağlantıyı kaldır', 'Remove link')} onClick={() => { onChange('', undefined, detected); setStatus(''); }}>×</button>}</div>
    {url && !previewUrl(url) && <p className="link-preview-message">{t('Geçerli bir http veya https bağlantısı gir.', 'Enter a valid http or https link.')}</p>}
    {preview?.url === selected && <LinkPreviewCard preview={preview} />}
    {status && <p className="link-preview-message" role="status">{status === 'loading' ? t('Önizleme hazırlanıyor…', 'Preparing preview…') : status === 'offline' ? t('Bağlantı taslağa eklendi. İnternet geldiğinde önizleme hazırlanır.', 'Link saved in the draft. Preview will load when connected.') : <>{t('Bu sitenin önizlemesi alınamadı. Bağlantıyı yine ekleyebilirsin.', 'Preview unavailable. You can still attach the link.')} <button type="button" onClick={() => setAttempt(value => value + 1)}>{t('Yeniden dene', 'Retry')}</button></>}</p>}
  </section>;
}
