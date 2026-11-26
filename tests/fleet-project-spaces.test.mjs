import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
let groups=[],all=[],list=[];
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],checking:()=>false};
const {f,r,links}=await loadMod({host,entry:'import * as f from "./plugins/crew/fleet.js";import * as r from "./plugins.js";import * as links from "./workspace-links.js";export {f,r,links};',modules:{'workspace-links.js':'src/shared/workspace-links.js','space-color-state.js':'src/shared/space-color-state.js'}});
const model=()=>({groups,all,list}),copy=v=>JSON.parse(JSON.stringify(v));
for(const machine of [null,'pc2'])for(const modes of [['combined'],['herdr-app','crew'],['combined','herdr-app','crew'],['.dot','self']]) {
 const q=s=>machine?`${machine}/${s}`:s;
 groups=[{id:q('owner'),machine,tabs:[{id:q('owner-tab')}]}];all=[{tab:q('owner-tab'),pane:q('owner-pane'),terminal:q('t0')}];list=[{address:q('t0'),state:'live',labels:{'custom.crew.home':'1'}}];
 const tasks=modes.map((mode,i)=>{
  const suffix=mode==='combined'?'':mode==='self'?'-self':`-project-${mode}`,id=`fm-crew-home${suffix}`,terminal=q(`t${i+1}`),tab=q(`tab${i}`),project=mode==='self'?'crew:self':mode;
  groups.push({id:q(id),machine,named:false,name:'worktree',tabs:[{id:tab}]});all.push({tab,pane:q(`pane${i}`),terminal});
  list.push({address:terminal,state:'live',labels:{'crew.home':'home','crew.task':`ship${i}`,'herdr.space':id,...(mode==='combined'?{}:{'crew.space.version':'1','crew.space.mode':'per-project','crew.space.project':project,'crew.space.name':mode==='self'?'crew':mode})}});
  return {id:`ship${i}`,state:'working',terminal:`t${i+1}`,project,pr:`https://github.com/fixture/repo/pull/${i+1}`};
 });
 const status={home:'/fixture/home',owner:{terminal:'t0',live:true},tasks},bound=f.bindFleet(status,machine,model());assert.ok(bound);
 assert.equal(f.fleetChildren(bound).length,modes.length);assert.equal(bound.tasks.length,modes.length);
 const onlyOwner=f.bindFleet({...status,tasks:[]},machine,model());assert.equal(bound.pullScope,onlyOwner.pullScope,'Project cardinality is not Git home scope');
 const projected=links.projectLinkedRows(groups.map((w,i)=>({w,i})),f.fleetLinks(bound));
 assert.equal(projected.length,modes.length+1);assert.ok(projected.slice(1).every(row=>row.linked));
 for(let i=0;i<modes.length;i++)assert.equal(projected[i+1].w.name,modes[i]==='combined'?'worktree':modes[i]==='self'?'crew':modes[i]);
 const renamed=copy(groups);renamed[1].named=true;renamed[1].name='My name';assert.equal(links.projectLinkedRows(renamed.map((w,i)=>({w,i})),f.fleetLinks(bound))[1].w.name,'My name');
 // Real verification, durable presentation and registry links, not bind-only proof.
 const jobs=[],cx={spawn(fn){const job=Promise.resolve().then(()=>fn(cx));jobs.push(job);return {is_done:()=>false};},notify(){}};
 f.invalidateFleet();f.refreshFleets(cx,async()=>JSON.stringify(status),true);await Promise.all(jobs.splice(0));
 assert.equal(r.pluginWorkspaceLinks({presentation:true}).length,modes.length);assert.equal(r.pluginWorkspaceLinks().length,modes.length);
 assert.equal(r.pluginPullContext(q('owner')).links.length,modes.length);
 for(const link of r.pluginWorkspaceLinks({presentation:true}))assert.equal(f.fleetColorAllowed(link),true);
 const before=copy(list);
 for(const mutate of [t=>t.labels['crew.home']='other',t=>t.labels['crew.task']='wrong',t=>t.labels['herdr.space']='wrong',t=>t.address='other/t1',...(modes[0]==='combined'?[]:[t=>t.labels['crew.space.version']='2',t=>t.labels['crew.space.project']='wrong',t=>t.labels['crew.space.name']='wrong'])]) {
  list=copy(before);mutate(list[1]);assert.equal(f.bindFleet(status,machine,model())?.tasks.length===tasks.length,false,'Contradictory membership cannot attest all tasks');
 }
 list=before;const saved=copy(all);all.push({...all[1],pane:'duplicate'});assert.equal(f.bindFleet(status,machine,model())?.tasks.length===tasks.length,false);all=saved;
 const parsed=f.recordedSource(JSON.stringify(status));assert.equal(parsed.tasks[0].project,tasks[0].project,'Transport project survives normalization');
 if(modes[0]!=='combined') {
  f.refreshFleets(cx,async()=>{throw Error('Cached discovery must not reverify');},false,async()=>JSON.stringify({...status,tasks:tasks.map((t,i)=>i?t:{...t,project:'foreign-project'})}));
  await Promise.all(jobs.splice(0));assert.equal(r.pluginPullContext(q('owner')).links.length,modes.length,'Discovery cannot replace a verified project binding or invalidate known facts');
 }
}
console.log('PASS combined/project/mixed placement-v1 exact identities, names, native membership, qualified machines, durable registry links and colour authority');
