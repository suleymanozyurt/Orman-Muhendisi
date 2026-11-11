import type { RawDB } from "../../../db/runtime.ts";
import { validateSocialPost, unresolvedSocialMedia, socialKind, socialSearchText, type SocialPost } from "../../social-archive-model.ts";
import { isSocialMediaKey, socialMediaPath } from "../../social-media-key.ts";
import { multipartAction, multipartPart, validMediaBytes, type ArchiveBucket } from "./multipart.ts";
import { mediaBatch } from "./media-batch.ts";

export const archiveActor = "source:facebook:0rmanmuhendisi";
type Runtime = { key?: string; db?: RawDB; bucket?: ArchiveBucket };
const send = (body: unknown, status = 200) => Response.json(body, { status, headers: { "Cache-Control": "no-store" } });
// A temporary, server-held import credential is independent of visitor identity.
// It only restores this verified account's export, never impersonates a user, and is disabled when removed.
async function authorized(request: Request, expected?: string) {
  const provided = request.headers.get("x-source-archive-key") || "";
  if (!expected || expected.length < 64 || provided.length !== expected.length) return false;
  const [a, b] = await Promise.all([provided, expected].map(value => crypto.subtle.digest("SHA-256", new TextEncoder().encode(value))));
  return new Uint8Array(a).every((value, i) => value === new Uint8Array(b)[i]);
}
export async function handleSourceArchive(request: Request, runtime: Runtime) {
  if (!await authorized(request, runtime.key)) return send({ error: "IMPORT_UNAVAILABLE" }, 404);
  const origin = request.headers.get("origin");
  if (origin && origin !== new URL(request.url).origin) return send({ error: "INVALID_ORIGIN" }, 403);
  const db = runtime.db; if (!db) return send({ error: "DATABASE_UNAVAILABLE" }, 503);
  try {
    if (request.method === "GET") {
      const totals = await db.prepare("SELECT count(*) AS records,sum(status='published') AS published,sum(json_array_length(json_extract(data,'$.media'))>0) AS withMedia FROM resources WHERE kind='social' AND user_id=?").bind(archiveActor).first();
      return send({ totals });
    }
    if (request.method !== "POST") return send({ error: "METHOD_NOT_ALLOWED" }, 405);
    if(new URL(request.url).searchParams.get("mediaBatch")==="1")return await mediaBatch(request,db,runtime.bucket,archiveActor);
    const part = new URL(request.url).searchParams.get("part");if(part)return await multipartPart(request,part,db,runtime.bucket);
    const key = new URL(request.url).searchParams.get("media");
    if (key) {
      if (!isSocialMediaKey(key)) return send({ error: "INVALID_MEDIA_KEY" }, 400);
      const type = request.headers.get("content-type")?.split(";")[0];
      const expected = key.endsWith(".webp") ? "image/webp" : key.endsWith(".jpg") ? "image/jpeg" : key.endsWith(".png") ? "image/png" : key.endsWith(".mp4") ? "video/mp4" : "video/webm";
      if (type !== expected || !runtime.bucket) return send({ error: "MEDIA_UNAVAILABLE" }, 400);
      const limit = expected.startsWith("image/") ? 1500000 : 33554432;
      if (Number(request.headers.get("content-length")) > limit) return send({ error: "MEDIA_TOO_LARGE" }, 413);
      const reader = request.body?.getReader(); if (!reader) return send({ error: "EMPTY_MEDIA" }, 400);
      const chunks: Uint8Array[] = []; let size = 0;
      while (true) { const part = await reader.read(); if (part.done) break; size += part.value.byteLength; if (size > limit) { await reader.cancel(); return send({ error: "MEDIA_TOO_LARGE" }, 413); } chunks.push(part.value); }
      if (!size) return send({ error: "EMPTY_MEDIA" }, 400);
      const bytes = new Uint8Array(size); let offset = 0; for (const part of chunks) { bytes.set(part, offset); offset += part.byteLength; }
      if (!validMediaBytes(expected,bytes)) return send({ error: "INVALID_MEDIA" }, 415);
      const digest = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", bytes)), value => value.toString(16).padStart(2, "0")).join("").slice(0, 32);
      if (key.split(".")[0].replaceAll("-", "") !== digest) return send({ error: "MEDIA_CHECKSUM_MISMATCH" }, 400);
      const owner = await db.prepare("SELECT user_id FROM uploads WHERE key=?").bind(key).first<{ user_id: string }>();
      if (owner && owner.user_id !== archiveActor) return send({ error: "MEDIA_CONFLICT" }, 409);
      await runtime.bucket.put(key, bytes.buffer, { httpMetadata: { contentType: expected } });
      await db.prepare("INSERT INTO uploads(key,user_id,created_at) VALUES(?,?,?) ON CONFLICT(key) DO NOTHING").bind(key, archiveActor, new Date().toISOString()).run();
      return send({ key, url: socialMediaPath(key) });
    }
    const raw = await request.text(); if (new TextEncoder().encode(raw).length > 750000) return send({ error: "INPUT_TOO_LONG" }, 413);
    let body; try { body = JSON.parse(raw); } catch { return send({ error: "INVALID_JSON" }, 400); }
    if(body?.action==="startMedia"||body?.action==="completeMedia")return await multipartAction(body,db,runtime.bucket,archiveActor);
    if (body?.action === "publishReady") {
      const ids = body.ids as string[];
      if (!Array.isArray(ids) || !ids.length || ids.length > 40 || ids.some(id => typeof id !== "string" || !/^[a-f0-9]{64}$/.test(id)) || new Set(ids).size !== ids.length) return send({error:"INVALID_POSTS"},400);
      const records = await db.prepare(`SELECT id,title,status,data,revision FROM resources WHERE kind='social' AND user_id=? AND revision=0 AND status='draft' AND id IN (${ids.map(()=>"?").join(",")})`).bind(archiveActor,...ids).all<{id:string;title:string;status:string;data:string;revision:number}>();
      const ready = records.results.filter(row=>{const post={...JSON.parse(row.data),id:row.id,title:row.title,status:row.status,revision:row.revision};return validateSocialPost(post) && !unresolvedSocialMedia(post).length;});
      if (!ready.length) return send({published:0,skipped:ids.length});
      const changed = await db.prepare(`UPDATE resources SET status='published',revision=revision+1,updated_at=? WHERE kind='social' AND user_id=? AND revision=0 AND status='draft' AND id IN (${ready.map(()=>"?").join(",")}) RETURNING id`).bind(new Date().toISOString(),archiveActor,...ready.map(row=>row.id)).all<{id:string}>();
      return send({published:changed.results.length,skipped:ids.length-changed.results.length});
    }
    const posts: unknown[] = body?.posts;
    if (!Array.isArray(posts) || !posts.length || posts.length > 40 || !posts.every(validateSocialPost) || posts.some(post => (post as SocialPost).platform !== "facebook") || new Set(posts.map(post => (post as SocialPost).id)).size !== posts.length) return send({ error: "INVALID_POSTS" }, 400);
    const valid = posts as SocialPost[], keys = [...new Set(valid.flatMap(post => post.media.flatMap(media => [media.uploadedKey, media.previewKey].filter((key): key is string => Boolean(key)))))];
    for (let i = 0; i < keys.length; i += 80) {
      const part = keys.slice(i, i + 80), owned = await db.prepare(`SELECT key,user_id FROM uploads WHERE key IN (${part.map(() => "?").join(",")})`).bind(...part).all<{ key: string; user_id: string }>();
      if (owned.results.length !== part.length || owned.results.some(row => row.user_id !== archiveActor)) return send({ error: "UNVERIFIED_MEDIA" }, 403);
    }
    const existing = await db.prepare(`SELECT id FROM resources WHERE id IN (${valid.map(() => "?").join(",")})`).bind(...valid.map(post => post.id)).all<{ id: string }>();
    const now = new Date().toISOString();
    await db.batch(valid.map(post => db.prepare("INSERT INTO resources(id,user_id,kind,title,status,data,author,revision,created_at,updated_at) VALUES(?,?,'social',?,'draft',?,'Orman Mühendisi',0,?,?) ON CONFLICT(id) DO UPDATE SET data=excluded.data,updated_at=excluded.updated_at WHERE resources.user_id=excluded.user_id AND resources.kind='social' AND resources.status='draft' AND resources.revision=0").bind(post.id, archiveActor, post.title, JSON.stringify({ platform: post.platform, text: post.text, publishedAt: post.publishedAt, sourceUrl: post.sourceUrl, media: post.media, kind: socialKind(post), search: socialSearchText(post.title + " " + post.text), archive: { account: "0rmanmuhendisi", exportedAt: "2022-10-06", type: "facebook-page-export" } }), now, now)));
    return send({ imported: valid.length - existing.results.length, skipped: existing.results.length });
  } catch { return send({ error: "IMPORT_FAILED" }, 503); }
}
