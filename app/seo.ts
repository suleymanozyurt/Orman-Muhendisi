import { readSiteRoute, type SiteRoute } from "./navigation";
export const siteOrigin = "https://ormanmuhendisi.suleymanozyurt49.chatgpt.site";
const privateViews = new Set(["profile", "account", "auth", "admin", "create", "collections", "care", "assistant", "identify"]);
export function canonicalRoute(route: SiteRoute) {
  const query = new URLSearchParams({ view: route.view });
  if (route.view === "detail" && route.species) query.set("species", route.species);
  if (route.view === "flora-record" && route.flora) query.set("flora", String(route.flora));
  if (route.view === "discover") { if (route.entry && route.entry !== "life") query.set("entry", route.entry); if (route.topic) query.set("topic", route.topic); }
  if (route.view === "social" && route.entry) query.set("entry", route.entry);
  if (route.view === "home") return siteOrigin + (route.observation ? '/?view=home&observation=' + encodeURIComponent(route.observation) : '/');
  return `${siteOrigin}/?${query}`;
}
export function seoRoute(params: Record<string, string | string[] | undefined>) {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) if (typeof value === "string") query.set(key, value);
  return readSiteRoute(query);
}
export function isIndexableRoute(route: SiteRoute) { return !privateViews.has(route.view) && !route.q && !route.observation; }
export function jsonForHtml(value: unknown) { return JSON.stringify(value).replace(/</g, "\\u003c").replace(/>/g, "\\u003e").replace(/&/g, "\\u0026"); }
export function xmlText(value: string) { return value.replace(/[<>&"']/g, char => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;", '"': "&quot;", "'": "&apos;" })[char]!); }
export function robotsText(publicIndexing: boolean) {
  return publicIndexing ? `User-agent: *\nDisallow: /api/\nDisallow: /offline.html\nDisallow: /signin-with-chatgpt\nDisallow: /signout-with-chatgpt\nDisallow: /*view=profile\nDisallow: /*view=account\nDisallow: /*view=auth\nDisallow: /*view=admin\nDisallow: /*view=create\nDisallow: /*view=collections\nDisallow: /*view=care\nDisallow: /*view=assistant\nSitemap: ${siteOrigin}/sitemap.xml\n` : "User-agent: *\nDisallow: /\n";
}
