// Separate mounted Settings/Spaces sandboxes, real registry/Crew discovery and
// production row rendering. No Core, user preferences or native input is used.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {captureSpaceBlock} from '../src/shared/workspace-links.js';

function element(asset) {
 const n={asset,attrs:{},kids:[]};let e;
 return e=new Proxy(n,{get(o,k){
  if(k in o)return o[k];if(k==='then')return undefined;
  if(k==='when')return(yes,fn)=>yes?fn(e):e;
  if(k==='child')return child=>{if(child!=null)o.kids.push(child);return e;};
  if(k==='children')return children=>{o.kids.push(...children);return e;};
  return(...args)=>{o.attrs[k]=args;return e;};
 }});
}
const nodes=e=>e?.kids?[e,...e.kids.flatMap(nodes)]:[];
const find=(tree,id)=>nodes(tree).find(e=>e.attrs.id?.[0]===id);
const plain=value=>JSON.parse(JSON.stringify(value));
const theme={foreground:'#eeeeee',muted:'#aaaaaa',dim:'#888888',chrome:'#111111',background:'#222222',border:'#444444',selected:'#333333',hover:'#333333',ansi2:'#22aa44',ansi3:'#cc8833',ansi6:'#11aaaa'};

async function mounted({enabled=false,initialMode='success',selected='coordinator',workers=1} = {}) {
 const state={'custom.plugins':{crew:{enabled:true},git:{enabled:false}},'custom.spaces.preferences':{connectFleetToCoordinator:enabled}},copies=[],refreshes=new Set(),jobs=[],requests=[];
 let rendering=false,dialogOpen=true,mode=initialMode,now=100000,allowOrder=false;
 const order=[];
 const pending=[],yielded=[];
 const groups=[],panes=[],terminals=[];
 for(const machine of [null,'pc2']) {
  const q=id=>machine?`${machine}/${id}`:id;
  groups.push({id:q('coordinator'),name:'coordinator',machine,active:selected==='coordinator',tabs:[{id:q('c')}]},
   {id:q('other'),name:'other',machine,tabs:[]},
   {id:q('fm-crew-home'),name:'fleet',machine,active:selected==='fm-crew-home',tabs:Array.from({length:workers},(_,i)=>({id:q(i===0?'w':`w${i}`),active:i===0}))});
  panes.push({tab:q('c'),pane:q('cp'),terminal:q('t1')});
  terminals.push({address:q('t1'),state:'live',labels:{'custom.crew.home':'1'}});
  for(let i=0;i<workers;i++) {
   panes.push({tab:q(i===0?'w':`w${i}`),pane:q(i===0?'wp':`wp${i}`),terminal:q(`t${i+2}`),active:selected==='fm-crew-home'&&i===0});
   terminals.push({address:q(`t${i+2}`),state:'live',labels:{'crew.task':i===0?'task':`task${i}`,'crew.home':'home','herdr.space':'fm-crew-home'}});
  }
 }
 const colors=Object.fromEntries(groups.map(s=>[s.id,s.name==='coordinator'?theme.ansi2:s.name==='fleet'?theme.ansi3:theme.ansi6]));
 state['space.colors']={...colors};state['custom.space-colors']={...colors};
 const topology=JSON.stringify({groups,panes,terminals,colors});
 const assertEvent=()=>assert.equal(rendering,false,'No render-time effects');
 const host={shared:k=>state[k],setShared(k,v){assertEvent();if(JSON.stringify(state[k])===JSON.stringify(v))return;state[k]=plain(v);for(const copy of copies)refreshes.add(copy);},
  spaces:()=>groups,panes:()=>panes,terminals:()=>terminals,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],checking:()=>false,
  props:()=>({}),focused:()=>({space:selected,tab:selected==='coordinator'?'c':'w',pane:selected==='coordinator'?'cp':'wp',terminal:selected==='coordinator'?'t1':'t2',app:'a1'}),theme:()=>theme,layout:()=>({id:'sidebar',size:{px:248}}),window:()=>({active:true}),settings:()=>({zoom:1}),
  notify(){assert.fail('No toast');},run(name,args){assertEvent();if(allowOrder&&name==='space.move'){order.push(args);return;}assert.fail('No native mutation');},openOverlay(){assert.fail('No overlay replacement');},closeOverlay(){dialogOpen=false;assert.fail('The dialog must stay open');},
  exec(){assert.fail('No Git probe');},watchFolder(){assert.fail('No watcher');},
  async hc(args){assertEvent();if(args[0]==='machine')return {code:0,stdout:'{"machines":[]}'};
   assert.match(args.at(-1),/status '--all' '--json'/);
   assert.ok(!args.at(-1).includes("'--discover-prs'"),'Verification never performs GitHub discovery');
   const machine=args.includes('--on')?args[args.indexOf('--on')+1]:null;
   requests.push(machine);
   const result={home:`${machine??'local'}/.crew`,owner:{terminal:'t1',live:true},tasks:Array.from({length:workers},(_,i)=>({id:i===0?'task':`task${i}`,terminal:`t${i+2}`,state:'working',pr:null}))};
   const reply=type=>{
    if(type==='error')throw Error('Verification transport failed');
    if(type==='timeout')return {code:0,stdout:JSON.stringify({code:null,timed_out:true,stdout:'',stderr:''})};
    const output=type==='ambiguous'?{...result,owner:null}:result;
    if(['large','interrupt'].includes(type)) {output.padding='';output.padding='x'.repeat(1048576-JSON.stringify(output).length);}
    return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(output)).toString('base64'),stderr:''})};
   };
   if(mode==='defer')return new Promise((resolve,reject)=>pending.push(type=>{try{resolve(reply(type));}catch(error){reject(error);}}));
   return reply(mode);
  }};
 const common={
  'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},
  'gpui-base':{v_flex:element,h_flex:element,Input:{},Popover:{},Popup:{},ScrollHandle:{new:()=>({})}},
  'ui.js':'src/ui/ui.js','reorder.js':'src/ui/reorder.js',
  'space-color-state.js':'src/shared/space-color-state.js','space-preferences.js':'src/shared/space-preferences.js',
  'workspace-links.js':'src/shared/workspace-links.js','space-title.js':'src/ui/space-title.js',
  'directory.js':{displaySpace:s=>s,spaceDirectory:()=>({cwd:null})},
  'sidebar-scroll.js':{sidebarScroll:(_o,id,_t,rows)=>element().id(id).children(rows)},
  'space-rename.js':{beginSpaceRename(){},cancelSpaceRename(){},saveSpaceRename(){},syncSpaceRename(){}},
  'tab-arrival.js':{startTabArrivals(){},tabArrivalMotion:(_o,e)=>e},
 };
 const mount=async(kind)=>{
  const timers=[],copy={active:true};
  const cx={notify(){assertEvent();refreshes.add(copy);},focus_handle(){assertEvent();return{focus(){assertEvent();}};},
   spawn(fn){const job=Promise.resolve(fn(cx));jobs.push(job);return job;},timer:{every(ms,fn){timers.push({ms,fn});},after(ms,fn){assert.equal(ms,0,'Only bounded reply decoding can yield a task turn; recovery uses the existing lifecycle');if(mode==='interrupt')yielded.push(()=>fn(cx));else jobs.push(Promise.resolve().then(()=>fn(cx)));}},stop_propagation(){}};
  const api=await loadMod({host,mod:`custom-${kind}`,globals:{localStorage:{getItem:()=>null,setItem(){}},Date:class extends Date{static now(){return now;}}},
   modules:{...common,'main.js':'src/features/spaces/main.js','spaces-ui.js':'src/features/settings/spaces-ui.js'},
   entry:kind==='settings'?'export {spacesPage} from "./spaces-ui.js";export * as r from "./plugins.js";':'export {default as Spaces} from "./main.js";export * as r from "./plugins.js";'});
  Object.assign(copy,{cx,api,timers});
  if(kind==='spaces'){
   copy.view=new api.Spaces();copy.view.init({},cx);copy.render=()=>copy.tree=copy.view.render(cx);
  }else{
   copy.owner={heading:(_t,title)=>element().child(title),row:(_t,label,_about,toggle)=>element().child(label).child(toggle),
    toggle:(_t,id,value,fn)=>element().id(id).checked(value).on_click(fn)};
   copy.render=()=>copy.tree=api.spacesPage(copy.owner,theme);
  }
  copies.push(copy);refreshes.add(copy);return copy;
 };
 const settings=await mount('settings');let sidebar=await mount('spaces');
 const paint=()=>{for(const copy of [...refreshes]){refreshes.delete(copy);if(!copy.active)continue;rendering=true;try{copy.render();}finally{rendering=false;}}};
 let servicedRequest;
 const service=()=>{servicedRequest=state['custom.fleet.request']?.id;for(const copy of copies)if(copy.active)for(const timer of copy.timers)if(timer.ms===250)timer.fn(copy.cx);};
 const drain=async()=>{await Promise.resolve();if(state['custom.fleet.request']?.id!==servicedRequest)service();while(jobs.length){await Promise.all(jobs.splice(0));}paint();};
 const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();if(state['custom.fleet.request']?.id!==servicedRequest)service();for(let i=0;i<30;i++)await Promise.resolve();paint();};
 const release=(count=pending.length,type='success',offset=0)=>{assert.ok(count+offset<=pending.length);for(const done of pending.splice(offset,count))done(type);};
 const flip=key=>{assert.ok(dialogOpen);find(settings.tree,`st-spaces-${key}`).attrs.on_click[0]({},settings.cx);paint();};
 const numbered=row=>row.kids.find(n=>n?.attrs?.size?.[0]===16 && typeof n.kids?.[0]==='string');
 const rows=machine=>nodes(sidebar.tree).filter(n=>n.attrs.id?.[0]?.startsWith('space-content-')).filter(n=>groups.find(s=>`space-content-${s.id}`===n.attrs.id[0])?.machine===machine);
 const frame=attached=>{
  assert.ok(dialogOpen,'Assertions never close Settings');
  for(const machine of [null,'pc2']){
   const q=id=>machine?`${machine}/${id}`:id;
   assert.deepEqual(rows(machine).map(r=>r.attrs.id[0]),(attached?['coordinator','fm-crew-home','other']:['coordinator','other','fm-crew-home']).map(id=>`space-content-${q(id)}`));
   const parent=find(sidebar.tree,`space-content-${q('coordinator')}`),child=find(sidebar.tree,`space-content-${q('fm-crew-home')}`);
   // Herdr 0.1.17 defaults/keys.json binds Alt+N to space.select:N;
   // window.rs resolves that against model.spaces[N-1], not our projection.
   // Keep every advertised shortcut truthful, including the unrelated row.
   for(const row of rows(machine)){
    const nativeIndex=groups.findIndex(s=>`space-content-${s.id}`===row.attrs.id[0]);
    assert.equal(numbered(row).kids[0],String(nativeIndex+1),'Expanded badge denotes the native selection index');
   }
   for(const record of sidebar.view.ordered().filter(r=>r.w.machine===machine)){
    const expected=String(groups.findIndex(s=>s.id===record.w.id)+1);
    rendering=true;
    try{
     const rail=sidebar.view.compact(record,theme);
     assert.equal(find(rail,`space-badge-${record.w.id}`).kids[0],expected,'Compact rail advertises the same native shortcut');
     assert.equal(find(rail,`space-link-${record.w.id}`),undefined,'Rail never shows a chain');
     sidebar.view.drag.leaving={id:record.w.id,phase:'arm'};
     const chip=sidebar.view.dragPreview(theme);
     assert.equal(chip.kids[0].kids[0],expected,'Drag chip retains that native number, not the projected position');
     assert.equal(find(chip,`space-link-${record.w.id}`),undefined,'Drag chip never shows a chain');
    }finally{sidebar.view.drag.leaving=null;rendering=false;}
   }
   assert.equal(numbered(child).attrs.bg[0],attached?theme.ansi2:theme.ansi3);
   for(const id of ['coordinator','fm-crew-home']){
    const row=find(sidebar.tree,`space-content-${q(id)}`),chain=find(sidebar.tree,`space-link-${q(id)}`);
    assert.equal(chain,undefined,'Neither attached row has a chain');
    if(attached){
     const child=id==='fm-crew-home';
     assert.equal(Boolean(find(sidebar.tree,`space-branch-${q(id)}`)),child,'Only the attached child has the shared connector');
     assert.equal(Boolean(find(sidebar.tree,`space-tag-${q(id)}-crew-0`)),!child,'Only the coordinator shows Crew');
    }
   }
  }
  assert.equal(JSON.stringify({groups,panes,terminals,colors}),topology,'No native order, terminal, focus or saved colour mutation');
 };
 await drain();frame(false);
 return{state,settings,groups,order,allowOrder:()=>allowOrder=true,get sidebar(){return sidebar;},requests,flip,drain,tick,paint,frame,release,setMode:value=>mode=value,
  async pulse(ms,wait=true){now+=ms;for(const copy of copies)if(copy.active)for(const timer of copy.timers)if(timer.ms===250)timer.fn(copy.cx);await (wait?drain():tick());},
  advance(ms){now+=ms;},
  resumeYields(){for(const resume of yielded.splice(0))resume();},
  async replaceSidebar(){sidebar.active=false;sidebar=await mount('spaces');await tick();},get now(){return now;}};
}

// Retain the same Settings/Spaces/provider graphs through real off intervals
// and through timer callbacks during a sub-two-second verification. In
// particular, do not rebuild a fresh link or replace a provider between flips.
for(const selected of ['coordinator','fm-crew-home'])for(const workers of [1,7])for(const delay of [0,1000,15000]) {
 const x=await mounted({selected,workers});x.flip('fleet');await x.drain();x.frame(true);
 for(let cycle=0;cycle<3;cycle++) {
  x.flip('fleet');await x.drain();x.frame(false);
  const before=x.requests.length;
  for(let elapsed=0;elapsed<delay;elapsed+=250)await x.pulse(250);
  assert.equal(x.requests.length,before,'Off never starts verification, even beyond the attempt TTL');
  x.setMode('defer');const start=x.now;x.flip('fleet');x.frame(true);await x.tick();x.frame(true);
  const generation=x.state['custom.fleet.generation'];
  assert.equal(x.requests.length,before+2,'Each on immediately starts a local and a remote verification');
  for(let elapsed=0;elapsed<750;elapsed+=250)await x.pulse(250,false);
  assert.equal(x.requests.length,before+2,'The real Spaces timer joins each generation’s reader');
  x.release();await x.drain();x.frame(true);
  assert.ok(x.now-start<2000,'One sub-two-second status completion suffices to reattach');
  assert.equal(x.state['custom.fleet.generation'],generation,'No consumer invalidates the on generation');
  for(const key of ['local','pc2']) {
   assert.equal(x.state['custom.fleet.diagnostics']?.entries?.[key]?.lastDiscard,undefined,
    'Ordinary repeated off/on cycles must not discard current verification');
   assert.equal(x.state['custom.fleet.reads']?.[key],undefined,'Successful verification retires its lease');
  }
  x.setMode('success');
 }
}

// An already witnessed reader from before off retains its actual callback and
// shared lease history. Completing it must neither retire the new reader nor
// overwrite its result, regardless of selected space and reply ordering.
for(const selected of ['coordinator','fm-crew-home'])for(const delay of [0,1000,15000])
 for(const oldFirst of [false,true])for(const oldReply of ['success','error']) {
 const x=await mounted({selected,workers:7});x.flip('fleet');await x.drain();x.frame(true);
 x.setMode('defer');
 x.sidebar.api.r.pluginEvent('workspace.context.refresh',{cx:x.sidebar.cx,force:true});await x.tick();
 const oldGeneration=x.state['custom.fleet.generation'];const before=x.requests.length;
 x.flip('fleet');await x.tick();x.frame(false);
 for(let elapsed=0;elapsed<delay;elapsed+=250)await x.pulse(250,false);
 x.flip('fleet');x.frame(true);await x.tick();x.frame(true);
 assert.equal(x.state['custom.fleet.generation'],oldGeneration+2);
 assert.equal(x.requests.length,before+2,'A pre-off lease cannot block the latest on');
 const leases=plain(x.state['custom.fleet.reads']);
 // Model status taking several seconds under load, not just a synchronous
 // promise. TTL and timer events must not replace a valid current reader.
 for(let elapsed=0;elapsed<3500;elapsed+=250)await x.pulse(250,false);
 assert.equal(x.requests.length,before+2,'Slow current verification remains single-flight');
 Object.assign(leases,plain(x.state['custom.fleet.reads'])); // owner heartbeat, not a replacement
 if(oldFirst) {
  x.release(2,oldReply);await x.tick();x.frame(true);
  assert.deepEqual(plain(x.state['custom.fleet.reads']),leases,'Obsolete callback cannot release its successor’s lease');
  x.release();await x.drain();x.frame(true);
 } else {
  x.release(2,'success',2);await x.tick();x.frame(true);
  const latest=plain(x.state['custom.fleet.links']),display=plain(x.state['custom.fleet.display']);
  x.release(2,oldReply);await x.drain();x.frame(true);
  assert.deepEqual(plain(x.state['custom.fleet.links']),latest,'Old success or failure cannot overwrite the latest status, token or freshness');
  assert.deepEqual(plain(x.state['custom.fleet.display']),display);
 }
 for(const key of ['local','pc2']) {
  assert.equal(x.state['custom.fleet.diagnostics'].entries[key].lastDiscard.reason,'obsolete-generation');
  assert.equal(x.state['custom.fleet.diagnostics'].entries[key].retry??null,null,'Obsolete replies cannot schedule recovery');
 }
}

// A lost native continuation cannot execute catch/finally. Simulate it by
// withholding a real decoder turn after raw-reply receipt, not by rejecting IO.
for(const warm of [false,true]) {
 const x=await mounted({selected:'fm-crew-home',workers:7});
 if(warm){x.flip('fleet');await x.drain();x.frame(true);}
 x.setMode('interrupt');
 if(warm)x.sidebar.api.r.pluginEvent('workspace.context.refresh',{cx:x.sidebar.cx,force:true});else x.flip('fleet');
 await x.tick();x.frame(warm);
 const before=x.requests.length,started=x.now;
 for(const key of ['local','pc2']) {
  const lease=x.state['custom.fleet.reads'][key];
  assert.equal(lease.phase,'processing');assert.equal(lease.until,started+2000);assert.equal(lease.transportUntil,started+45000);
 }
 x.setMode('success');await x.pulse(1999,false);assert.equal(x.requests.length,before);
 await x.pulse(1,false);x.frame(true);
 assert.equal(x.requests.length,before+2,'Existing lifecycle replaces abandoned response processing at two seconds, even inside a prior successful attempt TTL');
 for(const key of ['local','pc2'])assert.equal(x.state['custom.fleet.diagnostics'].entries[key].lastDiscard.reason,'expired-read');
 const current=plain(x.state['custom.fleet.links']);
 x.resumeYields();await x.drain();x.frame(true);
 assert.deepEqual(plain(x.state['custom.fleet.links']),current,'Even a resumed obsolete continuation cannot replace recovered facts');
}
// The expired continuation can resume BEFORE the lifecycle sees its deadline.
// Spaces must witness the prior success so its ordinary ten-second TTL is
// genuinely eligible to hide a lost recovery marker in this ordering.
for(const warm of [true,false]) {
 const x=await mounted({selected:'fm-crew-home',workers:7});
 if(warm) {
  x.flip('fleet');await x.drain();x.frame(true);
  x.sidebar.api.r.pluginEvent('workspace.context.refresh',{cx:x.sidebar.cx,force:true});
  await x.drain();x.frame(true);
  assert.ok(x.sidebar.api.r.pluginPullContext('coordinator'),'Spaces witnessed the successful warm read');
 }
 x.setMode('interrupt');
 if(warm)x.sidebar.api.r.pluginEvent('workspace.context.refresh',{cx:x.sidebar.cx,force:true});else x.flip('fleet');
 await x.tick();const before=x.requests.length;
 const leases=plain(x.state['custom.fleet.reads']),prior=plain(x.state['custom.fleet.links']);
 x.advance(2100); // No lifecycle callback: the decoder wins the event ordering.
 x.setMode('success');x.resumeYields();await x.drain();x.frame(warm);
 assert.deepEqual(plain(x.state['custom.fleet.links']),prior,'Expired processing cannot publish or renew freshness');
 await x.pulse(150);x.frame(true); // First lifecycle observation is at 2250 ms.
 assert.equal(x.requests.length,before+2,'Resume-before-tick must restart local and remote verification at the next lifecycle, not the old ten-second TTL');
 for(const key of ['local','pc2']) {
  assert.equal(x.state['custom.fleet.diagnostics'].entries[key].lastDiscard.reason,'expired-read');
  assert.notEqual(x.state['custom.fleet.links'].entries[key].token,leases[key].token);
  assert.equal(x.state['custom.fleet.links'].entries[key].at,x.now);
  assert.equal(x.state['custom.fleet.reads']?.[key],undefined,'The replacement completes and retires its own lease');
 }
}
{
 const x=await mounted({selected:'fm-crew-home',workers:7});x.setMode('large');
 for(let cycle=0;cycle<3;cycle++) {
  x.flip('fleet');await x.drain();x.frame(true);
  for(const key of ['local','pc2'])assert.equal(x.state['custom.fleet.links'].entries[key].status.tasks.length,7,'A supported one-MiB reply survives bounded decoding and status parsing');
  x.flip('fleet');await x.drain();x.frame(false);
 }
}

const m=await mounted();
m.flip('fleet');
assert.equal(m.state['custom.spaces.preferences'].connectFleetToCoordinator,true,'The preference is written with Settings open');
await m.drain();
assert.equal(m.requests.length,2,'The toggle itself starts verification for local and remote machines, without the next Spaces timer or a close event');
m.frame(true);
m.flip('fleet');await m.drain();m.frame(false);
m.flip('fleet');await m.drain();m.frame(true);
// The sibling switches already save synchronously and do not start fleet reads.
const reads=m.requests.length;
for(const [id,key,value]of [['confirm','confirmLastTab',true],['close','closeOnLastTab',false]]){
 m.flip(id);assert.equal(m.state['custom.spaces.preferences'][key],value);await m.drain();m.frame(true);
}
assert.equal(m.requests.length,reads);
// Remembered presentation restores before a read completes, with no fresh
// action context or revived task inventory. Inline spawn is intentional (the native runtime
// may enter a task immediately); rendering always guards focus and notify.
m.flip('fleet');await m.drain();m.frame(false);
m.setMode('defer');m.flip('fleet');m.frame(true);await m.tick();m.frame(true);
assert.equal(m.sidebar.api.r.pluginPullContext('coordinator'),null,'Memory grants no fresh inventory authority');
assert.equal(m.requests.length,reads+2);
m.release();await m.drain();m.frame(true);
// Disabling while reads are pending revokes the generation immediately. An old
// success cannot resurrect attachment, even if the user has enabled again.
m.flip('fleet');await m.drain();m.frame(false);
m.flip('fleet');await m.tick();m.frame(true);
const beforeReversal=m.requests.length;
m.flip('fleet');m.frame(false);
m.flip('fleet');await m.tick();m.frame(true);
assert.equal(m.requests.length,beforeReversal+2,'A new generation starts its own verification');
m.release(2);await m.tick();m.frame(true);
m.release();await m.drain();m.frame(true);
// Uncertain refresh keeps memory; only a completed no-owner result forgets it.
for(const failure of ['error','ambiguous']){
 m.flip('fleet');await m.drain();m.frame(false);
 m.setMode(failure);m.flip('fleet');m.frame(true);await m.drain();m.frame(failure==='error');
 m.flip('fleet');await m.drain();m.frame(false);
 m.setMode('success');m.flip('fleet');await m.drain();m.frame(true);
}
// Startup/failed first-read recovery is driven only by the real Spaces timer.
for(const failure of ['error','timeout']) {
 const x=await mounted({enabled:true,initialMode:failure});x.frame(false);assert.equal(x.requests.length,2);
 const reason=failure==='timeout'?'status-timeout':'transport-error';
 for(const key of ['local','pc2'])assert.equal(x.state['custom.fleet.diagnostics'].entries[key].lastFailure.reason,reason);
 x.setMode('success');await x.pulse(1999);assert.equal(x.requests.length,2);x.frame(false);
 await x.pulse(1);assert.equal(x.requests.length,4,'Existing Spaces timer alone retries the failed first read after two seconds');x.frame(true);
 for(const machine of [null,'pc2']){
  const id=machine?'pc2/coordinator':'coordinator';const context=x.sidebar.api.r.pluginPullContext(id);
  assert.equal(context.stale,false);assert.equal(x.state['custom.fleet.diagnostics'].entries[machine??'local'].retry,null);
 }
 x.flip('fleet');await x.drain();x.frame(false);await x.pulse(60001);assert.equal(x.requests.length,4,'Disable stops recovery immediately');
}
{
 const x=await mounted({initialMode:'defer'});x.flip('fleet');await x.tick();const before=x.requests.length;
 await x.pulse(25000,false);assert.equal(x.requests.length,before,'An in-flight command cannot overlap another recovery read');
 x.release(undefined,'timeout');await x.drain();assert.equal(x.state['custom.fleet.diagnostics'].entries.local.retry.nextAt,x.now+2000,'Backoff starts at timeout completion, not read start');
 x.setMode('success');await x.pulse(1999);assert.equal(x.requests.length,before);await x.pulse(1);x.frame(true);
}
for(const failure of ['error','timeout']) {
 const x=await mounted({enabled:true,initialMode:failure});
 for(const [delay,attempt]of [[2000,2],[5000,3],[10000,3],[10000,3],[10000,3]]){
  const before=x.requests.length;await x.pulse(delay-1);assert.equal(x.requests.length,before,'Lifecycle events cannot bypass the failure deadline');
  await x.pulse(1);assert.equal(x.requests.length,before+2,'Recovery must never wait longer than the previous ten-second cadence');
  for(const key of ['local','pc2']){
   const retry=x.state['custom.fleet.diagnostics'].entries[key].retry;
   assert.equal(retry.attempts,attempt);assert.ok(retry.nextAt-x.now<=10000,'Every eligible failure stays at or below ten seconds');
  }
 }
 x.setMode('ambiguous');await x.pulse(10000);assert.equal(x.state['custom.fleet.diagnostics'].entries.local.retry,null,'Authoritative no-owner result ends the recovery chain');x.frame(false);
}
{
 const x=await mounted({enabled:true,initialMode:'error'}),before=x.requests.length;
 // An update from the original slower policy must not inherit its old wait.
 for(const [key,attempts,delay]of [['local',4,60000],['pc2',3,15000]])
  x.state['custom.fleet.diagnostics'].entries[key].retry={generation:0,attempts,at:x.now,nextAt:x.now+delay};
 x.setMode('success');await x.replaceSidebar();await x.drain();x.frame(true);
 assert.equal(x.requests.length,before+2,'Replacement rejects persisted 15/60-second deadlines instead of inheriting a slower retry');
}
{
 const x=await mounted({enabled:true,initialMode:'timeout'}),before=x.requests.length;
 await x.replaceSidebar();assert.equal(x.requests.length,before,'Reload retains the failure deadline instead of resetting backoff');x.frame(false);
 x.setMode('success');await x.pulse(2000);x.frame(true);assert.equal(x.requests.length,before+2);
 // First frame after another graph replacement retains display, but only a
 // witnessed current read restores strict Git/worker action context.
 x.setMode('defer');await x.replaceSidebar();x.frame(true);assert.equal(x.sidebar.api.r.pluginPullContext('coordinator'),null);
 const pending=x.requests.length;x.setMode('success');await x.replaceSidebar();x.frame(true);assert.equal(x.requests.length,pending,'Replacement joins an extant reader');
 await x.pulse(2001,false);x.frame(true);assert.equal(x.requests.length,pending+2,'Retired lifecycle owner is replaced at two seconds, not the 45-second command allowance');
 assert.equal(x.sidebar.api.r.pluginPullContext('coordinator').stale,false);const verified=x.state['custom.fleet.links'].entries.local.at;
 x.release();await x.drain();assert.equal(x.state['custom.fleet.links'].entries.local.at,verified,'Retired reader cannot overwrite replacement verification');
 assert.equal(x.state['custom.fleet.diagnostics'].entries.local.lastDiscard.reason,'replaced-read');
}
// Exercise the actual Spaces.drop caller, not just the pure domain planner.
for(const source of ['coordinator','fm-crew-home']) {
 const x=await mounted();x.flip('fleet');await x.drain();x.flip('fleet');await x.drain();
 x.setMode('defer');x.flip('fleet');x.frame(true);await x.tick();
 assert.equal(x.sidebar.api.r.pluginWorkspaceLinks().length,0);
 const links=x.sidebar.api.r.pluginWorkspaceLinks({presentation:true});
 const meta=captureSpaceBlock(x.groups,links,source);assert.equal(meta.sources.length,2);
 x.allowOrder();x.sidebar.view.drag.take=()=>({kind:'drop',id:source,target:'other',meta});
 x.sidebar.view.drop('other',x.sidebar.cx);assert.ok(x.order.length,'Remembered-only pair can reorder through the production caller');
 assert.equal(x.order[0].id,'other');assert.equal(x.order[0].index,1);
 x.release();await x.drain();
}
console.log('PASS mounted Settings/Spaces local/remote toggles and timer-only startup/timeout recovery: recorded reasons, 2/5/10 backoff capped at the former healthy cadence, reload/abandoned leases, no new scheduler or user action');
