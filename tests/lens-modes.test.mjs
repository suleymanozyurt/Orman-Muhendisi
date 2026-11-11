import test from 'node:test';
import assert from 'node:assert/strict';
import {handleLensMode} from '../app/api/lens-mode/handler.ts';
import {lensPcmWav} from '../app/lens-modes.ts';
import {lensViewfinder} from '../app/lens-crop.ts';

const jpg=new File([new Uint8Array([255,216,255,224,0,16,74,70,73,70,0,1])],'test.jpg',{type:'image/jpeg'});
function request(mode,fields={},headers={}){
 const form=new FormData();form.set('image',jpg);form.set('mode',mode);for(const [key,value] of Object.entries(fields))form.set(key,value);
 return new Request('https://site.test/api/lens-mode',{method:'POST',body:form,headers:{origin:'https://site.test','oai-authenticated-user-id':'owner',...headers}});
}
const output=part=>Response.json({candidates:[{content:{parts:[part]}}]});
const jsonOutput=value=>output({text:JSON.stringify(value)});

test('Lens translation stays private and only positions valid translated text on the photo',async()=>{
 let sent=0;
 const runtime={geminiKey:'test',fetcher:async(_url,options)=>{
  sent++;const body=JSON.parse(options.body);
  assert.equal(body.contents[0].parts[0].inlineData.mimeType,'image/jpeg');
  assert.equal(body.contents[0].parts[1].text,'Target language: French');
  return jsonOutput({sourceLanguage:'English',original:'Trail',translation:'Sentier',blocks:[{text:'Sentier',box:[100,150,200,400]},{text:'bad',box:[200,700,100,800]}]});
 }};
 assert.equal((await handleLensMode(request('translate',{}, {'oai-authenticated-user-id':''}),runtime)).status,401);
 assert.equal((await handleLensMode(request('translate',{}, {origin:'https://other.test'}),runtime)).status,403);
 assert.equal(sent,0);
 const response=await handleLensMode(request('translate',{target:'fr'}),runtime);
 assert.equal(response.status,200);
 assert.deepEqual(await response.json(),{sourceLanguage:'English',original:'Trail',translation:'Sentier',blocks:[{text:'Sentier',box:[100,150,200,400]}]});
 assert.equal(response.headers.get('cache-control'),'no-store');
});

test('a voice turn passes the photo, valid PCM audio and recent turns to the visual model',async()=>{
 const pcm=lensPcmWav(new Float32Array([-1,0,1]));const view=new DataView(pcm.buffer);
 assert.equal(view.getUint32(24,true),16000);assert.equal(view.getUint32(40,true),6);
 assert.equal(view.getInt16(44,true),-32768);assert.equal(view.getInt16(48,true),32767);
 const audio=new File([pcm],'voice.wav',{type:'audio/wav'});
 const response=await handleLensMode(request('talk',{audio,context:'Previous turn'}),{geminiKey:'test',fetcher:async(_url,options)=>{
  const parts=JSON.parse(options.body).contents[0].parts;
  assert.equal(parts[1].inlineData.data,Buffer.from(pcm).toString('base64'));
  assert.match(parts[2].text,/Previous turn/);
  return jsonOutput({heard:'Ne görüyorum?',answer:'Bir yaprak görünüyor.'});
 }});
 assert.equal(response.status,200);assert.deepEqual(await response.json(),{heard:'Ne görüyorum?',answer:'Bir yaprak görünüyor.'});
});

test('image editing passes the selected photo and prompt and returns generated image bytes without caching',async()=>{
 const photo=new Uint8Array(await jpg.arrayBuffer());
 const response=await handleLensMode(request('create',{prompt:'Sulu boya yap'}),{geminiKey:'test',fetcher:async(url,options)=>{
  assert.match(url,/models\/gemini-3\.1-flash-image:generateContent$/);
  const body=JSON.parse(options.body);assert.equal(body.contents[0].parts[1].text,'Sulu boya yap');
  assert.deepEqual(body.generationConfig.responseModalities,['IMAGE']);
  return output({inlineData:{mimeType:'image/jpeg',data:Buffer.from(photo).toString('base64')}});
 }});
 assert.equal(response.status,200);assert.equal(response.headers.get('content-type'),'image/jpeg');
 assert.equal(response.headers.get('cache-control'),'no-store');assert.deepEqual(new Uint8Array(await response.arrayBuffer()),photo);
});

test('pinch zoom shrinks the visible source area around the center and clamps extreme values',()=>{
 assert.deepEqual(lensViewfinder(1600,1200,400,300,2),{x:.25,y:.25,width:.5,height:.5});
 assert.deepEqual(lensViewfinder(1600,1200,400,300,20),lensViewfinder(1600,1200,400,300,3));
});
