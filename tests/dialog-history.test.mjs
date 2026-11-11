import test from 'node:test';
import assert from 'node:assert/strict';
import { DialogHistory, dialogEntry, withoutDialogEntry } from '../app/dialog-history.ts';
import { downwardDismiss } from '../app/swipe-intent.ts';

function browser() {
  const entries=[{href:'/?view=home',state:{omNavigation:{id:'feed',scroll:940}}}];let cursor=0,backs=0;
  const host={state:()=>entries[cursor].state,href:()=>entries[cursor].href,
    push:state=>{entries.splice(cursor+1);entries.push({href:host.href(),state});cursor++;},
    replace:state=>{entries[cursor].state=state;},back:()=>{backs++;cursor=Math.max(0,cursor-1);}};
  const history=new DialogHistory(host);
  return {history,host,entries,get backs(){return backs;},get cursor(){return cursor;},forward(){cursor=Math.min(entries.length-1,cursor+1);},navigate(href,state){entries[cursor]={href,state};}};
}
test('browser Back dismisses a photo and preserves the exact feed entry and scroll',()=>{
  const b=browser();let closed=0;b.history.open('dialog-1',()=>{closed++;b.history.closed('dialog-1');});
  assert.equal(b.entries.length,2);assert.equal(dialogEntry(b.host.state()),'dialog-1');
  b.host.back();assert.equal(b.history.pop(),true);assert.equal(closed,1);assert.equal(b.backs,1);
  assert.equal(b.host.state().omNavigation.scroll,940);assert.equal(b.host.href(),'/?view=home');
});
test('close button takes one Back step; another navigation is never triggered by the resulting pop',()=>{
  const b=browser();b.history.open('dialog-1',()=>{});b.history.closed('dialog-1');
  assert.equal(b.backs,1);assert.equal(b.history.pop(),true);assert.equal(b.cursor,0);
  b.history.closed('dialog-1');assert.equal(b.backs,1);
});
test('opening search from a menu reuses one temporary entry',()=>{
  const b=browser();let closedMenu=0,closedSearch=0;
  b.history.open('dialog-1',()=>{closedMenu++;b.history.closed('dialog-1');});
  b.history.open('dialog-2',()=>{closedSearch++;b.history.closed('dialog-2');});
  assert.equal(b.entries.length,2);assert.equal(closedMenu,1);assert.equal(b.backs,0);
  b.host.back();assert.equal(b.history.pop(),true);assert.equal(closedSearch,1);
});
test('a destination opened from a modal consumes that entry and stays open when the modal closes',()=>{
  const b=browser();b.history.open('dialog-1',()=>{});
  b.navigate('/?view=detail&species=cedrus-libani',{omNavigation:{id:'species',scroll:0},omParent:'feed'});
  b.history.closed('dialog-1');assert.equal(b.backs,0);assert.equal(b.cursor,1);
  b.host.back();assert.equal(b.history.pop(),false);assert.equal(b.host.href(),'/?view=home');
});
test('summary filters can consume a dismissed dialog without losing the new query',()=>{
  const b=browser();b.history.open('dialog-1',()=>{});
  b.host.replace(withoutDialogEntry(b.host.state()));b.history.closed('dialog-1');
  b.navigate('/?view=database&family=Pinaceae',b.host.state());
  assert.equal(b.backs,0);assert.equal(b.host.href(),'/?view=database&family=Pinaceae');
});
test('changing a filter URL inside options preserves the selection and removes the dismissed modal marker',()=>{
  const b=browser();b.history.open('dialog-1',()=>{});
  b.navigate('/?view=home&feed=pending',b.host.state());b.history.closed('dialog-1');
  assert.equal(b.backs,0);assert.equal(b.host.href(),'/?view=home&feed=pending');
  assert.equal(dialogEntry(b.host.state()),undefined);
  b.host.back();assert.equal(b.history.pop(),false);assert.equal(b.host.href(),'/?view=home');
});
test('Forward cannot resurrect a dismissed overlay or leave its marker behind',()=>{
  const b=browser();b.history.open('dialog-1',()=>{});b.host.back();b.history.pop();b.forward();
  assert.equal(b.history.pop(),false);assert.equal(dialogEntry(b.host.state()),undefined);
  assert.deepEqual(withoutDialogEntry({omDialog:'dialog-1',other:'kept'}),{other:'kept'});
  assert.equal(dialogEntry({omDialog:'untrusted'}),undefined);
});
test('photo dismiss requires downward intent and never treats horizontal swipes, taps or zoom as closing',()=>{
  assert.equal(downwardDismiss({x:100,y:100},{x:104,y:205}),true);
  for(const end of [{x:105,y:170},{x:220,y:205},{x:100,y:5},{x:102,y:105}])assert.equal(downwardDismiss({x:100,y:100},end),false);
  assert.equal(downwardDismiss({x:100,y:100},{x:104,y:220},2),false);
});
