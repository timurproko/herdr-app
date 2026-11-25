import assert from 'node:assert/strict';
import {rowHarness,find,words,t,nodes} from './support/git-row.mjs';
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-6,`${message}: ${a} != ${b}`);
const right=box=>box.x+box.width,centre=box=>box.x+box.width/2;

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
    assert.equal(words(badge).join(''),expected[index]>999?'999+':String(expected[index]));
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
badges(coordinator(),[0,0]);assert.equal(pending.length,1,'One repository metadata batch replaces per-PR commands');
const one={number:1,url:context.links[0].url,title:'Open task',state:'OPEN',statusCheckRollup:[]};
const two={number:2,url:context.links[1].url,title:'Closed task',state:'CLOSED',closedAt:new Date().toISOString(),statusCheckRollup:[]};
await reply({data:{repository:{pr1:one,pr2:two}}});badges(coordinator(),[1,1]);
aggregate.refresh(cx);await tick();assert.equal(pending.length,1);badges(coordinator(),[1,1]);
await reply('',1);badges(coordinator(),[1,1]);
// Explicit contradictory evidence, not a generic event polling final history.
h.facts.gitReads(h.transport).facts.clear();aggregate.entries.get('owner/repo#2').dirty=true;
aggregate.refresh(cx);await tick();await reply({data:{repository:{pr1:one,pr2:{...two,title:'Reopened',state:'OPEN'}}}});badges(coordinator(),[2,0]);
context.scope='new-home';context.links=[];aggregate.sync(cx);panel.context='tasks:new-home';badges(coordinator(),[0,0]);
await Promise.all(tasks);assert.equal(pending.length,0);
// Complete ordinary/coordinator chrome: compare the painted badge (not merely
// its reservation) with the label, using both selected states and both tabs.
panel.root='/repo';panel.repo={name:'owner/repo',owner:'owner'};panel.loading=false;
panel.context=JSON.stringify([h.place.cwd,h.place.on]);panel.pullsDue=()=>false;
let comparisons=0;
for(const mode of ['ordinary','coordinator'])for(const width of [280,320,360,390,480])for(const zoom of [0.75,1,1.25,1.3,1.5,2])for(const selected of ['open','closed']) {
  h.setZoom(zoom);panel.view=selected;panel.syncAggregate=()=>mode==='coordinator';let baseline;
  for(const count of [null,0,1,9,10,99,100,999,1000,99999]) {
    panel.counts={open:count,closed:count};aggregate.counts=()=>({open:count,closed:count});
    // Avoid fallback to a loaded list length for an unknown ordinary Open count.
    panel.pulls.open=count==null?null:[];panel.pulls.closed=[];
    const {tree,geometry}=h.settle(()=>panel.render(cx),width,zoom,600),snapshot=[];
    for(const state of ['open','closed']) {
      const tab=find(tree,`git-view-${state}`),label=find(tab,`git-view-${state}-label`),badge=find(tab,`git-view-${state}-count`),slot=find(tab,`git-view-${state}-count-slot`);
      const tb=geometry.get(tab),lb=geometry.get(label),bb=geometry.get(badge),sb=geometry.get(slot);
      assert.equal(tab.attrs.font_semibold!==undefined,state===selected,'Both selected states are exercised');
      near(lb.x-tb.x,8*zoom,'Label starts 8px inside the tab');
      near(right(tb)-right(bb),lb.x-tb.x,'Painted badge right padding equals label left padding');
      near(bb.x-right(lb),6*zoom,'Label-to-badge gap remains fixed');
      near(bb.width,32*zoom,'Painted badge itself reserves 32px');near(sb.width,32*zoom,'Reservation remains 32px');
      near(bb.x,sb.x,'Badge fills its reservation, without hidden trailing slack');
      const text=geometry.visibleTextLines.find(line=>line.ancestors.includes(badge));assert.ok(text);
      near(text.x+text.naturalWidth/2,centre(bb),'Badge digits are centred, independent of digit count');
      assert.ok(text.naturalWidth<=bb.width-8*zoom+1e-6,'Exact three-digit counts and overflow indicator fit inside badge padding');
      assert.equal(words(badge).join(''),count>999?'999+':String(count??0));
      assert.equal(tab.attrs.tooltip,undefined,'Tab has no redundant count tooltip');
      const tooltipNodes=nodes(tab).filter(node=>node.attrs.tooltip);
      if(count==null) {
        assert.deepEqual(tooltipNodes,[badge]);assert.match(badge.attrs.tooltip[0],/loading.*0/i);
        assert.match(tab.attrs.accessibility_label[0],/loading/i);
      } else if(count>999) {
        assert.deepEqual(tooltipNodes,[badge]);assert.equal(badge.attrs.tooltip[0],String(count),'Abbreviated count retains exact total');
      } else assert.equal(tooltipNodes.length,0,'Fully visible exact counts have no tab or nested badge tooltip');
      assert.ok(tab.attrs.accessibility_label[0].includes(String(count??0)),'Accessible label keeps the exact total');
      snapshot.push(...[tb,bb,sb].map(box=>Object.fromEntries(Object.entries(box).map(([key,value])=>[key,Number(value.toFixed(6))]))));
      comparisons++;
    }
    baseline??=snapshot;assert.deepEqual(snapshot,baseline,'Neither tab nor painted badge moves when digit count changes');
  }
}
console.log(`PASS ${comparisons} full-panel ordinary/coordinator count comparisons: symmetric 8px tab padding around label/painted badge, centred stable 32px badge, both tabs/selected states, one/two/three digits, informative-only loading/999+ tooltips, 280–480px and 75–200% including 130% (synthetic, not native pixels)`);
console.log('PASS always-visible ordinary/coordinator Open/Closed badges: initial/unknown zero, loaded totals, pending/failed same-context retention, real context reset, loading tooltip/accessibility and stable three-digit reservation (synthetic, no live IO)');
