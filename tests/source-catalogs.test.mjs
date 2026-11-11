import test from 'node:test';
import assert from 'node:assert/strict';
import {handleCatalogs} from '../app/api/catalogs/handler.ts';
import {bizimOptions,bizimSpecies,bizimDetail,plainCatalogText,plantnetTaxon} from '../app/catalog-adapters.ts';
import {emptySourceCatalog,readSourceCatalog,sourceCatalogParams} from '../app/source-catalog-query.ts';
const request=q=>new Request('https://example.org/api/catalogs?'+q);
const species='<tr><td>Iridaceae</td><td>Iris albicans Lange</td><td>ak süsen</td><td></td><td><button data-yayilis="o_karadeniz,a_ege,antalya" onclick="showDetails(\'8010\', \'accepted\')">Göster</button></td></tr>';
test('ITIS preserves TSNs, ranked ancestry, CC0 and source citations with bounded queries',async()=>{
 const row={tsn:'183327',nameWOInd:'Pinus contorta',rank:'Species',usage:'accepted',taxonAuthor:'Douglas ex Loudon',hierarchyTSN:['$202422$18030$18035$183327$'],hierarchySoFarWRanks:['183327:$Kingdom:Plantae$Family:Pinaceae$Genus:Pinus$Species:Pinus contorta$'],vernacular:['$lodgepole pine$English$N$127774$2011-07-25$'],updateDate:'2011-07-25 00:00:00',publication:['$PUB$1$A reference$'],images:['unlicensed']};
 const response=await handleCatalogs(request('source=itis&id=183327'),async url=>{assert.equal(url.origin,'https://services.itis.gov');assert.equal(url.searchParams.get('q'),'tsn:183327');assert.equal(url.searchParams.get('rows'),'24');return Response.json({response:{numFound:1,docs:[row]}});});
 const data=await response.json();assert.equal(response.status,200);assert.equal(data.node.id,'183327');assert.equal(data.node.ancestry[1].name,'Pinaceae');assert.equal(data.node.ancestry[1].id,'18030');assert.equal(data.node.genus,'Pinus');assert.equal(data.node.commonName,'lodgepole pine');assert.match(data.node.source,/search_value=183327/);assert.match(data.rights.label,/CC0/);assert(data.retrievedAt);assert.equal(data.node.images,undefined);assert.equal(data.node.gbifId,undefined);
 for(const mode of ['taxa','kingdoms','genera']){const r=await handleCatalogs(request(`source=itis&mode=${mode}&parent=18030&page=2&q=%22%20OR%20*:*`),async url=>{assert.equal(url.searchParams.get('start'),'24');assert.equal(url.searchParams.get('rows'),'24');assert(url.searchParams.getAll('fq').includes('hierarchyTSN:*\\$18030\\$*'));assert(url.searchParams.get('q').includes('\\" OR \\*\\:\\*'));return Response.json({response:{numFound:50,docs:[]}});});assert.equal(r.status,200);assert.equal((await r.json()).hasMore,true);}
});
test('Kew uses official cursor pagination and preserves IPNI identities without importing images or prose',async()=>{
 const row={fqId:'urn:lsid:ipni.org:names:320035-2',name:'Poa annua',rank:'Species',author:'L.',family:'Poaceae',accepted:true,images:[{fullsize:'unlicensed.jpg'}],descriptions:[{text:'Copyrighted prose'}]};
 const query={...emptySourceCatalog,source:'powo',mode:'taxa',page:2,cursor:'next+/='};assert.deepEqual(readSourceCatalog(sourceCatalogParams(query,true)),query);
 const response=await handleCatalogs(request(sourceCatalogParams(query).toString()),async url=>{assert.equal(url.origin,'https://powo.science.kew.org');assert.equal(url.pathname,'/api/2/search');assert.equal(url.searchParams.get('cursor'),'next+/=');assert.equal(url.searchParams.get('perPage'),'24');assert.equal(url.searchParams.get('f'),null);return Response.json({totalResults:80,cursor:'third',results:[row]});});
 const data=await response.json();assert.equal(response.status,200);assert.equal(data.nextCursor,'third');assert.equal(data.hasMore,true);assert.equal(data.records[0].id,row.fqId);assert.equal(data.records[0].taxonomicStatus,'Accepted');assert.equal(data.records[0].images,undefined);assert.equal(data.records[0].description,undefined);assert.match(data.rights.attribution,/Royal Botanic Gardens, Kew/);
 const detail=await handleCatalogs(request('source=powo&id='+encodeURIComponent(row.fqId)),async url=>{assert.equal(url.pathname,'/api/2/taxon/'+row.fqId);assert.equal(url.searchParams.get('fields'),null);return Response.json({...row,authors:'L.',rank:'SPECIES',taxonomicStatus:'Accepted',bibliographicCitation:'IPNI 2026; WCVP 2026',classification:[{fqId:'urn:lsid:ipni.org:names:30000032-2',name:'Poaceae',rank:'FAMILY'}],synonyms:[{name:'Poa aestivalis',author:'J.Presl',taxonomicStatus:'Heterotypic_Synonym'}]});});
 const node=(await detail.json()).node;assert.equal(node.ancestry[0].rank,'family');assert.equal(node.synonyms[0].name,'Poa aestivalis');assert.equal(node.citations[0],'IPNI 2026; WCVP 2026');
});
test('reference catalogue failures cannot masquerade as an empty successful catalogue',async()=>{
 for(const q of ['source=powo&page=2','source=powo&id=https://other.test','source=itis&id=bad','source=plantnet&mode=kingdoms','source=inaturalist&mode=taxa'])assert.equal((await handleCatalogs(request(q),async()=>assert.fail('Invalid request reached upstream'))).status,400);
 for(const source of ['powo','itis'])for(const payload of [{},source==='powo'?{totalResults:1,results:[{fqId:'bad',name:'Fake'}]}:{response:{numFound:1,docs:[{tsn:'bad',nameWOInd:'Fake'}]}}]){const r=await handleCatalogs(request('source='+source),async()=>Response.json(payload));assert.equal(r.status,503);assert.equal(r.headers.get('Cache-Control'),'no-store');}
});
test('catalogue routes retain separate source identifiers, filters and pagination',()=>{
 const query={...emptySourceCatalog,source:'inaturalist',mode:'genera',q:'çam',family:'Pinaceae',familyId:'47367',parent:'47367',page:3};
 assert.deepEqual(readSourceCatalog(sourceCatalogParams(query,true)),query);
 const invalid=readSourceCatalog(new URLSearchParams('catalog-source=bad&catalog-mode=bad&catalog-page=-2&catalog-parent=https://example.org'));
 assert.equal(invalid.source,'plantnet');assert.equal(invalid.mode,'species');assert.equal(invalid.page,1);assert.equal(invalid.parent,'');
});
test('public Pl@ntNet pages are bounded, retain World Flora taxonomy and use the actual source total',async()=>{
 let calls=0;
 const response=await handleCatalogs(request('source=plantnet&mode=species&page=2&q=Cedrus'),async(url,options)=>{
  calls++;assert.equal(url.origin,'https://api.plantnet.org');assert.equal(url.pathname,'/v1/projects/k-world-flora/species');assert.equal(url.searchParams.get('page'),'1');assert.equal(url.searchParams.get('pageSize'),'24');assert.equal(url.searchParams.get('imagesPerSpecies'),'1');assert.equal(url.searchParams.get('illustratedOnly'),'false');assert.equal(options.method,'POST');assert.deepEqual(JSON.parse(options.body),{traits:[]});assert.equal(options.headers.Authorization,undefined);
  return Response.json([{name:'Cedrus libani',author:'A.Rich.',genus:'Cedrus',family:'Pinaceae',commonNames:['Lübnan sediri'],observationsCount:42,images:[{o:'https://example.org/unlicensed.jpg'}]}],{headers:{'full-count':'47'}});
 });
 assert.equal(response.status,200);const d=await response.json();assert.equal(calls,1);assert.equal(d.total,47);assert.equal(d.page,2);assert.equal(d.hasMore,false);assert.equal(d.records[0].id,'Cedrus libani A.Rich.');assert.equal(d.records[0].family,'Pinaceae');assert.equal(d.records[0].images,undefined);assert.match(d.records[0].source,/Cedrus%20libani%20A.Rich./);
});
test('iNaturalist taxonomy uses its own ids and ancestor records rather than GBIF ids',async()=>{
 const r=await handleCatalogs(request('source=inaturalist&id=1234'),async url=>{
  assert.equal(url.pathname,'/v1/taxa/1234');return Response.json({total_results:1,results:[{id:1234,name:'Cedrus libani',rank:'species',preferred_common_name:'Lübnan sediri',ancestors:[{id:47126,name:'Plantae',rank:'kingdom'},{id:47367,name:'Pinaceae',rank:'family'}],observations_count:50}]});
 });const d=await r.json();assert.equal(d.node.id,'1234');assert.equal(d.node.source,'https://www.inaturalist.org/taxa/1234');assert.equal(d.node.ancestry[1].id,'47367');assert.equal(d.node.gbifId,undefined);
});
test('iNaturalist family branches and projects use bounded public queries',async()=>{
 for(const mode of ['genera','projects']){const r=await handleCatalogs(request(`source=inaturalist&mode=${mode}&parent=47367&page=2&q=test`),async url=>{assert.equal(url.searchParams.get('per_page'),'24');assert.equal(url.searchParams.get('page'),'2');assert.equal(url.searchParams.get('q'),'test');assert.equal(url.pathname,mode==='projects'?'/v1/projects':'/v1/taxa');if(mode==='genera')assert.equal(url.searchParams.get('taxon_id'),'47367');return Response.json({total_results:60,results:mode==='projects'?[{id:7,title:'Forest observations',description:'Example'}]:[{id:8,name:'Cedrus',rank:'genus'}]});});const d=await r.json();assert.equal(d.hasMore,true);assert.equal(d.records[0].rank,mode==='projects'?'project':'genus');}
});
test('BizimBitkiler preserves Turkish names, taxonomic rank, source id and actual distribution fields',()=>{
 assert.deepEqual(bizimOptions('<option value="Iridaceae">Iridaceae (Süsengiller)</option>','family')[0],{id:'Iridaceae',name:'Iridaceae',commonName:'Süsengiller',rank:'family',source:'https://bizimbitkiler.org.tr/yeni/demos/technical/'});
 const r=bizimSpecies(species)[0];assert.equal(r.id,'8010');assert.equal(r.name,'Iris albicans Lange');assert.equal(r.canonicalName,'Iris albicans');assert.equal(r.commonName,'ak süsen');assert.deepEqual(r.regions,['o_karadeniz','a_ege','antalya']);assert.equal(r.endemic,false);assert.match(r.source,/\?tur=8010$/);
 const infra=bizimSpecies(species.replace('Iris albicans Lange','Iris test subsp. test').replace('<td></td>','<td>ENDEMİK</td>'))[0];assert.equal(infra.rank,'subspecies');assert.equal(infra.endemic,true);
});
test('BizimBitkiler detail removes executable markup while retaining classification, synonyms and publication references',()=>{
 const html='<ul><li class="list-group-item"><small>Plantae / Bitkiler Alemi</small><span class="badge">Regnum / Alem</span></li></ul><h2>ak süsen</h2><h4>Iris albicans <small>Lange</small></h4><h6>Published in 1861</h6><tbody><tr><td>Iris madonna Sprenger</td><td>1892</td></tr></tbody><script>window.bad()</script>';
 const d=bizimDetail(html,'8010');assert.equal(d.name,'Iris albicans Lange');assert.equal(d.canonicalName,'Iris albicans');assert.equal(d.ancestry[0].name,'Plantae');assert.equal(d.synonyms[0].reference,'1892');assert.equal(d.publishedIn,'Published in 1861');assert.equal(plainCatalogText('<b>A &amp; B</b><script>bad()</script>'),'A & B');
});
test('BizimBitkiler searches scientific and Turkish names without duplicating source records',async()=>{
 const seen=[];const r=await handleCatalogs(request('source=bizimbitkiler&q=süsen&endemic=1&region=a_ege'),async url=>{seen.push(url);assert.equal(url.origin,'https://bizimbitkiler.org.tr');assert.equal(url.searchParams.get('endemik'),'+');assert.equal(url.searchParams.get('selectedRegion[]'),'yayilis_a_ege');return new Response(species.replace('<td></td>','<td>ENDEMİK</td>'));});const d=await r.json();assert.equal(seen.length,2);assert.equal(seen[0].searchParams.get('taxon'),'süsen');assert.equal(seen[1].searchParams.get('trkAdi'),'süsen');assert.equal(d.total,1);assert.equal(d.records.length,1);
});
test('source failures remain explicit and invalid queries never call an upstream',async()=>{
 for(const q of ['source=constructor','source=__proto__','source=bad','source=inaturalist&id=gbif-123','page=-1','page=Infinity','source=bizimbitkiler&region=bad']){const r=await handleCatalogs(request(q),async()=>assert.fail('Invalid query reached upstream'));assert.equal(r.status,400);}
 const r=await handleCatalogs(request('source=plantnet'),async()=>{throw new TypeError('Offline');});assert.equal(r.status,503);assert.equal((await r.json()).error,'SOURCE_UNAVAILABLE');assert.equal(r.headers.get('Cache-Control'),'no-store');
});
