import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, readdirSync } from 'node:fs';
import { DatabaseSync } from 'node:sqlite';
import ts from 'typescript';
const sqlite=new DatabaseSync(':memory:');
for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
function prepared(sql,args=[]){return {bind(...v){return prepared(sql,v)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)},sql,args};}
const db={prepare:prepared,async batch(statements){sqlite.exec('BEGIN');try{const results=statements.map(s=>sqlite.prepare(s.sql).run(...s.args));sqlite.exec('COMMIT');return results;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
globalThis.__observationTestEnv={DB:db,BUCKET:{get:async()=>({body:'image',httpMetadata:{contentType:'image/jpeg'}}),delete:async()=>{}}};
globalThis.__observationTestHeaders=new Headers();
const typesCode=ts.transpileModule(readFileSync(new URL('../app/life-types.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const typesURL='data:text/javascript;base64,'+Buffer.from(typesCode).toString('base64');
let livingCode=ts.transpileModule(readFileSync(new URL('../app/observation-taxon.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
livingCode=livingCode.replace('"./life-types"',JSON.stringify(typesURL)).replace('"./data/life-taxonomy.json"',JSON.stringify(new URL('../app/data/life-taxonomy.json',import.meta.url).href));
const livingURL='data:text/javascript;base64,'+Buffer.from(livingCode).toString('base64');
async function load(path){let s=ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;s=s.replace('import { headers } from "next/headers";','const headers=async()=>globalThis.__observationTestHeaders;').replace('import { plants } from "../../plant-data";',`import {plants} from '${new URL('../app/plant-data.ts',import.meta.url).href}';`).replace('import { licensedPhotos } from "../../feed-data";',`const licensedPhotos=()=>[];`).replaceAll('import("cloudflare:workers")','Promise.resolve({env:globalThis.__observationTestEnv})').replace('import("../../data/tubives.json")',`import('${new URL('../app/data/tubives.json',import.meta.url).href}',{with:{type:'json'}})`);s=s.replace('import("../../observation-taxon")','import('+JSON.stringify(livingURL)+')');s=s.replace('"../../observation-page-query.ts"',JSON.stringify(new URL('../app/observation-page-query.ts',import.meta.url).href)).replace('"../../link-preview.ts"',JSON.stringify(new URL('../app/link-preview.ts',import.meta.url).href)).replace('"../../link-preview-server.ts"',JSON.stringify(new URL('../app/link-preview-server.ts',import.meta.url).href)).replace('import { internalLinkPreview } from "../../shared-content.ts";','const internalLinkPreview=async()=>undefined;');return import('data:text/javascript;base64,'+Buffer.from(s).toString('base64'));}
const community=await load('../app/api/community-observations/route.ts');
let sharedCode=ts.transpileModule(readFileSync(new URL('../app/shared-content.ts',import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
sharedCode=sharedCode.replace('import { rawDatabase } from "../db/runtime.ts";','const rawDatabase=async()=>globalThis.__observationTestEnv.DB;').replace('"./link-preview.ts"',JSON.stringify(new URL('../app/link-preview.ts',import.meta.url).href)).replace('"./plant-data.ts"',JSON.stringify(new URL('../app/plant-data.ts',import.meta.url).href)).replace('"./social-archive-model.ts"',JSON.stringify(new URL('../app/social-archive-model.ts',import.meta.url).href)).replace('import { licensedPhotos } from "./feed-data.ts";','const licensedPhotos=()=>[];').replace('import { siteOrigin, seoRoute, canonicalRoute, isIndexableRoute } from "./seo.ts";','const siteOrigin="https://ormanmuhendisi.suleymanozyurt49.chatgpt.site",seoRoute=()=>({view:"home"}),canonicalRoute=()=>siteOrigin,isIndexableRoute=()=>true;');
const shared=await import('data:text/javascript;base64,'+Buffer.from(sharedCode).toString('base64'));
const state=await load('../app/api/state/route.ts');const image=await load('../app/api/image/[key]/route.ts');
const auth=(id,admin=false)=>{globalThis.__observationTestHeaders=new Headers(id?{'oai-authenticated-user-id':id,'oai-authenticated-user-email':admin?'suleymanozyurt49@gmail.com':'visitor@example.org'}:{});};
const act=body=>state.POST(new Request('https://example.org/api/state',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)}));
const get=()=>state.GET(new Request('https://example.org/api/state'));
const keys=Array.from({length:101},(_,i)=>`${String(i).padStart(8,'0')}-0000-4000-a000-000000000000.jpg`);
for(const key of keys)sqlite.prepare('INSERT INTO uploads (key,user_id,created_at) VALUES (?,?,?)').run(key,'owner','2026-09-30');
test('like and save desired-state writes are idempotent, scoped to the user and compatible with earlier clients',async()=>{
 auth(null);assert.equal((await act({action:'toggle-like',id:'social-post',selected:true})).status,401);
 for(const action of ['toggle-like','toggle-save']){
  auth('interaction-owner');
  for(let repeat=0;repeat<2;repeat++)assert.equal((await(await act({action,id:'social-post',selected:true})).json()).selected,true);
  const field=action==='toggle-like'?'observation_id':'item_id',table=action==='toggle-like'?'likes':'saves';
  assert.equal(sqlite.prepare(`SELECT count(*) AS n FROM ${table} WHERE user_id=? AND ${field}=?`).get('interaction-owner','social-post').n,1);
  auth('interaction-other');await act({action,id:'social-post',selected:true});
  auth('interaction-owner');
  for(let repeat=0;repeat<2;repeat++)assert.equal((await(await act({action,id:'social-post',selected:false})).json()).selected,false);
  assert.equal(sqlite.prepare(`SELECT count(*) AS n FROM ${table} WHERE ${field}=?`).get('social-post').n,1);
  assert.equal((await act({action,id:'social-post',selected:'true'})).status,400);
  assert.equal((await(await act({action,id:'social-post'})).json()).selected,true);
  assert.equal((await(await act({action,id:'social-post'})).json()).selected,false);
 }
});
test('100-photo private drafts, server-side privacy, review and taxon publication work together',async()=>{
 auth(null);assert.equal((await act({action:'create-post',text:'field note'})).status,401);
 auth('owner');assert.equal((await act({action:'create-post',photos:keys.map(key=>({key}))})).status,400);
 const clientId='11111111-1111-4111-a111-111111111111';const payload={action:'create-post',clientId,photos:keys.slice(0,100).map(key=>({key,organ:'Yaprak'})),plantId:'cedrus-libani',share:false};
 let r=await act(payload);assert.equal(r.status,200);assert.equal((await r.json()).status,'draft');
 assert.equal(sqlite.prepare('SELECT count(*) as n FROM observation_photos').get().n,100);
 assert.equal((await act(payload)).status,200);assert.equal(sqlite.prepare('SELECT count(*) as n FROM observations').get().n,1);
 auth('other');assert.equal((await get()).status,200);assert.equal((await(await get()).json()).posts.length,0);
 assert.equal((await image.GET(new Request('https://example.org'),{params:Promise.resolve({key:keys[0]})})).status,404);
 assert.equal((await act({action:'submit-observation',id:clientId})).status,404);
 assert.equal((await act({action:'review-observation',id:clientId,decision:'approved'})).status,403);
 auth('owner');assert.equal((await act({action:'submit-observation',id:clientId})).status,200);
 auth('admin',true);assert.equal((await(await get()).json()).posts[0].status,'pending');
 r=await act({action:'review-observation',id:clientId,decision:'approved'});assert.equal(r.status,200);
 auth('other');const published=(await(await get()).json()).posts[0];assert.equal(published.status,'approved');assert.equal(published.plantId,'cedrus-libani');assert.equal(published.photos.length,100);
 assert.equal((await image.GET(new Request('https://example.org'),{params:Promise.resolve({key:keys[0]})})).status,200);
 auth('owner');assert.equal((await act({action:'withdraw-observation',id:clientId})).status,200);
 auth('other');assert.equal((await(await get()).json()).posts.length,0);
 assert.equal((await image.GET(new Request('https://example.org'),{params:Promise.resolve({key:keys[0]})})).status,404);
 auth('owner');assert.equal((await act({action:'create-post',photos:[{key:keys[100]}],plantId:'flora-108',share:true})).status,200);
 auth('other');assert.equal((await act({action:'create-post',photos:[{key:keys[100]}]})).status,403);
});

test('living species review and public projection keep pending records private and edited retries idempotent',async()=>{
 auth('owner');
 for(const plantId of ['gbif-4689','gbif-6','gbif-2435194'])assert.equal((await act({action:'create-post',text:'Record',plantId})).status,400);
 assert.equal((await act({action:'create-post',text:'Invalid date',observedAt:'2025-02-29'})).status,400);
 const clientId='22222222-2222-4222-a222-222222222222';
 const payload={action:'create-post',clientId,text:'Animal observation',plantId:'gbif-5219404',observedAt:'2026-10-01',share:true};
 let response=await act(payload);assert.equal(response.status,200);assert.equal((await response.json()).status,'pending');
 const publicRead=(query='taxon=gbif-5219404')=>community.GET(new Request('https://example.org/api/community-observations?'+query));
 auth(null);assert.equal((await(await publicRead()).json()).records.length,0);
 auth('admin',true);assert.equal((await act({action:'review-observation',id:clientId,decision:'approved'})).status,200);
 auth(null);const visible=await(await publicRead()).json();assert.equal(visible.records.length,1);assert.equal(visible.records[0].plantId,'gbif-5219404');
 assert.equal('user_id' in visible.records[0],false);assert.equal('reviewNote' in visible.records[0],false);
 assert.equal((await publicRead()).headers.get('cache-control'),'no-store');
 auth('owner');response=await act(payload);assert.equal((await response.json()).status,'approved');
 const before=sqlite.prepare('SELECT count(*) AS n FROM observations').get().n;
 response=await act({...payload,text:'Edited after an uncertain acknowledgement'});assert.equal((await response.json()).status,'pending');
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM observations').get().n,before);
 assert.equal(sqlite.prepare('SELECT text FROM observations WHERE id=?').get(clientId).text,'Edited after an uncertain acknowledgement');
 auth(null);assert.equal((await(await publicRead()).json()).records.length,0);
 auth('admin',true);assert.equal((await act({action:'review-observation',id:clientId,decision:'approved'})).status,200);
 auth('other');assert.equal((await act(payload)).status,409);
 auth('owner');assert.equal((await act({...payload,share:false})).status,200);
 auth(null);assert.equal((await(await publicRead()).json()).records.length,0);
 for(const query of ['taxon=x%2Fother','offset=-1','offset=2.5','offset=1000001'])assert.equal((await publicRead(query)).status,400);
});

test('comment retries create one owned record and cannot write onto someone else’s private observation',async()=>{
 sqlite.prepare("INSERT INTO observations(id,user_id,author,text,created_at,status) VALUES(?,?,?,?,?,?)").run('comment-public','original-owner','Observer','Public record','2026-10-03','approved');
 sqlite.prepare("INSERT INTO observations(id,user_id,author,text,created_at,status) VALUES(?,?,?,?,?,?)").run('comment-private','original-owner','Observer','Private record','2026-10-03','draft');
 const clientId='33333333-3333-4333-a333-333333333333',body={action:'comment',id:'comment-public',value:'Original comment',clientId};
 auth('comment-author');
 for(let repeat=0;repeat<2;repeat++){const response=await act(body);assert.equal(response.status,200);assert.equal((await response.json()).id,clientId);}
 assert.equal(sqlite.prepare('SELECT count(*) AS n FROM comments WHERE observation_id=?').get('comment-public').n,1);
 assert.equal((await act({...body,value:'Changed content'})).status,409);
 assert.equal((await act({...body,id:'comment-private',clientId:'44444444-4444-4444-a444-444444444444'})).status,404);
 auth('other-comment-author');assert.equal((await act(body)).status,409);
 assert.equal(sqlite.prepare('SELECT user_id FROM comments WHERE id=?').get(clientId).user_id,'comment-author');
});

test('attached previews are persisted from trusted fetches; single-item links never disclose drafts or rejected posts',async()=>{
 const originalFetch=globalThis.fetch,linkUrl='https://www.gbif.org/species/2685484';
 globalThis.fetch=async(url)=>String(url).startsWith('https://cloudflare-dns.com/')?Response.json({Status:0,Answer:[{type:1,data:'93.184.215.14'}]}):new Response('<meta property="og:title" content="Cedrus libani"><meta property="og:description" content="Taxon"><meta property="og:image" content="/cedrus.jpg">',{headers:{'content-type':'text/html'}});
 try{
  auth('link-owner');const clientId='33333333-3333-4333-a333-333333333333';const payload={action:'create-post',clientId,text:'',linkUrl,plantId:'cedrus-libani',share:false,linkPreview:{url:linkUrl,title:'Forged title',image:'https://private.example/photo.jpg'}};
  assert.equal((await act(payload)).status,200);let privateRecord=(await(await get()).json()).posts.find(post=>post.id===clientId);assert.equal(privateRecord.linkPreview.title,'Cedrus libani');assert.equal(privateRecord.linkPreview.image,'https://www.gbif.org/cedrus.jpg');
  assert.equal(await shared.publicObservation(clientId,db),null);auth('admin',true);assert.equal(await shared.publicObservation(clientId,db),null,'admin also receives no shareable private projection');
  auth('link-owner');assert.equal((await act({...payload,share:true})).status,200);assert.equal(await shared.publicObservation(clientId,db),null);
  auth('admin',true);assert.equal((await act({action:'review-observation',id:clientId,decision:'approved'})).status,200);
  auth(null);const visible=await shared.publicObservation(clientId,db);assert.equal(visible.linkPreview.title,'Cedrus libani');for(const field of ['user_id','authorId','latitude','longitude','reviewNote','owner'])assert.equal(field in visible,false);
  const projected=await(await community.GET(new Request('https://example.org/api/community-observations?taxon=cedrus-libani'))).json();assert.equal(projected.records.find(record=>record.id===clientId).linkPreview.url,linkUrl);
  auth('link-owner');assert.equal((await act({...payload,share:true})).status,200);assert.equal((await(await get()).json()).posts.find(post=>post.id===clientId).status,'approved');
  assert.equal((await act({action:'withdraw-observation',id:clientId})).status,200);assert.equal(await shared.publicObservation(clientId,db),null);
  assert.equal((await act({...payload,linkUrl:'http://169.254.169.254/'})).status,400);
 }finally{globalThis.fetch=originalFetch;}
});
