import {emptySourceCatalog,readSourceCatalog,sourceCatalogParams,sourceCatalogKeys,type SourceCatalogQuery} from "./source-catalog-query";
import { readCatalog, writeCatalog, catalogKeys, type CatalogState } from "./catalog-state";
import {emptyGbif,readGbifQuery,gbifParams,gbifRouteKeys,type GbifQuery} from "./gbif-query";
export const views = ["home", "search", "explore", "discover", "database", "library", "detail", "identify", "create", "map", "glossary", "collections", "profile", "account", "auth", "admin", "global-species", "compare", "flora", "flora-record", "care", "assistant", "health", "fungi", "birds", "nature", "forestry", "publications", "nurseries", "store", "social", "gbif", "catalogs"] as const;
export type View = typeof views[number];
export type SiteRoute = {
  view: View; topic?:string; entry?:string; group?:string; catalogState?: CatalogState; from?: View; species?: string; flora?: number; taxon?: string; q?: string;
  catalog?: "flora" | "curated"; feed?: string; compare?: string[];
  tab?: string; map?: "regional" | "community"; plant?: string; observation?: string; deviceDraft?: string;
  gbif?:GbifQuery; sourceCatalog?:SourceCatalogQuery; treeSource?:"itis"|"col"|"ictv"|"gbif"|"powo"; treeId?:string; treeVersion?:string; treeMode?:"list"|"tree";
};
const slug = (value: string | null) => value && /^[a-z0-9-]{1,120}$/.test(value) ? value : undefined;
const detailTabs = ["Künye", "Genel bilgi", "Yaprak", "Çiçek & meyve", "Gövde & kabuk", "Yayılış", "Kaynaklar"];
const keys = ["treeSource","treeId","treeVersion","treeMode",...catalogKeys,...gbifRouteKeys,...sourceCatalogKeys, "from", "view", "species", "flora", "taxon", "q", "catalog", "feed", "compare", "tab", "map", "plant", "observation", "entry", "group", "topic", "deviceDraft"];

export function readSiteRoute(params: URLSearchParams): SiteRoute {
  const species = slug(params.get("species"));
  const floraValue = params.get("flora");
  const flora = floraValue && /^\d{1,7}$/.test(floraValue) && Number(floraValue) > 0 ? Number(floraValue) : undefined;
  const section = params.get("view") as View;
  let view: View = flora ? "flora-record" : species ? "detail" : views.includes(section) ? section : "home";
  const taxon = params.get("taxon")?.trim().slice(0, 200) || undefined;
  if (view === "global-species" && !taxon) view = "map";
  if (view === "flora-record" && !flora || view === "detail" && !species) view = "database";
  const compare = params.get("compare")?.split(",").map(v => slug(v)).filter((v): v is string => Boolean(v)).slice(0, 2);
  const tab = params.get("tab") || "";
  return { view, treeSource:["itis","col","ictv","gbif","powo"].includes(params.get("treeSource")||"")?params.get("treeSource") as SiteRoute["treeSource"]:undefined, treeId:params.get("treeId")?.slice(0,120)||undefined, treeVersion:params.get("treeVersion")?.slice(0,40)||undefined, treeMode:params.get("treeMode")==="tree"?"tree":"list", sourceCatalog:view==="catalogs"?readSourceCatalog(params):undefined, gbif:view==="gbif"?readGbifQuery(params,true)||{...emptyGbif}:undefined, topic:slug(params.get("topic")), catalogState: readCatalog(params), from: views.includes(params.get("from") as View) ? params.get("from") as View : undefined, species, flora, taxon, q: params.get("q")?.slice(0, 200) || "",
    catalog: params.get("catalog") === "curated" ? "curated" : "flora",
    feed: ["all", "following", "community", "pending", "saved"].includes(params.get("feed") || "") ? params.get("feed")! : "all",
    compare: compare?.length === 2 ? compare : undefined,
    entry:slug(params.get("entry")), group:["fungi","birds","all"].includes(params.get("group")||"")?params.get("group")!:"plants", tab:view==="gbif"?(["records","map","statistics","datasets"].includes(tab)?tab:"records"):view==="social"?(["all","photo","video","article"].includes(tab)?tab:"all"):view==="discover"?(["overview","classification","species","distribution","map","images","sources","photos"].includes(tab)?tab:"overview"):view==="auth"?(tab==="signup"?"signup":"signin"):view==="store"?(["book","seedling","cart","orders","mine"].includes(tab)?tab:"book"):view==="birds"?(tab==="map"?"map":"photos"):view==="care"?(["today","plants","calendar","guides"].includes(tab)?tab:"today"):detailTabs.includes(tab) ? tab : "Künye", map: params.get("map") === "community" ? "community" : "regional",
    plant: slug(params.get("plant")), observation: params.get("observation")?.slice(0, 120) || undefined, deviceDraft: slug(params.get("deviceDraft")) };
}

export function siteRouteUrl(base: URL, route: SiteRoute): URL {
  const url = new URL(base); keys.forEach(key => url.searchParams.delete(key)); url.hash = "";
  url.searchParams.set("view", route.view);
  if(route.view==="catalogs"){for(const [key,value] of sourceCatalogParams(route.sourceCatalog||emptySourceCatalog,true))url.searchParams.set(key,value);}
  if(route.view==="gbif"){for(const [key,value] of gbifParams(route.gbif||emptyGbif,true))url.searchParams.set(key,value);}
  const set = (key: string, value: string | number | undefined) => { if (value) url.searchParams.set(key, String(value)); };
  if (["database", "flora"].includes(route.view) || (["detail", "flora-record"].includes(route.view) && ["database", "flora"].includes(route.from || ""))) { if (route.catalogState) writeCatalog(url.searchParams, route.catalogState); }
  if (["detail", "flora-record"].includes(route.view)) { set("from", route.from); if (route.from === "database") set("catalog", route.catalog); }
  if (route.view === "detail") { set("species", route.species); set("tab", route.tab); }
  if (route.view === "flora-record") { set("flora", route.flora); set("tab", route.tab); }
  if (route.view === "global-species") set("taxon", route.taxon);
  if (["discover","assistant"].includes(route.view)) {set("treeSource",route.treeSource);set("treeId",route.treeId);set("treeVersion",route.treeVersion);set("treeMode",route.treeMode);}
  if (["explore", "search", "discover", "database", "flora", "glossary", "assistant", "health", "fungi", "birds", "nature", "forestry", "publications", "nurseries", "store", "social"].includes(route.view)) set("q", route.q);
  if (["discover","fungi","birds","nature","forestry","publications","nurseries","store","social"].includes(route.view)) set("entry",route.entry);
  if (["discover","store","care","birds","auth","social"].includes(route.view)) set("tab",route.tab);
  if(route.view==="gbif")set("tab",["records","map","statistics","datasets"].includes(route.tab||"")?route.tab:"records");
  if (route.view === "care") set("plant",route.plant);
  if (["discover","social"].includes(route.view)) set("topic",route.topic);
  if (route.view === "nature") set("group",route.group);
  if (route.view === "database") set("catalog", route.catalog);
  if (route.view === "home") { set("feed", route.feed); set("observation", route.observation); }
  if (route.view === "compare" && route.compare?.length === 2) set("compare", route.compare.join(","));
  if (route.view === "map") { set("map", route.map); set("plant", route.plant); set("observation", route.observation); }
  if (route.view === "create") { set("plant", route.plant); set("deviceDraft", route.deviceDraft); }
  return url;
}
