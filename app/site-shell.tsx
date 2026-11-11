"use client";
import {clientId} from "./client-id";
import { routeLoaders, warmRoute } from "./route-components";
import { SelectionQueue, selectedIds } from "./selection-queue";
import { TextSubmissionQueue } from "./text-submission";
import { preserveOpenFieldDraft } from "./field-navigation";
import { NavigationMemory, entryState, keepsRouteContext, readEntry, restoreWhenReady } from "./navigation-memory";
import { dialogEntry, withoutDialogEntry } from "./dialog-history";
import SearchSelect from "./search-select";
import type {FloraRecord} from "./tubives-types";
import AccountAccess, {AccountPanel} from "./account-access";

import { lazy, memo, Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, useId } from "react";
import { emptyCatalog, type CatalogState } from "./catalog-state";
import {emptySourceCatalog,type SourceCatalogQuery} from "./source-catalog-query";
import {emptyGbif,type GbifQuery} from "./gbif-query";
import PhotoAlbum from "./photo-album";
import ResponsivePhoto from "./responsive-photo";
import MobileDock from "./mobile-dock";
const HomeIntro = lazy(() => import("./home-intro"));
import SectionMenu, {SectionShortcuts,SectionTools} from "./section-menu";
import PageTabs from "./page-tabs";
import { siteSections,sectionHubs,hubForSection } from "./site-sections";
import AddMenu, {warmLens} from "./add-menu";
import type { LensCaptureControl } from "./lens-capture";
import SocialConnections from "./social-connections";
import ShareSheet from "./share-sheet";
import { requestShare, type ShareTarget } from "./share";
import { canonicalRoute } from "./seo";
import LinkPreviewCard from "./link-preview-card";
import type { LinkPreview } from "./link-preview";
import type { SharedObservation } from "./shared-content";
import type { ObservationPhotoBatch } from "./lens-types";
import ActionSheet from "./action-sheet";
import RouteSurface from "./route-surface";
import KeptSection from "./kept-section";
import { routeMotion, animateSurface } from "./surface-motion";
import PwaRuntime from "./pwa-runtime";
import NavItem, {type NavChoice} from "./nav-item";
import { mergeObservationPage } from "./feed-page";
import { useDialogScrollLock } from "./use-dialog-scroll-lock";
import { sectionMenuGeometry } from "./section-menu-geometry";
import { botanicalAccount } from "./botanical-accounts";
import SocialFeed, {type FollowTools} from "./social-feed";
const TubiCatalog=lazy(routeLoaders.floraCatalog);
import ProfileSettings from "./profile-settings";
const CuratedTaxonomy=lazy(() => import("./curated-taxonomy"));
const VernacularNames=lazy(() => import("./vernacular-names"));
import { Icon } from "./icons";
import type { Engagement } from "./feed-data";
import { SearchPanel } from "./search-panel";
import { translate, translateTree, type Language } from "./i18n";
import { glossary, plantOptions, plants as starterPlants, type Plant } from "./plant-data";

import { readSiteRoute, siteRouteUrl, type SiteRoute, type View } from "./navigation";
const SearchResults=lazy(routeLoaders.search);
const PlantAssistant=lazy(routeLoaders.assistant);
const Explorer=lazy(routeLoaders.explorer);
const TubiDetail=lazy(routeLoaders.floraDetail);
const PlantHealth=lazy(routeLoaders.health);
const FungiLibrary=lazy(routeLoaders.fungi);
const NatureExplorer=lazy(routeLoaders.nature);
const ResourceHub=lazy(routeLoaders.resources);
const Marketplace=lazy(routeLoaders.market);
const CareLibrary=lazy(routeLoaders.care);
const Discover=lazy(routeLoaders.photos);
const LifeDiscover=lazy(routeLoaders.life);
const TaxonomyExplorer=lazy(routeLoaders.taxonomy);
const LifePath=lazy(routeLoaders.lifePath);
const ObservationComposer=lazy(routeLoaders.composer);
const DeviceDrafts=lazy(routeLoaders.drafts);
const ObservationReview=lazy(routeLoaders.review);
const MapSettings=lazy(routeLoaders.mapSettings);
const AssistantSettings=lazy(routeLoaders.assistantSettings);
const SocialArchive=lazy(routeLoaders.social);
const GbifExplorer=lazy(routeLoaders.gbif);
const SourceCatalog=lazy(routeLoaders.catalogs);
// Keep the hidden feed's scroll and album state; catch up when it opens again.
const PersistentSocialFeed=memo(SocialFeed,(previous,next)=>!previous.active&&!next.active);
type Position = { latitude: number; longitude: number };
type Observation = {
  id: string; author: string; authorId?: string; text: string; date: string; createdAt?: string; plantId?: string;
  linkPreview?: LinkPreview; image?: string; organ?: string; position?: Position; comments: { author: string; text: string }[];
  suggestions?: { id: string; plantId: string; author: string }[];
  owner?: boolean; legacy?: boolean; likeCount?: number; status?: string; observedAt?: string; reviewNote?: string; photos?: {key:string;url:string;organ?:string}[];
};
type Collection = { id: string; name: string; items: string[] };
type Filters = { family: string; genus: string; category: string; leaf: string; form: string; habitat: string; growth: string; height: string; life: string; light: string; humidity: string; soil: string };
type StoredState = { posts: Observation[]; liked: string[]; saved: string[]; collections: Collection[]; name: string; localNames: Record<string, string[]>; leafNotes: Record<string, string>; customPlants: Plant[]; isAdmin: boolean; hasMore: boolean; externalEngagement?: Record<string, Engagement>; error?: string };
type ActionResult = { id: string; error?: string };
const emptyFilters: Filters = { family: "", genus: "", category: "", leaf: "", form: "", habitat: "", growth: "", height: "", life: "", light: "", humidity: "", soil: "" };
const sample: Observation = {
  id: "editorial", author: "Orman Mühendisi", date: "Editörün notu",
  text: "Bir sediri tanırken yalnızca genel görünüşüne bakmayın. İğne yaprakları, sürgünleri ve kozalakları birlikte inceleyin; yetiştiği yer de size önemli bir ipucu verir.",
  plantId: "cedrus-libani", comments: [],
};
const blankPlant: Plant = { id: "", name: "", latin: "", family: "", genus: "", category: "İğne yapraklı ağaçlar", leaf: "İğne", form: "Ağaç", range: "", description: "", source: "" };
const primaryNav = siteSections.map(item => ({label:item.tr,view:item.view}));
const navIcon = (view: View): Parameters<typeof Icon>[0]["name"] => siteSections.find(item=>item.view===view)?.icon || (view==="admin"?"grid":"leaf");
const sidebarPrimary: View[] = ["home", "discover", "database", "map", "explore"];
const speciesTabs = ["Künye", "Genel bilgi", "Yaprak", "Çiçek & meyve", "Gövde & kabuk", "Yayılış", "Kaynaklar"];
const speciesTab = (value?:string) => speciesTabs.includes(value||"") ? value! : "Künye";
const navChoices: Partial<Record<View,NavChoice[]>> = {
 gbif:[{label:"Dünya kayıtları",description:"GBIF kayıtları ve bilimsel örnekler",route:{view:"gbif",gbif:{...emptyGbif,country:""}}},{label:"Türkiye kayıtları",description:"Ülke, takson, yıl ve veri setiyle araştır",route:{view:"gbif",gbif:{...emptyGbif}}},{label:"Kayıt haritası",description:"Filtrelenmiş kayıtların yoğunluğu",route:{view:"gbif",tab:"map"}},{label:"Veri setleri",description:"Yayıncılar, lisanslar ve kaynak atıfları",route:{view:"gbif",tab:"datasets"}}],
 social:[{label:"Tüm paylaşımlar",description:"Sosyal hesaplarımızdan doğa yazıları",route:{view:"social",tab:"all"}},{label:"Videolar",description:"Doğayı izleyerek öğren",route:{view:"social",tab:"video"}},{label:"Fotoğraflar",description:"Fotoğraflı paylaşım arşivi",route:{view:"social",tab:"photo"}}],
 home:[{label:"Senin için",description:"Yeni fotoğraflı gözlemler",route:{view:"home",feed:"all"}},{label:"Takip ettiklerin",description:"Takip ettiğin kişilerin gözlemleri",route:{view:"home",feed:"following"}},{label:"Gözlem paylaş",description:"Fotoğraflarını saha defterine ekle",route:{view:"create"}}],
 discover:[{label:"Yaşam ağacı",description:"Bilimsel sınıflandırma",route:{view:"discover"}},{label:"Bilimsel kaynaklar",description:"Taksonomi veri sağlayıcıları",route:{view:"catalogs"}},{label:"Fotoğraflarla keşfet",description:"Doğa gözlemleri",route:{view:"explore"}}],
 database:[{label:"Türkiye florası",description:"İl, familya ve grid ile tarama",route:{view:"database",catalog:"flora"}},{label:"GBIF araştırma",description:"Canlı kayıtlar, harita ve bilimsel örnekler",route:{view:"gbif"}},{label:"Fotoğraflı künyeler",description:"Bitkileri görselleriyle tanı",route:{view:"database",catalog:"curated"}},{label:"Tür karşılaştır",description:"İki bitkinin özelliklerini yan yana gör",route:{view:"compare"}}],
 map:[{label:"Bölgesel keşif",description:"Ülke, il ve yıla göre kayıt ara",route:{view:"map",map:"regional"}},{label:"Topluluk haritası",description:"Paylaşılan saha gözlemleri",route:{view:"map",map:"community"}}],
 care:[{label:"Bugünün planı",description:"Kontrolleri tek dokunuşla tamamla",route:{view:"care",tab:"today"}},{label:"Bitkilerim",description:"Her bitkinin bakım defteri",route:{view:"care",tab:"plants"}},{label:"Bakım takvimi",description:"Yaklaşan görevler ve takvime aktarım",route:{view:"care",tab:"calendar"}},{label:"Bakım rehberleri",description:"Işık, su ve yetiştirme bilgileri",route:{view:"care",tab:"guides"}},{label:"Sağlık kontrolü",description:"Belirtileri değerlendir",route:{view:"health"}}],
 health:[{label:"Belirti değerlendirme",description:"Bitkinin sorununu araştır",route:{view:"health"}},{label:"Bakım defteri",description:"Bakım görevlerini takip et",route:{view:"care"}}],
 fungi:[{label:"Mantarlar alemi",description:"Türler, familyalar ve kaynaklı künyeler",route:{view:"fungi"}},{label:"Mantar gözlemleri",description:"Fotoğraflı saha kayıtları",route:{view:"nature",group:"fungi"}}],
 birds:[{label:"Kuşları keşfet",description:"Fotoğraflı saha kayıtları ve tür künyeleri",route:{view:"birds"}},{label:"Kuş haritası",description:"Gözlemleri konumlarıyla incele",route:{view:"birds",tab:"map"}}],
 nature:[{label:"Bitki gözlemleri",description:"Topluluğun fotoğraflı kayıtları",route:{view:"nature",group:"plants"}},{label:"Mantar gözlemleri",description:"Mantarları sahada incele",route:{view:"nature",group:"fungi"}},{label:"Kuş gözlemleri",description:"Kuşların fotoğrafları ve konumları",route:{view:"birds"}},{label:"Tüm canlılar",description:"Doğanın çeşitliliğini keşfet",route:{view:"nature",group:"all"}}],
 library:[{label:"Tür künyeleri",description:"Fotoğraf ve morfoloji bilgileri",route:{view:"library"}},{label:"Bilimsel yayınlar",description:"Botanik ve ormancılık kaynakları",route:{view:"publications"}}],
 glossary:[{label:"Botanik sözlük",description:"Terimleri ve açıklamalarını ara",route:{view:"glossary",q:""}},{label:"Türleri araştır",description:"Kavramları bitkiler üzerinde keşfet",route:{view:"database"}}],
 forestry:[{label:"Ormancılık kaynakları",description:"Projeler ve saha yöntemleri",route:{view:"forestry"}},{label:"Bilimsel yayınlar",description:"Araştırmalar ve kaynak kayıtları",route:{view:"publications"}}],
 publications:[{label:"Yayınları araştır",description:"Başlık, yazar ve konu ara",route:{view:"publications"}},{label:"Ormancılık projeleri",description:"Saha çalışmaları ve yöntemler",route:{view:"forestry"}}],
 nurseries:[{label:"Fidanlıkları keşfet",description:"Fidanlık kayıtlarını incele",route:{view:"nurseries"}},{label:"Kitap ve fidan",description:"İlanları ve ürünleri araştır",route:{view:"store"}}],
 store:[{label:"Kitap ve fidan",description:"Ürünler ve ilanlar",route:{view:"store"}},{label:"Sepetim",description:"Sepete eklediğin ürünler",route:{view:"store",tab:"cart"}}],
 collections:[{label:"Koleksiyonlarım",description:"Kaydettiğin türlerin arşivi",route:{view:"collections"}},{label:"Kaydedilen gözlemler",description:"Sonra bakmak üzere ayırdıkların",route:{view:"home",feed:"saved"}}],
 profile:[{label:"Giriş seçenekleri",description:"Google, Facebook, Apple ve diğer hesaplar",route:{view:"auth",tab:"signin"}},{label:"Gözlemlerim",description:"Kendi kayıtlarını yönet",route:{view:"profile"}},{label:"Kişisel ayarlar",description:"Dil ve görünüm tercihlerin",route:{view:"account"}},{label:"Takip ettiklerin",description:"Takip ettiğin kullanıcıların akışı",route:{view:"home",feed:"following"}},{label:"Koleksiyonlarım",description:"Kaydettiğin türlerin arşivi",route:{view:"collections"}}],
 admin:[{label:"Tür yönetimi",description:"Tür künyeleri ve düzenleme",route:{view:"admin"}},{label:"Paylaşılan gözlemler",description:"Yayımlanmış topluluk kayıtları",route:{view:"home",feed:"community"}}]
};
const sectionFor = (view: View): View => view === "search" ? "discover" : ["detail", "flora-record", "flora", "compare"].includes(view) ? "database" : view === "global-species" ? "map" : view === "auth" ? "profile" : hubForSection(view);
const read = <T,>(key: string, fallback: T): T => {
  try { const value = localStorage.getItem(key); return value ? JSON.parse(value) as T : fallback; }
  catch { return fallback; }
};
const unique = (items: string[]) => Array.from(new Set(items)).sort((a, b) => a.localeCompare(b, "tr"));
const coordinateLink = (p: Position) => `https://www.openstreetmap.org/?mlat=${p.latitude}&mlon=${p.longitude}#map=15/${p.latitude}/${p.longitude}`;
const legacyPlant = (id?: string) => ({ cedrus: "cedrus-libani", pinea: "pinus-pinea", infectoria: "quercus-infectoria" })[id as "cedrus" | "pinea" | "infectoria"] || id;

export default function Home({ initialRoute = { view: "home" },authenticated=false,accountId,initialFlora,signInUrl="/signin-with-chatgpt?return_to=%2F",initialLanguage="tr", initialObservation, sharedUnavailable = false }: { initialRoute?: SiteRoute;authenticated?:boolean;accountId?:string;initialFlora?:FloraRecord;signInUrl?:string;initialLanguage?:Language; initialObservation?:SharedObservation|null; sharedUnavailable?:boolean }) {
  const [language, setLanguage] = useState<Language>(initialLanguage);
  const [sessionReady,setSessionReady]=useState(authenticated);
  const searchDialog = useRef<HTMLDialogElement>(null);
  const menuDialog = useRef<HTMLDialogElement>(null);
  const menuTrigger = useRef<HTMLElement | null>(null);
  useDialogScrollLock(searchDialog);
  const [menuQuery,setMenuQuery]=useState("");
  const [menuOpen,setMenuOpen] = useState(false);
  const detailPanelId = `species-${useId()}`;
  const [keyboardOpen,setKeyboardOpen] = useState(false);
  const [solidControls,setSolidControls] = useState(false), [reducedMotion,setReducedMotion] = useState(false);
  const [chatOpen,setChatOpen]=useState(false);
  const chatButton=useRef<HTMLButtonElement>(null);
  const [treeRoute,setTreeRoute]=useState({source:initialRoute.treeSource||"itis",id:initialRoute.treeId||"",version:initialRoute.treeVersion||"",mode:initialRoute.treeMode||"list"});
  const [assistantPrompt,setAssistantPrompt] = useState(initialRoute.view === "assistant" ? initialRoute.q || "" : "");
  const activeRouteUrl = useRef("");
  const mainRef = useRef<HTMLElement>(null), pendingFocus = useRef(false), restoreScroll = useRef<number|null>(null);
  const incomingMotion = useRef<ReturnType<typeof routeMotion>>("none");
  const navigationMemory=useRef(new NavigationMemory()),historyEntry=useRef(""),navigationSequence=useRef(0),cancelScrollRestore=useRef<(()=>void)|null>(null);
  const rememberPosition = (write=true) => {
    if(!historyEntry.current||!activeRouteUrl.current)return;
    const url=new URL(activeRouteUrl.current),scroll=window.scrollY;
    navigationMemory.current.remember(historyEntry.current,{href:url.href,route:readSiteRoute(url.searchParams),scroll});
    if(write&&url.href===window.location.href)window.history.replaceState(entryState(window.history.state,historyEntry.current,scroll),"",url);
  };
  const replaceRoute = (url:URL) => {
    activeRouteUrl.current=url.href;
    window.history.replaceState(entryState(window.history.state,historyEntry.current,restoreScroll.current??window.scrollY),"",url);
    if(restoreScroll.current===null)rememberPosition(false);
  };
  const closeMenu = useCallback((restoreFocus = false) => {
    menuDialog.current?.close();
    if(restoreFocus)menuTrigger.current?.focus({preventScroll:true});
  },[]);
  const openMenu = () => {
    const dialog=menuDialog.current;
    if(!dialog)return;
    if(dialog.open){closeMenu(true);return;}
    menuTrigger.current=document.activeElement instanceof HTMLElement?document.activeElement:null;
    setMenuQuery("");setMenuOpen(true);dialog.show();
    dialog.scrollTo({top:0,behavior:"instant"});
    dialog.querySelector<HTMLElement>(".section-directory-body")?.scrollTo({top:0,behavior:"instant"});
    // Opening a navigation menu must not summon the phone's keyboard.
    dialog.querySelector<HTMLButtonElement>(".dialog-title button")?.focus({preventScroll:true});
  };
  useLayoutEffect(()=>{
    if(!menuOpen)return;
    const dialog=menuDialog.current;
    if(!dialog)return;
    const viewport=window.visualViewport;
    const position=()=>{
      const mobile=window.matchMedia("(max-width:1024px)").matches;
      const trigger=document.querySelector<HTMLElement>(mobile?".mobile-menu-trigger":".sidebar-section-trigger");
      const editing=dialog.contains(document.activeElement)&&document.activeElement?.matches("input,textarea,[contenteditable=true]");
      const height=viewport?.height??window.innerHeight;
      const keyboard=Boolean(editing&&(height<500||window.innerHeight-height>140));
      const dock=mobile&&!keyboard?document.querySelector<HTMLElement>(".mobile-dock-shell"):null;
      const geometry=sectionMenuGeometry({viewportTop:viewport?.offsetTop??0,viewportHeight:height,anchorBottom:trigger?.getBoundingClientRect().bottom??76,bottomInset:dock?.getBoundingClientRect().height??0});
      dialog.style.setProperty("--section-menu-top",`${geometry.top}px`);
      dialog.style.setProperty("--section-menu-height",`${geometry.height}px`);
      dialog.dataset.compact=String(geometry.compact);
    };
    const dismiss=(event:Event)=>{
      const target=event.target;
      if(!(target instanceof Element)||dialog.contains(target)||target.closest(".mobile-menu-trigger,.sidebar-section-trigger"))return;
      closeMenu();
    };
    const escape=(event:KeyboardEvent)=>{if(event.key==="Escape"){event.preventDefault();closeMenu(true);}};
    position();
    const resizeObserver=new ResizeObserver(position);
    const header=document.querySelector(".global-header");
    if(header)resizeObserver.observe(header);
    document.addEventListener("pointerdown",dismiss);document.addEventListener("focusin",dismiss);document.addEventListener("keydown",escape);
    document.addEventListener("focusin",position);document.addEventListener("focusout",position);
    window.addEventListener("resize",position);window.addEventListener("scroll",position,{passive:true});
    viewport?.addEventListener("resize",position);viewport?.addEventListener("scroll",position);
    return()=>{
      resizeObserver.disconnect();
      document.removeEventListener("pointerdown",dismiss);document.removeEventListener("focusin",dismiss);document.removeEventListener("keydown",escape);
      document.removeEventListener("focusin",position);document.removeEventListener("focusout",position);
      window.removeEventListener("resize",position);window.removeEventListener("scroll",position);
      viewport?.removeEventListener("resize",position);viewport?.removeEventListener("scroll",position);
    };
  },[menuOpen,closeMenu]);
  useEffect(() => { try { setSolidControls(localStorage.getItem("om.solidControls") === "1"); setReducedMotion(localStorage.getItem("om.reducedMotion") === "1"); } catch { /* Defaults also work when browser storage is unavailable. */ } },[]);
  useEffect(() => {
    const viewport=window.visualViewport;
    const measure=()=>{const editing=document.activeElement?.matches("input,textarea,[contenteditable=true]");setKeyboardOpen(Boolean(viewport && viewport.scale === 1 && editing && window.innerHeight-viewport.height>140));};
    viewport?.addEventListener("resize",measure);document.addEventListener("focusin",measure);document.addEventListener("focusout",measure);
    return()=>{viewport?.removeEventListener("resize",measure);document.removeEventListener("focusin",measure);document.removeEventListener("focusout",measure);};
  },[]);
  const openSearch = () => { if (!searchDialog.current?.open) searchDialog.current?.showModal(); searchDialog.current?.querySelector("input")?.focus(); };
  const [quickQuery, setQuickQuery] = useState("");
  const [catalogState, setCatalogState] = useState<CatalogState>(initialRoute.catalogState || { ...emptyCatalog, q: initialRoute.q || "" });
  const [returnView, setReturnView] = useState<View>(initialRoute.from || "database");
  const catalogScroll = useRef(0);
  const discoveryReturn = useRef<{route:SiteRoute;scroll:number}|null>(null);
  const [feedTab, setFeedTab] = useState(initialRoute.feed || "all");
  const [glossarySearch, setGlossarySearch] = useState(initialRoute.view === "glossary" ? initialRoute.q || "" : "");
  const [mapMode, setMapMode] = useState<"regional" | "community">(initialRoute.map || "regional");
  const [compareIds, setCompareIds] = useState(initialRoute.compare || [starterPlants[0].id, starterPlants[1].id]);
  const [globalTaxon, setGlobalTaxon] = useState(initialRoute.taxon || "");
  const [sectionEntry,setSectionEntry]=useState(initialRoute.entry),[sectionTab,setSectionTab]=useState(initialRoute.tab||"book"),[sectionQuery,setSectionQuery]=useState(initialRoute.q||""),[natureGroup,setNatureGroup]=useState(initialRoute.group||"plants");
  const [view, setView] = useState<View>(initialRoute.view);
  const [sourceCatalogQuery,setSourceCatalogQuery]=useState<SourceCatalogQuery>(initialRoute.sourceCatalog||{...emptySourceCatalog});
  const addDialog=useRef<HTMLDialogElement>(null);
  const lensCaptureControl=useRef<LensCaptureControl>(null);
  const [photoBatches,setPhotoBatches]=useState<ObservationPhotoBatch[]>([]);
  const consumePhotos=useCallback((id:string)=>setPhotoBatches(all=>all.filter(batch=>batch.id!==id)),[]);
  const [lensAutoStart,setLensAutoStart]=useState(false);
  const openAdd=()=>{menuDialog.current?.close();searchDialog.current?.close();warmLens();setLensAutoStart(true);if(!addDialog.current?.open)addDialog.current?.showModal();};
  useEffect(()=>{
    const url=new URL(window.location.href);
    if(url.searchParams.get("lens")!=="1")return;
    url.searchParams.delete("lens");window.history.replaceState(window.history.state,"",url);
    warmLens();if(window.top===window)setLensAutoStart(true);addDialog.current?.showModal();
  },[]);
  const [homeMounted,setHomeMounted] = useState(initialRoute.view === "home");
  const [mapMounted,setMapMounted] = useState(initialRoute.view === "map" && mapMode === "regional");
  useEffect(()=>{if(view === "map" && mapMode === "regional")setMapMounted(true);},[view,mapMode]);
  const [careMounted,setCareMounted] = useState(initialRoute.view === "care");
  const [chatMounted,setChatMounted] = useState(false);
  useEffect(()=>{if(view==="care")setCareMounted(true);if(chatOpen)setChatMounted(true);},[view,chatOpen]);
  const [tubiId,setTubiId] = useState(initialRoute.flora || 1);
  const [catalogMode,setCatalogMode] = useState<"flora"|"curated">(initialRoute.catalog || "flora");
  const [plants, setPlants] = useState<Plant[]>(starterPlants);
  const [isAdmin, setIsAdmin] = useState(false);
  const [editPlant, setEditPlant] = useState<Plant>(blankPlant);
  const [adminFile, setAdminFile] = useState<File | null>(null);
  const [selected, setSelected] = useState(initialRoute.species || starterPlants[0].id);
  const [detailTab, setDetailTab] = useState(speciesTab(initialRoute.tab));
  const [libraryTab, setLibraryTab] = useState("Tür");
  const [librarySearch, setLibrarySearch] = useState("");
  const [search, setSearch] = useState(initialRoute.view === "glossary" ? "" : initialRoute.q || "");
  const [letterFilter, setLetterFilter] = useState("");
  const [sortBy, setSortBy] = useState<"turkish" | "latin">("turkish");
  const [filters, setFilters] = useState<Filters>(emptyFilters);
  const [filterOpen, setFilterOpen] = useState(false);
  const [externalEngagement, setExternalEngagement] = useState<Record<string, Engagement>>({});
  const [mapPlant, setMapPlant] = useState(initialRoute.plant || "");
  const [mapSelected, setMapSelected] = useState(initialRoute.observation || "");
  const [shareTarget, setShareTarget] = useState<ShareTarget | null>(null);
  useEffect(() => { const open = (event: Event) => setShareTarget((event as CustomEvent<ShareTarget>).detail); window.addEventListener('orman:share', open); return () => window.removeEventListener('orman:share', open); }, []);
  const [sharedId, setSharedId] = useState(initialRoute.view === 'home' && !/^\d+$/.test(initialRoute.observation || '') ? initialRoute.observation || '' : '');
  const [sharedPost, setSharedPost] = useState<SharedObservation | null | undefined>(initialObservation);
  const [sharedError, setSharedError] = useState(sharedUnavailable ? 'unavailable' : '');
  useEffect(() => {
    if (!sharedId) return;
    if (sharedId === initialRoute.observation && initialObservation !== undefined) { setSharedPost(initialObservation); setSharedError(sharedUnavailable ? 'unavailable' : ''); return; }
    const controller = new AbortController(); setSharedPost(undefined); setSharedError('');
    void fetch('/api/observations?id=' + encodeURIComponent(sharedId), { signal: controller.signal, cache: 'no-store' }).then(async response => {
      if (response.status === 404) { if (!controller.signal.aborted) setSharedPost(null); return; }
      if (!response.ok) throw new Error(); const data = await response.json() as { record: SharedObservation }; if (!controller.signal.aborted) setSharedPost(data.record);
    }).catch(() => { if (!controller.signal.aborted) setSharedError('unavailable'); });
    return () => controller.abort();
  }, [sharedId]);
  const [posts, setPosts] = useState<Observation[]>([sample]);
  const [nativePage, setNativePage] = useState({ ready: false, count: 0, hasMore: true });
  const [liked, setLiked] = useState<string[]>([]);
  const [saved, setSaved] = useState<string[]>([]);
  const [collections, setCollections] = useState<Collection[]>([]);
  const [collectionTarget, setCollectionTarget] = useState<string | null>(null);
  const [collectionName, setCollectionName] = useState("");
  const [name, setName] = useState("");
  const [localNames, setLocalNames] = useState<Record<string, string[]>>({});
  const [leafNotes, setLeafNotes] = useState<Record<string, string>>({});
  const [contribute, setContribute] = useState<"name" | "leaf" | null>(null);
  const [contributionText, setContributionText] = useState("");
  const [draft, setDraft] = useState("");
  const [deviceDraftId,setDeviceDraftId]=useState(initialRoute.deviceDraft);
  const [draftImage, setDraftImage] = useState("");
  const [draftFile, setDraftFile] = useState<File | null>(null);
  const [draftPlant, setDraftPlant] = useState(initialRoute.view === "create" ? initialRoute.plant || "" : "");
  const [draftOrgan, setDraftOrgan] = useState("Genel görünüş");
  const [draftPosition, setDraftPosition] = useState<Position | null>(null);
  const [candidateQuery, setCandidateQuery] = useState("");
  const [identifyTarget, setIdentifyTarget] = useState<string | null>(null);
  const [commentTarget, setCommentTarget] = useState<string | null>(null);
  const [commentSending,setCommentSending]=useState<string[]>([]);
  const commentTargetRef=useRef(commentTarget);commentTargetRef.current=commentTarget;
  const commentQueue=useRef(new TextSubmissionQueue());
  const [comment, setComment] = useState("");
  const [sectionTopic,setSectionTopic]=useState(initialRoute.topic);
  const [gbifQuery,setGbifQuery]=useState<GbifQuery>(initialRoute.gbif||{...emptyGbif});
  const [notice, setNotice] = useState("");
  const [ready, setReady] = useState(false);
  const selections = useRef(new SelectionQueue());

  const applyRoute = (route: SiteRoute) => {
    if(route.view==="catalogs")setSourceCatalogQuery(route.sourceCatalog||{...emptySourceCatalog});
    if(route.view==="gbif")setGbifQuery(route.gbif||{...emptyGbif});
    setSectionTopic(route.topic);setSectionEntry(route.entry);setTreeRoute({source:route.treeSource||"itis",id:route.treeId||"",version:route.treeVersion||"",mode:route.treeMode||"list"});setSectionTab(route.tab||"book");setSectionQuery(route.q||"");setNatureGroup(route.group||"plants");
    setView(route.view); if(route.view === "home")setHomeMounted(true); if(route.view === "assistant")setAssistantPrompt(route.q || ""); setGlobalTaxon(route.taxon || ""); if(route.view === "home")setFeedTab(route.feed || "all");
    if (route.from) setReturnView(route.from);
    if (["database", "flora"].includes(route.view) || ["database", "flora"].includes(route.from || "")) { setCatalogState(route.catalogState || { ...emptyCatalog, q: route.q || "" }); setSearch(route.catalogState?.q || route.q || ""); }
    if (route.species) setSelected(route.species);
    if (route.flora) setTubiId(route.flora);
    if (route.view === "glossary") setGlossarySearch(route.q || "");
    else if (["explore", "discover", "database", "flora"].includes(route.view)) setSearch(route.q || "");
    setDetailTab(speciesTab(route.tab)); setCatalogMode(route.catalog || "flora");
    setSharedId(route.view === "home" && !/^\d+$/.test(route.observation || "") ? route.observation || "" : "");
    setMapMode(route.map || "regional"); setMapPlant(route.plant || ""); setMapSelected(route.observation || "");
    if (route.compare) setCompareIds(route.compare);
    if (route.view === "create" && route.plant) setDraftPlant(route.plant);
    if (route.view === "create") setDeviceDraftId(route.deviceDraft);
  };
  useLayoutEffect(() => {
    activeRouteUrl.current = window.location.href;
    const previousRestoration=window.history.scrollRestoration;window.history.scrollRestoration="manual";
    const initial=readEntry(window.history.state);historyEntry.current=initial.id||clientId();
    if(initial.id && initial.scroll>0){restoreScroll.current=initial.scroll;pendingFocus.current=true;}
    window.history.replaceState(entryState(window.history.state,historyEntry.current,initial.id?initial.scroll:window.scrollY),"",window.location.href);
    let frame=0,timer:ReturnType<typeof setTimeout>|undefined;
    const interrupt=()=>{if(restoreScroll.current!==null){restoreScroll.current=null;cancelScrollRestore.current?.();}};
    const keyboardIntent=(event:KeyboardEvent)=>{if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(event.key))interrupt();};
    // A gesture can arrive while a lazy route is still opening, before its
    // resize observer is registered. It must cancel that future restore too.
    window.addEventListener("wheel",interrupt,{passive:true});window.addEventListener("touchstart",interrupt,{passive:true});window.addEventListener("pointerdown",interrupt,{passive:true});window.addEventListener("keydown",keyboardIntent);
    const scroll=()=>{if(frame||restoreScroll.current!==null)return;frame=requestAnimationFrame(()=>{frame=0;rememberPosition(false);clearTimeout(timer);timer=setTimeout(()=>rememberPosition(),150);});};
    const update = async () => {
      const sequence=++navigationSequence.current;rememberPosition(false);cancelScrollRestore.current?.();
      const previousRoute=readSiteRoute(new URL(activeRouteUrl.current).searchParams);
      const targetUrl=window.location.href,target=readEntry(window.history.state);
      if (!(await preserveOpenFieldDraft())) { if(sequence===navigationSequence.current)window.history.pushState(entryState({},historyEntry.current,navigationMemory.current.entry(historyEntry.current)?.scroll||0),"",activeRouteUrl.current); return; }
      if(sequence!==navigationSequence.current)return;
      clearTimeout(timer);activeRouteUrl.current=targetUrl;historyEntry.current=target.id||clientId();
      restoreScroll.current=navigationMemory.current.entry(target.id)?.scroll??target.scroll;pendingFocus.current=true;
      window.history.replaceState(entryState(window.history.state,historyEntry.current,restoreScroll.current),"",targetUrl);
      const route=readSiteRoute(new URL(targetUrl).searchParams);
      incomingMotion.current=routeMotion(previousRoute,route,true);
      warmRoute(route.view);applyRoute(route);
    };
    const flush=()=>{if(restoreScroll.current===null)rememberPosition();};
    window.addEventListener("popstate",update);window.addEventListener("scroll",scroll,{passive:true});window.addEventListener("pagehide",flush);
    return()=>{window.removeEventListener("popstate",update);window.removeEventListener("scroll",scroll);window.removeEventListener("pagehide",flush);window.removeEventListener("wheel",interrupt);window.removeEventListener("touchstart",interrupt);window.removeEventListener("pointerdown",interrupt);window.removeEventListener("keydown",keyboardIntent);cancelAnimationFrame(frame);clearTimeout(timer);cancelScrollRestore.current?.();window.history.scrollRestoration=previousRestoration;};
  }, []);
  useEffect(() => {
    const shortcut = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") { event.preventDefault(); openSearch(); }
    };
    window.addEventListener("keydown", shortcut); return () => window.removeEventListener("keydown", shortcut);
  }, []);
  useEffect(()=>{document.documentElement.lang=language;},[language]);

  useEffect(() => {
    const legacy = read<Array<Observation & { plant?: string; location?: Position }>>("om.posts", [sample])
      .filter(post => post.id !== "featured" && post.id !== sample.id)
      .map(post => ({ ...post, plantId: legacyPlant(post.plantId || post.plant), position: post.position || post.location,
        comments: Array.isArray(post.comments) ? post.comments.map(item => typeof item === "string" ? { author: "Misafir", text: item } : item) : [], suggestions: [], owner: true, legacy: true }));
    fetch("/api/state", { cache: "no-store" })
      .then(async response => {
        if (response.status === 401) {
          setSessionReady(false); setPosts([sample, ...legacy]);
          setNativePage({ ready: true, count: 0, hasMore: false });
          return;
        }
        const data = await response.json() as StoredState;
        if (!response.ok){if(response.status===401)setSessionReady(false);throw new Error(data.error || "Kayıtlar yüklenemedi.");}setSessionReady(true);
        setPosts([...data.posts, ...legacy, sample]);
        setNativePage({ ready: true, count: data.posts.length, hasMore: data.hasMore });
        setExternalEngagement(data.externalEngagement || {}); setLiked(selections.current.apply(data.liked,"liked")); setSaved(selections.current.apply(data.saved,"saved")); setCollections(data.collections);
        setName(data.name || ""); setLocalNames(data.localNames); setLeafNotes(data.leafNotes);
        setPlants([...starterPlants, ...(data.customPlants || [])]); setIsAdmin(Boolean(data.isAdmin));
      })
      .catch(cause => { setPosts([sample, ...legacy]); setNativePage({ ready: true, count: 0, hasMore: true }); setNotice(cause instanceof Error ? cause.message : "Veri bağlantısı kurulamadı."); })
      .finally(() => setReady(true));
  }, []);
  useEffect(() => {
    if (!notice) return;
    const timer = setTimeout(() => setNotice(""), 4500);
    return () => clearTimeout(timer);
  }, [notice]);
  useEffect(() => {
    if (!ready || !window.location.hash.startsWith("#gozlem-")) return;
    const timer = setTimeout(() => document.getElementById(window.location.hash.slice(1))?.scrollIntoView({ block: "start" }), 100);
    return () => clearTimeout(timer);
  }, [ready, posts.length]);

  const navigate = async (next: View, options: Partial<SiteRoute> = {}) => {
    const sequence=++navigationSequence.current;
    if (view === "create" && next !== "assistant" && next !== "create" && !(await preserveOpenFieldDraft())) return false;
    if(sequence!==navigationSequence.current)return false;
    if(next==="assistant"){if(options.treeSource&&options.treeId)setTreeRoute({source:options.treeSource,id:options.treeId,version:options.treeVersion||"",mode:treeRoute.mode});setChatMounted(true);warmRoute("assistant");setAssistantPrompt(options.q||"");setChatOpen(true);menuDialog.current?.close();searchDialog.current?.close();return true;}
    const explicit=Object.keys(options).some(key=>key!=="view");
    if(next === view && !explicit && !(next === "map" && mapMode === "community")) { cancelScrollRestore.current?.();searchDialog.current?.close(); menuDialog.current?.close(); addDialog.current?.close(); window.scrollTo({top:0,behavior:reducedMotion || window.matchMedia("(prefers-reduced-motion:reduce)").matches ? "instant" : "smooth"}); mainRef.current?.focus({preventScroll:true}); return true; }
    if(["discover","search"].includes(view)&&["detail","flora-record"].includes(next))discoveryReturn.current={route:readSiteRoute(new URL(window.location.href).searchParams),scroll:window.scrollY};
    rememberPosition();cancelScrollRestore.current?.();pendingFocus.current=true;
    const recalled=!explicit?navigationMemory.current.section(next):undefined;
    restoreScroll.current=recalled?.scroll||0;
    const routeQuery = options.q ?? (next===view?next === "glossary" ? glossarySearch : ["explore","database","flora","discover"].includes(next)?search:sectionQuery:"");
    const nextCatalog = options.catalogState || { ...catalogState, q: routeQuery, offset: routeQuery === catalogState.q ? catalogState.offset : 0 };
    const route: SiteRoute = { view: next, catalogState: nextCatalog, species: selected, flora: tubiId, taxon: globalTaxon,
      topic:next===view?sectionTopic:undefined,entry:next===view?sectionEntry:undefined,tab:["discover","store","care","auth","social"].includes(next)?sectionTab:undefined,group:natureGroup,
      q: routeQuery, sourceCatalog:next==="catalogs"?sourceCatalogQuery:undefined, catalog: catalogMode, compare: compareIds, feed:feedTab,gbif:next==="gbif"?gbifQuery:undefined,
      map: mapMode, plant: next === "create" ? draftPlant : mapPlant, observation: next === "map" ? mapSelected : undefined, ...recalled?.route, ...options };
    if(next === "map" && !Object.hasOwn(options,"map"))route.map="regional";
    const url = siteRouteUrl(new URL(window.location.href), route);
    incomingMotion.current=routeMotion(readSiteRoute(new URL(window.location.href).searchParams),readSiteRoute(url.searchParams));
    const nextRoute=readSiteRoute(url.searchParams),keepsContext=keepsRouteContext(readSiteRoute(new URL(window.location.href).searchParams),nextRoute);
    pendingFocus.current=!keepsContext;
    if(keepsContext)restoreScroll.current=null;
    warmRoute(next);
    if(keepsContext && !dialogEntry(window.history.state))replaceRoute(url);
    else{
      const parent=historyEntry.current,from=readSiteRoute(new URL(activeRouteUrl.current).searchParams).view;
      const modal=Boolean(dialogEntry(window.history.state));historyEntry.current=clientId();
      const state=entryState({from,omParent:parent},historyEntry.current,keepsContext?window.scrollY:restoreScroll.current||0);
      if(modal)window.history.replaceState(withoutDialogEntry(state),"",url);
      else window.history.pushState(state,"",url);
      activeRouteUrl.current=url.href;
    }
    applyRoute(nextRoute);
    searchDialog.current?.close(); menuDialog.current?.close(); addDialog.current?.close();
    return true;
  };
  useLayoutEffect(()=>{
    if(!pendingFocus.current)return;pendingFocus.current=false;mainRef.current?.focus({preventScroll:true});
    const top=restoreScroll.current;if(top===null)return;
    cancelScrollRestore.current=restoreWhenReady(top,{
      available:()=>Math.max(0,document.documentElement.scrollHeight-window.innerHeight),scroll:value=>window.scrollTo({top:value,behavior:"instant"}),
      observe:check=>{if(typeof ResizeObserver!=="function"){window.addEventListener("resize",check);return()=>window.removeEventListener("resize",check);}const observer=new ResizeObserver(check);observer.observe(document.body);return()=>observer.disconnect();},
      onIntent:cancel=>{const key=(event:KeyboardEvent)=>{if(["ArrowDown","ArrowUp","PageDown","PageUp","Home","End"," "].includes(event.key))cancel();};window.addEventListener("wheel",cancel,{passive:true});window.addEventListener("touchstart",cancel,{passive:true});window.addEventListener("pointerdown",cancel,{passive:true});window.addEventListener("keydown",key);return()=>{window.removeEventListener("wheel",cancel);window.removeEventListener("touchstart",cancel);window.removeEventListener("pointerdown",cancel);window.removeEventListener("keydown",key);};},
      timeout:finish=>{const timer=setTimeout(finish,5000);return()=>clearTimeout(timer);}
    },()=>{restoreScroll.current=null;rememberPosition();});
  },[view,sectionEntry,sectionTopic,sectionTab,feedTab,detailTab,search,sectionQuery]);
  useLayoutEffect(()=>{
    const motion=incomingMotion.current;incomingMotion.current="none";
    const host=mainRef.current;if(!host)return;
    const visible=Array.from(host.querySelectorAll<HTMLElement>(".view-surface:not([hidden])")).filter(node=>node.childElementCount>0&&!node.closest("[hidden]"));
    const stops=visible.map(node=>animateSurface(node,motion,reducedMotion||window.matchMedia("(prefers-reduced-motion:reduce)").matches));
    return()=>stops.forEach(stop=>stop());
  },[view,sectionEntry,sectionTopic,selected,tubiId,reducedMotion]);
  const plantById = (id?: string) => plants.find(plant => plant.id === id);
  const detailOrigin = () => ["detail", "flora-record"].includes(view) ? returnView : view;
  const openPlant = (id: string) => { if (["database", "flora"].includes(view)) catalogScroll.current = window.scrollY; navigate("detail", { species: id, from: detailOrigin() }); };
  const openTubi = (id: number) => { if (["database", "flora"].includes(view)) catalogScroll.current = window.scrollY; navigate("flora-record", { flora: id, from: detailOrigin() }); };
  const openLinkedTaxon = (id: string) => id.startsWith("gbif-") ? navigate("discover",{entry:id,tab:"overview",q:""}) : id.startsWith("flora-") ? openTubi(Number(id.slice(6))) : openPlant(id);
  const backToResults = () => {
    const parent=navigationMemory.current.entry(window.history.state?.omParent);
    if(parent?.route.view===returnView){window.history.back();return;}
    if(["discover","search"].includes(returnView)&&discoveryReturn.current){const previous=discoveryReturn.current;navigate(previous.route.view,previous.route);restoreScroll.current=previous.scroll;return;}
    const destination = ["detail", "flora-record", "create", "identify", "account", "admin", "compare"].includes(returnView) ? "database" : returnView;
    if (["database", "flora"].includes(destination)) { navigate(destination, { catalogState, q: catalogState.q }); restoreScroll.current=catalogScroll.current; } else navigate(destination);
  };
  const goBack = () => {
    if(chatOpen){setChatOpen(false);return;}
    if(navigationMemory.current.entry(window.history.state?.omParent)){window.history.back();return;}
    if(["detail","flora-record"].includes(view)){backToResults();return;}
    if(view==="discover"&&(sectionEntry||sectionTopic)){navigate("discover",{entry:undefined,topic:undefined,tab:"overview",q:""});return;}
    navigate("home");
  };
  const searchAll = (query: string) => navigate("database", { catalog: "flora", q: query, catalogState: { ...emptyCatalog, q: query } });
  const openGlobal = (taxon: string) => {
    const local = plants.find(plant => plant.latin === taxon);
    if (local) openPlant(local.id); else navigate("global-species", { taxon });
  };
  const openObservationMap = (post: Observation) => navigate("map", { map: "community", plant: post.plantId, observation: post.id });
  const openSaved = () => navigate("home", { feed: "saved" });
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("view") !== view && !(view === "home" && !url.searchParams.get("view"))) return;
    const route = readSiteRoute(url.searchParams);
    const next = siteRouteUrl(url, { ...route, view, catalogState: ["database", "flora"].includes(view) ? catalogState : route.catalogState, tab: ["detail","flora-record"].includes(view)?detailTab:route.tab, catalog: catalogMode, compare: compareIds,
      map: mapMode, plant: view === "map" ? mapPlant : route.plant, observation: view === "map" ? mapSelected : route.observation,
      q: view === "glossary" ? glossarySearch : view === "assistant" ? assistantPrompt : ["explore", "discover", "database", "flora"].includes(view) ? search : route.q });
    next.hash = url.hash; replaceRoute(next);
  }, [view, detailTab, catalogMode, compareIds, mapMode, mapPlant, mapSelected, search, glossarySearch, catalogState, assistantPrompt]);
  const baseCurrent = plantById(selected) ?? plants[0];
  const current = { ...baseCurrent, ...botanicalAccount(baseCurrent.id,language) };
  const normalized = search.trim().toLocaleLowerCase("tr");
  const filteredPlants = useMemo(() => plants.filter(plant => {
    const text = `${plant.name} ${translate(plant.name, "en")} ${plant.latin} ${plant.family} ${plant.genus}`.toLocaleLowerCase("tr");
    return text.includes(normalized) && (!letterFilter || plant.name.toLocaleUpperCase("tr").startsWith(letterFilter) || plant.latin.toLocaleUpperCase("tr").startsWith(letterFilter)) && (Object.keys(filters) as (keyof Filters)[]).every(key => !filters[key] || plant[key] === filters[key]);
  }).sort((a, b) => (sortBy === "turkish" ? a.name.localeCompare(b.name, "tr") : a.latin.localeCompare(b.latin, "tr"))), [normalized, letterFilter, sortBy, filters, plants]);
  const activeFilters = Object.values(filters).filter(Boolean).length;
  const candidatePlants = plants.filter(plant => `${plant.name} ${translate(plant.name, "en")} ${plant.latin}`.toLocaleLowerCase("tr").includes(candidateQuery.toLocaleLowerCase("tr"))).slice(0, 6);
  const mappedPosts = posts.filter(post => (!post.status || post.status === "approved" || post.owner) && post.position && (!mapPlant || post.plantId === mapPlant));
  const selectedMapPost = mappedPosts.find(post => post.id === mapSelected) || mappedPosts[0];
  const speciesPosts = posts.filter(post => post.plantId === current.id && post.id !== sample.id && (!post.status || post.status === "approved"));
  const relatedPlants = plants.filter(plant => plant.id !== current.id && (plant.genus === current.genus || plant.family === current.family)).sort((a, b) => Number(b.genus === current.genus) - Number(a.genus === current.genus)).slice(0, 4);
  const mapUrl = selectedMapPost?.position ? (() => {
    const { latitude, longitude } = selectedMapPost.position;
    const bbox = [longitude - .045, latitude - .025, longitude + .045, latitude + .025].join(",");
    return `https://www.openstreetmap.org/export/embed.html?bbox=${encodeURIComponent(bbox)}&layer=mapnik&marker=${encodeURIComponent(`${latitude},${longitude}`)}`;
  })() : "";

  const mutate = async (action: string, data: Record<string, unknown> = {}) => {
    const response = await fetch("/api/state", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ action, ...data }) });
    const result = await response.json() as ActionResult;
    if (!response.ok) throw new Error(result.error || "İşlem kaydedilemedi.");
    return result;
  };
  const toggle = async (kind: "liked" | "saved", id: string) => {
    const previous=(kind === "liked" ? liked : saved).includes(id);
    const setter=kind === "liked" ? setLiked : setSaved;
    let shown=previous;
    return selections.current.toggle(kind,id,previous,{
      change: selected=>{
        setter(ids=>selectedIds(ids,id,selected));
        if(kind === "liked" && selected !== shown){
          const delta=selected?1:-1;
          setPosts(posts=>posts.map(post=>post.id===id?{...post,likeCount:Math.max(0,(post.likeCount||0)+delta)}:post));
          if(id.startsWith("gbif:"))setExternalEngagement(values=>({...values,[id]:{comments:values[id]?.comments||[],likeCount:Math.max(0,(values[id]?.likeCount||0)+delta)}}));
        }
        shown=selected;
      },
      commit: selected=>mutate(kind === "liked" ? "toggle-like" : "toggle-save",{id,selected}),
      failed: cause=>setNotice(cause instanceof Error?cause.message:"İşlem kaydedilemedi. Seçim geri alındı."),
    });
  };
  const addCollection = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = collectionName.trim();
    if (!value) return;
    if (collections.some(collection => collection.name.toLocaleLowerCase("tr") === value.toLocaleLowerCase("tr"))) {
      setNotice("Bu adla bir koleksiyon var."); return;
    }
    let result: { id: string };
    try { result = await mutate("create-collection", { value, plantId: collectionTarget || undefined }); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Koleksiyon kaydedilemedi."); return; }
    setCollections(previous => [...previous, { id: result.id, name: value, items: collectionTarget ? [collectionTarget] : [] }]);
    setCollectionName("");
    setCollectionTarget(null);
    setNotice("Koleksiyon oluşturuldu.");
  };
  const toggleCollectionItem = async (collectionId: string, plantId: string) => {
    try { await mutate("toggle-collection-item", { id: collectionId, plantId }); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Tür kaydedilemedi."); return; }
    setCollections(previous => previous.map(collection => collection.id === collectionId ? {
      ...collection, items: collection.items.includes(plantId) ? collection.items.filter(id => id !== plantId) : [...collection.items, plantId],
    } : collection));
    setSaved(previous => previous.includes(plantId) ? previous : [...previous, plantId]);
  };
  const selectPhoto = (file?: File) => {
    if (!file) return;
    if (!file.type.startsWith("image/") || file.size > 1_500_000) {
      setNotice("Fotoğraf JPEG, PNG veya WebP biçiminde ve 1,5 MB'den küçük olmalı."); return;
    }
    const reader = new FileReader();
    reader.onload = () => setDraftImage(String(reader.result));
    reader.readAsDataURL(file);
    setDraftFile(file);
  };
  const getPosition = () => {
    if (!navigator.geolocation) { setNotice("Bu tarayıcı konum erişimini desteklemiyor."); return; }
    navigator.geolocation.getCurrentPosition(
      result => setDraftPosition({ latitude: +result.coords.latitude.toFixed(5), longitude: +result.coords.longitude.toFixed(5) }),
      () => setNotice("Konum alınamadı. Tarayıcı iznini kontrol edin."),
      { timeout: 10000, enableHighAccuracy: false },
    );
  };
  const publishObservation = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!draft.trim() && !draftImage) { setNotice("Gözleme bir açıklama veya fotoğraf ekleyin."); return; }
    try {
      if (name.trim()) await mutate("set-name", { value: name.trim() });
      let imageKey = "";
      if (draftFile) {
        const form = new FormData(); form.append("file", draftFile);
        const uploaded = await fetch("/api/upload", { method: "POST", body: form });
        const body = await uploaded.json() as { key: string; error?: string };
        if (!uploaded.ok) throw new Error(body.error || "Fotoğraf yüklenemedi.");
        imageKey = body.key;
      }
      const result = await mutate("create-post", { text: draft.trim(), plantId: draftPlant, imageKey, organ: draftFile ? draftOrgan : "", position: draftPosition });
      const next: Observation = { id: result.id, author: name.trim() || "Üye", text: draft.trim(), date: new Date().toLocaleDateString("tr-TR"), image: imageKey ? `/api/image/${imageKey}` : undefined, plantId: draftPlant || undefined, organ: draftFile ? draftOrgan : undefined, position: draftPosition || undefined, comments: [], owner: true };
      setPosts(previous => [next, ...previous]);
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Gözlem kaydedilemedi."); return; }
    setDraft(""); setDraftImage(""); setDraftFile(null); setDraftPlant(""); setDraftPosition(null);
    navigate("home");
    setNotice("Gözlem kaydedildi.");
  };
  const importLegacy = async (post: Observation) => {
    try {
      let imageKey = "";
      if (post.image?.startsWith("data:")) {
        const blob = await (await fetch(post.image)).blob();
        const form = new FormData();
        form.append("file", blob, "gozlem." + (blob.type === "image/png" ? "png" : blob.type === "image/webp" ? "webp" : "jpg"));
        const uploaded = await fetch("/api/upload", { method: "POST", body: form });
        const body = await uploaded.json() as { key: string; error?: string };
        if (!uploaded.ok) throw new Error(body.error || "Fotoğraf yüklenemedi.");
        imageKey = body.key;
      }
      const result = await mutate("create-post", { text: post.text, plantId: post.plantId || "", organ: post.organ || "", position: post.position || null, imageKey });
      const replacement = { ...post, id: result.id as string, image: imageKey ? `/api/image/${imageKey}` : undefined, legacy: false, status: "draft" };
      setPosts(previous => previous.map(item => item.id === post.id ? replacement : item));
      const old = read<Observation[]>("om.posts", [sample]).filter(item => item.id !== post.id);
      localStorage.setItem("om.posts", JSON.stringify(old));
      setNotice("Eski gözlem site hesabına aktarıldı.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Eski gözlem aktarılamadı."); }
  };
  const addComment=async(id:string,value:string)=>commentQueue.current.run(id,value,async clientId=>{
    setCommentSending(ids=>selectedIds(ids,id,true));
    try{
      const result=await mutate("comment",{id,value,clientId});
      if(result.id!==clientId)throw new Error("Yorumun kaydı doğrulanamadı. Yeniden deneyebilirsin.");
      if(id.startsWith("gbif:"))setExternalEngagement(previous=>({...previous,[id]:{likeCount:previous[id]?.likeCount||0,comments:[...(previous[id]?.comments||[]),{author:name||"Üye",text:value}]}}));
      else setPosts(previous=>previous.map(post=>post.id===id?{...post,comments:[...post.comments,{author:name||"Üye",text:value}]}:post));
    }finally{setCommentSending(ids=>selectedIds(ids,id,false));}
  });
  const sendComment = async (event: React.FormEvent, id: string) => {
    event.preventDefault();const value=comment.trim();
    if (!value) return;
    if (posts.find(post => post.id === id)?.legacy) { setNotice("Yorum yapmadan önce eski gözlemi hesabınıza aktarın."); return; }
    try {if(!await addComment(id,value))return;}
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Yorum kaydedilemedi. Metnin korunuyor; yeniden deneyebilirsin."); return; }
    if(commentTargetRef.current===id){setComment(current=>current.trim()===value?"":current);setCommentTarget(null);}
  };
  const saveContribution = async (event: React.FormEvent) => {
    event.preventDefault();
    const value = contributionText.trim();
    if (!value || !contribute) return;
    const names = unique([...(localNames[current.id] ?? []), value]);
    try { await mutate("set-note", { plantId: current.id, kind: contribute === "name" ? "names" : "leaf", value: contribute === "name" ? JSON.stringify(names) : value }); }
    catch (cause) { setNotice(cause instanceof Error ? cause.message : "Not kaydedilemedi."); return; }
    if (contribute === "name") setLocalNames(previous => ({ ...previous, [current.id]: names }));
    else setLeafNotes(previous => ({ ...previous, [current.id]: value }));
    setContribute(null); setContributionText(""); setNotice("Kişisel notunuz kaydedildi.");
  };
  const sharePost = (post: Observation) => {
    if (post.id !== sample.id && post.status !== 'approved') { setNotice(language === 'en' ? 'Only approved community observations have a shareable link.' : 'Paylaşım bağlantısı, topluluk için onaylanan gözlemlerde açılır.'); return; }
    requestShare({ url: canonicalRoute({ view: 'home', observation: post.id }), title: post.author + (language === 'en' ? ' · Nature observation' : ' · Doğa gözlemi'), text: post.text.slice(0, 200), image: post.image || post.photos?.[0]?.url || (post.id === sample.id ? plantById(post.plantId)?.image : undefined) });
  };
  const savePlant = async (event: React.FormEvent) => {
    event.preventDefault();
    try {
      let imageKey = editPlant.image?.split("/").pop() || "";
      if (adminFile) {
        const form = new FormData(); form.append("file", adminFile);
        const response = await fetch("/api/upload", { method: "POST", body: form });
        const result = await response.json() as { key: string; error?: string };
        if (!response.ok) throw new Error(result.error || "Fotoğraf yüklenemedi.");
        imageKey = result.key;
      }
      const response = await fetch("/api/plants", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ ...editPlant, imageKey }) });
      const result = await response.json() as { plant: Plant; error?: string };
      if (!response.ok) throw new Error(result.error || "Tür kaydedilemedi.");
      setPlants(previous => [...previous.filter(plant => plant.id !== result.plant.id), result.plant]);
      setEditPlant(blankPlant); setAdminFile(null);
      setNotice("Tür kaydı veri tabanına eklendi.");
    } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Tür kaydedilemedi."); }
  };

  const loadObservationPage = useCallback(async (offset: number, following?: boolean) => {
    const response = await fetch(`/api/state?offset=${offset}${following ? "&following=1" : ""}${offset>0||following?"&pageOnly=1":""}`, { cache: "no-store" });
    const data = await response.json() as StoredState;
    if (!response.ok) throw new Error(data.error);
    setPosts(previous => mergeObservationPage(previous, data.posts, { refresh: offset === 0 && !following, complete: !data.hasMore }));
    if (offset === 0 && !following) {
      setLiked(selections.current.apply(data.liked,"liked")); setSaved(selections.current.apply(data.saved,"saved"));
      setExternalEngagement(previous => ({ ...previous, ...data.externalEngagement }));
    }
    return { count: data.posts.length, hasMore: data.hasMore };
  }, []);
  const heading = (title: string, back?: View) => <div className="page-heading">
    <div><nav className="breadcrumbs" aria-label="Sayfa yolu"><button onClick={() => navigate("home")}>Orman Mühendisi</button><span>/</span>{back && <><button onClick={() => ["detail", "flora-record"].includes(view) ? backToResults() : navigate(back)}>{primaryNav.find(item => item.view === (["detail", "flora-record"].includes(view) ? returnView : back))?.label || "Veri tabanı"}</button><span>/</span></>}<span aria-current="page">{title}</span></nav><h1>{title}</h1></div>
    <div className="heading-actions">{["detail","flora-record","discover","social"].includes(view) && <button type="button" aria-label={language === "en" ? "Share this page" : "Bu sayfayı paylaş"} onClick={() => requestShare({ url: window.location.href, title: view === "detail" ? current.name + " · " + current.latin : title + " | Orman Mühendisi", image: view === "detail" ? current.image : undefined })}><Icon name="share"/></button>}<button className="heading-search" onClick={openSearch} aria-label="Ara"><Icon name="search" /></button></div>
  </div>;
  const submenuChoices = (section: View) => {
    const moved=sectionHubs.find(hub=>hub.id===section)?.views.map(view=>{const item=siteSections.find(item=>item.view===view)!;return {label:item.tr,description:item.description,route:{view}};})||[];
    const original=(navChoices[section]||[]).filter(choice=>!sectionHubs.some(hub=>hub.id!==section&&hub.views.includes(choice.route.view))&&!moved.some(item=>item.route.view===choice.route.view));
    return [...original,...moved].map(choice=>({...choice,label:translate(choice.label,language),description:translate(choice.description,language)}));
  };
  const submenuLabel = (label: string) => `${translate(label,language)} ${language === "en" ? "options" : "alt seçenekleri"}`;
  const activeSection=sectionFor(view);
  const currentNavRoute: SiteRoute={view,entry:sectionEntry,topic:sectionTopic,tab:sectionTab,feed:feedTab,map:mapMode,group:natureGroup,q:sectionQuery,catalog:catalogMode};
  const navigation = () => <div className="site-navigation">
    <span className="navigation-caption">{language==="en"?"YOUR NATURE WORKSPACE":"DOĞA ÇALIŞMA ALANIN"}</span><nav className="nav-group nav-primary" aria-label={translate("Ana menü",language)}>{sidebarPrimary.map(section=>{
      const item=primaryNav.find(entry=>entry.view===section)!;
      return <NavItem currentRoute={currentNavRoute} key={section} label={translate(item.label,language)} submenuLabel={submenuLabel(item.label)} icon={<Icon name={navIcon(section)}/>} route={{view:section}} active={activeSection===section} choices={[]} onNavigate={route=>navigate(route.view,route)}/>;
    })}</nav>
    <details className="field-navigation"><summary>{language==="en"?"Research & fieldwork":"Araştırma ve saha"}<span aria-hidden="true">⌄</span></summary><nav aria-label={language==="en"?"Fieldwork tools":"Saha araçları"}>{(["forestry","publications","care","glossary"] as View[]).map(section=>{const item=siteSections.find(item=>item.view===section)!;return <NavItem key={section} label={language==="en"?item.en:item.tr} icon={<Icon name={item.icon}/>} route={{view:section}} active={view===section} choices={[]} onNavigate={route=>navigate(route.view,route)}/>;})}</nav></details>
    {isAdmin&&<a className="section-admin" href="?view=admin" onClick={event=>{event.preventDefault();navigate("admin");}}><Icon name="grid"/><span>{language==="en"?"Species management":"Tür yönetimi"}</span></a>}
    <button className="sidebar-section-trigger" onClick={openMenu} aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="site-menu"><Icon name="menu"/><span>{language==="en"?"All sections":"Tüm bölümler"}</span></button>
  </div>;
  const mobileMenu = () => <SectionMenu language={language} section={view} query={menuQuery} onNavigate={section=>navigate(section)} admin={isAdmin}/>;
  const mobileTitle=view==="search"?"Arama sonuçları":["detail","flora-record"].includes(view)?"Bitki künyesi":view==="catalogs"?"Dünya katalogları":view==="create"?"Gözlem ekle":view==="identify"?"Bitki tanımla":view==="account"?"Kişisel ayarlar":view==="auth"?"Giriş":view==="global-species"?"Tür kayıtları":primaryNav.find(item=>item.view===view)?.label||primaryNav.find(item=>item.view===activeSection)?.label||"Orman Mühendisi";
  const primaryScreen = ["home", "explore", "database", "map"].includes(view) || view === "discover" && !sectionEntry && !sectionTopic && sectionTab !== "photos";
  const plantCard = (plant: Plant, index: number) => <button className="plant-card" key={plant.id} onClick={() => openPlant(plant.id)}>
    <span className={`plant-art plant-art-${index % 3}`} aria-hidden="true">{plant.image ? <ResponsivePhoto src={plant.image} alt="" sizes="(max-width:700px) 100vw, 360px"/> : <span className="image-unavailable">Fotoğraf eklenmedi</span>}</span>
    <span className="plant-card-body"><small>{plant.family} / {plant.genus}</small><strong className="species-name-line">{plant.image && <ResponsivePhoto sizes="44px" className="species-name-photo" src={plant.image} alt="" loading="lazy"/>}<i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span><span className="plant-card-meta">{plant.category} · {plant.leaf === "İğne" ? "İğne yaprak" : "Geniş yaprak"}</span>{plant.photoCredit && <span className="plant-card-credit">Foto: {plant.photoCredit} · {plant.photoLicense}</span>}<span>Tür künyesini aç</span></span>
  </button>;
  const postCard = (post: Observation,tools?:FollowTools) => {
    const plant = plantById(post.plantId);
    return <article className="observation social-post native-post" id={`gozlem-${post.id}`} key={post.id}>
      <div className="observation-head"><span className="avatar">{post.id === sample.id ? <img src="/brand/orman-emblem-128.webp" alt="" width="128" height="128"/> : post.author.slice(0, 1).toLocaleUpperCase("tr")}</span>
        <div><strong data-user-content>{post.author}</strong><small>{post.date} {post.position ? "· Konumlu gözlem" : ""}</small></div>
        {tools&&<button className="post-follow" disabled={tools.busy} aria-busy={tools.busy} aria-pressed={tools.following} onClick={tools.toggle}>{tools.following?"Takip ediliyor":"Takip et"}</button>}<span className={`status-pill ${post.plantId ? "identified" : ""}`}>{post.plantId ? "Tür seçildi" : "Tür bekliyor"}</span><ActionSheet title={language === "en" ? "Observation options" : "Gözlem seçenekleri"} language={language} compact className="post-options">{plant && !post.owner && <button onClick={() => { setIdentifyTarget(post.id); setDraftPlant(""); navigate("identify"); }}><Icon name="leaf"/>{language === "en" ? "Suggest another species" : "Farklı tür öner"}</button>}{post.position && <button onClick={() => openObservationMap(post)}><Icon name="pin"/>{language === "en" ? "View observation on map" : "Gözlemi haritada gör"}</button>}<button onClick={() => sharePost(post)}><Icon name="share"/>{language === "en" ? "Share observation" : "Gözlemi paylaş"}</button></ActionSheet>
      </div>
      {(post.photos?.length || post.image || post.id === sample.id && plant?.image) && <PhotoAlbum language={language} name={plant?.name || "Gözlem"} photos={post.photos?.length ? post.photos : [{ url: post.image || plant?.image || "", organ: post.organ, credit: post.id === sample.id ? plant?.photoCredit : undefined, license: post.id === sample.id ? `https://creativecommons.org/licenses/by-sa/${plant?.photoLicense?.includes("3.0") ? "3.0" : "4.0"}/` : undefined, reference: post.id === sample.id ? plant?.photoSource : undefined }]}/>}

      <div className="post-tools">
        <button className={liked.includes(post.id) ? "selected" : ""} onClick={() => toggle("liked", post.id)} aria-pressed={liked.includes(post.id)} aria-label="Beğen"><Icon name="heart" /><span>Beğen {post.likeCount || ""}</span>{Boolean(post.likeCount)&&<strong className="post-tool-count">{post.likeCount}</strong>}</button>
        {post.id !== sample.id && <button onClick={() => setCommentTarget(commentTarget === post.id ? null : post.id)} aria-label="Yorum yap"><Icon name="comment" /><span>Yorum {post.comments.length || ""}</span>{post.comments.length>0&&<strong className="post-tool-count">{post.comments.length}</strong>}</button>}
        <button onClick={() => sharePost(post)} aria-label="Paylaş"><Icon name="share" /><span>Paylaş</span></button>
        <button className={saved.includes(post.id) ? "selected" : ""} onClick={() => toggle("saved", post.id)} aria-pressed={saved.includes(post.id)} aria-label="Kaydet"><Icon name="save" /><span>Kaydet</span></button>
      </div>

      {post.id === sample.id && <small className="native-photo-credit">Fotoğraf: {plant?.photoCredit} · {plant?.photoLicense}</small>}
      {post.text && <p className="observation-text" data-user-content={post.id !== sample.id}>{post.text}</p>}{post.linkPreview && <LinkPreviewCard preview={post.linkPreview}/>}
      {post.organ && <p className="organ-label">Fotoğraftaki bölüm: {post.organ}</p>}
      {post.plantId?.startsWith("gbif-") ? <button className="post-species" onClick={()=>openLinkedTaxon(post.plantId!)}><Icon name="compass"/>Canlı tür künyesi #{post.plantId.slice(5)}<span aria-hidden="true">›</span></button> : post.plantId?.startsWith("flora-") ? <button className="post-species" onClick={()=>openTubi(Number(post.plantId!.slice(6)))}>Flora tür künyesi #{post.plantId.slice(6)}</button> : plant ? <button className="post-species" onClick={() => openPlant(plant.id)}>{plant.image && <ResponsivePhoto sizes="44px" className="species-name-photo" src={plant.image} alt="" loading="lazy"/>}<span><strong><i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span></span><b aria-hidden="true">›</b></button>
        : <button className="post-species unidentified" onClick={() => { setIdentifyTarget(post.id); setDraftPlant(""); navigate("identify"); }}>＋ {post.owner ? "Bu gözleme tür seç" : "Tür öner"}</button>}
      {!!post.suggestions?.length && <div className="suggestion-list"><strong>Tür önerileri</strong>{post.suggestions.map(suggestion => <div key={suggestion.id}><span>{suggestion.author}: <b>{plantById(suggestion.plantId)?.name || "Tür kaydı"}</b></span>{post.owner && <span className="suggestion-tools"><button onClick={async () => { try { await mutate("review-identification", { id: suggestion.id, decision: "approved" }); setPosts(previous => previous.map(item => item.id === post.id ? { ...item, plantId: suggestion.plantId, suggestions: item.suggestions?.filter(x => x.id !== suggestion.id) } : item)); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Öneri onaylanamadı."); } }}>Onayla</button><button onClick={async () => { try { await mutate("review-identification", { id: suggestion.id, decision: "rejected" }); setPosts(previous => previous.map(item => item.id === post.id ? { ...item, suggestions: item.suggestions?.filter(x => x.id !== suggestion.id) } : item)); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Öneri reddedilemedi."); } }}>Reddet</button></span>}</div>)}</div>}
      {post.position && <button className="location-link observation-map-link" onClick={() => openObservationMap(post)}><Icon name="pin" /> Gözlemi haritada gör</button>}
      {post.comments.length > 0 && <div className="comments">{post.comments.map((item, i) => <p key={i} data-user-content><strong>{item.author}:</strong> {item.text}</p>)}</div>}
      {commentTarget === post.id && <form className="comment-form" aria-busy={commentSending.includes(post.id)} onSubmit={event => sendComment(event, post.id)}><input disabled={commentSending.includes(post.id)} value={comment} onChange={event => setComment(event.target.value)} placeholder="Yorum yaz..." aria-label="Yorum" maxLength={300} /><button disabled={commentSending.includes(post.id)||!comment.trim()}>{commentSending.includes(post.id)?"Gönderiliyor…":"Gönder"}</button></form>}
    </article>;
  };

  const searchPanel = <SearchPanel onOpenTreeTaxon={selection=>navigate("discover",{treeSource:selection.source,treeId:selection.id,treeVersion:selection.version,entry:undefined,topic:undefined,tab:"overview"})} onOpenTaxon={entry=>navigate("discover",{entry,tab:"overview"})} onSubmitQuery={q=>navigate("search",{q})} onNature={q=>navigate("nature",{q})} onBirds={q=>navigate("birds",{q})} onFungi={q=>navigate("fungi",{q})} query={quickQuery} onQuery={setQuickQuery} language={language} plants={plants} onOpenPlant={openPlant} onOpenFlora={openTubi} onOpenGlobal={openGlobal} />;
  const openingSurface=<div className="surface-skeleton" role="status"><span className="sr-only">{language==="en"?"Opening this section…":"Bölüm açılıyor…"}</span><span/><span/><span/></div>;
  const catalogWorkbench = <TubiCatalog language={language} onOpen={openTubi} onMap={taxon => navigate("global-species", { taxon })} onCreate={id => navigate("create", { plant: `flora-${id}` })} plants={plants} state={catalogState} onChange={value => { setCatalogState(value); setSearch(value.q); }}/>;
  return translateTree(<div id="orman-atlas" data-view={view} className={`app-shell connected-design calm-redesign atlas-design atlas-workbench ${keyboardOpen ? "keyboard-open" : ""} ${solidControls ? "solid-controls" : ""} ${reducedMotion ? "reduced-motion" : ""} ${view === "home" ? "social-layout" : ""} ${view === "map" || view === "global-species" || view === "discover" || view === "database" || view === "flora" || view === "flora-record" || view === "assistant" || view === "care" || ["explore","search","health","fungi","birds","nature","forestry","publications","nurseries","store","create","identify","compare","admin","account","auth","social","gbif"].includes(view) ? "wide-view" : ""} ${view === "discover" ? "discover-layout" : ""}`}>
    <PwaRuntime language={language}/><a className="skip-link" href="#main-content">İçeriğe geç</a>
    <header className={`global-header ${view!=="home"?"has-mobile-title":""} ${!primaryScreen?"has-mobile-back":""}`} data-primary-screen={primaryScreen}>{!primaryScreen&&<button type="button" className="mobile-header-back" onClick={goBack} aria-label={language==="en"?"Go back":"Geri dön"}><svg viewBox="0 0 24 24" aria-hidden="true"><path d="m15 5-7 7 7 7"/></svg></button>}{view!=="home"&&<strong className="mobile-header-title">{translate(mobileTitle,language)}</strong>}<a className="brand" href="?view=home" onClick={event => { event.preventDefault(); navigate("home"); }}><span className="brand-mark"><img src="/brand/orman-emblem-128.webp" alt="" width="128" height="128" /></span><span>Orman Mühendisi<small>DOĞA ATLASI</small></span></a>
      <div className="header-search">{view!=="home"&&searchPanel}</div><button className="global-search" onClick={openSearch} aria-label={language==="en"?"Search the living world":"Canlılar dünyasında ara"}><Icon name="search" /><span>{language==="en"?"Search species or groups":"Tür veya canlı grubu ara"}</span><kbd>Ctrl K</kbd></button>
      <div className="header-buttons"><NavItem currentRoute={currentNavRoute} variant="header" label={translate("Harita",language)} submenuLabel={submenuLabel("Harita")} icon={<Icon name="pin"/>} route={{view:"map"}} active={activeSection==="map"} choices={submenuChoices("map")} onNavigate={route=>navigate(route.view,route)}/><button className="solid-action" onPointerDown={warmLens} onFocus={warmLens} onClick={openAdd} aria-label={language === "en" ? "Open Orman Lens" : "Orman Lens’i aç"} aria-haspopup="dialog" aria-controls="add-observation-menu"><Icon name="lens" /><span>{language==="en"?"Add":"Ekle"}</span></button><NavItem currentRoute={currentNavRoute} variant="avatar" label={translate("Hesap",language)} icon={name ? name[0].toLocaleUpperCase(language) : <Icon name="user"/>} route={{view:"profile"}} active={activeSection==="profile"} choices={submenuChoices("profile")} onNavigate={route=>navigate(route.view,route)}/><button className="mobile-menu-trigger" onClick={openMenu} aria-label="Tüm bölümler" aria-haspopup="dialog" aria-expanded={menuOpen} aria-controls="site-menu"><Icon name="menu" /></button></div>
      <button type="button" className="mobile-profile-trigger" aria-label={language==="en"?"My profile":"Profilim"} aria-current={activeSection==="profile"?"page":undefined} onPointerDown={()=>warmRoute("profile")} onFocus={()=>warmRoute("profile")} onClick={()=>navigate("profile")}><span aria-hidden="true">{name ? name[0].toLocaleUpperCase(language) : <Icon name="user"/>}</span></button>
    </header>
    <aside className="sidebar">{navigation()}<button className="sidebar-profile" onClick={() => navigate("profile")}><span className="rail-avatar">{name ? name[0] : <Icon name="user" />}</span><span><strong data-user-content>{name || "Kişisel alanım"}</strong><small>Gözlemler ve koleksiyonlar</small></span></button></aside>
    <main className="main-area" id="main-content" ref={mainRef} tabIndex={-1}><RouteSurface context={`${view}:${sectionEntry||selected}:${tubiId}`} language={language}><Suspense fallback={<div className="surface-skeleton" role="status"><span className="sr-only">{language==="en"?"Opening this section…":"Bölüm açılıyor…"}</span><span/><span/><span/></div>}>
      {!sessionReady&&["profile","account","create","identify","care","collections"].includes(view)&&<aside className="session-connect" role="status"><Icon name="user"/><span><strong>{language==="en"?"Open your personal space":"Kişisel alanını aç"}</strong><small>{language==="en"?"Sign in to save observations, follow people and keep your care plan.":"Gözlemlerini kaydetmek, kişileri takip etmek ve bakım planını saklamak için giriş yap."}</small></span><button onClick={()=>navigate("auth",{tab:"signin"})}>{language==="en"?"Sign in":"Giriş yap"}</button></aside>}
      {(view==="care"||careMounted)&&<section hidden={view!=="care"} inert={view!=="care"} className="persistent-care"><RouteSurface context="care" language={language}><Suspense fallback={openingSurface}><CareLibrary active={view === "care"} initialTab={sectionTab} initialPlant={view==="care"?mapPlant:""} onTab={tab=>navigate("care",{tab})} language={language} onGlobal={openGlobal} onAsk={q=>navigate("assistant",{q})} onHealth={q=>navigate("health",{q})}/></Suspense></RouteSurface></section>}
      {(mapMounted || view === "map" && mapMode === "regional") && <section hidden={view !== "map" || mapMode !== "regional"} className="view-surface persistent-map"><RouteSurface context="map" language={language}><Suspense fallback={openingSurface}><Explorer active={view === "map" && mapMode === "regional"} onOpenTaxon={entry=>navigate("discover",{entry,tab:"overview",q:""})} onCommunity={()=>navigate("map",{map:"community"})} onOpenFlora={openTubi} language={language} plants={plants} onOpenPlant={openPlant}/></Suspense></RouteSurface></section>}
      {homeMounted && <section hidden={view !== "home" || Boolean(sharedId)} className="view-surface persistent-feed">
        <HomeIntro language={language} search={searchPanel} featured={plants.find(p=>p.id==="cedrus-libani")} onAdd={openAdd} onPlant={openPlant} onNavigate={section=>navigate(section)} onSearch={q=>navigate("search",{q})} onAsk={q=>navigate("assistant",{q})}/><PersistentSocialFeed active={view === "home" && !sharedId} onSocial={id=>navigate("social",{entry:id,tab:"all",q:"",topic:undefined})} localPage={nativePage} initialTab={feedTab} onTabChange={tab => { setFeedTab(tab); const url = siteRouteUrl(new URL(window.location.href), { view: "home", feed: tab }); replaceRoute(url); }} language={language} plants={plants} posts={posts.filter(post=>!post.status||post.status === "approved")} renderPost={(post,tools) => postCard(post as Observation,tools)} liked={liked} saved={saved} engagement={externalEngagement} name={name} onCreate={openAdd} onIdentify={openAdd} onPlant={openPlant} onFlora={openTubi} onGlobal={openGlobal} onMap={taxon => navigate("global-species", { taxon })} onToggle={toggle} onComment={addComment} onMoreLocal={loadObservationPage} />
      </section>}
      <KeptSection name="discover" language={language} active={view==="discover"}><>{sectionTab==="photos"?<><button className="life-back" onClick={()=>navigate("discover",{tab:"overview",entry:undefined,topic:undefined,q:""})}>{language==="en"?"The Living World":"Canlılar Dünyası"}</button><Discover onFlora={openTubi} language={language} plants={plants} query={search} onQuery={setSearch} saved={saved} onToggle={toggle} onPlant={openPlant} onGlobal={openGlobal} onNavigate={navigate}/></>:(!sectionEntry||sectionEntry==="life")&&!sectionTopic?<TaxonomyExplorer onMap={node=>node.source==="gbif"?navigate("gbif",{gbif:{...emptyGbif,taxonKey:node.id},tab:"map"}):navigate("global-species",{taxon:node.name})} onTopic={topic=>navigate("discover",{topic,entry:undefined,q:""})} language={language} selection={{source:treeRoute.source,id:treeRoute.id,version:treeRoute.version||undefined}} mode={treeRoute.mode} query={search} onQuery={setSearch} onSelect={(selection,mode)=>navigate("discover",{treeSource:selection.source,treeId:selection.id,treeVersion:selection.version,treeMode:mode||treeRoute.mode,entry:undefined,topic:undefined,q:""})} onAsk={selection=>navigate("assistant",{treeSource:selection.source,treeId:selection.id,treeVersion:selection.version,q:"Bu taksonun bilimsel sınıflandırmasını ve kaynakta doğrulanan bilgilerini açıkla."})} onPhotos={()=>navigate("explore")}/>:<LifeDiscover language={language} plants={plants} query={search} onQuery={setSearch} nodeId={sectionEntry} tab={sectionTab} topic={sectionTopic} onSelect={(entry,tab="overview")=>navigate("discover",{entry,tab,topic:undefined,q:""})} onTopic={topic=>navigate("discover",{topic,entry:undefined,tab:"overview",q:""})} onPhotos={()=>navigate("discover",{tab:"photos",entry:undefined,topic:undefined,q:""})} onPlant={openPlant} onFlora={openTubi} onObserve={id=>navigate("create",{plant:id})} onGbif={key=>navigate("gbif",{gbif:{...emptyGbif,taxonKey:String(key)},tab:"records"})} onNavigate={navigate}/>}</></KeptSection>
      <KeptSection name="catalog" language={language} active={view==="database"||view==="flora"}><>{heading(view==="flora"?"Türkiye florası":"Bitki veri tabanı",view==="flora"?"database":undefined)}{view!=="flora"&&<SectionTools hub="database" language={language} section={view} onNavigate={section=>navigate(section)}/>} {view!=="flora"&&<div className="segmented catalog-switch"><button className={catalogMode === "flora" ? "active" : ""} onClick={()=>setCatalogMode("flora")}>{language === "en" ? "Türkiye flora" : "Türkiye florası"}</button><button className={catalogMode === "curated" ? "active" : ""} onClick={()=>setCatalogMode("curated")}>{language === "en" ? "Photo catalogue" : "Fotoğraflı katalog"}</button></div>}{view==="flora"||catalogMode === "flora" ? catalogWorkbench : <div className="content-panel">
        <div className="database-intro"><div><span className="eyebrow">FİLTRELENEBİLİR KATALOG</span><h2>Bitkileri ayrıntılarıyla bul.</h2><p>Bilimsel ad, familya ve özelliklere göre kayıtları daralt.</p></div><span className="database-symbol">✳</span></div>
        <div className="database-controls"><SearchPanel onSubmitQuery={query => { setSearch(query); }} query={search} onQuery={setSearch} language={language} plants={plants} onOpenPlant={openPlant} onOpenFlora={openTubi} onOpenGlobal={openGlobal} /><button className="filter-trigger" onClick={() => setFilterOpen(!filterOpen)} aria-expanded={filterOpen}>☷ Filtreler {activeFilters ? `(${activeFilters})` : ""}</button></div>
        {filterOpen && <div className="filter-panel">
          <div className="filter-panel-head"><strong>Bitki özellikleri</strong><button onClick={() => setFilters(emptyFilters)}>Filtreleri temizle</button></div>
          {(["family", "genus", "category", "leaf", "form", "habitat", "growth", "height", "life", "light", "humidity", "soil"] as const).map(key => {
            const options = unique(plants.filter(plant => key !== "genus" || !filters.family || plant.family === filters.family).map(plant => plant[key] || "").filter(Boolean));
            return <label key={key}>{({ family: "Familya", genus: "Cins", category: "Kategori", leaf: "Yaprak tipi", form: "Büyüme şekli", habitat: "Habitat", growth: "Büyüme hızı", height: "Bitki yüksekliği", life: "Yaşam süresi", light: "Işık", humidity: "Nem", soil: "Toprak" })[key]}<SearchSelect value={filters[key]} disabled={!options.length} onChange={event => setFilters(previous => ({ ...previous, [key]: event.target.value, ...(key === "family" ? { genus: "" } : {}) }))}><option value="">{options.length ? "Tümü" : "Kaynak veri yok"}</option>{options.map(value => <option key={value}>{value}</option>)}</SearchSelect></label>;
          })}
          <p className="filter-note">Kaynak verisi bulunmayan ölçütler pasiftir; tahmini sonuç gösterilmez. Yönetici yeni tür kayıtlarına doğrulanmış özellik ekledikçe filtreler açılır.</p>
        </div>}
        <div className="result-toolbar"><strong>{filteredPlants.length} kayıt</strong><button className="outline-action" onClick={() => navigate("flora")}>Türkiye florası · İl / Grid</button><label>Sırala <SearchSelect value={sortBy} onChange={event => setSortBy(event.target.value as "turkish" | "latin")}><option value="turkish">Türkçe ad</option><option value="latin">Bilimsel ad</option></SearchSelect></label></div>
        <div className="alphabet" aria-label="İlk harfe göre filtrele"><button className={!letterFilter ? "active" : ""} onClick={() => setLetterFilter("")}>Tümü</button>{"ABCÇDEFGHIİJKLMNOÖPRSŞTUÜVYZ".split("").map(letter => <button key={letter} onClick={() => setLetterFilter(previous => previous === letter ? "" : letter)} className={letterFilter === letter ? "active" : ""} aria-pressed={letterFilter === letter}>{letter}</button>)}</div>
        <div className="result-list">{filteredPlants.length ? filteredPlants.map(plant => <button className="result-row" key={plant.id} onClick={() => openPlant(plant.id)}><span className="mini-art">{plant.image ? <ResponsivePhoto src={plant.image} alt="" sizes="(max-width:700px) 100vw, 360px"/> : "✳"}</span><span><strong><i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span><small>{plant.family} · {plant.category}</small></span><b aria-hidden="true">›</b></button>) : <div className="empty-state">Bu ölçütlere uyan kayıt yok. Filtreleri değiştirebilirsiniz.</div>}</div>
      </div>}</></KeptSection>
<div className="view-surface" key={view}>
      {view === "explore" && <><Discover onTaxonomy={()=>navigate("discover",{entry:undefined,topic:undefined,tab:"overview",q:""})} onFlora={openTubi} language={language} plants={plants} query={search} onQuery={setSearch} saved={saved} onToggle={toggle} onPlant={openPlant} onGlobal={openGlobal} onNavigate={navigate}/><SectionTools hub="explore" language={language} section={view} onNavigate={section=>navigate(section)}/></>}
      {view === "search" && <SearchResults query={sectionQuery} language={language} plants={plants} onSearch={q=>navigate("search",{q})} onPlant={openPlant} onFlora={openTubi} onTaxon={node=>navigate("discover",{treeSource:node.source,treeId:node.id,treeVersion:node.version,tab:"overview",q:""})} onLife={entry=>navigate("discover",{entry,tab:"overview",q:""})}/> }
      {view === 'home' && sharedId && <section className="shared-observation">{heading(language === 'en' ? 'Shared observation' : 'Paylaşılan gözlem')}{sharedError ? <div className="empty-state" role="status">{language === 'en' ? 'Observation unavailable. Please retry.' : 'Gözlem şu an yüklenemedi. Yeniden deneyebilirsin.'}<button type="button" onClick={() => { window.location.reload(); }}>{language === 'en' ? 'Retry' : 'Yeniden dene'}</button></div> : sharedPost === undefined ? <p role="status">{language === 'en' ? 'Loading observation…' : 'Gözlem açılıyor…'}</p> : sharedPost ? postCard(sharedPost) : <div className="empty-state">{language === 'en' ? 'This observation is unavailable or no longer shared.' : 'Bu gözlem bulunamadı veya artık paylaşılmıyor.'}</div>}<button type="button" className="site-share-button shared-observation-return" onClick={() => navigate('home', { observation: undefined })}>{language === 'en' ? 'Explore the feed' : 'Doğa akışını keşfet'}</button></section>}

      {view === "social" && <SocialArchive language={language} admin={isAdmin} query={sectionQuery} platform={sectionTopic} kind={sectionTab} entry={sectionEntry} onFilter={(q,topic,tab)=>{const url=siteRouteUrl(new URL(window.location.href),{view:"social",q,topic,tab});replaceRoute(url);applyRoute(readSiteRoute(url.searchParams));}} onSelect={entry=>navigate("social",{entry,q:"",topic:undefined,tab:"all"})}/>}
      {view === "health"&&<PlantHealth language={language} initialSpecies={sectionQuery} onAsk={q=>navigate("assistant",{q})} onCare={()=>navigate("care")} onCatalog={q=>navigate("database",{q})}/>}
      {view === "fungi"&&<FungiLibrary language={language} initialQuery={sectionQuery} entry={sectionEntry} onSelect={entry=>navigate("fungi",{entry,q:sectionQuery})} onSearch={q=>navigate("fungi",{q,entry:undefined})} onNature={q=>navigate("nature",{q,group:"fungi"})}/>}
      {view === "birds"&&<NatureExplorer language={language} variant="birds" initialMap={sectionTab==="map"} initialQuery={sectionQuery} initialGroup="birds" onSearch={q=>navigate("birds",{q,entry:undefined})} entry={sectionEntry} onSelect={entry=>navigate("birds",{entry,q:sectionQuery})} onCatalog={q=>navigate("database",{q})} onFungi={q=>navigate("fungi",{q})}/> }
      {view === "nature"&&<NatureExplorer language={language} initialQuery={sectionQuery} initialGroup={natureGroup} onSearch={(q,group)=>navigate("nature",{q,group,entry:undefined})} entry={sectionEntry} onSelect={entry=>navigate("nature",{entry,q:sectionQuery,group:natureGroup})} onCatalog={q=>navigate("database",{q})} onFungi={q=>navigate("fungi",{q})}/>}
      {view==="catalogs"&&<SourceCatalog language={language} query={sourceCatalogQuery} onChange={sourceCatalog=>navigate("catalogs",{sourceCatalog})} onBack={()=>navigate("database")} onNature={(id,name)=>navigate("nature",{entry:id||undefined,q:id?"":name,group:"all"})} onGbif={(key,name)=>key?navigate("gbif",{gbif:{...emptyGbif,country:"",taxonKey:String(key)},tab:"records"}):navigate("global-species",{taxon:name})} onFlora={q=>navigate("database",{q})}/>}
      {view==="gbif"&&<GbifExplorer language={language} query={gbifQuery} tab={sectionTab} onChange={(gbif,tab)=>navigate("gbif",{gbif,tab})} onTaxon={key=>navigate("discover",{entry:`gbif-${key}`,tab:"overview",q:"",topic:undefined})} onTaxonomy={()=>navigate("discover",{entry:undefined,tab:"overview",q:"",topic:undefined})}/>}
      {["forestry","publications","nurseries"].includes(view)&&<ResourceHub kind={view==="forestry"?"forestry":view==="publications"?"publication":"nursery"} entry={sectionEntry} onSelect={entry=>navigate(view,{entry,q:sectionQuery})} onNavigate={(v,q)=>navigate(v,{q:q||"",tab:v==="store"?"seedling":undefined})}/>}
      {view === "store"&&<Marketplace initialQuery={sectionQuery} tab={sectionTab} entry={sectionEntry} onSelect={entry=>navigate("store",{entry,tab:sectionTab,q:sectionQuery})} onTab={tab=>navigate("store",{tab,entry:undefined,q:sectionQuery})} onNurseries={()=>navigate("nurseries")} onCatalog={q=>navigate("database",{q})}/>}


      {view === "flora-record" && <>{heading("Bitki künyesi", "flora")}<TubiDetail activeTab={detailTab} onTabChange={tab=>navigate("flora-record",{flora:tubiId,tab,from:returnView,catalog:catalogMode,catalogState})} initialRecord={initialFlora?.id===tubiId?initialFlora:undefined} onTaxon={entry=>navigate("discover",{entry,tab:"overview",q:"",topic:undefined})} id={tubiId} language={language} onCreate={()=>{setDraftPlant(`flora-${tubiId}`);navigate("create", { plant: `flora-${tubiId}` });}} observations={posts.filter(p=>p.plantId===`flora-${tubiId}`&&p.status === "approved")} onCatalog={backToResults} onAsk={name => navigate("assistant",{q:`${name} hakkında bilgi ver`})} onHealth={q=>navigate("health",{q})} onNature={q=>navigate("nature",{q})} onStore={q=>navigate("store",{q,tab:"seedling"})} onMap={taxon => navigate("global-species", { taxon })}/></>}
      {view === "library" && <>{heading("Kütüphane")}<div className="section-doorways"><button onClick={()=>navigate("fungi",{q:""})}><Icon name="mushroom"/><span>Mantarlar alemi</span></button><button onClick={()=>navigate("forestry",{q:""})}><Icon name="tree"/><span>Ormancılık çalışmaları</span></button><button onClick={()=>navigate("publications",{q:""})}><Icon name="paper"/><span>Bilimsel yayınlar</span></button></div><div className="library-portals"><button onClick={() => navigate("flora", { q: "" })}><Icon name="grid" /><span><strong>Türkiye florası</strong><small>İl, familya ve grid ile tara</small></span></button><button onClick={() => navigate("care")}><Icon name="leaf" /><span><strong>Bitki bakımı</strong><small>Işık, sulama ve yetiştirme</small></span></button><button onClick={() => navigate("glossary", { q: "" })}><Icon name="book" /><span><strong>Botanik sözlük</strong><small>Künyelerdeki kavramları öğren</small></span></button></div><div className="content-panel"><div className="intro-row"><span className="eyebrow">BİTKİ KÜTÜPHANESİ</span><h2>Fotoğraflı tür künyeleri.</h2><p>Taksonomik dizinde ilerleyin; her türün künyesine ve kaynak kaydına ulaşın.</p></div>
        <label className="library-search search-field"><Icon name="search" /><input value={librarySearch} onChange={event => setLibrarySearch(event.target.value)} placeholder="Kütüphanede Türkçe veya bilimsel adla ara" aria-label="Kütüphanede ara"/>{librarySearch && <button onClick={() => setLibrarySearch("")} aria-label="Aramayı temizle"><Icon name="close"/></button>}</label><div className="segmented library-tabs">{["Familya", "Cins", "Tür"].map(tab => <button key={tab} className={libraryTab === tab ? "active" : ""} onClick={() => setLibraryTab(tab)}>{tab}</button>)}</div>
        {libraryTab === "Tür" || librarySearch.trim() ? <><div className="plant-grid">{plants.filter(plant => `${plant.name} ${plant.latin} ${plant.family} ${plant.genus}`.toLocaleLowerCase("tr").includes(librarySearch.toLocaleLowerCase("tr"))).map(plantCard)}</div>{!plants.some(plant => `${plant.name} ${plant.latin} ${plant.family} ${plant.genus}`.toLocaleLowerCase("tr").includes(librarySearch.toLocaleLowerCase("tr"))) && <div className="empty-state">Bu aramada kayıt yok.<button className="solid-action" onClick={() => searchAll(librarySearch)}>Tüm veri tabanında ara</button></div>}</> : <div className="taxonomy-list">{unique(plants.map(plant => libraryTab === "Familya" ? plant.family : plant.genus)).map(group => <details key={group}><summary><span>✳</span><strong>{group}</strong><small>{plants.filter(plant => (libraryTab === "Familya" ? plant.family : plant.genus) === group).length} tür</small><b>⌄</b></summary>{libraryTab === "Familya" ? unique(plants.filter(p => p.family === group).map(p => p.genus)).map(genus => <details className="genus-branch" key={genus}><summary><strong>{genus}</strong><small>{plants.filter(p => p.family === group && p.genus === genus).length} tür</small></summary>{plants.filter(p => p.family === group && p.genus === genus).map(plant => <button key={plant.id} onClick={() => openPlant(plant.id)}>{plant.name}<em>{plant.latin}</em></button>)}</details>) : plants.filter(plant => plant.genus === group).map(plant => <button key={plant.id} onClick={() => openPlant(plant.id)}>{plant.name}<em>{plant.latin}</em></button>)}</details>)}</div>}
        <div className="bottom-cta"><div><strong>Bitkini tanı. İyi bak.</strong><p>Işık, sulama ve yetiştirme ipuçları.</p></div><button onClick={() => navigate("care")}>Bakım kütüphanesi</button></div>
        <div className="bottom-cta"><div><strong>Aradığın türü bulamadın mı?</strong><p>Veri tabanında bilimsel adla aramayı dene.</p></div><button onClick={() => navigate("database")}>Bitki ara</button></div>
      </div></>}
      {view === "detail" && !plantById(selected) && <>{heading("Tür kaydı")}<div className="content-panel empty-state"><h2>Bu tür kaydı bulunamadı.</h2><p>{ready ? "Bağlantıdaki tür katalogda yer almıyor." : "Tür kayıtları yükleniyor…"}</p><button className="solid-action" onClick={() => navigate("database")}>Veri tabanına dön</button></div></>}
      {view === "detail" && plantById(selected) && <>{heading("Bitki künyesi", "database")}<div className="content-panel detail-panel">
        <div className="species-cover species-profile-hero">{current.image&&<div className="species-cover-media"><PhotoAlbum priority language={language} name={current.name} photos={[{url:current.image,credit:current.photoCredit,license:current.photoLicense?`https://creativecommons.org/licenses/by-sa/${current.photoLicense.includes("3.0")?"3.0":"4.0"}/`:undefined,reference:current.photoSource}]}/></div>}<div className="species-cover-content"><span className="eyebrow">{current.family}</span><h2><i>{current.latin}</i></h2><p className="species-turkish-name">{current.name}</p>{current.description&&<p className="species-intro">{current.description}</p>}<div className="species-primary-actions"><button className="solid-action" onClick={()=>navigate("global-species",{taxon:current.latin})}><Icon name="pin"/>Harita</button><button onClick={()=>navigate("create",{plant:current.id})}><Icon name="camera"/>Gözlem ekle</button><ActionSheet title={language==="en"?"Species actions":"Tür işlemleri"} language={language}><button onClick={()=>navigate("compare",{compare:[current.id,plants.find(p=>p.id!==current.id&&p.family===current.family)?.id||plants.find(p=>p.id!==current.id)?.id||current.id]})}>Türleri karşılaştır</button><button onClick={()=>{setCollectionTarget(current.id);navigate("collections");}}>Koleksiyona kaydet</button><button onClick={()=>navigate("assistant",{q:`${current.name} hakkında bilgi ver`})}>Asistana sor</button><button onClick={()=>navigate("health",{q:current.latin})}>Sağlık kontrolü</button><button onClick={()=>navigate("nature",{q:current.latin.split(" ").slice(0,2).join(" ")})}>Doğa gözlemleri</button><button onClick={()=>navigate("store",{q:current.latin.split(" ").slice(0,2).join(" "),tab:"seedling"})}>Fidan bul</button><button onClick={()=>navigate("glossary",{q:""})}>Botanik terimler</button><button onClick={()=>navigate("library")}>Tür kütüphanesi</button><button onClick={()=>navigate("flora",{q:current.latin})}>Flora kayıtlarını aç</button><a href={current.source} target="_blank" rel="noreferrer">Bilimsel kaynak</a><a href={`https://www.google.com/search?q=${encodeURIComponent(current.latin+" plant")}&hl=${language}`} target="_blank" rel="noreferrer">Google’da ara</a></ActionSheet></div></div></div>
        {current.photoSource&&<div className="photo-attribution">Fotoğraf: <a href={current.photoSource} target="_blank" rel="noreferrer">{current.photoCredit}</a> · <a href={`https://creativecommons.org/licenses/by-sa/${current.photoLicense?.includes("3.0")?"3.0":"4.0"}/`} target="_blank" rel="noreferrer">{current.photoLicense}</a></div>}
        <PageTabs items={speciesTabs.map(tab=>({id:tab,label:translate(tab,language)}))} selected={detailTab} onSelect={setDetailTab} panelId={detailPanelId} label={language==="en"?"Plant information":"Bitki bilgileri"}/>
        <div id={detailPanelId} role="tabpanel" aria-labelledby={`${detailPanelId}-tab-${speciesTabs.indexOf(detailTab)}`} tabIndex={0}>
        {detailTab === "Künye" && <div className="detail-body"><details className="profile-disclosure"><summary>{language==="en"?"Taxonomy and scientific identity":"Taksonomi ve bilimsel kimlik"}</summary><LifePath name={current.latin.split(" ").slice(0,2).join(" ")} language={language} onSelect={entry=>navigate("discover",{entry,tab:"overview",q:"",topic:undefined})}/><CuratedTaxonomy scientificName={current.latin} language={language} onOpen={openTubi}/><div className="fact-grid">{[
          ["Alem", "Bitkiler"], ["Tohum grubu", current.seedGroup],
          ["Familya", current.family], ["Cins", current.genus], ["Tür", current.latin], ["Türkçe adı", current.name],
        ].filter(([, value]) => Boolean(value)).map(([label, value]) => <div className="fact" key={label}><span>{label}</span>{label === "Familya" || label === "Cins" ? <button className="taxonomy-jump" onClick={() => { setSearch(""); setLetterFilter(""); setCatalogMode("curated"); setFilters({ ...emptyFilters, family: current.family, ...(label === "Cins" ? { genus: current.genus } : {}) }); navigate("database", { catalog: "curated", q: "" }); }}>{value}</button> : <strong>{value}</strong>}</div>)}</div></details>
          <details className="profile-disclosure"><summary>{language==="en"?"Türkiye flora and distribution":"Türkiye florası ve yayılış"}</summary><div className="ecology-section"><span className="eyebrow">TÜRKİYE FLORASI</span><h3>Ekoloji ve Türkiye florası</h3><div className="fact-grid compact">{[["İl / bölge", current.provinces], ["Davis grid karesi", current.grid], ["Rakım aralığı", current.elevation], ["Çiçeklenme dönemi", current.flowering], ["Endemizm", current.endemism], ["Fitocoğrafik bölge", current.floristicRegion]].map(([label, value]) => <div className="fact" key={label}><span>{label}</span><strong>{value || "Veri eklenmedi"}</strong></div>)}</div><p>{language === "en" ? "Sourced flora fields are separate from occurrence locations." : "Kaynaklı flora bilgileri gözlem konumlarından ayrı tutulur."}</p></div>
          {current.ecologySource && <a className="ecology-source" target="_blank" rel="noreferrer" href={current.ecologySource}>Flora · Kaynak kaydı</a>}
          {!!current.floraRecords?.length && <div className="flora-records"><h3>Flora kaynak kayıtları</h3><p>Alt taksonların bilgileri ayrı gösterilir. Bu adlandırmalar flora kaynak kaydına aittir; güncel kabul edilen adlarla farklılık gösterebilir.</p>{current.floraRecords.map(record => <details key={record.name}><summary><i>{record.name}</i><span>{record.endemism}</span></summary><div className="fact-grid compact">{[["İl / bölge", record.provinces], ["Davis grid karesi", record.grid], ["Rakım aralığı", record.elevation]].map(([label, value]) => <div className="fact" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div><a target="_blank" rel="noreferrer" href={record.source}>Flora · Kaynak kaydı</a></details>)}</div>}
          </details><details className="profile-disclosure"><summary>{language==="en"?"Local names and notes":"Yöresel adlar ve notlar"}</summary><VernacularNames plantId={current.id} language={language}/><div className="detail-callout"><strong>Kişisel yöresel ad notlarım</strong><p>{localNames[current.id]?.length ? localNames[current.id].join(" · ") : "Bu kayıt için kişisel yöresel isim notunuz yok."}</p><button onClick={() => { setContribute("name"); setContributionText(""); }}>＋ Kişisel ad notu ekle</button></div></details></div>}
        {detailTab === "Genel bilgi" && <div className="detail-body prose"><span className="eyebrow">GENEL BİLGİ</span><h2>{current.name}</h2><p>{current.description}</p><div className="fact-grid compact">{[["Kategori", current.category], ["Büyüme şekli", current.form], ["Yaprak tipi", current.leaf], ["Habitat", current.habitat], ["Büyüme hızı", current.growth], ["Bitki yüksekliği", current.height], ["Yaşam süresi", current.life], ["Işık", current.light], ["Nem", current.humidity], ["Toprak", current.soil]].filter(([, value]) => Boolean(value)).map(([label, value]) => <div className="fact" key={label}><span>{label}</span><strong>{value}</strong></div>)}</div></div>}
        {detailTab === "Yaprak" && <div className="detail-body prose"><span className="eyebrow">MORFOLOJİ</span><h2>Yaprak</h2><p>{current.leafNote ?? "Bu tür için kaynaklı yaprak açıklaması henüz eklenmedi."}</p><div className="fact-grid compact"><div className="fact"><span>Yaprak tipi</span><strong>{current.leaf}</strong></div><div className="fact"><span>Yaprak şekli ve dizilişi</span><strong>{current.leafShape || "Doğrulanmış kaynak bilgisi bulunamadı"}</strong></div></div><div className="detail-callout"><strong>Benim yaprak notum</strong><p data-user-content={Boolean(leafNotes[current.id])}>{leafNotes[current.id] || "Bu tür için henüz bir not yazmadınız."}</p><button onClick={() => { setContribute("leaf"); setContributionText(leafNotes[current.id] || ""); }}>＋ Yaprak bilgisi ekle</button></div></div>}
        {detailTab === "Çiçek & meyve" && <div className="detail-body prose"><span className="eyebrow">MORFOLOJİ</span><h2>Üreme yapıları</h2><p>{current.fruitNote ?? "Bu tür için doğrulanmış çiçek, kozalak veya meyve açıklaması henüz eklenmedi."}</p></div>}
        {detailTab === "Gövde & kabuk" && <div className="detail-body prose"><span className="eyebrow">MORFOLOJİ</span><h2>Gövde ve kabuk</h2><p>{current.barkNote || "Bu tür için doğrulanmış gövde ve kabuk açıklaması henüz eklenmedi."}</p></div>}
        {detailTab === "Yayılış" && <div className="detail-body prose"><span className="eyebrow">COĞRAFYA</span><h2>Doğal yayılış</h2><p>{current.range || "Bu tür için doğal yayılış bilgisi eklenmedi."}</p><p className="source-note">Bu bilgi doğal yayılışı anlatır; kullanıcı gözlem haritasındaki kayıtlarla aynı şey değildir.</p>{current.source && <a className="text-link" href={current.source} target="_blank" rel="noreferrer">Yayılış kaynağını aç</a>}<Explorer onOpenFlora={openTubi} key={current.id} language={language} plants={plants} onOpenPlant={openPlant} taxonName={current.latin} /></div>}
        {detailTab === "Kaynaklar" && <div className="detail-body prose"><span className="eyebrow">KAYNAKÇA</span><h2>Bilgi kaynağı</h2><p>Bilimsel ad ve doğal yayılış için tür kaynağına bakın. Kullanıcıların gözlemleri ve kişisel notları ayrı tutulur; fotoğraftaki bitkinin teşhisi bağımsız olarak doğrulanmalıdır.</p><a className="text-link" href={current.source} target="_blank" rel="noreferrer">Tür kaynağını aç</a></div>}
        {current.morphologySource && <p className="botanical-citation"><a href={current.morphologySource} target="_blank" rel="noreferrer">{language === "en" ? "Morphology source · species-level account" : "Morfoloji kaynağı · tür düzeyindeki açıklama"}</a></p>}

        </div>
<div className="species-lower">
          <section className="species-observations"><div className="section-title"><div><span className="eyebrow">SAHADAN</span><h2>Bu türle ilişkili gözlemler</h2></div><button onClick={() => { setDraftPlant(current.id); navigate("create", { plant: current.id }); }}>Gözlem ekle ＋</button></div>
            {speciesPosts.length ? <div className="species-observation-grid">{speciesPosts.slice(0, 6).map(post => <button key={post.id} onClick={() => { navigate("home", { feed: "community", observation: post.id }); window.setTimeout(() => document.getElementById(`gozlem-${post.id}`)?.scrollIntoView({ block: "center" }), 120); }}><span className="observation-tile-image">{post.image ? <img src={post.image} alt={`${current.name} gözlemi`} /> : <span>Fotoğraf yok</span>}</span><strong>{post.organ || "Genel görünüş"}</strong><small>{post.author} · {post.date}</small></button>)}</div> : <p className="species-empty">Bu tür için henüz topluluk gözlemi yok. Yaprak, kozalak, meyve veya genel görünüş fotoğrafını ekleyebilirsiniz.</p>}
          </section>
          {relatedPlants.length > 0 && <section className="related-species"><div className="section-title"><div><span className="eyebrow">KARŞILAŞTIR</span><h2>Yakın türler</h2></div></div><p>Önce aynı cins, ardından aynı familyadaki kayıtlar gösterilir. Benzerlik bir teşhis sonucu değildir.</p><div className="related-grid">{relatedPlants.map(plant => <button key={plant.id} onClick={() => openPlant(plant.id)}><span>{plant.genus === current.genus ? "AYNI CİNS" : "AYNI FAMİLYA"}</span><strong><i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span><small>{plant.family}</small></button>)}</div></section>}
        </div>
      </div></>}
      {view === "identify" && <>{heading("Bitki tanımla", identifyTarget ? "home" : "create")}<div className="content-panel flow-panel">
        <div className="stepper"><span className="done">1 · Fotoğraf</span><span className="current">2 · Tür seçimi</span><span>3 · Gözlem</span></div>
        <span className="eyebrow">TÜR BELİRLEME</span><h2>Bu bitki hangi tür?</h2><p>Fotoğrafı ve bitkinin organlarını karşılaştırarak türü kendiniz seçin. Buradaki liste fotoğraf analizi sonucu değildir; otomatik teşhis veya güven yüzdesi üretmiyoruz.</p>
        {(identifyTarget ? posts.find(post => post.id === identifyTarget)?.image : draftImage) && <div className="identify-preview"><img src={(identifyTarget ? posts.find(post => post.id === identifyTarget)?.image : draftImage) || ""} alt="Tanımlanacak bitki fotoğrafı" /><span>{identifyTarget ? posts.find(post => post.id === identifyTarget)?.organ || "Genel görünüş" : draftOrgan}</span></div>}
        <label className="search-field">⌕ <input value={candidateQuery} onChange={event => setCandidateQuery(event.target.value)} placeholder="Türkçe veya bilimsel adla ara" /></label>
        <div className="candidate-list">{candidatePlants.length ? candidatePlants.map(plant => <button className={draftPlant === plant.id ? "active" : ""} key={plant.id} onClick={() => setDraftPlant(plant.id)}><span className="mini-art">{plant.image ? <ResponsivePhoto src={plant.image} alt="" sizes="(max-width:700px) 100vw, 360px"/> : "✳"}</span><span><strong><i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span><small>{plant.family} · {plant.leaf === "İğne" ? "İğne yaprak" : "Geniş yaprak"}</small></span><b>{draftPlant === plant.id ? "✓" : "＋"}</b></button>) : <div className="empty-state">Bu adla tür bulunamadı. Gözlemi tür belirtmeden kaydedebilirsiniz.</div>}</div>
        {plantById(draftPlant) && <div className="candidate-compare"><span className="eyebrow">SEÇİLEN TÜRÜ KARŞILAŞTIR</span><h3>{plantById(draftPlant)?.name}</h3><p>{plantById(draftPlant)?.description}</p><dl><div><dt>Yaprak</dt><dd>{plantById(draftPlant)?.leafNote || plantById(draftPlant)?.leaf}</dd></div><div><dt>Kozalak / meyve</dt><dd>{plantById(draftPlant)?.fruitNote || "Bu kayıt için açıklama eklenmedi."}</dd></div><div><dt>Doğal yayılış</dt><dd>{plantById(draftPlant)?.range || "Kaynak veri eklenmedi."}</dd></div></dl><a href={plantById(draftPlant)?.source} target="_blank" rel="noreferrer">Bilimsel kaydı incele</a></div>}
        <div className="identify-photo-help"><Icon name="camera" /><div><strong>Bir bitki, farklı ayrıntılar</strong><p>Yaprak, çiçek, meyve ve genel görünüşü karşılaştır. Katalogdan tür seçebilir veya tür bekleyen bir gözlem paylaşabilirsin.</p></div><button onClick={() => navigate("create")}>Fotoğraf ekle</button></div>
        <div className="identify-actions"><button onClick={() => { setDraftPlant(""); setIdentifyTarget(null); navigate(identifyTarget ? "home" : "create"); }}>Hiçbirine benzemiyor</button><button className="solid-action" onClick={async () => {
          if (identifyTarget) {
            const target = posts.find(post => post.id === identifyTarget);
            let suggestionId = "";
            if (draftPlant && !target?.legacy) {
              try { const result = await mutate(target?.owner ? "identify-post" : "suggest-identification", { id: identifyTarget, plantId: draftPlant }); suggestionId = result.id || ""; }
              catch (cause) { setNotice(cause instanceof Error ? cause.message : "Tür seçimi kaydedilemedi."); return; }
            }
            if (target?.owner) setPosts(previous => previous.map(post => post.id === identifyTarget ? { ...post, plantId: draftPlant || undefined } : post));
            else if (draftPlant) setPosts(previous => previous.map(post => post.id === identifyTarget ? { ...post, suggestions: [...(post.suggestions || []), { id: suggestionId, plantId: draftPlant, author: name || "Üye" }] } : post));
            if (posts.find(post => post.id === identifyTarget)?.legacy) {
              const old = read<Observation[]>("om.posts", [sample]).map(post => post.id === identifyTarget ? { ...post, plantId: draftPlant } : post);
              localStorage.setItem("om.posts", JSON.stringify(old));
            }
            setIdentifyTarget(null);
            setDraftPlant("");
            navigate("home");
            setNotice(draftPlant ? target?.owner ? "Tür seçimi gözleme eklendi." : "Tür önerisi gözlem sahibine gönderildi." : "Gözlem tür bekliyor.");
          } else navigate("create");
        }}>{draftPlant ? "Seçimi onayla" : "Tür seçmeden devam et"}</button></div>
      </div></>}
      {view === "create" && <>{heading("Yeni gözlem")}<div className="content-panel composer-panel"><ObservationComposer owner={accountId||"guest"} authenticated={sessionReady} initialDraftId={deviceDraftId} language={language} plants={plants} initialPlant={draftPlant} initialFile={draftFile} initialNote={draft} incomingPhotos={photoBatches[0]} onPhotosConsumed={consumePhotos} onSaved={()=>{void fetch("/api/state",{cache:"no-store"}).then(r=>r.json()).then(data=>setPosts([...(data as StoredState).posts,sample]));setDraftPlant("");setDraftFile(null);setDraftImage("");setDraft("");navigate("profile");setNotice(language === "en" ? "Observation saved." : "Gözlem kaydedildi.");}}/></div></>}
      {view === "map" && mapMode === "community" && <>{heading("Topluluk haritası")}<div className="content-panel map-panel"><button type="button" className="outline-action" onClick={()=>navigate("map",{map:"regional"})}>{language === "en" ? "Explore the world map" : "Dünya haritasını keşfet"}</button><div className="intro-row"><span className="eyebrow">HARİTALAMA</span><h2>Sahadaki gözlemler</h2><p>Bir gözlem seçerek konumunu haritada inceleyin. Konum yalnızca gözlem sahibi tarafından eklendiğinde görünür.</p></div>
        <div className="map-toolbar"><strong>{mappedPosts.length} konumlu gözlem</strong><label>Tür<SearchSelect value={mapPlant} onChange={event => { setMapPlant(event.target.value); setMapSelected(""); }}><option value="">Tüm türler</option>{plants.filter(plant => posts.some(post => post.position && post.plantId === plant.id)).map(plant => <option key={plant.id} value={plant.id}>{plant.name}</option>)}</SearchSelect></label></div>
        {mappedPosts.length && mapUrl ? <div className="map-workspace"><div className="map-frame"><iframe key={selectedMapPost.id} title={`${plantById(selectedMapPost.plantId)?.name || "Gözlem"} konumu`} src={mapUrl} loading="lazy" referrerPolicy="no-referrer" /><div className="map-attribution">Harita © OpenStreetMap katkıcıları</div></div><div className="map-results"><div className="map-results-head">Gözlem seç <small>{mappedPosts.length} kayıt</small></div>{mappedPosts.map(post => <button key={post.id} className={selectedMapPost.id === post.id ? "active" : ""} onClick={() => setMapSelected(post.id)}><span className="map-result-thumb">{post.image ? <img src={post.image} alt="" /> : "⌖"}</span><span><strong>{plantById(post.plantId)?.name || "Tür belirlenmedi"}</strong><small>{post.author} · {post.date}</small><em>{post.position?.latitude}, {post.position?.longitude}</em></span></button>)}</div></div> : <div className="map-empty"><span>⌖</span><h3>{mapPlant ? "Bu tür için konumlu gözlem yok." : "Henüz konumlu gözlem yok."}</h3><p>Yeni gözlem oluştururken konum eklediğinizde kayıtlar burada görünür.</p><button onClick={() => mapPlant ? setMapPlant("") : navigate("create")}>{mapPlant ? "Tüm gözlemleri göster" : "Konumlu gözlem ekle"}</button></div>}
        {selectedMapPost?.position && <div className="map-selected"><div><span className="eyebrow">SEÇİLEN GÖZLEM</span><strong>{plantById(selectedMapPost.plantId)?.name || "Tür belirlenmedi"}</strong><small>{selectedMapPost.text || selectedMapPost.organ || "Konumlu gözlem"}</small></div><div className="map-selected-links">{selectedMapPost.plantId && <button onClick={() => selectedMapPost.plantId?.startsWith("flora-") ? openTubi(Number(selectedMapPost.plantId.slice(6))) : openPlant(selectedMapPost.plantId!)}>Tür künyesini aç</button>}<a href={coordinateLink(selectedMapPost.position)} target="_blank" rel="noreferrer">OpenStreetMap’te aç</a></div></div>}
      </div></>}
      {view === "compare" && <>{heading("Türleri karşılaştır", "database")}<div className="content-panel comparison-panel"><span className="eyebrow">KARŞILAŞTIR</span><h2>{language === "en" ? "Look closely. Compare side by side." : "Yakından bak. Yan yana karşılaştır."}</h2><p>{language === "en" ? "Compare sourced catalogue traits. Missing fields remain empty; this is not an identification score." : "Kaynaklı katalog özelliklerini karşılaştırın. Eksik alanlar belirtilir; benzerlik bir teşhis sonucu değildir."}</p><div className="comparison-pickers">{compareIds.map((id, index) => <label key={index}>{language === "en" ? `Species ${index + 1}` : `Tür ${index + 1}`}<SearchSelect value={id} onChange={event => setCompareIds(previous => previous.map((v, i) => i === index ? event.target.value : v))}>{plants.map(p => <option key={p.id} value={p.id}>{p.name} · {p.latin}</option>)}</SearchSelect></label>)}</div><div className="comparison-photos">{compareIds.map((id, i) => { const plant = plantById(id) || plants[0]; return <button key={i} onClick={() => openPlant(id)}>{plant.image && <img src={plant.image} alt={plant.name} />}<strong><i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span><small>{plant.photoCredit} · {plant.photoLicense}</small></button>; })}</div><div className="comparison-scroll"><table className="comparison-table"><caption>{language === "en" ? "Sourced plant characteristics" : "Kaynaklı bitki özellikleri"}</caption><tbody>{([['Familya','family'], ['Cins','genus'], ['Yaprak tipi','leaf'], ['Büyüme şekli','form'], ['Doğal yayılış','range'], ['Yaşam süresi','life'], ['Rakım aralığı','elevation'], ['Habitat','habitat'], ['Yaprak bilgisi','leafNote'], ['Kozalak / meyve','fruitNote']] as const).map(([label, key]) => <tr key={key}><th scope="row">{label}</th>{compareIds.map((id, i) => <td key={i}>{plantById(id)?.[key] || "Veri eklenmedi"}</td>)}</tr>)}<tr><th scope="row">Kaynaklar</th>{compareIds.map((id, i) => <td key={i}><a href={plantById(id)?.source} target="_blank" rel="noreferrer">Bilimsel kaynak</a>{plantById(id)?.ecologySource && <a href={plantById(id)?.ecologySource} target="_blank" rel="noreferrer">Flora kaynağı</a>}</td>)}</tr></tbody></table></div></div></>}
      {view === "global-species" && <>{heading(globalTaxon, "map")}<div className="content-panel"><Explorer onOpenFlora={openTubi} key={globalTaxon} language={language} plants={plants} onOpenPlant={openPlant} taxonName={globalTaxon} onOpenTaxon={entry=>navigate("discover",{entry,tab:"overview",q:""})}/></div></>}
      {view === "glossary" && <>{heading("Botanik sözlük")}<div className="content-panel"><div className="intro-row"><span className="eyebrow">BİTKİ SÖZLÜĞÜ</span><h2>Terimleri kolayca bul.</h2><p>Bitki künyelerinde kullanılan temel kavramların kısa açıklamaları.</p></div><label className="search-field">⌕ <input value={glossarySearch} onChange={event => setGlossarySearch(event.target.value)} placeholder="Sözlükte kelime ara" />{glossarySearch && <button onClick={() => setGlossarySearch("")} aria-label="Temizle">×</button>}</label>
        <div className="glossary-list">{glossary.filter(([term, definition]) => `${term} ${definition} ${translate(term, "en")} ${translate(definition, "en")}`.toLocaleLowerCase("tr").includes(glossarySearch.toLocaleLowerCase("tr"))).map(([term, definition]) => <details key={term}><summary><span>{term.slice(0, 1)}</span><strong>{term}</strong><b>＋</b></summary><p>{definition}</p></details>)}</div>
      </div></>}
      {view === "collections" && <>{heading("Koleksiyonlarım")}<div className="content-panel"><div className="intro-row"><span className="eyebrow">KİŞİSEL ARŞİV</span><h2>Seçtiğin türler bir arada.</h2><p>İlgilendiğin bitkiler için kendi koleksiyonlarını oluştur. Kayıtlar hesabına bağlıdır.</p></div>
        {collectionTarget && <div className="collection-picker"><strong>{plantById(collectionTarget)?.name} için koleksiyon seç</strong>{collections.map(collection => <button key={collection.id} onClick={() => toggleCollectionItem(collection.id, collectionTarget)}>{collection.name}<span>{collection.items.includes(collectionTarget) ? "✓ Eklendi" : "＋ Ekle"}</span></button>)}<button onClick={() => setCollectionTarget(null)}>Bitti</button></div>}
        <form className="new-collection" onSubmit={addCollection}><label>Koleksiyon adı<input value={collectionName} onChange={event => setCollectionName(event.target.value)} maxLength={50} placeholder="Örn. Torosların ağaçları" /></label><button>＋ Yeni koleksiyon</button></form>
        <div className="section-title"><h2>Koleksiyonlar</h2><button onClick={() => navigate("library")}>Tür kütüphanesini aç</button></div><div className="collection-grid">{collections.map(collection => <article key={collection.id}><span>▣</span><h3 data-user-content>{collection.name}</h3><p>{collection.items.length} tür</p>{collection.items.length ? collection.items.map(id => <button key={id} onClick={() => openPlant(id)}>{plantById(id)?.name}</button>) : <small>Henüz tür eklenmedi.</small>}<button className="remove-collection" onClick={async () => { try { await mutate("delete-collection", { id: collection.id }); setCollections(previous => previous.filter(item => item.id !== collection.id)); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Koleksiyon silinemedi."); } }}>Koleksiyonu sil</button></article>)}</div>
        {plants.some(plant => saved.includes(plant.id)) && <section className="saved-species"><div className="section-title"><h2>Kaydedilen türler</h2><button onClick={() => navigate("library")}>Tür kütüphanesi</button></div><div className="plant-grid">{plants.filter(plant => saved.includes(plant.id)).map(plantCard)}</div></section>}
        {!collections.length && <div className="empty-state">İlk koleksiyonunu adlandır. Tür künyesindeki “Koleksiyona kaydet” ile bitkileri buraya ekle.</div>}
      </div></>}
      {view === "profile" && <>{heading("Profilim")}<div className="content-panel"><div className="profile-cover"><span className="profile-avatar">{name ? name[0].toLocaleUpperCase("tr") : "✳"}</span><div><span className="eyebrow light">GÖZLEM ARŞİVİ</span><h2 data-user-content={Boolean(name)}>{name || "Üye"}</h2><p>Hesabındaki gözlemler ve koleksiyonlar</p></div><button onClick={() => navigate("account")}>Hesap bilgileri</button></div>
        <div className="profile-stats"><button onClick={() => document.querySelector(".profile-posts")?.scrollIntoView({ block: "start", behavior: "smooth" })}><strong>{posts.filter(post => post.id !== sample.id && post.owner).length}</strong><span>Gözlem</span></button><button onClick={() => navigate("collections")}><strong>{collections.length}</strong><span>Koleksiyon</span></button><button onClick={openSaved}><strong>{saved.length}</strong><span>Kaydedilen</span></button></div>
        <section className="profile-network-panel"><SocialConnections language={language} onArchive={()=>navigate("social",{tab:"all",q:"",entry:undefined})}/><button type="button" className="site-share-button" onClick={()=>requestShare({url:canonicalRoute({view:"home"}),title:"Orman Mühendisi · Doğayı birlikte keşfet"})}><Icon name="share"/>{language === "en" ? "Share the site" : "Siteyi paylaş"}</button></section><div className="section-title"><div><span className="eyebrow">KİŞİSEL İÇERİK</span><h2>Gözlemlerim</h2></div><button onClick={() => navigate("create")}>Yeni gözlem ＋</button></div>
        <DeviceDrafts owner={accountId||"guest"} language={language} onOpen={id=>navigate("create",{deviceDraft:id})}/><div className="profile-posts">{posts.filter(post => post.id !== sample.id && post.owner).length ? posts.filter(post => post.id !== sample.id && post.owner).map(post => <article key={post.id}><div>{post.image && <img src={post.image} alt="" />}<div><button className="profile-species-link" disabled={!post.plantId} onClick={() => post.plantId && openLinkedTaxon(post.plantId)}>{plantById(post.plantId)?.name || (post.plantId?.startsWith("flora-") ? "Flora tür künyesi" : post.plantId?.startsWith("gbif-") ? "Canlı tür künyesi" : "Tür belirlenmedi")}</button><p>{post.text || post.organ || "Fotoğraflı gözlem"}</p>{post.position && <button className="profile-map-link" onClick={() => openObservationMap(post)}><Icon name="pin" /> Haritada gör</button>}<small>{post.legacy ? "Önceki sürüm · Bu cihazda" : post.date} · {post.status === "draft" ? "Özel taslak" : post.status === "pending" ? "Onay bekliyor" : post.status === "rejected" ? "Düzeltme istendi" : "Yayımlandı"} {post.photos?.length ? `· ${post.photos.length} fotoğraf` : ""}</small>{post.reviewNote && <p data-user-content>{post.reviewNote}</p>}{!!post.photos?.length && <details className="profile-album"><summary>Fotoğrafları incele ({post.photos.length})</summary><div className="approved-photo-album"><PhotoAlbum photos={post.photos} language={language} name={plantById(post.plantId)?.name||"Gözlem fotoğrafları"}/></div></details>}{post.status && post.status !== "approved" && <button onClick={async()=>{try{await mutate("submit-observation",{id:post.id});setPosts(all=>all.map(p=>p.id===post.id?{...p,status:"pending"}:p));}catch(e){setNotice(e instanceof Error?e.message:"İşlem tamamlanamadı.");}}} disabled={post.status === "pending"}>{post.status === "pending" ? "Onay bekliyor" : "Paylaşım için onaya gönder"}</button>}{post.status && post.status !== "draft" && <button onClick={async()=>{try{await mutate("withdraw-observation",{id:post.id});setPosts(all=>all.map(p=>p.id===post.id?{...p,status:"draft"}:p));}catch(e){setNotice(e instanceof Error?e.message:"İşlem tamamlanamadı.");}}}>Özel taslağa al</button>}</div></div>{post.legacy ? <button onClick={() => importLegacy(post)}>Hesaba aktar</button> : <button onClick={async () => { try { await mutate("delete-post", { id: post.id }); setPosts(previous => previous.filter(item => item.id !== post.id)); } catch (cause) { setNotice(cause instanceof Error ? cause.message : "Gözlem silinemedi."); } }}>Sil</button>}</article>) : <div className="empty-state">Henüz bir gözleminiz yok.</div>}</div>
        <div className="profile-links"><button onClick={() => navigate("collections")}>▣ Koleksiyonlarım <span aria-hidden="true">›</span></button><button onClick={openSaved}>♡ Kaydedilen gönderiler <span aria-hidden="true">›</span></button></div>
        {isAdmin && <div className="profile-links"><button onClick={() => navigate("admin")}>✎ Tür yönetimi <span aria-hidden="true">›</span></button></div>}
      </div></>}
      {view === "admin" && isAdmin && <>{heading("Tür yönetimi")}<div className="admin-overview"><div><span className="eyebrow">ORMAN MÜHENDİSİ / EDİTÖR</span><h2>Bilgiyi birlikte büyüt.</h2></div><div><strong>{posts.filter(p=>p.status === "pending").length}</strong><span>Bekleyen gözlem</span></div><div><strong>{plants.length}</strong><span>Fotoğraflı tür</span></div><button onClick={()=>{setEditPlant({ ...blankPlant });setAdminFile(null);document.getElementById("species-editor")?.scrollIntoView({block:"start",behavior:"smooth"});}}>Yeni tür ekle</button></div><ObservationReview language={language} plants={plants} posts={posts} onDecision={(id,status,plantId)=>setPosts(all=>all.map(p=>p.id === id ? {...p,status,plantId} : p))}/><details className="admin-connections"><summary><Icon name="monitor"/><span>{language==="en"?"Service connections":"Servis bağlantıları"}<small>{language==="en"?"Map and assistant settings":"Harita ve asistan ayarları"}</small></span></summary><div><MapSettings language={language}/><AssistantSettings language={language}/></div></details><div className="content-panel admin-panel" id="species-editor"><div className="intro-row"><span className="eyebrow">YÖNETİCİ PANELİ</span><h2>Bitki kütüphanesini büyüt.</h2><p>Kaynağını doğruladığın yeni türü ekle. Boş morfoloji alanları tür sayfasında eksik veri olarak gösterilir.</p></div>
        <form onSubmit={savePlant} className="admin-form">
          <label>Türkçe ad *<input value={editPlant.name} onChange={event => setEditPlant(previous => ({ ...previous, name: event.target.value }))} required maxLength={100} /></label>
          <label>Bilimsel ad *<input value={editPlant.latin} onChange={event => setEditPlant(previous => ({ ...previous, latin: event.target.value }))} required maxLength={140} /></label>
          <label>Familya *<input value={editPlant.family} onChange={event => setEditPlant(previous => ({ ...previous, family: event.target.value }))} required maxLength={80} /></label>
          <label>Cins *<input value={editPlant.genus} onChange={event => setEditPlant(previous => ({ ...previous, genus: event.target.value }))} required maxLength={80} /></label>
          {(["category", "leaf", "form", "habitat", "growth", "height", "life", "light", "humidity", "soil"] as const).map(key => <label key={key}>{({ category: "Kategori", leaf: "Yaprak tipi", form: "Büyüme şekli", habitat: "Habitat", growth: "Büyüme hızı", height: "Bitki yüksekliği", life: "Yaşam süresi", light: "Işık", humidity: "Nem", soil: "Toprak" })[key]}<SearchSelect value={editPlant[key] || ""} onChange={event => setEditPlant(previous => ({ ...previous, [key]: event.target.value }))}>{!["category", "leaf", "form"].includes(key) && <option value="">Bilgi ekleme</option>}{plantOptions[key].map(option => <option key={option}>{option}</option>)}</SearchSelect></label>)}
          <div className="full ecology-admin-intro"><strong>Kaynaklı ekoloji bilgileri</strong><p>Bu alanları yalnızca doğrulanmış kaynak varsa doldurun; rakım bitki boyundan farklıdır.</p></div>
          {(["provinces", "grid", "elevation", "flowering", "endemism", "floristicRegion"] as const).map(key => <label key={key}>{({ provinces: "İl / bölge", grid: "Davis grid karesi", elevation: "Rakım aralığı", flowering: "Çiçeklenme dönemi", endemism: "Endemizm", floristicRegion: "Fitocoğrafik bölge" })[key]}<input value={editPlant[key] || ""} onChange={event => setEditPlant(previous => ({ ...previous, [key]: event.target.value }))} maxLength={400} /></label>)}
          <label className="full">{language === "en" ? "Ecology source URL" : "Ekoloji kaynak bağlantısı"}<input type="url" value={editPlant.ecologySource || ""} onChange={event => setEditPlant(previous => ({ ...previous, ecologySource: event.target.value }))} maxLength={600} /></label><label>Tür fotoğrafı<input type="file" accept="image/jpeg,image/png,image/webp" onChange={event => setAdminFile(event.target.files?.[0] || null)} /></label>
          <label className="full">Doğal yayılış *<input value={editPlant.range} onChange={event => setEditPlant(previous => ({ ...previous, range: event.target.value }))} required maxLength={400} /></label>
          <label className="full">Genel bilgi *<textarea value={editPlant.description} onChange={event => setEditPlant(previous => ({ ...previous, description: event.target.value }))} rows={4} required maxLength={2000} /></label>
          <label className="full">Yaprak bilgisi<textarea value={editPlant.leafNote || ""} onChange={event => setEditPlant(previous => ({ ...previous, leafNote: event.target.value }))} rows={3} maxLength={800} /></label>
          <label className="full">Gövde ve kabuk bilgisi<textarea value={editPlant.barkNote || ""} onChange={event=>setEditPlant(p=>({...p,barkNote:event.target.value}))} rows={3} maxLength={800}/></label><label>Yaprak şekli ve dizilişi<input value={editPlant.leafShape||""} onChange={event=>setEditPlant(p=>({...p,leafShape:event.target.value}))} maxLength={400}/></label><label>Morfoloji kaynak bağlantısı<input type="url" value={editPlant.morphologySource||""} onChange={event=>setEditPlant(p=>({...p,morphologySource:event.target.value}))}/></label><label className="full">Çiçek, meyve veya kozalak bilgisi<textarea value={editPlant.fruitNote || ""} onChange={event => setEditPlant(previous => ({ ...previous, fruitNote: event.target.value }))} rows={3} maxLength={800} /></label>
          <label className="full">Kaynak bağlantısı (HTTPS) *<input type="url" value={editPlant.source} onChange={event => setEditPlant(previous => ({ ...previous, source: event.target.value }))} required placeholder="https://..." /></label>
          <div className="admin-form-actions"><button className="submit-button" type="submit">{editPlant.id ? "Değişiklikleri kaydet" : "Türü veri tabanına ekle"}</button>{editPlant.id && <button type="button" onClick={() => { setEditPlant(blankPlant); setAdminFile(null); }}>İptal</button>}</div>
        </form>
        <div className="section-title"><div><span className="eyebrow">YÖNETİLEN KAYITLAR</span><h2>Eklenen türler</h2></div></div>
        <div className="result-list">{plants.filter(plant => !starterPlants.some(starter => starter.id === plant.id)).length ? plants.filter(plant => !starterPlants.some(starter => starter.id === plant.id)).map(plant => <button key={plant.id} className="result-row" onClick={() => { setEditPlant(plant); window.scrollTo({ top: 0, behavior: "smooth" }); }}><span className="mini-art">✳</span><span><strong><i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span></span><b>Düzenle</b></button>) : <div className="empty-state">Henüz yeni bir tür eklenmedi.</div>}</div>
      </div></>}
      {view === "auth"&&<AccountAccess language={language} mode={sectionTab} onMode={tab=>navigate("auth",{tab})} signInUrl={signInUrl} onContinue={()=>navigate("home")}/>}
      {view === "account" && <>{heading("Hesap", "profile")}<AccountPanel language={language} name={name} onName={setName} authenticated={sessionReady} onSave={async()=>{await mutate("set-name",{value:name.trim()});setName(name.trim());}} onAccess={()=>navigate("auth",{tab:"signin"})} onProfile={()=>navigate("profile")}/></>}
    </div><ProfileSettings active={view==="account"} language={language} onLanguage={setLanguage}/>{view === "assistant"&&<PlantAssistant taxonContext={treeRoute.id?{source:treeRoute.source,id:treeRoute.id,version:treeRoute.version||undefined}:undefined} active={view === "assistant"} prompt={assistantPrompt} language={language} onOpen={source => source.profile.kind === "taxonomy" ? navigate("discover",{treeSource:source.profile.source,treeId:source.profile.id,treeVersion:source.profile.version}) : source.profile.kind === "plant" ? openPlant(source.profile.id) : openTubi(Number(source.profile.id))} onMap={taxon => navigate("global-species", {taxon})} onCatalog={state => navigate("database",{catalog:"flora",catalogState:state,q:state.q})} onNavigate={navigate}/>}</Suspense></RouteSurface></main>
    <aside className="right-rail"><div className="rail-heading"><span className="eyebrow">YAKINDAN TANI</span><Icon name="leaf" /></div><button className="rail-species" onClick={() => openPlant(view === "detail" ? current.id : "cedrus-libani")}>
      <img src={(view === "detail" ? current : plants[0]).image} alt={(view === "detail" ? current : plants[0]).name} loading="lazy" /><span><small>{(view === "detail" ? current : plants[0]).family}</small><strong>{(view === "detail" ? current : plants[0]).name}</strong><em>{(view === "detail" ? current : plants[0]).latin}</em><b>Tür künyesini incele</b><span className="rail-photo-credit">Foto: {(view === "detail" ? current : plants[0]).photoCredit} · {(view === "detail" ? current : plants[0]).photoLicense}</span></span></button>
      <div className="rail-links"><h3>Keşfe devam et</h3><button onClick={() => navigate("flora", { q: view === "detail" ? current.latin : "" })}><Icon name="grid" /><span><strong>Türkiye florası</strong><small>İl ve grid kayıtları</small></span></button><button onClick={() => navigate("care")}><Icon name="leaf" /><span><strong>Bitki bakımı</strong><small>Bitkini tanı, iyi bak</small></span></button><button onClick={() => navigate("glossary", { q: "" })}><Icon name="book" /><span><strong>Botanik sözlük</strong><small>Temel kavramlar</small></span></button></div>
      <div className="rail-personal"><h3>Benim arşivim</h3><button onClick={() => navigate("profile")}><span>Gözlemlerim</span><strong>{posts.filter(post => post.owner).length}</strong></button><button onClick={() => navigate("collections")}><span>Koleksiyonlarım</span><strong>{collections.length}</strong></button><button onClick={openSaved}><span>Kaydedilenler</span><strong>{saved.length}</strong></button></div><SocialConnections language={language} onArchive={()=>void navigate("social",{tab:"all",q:"",entry:undefined})}/><p>© Orman Mühendisi</p>
    </aside>
    {view!=="assistant"&&<div className="floating-assistant"><button ref={chatButton} type="button" className="chat-launcher" aria-expanded={chatOpen} aria-controls="plant-chat" aria-label={language==="en"?"Ask the plant assistant":"Bitki asistanına sor"} onPointerEnter={()=>warmRoute("assistant")} onFocus={()=>warmRoute("assistant")} onPointerDown={()=>warmRoute("assistant")} onClick={()=>{setChatMounted(true);warmRoute("assistant");setChatOpen(open=>!open);}}><Icon name={chatOpen?"close":"sparkles"}/><span>{language==="en"?"Ask":"Sor"}</span></button><div id="plant-chat" className="plant-chat" hidden={!chatOpen} role="dialog" aria-label={language==="en"?"Plant chat":"Bitki sohbeti"} onKeyDown={event=>{if(event.key==="Escape"){setChatOpen(false);chatButton.current?.focus();}}}><div className="chat-bar"><span><Icon name="leaf"/>{language==="en"?"Plant assistant":"Bitki asistanı"}</span><button type="button" onClick={()=>{setChatOpen(false);chatButton.current?.focus();}} aria-label={language==="en"?"Close chat":"Sohbeti kapat"}>×</button></div>{chatMounted&&<Suspense fallback={<p className="chat-loading" role="status">{language==="en"?"Opening chat…":"Sohbet açılıyor…"}</p>}><PlantAssistant taxonContext={treeRoute.id?{source:treeRoute.source,id:treeRoute.id,version:treeRoute.version||undefined}:undefined} compact autoPrompt active={chatOpen} prompt={assistantPrompt} language={language} onOpen={source=>{setChatOpen(false);source.profile.kind==="taxonomy"?navigate("discover",{treeSource:source.profile.source,treeId:source.profile.id,treeVersion:source.profile.version}):source.profile.kind==="plant"?openPlant(source.profile.id):openTubi(Number(source.profile.id));}} onMap={taxon=>{setChatOpen(false);navigate("global-species",{taxon});}} onCatalog={state=>{setChatOpen(false);navigate("database",{catalog:"flora",catalogState:state,q:state.q});}} onNavigate={next=>{setChatOpen(false);navigate(next);}}/></Suspense>}</div></div>}
    <ShareSheet target={shareTarget} language={language} onClose={() => setShareTarget(null)}/>
    <MobileDock section={activeSection} language={language} onNavigate={navigate} onAdd={openAdd}/>
    <AddMenu dialog={addDialog} autoStart={lensAutoStart} captureControl={lensCaptureControl} owner={accountId||"guest"} language={language} admin={isAdmin} authenticated={sessionReady} onClose={()=>{}} onCapture={async(files,candidate)=>{if(!await navigate("create",{deviceDraft:deviceDraftId}))return false;setPhotoBatches(all=>[...all,{id:clientId(),files,...(candidate?.taxonId?{taxon:{id:candidate.taxonId,label:[candidate.commonName,candidate.scientificName].filter(Boolean).join(" · ")}}:{})}]);return true;}} onTaxon={id=>openLinkedTaxon(id)} onConnect={()=>{void navigate("admin");}} onSignIn={()=>{void navigate("auth",{tab:"signin"});}} onPhotos={files=>{void (async()=>{if(!await navigate("create",{deviceDraft:deviceDraftId}))return;setPhotoBatches(all=>[...all,{id:clientId(),files}]);})();}} onWrite={()=>navigate("create")} onIdentify={()=>navigate("identify")} onDrafts={()=>navigate("profile")}/>
    <dialog className="search-dialog" ref={searchDialog} aria-labelledby="search-dialog-title" onClick={event => { if (event.target === event.currentTarget) searchDialog.current?.close(); }}><div className="dialog-title"><div><span className="eyebrow">ORMAN MÜHENDİSİ</span><h2 id="search-dialog-title">{language==="en"?"Search the Living World":"Canlılar dünyasında ara"}</h2></div><button onClick={() => searchDialog.current?.close()} aria-label="Kapat">×</button></div>{searchPanel}<div className="search-quick-links"><button onClick={() => searchAll(quickQuery)}><Icon name="grid" /> Veri tabanında ara</button><button onClick={() => navigate("glossary", { q: quickQuery })}><Icon name="book" /> Sözlükte ara</button></div><div className="search-popular"><span>Tür künyeleri</span>{plants.slice(0,3).map(plant => <button key={plant.id} onClick={() => openPlant(plant.id)}>{plant.image && <ResponsivePhoto src={plant.image} alt="" sizes="(max-width:700px) 100vw, 360px"/>}<span><strong><i>{plant.latin}</i></strong><span className="catalog-turkish-name">{plant.name}</span></span></button>)}</div></dialog>
    <dialog className="menu-dialog section-directory" id="site-menu" ref={menuDialog} onClose={() => setMenuOpen(false)} aria-labelledby="menu-dialog-title" onClick={event => { if (event.target === event.currentTarget) menuDialog.current?.close(); }}><div className="section-directory-header"><div className="dialog-title"><h2 id="menu-dialog-title">{language==="en"?"Menu":"Menü"}</h2><button type="button" onClick={() => closeMenu(true)} aria-label={language==="en"?"Close menu":"Menüyü kapat"}><Icon name="close"/></button></div><label className="menu-section-search"><Icon name="search"/><input type="search" value={menuQuery} onChange={e=>setMenuQuery(e.target.value)} placeholder={language==="en"?"Find a section or source…":"Bölüm veya kaynak ara…"} aria-label={language==="en"?"Search site sections":"Menüde bölüm ara"}/></label><SectionShortcuts language={language} section={activeSection} onNavigate={section=>navigate(section)}/></div><div className="section-directory-body">{mobileMenu()}<SocialConnections language={language} compact/><button type="button" className="site-share-button" onClick={()=>requestShare({url:canonicalRoute({view:"home"}),title:"Orman Mühendisi · Doğayı birlikte keşfet"})}><Icon name="share"/>{language === "en" ? "Share the site" : "Siteyi paylaş"}</button><div className="menu-personal"><button onClick={openSaved}><Icon name="save" /> Kaydedilenler</button><button onClick={openAdd}><Icon name="camera" /> Gözlem ekle</button></div><details className="app-accessibility-options"><summary>Görünüm ve hareket</summary><label><input type="checkbox" checked={solidControls} onChange={event=>{setSolidControls(event.target.checked);localStorage.setItem("om.solidControls",event.target.checked ? "1" : "0");}}/>Cam görünüm yerine düz menü</label><label><input type="checkbox" checked={reducedMotion} onChange={event=>{setReducedMotion(event.target.checked);localStorage.setItem("om.reducedMotion",event.target.checked ? "1" : "0");}}/>Hareketleri azalt</label></details></div></dialog>
    {contribute && <div className="modal-backdrop" onClick={() => setContribute(null)}><div className="modal" role="dialog" aria-modal="true" aria-label={contribute === "name" ? "Yöresel isim ekle" : "Yaprak bilgisi ekle"} onClick={event => event.stopPropagation()}><button className="close" onClick={() => setContribute(null)} aria-label="Kapat">×</button><span className="eyebrow">KİŞİSEL NOT</span><h2>{contribute === "name" ? "Yöresel isim ekle" : "Yaprak bilgisi ekle"}</h2><p>Bu bilgi hesabınızda kişisel not olarak saklanır; türün doğrulanmış künyesini değiştirmez.</p><form onSubmit={saveContribution}><label>{contribute === "name" ? "Yöresel isim" : "Yaprak notu"}<textarea value={contributionText} onChange={event => setContributionText(event.target.value)} maxLength={400} rows={3} required /></label><button className="submit-button">Kaydet</button></form></div></div>}
    {!ready && <div className="toast" role="status">Kayıtlar yükleniyor…</div>}
    {notice && <div className="toast" role="status">{notice}</div>}
  </div>, language);
}
