import archive from "./data/life-taxonomy.json" with { type: "json" };
import { isSpeciesRank } from "./life-types";
type SourceTaxon = { key: number; rank: string; taxonomicStatus: string; scientificName?: string };
const records = archive.records as Record<string, SourceTaxon>;
export async function validLivingTaxon(id: string, fetcher: typeof fetch = fetch) {
  if (!/^gbif-[1-9]\d{0,10}$/.test(id)) return false;
  const key = Number(id.slice(5)), cached = records[String(key)];
  if (cached) return isSpeciesRank(cached.rank) && cached.taxonomicStatus === "ACCEPTED";
  const response = await fetcher("https://api.gbif.org/v1/species/" + key, { signal: AbortSignal.timeout(4500) });
  if (response.status === 404) return false;
  if (!response.ok) throw new Error("TÜR_KAYNAĞI_GEÇİCİ_OLARAK_KULLANILAMIYOR");
  const record = await response.json() as SourceTaxon;
  return record.key === key && isSpeciesRank(record.rank) && record.taxonomicStatus === "ACCEPTED" && Boolean(record.scientificName);
}
