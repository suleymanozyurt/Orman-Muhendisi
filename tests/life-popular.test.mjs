import test from "node:test";import assert from "node:assert/strict";import {DatabaseSync} from "node:sqlite";import {readFileSync,readdirSync} from "node:fs";
import {handleLifePopular} from "../app/api/life-popular/handler.ts";
const sqlite=new DatabaseSync(":memory:");for(const file of readdirSync(new URL("../drizzle/",import.meta.url)).filter(x=>x.endsWith(".sql")).sort())sqlite.exec(readFileSync(new URL("../drizzle/"+file,import.meta.url),"utf8"));
const prepared=(sql,args=[])=>({sql,args,bind(...args){return prepared(sql,args)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}});
const db={prepare:prepared,async batch(statements){sqlite.exec("BEGIN");try{const results=statements.map(s=>sqlite.prepare(s.sql).run(...s.args));sqlite.exec("COMMIT");return results;}catch(e){sqlite.exec("ROLLBACK");throw e;}}};
const node={id:"gbif-5219404",scientificName:"Panthera leo",rank:"SPECIES",status:"ACCEPTED",images:[],synonyms:[],source:{url:"https://www.gbif.org/species/5219404"}};
const resolve=async id=>id===node.id?node:null;
const request=(body,cookie,origin="https://example.org")=>new Request("https://example.org/api/life-popular",{method:body?"POST":"GET",headers:{origin,...(cookie?{cookie}:{}),"Content-Type":"application/json"},...(body?{body:JSON.stringify(body)}:{})});
test("real site visits persist, deduplicate per visitor/day and expire outside the displayed 90-day period",async()=>{
 const now=new Date("2026-10-02T12:00:00Z"),first=await handleLifePopular(request({id:node.id}),db,resolve,now);assert.equal(first.status,200);const cookie=first.headers.get("set-cookie").split(";")[0];assert(first.headers.get("set-cookie").includes("HttpOnly"));
 await handleLifePopular(request({id:node.id},cookie),db,resolve,now);assert.equal((await(await handleLifePopular(request(),db,resolve,now)).json()).records[0].count,1);
 await handleLifePopular(request({id:node.id},cookie),db,resolve,new Date("2026-10-03T12:00:00Z"));const ranked=await(await handleLifePopular(request(),db,resolve,new Date("2026-10-03T12:00:00Z"))).json();assert.equal(ranked.records[0].count,2);assert.equal(ranked.days,90);assert(!JSON.stringify(ranked).includes("visitor_id"));
 const old=await(await handleLifePopular(request(),db,resolve,new Date("2027-02-01T12:00:00Z"))).json();assert.deepEqual(old.records,[]);
});
test("cross-site and fabricated taxon visits cannot inflate counts, and unavailable storage is explicit",async()=>{
 assert.equal((await handleLifePopular(request({id:node.id},undefined,"https://other.example"),db,resolve)).status,403);
 assert.equal((await handleLifePopular(request({id:"gbif-999999"}),db,resolve)).status,400);
 assert.equal((await handleLifePopular(request({id:node.id}),db,async()=>({...node,rank:"FAMILY"}))).status,400);
 assert.equal((await handleLifePopular(request(),undefined,resolve)).status,503);
});
