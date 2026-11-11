"use client";
import { Children, isValidElement, useEffect, useId, useMemo, useRef, useState, type ChangeEvent, type ReactNode, type SelectHTMLAttributes } from "react";
import { createPortal } from "react-dom";
import { filterOptions, type SearchOption } from "./search-options";
function labelText(node: ReactNode): string { return Children.toArray(node).map(child => typeof child === "string" || typeof child === "number" ? String(child) : isValidElement<{children?: ReactNode}>(child) ? labelText(child.props.children) : "").join(""); }
function optionsOf(children: ReactNode): SearchOption[] {
 return Children.toArray(children).flatMap(child => {
  if (!isValidElement<{value?: string | number; disabled?: boolean; children?: ReactNode}>(child)) return [];
  if (child.type === "option") { const label=labelText(child.props.children); return [{value:String(child.props.value ?? label),label,disabled:child.props.disabled}]; }
  return optionsOf(child.props.children).map(option=>({...option,disabled:option.disabled || child.props.disabled}));
 });
}
type Props = SelectHTMLAttributes<HTMLSelectElement> & { onSearch?: (query: string) => void; searchLoading?: boolean };
export default function SearchSelect({children,value,defaultValue,onChange,className,style,id,disabled,required,name,onSearch,searchLoading,...rest}: Props) {
 const uid=useId(), listId=`${uid}-options`, inputId=id || `${uid}-input`,errorId=`${uid}-error`;
 const options=useMemo(()=>optionsOf(children),[children]);
 const [internal,setInternal]=useState(String(defaultValue ?? options[0]?.value ?? ""));
 const selected=String(value ?? internal), label=options.find(option=>option.value===selected)?.label || "";
 const [open,setOpen]=useState(false), [query,setQuery]=useState(""), [index,setIndex]=useState(0), [invalid,setInvalid]=useState(false);
 const [position,setPosition]=useState({left:0,top:0,width:0,maxHeight:280});
 const root=useRef<HTMLDivElement>(null), input=useRef<HTMLInputElement>(null), native=useRef<HTMLSelectElement>(null), popup=useRef<HTMLDivElement>(null);
 const en=typeof document!=="undefined" && document.documentElement.lang==="en";
 const filtered=filterOptions(options,query);
 const available=filtered.filter(option=>!option.disabled);
 const active=available[Math.min(index,Math.max(0,available.length-1))];
 function show(){ if(disabled || native.current?.matches(":disabled"))return;setOpen(true);setQuery("");onSearch?.("");setIndex(0);input.current?.focus(); }
 function choose(option:SearchOption){if(disabled || native.current?.matches(":disabled") || option.disabled)return;setInternal(option.value);setInvalid(false);setOpen(false);setQuery("");onSearch?.("");if(native.current){native.current.value=option.value;onChange?.({target:native.current,currentTarget:native.current} as ChangeEvent<HTMLSelectElement>);}input.current?.focus();}
 useEffect(()=>{if(!open)return;function measure(){const box=root.current?.getBoundingClientRect();if(!box)return;const viewport=window.visualViewport,offsetTop=viewport?.offsetTop||0,offsetLeft=viewport?.offsetLeft||0,width=viewport?.width||window.innerWidth,heightAvailable=viewport?.height||window.innerHeight;const below=offsetTop+heightAvailable-box.bottom-12,above=box.top-offsetTop-12,up=below<200&&above>below;const height=Math.max(64,Math.min(280,up?above:below));const popupWidth=Math.min(box.width,width-16);setPosition({left:Math.max(offsetLeft+8,Math.min(box.left,offsetLeft+width-popupWidth-8)),top:Math.max(offsetTop+8,up?box.top-height-6:box.bottom+6),width:popupWidth,maxHeight:height});}
  function outside(event:PointerEvent){if(!root.current?.contains(event.target as Node)&&!popup.current?.contains(event.target as Node))setOpen(false);}
  measure();document.addEventListener("pointerdown",outside);window.addEventListener("resize",measure);window.addEventListener("scroll",measure,true);window.visualViewport?.addEventListener("resize",measure);window.visualViewport?.addEventListener("scroll",measure);
  return()=>{document.removeEventListener("pointerdown",outside);window.removeEventListener("resize",measure);window.removeEventListener("scroll",measure,true);window.visualViewport?.removeEventListener("resize",measure);window.visualViewport?.removeEventListener("scroll",measure);};
 },[open]);
 useEffect(()=>{if(disabled)setOpen(false);},[disabled]);
 useEffect(()=>{if(open&&active)popup.current?.querySelector(`[data-option-index="${index}"]`)?.scrollIntoView({block:"nearest"});},[index,open,active]);
 return <div ref={root} className={`search-select ${className || ""}`} style={style}>

  <input id={inputId} ref={input} className="search-select-input" type="text" role="combobox" aria-expanded={open} aria-controls={open?listId:undefined} aria-autocomplete="list" aria-activedescendant={open&&active?`${uid}-${options.indexOf(active)}`:undefined} aria-invalid={invalid || undefined} aria-describedby={[rest["aria-describedby"],invalid?errorId:undefined].filter(Boolean).join(" ")||undefined} aria-label={rest["aria-label"]} aria-required={required} disabled={disabled} autoComplete="off" value={open?query:label} placeholder={open ? en?"Type to search…":"Yazarak ara…":label} onClick={()=>{if(!open)show();}} onChange={event=>{if(!open)setOpen(true);setQuery(event.target.value);onSearch?.(event.target.value);setIndex(0);}} onBlur={()=>window.setTimeout(()=>{if(!root.current?.contains(document.activeElement)&&!popup.current?.contains(document.activeElement))setOpen(false);},0)} onKeyDown={event=>{
   if(event.key==="Escape"){event.preventDefault();setOpen(false);setQuery("");}
   else if(event.key==="Tab"){setOpen(false);setQuery("");}
   else if(event.key==="ArrowDown"||event.key==="ArrowUp"){event.preventDefault();if(!open)show();else setIndex(old=>Math.max(0,Math.min(available.length-1,old+(event.key==="ArrowDown"?1:-1))));}
   else if(event.key==="Enter"){event.preventDefault();if(open&&active)choose(active);else show();}
  }}/><button className="search-select-toggle" type="button" tabIndex={-1} aria-label={en?"Show options":"Seçenekleri göster"} disabled={disabled} onClick={()=>open?setOpen(false):show()}>⌄</button>
  <select {...rest} ref={native} className="search-select-native" value={selected} disabled={disabled} required={required} name={name} tabIndex={-1} aria-hidden="true" onChange={onChange} onInvalid={event=>{event.preventDefault();setInvalid(true);input.current?.focus();}}>{children}</select>
  {invalid&&<p id={errorId} className="search-select-error" role="alert">{en?"Choose an option to continue.":"Devam etmek için bir seçenek belirleyin."}</p>}
  {open&&createPortal(<div ref={popup} id={listId} role="listbox" className="search-select-popup" style={{position:"fixed",...position}}>{searchLoading&&<p role="status">{en?"Searching sources…":"Kaynaklarda aranıyor…"}</p>}{filtered.length?filtered.map(option=><button key={option.value} id={`${uid}-${options.indexOf(option)}`} type="button" role="option" data-option-index={available.indexOf(option)} aria-selected={selected===option.value} disabled={disabled || option.disabled} className={active===option?"keyboard-active":""} onPointerDown={event=>event.preventDefault()} onClick={()=>choose(option)}><span>{option.label}</span>{selected===option.value&&<span aria-hidden="true">✓</span>}</button>):<p role="status">{en?"No matching options":"Eşleşen seçenek yok"}</p>}</div>,root.current?.closest("dialog") || document.body)}
 </div>;
}
