import source from "./data/tubives.json" with { type:"json" };
import { plants } from "./plant-data.ts";
import { emptyCatalog, type CatalogState } from "./catalog-state.ts";
import type { AssistantSource } from "./assistant-types.ts";
export const normalizeAssistant = (v:string) => v.toLocaleLowerCase("tr").replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"").replace(/[^a-z0-9\s]/g," ");
const provinces = [...new Set(source.records.flatMap(row => row.provinces))];
const families = [...new Set(source.records.map(row => row.family))];
const unknown = (v:string|undefined) => !v || /^(bilinmiyor|\?|[-\s]*1--1)$/i.test(v.trim());
const stop = new Set("bitki bitkiler bitkileri tur turler turleri takson taksonlar goster ara bul nelerdir nerede nerelerde yetisir yetisiyor hakkinda bilgi ver nedir endemik olan olmayan ile ve bir bana icin kayit kayitli kayitlar kayitlari kayitlarini liste yayilis bakim nasil daha hangi the plant plants show find where grows about what endemic in is are of and me tell to a does care daki deki nin nun".split(" "));
export function assistantContext(question:string,language:"tr"|"en") {
  const normalized = normalizeAssistant(question);
  const province = provinces.find(p => new RegExp(`(?:^|\\s)${normalizeAssistant(p)}(?=\\s|da|de|ta|te|nin|$)`).test(normalized)) || "";
  const family = families.find(f => normalized.includes(normalizeAssistant(f))) || "";
  const endemic = /\bendemik\b|\bendemic\b/.test(normalized) && !/endemik\s+olmayan|not\s+endemic/.test(normalized);
  const words = normalized.split(/\s+/).filter(word => word.length > 2 && !stop.has(word) && word !== normalizeAssistant(province) && word !== normalizeAssistant(family));
  const named = plants.filter(p => words.some(word => normalizeAssistant(`${p.name} ${p.latin}`).includes(word))).sort((a,b) => {
    const score=(p:typeof a) => words.filter(word => normalizeAssistant(`${p.name} ${p.latin}`).includes(word)).length;
    return score(b)-score(a);
  });
  const exactNamed = named.find(p => normalized.includes(normalizeAssistant(p.name)) || normalized.includes(normalizeAssistant(p.latin)));
  const query = exactNamed ? exactNamed.latin.split(" ").slice(0, /^(subsp\.|var\.)$/.test(exactNamed.latin.split(" ")[2] || "") ? 4 : 2).join(" ") : words.join(" ");
  const filters:CatalogState = { ...emptyCatalog,q:query,province,family,endemic };
  const terms = normalizeAssistant(query).split(/\s+/).filter(Boolean);
  const matches = source.records.filter(row => (!province || row.provinces.includes(province)) && (!family || row.family === family) && (!endemic || normalizeAssistant(row.endemism) === "endemik") && (!terms.length || terms.every(term => normalizeAssistant(`${row.name} ${row.commonName || ""} ${row.family} ${row.genus}`).includes(term))));
  matches.sort((a,b)=>a.name.localeCompare(b.name,"en") || a.id-b.id);
  const selected = matches.slice(0,6);
  const sources:AssistantSource[] = [];
  if (!province && !family && !endemic) for(const p of (exactNamed ? [exactNamed] : named.slice(0,2))) {
    sources.push({ id:`plant-${p.id}`,title:p.name,scientificName:p.latin,family:p.family,href:p.source,profile:{kind:"plant",id:p.id},facts:[{label:language === "en" ? "Description" : "Açıklama",value:p.description},{label:language === "en" ? "Distribution" : "Yayılış",value:p.range},...(p.leafNote ? [{label:language === "en" ? "Leaves" : "Yaprak",value:p.leafNote}] : [])] });
  }
  for(const row of selected) sources.push({id:`flora-${row.id}`,title:row.commonName || row.name,scientificName:row.name,family:row.family,href:row.source,profile:{kind:"flora",id:String(row.id)},facts:[
    {label:language === "en" ? "Habitat" : "Habitat",value:row.habitat},{label:language === "en" ? "Elevation" : "Rakım",value:unknown(row.elevation) ? "" : `${row.elevation} m`},{label:language === "en" ? "Life cycle" : "Yaşam",value:row.life},{label:language === "en" ? "Provinces" : "İller",value:row.provinces.join(", ")},{label:language === "en" ? "Endemism" : "Endemizm",value:row.endemism}
  ].filter(fact => !unknown(fact.value))});
  const total = matches.length;
  const count=total.toLocaleString(language === "en" ? "en-GB" : "tr-TR");
  let answer = language === "en" ? (total ? `${count} catalogue records match${province ? ` in ${province}` : ""}${endemic ? " with endemic status" : ""}. Open a profile for the complete source information.` : sources.length ? "A sourced photo profile matches. Open the profile below." : "No matching catalogue record was found. Try the scientific name or a shorter plant name.") : (total ? `${province ? `${province} için ` : ""}${endemic ? "endemik olarak kayıtlı " : ""}${count} takson bulundu. Kaynak bilgileriyle ilk kayıtları aşağıdan açabilirsin.` : sources.length ? "Fotoğraflı katalogda eşleşen bir tür künyesi var. Aşağıdan açabilirsin." : "Bu ifadeyle eşleşen kayıt bulunamadı. Bilimsel adla veya daha kısa bir bitki adıyla deneyebilirsin.");
  if(exactNamed && !province && !family && !endemic && exactNamed.description) answer=`${exactNamed.description}${exactNamed.range ? `\n\n${language === "en" ? "Natural distribution" : "Doğal yayılış"}: ${exactNamed.range}` : ""}`;
  return {filters,sources,total,answer};
}
