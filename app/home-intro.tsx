"use client";
import {useState,type ReactNode} from "react";
import type {Language} from "./i18n";
import type {Plant} from "./plant-data";
import type {View} from "./navigation";
import {Icon} from "./icons";
import ResponsivePhoto from "./responsive-photo";
import {warmRoute} from "./route-components";
import {warmLens} from "./add-menu";

type Props={language:Language;search:ReactNode;featured?:Plant;onAdd:()=>void;onPlant:(id:string)=>void;onNavigate:(view:View)=>void;onSearch:(query:string)=>void;onAsk:(question:string)=>void};

const plainClick=(event:React.MouseEvent<HTMLAnchorElement>)=>event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey;

export default function HomeIntro({language,search,featured,onAdd,onPlant,onNavigate,onSearch,onAsk}:Props){
 const [question,setQuestion]=useState("");
 const t=(tr:string,en:string)=>language==="en"?en:tr;
 const research=[
  ["forestry",t("Ormancılık","Forestry"),"tree"],
  ["library",t("Kütüphane","Library"),"book"],
  ["glossary",t("Sözlük","Glossary"),"book"],
  ["compare",t("Tür karşılaştır","Compare species"),"grid"],
  ["publications",t("Bilimsel yayınlar","Publications"),"paper"],
  ["gbif",t("GBIF araştırma","GBIF research"),"compass"],
  ["catalogs",t("Dünya katalogları","World catalogues"),"grid"],
 ] as const;
 const navigate=(view:View)=>(e:React.MouseEvent<HTMLAnchorElement>)=>{
  if(plainClick(e)){e.preventDefault();onNavigate(view);}
 };
 const task=(view:View,label:string,icon:Parameters<typeof Icon>[0]["name"],description:string)=><a href={`?view=${view}`} onFocus={()=>warmRoute(view)} onPointerDown={()=>warmRoute(view)} onClick={navigate(view)}><span className="field-task-icon"><Icon name={icon}/></span><span><strong>{label}</strong><small>{description}</small></span></a>;
 return <section className="home-intro field-home" aria-labelledby="home-intro-title">
  <div className={`atlas-hero${featured?.image?" has-feature":""}`}>
   <div className="atlas-hero-copy">
    <p className="atlas-eyebrow">{t("Doğa atlası · Saha rehberi","Nature atlas · Field guide")}</p>
    <h1 id="home-intro-title">{t("Doğayı keşfet.","Explore nature.")}</h1>
    <p className="atlas-lead">{t("Türleri bul, yayılışlarını haritada incele ve kendi gözlemini ekle.","Find species, explore their range on the map, and add your own observation.")}</p>
    <div className="field-search">{search}</div>
    <div className="atlas-examples" aria-label={t("Örnek aramalar","Example searches")}><span>{t("Örnek:","Try:")}</span>{[["Sedir","Cedar"],["Meşe","Oak"],["Pinaceae","Pinaceae"]].map(([tr,en])=>{const q=t(tr,en);return <a key={tr} href={`?view=search&q=${encodeURIComponent(q)}`} onPointerDown={()=>warmRoute("search")} onClick={e=>{if(plainClick(e)){e.preventDefault();onSearch(q);}}}>{q}</a>;})}</div>
    <nav className="field-tasks" aria-label={t("Hızlı işlemler","Quick actions")}>
     <button type="button" className="field-task-add" onPointerDown={warmLens} onFocus={warmLens} onClick={onAdd} aria-haspopup="dialog" aria-controls="add-observation-menu"><span className="field-task-icon"><Icon name="lens"/></span><span><strong>{t("Fotoğrafla ara","Search by photo")}</strong><small>{t("Fotoğrafla tanı veya not al","Identify a photo or take notes")}</small></span></button>
     {task("map",t("Harita","Map"),"pin",t("Türlerin yayılışı","Species distributions"))}
     {task("flora",t("Türkiye florası","Türkiye flora"),"grid",t("Tür ve il filtreleri","Species and region filters"))}
     {task("discover",t("Yaşam ağacı","Tree of life"),"tree",t("Taksonomi","Taxonomy"))}
    </nav>
   </div>
   {featured?.image&&<a className="atlas-feature" href={`?view=detail&species=${encodeURIComponent(featured.id)}`} onClick={e=>{if(plainClick(e)){e.preventDefault();onPlant(featured.id);}}}>
    <ResponsivePhoto src={featured.image} alt="" sizes="(max-width:700px) 100vw, (max-width:1100px) 40vw, 520px"/>
    <span className="atlas-feature-copy"><small>{t("Tür künyesi","Species profile")}</small><strong>{t(featured.name,"Lebanon cedar")}</strong><i>{featured.latin}</i></span>
    <span className="atlas-feature-credit">{t("Fotoğraf","Photo")}: {featured.photoCredit} · {featured.photoLicense}</span>
   </a>}
  </div>
  <div className="atlas-more">
   <details>
    <summary><Icon name="book"/><span>{t("Araştırma ve saha araçları","Research and field tools")}</span><span className="atlas-expand" aria-hidden="true"/></summary>
    <nav className="atlas-research-links" aria-label={t("Araştırma araçları","Research tools")}>{research.map(([view,label,icon])=><a key={view} href={`?view=${view}`} onClick={navigate(view)} onFocus={()=>warmRoute(view)}><Icon name={icon}/>{label}</a>)}</nav>
   </details>
   <details>
    <summary><Icon name="sparkles"/><span>{t("Asistana sor","Ask the assistant")}</span><span className="atlas-expand" aria-hidden="true"/></summary>
    <form className="home-question" onSubmit={e=>{e.preventDefault();if(question.trim())onAsk(question.trim());}}>
     <label className="sr-only" htmlFor="home-question">{t("Doğa veya ormancılık sorusu","Nature or forestry question")}</label>
     <input id="home-question" name="question" maxLength={2000} value={question} onChange={e=>setQuestion(e.target.value)} placeholder={t("Sedir ile çamı nasıl ayırırım?","How can I tell a cedar from a pine?")}/>
     <button type="submit" disabled={!question.trim()} aria-label={t("Soruyu gönder","Send question")}>{t("Soru sor","Ask")}</button>
    </form>
   </details>
   <a className="atlas-more-link" href="?view=create" onClick={navigate("create")} onPointerDown={()=>warmRoute("create")}><Icon name="paper"/><span>{t("Saha notu yaz","Write a field note")}</span><span className="atlas-chevron" aria-hidden="true"/></a>
  </div>
 </section>;
}
