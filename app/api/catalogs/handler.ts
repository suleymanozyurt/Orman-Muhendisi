import { catalogRegions, catalogSources, type CatalogPage, type CatalogNode, type CatalogSource, type CatalogMode } from "../../catalog-types.ts";
import { bizimDetail, bizimOptions, bizimSpecies, inatTaxon, plantnetTaxon } from "../../catalog-adapters.ts";
import { ResolvedSourceCache } from "../../resolved-source-cache.ts";
import {itisTaxon,powoTaxon,powoId,solrLiteral} from "../../reference-catalog-adapters.ts";
const cache = new ResolvedSourceCache<{ body: string; total: number | null }>(8 * 1024 * 1024, 120);
const normalize = (v: string) => v.toLocaleLowerCase("tr").replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export async function handleCatalogs(request: Request, fetcher: typeof fetch = fetch) {
  const p = new URL(request.url).searchParams, source = (p.get("source") || "plantnet") as CatalogSource, mode = (p.get("mode") || "species") as CatalogMode;
  const q = (p.get("q") || "").trim(), family = p.get("family") || "", genus = p.get("genus") || "", id = p.get("id") || "", parent = p.get("parent") || "", group = p.get("group") || "TBL", region = p.get("region") || "", page = Number(p.get("page") || 1), endemic = p.get("endemic") === "1", lang = p.get("language") === "en" ? "en" : "tr";
  const cursor=p.get("cursor")||"";
  if (!Object.hasOwn(catalogSources,source) || !["species","families","genera","projects","taxa","kingdoms"].includes(mode) || !Number.isInteger(page) || page < 1 || page > 100000 || [q,family,genus,id,parent].some(s => s.length > 200 || /[\u0000-\u001f]/.test(s)) || cursor.length>2048 || /[\u0000-\u001f]/.test(cursor) || !["TBL","LK","KY","SY","MN"].includes(group) || region && !(region in catalogRegions) || ["inaturalist","itis"].includes(source) && [id,parent].some(s => s && !/^[1-9]\d{0,9}$/.test(s)) || source === "powo" && id && !powoId(id) || source === "bizimbitkiler" && id && !/^[1-9]\d{0,8}$/.test(id)) return Response.json({error:"INVALID_QUERY"},{status:400});
  if(mode==="kingdoms"&&source!=="itis"||mode==="taxa"&&!["itis","powo"].includes(source))return Response.json({error:"INVALID_MODE"},{status:400});
  const base = { source, mode, records: [] as CatalogNode[], total: null as number | null, page, hasMore: false, retrievedAt: new Date().toISOString(), sourceUrl: catalogSources[source] };
  async function get(url: URL, post = false) {
    const key = `${post ? "POST" : "GET"}:${lang}:${url.href}`, previous = fetcher === fetch ? cache.get(key) : undefined;
    if (previous) return previous;
    const r = await fetcher(url, {method:post?"POST":"GET",headers:{Accept:"application/json,text/html","Accept-Language":lang,...post?{"Content-Type":"application/json"}:{}},...post?{body:'{"traits":[]}'}:{},signal:AbortSignal.timeout(12000)});
    if (r.status === 404 && source === "plantnet") return {body:"[]",total:0};
    if (!r.ok) throw new Error(`SOURCE_UNAVAILABLE_${r.status}`);
    const body = await r.text(); if (body.length > 5000000) throw new Error("SOURCE_RESPONSE_TOO_LARGE");
    const raw = r.headers.get("full-count"), total = raw !== null && /^\d+$/.test(raw) ? Number(raw) : null;
    const data={body,total};
    if (fetcher === fetch) cache.set(key,data,600000);
    return data;
  }
  const json = async (url: URL) => JSON.parse((await get(url)).body);
  const reply = (data: CatalogPage) => Response.json(data,{headers:{"Cache-Control":"public,max-age=300"}});
  try {
    if(source==="itis"){
      if(mode==="projects")return Response.json({error:"INVALID_MODE"},{status:400});
      const url=new URL("https://services.itis.gov/");
      url.searchParams.set("wt","json");url.searchParams.set("rows","24");url.searchParams.set("start",String(id?0:(page-1)*24));
      url.searchParams.set("sort","nameWOInd asc,tsn asc");
      url.searchParams.set("q",id?`tsn:${id}`:q?`(nameWOInd:"${solrLiteral(q)}" OR vernacular:"${solrLiteral(q)}")`:"*:*");
      if(!id){
        const rank=({species:"Species",families:"Family",genera:"Genus",kingdoms:"Kingdom"} as Record<string,string>)[mode];
        if(rank)url.searchParams.append("fq",`rank:${rank}`);
        if(parent)url.searchParams.append("fq",`hierarchyTSN:*\\$${parent}\\$*`);
        else if(genus||family)url.searchParams.append("fq",`hierarchySoFar:"$${solrLiteral(genus||family)}$"`);
      }
      const d=await json(url);if(!Array.isArray(d.response?.docs)||!Number.isSafeInteger(d.response.numFound))throw new Error("INVALID_SOURCE_RESPONSE");
      const rows=d.response.docs;if(rows.some((r:any)=>!r||!/^\d+$/.test(r.tsn)||typeof r.nameWOInd!=="string"))throw new Error("INVALID_SOURCE_RESPONSE");
      const records=rows.map(itisTaxon);
      return reply({...base,records,total:d.response.numFound,hasMore:page*24<d.response.numFound,...id?{node:records[0]}:{},rights:{label:"ITIS · CC0",url:"https://www.itis.gov/privacy.html",attribution:`Integrated Taxonomic Information System (ITIS), www.itis.gov. Retrieved ${base.retrievedAt.slice(0,10)}.`,note:lang==="en"?"CC0 applies to ITIS-produced taxonomy. Third-party images and texts are not copied.":"CC0, ITIS’in ürettiği taksonomi verileri içindir. Üçüncü taraf fotoğrafları ve metinleri kopyalanmaz."}});
    }
    if(source==="powo"){
      if(mode==="projects")return Response.json({error:"INVALID_MODE"},{status:400});
      if(!id&&page>1&&!cursor)return Response.json({error:"CURSOR_REQUIRED"},{status:400});
      const url=new URL(id?`https://powo.science.kew.org/api/2/taxon/${id}`:"https://powo.science.kew.org/api/2/search");
      if(!id){
        url.searchParams.set("perPage","24");url.searchParams.set("cursor",cursor||"*");
        const terms=[q,genus?`genus:${genus}`:family?`family:${family}`:""].filter(Boolean);if(terms.length)url.searchParams.set("q",terms.join(","));
        const filter=({species:"species_f",families:"families_f",genera:"genus_f"} as Record<string,string>)[mode];if(filter)url.searchParams.set("f",filter);
      }
      const d=await json(url);
      if(id){if(!powoId(d.fqId)||typeof d.name!=="string")throw new Error("INVALID_SOURCE_RESPONSE");}
      else if(!Array.isArray(d.results)||!Number.isSafeInteger(d.totalResults)||d.results.some((r:any)=>!r||!powoId(r.fqId)||typeof r.name!=="string"))throw new Error("INVALID_SOURCE_RESPONSE");
      const records=(id?[d]:d.results).map(powoTaxon),total=id?1:d.totalResults,nextCursor=typeof d.cursor==="string"&&d.cursor.length<=2048?d.cursor:undefined;
      return reply({...base,records,total,hasMore:!id&&page*24<total&&Boolean(nextCursor&&nextCursor!==(cursor||"*")),nextCursor,...id?{node:records[0]}:{},rights:{label:"IPNI / WCVP · CC BY 3.0 (taksonomi)",url:"https://www.kew.org/science/collections-and-resources/data-and-digital/terms-of-use",attribution:`POWO (${new Date().getUTCFullYear()}). Plants of the World Online. Royal Botanic Gardens, Kew. https://powo.science.kew.org/ Retrieved ${base.retrievedAt.slice(0,10)}.`,note:lang==="en"?"Only taxonomy metadata is displayed. Images and descriptive texts have separate rights. RBG Kew cannot warrant the quality or accuracy of the data; this service is not endorsed by Kew.":"Yalnız taksonomi künyesi gösterilir. Fotoğraf ve açıklamaların hakları ayrıdır. RBG Kew verinin kalitesini veya doğruluğunu garanti etmez; bu hizmet Kew tarafından onaylanmış değildir."}});
    }
    if (source === "plantnet") {
      if (mode === "projects") return Response.json({error:"INVALID_MODE"},{status:400});
      const url = new URL(`https://api.plantnet.org/v1/projects/k-world-flora/${mode}`);
      for (const [key,value] of Object.entries({page:String(page-1),pageSize:"24",...mode==="species"?{imagesPerSpecies:"1"}:{},includeObserved:"true",illustratedOnly:"false",sortBy:"name",sortOrder:"asc",search:q,family,genus})) if (value) url.searchParams.set(key,value);
      const d = await get(url,mode === "species"), rows = JSON.parse(d.body);
      if (!Array.isArray(rows)) throw new Error("INVALID_SOURCE_RESPONSE");
      const records = rows.filter(r => typeof r.name === "string").map(r => plantnetTaxon(r,mode === "families"?"family":mode === "genera"?"genus":"species"));
      return reply({...base,records,total:d.total,hasMore:d.total === null?rows.length===24:page*24<d.total});
    }
    if (source === "inaturalist") {
      const url = new URL(`https://api.inaturalist.org/v1/${mode === "projects" ? "projects" : id ? `taxa/${id}` : "taxa"}`);
      url.searchParams.set("locale",lang);url.searchParams.set("per_page","24");url.searchParams.set("page",String(page));
      if (q) url.searchParams.set("q",q);
      if (mode !== "projects" && !id) { url.searchParams.set("is_active","true");url.searchParams.set("rank",mode === "families"?"family":mode === "genera"?"genus":"species");if(parent)url.searchParams.set("taxon_id",parent); }
      const d = await json(url);if(!Array.isArray(d.results)||!Number.isSafeInteger(d.total_results))throw new Error("INVALID_SOURCE_RESPONSE");
      const records: CatalogNode[] = d.results.filter((r: any) => Number.isSafeInteger(r.id)).map((r: any) => mode === "projects" ? {id:String(r.id),name:String(r.title||""),commonName:"",rank:"project",description:String(r.description||"").replace(/<[^>]*>/g," ").slice(0,500),source:`https://www.inaturalist.org/projects/${r.id}`} : inatTaxon(r));
      return reply({...base,records,total:d.total_results,hasMore:page*24<d.total_results,...id?{node:records[0]}:{}});
    }
    const url = (path: string, params: Record<string,string> = {}) => { const u = new URL(path,catalogSources.bizimbitkiler);for(const [key,value] of Object.entries(params))u.searchParams.set(key,value);return u; };
    if (mode === "projects") return Response.json({error:"INVALID_MODE"},{status:400});
    if (id) { const d = await get(url("getDetails.php",{id,type:"accepted"}));const node= bizimDetail(d.body,id);if(!node.name)throw new Error("INVALID_SOURCE_RESPONSE");return reply({...base,node,records:[],total:1}); }
    let rows: CatalogNode[], stats: CatalogPage["stats"];
    if (group !== "TBL") {
      const d = await json(url("list.php",{type:group}));if(!Array.isArray(d))throw new Error("INVALID_SOURCE_RESPONSE");
      const decode = (s: string) => s.replace(/\\u([0-9a-f]{4})/gi,(_,hex:string)=>String.fromCharCode(parseInt(hex,16)));
      rows=d.filter((r:any)=>typeof r.l==="string").map((r:any)=>({id:r.l,name:decode(r.l),commonName:decode(String(r.t||"")),rank:"species",source:`${catalogSources.bizimbitkiler}?grp=${group}&ad=${encodeURIComponent(r.l)}`}));
    } else if (mode === "families") {
      const [d,s]=await Promise.all([get(url("getFamilies.php")),json(url("stats.php")).catch(()=>null)]);rows=bizimOptions(d.body,"family");
      if(s?.totals && [s.totals.taxa,s.totals.endemik,s.totals.familya,s.totals.cins].every(Number.isSafeInteger))stats={taxa:s.totals.taxa,endemic:s.totals.endemik,families:s.totals.familya,genera:s.totals.cins};
    } else if (mode === "genera") {
      if(!family)return Response.json({error:"FAMILY_REQUIRED"},{status:400});rows=bizimOptions((await get(url("getGenus.php",{familya:family}))).body,"genus");
    } else {
      const params={selectFamilya:family,selectCins:genus,taxon:q,taxonKriter:"1",trkAdi:"",trkKriter:"1",endemik:endemic?"+":""};
      const queryUrl=url("doAdvanced.php",params);if(region)queryUrl.searchParams.append("selectedRegion[]",`yayilis_${region}`);
      const d=await get(queryUrl);rows=bizimSpecies(d.body);
      if(q){const commonUrl=url("doAdvanced.php",{...params,taxon:"",trkAdi:q});if(region)commonUrl.searchParams.append("selectedRegion[]",`yayilis_${region}`);const common=bizimSpecies((await get(commonUrl)).body);rows=[...new Map([...rows,...common].map(r=>[r.id,r])).values()];}
    }
    if(q && (mode!=="species"||group!=="TBL"))rows=rows.filter(r=>normalize(`${r.name} ${r.commonName}`).includes(normalize(q)));
    if(endemic)rows=rows.filter(r=>r.endemic);if(region)rows=rows.filter(r=>r.regions?.includes(region));
    const total=rows.length;return reply({...base,records:rows.slice((page-1)*24,page*24),total,hasMore:page*24<total,stats});
  } catch (cause) { console.warn("Catalogue source unavailable",source,cause instanceof Error?cause.message:"unknown");return Response.json({error:"SOURCE_UNAVAILABLE",source,sourceUrl:catalogSources[source]},{status:503,headers:{"Cache-Control":"no-store"}}); }
}
