import snapshot from "../../data/turkey-observations.json" with { type: "json" };
import {mapAreaGeometry,readMapBounds} from "../../map-area.ts";
import {ResolvedSourceCache} from "../../resolved-source-cache.ts";
export const dynamic = "force-dynamic";

type GBIFTaxon = { key: number; canonicalName: string; scientificName: string; taxonomicStatus: string; rank: string; kingdom: string; phylum?: string; class?: string; order?: string; family?: string; genus?: string };
type Match = { usageKey?: number; acceptedUsageKey?: number; matchType: string; rank: string };
type OccurrenceResponse = { count: number; results: Record<string, unknown>[]; facets?: { field: string; counts: { name: string; count: number }[] }[] };
const API = "https://api.gbif.org/v1";
const kingdomNames:Record<string,string>={plants:"Plantae",fungi:"Fungi",animals:"Animalia"};
const cache=new ResolvedSourceCache<unknown>(4*1024*1024,100);
async function get<T>(path: string, signal = AbortSignal.timeout(18000)): Promise<T> {
  const cached=cache.get(path);if(cached!==undefined)return cached as T;
  const response = await fetch(`${API}${path}`, { signal, headers: { Accept: "application/json" } });
  if (!response.ok) throw new Error(`GBIF ${response.status}`);
  const data=await response.json() as T;cache.set(path,data,path.startsWith("/species/")?600000:60000);return data;
}

export async function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  const rawBounds=input.get("bounds")||"",bounds=rawBounds?readMapBounds(rawBounds):null;
  if(rawBounds&&!bounds)return Response.json({error:"INVALID_BOUNDS"},{status:400});
  const group=input.get("group")||"plants",kingdoms:Record<string,string>={plants:"6",fungi:"5",animals:"1",all:""};
  if(!Object.hasOwn(kingdoms,group))return Response.json({error:"INVALID_GROUP"},{status:400});
  const params = new URLSearchParams({hasCoordinate:"true",hasGeospatialIssue:"false",occurrenceStatus:"PRESENT",limit:"200",facet:"speciesKey",facetLimit:"30"});
  if(kingdoms[group])params.set("kingdomKey",kingdoms[group]);
  if(bounds)for(const geometry of mapAreaGeometry(bounds))params.append("geometry",geometry);
  const country = input.get("country");
  if (country && !/^[A-Z]{2}$/.test(country)) return Response.json({error:"INVALID_COUNTRY"},{status:400});
  if (country) params.set("country", country);
  const year = input.get("year");
  if (year) {
    const current=new Date().getFullYear();
    if (!/^\d{4}(,\d{4})?$/.test(year)) return Response.json({error:"INVALID_YEAR"},{status:400});
    const [from,to=current]=year.split(",").map(Number);
    if(from<1500||to>current||from>to) return Response.json({error:"INVALID_YEAR"},{status:400});
    params.set("year", `${from},${to}`);
  }
  const key=input.get("key");if(key&&!/^[1-9]\d{0,9}$/.test(key))return Response.json({error:"INVALID_TAXON"},{status:400});
  const signal = AbortSignal.any([request.signal,AbortSignal.timeout(18000)]);
  try {
    let taxon: GBIFTaxon | null = null;
    const name = input.get("name")?.trim().slice(0, 140);
    if (key && /^\d+$/.test(key)) taxon = await get<GBIFTaxon>(`/species/${key}`,signal);
    else if (name) {
      const match = await get<Match>(`/species/match?name=${encodeURIComponent(name)}${group==="plants"?"&kingdom=Plantae":""}&strict=true`,signal);
      if (!match.usageKey || match.matchType !== "EXACT" || !["SPECIES","SUBSPECIES","VARIETY"].includes(match.rank)) return Response.json({ count: 0, records: [], species: [], taxon: null, unmatched: true });
      taxon = await get<GBIFTaxon>(`/species/${match.acceptedUsageKey || match.usageKey}`,signal);
    }
    if (taxon) {
      if(taxon.key!==Number(key||taxon.key)||group!=="all"&&taxon.kingdom!==kingdomNames[group])return Response.json({error:"TAXON_SCOPE_MISMATCH"},{status:400});
      params.set("taxonKey", String(taxon.key));
    }
    const data = await get<OccurrenceResponse>(`/occurrence/search?${params}`,signal);
    if(!Number.isSafeInteger(data.count)||data.count<0||!Array.isArray(data.results))throw new Error("Invalid occurrence response");
    const facets = data.facets?.find((f: { field: string }) => f.field === "SPECIES_KEY")?.counts.filter(f=>/^[1-9]\d{0,9}$/.test(f.name)&&Number.isSafeInteger(f.count)&&f.count>=0).slice(0,30) || [];
    const sampled=new Map<number,Record<string,unknown>>();for(const row of data.results||[])if(typeof row.speciesKey==="number"&&typeof row.species==="string")sampled.set(row.speciesKey,row);
    const species: unknown[] = [];
    // Bound upstream concurrency and keep the full facet counts, not sample counts.
    for (let i = 0; i < facets.length; i += 6) {
      species.push(...await Promise.all(facets.slice(i, i + 6).map(async (f: { name: string; count: number }) => {
        const row=sampled.get(Number(f.name));if(row)return {key:Number(f.name),name:row.species,scientificName:row.species,family:row.family||"",count:f.count};
        try { const t = await get<GBIFTaxon>(`/species/${f.name}`,signal); return { key: t.key, name: t.canonicalName || t.scientificName, scientificName: t.scientificName, family: t.family || "", count: f.count }; }
        catch { return { key: Number(f.name), name: `GBIF ${f.name}`, family: "", count: f.count }; }
      })));
    }
    const synonyms = taxon ? await get<{ results: { scientificName: string }[] }>(`/species/${taxon.key}/synonyms?limit=15`,signal).then(d => d.results.map((r: { scientificName: string }) => r.scientificName)).catch(() => []) : [];
    return Response.json({ count: data.count, species, taxon: taxon ? { key: taxon.key, name: taxon.canonicalName, scientificName: taxon.scientificName, status: taxon.taxonomicStatus, rank: taxon.rank, kingdom: taxon.kingdom, phylum: taxon.phylum, class: taxon.class, order: taxon.order, family: taxon.family, genus: taxon.genus, synonyms } : null,
      records: data.results.filter(r=>Number.isSafeInteger(r.key)&&typeof r.decimalLatitude==="number"&&typeof r.decimalLongitude==="number"&&Math.abs(r.decimalLatitude)<=85&&Math.abs(r.decimalLongitude)<=180).map((r: Record<string, unknown>) => ({ id: r.key, speciesKey: r.speciesKey, name: r.species || r.scientificName, lat: r.decimalLatitude, lng: r.decimalLongitude, date: r.eventDate, country: r.country, locality: r.locality || r.stateProvince, basis: r.basisOfRecord, recorder: r.recordedBy, license: r.license, dataset: r.datasetKey, issues: r.issues })), fetchedAt: new Date().toISOString(), query: params.toString() }, { headers: { "Cache-Control": "public, max-age=300" } });
  } catch {
    // This snapshot covers exactly this country, extent and unfiltered query.
    if(group==="plants"&&country === "TR" && bounds?.join(",") === "25,35,45,43" && !input.get("year") && !input.get("name") && !input.get("key"))return Response.json(snapshot,{headers:{"Cache-Control":"public, max-age=60"}});
    return Response.json({ error: "GBIF_UNAVAILABLE" }, { status: 502 });
  }
}
