import {createHash} from 'node:crypto';
import {readdir,readFile,writeFile} from 'node:fs/promises';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..');
const digest=createHash('sha256');
async function visit(folder){for(const file of (await readdir(folder,{withFileTypes:true})).sort((a,b)=>a.name.localeCompare(b.name))){const location=path.join(folder,file.name);if(file.isDirectory())await visit(location);else{digest.update(path.relative(root,location));digest.update(await readFile(location));}}}
await visit(path.join(root,'app'));await visit(path.join(root,'worker'));
for(const file of ['offline.html','offline-app.js','offline-app.css','manifest.webmanifest','favicon.svg','brand/orman-emblem.png'])digest.update(await readFile(path.join(root,'public',file)));
await visit(path.join(root,'public/icons'));
const location=path.join(root,'public/sw.js'),source=await readFile(location,'utf8');
digest.update(source.replace(/const VERSION = "[^"]+";/,'const VERSION = "BUILD";'));
const version=`orman-pwa-${digest.digest('hex').slice(0,12)}`;
await writeFile(location,source.replace(/const VERSION = "[^"]+";/,`const VERSION = "${version}";`));
