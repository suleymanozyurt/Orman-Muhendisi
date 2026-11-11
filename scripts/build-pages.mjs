import {build} from "vite";
import react from "@vitejs/plugin-react";
import {readFile,writeFile,mkdir,cp,readdir} from "node:fs/promises";
import {createHash} from "node:crypto";
import path from "node:path";
const root=path.resolve(import.meta.dirname,".."),out=process.env.PAGES_OUT?path.resolve(process.env.PAGES_OUT):path.join(root,"_pages");
const base=process.env.PAGES_BASE_PATH||"/Orman-Muhendisi-Site/";
// "./" builds a copy that works from any folder, for hosts that do not serve the site at a fixed path.
if(base!=="./"&&!/^\/(?:[A-Za-z0-9_.-]+\/)*$/.test(base))throw new Error("Invalid Pages base path");
const layout=await readFile(path.join(root,"app/layout.tsx"),"utf8");
const imports=[...layout.matchAll(/import ["']\.\/([^"']+\.css)["']/g)].map(m=>`@import "../app/${m[1]}";`).join("\n");
await writeFile(path.join(root,"preview/styles.generated.css"),imports+'\n.preview-status{position:relative;z-index:1000;display:flex;gap:16px;justify-content:space-between;padding:8px 20px;background:#eef5ef;color:#24442b;font:12px/1.5 system-ui}.preview-status a{white-space:nowrap;text-decoration:underline}@media(max-width:600px){.preview-status{font-size:10px;padding:6px 10px;gap:8px}}\n');
await build({configFile:false,root:path.join(root,"preview"),base,publicDir:path.join(root,"public"),
  plugins:[{name:"preview-paths",enforce:"pre",resolveId(id,importer){if(importer?.includes('/app/')&&id==='./pwa-runtime')return path.join(root,'preview/no-service-worker.tsx');},transform(code,id){if(!id.includes(root+"/app/")||!/[.](tsx?|css|json)$/.test(id))return;return code.replace(/(["'`(]|, )\/(brand\/|responsive\/|species\/|life\/|icons\/|leaflet\/|fonts\/|canopy-upward\.jpg|favicon\.svg)/g,(_m,quote,asset)=>quote+base+asset);}},react()],
  define:{"process.env.NODE_ENV":'"production"'},
  build:{outDir:out,emptyOutDir:true,target:"es2022",chunkSizeWarningLimit:10000}});
const folder=path.join(root,"data/taxonomy-import/MSL41.v1"),manifest=JSON.parse(await readFile(path.join(folder,"manifest.json"),"utf8"));
const nodes=[];
for(const file of (await readdir(folder)).filter(f=>/^\d{5}\.json$/.test(f)).sort()){
  const raw=await readFile(path.join(folder,file));
  const expected=manifest.chunks.find(c=>c.index===Number(file.slice(0,5)));
  if(!expected||createHash("sha256").update(raw).digest("hex")!==expected.sha256)throw new Error("Invalid ICTV chunk: "+file);
  nodes.push(...JSON.parse(raw).nodes);
}
const ids=new Set(nodes.map(n=>n.id));
if(nodes.length!==manifest.meta.total||ids.size!==nodes.length||nodes.some(n=>n.parentId&&!ids.has(n.parentId)))throw new Error("ICTV integrity failed");
await mkdir(path.join(out,"preview-data"),{recursive:true});
await writeFile(path.join(out,"preview-data/ictv.json"),JSON.stringify(nodes));
await writeFile(path.join(out,".nojekyll"),"");
await cp(path.join(out,"index.html"),path.join(out,"404.html"));
await writeFile(path.join(out,"robots.txt"),"User-agent: *\nDisallow: /\n");
// The Lens flow needs a signed-in server; its sample-data preview ships beside the site so the camera can be tried.
const {execFileSync}=await import("node:child_process");
execFileSync(process.execPath,[path.join(root,"scripts/build-lens-preview.mjs"),"--document",path.join(out,"lens-onizleme/index.html")],{stdio:"inherit"});
console.log(JSON.stringify({output:out,base,ictvNodes:nodes.length}));
