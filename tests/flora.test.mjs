import test from "node:test";
import assert from "node:assert/strict";
import { GET } from "../app/api/flora/route.ts";
import source from "../app/data/tubives.json" with {type:"json"};
const request = q=>GET(new Request(`https://example.org/api/flora?${q}`));
test("all source taxa, ranks and family totals are retained without duplicate IDs",()=>{
 assert.equal(source.records.length,10478);assert.equal(new Set(source.records.map(r=>r.id)).size,10478);
 assert.equal(new Set(source.records.map(r=>r.family)).size,174);
 assert.deepEqual(source.metadata.ranks,{species:7821,subspecies:1596,variety:1061});
 assert.equal(source.metadata.familyCountsVerified,true);
 for(const id of [2161,6491,7088,9932]){const r=source.records.find(r=>r.id===id);assert(r);assert.match(r.name,/subsp\..*var\./);assert.equal(r.provinces.length,0);assert.equal(r.grids.length,0);}
});
test("catalogue pages are stable and filters combine across family, province, grid and endemism",async()=>{
 const first=await (await request("limit=100")).json();const second=await (await request("limit=100&offset=100")).json();
 assert.equal(first.total,10478);assert.equal(first.records.length,100);assert.equal(first.facets.province.length,81);assert.equal(first.facets.grid.length,30);
 assert(!second.records.some(r=>first.records.some(a=>a.id===r.id)));
 const endemic=source.records.find(r=>r.endemism.toLowerCase()==="endemik" && r.provinces.length && r.grids.length);assert(endemic);
 const params=new URLSearchParams({family:endemic.family,province:endemic.provinces[0],grid:endemic.grids[0],endemic:"1",limit:"100"});
 const filtered=await(await request(params)).json();assert(filtered.total>0);
 for(const r of filtered.records){assert.equal(r.family,endemic.family);assert(r.provinces.includes(endemic.provinces[0]));assert(r.grids.includes(endemic.grids[0]));assert.equal(r.endemism.toLowerCase(),"endemik");}
});
test("profiles return their own source identity, invalid IDs and pages are rejected, CSV covers all matching rows",async()=>{
 const profile=await(await request("id=2161")).json();assert.equal(profile.record.id,2161);assert.match(profile.record.source,/tax_id=2161$/);
 for(const q of ["id=0","id=no","limit=101","offset=-1"]){assert.equal((await request(q)).status,400);}
 assert.equal((await request("id=999999")).status,404);
 const q=new URLSearchParams({family:"Pinaceae",format:"csv"});const csv=await(await request(q)).text();
 assert.equal(csv.split("\r\n").length-1,source.records.filter(r=>r.family === "Pinaceae").length);
 assert.match(csv,/Cedrus libani/);
});
test('multi-province filters use real distribution records and native Turkish names are searchable',async()=>{
 const provinces=['Antalya','Artvin'];const params=new URLSearchParams({limit:'100'});provinces.forEach(p=>params.append('provinces',p));const data=await(await request(params)).json();assert.equal(data.total,source.records.filter(r=>provinces.some(p=>r.provinces.includes(p))).length);assert(data.records.every(r=>provinces.some(p=>r.provinces.includes(p))));
 const matched=source.records.filter(r=>r.commonName);assert.equal(matched.length,8077);assert(matched.every(r=>r.nameSource.startsWith('https://bizimbitkiler.org.tr/yeni/demos/technical/getDetails.php?id=')));
 const found=await(await request(new URLSearchParams({q:'katranağacı'}))).json();assert(found.records.some(r=>r.name==='Cedrus libani var. libani'));
});

test('new rank, life and growth filters combine using the original record values', async () => {
 const record = source.records.find(r=>r.rank==='variety' && r.life && r.form);
 const result=await(await request(new URLSearchParams({rank:record.rank,life:record.life,form:record.form,limit:'100'}))).json();
 assert.equal(result.total,source.records.filter(r=>r.rank===record.rank && r.life===record.life && r.form===record.form).length);
 assert(result.total>0); assert(result.records.every(r=>r.rank===record.rank && r.life===record.life && r.form===record.form));
 assert(result.facets.life.includes(record.life)); assert(result.facets.form.includes(record.form));
 for(const q of ['rank=unsupported','sort=unsupported']) assert.equal((await request(q)).status,400);
});
test('word searches include province names and match regardless of word order or accents', async () => {
 const record=source.records.find(r=>r.genus==='Cedrus' && r.provinces.length);
 const province=record.provinces.includes("Muğla") ? "Muğla" : record.provinces[0];
 const q=`${province} ${record.name.split(" ").slice(0,2).join(" ")}`;
 const result=await(await request(new URLSearchParams({q,limit:'100'}))).json();
 assert(result.total>0);assert(result.records.every(r=>r.genus==='Cedrus' && r.provinces.includes(province)));
 const reverse=await(await request(new URLSearchParams({q:q.split(' ').reverse().join(' '),limit:'100'}))).json();
 assert.deepEqual(reverse.records.map(r=>r.id),result.records.map(r=>r.id));
 const unaccented=await(await request(new URLSearchParams({q:q.replace('Muğla','mugla'),limit:'100'}))).json();
 assert.deepEqual(unaccented.records.map(r=>r.id),result.records.map(r=>r.id));
});
test('common-name sorting is stable across pages and exported CSV follows the chosen filters', async () => {
 const params={sort:'common',limit:'48'};
 const first=await(await request(new URLSearchParams(params))).json();
 const second=await(await request(new URLSearchParams({...params,offset:'48'}))).json();
 const combined=await(await request(new URLSearchParams({...params,limit:'96'}))).json();
 assert.deepEqual([...first.records,...second.records].map(r=>r.id),combined.records.map(r=>r.id));
 for(let i=1;i<combined.records.length;i++) assert(combined.records[i-1].commonName.localeCompare(combined.records[i].commonName,'tr')<=0);
 const csv=await(await request(new URLSearchParams({family:'Pinaceae',rank:'variety',sort:'common',format:'csv'}))).text();
 assert.match(csv, /"commonName"/);
 assert.equal(csv.split('\r\n').length-1,source.records.filter(r=>r.family==='Pinaceae'&&r.rank==='variety').length);
});

test('complete flora statistics preserve source counts, all ranks and direct taxon identities',async()=>{
 const res=await GET(new Request('https://example.org/api/flora?statistics=1'));assert.equal(res.status,200);const s=await res.json();assert.equal(s.total,10478);assert.equal(s.ranks.species+s.ranks.subspecies+s.ranks.variety,s.total);assert.equal(s.provinces.length,81);assert.equal(s.grids.length,30);assert.equal(s.families.length,174);assert.equal(s.families.reduce((n,r)=>n+r.count,0),s.total);assert.equal(s.audit.sourceStatistics.length,111);assert.ok(s.metadata.detailEnrichment.verifiedTaxonPages>0);
});
