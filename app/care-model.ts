export type CarePlant={id:string;name:string;species:string;guide:string;location:string;light:string;created_at:string};
export type CareTask={id:string;plant_id:string;title:string;kind:string;due_at:string;interval_days:number;revision:number;active:number};
export type CareEvent={id:string;plant_id:string;task_id:string;title:string;kind:string;action:string;note:string;created_at:string};
export type CareState={plants:CarePlant[];tasks:CareTask[];events:CareEvent[]};
export const careKinds=[{id:"check",tr:"Toprak kontrolü",en:"Soil check"},{id:"water",tr:"Sulama",en:"Watering"},{id:"feed",tr:"Besleme",en:"Feeding"},{id:"clean",tr:"Yaprak temizliği",en:"Leaf cleaning"},{id:"repot",tr:"Saksı kontrolü",en:"Pot check"},{id:"custom",tr:"Diğer",en:"Other"}];
export function localInput(date:Date){const copy=new Date(date.getTime()-date.getTimezoneOffset()*60000);return copy.toISOString().slice(0,16);}
export function nextOccurrence(date:Date,days:number){const copy=new Date(date);copy.setDate(copy.getDate()+days);return copy.toISOString();}
export function dateKey(date:Date){return localInput(date).slice(0,10);}
const escape=(value:string)=>value.replace(/\\/g,"\\\\").replace(/\r?\n/g,"\\n").replace(/;/g,"\\;").replace(/,/g,"\\,");
const stamp=(value:string)=>new Date(value).toISOString().replace(/[-:]/g,"").replace(/\.\d{3}/,"");
function fold(line:string){let lines:string[]=[],part="",bytes=0;for(const char of line){const n=new TextEncoder().encode(char).length;if(bytes+n>75){lines.push(part);part=" ";bytes=1;}part+=char;bytes+=n;}lines.push(part);return lines.join("\r\n");}
export function careCalendar(state:CareState,now=new Date()){
  const lines=["BEGIN:VCALENDAR","VERSION:2.0","PRODID:-//Orman Muhendisi//Bitki Bakimi//TR","CALSCALE:GREGORIAN","METHOD:PUBLISH","X-WR-CALNAME:Bitki bakımı"];
  for(const task of state.tasks.filter(t=>t.active)){const plant=state.plants.find(p=>p.id===task.plant_id);if(!plant)continue;lines.push("BEGIN:VEVENT",`UID:${task.id}@orman-muhendisi`, `DTSTAMP:${stamp(now.toISOString())}`,`DTSTART:${stamp(task.due_at)}`,`DURATION:PT10M`,`SUMMARY:${escape(`${plant.name} · ${task.title}`)}`,`DESCRIPTION:${escape(`Orman Mühendisi bakım planı. ${plant.species}. ${task.kind==="check" ? "Sulamadan önce toprağın nemini kontrol et." : "Bitkinin koşullarını kontrol ederek karar ver."} Uygulamada planı değiştirirsen takvimini de güncelle.`)}`,`LOCATION:${escape(plant.location)}`,...(task.interval_days>0?[`RRULE:FREQ=DAILY;INTERVAL=${task.interval_days}`]:[]),"BEGIN:VALARM","TRIGGER:PT0M","ACTION:DISPLAY",`DESCRIPTION:${escape(`${plant.name} · ${task.title}`)}`,"END:VALARM","END:VEVENT");}lines.push("END:VCALENDAR");return lines.map(fold).join("\r\n")+"\r\n";
}
export function careAgenda(state:CareState,now=new Date()){
 const today=dateKey(now),until=new Date(now);until.setDate(until.getDate()+7);const last=dateKey(until);
 const due=state.tasks.filter(t=>t.active&&dateKey(new Date(t.due_at))<=today);
 const upcoming=state.tasks.filter(t=>t.active&&dateKey(new Date(t.due_at))>today&&dateKey(new Date(t.due_at))<=last).sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at));
 const completed=state.events.filter(e=>e.action==='complete'&&dateKey(new Date(e.created_at))===today);
 const perPlant=state.plants.map(plant=>({plant,due:due.filter(t=>t.plant_id===plant.id).length,next:state.tasks.filter(t=>t.active&&t.plant_id===plant.id).sort((a,b)=>Date.parse(a.due_at)-Date.parse(b.due_at))[0],lastCheck:state.events.find(e=>e.plant_id===plant.id&&e.action==='complete')}));
 return {due,upcoming,completed,perPlant};
}
