import test from 'node:test';
import assert from 'node:assert/strict';
import { NavigationMemory, entryState, keepsRouteContext, readEntry, restoreWhenReady } from '../app/navigation-memory.ts';
import { horizontalSwipe } from '../app/swipe-intent.ts';

test('search and tabs keep input and scroll context while a new taxon or page changes the reading surface',()=>{
 assert.equal(keepsRouteContext({view:'fungi',q:'Bo'},{view:'fungi',q:'Boletus'}),true);
 assert.equal(keepsRouteContext({view:'discover',entry:'gbif-6',tab:'overview'},{view:'discover',entry:'gbif-6',tab:'classification'}),true);
 assert.equal(keepsRouteContext({view:'discover',entry:'gbif-6'},{view:'discover',entry:'gbif-7707728'}),false);
 assert.equal(keepsRouteContext({view:'detail',species:'cedrus-libani'},{view:'detail',species:'pinus-pinea'}),false);
 assert.equal(keepsRouteContext({view:'home'},{view:'discover'}),false);
});

test('separate taxonomy branches and browser visits retain their own scroll while a tab recalls its last route',()=>{
 const journal=new NavigationMemory();
 const a={href:'/?view=discover&entry=gbif-6',route:{view:'discover',entry:'gbif-6',q:'Cedrus'},scroll:850};
 journal.remember('plants',a);journal.remember('family',{href:'/?view=discover&entry=gbif-4689',route:{view:'discover',entry:'gbif-4689'},scroll:90});
 assert.equal(journal.entry('plants').scroll,850);assert.equal(journal.section('discover').route.entry,'gbif-4689');
 a.route.entry='changed';assert.equal(journal.entry('plants').route.entry,'gbif-6');
 journal.remember('home',{href:'/?view=home&feed=following',route:{view:'home',feed:'following'},scroll:2120});
 assert.equal(journal.section('home').route.feed,'following');assert.equal(journal.section('discover').scroll,90);
 assert.equal(readEntry(entryState({other:'preserved'},'plants',850)).scroll,850);assert.equal(entryState({other:'preserved'},'plants',0).other,'preserved');
 for(const value of [Infinity,-10,'400',null])assert.equal(readEntry({omNavigation:{id:'plants',scroll:value}}).scroll,0);
});
function scrollHost(initial) {
 let available=initial,observe,intent,timeout; const positions=[];let cleaned=0,done=0;
 const host={available:()=>available,scroll:top=>positions.push(top),observe:check=>{observe=check;return()=>cleaned++;},onIntent:cancel=>{intent=cancel;return()=>cleaned++;},timeout:finish=>{timeout=finish;return()=>cleaned++;}};
 const stop=restoreWhenReady(1900,host,()=>done++);
 return {positions,resize(height){available=height;observe?.();},gesture(){intent?.();},timeout(){timeout?.();},stop,get cleaned(){return cleaned;},get done(){return done;}};
}
test('returning to a long feed waits for lazy content and restores once; a new touch or key cancels it',()=>{
 const page=scrollHost(300);assert.deepEqual(page.positions,[]);page.resize(2400);assert.deepEqual(page.positions,[1900]);assert.equal(page.cleaned,3);page.resize(3000);page.stop();assert.equal(page.done,1);
 const canceled=scrollHost(400);canceled.gesture();canceled.resize(2500);canceled.timeout();assert.deepEqual(canceled.positions,[]);assert.equal(canceled.done,1);
 const shortened=scrollHost(600);shortened.timeout();assert.deepEqual(shortened.positions,[600]);assert.equal(shortened.done,1);
});
test('photo swipe distinguishes horizontal intent from vertical scrolling and taps',()=>{
 assert.equal(horizontalSwipe({x:200,y:100},{x:80,y:115}),1);
 assert.equal(horizontalSwipe({x:80,y:100},{x:200,y:115}),-1);
 for(const end of [{x:180,y:100},{x:100,y:220},{x:145,y:155}])assert.equal(horizontalSwipe({x:200,y:100},end),0);
 assert.equal(horizontalSwipe({x:200,y:100},{x:80,y:115},2),0);
 assert.equal(horizontalSwipe({x:80,y:100},{x:200,y:115},1.5),0);
});
