"use client";
import { requestShare } from "./share";
import { SocialMark } from "./social-connections";
import {clientId} from "./client-id";
import { useEffect, useRef, useState } from "react";
import { Icon } from "./icons";
import type { Language } from "./i18n";
import SearchSelect from "./search-select";
import { compactPhoto } from "./photo-prepare";
import PhotoAlbum from "./photo-album";
import { socialMediaPath } from "./social-media-key";
import { horizontalSwipe, type TouchPoint } from "./swipe-intent";
import { chunkSocialImports, isSocialProfileUrl, parseSocialArchive, parseSocialArchiveText, socialAccounts, socialKind, socialSearchText, sourcedSocialPosts, unresolvedSocialMedia, youtubeSocialEmbed, type SocialPost, type SocialPlatform } from "./social-archive-model";
type Props = { language: Language; admin: boolean; query?: string; platform?: string; kind?: string; entry?: string;
  onFilter: (query: string, platform: string, kind: string) => void; onSelect: (id?: string) => void };
type Page = { records: SocialPost[]; total: number; hasMore: boolean };
function mediaUrl(media: SocialPost["media"][number]) { return media.uploadedKey ? socialMediaPath(media.uploadedKey) : media.url || ""; }
function SocialMediaView({ post, language }: { post: SocialPost; language: Language }) {
  const [index, setIndex] = useState(0), [playing, setPlaying] = useState(false), [broken, setBroken] = useState(false);
  const swipe=useRef<TouchPoint|null>(null);
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const available = post.media.filter(media => Boolean(mediaUrl(media))), selected = available[index], embed = youtubeSocialEmbed(post.sourceUrl);
  const move=(direction:number)=>{setIndex(value=>Math.max(0,Math.min(available.length-1,value+direction)));setPlaying(false);setBroken(false);};
  useEffect(() => { setIndex(0); setPlaying(false); setBroken(false); swipe.current=null; }, [post.id, available.length]);
  if (!selected && !embed) return post.media.length ? <div className="archive-media-fallback"><Icon name="camera"/><p>{t("Özgün medya henüz aktarılmadı.", "Original media has not been restored yet.")}</p></div> : null;
  if(available.length>0&&available.every(media=>media.type==="image"))return <div className="archive-photo-album"><PhotoAlbum language={language} name={post.title} photos={available.map(media=>({url:mediaUrl(media),previewUrl:media.previewKey?socialMediaPath(media.previewKey):undefined,srcSet:media.previewKey&&media.uploadedKey&&media.previewWidth&&media.width?`${socialMediaPath(media.previewKey)} ${media.previewWidth}w, ${mediaUrl(media)} ${media.width}w`:undefined,width:media.width,height:media.height}))}/></div>;
  return <div className={"archive-media"+(selected?.type==="image"?" archive-photo-swipe":"")} tabIndex={available.length>1?0:undefined} role={available.length>1?"group":undefined} aria-label={available.length>1?t("Paylaşım albümü","Post album"):undefined}
    onKeyDown={event=>{if(event.target!==event.currentTarget||!["ArrowLeft","ArrowRight"].includes(event.key))return;event.preventDefault();move(event.key==="ArrowRight"?1:-1);}}
    onTouchStart={event=>{const touch=event.touches[0];swipe.current=selected?.type==="image"&&available.length>1&&event.touches.length===1&&touch&&!(event.target instanceof Element&&event.target.closest("button,a,input,video"))?{x:touch.clientX,y:touch.clientY}:null;}}
    onTouchMove={event=>{if(event.touches.length!==1)swipe.current=null;}} onTouchCancel={()=>{swipe.current=null;}}
    onTouchEnd={event=>{const start=swipe.current;swipe.current=null;const touch=event.changedTouches[0];if(!start||!touch||event.touches.length)return;const direction=horizontalSwipe(start,{x:touch.clientX,y:touch.clientY},window.visualViewport?.scale);if(direction)move(direction);}}>
    {selected?.type === "image" ? broken ? <div className="archive-media-fallback"><Icon name="camera"/><p>{t("Fotoğraf yüklenemedi.", "Photo could not be loaded.")}</p><button onClick={() => setBroken(false)}>{t("Yeniden dene", "Retry")}</button></div> : <img key={mediaUrl(selected)} src={mediaUrl(selected)} srcSet={selected.previewKey && selected.uploadedKey && selected.previewWidth && selected.width ? `${socialMediaPath(selected.previewKey)} ${selected.previewWidth}w, ${mediaUrl(selected)} ${selected.width}w` : undefined} sizes="(max-width: 720px) calc(100vw - 40px), (max-width: 1100px) 45vw, 560px" alt={selected.alt || post.title} width={selected.width || 1280} height={selected.height || 960} loading="lazy" decoding="async" onError={() => setBroken(true)}/>
      : playing ? embed && !selected ? <iframe src={embed} title={post.title} referrerPolicy="strict-origin-when-cross-origin" allow="fullscreen; picture-in-picture" allowFullScreen/> : <video src={selected ? mediaUrl(selected) : undefined} poster={selected?.previewKey?socialMediaPath(selected.previewKey):undefined} width={selected?.width||1280} height={selected?.height||720} controls playsInline preload="metadata" onError={() => setBroken(true)} aria-label={post.title}/>
      : <button className={"archive-play"+(selected?.previewKey?" has-preview":"")} onClick={() => setPlaying(true)}>{selected?.previewKey&&<img src={socialMediaPath(selected.previewKey)} width={selected.previewWidth||640} height={selected.width&&selected.height?Math.round((selected.previewWidth||640)*selected.height/selected.width):360} alt="" loading="lazy" decoding="async"/>}<span aria-hidden="true">▷</span><span className="archive-play-caption">{t("Videoyu oynat", "Play video")}</span>{!selected?.uploadedKey && <small>{t("Oynattığında video sağlayıcısına bağlanılır.", "Playing connects to the video provider.")}</small>}</button>}
    {broken && selected?.type === "video" && <p role="status">{t("Video yüklenemedi.", "Video unavailable.")} <button onClick={()=>move(0)}>{t("Yeniden dene","Retry")}</button></p>}
    {available.length > 1 && <div className="archive-media-controls"><button disabled={index === 0} onClick={() => move(-1)} aria-label={t("Önceki medya", "Previous media")}>‹</button><span aria-live="polite">{index + 1} / {available.length}</span><button disabled={index === available.length - 1} onClick={() => move(1)} aria-label={t("Sonraki medya", "Next media")}>›</button></div>}
  </div>;
}
export function SocialArchiveCard({ post, language, onSelect }: { post: SocialPost; language: Language; onSelect: (id: string) => void }) {
  const [expanded, setExpanded] = useState(false), [shared, setShared] = useState("");
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const account = socialAccounts.find(account => account.platform === post.platform);
  const share = () => {
    const url = new URL('/', window.location.origin); url.searchParams.set('view', 'social'); url.searchParams.set('entry', post.id);
    const media = post.media.find(media => media.type === 'image' || media.previewKey);
    requestShare({ title: post.title, text: post.text.slice(0, 200), url: String(url), image: media?.previewKey ? socialMediaPath(media.previewKey) : media?.type === 'image' ? mediaUrl(media) : undefined });
  };
  return <article className="archive-card" data-user-content>
    <header><span className="archive-mark"><Icon name="tree"/></span><span><strong>Orman Mühendisi</strong><small>{account?.name} · {account?.handle}</small></span>{post.publishedAt && <time dateTime={post.publishedAt}>{new Date(post.publishedAt).toLocaleDateString(language === "en" ? "en-GB" : "tr-TR")}</time>}</header>
    <SocialMediaView post={post} language={language}/><div className="archive-card-content"><button className="archive-card-title" onClick={() => onSelect(post.id)}><h2>{post.title}</h2></button>
      {post.text && <p>{expanded || post.text.length <= 350 ? post.text : post.text.slice(0, 350) + "…"}</p>}{post.text.length > 350 && <button className="archive-read-more" onClick={() => setExpanded(!expanded)} aria-expanded={expanded}>{expanded ? t("Daha az göster", "Show less") : t("Devamını oku", "Read more")}</button>}
      {post.archive && <small className="archive-provenance">{t("Hesap yedeğinden · ", "From account export · ")}{post.archive.exportedAt}{!post.publishedAt && t(" · Özgün tarih kayıtta yok", " · Original date not recorded")}</small>}
      <footer>{post.sourceUrl && <a href={post.sourceUrl} target="_blank" rel="noreferrer">{isSocialProfileUrl(post.sourceUrl) ? t("Kaynak hesap", "Source account") : t("Özgün paylaşım", "Original post")} ↗</a>}<button onClick={() => void share()}><Icon name="share"/>{t("Paylaş", "Share")}</button></footer>{shared && <small role="status">{shared}</small>}
    </div>
  </article>;
}
function matchingFile(path: string, files: File[]) {
  const normalized = path.replace(/\\/g, "/").replace(/^\.\//, "").replace(/^\//, "");
  if (normalized.split("/").includes("..")) return null;
  const matches = files.filter(file => { const name = file.webkitRelativePath || file.name; return name === normalized || name.endsWith("/" + normalized); });
  return matches.length === 1 ? matches[0] : null;
}
function SocialImporter({ language, onImported }: { language: Language; onImported: () => void }) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const [platform, setPlatform] = useState<SocialPlatform>("instagram"), [parsed, setParsed] = useState<Awaited<ReturnType<typeof parseSocialArchive>> | null>(null), [files, setFiles] = useState<File[]>([]);
  const [busy, setBusy] = useState(false), [error, setError] = useState(""), [message, setMessage] = useState(""), [progress, setProgress] = useState(0);
  const uploadKeys = useRef(new Map<string, string>());
  const unresolved = parsed?.posts.flatMap(post => unresolvedSocialMedia(post)) || [], matched = unresolved.filter(media => media.type === "image" && media.path && matchingFile(media.path, files)).length;
  async function read(file?: File) {
    if (!file) return; if (file.size > 50_000_000) { setError(t("Arşiv en fazla 50 MB olmalı. Bölünmüş dışa aktarım dosyalarını sırayla ekleyebilirsin.", "Archives must be under 50 MB. Add split export files one at a time.")); return; }
    setBusy(true); setError(""); setMessage(""); setParsed(null); setFiles([]); uploadKeys.current.clear();
    try { const parsed = await parseSocialArchive(parseSocialArchiveText(await file.text()), platform); setParsed(parsed); }
    catch (cause) { setError(cause instanceof Error && cause.message === "PRIVATE_ARCHIVE" ? t("Bu dosya mesaj, kişi veya takip listesi içeriyor. Yalnızca kendi gönderi arşivini seç.", "This file contains messages, contacts or follows. Choose only your own post archive.") : t("Dosya okunamadı. Instagram/Facebook gönderi JSON’u, X tweets.js veya paylaşım şablonunu seç.", "Could not read the file. Choose Instagram/Facebook post JSON, X tweets.js, or the post template.")); }
    finally { setBusy(false); }
  }
  async function importPosts() {
    if (!parsed || busy) return; setBusy(true); setError(""); setMessage(""); setProgress(0);
    let done = 0, skipped = 0;
    try {
      // Upload one image at a time. A large archive never retains all resized images in memory.
      for (const originalBatch of chunkSocialImports(parsed.posts)) {
        const ready: SocialPost[] = [];
        for (const post of originalBatch) {
        const media: SocialPost["media"] = [];
        for (const item of post.media) {
          const file = item.type === "image" && item.path && !item.url && !item.uploadedKey ? matchingFile(item.path, files) : null;
          if (!file) { media.push(item); continue; }
          const cacheKey = (file.webkitRelativePath || file.name) + ":" + file.size + ":" + file.lastModified;
          let key = uploadKeys.current.get(cacheKey);
          if (!key) {
            const body = new FormData(); body.append("file", await compactPhoto(file));
            const response = await fetch("/api/upload", { method: "POST", body }); if (!response.ok) throw new Error("UPLOAD_FAILED");
            const uploaded = await response.json() as {key?:string}; if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(uploaded.key || "")) throw new Error("UPLOAD_FAILED");
            key = uploaded.key as string; uploadKeys.current.set(cacheKey, key);
          }
          media.push({ ...item, uploadedKey: key });
        }
        ready.push({ ...post, media });
      }
        for (const batch of chunkSocialImports(ready)) {
        const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "import", posts: batch }) });
        const result = await response.json() as {error?:string;imported:number;skipped:number}; if (!response.ok) throw new Error(result.error || "IMPORT_FAILED");
        if (!Number.isInteger(result.imported) || !Number.isInteger(result.skipped) || result.imported + result.skipped !== batch.length) throw new Error("IMPORT_FAILED");
        done += result.imported; skipped += result.skipped; setProgress(done + skipped);
        }
      }
      setMessage(t(`${done} paylaşım taslak olarak aktarıldı. ${skipped} mevcut kayıt korundu.`, `${done} posts imported as drafts. ${skipped} existing records preserved.`)); onImported();
    } catch (cause) { setError(t(`${done} kayıt aktarıldı. İşlem tamamlanamadı; aynı dosyayı yeniden gönderebilirsin.`, `${done} records imported. Import did not finish; you can retry the same file.`) + (cause instanceof Error && !/^[A-Z_]+$/.test(cause.message) ? " " + cause.message : "")); }
    finally { setBusy(false); }
  }
  function template() {
    const json = JSON.stringify({ version: 1, posts: [{ platform, title: t("Paylaşım başlığı", "Post title"), text: t("Özgün paylaşım metnin", "Your original post text"), publishedAt: "", sourceUrl: "", media: [] }] }, null, 2);
    const url = URL.createObjectURL(new Blob([json], { type: "application/json" })), link = document.createElement("a"); link.href = url; link.download = "orman-paylasim-sablonu.json"; link.click(); setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return <section className="archive-import"><div><span className="eyebrow">{t("ARŞİVİNİ TAŞI", "BRING YOUR ARCHIVE")}</span><h2>{t("Paylaşımlarını bir araya getir.", "Bring your posts together.")}</h2><p>{t("Gönderi dosyanı ekle, önizlemeyi kontrol et. Önce özel taslak olarak saklanır; sen yayımlayınca görünür.", "Add your post file and check the preview. Posts are saved as private drafts and appear when you publish them.")}</p></div>
    <div className="archive-import-controls"><label>{t("Kaynak hesap", "Source account")}<SearchSelect disabled={busy} value={platform} onChange={event => { setPlatform(event.target.value as SocialPlatform); setParsed(null); setFiles([]); uploadKeys.current.clear(); }}>{socialAccounts.map(account => <option key={account.platform} value={account.platform}>{account.name} · {account.handle}</option>)}</SearchSelect></label>
      <label className="archive-file-button"><Icon name="paper"/>{t("Gönderi dosyası seç", "Choose post file")}<input type="file" accept=".json,.js,application/json" disabled={busy} onChange={event => { void read(event.target.files?.[0]); event.target.value = ""; }}/></label><button disabled={busy} type="button" onClick={template}>{t("Şablon indir", "Download template")}</button></div>
    <p className="archive-format-note">{t("Instagram/Facebook gönderi JSON’u, X tweets.js ve ortak şablon desteklenir. YouTube/TikTok için şablona özgün gönderi bağlantılarını ekle. Mesajlar ve takipçi listeleri aktarılmaz.", "Supports Instagram/Facebook post JSON, X tweets.js and the shared template. For YouTube/TikTok, add original post links to the template. Messages and follower lists are not imported.")}</p>
    {parsed && <div className="archive-preview"><div className="archive-preview-count"><strong>{parsed.posts.length}</strong><span>{t("aktarılacak paylaşım", "posts to import")}</span><small>{parsed.duplicates} {t("yinelenen", "duplicates")} · {parsed.skipped} {t("gönderi dışı kayıt atlandı", "non-post records skipped")}</small></div>
      {parsed.unresolved > 0 && <><label className="archive-folder-button">{t("Fotoğraf klasörünü ekle", "Add photo folder")}<input type="file" multiple ref={node => { node?.setAttribute("webkitdirectory", ""); }} disabled={busy} onChange={event => { setFiles(Array.from(event.target.files || [])); uploadKeys.current.clear(); }}/></label><p>{matched} / {parsed.unresolved} {t("medya eşleşti. Video dosyaları ve eşleşmeyen fotoğraflar eksik olarak kalır; tamamlanana kadar ilgili taslak yayımlanamaz.", "media files matched. Video files and unmatched photos remain missing; affected drafts cannot be published until complete.")}</p></>}
      <ol>{parsed.posts.slice(0, 6).map(post => <li key={post.id}><strong>{post.title}</strong><span>{post.media.length} {t("medya", "media")} · {post.publishedAt ? new Date(post.publishedAt).toLocaleDateString(language === "en" ? "en-GB" : "tr-TR") : t("Tarih yok", "No date")}</span></li>)}</ol>{parsed.posts.length > 6 && <small>+ {parsed.posts.length - 6} {t("paylaşım daha", "more posts")}</small>}
      <button className="submit-button" disabled={busy || !parsed.posts.length} onClick={() => void importPosts()}>{busy ? t("Aktarılıyor…", "Importing…") : t("Taslak olarak aktar", "Import as drafts")}</button>{busy && <progress aria-label={t("İçe aktarım ilerlemesi", "Import progress")} max={parsed.posts.length} value={progress}/>}</div>}
    {error && <p role="alert" className="form-error">{error}</p>}{message && <p role="status">{message}</p>}
  </section>;
}
function SocialEditor({ post, language, onClose, onSaved }: { post: SocialPost; language: Language; onClose: () => void; onSaved: () => void }) {
  const [draft, setDraft] = useState(post), [error, setError] = useState(""), [busy, setBusy] = useState(false), [confirmedDelete, setConfirmedDelete] = useState(false);
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const missing = unresolvedSocialMedia(draft).length;
  async function save(status: SocialPost["status"]) {
    if (busy) return; setBusy(true); setError("");
    try { const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "save", post: { ...draft, status } }) }); const data = await response.json() as {error?:string}; if (!response.ok) throw new Error(data.error); onSaved(); }
    catch (cause) { setError(cause instanceof Error ? cause.message : t("Kaydedilemedi. Yeniden dene.", "Could not save. Retry.")); } finally { setBusy(false); }
  }
  async function attach(file: File, index: number) {
    if (busy) return; setBusy(true); setError("");
    try { const body = new FormData(); body.append("file", await compactPhoto(file)); const response = await fetch("/api/upload", { method: "POST", body }); if (!response.ok) throw new Error(); const result = await response.json() as {key?:string}; if (!/^[a-f0-9-]{36}\.(?:jpg|png|webp)$/.test(result.key || "")) throw new Error(); setDraft(current => ({ ...current, media: current.media.map((media, i) => i === index ? { ...media, type: "image", uploadedKey: result.key, path: undefined, url: undefined } : media) })); }
    catch { setError(t("Fotoğraf yüklenemedi. Yeniden seçebilirsin.", "Photo could not be uploaded. Choose it again.")); } finally { setBusy(false); }
  }
  return <section className="archive-editor" aria-labelledby="archive-editor-title"><header><h2 id="archive-editor-title">{t("Paylaşımı düzenle", "Edit post")}</h2><button onClick={onClose} disabled={busy} aria-label={t("Düzenlemeyi kapat", "Close editor")}><Icon name="close"/></button></header><fieldset disabled={busy}>
    <label>{t("Başlık", "Title")}<input value={draft.title} maxLength={180} required onChange={event => setDraft({ ...draft, title: event.target.value })}/></label><label>{t("Özgün metin", "Original text")}<textarea value={draft.text} maxLength={20000} rows={8} onChange={event => setDraft({ ...draft, text: event.target.value })}/></label>
    <label>{t("Özgün paylaşım bağlantısı", "Original post link")}<input type="url" value={draft.sourceUrl} maxLength={2000} onChange={event => setDraft({ ...draft, sourceUrl: event.target.value })}/></label>
    {draft.publishedAt && <p>{t("Özgün paylaşım tarihi", "Original publication date")}: {new Date(draft.publishedAt).toLocaleString(language === "en" ? "en-GB" : "tr-TR")}</p>}
    {!!draft.media.length && <div className="archive-editor-media">{draft.media.map((media, index) => <div key={index}><strong>{index + 1}. {media.type === "video" ? t("Video", "Video") : t("Fotoğraf", "Photo")}</strong>{media.path && !media.uploadedKey && !media.url && <small>{media.path}</small>}<label>{t("Medya bağlantısı", "Media link")}<input type="url" value={media.url || ""} placeholder="https://…" onChange={event => setDraft({ ...draft, media: draft.media.map((item, i) => i === index ? { ...item, url: event.target.value || undefined, ...(event.target.value ? { path: undefined, uploadedKey: undefined } : {}) } : item) })}/></label><label>{t("Görsel açıklaması", "Media description")}<input value={media.alt} maxLength={300} onChange={event => setDraft({ ...draft, media: draft.media.map((item, i) => i === index ? { ...item, alt: event.target.value } : item) })}/></label>{media.type === "image" && <label>{t("Fotoğraf yükle", "Upload photo")}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => { const file = event.target.files?.[0]; if (file) void attach(file, index); event.target.value = ""; }}/></label>}<button onClick={() => setDraft({ ...draft, media: draft.media.filter((_, i) => i !== index) })}>{t("Bu medyayı kaldır", "Remove this media")}</button></div>)}</div>}
    <button disabled={draft.media.length >= 100} onClick={() => setDraft({ ...draft, media: [...draft.media, { type: "image", path: "Fotoğraf eklenecek", alt: "" }] })}>{t("Fotoğraf ekle", "Add photo")}</button><button disabled={draft.media.length >= 100} onClick={() => setDraft({ ...draft, media: [...draft.media, { type: "video", path: "Video bağlantısı eklenecek", alt: "" }] })}>{t("Video bağlantısı ekle", "Add video link")}</button>
  </fieldset>{missing > 0 && <p role="status">{missing} {t("medya eksik. Özgün dosyayı veya medya bağlantısını ekle.", "media files missing. Add the original file or media link.")}</p>}{error && <p className="form-error" role="alert">{error}</p>}
    <div className="archive-editor-actions"><button disabled={busy} onClick={() => void save("draft")}>{t("Taslağı kaydet", "Save draft")}</button><button className="submit-button" disabled={busy || missing > 0 || !draft.title.trim()} onClick={() => void save("published")}>{draft.status === "published" ? t("Yayını güncelle", "Update published post") : t("Yayımla", "Publish")}</button><button disabled={busy} onClick={async () => { if (!confirmedDelete) { setConfirmedDelete(true); return; } setBusy(true); try { const response = await fetch("/api/social", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action: "delete", id: draft.id, revision: draft.revision }) }); const data = await response.json() as {error?:string}; if (!response.ok) throw new Error(data.error); onSaved(); } catch (cause) { setError(cause instanceof Error ? cause.message : t("Silinemedi.", "Could not delete.")); } finally { setBusy(false); } }}>{confirmedDelete ? t("Silme işlemini onayla", "Confirm deletion") : t("Paylaşımı sil", "Delete post")}</button>{confirmedDelete && <button onClick={() => setConfirmedDelete(false)}>{t("Silmekten vazgeç", "Cancel deletion")}</button>}</div>
  </section>;
}
export default function SocialArchive({ language, admin, query = "", platform = "", kind = "all", entry, onFilter, onSelect }: Props) {
  const t = (tr: string, en: string) => language === "en" ? en : tr;
  const [input, setInput] = useState(query), [status, setStatus] = useState("published"), [page, setPage] = useState<Page | null>(null), [busy, setBusy] = useState(false), [error, setError] = useState(""), [reload, setReload] = useState(0), [editing, setEditing] = useState<SocialPost | null>(null), [importing, setImporting] = useState(false);
  const [selection,setSelection]=useState<Set<string>>(new Set()),[publishing,setPublishing]=useState(false),[notice,setNotice]=useState("");
  const sequence = useRef(0), filterId = [query, platform, kind, entry, status, reload].join("|");
  useEffect(() => { setInput(query); }, [query]);
  useEffect(() => { const timer = setTimeout(() => { if (input !== query) onFilter(input, platform, kind); }, 300); return () => clearTimeout(timer); }, [input, query, platform, kind, onFilter]);
  async function load(offset = 0) {
    const id = ++sequence.current; setBusy(true); setError("");
    try { const params = new URLSearchParams({ offset: String(offset), status }); if (query) params.set("q", query); if (platform) params.set("platform", platform); if (kind !== "all") params.set("kind", kind); if (entry && !entry.startsWith("source-")) params.set("id", entry);
      const response = await fetch("/api/social?" + params, { cache: "no-store" }); if (!response.ok) throw new Error(); const data = await response.json() as Page; if (id !== sequence.current) return;
      setPage(previous => offset && previous ? { ...data, records: [...new Map([...previous.records, ...data.records].map(post => [post.id, post])).values()] } : data);
    } catch { if (id === sequence.current) setError(t("Paylaşım arşivi yüklenemedi. Yeniden deneyebilirsin.", "The post archive could not be loaded. You can retry.")); }
    finally { if (id === sequence.current) setBusy(false); }
  }
  useEffect(() => { setPage(null); setEditing(null); setSelection(new Set()); void load(); return () => { sequence.current++; }; }, [filterId, language]);
  const seeded = status === "published" && !page?.records.some(post => post.sourceUrl === sourcedSocialPosts[0].sourceUrl) ? sourcedSocialPosts.filter(post => (!entry || entry === post.id) && (!platform || post.platform === platform) && (kind === "all" || socialKind(post) === kind) && (!query || socialSearchText(post.title + " " + post.text).includes(socialSearchText(query)))) : [];
  const selected = entry ? page?.records.filter(post => post.id === entry) || [] : page?.records || [];
  const records = [...seeded, ...selected];
  const eligible = records.filter(post=>post.status === "draft" && !unresolvedSocialMedia(post).length);
  async function publishSelected() {
    if(publishing || !selection.size)return;setPublishing(true);setError("");setNotice("");
    try {
      const response=await fetch("/api/social",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({action:"publishSelected",records:records.filter(post=>selection.has(post.id)).map(({id,revision})=>({id,revision}))})});
      const result=await response.json() as {published?:number;error?:string};if(!response.ok)throw new Error(result.error);
      setNotice(t(`${result.published} paylaşım yayımlandı.`,`${result.published} posts published.`));refresh();
    }catch(cause){setError(cause instanceof Error ? cause.message : t("Paylaşımlar yayımlanamadı.","Posts could not be published."));}finally{setPublishing(false);}
  }
  const refresh = () => { setEditing(null); setReload(value => value + 1); };
  return <section className="social-archive view-surface">
    <header className="archive-heading"><div><span className="eyebrow">ORMAN MÜHENDİSİ</span><h1>{t("Doğaya dair. Bir arada.", "Nature stories. Together.")}</h1><p>{t("Sosyal hesaplarımızdaki fotoğraflar, videolar ve doğa yazıları için tek bir arşiv.", "One archive for photographs, videos and nature stories from our social accounts.")}</p></div>{admin && <button onClick={() => setImporting(!importing)} aria-expanded={importing}><Icon name="plus"/>{t("Arşiv ekle", "Add archive")}</button>}</header>
    <nav className="archive-accounts" aria-label={t("Orman Mühendisi sosyal hesapları", "Orman Mühendisi social accounts")}>{socialAccounts.map(account => <a key={account.platform} href={account.url} target="_blank" rel="noreferrer"><span className="archive-network-mark" aria-hidden="true"><SocialMark platform={account.platform}/></span><span><strong>{account.name}</strong><small>{account.handle}</small></span><span aria-hidden="true">↗</span></a>)}</nav>
    <p className="archive-coverage-note">{t("Burada yalnızca siteye aktarılmış paylaşımlar görünür. Sosyal hesapların tamamı henüz eşitlenmedi.", "Only posts imported to the site appear here. The full social accounts have not been synced yet.")}</p>
    {admin && importing && <SocialImporter language={language} onImported={() => { setStatus("draft"); refresh(); }}/>} {editing && <SocialEditor key={editing.id} post={editing} language={language} onClose={() => setEditing(null)} onSaved={refresh}/>}
    {entry && <button className="archive-back" onClick={() => onSelect()}><span aria-hidden="true">‹</span>{t("Tüm paylaşımlar", "All posts")}</button>}
    {!entry && <div className="archive-toolbar"><label className="archive-search"><Icon name="search"/><input value={input} maxLength={200} onChange={event => setInput(event.target.value)} placeholder={t("Paylaşımlarda ara…", "Search posts…")} aria-label={t("Paylaşımlarda ara", "Search posts")}/>{input && <button onClick={() => setInput("")} aria-label={t("Aramayı temizle", "Clear search")}><Icon name="close"/></button>}</label><label className="archive-network-filter"><span className="sr-only">{t("Platform", "Platform")}</span><SearchSelect value={platform} onChange={event => onFilter(query, event.target.value, kind)}><option value="">{t("Tüm hesaplar", "All accounts")}</option>{socialAccounts.map(account => <option key={account.platform} value={account.platform}>{account.name}</option>)}</SearchSelect></label><div className="archive-kind-filter" aria-label={t("İçerik türü", "Content type")}>{[["all", t("Tümü", "All")], ["photo", t("Fotoğraflar", "Photos")], ["video", t("Videolar", "Videos")], ["article", t("Yazılar", "Articles")]].map(([value, label]) => <button key={value} aria-pressed={kind === value} onClick={() => onFilter(query, platform, value)}>{label}</button>)}</div></div>}
    {admin && <div className="archive-admin-toolbar"><div><button aria-pressed={status === "published"} onClick={() => setStatus("published")}>{t("Yayımlanan", "Published")}</button><button aria-pressed={status === "draft"} onClick={() => setStatus("draft")}>{t("Taslaklar", "Drafts")}</button></div><button onClick={() => setEditing({ id: clientId(), platform: "instagram", title: "", text: "", publishedAt: "", sourceUrl: "", media: [], status: "draft", revision: 0 })}><Icon name="plus"/>{t("Yeni paylaşım", "New post")}</button></div>}
    {admin && status === "draft" && records.length > 0 && <div className="archive-bulk-toolbar"><button disabled={publishing || !eligible.length} onClick={()=>setSelection(selection.size ? new Set() : new Set(eligible.slice(0,20).map(post=>post.id)))}>{selection.size ? t("Seçimi kaldır","Clear selection") : t("Hazır taslakları seç · en fazla 20","Select ready drafts · up to 20")}</button><button disabled={publishing || !selection.size} onClick={()=>void publishSelected()}>{publishing ? t("Yayımlanıyor…","Publishing…") : t(`Seçilenleri yayımla · ${selection.size}`,`Publish selected · ${selection.size}`)}</button></div>}
    {notice && <p role="status" className="archive-coverage-note">{notice}</p>}
    {error && <div className="archive-error" role="alert"><p>{error}</p><button disabled={busy} onClick={() => void load(page?.records.length || 0)}>{t("Yeniden dene", "Retry")}</button></div>}
    {!busy && !records.length && !error && <div className="archive-empty"><Icon name="paper"/><h2>{entry ? t("Paylaşım bulunamadı.", "Post not found.") : query || platform || kind !== "all" ? t("Bu filtrede paylaşım yok.", "No posts match these filters.") : status === "draft" ? t("Arşivin için yer hazır.", "Ready for your archive.") : t("Yeni paylaşımlar için yer hazır.", "Ready for new posts.")}</h2><p>{status === "draft" ? t("Gönderi dosyanı ekleyerek paylaşımlarını aktar.", "Add your post file to import your archive.") : t("Hesap bağlantılarından özgün içeriklere de ulaşabilirsin.", "You can also reach original content through the account links.")}</p>{query || platform || kind !== "all" ? <button onClick={() => onFilter("", "", "all")}>{t("Filtreleri temizle", "Clear filters")}</button> : admin && <button onClick={() => setImporting(true)}>{t("Arşiv ekle", "Add archive")}</button>}</div>}
    {page && !entry && <p className="archive-result-count">{page.total + seeded.length} {t("sitedeki paylaşım", "posts on the site")}</p>}
    <div className="archive-grid" data-detail={Boolean(entry)}>{records.map(post => <div key={post.id}>{admin && post.status === "draft" && <label className="archive-select-row"><input type="checkbox" checked={selection.has(post.id)} disabled={publishing || unresolvedSocialMedia(post).length > 0 || selection.size >= 20 && !selection.has(post.id)} onChange={()=>setSelection(previous=>{const next=new Set(previous);if(next.has(post.id))next.delete(post.id);else next.add(post.id);return next;})}/><span>{t("Seç","Select")} · {post.title}</span></label>}<SocialArchiveCard post={post} language={language} onSelect={onSelect}/>{admin && !post.id.startsWith("source-") && <button className="archive-edit-button" disabled={publishing} onClick={() => { setEditing(post); requestAnimationFrame(() => document.querySelector(".archive-editor")?.scrollIntoView({ block: "start" })); }}>{post.status === "draft" ? t("İncele ve yayımla", "Review and publish") : t("Düzenle", "Edit")} {unresolvedSocialMedia(post).length > 0 && <span>· {unresolvedSocialMedia(post).length} {t("medya eksik", "media missing")}</span>}</button>}</div>)}</div>
    {busy && <div className="archive-loading" role="status"><span className="feed-spinner"/>{t("Paylaşımlar yükleniyor…", "Loading posts…")}</div>}{page?.hasMore && !entry && <button className="archive-more" disabled={busy} onClick={() => void load(page.records.length)}>{t("Daha fazla paylaşım", "More posts")}</button>}
  </section>;
}
