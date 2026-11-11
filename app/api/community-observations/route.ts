import { readLinkPreview } from "../../link-preview.ts";
export const dynamic = "force-dynamic";
type Row = Record<string, string | null>;
type DB = { prepare(sql: string): { bind(...values: unknown[]): { all<T>(): Promise<{ results: T[] }> } } };
/** Public projection: private, pending and rejected observations never enter it. */
export async function GET(request: Request) {
  const params = new URL(request.url).searchParams, taxon = params.get("taxon") || "", offset = Number(params.get("offset") || 0);
  if ((taxon && !/^[a-z0-9-]{1,80}$/.test(taxon)) || !Number.isSafeInteger(offset) || offset < 0 || offset > 1_000_000) return Response.json({ error: "INVALID_QUERY" }, { status: 400 });
  const env = (await import("cloudflare:workers")).env as unknown as { DB?: DB };
  if (!env.DB) return Response.json({ error: "OBSERVATIONS_UNAVAILABLE" }, { status: 503 });
  try {
    const query = env.DB.prepare("SELECT id,author,text,plant_id,image_key,organ,observed_at,created_at,link_preview FROM observations WHERE status='approved' AND (?='' OR plant_id=?) ORDER BY created_at DESC,id DESC LIMIT 12 OFFSET ?");
    const rows = (await query.bind(taxon, taxon, offset).all<Row>()).results;
    let photos: Row[] = [];
    if (rows.length) {
      const slots = rows.map(() => "?").join(",");
      photos = (await env.DB.prepare("SELECT observation_id,image_key,organ,position FROM observation_photos WHERE observation_id IN (" + slots + ") ORDER BY CAST(position AS INTEGER)").bind(...rows.map(row => row.id)).all<Row>()).results;
    }
    const records = rows.map(row => ({ id: row.id, author: row.author, text: row.text, plantId: row.plant_id,
      linkPreview: readLinkPreview(row.link_preview), observedAt: row.observed_at, createdAt: row.created_at, image: row.image_key ? "/api/image/" + row.image_key : undefined,
      photos: photos.filter(photo => photo.observation_id === row.id).map(photo => ({ url: "/api/image/" + photo.image_key, organ: photo.organ || undefined })) }));
    return Response.json({ records, hasMore: rows.length === 12, nextOffset: offset + rows.length }, { headers: { "Cache-Control": "no-store" } });
  } catch { return Response.json({ error: "OBSERVATIONS_UNAVAILABLE" }, { status: 503 }); }
}
