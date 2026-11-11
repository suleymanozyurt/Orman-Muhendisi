import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {handleTaxonomyImport,ictvImportManifest as manifest} from '../app/taxonomy-import.ts';
import {handleTaxonomy,taxonomyDetail} from '../app/api/taxonomy/handler.ts';

function database(){
 const sql=new DatabaseSync(':memory:');
 for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')&&f!=='0017_ictv_msl41.sql').sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
 const statement=(query,args=[])=>({bind:(...values)=>statement(query,values),first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>sql.prepare(query).run(...args)});
 const db={prepare:query=>statement(query),batch:async stmts=>{assert(stmts.length<=41);sql.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};
 return {sql,db};
}
const request=body=>new Request('https://example.test/api/taxonomy/import',body?{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{});
const batch=index=>({action:'chunk',version:manifest.version,index,payload:readFileSync(new URL(`../data/taxonomy-import/${manifest.version}/${String(index).padStart(5,'0')}.json`,import.meta.url),'utf8')});

test('bounded official import rejects modified data and incomplete releases without writing records',async()=>{
 const {sql,db}=database();
 const progress=await(await handleTaxonomyImport(request(),db)).json();assert.equal(progress.completedChunks,0);assert.equal(progress.missing.length,572);
 assert.equal((await handleTaxonomyImport(request({...batch(0),payload:batch(0).payload.replace('accepted','incorrect')}),db)).status,400);
 assert.equal((await handleTaxonomyImport(request({...batch(0),index:-1}),db)).status,400);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_nodes').get().n,0);
 assert.equal((await handleTaxonomyImport(request({action:'finalize',version:manifest.version}),db)).status,409);
 assert.equal((await handleTaxonomy(new Request('https://example.test/api/taxonomy?source=ictv'),db)).status,503);
 await assert.rejects(taxonomyDetail('ictv','ICTV202420188',db),/SOURCE_IMPORT_INCOMPLETE/);
 const crossOrigin=new Request('https://example.test/api/taxonomy/import',{method:'POST',headers:{Origin:'https://other.test'},body:JSON.stringify(batch(0))});assert.equal((await handleTaxonomyImport(crossOrigin,db)).status,403);
 sql.close();
});

test('atomic data batches resume without duplication and validate all 22,670 taxa before publication',async()=>{
 const {sql,db}=database();
 let result=await(await handleTaxonomyImport(request(batch(0)),db)).json();assert.equal(result.persisted,true);assert.equal(result.reused,false);
 result=await(await handleTaxonomyImport(request(batch(0)),db)).json();assert.equal(result.reused,true);
 let progress=await(await handleTaxonomyImport(request(),db)).json();assert.equal(progress.missing.length,571);
 for(const index of progress.missing){const response=await handleTaxonomyImport(request(batch(index)),db);assert.equal(response.status,200);}
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_nodes').get().n,22670);
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM taxonomy_nodes WHERE rank='SPECIES'").get().n,17554);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_changes').get().n,176);
 const species=sql.prepare("SELECT key,parent_id FROM taxonomy_nodes WHERE rank='SPECIES' LIMIT 1").get();
 sql.prepare('UPDATE taxonomy_nodes SET parent_id=? WHERE key=?').run('missing-parent',species.key);
 assert.equal((await handleTaxonomyImport(request({action:'finalize',version:manifest.version}),db)).status,409);
 sql.prepare('UPDATE taxonomy_nodes SET parent_id=? WHERE key=?').run(species.parent_id,species.key);
 result=await(await handleTaxonomyImport(request({action:'finalize',version:manifest.version}),db)).json();assert.equal(result.complete,true);assert.equal(result.taxa,22670);
 progress=await(await handleTaxonomyImport(request(),db)).json();assert.equal(progress.complete,true);assert.equal(progress.missing.length,0);
 const detail=await taxonomyDetail('ictv','ICTV202420188',db);assert.equal(detail.path[0].name,'Adnaviria');assert.equal(detail.node.name,'Wargodvirus xiongnu');
 const plan=await(await handleTaxonomy(new Request('https://example.test/api/taxonomy?mode=sync-plan'),db)).json();assert.equal(plan.records.length,0);
 sql.close();
});

test('a failed data transaction never records a resume receipt',async()=>{
 const {sql,db}=database();
 const failing={...db,batch:async stmts=>{sql.exec('BEGIN');try{await stmts[0].run();throw new Error('Interrupted write');}finally{sql.exec('ROLLBACK');}}};
 assert.equal((await handleTaxonomyImport(request(batch(0)),failing)).status,503);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_nodes').get().n,0);
 const progress=await(await handleTaxonomyImport(request(),db)).json();assert.equal(progress.completedChunks,0);
 assert.equal((await handleTaxonomyImport(request(batch(0)),db)).status,200);
 sql.close();
});
