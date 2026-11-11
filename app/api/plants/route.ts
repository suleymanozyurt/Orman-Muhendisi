import { headers } from "next/headers";
import { plants, plantOptions } from "../../plant-data";

export const dynamic = "force-dynamic";

type DB = { prepare(sql: string): { bind(...values: unknown[]): { first<T = unknown>(): Promise<T | null>; run(): Promise<unknown> } } };
const fail = (message: string, status = 400) => Response.json({ error: message }, { status });
const field = (value: unknown, max: number) => typeof value === "string" ? value.trim().slice(0, max) : "";

export async function POST(request: Request) {
  const email = (await headers()).get("oai-authenticated-user-email")?.toLocaleLowerCase("tr");
  const userId = (await headers()).get("oai-authenticated-user-id");
  if (!userId || email !== "suleymanozyurt49@gmail.com") return fail("Yönetici yetkisi gerekli.", 403);
  const db = ((await import("cloudflare:workers")).env as unknown as { DB?: DB }).DB;
  if (!db) return fail("Veri tabanı kullanılamıyor.", 503);
  let data: Record<string, unknown>;
  try { data = await request.json(); } catch { return fail("İstek okunamadı."); }
  const name = field(data.name, 100);
  const latin = field(data.latin, 140);
  const family = field(data.family, 80);
  const genus = field(data.genus, 80);
  const category = field(data.category, 60);
  const leaf = field(data.leaf, 20);
  const form = field(data.form, 30);
  const habitat = field(data.habitat, 30);
  const growth = field(data.growth, 20);
  const height = field(data.height, 30);
  const life = field(data.life, 20);
  const light = field(data.light, 20);
  const humidity = field(data.humidity, 20);
  const soil = field(data.soil, 20);
  const range = field(data.range, 400);
  const description = field(data.description, 2000);
  const leafNote = field(data.leafNote, 800);
  const fruitNote = field(data.fruitNote, 800);
  const ecology = Object.fromEntries(["provinces", "grid", "elevation", "flowering", "endemism", "floristicRegion", "ecologySource", "barkNote", "leafShape", "morphologySource"].map(key => [key, field(data[key], key === "barkNote" ? 800 : 600)]));
  if(ecology.morphologySource && !/^https:\/\//.test(ecology.morphologySource)) return fail("HTTPS morfoloji kaynağı gerekli.");
  if (ecology.ecologySource && !/^https?:\/\//.test(ecology.ecologySource)) return fail("Ekoloji kaynak bağlantısı geçersiz.");
  const imageKey = field(data.imageKey, 80);
  const id = field(data.id, 80);
  if (!name || !latin || !family || !genus || !range || !description) return fail("Zorunlu alanları doldurun.");
  if (!plantOptions.category.includes(category as typeof plantOptions.category[number]) ||
    !plantOptions.leaf.includes(leaf as typeof plantOptions.leaf[number]) ||
    !plantOptions.form.includes(form as typeof plantOptions.form[number]) ||
    (habitat && !plantOptions.habitat.includes(habitat as typeof plantOptions.habitat[number])) ||
    (growth && !plantOptions.growth.includes(growth as typeof plantOptions.growth[number])) ||
    (height && !plantOptions.height.includes(height as typeof plantOptions.height[number])) ||
    (life && !plantOptions.life.includes(life as typeof plantOptions.life[number])) ||
    (light && !plantOptions.light.includes(light as typeof plantOptions.light[number])) ||
    (humidity && !plantOptions.humidity.includes(humidity as typeof plantOptions.humidity[number])) ||
    (soil && !plantOptions.soil.includes(soil as typeof plantOptions.soil[number]))) return fail("Özellik seçimi geçersiz.");
  if (imageKey && !/^[a-f0-9-]{36}\.(jpg|png|webp)$/.test(imageKey)) return fail("Fotoğraf geçersiz.");
  let source: URL;
  try { source = new URL(field(data.source, 600)); } catch { return fail("Kaynak bağlantısı geçersiz."); }
  if (source.protocol !== "https:") return fail("HTTPS kaynak bağlantısı gerekli.");
  if (plants.some(plant => plant.latin.toLocaleLowerCase("tr") === latin.toLocaleLowerCase("tr"))) return fail("Bu bilimsel ad başlangıç kataloğunda var.");
  try {
    const conflict = await db.prepare("SELECT id FROM species WHERE lower(latin) = lower(?)").bind(latin).first<{ id: string }>();
    if (conflict && conflict.id !== id) return fail("Bu bilimsel ad zaten kayıtlı.");
    const plantId = id || crypto.randomUUID();
    if (id) {
      const own = await db.prepare("SELECT id FROM species WHERE id = ?").bind(id).first();
      if (!own) return fail("Düzenlenecek tür bulunamadı.", 404);
      await db.prepare("UPDATE species SET name=?,latin=?,family=?,genus=?,category=?,leaf=?,form=?,habitat=?,growth=?,height=?,life=?,light=?,humidity=?,soil=?,range=?,description=?,leaf_note=?,fruit_note=?,source=?,image_key=? WHERE id=?")
        .bind(name, latin, family, genus, category, leaf, form, habitat || null, growth || null, height || null, life || null, light || null, humidity || null, soil || null, range, description, leafNote || null, fruitNote || null, source.href, imageKey || null, id).run();
    } else {
      await db.prepare("INSERT INTO species (id,name,latin,family,genus,category,leaf,form,habitat,growth,height,life,light,humidity,soil,range,description,leaf_note,fruit_note,source,image_key,created_by,created_at) VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?)")
        .bind(plantId, name, latin, family, genus, category, leaf, form, habitat || null, growth || null, height || null, life || null, light || null, humidity || null, soil || null, range, description, leafNote || null, fruitNote || null, source.href, imageKey || null, userId, new Date().toISOString()).run();
    }
    await db.prepare("UPDATE species SET ecology=? WHERE id=?").bind(JSON.stringify(ecology), plantId).run();
    return Response.json({
      plant: { ...ecology, id: plantId, name, latin, family, genus, category, leaf, form, habitat, growth, height, life, light, humidity, soil, range, description,
        leafNote: leafNote || undefined, fruitNote: fruitNote || undefined, source: source.href,
        image: imageKey ? `/api/image/${imageKey}` : undefined },
    });
  } catch (cause) {
    console.error("plant save failed", cause);
    return fail("Tür kaydedilemedi.", 503);
  }
}
