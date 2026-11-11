import { headers } from "next/headers";

export const dynamic = "force-dynamic";
const types: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp" };

export async function POST(request: Request) {
  const userId = (await headers()).get("oai-authenticated-user-id");
  if (!userId) return Response.json({ error: "Oturum açmanız gerekiyor." }, { status: 401 });
  const bucket = ((await import("cloudflare:workers")).env as unknown as { BUCKET?: { put(key: string, value: ArrayBuffer, options: unknown): Promise<unknown> } }).BUCKET;
  if (!bucket) return Response.json({ error: "Fotoğraf deposu kullanılamıyor." }, { status: 503 });
  try {
    const body = await request.formData();
    const file = body.get("file");
    if (!(file instanceof File) || !types[file.type] || file.size < 1 || file.size > 1_500_000) {
      return Response.json({ error: "JPG, PNG veya WebP biçiminde en fazla 1,5 MB fotoğraf seçin." }, { status: 400 });
    }
    const key = `${crypto.randomUUID()}.${types[file.type]}`;
    const bytes=await file.arrayBuffer(); const sig=new Uint8Array(bytes);
    if(!(file.type==="image/jpeg" ? sig[0]===255 && sig[1]===216 : file.type==="image/png" ? sig[0]===137 && sig[1]===80 && sig[2]===78 && sig[3]===71 : String.fromCharCode(...sig.slice(0,4))==="RIFF" && String.fromCharCode(...sig.slice(8,12))==="WEBP")) return Response.json({error:"Fotoğraf biçimi doğrulanamadı."},{status:400});
    await bucket.put(key, bytes, { httpMetadata: { contentType: file.type } });
    const db=((await import("cloudflare:workers")).env as unknown as {DB:{prepare(sql:string):{bind(...args:unknown[]):{run():Promise<unknown>}}}}).DB;
    await db.prepare("INSERT INTO uploads (key,user_id,created_at) VALUES (?,?,?)").bind(key,userId,new Date().toISOString()).run();
    return Response.json({ key, url: `/api/image/${key}` });
  } catch (cause) {
    console.error("upload failed", cause);
    return Response.json({ error: "Fotoğraf yüklenemedi." }, { status: 503 });
  }
}
