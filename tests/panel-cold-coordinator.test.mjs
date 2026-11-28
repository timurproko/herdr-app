// Actual Crew provider/registry/capture/aggregate, with memory-only host transport.
// A cold provisional identity must never install a pressed, unrecoverable hold.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const plain=value=>JSON.parse(JSON.stringify(value));
for (const initial of ['files','changes']) {
 const state={'layout':'Custom','custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true},'custom.fleet.generation':7};
 const groups=[{id:'coordinator',active:true,tabs:[{id:'c',active:true}]},{id:'fm-crew-home',tabs:[{id:'w'}]}];
 const all=[{tab:'c',pane:'cp',terminal:'owner',cwd:'D:/repo'},{tab:'w',pane:'wp',terminal:'worker'}];
 const list=[{address:'owner',state:'live',labels:{'custom.crew.home':'1'}},{address:'worker',state:'live',labels:{'crew.task':'ship','crew.home':'home','herdr.space':'fm-crew-home'}}];
 const status={home:'C:/crew-home/.crew',owner:{terminal:'owner',live:true},tasks:[{id:'ship',terminal:'worker',state:'working',pr:'https://github.com/example/repo/pull/109'}]};
 const body={id:'panel-body',active:initial},panel={id:'panel',hidden:false},memory=new Map(),disk=new Map(),jobs=[];
 let reads=0;
 const cx={spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));},notify(){}};
 const host={shared:key=>state[key],setShared:(key,value)=>state[key]=plain(value),spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:'ready'}],checking:()=>false,
  focused:()=>({space:'coordinator',tab:'c',terminal:'owner'}),layout:()=>({children:[panel,body]}),appHome:()=>'/disposable-memory-only',
  readTextFile:async path=>disk.get(path)??null,writeTextFile:async(path,text)=>disk.set(path,text),
  hc:async()=>{reads++;return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(status)).toString('base64'),stderr:''})};},
  exec(){assert.fail('No Git inventory/process reads from capture or identity');},run(){assert.fail('No layout mutation is needed');}};
 const api=await loadMod({mod:'custom-changes',host,
  globals:{sessionStorage:{getItem:key=>memory.get(key)??null,setItem:(key,value)=>memory.set(key,value),removeItem:key=>memory.delete(key)},window:{refresh(){}}},
  modules:{'directory.js':{paneDirectory:pane=>({cwd:pane?.cwd??null})},'files-location.js':'src/plugins/files/mod/location.js'},
  entry:'export * as r from "./plugins.js";export * as d from "./plugins/crew/fleet-diagnostics.js";export * from "./panel-state.js";export {location as files} from "./files-location.js";export {AggregatePulls} from "./aggregate.js";'});
 const provisional=api.r.pluginPullContext('coordinator',{presentation:true});
 assert.equal(provisional.stale,true);assert.ok(provisional.home == null);assert.ok(provisional.scope.includes('fleet-waiting'));
 assert.equal(api.togglePanelPin(),false,'Cold coordinator capture is refused until its exact identity is established');
 assert.equal(api.panelPinned(),false);assert.equal(api.panelSource(),null);assert.equal(memory.get('custom.panel.session'),undefined);
 assert.equal(reads,0,'Pressing Pin starts no verification/IO');
 api.r.pluginEvent('spaces.refresh',{cx,force:true});while(jobs.length)await Promise.all(jobs.splice(0));await api.d.flushFleetLog();
 const verified=api.r.pluginPullContext('coordinator',{presentation:true});assert.equal(verified.stale,false);
 assert.equal(verified.home,status.home);assert.equal(verified.owner,'owner');assert.notEqual(verified.scope,provisional.scope);
 const aggregate=new api.AggregatePulls({shown:()=>true,onUpdate(){}});
 assert.equal(aggregate.currentContext().scope,verified.scope,'Initial verification naturally releases cold Loading while unpinned');
 assert.equal(api.togglePanelPin(),true,'An explicit pin after verification captures the canonical scope');
 assert.equal(api.panelSource().git.identity.scope,verified.scope);
 assert.equal(aggregate.currentContext().links[0].url,status.tasks[0].pr,'The valid held source retains ordinary scoped refresh authority');
 assert.equal(api.togglePanelPin(undefined,false),true);assert.equal(api.panelPinned(),false);
}
console.log('PASS: real-provider cold coordinator capture stays unpressed, initial verification recovers, and a subsequent pin holds the canonical identity');
