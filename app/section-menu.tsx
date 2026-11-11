"use client";
import { useId } from "react";
import { Icon } from "./icons";
import type { Language } from "./i18n";
import type { View } from "./navigation";
import { siteSections, sectionHubs, sectionLabel, sectionDescription, findSections } from "./site-sections";
import { warmRoute } from "./route-components";

type NavigationProps={language:Language;section:View;onNavigate:(view:View)=>void};
function SectionLink({item,language,section,onNavigate,shortcut=false}:NavigationProps & {item:typeof siteSections[number];shortcut?:boolean}){
  return <a href={`?view=${item.view}`} aria-current={section===item.view?"page":undefined} onPointerDown={()=>warmRoute(item.view)} onFocus={()=>warmRoute(item.view)} onClick={event=>{if(event.button===0&&!event.metaKey&&!event.ctrlKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onNavigate(item.view);}}}><span className="section-link-icon"><Icon name={item.icon}/></span><span className="section-link-text"><strong>{shortcut&&item.view==="discover"?(language==="en"?"Life":"Canlılar"):sectionLabel(item,language)}</strong>{!shortcut&&<small>{sectionDescription(item,language)}</small>}</span></a>;
}

export function SectionShortcuts(props:NavigationProps){
  return <nav className="section-shortcuts" aria-label={props.language==="en"?"Main navigation":"Ana gezinme"}>{siteSections.filter(item=>item.group==="main").map(item=><SectionLink key={item.view} item={item} {...props} shortcut/>)}</nav>;
}

export function SectionTools({hub,...props}:NavigationProps & {hub:"explore"|"database"}){
  const id=useId(),en=props.language==="en",group=sectionHubs.find(item=>item.id===hub)!;
  return <details className="section-menu-group section-hub-tools"><summary id={id}><span>{hub==="explore"?en?"Observations, care and more":"Gözlemler, bakım ve diğer araçlar":en?"Sources and research":"Kaynaklar ve araştırma"}</span><span className="section-group-chevron" aria-hidden="true"/></summary><nav aria-labelledby={id} className="section-menu-links">{group.views.map(view=><SectionLink key={view} item={siteSections.find(item=>item.view===view)!} {...props}/>)}</nav></details>;
}

export default function SectionMenu({language,section,query="",onNavigate,admin=false,variant="directory"}:NavigationProps & {query?:string;admin?:boolean;variant?:"directory"|"sidebar"}) {
  const id=useId(),en=language==="en",searching=Boolean(query.trim());
  const link=(item:typeof siteSections[number])=><SectionLink key={item.view} item={item} language={language} section={section} onNavigate={onNavigate}/>;
  const found=searching?findSections(query):[];
  return <nav className={`section-menu section-menu-${variant}`} aria-label={en?"Site sections":"Site bölümleri"}>
    {searching?<><p className="section-search-count" role="status">{found.length?en?`${found.length} sections`:`${found.length} bölüm`:en?"No matching section. Try another word.":"Eşleşen bölüm yok. Başka bir sözcük dene."}</p><div className="section-menu-links">{found.map(link)}</div></>:sectionHubs.map(group=>{
      const items=group.views.map(view=>siteSections.find(item=>item.view===view)!);
      return <details key={group.id} className="section-menu-group" open={items.some(item=>item.view===section)} aria-labelledby={`${id}-${group.id}`}><summary id={`${id}-${group.id}`}><span>{en?group.en:group.tr}</span><span className="section-group-chevron" aria-hidden="true"/></summary><div className="section-menu-links">{items.map(link)}</div></details>;
    })}
    {admin&&(!searching||/tür|tur|yonet|yönet|admin|manag/i.test(query))&&<a className="section-admin" href="?view=admin" onClick={event=>{if(event.button===0&&!event.ctrlKey&&!event.metaKey&&!event.shiftKey&&!event.altKey){event.preventDefault();onNavigate("admin");}}}><Icon name="grid"/><span>{en?"Species management":"Tür yönetimi"}</span></a>}
  </nav>;
}
