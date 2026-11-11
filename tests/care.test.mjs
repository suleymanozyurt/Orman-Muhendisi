import test from 'node:test';import assert from 'node:assert/strict';import {readFileSync,readdirSync} from 'node:fs';import {DatabaseSync} from 'node:sqlite';
import {handleCare} from '../app/api/care/handler.ts';import {handleVernacular} from '../app/api/vernacular/handler.ts';import {careCalendar,nextOccurrence,careAgenda} from '../app/care-model.ts';
const sqlite=new DatabaseSync(':memory:');for(const f of readdirSync(new URL('../drizzle/',import.meta.url)).filter(f=>f.endsWith('.sql')).sort())sqlite.exec(readFileSync(new URL('../drizzle/'+f,import.meta.url),'utf8'));
const prepared=(sql,args=[])=>({sql,args,bind(...args){return prepared(sql,args)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}},async run(){return sqlite.prepare(sql).run(...args)}});
const db={prepare:prepared,async batch(statements){sqlite.exec('BEGIN');try{const r=statements.map(s=>sqlite.prepare(s.sql).run(...s.args));sqlite.exec('COMMIT');return r;}catch(e){sqlite.exec('ROLLBACK');throw e;}}};
const request=(user,body,path='care')=>new Request('https://example.org/api/'+path,{method:body?'POST':'GET',headers:{...(user?{'oai-authenticated-user-id':user}:{}),'Content-Type':'application/json'},...(body?{body:JSON.stringify(body)}:{})});
const act=(user,body)=>handleCare(request(user,body),db);const get=async user=>(await handleCare(request(user),db)).json();const id=()=>crypto.randomUUID();
test('care plants, repeat tasks and journal persist with ownership, conflict and replay protection',async()=>{
 assert.equal((await act(null,{})).status,401);assert.equal((await handleCare(request('owner'),undefined)).status,503);
 const plant=id();assert.equal((await act('owner',{action:'add-plant',id:plant,name:'Window plant',species:'Monstera deliciosa',location:'Room',dueAt:'2026-10-01T06:00:00Z',intervalDays:7})).status,200);
 let state=await get('owner');assert.equal(state.plants.length,1);assert.equal(state.tasks[0].kind,'check');assert.equal((await get('another')).plants.length,0);
 const updatePlant={action:'update-plant',id:plant,name:'New name',species:'Monstera deliciosa',location:'Window',light:'Indirect'};
 assert.equal((await act('another',updatePlant)).status,404);assert.equal((await act('owner',updatePlant)).status,200);assert.equal((await get('owner')).plants[0].name,'New name');
 const editTask={action:'update-task',id:state.tasks[0].id,revision:0,title:'Inspect soil',kind:'check',dueAt:'2026-10-01T06:00:00Z',intervalDays:7};
 assert.equal((await act('another',editTask)).status,409);assert.equal((await act('owner',editTask)).status,200);assert.equal((await act('owner',editTask)).status,409);
 state=await get('owner');assert.equal(state.tasks[0].title,'Inspect soil');assert.equal(careAgenda(state,new Date('2026-10-01T12:00:00Z')).due.length,1);
 const task=state.tasks[0],eventId=id();const done={action:'complete',id:task.id,revision:1,eventId,nextDue:'2026-10-07T06:00:00Z',note:'Checked soil'};
 assert.equal((await act('another',done)).status,404);assert.equal((await act('owner',done)).status,200);assert.equal((await act('owner',done)).status,200);
 state=await get('owner');assert.equal(state.events.length,1);assert.equal(state.tasks[0].revision,2);assert.equal(state.tasks[0].due_at,'2026-10-07T06:00:00.000Z');
 assert.equal((await act('owner',{...done,eventId:id()})).status,409);
 assert.equal((await act('owner',{action:'add-task',id:id(),plantId:plant,title:'Pot check',kind:'repot',dueAt:'2026-10-02T06:00:00Z',intervalDays:-1})).status,400);
 const once=id();await act('owner',{action:'add-task',id:once,plantId:plant,title:'Pot check',kind:'repot',dueAt:'2026-10-02T06:00:00Z',intervalDays:0});await act('owner',{action:'complete',id:once,revision:0,eventId:id(),nextDue:'2026-10-03T06:00:00Z'});assert.equal((await get('owner')).tasks.some(t=>t.id===once),false);
 await act('another',{action:'delete-plant',id:plant});assert.equal((await get('owner')).plants.length,1);
 await act('owner',{action:'delete-plant',id:plant});state=await get('owner');assert.equal(state.plants.length,0);assert.equal(state.tasks.length,0);assert.equal(state.events.length,0);
});
test('calendar exports real dates, recurrence, alerts and escaped folded Unicode without injection',()=>{
 const text=careCalendar({plants:[{id:'p',name:'Devetabanı, salon\nBEGIN:VEVENT',species:'Monstera',location:'İstanbul'}],tasks:[{id:'t',plant_id:'p',title:'Toprak kontrolü',due_at:'2026-10-01T06:00:00Z',interval_days:7,active:1}],events:[]},new Date('2026-09-30T12:00:00Z'));
 assert.match(text,/DTSTART:20261001T060000Z/);assert.match(text,/RRULE:FREQ=DAILY;INTERVAL=7/);assert.match(text,/BEGIN:VALARM\r\nTRIGGER:PT0M/);assert.equal(text.split('BEGIN:VEVENT\r\n').length,2);assert.match(text,/\\nBEGIN:VEVENT/);for(const line of text.split('\r\n'))assert.ok(Buffer.byteLength(line)<=75);
 assert.equal(nextOccurrence(new Date('2026-12-30T09:00:00Z'),7),'2027-01-06T09:00:00.000Z');
});
test('regional names are exact-taxon contributions with required region, provenance and own-only deletion',async()=>{
 const post=(user,body)=>handleVernacular(request(user,body,'vernacular'),db);const get=async user=>(await handleVernacular(new Request('https://example.org/api/vernacular?plantId=flora-1',{headers:{'oai-authenticated-user-id':user}}),db)).json();
 assert.equal((await post('a',{action:'add',plantId:'flora-999999',name:'Name',region:'Region'})).status,404);
 assert.equal((await post('a',{action:'add',plantId:'flora-1',name:'Name',region:''})).status,400);
 await post('a',{action:'add',plantId:'flora-1',name:'Local name',region:'Muğla'});await post('a',{action:'add',plantId:'flora-1',name:'Local name',region:'Muğla'});
 const names=(await get('a')).names;assert.equal(names.length,1);assert.equal(names[0].owner,true);assert.equal((await get('b')).names[0].owner,false);assert.equal('user_id' in names[0],false);
 await post('b',{action:'delete',id:names[0].id});assert.equal((await get('a')).names.length,1);await post('a',{action:'delete',id:names[0].id});assert.equal((await get('a')).names.length,0);
});
