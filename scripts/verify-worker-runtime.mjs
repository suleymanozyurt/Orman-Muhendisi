// Run from the repository root after the production build.
// Uses Wrangler's pinned Miniflare dependency; never connects to hosted storage.
import assert from "node:assert/strict";
import {createRequire} from "node:module";
import {resolve} from "node:path";

const require=createRequire(resolve("package.json"));
const wranglerRequire=createRequire(require.resolve("wrangler/package.json"));
const {Miniflare}=wranglerRequire("miniflare");
const mf=new Miniflare({
 scriptPath:resolve("dist/server/index.js"),
 modules:true,
 modulesRoot:resolve("dist/server"),
 modulesRules:[{type:"ESModule",include:["**/*.js"]}],
 compatibilityDate:"2026-05-15",
 compatibilityFlags:["nodejs_compat"],
 d1Databases:["DB"],
 r2Buckets:["BUCKET"],
 serviceBindings:{ASSETS:()=>new Response("Not found",{status:404})}
});
try{
 for(const view of ["home","discover","create","map","database"]){
  const started=Date.now();
  const response=await mf.dispatchFetch("http://localhost/?view="+view,{headers:{accept:"text/html","cf-ipcountry":"TR","accept-language":"tr-TR"}});
  const html=await response.text();
  assert.equal(response.status,200,view+" HTTP status");
  assert(html.includes("Orman Mühendisi"),view+" application document");
  if(view==="home")assert(html.includes("Ormanın bilgisi"),"new home page is present");
  console.log(JSON.stringify({view,status:response.status,htmlBytes:html.length,durationMs:Date.now()-started}));
 }
}finally{await mf.dispose();}
