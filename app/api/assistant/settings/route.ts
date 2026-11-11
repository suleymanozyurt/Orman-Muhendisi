import {handleSettings} from "./handler";
export const dynamic="force-dynamic";
async function handle(request:Request){let db;try{db=(await import("cloudflare:workers")).env.DB;}catch{}return handleSettings(request,db as Parameters<typeof handleSettings>[1]);}
export const GET=handle;export const POST=handle;
