import {rawDatabase} from "../../../db/runtime";
import {taxonomyDetail} from "../taxonomy/handler";
import {taxonomySources,type TaxonomySource} from "../../taxonomy-types";
import type {AssistantSource} from "../../assistant-types";
import { handleAssistant } from "./handler";
import { assistantRuntime } from "./runtime";
export const dynamic="force-dynamic";
export async function GET(){const env=await assistantRuntime();return Response.json({available:Boolean(env.apiKey||env.geminiKey),googleAvailable:Boolean(env.geminiKey)},{headers:{"Cache-Control":"no-store"}});}
export async function POST(request:Request){const runtime=await assistantRuntime();let taxonomySource:AssistantSource|undefined;
 if(request.headers.get("oai-authenticated-user-id")){try{const body=await request.clone().json() as {taxonomy?:{source:string;id:string;version?:string}};const selection=body.taxonomy;if(selection&&taxonomySources.includes(selection.source as TaxonomySource)&&typeof selection.id==="string"&&selection.id.length<=120){const d=await taxonomyDetail(selection.source as TaxonomySource,selection.id,await rawDatabase(),fetch,selection.version);const n=d.node;taxonomySource={id:n.key,title:n.name,scientificName:n.name,family:d.path.find(p=>p.rank==="FAMILY")?.name||"",href:n.sourceUrl,profile:{kind:"taxonomy",id:n.id,source:n.source,version:n.version},facts:[{label:"Bilimsel ad",value:n.name},{label:"Basamak",value:n.rank},{label:"Ad durumu",value:n.status},{label:"Sınıflandırma yolu",value:d.path.map(p=>p.name).join(" → ")},{label:"Kaynak / sürüm",value:`${n.source} / ${n.version}`},...(n.author?[{label:"Yazar",value:n.author}]:[]),...(n.publication?[{label:"Yayımlanma",value:n.publication}]:[]),...(n.facts||[])]};}}catch{return Response.json({error:"TAXON_CONTEXT_UNAVAILABLE"},{status:503});}}
 return handleAssistant(request,{...runtime,taxonomySource});}
