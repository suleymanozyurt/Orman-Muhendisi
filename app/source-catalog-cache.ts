import type { CatalogPage } from "./catalog-types.ts";
import { ResolvedSourceCache } from "./resolved-source-cache.ts";
// Back navigation restores the exact source, filters, page and language.
const pages = new ResolvedSourceCache<{ page: CatalogPage; freshUntil: number }>(2 * 1024 * 1024, 40);
export const catalogPageKey = (parameters: string, language: string) => `${parameters}&language=${language}`;
export const readCatalogPage = (key: string) => pages.get(key);
export function rememberCatalogPage(key: string, page: CatalogPage) {
  pages.set(key, { page, freshUntil: Date.now() + 300000 }, 1800000);
}
