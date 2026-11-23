import assert from 'node:assert/strict';
import {loadMod} from '../../../tools/plugin-harness.mjs';

const copy=value=>JSON.parse(JSON.stringify(value));
const url='https://github.com/Example/Ship.repo/pull/12';
const known=(source='github')=>({status:'known',url,source,reason:null});
const none=()=>({status:'none',url:null,source:null,reason:null});
const unavailable=(reason='budget-exhausted')=>({status:'unavailable',url:null,source:null,reason});
const results={known:known(),none:none(),unavailable:unavailable()};
let groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home1',tabs:Object.keys(results).map(id=>({id:`w-${id}`}))}];
let all=[{tab:'c',pane:'cp',terminal:'owner'},...Object.keys(results).map(id=>({tab:`w-${id}`,pane:`p-${id}`,terminal:`t-${id}`}))];
let list=[{address:'owner',state:'live',labels:{'custom.crew.home':'1'}},...Object.keys(results).map(id=>({address:`t-${id}`,state:'live',labels:{'crew.task':id,'crew.home':'home1','herdr.space':'fm-crew-home1'}}))];
const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],checking:()=>false};
const {f,r}=await loadMod({host,modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'import * as f from "./plugins/crew/fleet.js";import * as r from "./plugins.js";export {f,r};'});
const raw={home:'C:/home/.crew',owner:{terminal:'owner',live:true,mine:false,report:'PRIVATE'},prDiscovery:{version:1,report:'PRIVATE'},tasks:[
  ...Object.entries(results).map(([id,result])=>({id,state:'working',terminal:`t-${id}`,pr:null,prDiscovery:{...result,report:'PRIVATE'},report:'PRIVATE',branch:'PRIVATE'})),
  ...Object.entries(results).map(([id,result])=>({id:`closed-${id}`,state:'closed',terminal:null,pr:null,prDiscovery:result})),
]};
const source=value=>f.recordedSource(JSON.stringify(value));
const model=()=>({groups,all,list});
const sanitized=source(raw);
assert.equal(sanitized.tasks[0].pr,url,'Working worker with no report gets its discovered PR');
assert.equal(sanitized.tasks[1].pr,null);assert.equal(sanitized.tasks[2].pr,null);
assert.ok(!JSON.stringify(sanitized).includes('PRIVATE'),'Only allowlisted discovery and identity facts leave the source');
assert.equal(sanitized.owner.mine,undefined);
for(const sourceName of ['github','recorded']) {
  const value=copy(raw);value.tasks[0].prDiscovery=known(sourceName);
  assert.equal(source(value).tasks[0].discovery.source,sourceName);
}

// Missing or unknown discovery capability reuses today's recorded links. Never
// mistake unsupported metadata (including malformed version types) for none.
for(const version of [undefined,{},null,[],{version:2},{version:0},{version:'1'}]) {
  const legacy=copy(raw);legacy.prDiscovery=version;legacy.tasks[0].pr=url;
  legacy.tasks[0].prDiscovery={status:'malformed-new-contract'};
  const value=source(legacy);
  assert.equal(value.tasks[0].pr,url);assert.equal(value.discovery,undefined);assert.equal(value.tasks[0].discovery,undefined);
  const bound=f.bindFleet(value,null,model());
  assert.equal(bound.discovery,undefined);assert.equal(bound.incomplete,true,'Legacy working tasks remain internally uncertain');
  assert.equal(bound.tasks.length,3,'No-link legacy closed records do not add history');
}
const rejectResult=result=>{const value=copy(raw);value.tasks[0].prDiscovery=result;assert.throws(()=>source(value),/Invalid Crew PR discovery/);};
for(const field of ['status','url','source','reason']) {
  for(const result of [known(),none(),unavailable()]) {delete result[field];rejectResult(result);}
}
for(const value of [undefined,null,[],{},false,'known',42,
  {...known(),status:'other'},{...known(),source:'branch'},{...known(),reason:'timeout'},
  {...none(),url},{...none(),source:'github'},{...none(),reason:'timeout'},
  {...unavailable(),url},{...unavailable(),source:'recorded'},...['',null,42,'raw stderr: private/path','bad\nreason','x'.repeat(129)].map(reason=>({...unavailable(),reason})),
]) rejectResult(value);
for(const bad of [
  'http://github.com/a/b/pull/1','https://git.example/a/b/pull/1','https://github.com.evil/a/b/pull/1',
  'https://user@github.com/a/b/pull/1','https://github.com:443/a/b/pull/1','https://GITHUB.com/a/b/pull/1',
  'https://github.com/a/b/pull/0','https://github.com/a/b/pull/-1','https://github.com/a/b/pull/01',
  'https://github.com/a/b/pull/9007199254740992','https://github.com/a/b/pull/1?x=1',
  'https://github.com/a/b/pull/1#frag','https://github.com/a/b/pull/1/',
  'https://github.com/../b/pull/1','https://github.com/a/./pull/1','https://github.com/a%2fb/c/pull/1',
  'https://github.com/a/b/pull/1\n','https://github.com/a/b/pull/1\0',' '.repeat(2049),null,1,
]) rejectResult({...known(),url:bad});
assert.throws(()=>f.recordedSource(' '.repeat(1048577)),/too large/);
assert.throws(()=>source({...raw,tasks:Array(4097).fill(raw.tasks[0])}),/Invalid Crew status/);
for(const change of [v=>delete v.home,v=>v.owner={},v=>delete v.owner.live,v=>delete v.tasks[0].terminal,v=>v.tasks[0].terminal=null,v=>v.tasks[0].state='unknown',v=>v.tasks[0].id='bad\nidentity']) {
  const value=copy(raw);change(value);assert.throws(()=>source(value),/Invalid Crew status/,'Discovery does not relax identity sanitization');
}

const bound=f.bindFleet(sanitized,null,model());
assert.equal(bound.child,'fm-crew-home1');assert.equal(bound.incomplete,true);
assert.equal(bound.tasks.length,6,'Closed no-link results survive diagnostically but have no authority');
assert.deepEqual(copy(bound.discovery),{version:1,tasks:[
  ...Object.entries(results).map(([task,result])=>({task,historical:false,...result})),
  ...Object.entries(results).map(([task,result])=>({task:`closed-${task}`,historical:true,...result})),
]});
for(const task of bound.tasks.filter(t=>t.historical)) {assert.equal(task.terminal,null);assert.equal(task.space,undefined);}
const legacy=copy(raw);delete legacy.prDiscovery;legacy.tasks[0].pr=url;
const legacyBinding=f.bindFleet(source(legacy),null,model());
for(const key of ['binding','pullScope','parent','child','owner','home','adoption'])assert.equal(bound[key],legacyBinding[key],key);
for(const result of [known(),none(),unavailable('github-unavailable')]) {
  const value=copy(raw);value.tasks=value.tasks.map(t=>({...t,prDiscovery:result}));
  const next=f.bindFleet(source(value),null,model());
  assert.equal(next.binding,bound.binding);assert.equal(next.pullScope,bound.pullScope);
  assert.equal(next.incomplete,result.status==='unavailable','Only unavailable eligible v1 results imply internal uncertainty');
}
const history=f.bindFleet({...sanitized,tasks:sanitized.tasks.filter(t=>t.state==='closed')},null,model());
assert.equal(history.child,null);assert.equal(history.pullScope,bound.pullScope);assert.equal(history.tasks.length,3);
list[1].labels['crew.task']='other';assert.equal(f.bindFleet(sanitized,null,model()),null);list[1].labels['crew.task']='known';
list[1].labels['crew.home']='other';assert.equal(f.bindFleet(sanitized,null,model()),null);list[1].labels['crew.home']='home1';
const originalGroup=groups[1].id;groups[1].id='ordinary';assert.equal(f.bindFleet(sanitized,null,model()),null);groups[1].id=originalGroup;
assert.equal(f.bindFleet({...sanitized,owner:{terminal:'pc2/owner',live:true}},null,model()),null);

// Registry pull context retains all result distinctions while links stay exact.
const jobs=[];const cx={spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));},notify(){}};
f.refreshFleets(cx,async()=>JSON.stringify(raw));await Promise.all(jobs.splice(0));
const context=r.pluginPullContext('coordinator');
assert.deepEqual(copy(context.discovery),copy(bound.discovery));
assert.equal(context.taskMembershipVerified,true);assert.equal(context.links.length,2,'Known live/history links only; aggregate deduplicates them');
assert.deepEqual(copy(context.links[0]),{url,terminal:'t-known',task:'known',historical:false});
assert.deepEqual(copy(context.links[1]),{url,terminal:null,task:'closed-known',historical:true});
const at=state[f.FLEET_KEY].entries.local.at;
const malformed=copy(raw);delete malformed.tasks[0].prDiscovery.url;
f.refreshFleets(cx,async()=>JSON.stringify(malformed),true);await Promise.all(jobs.splice(0));
assert.equal(state[f.FLEET_KEY].entries.local.at,at,'Malformed v1 never publishes fresh absence or renews success age');
assert.equal(r.pluginPullContext('coordinator').links[0].url,url);
assert.ok(!JSON.stringify(state['custom.fleet.display']).includes('discovery'),'No discovery inventory in durable pair identity');

// The same local IDs on a remote host still qualify exactly once.
groups=groups.map(s=>({...s,id:`pc2/${s.id}`,machine:'pc2',tabs:s.tabs.map(t=>({id:`pc2/${t.id}`}))}));
all=all.map(p=>({...p,tab:`pc2/${p.tab}`,terminal:`pc2/${p.terminal}`}));list=list.map(t=>({...t,address:`pc2/${t.address}`}));
const remote=f.bindFleet(sanitized,'pc2',model());
assert.equal(remote.parent,'pc2/coordinator');assert.equal(remote.tasks[0].terminal,'pc2/t-known');
assert.deepEqual(copy(remote.discovery),copy(bound.discovery));
assert.equal(f.bindFleet({...sanitized,owner:{terminal:'other/owner',live:true}},'pc2',model()),null);
console.log('PASS Crew v1 PR discovery schema, canonical links, budget partials, recorded-only compatibility, unchanged bindings and generic context');
