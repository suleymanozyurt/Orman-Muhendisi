import { catalogSources, catalogRegions, type CatalogNode } from "./catalog-types.ts";
const text = (value: unknown, max = 300) => typeof value === "string" ? value.slice(0, max) : "";
export function plainCatalogText(html: string) {
  return html.replace(/<(script|style)\b[^>]*>[\s\S]*?<\/\1>/gi, "").replace(/<[^>]*>/g, " ").replace(/&#(x[\da-f]+|\d+);/gi, (_, code: string) => {
    const n = code[0].toLowerCase() === "x" ? parseInt(code.slice(1), 16) : Number(code);
    return n > 0 && n <= 0x10ffff ? String.fromCodePoint(n) : "";
  }).replace(/&(amp|lt|gt|quot|apos|nbsp);/g, (_, name: string) => ({amp:"&",lt:"<",gt:">",quot:'"',apos:"'",nbsp:" "}[name] || "")).replace(/\s+/g, " ").trim();
}
export function bizimOptions(html: string, rank: string): CatalogNode[] {
  return Array.from(html.matchAll(/<option\b[^>]*value=["']([^"']+)["'][^>]*>([\s\S]*?)<\/option>/gi)).map(([, id, label]) => {
    const value = plainCatalogText(label), m = value.match(/^(.*?)\s*\((.*)\)$/);
    return { id: plainCatalogText(id), name: m?.[1].trim() || value, commonName: m?.[2].trim() || "", rank, source: catalogSources.bizimbitkiler };
  });
}
export function bizimSpecies(html: string): CatalogNode[] {
  return Array.from(html.matchAll(/<tr\b[^>]*>([\s\S]*?)<\/tr>/gi)).flatMap(([, row]) => {
    const id = row.match(/showDetails\(['"](\d+)['"]/)?.[1], cells = Array.from(row.matchAll(/<td\b[^>]*>([\s\S]*?)<\/td>/gi)).map(([, value]) => plainCatalogText(value));
    if (!id || cells.length < 3) return [];
    const regions = (row.match(/data-yayilis=["']([^"']*)["']/)?.[1] || "").split(",").map(s => s.trim()).filter(s => s in catalogRegions);
    const rank = /\bsubsp\./.test(cells[1]) ? "subspecies" : /\bvar\./.test(cells[1]) ? "variety" : /\bf\./.test(cells[1]) ? "form" : "species";
    const canonicalName = cells[1].match(/^((?:×\s*)?[A-Z][a-zA-Z-]+\s+(?:×\s*)?[a-z-]+(?:\s+(?:subsp|var|f)\.\s+[a-z-]+)?)/)?.[1];
    return [{ id, name: cells[1], canonicalName, commonName: cells[2], family: cells[0], rank, endemic: /ENDEM/i.test(cells[3] || ""), regions, source: `${catalogSources.bizimbitkiler}?tur=${id}` }];
  });
}
export function bizimDetail(html: string, id: string): CatalogNode {
  const tag = (name: string) => Array.from(html.matchAll(new RegExp(`<${name}\\b[^>]*>([\\s\\S]*?)<\\/${name}>`, "gi"))).map(([, value]) => plainCatalogText(value));
  const ancestry = Array.from(html.matchAll(/<li\b[^>]*class=["']list-group-item["'][^>]*>([\s\S]*?)<\/li>/gi)).map(([, value], index) => {
    const m = value.match(/<small[^>]*>([\s\S]*?)<\/small>/i), parts = plainCatalogText(m?.[1] || "").split(" / "), rank = plainCatalogText(value.match(/<span[^>]*class=["']badge["'][^>]*>([\s\S]*?)<\/span>/i)?.[1] || "");
    return { id: `rank-${index}`, name: parts[0], commonName: parts.slice(1).join(" / "), rank };
  }).filter(n => n.name);
  const synonyms = Array.from(html.matchAll(/<tbody[^>]*>([\s\S]*?)<\/tbody>/gi)).flatMap(([, body]) => Array.from(body.matchAll(/<tr[^>]*>([\s\S]*?)<\/tr>/gi)).map(([, row]) => {
    const cells = Array.from(row.matchAll(/<td[^>]*>([\s\S]*?)<\/td>/gi)).map(([, v]) => plainCatalogText(v));
    return { name: cells[0] || "", reference: cells[1] || "" };
  })).filter(n => n.name);
  const notes = tag("h6"), citations = Array.from(html.matchAll(/<p[^>]*>([\s\S]*?)<\/p>/gi)).map(([, v]) => plainCatalogText(v)).filter(v => /atıf:|Yararlanılan eser:|Site kısmi|Sitenin tamamı/.test(v));
  const canonicalName = plainCatalogText((html.match(/<h4[^>]*>([\s\S]*?)<\/h4>/i)?.[1] || "").replace(/<small[^>]*>[\s\S]*?<\/small>/gi,""));
  return { id, name: tag("h4")[0] || ancestry.at(-1)?.name || "", canonicalName: canonicalName || undefined, commonName: tag("h2")[0] || "", rank: ancestry.at(-1)?.rank || "species", ancestry, publishedIn: notes[0] || "", description: notes.slice(1).join(" "), synonyms, citations, source: `${catalogSources.bizimbitkiler}?tur=${id}` };
}
export function inatTaxon(raw: Record<string, any>): CatalogNode {
  return { id: String(raw.id), name: text(raw.name), canonicalName: text(raw.name), commonName: text(raw.preferred_common_name), rank: text(raw.rank), count: Number.isSafeInteger(raw.observations_count) ? raw.observations_count : undefined, source: `https://www.inaturalist.org/taxa/${raw.id}`, ancestry: (Array.isArray(raw.ancestors) ? raw.ancestors : []).filter((r: any) => Number.isSafeInteger(r.id)).map((r: any) => ({id:String(r.id),name:text(r.name),rank:text(r.rank)})), conservation: text(raw.conservation_status?.status_name || raw.conservation_status?.status) || undefined };
}
export function plantnetTaxon(raw: Record<string, any>, rank: string): CatalogNode {
  const name = text(raw.name || raw.scientificNameWithoutAuthor), author = text(raw.author || raw.scientificNameAuthorship), full = [name, author].filter(Boolean).join(" ");
  return { id: full, name, canonicalName: name, author, commonName: Array.isArray(raw.commonNames) ? raw.commonNames.filter((v: unknown) => typeof v === "string").join(" · ").slice(0, 600) : "", family: text(raw.family), genus: text(raw.genus), rank, count: Number.isSafeInteger(raw.observationsCount) ? raw.observationsCount : undefined, source: rank === "species" ? `${catalogSources.plantnet}/${encodeURIComponent(full)}/data` : `${catalogSources.plantnet}?${rank === "family" ? "family" : "genus"}=${encodeURIComponent(name)}`, conservation: text(raw.iucn?.category || raw.iucnCategory) || undefined, gbifId: Number.isSafeInteger(raw.gbifId) ? raw.gbifId : undefined };
}
