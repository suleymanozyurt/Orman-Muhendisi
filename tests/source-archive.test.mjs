import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import { handleSourceArchive, archiveActor } from '../app/api/source-archive/handler.ts';
import { handleSocial } from '../app/api/social/handler.ts';
import { handleVideo, byteRange } from '../app/api/video/[key]/handler.ts';
import { isSocialMediaKey, socialMediaPath } from '../app/social-media-key.ts';
import { parseSocialArchive } from '../app/social-archive-model.ts';

const sqlite = new DatabaseSync(':memory:');
for (const file of readdirSync(new URL('../drizzle/', import.meta.url)).filter(file => file.endsWith('.sql')).sort()) sqlite.exec(readFileSync(new URL('../drizzle/' + file, import.meta.url), 'utf8'));
function statement(sql, args = []) { return {sql,args,bind(...values){return statement(sql,values);},async first(){return sqlite.prepare(sql).get(...args)||null;},async all(){return {results:sqlite.prepare(sql).all(...args)};},async run(){return sqlite.prepare(sql).run(...args);}}; }
const db={prepare:statement,async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>sqlite.prepare(s.sql).run(...s.args));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const secret='a'.repeat(64), stored=new Map();
const bucket={async put(key,bytes,options){stored.set(key,{bytes,httpMetadata:options.httpMetadata});},async head(key){const file=stored.get(key);return file?{size:file.bytes.byteLength,httpMetadata:file.httpMetadata}:null;},async get(key,options){const file=stored.get(key);if(!file)return null;const bytes=new Uint8Array(file.bytes), body=options?bytes.slice(options.range.offset,options.range.offset+options.range.length):bytes;return {size:bytes.length,body:new Blob([body]).stream(),httpMetadata:file.httpMetadata};}};
const runtime={key:secret,db,bucket};
function source(body,options={}) {return new Request('https://example.org/api/source-archive'+(options.query||''),{method:body?'POST':'GET',headers:{'x-source-archive-key':options.key??secret,'Content-Type':options.type||'application/json',...(options.origin?{origin:options.origin}:{})},...(body?{body:typeof body==='string'||body instanceof Uint8Array?body:JSON.stringify(body)}:{})});}
async function mediaKey(bytes,suffix){const hash=Array.from(new Uint8Array(await crypto.subtle.digest('SHA-256',bytes)),v=>v.toString(16).padStart(2,'0')).join('').slice(0,32);return `${hash.slice(0,8)}-${hash.slice(8,12)}-${hash.slice(12,16)}-${hash.slice(16,20)}-${hash.slice(20)}.${suffix}`;}
const image=new Uint8Array([82,73,70,70,1,2,3,4,87,69,66,80,4,5]);
const video=new Uint8Array([0,0,0,20,102,116,121,112,109,112,52,50,8,9,10,11]);
let restored;
test('temporary source restoration cannot impersonate a visitor and is unavailable without its server secret',async()=>{
 assert.equal((await handleSourceArchive(source(null,{key:''}),runtime)).status,404);
 assert.equal((await handleSourceArchive(source(null),{db,bucket})).status,404);
 assert.equal((await handleSourceArchive(source({}, {origin:'https://evil.example'}),runtime)).status,403);
 assert.equal((await handleSourceArchive(source('null'),runtime)).status,400);
 assert.equal((await handleSourceArchive(source({posts:[]}),runtime)).status,400);
 assert.equal((await handleSourceArchive(source(null),runtime)).status,200);
});
test('original export photos and videos use checksummed object keys and source ownership, not a fabricated user',async()=>{
 for(const [bytes,type,suffix] of [[image,'image/webp','webp'],[video,'video/mp4','mp4']]){
  const key=await mediaKey(bytes,suffix), req=source(bytes,{query:'?media='+key,type});
  assert.equal((await handleSourceArchive(req,runtime)).status,200);
  assert.equal(sqlite.prepare('SELECT user_id FROM uploads WHERE key=?').get(key).user_id,archiveActor);
  assert.equal((await handleSourceArchive(source(bytes,{query:'?media='+key,type}),runtime)).status,200);
 }
 const key=await mediaKey(image,'webp');
 assert.equal((await handleSourceArchive(source(image,{query:'?media='+crypto.randomUUID()+'.webp',type:'image/webp'}),runtime)).status,400);
 assert.equal((await handleSourceArchive(source(video,{query:'?media='+key,type:'image/webp'}),runtime)).status,415);
 assert.equal(isSocialMediaKey('-'.repeat(36)+'.mp4'),false);assert.equal(socialMediaPath(await mediaKey(video,'mp4')).startsWith('/api/video/'),true);
});
test('restored records stay drafts, repeat imports preserve edits, and admins can publish only the attached source media',async()=>{
 const key=await mediaKey(video,'mp4'), preview=await mediaKey(image,'webp');
 restored=(await parseSocialArchive([{platform:'facebook',title:'Özgün video',text:'Export caption',publishedAt:'2022-10-01T07:29:30.000Z',sourceUrl:'https://www.facebook.com/0rmanmuhendisi',id:'first',media:[{uri:'posts/media/videos/one.mp4'}]}],'facebook')).posts[0];
 restored.media=[{type:'video',uploadedKey:key,previewKey:preview,path:'posts/media/videos/one.mp4',alt:'',width:640,height:360,previewWidth:640}];
 assert.deepEqual(await (await handleSourceArchive(source({posts:[{...restored,status:'published'}]}),runtime)).json(),{imported:1,skipped:0});
 assert.equal(sqlite.prepare('SELECT status FROM resources WHERE id=?').get(restored.id).status,'draft');
 const userRequest=post=>new Request('https://example.org/api/social',{method:'POST',headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'suleymanozyurt49@gmail.com','Content-Type':'application/json'},body:JSON.stringify({action:'save',post})});
 assert.equal((await handleSocial(userRequest({...restored,status:'published',title:'Edited caption'}),db)).status,200);
 assert.deepEqual(await (await handleSourceArchive(source({posts:[restored]}),runtime)).json(),{imported:0,skipped:1});
 assert.equal(sqlite.prepare('SELECT title FROM resources WHERE id=?').get(restored.id).title,'Edited caption');
 const other={...restored,id:crypto.randomUUID(),revision:0};
 assert.equal((await handleSocial(userRequest(other),db)).status,403);
 const publicRows=await (await handleSocial(new Request('https://example.org/api/social?kind=video'),db)).json();
 assert.equal(publicRows.total,1);assert.equal(publicRows.records[0].media[0].path,undefined);assert.equal(publicRows.records[0].archive.exportedAt,'2022-10-06');
});
test('video playback supports seeking, suffix ranges and metadata without exposing a private draft',async()=>{
 const key=await mediaKey(video,'mp4');
 for(const [value,result] of [['bytes=0-3',{offset:0,length:4}],['bytes=-4',{offset:12,length:4}],['bytes=5-',{offset:5,length:11}],['bytes=100-',false],['bytes=3-1',false],['bytes=-0',false],['bytes=0-1,3-4',false]])assert.deepEqual(byteRange(value,16),result);
 const response=await handleVideo(new Request('https://example.org/api/video/'+key,{headers:{range:'bytes=4-7'}}),key,db,bucket);
 assert.equal(response.status,206);assert.equal(response.headers.get('Content-Range'),'bytes 4-7/16');assert.deepEqual([...new Uint8Array(await response.arrayBuffer())],[102,116,121,112]);
 const head=await handleVideo(new Request('https://example.org/api/video/'+key,{method:'HEAD'}),key,db,bucket);assert.equal(head.status,200);assert.equal(head.headers.get('Content-Length'),'16');assert.equal(await head.text(),'');
 assert.equal((await handleVideo(new Request('https://example.org/api/video/'+key,{headers:{range:'bytes=20-'}}),key,db,bucket)).status,416);
 sqlite.prepare("UPDATE resources SET status='draft' WHERE id=?").run(restored.id);
 assert.equal((await handleVideo(new Request('https://example.org/api/video/'+key),key,db,bucket)).status,404);
 const admin=new Request('https://example.org/api/video/'+key,{headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'suleymanozyurt49@gmail.com'}});
 assert.equal((await handleVideo(admin,key,db,bucket)).status,200);
});
test('shared account profile links never collapse distinct archived media into a single record',async()=>{
 const records=await parseSocialArchive([{title:'One',sourceUrl:'https://www.facebook.com/0rmanmuhendisi',media:[{uri:'one.jpg'}]},{title:'Two',sourceUrl:'https://www.facebook.com/0rmanmuhendisi',media:[{uri:'two.jpg'}]}],'facebook');
 assert.equal(records.posts.length,2);assert.equal(records.duplicates,0);
});
test('source publication excludes missing media and edited drafts, and repeating it cannot republish an edit',async()=>{
 const ready={...restored,id:'b'.repeat(64),revision:0,status:'draft'};
 const missing={...restored,id:'c'.repeat(64),revision:0,status:'draft',media:[{type:'image',path:'missing.jpg',alt:''}]};
 const edited={...restored,id:'d'.repeat(64),revision:0,status:'draft'};
 assert.equal((await handleSourceArchive(source({posts:[ready,missing,edited]}),runtime)).status,200);
 sqlite.prepare("UPDATE resources SET revision=1,title='Owner edit' WHERE id=?").run(edited.id);
 const result=await(await handleSourceArchive(source({action:'publishReady',ids:[ready.id,missing.id,edited.id]}),runtime)).json();
 assert.deepEqual(result,{published:1,skipped:2});
 assert.equal(sqlite.prepare('SELECT status FROM resources WHERE id=?').get(missing.id).status,'draft');
 assert.equal(sqlite.prepare('SELECT status FROM resources WHERE id=?').get(edited.id).status,'draft');
 assert.deepEqual(await(await handleSourceArchive(source({action:'publishReady',ids:[ready.id]}),runtime)).json(),{published:0,skipped:1});
});
test('administrative batch publication is all-or-none when a selected draft has changed or lacks media',async()=>{
 const one={...restored,id:'e'.repeat(64),revision:0,status:'draft'},two={...one,id:'f'.repeat(64)};
 await handleSourceArchive(source({posts:[one,two]}),runtime);
 const request=records=>new Request('https://example.org/api/social',{method:'POST',headers:{'oai-authenticated-user-id':'owner','oai-authenticated-user-email':'suleymanozyurt49@gmail.com','Content-Type':'application/json'},body:JSON.stringify({action:'publishSelected',records})});
 assert.equal((await handleSocial(request([{id:one.id,revision:0},{id:two.id,revision:1}]),db)).status,409);
 assert.equal(sqlite.prepare('SELECT status FROM resources WHERE id=?').get(one.id).status,'draft');
 assert.equal((await handleSocial(request([{id:one.id,revision:0},{id:'c'.repeat(64),revision:0}]),db)).status,400);
 assert.deepEqual(await(await handleSocial(request([{id:one.id,revision:0},{id:two.id,revision:0}]),db)).json(),{published:2});
 assert.equal((await handleSocial(request([{id:one.id,revision:0}]),db)).status,409);
});

async function imageBundle(files,alter){
 const entries=await Promise.all(files.map(async bytes=>({key:await mediaKey(bytes,'webp'),type:'image/webp',size:bytes.length})));
 const manifest=new TextEncoder().encode(JSON.stringify(alter?alter(entries):entries));
 const header=new Uint8Array(4);new DataView(header.buffer).setUint32(0,manifest.length);
 return {body:new Uint8Array(await new Blob([header,manifest,...files]).arrayBuffer()),entries};
}
test('photo bundles retain each verified object and register source ownership only after bounded storage succeeds',async()=>{
 const one=image.slice(),two=image.slice();one[13]=19;two[13]=20;
 const bundle=await imageBundle([one,two]);
 const request=()=>source(bundle.body,{query:'?mediaBatch=1',type:'application/octet-stream'});
 assert.deepEqual(await(await handleSourceArchive(request(),runtime)).json(),{keys:bundle.entries.map(e=>e.key)});
 for(const [index,entry] of bundle.entries.entries()){
  assert.equal(sqlite.prepare('SELECT user_id FROM uploads WHERE key=?').get(entry.key).user_id,archiveActor);
  assert.deepEqual(new Uint8Array(stored.get(entry.key).bytes),index?two:one);
 }
 assert.equal((await handleSourceArchive(request(),runtime)).status,200);
 assert.equal((await handleSourceArchive(source(bundle.body,{query:'?mediaBatch=1',type:'application/octet-stream',key:''}),runtime)).status,404);
});
test('truncated, altered and conflicting photo bundles cannot register uploads or overwrite another owner',async()=>{
 const photo=image.slice();photo[13]=21;const bundle=await imageBundle([photo]);
 const send=bytes=>handleSourceArchive(source(bytes,{query:'?mediaBatch=1',type:'application/octet-stream'}),runtime);
 assert.equal((await send(bundle.body.slice(0,-1))).status,400);
 const altered=bundle.body.slice();altered[altered.length-1]^=1;assert.equal((await send(altered)).status,400);
 assert.equal(sqlite.prepare('SELECT user_id FROM uploads WHERE key=?').get(bundle.entries[0].key),undefined);
 const duplicates=await imageBundle([photo,photo]);assert.equal((await send(duplicates.body)).status,400);
 sqlite.prepare('INSERT INTO uploads(key,user_id,created_at) VALUES(?,?,?)').run(bundle.entries[0].key,'another-owner',new Date().toISOString());
 assert.equal((await send(bundle.body)).status,409);assert.equal(stored.has(bundle.entries[0].key),false);
 const invalid=await imageBundle([photo],entries=>entries.map(e=>({...e,size:1500001})));assert.equal((await send(invalid.body)).status,400);
});
test('an interrupted restoration may enrich only its untouched source draft and never replace an edited record',async()=>{
 const partial={...restored,id:'1'.repeat(64),status:'draft',revision:0,media:[{type:'image',path:'original.jpg',alt:''}]};
 await handleSourceArchive(source({posts:[partial]}),runtime);
 const original=sqlite.prepare('SELECT created_at FROM resources WHERE id=?').get(partial.id).created_at;
 const enriched={...partial,media:[{type:'image',path:'original.jpg',uploadedKey:await mediaKey(image,'webp'),alt:''}]};
 assert.deepEqual(await(await handleSourceArchive(source({posts:[enriched]}),runtime)).json(),{imported:0,skipped:1});
 const row=sqlite.prepare('SELECT data,created_at,revision FROM resources WHERE id=?').get(partial.id);
 assert.equal(JSON.parse(row.data).media[0].uploadedKey,enriched.media[0].uploadedKey);assert.equal(row.created_at,original);assert.equal(row.revision,0);
 sqlite.prepare("UPDATE resources SET revision=1,title='Owner changes' WHERE id=?").run(partial.id);
 await handleSourceArchive(source({posts:[partial]}),runtime);
 const after=sqlite.prepare('SELECT title,data FROM resources WHERE id=?').get(partial.id);assert.equal(after.title,'Owner changes');assert.equal(JSON.parse(after.data).media[0].uploadedKey,enriched.media[0].uploadedKey);
});
