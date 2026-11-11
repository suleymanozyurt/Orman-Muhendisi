"use client";
import { requestShare } from "./share";
import SearchSelect from "./search-select";
import { useCallback, useEffect, useId, useRef, useState, lazy, Suspense, memo, type ReactNode } from "react";
import PhotoAlbum from "./photo-album";
import ActionSheet from "./action-sheet";
import { useDialogScrollLock } from "./use-dialog-scroll-lock";
import { Icon } from "./icons";
import type { Engagement, FeedRecord } from "./feed-data";
import type { Plant } from "./plant-data";
import { translate, type Language } from "./i18n";
const SocialArchivePreview=lazy(()=>import("./social-archive-preview"));
type LocalPost = { id: string; plantId?: string; authorId?:string; owner?:boolean };
import type {CommunityData,CommunityStory} from "./community-types";
import { SelectionQueue, selectedIds } from "./selection-queue";
import { communityWithFollowing } from "./community-selection";
export type FollowTools={following:boolean;busy:boolean;toggle:()=>void};
type Props = { onSocial: (id?:string)=>void; active: boolean; localPage: {ready: boolean; count: number; hasMore: boolean}; initialTab?: string; onTabChange?: (tab: string) => void; language: Language; plants: Plant[]; posts: LocalPost[]; renderPost: (post: LocalPost,tools?:FollowTools) => ReactNode; liked: string[]; saved: string[]; engagement: Record<string, Engagement>; name: string; onCreate: () => void; onIdentify: () => void; onPlant: (id: string) => void; onFlora:(id:number)=>void; onGlobal: (name: string) => void; onMap: (name: string) => void; onToggle: (kind: "liked" | "saved", id: string) => Promise<unknown>; onComment: (id: string, value: string) => Promise<unknown>; onMoreLocal: (offset: number,following?:boolean) => Promise<{ count: number; hasMore: boolean }> };
function RemotePost({ record, p }: { record: FeedRecord; p: Props }) {
  const t = (tr: string, en: string) => p.language === "en" ? en : tr;
  const [photo, setPhoto] = useState(0);
  const [commentOpen, setCommentOpen] = useState(false);
  const [draft, setDraft] = useState("");
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const comments = p.engagement[record.id]?.comments || [];
  const liked = p.liked.includes(record.id), saved = p.saved.includes(record.id);
  const species = p.plants.find(plant => record.name === plant.latin.split(" ").slice(0, 2).join(" "));
  const openSpecies = () => species ? p.onPlant(species.id) : p.onGlobal(record.name);
  const credit = record.photos[photo];
  const share = () => {
    const url = new URL('/', window.location.origin); url.searchParams.set('view', 'home'); url.searchParams.set('observation', record.id.slice(5));
    requestShare({ url: String(url), title: record.name, image: record.photos[0]?.url });
  };
  return <article className="social-post" id={`gozlem-${record.id}`}>
    <header className="social-post-head"><span className="social-avatar">{record.author[0]?.toLocaleUpperCase(p.language) || <Icon name="leaf" />}</span><div><strong data-user-content>{record.author || t("Bitki gözlemi", "Plant observation")}</strong><small data-user-content>{record.location || t("Dünyadan", "From around the world")}</small></div><span className="source-badge">{t("Saha kaydı","Field record")}</span></header>
    <PhotoAlbum photos={record.photos} name={species ? translate(species.name, p.language) : record.name} language={p.language} onPhotoChange={setPhoto}/>
    <div className="social-actions"><button aria-label={t("Beğen", "Like")} aria-pressed={liked} className={liked ? "is-liked" : ""} onClick={() => void p.onToggle("liked", record.id)}><Icon name="heart" /></button><button aria-label={t("Yorum yap", "Comment")} aria-expanded={commentOpen} onClick={() => setCommentOpen(!commentOpen)}><Icon name="comment" /></button><button aria-label={t("Paylaş", "Share")} onClick={share}><Icon name="share" /></button><button className={saved ? "is-saved" : ""} aria-label={t("Kaydet", "Save")} aria-pressed={saved} onClick={() => void p.onToggle("saved", record.id)}><Icon name="save" /></button></div>
    <div className="social-caption">{Boolean(p.engagement[record.id]?.likeCount) && <strong className="social-like-count">{p.engagement[record.id].likeCount} {t("beğeni", "likes")}</strong>}<button className="social-species" onClick={openSpecies}><strong>{species ? translate(species.name, p.language) : record.name}</strong>{species && <em>{record.name}</em>}<span>{t("Tür künyesi", "Species profile")}</span></button><div className="feed-species-links"><span>{record.family}</span><button onClick={() => p.onMap(record.name)}><Icon name="pin" />{t("Haritada gör", "View on map")}</button></div>{comments.length > 0 && <button className="view-comments" onClick={() => setCommentOpen(!commentOpen)}>{t(`${comments.length} yorumu gör`, `View ${comments.length} comments`)}</button>}<time dateTime={record.date}>{record.date ? new Date(record.date + "T12:00:00").toLocaleDateString(p.language === "tr" ? "tr-TR" : "en-GB", { day: "numeric", month: "long", year: "numeric" }) : t("Tarih belirtilmemiş", "Date not provided")}</time><details className="feed-credit"><summary>{t("Fotoğraf ve kaynak bilgisi", "Photo and source information")}</summary><p data-user-content>{credit?.credit}</p><a href={credit?.license} target="_blank" rel="noreferrer">{credit?.license.includes("by-sa") ? "CC BY-SA" : credit?.license.includes("/by/") ? "CC BY" : "CC0 / Public domain"}</a><span> · </span><a href={`https://www.gbif.org/occurrence/${record.id.slice(5)}`} target="_blank" rel="noreferrer">{t("Özgün veri kaydı", "Original data record")}</a><p>{t("Bu kayda buradan eklenen beğeni ve yorumlar Orman Mühendisi topluluğuna aittir.", "Likes and comments added here belong to the Orman Mühendisi community.")}</p></details></div>
    {commentOpen && <div className="social-comments">{comments.map((c, i) => <p key={i} data-user-content><strong>{c.author}</strong> {c.text}</p>)}<form aria-busy={busy} onSubmit={async e => { e.preventDefault(); if (!draft.trim() || busy) return; setBusy(true); setError(""); try { if(await p.onComment(record.id, draft.trim())!==false)setDraft(""); } catch { setError(t("Yorum kaydedilemedi. Yeniden deneyin.", "Comment could not be saved. Try again.")); } finally { setBusy(false); } }}><input disabled={busy} value={draft} onChange={e => setDraft(e.target.value)} maxLength={300} placeholder={t("Yorum ekle…", "Add a comment…")} aria-label={t("Yorum", "Comment")} /><button disabled={busy || !draft.trim()}>{busy ? "…" : t("Gönder", "Post")}</button></form></div>}{error && <p className="feed-message" role="status">{error}</p>}
  </article>;
}
function SocialFeed(p: Props) {
  const feedPanelId = useId();
  const t = (tr: string, en: string) => p.language === "en" ? en : tr;
  const [tab, setTab] = useState(p.initialTab || "all");
  useEffect(() => { setTab(p.initialTab || "all"); }, [p.initialTab]);
  const [scope, setScope] = useState("TR");
  const [records, setRecords] = useState<FeedRecord[]>([]);
  const [community,setCommunity]=useState<CommunityData|null>(null),[communityError,setCommunityError]=useState(""),[communityNeedsSignIn,setCommunityNeedsSignIn]=useState(false),[followBusy,setFollowBusy]=useState<string[]>([]),[peopleOpen,setPeopleOpen]=useState(false),[peopleQuery,setPeopleQuery]=useState(""),[story,setStory]=useState<CommunityStory|null>(null);
  const followQueue=useRef(new SelectionQueue());
  const peopleDialog=useRef<HTMLDialogElement>(null),storyDialog=useRef<HTMLDialogElement>(null);
  useDialogScrollLock(peopleDialog); useDialogScrollLock(storyDialog);
  const communityRequest = useRef(0);
  const updateCommunity=useCallback(async()=>{
    const sequence=++communityRequest.current;
    try{const response=await fetch(`/api/community?q=${encodeURIComponent(peopleQuery)}`,{cache:"no-store"});if(response.status===401){if(sequence===communityRequest.current){setCommunity(null);setCommunityNeedsSignIn(true);setCommunityError("");}return;}if(!response.ok)throw new Error();const data=await response.json() as CommunityData;if(sequence!==communityRequest.current)return;setCommunity(communityWithFollowing(data,followQueue.current.apply(data.following,"following")));setCommunityNeedsSignIn(false);setCommunityError("");}
    catch{if(sequence===communityRequest.current)setCommunityError(t("Topluluk bilgisi yüklenemedi. Yeniden deneyin.","Community information unavailable. Please retry."));}
  },[peopleQuery,p.language]);
  useEffect(()=>{
    if(!p.active)return;
    const timer=window.setTimeout(()=>void updateCommunity(),peopleQuery?300:0);
    const interval=window.setInterval(()=>{if(document.visibilityState==="visible")void updateCommunity();},60000);
    const visible=()=>{if(document.visibilityState==="visible")void updateCommunity();};
    document.addEventListener("visibilitychange",visible);
    return()=>{clearTimeout(timer);clearInterval(interval);communityRequest.current++;document.removeEventListener("visibilitychange",visible);};
  },[updateCommunity,p.active]);
  async function follow(userId:string){
    if(!community||followQueue.current.isPending("following",userId))return;
    setFollowBusy(ids=>selectedIds(ids,userId,true));setCommunityError("");
    const previous=community.following.includes(userId),previousStories=community.stories.filter(item=>item.userId===userId),g=generation.current;
    const committed=await followQueue.current.toggle("following",userId,previous,{
      change:selected=>setCommunity(current=>current?communityWithFollowing(current,selectedIds(current.following,userId,selected),selected?previousStories:[]):current),
      commit:async selected=>{
        const response=await fetch("/api/community",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({userId,follow:selected})});
        if(!response.ok)throw new Error();const result=await response.json() as {userId:string;following:boolean};
        if(result.userId!==userId||result.following!==selected)throw new Error();
      },
      failed:()=>setCommunityError(t("Takip işlemi kaydedilemedi; seçim geri alındı. Yeniden deneyebilirsin.","Follow could not be saved; the selection was restored. You can retry.")),
    });
    setFollowBusy(ids=>selectedIds(ids,userId,false));
    if(!committed)return;
    await updateCommunity();
    if(!previous)try{const refreshed=await p.onMoreLocal(0,true);if(tab==="following"&&g===generation.current){nativeCursor.current=refreshed.count;setLocalMore(refreshed.hasMore);}}
    catch{setCommunityError(t("Takip kaydedildi; gözlemler şu anda yüklenemedi.","Follow saved; observations are currently unavailable."));}
  }
  function showStory(next:CommunityStory){setStory(next);storyDialog.current?.showModal();}

  const [localLimit, setLocalLimit] = useState(12);
  const [busy, setBusy] = useState(false), [error, setError] = useState("");
  const [errorKind,setErrorKind] = useState<"remote"|"native">("remote");
  const [cachedAt,setCachedAt] = useState("");
  const [hasMore, setHasMore] = useState(true), [localMore, setLocalMore] = useState(true);
  const [emptyRemotePage,setEmptyRemotePage] = useState(false);
  const cursor = useRef(0), nativeCursor = useRef(0), locked = useRef(false), generation = useRef(0);
  const remoteRequest = useRef<AbortController|null>(null);
  const sentinel = useRef<HTMLDivElement>(null);
  const load = useCallback(async () => {
    if (!p.active || locked.current || !hasMore || !["all", "saved"].includes(tab)) return;
    const controller = new AbortController(); remoteRequest.current = controller;
    locked.current = true; setBusy(true); setError(""); const g = generation.current;
    try {
      const ids = tab === "saved" ? p.saved.filter(id => id.startsWith("gbif:")).map(id => id.slice(5)) : [];
      if (tab === "saved" && !ids.length) { setHasMore(false); return; }
      const query = tab === "saved" ? `ids=${ids.slice(cursor.current, cursor.current + 12).join(",")}` : `offset=${cursor.current}&scope=${scope}`;
      const response = await fetch(`/api/feed?${query}`, {signal:controller.signal});
      if (!response.ok) throw new Error();
      const data = await response.json() as { records: FeedRecord[]; nextOffset: number; hasMore: boolean; cached?:boolean; fetchedAt?:string };
      if (controller.signal.aborted || g !== generation.current) return;
      setCachedAt(data.cached ? data.fetchedAt || "" : "");
      setRecords(previous => { const existing = new Set(previous.map(r => r.id)); return [...previous, ...data.records.filter(r => !existing.has(r.id))]; });
      cursor.current = tab === "saved" ? cursor.current + 12 : data.nextOffset;
      const more = tab === "saved" ? cursor.current < ids.length : data.hasMore;
      setHasMore(more); setEmptyRemotePage(more && data.records.length === 0);
    } catch { if (!controller.signal.aborted && g === generation.current) {setErrorKind("remote");setError(t("Akış yüklenemedi. Yeniden deneyin.", "Feed unavailable. Please try again."));} }
    finally {
      if (remoteRequest.current === controller) remoteRequest.current = null;
      if (g === generation.current) { locked.current = false; setBusy(false); }
    }
  }, [hasMore, scope, tab, p.saved, p.language, p.active]);
  useEffect(() => () => remoteRequest.current?.abort(), [scope,tab,p.active]);
  useEffect(() => { generation.current++; cursor.current = 0; locked.current = false; setRecords([]); setHasMore(true); setEmptyRemotePage(false); setBusy(false); setError(""); setCachedAt(""); setLocalLimit(12); }, [scope, tab]);
  useEffect(() => { if (!records.length && !busy && !error && hasMore && !emptyRemotePage) void load(); }, [load, records.length, busy, error, hasMore, emptyRemotePage]);
  useEffect(() => { const url = new URL(window.location.href); if (url.searchParams.get("feed") === "saved") setTab("saved"); const id = url.searchParams.get("observation"); if (id && /^\d{1,16}$/.test(id)) { const controller = new AbortController(); fetch(`/api/feed?ids=${id}`, { signal: controller.signal }).then(async response => { if (!response.ok) throw new Error(); return response.json() as Promise<{ records: FeedRecord[] }>; }).then(data => setRecords(previous => [...data.records, ...previous.filter(record => record.id !== `gbif:${id}`)])).catch(() => {}); return () => controller.abort(); } }, []);
  const observationId = typeof window !== "undefined" ? new URL(window.location.href).searchParams.get("observation") || window.location.hash.replace(/^#gozlem-/, "") : "";
  const local = p.posts.filter(post => tab === "following" ? Boolean(post.authorId&&community?.following.includes(post.authorId)) : tab === "saved" ? p.saved.includes(post.id) : tab === "pending" ? !post.plantId : true);
  const linkedPost = p.posts.find(post => post.id === observationId);
  const shownLocal = linkedPost ? [linkedPost, ...local.filter(post => post.id !== linkedPost.id)] : local;
  const moreLocal = useCallback(async () => {
    if (!p.active || !p.localPage.ready || locked.current) return;
    if (localLimit < local.length && !error) { setLocalLimit(v => v + 12); return; }
    if (!localMore) return;
    locked.current = true; setBusy(true); setError(""); const g=generation.current;
    try { const result = await p.onMoreLocal(nativeCursor.current,tab==="following"); if(g!==generation.current)return;nativeCursor.current += result.count; setLocalMore(result.hasMore); setLocalLimit(v => v + 12); }
    catch { if(g===generation.current){setErrorKind("native");setError(t("Topluluk akışı yüklenemedi.", "Community feed unavailable."));} }
    finally { if(g===generation.current){locked.current = false; setBusy(false);} }
  }, [localLimit, local.length, localMore, p.onMoreLocal, p.language,tab,p.active,p.localPage.ready,error]);
  useEffect(() => {
    if (!p.active || !p.localPage.ready || !sentinel.current || error || busy) return;
    const observer = new IntersectionObserver(entries => { if (!entries[0].isIntersecting) return; if (localLimit < local.length || localMore) void moreLocal(); else if (["all", "saved"].includes(tab) && hasMore && !emptyRemotePage) void load(); }, { rootMargin: "700px" });
    observer.observe(sentinel.current); return () => observer.disconnect();
  }, [load, moreLocal, busy, error, hasMore, localMore, local.length, localLimit, tab,p.active,p.localPage.ready,emptyRemotePage]);
  useEffect(()=>{
    if(!p.localPage.ready)return;
    nativeCursor.current=tab==="following"?0:p.localPage.count;
    setLocalMore(tab==="following"?true:p.localPage.hasMore);
    if(tab!=="following"||!p.active)return;
    const g=generation.current;locked.current=true;setBusy(true);
    void p.onMoreLocal(0,true).then(result=>{if(g!==generation.current)return;nativeCursor.current=result.count;setLocalMore(result.hasMore);})
      .catch(()=>{if(g===generation.current){setErrorKind("native");setError(t("Takip akışı yüklenemedi.","Following feed unavailable."));}})
      .finally(()=>{if(g===generation.current){locked.current=false;setBusy(false);}});
  },[tab,p.localPage.ready,p.localPage.count,p.localPage.hasMore,p.onMoreLocal,p.active]);
  useEffect(()=>{
    if(!p.active||!p.localPage.ready)return;
    const refresh=()=>{if(document.visibilityState==="visible")void p.onMoreLocal(0,tab==="following").catch(()=>{});};
    const timer=window.setInterval(refresh,60000);document.addEventListener("visibilitychange",refresh);
    return()=>{clearInterval(timer);document.removeEventListener("visibilitychange",refresh);};
  },[tab,p.onMoreLocal,p.active,p.localPage.ready]);
  return <div className="social-home"><div className="feed-top"><h2>{t("Doğadan gelenler", "From the field")}<span>{t("Fotoğraflar, gözlemler ve keşifler", "Photos, observations and discoveries")}</span></h2><div className="feed-top-actions"><button onClick={p.onIdentify} aria-label={t("Bitki tanımla", "Identify a plant")} title={t("Bitki tanımla", "Identify a plant")}><Icon name="leaf" /></button><button onClick={p.onCreate} aria-label={t("Gözlem paylaş", "Share an observation")} title={t("Gözlem paylaş", "Share an observation")}><Icon name="camera" /></button></div></div><div className="feed-tab-row"><div className="feed-tabs" role="tablist" aria-label={t("Akış", "Feed")} onKeyDown={event => {
    if (!["ArrowLeft", "ArrowRight", "Home", "End"].includes(event.key)) return;
    const buttons = Array.from(event.currentTarget.querySelectorAll<HTMLButtonElement>("button[role=tab]")).filter(button => button.getBoundingClientRect().width > 0);
    const current = buttons.indexOf(event.target as HTMLButtonElement); if (current < 0 || !buttons.length) return;
    event.preventDefault(); const next = event.key === "Home" ? 0 : event.key === "End" ? buttons.length - 1 : (current + (event.key === "ArrowRight" ? 1 : -1) + buttons.length) % buttons.length;
    buttons[next].focus(); buttons[next].click();
  }}>{[["all", t("Senin için", "For you")], ["following",t("Takip ettiklerin","Following")], ["community", t("Topluluk", "Community")], ["pending", t("Tür bekliyor", "Needs identification")], ["saved", t("Kaydedilenler", "Saved")]].map(([key, label]) => <button key={key} role="tab" aria-selected={tab === key} aria-controls={feedPanelId} tabIndex={tab === key ? 0 : -1} data-feed-tab={key} className={tab === key ? "active" : ""} onClick={() => { setTab(key); p.onTabChange?.(key); }}><span className="feed-tab-wide">{label}</span><span className="feed-tab-short">{key==="following"?t("Takip", "Following"):label}</span></button>)}</div><ActionSheet title={t("Akış seçenekleri","Feed options")} language={p.language} compact className="mobile-feed-options"><div className="sheet-section"><h3>{t("Akış","Feed")}</h3>{[["community",t("Topluluk","Community")],["pending",t("Tür bekliyor","Needs identification")],["saved",t("Kaydedilenler","Saved")]].map(([value,label])=><button key={value} aria-pressed={tab===value} onClick={()=>{setTab(value);p.onTabChange?.(value);}}>{label}</button>)}</div><div className="sheet-section"><h3>{t("Bölge","Region")}</h3><button aria-pressed={scope==="TR"} onClick={()=>setScope("TR")}>Türkiye</button><button aria-pressed={scope==="world"} onClick={()=>setScope("world")}>{t("Dünya","World")}</button></div><div className="sheet-section"><button onClick={()=>{setPeopleOpen(true);peopleDialog.current?.showModal();}}>{t("Kişileri keşfet","Find people")}</button><button onClick={p.onIdentify}>{t("Bitki tanımla","Identify a plant")}</button></div></ActionSheet></div><div className="story-section" data-has-stories={Boolean(community?.stories.length)}><div className="story-section-heading"><span>{t("Takip ettiklerinden","From people you follow")}</span><button onClick={()=>{setPeopleOpen(true);peopleDialog.current?.showModal();}}>{t("Kişileri keşfet","Find people")} ↗</button></div><div className="species-circles"><button className="add-story" onClick={p.onCreate}><span><Icon name="camera"/><b>+</b></span><small>{t("Gözlemin","Your observation")}</small></button>{community?.stories.map(item=><button key={item.userId} className="following-story" onClick={()=>showStory(item)} title={item.author}><span><img src={item.image} alt="" loading="lazy"/></span><small data-user-content>{item.author}</small></button>)}{!community&&!communityNeedsSignIn&&!communityError&&<div className="story-loading" role="status">{t("Takip ettiğin kişiler yükleniyor…","Loading people you follow…")}</div>}{community&&!community.stories.length&&<div className="story-empty"><strong>{t("Birlikte keşfet.","Discover together.")}</strong><span>{t("Takip ettiğin kişilerin yeni gözlemleri burada görünür.","The latest observations from people you follow appear here.")}</span><button onClick={()=>{setPeopleOpen(true);peopleDialog.current?.showModal();}}>{t("Topluluğa göz at","Browse the community")}</button></div>}</div>{communityError&&<details className="community-notice"><summary>{t("Topluluk bağlantısı","Community connection")}</summary><p role="status">{communityError} <button onClick={()=>void updateCommunity()}>{t("Yeniden dene","Retry")}</button></p></details>}</div>{cachedAt&&tab==="all"&&<details className="feed-cache-notice"><summary>{t("Arşivden gösteriliyor","Showing archived records")}</summary><p role="status">{t("Canlı akış geçici olarak kullanılamıyor. Kaynağı doğrulanmış sınırlı kayıtlar gösteriliyor.","Live feed is temporarily unavailable. Showing a limited set of verified source records.")} <time dateTime={cachedAt}>{new Date(cachedAt).toLocaleDateString(p.language==="en"?"en-GB":"tr-TR")}</time></p></details>}{tab === "all" && <div className="feed-scope"><span>{t("Fotoğraflı gözlemler", "Photo observations")}</span><label className="sr-only" htmlFor="feed-scope">{t("Bölge", "Region")}</label><SearchSelect id="feed-scope" value={scope} onChange={e => setScope(e.target.value)}><option value="TR">{t("Türkiye", "Türkiye")}</option><option value="world">{t("Dünya", "World")}</option></SearchSelect></div>}{tab==="following"&&!shownLocal.length&&!busy&&<div className="following-empty"><Icon name="user"/><h2>{t("Takip akışın","Your following feed")}</h2><p>{t("Gözlemlerini görmek istediğin kişileri takip et.","Follow people whose observations you want to see.")}</p><button onClick={()=>{setPeopleOpen(true);peopleDialog.current?.showModal();}}>{t("Kişileri keşfet","Find people")}</button></div>}{tab==="all"&&<Suspense fallback={null}><SocialArchivePreview language={p.language} active={p.active} onOpen={p.onSocial}/></Suspense>}<div className="instagram-feed" id={feedPanelId} role="tabpanel" aria-label={t("Gözlemler", "Observations")}>{shownLocal.slice(0, localLimit).map(post => p.renderPost(post,post.authorId&&!post.owner?{following:Boolean(community?.following.includes(post.authorId)),busy:followBusy.includes(post.authorId),toggle:()=>void follow(post.authorId!)}:undefined))}{["all", "saved"].includes(tab) && records.map(record => <RemotePost key={record.id} record={record} p={p} />)}</div><div className="feed-sentinel" ref={sentinel} role="status">{busy && <><span className="feed-spinner" />{t("Yeni gözlemler yükleniyor…", "Loading more observations…")}</>}{error && <><p>{error}</p><button onClick={() => errorKind === "remote" ? void load() : void moreLocal()}>{t("Yeniden dene", "Try again")}</button></>}{!busy&&!error&&hasMore&&emptyRemotePage&&["all","saved"].includes(tab)&&<button type="button" onClick={()=>void load()}>{t("Daha fazla gözlem göster","Show more observations")}</button>}{!busy && !error && (!hasMore || !["all", "saved"].includes(tab)) && !localMore && localLimit >= local.length && <p>{t("Bu akıştaki tüm gözlemleri gördün.", "You have seen every observation in this feed.")}</p>}</div><dialog ref={peopleDialog} className="people-dialog" aria-labelledby="people-title" onClose={()=>setPeopleOpen(false)}><div className="dialog-title"><h2 id="people-title">{t("Birlikte keşfet","Discover together")}</h2><button onClick={()=>peopleDialog.current?.close()} aria-label={t("Kapat","Close")}>×</button></div><p>{t("Paylaşılan gözlemleri olan kullanıcıları takip et. Taslaklar ve onay bekleyen fotoğraflar burada görünmez.","Follow people with shared observations. Drafts and pending photos remain private.")}</p><input value={peopleQuery} onChange={event=>setPeopleQuery(event.target.value)} placeholder={t("Kullanıcı adı ara…","Search people…")} aria-label={t("Kişi ara","Search people")}/><small>{community?.followingCount||0} {t("takip edilen","following")} · {community?.followerCount||0} {t("takipçi","followers")}</small>{community?.people.map(person=><div className="community-person" key={person.id}><span className="social-avatar">{person.name[0]}</span><span><strong data-user-content>{person.name}</strong><small>{person.count} {t("paylaşılan gözlem","shared observations")}</small></span><button disabled={followBusy.includes(person.id)} aria-busy={followBusy.includes(person.id)} aria-pressed={person.following} onClick={()=>void follow(person.id)}>{person.following?t("Takibi bırak","Unfollow"):t("Takip et","Follow")}</button></div>)}{community&&!community.people.length&&<p>{t("Bu aramada paylaşılan gözlemi olan başka kullanıcı bulunamadı.","No other people with shared observations match this search.")}</p>}{communityNeedsSignIn&&<p>{t("Kişileri takip etmek için Profil’den giriş yap.","Sign in from Profile to follow people.")}</p>}{communityError&&<p role="alert">{communityError}</p>}</dialog><dialog ref={storyDialog} className="story-dialog" aria-labelledby="story-author"><div className="dialog-title"><h2 id="story-author" data-user-content>{story?.author}</h2><button onClick={()=>storyDialog.current?.close()} aria-label={t("Kapat","Close")}>×</button></div>{story&&<><img className="story-observation-photo" src={story.image} alt={t("Paylaşılan gözlem","Shared observation")}/><time>{new Date(story.date).toLocaleDateString(p.language==="en"?"en-GB":"tr-TR")}</time><p data-user-content>{story.note}</p><div className="story-actions">{story.plantId&&<button onClick={()=>{storyDialog.current?.close();if(story.plantId!.startsWith("flora-"))p.onFlora(Number(story.plantId!.slice(6)));else p.onPlant(story.plantId!);}}>{t("Bitki bilgileri","Plant information")} ↗</button>}<button disabled={followBusy.includes(story.userId)} aria-busy={followBusy.includes(story.userId)} aria-pressed={community?.following.includes(story.userId)} onClick={()=>void follow(story.userId)}>{community?.following.includes(story.userId)?t("Takibi bırak","Unfollow"):t("Takip et","Follow")}</button></div></>}</dialog></div>;
}

export default memo(SocialFeed,(previous,next)=>!previous.active&&!next.active&&previous.language===next.language);
