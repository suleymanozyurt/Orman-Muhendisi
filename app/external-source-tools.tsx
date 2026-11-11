import type {Language} from "./i18n";

const links={
 plantnet:[
  {tr:"Fotoğraftan bitki tanı",en:"Identify a plant",url:"https://identify.plantnet.org/tr/k-world-flora/identify"},
  {tr:"Bölgesel floralar",en:"Regional floras",url:"https://identify.plantnet.org/tr/floras"},
  {tr:"Dünya tür kataloğu",en:"World species catalogue",url:"https://identify.plantnet.org/tr/k-world-flora/species"},
 ],
 trakus:[
  {tr:"Türkiye’nin kuş rehberi",en:"Birds of Türkiye",url:"https://www.trakus.org/tr/turkiyenin-kuslari"},
  {tr:"Gözlem kayıtları",en:"Observations",url:"https://www.trakus.org/tr/gozlemler"},
  {tr:"Tür fotoğrafları",en:"Species photographs",url:"https://www.trakus.org/tr/tur-galeri"},
  {tr:"Kuş videoları",en:"Bird videos",url:"https://www.trakus.org/tr/videolar"},
 ],
};
export default function ExternalSourceTools({source,language}:{source:keyof typeof links;language:Language}){
 const en=language==="en",name=source==="plantnet"?"Pl@ntNet":"TRAKUS";
 return <details className="external-source-tools"><summary>{name} · {en?"Source tools":"Kaynak araçları"}</summary><nav aria-label={`${name} ${en?"source links":"kaynak bağlantıları"}`}>{links[source].map(link=><a key={link.url} href={link.url} target="_blank" rel="noreferrer">{en?link.en:link.tr}<small>{en?"Opens on the source site":"Kaynak sitesinde açılır"}</small></a>)}</nav></details>;
}
