import test from 'node:test';
import assert from 'node:assert/strict';
import {setImmediate} from 'node:timers/promises';
import {createLifeCoverLoader} from '../app/life-covers.ts';
const image={url:'https://example.org/photo.jpg',credit:'Photographer',license:'https://creativecommons.org/licenses/by/4.0/',source:'https://www.gbif.org/occurrence/1'};

test('transient cover errors retry once and concurrent cards share the recovered image',async()=>{
 let calls=0;const delays=[];
 const load=createLifeCoverLoader({fetcher:async()=>{calls++;return calls===1?new Response('',{status:503}):Response.json({image});},wait:async ms=>{delays.push(ms);}});
 const first=load('gbif-33');assert.equal(load('gbif-33'),first);assert.deepEqual(await first,image);assert.deepEqual(await load('gbif-33'),image);
 assert.equal(calls,2);assert.deepEqual(delays,[250]);
});
test('unavailable covers stop after two attempts and cool down before another request',async()=>{
 let calls=0,time=0;const load=createLifeCoverLoader({fetcher:async()=>{calls++;throw new TypeError('Network unavailable');},wait:async()=>{},now:()=>time});
 assert.equal(await load('gbif-34'),null);assert.equal(calls,2);assert.equal(await load('gbif-34'),null);assert.equal(calls,2);
 time=30001;assert.equal(await load('gbif-34'),null);assert.equal(calls,4);
});
test('permission, rate-limit and missing-photo responses never trigger retry storms',async()=>{
 for(const status of [400,401,403,404,429]){
  let calls=0;const load=createLifeCoverLoader({fetcher:async()=>{calls++;return new Response('',{status});},wait:async()=>{assert.fail('non-transient response retried');}});
  assert.equal(await load('gbif-'+status),null);assert.equal(await load('gbif-'+status),null);assert.equal(calls,1);
 }
 let calls=0;const empty=createLifeCoverLoader({fetcher:async()=>{calls++;return Response.json({image:null});}});
 assert.equal(await empty('gbif-1'),null);assert.equal(await empty('gbif-1'),null);assert.equal(calls,1);
});
test('a fast-scrolling grid runs at most three simultaneous cover requests',async()=>{
 let active=0,maxActive=0,calls=0;const releases=[];
 const load=createLifeCoverLoader({fetcher:async()=>{active++;calls++;maxActive=Math.max(maxActive,active);return new Promise(resolve=>releases.push(()=>{active--;resolve(Response.json({image}));}));}});
 const results=Array.from({length:10},(_,i)=>load('gbif-'+(i+50)));assert.equal(calls,3);
 while(calls<10||releases.length){while(releases.length)releases.shift()();await setImmediate();}
 assert((await Promise.all(results)).every(value=>value.url===image.url));assert.equal(calls,10);assert.equal(maxActive,3);
});
