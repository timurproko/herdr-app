// Real packaged provider/registry + actual Spaces projection. No native/Core IO.
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
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[],checking:()=>false,notify(){},
 hc:async args=>{
  assert.match(args.at(-1),/status .*'--json'/);requests++;
  if(mode==='defer')await new Promise(resolve=>release=resolve);
  if(mode==='error')throw Error('temporary transport failure');
  const output=mode==='malformed'?'{bad':JSON.stringify(status);
  return {code:0,stdout:JSON.stringify({code:mode==='timeout'?null:0,timed_out:mode==='timeout',stdout:Buffer.from(output).toString('base64'),stderr:''})};
 }};
const {f,r}=await loadMod({host,globals:{Date:class extends Date{static now(){return now;}}},modules:{'space-color-state.js':'src/shared/space-color-state.js'},
 entry:'import * as f from "./plugins/crew/fleet.js";import * as r from "./plugins.js";export {f,r};'});
const event=(name='spaces.refresh',force=false)=>r.pluginEvent(name,{cx,force});
const links=()=>r.pluginWorkspaceLinks({presentation:true});
const frames=[];
function frame(expected=true){
 const rows=projectLinkedRows(groups.map((w,i)=>({w,i})),links()),child=rows.find(row=>row.w.id==='fm-crew-home');
 const attached=child?.linked??false;frames.push(attached);assert.equal(attached,expected);
 if(expected){assert.equal(rows[rows.indexOf(child)-1].w.id,'coordinator');assert.equal(r.pluginSpaceTags(groups[1]).length,0);assert.equal(r.pluginSpaceTags(groups[0])[0].label,'Crew');}
 return rows;
}
const prime=async()=>{mode='success';status.owner.live=true;status.tasks[0]={id:'task',terminal:'t2',state:'working',pr:'https://github.com/example/repo/pull/1'};event('spaces.refresh',true);await drain();frame();};
await prime();
// Manual Git + periodic Spaces refresh coalesce; unrelated pane/focus changes cannot detach.
mode='defer';event('workspace.context.refresh',true);await tick();const pendingEntry=JSON.stringify(state[f.FLEET_KEY]),pendingRequests=requests;
frame();all.push({tab:'c',pane:'unrelated',terminal:'t9'});groups[0].active=false;groups[1].active=true;
assert.equal(r.pluginWorkspaceLinks().length,1,'An unrelated pane does not invalidate the exact actionable pair');
frame();event();event('workspace.context.refresh');await tick();assert.equal(requests,pendingRequests);assert.equal(JSON.stringify(state[f.FLEET_KEY]),pendingEntry,'Starting/coalescing reads never republishes an unknown binding');
now+=11000;frame();release();await drain();frame();assert.ok(frames.every(Boolean),'Every sampled successful refresh frame stays attached');
// Crossing the old hard expiry retains display, not authority, until the current read completes.
now+=29000;mode='defer';event('workspace.context.refresh',true);await tick();frame();now+=2000;frame();
assert.equal(r.pluginWorkspaceLinks().length,0);assert.equal(r.pluginPullContext('coordinator'),null,'Display retention cannot authorize new Git work');
const captured=captureSpaceBlock(groups,links(),'fm-crew-home');assert.equal(captured.sources.length,2);
assert.equal(planBlockDrop(groups,r.pluginWorkspaceLinks(),'fm-crew-home','other',captured),null);
const moves=[];new SpaceBlockCommit({read:()=>groups,links:()=>r.pluginWorkspaceLinks(),move:(...args)=>moves.push(args),fail(){}}).start('fm-crew-home',captured,groups.map(s=>s.id));assert.equal(moves.length,0,'Retained block cannot authorize queued moves');
release();await drain();frame();assert.equal(r.pluginWorkspaceLinks().length,1);
// Transport errors, malformed JSON and timeouts preserve success age and back off retries.
const successAt=state[f.FLEET_KEY].entries.local.at;
for(const failure of ['error','malformed','timeout']){
 now+=10001;mode=failure;event();await drain();frame();assert.equal(state[f.FLEET_KEY].entries.local.at,successAt);
 const before=requests;for(let i=0;i<5;i++)event();await drain();assert.equal(requests,before,'A failed read does not create a render-triggered retry loop');
}
now=successAt+59999;frame();now++;frame(false);assert.equal(r.pluginPullContext('coordinator'),null,'Failure age is hard-bounded and never renewed');
// Completed negative results detach immediately and cannot revive through later partial joins.
await prime();status.tasks=[];event('workspace.context.refresh',true);await drain();frame(false);
status.tasks=[{id:'task',terminal:'t2',state:'working',pr:null}];frame(false);await prime();
mode='defer';event('workspace.context.refresh',true);await tick();frame();status.owner.live=false;release();await drain();frame(false);
await prime();const savedAll=all,partialAt=state[f.FLEET_KEY].entries.local.at;all=[];frame();assert.equal(r.pluginWorkspaceLinks().length,0,'Partial terminal snapshots retain only the display');
event('workspace.context.refresh',true);await drain();frame();assert.equal(state[f.FLEET_KEY].entries.local.at,partialAt,'A valid reply joined to an incomplete native frame is not a fresh negative verification');all=savedAll;
const removed=groups.splice(1,1)[0];assert.equal(links().length,0,'A removed native fleet never becomes a ghost row');groups.splice(1,0,removed);
// Disable/expired leases and obsolete generations cannot publish stale success.
mode='defer';event('workspace.context.refresh',true);await tick();state['custom.spaces.preferences'].connectFleetToCoordinator=false;frame(false);release();await drain();frame(false);
state['custom.spaces.preferences'].connectFleetToCoordinator=true;await prime();mode='defer';event('workspace.context.refresh',true);await tick();f.invalidateFleet();frame(false);release();await drain();frame(false);
mode='error';event('workspace.context.refresh',true);await drain();frame(false);const failedFirst=requests;event();await drain();assert.equal(requests,failedFirst,'Failed first use also backs off');
mode='defer';event('workspace.context.refresh',true);await tick();frame(false);state['custom.fleet.reads'].local.until=now;release();await drain();frame(false);
console.log('PASS fleet refresh projection/tag continuity, deferred Git/Spaces reads, focus/topology changes, 60-second display bound, independent action expiry, error backoff, removals and obsolete results');
