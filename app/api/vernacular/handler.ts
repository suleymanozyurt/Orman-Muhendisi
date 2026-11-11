import type {RawDB} from "../../../db/runtime.ts";
import flora from "../../data/tubives.json" with {type:"json"};
import {plants} from "../../plant-data.ts";
const validIds=new Set([...flora.records.map(r=>`flora-${r.id}`),...plants.map(p=>p.id)]);
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function handleVernacular(request:Request,db?:RawDB){
 const user=request.headers.get("oai-authenticated-user-id");if(!user)return response({error:"Oturum açmalısın."},401);
 const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"İstek geçersiz."},403);
 if(!db)return response({error:"Yöresel adlar yüklenemedi."},503);
 try{
  if(request.method==="GET"){const plantId=new URL(request.url).searchParams.get("plantId")||"";if(!validIds.has(plantId)&&!await db.prepare("SELECT id FROM species WHERE id=?").bind(plantId).first())return response({error:"Tür bulunamadı."},404);const names=await db.prepare("SELECT id,name,region,author,created_at,user_id FROM vernacular_names WHERE plant_id=? ORDER BY created_at DESC LIMIT 100").bind(plantId).all<{id:string;name:string;region:string;author:string;created_at:string;user_id:string}>();return response({names:names.results.map(({user_id,...row})=>({...row,owner:user_id===user}))});}
  const raw=await request.text();if(raw.length>4000)return response({error:"İstek çok uzun."},413);const b=JSON.parse(raw);
  if(b.action==="delete"){if(typeof b.id!=="string")return response({error:"Kayıt geçersiz."},400);await db.prepare("DELETE FROM vernacular_names WHERE id=? AND user_id=?").bind(b.id,user).run();return response({ok:true});}
  if(b.action!=="add"||typeof b.plantId!=="string"||typeof b.name!=="string"||!b.name.trim()||b.name.length>80||typeof b.region!=="string"||!b.region.trim()||b.region.length>100||/[<>\r\n]/.test(b.name+b.region))return response({error:"Yöresel ad ve kullanıldığı il / yöre gerekli."},400);
  if(!validIds.has(b.plantId)&&!await db.prepare("SELECT id FROM species WHERE id=?").bind(b.plantId).first())return response({error:"Tür bulunamadı."},404);
  const count=await db.prepare("SELECT count(*) AS n FROM vernacular_names WHERE plant_id=? AND user_id=?").bind(b.plantId,user).first<{n:number}>();if((count?.n||0)>=20)return response({error:"Bir türe en fazla 20 yöresel ad ekleyebilirsin."},400);
  const existing=await db.prepare("SELECT id FROM vernacular_names WHERE plant_id=? AND user_id=? AND name=? AND region=?").bind(b.plantId,user,b.name.trim(),b.region.trim()).first();if(existing)return response({ok:true});
  const profile=await db.prepare("SELECT display_name FROM profiles WHERE user_id=?").bind(user).first<{display_name:string}>();
  await db.prepare("INSERT INTO vernacular_names (id,user_id,plant_id,name,region,author,created_at) VALUES (?,?,?,?,?,?,?)").bind(crypto.randomUUID(),user,b.plantId,b.name.trim(),b.region.trim(),profile?.display_name||"Üye",new Date().toISOString()).run();return response({ok:true});
 }catch(e){console.error("vernacular request failed",e);return response({error:"Yöresel ad kaydedilemedi. Yeniden dene."},503);}
}
