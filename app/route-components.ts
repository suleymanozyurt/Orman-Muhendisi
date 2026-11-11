import { reusableImport, allowRouteWarmup } from "./route-loading";
import type { View } from "./navigation";
export const routeLoaders = {
  search: reusableImport(() => import("./search-results")),
  assistant: reusableImport(() => import("./plant-assistant")),
  explorer: reusableImport(() => import("./explorer")),
  floraCatalog: reusableImport(() => import("./tubi-catalog")),
  floraDetail: reusableImport(() => import("./tubi-detail")),
  health: reusableImport(() => import("./plant-health")),
  fungi: reusableImport(() => import("./fungi-library")),
  nature: reusableImport(() => import("./nature-explorer")),
  resources: reusableImport(() => import("./resource-hub")),
  market: reusableImport(() => import("./marketplace")),
  care: reusableImport(() => import("./care-library")),
  photos: reusableImport(() => import("./discover")),
  taxonomy: reusableImport(() => import("./taxonomy-explorer")),
  life: reusableImport(() => import("./life-discover")),
  lifePath: reusableImport(() => import("./life-path")),
  composer: reusableImport(() => import("./observation-composer")),
  drafts: reusableImport(() => import("./device-drafts")),
  review: reusableImport(() => import("./observation-review")),
  mapSettings: reusableImport(() => import("./map-settings")),
  assistantSettings: reusableImport(() => import("./assistant-settings")),
  social: reusableImport(() => import("./social-archive")),
  catalogs: reusableImport(() => import("./source-catalog")),
  gbif: reusableImport(() => import("./gbif-explorer")),
};
const byView: Partial<Record<View, (keyof typeof routeLoaders)[]>> = {
  database: ["floraCatalog"], flora: ["floraCatalog"], explore: ["photos"], search: ["search"], discover: ["taxonomy", "life"], "flora-record": ["floraDetail"], detail: ["lifePath"],
  map: ["explorer"], "global-species": ["explorer"], assistant: ["assistant"],
  care: ["care"], health: ["health"], fungi: ["fungi"], birds: ["nature"], nature: ["nature"],
  forestry: ["resources"], publications: ["resources"], nurseries: ["resources"], store: ["market"],
  create: ["composer"], profile: ["drafts"], admin: ["review"], social: ["social"],
  gbif:["gbif"], catalogs:["catalogs"],
};
export function warmRoute(view: View) {
  if (typeof navigator === "undefined" || !allowRouteWarmup((navigator as Navigator & { connection?: { saveData?: boolean; effectiveType?: string } }).connection)) return;
  for (const key of byView[view] || []) void routeLoaders[key]().catch(() => { /* Normal navigation can retry an unsuccessful warm-up. */ });
}
