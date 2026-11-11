"use client";
import { useEffect, type RefObject } from "react";
import { DialogHistory } from "./dialog-history";
let locks = 0, originalOverflow = "", originalHtmlOverflow = "", sequence = 0;
let dialogHistory: DialogHistory | undefined;
function history() {
  if (!dialogHistory) {
    dialogHistory = new DialogHistory({
      state: () => window.history.state, href: () => window.location.href,
      push: state => window.history.pushState(state, "", window.location.href),
      replace: state => window.history.replaceState(state, "", window.location.href),
      back: () => window.history.back()
    });
    window.addEventListener("popstate", event => {
      if (dialogHistory?.pop()) event.stopImmediatePropagation();
    }, {capture:true});
  }
  return dialogHistory;
}
export function useDialogScrollLock(ref: RefObject<HTMLDialogElement | null>) {
  useEffect(() => {
    const dialog = ref.current; if (!dialog) return;
    const id = `dialog-${++sequence}`, navigation = history();
    let locked = false, scroll = 0, href = "";
    const release = () => {
      if (!locked) return;
      locked = false;
      if (--locks === 0) {
        document.body.style.overflow = originalOverflow;
        document.documentElement.style.overflow = originalHtmlOverflow;
        // Native focus restoration must not move the feed after the viewer closes.
        if(window.location.href===href)requestAnimationFrame(()=>{
          if(!locks&&window.location.href===href)window.scrollTo({top:scroll,behavior:"instant"});
        });
      }
      navigation.closed(id);
    };
    const synchronize = () => {
      if (!dialog.open) { release(); return; }
      if (!locked) {
        scroll=window.scrollY;href=window.location.href;
        if (locks++ === 0) {
          originalOverflow = document.body.style.overflow;
          originalHtmlOverflow = document.documentElement.style.overflow;
          document.body.style.overflow = "hidden";
          document.documentElement.style.overflow = "hidden";
        }
        locked = true;
        navigation.open(id, () => dialog.close());
      }
    };
    const observer = new MutationObserver(synchronize); observer.observe(dialog, { attributes:true, attributeFilter:["open"] }); synchronize();
    return () => { observer.disconnect(); release(); };
  }, [ref]);
}
