import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
const url=p=>new URL(p,import.meta.url).href;
const code=p=>ts.transpileModule(readFileSync(new URL(p,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleURL=c=>'data:text/javascript;base64,'+Buffer.from(c).toString('base64');
const types=moduleURL(code('../app/life-types.ts')),plants=moduleURL(code('../app/plant-data.ts'));
let catalog=code('../app/life-catalog.ts');
for(const name of ['life-taxonomy','life-images','life-common-names'])catalog=catalog.replace(`"./data/${name}.json"`,JSON.stringify(url(`../app/data/${name}.json`)));
catalog=catalog.replace('"./plant-data"',JSON.stringify(plants)).replace('"./life-types"',JSON.stringify(types));
catalog=catalog.replace('"./botanical-accounts"',JSON.stringify(moduleURL(code('../app/botanical-accounts.ts'))));
const catalogURL=moduleURL(catalog),{lifeGroups,lifeArchive,lifeTaxon,archiveLifePage}=await import(catalogURL);
const {lifeRanks:ranks}=await import(types);
let handler=code('../app/api/life/handler.ts').replace('"../../life-catalog.ts"',JSON.stringify(catalogURL)).replace('"../../life-types.ts"',JSON.stringify(types)).replace('"../../data/tubives.json"',JSON.stringify(url('../app/data/tubives.json'))).replace('"../../data/medicinal-taxa.json"',JSON.stringify(url('../app/data/medicinal-taxa.json'))).replace('"../../feed-data.ts"',JSON.stringify(url('../app/feed-data.ts')));
handler=handler.replace('"../../resolved-source-cache.ts"',JSON.stringify(url('../app/resolved-source-cache.ts')));
const {handleLife}=await import(moduleURL(handler));
const request=q=>new Request('https://example.org/api/life?'+q),unavailable=async()=>{throw new Error('Offline');};

test('seven source kingdoms, contextual domains and every requested rank remain distinct',()=>{
 assert.equal(lifeGroups.length,7);assert.equal(ranks.length,20);
 assert.deepEqual(lifeGroups.map(g=>lifeArchive.records[g.key].canonicalName),['Plantae','Fungi','Animalia','Chromista','Protozoa','Bacteria','Archaea']);
 for(const g of lifeGroups){const p=archiveLifePage('gbif-'+g.key);assert.equal(p.node.rank,'KINGDOM');assert.equal(p.node.status,'ACCEPTED');assert.equal(p.ancestry[1].rank,'DOMAIN');assert.equal(p.ancestry[1].status,'CONTEXT');assert(p.node.images[0].license);assert(p.node.images[0].source);assert(p.children.every(c=>c.parentId===p.node.id));}
 assert(!lifeGroups.some(g=>lifeArchive.records[g.key].canonicalName==='Viruses'));
});
test('family opens genera, genus opens species, and only source ranks enter the path',()=>{
 const family=archiveLifePage('gbif-4689');assert(family.children.some(n=>n.scientificName.startsWith('Quercus')));assert(family.children.some(n=>n.scientificName.startsWith('Fagus')));assert(family.children.some(n=>n.scientificName.startsWith('Castanea')));assert(family.children.every(n=>n.rank==='GENUS'));
 const genus=archiveLifePage('gbif-2435194');assert(genus.children.some(n=>n.scientificName.startsWith('Panthera leo')));assert(genus.children.every(n=>n.parentId===genus.node.id));
 assert.deepEqual(genus.ancestry.slice(2).map(n=>n.id),[...lifeArchive.parents['2435194'].map(r=>'gbif-'+r.key),'gbif-2435194']);
 assert(!genus.ancestry.some(n=>n.rank==='SUBCLASS'));
});
test('higher ranks cannot inherit a species photograph or morphology and accepted names retain identity',()=>{
 const genus=lifeTaxon({key:9,canonicalName:'Cedrus',scientificName:'Cedrus',rank:'GENUS',taxonomicStatus:'ACCEPTED'});assert.equal(genus.localPlantId,undefined);assert.deepEqual(genus.images,[]);assert.deepEqual(genus.traits,[]);
 const generic=lifeTaxon({key:1,canonicalName:'Animalia',scientificName:'Animalia',rank:'KINGDOM',taxonomicStatus:'ACCEPTED'},{descriptions:{results:[{description:'This fossil fragment has five vertebrae',type:'description',taxonKey:1,sourceTaxonKey:777}]}});assert.equal(generic.description,undefined);
 const synonym=lifeTaxon({key:11,canonicalName:'Examplea minor',scientificName:'Examplea minor L.',rank:'SPECIES',taxonomicStatus:'SYNONYM',acceptedKey:12,accepted:'Examplea major L.'});assert.equal(synonym.id,'gbif-11');assert.equal(synonym.acceptedId,'gbif-12');assert.equal(synonym.status,'SYNONYM');assert.equal(synonym.conservation,undefined);assert.equal(synonym.endemic,undefined);
});
test('invalid map and pagination inputs never broaden a query or reach the source',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json({});};
 for(const q of ['id=gbif-0','id=../../other','offset=-1','offset=2.5','bounds=NaN,35,40,43','bounds=40,35,25,43','bounds=-181,35,40,43','country=Turkey','mode=bad'])assert.equal((await handleLife(request(q),fetcher)).status,400,q);
 assert.equal(calls,0);
});
test('archived branches work offline and an unavailable new branch is never silently empty',async()=>{
 const archived=await(await handleLife(request('id=gbif-4689'),unavailable)).json();assert.equal(archived.cached,true);assert(archived.children.length>0);assert(archived.retrievedAt);
 assert.equal((await handleLife(request('id=gbif-9999999999'),unavailable)).status,503);
 const child=Object.values(lifeArchive.records).find(r=>r.rank==='GENUS'&&!lifeArchive.children[r.key]);const fallback=await(await handleLife(request('id=gbif-'+child.key),unavailable)).json();assert.equal(fallback.unavailable,true);
});
test('the living world map queries all seven kingdoms, keeps coordinates and source identities',async()=>{
 let query;const fetcher=async value=>{query=new URL(value);return Response.json({count:300,endOfRecords:true,results:[{key:20,speciesKey:25,species:'Example species',decimalLatitude:40,decimalLongitude:29,country:'Türkiye',eventDate:'2024-10-01T12:00:00'},{key:21,speciesKey:25,decimalLatitude:999,decimalLongitude:29}]});};
 const d=await(await handleLife(request('mode=occurrences&id=life&country=TR&bounds=26,35,30,42'),fetcher)).json();assert.equal(d.total,300);assert.equal(d.records.length,1);assert.deepEqual(d.records[0].point,[40,29]);assert.equal(d.records[0].taxonId,'gbif-25');assert.equal(d.records[0].source,'https://www.gbif.org/occurrence/20');assert.equal(query.searchParams.get('country'),'TR');assert.equal(query.searchParams.getAll('kingdomKey').length,7);assert.match(query.searchParams.get('geometry'),/^POLYGON/);
 await handleLife(request('mode=occurrences&id=domain-archaea'),fetcher);assert.deepEqual(query.searchParams.getAll('kingdomKey'),['2']);
});
test('search preserves every rank, exact resolution rejects higher-rank guesses and fallback is labelled',async()=>{
 let query;const fetcher=async u=>{query=new URL(u);return Response.json({results:[{key:90,canonicalName:'Exampleaceae',scientificName:'Exampleaceae',rank:'FAMILY',taxonomicStatus:'ACCEPTED'}],endOfRecords:false});};
 const d=await(await handleLife(request('mode=search&q=Example&offset=24'),fetcher)).json();assert.equal(d.records[0].rank,'FAMILY');assert.equal(d.nextOffset,48);assert.equal(query.searchParams.get('datasetKey'),lifeArchive.datasetId);assert.equal(query.searchParams.get('rank'),null);
 const exact=await(await handleLife(request('mode=resolve&name=Quercus'),unavailable)).json();assert.equal(exact.taxon.rank,'GENUS');
 const higher=await(await handleLife(request('mode=resolve&name=Never%20existed'),async()=>Response.json({usageKey:6,matchType:'HIGHERRANK'}))).json();assert.equal(higher.taxon,null);assert.equal(higher.unmatched,true);
 const fallback=await(await handleLife(request('mode=search&q=Cedrus'),unavailable)).json();assert.equal(fallback.cached,true);assert(fallback.records.length>0);
});
test('endemics and seasonal selections are supported by exact flora fields, not inferred ancestry',async()=>{
 const flora=JSON.parse(readFileSync(new URL('../app/data/tubives.json',import.meta.url),'utf8')).records;
 const endemic=await(await handleLife(request('mode=collections&collection=endemic'),unavailable)).json();assert(endemic.total>0);for(const hit of endemic.flora)assert.equal(flora.find(r=>r.id===hit.id).endemism.toLocaleLowerCase('tr'),'endemik');
 const season=await(await handleLife(request('mode=collections&collection=season'),unavailable)).json();const m=new Date().getUTCMonth()+1;for(const hit of season.flora){const r=flora.find(r=>r.id===hit.id);const[a,b]=r.flowering.split(/[-–]/).map(Number);assert(a<=b?m>=a&&m<=b:m>=a||m<=b);}
 const medical=await(await handleLife(request('mode=collections&collection=medicinal'),unavailable)).json();assert.equal(medical.total,2);for(const hit of medical.flora){assert.equal(flora.find(r=>r.id===hit.id).rank,'species');assert(hit.monograph.source.startsWith('https://www.ema.europa.eu/'));}
});

test('flora enrichment preserves exact name, rank and source scope instead of inheriting subtaxon information',async()=>{
 const pine=await(await handleLife(request('id=gbif-5285165'),unavailable)).json();
 assert(pine.node.floraRecords.length>0);
 const flora=JSON.parse(readFileSync(new URL('../app/data/tubives.json',import.meta.url),'utf8')).records;
 for(const record of pine.node.floraRecords){const raw=flora.find(r=>r.id===record.id);assert.equal(raw.name,'Pinus pinea');assert.equal(raw.rank.toUpperCase(),pine.node.rank);assert.equal(record.source,raw.source);assert(record.fields.some(f=>f.label==='Habitat'&&f.value===raw.habitat));}
 const cedar=await(await handleLife(request('id=gbif-5284682'),unavailable)).json();assert.equal(cedar.node.floraRecords.length,0);
 const family=await(await handleLife(request('id=gbif-4689'),unavailable)).json();assert.equal(family.node.floraRecords,undefined);
});

test('source covers reject guessed identifications, wrong species and uncredited restricted photos',async()=>{
 const media=(license,creator='Photographer')=>[{type:'StillImage',identifier:'https://example.org/lion.jpg',license,creator}];
 const by='https://creativecommons.org/licenses/by/4.0/';let query;
 const rows=[
  {key:1,speciesKey:5219404,species:'Panthera leo',issues:['TAXON_MATCH_HIGHERRANK'],media:media(by)},
  {key:2,speciesKey:99,species:'Wrong species',media:media(by)},
  {key:3,speciesKey:5219404,species:'Panthera leo',media:media('https://creativecommons.org/licenses/by-nc/4.0/')},
  {key:4,speciesKey:5219404,species:'Panthera leo',media:media(by,'')},
  {key:5,speciesKey:5219404,species:'Panthera leo',media:media(by)}
 ];
 const d=await(await handleLife(request('mode=cover&id=gbif-5219404'),async u=>{query=new URL(u);return Response.json({results:rows,endOfRecords:true});})).json();
 assert.equal(d.image.source,'https://www.gbif.org/occurrence/5');assert.equal(d.image.credit,'Photographer');assert.equal(d.image.subject,'Panthera leo');assert.equal(query.searchParams.get('checklistKey'),lifeArchive.datasetId);assert.equal(query.searchParams.get('limit'),'12');
 const empty=await(await handleLife(request('mode=cover&id=gbif-5219404'),async()=>Response.json({results:rows.slice(0,4)}))).json();assert.equal(empty.image,null);
});

test('media pagination keeps every licensed photograph from each source page',async()=>{
 const rows=Array.from({length:24},(_,index)=>({key:index+1,speciesKey:5219404,species:'Panthera leo',media:Array.from({length:2},(_,p)=>({type:'StillImage',identifier:`https://example.org/${index}-${p}.jpg`,license:'https://creativecommons.org/licenses/by/4.0/',creator:'Photographer'}))}));
 const d=await(await handleLife(request('mode=media&id=gbif-5219404&offset=24'),async()=>Response.json({results:rows,endOfRecords:false}))).json();assert.equal(d.images.length,48);assert.equal(d.nextOffset,48);assert.equal(d.hasMore,true);
});

test('year range validation never broadens invalid requests and retains period while paginating',async()=>{
 let query,calls=0;const fetcher=async u=>{calls++;query=new URL(u);return Response.json({results:[],count:0,endOfRecords:true});};
 for(const year of ['1499,2020','2020,1510','1500,9999','2020','1500,x','1,2'])assert.equal((await handleLife(request('mode=occurrences&year='+year),fetcher)).status,400,year);
 assert.equal(calls,0);const current=new Date().getFullYear();
 const d=await(await handleLife(request(`mode=occurrences&id=gbif-5219404&year=1500,${current}&offset=120`),fetcher)).json();assert.equal(query.searchParams.get('year'),`1500,${current}`);assert.equal(query.searchParams.get('offset'),'120');assert.equal(query.searchParams.get('checklistKey'),lifeArchive.datasetId);assert.equal(d.nextOffset,240);
});

test('a species never appears as its own descendant and non-species results are excluded',async()=>{
 const raw=lifeArchive.records['5219404'];const d=await(await handleLife(request('mode=species&id=gbif-5219404'),async()=>Response.json({results:[raw,{...raw,key:999,rank:'SUBSPECIES'},{...raw,key:998,taxonomicStatus:'SYNONYM'}],endOfRecords:true,count:3}))).json();assert.deepEqual(d.records,[]);
});

test('verified bilingual morphology applies only to an exact species and describes conifers without invented flowers',()=>{
 const cedar=archiveLifePage('gbif-5284682').node;
 assert(cedar.descriptionEnglish);const reproduction=cedar.traits.find(t=>t.label==='Üreme / çiçek / meyve');assert(reproduction.english.includes('No flowers or true fruits'));assert.equal(reproduction.source,'https://www.conifers.org/pi/Cedrus_libani.php');
 const child=lifeTaxon({key:99,canonicalName:'Cedrus libani',scientificName:'Cedrus libani',rank:'SUBSPECIES',taxonomicStatus:'ACCEPTED'});assert.deepEqual(child.traits,[]);assert.equal(child.localPlantId,undefined);
});

test('instant archive suggestions return real family and animal entries without an external request',async()=>{
 let calls=0;const external=async()=>{calls++;throw new Error('This path must stay local');};
 for(const [query,name,rank] of [['Fagaceae','Fagaceae','FAMILY'],['Panthera','Panthera','GENUS']]){
  const response=await handleLife(request(`mode=search&scope=archive&q=${query}`),external);
  assert.equal(response.status,200);const data=await response.json();assert.equal(data.cached,true);
  assert(data.records.some(record=>record.scientificName.startsWith(name)&&record.rank===rank),query);
 }
 assert.equal(calls,0);
 const short=await(await handleLife(request('mode=search&scope=archive&q=x'),external)).json();assert.deepEqual(short.records,[]);assert.equal(calls,0);
});
