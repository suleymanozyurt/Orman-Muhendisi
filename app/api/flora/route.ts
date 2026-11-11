import source from "../../data/tubives.json" with { type: "json" };
import sourceAudit from "../../data/tubives-source.json" with { type: "json" };
import type { FloraRecord } from "../../tubives-types";
export const dynamic = "force-dynamic";
const records = source.records as FloraRecord[];
const normalize = (value: string) => value.toLocaleLowerCase("tr").replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
const unique = (values: string[]) => [...new Set(values)].sort((a,b)=>a.localeCompare(b,"tr"));
const allFacets = { family: unique(records.map(row=>row.family)), genus: unique(records.map(row=>row.genus)), province: unique(records.flatMap(row=>row.provinces)), grid: unique(records.flatMap(row=>row.grids)), life: unique(records.map(row=>row.life).filter(Boolean)), form: unique(records.map(row=>row.form).filter(Boolean)) };
export async function GET(request: Request) {
  const input = new URL(request.url).searchParams;
  if(input.get("statistics")==="1"){
    const counts=(values:string[],kind:"province"|"grid"|"family")=>values.map(name=>({name,count:records.filter(row=>kind==="family"?row.family===name:kind==="province"?row.provinces.includes(name):row.grids.includes(name)).length})).sort((a,b)=>b.count-a.count||a.name.localeCompare(b.name,"tr"));
    return Response.json({total:records.length,ranks:{species:records.filter(r=>r.rank==="species").length,subspecies:records.filter(r=>r.rank==="subspecies").length,variety:records.filter(r=>r.rank==="variety").length},named:records.filter(r=>r.commonName).length,endemic:records.filter(r=>normalize(r.endemism)==="endemik").length,families:counts(allFacets.family,"family"),provinces:counts(allFacets.province,"province"),grids:counts(allFacets.grid,"grid"),metadata:source.metadata,audit:sourceAudit},{headers:{"Cache-Control":"public, max-age=3600"}});
  }
  if (input.has("id")) {
    const id = Number(input.get("id"));
    if (!Number.isInteger(id) || id < 1) return Response.json({error:"INVALID_ID"},{status:400});
    const record = records.find(row=>row.id===id);
    return record ? Response.json({record,metadata:source.metadata},{headers:{"Cache-Control":"public, max-age=3600"}}) : Response.json({error:"NOT_FOUND"},{status:404});
  }
  const offset = Number(input.get("offset") || 0); const limit = Number(input.get("limit") || 48);
  if (!Number.isInteger(offset) || offset < 0 || !Number.isInteger(limit) || limit < 1 || limit > 100) return Response.json({error:"INVALID_PAGE"},{status:400});
  const q = normalize((input.get("q") || "").trim().slice(0,160));
  const family = input.get("family"); const genus = input.get("genus"); const province = input.get("province"); const grid = input.get("grid");
  const provinces = input.getAll("provinces").slice(0,81);
  const endemic = input.get("endemic") === "1";
  const rank = input.get("rank") || "", life = input.get("life") || "", form = input.get("form") || "";
  const sort = input.get("sort") || "scientific";
  if (!["scientific", "common", "family"].includes(sort) || rank && !["species", "subspecies", "variety"].includes(rank)) return Response.json({error:"INVALID_FILTER"},{status:400});
  const words = q.split(/\s+/).filter(Boolean);
  const matches = records.filter(row=>(!q || words.every(word => normalize(`${row.name} ${row.commonName || ""} ${row.publishedName || ""} ${row.family} ${row.genus} ${row.provinces.join(" ")}`).includes(word))) && (!family || row.family===family) && (!genus || row.genus===genus) && (!province || row.provinces.includes(province)) && (!provinces.length || provinces.some(p=>row.provinces.includes(p))) && (!grid || row.grids.includes(grid)) && (!endemic || normalize(row.endemism)==="endemik") && (!rank || row.rank===rank) && (!life || row.life===life) && (!form || row.form===form));
  matches.sort((a,b)=> (sort === "common" ? Number(!a.commonName)-Number(!b.commonName) || (a.commonName || "").localeCompare(b.commonName || "", "tr") : sort === "family" ? a.family.localeCompare(b.family,"en") : 0) || a.name.localeCompare(b.name,"en") || a.id-b.id);
  if (input.get("format") === "csv") {
    const fields = ["id","name","commonName","sourcePublishedName","publishedName","lifeForm","family","genus","rank","life","form","flowering","habitat","elevation","endemism","floristicRegion","turkeyRange","globalRange","provinces","grids","source"] as const;
    const escape = (v:unknown)=>`"${String(Array.isArray(v) ? v.join(", ") : v ?? "").replace(/^[=+@-]/,"'").replaceAll('"','""')}"`;
    const csv = "\uFEFF" + [fields.map(escape).join(";"),...matches.map(row=>fields.map(key=>escape(row[key])).join(";"))].join("\r\n");
    return new Response(csv,{headers:{"Content-Type":"text/csv; charset=utf-8","Content-Disposition":"attachment; filename=orman-muhendisi-tubives.csv","Cache-Control":"public, max-age=3600"}});
  }
  return Response.json({records:matches.slice(offset,offset+limit),total:matches.length,metadata:source.metadata,facets:{...allFacets,genus:family ? unique(records.filter(row=>row.family===family).map(row=>row.genus)) : allFacets.genus}},{headers:{"Cache-Control":"public, max-age=3600"}});
}
