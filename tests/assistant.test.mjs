import test from 'node:test';
import assert from 'node:assert/strict';
import {assistantContext} from '../app/assistant-data.ts';
import {handleAssistant} from '../app/api/assistant/handler.ts';
import source from '../app/data/tubives.json' with {type:'json'};
const request=(question,extra={})=>new Request('https://example.test/api/assistant',{method:'POST',headers:{'content-type':'application/json','oai-authenticated-user-id':'owner',origin:'https://example.test',...extra},body:JSON.stringify({question,language:'tr'})});
test('natural province and endemic queries use the exact source records and preserve catalogue filters',()=>{
 const result=assistantContext('Antalya’daki endemik bitkileri göster','tr');
 const expected=source.records.filter(r=>r.provinces.includes('Antalya')&&r.endemism.toLocaleLowerCase('tr')==='endemik');
 assert.equal(result.total,expected.length);assert.equal(result.filters.province,'Antalya');assert.equal(result.filters.endemic,true);assert.equal(result.filters.q,'');
 for(const s of result.sources){const row=expected.find(r=>String(r.id)===s.profile.id);assert(row);assert.equal(s.scientificName,row.name);assert.equal(s.href,row.source);}
 const veronica=assistantContext('Veronica hakkında bilgi ver','tr');assert.equal(veronica.total,source.records.filter(r=>r.name.toLowerCase().includes('veronica')).length);
});
test('scientific authors do not break named-plant searches and unmatched names never return the whole catalogue',()=>{
 const result=assistantContext('Lübnan sediri nerede yetişir?','tr');assert.equal(result.filters.q,'Cedrus libani');assert(result.sources.some(s=>s.profile.id==='cedrus-libani'));
 assert(result.answer.length>80);assert.equal(assistantContext('qwertyzxy','tr').total,0);
});
test('missing AI credentials return an honestly labelled catalogue result without a model request',async()=>{
 let calls=0;const response=await handleAssistant(request('Pinaceae kayıtlarını bul'),{fetcher:async()=>{calls++;throw new Error('Must not call');}});
 const result=await response.json();assert.equal(response.status,200);assert.equal(result.mode,'catalog');assert.equal(result.filters.family,'Pinaceae');assert.equal(calls,0);
});
test('assistant requests enforce identity, same-origin access and bounded input',async()=>{
 const anonymous=request('Cedrus libani');anonymous.headers.delete('oai-authenticated-user-id');assert.equal((await handleAssistant(anonymous)).status,401);
 assert.equal((await handleAssistant(request('Cedrus libani',{origin:'https://other.test'}))).status,403);
 assert.equal((await handleAssistant(request('x'.repeat(2001)))).status,400);
 assert.equal((await handleAssistant(request(''))).status,400);
});
test('model output is structured, cites only retrieved records and does not expose credentials',async()=>{
 let payload;let endpoint;const mock=async(url,options)=>{endpoint=url;payload=JSON.parse(options.body);return Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Kaynak kaydına göre türün yayılış bilgisi künyede yer alır.',sourceIds:['plant-cedrus-libani'],followUps:['Yaprakları nasıldır?']})}]}]});};
 const response=await handleAssistant(request('Lübnan sediri hakkında bilgi ver'),{apiKey:'test-only-key',fetcher:mock});const result=await response.json();
 assert.equal(endpoint,'https://api.openai.com/v1/responses');assert.equal(payload.store,false);assert.equal(payload.text.format.strict,true);assert.equal(result.mode,'ai');assert.equal(result.sources.length,1);assert.equal(result.sources[0].profile.id,'cedrus-libani');assert(!JSON.stringify(result).includes('test-only-key'));
});
test('invalid citations, upstream limits and incomplete generation recover to real catalogue records',async()=>{
 const mocks=[async()=>Response.json({error:'rate limit'},{status:429}),async()=>Response.json({status:'incomplete'}),async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:JSON.stringify({answer:'Invented answer',sourceIds:['unretrieved'],followUps:[]})}]}]})];
 for(const fetcher of mocks){const result=await(await handleAssistant(request('Cedrus libani'),{apiKey:'test-only-key',fetcher})).json();assert.equal(result.mode,'catalog');assert.equal(result.unavailable,true);assert(result.sources.length>0);assert(!result.answer.includes('Invented'));}
});

test('Google fallback uses server-only credentials, Search grounding and validated returned citations',async()=>{
 const {googleAnswer}=await import('../app/api/assistant/gemini.ts');const {assistantContext}=await import('../app/assistant-data.ts');const context={...assistantContext('unknown plant','tr'),mode:'catalog',followUps:[]};let payload;
 const result=await googleAnswer('Yapraklar sararıyor','tr',context,{geminiKey:'private-google-key',fetcher:async(url,options)=>{assert.match(url,/generativelanguage.googleapis.com/);assert.equal(options.headers['x-goog-api-key'],'private-google-key');payload=JSON.parse(options.body);return Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Toprağı kontrol et.'}]},groundingMetadata:{groundingChunks:[{web:{uri:'https://www.rhs.org.uk/houseplants',title:'RHS'}}],groundingSupports:[{segment:{endIndex:19},groundingChunkIndices:[0]}],searchEntryPoint:{renderedContent:'<div>Search suggestions</div>'}}}]});}});
 assert.equal(result.provider,'gemini');assert.deepEqual(payload.tools,[{google_search:{}}]);assert.equal(result.webSources[0].title,'RHS');assert.ok(!JSON.stringify(result).includes('private-google-key'));
 const ungrounded=await googleAnswer('Care question','tr',context,{geminiKey:'key',fetcher:async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'An unsupported claim'}]}}]})});assert.equal(ungrounded,null);
 const unsafe=await googleAnswer('Care question','tr',context,{geminiKey:'key',fetcher:async()=>Response.json({candidates:[{finishReason:'STOP',content:{parts:[{text:'Answer'}]},groundingMetadata:{groundingChunks:[{web:{uri:'javascript:alert(1)',title:'Fake'}}]}}]})});assert.equal(unsafe,null);
});
test('web answers use trusted domains, cited evidence and conversation history; uncited output falls back',async()=>{
 const {webAnswer}=await import('../app/api/assistant/web.ts');const context={...assistantContext('unknown plant','en'),mode:'catalog',followUps:[]};let body;
 const result=await webAnswer('What about its leaves?','en',context,{apiKey:'private-key',fetcher:async(url,options)=>{body=JSON.parse(options.body);return Response.json({status:'completed',output:[{type:'web_search_call'},{type:'message',content:[{type:'output_text',text:'Leaves are described by Kew.',annotations:[{type:'url_citation',url:'https://www.kew.org/read-and-watch/plants',title:'Kew',end_index:27}]}]}]});}},[{role:'user',content:'Cedrus libani'}]);
 assert.equal(result.provider,'openai');assert(result.answer.includes('[1]'));assert.equal(body.tools[0].type,'web_search');assert(body.tools[0].filters.allowed_domains.includes('kew.org'));assert.equal(body.input[0].content,'Cedrus libani');assert(!JSON.stringify(result).includes('private-key'));
 const untrusted=await webAnswer('question','en',context,{apiKey:'key',fetcher:async()=>Response.json({status:'completed',output:[{type:'message',content:[{type:'output_text',text:'Unsupported answer',annotations:[{type:'url_citation',url:'https://untrusted.example/article',title:'Blog'}]}]}]})});assert.equal(untrusted,null);
});
