import test from 'node:test';
import assert from 'node:assert/strict';
import {mapAreaGeometry,mapAreaSegments,mapFitBounds,nearbyMapBounds,readMapBounds,viewportMapBounds} from '../app/map-area.ts';
import {GET} from '../app/api/explore/route.ts';

test('map areas retain dateline selection, normalize world copies and reject invalid coordinates',()=>{
 const area=readMapBounds('170,-20,-170,30');
 assert.deepEqual(area,[170,-20,-170,30]);
 assert.deepEqual(mapFitBounds(area),[[-20,170],[30,190]]);
 assert.deepEqual(mapAreaGeometry(area),['POLYGON((170 -20,180 -20,180 30,170 30,170 -20))','POLYGON((-180 -20,-170 -20,-170 30,-180 30,-180 -20))']);
 assert.deepEqual(viewportMapBounds(530,-20,550,30),area);
 assert.deepEqual(viewportMapBounds(-240,-90,240,90),[-180,-85,180,85]);
 assert.equal(mapAreaGeometry([-180,-60,180,80]).length,2);
 assert(mapAreaSegments([45,-20,25,30]).every(([w,s,e,n])=>e-w<=180));
 for(const invalid of ['0,0,0,1','181,0,20,1','1,,2,3','1,1,2,1','1,-86,2,2','1,2,3,NaN'])assert.equal(readMapBounds(invalid),null);
 const near=nearbyMapBounds(37,30);assert(near[0]<30&&near[2]>30&&near[1]<37&&near[3]>37);
 assert(near[3]-near[1]<.46);
 assert(nearbyMapBounds(0,179.99)[0]>nearbyMapBounds(0,179.99)[2]);
 assert.equal(nearbyMapBounds(91,30),null);assert.equal(nearbyMapBounds(37,30,101),null);
});

test('world queries have no implicit country or Turkish extent and validate scope before fetching',async()=>{
 const original=globalThis.fetch;const queries=[];
 globalThis.fetch=async url=>{queries.push(new URL(url));return Response.json({count:0,results:[]});};
 try{
  for(const invalid of ['bounds=181,0,30,40','group=unrecognized','key=abc','key=0','key=-2'])assert.equal((await GET(new Request(`https://example.test/api/explore?${invalid}`))).status,400);
  assert.equal(queries.length,0);
  const response=await GET(new Request('https://example.test/api/explore?group=all'));assert.equal(response.status,200);
  assert.equal(queries[0].searchParams.has('country'),false);assert.equal(queries[0].searchParams.has('geometry'),false);assert.equal(queries[0].searchParams.has('kingdomKey'),false);
  assert.equal((await GET(new Request('https://example.test/api/explore?bounds=170,-20,-170,30&group=fungi'))).status,200);
  assert.equal(queries[1].searchParams.get('kingdomKey'),'5');assert.deepEqual(queries[1].searchParams.getAll('geometry'),mapAreaGeometry([170,-20,-170,30]));
 }finally{globalThis.fetch=original;}
});

test('public occurrence names reuse full facet counts and omit invalid coordinates',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async()=>{calls++;return Response.json({count:10345,facets:[{field:'SPECIES_KEY',counts:[{name:'2435099',count:10001},{name:'invalid',count:4}]}],results:[{key:123,speciesKey:2435099,species:'Panthera leo',family:'Felidae',decimalLatitude:-2.1,decimalLongitude:31.5},{key:124,speciesKey:2435099,species:'Panthera leo',decimalLatitude:NaN,decimalLongitude:31.5},{key:125,decimalLatitude:-91,decimalLongitude:40}]});};
 try{
  const response=await GET(new Request('https://example.test/api/explore?group=animals&country=TZ'));const data=await response.json();
  assert.equal(response.status,200);assert.equal(calls,1);assert.equal(data.count,10345);assert.equal(data.species.length,1);assert.equal(data.species[0].count,10001);assert.equal(data.species[0].name,'Panthera leo');assert.equal(data.records.length,1);assert.equal(data.records[0].id,123);
 }finally{globalThis.fetch=original;}
});

test('ambiguous names cannot silently identify a species and wrong kingdom keys cannot broaden selection',async()=>{
 const original=globalThis.fetch;let calls=0;
 globalThis.fetch=async url=>{calls++;return new URL(url).pathname.endsWith('/match')?Response.json({usageKey:987,matchType:'FUZZY',rank:'SPECIES'}):Response.json({key:987,kingdom:'Animalia'});};
 try{
  const ambiguous=await GET(new Request('https://example.test/api/explore?name=Uncertainus%20testus&group=plants'));assert.equal((await ambiguous.json()).unmatched,true);assert.equal(calls,1);
  assert.equal((await GET(new Request('https://example.test/api/explore?key=987&group=plants'))).status,400);assert.equal(calls,2);
 }finally{globalThis.fetch=original;}
});

test('invalid source responses remain unavailable instead of showing invented zero records',async()=>{
 const original=globalThis.fetch;globalThis.fetch=async()=>Response.json({count:'unknown',results:[]});
 try{assert.equal((await GET(new Request('https://example.test/api/explore?group=all&country=IS&year=1601'))).status,502);}finally{globalThis.fetch=original;}
});
