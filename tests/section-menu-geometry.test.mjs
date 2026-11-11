import assert from 'node:assert/strict';
import test from 'node:test';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const source = await readFile(new URL('../app/section-menu-geometry.ts', import.meta.url), 'utf8');
const code = ts.transpileModule(source, {compilerOptions:{module:ts.ModuleKind.ESNext}}).outputText;
const {sectionMenuGeometry} = await import(`data:text/javascript;base64,${Buffer.from(code).toString('base64')}`);

test('phone menu stays below its trigger and above the bottom navigation',()=>{
  assert.deepEqual(sectionMenuGeometry({viewportTop:0,viewportHeight:844,anchorBottom:64,bottomInset:88}),{top:72,height:676,compact:false});
});
test('landscape leaves room for destinations instead of pinning a large header over them',()=>{
  const menu=sectionMenuGeometry({viewportTop:0,viewportHeight:390,anchorBottom:64,bottomInset:72});
  assert.equal(menu.top,8);assert.equal(menu.compact,true);
  assert(menu.height>=240);assert(menu.top+menu.height<=390-72-8);
});
test('a panned visual viewport keeps menu controls above the phone keyboard',()=>{
  const menu=sectionMenuGeometry({viewportTop:140,viewportHeight:300,anchorBottom:64});
  assert(menu.top>=148);assert(menu.top+menu.height<=432);assert(menu.height>=200);assert(menu.compact);
});
test('desktop menu fits the viewport even when its trigger is near the bottom',()=>{
  const menu=sectionMenuGeometry({viewportTop:0,viewportHeight:720,anchorBottom:690});
  assert.equal(menu.top,8);assert.equal(menu.height,704);
});
test('menu never extends below the visible area across portrait, landscape and keyboard sizes',()=>{
  for(const viewportTop of [0,120,260])for(const viewportHeight of [160,240,320,390,640,844,1024])for(const anchorBottom of [48,76,180,690])for(const bottomInset of [0,72,106]){
    const menu=sectionMenuGeometry({viewportTop,viewportHeight,anchorBottom,bottomInset});
    assert(menu.top>=viewportTop+8);assert(menu.height>=0);
    assert(menu.top+menu.height<=viewportTop+viewportHeight-bottomInset-8);
  }
});
