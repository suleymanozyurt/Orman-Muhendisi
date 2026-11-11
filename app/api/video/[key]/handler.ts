import type { RawDB } from "../../../../db/runtime.ts";
import { isSocialMediaKey } from "../../../social-media-key.ts";
type ObjectInfo = { size: number; httpMetadata?: { contentType?: string } };
type Bucket = { head(key: string): Promise<ObjectInfo | null>; get(key: string, options?: { range: { offset: number; length: number } }): Promise<(ObjectInfo & { body: ReadableStream }) | null> };
export function byteRange(value: string | null, size: number) {
  if (!value) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(value);
  if (!match || !match[1] && !match[2]) return false;
  const start = match[1] ? Number(match[1]) : Math.max(0, size - Number(match[2]));
  const end = match[1] ? match[2] ? Math.min(size - 1, Number(match[2])) : size - 1 : size - 1;
  return Number.isSafeInteger(start) && Number.isSafeInteger(end) && start >= 0 && start <= end && start < size ? { offset: start, length: end - start + 1 } : false;
}
export async function handleVideo(request: Request, key: string, db?: RawDB, bucket?: Bucket) {
  const fail = (status: number) => new Response(null, { status, headers: { "Cache-Control": "no-store" } });
  if (!isSocialMediaKey(key, "video")) return fail(404);
  if (!db || !bucket) return fail(503);
  try {
    const owner = await db.prepare("SELECT user_id FROM uploads WHERE key=?").bind(key).first<{ user_id: string }>();
    const published = await db.prepare("SELECT r.id FROM resources r,json_each(json_extract(r.data,'$.media')) media WHERE r.kind='social' AND r.status='published' AND json_extract(media.value,'$.uploadedKey')=? LIMIT 1").bind(key).first();
    const user = request.headers.get("oai-authenticated-user-id"), admin = Boolean(user && request.headers.get("oai-authenticated-user-email")?.toLowerCase() === "suleymanozyurt49@gmail.com");
    if (!published && (!owner || user !== owner.user_id && !admin)) return fail(404);
    const info = await bucket.head(key); if (!info) return fail(404);
    const range = request.method === "HEAD" ? null : byteRange(request.headers.get("range"), info.size);
    const headers = new Headers({ "Content-Type": key.endsWith(".mp4") ? "video/mp4" : "video/webm", "Cache-Control": "private, no-store", "Accept-Ranges": "bytes", "X-Content-Type-Options": "nosniff" });
    if (range === false) { headers.set("Content-Range", `bytes */${info.size}`); return new Response(null, { status: 416, headers }); }
    headers.set("Content-Length", String(range?.length || info.size));
    if (range) headers.set("Content-Range", `bytes ${range.offset}-${range.offset + range.length - 1}/${info.size}`);
    if (request.method === "HEAD") return new Response(null, { headers });
    const object = await bucket.get(key, range ? { range } : undefined); if (!object) return fail(404);
    return new Response(object.body, { status: range ? 206 : 200, headers });
  } catch { return fail(503); }
}
