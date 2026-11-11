import type {RawDB} from "../../../db/runtime.ts";
const send=(b:unknown,status=200)=>Response.json(b,{status,headers:{"Cache-Control":"no-store"}});
export const validID=(x:unknown):x is string=>typeof x==="string"&&/^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/.test(x);
export function clean(x:unknown,max:number){return typeof x==="string"?x.trim().slice(0,max):"";}
export function safeLink(x:unknown){if(!x)return "";try{const u=new URL(String(x));return u.protocol==="https:"&&!u.username&&!u.password?u.href:"";}catch{return "";}}
const kinds=["forestry","publication","nursery","health"];
const fields:Record<string,number>={summary:1200,content:20000,topic:80,authors:300,institution:200,year:4,doi:200,sourceUrl:1000,references:4000,region:150,method:4000,results:4000,contact:200,url:1000,species:200,location:200,light:100,moisture:100,symptoms:400,duration:100,note:3000,result:6000};
export async function handleResources(request:Request,db?:RawDB){
 const user=request.headers.get("oai-authenticated-user-id");if(!user)return send({error:"Oturum açmalısın."},401);
 if(request.headers.get("origin")&&request.headers.get("origin")!==new URL(request.url).origin)return send({error:"İstek geçersiz."},403);
 if(!db)return send({error:"Kayıtlara ulaşılamadı. Yeniden dene."},503);
 try{
  if(request.method==="GET"){
   const p=new URL(request.url).searchParams,kind=p.get("kind");if(!kinds.includes(kind||""))return send({error:"Bölüm geçersiz."},400);
   const q=clean(p.get("q"),200),mine=p.get("mine")==="1"||kind==="health",id=p.get("id");if(id&&!validID(id))return send({error:"Kayıt geçersiz."},400);
   const conditions=["kind=?",mine?"user_id=?":"(status='published' OR user_id=?)"],args:unknown[]=[kind,user];if(id){conditions.push("id=?");args.push(id);}if(q){conditions.push("(instr(lower(title),lower(?))>0 OR instr(lower(data),lower(?))>0)");args.push(q,q);}
   const rows=await db.prepare(`SELECT * FROM resources WHERE ${conditions.join(" AND ")} ORDER BY updated_at DESC LIMIT 200`).bind(...args).all<Record<string,unknown>>();
   return send({records:rows.results.map(({user_id,data,...r})=>({...r,data:JSON.parse(String(data)),owner:user_id===user})),limit:200});
  }
  const raw=await request.text();if(raw.length>40000)return send({error:"İçerik çok uzun."},413);let b;try{b=JSON.parse(raw);}catch{return send({error:"İstek okunamadı."},400);}if(!b||typeof b!=="object"||!validID(b.id))return send({error:"Kayıt geçersiz."},400);
  const current=await db.prepare("SELECT user_id,revision FROM resources WHERE id=?").bind(b.id).first<{user_id:string;revision:number}>();
  if(current&&current.user_id!==user)return send({error:"Bu kaydı düzenleyemezsin."},403);
  if(b.action==="delete"){if(!current)return send({ok:true});if(current.revision!==b.revision)return send({error:"Kayıt değişti. Yeniden yükle."},409);const deleted=await db.prepare("DELETE FROM resources WHERE id=? AND user_id=? AND revision=? RETURNING id").bind(b.id,user,b.revision).first();return deleted?send({ok:true}):send({error:"Kayıt değişti. Yeniden yükle."},409);}
  if(b.action!=="save"||!kinds.includes(b.kind)||!clean(b.title,200)||!b.data||typeof b.data!=="object"||!["draft","published"].includes(b.status))return send({error:"Başlık ve içerik bilgilerini kontrol et."},400);
  const data:Record<string,string>={};for(const [key,max] of Object.entries(fields))if(clean(b.data[key],max))data[key]=clean(b.data[key],max);
  for(const key of ["sourceUrl","url"])if(data[key]&&!safeLink(data[key]))return send({error:"Bağlantı HTTPS biçiminde olmalı."},400);
  if(data.doi&&!/^10\.\d{4,9}\/\S+$/i.test(data.doi))return send({error:"DOI 10. ile başlamalı. DOI yoksa alanı boş bırak."},400);
  if(b.kind==="publication"&&b.status==="published"&&(!data.authors||!data.summary))return send({error:"Yayın için yazar ve özet gerekli."},400);
  if(b.kind==="nursery"&&(!data.region||!data.contact&&!data.url))return send({error:"Fidanlık için il ve iletişim bilgisi gerekli."},400);
  const status=b.kind==="health"?"draft":b.status,now=new Date().toISOString();
  if(current){if(current.revision!==b.revision)return send({error:"Kayıt başka bir ekranda değişti. Yeniden yükle."},409);const updated=await db.prepare("UPDATE resources SET kind=?,title=?,status=?,data=?,revision=revision+1,updated_at=? WHERE id=? AND user_id=? AND revision=? RETURNING id").bind(b.kind,clean(b.title,200),status,JSON.stringify(data),now,b.id,user,b.revision).first();return updated?send({ok:true}):send({error:"Kayıt değişti. Yeniden yükle."},409);}
  const count=await db.prepare("SELECT count(*) n FROM resources WHERE user_id=?").bind(user).first<{n:number}>();if((count?.n||0)>=1000)return send({error:"Kayıt sınırına ulaşıldı."},400);
  const profile=await db.prepare("SELECT display_name AS name FROM profiles WHERE user_id=?").bind(user).first<{name:string}>();await db.prepare("INSERT INTO resources (id,user_id,kind,title,status,data,author,revision,created_at,updated_at) VALUES (?,?,?,?,?,?,?,0,?,?)").bind(b.id,user,b.kind,clean(b.title,200),status,JSON.stringify(data),profile?.name||"Üye",now,now).run();return send({ok:true});
 }catch(e){console.error("resource request failed",e);return send({error:"Kayıt kaydedilemedi. Bilgilerini koruyup yeniden dene."},503);}
}
