import type { View } from "./navigation";
import type { Language } from "./i18n";
import type { Icon } from "./icons";

export type SectionGroup = "main" | "research" | "care" | "knowledge" | "shopping" | "personal";
type Section = { view: View; tr: string; en: string; description: string; descriptionEn: string; icon: Parameters<typeof Icon>[0]["name"]; group: SectionGroup; terms?: string };
export const siteSections: Section[] = [
  {view:"home",tr:"Ana sayfa",en:"Home",description:"Fotoğraflar ve gözlemler",descriptionEn:"Photos and observations",icon:"home",group:"main",terms:"akış feed"},
  {view:"explore",tr:"Keşfet",en:"Explore",description:"Doğadan fotoğraflar ve gözlemler",descriptionEn:"Nature photos and observations",icon:"compass",group:"main"},
  {view:"discover",tr:"Taksonomi",en:"Taxonomy",description:"Âlemlerden türlere bilimsel sınıflandırma",descriptionEn:"Explore the tree of life",icon:"tree",group:"main",terms:"taksonomi taxonomy"},
  {view:"database",tr:"Veri tabanı",en:"Database",description:"Türkiye florası ve künyeler",descriptionEn:"Türkiye flora and profiles",icon:"grid",group:"main",terms:"tübives tubives flora"},
  {view:"map",tr:"Harita",en:"Map",description:"Dünyadaki tür kayıtları",descriptionEn:"Species records worldwide",icon:"pin",group:"main",terms:"konum yer location"},
  {view:"catalogs",tr:"Dünya katalogları",en:"World catalogues",description:"Pl@ntNet · iNaturalist · BizimBitkiler · Kew POWO · ITIS",descriptionEn:"Pl@ntNet · iNaturalist · BizimBitkiler · Kew POWO · ITIS",icon:"grid",group:"research",terms:"plantnet plant net bizim bitkiler kew powo itis integrated taxonomic"},
  {view:"gbif",tr:"GBIF araştırma",en:"GBIF research",description:"Kayıt, veri seti ve istatistik",descriptionEn:"Records, datasets and statistics",icon:"compass",group:"research"},
  {view:"nature",tr:"Doğa gözlemleri",en:"Nature observations",description:"Bitki, mantar ve hayvan fotoğrafları",descriptionEn:"Plant, fungi and animal photos",icon:"compass",group:"research"},
  {view:"fungi",tr:"Mantarlar",en:"Fungi",description:"Mantar türleri ve künyeleri",descriptionEn:"Fungi species and profiles",icon:"mushroom",group:"research"},
  {view:"birds",tr:"Kuşlar",en:"Birds",description:"Fotoğraflar ve kayıt haritası",descriptionEn:"Photos and occurrence map",icon:"bird",group:"research"},
  {view:"care",tr:"Bitki bakımı",en:"Plant care",description:"Bitkilerim, plan ve takvim",descriptionEn:"My plants, plans and calendar",icon:"leaf",group:"care"},
  {view:"health",tr:"Bitki sağlığı",en:"Plant health",description:"Belirtileri değerlendirme",descriptionEn:"Assess plant symptoms",icon:"health",group:"care"},
  {view:"forestry",tr:"Ormancılık",en:"Forestry",description:"Saha yöntemleri ve kaynaklar",descriptionEn:"Field methods and resources",icon:"tree",group:"knowledge"},
  {view:"publications",tr:"Bilimsel yayınlar",en:"Publications",description:"Başlık, yazar ve konu ara",descriptionEn:"Search titles, authors and subjects",icon:"paper",group:"knowledge"},
  {view:"library",tr:"Kütüphane",en:"Library",description:"Fotoğraflı tür künyeleri",descriptionEn:"Illustrated species profiles",icon:"book",group:"knowledge"},
  {view:"glossary",tr:"Sözlük",en:"Glossary",description:"Botanik terimleri",descriptionEn:"Botanical terms",icon:"book",group:"knowledge"},
  {view:"social",tr:"Paylaşımlarımız",en:"Our posts",description:"Doğa yazıları, fotoğraf ve video",descriptionEn:"Nature writing, photos and videos",icon:"share",group:"knowledge",terms:"sosyal instagram facebook youtube tiktok x"},
  {view:"store",tr:"Kitap ve fidan",en:"Books and seedlings",description:"İlanlar ve siparişler",descriptionEn:"Listings and orders",icon:"cart",group:"shopping"},
  {view:"nurseries",tr:"Fidanlıklar",en:"Nurseries",description:"Fidanlık ve tür araştırma",descriptionEn:"Find nurseries and species",icon:"leaf",group:"shopping"},
  {view:"collections",tr:"Koleksiyonlar",en:"Collections",description:"Bir araya getirdiğin türler",descriptionEn:"Your collected species",icon:"save",group:"personal"},
  {view:"profile",tr:"Profil",en:"Profile",description:"Gözlemlerin ve taslakların",descriptionEn:"Your observations and drafts",icon:"user",group:"personal"},
  {view:"account",tr:"Kişisel ayarlar",en:"Settings",description:"Hesap, dil ve görünüm",descriptionEn:"Account, language and appearance",icon:"monitor",group:"personal",terms:"ayarlar tema dark light settings language"},
  {view:"assistant",tr:"Bitki asistanı",en:"Plant assistant",description:"Bitkiler hakkında sor",descriptionEn:"Ask about plants",icon:"sparkles",group:"personal"},
];
export const sectionGroups = [
  {id:"research",tr:"Araştır ve keşfet",en:"Research and explore"},
  {id:"care",tr:"Bakım ve sağlık",en:"Care and health"},
  {id:"knowledge",tr:"Bilgi ve paylaşımlar",en:"Knowledge and posts"},
  {id:"shopping",tr:"Kitap ve fidan",en:"Books and seedlings"},
  {id:"personal",tr:"Kişisel alan",en:"Personal space"},
] as const;
export const sectionLabel = (section: Section, language: Language) => language === "en" ? section.en : section.tr;
export const sectionDescription = (section: Section, language: Language) => language === "en" ? section.descriptionEn : section.description;
export const sectionHubs: {id:"explore"|"database"|"profile";tr:string;en:string;views:View[]}[] = [
  {id:"explore",tr:"Keşfet",en:"Explore",views:["nature","fungi","birds","care","health","forestry","social","store","nurseries","assistant"]},
  {id:"database",tr:"Veri tabanı",en:"Database",views:["catalogs","gbif","publications","library","glossary","collections"]},
  {id:"profile",tr:"Profil ve ayarlar",en:"Profile and settings",views:["profile","account"]},
];
export const hubForSection = (view:View):View => sectionHubs.find(hub=>hub.views.includes(view))?.id || view;
const normalize = (value: string) => value.toLocaleLowerCase("tr").replace(/ı/g,"i").normalize("NFD").replace(/[\u0300-\u036f]/g,"");
export function findSections(query: string) {
  const terms = normalize(query).trim().split(/\s+/).filter(Boolean);
  return siteSections.filter(section => {
    const text = normalize([section.tr,section.en,section.description,section.descriptionEn,section.terms].join(" "));
    return terms.every(term => text.includes(term));
  });
}
export const groupForSection = (view: View): SectionGroup => siteSections.find(section=>section.view===view)?.group || "research";
