import test from 'node:test';
import assert from 'node:assert/strict';
import {handleGbif,gbifOccurrence,gbifCsv,gbifLicense} from '../app/api/gbif/handler.ts';
import {emptyGbif,gbifParams,gbifSourceParams,gbifTileTemplate,gbifSearchLink,readGbifQuery} from '../app/gbif-query.ts';
const request=q=>new Request('https://example.test/api/gbif?'+q);
const dataset='11111111-2222-4333-a444-555555555555';
const sample={key:123,taxonKey:456,scientificName:'Cedrus libani A.Rich.',acceptedScientificName:'Cedrus libani A.Rich.',kingdom:'Plantae',family:'Pinaceae',genus:'Cedrus',basisOfRecord:'PRESERVED_SPECIMEN',countryCode:'TR',country:'Türkiye',decimalLatitude:39,decimalLongitude:34,coordinateUncertaintyInMeters:50,datasetKey:dataset,license:'http://creativecommons.org/licenses/by/4.0/',issues:['TAXON_MATCH_FUZZY'],informationWithheld:'Exact locality withheld',dataGeneralizations:'Rounded to a grid'};
const upstream=value=>async()=>Response.json(value);
test('invalid GBIF filters and identifiers never reach or broaden the upstream search',async()=>{
 let calls=0;const fetcher=async()=>{calls++;return Response.json({});};
 for(const q of ['country=Turkey','taxonKey=0','taxonKey=../../x','offset=-1','offset=99961','offset=NaN','coordinates=yes','basis=OTHER','dataset=bad','startYear=2020&endYear=2019','startYear=9999','status=maybe','mode=bad','mode=record&id=9007199254740993','mode=dataset&id=bad','mode=taxa&id=../x','mode=record&id=1&format=csv','q='+('a'.repeat(201))])assert.equal((await handleGbif(request(q),fetcher)).status,400,q);
 assert.equal(calls,0);
});
test('list, all-record map and GBIF download link retain the same exact filters',async()=>{
 const q={...emptyGbif,q:'Cedrus Antalya',taxonKey:'456',country:'TR',startYear:'1990',endYear:'2020',basis:'PRESERVED_SPECIMEN',dataset,images:true,status:'PRESENT',offset:40};let source;
 const result=await(await handleGbif(request(gbifParams(q)),async url=>{source=new URL(url);return Response.json({count:1000,results:[sample,sample],endOfRecords:false,facets:[{field:'COUNTRY',counts:[{name:'TR',count:1000}]}]});})).json();
 assert.equal(result.total,1000);assert.equal(result.offset,40);assert.equal(result.records.length,1);assert.equal(result.hasMore,true);
 const p=source.searchParams;for(const [key,value] of gbifSourceParams(q))assert.equal(p.get(key),value,key);assert.equal(p.has('facetMultiselect'),false);
 assert.deepEqual(p.getAll('facet'),['country','basisOfRecord','year','datasetKey']);
 const tile=new URL(gbifTileTemplate(q));assert.equal(decodeURIComponent(tile.pathname),'/v2/map/occurrence/adhoc/{z}/{x}/{y}@1x.png');for(const [key,value] of gbifSourceParams(q))if(!['limit','offset'].includes(key))assert.equal(tile.searchParams.get(key),value,key);
 const download=new URL(gbifSearchLink(q));assert.equal(download.searchParams.get('taxon_key'),'456');assert.equal(download.searchParams.get('dataset_key'),dataset);assert.equal(download.searchParams.get('has_geospatial_issue'),'false');assert.equal(download.searchParams.get('media_type'),'StillImage');assert.equal(download.searchParams.has('offset'),false);
});
test('GBIF source identity, withheld information, uncertainty and quality flags remain intact',()=>{
 const r=gbifOccurrence(sample);assert.equal(r.id,123);assert.equal(r.name,sample.scientificName);assert.deepEqual(r.point,[39,34]);assert.equal(r.uncertainty,50);assert.deepEqual(r.issues,['TAXON_MATCH_FUZZY']);assert.equal(r.informationWithheld,sample.informationWithheld);assert.equal(r.generalization,sample.dataGeneralizations);assert.deepEqual(r.classification.map(c=>c.rank),['kingdom','family','genus']);
 assert.equal(gbifOccurrence({...sample,key:NaN}),null);
 for(const [lat,lng] of [[91,0],[0,181],[NaN,0],['39','34'],[undefined,undefined]])assert.equal(gbifOccurrence({...sample,decimalLatitude:lat,decimalLongitude:lng,verbatimLatitude:'39',verbatimLongitude:'34'}).point,undefined);
});
test('GBIF photos require reusable licensing and attribution before display',()=>{
 assert.equal(gbifLicense('CC_BY_4_0'),'https://creativecommons.org/licenses/by/4.0/');assert.equal(gbifLicense('CC_BY_NC_4_0'),'https://creativecommons.org/licenses/by-nc/4.0/');assert.equal(gbifLicense('Original source license'),'Original source license');
 const media=[{type:'StillImage',identifier:'https://example.org/a.jpg',license:'https://creativecommons.org/licenses/by/4.0/',creator:'Photographer'},{type:'StillImage',identifier:'https://example.org/b.jpg',license:'https://creativecommons.org/licenses/by-nc/4.0/',creator:'Photographer'},{type:'StillImage',identifier:'https://example.org/c.jpg',license:'https://creativecommons.org/licenses/by/4.0/'},{type:'StillImage',identifier:'https://example.org/d.jpg',license:'https://creativecommons.org/publicdomain/zero/1.0/'}];
 const r=gbifOccurrence({...sample,media});assert.equal(r.hasMedia,true);assert.deepEqual(r.photos.map(p=>p.url),['https://example.org/a.jpg','https://example.org/d.jpg']);assert.equal(r.photos[0].credit,'Photographer');
});
test('large result counts retain their true totals and stop at the public search window',async()=>{
 const result=await(await handleGbif(request('offset=99960'),upstream({count:999999999,results:[sample],endOfRecords:false}))).json();assert.equal(result.total,999999999);assert.equal(result.hasMore,false);
 const ended=await(await handleGbif(request('offset=0'),upstream({count:1,results:[sample],endOfRecords:true}))).json();assert.equal(ended.hasMore,false);
});
test('a GBIF outage or invalid source response is never a false zero result',async()=>{
 for(const fetcher of [async()=>{throw new Error('offline');},upstream({count:'bad',results:[]}),async()=>new Response('Unavailable',{status:503})]){const response=await handleGbif(request(''),fetcher);assert.equal(response.status,503);assert.equal((await response.json()).error,'SOURCE_UNAVAILABLE');}
 const empty=await(await handleGbif(request(''),upstream({count:0,results:[],endOfRecords:true}))).json();assert.equal(empty.total,0);assert.deepEqual(empty.records,[]);
});
test('record and dataset details reject an incorrect source identifier',async()=>{
 assert.equal((await handleGbif(request('mode=record&id=124'),upstream(sample))).status,404);
 assert.equal((await handleGbif(request('mode=dataset&id='+dataset),upstream({key:'different'}))).status,404);
 const result=await(await handleGbif(request('mode=record&id=123'),upstream(sample))).json();assert.equal(result.record.id,123);assert(result.retrievedAt);
});
test('dataset provenance survives publisher outages and untrusted homepage markup',async()=>{
 const result=await(await handleGbif(request('mode=dataset&id='+dataset),async url=>{if(url.includes('/organization/'))throw new Error();return Response.json({key:dataset,title:'Herbarium',description:'<p>Source <b>specimens</b></p>',publishingOrganizationKey:dataset,doi:'10.1234/example',citation:{text:'Herbarium (2026). Dataset.'},license:'https://creativecommons.org/licenses/by/4.0/',homepage:'javascript:alert(1)'});})).json();
 assert.equal(result.dataset.title,'Herbarium');assert.equal(result.dataset.description,'Source specimens');assert.equal(result.dataset.publisher,'');assert.equal(result.dataset.homepage,'');assert.equal(result.dataset.doi,'10.1234/example');assert.equal(result.dataset.citation,'Herbarium (2026). Dataset.');
});
test('current-page CSV preserves provenance and quotes potentially active spreadsheet cells',async()=>{
 const csv=gbifCsv([gbifOccurrence({...sample,scientificName:'  =HYPERLINK("bad")',recordedBy:'@name'})]);assert(csv.includes('"\'  =HYPERLINK(""bad"")"'));assert(csv.includes('"\'@name"'));assert(csv.includes('https://www.gbif.org/occurrence/123'));
 const response=await handleGbif(request('format=csv'),upstream({count:5000,results:[sample],endOfRecords:false}));assert.equal(response.headers.get('Content-Type'),'text/csv; charset=utf-8');assert.equal((await response.text()).split('\r\n').length,2);
});
test('canonical GBIF filter state distinguishes worldwide searches and preserves false flags',()=>{
 const state={...emptyGbif,country:'',coordinates:false,excludeIssues:false,images:true,dataset,offset:80};assert.deepEqual(readGbifQuery(gbifParams(state)),state);assert.deepEqual(readGbifQuery(gbifParams(state,true),true),state);
});
