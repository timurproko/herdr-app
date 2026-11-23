// Real packaged provider/registry + Spaces projection; fresh VMs exercise durable startup.
import assert from 'node:assert/strict';
import {loadMod} from '../../../tools/plugin-harness.mjs';
import {projectLinkedRows, captureSpaceBlock, planBlockDrop, SpaceBlockCommit} from '../../shared/workspace-links.js';
let now=100000, mode='success', release, requests=0;
const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'w'}]},{id:'other',tabs:[]}];
let all=[{tab:'c',pane:'cp',terminal:'t1'},{tab:'w',pane:'wp',terminal:'t2'}];
const list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},{address:'t2',state:'live',labels:{'crew.task':'task','crew.home':'home','herdr.space':'fm-crew-home'}}];
const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'task',terminal:'t2',state:'working',pr:'https://github.com/example/repo/pull/1'}]};
const tasks=[],cx={spawn:fn=>tasks.push(Promise.resolve().then(()=>fn(cx))),notify(){}};
const drain=async()=>{while(tasks.length)await Promise.all(tasks.splice(0));};
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const clone=value=>JSON.parse(JSON.stringify(value));
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[],checking:()=>false,notify(){},
 hc:async args=>{
  assert.match(args.at(-1),/status '--all' '--json'/);requests++;
  if(mode==='defer')await new Promise(resolve=>release=resolve);
  if(mode==='error')throw Error('temporary transport failure');
  const output=mode==='malformed'?'{bad':JSON.stringify(status);
  return {code:0,stdout:JSON.stringify({code:mode==='timeout'?null:0,timed_out:mode==='timeout',stdout:Buffer.from(output).toString('base64'),stderr:''})};
 }};
const load=(testHost=host,mod='custom-settings')=>loadMod({host:testHost,mod,globals:{Date:class extends Date{static now(){return now;}}},
 modules:{'space-color-state.js':'src/shared/space-color-state.js','space-preferences.js':'src/shared/space-preferences.js'},
 entry:'import * as f from "./plugins/crew/fleet.js";import * as r from "./plugins.js";export {f,r};export * as p from "./space-preferences.js";'});
const {f,r,p}=await load();
const event=(name='spaces.refresh',force=false)=>r.pluginEvent(name,{cx,force});
const links=(registry=r)=>registry.pluginWorkspaceLinks({presentation:true});
const frames=[];
function frame(expected=true,registry=r){
 const rows=projectLinkedRows(groups.map((w,i)=>({w,i})),links(registry)),child=rows.find(row=>row.w.id==='fm-crew-home');
 const attached=child?.linked??false;frames.push(attached);assert.equal(attached,expected);
 if(expected){assert.equal(rows[rows.indexOf(child)-1].w.id,'coordinator');assert.equal(registry.pluginSpaceTags(groups.find(s=>s.id==='fm-crew-home')).length,0);assert.equal(registry.pluginSpaceTags(groups.find(s=>s.id==='coordinator'))[0].label,'Crew');}
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
now+=11000;frame();release();await drain();frame();
// Crossing action expiry retains display, not permission for Git or pair moves.
now+=29000;mode='defer';event('workspace.context.refresh',true);await tick();frame();now+=2000;frame();
assert.equal(r.pluginWorkspaceLinks().length,0);assert.equal(r.pluginPullContext('coordinator'),null);
assert.equal(r.pluginPullContext('coordinator',{presentation:true}).stale,true);
const captured=captureSpaceBlock(groups,links(),'fm-crew-home');assert.equal(captured.sources.length,2);
assert.equal(planBlockDrop(groups,r.pluginWorkspaceLinks(),'fm-crew-home','other',captured),null);
const moves=[];new SpaceBlockCommit({read:()=>groups,links:()=>r.pluginWorkspaceLinks(),move:(...args)=>moves.push(args),fail(){}}).start('fm-crew-home',captured,groups.map(s=>s.id));assert.equal(moves.length,0);
release();await drain();frame();assert.equal(r.pluginWorkspaceLinks().length,1);
// Failed/malformed/timed-out reads never expire display, refresh age, or spin retries.
const successAt=state[f.FLEET_KEY].entries.local.at;
for(const failure of ['error','malformed','timeout']){
 now+=10001;mode=failure;event();await drain();frame();assert.equal(state[f.FLEET_KEY].entries.local.at,successAt);
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
status.tasks=[];event('workspace.context.refresh',true);await drain();frame(false);status.tasks=[{id:'task',terminal:'t2',state:'working',pr:null}];frame(false);await prime();
mode='defer';event('workspace.context.refresh',true);await tick();frame();status.owner.live=false;release();await drain();frame(false);await prime();
const removed=groups.splice(1,1)[0];assert.equal(links().length,0);event('spaces.refresh',true);await drain();assert.equal(Object.keys(state[f.DISPLAY_KEY].entries).length,0,'Confirmed native absence prunes durable identity');groups.splice(1,0,removed);frame(false);await prime();
// True cold restarts, hot reload and layout copies have only persisted identity in first frame.
const savedState=clone(state);
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
 boot.p.updateSpacePreferences({connectFleetToCoordinator:false});frame(false,boot.r);assert.equal(store[f.DISPLAY_KEY],null,'Explicit preference disable clears persistence');
 boot.p.updateSpacePreferences({connectFleetToCoordinator:true});frame(false,boot.r);
}
// Corrupt/unknown records never manufacture a pair from names or role hints.
for(const invalid of [{version:999,entries:savedState[f.DISPLAY_KEY].entries},{version:1,entries:{bad:{...Object.values(savedState[f.DISPLAY_KEY].entries)[0],adoption:'wrong'}}},{version:1,entries:[]}]){
 const store={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true},[f.DISPLAY_KEY]:invalid};
 const boot=await load({...host,shared:k=>store[k],setShared:(k,v)=>store[k]=v});frame(false,boot.r);assert.equal(boot.r.pluginPullContext('coordinator'),null);
}
// Disable/obsolete generations and expired leases cannot revive a previous verified pair.
await prime();mode='defer';event('workspace.context.refresh',true);await tick();p.updateSpacePreferences({connectFleetToCoordinator:false});frame(false);release();await drain();frame(false);
p.updateSpacePreferences({connectFleetToCoordinator:true});await prime();r.setPluginEnabled(r.pluginById('crew'),false);frame(false);assert.equal(state[f.DISPLAY_KEY],null);r.setPluginEnabled(r.pluginById('crew'),true);frame(false);
mode='error';event('workspace.context.refresh',true);await drain();frame(false);const failedFirst=requests;event();await drain();assert.equal(requests,failedFirst);
mode='defer';event('workspace.context.refresh',true);await tick();frame(false);state['custom.fleet.reads'].local.until=now;release();await drain();frame(false);
console.log('PASS identity-lifetime fleet projection/tags, pair-only dependencies, persistent first-frame cold/hot/layout restoration, strict runtime action verification, long outages, retry backoff and authoritative invalidation');
