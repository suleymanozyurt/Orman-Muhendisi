import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import ts from 'typescript';
const load=async name=>{
 const source=await readFile(new URL('../app/'+name+'.ts',import.meta.url),'utf8');
 return import('data:text/javascript;base64,'+Buffer.from(ts.transpileModule(source,{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText).toString('base64'));
};
const {tabScrollTarget}=await load('tab-visibility');
const {matchingPlants}=await load('search-matches');
test('selected tab and its next neighbour fit without hiding the selected title',()=>{
 const viewport=320,left=280,width=90,nextRight=500;
 const target=tabScrollTarget(viewport,840,left,width,nextRight);
 assert(left>=target+12);assert(nextRight<=target+viewport-12);
});
test('tab travel clamps to the first and last edge and centres an oversized pair',()=>{
 assert.equal(tabScrollTarget(320,840,12,72,188),0);
 assert.equal(tabScrollTarget(320,840,745,95),520);
 const target=tabScrollTarget(240,840,300,150,630);
 assert(300>=target);assert(450<=target+240);
 assert.equal(tabScrollTarget(1200,840,500,90,760),0);
});
test('Turkish names, scientific names and family searches retain every match and rank exact names first',()=>{
 const plants=[{id:'a',name:'Sedir',latin:'Cedrus',family:'Pinaceae',genus:'Cedrus'},{id:'b',name:'Lübnan sediri',latin:'Cedrus libani',family:'Pinaceae',genus:'Cedrus'},{id:'c',name:'Karaçam',latin:'Pinus nigra',family:'Pinaceae',genus:'Pinus'}];
 assert.deepEqual(matchingPlants(plants,'lübnan').map(p=>p.id),['b']);
 assert.deepEqual(matchingPlants(plants,'LUBNAN').map(p=>p.id),['b']);
 assert.deepEqual(matchingPlants(plants,'Pinus nigra').map(p=>p.id),['c']);
 assert.deepEqual(matchingPlants(plants,'sedir').map(p=>p.id),['a','b']);
 assert.equal(matchingPlants(plants,'Pinaceae').length,3);
 assert.equal(matchingPlants(plants,'').length,0);
});
