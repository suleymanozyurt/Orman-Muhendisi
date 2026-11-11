import {automaticLanguage} from "../../preferences.ts";
type DB={prepare:(sql:string)=>{bind:(...args:unknown[])=>{first:<T>()=>Promise<T|null>;run:()=>Promise<unknown>}}};
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function handlePreferences(request:Request,db:DB|undefined,country:string){
 const id=request.headers.get("oai-authenticated-user-id");if(!id)return response({error:"AUTH_REQUIRED"},401);if(!db)return response({error:"DATABASE_UNAVAILABLE"},503);
 try{
  if(request.method==="POST"){
   const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"INVALID_ORIGIN"},403);
   let data:{language?:unknown;theme?:unknown};try{data=await request.json();}catch{return response({error:"INVALID_INPUT"},400);}
   if(!["auto","tr","en"].includes(String(data.language))||!["system","light","dark"].includes(String(data.theme)))return response({error:"INVALID_PREFERENCE"},400);
   const name=(request.headers.get("oai-authenticated-user-email")||"Üye").split("@")[0];
   await db.prepare("INSERT INTO profiles (user_id,display_name,updated_at,language_choice,theme_choice) VALUES (?,?,?,?,?) ON CONFLICT(user_id) DO UPDATE SET language_choice=excluded.language_choice,theme_choice=excluded.theme_choice,updated_at=excluded.updated_at").bind(id,name,new Date().toISOString(),data.language,data.theme).run();
  }
  const profile=await db.prepare("SELECT language_choice,theme_choice FROM profiles WHERE user_id=?").bind(id).first<{language_choice?:string;theme_choice?:string}>();
  return response({language:["tr","en"].includes(profile?.language_choice||"")?profile?.language_choice:"auto",theme:["light","dark"].includes(profile?.theme_choice||"")?profile?.theme_choice:"system",automaticLanguage:automaticLanguage(country,request.headers.get("accept-language")||"tr"),country});
 }catch{return response({error:"PREFERENCES_UNAVAILABLE"},503);}
}
