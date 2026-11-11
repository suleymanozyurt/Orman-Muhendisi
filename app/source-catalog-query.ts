import {catalogSources, type CatalogSource, type CatalogMode} from "./catalog-types.ts";
export type SourceCatalogQuery = { source: CatalogSource; mode: CatalogMode; q: string; family: string; genus: string; parent: string; familyId: string; group: string; region: string; endemic: boolean; page: number; cursor:string };
export const emptySourceCatalog: SourceCatalogQuery = {source:"plantnet",mode:"species",q:"",family:"",genus:"",parent:"",familyId:"",group:"TBL",region:"",endemic:false,page:1,cursor:""};
export const sourceCatalogKeys = Object.keys(emptySourceCatalog).map(key=>`catalog-${key}`);
export function readSourceCatalog(p: URLSearchParams): SourceCatalogQuery {
  const value = (key: string) => (p.get(`catalog-${key}`)||"").trim().slice(0,200), source = value("source"), mode = value("mode"), page = Number(value("page")||1);
  const cursor=(p.get("catalog-cursor")||"").slice(0,2048);
  return {...emptySourceCatalog,cursor:/[\u0000-\u001f]/.test(cursor)?"":cursor,source:Object.hasOwn(catalogSources,source)?source as CatalogSource:"plantnet",mode:["species","families","genera","projects","taxa","kingdoms"].includes(mode)?mode as CatalogMode:"species",q:value("q"),family:value("family"),genus:value("genus"),parent:/^[1-9]\d{0,9}$/.test(value("parent"))?value("parent"):"",familyId:/^[1-9]\d{0,9}$/.test(value("familyId"))?value("familyId"):"",group:["TBL","LK","KY","SY","MN"].includes(value("group"))?value("group"):"TBL",region:value("region"),endemic:value("endemic")==="1",page:Number.isInteger(page)&&page>0&&page<=100000?page:1};
}
export function sourceCatalogParams(query: SourceCatalogQuery, route = false) {
  const p = new URLSearchParams();for(const [key,value] of Object.entries(query)){if(value===""||value===false)continue;p.set(route?`catalog-${key}`:key,typeof value==="boolean"?"1":String(value));}return p;
}
