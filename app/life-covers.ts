import type {LifeImage} from "./life-types";
type Options={fetcher?:typeof fetch;wait?:(ms:number)=>Promise<void>;now?:()=>number};
// Limit visible-card requests; share requests in this browser, never retry indefinitely.
export function createLifeCoverLoader({fetcher=fetch,wait=ms=>new Promise(resolve=>setTimeout(resolve,ms)),now=Date.now}:Options={}){
 const covers=new Map<string,{until:number;value:Promise<LifeImage|null>}>(),queue:Array<()=>void>=[];
 let running=0;
 function drain(){while(running<3&&queue.length){running++;queue.shift()!();}}
 async function read(id:string):Promise<{image:LifeImage|null;failed:boolean}>{
  for(let attempt=0;attempt<2;attempt++){
   let response:Response;
   try{response=await fetcher(`/api/life?mode=cover&id=${encodeURIComponent(id)}`,{signal:AbortSignal.timeout(15000)});}
   catch{if(attempt===0){await wait(250);continue;}return {image:null,failed:true};}
   if(!response.ok){if(response.status>=500&&response.status<=599&&attempt===0){await wait(250);continue;}return {image:null,failed:true};}
   try{const data=await response.json() as {image:LifeImage|null};return {image:data.image||null,failed:false};}
   catch{return {image:null,failed:true};}
  }
  return {image:null,failed:true};
 }
 return function lifeCover(id:string):Promise<LifeImage|null>{
  const previous=covers.get(id);if(previous&&previous.until>now())return previous.value;
  let resolve!:(value:LifeImage|null)=>void;
  const value=new Promise<LifeImage|null>(r=>{resolve=r;}),entry={until:Infinity,value};
  if(covers.size>=200)covers.delete(covers.keys().next().value!);covers.set(id,entry);
  queue.push(()=>{read(id).then(result=>{entry.until=now()+(result.failed?30000:600000);resolve(result.image);}).catch(()=>{entry.until=now()+30000;resolve(null);}).finally(()=>{running--;drain();});});drain();return value;
 };
}
export const lifeCover=createLifeCoverLoader();
