import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const clone=value=>JSON.parse(JSON.stringify(value));
for(const machine of [null,'pc2'])for(const kinds of [['legacy','v1'],['v1','legacy'],['legacy','legacy'],['v1','v1']]) {
 const q=id=>machine?`${machine}/${id}`:id,child='fm-crew-home';
 const groups=[{id:q('owner'),machine,tabs:[{id:q('owner-tab')}]},{id:q(child),machine,name:'crew',tabs:[{id:q('tab0')},{id:q('tab1')}]}];
 const all=[{terminal:q('t0'),tab:q('owner-tab'),pane:q('owner-pane')},...kinds.map((_,i)=>({terminal:q(`t${i+1}`),tab:q(`tab${i}`),pane:q(`pane${i}`)}))];
 const list=[{address:q('t0'),state:'live',labels:{'custom.crew.home':'1'}},...kinds.map((kind,i)=>({address:q(`t${i+1}`),state:'live',labels:{'crew.home':'home','crew.task':`task${i}`,'herdr.space':child,...(kind==='v1'?{'crew.space.version':'1','crew.space.mode':'combined','crew.space.project':i?'crew':'herdr-app'}:{})}}))];
 // This is Crew's actual advertised fleet-view shape: no project on any task.
 const status={home:'C:/fixture/.crew',owner:{terminal:'t0',live:true},tasks:[...kinds.map((_,i)=>({id:`task${i}`,terminal:`t${i+1}`,state:'working',pr:`https://github.com/fixture/repo/pull/${i+1}`})),{id:'history',terminal:null,state:'closed',pr:'https://github.com/fixture/repo/pull/3'}]};
 const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
 const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:machine,layout:'ready'}],checking:()=>false};
 const {f,r}=await loadMod({host,modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'export * as f from "./plugins/crew/fleet.js";export * as r from "./plugins.js";'});
 const snapshot=()=>({groups,all,list}),normalize=value=>f.recordedSource(JSON.stringify(value));
 const bound=f.bindFleet(normalize(status),machine,snapshot());
 assert.ok(bound,`${machine??'local'} ${kinds}: reduced fleet view must bind one combined child`);
 assert.equal(bound.child,q(child));assert.equal(bound.tasks.length,3);assert.equal(f.fleetChildren(bound).length,1);
 const jobs=[],cx={spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));},notify(){}};
 f.refreshFleets(cx,async()=>JSON.stringify(status),true);while(jobs.length)await Promise.all(jobs.splice(0));
 assert.equal(r.pluginWorkspaceLinks({presentation:true}).length,1);assert.equal(r.pluginWorkspaceLinks().length,1);
 assert.equal(r.pluginPullContext(q('owner')).links.length,3);assert.equal(r.pluginPullContext(q('owner')).links.filter(l=>l.historical).length,1);
 groups[1].name='xrbuild';assert.equal(f.bindFleet(normalize(status),machine,snapshot()).binding,bound.binding,'Directory-derived title is not identity');
 const full={...status,tasks:status.tasks.map((t,i)=>({...t,project:i===1?'crew':'herdr-app'}))};
 assert.ok(f.bindFleet(normalize(full),machine,snapshot()),'Full --all payload remains compatible');
 for(const invalid of [null,0,false,{},[],'','bad\u0000project']) {
  const bad=clone(status);bad.tasks[0].project=invalid;
  assert.throws(()=>normalize(bad),/Invalid Crew status/,'Present malformed project cannot become absent evidence');
 }
 const v1=list.findIndex(t=>t.labels?.['crew.space.version']);
 if(v1<0)continue;
 const before=clone(list[v1]),taskIndex=v1-1;
 for(const [key,value] of [['crew.space.version','2'],['crew.space.version',undefined],['crew.space.mode','unknown'],['crew.space.name','crew'],['crew.space.project',''],['crew.home','foreign'],['crew.task','foreign'],['herdr.space','other']]) {
  list[v1]=clone(before);list[v1].labels[key]=value;
  assert.equal(f.bindFleet(normalize(status),machine,snapshot()),null,`${key}=${value} must refuse`);
 }
 list[v1]=clone(before);const contradictory=clone(full);contradictory.tasks[taskIndex].project='foreign';
 assert.equal(f.bindFleet(normalize(contradictory),machine,snapshot()),null,'Supplied task project still verifies the label');
 // Per-project labels cannot borrow the combined-only missing-project allowance.
 list[v1].labels['crew.space.mode']='per-project';list[v1].labels['crew.space.name']=before.labels['crew.space.project'];
 assert.equal(f.bindFleet(normalize(status),machine,snapshot()),null,'Per-project placement needs authoritative task project');
 list[v1]=clone(before);all.push({...all[v1],pane:q('duplicate')});
 assert.notEqual(f.bindFleet(normalize(status),machine,snapshot())?.tasks.length,3,'Duplicate native membership cannot attest the task');all.pop();
 list[v1].address='foreign/t9';assert.notEqual(f.bindFleet(normalize(status),machine,snapshot())?.tasks.length,3,'Cross-machine member cannot attest the task');
 list[v1]=before;
}
console.log('PASS minimal combined fleet status: legacy/v1/mixed orders, local/remote, live/history links, titles and strict contradictory identity refusals');
