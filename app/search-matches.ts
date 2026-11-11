import type {Plant} from "./plant-data";
export const normalizeSearch=(value:string)=>value.toLocaleLowerCase("tr").replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export function matchingPlants(plants:Plant[],query:string) {
 const q=normalizeSearch(query.trim());if(!q)return [];
 return plants.filter(p=>normalizeSearch(`${p.name} ${p.latin} ${p.genus} ${p.family}`).includes(q)).sort((a,b)=>{
  const score=(p:Plant)=>[p.name,p.latin].some(name=>normalizeSearch(name)===q)?0:[p.name,p.latin].some(name=>normalizeSearch(name).startsWith(q))?1:2;
  return score(a)-score(b);
 });
}
