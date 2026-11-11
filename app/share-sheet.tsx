"use client";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import { SocialMark } from "./social-connections";
import { useDialogScrollLock } from "./use-dialog-scroll-lock";
import { shareUrl, socialShareLinks, type ShareTarget } from "./share";
import type { Language } from "./i18n";
export default function ShareSheet({ target, language, onClose }: { target: ShareTarget | null; language: Language; onClose: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null), link = useRef<HTMLInputElement>(null);
  const [message, setMessage] = useState(''), [native, setNative] = useState(false), [broken, setBroken] = useState(false);
  useDialogScrollLock(dialog);
  useEffect(() => { setNative(Boolean(navigator.share)); }, []);
  useEffect(() => { setMessage(''); setBroken(false); if (target) dialog.current?.showModal(); else dialog.current?.close(); }, [target]);
  const t = (tr: string, en: string) => language === 'en' ? en : tr;
  const url = target ? shareUrl(target.url) : '', destinations = target ? socialShareLinks(target) : undefined;
  async function copy() {
    try { await navigator.clipboard.writeText(url); setMessage(t('Bağlantı kopyalandı. İstediğin uygulamaya yapıştırabilirsin.', 'Link copied. Paste it into any app.')); }
    catch { link.current?.focus(); link.current?.select(); setMessage(t('Bağlantıyı seçip kopyalayabilirsin.', 'Select and copy the link.')); }
  }
  return <dialog className="action-sheet share-sheet" ref={dialog} aria-labelledby="share-title" onClose={onClose} onClick={event => { if (event.target === event.currentTarget) dialog.current?.close(); }}>
    <div className="dialog-title"><h2 id="share-title">{t('Bağlantıyı paylaş', 'Share link')}</h2><button type="button" autoFocus onClick={() => dialog.current?.close()} aria-label={t('Kapat', 'Close')}><Icon name="close"/></button></div>
    {target && <div className="share-sheet-content">
      <div className="share-content-summary">{target.image && !broken && <img src={target.image} alt="" width="96" height="96" onError={() => setBroken(true)}/>}<span><strong data-user-content>{target.title}</strong><small>Orman Mühendisi</small></span></div>
      <div className="share-destinations"><button type="button" onClick={() => void copy()}><Icon name="copy"/><span>{t('Kopyala', 'Copy')}</span></button>
        <a href={destinations?.facebook} target="_blank" rel="noopener noreferrer"><SocialMark platform="facebook"/><span>Facebook</span></a>
        <a href={destinations?.x} target="_blank" rel="noopener noreferrer"><SocialMark platform="x"/><span>X</span></a>
        <a href={destinations?.whatsapp} target="_blank" rel="noopener noreferrer"><Icon name="comment"/><span>WhatsApp</span></a></div>
      {native && <button className="share-native" type="button" onClick={async () => { try { await navigator.share({ title: target.title, text: target.text, url }); } catch (cause) { if (!(cause instanceof Error && cause.name === 'AbortError')) setMessage(t('Paylaşım açılamadı. Bağlantıyı kopyalayabilirsin.', 'Sharing unavailable. You can copy the link.')); } }}><Icon name="share"/>{t('Diğer uygulamalar · Instagram ve daha fazlası', 'Other apps · Instagram and more')}</button>}
      <label className="share-link-label">{t('Doğrudan bağlantı', 'Direct link')}<input ref={link} value={url} readOnly onFocus={event => event.target.select()}/></label>
      <p className="share-sheet-note">{t('Paylaşımını açılan uygulamada düzenleyip sen yayınlarsın.', 'Edit and publish your post in the app you open.')}</p>
      {message && <p className="share-sheet-message" role="status">{message}</p>}
    </div>}
  </dialog>;
}
