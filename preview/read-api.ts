import itisRoots from "../data/itis-root-index.json";
import type { TaxonomyNode } from "../app/taxonomy-types";

export const previewUnavailable = () => Response.json({error:"Bu işlem geliştirme önizlemesinde sunucu bağlantısı gerektirir."}, {status:503});
const json = (value: unknown, status=200) => Response.json(value,{status});
let ictvTask: Promise<TaxonomyNode[]> | undefined;
const sourceFetch = (input: RequestInfo | URL, init?: RequestInit) => fetch(input,init);

async function ictv(request: Request, original: typeof fetch, base: URL) {
  ictvTask ??= original(new URL("preview-data/ictv.json",base)).then(async r=>{if(!r.ok)throw new Error("ICTV_UNAVAILABLE");return r.json() as Promise<TaxonomyNode[]>;}).catch(e=>{ictvTask=undefined;throw e;});
  const nodes=await ictvTask, byId=new Map(nodes.map(n=>[n.id,n]));
  const p=new URL(request.url).searchParams, mode=p.get("mode")||"roots", id=p.get("id")||"", offset=Number(p.get("cursor")||0);
  if(p.get("version")&&p.get("version")!=="MSL41.v1")return json({error:"INVALID_VERSION"},400);
  if(!Number.isSafeInteger(offset)||offset<0)return json({error:"INVALID_CURSOR"},400);
  if(mode==="node"){
    const node=byId.get(id);if(!node)return json({error:"NOT_FOUND"},404);
    const path:TaxonomyNode[]=[];let current:TaxonomyNode|undefined=node;
    while(current){path.unshift(current);current=current.parentId?byId.get(current.parentId):undefined;}
    return json({node,path,cached:true});
  }
  if(!["roots","children","search"].includes(mode))return previewUnavailable();
  const q=(p.get("q")||"").toLocaleLowerCase("tr"), rank=p.get("rank"), status=p.get("status"), within=p.get("within");
  if(mode==="search"&&!q)return json({error:"INVALID_QUERY"},400);
  const inBranch=(node:TaxonomyNode)=>{let n:TaxonomyNode|undefined=node;while(n){if(n.id===within)return true;n=n.parentId?byId.get(n.parentId):undefined;}return false;};
  const matches=nodes.filter(n=>mode==="roots"?!n.parentId:mode==="children"?n.parentId===id:(!rank||n.rank===rank.toUpperCase())&&(!status||n.status===status)&&(!within||inBranch(n))&&[n.name,n.id,...n.synonyms.map(s=>s.name)].some(s=>s.toLocaleLowerCase("tr").includes(q))).sort((a,b)=>a.name.localeCompare(b.name,"en")||a.id.localeCompare(b.id));
  return json({records:matches.slice(offset,offset+36),total:matches.length,next:offset+36<matches.length?String(offset+36):null,version:"MSL41.v1",cached:true});
}

export async function previewResponse(request:Request, original:typeof fetch, base:URL):Promise<Response> {
  const url=new URL(request.url), path=url.pathname, p=url.searchParams;
  if(request.method!=="GET")return previewUnavailable();
  switch(path){
    case "/api/state": return json({error:"AUTH_REQUIRED"},401);
    case "/api/map-config": return json({key:null});
    case "/api/flora": return (await import("../app/api/flora/route")).GET(request);
    case "/api/flora-detail": {
      const response=await (await import("../app/api/flora/route")).GET(new Request(new URL("/api/flora?id="+encodeURIComponent(p.get("id")||""),url)));
      if(!response.ok)return response;const data=await response.json() as {record:{sourcePublishedName?:string};metadata?:unknown};
      return json({...data,detailStatus:data.record.sourcePublishedName?"verified":"unavailable"});
    }
    case "/api/feed": return (await import("../app/api/feed/route")).GET(request);
    case "/api/life": return (await import("../app/api/life/handler")).handleLife(request,sourceFetch);
    case "/api/gbif": return (await import("../app/api/gbif/handler")).handleGbif(request,sourceFetch);
    case "/api/nature": return (await import("../app/api/nature/handler")).handleNature(request,sourceFetch);
    case "/api/fungi": return (await import("../app/api/fungi/handler")).handleFungi(request,sourceFetch);
    case "/api/explore": return (await import("../app/api/explore/route")).GET(request);
    case "/api/regions": return (await import("../app/api/regions/route")).GET(request);
    case "/api/catalogs": return (await import("../app/api/catalogs/handler")).handleCatalogs(request,sourceFetch);
    case "/api/vernacular": return (await import("../app/api/vernacular/handler")).handleVernacular(request);
    case "/api/taxonomy": {
      if(p.get("source")==="ictv")return ictv(request,original,base);
      if((!p.get("source")||p.get("source")==="itis")&&(!p.get("mode")||p.get("mode")==="roots"))return json({records:itisRoots,total:itisRoots.length,next:null,version:"live",cached:true});
      return (await import("../app/api/taxonomy/handler")).handleTaxonomy(request,undefined,sourceFetch);
    }
    default: return previewUnavailable();
  }
}

export function installPreviewApi() {
  const original=window.fetch.bind(window),base=new URL((import.meta as ImportMeta & {env:{BASE_URL:string}}).env.BASE_URL,location.origin);
  window.fetch=async(input:RequestInfo|URL,init?:RequestInit)=>{
    const request=new Request(input instanceof Request?input:new URL(String(input),location.href),init),url=new URL(request.url);
    if(url.origin!==location.origin)return original(request);
    const relative=url.pathname.startsWith(base.pathname)?url.pathname.slice(base.pathname.length):url.pathname.replace(/^\//,"");
    const apiPath="/"+relative;
    if(!apiPath.startsWith("/api/"))return original(request);
    const logical=new URL(url);logical.pathname=apiPath;
    try{return await previewResponse(new Request(logical,request),original,base);}catch{return previewUnavailable();}
  };
  // Keep explicit root navigation links inside this repository's Pages path.
  document.addEventListener("click",event=>{
    const anchor=(event.target as Element)?.closest<HTMLAnchorElement>("a[href]");if(!anchor)return;
    const href=anchor.getAttribute("href")||"";
    if(href.startsWith("/?")||href==="/")anchor.href=base.pathname+href.slice(1);
    if(href.startsWith("/signin-with-chatgpt")||href.startsWith("/signout-with-chatgpt")){event.preventDefault();alert("Üyelik işlemleri için sunucu bağlantısı gerekir.");}
  },true);
}
