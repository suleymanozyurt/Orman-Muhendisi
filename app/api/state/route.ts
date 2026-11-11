import { readObservationPage } from "../../observation-page-query.ts";
import { previewUrl, readLinkPreview } from "../../link-preview.ts";
import { fetchLinkPreview } from "../../link-preview-server.ts";
import { internalLinkPreview } from "../../shared-content.ts";
import { headers } from "next/headers";
import { plants } from "../../plant-data";
import { licensedPhotos } from "../../feed-data";

export const dynamic = "force-dynamic";

type DB = {
  batch(statements: unknown[]): Promise<unknown>;
  prepare(sql: string): {
    bind(...values: unknown[]): {
      first<T = Record<string, unknown>>(): Promise<T | null>;
      first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
      run(): Promise<unknown>;
    };
    first<T = Record<string, unknown>>(): Promise<T | null>;
    all<T = Record<string, unknown>>(): Promise<{ results: T[] }>;
  };
};
const runtime = async () => (await import("cloudflare:workers")).env as unknown as {
  DB?: DB; BUCKET?: { delete(key: string): Promise<void> };
};
const database = async () => (await runtime()).DB;
const error = (message: string, status = 400) => Response.json({ error: message }, { status });
const clean = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";
const validPlant = async (db: DB, id: string) => {
  if(id.startsWith("gbif-")) return (await import("../../observation-taxon")).validLivingTaxon(id);
  if(id.startsWith("flora-")) return /^flora-\d+$/.test(id) && (await import("../../data/tubives.json")).default.records.some(row=>row.id===Number(id.slice(6)));
  return plants.some(plant=>plant.id===id) || Boolean(await db.prepare("SELECT id FROM species WHERE id = ?").bind(id).first());
};
async function identity() {
  const h = await headers();
  const email = h.get("oai-authenticated-user-email") || "";
  return { id: h.get("oai-authenticated-user-id"), display: email.split("@")[0] || "Üye", isAdmin: email.toLocaleLowerCase("tr") === "suleymanozyurt49@gmail.com" };
}

export async function GET(request: Request) {
  const input=new URL(request.url).searchParams;
  const offset = Number(input.get("offset") || 0);
  const following=input.get("following")==="1";
  if (!Number.isInteger(offset) || offset < 0 || offset > 1000000) return error("Sayfa geçersiz.");
  const user = await identity();
  if (!user.id) return error("Oturum açmanız gerekiyor.", 401);
  const db = await database();
  if (!db) return error("Veri tabanı kullanılamıyor.", 503);
  try {
    const pageOnly=input.get("pageOnly")==="1";
    const page=readObservationPage(db,{id:user.id,isAdmin:user.isAdmin},offset,following,!pageOnly);
    if(pageOnly)return Response.json(await page,{headers:{"Cache-Control":"no-store"}});
    const [observationPage, likes, saves, collections, items, notes, profile, customPlants] = await Promise.all([
      page,
      db.prepare("SELECT observation_id FROM likes WHERE user_id = ?").bind(user.id).all<{ observation_id: string }>(),
      db.prepare("SELECT item_id FROM saves WHERE user_id = ?").bind(user.id).all<{ item_id: string }>(),
      db.prepare("SELECT id, name FROM collections WHERE user_id = ? ORDER BY created_at DESC").bind(user.id).all<{ id: string; name: string }>(),
      db.prepare("SELECT collection_id, plant_id FROM collection_items WHERE collection_id IN (SELECT id FROM collections WHERE user_id = ?)").bind(user.id).all<{ collection_id: string; plant_id: string }>(),
      db.prepare("SELECT plant_id, kind, value FROM personal_notes WHERE user_id = ?").bind(user.id).all<{ plant_id: string; kind: string; value: string }>(),
      db.prepare("SELECT display_name FROM profiles WHERE user_id = ?").bind(user.id).first<{ display_name: string }>(),
      db.prepare("SELECT * FROM species ORDER BY created_at DESC LIMIT 1000").all<Record<string, string | null>>(),
    ]);
    const localNames: Record<string, string[]> = {};
    const leafNotes: Record<string, string> = {};
    for (const note of notes.results) {
      if (note.kind === "names") {
        try { localNames[note.plant_id] = JSON.parse(note.value); } catch { localNames[note.plant_id] = []; }
      } else if (note.kind === "leaf") leafNotes[note.plant_id] = note.value;
    }
    return Response.json({
      ...observationPage,
      liked: likes.results.map(row => row.observation_id),
      saved: saves.results.map(row => row.item_id),
      collections: collections.results.map(row => ({ id: row.id, name: row.name, items: items.results.filter(item => item.collection_id === row.id).map(item => item.plant_id) })),
      localNames, leafNotes, name: profile?.display_name || user.display, isAdmin: user.isAdmin,
      customPlants: customPlants.results.map(row => ({
        ...(row.ecology ? JSON.parse(String(row.ecology)) : {}),
        id: row.id, name: row.name, latin: row.latin, family: row.family, genus: row.genus,
        category: row.category, leaf: row.leaf, form: row.form, range: row.range,
        habitat: row.habitat || undefined, growth: row.growth || undefined, height: row.height || undefined,
        life: row.life || undefined, light: row.light || undefined, humidity: row.humidity || undefined, soil: row.soil || undefined,
        description: row.description, leafNote: row.leaf_note || undefined, fruitNote: row.fruit_note || undefined,
        source: row.source, image: row.image_key ? `/api/image/${row.image_key}` : undefined,
      })),
    }, { headers: { "Cache-Control": "no-store" } });
  } catch (cause) {
    console.error("state GET failed", cause);
    return error("Kayıtlar yüklenemedi.", 503);
  }
}

export async function POST(request: Request) {
  const user = await identity();
  if (!user.id) return error("Oturum açmanız gerekiyor.", 401);
  const db = await database();
  if (!db) return error("Veri tabanı kullanılamıyor.", 503);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return error("İstek okunamadı."); }
  const action = clean(data.action, 40);
  const id = clean(data.id, 80);
  const plantId = clean(data.plantId, 80);
  try {
    if (action === "create-post") {
      const postId=clean(data.clientId,36)||crypto.randomUUID();
      if(!/^[a-f0-9-]{36}$/.test(postId)) return error("Kayıt kimliği geçersiz.");
      const existing=await db.prepare("SELECT * FROM observations WHERE id=?").bind(postId).first<Record<string,string|null>>();
      if(existing && existing.user_id!==user.id) return error("Kayıt geçersiz.",409);

      const content=clean(data.text,1500), cover=clean(data.imageKey,80);
      const linkUrl = clean(data.linkUrl,2000);
      if (linkUrl && !previewUrl(linkUrl)) return error("Bağlantı geçersiz.");
      let linkPreview = linkUrl ? { url: previewUrl(linkUrl), title: new URL(linkUrl).hostname, description: "", siteName: new URL(linkUrl).hostname } : undefined;
      if (linkUrl) { try { const internal = await internalLinkPreview(linkUrl); if (internal === null) return error("Bağlantı bulunamadı."); linkPreview = internal === undefined ? await fetchLinkPreview(linkUrl) : internal; } catch { /* The valid link remains attachable when metadata is unavailable. */ } }
      const linkJson = linkPreview ? JSON.stringify(linkPreview) : null;
      const photos=Array.isArray(data.photos) ? data.photos as {key:string;organ?:string}[] : cover ? [{key:cover,organ:clean(data.organ,50)}] : [];
      if(photos.length>100) return error("Bir gözleme en fazla 100 fotoğraf ekleyebilirsiniz.");
      if(!content && !photos.length && !linkUrl) return error("Fotoğraf veya açıklama gerekli.");
      if(new Set(photos.map(p=>p?.key)).size!==photos.length) return error("Aynı fotoğraf iki kez eklenemez.");
      if(photos.some(photo=>!photo || typeof photo.key!=="string" || !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(photo.key))) return error("Fotoğraf geçersiz.");
      if(photos.length) {
        const keys=photos.map(p=>p.key), slots=keys.map(()=>"?").join(",");
        const owned=await db.prepare(`SELECT key,user_id FROM uploads WHERE key IN (${slots})`).bind(...keys).all<{key:string;user_id:string}>();
        if(owned.results.length!==keys.length || owned.results.some(row=>row.user_id!==user.id)) return error("Fotoğraf hesabınıza ait değil.",403);
        const used=await db.prepare(`SELECT image_key FROM observation_photos WHERE image_key IN (${slots}) AND observation_id<>?`).bind(...keys,postId).first();
        if(used) return error("Fotoğraf başka bir gözlemde kullanılıyor.");
      }
      if(plantId && !await validPlant(db,plantId)) return error("Tür bulunamadı.");
      const p=data.position as {latitude?:number;longitude?:number}|null;
      if(p && (!Number.isFinite(p.latitude)||!Number.isFinite(p.longitude)||Math.abs(p.latitude!)>90||Math.abs(p.longitude!)>180)) return error("Konum geçersiz.");
      const observedAt=clean(data.observedAt,10);
      if(observedAt && (!/^\d{4}-\d{2}-\d{2}$/.test(observedAt)||Number.isNaN(Date.parse(observedAt))||new Date(observedAt).toISOString().slice(0,10)!==observedAt)) return error("Gözlem tarihi geçersiz.");
      const status=data.share===true ? "pending" : "draft";
      const author=(await db.prepare("SELECT display_name FROM profiles WHERE user_id=?").bind(user.id).first<{display_name:string}>())?.display_name||user.display;
      if(existing) {
        const oldPhotos=(await db.prepare("SELECT image_key,organ FROM observation_photos WHERE observation_id=? ORDER BY CAST(position AS INTEGER)").bind(postId).all<{image_key:string;organ:string|null}>()).results;
        const samePhotos=JSON.stringify(oldPhotos.map(photo=>[photo.image_key,photo.organ||""]))===JSON.stringify(photos.map(photo=>[photo.key,clean(photo.organ,50)]));
        const sameFields=(readLinkPreview(existing.link_preview)?.url || "") === (linkPreview?.url || "") && existing.text===content && (existing.plant_id||"")===plantId && (existing.observed_at||"")===observedAt &&
          (existing.latitude||"") === (p ? String(p.latitude) : "") && (existing.longitude||"") === (p ? String(p.longitude) : "");
        const sameVisibility=data.share===true ? ["pending","approved"].includes(existing.status||"") : existing.status==="draft";
        if(samePhotos && sameFields && sameVisibility)return Response.json({id:postId,status:existing.status});
        await db.batch([
          db.prepare("UPDATE observations SET author=?,text=?,plant_id=?,image_key=?,organ=?,latitude=?,longitude=?,status=?,observed_at=?,link_preview=?,review_note=NULL WHERE id=? AND user_id=?").bind(author,content,plantId||null,photos[0]?.key||null,clean(photos[0]?.organ,50)||null,p?String(p.latitude):null,p?String(p.longitude):null,status,observedAt||null,linkJson,postId,user.id),
          db.prepare("DELETE FROM observation_photos WHERE observation_id=?").bind(postId),
          ...photos.map((photo,i)=>db.prepare("INSERT INTO observation_photos (observation_id,image_key,organ,position) VALUES (?,?,?,?)").bind(postId,photo.key,clean(photo.organ,50)||null,String(i)))
        ]);
        return Response.json({id:postId,status});
      }
      await db.batch([
        db.prepare("INSERT INTO observations (id,user_id,author,text,plant_id,image_key,organ,latitude,longitude,status,observed_at,created_at,link_preview) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?)").bind(postId,user.id,author,content,plantId||null,photos[0]?.key||null,clean(photos[0]?.organ,50)||null,p ? String(p.latitude) : null,p ? String(p.longitude) : null,status,observedAt||null,new Date().toISOString(),linkJson),
        ...photos.map((photo,i)=>db.prepare("INSERT INTO observation_photos (observation_id,image_key,organ,position) VALUES (?,?,?,?)").bind(postId,photo.key,clean(photo.organ,50)||null,String(i)))
      ]);
      return Response.json({id:postId,status});
    }
    if(action==="submit-observation" || action==="withdraw-observation") {
      const own=await db.prepare("SELECT id FROM observations WHERE id=? AND user_id=?").bind(id,user.id).first();
      if(!own) return error("Gözlem bulunamadı.",404);
      const status=action==="submit-observation" ? "pending" : "draft";
      await db.prepare("UPDATE observations SET status=?,review_note=NULL WHERE id=? AND user_id=?").bind(status,id,user.id).run();
      return Response.json({ok:true,status});
    }
    if(action==="review-observation") {
      if(!user.isAdmin) return error("Yönetici yetkisi gerekli.",403);
      if(!["approved","rejected"].includes(clean(data.decision,20))) return error("Karar geçersiz.");
      const row=await db.prepare("SELECT id,plant_id FROM observations WHERE id=? AND status='pending'").bind(id).first<{id:string;plant_id:string}>();
      if(!row) return error("Bekleyen gözlem bulunamadı.",404);
      const target=plantId||row.plant_id;
      if(data.decision==="approved" && (!target||!await validPlant(db,target))) return error("Onaydan önce ilgili türü seçin.");
      await db.prepare("UPDATE observations SET status=?,plant_id=?,review_note=? WHERE id=? AND status='pending'").bind(data.decision,target||null,clean(data.reviewNote,500)||null,id).run();
      return Response.json({ok:true,status:data.decision,plantId:target});
    }
    if (action === "set-name") {
      const value = clean(data.value, 60);
      if (!value) return error("Görünen ad gerekli.");
      await db.prepare("INSERT INTO profiles (user_id,display_name,updated_at) VALUES (?,?,?) ON CONFLICT(user_id) DO UPDATE SET display_name=excluded.display_name, updated_at=excluded.updated_at")
        .bind(user.id, value, new Date().toISOString()).run();
      return Response.json({ ok: true });
    }
    if (action === "toggle-like" || action === "toggle-save") {
      if (!id) return error("Kayıt seçilmedi.");
      if (data.selected !== undefined && typeof data.selected !== "boolean") return error("Seçim geçersiz.");
      const table = action === "toggle-like" ? "likes" : "saves";
      const field = action === "toggle-like" ? "observation_id" : "item_id";
      if (typeof data.selected === "boolean") {
        if (data.selected) await db.prepare(`INSERT OR IGNORE INTO ${table} (user_id,${field}) VALUES (?,?)`).bind(user.id, id).run();
        else await db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND ${field} = ?`).bind(user.id, id).run();
        return Response.json({ selected: data.selected });
      }
      const existing = await db.prepare(`SELECT 1 AS found FROM ${table} WHERE user_id = ? AND ${field} = ?`).bind(user.id, id).first();
      if (existing) await db.prepare(`DELETE FROM ${table} WHERE user_id = ? AND ${field} = ?`).bind(user.id, id).run();
      else await db.prepare(`INSERT INTO ${table} (user_id,${field}) VALUES (?,?)`).bind(user.id, id).run();
      return Response.json({ selected: !existing });
    }
    if (action === "comment") {
      const value = clean(data.value, 300);
      if (!id || !value) return error("Yorum yazın.");
      const clientId=clean(data.clientId,100);
      if(clientId&&!/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(clientId))return error("Yorum kimliği geçersiz.");
      if(clientId){
        const earlier=await db.prepare("SELECT observation_id,user_id,text FROM comments WHERE id=?").bind(clientId).first<{observation_id:string;user_id:string;text:string}>();
        if(earlier)return earlier.observation_id===id&&earlier.user_id===user.id&&earlier.text===value?Response.json({ok:true,id:clientId}):error("Yorum başka bir kayıtla eşleşiyor. Yeniden deneyin.",409);
      }
      const exists = await db.prepare("SELECT id FROM observations WHERE id = ? AND (status='approved' OR user_id=?)").bind(id,user.id).first();
      if (!exists) {
        if (!/^gbif:\d{1,16}$/.test(id)) return error("Gözlem bulunamadı.", 404);
        const response = await fetch(`https://api.gbif.org/v1/occurrence/${id.slice(5)}`, { signal: AbortSignal.timeout(15000) });
        if (!response.ok) return error("Kaynak gözlem bulunamadı.", 404);
        const source = await response.json() as { kingdom: string; media: unknown };
        if (source.kingdom !== "Plantae" || !licensedPhotos(source.media).length) return error("Gözlem kullanılamıyor.", 404);
      }
      const author = (await db.prepare("SELECT display_name FROM profiles WHERE user_id = ?").bind(user.id).first<{ display_name: string }>())?.display_name || user.display;
      const commentId=clientId||crypto.randomUUID();
      await db.prepare("INSERT INTO comments (id,observation_id,user_id,author,text,created_at) VALUES (?,?,?,?,?,?) ON CONFLICT(id) DO NOTHING")
        .bind(commentId, id, user.id, author, value, new Date().toISOString()).run();
      const stored=await db.prepare("SELECT observation_id,user_id,text FROM comments WHERE id=?").bind(commentId).first<{observation_id:string;user_id:string;text:string}>();
      if(!stored||stored.observation_id!==id||stored.user_id!==user.id||stored.text!==value)return error("Yorum başka bir kayıtla eşleşiyor. Yeniden deneyin.",409);
      return Response.json({ ok: true, id: commentId });
    }
    if (action === "identify-post") {
      if (!plantId || !(await validPlant(db, plantId))) return error("Geçerli bir tür seçin.");
      const result = await db.prepare("UPDATE observations SET plant_id = ?, status = CASE WHEN status='approved' THEN 'pending' ELSE status END WHERE id = ? AND user_id = ?").bind(plantId, id, user.id).run();
      return Response.json({ ok: true, result });
    }
    if (action === "suggest-identification") {
      if (!plantId || !(await validPlant(db, plantId))) return error("Geçerli bir tür seçin.");
      const post = await db.prepare("SELECT id FROM observations WHERE id = ?").bind(id).first();
      if (!post) return error("Gözlem bulunamadı.", 404);
      const author = (await db.prepare("SELECT display_name FROM profiles WHERE user_id = ?").bind(user.id).first<{ display_name: string }>())?.display_name || user.display;
      const existing = await db.prepare("SELECT id FROM identifications WHERE observation_id = ? AND user_id = ? AND status = 'pending'").bind(id, user.id).first<{ id: string }>();
      const suggestionId = existing?.id || crypto.randomUUID();
      if (existing) await db.prepare("UPDATE identifications SET plant_id = ?, created_at = ? WHERE id = ?").bind(plantId, new Date().toISOString(), suggestionId).run();
      else await db.prepare("INSERT INTO identifications (id,observation_id,user_id,author,plant_id,status,created_at) VALUES (?,?,?,?,?,?,?)")
        .bind(suggestionId, id, user.id, author, plantId, "pending", new Date().toISOString()).run();
      return Response.json({ id: suggestionId });
    }
    if (action === "review-identification") {
      const suggestion = await db.prepare("SELECT i.observation_id, i.plant_id FROM identifications i JOIN observations o ON o.id = i.observation_id WHERE i.id = ? AND i.status = 'pending' AND o.user_id = ?").bind(id, user.id).first<{ observation_id: string; plant_id: string }>();
      if (!suggestion) return error("Öneri bulunamadı.", 404);
      const decision = clean(data.decision, 20);
      if (!["approved", "rejected"].includes(decision)) return error("Karar geçersiz.");
      await db.prepare("UPDATE identifications SET status = ? WHERE id = ?").bind(decision, id).run();
      if (decision === "approved") await db.prepare("UPDATE observations SET plant_id = ?, status = CASE WHEN status='approved' THEN 'pending' ELSE status END WHERE id = ? AND user_id = ?").bind(suggestion.plant_id, suggestion.observation_id, user.id).run();
      return Response.json({ ok: true });
    }
    if (action === "delete-post") {
      const own = await db.prepare("SELECT image_key FROM observations WHERE id = ? AND user_id = ?").bind(id, user.id).first<{ image_key: string | null }>();
      if (!own) return error("Gözlem bulunamadı.", 404);
      const photoKeys=await db.prepare("SELECT image_key FROM observation_photos WHERE observation_id=?").bind(id).all<{image_key:string}>();
      await db.prepare("DELETE FROM observation_photos WHERE observation_id=?").bind(id).run();
      await db.prepare("DELETE FROM comments WHERE observation_id = ?").bind(id).run();
      await db.prepare("DELETE FROM identifications WHERE observation_id = ?").bind(id).run();
      await db.prepare("DELETE FROM likes WHERE observation_id = ?").bind(id).run();
      await db.prepare("DELETE FROM saves WHERE item_id = ?").bind(id).run();
      await db.prepare("DELETE FROM observations WHERE id = ? AND user_id = ?").bind(id, user.id).run();
      for(const key of new Set([own.image_key,...photoKeys.results.map(p=>p.image_key)].filter(Boolean))) { await (await runtime()).BUCKET?.delete(key!); await db.prepare("DELETE FROM uploads WHERE key=? AND user_id=?").bind(key,user.id).run(); }
      return Response.json({ ok: true });
    }
    if (action === "create-collection") {
      const value = clean(data.value, 50);
      if (!value) return error("Koleksiyon adı gerekli.");
      const existing = await db.prepare("SELECT id FROM collections WHERE user_id = ? AND lower(name) = lower(?)").bind(user.id, value).first();
      if (existing) return error("Bu adla bir koleksiyon var.");
      const collectionId = crypto.randomUUID();
      await db.prepare("INSERT INTO collections (id,user_id,name,created_at) VALUES (?,?,?,?)").bind(collectionId, user.id, value, new Date().toISOString()).run();
      if (plantId && await validPlant(db, plantId)) await db.prepare("INSERT INTO collection_items (collection_id,plant_id) VALUES (?,?)").bind(collectionId, plantId).run();
      return Response.json({ id: collectionId });
    }
    if (action === "delete-collection") {
      const own = await db.prepare("SELECT id FROM collections WHERE id = ? AND user_id = ?").bind(id, user.id).first();
      if (!own) return error("Koleksiyon bulunamadı.", 404);
      await db.prepare("DELETE FROM collection_items WHERE collection_id = ?").bind(id).run();
      await db.prepare("DELETE FROM collections WHERE id = ? AND user_id = ?").bind(id, user.id).run();
      return Response.json({ ok: true });
    }
    if (action === "toggle-collection-item") {
      if (!(await validPlant(db, plantId))) return error("Tür bulunamadı.");
      const own = await db.prepare("SELECT id FROM collections WHERE id = ? AND user_id = ?").bind(id, user.id).first();
      if (!own) return error("Koleksiyon bulunamadı.", 404);
      const existing = await db.prepare("SELECT 1 AS found FROM collection_items WHERE collection_id = ? AND plant_id = ?").bind(id, plantId).first();
      if (existing) await db.prepare("DELETE FROM collection_items WHERE collection_id = ? AND plant_id = ?").bind(id, plantId).run();
      else await db.prepare("INSERT INTO collection_items (collection_id,plant_id) VALUES (?,?)").bind(id, plantId).run();
      return Response.json({ selected: !existing });
    }
    if (action === "set-note") {
      if (!(await validPlant(db, plantId)) || !["leaf", "names"].includes(clean(data.kind, 20))) return error("Not türü geçersiz.");
      const kind = clean(data.kind, 20);
      const value = clean(data.value, 800);
      if (!value) return error("Not boş olamaz.");
      await db.prepare("INSERT INTO personal_notes (user_id,plant_id,kind,value) VALUES (?,?,?,?) ON CONFLICT(user_id,plant_id,kind) DO UPDATE SET value=excluded.value")
        .bind(user.id, plantId, kind, value).run();
      return Response.json({ ok: true });
    }
    return error("İşlem bulunamadı.", 404);
  } catch (cause) {
    console.error("state POST failed", cause);
    return error("İşlem kaydedilemedi. Tekrar deneyin.", 503);
  }
}
