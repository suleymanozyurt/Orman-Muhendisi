import assert from 'node:assert/strict';
import test from 'node:test';
import { readFile } from 'node:fs/promises';
import ts from 'typescript';
const gbifSource = await readFile(new URL('../app/gbif-query.ts', import.meta.url), 'utf8');
const gbifCode = ts.transpileModule(gbifSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const gbifUrl = `data:text/javascript;base64,${Buffer.from(gbifCode).toString('base64')}`;
const catalogSource = await readFile(new URL('../app/catalog-state.ts', import.meta.url), 'utf8');
const catalogCode = ts.transpileModule(catalogSource, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText;
const catalogUrl = `data:text/javascript;base64,${Buffer.from(catalogCode).toString('base64')}`;
const { emptyCatalog, readCatalog } = await import(catalogUrl);
const source = await readFile(new URL('../app/navigation.ts', import.meta.url), 'utf8');
const sourceQuery = await readFile(new URL("../app/source-catalog-query.ts", import.meta.url), "utf8");
const sourceQueryUrl = "data:text/javascript;base64," + Buffer.from(ts.transpileModule(sourceQuery, {compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText.replace('"./catalog-types.ts"',JSON.stringify(new URL("../app/catalog-types.ts",import.meta.url).href))).toString("base64");
const code = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022 } }).outputText.replace('"./catalog-state"', JSON.stringify(catalogUrl)).replace('"./source-catalog-query"',JSON.stringify(sourceQueryUrl)).replace('"./gbif-query"', JSON.stringify(gbifUrl));
const { readSiteRoute, siteRouteUrl } = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
const base = new URL('https://example.test/?view=flora-record&flora=20&species=stale&taxon=stale#gozlem-old');

test('source-specific taxonomy identity, release and view survive sharing and history',()=>{
 for(const route of [{view:'discover',treeSource:'col',treeId:'4J2D5',treeVersion:'316441',treeMode:'tree'}, {view:'discover',treeSource:'powo',treeId:'urn:lsid:ipni.org:names:677088-1',treeVersion:'live',treeMode:'list'},{view:'assistant',treeSource:'ictv',treeId:'ICTV202420188',treeVersion:'MSL41.v1',q:'Bu taksonu açıkla'}]){
  const url=siteRouteUrl(base,route),restored=readSiteRoute(url.searchParams);for(const [key,value] of Object.entries(route))assert.equal(restored[key],value);
  assert(!siteRouteUrl(url,{view:'home'}).searchParams.has('treeId'));
 }
});

test('GBIF research filters, world scope and every tab survive refresh and back links',async()=>{
 const {emptyGbif}=await import(gbifUrl);const gbif={...emptyGbif,q:'Cedrus Antalya',country:'',startYear:'1990',endYear:'2020',taxonKey:'2685484',images:true,coordinates:false,offset:80};
 for(const tab of ['records','map','statistics','datasets']){const url=siteRouteUrl(base,{view:'gbif',gbif,tab}),restored=readSiteRoute(url.searchParams);assert.equal(restored.view,'gbif');assert.equal(restored.tab,tab);assert.deepEqual(restored.gbif,gbif);assert.equal(restored.flora,undefined);assert.equal(restored.species,undefined);const home=siteRouteUrl(url,{view:'home'});assert(![...home.searchParams.keys()].some(key=>key.startsWith('gbif-')));}
});

test('species map links retain their taxon across a reload and discard stale record identifiers', () => {
 const url = siteRouteUrl(base, { view: 'global-species', taxon: 'Cedrus libani' });
 assert.equal(url.searchParams.has('species'), false); assert.equal(url.searchParams.has('flora'), false); assert.equal(url.hash, '');
 const restored = readSiteRoute(url.searchParams);
 assert.equal(restored.view, 'global-species'); assert.equal(restored.taxon, 'Cedrus libani');
});
test('an observation map link restores its selected record, mode and species', () => {
 const route = { view: 'map', map: 'community', plant: 'cedrus-libani', observation: 'observation-42' };
 const restored = readSiteRoute(siteRouteUrl(base, route).searchParams);
 for (const key of ['view', 'map', 'plant', 'observation']) assert.deepEqual(restored[key], route[key]);
});
test('species tabs, flora records, comparison, saved and following feeds have independent permanent links', () => {
 for (const route of [{ view: 'detail', species: 'cedrus-libani', tab: 'Yayılış' }, { view: 'flora-record', flora: 2161, tab:'Yaprak' }, { view: 'compare', compare: ['cedrus-libani', 'pinus-pinea'] }, { view: 'home', feed: 'saved' }, { view: 'home', feed: 'following' }, { view: 'glossary', q: 'Yaprak' }]) {
  const restored = readSiteRoute(siteRouteUrl(base, route).searchParams);
  for (const key of Object.keys(route)) assert.deepEqual(restored[key], route[key]);
 }
});
test('old direct species links work and incomplete detail links lead to a usable section', () => {
 assert.equal(readSiteRoute(new URLSearchParams('species=cedrus-libani')).view, 'detail');
 assert.equal(readSiteRoute(new URLSearchParams('view=global-species')).view, 'map');
 assert.equal(readSiteRoute(new URLSearchParams('view=detail')).view, 'database');
 assert.equal(readSiteRoute(new URLSearchParams('view=unknown')).view, 'home');
});

test('catalogue filters, page and layout survive profile links and returning to results', () => {
 const state = {...emptyCatalog,q:'Cedrus Antalya',family:'Pinaceae',genus:'Cedrus',provinces:['Antalya','Mersin'],grid:'C3',endemic:true,rank:'variety',life:'Çok yıllık',form:'Ağaç',sort:'common',offset:96,layout:'cards'};
 const profile = siteRouteUrl(base,{view:'flora-record',flora:2161,from:'database',catalogState:state});
 const restored = readSiteRoute(profile.searchParams);
 assert.equal(restored.from,'database'); assert.deepEqual(restored.catalogState,state);
 const back = readSiteRoute(siteRouteUrl(profile,{view:restored.from,catalogState:restored.catalogState}).searchParams);
 assert.deepEqual(back.catalogState,state); assert.equal(back.flora,undefined);
 const home = siteRouteUrl(profile,{view:'home'});
 for(const key of ['q','family','genus','provinces','grid','endemic','rank','life','form','sort','offset','layout','from','flora']) assert.equal(home.searchParams.has(key),false,key);
});
test('malformed catalogue pagination and unknown view options recover to defaults', () => {
 for(const offset of ['-48','NaN','Infinity','100001','2.5']) assert.equal(readCatalog(new URLSearchParams({offset})).offset,0);
 assert.equal(readCatalog(new URLSearchParams('offset=49')).offset,48);
 assert.deepEqual(readCatalog(new URLSearchParams('provinces=Antalya&provinces=Antalya')).provinces,['Antalya']);
 assert.equal(readCatalog(new URLSearchParams('sort=broken&layout=broken&rank=broken')).sort,'scientific');
});
test('opening a photo catalogue species retains the catalogue on return', () => {
 const restored=readSiteRoute(siteRouteUrl(base,{view:'detail',species:'cedrus-libani',from:'database',catalog:'curated',catalogState:{...emptyCatalog,q:'sedir'}}).searchParams);
 assert.equal(restored.catalog,'curated');assert.equal(restored.catalogState.q,'sedir');assert.equal(restored.from,'database');
});
test('assistant prompts and return destinations survive direct links',()=>{
 const restored=readSiteRoute(siteRouteUrl(base,{view:'assistant',q:'Lübnan sediri hakkında bilgi ver'}).searchParams);assert.equal(restored.view,'assistant');assert.equal(restored.q,'Lübnan sediri hakkında bilgi ver');
 const profile=readSiteRoute(siteRouteUrl(base,{view:'detail',species:'cedrus-libani',from:'assistant'}).searchParams);assert.equal(profile.from,'assistant');
});

test('taxonomy branches, tabs and non-taxonomic collections retain separate permanent routes',()=>{
 for(const route of [{view:'discover',entry:'gbif-4689',tab:'classification'},{view:'discover',entry:'domain-eukarya',tab:'map'},{view:'discover',topic:'endemic',tab:'overview'},{view:'discover',tab:'photos',q:'Cedrus'}]){const restored=readSiteRoute(siteRouteUrl(base,route).searchParams);for(const key of Object.keys(route))assert.equal(restored[key],route[key]);}
 const home=siteRouteUrl(new URL('https://example.org/?view=discover&entry=gbif-6&topic=endemic&tab=map'),{view:'home'});for(const key of ['entry','topic','tab'])assert.equal(home.searchParams.has(key),false);
});

test('unified search query survives a shareable URL and species links retain search as the back destination',()=>{
 const search=siteRouteUrl(base,{view:'search',q:'Lübnan sediri'});
 const restored=readSiteRoute(search.searchParams);
 assert.equal(restored.view,'search');assert.equal(restored.q,'Lübnan sediri');
 const detail=readSiteRoute(siteRouteUrl(search,{view:'detail',species:'cedrus-libani',from:'search',tab:'Yaprak'}).searchParams);
 assert.equal(detail.from,'search');assert.equal(detail.tab,'Yaprak');
});
