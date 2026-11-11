import test from 'node:test';
import assert from 'node:assert/strict';
import {DatabaseSync} from 'node:sqlite';
import {readFileSync,readdirSync} from 'node:fs';
import {readObservationPage} from '../app/observation-page-query.ts';

test('observation pages read only the albums they display, retain order and do not expose private records',async()=>{
 const sqlite=new DatabaseSync(':memory:'),reads=[];
 try{
  const migrations=new URL('../drizzle/',import.meta.url);
  for(const file of readdirSync(migrations).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL(file,migrations),'utf8'));
  const insert=sqlite.prepare('INSERT INTO observations(id,user_id,author,text,status,created_at) VALUES (?,?,?,?,?,?)');
  const photo=sqlite.prepare('INSERT INTO observation_photos(observation_id,image_key,position) VALUES (?,?,?)');
  for(let n=0;n<151;n++){
   const id=String(n).padStart(3,'0');
   insert.run(id,'other','Other','Visible','approved',id);
   photo.run(id,id+'-last','10');
   photo.run(id,id+'-first','2');
  }
  insert.run('hidden','other','Other','Private','pending','zzzz');
  insert.run('mine','me','Me','My pending','pending','yyyy');
  photo.run('hidden','never-return-this','1');
  photo.run('mine','my-image','1');
  sqlite.prepare('INSERT INTO follows(follower_id,followed_id,created_at) VALUES (?,?,?)').run('me','other','now');
  sqlite.prepare('INSERT INTO likes(user_id,observation_id) VALUES (?,?)').run('me','gbif:12');
  const db={prepare:query=>({bind:(...args)=>({all:async()=>{
   const results=sqlite.prepare(query).all(...args);
   if(query.includes('FROM observation_photos'))reads.push(results.map(row=>row.image_key));
   return {results};
  }})})};
  const first=await readObservationPage(db,{id:'me',isAdmin:false},0,false,true);
  assert.equal(first.posts.length,150);
  assert.equal(first.hasMore,true);
  assert.equal(first.posts[0].id,'mine');
  assert.equal(first.posts.some(post=>post.id==='hidden'),false);
  assert.deepEqual(first.posts[1].photos.map(p=>p.key),['150-first','150-last']);
  assert.equal(reads[0].length,299);
  assert(!reads[0].includes('000-first')&&!reads[0].includes('never-return-this'));
  assert.equal(first.externalEngagement['gbif:12'].likeCount,1);
  const last=await readObservationPage(db,{id:'me',isAdmin:false},150,false,false);
  assert.deepEqual(last.posts.map(post=>post.id),['001','000']);
  assert.equal(last.hasMore,false);
  assert.equal(reads[1].length,4);
  assert.deepEqual(last.externalEngagement,{});
  const following=await readObservationPage(db,{id:'me',isAdmin:false},0,true,false);
  assert.equal(following.posts[0].id,'150');
  assert(!following.posts.some(post=>post.id==='mine'||post.id==='hidden'));
 }finally{sqlite.close();}
});
