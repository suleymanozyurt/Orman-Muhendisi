export type CatalogSource = "plantnet" | "inaturalist" | "bizimbitkiler" | "powo" | "itis";
export type CatalogMode = "species" | "families" | "genera" | "projects" | "taxa" | "kingdoms";
export type CatalogNode = {
  id: string; name: string; commonName: string; rank: string; source: string; canonicalName?: string;
  family?: string; genus?: string; author?: string; count?: number; endemic?: boolean;
  regions?: string[]; description?: string; publishedIn?: string; synonyms?: { name: string; reference: string }[];
  ancestry?: { id: string; name: string; commonName?: string; rank: string }[];
  citations?: string[]; conservation?: string; gbifId?: number;
  taxonomicStatus?: string; modified?: string;
};
export type CatalogPage = { source: CatalogSource; mode: CatalogMode; records: CatalogNode[]; total: number | null; page: number; hasMore: boolean; retrievedAt: string; node?: CatalogNode; sourceUrl: string; nextCursor?: string; rights?: {label:string;url:string;attribution:string;note:string}; stats?: { taxa: number; endemic: number; families: number; genera: number } };
export const catalogRegions: Record<string, string> = { istranca:"Istranca",catalca_kocaeli:"Çatalca-Kocaeli",ergene:"Ergene",g_marmara:"Güney Marmara",b_karadeniz:"Batı Karadeniz",o_karadeniz:"Orta Karadeniz",d_karadeniz:"Doğu Karadeniz",a_ege:"Asıl Ege",ib_anadolu:"İç Batı Anadolu",y_sakarya:"Yukarı Sakarya",o_kizilirmak:"Orta Kızılırmak",y_kizilirmak:"Yukarı Kızılırmak",konya:"Konya",y_firat:"Yukarı Fırat",erzurum_kars:"Erzurum-Kars",y_murat_van:"Yukarı Murat-Van",hakkari:"Hakkari",antalya:"Antalya",adana:"Adana",o_firat:"Orta Fırat",dicle:"Dicle" };
export const catalogSources = { plantnet:"https://identify.plantnet.org/tr/k-world-flora/species", inaturalist:"https://www.inaturalist.org", bizimbitkiler:"https://bizimbitkiler.org.tr/yeni/demos/technical/", powo:"https://powo.science.kew.org/",itis:"https://www.itis.gov/" } as const;
