import assert from 'node:assert/strict';
import test from 'node:test';
import {siteSections,sectionGroups,findSections,groupForSection,sectionLabel,sectionHubs,hubForSection} from '../app/site-sections.ts';
import {nextTab} from '../app/tab-keyboard.ts';

test('section search finds sources, tasks and both languages without requiring Turkish keyboard characters',()=>{
  for(const [query,view] of [['TUBIVES','database'],['Pl@ntNet','catalogs'],['plantnet','catalogs'],['INATURALIST','catalogs'],['ITIS','catalogs'],['Kew POWO','catalogs'],['bizim bitkiler','catalogs'],['dunya kataloglari','catalogs'],['BITKI SAGLIGI','health'],['ayarlar','account'],['Settings','account'],['plant care','care'],['Facebook','social'],['Türkiye flora','database']]){
    assert(findSections(query).some(item=>item.view===view),query);
  }
  assert.deepEqual(findSections('olmayan bölüm'),[]);
  assert(findSections('  plant   care  ').some(item=>item.view==='care'));
});

test('every public section has one home, a clear name and a searchable task; administration stays separate',()=>{
  assert.equal(new Set(siteSections.map(item=>item.view)).size,siteSections.length);
  for(const item of siteSections){
    assert(item.tr&&item.en&&item.description&&item.descriptionEn);
    assert.equal(groupForSection(item.view),item.group);
    assert.equal(sectionLabel(item,'en'),item.en);
    assert.equal(sectionLabel(item,'tr'),item.tr);
    assert(item.group==='main'||sectionGroups.some(group=>group.id===item.group));
    assert(findSections(item.tr).some(found=>found.view===item.view));
  }
  assert.equal(findSections('admin').length,0);
  assert.equal(groupForSection('catalogs'),'research');
  assert.equal(groupForSection('account'),'personal');
});

test('horizontal tab focus wraps, supports first and last shortcuts and leaves vertical scrolling and activation to the browser',()=>{
  assert.equal(nextTab('ArrowLeft',0,7),6);
  assert.equal(nextTab('ArrowRight',6,7),0);
  assert.equal(nextTab('Home',3,7),0);
  assert.equal(nextTab('End',2,7),6);
  assert.equal(nextTab('ArrowLeft',0,1),0);
  for(const key of ['ArrowUp','ArrowDown','Tab','Enter',' '])assert.equal(nextTab(key,2,7),undefined);
  assert.equal(nextTab('ArrowRight',0,0),undefined);
});

test('secondary sections belong to exactly one task hub and primary navigation remains direct',()=>{
 const assigned=sectionHubs.flatMap(hub=>hub.views);
 assert.equal(new Set(assigned).size,assigned.length);
 for(const item of siteSections){
  if(item.group==='main'){assert(!assigned.includes(item.view));assert.equal(hubForSection(item.view),item.view);}
  else {assert.equal(assigned.filter(view=>view===item.view).length,1);assert.equal(hubForSection(item.view),sectionHubs.find(h=>h.views.includes(item.view)).id);}
 }
 assert.equal(hubForSection('catalogs'),'database');assert.equal(hubForSection('birds'),'explore');assert.equal(hubForSection('account'),'profile');
});

 test('taxonomy and visual exploration have distinct direct destinations',()=>{assert.equal(siteSections.find(s=>s.view==='discover').tr,'Taksonomi');assert.equal(siteSections.find(s=>s.view==='explore').tr,'Keşfet');assert(findSections('taksonomi').some(s=>s.view==='discover'));});
