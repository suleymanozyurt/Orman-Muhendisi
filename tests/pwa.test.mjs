import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import vm from 'node:vm';
import test from 'node:test';
import ts from 'typescript';

test('PWA installs as standalone and leaves personal API responses outside offline caches',async()=>{
  const manifest=JSON.parse(await readFile(new URL('../public/manifest.webmanifest',import.meta.url),'utf8'));
  assert.equal(manifest.display,'standalone');
  assert.equal(manifest.scope,'/');
  assert(manifest.icons.some(icon=>icon.type==='image/png'));
  const handlers={};
  const cache={match:async url=>url==='/offline.html'?new Response('Offline',{headers:{'Content-Type':'text/html'}}):undefined};
  const self={location:{origin:'https://site.local'},addEventListener:(name,fn)=>{handlers[name]=fn},skipWaiting:()=>{},clients:{claim:async()=>{}}};
  vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{
    self,URL,Response,caches:{match:cache.match,open:async()=>cache,keys:async()=>[]},fetch:async()=>{throw new Error('Network unavailable')},
  });
  let apiHandled=false;
  handlers.fetch({request:{method:'GET',url:'https://site.local/api/state',mode:'cors'},respondWith:()=>{apiHandled=true}});
  assert.equal(apiHandled,false);
  let navigation;
  handlers.fetch({request:{method:'GET',url:'https://site.local/?view=discover',mode:'navigate'},respondWith:promise=>{navigation=promise}});
  assert.equal((await navigation).status,200);
  assert.equal(await (await navigation).text(),'Offline');
});

test('PWA updates wait for a user action and retain assets for the previous open version',async()=>{
  const handlers={}; let skipped=0; const removed=[];
  const source=await readFile(new URL('../public/sw.js',import.meta.url),'utf8');
  const version=source.match(/const VERSION = "([^"]+)"/)[1];
  const self={addEventListener:(name,fn)=>{handlers[name]=fn},skipWaiting:async()=>{skipped++},clients:{claim:async()=>{}}};
  vm.runInNewContext(source,{self,URL,Response,caches:{
    open:async()=>({addAll:async()=>{}}),
    keys:async()=>['foreign-cache','orman-pwa-old-shell','orman-pwa-older-assets','orman-pwa-previous-assets',`${version}-shell`,`${version}-assets`],
    delete:async key=>{removed.push(key)},
  }});
  let pending; const waitUntil=promise=>{pending=promise};
  handlers.install({waitUntil}); await pending; assert.equal(skipped,0);
  handlers.message({data:{type:'SKIP_WAITING'},waitUntil}); await pending; assert.equal(skipped,1);
  handlers.activate({waitUntil}); await pending;
  assert.deepEqual(removed.sort(),['orman-pwa-old-shell','orman-pwa-older-assets']);
});

test('the install prompt remains available when settings are visited after the browser event',async()=>{
  const source=await readFile(new URL('../app/pwa-install-state.ts',import.meta.url),'utf8');
  const code=ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
  const model=await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);
  const target=new EventTarget(),media=new EventTarget();media.matches=false;
  target.matchMedia=()=>media;target.navigator={};
  const cleanup=model.observeInstallation(target);
  const prompt=new Event('beforeinstallprompt',{cancelable:true});
  prompt.prompt=async()=>{};prompt.userChoice=Promise.resolve({outcome:'dismissed'});
  target.dispatchEvent(prompt);assert.equal(prompt.defaultPrevented,true);
  // A settings component subscribing later still receives the captured event.
  assert.equal(model.readInstallState().prompt,prompt);assert.equal(model.readInstallState().installed,false);
  let notifications=0;const unsubscribe=model.subscribeInstallState(()=>notifications++);
  target.dispatchEvent(new Event('appinstalled'));assert.equal(notifications,1);
  assert.equal(model.readInstallState().installed,true);assert.equal(model.readInstallState().prompt,null);
  assert.equal(model.readServerInstallState().installed,false);
  unsubscribe();cleanup();
});

test('offline notebook code and styles install atomically and remain available without the network',async()=>{
 const handlers={},installed=[];
 const self={location:{origin:'https://site.local'},addEventListener:(name,fn)=>{handlers[name]=fn},skipWaiting:()=>{},clients:{claim:async()=>{}}};
 const cache={addAll:async items=>installed.push(...items),match:async path=>new Response(path,{headers:{'Content-Type':path.endsWith('.js')?'text/javascript':'text/css'}})};
 vm.runInNewContext(await readFile(new URL('../public/sw.js',import.meta.url),'utf8'),{self,URL,Response,caches:{open:async()=>cache,keys:async()=>[],match:cache.match},fetch:async()=>{throw new Error('Offline')}});
 let pending;handlers.install({waitUntil:promise=>{pending=promise}});await pending;
 for(const path of ['/offline.html','/offline-app.js','/offline-app.css'])assert(installed.includes(path));
 let reply;handlers.fetch({request:{method:'GET',url:'https://site.local/offline-app.js',mode:'cors'},respondWith:promise=>{reply=promise}});assert.equal(await(await reply).text(),'/offline-app.js');
 const html=await readFile(new URL('../public/offline.html',import.meta.url),'utf8');assert(html.includes('id="offline-app"'));assert(html.includes('/offline-app.js'));assert(html.includes('/offline-app.css'));
});
