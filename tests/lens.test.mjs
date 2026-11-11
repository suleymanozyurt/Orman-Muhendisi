import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import ts from 'typescript';
import {fullLensCrop,moveLensCrop,lensCropPixels,focusLensCrop,drawLensCrop,lensViewfinder,lensRegionCrop,mapLensRegionBox} from '../app/lens-crop.ts';

test('the captured image matches the visible viewfinder on portrait and landscape screens',()=>{
 assert.deepEqual(lensCropPixels(lensViewfinder(1920,1080,360,640),1920,1080),{x:656,y:0,width:608,height:1080});
 assert.deepEqual(lensCropPixels(lensViewfinder(1080,1920,640,360),1080,1920),{x:0,y:656,width:1080,height:608});
 assert.deepEqual(lensViewfinder(1920,1080,0,640),fullLensCrop);
});

// Use the same TypeScript module adapter as the existing taxonomy tests.
const url=path=>new URL(path,import.meta.url).href;
const code=path=>ts.transpileModule(readFileSync(new URL(path,import.meta.url),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
const moduleURL=value=>'data:text/javascript;base64,'+Buffer.from(value).toString('base64');
const types=moduleURL(code('../app/life-types.ts'));
let catalog=code('../app/life-catalog.ts');
for(const name of ['life-taxonomy','life-images','life-common-names'])catalog=catalog.replace(`"./data/${name}.json"`,JSON.stringify(url(`../app/data/${name}.json`)));
catalog=catalog.replace('"./plant-data"',JSON.stringify(moduleURL(code('../app/plant-data.ts')))).replace('"./life-types"',JSON.stringify(types)).replace('"./botanical-accounts"',JSON.stringify(moduleURL(code('../app/botanical-accounts.ts'))));
let life=code('../app/api/life/handler.ts').replace('"../../life-catalog.ts"',JSON.stringify(moduleURL(catalog))).replace('"../../life-types.ts"',JSON.stringify(types));
for(const name of ['data/tubives.json','data/medicinal-taxa.json','feed-data.ts','resolved-source-cache.ts'])life=life.replace(JSON.stringify('../../'+name),JSON.stringify(url('../app/'+name)));
const lens=code('../app/api/photo-identify/handler.ts').replace('"../life/handler.ts"',JSON.stringify(moduleURL(life))).replace('"../../life-types.ts"',JSON.stringify(types)).replace('"../../lens-evidence.ts"',JSON.stringify(moduleURL(code('../app/lens-evidence.ts'))));
const {handlePhotoIdentify,lensEvidence,lensNextShot}=await import(moduleURL(lens));

const jpeg=new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1]);
function request({headers={},images=[new File([jpeg],'leaf.jpg',{type:'image/jpeg'})],language='tr',queries=[]}={}){
 const form=new FormData();for(const image of images)form.append('image',image);form.append('language',language);
 for(const query of queries)form.append('query',query);
 return new Request('https://example.test/api/photo-identify',{method:'POST',headers:{'oai-authenticated-user-id':'owner',origin:'https://example.test',...headers},body:form});
}
const predicted={subject:'plant',summary:'İğne yapraklı bir ağaç görülüyor; yakın türleri karşılaştır.',candidates:[{scientificName:'Cedrus libani',reason:'Kısa sürgünlerde toplanmış iğne yapraklar görülüyor.'}]};
const gemini=(result=predicted)=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:JSON.stringify(result)}]}}]});
test('Pl@ntNet receives the real multipart photo and only valid species suggestions reach taxonomy',async()=>{
 const availability=await handlePhotoIdentify(new Request('https://example.test/api/photo-identify'),{plantnetKey:'private-key'});assert.deepEqual(await availability.json(),{available:true,provider:'plantnet'});
 const response=await handlePhotoIdentify(request(),{plantnetKey:'private-key',fetcher:async(url,options)=>{assert.equal(url.origin,'https://my-api.plantnet.org');assert.equal(url.pathname,'/v2/identify/all');assert.equal(url.searchParams.get('api-key'),'private-key');assert.equal(options.body.get('organs'),'auto');assert.deepEqual(new Uint8Array(await options.body.get('images').arrayBuffer()),jpeg);return Response.json({results:[{score:.84,species:{scientificNameWithoutAuthor:'Cedrus libani'}},{score:2,species:{scientificNameWithoutAuthor:'Fake species'}}]});}});
 const body=await response.json();assert.equal(response.status,200);assert.equal(body.provider,'plantnet');assert.equal(body.candidates.length,1);assert.equal(body.candidates[0].predictedName,'Cedrus libani');assert.match(body.candidates[0].reason,/%84.0/);assert.match(body.candidates[0].taxonId,/^gbif-/);assert(!JSON.stringify(body).includes('private-key'));
 for(const payload of [new Response('',{status:429}),Response.json({results:null})]){const r=await handlePhotoIdentify(request(),{plantnetKey:'private-key',fetcher:async()=>payload});assert.equal(r.status,503);assert.deepEqual(await r.json(),{error:'IDENTIFICATION_UNAVAILABLE'});}
});
test('photo identification availability exposes no keys and never fabricates missing-service results',async()=>{
 const available=await handlePhotoIdentify(new Request('https://example.test/api/photo-identify'),{geminiKey:'secret',apiKey:'other-secret'});
 assert.deepEqual(await available.json(),{available:true,provider:'gemini'});
 let calls=0;const missing=await handlePhotoIdentify(request(),{fetcher:async()=>{calls++;throw new Error('unexpected');}});
 assert.equal(missing.status,503);assert.deepEqual(await missing.json(),{error:'IDENTIFICATION_NOT_CONFIGURED'});assert.equal(calls,0);
});
test('photo identification requires real user identity and same origin before sending images',async()=>{
 let calls=0;const runtime={geminiKey:'secret',fetcher:async()=>{calls++;return gemini();}};
 assert.equal((await handlePhotoIdentify(request({headers:{'oai-authenticated-user-id':''}}),runtime)).status,401);
 assert.equal((await handlePhotoIdentify(request({headers:{origin:'https://other.test'}}),runtime)).status,403);assert.equal(calls,0);
});
test('invalid, repeated and oversized images never reach the provider',async()=>{
 let calls=0;const runtime={geminiKey:'secret',fetcher:async()=>{calls++;return gemini();}};
 const disguised=new File([new Uint8Array(32)],'leaf.jpg',{type:'image/jpeg'});
 const bad=await handlePhotoIdentify(request({images:[disguised]}),runtime);assert.equal(bad.status,400);assert.equal((await bad.json()).error,'INVALID_IMAGE');
 assert.equal((await handlePhotoIdentify(request({images:[new File([jpeg],'a.jpg',{type:'image/jpeg'}),new File([jpeg],'b.jpg',{type:'image/jpeg'})]}),runtime)).status,400);
 assert.equal((await handlePhotoIdentify(request({headers:{'content-length':'4000000'}}),runtime)).status,413);
 const large=new Request('https://example.test/api/photo-identify',{method:'POST',headers:{'oai-authenticated-user-id':'owner',origin:'https://example.test','content-type':'multipart/form-data; boundary=test'},body:new ReadableStream({start(controller){controller.enqueue(new Uint8Array(3_400_000));controller.close();}}),duplex:'half'});
 assert.equal((await handlePhotoIdentify(large,runtime)).status,413);assert.equal(calls,0);
});
test('Gemini receives the actual image; only source-resolved accepted taxa can be selected',async()=>{
 let call;
 const response=await handlePhotoIdentify(request(),{geminiKey:'secret',fetcher:async(url,options)=>{assert(String(url).startsWith('https://generativelanguage.googleapis.com/'));call=JSON.parse(options.body);return gemini();}});
 const body=await response.json();assert.equal(response.status,200);assert.equal(body.provider,'gemini');
 assert.equal(call.contents[0].parts[0].inline_data.data,Buffer.from(jpeg).toString('base64'));assert.equal(call.contents[0].parts[0].inline_data.mime_type,'image/jpeg');
 assert.equal(call.generationConfig.responseFormat.text.mimeType,'application/json');
 assert.equal(body.candidates[0].predictedName,'Cedrus libani');assert.match(body.candidates[0].taxonId,/^gbif-\d+$/);assert.match(body.candidates[0].source,/^https:\/\/www.gbif.org\/species\/\d+$/);assert.equal(body.candidates[0].reason,predicted.candidates[0].reason);assert.equal('confidence' in body.candidates[0],false);
});
test('OpenAI receives inline vision input with no photo storage or invented source metadata',async()=>{
 let call;
 const response=await handlePhotoIdentify(request({language:'en'}),{apiKey:'secret',fetcher:async(url,options)=>{
  assert.equal(url,'https://api.openai.com/v1/responses');assert.equal(options.headers.Authorization,'Bearer secret');call=JSON.parse(options.body);
  return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(predicted)}]}]});
 }});
 assert.equal(response.status,200);const body=await response.json();assert.equal(body.provider,'openai');assert.equal(call.store,false);assert.equal(call.text.format.strict,true);
 assert.equal(call.input[0].content[1].image_url,'data:image/jpeg;base64,'+Buffer.from(jpeg).toString('base64'));assert.match(call.instructions,/English/);
});
test('image search refinements reach either provider together with the actual photo',async()=>{
 const question='Yaprakları neden sararmış?';
 for(const provider of ['gemini','openai']){
  let call;
  const runtime={...(provider==='gemini'?{geminiKey:'secret'}:{apiKey:'secret'}),fetcher:async(url,options)=>{
   call=JSON.parse(options.body);
   return provider==='gemini'?gemini():Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify(predicted)}]}]});
  }};
  const response=await handlePhotoIdentify(request({queries:['  '+question+'  ']}),runtime);assert.equal(response.status,200);
  const text=provider==='gemini'?call.contents[0].parts[1].text:call.input[0].content[0].text;
  assert(text.endsWith(question));assert.match(text,/Inspect this photo/);
  assert.equal(provider==='gemini'?call.contents[0].parts[0].inline_data.data:call.input[0].content[1].image_url,provider==='gemini'?Buffer.from(jpeg).toString('base64'):'data:image/jpeg;base64,'+Buffer.from(jpeg).toString('base64'));
 }
});
test('oversized, repeated and non-text refinements are rejected before sending the photo',async()=>{
 let calls=0;
 const runtime={geminiKey:'secret',fetcher:async()=>{calls++;return gemini();}};
 for(const queries of [['x'.repeat(321)],['one','two'],[new File(['text'],'question.txt',{type:'text/plain'})]]){
  const response=await handlePhotoIdentify(request({queries}),runtime);assert.equal(response.status,400);assert.deepEqual(await response.json(),{error:'INVALID_QUERY'});
 }
 assert.equal(calls,0);
});
test('unmatched names remain explicitly unselectable when taxonomy is unavailable',async()=>{
 const response=await handlePhotoIdentify(request(),{geminiKey:'secret',fetcher:async url=>String(url).startsWith('https://generativelanguage.googleapis.com/')?gemini({subject:'plant',summary:'Belirsiz.',candidates:[{scientificName:'Fictitious unknownus',reason:'Karşılaştırma gerekiyor.'}]}):new Response('',{status:503})});
 const result=await response.json();assert.equal(response.status,200);assert.equal(result.taxonomyUnavailable,true);assert.equal(result.candidates[0].taxonId,undefined);assert.equal(result.candidates[0].source,undefined);
});
test('non-organisms and genus-only responses are not silently converted into species',async()=>{
 const result=await (await handlePhotoIdentify(request(),{geminiKey:'secret',fetcher:async()=>gemini({subject:'other',summary:'Fotoğrafta bir nesne görülüyor.',candidates:predicted.candidates})})).json();assert.deepEqual(result.candidates,[]);
 const genus=await (await handlePhotoIdentify(request(),{geminiKey:'secret',fetcher:async()=>gemini({subject:'plant',summary:'Cins düzeyinde.',candidates:[{scientificName:'Cedrus',reason:'Tür ayrımı görünmüyor.'}]})})).json();assert.deepEqual(genus.candidates,[]);
});
test('provider rejection and truncated JSON remain errors, without exposing secrets or generic catalogue suggestions',async()=>{
 for(const upstream of [new Response('secret provider failure',{status:429}),Response.json({candidates:[{finishReason:'MAX_TOKENS',content:{parts:[{text:'{}'}]}}]}),gemini({subject:'plant',summary:42,candidates:[]})]){
  const response=await handlePhotoIdentify(request(),{geminiKey:'secret',fetcher:async()=>upstream});assert.equal(response.status,503);assert.deepEqual(await response.json(),{error:'IDENTIFICATION_UNAVAILABLE'});
 }
});
test('crop movements stay within the original photo and do not collapse or flip at a corner',()=>{
 const start={x:.2,y:.2,width:.6,height:.6};
 const moved=moveLensCrop(start,4,-4);assert(Math.abs(moved.x-.4)<1e-8);assert.equal(moved.y,0);assert.equal(moved.width,.6);
 const shrunk=moveLensCrop(start,2,2,'tl');assert(shrunk.width>=.12-1e-8);assert(shrunk.height>=.12-1e-8);assert(shrunk.x+shrunk.width<=1);
 const expanded=moveLensCrop(start,2,2,'br');assert.equal(expanded.x+expanded.width,1);assert.equal(expanded.y+expanded.height,1);
 assert.deepEqual(moveLensCrop(start,NaN,0),start);assert.deepEqual(lensCropPixels(fullLensCrop,1920,1080),{x:0,y:0,width:1920,height:1080});
 const area=lensCropPixels({x:.25,y:.25,width:.5,height:.5},1000,800);assert.deepEqual(area,{x:250,y:200,width:500,height:400});
 const edge=lensCropPixels({x:1,y:1,width:.4,height:.4},1000,800);assert.deepEqual(edge,{x:999,y:799,width:1,height:1});assert.throws(()=>lensCropPixels({x:0,y:0,width:0,height:1},1000,800));
});
test('tap and drawn selections target original-image pixels in every direction, including edges',()=>{
 const centre=focusLensCrop(.5,.5);assert.deepEqual(lensCropPixels(centre,1000,1000),{x:180,y:180,width:640,height:640});
 for(const [x,y] of [[0,0],[1,1],[-1,2],[.9,.1]]){const crop=focusLensCrop(x,y);assert(crop.x>=0&&crop.y>=0&&crop.x+crop.width<=1&&crop.y+crop.height<=1);}
 const forwards=drawLensCrop(.2,.25,.8,.75),backwards=drawLensCrop(.8,.75,.2,.25);
 assert.deepEqual(forwards,backwards);assert.deepEqual(lensCropPixels(forwards,1000,800),{x:200,y:200,width:600,height:400});
 const edge=drawLensCrop(.98,.97,2,2);assert(edge.width>=.12&&edge.height>=.12);assert(edge.x+edge.width<=1&&edge.y+edge.height<=1);
 assert.deepEqual(focusLensCrop(NaN,.5),fullLensCrop);assert.deepEqual(drawLensCrop(0,0,Infinity,.5),fullLensCrop);
});

test("initial viewfinder focus keeps the whole image and returns only real selectable box coordinates",async()=>{
  const form=new FormData();
  form.set("image",new File([new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1])],"field.jpg",{type:"image/jpeg"}));
  form.set("focus","[230,160,740,830]");
  const req=new Request("https://site.test/api/photo-identify",{method:"POST",body:form,headers:{origin:"https://site.test","oai-authenticated-user-id":"owner"}});
  const response=await handlePhotoIdentify(req,{geminiKey:"mock",fetcher:async(_,init)=>{
    const payload=JSON.parse(init.body);
    assert.match(payload.contents[0].parts[1].text,/230, 160, 740, 830/);
    return Response.json({candidates:[{finishReason:"STOP",content:{parts:[{text:JSON.stringify({subject:"plant",summary:"Yaprak ve kozalak",candidates:[],regions:[{label:"Kozalak",box:[200,100,600,500]},{label:"Yanlış",box:[20,100,0,1700]}]})}]}}]});
  }});
  assert.equal(response.status,200);
  const result=await response.json();
  assert.deepEqual(result.regions,[{label:"Kozalak",box:[200,100,600,500]}]);
  const submitted={x:.2,y:.1,width:.5,height:.5};
  const mapped=mapLensRegionBox(result.regions[0].box,submitted);
  assert.deepEqual(mapped,[200,250,400,450]);
  const refined=lensRegionCrop(mapped);
  assert.ok(refined.x<.25&&refined.x+refined.width>.45&&refined.y<.2&&refined.y+refined.height>.4);
});

test('"Neden bu tür?" evidence keeps what the photo shows apart from what it does not',()=>{
 const full=lensEvidence({seen:[' İkili iğne yapraklar ','İkili iğne yapraklar','Koyu, derin çatlaklı kabuk'],notSeen:['Kozalak','İkili iğne yapraklar'],lookalike:'Pinus sylvestris',difference:'Sarıçamda üst gövde kabuğu turuncu-kırmızıdır.'},'Pinus nigra');
 assert.deepEqual(full,{seen:['İkili iğne yapraklar','Koyu, derin çatlaklı kabuk'],notSeen:['Kozalak'],lookalike:{scientificName:'Pinus sylvestris',difference:'Sarıçamda üst gövde kabuğu turuncu-kırmızıdır.'}});
 // A look-alike must be another well-formed species and must come with its deciding difference.
 for(const bad of [{lookalike:'Pinus nigra',difference:'x'},{lookalike:'pinus sylvestris',difference:'x'},{lookalike:'Pinus',difference:'x'},{lookalike:'Pinus sylvestris',difference:''},{lookalike:'Pinus sylvestris',difference:'x'.repeat(321)}])
  assert.deepEqual(lensEvidence({seen:['İğne yaprak'],notSeen:[],...bad},'Pinus nigra'),{seen:['İğne yaprak'],notSeen:[]});
 assert.equal(lensEvidence({seen:[],notSeen:[],lookalike:'',difference:''},'Pinus nigra'),undefined);
 assert.equal(lensEvidence({seen:'yaprak',notSeen:[7,null]},'Pinus nigra'),undefined);assert.equal(lensEvidence(null),undefined);
 assert.equal(lensEvidence({seen:['a','b','c','d','e'],notSeen:['f','g','h','i']}).seen.length,4);assert.equal(lensEvidence({seen:['a'],notSeen:['f','g','h','i']}).notSeen.length,3);
 assert.deepEqual(lensNextShot({part:'cone',reason:' Kozalak iki çamı ayırır. '}),{part:'cone',reason:'Kozalak iki çamı ayırır.'});
 for(const none of [{part:'none',reason:''},{part:'none',reason:'x'},{part:'selfie',reason:'x'},{part:'cone',reason:''},{part:'cone',reason:'x'.repeat(321)},{part:'cone'},null,'cone'])assert.equal(lensNextShot(none),undefined);
});
test('a guided second frame travels with the first one and the answer carries evidence and the next shot',async()=>{
 const first=new File([jpeg],'ilk.jpg',{type:'image/jpeg'}),second=new File([new Uint8Array([...jpeg,9])],'kozalak.jpg',{type:'image/jpeg'});
 const form=new FormData();form.append('image',second);form.append('context',first);form.append('language','tr');
 const send=body=>new Request('https://example.test/api/photo-identify',{method:'POST',headers:{'oai-authenticated-user-id':'owner',origin:'https://example.test'},body});
 const answer={subject:'plant',summary:'İğne yapraklı bir çam.',nextShot:{part:'cone',reason:'Kozalağın sapı ve duruşu iki türü ayırır.'},regions:[],candidates:[
  {scientificName:'Pinus nigra',reason:'İkili, sert ve koyu yeşil iğne yapraklar.',seen:['İkili iğne yapraklar'],notSeen:['Kozalak'],lookalike:'Pinus sylvestris',difference:'Sarıçamda iğneler daha kısa ve mavimsidir.'},
  {scientificName:'Pinus sylvestris',reason:'İkili iğne yapraklar.',seen:[],notSeen:[],lookalike:'',difference:''}]};
 let parts,schema;
 const response=await handlePhotoIdentify(send(form),{geminiKey:'mock',fetcher:async(url,init)=>{if(String(url).includes('generativelanguage')){const payload=JSON.parse(init.body);parts=payload.contents[0].parts;schema=payload.generationConfig.responseFormat.text.schema;return gemini(answer);}return new Response('',{status:503});}});
 const body=await response.json();assert.equal(response.status,200);
 assert.equal(parts.filter(part=>part.inline_data).length,2);assert.equal(parts[0].inline_data.data,Buffer.from([...jpeg,9]).toString('base64'));assert.equal(parts[1].inline_data.data,Buffer.from(jpeg).toString('base64'));assert.match(parts.at(-1).text,/earlier frame of the same individual/);
 assert(schema.required.includes('nextShot'));assert.deepEqual(schema.properties.candidates.items.required,['scientificName','reason','seen','notSeen','lookalike','difference']);
 assert.deepEqual(body.nextShot,answer.nextShot);
 assert.deepEqual(body.candidates[0].evidence,{seen:['İkili iğne yapraklar'],notSeen:['Kozalak'],lookalike:{scientificName:'Pinus sylvestris',difference:'Sarıçamda iğneler daha kısa ve mavimsidir.'}});
 assert.equal('evidence' in body.candidates[1],false);
 // A sufficient photo asks for no further frame, and an older answer without the new fields stays valid.
 const single=new FormData();single.append('image',second);single.append('language','tr');
 const plain=await (await handlePhotoIdentify(send(single),{geminiKey:'mock',fetcher:async url=>String(url).includes('generativelanguage')?gemini({...predicted,nextShot:{part:'none',reason:''}}):new Response('',{status:503})})).json();
 assert.equal('nextShot' in plain,false);assert.equal(plain.candidates.length,1);assert.equal('evidence' in plain.candidates[0],false);
 // The earlier frame is validated like the photo itself.
 for(const bad of [new File(['not an image'],'x.jpg',{type:'image/jpeg'}),new File([jpeg],'x.gif',{type:'image/gif'}),'text']){const invalid=new FormData();invalid.append('image',second);invalid.append('context',bad);assert.equal((await handlePhotoIdentify(send(invalid),{geminiKey:'mock',fetcher:async()=>{throw new Error('must not be called');}})).status,400);}
 const twice=new FormData();twice.append('image',second);twice.append('context',first);twice.append('context',first);assert.equal((await handlePhotoIdentify(send(twice),{geminiKey:'mock',fetcher:async()=>{throw new Error('must not be called');}})).status,400);
});
