"use client";

import { useEffect, useId, useRef, useState, type ReactNode } from "react";
import { createPortal } from "react-dom";
import { siteRouteUrl, type SiteRoute } from "./navigation";
import { warmRoute } from "./route-components";

export type NavChoice = { label: string; description: string; route: SiteRoute };

export default function NavItem({ label, icon, route, active, choices, onNavigate, variant = "sidebar", submenuLabel, currentRoute }: {
  label: string; icon: ReactNode; route: SiteRoute; active: boolean;
  choices: NavChoice[]; onNavigate: (route: SiteRoute) => void;
  variant?: "sidebar" | "header" | "avatar"; submenuLabel?: string; currentRoute?: SiteRoute;
}) {
  const [open, setOpen] = useState(false);
  const [position, setPosition] = useState({ left: 0, top: 0, width: 280 });
  const [inline, setInline] = useState(false);
  const root = useRef<HTMLDivElement>(null), panel = useRef<HTMLDivElement>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const focusPanel = useRef(false), suppressFocus = useRef(false);
  const id = useId();
  const selectedChoice=choices.filter(choice=>currentRoute&&Object.entries(choice.route).every(([key,value])=>currentRoute[key as keyof SiteRoute]===value)).sort((a,b)=>Object.keys(b.route).length-Object.keys(a.route).length)[0];
  const href = (next: SiteRoute) => siteRouteUrl(new URL("https://orman.local/"), next).search;
  function clear() { if (timer.current) clearTimeout(timer.current); }
  function close() { clear(); setOpen(false); }
  function show(moveFocus = false) {
    clear();
    const element = root.current;
    if (!element || !choices.length) return;
    const box = element.getBoundingClientRect(), width = Math.min(280, window.innerWidth - 24);
    const height = Math.min(70 + choices.length * 76, window.innerHeight - 24);
    setInline(Boolean(element.closest("dialog")));
    setPosition({
      left: Math.max(12, Math.min(variant === "sidebar" ? box.right + 8 : box.right - width, window.innerWidth - width - 12)),
      top: Math.max(12, Math.min(variant === "sidebar" ? box.top : box.bottom + 10, window.innerHeight - height - 12)),
      width,
    });
    focusPanel.current = moveFocus;
    window.dispatchEvent(new CustomEvent("om-nav-open", { detail: id }));
    setOpen(true);
    if (moveFocus && open) panel.current?.querySelector<HTMLAnchorElement>("a")?.focus();
  }
  function leave() { clear(); timer.current = setTimeout(() => setOpen(false), 180); }
  function restoreFocus() {
    suppressFocus.current = true;
    root.current?.querySelector<HTMLElement>("a,button")?.focus();
    queueMicrotask(() => { suppressFocus.current = false; });
  }
  useEffect(() => {
    if (open && focusPanel.current) { panel.current?.querySelector<HTMLAnchorElement>("a")?.focus(); focusPanel.current = false; }
  }, [open]);
  useEffect(() => () => clear(), []);
  useEffect(() => {
    if (!open) return;
    const key = (event: KeyboardEvent) => {
      if (event.key === "Escape") { event.preventDefault(); close(); restoreFocus(); }
    };
    const outside = (event: PointerEvent) => {
      if (!root.current?.contains(event.target as Node) && !panel.current?.contains(event.target as Node)) close();
    };
    const scroll = (event: Event) => { if (!inline && !panel.current?.contains(event.target as Node)) close(); };
    const another = (event: Event) => { if ((event as CustomEvent).detail !== id) close(); };
    document.addEventListener("keydown", key);
    document.addEventListener("pointerdown", outside);
    document.addEventListener("scroll", scroll, true);
    window.addEventListener("resize", close);
    window.addEventListener("om-nav-open", another);
    return () => {
      document.removeEventListener("keydown", key);
      document.removeEventListener("pointerdown", outside);
      document.removeEventListener("scroll", scroll, true);
      window.removeEventListener("resize", close);
      window.removeEventListener("om-nav-open", another);
    };
  }, [open, id, inline]);
  const submenu = <div ref={panel} id={id} className={`nav-submenu ${inline ? "inline" : ""}`}
    aria-labelledby={`${id}-title`} style={inline ? undefined : { position: "fixed", ...position }}
    onPointerEnter={clear} onPointerLeave={event=>{if(event.pointerType==="mouse")leave();}} onFocus={clear}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !root.current?.contains(event.relatedTarget)) leave(); }}>
    <span id={`${id}-title`} className="nav-submenu-title">{label}</span>
    {choices.map(choice => <a href={href(choice.route)} key={`${choice.route.view}-${choice.label}`} aria-current={choice===selectedChoice?"page":undefined}
      onPointerEnter={()=>warmRoute(choice.route.view)} onFocus={()=>warmRoute(choice.route.view)} onPointerDown={()=>warmRoute(choice.route.view)} onClick={event => {
      if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); close(); onNavigate(choice.route); }
    }}><span><strong>{choice.label}</strong><small>{choice.description}</small></span></a>)}
  </div>;
  return <div ref={root} data-open={open||undefined} className={`nav-item nav-item-${variant} ${active ? "current" : ""}`}
    onPointerEnter={event => { if (event.pointerType === "mouse"&&window.matchMedia("(any-hover:hover) and (any-pointer:fine)").matches) { warmRoute(route.view); } }} onPointerLeave={event=>{if(event.pointerType==="mouse")leave();}}
    onPointerDown={()=>warmRoute(route.view)} onFocus={event => { warmRoute(route.view);  }}
    onBlur={event => { if (!event.currentTarget.contains(event.relatedTarget) && !panel.current?.contains(event.relatedTarget)) leave(); }}
    onKeyDown={event => { if ((event.key === "ArrowDown" || event.key === "ArrowRight") && !panel.current?.contains(event.target as Node)) { event.preventDefault(); show(true); } }}>
    {variant === "avatar" ? <button type="button" className="nav-avatar" aria-label={label} aria-expanded={open} aria-controls={id}
      onClick={() => open ? close() : show()}>{icon}</button> : <a href={href(route)} className={active ? "active" : ""}
      aria-current={active ? "page" : undefined} onClick={event => {
        if (!event.ctrlKey && !event.metaKey && !event.shiftKey && !event.altKey) { event.preventDefault(); close(); onNavigate(route); }
      }}>{icon}<span>{label}</span></a>}
    {choices.length > 0 && variant !== "avatar" && <button type="button" className="nav-submenu-toggle" aria-expanded={open} aria-controls={id}
      aria-label={submenuLabel || `${label} alt seçenekleri`} onClick={() => open ? close() : show()}><span aria-hidden="true">›</span></button>}
    {open && (inline ? submenu : createPortal(submenu, document.body))}
  </div>;
}
