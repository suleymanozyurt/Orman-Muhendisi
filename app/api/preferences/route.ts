import {handlePreferences} from "./handler";
export const dynamic="force-dynamic";
async function handle(request:Request){let db;try{db=(await import("cloudflare:workers")).env.DB;}catch{}const country=String((request as Request&{cf?:{country?:string}}).cf?.country||request.headers.get("cf-ipcountry")||"").toUpperCase();return handlePreferences(request,db as Parameters<typeof handlePreferences>[1],/^[A-Z]{2}$/.test(country)?country:"");}
export const GET=handle;export const POST=handle;
