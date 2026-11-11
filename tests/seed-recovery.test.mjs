import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {DatabaseSync} from 'node:sqlite';

test('publication applies schema without bulk data; the immutable source seed restores full coverage',()=>{
 const archive=readFileSync(new URL('../data/taxonomy-import/legacy/0017_ictv_msl41.sql',import.meta.url));
 assert.equal(createHash('sha256').update(archive).digest('hex'),'97a00beb77848701e6e5e54d426e12524bbcaca2298cce91fb2f501dbf2ac52e');
 const sql=new DatabaseSync(':memory:');
 try{
  for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));
  const schema=()=>sql.prepare("SELECT type,name,tbl_name,sql FROM sqlite_master WHERE sql IS NOT NULL ORDER BY type,name").all();
  const before=schema();
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_nodes').get().n,0);
  sql.exec(archive.toString('utf8'));
  assert.deepEqual(schema(),before);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_nodes').get().n,22670);
  assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM taxonomy_nodes WHERE rank='SPECIES'").get().n,17554);
  assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_changes').get().n,176);
 }finally{sql.close();}
});
