export async function GET(request: Request) {
  const q = new URL(request.url).searchParams.get("q")?.trim().slice(0, 100) || "";
  if (q.length < 2) return Response.json({ results: [] });
  try {
    const params = new URLSearchParams({ q, highertaxonKey: "6", rank: "SPECIES", status: "ACCEPTED", limit: "15" });
    const response = await fetch(`https://api.gbif.org/v1/species/search?${params}`, { signal: AbortSignal.timeout(12000) });
    if (!response.ok) throw new Error();
    const data = await response.json() as { results: { key: number; canonicalName: string; scientificName: string; family?: string; kingdom: string; rank: string }[] };
    const seen = new Set<string>();
    const results = data.results.filter((r: { canonicalName: string; kingdom: string; rank: string }) => { if (!r.canonicalName || r.kingdom !== "Plantae" || r.rank !== "SPECIES" || seen.has(r.canonicalName)) return false; seen.add(r.canonicalName); return true; }).slice(0, 6).map((r: { key: number; canonicalName: string; scientificName: string; family?: string }) => ({ key: r.key, name: r.canonicalName, scientificName: r.scientificName, family: r.family }));
    return Response.json({ results }, { headers: { "Cache-Control": "public, max-age=600" } });
  } catch { return Response.json({ error: "UNAVAILABLE", results: [] }, { status: 502 }); }
}
