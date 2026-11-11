// Run in a fresh authorized Sites source checkout. No credentials are stored or logged.
// --update checks official releases, exports validated bounded source data when needed,
// and updates pinned release constants. --refresh reads {siteUrl,serviceToken} from stdin
// and refreshes every previously cached page through the selected private Site.
import {readFile,writeFile,mkdir} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const args=process.argv.slice(2);
const get=async url=>{const r=await fetch(url,{signal:AbortSignal.timeout(60000)});if(!r.ok)throw new Error(`Official source HTTP ${r.status}`);return r;};
const modulePath='app/taxonomy-adapters.ts';let source=await readFile(modulePath,'utf8');
if(args.includes('--refresh')||args.includes('--verify')||args.includes('--import')){
 let input='';if(process.stdin.isTTY)process.stdin.setRawMode(true);for await(const part of process.stdin){input+=part;if(input.includes('\n'))break;}if(process.stdin.isTTY)process.stdin.setRawMode(false);
 const config=JSON.parse(input),url=new URL(config.siteUrl);
 if(url.protocol!=='https:'||url.hostname!=='ormanmuhendisi.suleymanozyurt49.chatgpt.site')throw new Error('Unexpected Site');
 if(typeof config.serviceToken!=='string'||!config.serviceToken)throw new Error('Service access unavailable');
 const call=async params=>{const response=await fetch(new URL('/api/taxonomy?'+new URLSearchParams(params),url),{headers:{'OAI-Sites-Authorization':`Bearer ${config.serviceToken}`},signal:AbortSignal.timeout(45000)});if(!response.ok)throw new Error(`Site API HTTP ${response.status}`);return response.json();};
 if(args.includes('--import')){
  const manifest=JSON.parse(await readFile('data/taxonomy-import/manifest.json','utf8'));
  const accessHeaders={'OAI-Sites-Authorization':`Bearer ${config.serviceToken}`};
  const importCall=async body=>{
   for(let attempt=0;attempt<3;attempt++){
    let response;
    try{response=await fetch(new URL('/api/taxonomy/import',url),{method:body?'POST':'GET',headers:{...accessHeaders,...(body?{'Content-Type':'application/json'}:{})},...(body?{body:JSON.stringify(body)}:{}),signal:AbortSignal.timeout(45000)});}
    catch{if(attempt===2)throw new Error('Site import request unavailable');await new Promise(resolve=>setTimeout(resolve,500*2**attempt));continue;}
    if(response.ok)return response.json();
    if([429,502,503,504].includes(response.status)&&attempt<2){await new Promise(resolve=>setTimeout(resolve,500*2**attempt));continue;}
    throw new Error(`Site import HTTP ${response.status}`);
   }
  };
  const progress=await importCall();if(progress.version!==manifest.version)throw new Error('Published import release does not match source');
  console.log(JSON.stringify({phase:'resume',...progress,missing:progress.missing.length}));
  let written=0;
  for(const index of progress.missing){
   if(!manifest.chunks[index])throw new Error('Unexpected import batch');
   const payload=await readFile(path.join('data','taxonomy-import',manifest.version,String(index).padStart(5,'0')+'.json'),'utf8');
   const receipt=await importCall({version:manifest.version,action:'chunk',index,payload});
   if(!receipt.persisted||receipt.index!==index)throw new Error('Batch commit not acknowledged');
   written++;if(written%25===0)console.log(JSON.stringify({phase:'import',written,remaining:progress.missing.length-written}));
  }
  const completed=await importCall({action:'finalize',version:manifest.version});
  if(!completed.complete||completed.taxa!==manifest.meta.total)throw new Error('Complete release not verified');
  console.log(JSON.stringify(completed));
 }else if(args.includes('--verify')){
  const coverage=await call({mode:'coverage'}),release=coverage.releases.find(r=>r.source==='ictv'&&r.version==='MSL41.v1');
  if(!release?.complete||release.expected_count!==22670)throw new Error('Complete ICTV release was not persisted');
  const roots=await call({mode:'roots',source:'itis'});if(roots.records.length!==7||roots.records.some(n=>n.name==='Monera'))throw new Error('Seven ITIS roots not verified');
  const branches=[];
  for(const n of roots.records){const p=await call({mode:'children',source:'itis',id:n.id});if(p.records.some(c=>c.parentId!==n.id))throw new Error('Incorrect direct parent');branches.push({kingdom:n.name,total:p.total,loaded:p.records.length,hasNext:Boolean(p.next)});}
  const col=await call({mode:'node',source:'col',id:'4J2D5',version:'316441'});if(col.node.name!=='Pinus nigra'||col.node.turkishName!=='Karaçam'||col.path[0].rank!=='DOMAIN')throw new Error('COL source path not verified');
  const virus=await call({mode:'node',source:'ictv',id:'ICTV202420188'});if(virus.path[0].name!=='Adnaviria'||virus.node.rank!=='SPECIES')throw new Error('ICTV path not verified');
  console.log(JSON.stringify({ictv:{taxa:release.expected_count,species:release.data.species,history:release.data.historicalChanges},itis:branches,col:{name:col.node.name,turkishName:col.node.turkishName,path:col.path.map(n=>n.name)}}));
 }else{
 let cursor='',refreshed=0,failures=0;
 do{const plan=await call({mode:'sync-plan',...(cursor?{cursor}:{})});for(const params of plan.records){try{const d=await call(params);if(d.warning)failures++;else refreshed++;}catch{failures++;}}cursor=plan.next;}while(cursor);
 console.log(JSON.stringify({refreshed,failures}));if(failures)process.exitCode=1;
 }
}else{
 const [col,page]=await Promise.all([(await get('https://api.checklistbank.org/dataset/3LXR')).json(),(await get('https://ictv.global/msl')).text()]);
 if(!Number.isInteger(col.key)||col.origin!=='xrelease')throw new Error('Unexpected COL release metadata');
 const links=[...page.matchAll(/(?:href|src)=["']([^"']*ICTV_Master_Species_List_[^"']+\.xlsx)["']/gi)].map(m=>new URL(m[1].replace(/&amp;/g,'&'),'https://ictv.global').href);
 const candidates=links.map(url=>({url,version:url.match(/MSL(\d+)\.v(\d+)/)?.[0]})).filter(v=>v.version).sort((a,b)=>Number(b.version.match(/\d+/)[0])-Number(a.version.match(/\d+/)[0])||Number(b.version.match(/v(\d+)/)[1])-Number(a.version.match(/v(\d+)/)[1]));
 if(!candidates.length)throw new Error('Official ICTV workbook link unavailable');
 const current=candidates[0];if(new URL(current.url).hostname!=='ictv.global')throw new Error('Unexpected workbook host');
 const oldCol=source.match(/COL_RELEASE="(\d+)"/)[1],oldIctv=source.match(/ICTV_RELEASE="([^"]+)"/)[1];
 const report={col:{current:oldCol,available:String(col.key),version:col.version,totalNameUsages:col.size},ictv:{current:oldIctv,available:current.version,url:current.url}};
 if(args.includes('--update')){
  if(oldIctv!==current.version){
   const directory=path.join('/tmp','orman-taxonomy-refresh');await mkdir(directory,{recursive:true});const file=path.join(directory,path.basename(new URL(current.url).pathname));await writeFile(file,Buffer.from(await(await get(current.url)).arrayBuffer()));
   const imported=spawnSync('python',['scripts/import-ictv.py',file,path.join('data','taxonomy-import',current.version),current.version],{encoding:'utf8'});if(imported.status)throw new Error('Complete ICTV source validation failed');report.ictv.validation=JSON.parse(imported.stdout);

  }
  source=source.replace(`COL_RELEASE="${oldCol}"`,`COL_RELEASE="${col.key}"`).replace(`ICTV_RELEASE="${oldIctv}"`,`ICTV_RELEASE="${current.version}"`);await writeFile(modulePath,source);
 }
 console.log(JSON.stringify(report));
}
