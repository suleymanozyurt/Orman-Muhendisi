import test from 'node:test';import assert from 'node:assert/strict';import {DatabaseSync} from 'node:sqlite';import {readFileSync,readdirSync} from 'node:fs';
import {handleTaxonomy,taxonomyDetail} from '../app/api/taxonomy/handler.ts';
import {itisNode,colNode,powoNode,externalPage,ITIS_ROOT_IDS} from '../app/taxonomy-adapters.ts';
import {saveNodes,storedNode} from '../app/taxonomy-store.ts';
const fixture=name=>JSON.parse(readFileSync(new URL(`./fixtures/taxonomy/${name}.json`,import.meta.url),'utf8'));
function database(){const sql=new DatabaseSync(':memory:');for(const file of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sql.exec(readFileSync(new URL('../drizzle/'+file,import.meta.url),'utf8'));sql.exec(readFileSync(new URL('../data/taxonomy-import/legacy/0017_ictv_msl41.sql',import.meta.url),'utf8'));const statement=(query,args=[])=>({bind:(...values)=>statement(query,values),first:async()=>sql.prepare(query).get(...args)||null,all:async()=>({results:sql.prepare(query).all(...args)}),run:async()=>sql.prepare(query).run(...args)});const db={prepare:query=>statement(query),batch:async stmts=>{sql.exec('BEGIN');try{const result=[];for(const s of stmts)result.push(await s.run());sql.exec('COMMIT');return result;}catch(e){sql.exec('ROLLBACK');throw e;}}};return {sql,db};}
const req=params=>new Request('https://example.test/api/taxonomy?'+new URLSearchParams(params));
test('complete ICTV MSL41 release has every official rank count, all parents and historical changes',async()=>{
 const {sql,db}=database();const release=sql.prepare("SELECT * FROM taxonomy_releases WHERE source='ictv'").get();assert.equal(release.complete,1);assert.equal(release.expected_count,22670);const expected=JSON.parse(release.data).rankCounts;
 for(const row of sql.prepare("SELECT rank,COUNT(*) AS n FROM taxonomy_nodes WHERE source='ictv' GROUP BY rank").all())assert.equal(row.n,expected[row.rank]);
 assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM taxonomy_nodes n LEFT JOIN taxonomy_nodes p ON p.source=n.source AND p.version=n.version AND p.source_id=n.parent_id WHERE n.parent_id IS NOT NULL AND p.key IS NULL").get().n,0);
 assert.equal(sql.prepare('SELECT COUNT(*) AS n FROM taxonomy_changes').get().n,176);
 let result=await(await handleTaxonomy(req({source:'ictv',mode:'search',q:'virus',rank:'Species',cursor:'17202'}),db)).json();assert.equal(result.total,17224);assert.equal(result.records.length,22);assert.equal(result.next,null);
 result=await(await handleTaxonomy(req({mode:'coverage'}),db)).json();assert.equal(result.counts[0].stored,22670);assert.equal(result.counts[0].species,17554);
 const roots=await(await handleTaxonomy(req({source:'ictv'}),db)).json();while(roots.next){const page=await(await handleTaxonomy(req({source:'ictv',cursor:roots.next}),db)).json();roots.records.push(...page.records);roots.next=page.next;}assert(roots.records.some(n=>n.rank==='CLASS'));assert.equal(roots.records.filter(n=>n.rank==='REALM').length,10);assert(!roots.records.some(n=>n.name==='Viruses'||n.name==='Virüsler'));
 const d=await taxonomyDetail('ictv','ICTV202420188',db);assert.equal(d.node.name,'Wargodvirus xiongnu');assert.equal(d.path[0].name,'Adnaviria');assert.equal(d.path.at(-1).rank,'SPECIES');
 const scoped=await(await handleTaxonomy(req({source:'ictv',mode:'search',q:'virus',within:d.path.at(-2).id}),db)).json();assert(scoped.records.length>0);assert(scoped.records.every(n=>n.parentId===d.path.at(-2).id||n.id===d.path.at(-2).id));sql.close();
});
test('ITIS uses its seven valid roots, literal direct parents, cursor pagination and sourced language',async()=>{
 const roots=fixture('itis-roots');assert.equal(roots.response.docs.length,8);const valid=roots.response.docs.filter(r=>ITIS_ROOT_IDS.includes(r.tsn));assert.equal(valid.length,7);assert(valid.some(r=>r.tsn==='935939'&&r.nameWOInd==='Archaea'));assert(!valid.some(r=>r.nameWOInd==='Monera'));
 const bacteria=itisNode(valid.find(r=>r.tsn==='50'));assert.equal(bacteria.turkishName,undefined);assert(bacteria.commonNames.some(v=>v.language==='English'));
 const actual=fixture('itis-cursor');let url;const page=await externalPage('itis','children','202422','','',{},async u=>{url=new URL(u);return Response.json(actual);});assert.equal(url.searchParams.get('q'),'parentTSN:202422');assert.equal(url.searchParams.get('cursorMark'),'*');assert.equal(page.next,actual.nextCursorMark);assert(page.records.every(n=>n.parentId==='202422'));
 const next=await externalPage('itis','children','202422','',page.next,{},async u=>{assert.equal(new URL(u).searchParams.get('cursorMark'),page.next);return Response.json({...actual,response:{...actual.response,docs:[]},nextCursorMark:page.next});});assert.equal(next.next,null);
});
test('COL retains its source domain/clades, intermediate ranks, authorship and explicit IPNI identifiers',async()=>{
 const info=fixture('col-info'),n=colNode(info);assert.equal(n.name,'Pinus nigra');assert.equal(n.author,'J.F.Arnold');assert.equal(n.turkishName,'Karaçam');assert(n.identifiers.some(id=>id.includes('677088-1')));assert(n.publication.includes('1785'));assert.equal(n.parentId,'C84WJ');
 const path=fixture('col-path').map(r=>colNode(r)).reverse();assert.equal(path[0].rank,'DOMAIN');assert(path.some(n=>n.rank==='SUBKINGDOM'&&n.name==='Pteridobiotina'));assert(path.some(n=>n.rank==='SUBCLASS'));
 const roots=fixture('col-roots');assert(roots.result.some(r=>r.name==='incertae sedis'&&r.rank==='unranked'));const page=await externalPage('col','children','C84WJ','','100',{},async url=>{assert.equal(new URL(url).searchParams.get('offset'),'100');return Response.json(fixture('col-children'));});assert.equal(page.total,152);assert.equal(page.next,'102');assert(page.records.every(n=>n.parentId==='C84WJ'));
});
test('Kew direct childNameUsages are paginated without rank guesses or unlicensed images',async()=>{
 const d=fixture('powo-pinus'),n=powoNode(d);assert.equal(n.childCount,153);assert.equal(n.parentId,'urn:lsid:ipni.org:names:30000468-2');const fetcher=async()=>Response.json(d);let cursor='',all=[];
 do{const page=await externalPage('powo','children',n.id,'',cursor,{},fetcher);assert.equal(page.total,153);all.push(...page.records);cursor=page.next;}while(cursor);assert.equal(all.length,153);assert.equal(new Set(all.map(n=>n.id)).size,153);assert(all.every(v=>v.parentId===n.id));assert(!JSON.stringify(all).includes('cloudfront'));
});
test('persistent cache isolates identical names and releases and records genuine changes',async()=>{
 const {sql,db}=database(),a=colNode(fixture('col-info')),b={...a,id:'homonym',key:'col:316441:homonym',author:'Link',status:'ambiguous synonym'},next={...a,version:'future-release',key:'col:future-release:'+a.id};await saveNodes(db,[a,b,next]);assert.equal((await storedNode(db,'col','homonym','316441')).author,'Link');assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM taxonomy_nodes WHERE source='col' AND name='Pinus nigra'").get().n,3);
 await saveNodes(db,[{...a,parentId:'moved-real-source-parent',retrievedAt:'2026-10-09T00:00:00Z'}]);assert.equal(sql.prepare("SELECT COUNT(*) AS n FROM taxonomy_changes WHERE source='col'").get().n,1);
 const fetcher=async()=>{throw new Error('offline')};const result=await taxonomyDetail('col',a.id,db,fetcher);assert.equal(result.cached,true);assert.equal(result.node.parentId,'moved-real-source-parent');assert.equal((await handleTaxonomy(req({source:'itis',mode:'children',id:'1 OR *:*'}),db,fetcher)).status,400);sql.close();
});

test('live-source details preserve paths, persist the selected record and refresh plans cover every cached page',async()=>{
 const {sql,db}=database();const fetcher=async url=>Response.json(String(url).endsWith('/info')?fixture('col-info'):fixture('col-path'));
 const d=await taxonomyDetail('col','4J2D5',db,fetcher);assert.equal(d.node.turkishName,'Karaçam');assert.equal(d.path.at(-1).id,'4J2D5');assert.equal(d.path[0].name,'Eukaryota');assert.equal((await storedNode(db,'col','4J2D5','316441')).author,'J.F.Arnold');
 for(let i=0;i<80;i++)sql.prepare('INSERT INTO taxonomy_pages(key,source,version,cursor,data,fetched_at) VALUES(?,?,?,?,?,?)').run(JSON.stringify(['col','316441','children','C84WJ','',String(i*36),{}]),'col','316441',String(i*36),'{}','2026-10-08');
 let cursor='',all=[];do{const page=await(await handleTaxonomy(req({mode:'sync-plan',cursor}),db)).json();all.push(...page.records);cursor=page.next;}while(cursor);assert.equal(all.length,80);assert(all.every(v=>v.refresh==='1'&&v.version==='316441'));assert.equal(new Set(all.map(v=>v.cursor)).size,80);sql.close();
});

test('COL common-name search explicitly includes vernacular content and source IDs use exact lookup',async()=>{
 let called;const page=await externalPage('col','search','','Karaçam','',{},async u=>{called=new URL(u);return Response.json({result:[fixture('col-info')],total:1,last:true});});assert.deepEqual(called.searchParams.getAll('content'),['SCIENTIFIC_NAME','VERNACULAR_NAME']);assert.equal(page.records[0].turkishName,'Karaçam');
 const exact=await externalPage('col','search','','4J2D5','',{},async u=>{assert(String(u).endsWith('/taxon/4J2D5/info'));return Response.json(fixture('col-info'));});assert.equal(exact.records[0].id,'4J2D5');
});

test('licensed images reject incorrect taxa, fuzzy identifications and unsupported licenses',async()=>{
 const {sql,db}=database();const photo={type:'StillImage',identifier:'https://images.example/correct.jpg',creator:'Observer',license:'https://creativecommons.org/licenses/by/4.0/'};
 const fetcher=async u=>{const url=String(u);if(url.includes('/occurrence/search'))return Response.json({endOfRecords:true,count:4,results:[{key:1,speciesKey:2435099,species:'Panthera leo',media:[photo]},{key:2,speciesKey:2435098,species:'Panthera tigris',media:[photo]},{key:3,speciesKey:2435099,species:'Panthera leo',issues:['TAXON_MATCH_FUZZY'],media:[photo]},{key:4,speciesKey:2435099,species:'Panthera leo',media:[{...photo,license:'all rights reserved'}]}]});return Response.json(url.endsWith('/parents')?[]:{key:2435099,canonicalName:'Panthera leo',rank:'SPECIES',taxonomicStatus:'ACCEPTED'});};
 const data=await(await handleTaxonomy(req({mode:'images',source:'gbif',id:'2435099'}),db,fetcher)).json();assert.equal(data.images.length,1);assert.equal(data.images[0].subject,'Panthera leo');assert.equal(data.images[0].source,'https://www.gbif.org/occurrence/1');assert.equal(data.images[0].credit,'Observer');assert.equal(data.next,null);sql.close();
});

test('compact cached rows preserve verified profile fields without per-record database round trips',async()=>{
 const {sql,db}=database(),full={...colNode(fixture('col-info')),detailRetrievedAt:'2026-10-08T00:00:00Z'};
 await saveNodes(db,[full]);const child={...full,detailRetrievedAt:undefined,publication:undefined,turkishName:undefined,commonNames:[],synonyms:[],identifiers:[]};await saveNodes(db,[child]);
 const restored=await storedNode(db,'col',full.id,full.version);assert.equal(restored.publication,full.publication);assert.equal(restored.turkishName,'Karaçam');assert.deepEqual(restored.identifiers,full.identifiers);sql.close();
});
