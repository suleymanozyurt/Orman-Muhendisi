import type {LensMode} from "./lens-modes";
export default function LensModeIcon({mode}:{mode:LensMode}){
 const glyphs={search:<><circle cx="10.5" cy="10.5" r="5.7"/><path d="m15 15 4.8 4.8"/></>,translate:<><path d="M3 5h12M8.8 3v2m3.1 0C11 10 8.5 13.2 4 16m1.2-8c1.6 3 3.7 5.1 6.7 7m1.4 5 4.5-10 4.2 10m-7-3.4h5.5"/></>,talk:<path d="M3 11v2m4-5v8m5-12v16m5-12v8m4-5v2"/>,create:<><rect x="3" y="3" width="18" height="18" rx="4"/><path d="M7 17c-2-2 .3-4.7 3.1-4.4 3 .3 4.4-1.3 4-4.2-.3-2.4 2.5-3.1 3.6-1.4 2.6 3.5-.4 8-4.5 8.6-1.4.2-2.6-.2-3.2 1.1-.5.8-2.3 1.4-3 .3Z"/></>};
 return <svg viewBox="0 0 24 24" width="24" height="24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">{glyphs[mode]}</svg>;
}
