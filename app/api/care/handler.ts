import type { RawDB } from "../../../db/runtime.ts";
import type { CarePlant,CareTask,CareEvent } from "../../care-model.ts";
const reply=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
const clean=(value:unknown,max:number)=>typeof value==="string" ? value.trim().slice(0,max) : "";
const validId=(value:unknown)=>typeof value==="string" && /^[a-f0-9-]{36}$/.test(value);
const validDate=(value:unknown)=>typeof value==="string" && /^\d{4}-\d{2}-\d{2}T/.test(value) && Number.isFinite(Date.parse(value)) && Date.parse(value)>Date.parse("2000-01-01") && Date.parse(value)<Date.parse("2100-01-01");
const validInterval=(value:unknown)=>Number.isInteger(value) && Number(value)>=0 && Number(value)<=365;
const kinds=["check","water","feed","clean","repot","custom"];
export async function handleCare(request:Request,db?:RawDB){
 const user=request.headers.get("oai-authenticated-user-id");if(!user)return reply({error:"Oturum açmalısın."},401);
 const origin=request.headers.get("origin");if(origin && origin!==new URL(request.url).origin)return reply({error:"İstek geçersiz."},403);
 if(!db)return reply({error:"Bakım kayıtlarına ulaşılamadı. Yeniden dene."},503);
 try{
  if(request.method==="GET"){const [plants,tasks,events]=await Promise.all([db.prepare("SELECT id,name,species,guide,location,light,created_at FROM care_plants WHERE user_id=? ORDER BY created_at DESC").bind(user).all<CarePlant>(),db.prepare("SELECT id,plant_id,title,kind,due_at,interval_days,revision,active FROM care_tasks WHERE user_id=? AND active=1 ORDER BY due_at").bind(user).all<CareTask>(),db.prepare("SELECT id,plant_id,task_id,title,kind,action,note,created_at FROM care_events WHERE user_id=? ORDER BY created_at DESC LIMIT 100").bind(user).all<CareEvent>()]);return reply({plants:plants.results,tasks:tasks.results,events:events.results});}
  const raw=await request.text();if(raw.length>8000)return reply({error:"İstek çok uzun."},413);let b:Record<string,unknown>;try{b=JSON.parse(raw);}catch{return reply({error:"İstek okunamadı."},400);}
  if(!b || typeof b!=="object")return reply({error:"İstek geçersiz."},400);
  if(b.action==="update-plant"){
   if(!validId(b.id)||!clean(b.name,80))return reply({error:"Geçerli bitki ve ad gerekli."},400);
   const updated=await db.prepare("UPDATE care_plants SET name=?,species=?,guide=?,location=?,light=? WHERE id=? AND user_id=? RETURNING id").bind(clean(b.name,80),clean(b.species,160),["monstera","pothos","snake"].includes(String(b.guide))?b.guide:"",clean(b.location,80),clean(b.light,80),b.id,user).first();
   return updated?reply({ok:true}):reply({error:"Bitki bulunamadı."},404);
  }
  if(b.action==="update-task"){
   if(!validId(b.id)||!Number.isInteger(b.revision)||!clean(b.title,100)||!kinds.includes(String(b.kind))||!validDate(b.dueAt)||!validInterval(b.intervalDays))return reply({error:"Görev ve tarih bilgilerini kontrol et."},400);
   const updated=await db.prepare("UPDATE care_tasks SET title=?,kind=?,due_at=?,interval_days=?,revision=revision+1 WHERE id=? AND user_id=? AND revision=? AND active=1 RETURNING id").bind(clean(b.title,100),b.kind,new Date(String(b.dueAt)).toISOString(),b.intervalDays,b.id,user,b.revision).first();
   return updated?reply({ok:true}):reply({error:"Görev değişti veya bulunamadı. Güncel planı yükle."},409);
  }
  if(b.action==="add-plant"){
   if(!validId(b.id) || !clean(b.name,80) || !validDate(b.dueAt) || !validInterval(b.intervalDays))return reply({error:"Bitki adı ve geçerli bir kontrol zamanı gerekli."},400);
   const count=await db.prepare("SELECT count(*) AS n FROM care_plants WHERE user_id=?").bind(user).first<{n:number}>();if((count?.n||0)>=500)return reply({error:"En fazla 500 bitki kaydedebilirsin."},400);
   const existing=await db.prepare("SELECT user_id FROM care_plants WHERE id=?").bind(b.id).first<{user_id:string}>();if(existing)return existing.user_id===user?reply({ok:true}):reply({error:"Kayıt geçersiz."},409);
   const taskId=crypto.randomUUID();await db.batch([db.prepare("INSERT INTO care_plants (id,user_id,name,species,guide,location,light,created_at) VALUES (?,?,?,?,?,?,?,?)").bind(b.id,user,clean(b.name,80),clean(b.species,160),["monstera","pothos","snake"].includes(String(b.guide))?b.guide:"",clean(b.location,80),clean(b.light,80),new Date().toISOString()),db.prepare("INSERT INTO care_tasks (id,user_id,plant_id,title,kind,due_at,interval_days,revision,active) VALUES (?,?,?,?,?,?,?,0,1)").bind(taskId,user,b.id,"Toprak kontrolü","check",new Date(String(b.dueAt)).toISOString(),b.intervalDays)]);return reply({ok:true});
  }
  if(b.action==="add-task"){
   if(!validId(b.id)||!validId(b.plantId)||!clean(b.title,100)||!kinds.includes(String(b.kind))||!validDate(b.dueAt)||!validInterval(b.intervalDays))return reply({error:"Görev ve tarih bilgilerini kontrol et."},400);
   const plant=await db.prepare("SELECT id FROM care_plants WHERE id=? AND user_id=?").bind(b.plantId,user).first();if(!plant)return reply({error:"Bitki bulunamadı."},404);
   const count=await db.prepare("SELECT count(*) AS n FROM care_tasks WHERE plant_id=? AND user_id=? AND active=1").bind(b.plantId,user).first<{n:number}>();if((count?.n||0)>=30)return reply({error:"Bitki başına en fazla 30 etkin görev ekleyebilirsin."},400);
   const existing=await db.prepare("SELECT user_id FROM care_tasks WHERE id=?").bind(b.id).first<{user_id:string}>();if(existing)return existing.user_id===user?reply({ok:true}):reply({error:"Kayıt geçersiz."},409);
   await db.prepare("INSERT INTO care_tasks (id,user_id,plant_id,title,kind,due_at,interval_days,revision,active) VALUES (?,?,?,?,?,?,?,0,1)").bind(b.id,user,b.plantId,clean(b.title,100),b.kind,new Date(String(b.dueAt)).toISOString(),b.intervalDays).run();return reply({ok:true});
  }
  if(b.action==="delete-plant"){
   if(!validId(b.id))return reply({error:"Bitki geçersiz."},400);
   await db.batch([db.prepare("DELETE FROM care_tasks WHERE plant_id=? AND user_id=?").bind(b.id,user),db.prepare("DELETE FROM care_events WHERE plant_id=? AND user_id=?").bind(b.id,user),db.prepare("DELETE FROM care_plants WHERE id=? AND user_id=?").bind(b.id,user)]);return reply({ok:true});
  }
  if(["complete","snooze","delete-task"].includes(String(b.action))){
   if(!validId(b.id)||!Number.isInteger(b.revision)||!validId(b.eventId))return reply({error:"Görev geçersiz."},400);
   const existing=await db.prepare("SELECT id FROM care_events WHERE id=? AND user_id=?").bind(b.eventId,user).first();if(existing)return reply({ok:true});
   const task=await db.prepare("SELECT * FROM care_tasks WHERE id=? AND user_id=? AND active=1").bind(b.id,user).first<CareTask>();if(!task)return reply({error:"Görev bulunamadı."},404);
   if(task.revision!==b.revision)return reply({error:"Bu görev başka bir ekranda değişti. Güncel planı yükle."},409);
   if(b.action!=="delete-task" && !validDate(b.nextDue))return reply({error:"Yeni kontrol zamanı geçersiz."},400);
   const next=b.action==="delete-task" ? task.due_at : new Date(String(b.nextDue)).toISOString();
   const active=b.action==="delete-task" || b.action==="complete" && task.interval_days===0 ? 0:1;
   await db.batch([db.prepare("UPDATE care_tasks SET due_at=?,active=?,revision=revision+1,last_action=? WHERE id=? AND user_id=? AND revision=? AND active=1").bind(next,active,b.eventId,b.id,user,b.revision),db.prepare("INSERT INTO care_events (id,user_id,plant_id,task_id,title,kind,action,note,created_at) SELECT ?,user_id,plant_id,id,title,kind,?,?,? FROM care_tasks WHERE id=? AND user_id=? AND last_action=? ON CONFLICT(id) DO NOTHING").bind(b.eventId,b.action,clean(b.note,800),new Date().toISOString(),b.id,user,b.eventId)]);
   const saved=await db.prepare("SELECT id FROM care_events WHERE id=? AND user_id=?").bind(b.eventId,user).first();return saved?reply({ok:true}):reply({error:"Görev değişti. Güncel planı yükle."},409);
  }
  return reply({error:"İşlem geçersiz."},400);
 }catch(cause){console.error("care request failed",cause);return reply({error:"Bakım kaydı kaydedilemedi. Bilgilerin korunuyor; yeniden dene."},503);}
}
