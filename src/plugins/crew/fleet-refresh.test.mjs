// Real packaged provider/registry + Spaces projection; fresh VMs exercise durable startup.
import assert from 'node:assert/strict';
import {loadMod} from '../../../tools/plugin-harness.mjs';
import {projectLinkedRows, captureSpaceBlock, planBlockDrop, SpaceBlockCommit} from '../../shared/workspace-links.js';
let now=100000, mode='success', release, requests=0,localLayout='ready';
const state={'custom.plugins':{crew:{enabled:true},git:{enabled:false}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'w'}]},{id:'other',tabs:[]}];
let all=[{tab:'c',pane:'cp',terminal:'t1'},{tab:'w',pane:'wp',terminal:'t2'}];
const list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},{address:'t2',state:'live',labels:{'crew.task':'task','crew.home':'home','herdr.space':'fm-crew-home'}}];
const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'task',terminal:'t2',state:'working',pr:'https://github.com/example/repo/pull/1'}]};
const tasks=[],cx={spawn:fn=>tasks.push(Promise.resolve().then(()=>fn(cx))),notify(){}};
const drain=async()=>{while(tasks.length)await Promise.all(tasks.splice(0));};
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const clone=value=>JSON.parse(JSON.stringify(value));
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:localLayout}],checking:()=>false,notify(){},
 hc:async args=>{
  assert.match(args.at(-1),/status '--all' '--json'/);requests++;
  if(mode==='defer')await new Promise(resolve=>release=resolve);
  if(mode==='error')throw Error('temporary transport failure');
  const output=mode==='malformed'?'{bad':JSON.stringify(status);
  return {code:0,stdout:JSON.stringify({code:mode==='timeout'?null:0,timed_out:mode==='timeout',stdout:Buffer.from(output).toString('base64'),stderr:''})};
 }};
const load=(testHost=host,mod='custom-settings')=>loadMod({host:testHost,mod,globals:{Date:class extends Date{static now(){return now;}}},
 modules:{'space-color-state.js':'src/shared/space-color-state.js','space-preferences.js':'src/shared/space-preferences.js'},
 entry:'import * as f from "./plugins/crew/fleet.js";import * as r from "./plugins.js";export {f,r};export * as p from "./space-preferences.js";export * as d from "./fleet-display.js";'});
const {f,r,p}=await load();
const event=(name='spaces.refresh',force=false)=>r.pluginEvent(name,{cx,force});
const links=(registry=r)=>registry.pluginWorkspaceLinks({presentation:true});
const frames=[];
function frame(expected=true,registry=r){
 const rows=projectLinkedRows(groups.map((w,i)=>({w,i})),links(registry)),child=rows.find(row=>row.w.id==='fm-crew-home');
 const attached=child?.linked??false;frames.push(attached);assert.equal(attached,expected);
 if(expected){
  assert.equal(rows[rows.indexOf(child)-1].w.id,'coordinator');
  for(const [id,tooltip] of [['coordinator','Crew coordinator'],['fm-crew-home','Crew worker']]) {
   const tags=Array.from(registry.pluginSpaceTags(groups.find(s=>s.id===id)),tag=>[tag.label,tag.tooltip]);
   assert.deepEqual(tags,[['Crew',tooltip]],'Both attached roles retain their Crew pill in every sampled frame');
  }
 }
 return rows;
}
const prime=async()=>{mode='success';status.owner.live=true;status.tasks=[{id:'task',terminal:'t2',state:'working',pr:'https://github.com/example/repo/pull/1'}];event('spaces.refresh',true);await drain();frame();};
await prime();
const persisted=state[f.DISPLAY_KEY];assert.equal(Object.keys(persisted.entries).length,1);
assert.deepEqual(Object.keys(Object.values(persisted.entries)[0]).sort(),['adoption','child','home','machine','owner','ownerPane','ownerTab','parent']);
assert.doesNotMatch(JSON.stringify(persisted),/https:|tasks|report|transcript|token|attemptAt/,'Durable identity stores no task/PR payload or request authority');
// Pair fingerprints exclude every unrelated topology/name/order/focus change.
const baselineCalls=requests;
const changes=[
 ()=>{groups.push({id:'new-space',tabs:[]});return()=>groups.pop();},
 ()=>{all.push({tab:'c',pane:'unrelated-pane',terminal:'t9'});return()=>all.pop();},
 ()=>{groups[2].name='renamed';return()=>delete groups[2].name;},
 ()=>{groups[2].tabs.push({id:'unrelated-tab'});return()=>groups[2].tabs.pop();},
 ()=>{groups.reverse();return()=>groups.reverse();},
 ()=>{groups[2].active=true;groups[0].tabs[0].active=false;return()=>{delete groups[2].active;delete groups[0].tabs[0].active;};},
 ()=>{groups.push({id:'pc2/unrelated',machine:'pc2',tabs:[]});all.push({tab:'pc2/unrelated',pane:'pc2/p',terminal:'pc2/t9'});return()=>{groups.pop();all.pop();};},
 ()=>{const removed=groups.splice(2,1)[0];return()=>groups.push(removed);},
];
for(const change of changes){const undo=change();frame();assert.equal(r.pluginWorkspaceLinks().length,1);event();await drain();frame();assert.equal(requests,baselineCalls,'Unrelated changes do not invalidate or re-earn the binding');undo();frame();}
assert.ok(frames.every(Boolean),'No unrelated-change frame becomes detached');
// Manual Git/periodic refresh coalesce without clearing either tag/badge projection.
mode='defer';event('workspace.context.refresh',true);await tick();const pendingEntry=JSON.stringify(state[f.FLEET_KEY]),pendingRequests=requests;
frame();event();event('workspace.context.refresh');await tick();assert.equal(requests,pendingRequests);assert.equal(JSON.stringify(state[f.FLEET_KEY]),pendingEntry);
now+=11000;event();await tick();frame();release();await drain();frame();
// Crossing action expiry retains display, not permission for Git or pair moves.
now+=29000;mode='defer';event('workspace.context.refresh',true);await tick();frame();now+=2000;event();await tick();frame();
assert.equal(r.pluginWorkspaceLinks().length,0);assert.equal(r.pluginPullContext('coordinator'),null);
assert.equal(r.pluginPullContext('coordinator',{presentation:true}).stale,true);
for(const source of ['coordinator','fm-crew-home']) {
 const captured=captureSpaceBlock(groups,links(),source);assert.equal(captured.sources.length,source==='coordinator'?2:1);
 if(source==='fm-crew-home')assert.equal(captured.parent,'coordinator','Child capture remains sibling-scoped');
 assert.equal(planBlockDrop(groups,r.pluginWorkspaceLinks(),source,'other',captured),null);
 const moves=[];new SpaceBlockCommit({read:()=>groups,links:()=>r.pluginWorkspaceLinks(),move:(...args)=>moves.push(args),fail(){}}).start(source,captured,groups.map(s=>s.id));assert.equal(moves.length,0);
}
release();await drain();frame();assert.equal(r.pluginWorkspaceLinks().length,1);
// Failed/malformed/timed-out reads never expire display, refresh age, or spin retries.
const successAt=state[f.FLEET_KEY].entries.local.at,successDisplay=JSON.stringify(state[f.DISPLAY_KEY]);
for(const failure of ['error','malformed','timeout']){
 now+=10001;mode=failure;event();await drain();frame();assert.equal(state[f.FLEET_KEY].entries.local.at,successAt);assert.equal(JSON.stringify(state[f.DISPLAY_KEY]),successDisplay,'Error handlers never mutate display history');
 const before=requests;for(let i=0;i<5;i++)event();await drain();assert.equal(requests,before,'Error retry backoff is independent of verification age');
}
now=successAt+2*86400000;mode='error';event();await drain();frame();assert.equal(r.pluginPullContext('coordinator'),null);
assert.equal(r.pluginPullContext('coordinator',{presentation:true}).stale,true,'Long outages retain display only, not fresh actions');
// A valid reply joined to a partial native frame is uncertainty, not a negative result.
await prime();const savedAll=all,partialAt=state[f.FLEET_KEY].entries.local.at;all=[];frame();assert.equal(r.pluginWorkspaceLinks().length,0);
event('workspace.context.refresh',true);await drain();frame();assert.equal(state[f.FLEET_KEY].entries.local.at,partialAt);all=savedAll;
// Dependent adoption changes immediately refuse actions, then detach on completed proof.
mode='defer';list[1].labels['crew.home']='changed';event();await tick();frame();assert.equal(r.pluginWorkspaceLinks().length,0);release();await drain();frame(false);
list[1].labels['crew.home']='home';await prime();
status.tasks=[];event('workspace.context.refresh',true);await drain();frame();assert.equal(r.pluginWorkspaceLinks().length,0,'An extant finished fleet retains identity, never actionable worker membership');
status.tasks=[{id:'task',terminal:'t2',state:'working',pr:null}];frame();await prime();
mode='defer';event('workspace.context.refresh',true);await tick();frame();status.owner.live=false;release();await drain();frame(false);await prime();
const removed=groups.splice(1,1)[0];assert.equal(links().length,0);event('spaces.refresh',true);await drain();assert.equal(Object.keys(state[f.DISPLAY_KEY].entries).length,0,'Confirmed native absence prunes durable identity');groups.splice(1,0,removed);frame(false);await prime();
// A finished fleet cannot be reconstructed from workers after loading erases it.
const finishedAll=all,finishedTabs=groups[1].tabs;status.tasks[0].state='closed';list[1].state='finished';all=all.filter(p=>p.terminal!=='t2');groups[1].tabs=[];
event('spaces.refresh',true);await drain();frame();const finishedDisplay=JSON.stringify(state[f.DISPLAY_KEY]),finishedAt=state[f.FLEET_KEY].entries.local.at;
const loadingChild=groups.splice(1,1)[0];now+=1;localLayout='loading';event('spaces.refresh',true);await drain();
assert.equal(JSON.stringify(state[f.DISPLAY_KEY]),finishedDisplay,'A successful status completion during partial layout loading must not erase the finished fleet');
assert.equal(state[f.FLEET_KEY].entries.local.at,finishedAt,'Loading completion does not renew action verification');
groups.splice(1,0,loadingChild);localLayout='ready';frame();event('spaces.refresh',true);await drain();frame();event('spaces.refresh',true);await drain();frame();
const finishedState=clone(state);
all=finishedAll;groups[1].tabs=finishedTabs;list[1].state='live';await prime();
// True cold restarts, hot reload and layout copies have only persisted identity in first frame.
const savedState=clone(state);
// Valid JSON with malformed identity is uncertainty, never verified disownership.
{
 const store=clone(savedState),writes=[],boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>{writes.push(k);store[k]=v;}});
 const reply=clone(store[f.FLEET_KEY].entries.local.status);
 boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();frame(true,boot.r);
 const before=JSON.stringify(store[f.DISPLAY_KEY]),entry=clone(store[f.FLEET_KEY].entries.local),scope=boot.r.pluginPullContext('coordinator').scope;
 const fields=[
  ['owner.terminal',[undefined,null,false,42,{},[],'','bad\u0000terminal','x'.repeat(513)]],
  ['owner.live',[undefined,null,0,1,'false',{},[]]],
  ['owner',[undefined,false,42,'t1',[],{}]],
  ['home',[undefined,null,false,42,{},[],'','bad\u0000home','x'.repeat(2049)]],
  ['tasks',[undefined,null,false,42,{},'tasks']],
  ['tasks.0',[null,false,42,'task',[]]],
  ['tasks.0.id',[undefined,null,false,42,{},[],'','bad\u0000id','x'.repeat(129)]],
  ['tasks.0.terminal',[undefined,null,false,42,{},[],'','bad\u0000terminal','x'.repeat(513)]],
  ['tasks.0.state',[undefined,null,false,42,{},[],'','unknown']],
 ];
 for(const [field,values] of fields)for(const value of values) {
  const malformed=clone(reply),keys=field.split('.'),key=keys.pop();let target=malformed;for(const part of keys)target=target[part];target[key]=value;
  const label=`${field}=${JSON.stringify(value)}`;now++;writes.length=0;
  boot.f.refreshFleets(cx,async()=>JSON.stringify(malformed),true);await drain();
  assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,`${label}: malformed identity retains persisted bytes`);
  assert.equal(writes.includes(f.DISPLAY_KEY),false,`${label}: no display publication`);
  const current=store[f.FLEET_KEY].entries.local;
  for(const key of ['at','token','status','binding','identity','members'])assert.equal(JSON.stringify(current[key]),JSON.stringify(entry[key]),`${label}: successful verification ${key} is unchanged`);
  frame(true,boot.r);assert.equal(boot.r.pluginPullContext('coordinator',{presentation:true}).scope,scope,`${label}: retained Git context survives`);
 }
 // Missing terminal is invalid even on a released owner or inactive task. An
 // explicit null terminal is valid only for tasks without a live-worker claim.
 for(const taskState of ['preparing','working','reported','stopped','failed','closed']) {
  for(const terminal of [undefined,null,42]) {
   const malformed=clone(reply);malformed.tasks[0]={...malformed.tasks[0],state:taskState,terminal};
   if(terminal===null && !['working','reported'].includes(taskState)){assert.doesNotThrow(()=>boot.f.recordedSource(JSON.stringify(malformed)));continue;}
   now++;boot.f.refreshFleets(cx,async()=>JSON.stringify(malformed),true);await drain();
   assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,`${taskState}: invalid terminal cannot erase display`);assert.equal(store[f.FLEET_KEY].entries.local.at,entry.at);
  }
 }
 const malformedRelease={...reply,owner:{live:false}};now++;boot.f.refreshFleets(cx,async()=>JSON.stringify(malformedRelease),true);await drain();assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before);assert.equal(store[f.FLEET_KEY].entries.local.at,entry.at);
 now++;boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();frame(true,boot.r);assert.equal(store[f.FLEET_KEY].entries.local.at,now,'A well-formed recovery renews verification');
 for(const owner of [{...reply.owner,live:false},null]) {
  boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();frame(true,boot.r);
  now++;boot.f.refreshFleets(cx,async()=>JSON.stringify({...reply,owner}),true);await drain();frame(false,boot.r);
  assert.equal(store[f.DISPLAY_KEY].entries.null,undefined,'A well-formed explicit release remains authoritative');assert.equal(store[f.FLEET_KEY].entries.local.at,now);
 }
}
// The only persistent writer rejects guesses; absence cannot authorize replacement.
{
 const store=clone(savedState),boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v});
 const record=clone(Object.values(store[f.DISPLAY_KEY].entries)[0]),candidate={...record,ownerPane:'verified-new-pane'};
 store[f.DISPLAY_KEY].entries.opaque={unrecognized:'preserve byte-for-byte'};
 for(const evidence of [{},{ready:true},{verified:true},{missing:true},{ready:false,verified:true},{ready:false,missing:true}])for(const next of [null,candidate]) {
  const before=JSON.stringify(store[f.DISPLAY_KEY]);assert.equal(boot.d.updateFleetDisplay(null,next,evidence),false);assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,'Insufficient evidence cannot mutate persistence');
 }
 assert.equal(boot.d.updateFleetDisplay(null,candidate,{ready:true,missing:true}),false);
 assert.equal(boot.d.updateFleetDisplay(null,candidate,{ready:true,verified:true}),true);assert.equal(store[f.DISPLAY_KEY].entries.null.ownerPane,candidate.ownerPane);assert.ok(store[f.DISPLAY_KEY].entries.opaque);
 for(const evidence of [{ready:true,missing:true},{ready:true,verified:true}]){store[f.DISPLAY_KEY].entries.null=clone(record);assert.equal(boot.d.updateFleetDisplay(null,null,evidence),true);assert.equal(store[f.DISPLAY_KEY].entries.null,undefined);assert.ok(store[f.DISPLAY_KEY].entries.opaque);}
 for(const invalid of [{version:999,entries:{}},{version:1,entries:[]}]){store[f.DISPLAY_KEY]=invalid;assert.equal(boot.d.updateFleetDisplay(null,candidate,{ready:true,verified:true}),false);assert.equal(store[f.DISPLAY_KEY],invalid);}
 const prior=store[f.DISPLAY_KEY];assert.equal(boot.d.updateFleetDisplay(null,null,{disabled:true}),false);assert.equal(store[f.DISPLAY_KEY],prior,'Off never erases even unknown memory');
}
// Finished-fleet cold/hot/layout startup: successful positive and negative reads
// during loading/unavailable/unknown layouts cannot erase unreconstructable history.
for(const restart of ['cold','hot','layout']) {
 const store=clone(finishedState);if(restart==='cold')delete store[f.FLEET_KEY];
 let layout='loading',visible=false;const writes=[],native=[groups[0],{...groups[1],tabs:[]},groups[2]];
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>{writes.push(k);store[k]=v;},spaces:()=>visible?native:[native[0]],panes:()=>all.filter(p=>p.terminal==='t1'),terminals:()=>list.filter(t=>t.address==='t1'),machines:()=>layout?[{name:null,layout}]:[]},restart==='layout'?'custom-spaces':'custom-settings');
 const before=JSON.stringify(store[f.DISPLAY_KEY]),reply=clone(finishedState[f.FLEET_KEY].entries.local.status),at=store[f.FLEET_KEY]?.entries.local.at;
 boot.r.pluginWorkspaceLinks({presentation:true});assert.equal(writes.length,0,'Cold restore is read-only');
 for(const uncertain of ['loading','unavailable',undefined]) {
  layout=uncertain;
  for(const value of [reply,{...reply,owner:{...reply.owner,live:false}}]){boot.f.refreshFleets(cx,async()=>JSON.stringify(value),true);await drain();assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,'Unready completion cannot publish absence');assert.equal(store[f.FLEET_KEY].entries.local.at,at);assert.equal(boot.r.pluginPullContext('coordinator'),null);}
 }
 visible=true;layout='ready';const beforeFrame=writes.length;frame(true,boot.r);assert.equal(writes.length,beforeFrame,'First restored child frame needs no write');
 boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();frame(true,boot.r);boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();frame(true,boot.r);
}
// Guard completion, not launch, for null, retained and replacement publications.
for(const proof of ['finished','released','home-change','owner-change','parent-change','adoption-conflict','replacement']) {
 const store=clone(savedState);let layout='ready',native=clone(groups),members=clone(all),live=clone(list),complete;
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v,spaces:()=>native,panes:()=>members,terminals:()=>live,machines:()=>[{name:null,layout}]});
 const before=JSON.stringify(store[f.DISPLAY_KEY]),at=store[f.FLEET_KEY].entries.local.at;boot.f.refreshFleets(cx,()=>new Promise(resolve=>complete=resolve),true);await tick();layout='loading';now++;
 const reply=clone(status);
 if(['finished','released','home-change','owner-change','parent-change'].includes(proof)){for(const task of reply.tasks)task.state='closed';native[1].tabs=[];members=members.filter(p=>p.terminal==='t1');live=live.filter(t=>t.address==='t1');}
 if(proof==='finished')native=[native[0]];
 if(proof==='released')reply.owner.live=false;
 if(proof==='home-change')reply.home='C:/different-home';
 if(proof==='owner-change'){reply.owner.terminal='t9';members[0].terminal='t9';live[0].address='t9';}
 if(proof==='parent-change'){native[2].tabs=[{id:'other-owner'}];members[0].tab='other-owner';}
 if(proof==='adoption-conflict'){for(const task of reply.tasks)task.state='closed';live[1].labels['crew.home']='wrong';}
 if(proof==='replacement'){native.push({...native[1],id:'fm-crew-new'});native[1].tabs=[];live[1].labels['crew.home']='new';live[1].labels['herdr.space']='fm-crew-new';}
 complete(JSON.stringify(reply));await drain();assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,`${proof}: loading completion retains history`);assert.equal(store[f.FLEET_KEY].entries.local.at,at);
 if(proof==='finished')native=[clone(groups[0]),{...clone(groups[1]),tabs:[]},clone(groups[2])];layout='ready';boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();
 const record=store[f.DISPLAY_KEY].entries.null;
 if(proof==='finished')assert.equal(record.child,'fm-crew-home');else if(proof==='replacement'){assert.equal(record.child,'fm-crew-new');assert.equal(record.adoption,'new');}else assert.equal(record,undefined,`${proof}: ready completed proof may remove it`);
}
// Invalid candidate metadata is uncertainty, not a successful negative binding.
for(const finished of [false,true]) {
 const store=clone(savedState),members=clone(all),native=clone(groups),live=clone(list),reply=clone(status);members[0].pane='';
 if(finished){for(const task of reply.tasks)task.state='closed';native[1].tabs=[];members.splice(1);live.splice(1);}
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v,spaces:()=>native,panes:()=>members,terminals:()=>live});const before=JSON.stringify(store[f.DISPLAY_KEY]),at=store[f.FLEET_KEY].entries.local.at;now++;
 boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,'Failed display validation cannot publish absence');assert.equal(store[f.FLEET_KEY].entries.local.at,at);
 members[0].pane='cp-confirmed';boot.f.refreshFleets(cx,async()=>JSON.stringify(reply),true);await drain();assert.equal(store[f.DISPLAY_KEY].entries.null.ownerPane,'cp-confirmed');
}
// Native pruning of either space needs READY, independently of status failures.
for(const absent of ['coordinator','fm-crew-home'])for(const uncertain of ['loading','unavailable',undefined]) {
 const store=clone(finishedState);let layout=uncertain;const before=JSON.stringify(store[f.DISPLAY_KEY]);
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v,spaces:()=>groups.filter(s=>s.id!==absent),machines:()=>layout?[{name:null,layout}]:[]});
 const failure=async()=>{throw Error('transport unavailable');};boot.f.refreshFleets(cx,failure,true);await drain();assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,'Unready pruning plus failure retains history');
 layout='ready';boot.f.refreshFleets(cx,failure,true);await drain();assert.equal(store[f.DISPLAY_KEY].entries.null,undefined,'Ready native absence alone permits pruning');
}
// Invalidation/enablement revokes action proof, but is not a deletion reason.
{
 const store=clone(savedState),boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v,machines:()=>[{name:null,layout:'loading'}]});const display=clone(store[f.DISPLAY_KEY]);
 boot.f.invalidateFleet();assert.deepEqual(store[f.DISPLAY_KEY],display,'Enabled invalidation retains display');
 boot.p.updateSpacePreferences({connectFleetToCoordinator:false});assert.deepEqual(store[f.DISPLAY_KEY],display);frame(false,boot.r);
 boot.p.updateSpacePreferences({connectFleetToCoordinator:false});assert.deepEqual(store[f.DISPLAY_KEY],display,'Already-off updates preserve memory too');
 store[f.DISPLAY_KEY]=clone(display);boot.p.updateSpacePreferences({connectFleetToCoordinator:true});assert.deepEqual(store[f.DISPLAY_KEY],display,'Enabling retains existing history');
 boot.r.setPluginEnabled(boot.r.pluginById('crew'),false);assert.deepEqual(store[f.DISPLAY_KEY],display);frame(false,boot.r);
 store[f.DISPLAY_KEY]=clone(display);boot.r.setPluginEnabled(boot.r.pluginById('crew'),true);assert.deepEqual(store[f.DISPLAY_KEY],display,'Plugin re-enable retains history');
}
// Obsolete generations and expired leases cannot publish even a READY negative.
for(const barrier of ['generation','lease']) {
 const store=clone(savedState),boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v});let complete;
 const before=JSON.stringify(store[f.DISPLAY_KEY]);boot.f.refreshFleets(cx,()=>new Promise(resolve=>complete=resolve),true);await tick();
 if(barrier==='generation')boot.f.invalidateFleet();else store['custom.fleet.reads'].local.until=now;
 complete(JSON.stringify({...status,owner:{...status.owner,live:false}}));await drain();assert.equal(JSON.stringify(store[f.DISPLAY_KEY]),before,`${barrier}: obsolete absence cannot erase history`);
}
for(const restart of ['cold','hot','layout']){
 const store=clone(savedState);if(restart==='cold')delete store[f.FLEET_KEY];
 if(restart==='layout')store['custom.fleet.reads']={local:{token:store[f.FLEET_KEY].entries.local.token,until:now+20000}};
 const writes=[];const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>{writes.push(k);store[k]=v;}},restart==='layout'?'custom-spaces':'custom-settings');
 frame(true,boot.r);assert.equal(writes.length,0,'First-frame restoration performs no state writes or IO');
 assert.equal(boot.r.pluginWorkspaceLinks().length,0,'Even fresh persisted raw status/tokens cannot authorize a new runtime');
 assert.equal(boot.r.pluginPullContext('coordinator'),null);assert.equal(boot.r.pluginPullContext('coordinator',{presentation:true}).stale,true);
 mode='defer';const before=requests;boot.r.pluginEvent('spaces.refresh',{cx});await tick();assert.equal(requests,before+1,'Cold start verifies in the background, including completed crash leases');frame(true,boot.r);
 release();await drain();assert.equal(boot.r.pluginWorkspaceLinks().length,1);frame(true,boot.r);
 now+=86400000;mode='error';boot.r.pluginEvent('spaces.refresh',{cx});await drain();frame(true,boot.r);assert.equal(boot.r.pluginPullContext('coordinator'),null);
 const memory=clone(store[f.DISPLAY_KEY]);boot.p.updateSpacePreferences({connectFleetToCoordinator:false});frame(false,boot.r);assert.deepEqual(store[f.DISPLAY_KEY],memory,'Off hides but preserves identity');
 boot.p.updateSpacePreferences({connectFleetToCoordinator:true});frame(true,boot.r);assert.equal(boot.r.pluginPullContext('coordinator'),null,'Immediate restore grants no inventory authority');
}
// Partial startup documents must not prune identity before the pair's first frame.
{
 const store=clone(savedState);let ready=false;
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v,spaces:()=>ready?groups:[groups[2]],machines:()=>[{name:null,layout:ready?'ready':'loading'}]});
 mode='success';boot.r.pluginEvent('spaces.refresh',{cx});await drain();assert.equal(Object.keys(store[f.DISPLAY_KEY].entries).length,1);
 ready=true;frame(true,boot.r);assert.equal(boot.r.pluginWorkspaceLinks().length,0,'Loading documents never grant action authority');
}
// A local verification must not erase another machine's pair while its layout loads.
{
 const store=clone(savedState), sourceRecord=Object.values(store[f.DISPLAY_KEY].entries)[0];
 store[f.DISPLAY_KEY].entries[JSON.stringify('pc2')]={...sourceRecord,machine:'pc2',parent:'pc2/coordinator',child:'pc2/fm-crew-remote',owner:'pc2/t1',ownerTab:'pc2/c',ownerPane:'pc2/cp',adoption:'remote'};
 const remoteGroups=[{id:'pc2/coordinator',machine:'pc2',tabs:[{id:'pc2/c'}]},{id:'pc2/fm-crew-remote',machine:'pc2',tabs:[{id:'pc2/w'}]}];
 let visible=false,ready=false;
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v,spaces:()=>visible?[...groups,...remoteGroups]:groups,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:ready?'ready':'loading'}]});
 mode='success';boot.r.pluginEvent('spaces.refresh',{cx,force:true});await drain();assert.equal(Object.keys(store[f.DISPLAY_KEY].entries).length,2,'Local publication preserves the loading remote identity');
 visible=true;ready=true;const both=projectLinkedRows([...groups,...remoteGroups].map(w=>({w})),links(boot.r));
 assert.equal(both.find(row=>row.w.id==='pc2/fm-crew-remote').linked,true,'Remote first frame restores its own qualified pair');assert.equal(boot.r.pluginWorkspaceLinks().length,1,'Persisted remote identity grants no cross-machine authority');
 visible=false;boot.r.pluginEvent('spaces.refresh',{cx,force:true});await drain();assert.equal(Object.keys(store[f.DISPLAY_KEY].entries).length,1,'Ready native absence prunes just that machine');
}
// Ready-layout absence prunes memory even with attachment and/or Crew off.
// An uncertain layout preserves it; a later deterministic ID reuse is not proof.
for(const crewEnabled of [true,false])for(const missing of ['parent','child']){
 const store=clone(savedState),record=store[f.DISPLAY_KEY].entries.null;
 let ready=false,visible=true,recreated=false;
 const present=()=>visible?groups.map(s=>recreated && s.id===record[missing]?{...s,tabs:[]}:s):groups.filter(s=>s.id!==record[missing]);
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v,spaces:present,machines:()=>[{name:null,layout:ready?'ready':'loading'}]});
 boot.p.updateSpacePreferences({connectFleetToCoordinator:false});
 boot.r.setPluginEnabled(boot.r.pluginById('crew'),crewEnabled);
 const before=requests;
 boot.r.pluginEvent('spaces.refresh',{cx});await drain();assert.ok(store[f.DISPLAY_KEY].entries.null,'Off preserves extant spaces');
 visible=false;boot.r.pluginEvent('spaces.refresh',{cx});await drain();assert.ok(store[f.DISPLAY_KEY].entries.null,'Uncertain absence preserves memory');
 ready=true;boot.r.pluginEvent('spaces.refresh',{cx});await drain();assert.equal(store[f.DISPLAY_KEY].entries.null,undefined,'Off-state ready absence must prune identity');
 assert.equal(requests,before,'Disabled cleanup performs no status IO');
 visible=true;recreated=true;boot.r.setPluginEnabled(boot.r.pluginById('crew'),true);
 boot.p.updateSpacePreferences({connectFleetToCoordinator:true});
 assert.equal(links(boot.r).length,0,'Recreated deterministic space cannot inherit an obsolete pair before verification');
 mode='defer';boot.r.pluginEvent('spaces.refresh',{cx});await tick();assert.equal(links(boot.r).length,0);
 release();await drain();assert.equal(links(boot.r).length,0,'Empty recreated space cannot reattach from an incomplete reply');
 recreated=false;mode='success';boot.r.pluginEvent('spaces.refresh',{cx,force:true});await drain();frame(true,boot.r);
}
// Corrupt/unknown records never manufacture a pair from names or role hints.
for(const invalid of [{version:999,entries:savedState[f.DISPLAY_KEY].entries},{version:1,entries:{bad:{...Object.values(savedState[f.DISPLAY_KEY].entries)[0],adoption:'wrong'}}},{version:1,entries:[]}]){
 const store={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true},[f.DISPLAY_KEY]:invalid};
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v});frame(false,boot.r);assert.equal(boot.r.pluginPullContext('coordinator'),null);
}
// Disable/obsolete generations and expired leases cannot revive a previous verified pair.
await prime();mode='defer';event('workspace.context.refresh',true);await tick();p.updateSpacePreferences({connectFleetToCoordinator:false});frame(false);release();await drain();frame(false);
p.updateSpacePreferences({connectFleetToCoordinator:true});frame(true);await prime();const memory=clone(state[f.DISPLAY_KEY]);r.setPluginEnabled(r.pluginById('crew'),false);frame(false);assert.deepEqual(clone(state[f.DISPLAY_KEY]),memory);r.setPluginEnabled(r.pluginById('crew'),true);frame(true);
mode='error';event('workspace.context.refresh',true);await drain();frame(true);const failedFirst=requests;event();await drain();assert.equal(requests,failedFirst);
mode='defer';event('workspace.context.refresh',true);await tick();frame(true);state['custom.fleet.reads'].local.until=now;release();await drain();frame(true);
console.log('PASS single guarded display writer, ready-only absence/replacement, completion-time layout checks, finished-fleet cold/hot/layout restoration, every deletion path, strict runtime authority, long outages and retry backoff');
