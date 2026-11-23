import assert from 'node:assert/strict';
import {loadMod} from '../../../tools/plugin-harness.mjs';
const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
let groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home1',tabs:[{id:'w'}]}];
let all=[{tab:'c',pane:'cp',terminal:'t1'},{tab:'w',pane:'wp',terminal:'t2'}];
let list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},{address:'t2',state:'live',labels:{'crew.task':'ship','crew.home':'home1','herdr.space':'fm-crew-home1'}}];
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],checking:()=>false,notify(){}};
const {f,r}=await loadMod({host,modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'import * as f from "./plugins/crew/fleet.js";import * as r from "./plugins.js";export {f,r};'});
const status={home:'C:/home/.crew',owner:{terminal:'t1',live:true,mine:false},tasks:[{id:'ship',terminal:'t2',state:'reported',pr:'https://github.com/example/a/pull/12',report:'MUST NOT SHARE'}]};
const model=()=>({groups,all,list}), copy=v=>JSON.parse(JSON.stringify(v));
assert.equal(f.bindFleet(status,null,model()).child,'fm-crew-home1');
for(const taskState of ['working','reported','stopped','failed','closed']) {
 const result=f.bindFleet({...status,tasks:[{...status.tasks[0],state:taskState}]},null,model());
 assert.equal(result.tasks.length,['working','reported','closed'].includes(taskState)?1:0);
 if(taskState==='closed'){assert.equal(result.tasks[0].historical,true);assert.equal(result.tasks[0].terminal,null);assert.equal(result.child,null,'History cannot establish a fleet child');}
 assert.equal(result.incomplete,taskState==='working');
}
assert.equal(f.bindFleet({...status,owner:{terminal:'t9',live:true}},null,model()),null);
list[1].labels['crew.task']='wrong';assert.equal(f.bindFleet(status,null,model()),null);list[1].labels['crew.task']='ship';
const historical={...status,tasks:[...status.tasks,{id:'finished',state:'closed',terminal:'no-longer-live',pr:'https://github.com/example/history/pull/5'},{id:'scout',state:'closed',pr:null},{id:'failed',state:'failed',pr:'https://github.com/example/history/pull/99'}]};
const joinedHistory=f.bindFleet(historical,null,model());assert.equal(joinedHistory.tasks.length,2);assert.equal(joinedHistory.tasks[1].terminal,null);assert.equal(joinedHistory.child,'fm-crew-home1');
const closedOnly=f.bindFleet({...historical,tasks:historical.tasks.filter(t=>t.state==='closed')},null,model());assert.equal(closedOnly.child,null);assert.equal(closedOnly.tasks.length,1);assert.equal(closedOnly.pullScope,joinedHistory.pullScope,'Last-worker exit preserves the coordinator/home PR scope');
assert.equal(f.bindFleet({...historical,home:'C:/foreign-home',owner:{terminal:'foreign-owner',live:true}},null,model()),null);
assert.equal(f.bindFleet({...historical,owner:{terminal:'pc2/t1',live:true}},null,model()),null,'Another machine cannot authorize same-home history');
assert.throws(()=>f.recordedSource(' '.repeat(1048577)));assert.throws(()=>f.recordedSource(JSON.stringify({home:'x',tasks:Array(4097).fill({})})));
const before=copy(groups);groups[1].id='ordinary';assert.equal(f.bindFleet(status,null,model()),null);groups=before;
const tasks=[];const cx={spawn(fn){tasks.push(Promise.resolve().then(()=>fn(cx)));},notify(){}};let calls=0;
const read=async()=>{calls++;return JSON.stringify(status);};
f.refreshFleets(cx,read);f.refreshFleets(cx,read);await Promise.all(tasks.splice(0));assert.equal(calls,1);
assert.ok(!JSON.stringify(state[f.FLEET_KEY]).includes('MUST NOT SHARE'));assert.equal(r.pluginWorkspaceLinks().length,1);assert.equal(r.pluginPullContext('coordinator').links.length,1);assert.equal(r.pluginPullContext('fm-crew-home1'),null);
groups.reverse();all.reverse();list.reverse();assert.equal(f.fleetContexts().length,1,'Native ordering does not change identity or abort block acknowledgements');groups.reverse();all.reverse();list.reverse();
const tags=space=>Array.from(r.pluginSpaceTags(space),tag=>[tag.label,tag.tooltip]);
assert.deepEqual(tags(groups[0]),[['Crew','Crew coordinator']],'The attached coordinator keeps its role tag');
assert.deepEqual(tags(groups[1]),[],'Only the attached fleet omits Crew');
assert.deepEqual(tags({id:'unrelated-worker',tabs:[{id:'w'}]}),[['Crew','Crew worker']],'A worker outside the bound child keeps its tag');
const savedState=JSON.stringify(state),savedCalls=calls;
for(let i=0;i<3;i++){tags(groups[0]);tags(groups[1]);}
assert.equal(JSON.stringify(state),savedState);assert.equal(calls,savedCalls,'Reading tags starts no discovery');
all[1].terminal='replacement';assert.equal(f.fleetContexts().length,0);assert.deepEqual(tags(groups[0]),[['Crew','Crew coordinator']]);all[1].terminal='t2';
state[f.FLEET_KEY].entries.local.at-=61000;assert.equal(f.fleetContexts().length,0);assert.deepEqual(tags(groups[1]),[],'Expired action freshness never detaches the persisted display');
state['custom.spaces.preferences'].connectFleetToCoordinator=false;f.refreshFleets(cx,read);assert.equal(calls,1);assert.equal(r.pluginWorkspaceLinks().length,0);
assert.deepEqual(tags(groups[0]),[['Crew','Crew coordinator']]);assert.deepEqual(tags(groups[1]),[['Crew','Crew worker']]);
state['custom.spaces.preferences'].connectFleetToCoordinator=true;f.invalidateFleet();
let release;f.refreshFleets(cx,()=>new Promise(r=>release=r));await Promise.resolve();await Promise.resolve();f.invalidateFleet();release(JSON.stringify(status));await Promise.all(tasks.splice(0));assert.equal(f.fleetContexts().length,0,'Disable generations reject obsolete responses');
f.refreshFleets(cx,()=>new Promise(r=>release=r));await Promise.resolve();await Promise.resolve();state['custom.fleet.reads'].local.until=0;release(JSON.stringify(status));await Promise.all(tasks.splice(0));assert.equal(f.fleetContexts().length,0,'Expired read leases cannot publish a late snapshot');
// Same local IDs on a remote Core are qualified once and never borrow local members.
groups=groups.map(s=>({...s,id:'pc2/'+s.id,machine:'pc2',tabs:s.tabs.map(t=>({id:'pc2/'+t.id}))}));all=all.map(p=>({...p,tab:'pc2/'+p.tab,terminal:'pc2/'+p.terminal}));list=list.map(t=>({...t,address:'pc2/'+t.address}));
assert.equal(f.bindFleet(status,'pc2',model()).parent,'pc2/coordinator');assert.equal(f.bindFleet({...status,owner:{terminal:'other/t1',live:true}},'pc2',model()),null);
list[1].state='finished';assert.equal(f.bindFleet(status,'pc2',model()).tasks.length,0);
assert.throws(()=>f.recordedSource('{bad'));assert.throws(()=>f.recordedSource(JSON.stringify({home:'x',tasks:{}})));
assert.ok(!JSON.stringify(f.recordedSource(JSON.stringify(status))).includes('MUST NOT SHARE'));
const declaration=r.pluginById('crew'),workspace=declaration.workspaceLinks,pulls=declaration.pullContext;
declaration.workspaceLinks=()=>{throw Error('fixture provider failure');};declaration.pullContext=()=>{throw Error('fixture provider failure');};assert.equal(r.pluginWorkspaceLinks().length,0);assert.equal(r.pluginPullContext('coordinator'),null);declaration.workspaceLinks=workspace;declaration.pullContext=pulls;
r.setPluginEnabled(declaration,false);assert.equal(r.pluginWorkspaceLinks().length,0);assert.equal(r.pluginPullContext('coordinator'),null);
assert.deepEqual(tags(groups[0]),[]);assert.deepEqual(tags(groups[1]),[],'Disabled Crew contributes no tags');
console.log('PASS Crew fleet exact identities, registry seam, source filtering, read coalescing, expiry, generations and remote qualification');
