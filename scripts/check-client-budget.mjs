import {readFile} from 'node:fs/promises';
import {gzipSync} from 'node:zlib';
import ts from 'typescript';
import worker from '../dist/server/index.js';

const response=await worker.fetch(new Request('http://localhost/',{headers:{accept:'text/html'}}),{
  ASSETS:{fetch:async()=>new Response('Not found',{status:404})},
},{waitUntil(){},passThroughOnException(){}});
if(response.status!==200)throw new Error('The initial app shell did not render.');
const html=await response.text();
const entries=[...html.matchAll(/(?:src|href)="(\/assets\/[^"?]+\.js)"/g)].map(match=>match[1]);
if(!entries.length)throw new Error('No initial client script references were found.');
const seen=new Set();let bytes=0;
async function visit(url){
  if(seen.has(url))return;seen.add(url);
  if(!url.startsWith('/assets/')||!url.endsWith('.js'))throw new Error('Unexpected client script path.');
  const file=new URL(`../dist/client${url}`,import.meta.url),source=await readFile(file,'utf8');
  bytes+=gzipSync(source).length;
  const ast=ts.createSourceFile(url,source,ts.ScriptTarget.Latest,false,ts.ScriptKind.JS);
  for(const statement of ast.statements){
    // Dynamic imports are intentionally excluded: only initial static dependencies count.
    if((ts.isImportDeclaration(statement)||ts.isExportDeclaration(statement))&&statement.moduleSpecifier&&ts.isStringLiteral(statement.moduleSpecifier)){
      const dependency=statement.moduleSpecifier.text;
      if(dependency.startsWith('.'))await visit(new URL(dependency,`http://localhost${url}`).pathname);
    }
  }
}
for(const entry of entries)await visit(entry);
const limit=200*1024;
console.log(JSON.stringify({homeStatus:response.status,initialStaticModules:seen.size,gzipKiB:Number((bytes/1024).toFixed(1)),budgetKiB:limit/1024}));
if(bytes>limit)throw new Error('The initial JavaScript budget was exceeded.');
