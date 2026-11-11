import type { RawDB } from "../../../db/runtime.ts";
import { validateSocialPost, unresolvedSocialMedia, socialKind, socialSearchText, socialPlatforms, type SocialPost } from "../../social-archive-model.ts";
const send = (value: unknown, status = 200) => Response.json(value, { status, headers: { "Cache-Control": "no-store" } });
const postId = (id: unknown): id is string => typeof id === "string" && /^(?:[a-f0-9]{64}|[a-f0-9-]{36})$/.test(id);
type Row = { id: string; title: string; status: string; data: string; revision: number };
const decode = (row: Row): SocialPost => ({ ...JSON.parse(row.data), id: row.id, title: row.title, status: row.status, revision: row.revision });
export async function handleSocial(request: Request, db?: RawDB) {
  const user = request.headers.get("oai-authenticated-user-id"), admin = Boolean(user && request.headers.get("oai-authenticated-user-email")?.toLowerCase() === "suleymanozyurt49@gmail.com");
  if (!db) return send({ error: "Paylaşımlar yüklenemedi. Yeniden dene." }, 503);
  try {
    if (request.method === "GET") {
      const p = new URL(request.url).searchParams, platform = p.get("platform") || "", kind = p.get("kind") || "", status = admin ? p.get("status") || "published" : "published", offset = Number(p.get("offset") || 0), id = p.get("id");
      if (!Number.isInteger(offset) || offset < 0 || offset > 1000000 || platform && !socialPlatforms.includes(platform as never) || kind && !["article", "photo", "video"].includes(kind) || !["draft", "published", "all"].includes(status) || id && !postId(id)) return send({ error: "Filtre geçersiz." }, 400);
      const where = ["kind='social'"], args: unknown[] = [];
      if (status !== "all") { where.push("status=?"); args.push(status); }
      if (platform) { where.push("json_extract(data,'$.platform')=?"); args.push(platform); }
      if (kind) { where.push("json_extract(data,'$.kind')=?"); args.push(kind); }
      const q = socialSearchText((p.get("q") || "").trim().slice(0, 200));
      if (q) { where.push("instr(json_extract(data,'$.search'),?)>0"); args.push(q); }
      if (id) { where.push("id=?"); args.push(id); }
      const predicate = where.join(" AND ");
      const [rows, count] = await Promise.all([
        db.prepare(`SELECT id,title,status,data,revision FROM resources WHERE ${predicate} ORDER BY json_extract(data,'$.publishedAt') DESC,id DESC LIMIT 24 OFFSET ?`).bind(...args, offset).all<Row>(),
        db.prepare(`SELECT count(*) AS n FROM resources WHERE ${predicate}`).bind(...args).first<{ n: number }>(),
      ]);
      return send({ records: rows.results.map(row => { const post = decode(row); return admin ? post : { ...post, media: post.media.map(({ path, ...media }) => media) }; }), total: count?.n || 0, hasMore: offset + rows.results.length < (count?.n || 0) });
    }
    if (!user) return send({ error: "Giriş yapmalısın." }, 401);
    if (!admin) return send({ error: "Yalnızca yönetici paylaşım arşivini düzenleyebilir." }, 403);
    if (request.headers.get("origin") && request.headers.get("origin") !== new URL(request.url).origin) return send({ error: "İstek geçersiz." }, 403);
    const raw = await request.text(); if (new TextEncoder().encode(raw).length > 750000) return send({ error: "Arşivi daha küçük parçalarla aktar." }, 413);
    let body; try { body = JSON.parse(raw); } catch { return send({ error: "Arşiv okunamadı." }, 400); }
    if (!body || typeof body !== "object") return send({ error: "İstek geçersiz." }, 400);
    if (body.action === "publishSelected") {
      const records = body.records as { id: string; revision: number }[];
      if (!Array.isArray(records) || !records.length || records.length > 20 || records.some(record => !record || !postId(record.id) || !Number.isInteger(record.revision) || record.revision < 0) || new Set(records.map(record => record.id)).size !== records.length) return send({ error: "En fazla 20 geçerli taslak seç." }, 400);
      const rows = await db.prepare(`SELECT id,title,status,data,revision FROM resources WHERE kind='social' AND id IN (${records.map(() => "?").join(",")})`).bind(...records.map(record => record.id)).all<Row>();
      if (rows.results.length !== records.length || rows.results.some(row => row.status !== "draft" || row.revision !== records.find(record => record.id === row.id)?.revision)) return send({ error: "Seçilen paylaşımlar değişti. Yeniden yükle." }, 409);
      if (rows.results.some(row => !validateSocialPost(decode(row)) || unresolvedSocialMedia(decode(row)).length)) return send({ error: "Önce seçilen paylaşımlardaki eksik medyayı tamamla." }, 400);
      const condition = records.map(() => "(id=? AND revision=?)").join(" OR "), values = records.flatMap(record => [record.id, record.revision]);
      const changed = await db.prepare(`UPDATE resources SET status='published',revision=revision+1,updated_at=? WHERE kind='social' AND status='draft' AND (${condition}) AND (SELECT count(*) FROM resources WHERE kind='social' AND status='draft' AND (${condition}))=? RETURNING id`).bind(new Date().toISOString(), ...values, ...values, records.length).all<{id:string}>();
      return changed.results.length === records.length ? send({ published: changed.results.length }) : send({ error: "Seçilen paylaşımlar değişti. Yeniden yükle." }, 409);
    }
    if (body.action === "delete") {
      if (!postId(body.id) || !Number.isInteger(body.revision)) return send({ error: "Kayıt geçersiz." }, 400);
      const removed = await db.prepare("DELETE FROM resources WHERE id=? AND kind='social' AND revision=? RETURNING id").bind(body.id, body.revision).first();
      return removed ? send({ ok: true }) : send({ error: "Paylaşım değişti. Yeniden yükle." }, 409);
    }
    const importing = body.action === "import", posts: unknown[] = importing ? body.posts : body.action === "save" ? [body.post] : [];
    if (!Array.isArray(posts) || !posts.length || posts.length > 40 || !posts.every(validateSocialPost)) return send({ error: "Paylaşım bilgilerini kontrol et." }, 400);
    const valid = posts as SocialPost[];
    if (new Set(valid.map(post => post.id)).size !== valid.length) return send({ error: "Aynı paylaşım iki kez eklenemez." }, 400);
    for (const post of valid) {
      if (!importing && post.status === "published" && unresolvedSocialMedia(post).length) return send({ error: "Eksik medya dosyalarını ekle veya ilgili paylaşımın özgün medya bağlantısını gir." }, 400);
    }
    const keys = [...new Set(valid.flatMap(post => post.media.flatMap(media => [media.uploadedKey, media.previewKey].filter((key): key is string => Boolean(key)))))];
    const restoredKeys = new Set<string>();
    if (!importing) {
      const restored = await db.prepare("SELECT data FROM resources WHERE id=? AND kind='social' AND user_id='source:facebook:0rmanmuhendisi'").bind(valid[0].id).first<{data:string}>();
      if (restored) for (const media of (JSON.parse(restored.data).media || [])) for (const key of [media.uploadedKey, media.previewKey]) if (typeof key === "string") restoredKeys.add(key);
    }
    if (keys.length) {
      for (let start = 0; start < keys.length; start += 80) {
        const part = keys.slice(start, start + 80);
        const owned = await db.prepare(`SELECT key,user_id FROM uploads WHERE key IN (${part.map(() => "?").join(",")})`).bind(...part).all<{ key: string; user_id: string }>();
        if (owned.results.length !== part.length || owned.results.some(upload => upload.user_id !== user && !(upload.user_id === "source:facebook:0rmanmuhendisi" && restoredKeys.has(upload.key)))) return send({ error: "Medya bu paylaşıma veya hesabına ait değil." }, 403);
      }
    }
    const now = new Date().toISOString();
    const data = (post: SocialPost, archive?: unknown) => JSON.stringify({ platform: post.platform, text: post.text, publishedAt: post.publishedAt, sourceUrl: post.sourceUrl, media: post.media, kind: socialKind(post), search: socialSearchText(post.title + " " + post.text), ...(archive ? { archive } : {}) });
    if (importing) {
      const existing = await db.prepare(`SELECT id FROM resources WHERE id IN (${valid.map(() => "?").join(",")})`).bind(...valid.map(post => post.id)).all<{ id: string }>();
      await db.batch(valid.map(post => db.prepare("INSERT INTO resources (id,user_id,kind,title,status,data,author,revision,created_at,updated_at) VALUES (?,?,'social',?,'draft',?,'Orman Mühendisi',0,?,?) ON CONFLICT(id) DO NOTHING").bind(post.id, user, post.title, data(post), now, now)));
      return send({ imported: valid.length - existing.results.length, skipped: existing.results.length });
    }
    const post = valid[0], current = await db.prepare("SELECT kind,revision,data FROM resources WHERE id=?").bind(post.id).first<{ kind: string; revision: number; data: string }>();
    if (current) {
      if (current.kind !== "social" || current.revision !== post.revision) return send({ error: "Paylaşım başka bir ekranda değişti. Yeniden yükle." }, 409);
      const changed = await db.prepare("UPDATE resources SET title=?,status=?,data=?,revision=revision+1,updated_at=? WHERE id=? AND kind='social' AND revision=? RETURNING id").bind(post.title, post.status, data(post, JSON.parse(current.data).archive), now, post.id, post.revision).first();
      return changed ? send({ ok: true }) : send({ error: "Paylaşım değişti. Yeniden yükle." }, 409);
    }
    await db.prepare("INSERT INTO resources (id,user_id,kind,title,status,data,author,revision,created_at,updated_at) VALUES (?,?,'social',?,?,?,'Orman Mühendisi',0,?,?)").bind(post.id, user, post.title, post.status, data(post), now, now).run();
    return send({ ok: true });
  } catch (cause) { console.error("social archive request failed", cause); return send({ error: "Paylaşımlar kaydedilemedi. Arşivini koruyup yeniden dene." }, 503); }
}
