import { publicObservation, publicSocialPost, socialPostImage } from "./shared-content";
import { headers } from "next/headers";
import type { Metadata } from "next";
import source from "./data/tubives.json";
import { plants } from "./plant-data";
import { archiveLifePage } from "./life-catalog";
import { automaticLanguage } from "./preferences";
import { canonicalRoute, isIndexableRoute, seoRoute } from "./seo";
import type { SiteRoute } from "./navigation";
import type { Language } from "./i18n";

export type SearchValues = Record<string, string | string[] | undefined>;
const sections: Record<string, [string, string, string, string]> = {
  gbif:["GBIF biyoçeşitlilik araştırması","GBIF biodiversity research","Canlı GBIF kayıtlarını takson, ülke, yıl ve veri setiyle araştır. Haritalar, veri kalitesi ve kaynak atıfları.","Explore live GBIF records by taxon, country, year and dataset, with maps, data quality and source citations."],
  social: ["Paylaşımlarımız", "Our posts", "Orman Mühendisi sosyal hesaplarından aktarılmış fotoğraflar, videolar ve doğa yazıları.", "Photographs, videos and nature stories imported from Orman Mühendisi social accounts."],
  search:["Arama sonuçları","Search results","Tür künyeleri ve bilimsel kaynaklarda arama.","Search species profiles and scientific sources."],
  explore:["Keşfet","Explore","Doğadan fotoğraflar, tür künyeleri ve gözlemler.","Nature photographs, species profiles and observations."],
  discover: ["Taksonomi / Yaşam Ağacı", "Taxonomy / Tree of Life", "Canlı gruplarından familya, cins ve türlere ilerle. Kaynaklı sınıflandırmalar, fotoğraflar ve doğa gözlemleri.", "Explore living groups, families, genera and species with sourced classifications, photographs and nature observations."],
  database: ["Tür veri tabanı", "Species database", "Türkiye flora kayıtlarını bilimsel ad, familya, habitat ve yayılışa göre araştır.", "Search Türkiye flora records by scientific name, family, habitat and distribution."],
  library: ["Doğa kütüphanesi", "Nature library", "Fotoğraflı tür künyeleri, kaynaklar ve doğa rehberleri.", "Photographic species profiles, sources and nature guides."],
  glossary: ["Botanik sözlük", "Botanical glossary", "Botanik ve doğa terimlerini anlaşılır açıklamalarla öğren.", "Learn botanical and nature terms with clear explanations."],
  auth: ["Giriş ve kayıt", "Sign in and register", "Orman Mühendisi hesabına giriş yap veya hesap oluştur.", "Sign in or create an Orman Mühendisi account."],
  account: ["Hesap bilgileri", "Account details", "Profilini, giriş seçeneklerini, dil ve görünüm tercihlerini yönet.", "Manage your profile, sign-in options, language and appearance."],
  profile: ["Kişisel alanım", "My space", "Gözlemlerin, koleksiyonların ve kişisel ayarların.", "Your observations, collections and personal settings."],
  create: ["Yeni gözlem", "New observation", "Fotoğraflarını ve saha notlarını kaydet, paylaşımını yönet.", "Save photographs and field notes, and choose what to share."],
  birds: ["Kuşların dünyası", "World of birds", "Kuşların fotoğraflı saha kayıtları, tür künyeleri ve gözlem haritaları.", "Photographic bird records, species profiles and observation maps."],
  fungi: ["Mantarlar âlemi", "Fungi kingdom", "Mantar türlerini araştır, kaynak sınıflandırmalarını ve fotoğraflı gözlemleri incele.", "Explore fungi, sourced classifications and photographic observations."],
  health: ["Bitki sağlığı", "Plant health", "Belirti rehberi, yetişme koşullarına göre kontrol önerileri ve kişisel sağlık günlüğü.", "A symptom guide, growing-condition checks and your plant health journal."],
  care: ["Bitki bakım defteri", "Plant care journal", "Bitkilerinin bakımını planla; görevleri, tarihleri ve bakım geçmişini bir arada tut.", "Plan plant care and keep tasks, dates and care history together."],
  nature: ["Doğa gözlemleri", "Nature observations", "Türleri, açık lisanslı fotoğrafları ve gözlem konumlarını birlikte keşfet.", "Explore species, openly licensed photographs and observation locations."],
  map: ["Haritada keşfet", "Explore the map", "Konum, canlı grubu ve tarih aralığıyla kaynaklı doğa kayıtlarını incele.", "Explore sourced nature records by location, living group and date range."],
  forestry: ["Orman ekosistemleri", "Forest ecosystems", "Ormancılık, ekosistemler ve doğa bilgisi için kaynaklı rehberler.", "Sourced guides to forestry, ecosystems and nature."],
  publications: ["Bilimsel yayınlar", "Scientific publications", "Doğa ve ormancılık alanındaki bilimsel yayınları araştır.", "Explore scientific publications about nature and forestry."],
  nurseries: ["Fidanlıklar", "Nurseries", "Fidanlıkları ve bitki yetiştiricilerini keşfet.", "Explore nurseries and plant growers."],
  store: ["Kitap ve fidan", "Books and seedlings", "Doğa kitaplarını ve fidan kayıtlarını incele.", "Explore nature books and seedling listings."],
};

export function pageContent(route: SiteRoute, language: Language) {
  const flora = route.flora ? source.records.find(record => record.id === route.flora) : undefined;
  const plant = route.species ? plants.find(record => record.id === route.species) : undefined;
  const taxonomy = route.view === "discover" && route.entry ? archiveLifePage(route.entry) : null;
  const english = language === "en", section = sections[route.view];
  const name = flora?.name || (plant ? (english ? plant.latin : plant.name + " · " + plant.latin) : "") || (taxonomy ? [english ? taxonomy.node.commonName : taxonomy.node.turkishName, taxonomy.node.scientificName].filter(Boolean).join(" · ") : "");
  const title = (name || (section ? section[english ? 1 : 0] : english ? "Nature, together" : "Bitkinin sosyal hali")) + " | Orman Mühendisi";
  const description = flora ? flora.name + " · " + flora.family + ". " + (english ? "Sourced habitat, life cycle, elevation and distribution records." : "Kaynaklı habitat, yaşam süresi, rakım ve yayılış kayıtları.") : plant ? (english ? plant.latin + ". Sourced species profile, traits, habitat and distribution." : plant.description) : taxonomy ? taxonomy.node.scientificName + ". " + (english ? "Explore this sourced taxon, its classification, branches and observations." : "Kaynaklı takson künyesini, sınıflandırmasını, alt gruplarını ve doğa gözlemlerini keşfet.") : section ? section[english ? 3 : 2] : english ? "Living-world discovery, sourced species profiles and a photographic nature community." : "Canlılar dünyası, kaynaklı tür künyeleri ve doğanın fotoğraflı sosyal akışı.";
  return { title, description, flora, plant, taxonomy };
}

export async function generateMetadata({ searchParams }: { searchParams: Promise<SearchValues> }): Promise<Metadata> {
  const route = seoRoute(await searchParams), requestHeaders = await headers();
  const language = automaticLanguage(requestHeaders.get("cf-ipcountry") || "", requestHeaders.get("accept-language") || "tr");
  const data = pageContent(route, language), url = canonicalRoute(route);
  let title = data.title, description = data.description, image = data.plant?.image || data.taxonomy?.node.images[0]?.url;
  if (route.view === 'home' && !route.observation) image = '/brand/orman-emblem.png';
  if (route.view === 'home' && route.observation) {
    try { const post = await publicObservation(route.observation); title = post ? post.author + (language === 'en' ? ' · Nature observation | Orman Mühendisi' : ' · Doğa gözlemi | Orman Mühendisi') : (language === 'en' ? 'Observation unavailable' : 'Gözlem bulunamadı'); description = post?.text.slice(0, 400) || ''; image = post?.image || post?.photos[0]?.url; }
    catch { title = language === 'en' ? 'Observation unavailable' : 'Gözlem yüklenemedi'; description = ''; image = undefined; }
  }
  if (route.view === 'social' && route.entry) {
    try { const post = await publicSocialPost(route.entry); title = post ? post.title + ' | Orman Mühendisi' : (language === 'en' ? 'Post unavailable' : 'Paylaşım bulunamadı'); description = post?.text.slice(0, 400) || ''; image = post ? socialPostImage(post) : undefined; }
    catch { title = language === 'en' ? 'Post unavailable' : 'Paylaşım yüklenemedi'; description = ''; image = undefined; }
  }
  const images = image ? [new URL(image, url).href] : [];
  // The Worker overwrites this internal header; client input cannot enable indexing.
  const index = requestHeaders.get("x-orman-public-indexing") === "1" && isIndexableRoute(route);
  return { title, description, alternates: { canonical: url }, robots: { index, follow: index },
    openGraph: { type: "website", title, description, url, siteName: "Orman Mühendisi", locale: language === "en" ? "en_GB" : "tr_TR", images },
    twitter: { card: images.length ? "summary_large_image" : "summary", title, description, images } };
}

export function taxonData(route: SiteRoute, language: Language) {
  const { flora, plant, taxonomy } = pageContent(route, language), url = canonicalRoute(route);
  if (taxonomy) return [
    { "@context": "https://schema.org", "@type": "Taxon", "@id": url + "#taxon", url, name: taxonomy.node.scientificName, alternateName: taxonomy.node.turkishName, identifier: taxonomy.node.source.recordId, taxonRank: taxonomy.node.rank.toLowerCase(), sameAs: taxonomy.node.source.url,
      ...(taxonomy.node.images.length ? { image: taxonomy.node.images[0].url } : {}),
      ...(taxonomy.node.parentId ? { parentTaxon: { "@type": "Taxon", name: taxonomy.ancestry.at(-2)?.scientificName, url: canonicalRoute({ view: "discover", entry: taxonomy.node.parentId }) } } : {}) },
    { "@context": "https://schema.org", "@type": "BreadcrumbList", itemListElement: taxonomy.ancestry.map((node, index) => ({ "@type": "ListItem", position: index + 1, name: node.scientificName, item: canonicalRoute({ view: "discover", entry: node.id }) })) },
  ];
  if (flora) return [{ "@context": "https://schema.org", "@type": "Taxon", "@id": url + "#taxon", url, name: flora.name, alternateName: flora.commonName || undefined, identifier: "flora-" + flora.id, taxonRank: flora.rank, sameAs: flora.source }];
  if (plant) return [{ "@context": "https://schema.org", "@type": "Taxon", "@id": url + "#taxon", url, name: plant.latin, alternateName: plant.name, identifier: plant.id, taxonRank: "species", sameAs: plant.source, image: plant.image,
    parentTaxon: { "@type": "Taxon", name: plant.genus, taxonRank: "genus" } }];
  return [];
}
