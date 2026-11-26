import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {rowHarness} from './support/git-row.mjs';
const copy=v=>JSON.parse(JSON.stringify(v)),url=repo=>`https://github.com/fixture/${repo}/pull/1`;
let enabled=true,order=['parent','xr','my','combined','foreign'],current;
const source=(repo,space,task=repo)=>({url:url(repo),space,task,terminal:task});
const base={kind:'tasks',scope:'home',machine:null,parent:'parent',stale:false,children:['xr','my','combined'].map(child=>({child})),links:[source('myworkflows','my'),source('xrbuild','xr'),source('xrbuild','xr','duplicate'),source('alpha','combined'),source('zeta','combined'),{url:url('finished'),task:'ended',terminal:null,historical:true}]};
current=copy(base);let reads=0,writes=0;
const host={spaces:()=>order.map(id=>({id,name:'Renamed '+id,machine:id==='foreign'?'pc2':null})),exec(){reads++;throw Error('No ordering IO');},run(){writes++;throw Error('No ordering mutation');}};
const {AggregatePulls,repositorySpaceOrder}=await loadMod({mod:'custom-changes',host,modules:{'location.js':{location:()=>({space:current?.parent})},'plugins.js':{pluginPullContext:()=>current,pluginEvent(){},sidebarPanelEnabled:()=>enabled},'pulls.js':{pullFailure(){},repositoryFailure(){},readTargetPulls(){},finalPull:()=>false,retimePull:pr=>pr,quietRead(){},retryRead(){},PullFactsOrder:class{reset(){}}}},entry:'export {AggregatePulls,repositorySpaceOrder} from "./aggregate.js";'});
const a=new AggregatePulls({shown:()=>false,onUpdate(){}}),cx={};a.sync(cx);
const settle=()=>{for(const e of a.entries.values()){e.pr={repo:e.link.repo,key:e.link.key,state:e.link.repo.endsWith('finished')?'merged':'open'};e.dirty=false;e.completedAt=Date.now()-1000;}a.rememberCounts();};settle();
const expected=['fixture/xrbuild','fixture/myworkflows','fixture/alpha','fixture/finished','fixture/zeta'];
assert.deepEqual(copy(a.repositories()),expected,'Verified child order beats alphabetical sections; combined/history tail remains stable');
assert.equal(a.entries.size,5,'Duplicate PR stays one identity');const beforeRows=copy(a.rows('open').map(p=>p.key)),beforeCounts=copy(a.counts());
order=['parent','my','combined','xr','foreign'];assert.deepEqual(copy(a.repositories()),['fixture/myworkflows','fixture/xrbuild',...expected.slice(2)],'Acknowledged native order alone updates both-tab inventory');
assert.deepEqual(copy(a.rows('open').map(p=>p.key)),beforeRows,'No PR-row reordering');assert.deepEqual(copy(a.counts()),beforeCounts,'No counter changes');
current={...current,stale:true,links:[]};a.sync(cx);assert.deepEqual(copy(a.repositories()),['fixture/myworkflows','fixture/xrbuild',...expected.slice(2)],'Compatible stale presentation retains verified associations only');assert.equal(a.currentContext(),null,'Ordering grants no fresh authority');
// A missing native child cannot be ranked from old task associations.
order=order.filter(id=>id!=='my');assert.deepEqual(copy(a.repositories()),['fixture/xrbuild','fixture/alpha','fixture/finished','fixture/myworkflows','fixture/zeta']);
// Exact machine and connected-child qualification; a foreign/forged target never ranks.
const entries=[{link:{repo:'fixture/alpha',targets:[{space:'foreign',terminal:'foreign'}]}},{link:{repo:'fixture/zeta',targets:[{space:'xr',historical:true,terminal:'ended'}]}}];
assert.deepEqual(copy(repositorySpaceOrder(['fixture/zeta','fixture/alpha'],{...base,children:[{child:'foreign'},{child:'xr'}]},entries,host.spaces())),['fixture/zeta','fixture/alpha']);
// Same repository in several unique children chooses its earliest child;
// a combined child provides no rank to either of its repositories.
const links=[{link:{repo:'fixture/zeta',targets:[{space:'xr',terminal:'t1'},{space:'my',terminal:'t2'}]}},{link:{repo:'fixture/alpha',targets:[{space:'combined',terminal:'t3'}]}}];
assert.deepEqual(copy(repositorySpaceOrder(['fixture/alpha','fixture/zeta'],base,links,[{id:'my'},{id:'xr'},{id:'combined'}])),['fixture/zeta','fixture/alpha']);
// Warm return keeps scope-qualified inert association facts and uses CURRENT native order.
current=copy(base);order=['parent','xr','my','combined'];a.sync(cx);settle();a.rememberPresentation();
current={...copy(base),scope:'other-home',parent:'other-parent',links:[]};a.sync(cx);assert.deepEqual(copy(a.repositories()),[],'Another home cannot borrow association facts');
current=copy(base);order=['parent','my','xr','combined'];a.sync(cx);assert.deepEqual(copy(a.repositories()),['fixture/myworkflows','fixture/xrbuild',...expected.slice(2)]);
// Recreated controller derives order only from new context/native snapshots.
const restarted=new AggregatePulls({shown:()=>false,onUpdate(){}});restarted.sync(cx);assert.deepEqual(copy(restarted.repositories()),copy(a.repositories()));
current={...copy(base),presentationGeneration:1,links:[]};a.sync(cx);assert.deepEqual(copy(a.repositories()),[],'Generation replacement invalidates mapping with inventory');
enabled=false;a.sync(cx);assert.deepEqual(copy(a.repositories()),[]);assert.equal(reads,0);assert.equal(writes,0);
// Actual controller section/filter/reveal projection consumes the same ordering;
// saved folds remain keyed by repository, not by a changing section index.
enabled=true;current=copy(base);a.sync(cx);settle();
const h=await rowHarness();h.panel.aggregate=a;h.panel.context='tasks:home';h.panel.foldedRepositories.add('fixture/xrbuild');
for(const view of ['open','closed']) {
 h.panel.view=view;let sections=h.panel.repositorySections();
 assert.deepEqual(copy(sections.map(s=>s.repo)),view==='open'?['fixture/myworkflows','fixture/xrbuild','fixture/alpha','fixture/zeta']:['fixture/finished']);
 h.panel.taskSections(sections,'home');order=['parent','xr','my','combined'];sections=h.panel.repositorySections();
 assert.deepEqual(copy(sections.map(s=>s.repo)),view==='open'?['fixture/xrbuild','fixture/myworkflows','fixture/alpha','fixture/zeta']:['fixture/finished']);
 const projection=h.panel.taskSections(sections,'home');assert.deepEqual(copy(projection.sections.map(s=>s.repo)),copy(sections.map(s=>s.repo)));
 assert.ok(h.panel.foldedRepositories.has('fixture/xrbuild'));order=['parent','my','xr','combined'];
}
assert.equal(reads,0);assert.equal(writes,0);
console.log('PASS canonical task/child section order, native updates, combined/history tail, duplicates, scope/generation/machine isolation, warm/stale/restart, actual section/reveal/fold projection and no IO');
