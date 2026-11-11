"use client";
import { useEffect, useRef, useState } from "react";
import { nextTab } from "./tab-keyboard";
import { tabScrollTarget } from "./tab-visibility";

export default function PageTabs({items,selected,onSelect,panelId,label,className="detail-tabs",manual=false}:{items:{id:string;label:string}[];selected:string;onSelect:(value:string)=>void;panelId:string;label:string;className?:string;manual?:boolean}) {
  const root=useRef<HTMLDivElement>(null),[focused,setFocused]=useState(selected);
  const index=Math.max(0,items.findIndex(item=>item.id===selected));
  const current=items[index]?.id;
  const reveal=(button:HTMLElement,animate=true)=>{
    const node=root.current;if(!node||!node.clientWidth)return;
    const area=node.getBoundingClientRect(),box=button.getBoundingClientRect();
    const neighbour=button.nextElementSibling?.getBoundingClientRect();
    const left=box.left-area.left+node.scrollLeft;
    const target=tabScrollTarget(node.clientWidth,node.scrollWidth,left,box.width,neighbour?neighbour.right-area.left+node.scrollLeft:undefined);
    const reduced=node.closest(".reduced-motion")||window.matchMedia("(prefers-reduced-motion:reduce)").matches;
    node.scrollTo({left:target,behavior:animate&&!reduced?"smooth":"instant"});
  };
  useEffect(()=>{setFocused(current||"");const button=root.current?.querySelector<HTMLElement>('[aria-selected="true"]');if(button)reveal(button);},[current]);
  useEffect(()=>{const node=root.current;if(!node)return;const observer=new ResizeObserver(()=>{const button=node.querySelector<HTMLElement>('[aria-selected="true"]');if(button)reveal(button,false);});observer.observe(node);return()=>observer.disconnect();},[]);
  const focusTarget=manual&&items.some(item=>item.id===focused)?focused:current;
  return <div ref={root} className={`${className} page-tabs`} role="tablist" aria-label={label} onBlur={event=>{if(!event.currentTarget.contains(event.relatedTarget))setFocused(current||"");}}>{items.map((item,i)=><button type="button" key={item.id} role="tab" id={`${panelId}-tab-${i}`} aria-controls={panelId} aria-selected={i===index} tabIndex={item.id===focusTarget?0:-1} className={i===index?"active":""} onFocus={event=>{setFocused(item.id);reveal(event.currentTarget);}} onClick={()=>onSelect(item.id)} onKeyDown={event=>{const next=nextTab(event.key,i,items.length);if(next===undefined)return;event.preventDefault();const button=root.current?.querySelectorAll<HTMLButtonElement>('[role="tab"]')[next];button?.focus({preventScroll:true});if(button)reveal(button);if(!manual)onSelect(items[next].id);}}>{item.label}</button>)}</div>;
}
