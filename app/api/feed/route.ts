import { licensedPhotos, type FeedRecord } from "../../feed-data";
import feedCache from "../../data/feed-cache.json";
export const dynamic = "force-dynamic";
function record(r: Record<string, unknown>): FeedRecord[] {
  const photos = licensedPhotos(r.media);
  if (!photos.length || !r.species) return [];
  return [{ id: `gbif:${r.key}`, name: String(r.species), family: String(r.family || ""), author: String(r.recordedBy || photos[0].credit || ""), date: String(r.eventDate || "").split("T")[0], location: [r.locality || r.stateProvince, r.country].filter(Boolean).join(" · "), photos }];
}
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  if (input.has("ids")) {
    const ids = [...new Set((input.get("ids") || "").split(","))];
    if (ids.length > 12 || ids.some(id => !/^\d{1,16}$/.test(id))) return Response.json({ error: "INVALID_IDS" }, { status: 400 });
    const signal=AbortSignal.any([request.signal,AbortSignal.timeout(12000)]);
    try {
      const records: FeedRecord[] = [];
      for (let i = 0; i < ids.length; i += 4) records.push(...(await Promise.all(ids.slice(i, i + 4).map(async id => {
        const response = await fetch(`https://api.gbif.org/v1/occurrence/${id}`, { signal });
        if (response.status === 404) return [];
        if (!response.ok) throw new Error();
        const data = await response.json() as Record<string, unknown>;
        return data.kingdom === "Plantae" ? record(data) : [];
      }))).flat());
      return Response.json({ records, hasMore: false }, { headers: { "Cache-Control": "public, max-age=300" } });
    } catch { return Response.json({ error: "FEED_UNAVAILABLE" }, { status: 502 }); }
  }
  const offset = Number(input.get("offset") || 0);
  const scope = input.get("scope") || "TR";
  if (!Number.isInteger(offset) || offset < 0 || offset > 99952 || !["TR", "world"].includes(scope)) return Response.json({ error: "INVALID_CURSOR" }, { status: 400 });
  const name = input.get("name")?.trim().slice(0, 140);
  const canUseArchive = offset === 0 && scope === "TR" && !name;
  const signal=AbortSignal.any([request.signal,AbortSignal.timeout(canUseArchive?4500:12000)]);
  const params = new URLSearchParams({ kingdomKey: "6", mediaType: "StillImage", basisOfRecord: "HUMAN_OBSERVATION", occurrenceStatus: "PRESENT", limit: "48", offset: String(offset) });
  if (scope === "TR") params.set("country", "TR");
  try {
    if (name) {
      const response = await fetch(`https://api.gbif.org/v1/species/match?name=${encodeURIComponent(name)}&kingdom=Plantae&strict=true`, { signal });
      if (!response.ok) throw new Error();
      const match = await response.json() as { usageKey?: number; acceptedUsageKey?: number; rank?: string; kingdom?: string; matchType?: string };
      if (!match.usageKey || match.rank !== "SPECIES" || match.kingdom !== "Plantae" || match.matchType === "NONE") return Response.json({ records: [], nextOffset: offset, hasMore: false });
      params.set("taxonKey", String(match.acceptedUsageKey || match.usageKey));
    }
    const response = await fetch(`https://api.gbif.org/v1/occurrence/search?${params}`, { signal });
    if (!response.ok) throw new Error("Upstream unavailable");
    const data = await response.json() as { results: Record<string, unknown>[]; endOfRecords: boolean };
    const records = data.results.flatMap(record);
    const nextOffset = offset + data.results.length;
    return Response.json({ records, nextOffset, hasMore: !data.endOfRecords && data.results.length > 0 && nextOffset <= 99952 }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    if (canUseArchive) return Response.json({ records: feedCache.records, nextOffset: feedCache.nextOffset, hasMore: false, cached: true, fetchedAt: feedCache.fetchedAt }, { headers: { "Cache-Control": "public, max-age=120" } });
    return Response.json({ error: "FEED_UNAVAILABLE" }, { status: 502 });
  }
}
