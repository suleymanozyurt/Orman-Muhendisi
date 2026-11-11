import test from "node:test";
import assert from "node:assert/strict";
import {readFileSync} from "node:fs";
import {runInNewContext} from "node:vm";
import {handleLensLive} from "../app/api/lens-live/handler.ts";
import {lensLiveInput,lensLiveServerMessage} from "../app/lens-live-protocol.ts";

const live=(origin="https://site.test",owner="owner")=>new Request("https://site.test/api/lens-live?language=tr",{method:"POST",headers:{origin,"oai-authenticated-user-id":owner}});
test("private live sessions mint a constrained single-use token without returning the Gemini API key",async()=>{
  const now=Date.parse("2026-11-09T16:00:00Z");
  let calls=0;
  const runtime={geminiKey:"server-only-test-key",now,fetcher:async(url,request)=>{
    calls++;
    assert.equal(url,"https://generativelanguage.googleapis.com/v1alpha/auth_tokens");
    assert.equal(request.headers["x-goog-api-key"],"server-only-test-key");
    const body=JSON.parse(request.body);
    assert.equal(body.uses,1);
    assert.equal(Date.parse(body.newSessionExpireTime)-now,45_000);
    assert.equal(Date.parse(body.expireTime)-now,140_000);
    assert.equal(body.bidiGenerateContentSetup.model,"models/gemini-3.8-live");
    assert.deepEqual(body.bidiGenerateContentSetup.generationConfig.responseModalities,["AUDIO"]);
    assert.match(body.bidiGenerateContentSetup.systemInstruction.parts[0].text,/Turkish/);
    return Response.json({name:"auth_tokens/oneUseOnly123"});
  }};
  assert.equal((await handleLensLive(live("https://site.test",""),runtime)).status,401);
  assert.equal((await handleLensLive(live("https://other.test"),runtime)).status,403);
  assert.equal(calls,0);
  const response=await handleLensLive(live(),runtime);
  assert.equal(response.status,200);
  assert.equal(response.headers.get("cache-control"),"no-store");
  const body=await response.text();
  assert.doesNotMatch(body,/server-only-test-key/);
  assert.equal(JSON.parse(body).token,"auth_tokens/oneUseOnly123");
  const rejected=await handleLensLive(live(),{geminiKey:"test",fetcher:async()=>new Response("",{status:429})});
  assert.equal(rejected.status,429);
});

test("live audio and video use separate protocol messages; interruption and spoken audio can be decoded",()=>{
  assert.deepEqual(lensLiveInput("audio","AAE="),{realtimeInput:{audio:{data:"AAE=",mimeType:"audio/pcm;rate=16000"}}});
  assert.deepEqual(lensLiveInput("video","test"),{realtimeInput:{video:{data:"test",mimeType:"image/jpeg"}}});
  assert.equal(lensLiveServerMessage({setupComplete:{}}).ready,true);
  const reply=lensLiveServerMessage({serverContent:{interrupted:true,outputTranscription:{text:"Yaprak."},modelTurn:{parts:[
    {inlineData:{data:"AAAA",mimeType:"audio/pcm;rate=24000"}},
    {inlineData:{data:"invalid",mimeType:"image/jpeg"}},
    {thought:true,inlineData:{data:"hidden",mimeType:"audio/pcm"}}
  ]}}});
  assert.equal(reply.interrupted,true);assert.equal(reply.text,"Yaprak.");
  assert.deepEqual(reply.audio,[{data:"AAAA",rate:24000}]);
});

test("44.1 kHz and 48 kHz microphone blocks become 40 ms mono PCM16 packets",()=>{
  const code=readFileSync(new URL("../public/lens-live-audio.js",import.meta.url),"utf8");
  for(const sampleRate of [44100,48000]){
    let Processor;
    const packets=[];
    runInNewContext(code,{sampleRate,AudioWorkletProcessor:class{port={postMessage:packet=>packets.push(packet)}},registerProcessor:(_,value)=>{Processor=value;}});
    const node=new Processor(),signal=new Float32Array(sampleRate*.08).fill(.5);
    for(let i=0;i<signal.length;i+=128)node.process([[signal.subarray(i,i+128)]]);
    assert.equal(packets.length,2);
    assert.equal(packets[0].byteLength,1280);
    assert.equal(new DataView(packets[0]).getInt16(0,true),16384);
  }
});

