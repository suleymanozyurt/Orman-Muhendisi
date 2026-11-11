import test, { after } from 'node:test';
import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleSourceArchive, archiveActor } from '../app/api/source-archive/handler.ts';

const secret='a'.repeat(64), partSize=8*1024*1024;
const descriptor=Object.getOwnPropertyDescriptor(crypto,'DigestStream');
class DigestStream extends WritableStream {
 constructor(algorithm){
  assert.equal(algorithm,'SHA-256');
  const hash=createHash('sha256');let resolve;
  const digest=new Promise(done=>{resolve=done;});
  super({write(bytes){hash.update(bytes);},close(){resolve(Uint8Array.from(hash.digest()).buffer);}});
  this.digest=digest;
 }
}
Object.defineProperty(crypto,'DigestStream',{value:DigestStream,configurable:true,writable:true});
after(()=>{if(descriptor)Object.defineProperty(crypto,'DigestStream',descriptor);else delete crypto.DigestStream;});
const original=new Uint8Array(33*1024*1024+16).fill(7);
original.set([0,0,0,20,102,116,121,112,109,112,52,50],0);
const digest=createHash('sha256').update(original).digest('hex').slice(0,32);
const key=digest.slice(0,8)+'-'+digest.slice(8,12)+'-'+digest.slice(12,16)+'-'+digest.slice(16,20)+'-'+digest.slice(20)+'.mp4';

function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(file=>file.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 function statement(sql,args=[]){return {bind(...values){return statement(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}};}
 const db={prepare:statement};
 const objects=new Map(),uploads=new Map();let uploadedParts=0,completed=0;
 const bucket={
  async put(){throw new Error('Multipart fixture does not use direct uploads');},
  async head(key){const object=objects.get(key);return object?{size:object.size}:null;},
  async get(key){const object=objects.get(key);return object?{body:object.stream()}:null;},
  async createMultipartUpload(key){const id=crypto.randomUUID();uploads.set(id,{key,parts:new Map()});return this.resumeMultipartUpload(key,id);},
  resumeMultipartUpload(key,id){return {uploadId:id,
   async uploadPart(number,bytes){const upload=uploads.get(id);assert.equal(upload.key,key);uploadedParts++;const etag=createHash('sha256').update(new Uint8Array(bytes)).digest('hex');upload.parts.set(number,{bytes,etag});return {partNumber:number,etag};},
   async complete(parts){const upload=uploads.get(id);assert.equal(upload.key,key);completed++;objects.set(key,new Blob(parts.map(part=>{const stored=upload.parts.get(part.partNumber);assert.equal(stored.etag,part.etag);return stored.bytes;})));uploads.delete(id);},
   async abort(){uploads.delete(id);}
  };}
 };
 const runtime={db,bucket,key:secret};
 function request(body,query='',type='application/json'){return new Request('https://example.org/api/source-archive'+query,{method:'POST',headers:{'x-source-archive-key':secret,'content-type':type},body:body instanceof Uint8Array?body:JSON.stringify(body)});}
 const post=(body)=>handleSourceArchive(request(body),runtime);
 const part=(number,bytes=original.slice((number-1)*partSize,Math.min(number*partSize,original.length)),type='video/mp4')=>handleSourceArchive(request(bytes,'?part='+key+'&number='+number,type),runtime);
 return {sqlite,runtime,post,part,objects,async start(){return post({action:'startMedia',key,size:original.length,type:'video/mp4'});},get uploadedParts(){return uploadedParts;},get completed(){return completed;},close(){sqlite.close();objects.clear();uploads.clear();}};
}
test('large-video restoration rejects wrong sizes, types and other owners; incomplete uploads remain private',async()=>{
 const f=fixture();try{
  assert.equal((await f.post({action:'startMedia',key,size:8*1024*1024,type:'video/mp4'})).status,400);
  assert.equal((await f.post({action:'startMedia',key,size:original.length,type:'video/webm'})).status,400);
  assert.equal((await f.start()).status,200);
  assert.equal((await f.post({action:'startMedia',key,size:original.length+1,type:'video/mp4'})).status,409);
  assert.equal((await f.post({action:'completeMedia',key})).status,409);
  assert.equal(f.completed,0);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM uploads').get().count,0);
  f.sqlite.prepare('INSERT INTO uploads(key,user_id,created_at) VALUES(?,?,?)').run(key,'another-owner',new Date().toISOString());
  assert.equal((await f.start()).status,409);
 }finally{f.close();}
});
test('interrupted multipart transfers resume; duplicate parts are idempotent and malformed parts never reach storage',async()=>{
 const f=fixture();try{
  await f.start();
  assert.equal((await f.part(0,new Uint8Array())).status,400);
  assert.equal((await f.part(1,new Uint8Array(3))).status,400);
  assert.equal((await f.part(1,original.slice(0,partSize),'video/webm')).status,415);
  assert.equal((await f.part(1,new Uint8Array(partSize))).status,415);
  assert.equal(f.uploadedParts,0);
  assert.equal((await f.part(1)).status,200);
  assert.deepEqual(await (await f.start()).json(),{parts:[1]});
  assert.equal((await f.part(1)).status,200);
  assert.equal(f.uploadedParts,1);
  const changed=original.slice(0,partSize);changed[40]^=1;
  assert.equal((await f.part(1,changed)).status,409);
  assert.equal(f.uploadedParts,1);
  assert.equal((await f.post({action:'completeMedia',key})).status,409);
 }finally{f.close();}
});
test('completed videos are verified against the full source checksum before ownership is registered; retries do not duplicate storage',async()=>{
 const f=fixture();try{
  await f.start();
  for(const number of [3,1,5,4,2])assert.equal((await f.part(number)).status,200);
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM uploads').get().count,0);
  const result=await f.post({action:'completeMedia',key});assert.equal(result.status,200);
  assert.equal((await result.json()).complete,true);
  assert.equal(f.objects.get(key).size,original.length);
  assert.equal(f.sqlite.prepare('SELECT user_id FROM uploads WHERE key=?').get(key).user_id,archiveActor);
  assert.equal(f.sqlite.prepare("SELECT count(*) AS count FROM site_settings WHERE key LIKE 'source-archive:media:%'").get().count,0);
  assert.equal((await f.post({action:'completeMedia',key})).status,200);
  assert.equal(f.completed,1);assert.equal(f.uploadedParts,5);
 }finally{f.close();}
});
test('a valid-looking video with altered content is rejected and never registered for publication',async()=>{
 const f=fixture();try{
  await f.start();
  for(let number=1;number<=5;number++){const bytes=original.slice((number-1)*partSize,Math.min(number*partSize,original.length));if(number===2)bytes[10]^=1;assert.equal((await f.part(number,bytes)).status,200);}
  const result=await f.post({action:'completeMedia',key});
  assert.equal(result.status,400);assert.equal((await result.json()).error,'MEDIA_CHECKSUM_MISMATCH');
  assert.equal(f.sqlite.prepare('SELECT count(*) AS count FROM uploads').get().count,0);
 }finally{f.close();}
});
