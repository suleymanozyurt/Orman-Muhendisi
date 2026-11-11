"use client";
import { useId, useRef, type ReactNode } from "react";
import { Icon } from "./icons";
import { useDialogScrollLock } from "./use-dialog-scroll-lock";
import type { Language } from "./i18n";

export default function ActionSheet({title,language,children,className="",compact=false}:{title:string;language:Language;children:ReactNode;className?:string;compact?:boolean}) {
  const dialog=useRef<HTMLDialogElement>(null),id=useId();
  useDialogScrollLock(dialog);
  return <div className={`context-actions ${className}`}>
    <button type="button" className="context-actions-trigger" aria-label={title} aria-haspopup="dialog" aria-controls={id} onClick={()=>dialog.current?.showModal()}><span aria-hidden="true" className="more-dots">···</span>{!compact&&<span>{language==="en"?"More":"Diğer"}</span>}</button>
    <dialog ref={dialog} id={id} className="action-sheet" aria-labelledby={`${id}-title`} onClick={event=>{
      if(event.target===event.currentTarget){dialog.current?.close();return;}
      const target=event.target instanceof Element?event.target.closest("button,a"):null;
      if(!target||target.hasAttribute("data-keep-open")||target.closest(".dialog-title"))return;
      if(Array.from(document.querySelectorAll("dialog[open]")).some(node=>node!==dialog.current))return;
      dialog.current?.close();
    }}>
      <div className="dialog-title"><h2 id={`${id}-title`}>{title}</h2><button type="button" autoFocus onClick={()=>dialog.current?.close()} aria-label={language==="en"?"Close":"Kapat"}><Icon name="close"/></button></div>
      <div className="action-sheet-content">{children}</div>
    </dialog>
  </div>;
}
