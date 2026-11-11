import { lensLiveSetup, lensLiveTime } from "../../lens-live-protocol.ts";

const json=(data:unknown,status=200)=>Response.json(data,{status,headers:{"Cache-Control":"no-store"}});
export async function handleLensLive(request:Request,runtime:{geminiKey?:string;fetcher?:typeof fetch;now?:number}={}){
  if(request.method!=="POST")return json({error:"METHOD_NOT_ALLOWED"},405);
  if(!request.headers.get("oai-authenticated-user-id"))return json({error:"AUTH_REQUIRED"},401);
  if(request.headers.get("origin")!==new URL(request.url).origin)return json({error:"INVALID_ORIGIN"},403);
  if(!runtime.geminiKey)return json({error:"LIVE_NOT_CONFIGURED"},503);
  const language=new URL(request.url).searchParams.get("language")==="en"?"en":"tr";
  const now=runtime.now??Date.now(),setup=lensLiveSetup(language);
  try {
    const result=await (runtime.fetcher||fetch)("https://generativelanguage.googleapis.com/v1alpha/auth_tokens",{
      method:"POST",headers:{"Content-Type":"application/json","x-goog-api-key":runtime.geminiKey},
      body:JSON.stringify({uses:1,newSessionExpireTime:new Date(now+45_000).toISOString(),expireTime:new Date(now+lensLiveTime+30_000).toISOString(),bidiGenerateContentSetup:setup}),
      signal:AbortSignal.any([request.signal,AbortSignal.timeout(10_000)])
    });
    if(!result.ok)return json({error:result.status===429?"RATE_LIMITED":"LIVE_UNAVAILABLE"},result.status===429?429:502);
    const {name}=await result.json() as {name?:string};
    if(typeof name!=="string"||!/^auth_tokens\/[a-zA-Z0-9._~+/=-]{8,2048}$/.test(name))return json({error:"LIVE_UNAVAILABLE"},502);
    return json({token:name,setup});
  }catch{return json({error:"LIVE_UNAVAILABLE"},502);}
}
