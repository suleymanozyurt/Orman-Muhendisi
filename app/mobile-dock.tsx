"use client";
import { Icon } from "./icons";
import type { CSSProperties } from "react";
import type { Language } from "./i18n";
import type { View } from "./navigation";
import { warmRoute } from "./route-components";
import { warmLens } from "./add-menu";
const tabs = [
  {view:"home",tr:"Ana sayfa",en:"Home",icon:"home"},
  {view:"discover",tr:"Canlılar",en:"Life",icon:"compass"},
  {view:"create",tr:"Ekle",en:"Add",icon:"plus"},
  {view:"map",tr:"Harita",en:"Map",icon:"pin"},
  {view:"database",tr:"Flora",en:"Flora",icon:"grid"}
] as const;
export default function MobileDock({section,language,onNavigate,onAdd}:{section:View;language:Language;onNavigate:(view:View)=>void;onAdd:()=>void}) {
  const active=["library","fungi","birds","nature"].includes(section)?"discover":section==="explore"?"discover":section==="identify"?"create":section;
  const slot=tabs.findIndex(tab=>tab.view===active);
  return <div className="mobile-dock-shell"><nav className="mobile-nav" style={{"--dock-slot":Math.max(0,slot)} as CSSProperties} data-selection={slot>=0&&active!=="create"} aria-label={language==="en"?"Main navigation":"Ana gezinme"}>
    <span className="dock-active-indicator" aria-hidden="true"/>
    {tabs.map(tab=><button key={tab.view} type="button" data-dock-tab={tab.view} className={`${active===tab.view?"active":""} ${tab.view==="create"?"dock-create":""}`} aria-current={active===tab.view?"page":undefined} aria-haspopup={tab.view==="create"?"dialog":undefined} aria-controls={tab.view==="create"?"add-observation-menu":undefined} aria-label={tab.view==="home"?(language==="en"?"Home":"Ana sayfa"):undefined} onPointerDown={()=>tab.view==="create"?warmLens():warmRoute(tab.view)} onFocus={()=>tab.view==="create"?warmLens():warmRoute(tab.view)} onClick={()=>tab.view==="create"?onAdd():onNavigate(tab.view==="database"?"flora":tab.view)}>{tab.view==="create"?<span className="dock-create-mark" aria-hidden="true"><Icon name="lens"/></span>:<Icon name={tab.icon}/>}<small>{language==="en"?tab.en:tab.tr}</small></button>)}
  </nav></div>;
}
