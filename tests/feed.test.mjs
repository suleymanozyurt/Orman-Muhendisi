import test from 'node:test';
import assert from 'node:assert/strict';
import { build } from 'esbuild';
const bundled=await build({entryPoints:['app/api/feed/route.ts'],bundle:true,platform:'node',format:'esm',write:false});
const {GET}=await import('data:text/javascript;base64,'+Buffer.from(bundled.outputFiles[0].text).toString('base64'));
const photo=(license='https://creativecommons.org/licenses/by/4.0/')=>({type:'StillImage',identifier:'https://images.example/leaf.jpg',creator:'Real photographer',license});
const row=(key,license)=>({key,species:'Cedrus libani',kingdom:'Plantae',recordedBy:'Observer',family:'Pinaceae',media:[photo(license)]});
test('invalid pagination and saved ids cannot query the upstream service',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>{throw new Error('must not fetch');};
 try{for(const query of ['offset=-1','offset=NaN','offset=1.5','offset=100000','scope=ZZ','ids=abc','ids=1%2Chttps%3A%2F%2Fevil.example'])assert.equal((await GET(new Request('https://test.local/api/feed?'+query))).status,400);}finally{globalThis.fetch=original;}
});
test('the cursor advances across skipped licences without repeating a batch',async()=>{
 const original=globalThis.fetch;let seen;
 globalThis.fetch=async url=>{seen=new URL(String(url));return Response.json({results:[row(1),row(2,'https://creativecommons.org/licenses/by-nc/4.0/'),row(3,'All rights reserved')],endOfRecords:false});};
 try{const data=await(await GET(new Request('https://test.local/api/feed?scope=TR&offset=24'))).json();assert.equal(data.nextOffset,27);assert.equal(data.hasMore,true);assert.equal(data.records.length,1);assert.equal(data.records[0].id,'gbif:1');assert.equal(data.records[0].photos[0].credit,'Real photographer');assert.equal(seen.searchParams.get('kingdomKey'),'6');assert.equal(seen.searchParams.get('offset'),'24');assert.equal(seen.searchParams.get('country'),'TR');}finally{globalThis.fetch=original;}
});
test('saved records retain stable ids and exclude non-plants',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async url=>Response.json(String(url).endsWith('/2')?{...row(2),kingdom:'Animalia'}:row(1));
 try{const data=await(await GET(new Request('https://test.local/api/feed?ids=1,1,2'))).json();assert.deepEqual(data.records.map(r=>r.id),['gbif:1']);}finally{globalThis.fetch=original;}
});
test('end of data and an unavailable service have different states, with an exact-scope limited archive',async()=>{
 const original=globalThis.fetch;
 try{globalThis.fetch=async()=>Response.json({results:[],endOfRecords:true});const data=await(await GET(new Request('https://test.local/api/feed'))).json();assert.equal(data.hasMore,false);assert.equal(data.cached,undefined);globalThis.fetch=async()=>new Response('Unavailable',{status:503});const fallback=await(await GET(new Request('https://test.local/api/feed'))).json();assert.equal(fallback.cached,true);assert.equal(fallback.hasMore,false);assert(fallback.records.length>0);assert.equal((await GET(new Request('https://test.local/api/feed?offset=48'))).status,502);assert.equal((await GET(new Request('https://test.local/api/feed?scope=world'))).status,502);}finally{globalThis.fetch=original;}
});
test('leaving the feed cancels the waiting upstream request', {timeout:1000}, async()=>{
 const original=globalThis.fetch;const controller=new AbortController();
 let notifyFetch;const started=new Promise(resolve=>{notifyFetch=resolve;});
 globalThis.fetch=async(_url,{signal})=>new Promise((_,reject)=>{
  signal.addEventListener('abort',()=>reject(signal.reason),{once:true});notifyFetch();
 });
 try{
  const request=GET(new Request('https://test.local/api/feed?scope=world',{signal:controller.signal}));
  await started;controller.abort();assert.equal((await request).status,502);
 }finally{globalThis.fetch=original;}
});
