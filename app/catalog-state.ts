export type CatalogState = {
  q: string; family: string; genus: string; province: string; provinces: string[];
  grid: string; endemic: boolean; rank: string; life: string; form: string;
  sort: "scientific" | "common" | "family"; offset: number; layout: "list" | "cards";
};
export const emptyCatalog: CatalogState = { q: "", family: "", genus: "", province: "", provinces: [], grid: "", endemic: false, rank: "", life: "", form: "", sort: "scientific", offset: 0, layout: "list" };
export const catalogKeys = ["q", "family", "genus", "province", "provinces", "grid", "endemic", "rank", "life", "form", "sort", "offset", "layout"];
export function readCatalog(params: URLSearchParams): CatalogState {
  const offset = Number(params.get("offset") || 0);
  const text = (key: string) => (params.get(key) || "").trim().slice(0, 160);
  return { ...emptyCatalog, q: text("q"), family: text("family"), genus: text("genus"), province: text("province"),
    provinces: [...new Set(params.getAll("provinces"))].slice(0, 81), grid: text("grid"), endemic: params.get("endemic") === "1",
    rank: ["species", "subspecies", "variety"].includes(text("rank")) ? text("rank") : "", life: text("life"), form: text("form"),
    sort: params.get("sort") === "common" ? "common" : params.get("sort") === "family" ? "family" : "scientific",
    offset: Number.isInteger(offset) && offset >= 0 && offset <= 100000 ? Math.floor(offset / 48) * 48 : 0,
    layout: params.get("layout") === "cards" ? "cards" : "list" };
}
export function writeCatalog(params: URLSearchParams, state: CatalogState): void {
  catalogKeys.forEach(key => params.delete(key));
  for (const key of ["q", "family", "genus", "province", "grid", "rank", "life", "form"] as const) if (state[key]) params.set(key, state[key]);
  state.provinces.forEach(value => params.append("provinces", value));
  if (state.endemic) params.set("endemic", "1");
  if (state.sort !== "scientific") params.set("sort", state.sort);
  if (state.offset) params.set("offset", String(state.offset));
  if (state.layout === "cards") params.set("layout", "cards");
}
export function catalogApiParams(state: CatalogState): URLSearchParams {
  const params = new URLSearchParams(); writeCatalog(params, state); params.delete("layout"); params.set("limit", "48"); return params;
}
