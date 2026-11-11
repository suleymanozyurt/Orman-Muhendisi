import {mkdir,readdir,writeFile} from 'node:fs/promises';
import {spawnSync} from 'node:child_process';
import path from 'node:path';
const root=path.resolve(import.meta.dirname,'..'),publicRoot=path.join(root,'public');
const output=path.join(publicRoot,'responsive');await mkdir(output,{recursive:true});
const files=['/canopy-upward.jpg'];
for(const directory of ['life','species'])for(const file of await readdir(path.join(publicRoot,directory)))if(/\.(jpe?g|png)$/i.test(file))files.push(`/${directory}/${file}`);
const run=(command,args)=>{const result=spawnSync(command,args,{encoding:'utf8'});if(result.status!==0)throw new Error(`${command} failed: ${result.stderr}`);return result.stdout.trim();};
const records={};
for(const source of files){
  const input=path.join(publicRoot,source.slice(1)),[width,height]=run('identify',['-format','%w %h',input]).split(' ').map(Number);
  const widths=[...new Set([96,320,640,960].map(size=>Math.min(size,width)))].sort((a,b)=>a-b);
  const srcSet=[];
  for(const size of widths){const filename=`${source.slice(1).replace(/\.[^.]+$/,'').replaceAll('/','-')}-${size}.webp`;run('convert',[input,'-auto-orient','-resize',`${size}x`,'-strip','-quality','80',path.join(output,filename)]);srcSet.push(`/responsive/${filename} ${size}w`);}
  records[source]={width,height,srcSet:srcSet.join(', ')};
}
const icon=path.join(publicRoot,'brand/orman-emblem.png');await mkdir(path.join(publicRoot,'icons'),{recursive:true});
for(const size of [180,192,512])run('convert',[icon,'-trim','+repage','-resize',`${Math.round(size*.76)}x${Math.round(size*.76)}`,'-gravity','center','-background','#ffffff','-extent',`${size}x${size}`,path.join(publicRoot,`icons/app-${size}.png`)]);
run('convert',[icon,'-trim','+repage','-resize','282x282','-gravity','center','-background','#ffffff','-extent','512x512',path.join(publicRoot,'icons/app-maskable-512.png')]);
await writeFile(path.join(root,'app/data/photo-variants.json'),JSON.stringify(records,null,2)+'\n');
console.log(`Prepared ${files.length} responsive photographs and four app icons.`);
