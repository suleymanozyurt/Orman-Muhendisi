import type {FloraRecord} from "./tubives-types";
const decode=(raw:string)=>raw.replace(/&(?:nbsp|amp|lt|gt|quot|apos);|&#(?:x[0-9a-f]+|\d+);/gi,match=>{const known:Record<string,string>={"&nbsp;":" ","&amp;":"&","&lt;":"<","&gt;":">","&quot;":'"',"&apos;":"'"};if(known[match.toLowerCase()])return known[match.toLowerCase()];const code=match.slice(2,-1);const number=code[0].toLowerCase()==="x"?parseInt(code.slice(1),16):parseInt(code,10);return number>0&&number<=0x10ffff?String.fromCodePoint(number):"";});
const text=(raw:string)=>decode(raw.replace(/<[^>]*>/g," ")).replace(/\s+/g," ").trim();
const canonical=(raw:string)=>raw.replace(/ alttür /g," subsp. ").replace(/ varyete /g," var. ");
export function parseOriginalDetail(raw:string,record:FloraRecord):Partial<FloraRecord>{
 const family=raw.match(/<b>Family<\/b>[\s\S]*?<big>([\s\S]*?)<\/big>/i),taxon=raw.match(/<b>Taxon<\/b>[\s\S]*?<big>([\s\S]*?)<\/big>/i);
 if(!family||!taxon||text(family[1])!==record.family||canonical(text(taxon[1].replace(/<small>[\s\S]*?<\/small>/gi,"")))!==record.name)throw new Error("SOURCE_IDENTITY_MISMATCH");
 const part=raw.split("Taxonomic Hierarchy")[1]?.split("General Taxon Information")[0];if(part===undefined)throw new Error("SOURCE_FORMAT_CHANGED");
 const hierarchy=[...part.matchAll(/(Kingdom|Subkingdom|Division|Class|Order|Family|Genus|Species|Subspecies|Variety)\s*<b><i>([\s\S]*?)<\/i><\/b>\s*<small>([\s\S]*?)<\/small>/gi)].map(m=>({rank:m[1].toLowerCase(),name:canonical(text(m[2])),author:text(m[3])}));
 const general=raw.split("General Taxon Information")[1]?.split("Distribution of The Taxon")[0];if(!general)throw new Error("SOURCE_FORMAT_CHANGED");
 const fields=Object.fromEntries([...general.matchAll(/<b>([^<]+)<\/b>\s*<TD><SMALL>([\s\S]*?)(?=<TR>|<\/TABLE>)/gi)].map(m=>[text(m[1]),text(m[2]).replace(/^:/,"").trim()]));
 const keyMap:Record<string,keyof FloraRecord>={"Ömür":"life","Yapı":"form","Çiçeklenme":"flowering","Habitat":"habitat","Yükseklik":"elevation","Endemik":"endemism","Element":"floristicRegion","Türkiye dağılımı":"turkeyRange","Genel Dağılımı":"globalRange"};
 for(const [key,field] of Object.entries(keyMap))if(fields[key]!==undefined&&fields[key]!==record[field])throw new Error("SOURCE_FIELDS_CHANGED");
 return {sourcePublishedName:canonical(text(taxon[1])),hierarchy,lifeForm:fields["Hayat Formu"]||"",hierarchyConflict:Boolean(hierarchy.length)&&!hierarchy.some(h=>h.rank==="family"&&h.name===record.family)};
}
