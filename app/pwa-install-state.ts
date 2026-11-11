export type InstallPromptEvent=Event & {prompt:()=>Promise<void>;userChoice:Promise<{outcome:string}>};
type InstallState={installed:boolean;prompt:InstallPromptEvent|null};
const initial:InstallState={installed:false,prompt:null};
let state=initial;
const listeners=new Set<()=>void>();
export const readInstallState=()=>state;
export const readServerInstallState=()=>initial;
export function subscribeInstallState(listener:()=>void){listeners.add(listener);return()=>{listeners.delete(listener);};}
function publish(value:InstallState){state=value;listeners.forEach(listener=>listener());}
export function clearInstallPrompt(){publish({...state,prompt:null});}
// Capture the browser prompt in the app shell, even before settings are visited.
export function observeInstallation(target:Window){
  const media=target.matchMedia("(display-mode: standalone)");
  const installed=()=>media.matches||Boolean((target.navigator as Navigator&{standalone?:boolean}).standalone);
  publish({installed:installed(),prompt:null});
  const available=(event:Event)=>{event.preventDefault();publish({installed:installed(),prompt:event as InstallPromptEvent});};
  const done=()=>publish({installed:true,prompt:null});
  const changed=()=>publish({...state,installed:installed()});
  target.addEventListener("beforeinstallprompt",available);target.addEventListener("appinstalled",done);media.addEventListener("change",changed);
  return()=>{target.removeEventListener("beforeinstallprompt",available);target.removeEventListener("appinstalled",done);media.removeEventListener("change",changed);};
}
