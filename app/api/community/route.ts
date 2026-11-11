import {handleCommunity} from "./handler";
export const dynamic="force-dynamic";
async function database(){try{return (await import("cloudflare:workers")).env.DB;}catch{return undefined;}}
export async function GET(request:Request){return handleCommunity(request,await database() as Parameters<typeof handleCommunity>[1]);}
export async function POST(request:Request){return handleCommunity(request,await database() as Parameters<typeof handleCommunity>[1]);}
