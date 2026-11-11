import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync,readdirSync} from 'node:fs';
import ts from 'typescript';
const root=new URL('../',import.meta.url);
const itis=JSON.parse(readFileSync(new URL('data/itis-root-index.json',root),'utf8'));
let code=ts.transpileModule(readFileSync(new URL('preview/read-api.ts',root),'utf8'),{compilerOptions:{module:ts.ModuleKind.ESNext,target:ts.ScriptTarget.ES2022}}).outputText;
code=code.replace(/import itisRoots from [^;]+;/,`const itisRoots=${JSON.stringify(itis)};`).replaceAll('import.meta.env.BASE_URL','"/Orman-Muhendisi-Site/"');
code=code.replace(/import\("(\.\.\/app\/[^"\n]+)"\)/g,(_m,p)=>`import(${JSON.stringify(new URL(p+'.ts',new URL('preview/read-api.ts',root)).href)})`);
const {previewResponse}=await import('data:text/javascript;base64,'+Buffer.from(code).toString('base64'));
const base=new URL('https://example.test/Orman-Muhendisi-Site/');
const request=(path,method='GET')=>new Request(new URL(path,base),{method});
const noNetwork=async()=>{throw new Error('Unexpected network call');};

test('Pages preview blocks writes and does not simulate signed-in users or successful saves',async()=>{
 for(const path of ['/api/state','/api/upload','/api/assistant','/api/plants'])assert.equal((await previewResponse(request(path,'POST'),noNetwork,base)).status,503);
 assert.equal((await previewResponse(request('/api/state'),noNetwork,base)).status,401);
 assert.equal((await previewResponse(request('/api/unknown'),noNetwork,base)).status,503);
});
test('Pages preview reuses real flora filters and source metadata',async()=>{
 const source=JSON.parse(readFileSync(new URL('app/data/tubives.json',root),'utf8'));
 const record=source.records.find(r=>r.id===2161);assert.equal(record.name,'Linum mucronatum subsp. gypsicola var. gypsicola');
 const response=await previewResponse(request('/api/flora?q=Linum&limit=100'),noNetwork,base);
 assert.equal(response.status,200);const result=await response.json();
 assert(result.records.some(r=>r.id===record.id));assert.deepEqual(result.metadata,source.metadata);
 const detail=await (await previewResponse(request('/api/flora-detail?id='+record.id),noNetwork,base)).json();
 assert.deepEqual(detail.record,record);
});
test('Pages roots retain the seven actual ITIS kingdoms',async()=>{
 const result=await (await previewResponse(request('/api/taxonomy?source=itis&mode=roots'),noNetwork,base)).json();
 assert.equal(result.records.length,7);assert.deepEqual(result.records,itis);assert.equal(result.next,null);
});
test('Pages ICTV snapshot exposes every paginated record and real ancestry',async()=>{
 const folder=new URL('data/taxonomy-import/MSL41.v1/',root);
 const nodes=readdirSync(folder).filter(f=>/^\d{5}\.json$/.test(f)).flatMap(f=>JSON.parse(readFileSync(new URL(f,folder),'utf8')).nodes);
 const manifest=JSON.parse(readFileSync(new URL('manifest.json',folder),'utf8'));
 const fetchSnapshot=async url=>{assert.equal(String(url),new URL('preview-data/ictv.json',base).href);return Response.json(nodes);};
 const all=new Set();let cursor='';
 do{const data=await (await previewResponse(request('/api/taxonomy?source=ictv&mode=search&q=virus&cursor='+cursor),fetchSnapshot,base)).json();
 for(const row of data.records){assert(!all.has(row.id));all.add(row.id);}cursor=data.next;
 }while(cursor);
 assert.equal(all.size,nodes.filter(n=>[n.name,n.id,...n.synonyms.map(s=>s.name)].some(s=>s.toLocaleLowerCase('tr').includes('virus'))).length);
 assert.equal(nodes.length,manifest.meta.total);
 const leaf=nodes.find(n=>n.rank==='SPECIES');const detail=await(await previewResponse(request('/api/taxonomy?source=ictv&mode=node&id='+leaf.id),fetchSnapshot,base)).json();
 assert.equal(detail.node.id,leaf.id);assert.equal(detail.path.at(-1).id,leaf.id);assert.equal(detail.path[0].parentId,null);
 for(let i=1;i<detail.path.length;i++)assert.equal(detail.path[i].parentId,detail.path[i-1].id);
 assert.equal((await previewResponse(request('/api/taxonomy?source=ictv&version=MSL1.v1'),fetchSnapshot,base)).status,400);
});
