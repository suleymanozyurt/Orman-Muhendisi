import { headers } from "next/headers";

export const dynamic = "force-dynamic";

export async function GET(_request: Request, context: { params: Promise<{ key: string }> }) {
  const { key } = await context.params;
  if (!/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(key)) return new Response("Not found", { status: 404 });
  const env=(await import("cloudflare:workers")).env as unknown as {DB?:{prepare(sql:string):{bind(...args:unknown[]):{first<T>():Promise<T|null>}}}};
  if(!env.DB)return new Response("Unavailable",{status:503});
  const owner=await env.DB.prepare("SELECT user_id FROM uploads WHERE key=?").bind(key).first<{user_id:string}>();
  const published=await env.DB.prepare("SELECT id FROM observations WHERE image_key=? AND status='approved' UNION SELECT o.id FROM observation_photos p JOIN observations o ON o.id=p.observation_id WHERE p.image_key=? AND o.status='approved' UNION SELECT id FROM species WHERE image_key=? UNION SELECT r.id FROM resources r,json_each(json_extract(r.data,'$.media')) media WHERE r.kind='social' AND r.status='published' AND (json_extract(media.value,'$.uploadedKey')=? OR json_extract(media.value,'$.previewKey')=?)").bind(key,key,key,key,key).first();
  if(!owner&&!published)return new Response("Not found",{status:404});
  if(owner) {
    const h=await headers(); const user=h.get("oai-authenticated-user-id"),admin=h.get("oai-authenticated-user-email")?.toLowerCase()==="suleymanozyurt49@gmail.com";
    if(!published && user!==owner.user_id && !admin) return new Response("Not found",{status:404});
  }
  const bucket = ((await import("cloudflare:workers")).env as unknown as { BUCKET?: {
    get(key: string): Promise<{ body: ReadableStream; httpMetadata?: { contentType?: string } } | null>;
  } }).BUCKET;
  if (!bucket) return new Response("Unavailable", { status: 503 });
  const object = await bucket.get(key);
  if (!object) return new Response("Not found", { status: 404 });
  return new Response(object.body, {
    headers: {
      "Content-Type": object.httpMetadata?.contentType || "application/octet-stream",
      "Cache-Control": "private, no-store",
      "X-Content-Type-Options": "nosniff",
    },
  });
}
