import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const state=new Map(),plain=v=>JSON.parse(JSON.stringify(v)),noop=()=>{};
const native=['powershell','cmd','bash'].map(key=>({key:'installed:'+key,name:key,source:'Installed shell',run:['C:/'+key+'.exe']}));
const context={shared:key=>state.get(key),setShared:(key,v)=>state.set(key,plain(v)),knownAgents:async()=>[],exec:async()=>({code:0,stdout:'{}'}),readTextFile:async()=>null,appHome:()=>'/app'};
const load=file=>fs.readFileSync(new URL(file,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
vm.runInNewContext(load('../mods/custom-settings/profiles.js')+load('../mods/custom-settings/terminal-drag.js')+'\nglobalThis.api={startTerminalDrag,overTerminalDrag,finishTerminalDrag,cancelTerminalDrag,terminalDragValid,composeTerminals,terminalConfig,updateTerminal};',context);
const p=context.api,cx={stop_propagation:noop,notify:noop},key='custom.terminals:null';
function setup(){state.clear();const owner={profileMachine:null,profileShells:plain(native),handle:{focus:noop},terminalEdit:null};p.cancelTerminalDrag(owner);return owner;}
function start(owner,shell='cmd'){p.startTerminalDrag(owner,owner.profileShells.find(p=>p.key==='installed:'+shell),{position:{x:0,y:0}},cx);}
function over(owner,index,after=false,distance=10){p.overTerminalDrag(owner,index,{position:{x:0,y:distance},local_position:{y:after?50:0},bounds:{height:60}},cx);}
let owner=setup();start(owner);over(owner,0);assert.equal(owner.terminalDrag.active,true);p.finishTerminalDrag(owner,cx);
assert.deepEqual(plain(p.composeTerminals(null,native).map(p=>p.key)),['installed:cmd','installed:powershell','installed:bash']);assert.equal(owner.terminalDrag,null);
owner=setup();start(owner,'powershell');over(owner,2,true);p.finishTerminalDrag(owner,cx);assert.equal(p.terminalConfig(null).order.at(-1),'installed:powershell');
owner=setup();start(owner);over(owner,0,false,2);assert.equal(owner.terminalDrag.active,false);p.finishTerminalDrag(owner,cx);assert.equal(state.has(key),false,'A click/small movement never persists an order');
owner=setup();start(owner);over(owner,1,false);p.finishTerminalDrag(owner,cx);assert.equal(state.has(key),false,'Dropping at the current slot is a no-op');
owner=setup();start(owner);over(owner,0);p.cancelTerminalDrag(owner,cx);p.finishTerminalDrag(owner,cx);assert.equal(state.has(key),false,'Cancel/Escape/outside never persist a drag');
owner=setup();start(owner);over(owner,0);owner.profileMachine='pc2';p.finishTerminalDrag(owner,cx);assert.equal(state.size,0,'A stale drag never writes to a new machine');
owner=setup();start(owner);over(owner,0);owner.profileShells.pop();p.finishTerminalDrag(owner,cx);assert.equal(state.size,0,'Changed discovered membership cancels the drop');
owner=setup();start(owner);over(owner,0);state.set(key,{version:1,overrides:{},order:['installed:bash','installed:cmd','installed:powershell']});const concurrent=JSON.stringify(state.get(key));p.finishTerminalDrag(owner,cx);assert.equal(JSON.stringify(state.get(key)),concurrent,'Concurrent ordering wins over a stale drag');
owner=setup();start(owner);over(owner,0);p.updateTerminal(null,'installed:cmd',{show:false,name:'Kept name',args:['/q']});p.finishTerminalDrag(owner,cx);assert.deepEqual(p.terminalConfig(null).overrides['installed:cmd'],{show:false,name:'Kept name',args:['/q']});assert.equal(p.terminalConfig(null).order[0],'installed:cmd','Reordering preserves launch/visibility edits');
owner=setup();start(owner);over(owner,0);state.set(key,{version:99,order:[],overrides:{}});p.finishTerminalDrag(owner,cx);assert.match(owner.terminalError,/Could not save terminal order/);assert.equal(owner.terminalDrag,null);assert.equal(state.get(key).version,99);
owner=setup();owner.profileMachine='pc2';start(owner);over(owner,0);p.finishTerminalDrag(owner,cx);assert.equal(state.has(key),false);assert.equal(state.get('custom.terminals:"pc2"').order[0],'installed:cmd');
// Manual Refresh must really rediscover, even with a warm cached inventory.
vm.runInNewContext(load('../mods/custom-settings/terminal-shell-ui.js')+'\nglobalThis.reloadShells=reloadTerminalShells;',context);
let warmed=0,loaded=0;const tasks=[];
context.cachedTerminalShells=()=>plain(native);context.warmTerminalShells=async()=>{warmed++;return plain(native);};context.loadTerminalShells=async()=>{loaded++;return plain(native);};
const refreshCx={notify:noop,spawn:fn=>tasks.push(fn(refreshCx))},refreshOwner={profileMachine:null,profileShellMachine:null,profileShells:[],profileSerial:1};
context.reloadShells(refreshOwner,refreshCx,1);await Promise.all(tasks);assert.equal(warmed,1);assert.equal(loaded,0);
refreshOwner.profileSerial=2;context.reloadShells(refreshOwner,refreshCx,2,true);assert.equal(refreshOwner.profileShellLoading,true);await Promise.all(tasks);assert.equal(loaded,1);assert.equal(refreshOwner.profileShellLoading,false,'Manual refresh bypasses TTL and clears busy state');
let resolveStale;context.loadTerminalShells=()=>new Promise(resolve=>{resolveStale=resolve;});refreshOwner.profileSerial=3;context.reloadShells(refreshOwner,refreshCx,3,true);refreshOwner.profileMachine='pc2';refreshOwner.profileShells=[];resolveStale(plain(native));await Promise.all(tasks);assert.equal(refreshOwner.profileShells.length,0,'Late refresh cannot install local executable paths on a different machine');
console.log('PASS: terminal drag/drop, thresholds/no-ops, cancel/race guards, preference preservation, per-machine isolation and forced refresh/busy-state guards');
