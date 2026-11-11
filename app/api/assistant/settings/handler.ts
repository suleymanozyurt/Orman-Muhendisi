type DB={prepare:(sql:string)=>{bind:(...values:unknown[])=>{first:<T>()=>Promise<T|null>;run:()=>Promise<unknown>}};batch:(statements:unknown[])=>Promise<unknown>};
const response=(body:unknown,status=200)=>Response.json(body,{status,headers:{"Cache-Control":"no-store"}});
export async function handleSettings(request:Request,db:DB|undefined){
 if(!request.headers.get("oai-authenticated-user-id"))return response({error:"AUTH_REQUIRED"},401);
 if(request.headers.get("oai-authenticated-user-email")?.toLowerCase()!=="suleymanozyurt49@gmail.com")return response({error:"ADMIN_REQUIRED"},403);
 if(!db)return response({error:"DATABASE_UNAVAILABLE"},503);
 try{
  if(request.method==="POST"){
   const origin=request.headers.get("origin");if(origin&&origin!==new URL(request.url).origin)return response({error:"INVALID_ORIGIN"},403);
   let data:{provider?:unknown;key?:unknown;remove?:unknown};try{const raw=await request.text();if(raw.length>2000)return response({error:"INVALID_INPUT"},413);data=JSON.parse(raw);}catch{return response({error:"INVALID_INPUT"},400);}
   if(!["gemini","openai","plantnet"].includes(String(data.provider)))return response({error:"INVALID_PROVIDER"},400);
   const key=typeof data.key==="string"?data.key.trim():"";if(data.remove!==true&&(!key||key.length>256||!/[a-zA-Z0-9]/.test(key)||/\s/.test(key)))return response({error:"INVALID_KEY"},400);
   const name=`assistant_${data.provider}_key`;
   if(data.remove===true)await db.prepare("DELETE FROM site_settings WHERE key=?").bind(name).run();else await db.prepare("INSERT INTO site_settings(key,value,updated_at) VALUES(?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value,updated_at=excluded.updated_at").bind(name,key,new Date().toISOString()).run();
  }
  const gemini=await db.prepare("SELECT value FROM site_settings WHERE key=?").bind("assistant_gemini_key").first<{value:string}>(),openai=await db.prepare("SELECT value FROM site_settings WHERE key=?").bind("assistant_openai_key").first<{value:string}>();
  const plantnet=await db.prepare("SELECT value FROM site_settings WHERE key=?").bind("assistant_plantnet_key").first<{value:string}>();
  return response({geminiConfigured:Boolean(gemini?.value),openaiConfigured:Boolean(openai?.value),plantnetConfigured:Boolean(plantnet?.value)});
 }catch{return response({error:"ASSISTANT_SETTINGS_UNAVAILABLE"},503);}
}
