import test from 'node:test';
import assert from 'node:assert/strict';
import { RecentPages } from '../app/recent-pages.ts';
import { routeMotion, animateSurface } from '../app/surface-motion.ts';
import { downwardDismiss } from '../app/swipe-intent.ts';
import { PageWork } from '../app/page-work.ts';

test('recently opened pages are reusable on Back, bounded by recent use and expire without extending freshness', () => {
  let now=0;const pages=new RecentPages(2,100,()=>now);
  const branch={id:'family',children:['a','b'],visible:48};
  pages.set('family',branch);pages.set('species',{id:'species'});
  now=50;assert.equal(pages.get('family'),branch);
  pages.set('other',{id:'other'});
  assert.equal(pages.get('species'),undefined);assert.equal(pages.get('family').visible,48);
  now=100;assert.equal(pages.get('family'),undefined);
  pages.set('other',{id:'refreshed'});now=150;assert.equal(pages.get('other').id,'refreshed');
  pages.delete('other');assert.equal(pages.get('other'),undefined);
});

test('primary sections follow their visual order; record Back reverses entry while typing and tabs keep reading still', () => {
  assert.equal(routeMotion({view:'home'},{view:'discover'}),'left');
  assert.equal(routeMotion({view:'database'},{view:'map'}),'right');
  assert.equal(routeMotion({view:'database'},{view:'flora-record',flora:123}),'forward');
  assert.equal(routeMotion({view:'flora-record',flora:123},{view:'database'},true),'back');
  assert.equal(routeMotion({view:'discover',entry:'gbif-6'},{view:'discover',entry:'gbif-1'}),'forward');
  assert.equal(routeMotion({view:'database',q:'C'},{view:'database',q:'Cedrus'}),'none');
  assert.equal(routeMotion({view:'discover',entry:'gbif-6',tab:'overview'},{view:'discover',entry:'gbif-6',tab:'images'}),'none');
});

test('surface motion is immediate, cancelable, optional, and never waits before navigation', () => {
  let canceled=0;const calls=[];
  const host={animate:(frames,options)=>{calls.push({frames,options});return{cancel:()=>canceled++};}};
  const stop=animateSurface(host,'back',false);
  assert.equal(typeof stop,'function');assert.equal(calls.length,1);assert.equal(calls[0].options.duration,160);
  assert.equal(calls[0].frames[0].transform,'translateX(-18px)');stop();assert.equal(canceled,1);
  animateSurface(host,'forward',true)();animateSurface(host,'none',false)();animateSurface({},'forward',false)();
  assert.equal(calls.length,1);
});

test('a deliberate short downward flick dismisses a photo, but a slow small drag, sideways swipe or pinch does not', () => {
  const start={x:100,y:100};
  assert.equal(downwardDismiss(start,{x:103,y:148},1,60),true);
  assert.equal(downwardDismiss(start,{x:103,y:148},1,300),false);
  assert.equal(downwardDismiss(start,{x:103,y:130},1,30),false);
  assert.equal(downwardDismiss(start,{x:200,y:150},1,40),false);
  assert.equal(downwardDismiss(start,{x:103,y:250},1.5,80),false);
  assert.equal(downwardDismiss(start,{x:103,y:200},1,1000),true);
});

test('rapid page changes reject late pagination results even when an upstream ignores cancellation', async () => {
  const work=new PageWork(),applied=[];let resolve;
  const old=work.start();
  const response=new Promise(done=>{resolve=done;}).then(value=>{if(old.current())applied.push(value);});
  work.cancel();const next=work.start();
  assert.equal(old.signal.aborted,true);assert.equal(next.current(),true);
  resolve('previous branch');await response;assert.deepEqual(applied,[]);
  if(next.current())applied.push('current branch');assert.deepEqual(applied,['current branch']);
  work.cancel();assert.equal(next.current(),false);
});
