import assert from 'node:assert/strict';
import {rowHarness,find,words,t} from './support/git-row.mjs';

const pending=[],tasks=[];
const context={scope:'home',machine:null,links:[1,2].map(number=>({url:`https://github.com/owner/repo/pull/${number}`,terminal:`t${number}`}))};
const h=await rowHarness({host:{exec:(_command,args)=>new Promise(resolve=>pending.push({args,resolve}))},modules:{
  'aggregate.js':'src/plugins/git/mod/aggregate.js',
  'plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}},
}});
const {panel,cx}=h;panel.foldedRepositories=new Set();
cx.spawn=fn=>tasks.push(fn(cx));
const tick=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
const reply=async(value,code=0)=>{assert.ok(pending.length);pending.shift().resolve({code,stdout:typeof value==='string'?value:JSON.stringify(value)});await tick();};
// Isolate IO-independent chrome consumers, not the shared segment renderer,
// repository snapshot reader or coordinator index exercised below.
panel.syncAggregate=()=>false;panel.syncAgent=()=>{};panel.loadRelatedPull=()=>{};panel.syncWebhooks=()=>{};panel.syncChecksFallback=()=>{};
panel.notices={sync:()=>null,presentation:()=>null};panel.enrollmentPicker={stop(){},render:()=>null};
panel.agentLinks={related:()=>null,refresh(){}};
const badges=(tree,expected)=>{
  for(const [index,state] of ['open','closed'].entries()) {
    const badge=find(tree,`git-view-${state}-count`),slot=find(tree,`git-view-${state}-count-slot`);
    assert.ok(badge,`${state} always paints its badge`);assert.ok(badge.attrs.rounded_full);assert.equal(slot.attrs.w[0],32);
    assert.equal(words(badge).join(''),String(expected[index]));
    assert.ok(find(tree,`git-view-${state}`).attrs.accessibility_label[0].includes(`${state==='open'?'Open':'Closed'}: ${expected[index]}`));
  }
};
const ordinary=()=>h.render(()=>panel.render(cx));
panel.root=null;panel.repo=null;panel.loading=true;
let tree=ordinary();badges(tree,[0,0]);
assert.match(find(tree,'git-view-open-count').attrs.tooltip[0],/loading/i);
assert.match(find(tree,'git-view-open').attrs.accessibility_label[0],/loading/i);
panel.root='/repo';panel.repo={name:'owner/repo',owner:'owner'};panel.loading=false;
panel.pulls.open=[];panel.pulls.closed=[];panel.pullsAt={open:Date.now(),closed:Date.now()};panel.counts={open:7,closed:123};
badges(ordinary(),[7,123]);panel.loadPulls('open',cx,true);await tick();
badges(ordinary(),[7,123]);assert.equal(pending.length,1,'A same-repository refresh retains totals while list data is pending');
await reply({data:{repository:{pullRequests:{nodes:[],totalCount:7,pageInfo:{hasNextPage:false,endCursor:null}}}}});
badges(ordinary(),[7,123]);assert.equal(pending.length,1,'Retain known totals through the delayed count read too');
await reply({data:{repository:{open:{totalCount:9},closed:{totalCount:124}}}});badges(ordinary(),[9,124]);
panel.loadPulls('open',cx,true);await reply('',1);badges(ordinary(),[9,124]);
panel.context='new-repository';panel.resetRepository();panel.loading=true;
// render() ordinarily detects and initiates a new folder read. Suppress just
// that IO here after invoking the real invalidation boundary explicitly.
panel.context=JSON.stringify([h.place.cwd,h.place.on]);badges(ordinary(),[0,0]);

// Actual coordinator index: first-load zeros, targeted reads becoming totals,
// last-good counts while replacements are pending/failed, and a new home reset.
const aggregate=panel.aggregate=new h.AggregatePulls({shown:()=>true});
const coordinator=()=>h.render(()=>panel.renderAggregate(cx,t));
aggregate.sync(cx);await tick();panel.context='tasks:home';
badges(coordinator(),[0,0]);assert.equal(pending.length,2);
await reply({number:1,url:context.links[0].url,title:'Open task',state:'OPEN'});badges(coordinator(),[1,0]);
await reply({number:2,url:context.links[1].url,title:'Closed task',state:'CLOSED',closedAt:new Date().toISOString()});badges(coordinator(),[1,1]);
aggregate.refresh(cx);await tick();assert.equal(pending.length,2);badges(coordinator(),[1,1]);
await reply('',1);badges(coordinator(),[1,1]);
await reply({number:2,url:context.links[1].url,title:'Reopened',state:'OPEN'});badges(coordinator(),[2,0]);
context.scope='new-home';context.links=[];aggregate.sync(cx);panel.context='tasks:new-home';badges(coordinator(),[0,0]);
await Promise.all(tasks);assert.equal(pending.length,0);
console.log('PASS always-visible ordinary/coordinator Open/Closed badges: initial/unknown zero, loaded totals, pending/failed same-context retention, real context reset, loading tooltip/accessibility and stable three-digit reservation (synthetic, no live IO)');
