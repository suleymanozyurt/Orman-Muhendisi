import test from 'node:test';
import assert from 'node:assert/strict';
import {ResolvedSourceCache} from '../app/resolved-source-cache.ts';
import {catalogPageKey,readCatalogPage,rememberCatalogPage} from '../app/source-catalog-cache.ts';
import {sourceCatalogParams,emptySourceCatalog} from '../app/source-catalog-query.ts';
import {handleCatalogs} from '../app/api/catalogs/handler.ts';

test('completed cache values cannot share pending work or caller mutations',()=>{
 const cache=new ResolvedSourceCache(4096,4);
 cache.set('pending',Promise.resolve({rows:[1]}),1000);assert.equal(cache.get('pending'),undefined);
 const value={rows:[1,2]};cache.set('done',value,1000);value.rows.push(3);
 const restored=cache.get('done');assert.deepEqual(restored,{rows:[1,2]});restored.rows.push(4);
 assert.deepEqual(cache.get('done'),{rows:[1,2]});
});
test('expiry and LRU eviction bound source cache memory, including non-ASCII data',()=>{
 let time=100;const cache=new ResolvedSourceCache(800,2,()=>time);
 cache.set('a',{name:'Türkiye'},50);cache.set('b',{name:'Cedrus'},100);assert(cache.get('a'));
 cache.set('c',{name:'Pinus'},100);assert.equal(cache.get('b'),undefined);assert(cache.get('a'));
 time=150;assert.equal(cache.get('a'),undefined);assert(cache.get('c'));
 cache.set('large',{name:'🌿'.repeat(300)},100);assert.equal(cache.get('large'),undefined);assert(cache.get('c'));
 const bytes=new ResolvedSourceCache(320,10,()=>time);
 bytes.set('a','🌿'.repeat(15),100);bytes.set('b','🌿'.repeat(15),100);
 assert.equal(bytes.get('a'),undefined);assert.equal(bytes.get('b'),'🌿'.repeat(15));
});
test('restored catalogue pages retain source, filters, pagination, language and retrieval date',()=>{
 const query={...emptySourceCatalog,source:'plantnet',q:'Quercus',family:'Fagaceae',page:2};
 const key=catalogPageKey(sourceCatalogParams(query).toString(),'tr');
 const page={source:'plantnet',mode:'species',records:[{id:'Quercus robur',name:'Quercus robur',commonName:'Saplı meşe',rank:'species',source:'https://identify.plantnet.org/'}],total:50,page:2,hasMore:true,retrievedAt:'2026-10-06T15:00:00Z',sourceUrl:'https://identify.plantnet.org/'};
 rememberCatalogPage(key,page);assert.deepEqual(readCatalogPage(key).page,page);assert(readCatalogPage(key).freshUntil>Date.now());
 for(const [change,language] of [[{source:'inaturalist'},'tr'],[{page:1},'tr'],[{family:'Pinaceae'},'tr'],[{},'en']]){
  const other=catalogPageKey(sourceCatalogParams({...query,...change}).toString(),language);assert.equal(readCatalogPage(other),undefined);
 }
});
test('concurrent server requests own their fetches; subsequent requests reuse completed data',async()=>{
 const original=globalThis.fetch;const releases=[];let calls=0;
 globalThis.fetch=async()=>{calls++;return new Promise(resolve=>releases.push(()=>resolve(Response.json([{name:'Quercus robur'}],{headers:{'full-count':'1'}}))));};
 const request=()=>new Request('https://site.local/api/catalogs?source=plantnet&q=cache-isolation-check');
 try{
  const first=handleCatalogs(request()),second=handleCatalogs(request());assert.equal(calls,2);
  releases.shift()();assert.equal((await first).status,200);
  const third=await handleCatalogs(request());assert.equal(third.status,200);assert.equal(calls,2);assert.equal((await third.json()).records[0].name,'Quercus robur');
  releases.shift()();assert.equal((await second).status,200);
 }finally{globalThis.fetch=original;}
});
test('failed upstream reads are never cached as empty catalogue pages',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return calls===1?new Response('',{status:503}):Response.json([{name:'Fagus sylvatica'}],{headers:{'full-count':'1'}});};
 const request=()=>new Request('https://site.local/api/catalogs?source=plantnet&q=cache-recovery-check');
 try{assert.equal((await handleCatalogs(request())).status,503);const recovered=await handleCatalogs(request());assert.equal(recovered.status,200);assert.equal((await recovered.json()).total,1);assert.equal(calls,2);}
 finally{globalThis.fetch=original;}
});
