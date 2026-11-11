export const taxonomySources = ["itis", "col", "ictv", "gbif", "powo"] as const;
export type TaxonomySource = typeof taxonomySources[number];
export type TaxonomySelection = {source:TaxonomySource; id:string;version?:string};
export type TaxonomyNode = TaxonomySelection & {
  key:string; version:string; name:string; rank:string; parentId:string|null;
  status:string; author?:string; publication?:string; turkishName?:string;
  commonNames:{name:string;language:string}[]; synonyms:{id:string;name:string;status?:string}[];
  acceptedId?:string; kingdom?:string; childCount?:number;
  sourceUrl:string; license:string; retrievedAt:string; sourceDate?:string;
  identifiers?:string[]; facts?:{label:string;value:string}[];
  detailRetrievedAt?:string;
};
export type TaxonomyPage={records:TaxonomyNode[];total:number|null;next:string|null;version:string;cached?:boolean};
export type TaxonomyDetail={node:TaxonomyNode;path:TaxonomyNode[]};
export const taxonomyNames:Record<TaxonomySource,string>={itis:"ITIS",col:"Catalogue of Life",ictv:"ICTV",gbif:"GBIF",powo:"Kew · POWO"};
export const kingdomNames:Record<string,string>={Animalia:"Hayvanlar",Plantae:"Bitkiler",Fungi:"Mantarlar",Chromista:"Kromistler",Protozoa:"Protozoalar",Bacteria:"Bakteriler",Archaea:"Arkeler"};
