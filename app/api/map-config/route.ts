export const dynamic = "force-dynamic";
type DB = { prepare:(sql:string)=>{bind:(...v:unknown[])=>{first:<T>()=>Promise<T|null>;run:()=>Promise<unknown>};first:<T>()=>Promise<T|null>} };
async function runtime(){return (await import("cloudflare:workers")).env as unknown as {DB?:DB;GOOGLE_MAPS_BROWSER_KEY?:string};}
export async function GET(){
  try{const env=await runtime();const row=env.DB ? await env.DB.prepare("SELECT value FROM site_settings WHERE key = ?").bind("google_maps_browser_key").first<{value:string}>() : null;return Response.json({key:row?.value || env.GOOGLE_MAPS_BROWSER_KEY || null},{headers:{"Cache-Control":"no-store"}});}
  catch{return Response.json({key:null},{headers:{"Cache-Control":"no-store"}});}
}
export async function POST(request:Request){
  if(!request.headers.get("oai-authenticated-user-id"))return Response.json({error:"AUTH_REQUIRED"},{status:401});
  if(request.headers.get("oai-authenticated-user-email")?.toLowerCase() !== "suleymanozyurt49@gmail.com")return Response.json({error:"OWNER_REQUIRED"},{status:403});
  const origin=request.headers.get("origin");if(origin && origin !== new URL(request.url).origin)return Response.json({error:"INVALID_ORIGIN"},{status:403});
  let key:string;try{const body=await request.json() as {key?:unknown};if(typeof body.key !== "string")throw new Error();key=body.key.trim();if(key && !/^AIza[A-Za-z0-9_-]{35}$/.test(key))return Response.json({error:"INVALID_KEY"},{status:400});}catch{return Response.json({error:"INVALID_INPUT"},{status:400});}
  try{const env=await runtime();if(!env.DB)throw new Error();await env.DB.prepare("INSERT INTO site_settings (key,value,updated_at) VALUES (?,?,?) ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=excluded.updated_at").bind("google_maps_browser_key",key,new Date().toISOString()).run();return Response.json({ok:true});}catch{return Response.json({error:"SAVE_FAILED"},{status:503});}
}
