import flora from "../data/tubives.json";
import taxonomy from "../data/life-taxonomy.json";
import { plants } from "../plant-data";
import { canonicalRoute, siteOrigin, xmlText } from "../seo";
export const dynamic = "force-dynamic";
export async function GET(request: Request) {
  const headers = { "Content-Type": "application/xml; charset=utf-8", "Cache-Control": "public, max-age=3600" };
  if (request.headers.get("x-orman-public-indexing") !== "1") return new Response('<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9"></urlset>', { headers });
  const urls = [siteOrigin + "/", ...["discover", "database", "library", "glossary", "fungi", "birds", "nature", "forestry", "publications", "nurseries", "store"].map(view => `${siteOrigin}/?view=${view}`),
    ...flora.records.map(record => canonicalRoute({ view: "flora-record", flora: record.id })),
    ...plants.map(plant => canonicalRoute({ view: "detail", species: plant.id })),
    ...Object.values(taxonomy.records).filter(record => record.taxonomicStatus === "ACCEPTED").map(record => canonicalRoute({ view: "discover", entry: `gbif-${record.key}` }))];
  const pageValue = new URL(request.url).searchParams.get("page"), pages = Math.ceil(urls.length / 2000);
  if (pageValue === null) return new Response(`<?xml version="1.0" encoding="UTF-8"?><sitemapindex xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${Array.from({ length: pages }, (_, i) => `<sitemap><loc>${xmlText(siteOrigin + "/sitemap.xml?page=" + i)}</loc></sitemap>`).join("")}</sitemapindex>`, { headers });
  const page = Number(pageValue);
  if (!/^\d+$/.test(pageValue) || !Number.isInteger(page) || page < 0 || page >= pages) return new Response("Not found", { status: 404 });
  return new Response(`<?xml version="1.0" encoding="UTF-8"?><urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${urls.slice(page * 2000, (page + 1) * 2000).map(url => `<url><loc>${xmlText(url)}</loc></url>`).join("")}</urlset>`, { headers });
}
