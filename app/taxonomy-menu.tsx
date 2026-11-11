"use client";
import {useEffect,useId,useRef,useState} from "react";
import type {TaxonomyNode,TaxonomyPage,TaxonomySelection} from "./taxonomy-types";
import {kingdomNames} from "./taxonomy-types";
import {lifeRankLabel} from "./life-types";
type Anchor={selection:TaxonomySelection;label:string};
const key=(s:TaxonomySelection)=>`${s.source}:${s.version||""}:${s.id}`;
export default function TaxonomyMenu({roots,pages,loading,errors,load,onSelect,language}:{roots:TaxonomyNode[];pages:Record<string,TaxonomyPage>;loading:Set<string>;errors:Record<string,string>;load:(s:TaxonomySelection,more?:boolean,refresh?:boolean)=>Promise<void>;onSelect:(s:TaxonomySelection)=>void;language:"tr"|"en"}) {
 const [path,setPath]=useState<Anchor[]>([]),host=useRef<HTMLDivElement>(null),id=useId();
 const t=(tr:string,en:string)=>language==="en"?en:tr;
 const entries:Anchor[]=[...roots.map(n=>({selection:n,label:language==="tr"?kingdomNames[n.name]||n.name:n.name})),{selection:{source:"ictv",id:""},label:t("Virüsler","Viruses")}];
 const open=(anchor:Anchor,depth:number)=>{
  if(path[depth]&&key(path[depth].selection)===key(anchor.selection))return;
  const repeat=path.slice(0,depth).findIndex(a=>key(a.selection)===key(anchor.selection));
  setPath(repeat>=0?path.slice(0,repeat+1):[...path.slice(0,depth),anchor]);void load(anchor.selection);
 };
 const close=()=>setPath([]);
 const select=(selection:TaxonomySelection)=>{close();onSelect(selection);};
 useEffect(()=>{
  if(!path.length)return;
  const outside=(e:PointerEvent)=>{if(!host.current?.contains(e.target as Node))close();};
  const escape=(e:KeyboardEvent)=>{if(e.key==="Escape"){e.preventDefault();close();host.current?.querySelector<HTMLButtonElement>('[aria-expanded="true"]')?.focus();}};
  document.addEventListener("pointerdown",outside);document.addEventListener("keydown",escape);
  return()=>{document.removeEventListener("pointerdown",outside);document.removeEventListener("keydown",escape);};
 },[path.length]);
 return <div ref={host} className="taxonomy-menu" onPointerLeave={e=>{if(e.pointerType==="mouse")close();}}>
  <nav className="taxonomy-kingdom-bar" aria-label={t("Âlemler ve bağımsız virüs sınıflandırması","Kingdoms and independent virus classification")}>
   {entries.map(anchor=><button type="button" key={key(anchor.selection)} className={path[0]&&key(path[0].selection)===key(anchor.selection)?"active":""} aria-expanded={Boolean(path[0]&&key(path[0].selection)===key(anchor.selection))} aria-controls={id} onPointerEnter={e=>{if(e.pointerType==="mouse")open(anchor,0);}} onClick={()=>path[0]&&key(path[0].selection)===key(anchor.selection)?close():open(anchor,0)}><span>{anchor.label}</span><small>{anchor.selection.source==="ictv"?"ICTV":roots.find(n=>n.id===anchor.selection.id)?.name}</small><span aria-hidden="true">⌄</span></button>)}
  </nav>
  {path.length>0&&<section id={id} className="taxonomy-dropdown" aria-label={t("Alt takson menüleri","Child taxon menus")}>
   <header><nav aria-label={t("Menüdeki sınıflandırma yolu","Menu classification path")}>{path.map((anchor,i)=><button type="button" key={key(anchor.selection)} onClick={()=>setPath(path.slice(0,i+1))}>{anchor.label} <span aria-hidden="true">›</span></button>)}</nav><button type="button" aria-label={t("Menüyü kapat","Close menu")} onClick={close}>×</button></header>
   <div className="taxonomy-menu-columns">{path.slice(-3).map((anchor,index)=>{
    const depth=path.length-Math.min(3,path.length)+index,page=pages[key(anchor.selection)],busy=loading.has(key(anchor.selection)),error=errors[key(anchor.selection)];
    return <section className={`taxonomy-menu-column ${index===Math.min(3,path.length)-1?"last":""}`} key={key(anchor.selection)}>
     <div className="taxonomy-menu-column-title"><strong data-user-content>{anchor.label}</strong><button type="button" onClick={()=>select(anchor.selection)}>{t("Künye","Profile")} ↗</button></div>
     {depth>0&&<button type="button" className="taxonomy-menu-back" onClick={()=>setPath(path.slice(0,depth))}>← {t("Üst gruba dön","Parent group")}</button>}
     <div className="taxonomy-menu-records">{page?.records.map(node=><div className="taxonomy-menu-row" key={node.key}>
      <button type="button" className={path[depth+1]?.selection.id===node.id?"active":""} onPointerEnter={e=>{if(e.pointerType==="mouse"&&node.childCount!==0)open({selection:node,label:node.turkishName||node.name},depth+1);}} onClick={()=>node.childCount===0?select(node):open({selection:node,label:node.turkishName||node.name},depth+1)}><span><strong data-user-content>{node.turkishName||node.name}</strong><small>{lifeRankLabel(node.rank,language)}{node.turkishName?` · ${node.name}`:""}</small></span><span aria-hidden="true">{node.childCount===0?"↗":"›"}</span></button>
     </div>)}
     {busy&&!page&&<p role="status">{t("Alt dallar yükleniyor…","Loading children…")}</p>}
     {error&&<p role="alert">{error} <button type="button" onClick={()=>load(anchor.selection,false,true)}>{t("Yeniden dene","Retry")}</button></p>}
     {page&&!page.records.length&&!error&&<div className="taxonomy-menu-leaf"><p>{t("Bu kaynağın en alt kayıtlı düzeyi.","Lowest recorded level in this source.")}</p><button type="button" onClick={()=>select(anchor.selection)}>{t("Takson künyesini aç","Open taxon profile")} ↗</button></div>}
     {page?.next&&<button type="button" className="tx-more" disabled={busy} onClick={()=>load(anchor.selection,true)}>{busy?t("Yükleniyor…","Loading…"):t("Diğer alt taksonlar","More child taxa")}{page.total!==null?` · ${page.records.length} / ${page.total}`:""}</button>}
     </div>
    </section>;
   })}</div>
  </section>}
 </div>;
}
