// Frequent four-PR/multi-repository updates through the shipping render wrapper.
// Deterministic structural guard, not proof of native deadline or live workload.
import assert from 'node:assert/strict';
import {rowHarness,find,nodes,words,t} from './support/git-row.mjs';
let context={scope:'background',parent:'coordinator',stale:false,links:[]};
const h=await rowHarness({modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','panel-kit.js':'src/ui/panel-kit.js',
 'plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
const p=h.panel,a=p.aggregate=new h.AggregatePulls({shown:()=>true});
p.context='tasks:background';a.context=context;p.shown=()=>true;p.syncAggregate=()=>true;
p.syncChecksFallback=()=>{};p.agentLinks.refresh=()=>{};p.notices={sync(){},presentation(){}};p.enrollmentPicker={render(){},stop(){}};
let frames=0,peak=0;
for(const zoom of [1,1.3]){
 h.setZoom(zoom);p.view='open';p.foldedRepositories.clear();
 for(let cycle=0;cycle<240;cycle++){
  if(cycle===200||cycle===220)p.view=p.view==='open'?'closed':'open';
  context={...context,stale:cycle%50===49,loading:cycle%50===49};a.context=context;a.entries=new Map();
  for(let number=1;number<=4;number++){
   if(cycle%7===0&&number===4)continue;
   const repo=number<=2?'fixture/a':number===3?'fixture/b':'fixture/c',key=`${repo}#${number}`;
   const pr={...h.facts.pullRow({number,title:`Background PR ${number} revision ${cycle}`,url:`https://github.com/${repo}/pull/${number}`,state:p.view==='closed'?'MERGED':'OPEN',closedAt:new Date().toISOString(),createdAt:'2026-11-26T10:00:00Z',author:{login:'fixture'},body:'- [x] first\n- [ ] second',labels:[{name:['Build','Review','Approved','fixture'][number-1],color:'840479'}],statusCheckRollup:Array.from({length:13},(_,i)=>({context:`synthetic-${i}`,state:i<cycle%14?'SUCCESS':'PENDING'}))},'fixture'),repo,key};
   a.entries.set(key,{link:{repo,number,key,targets:[{terminal:'worker'}]},pr,dirty:false});
  }
  // Establish coherent publication before the busy/stale presentation update.
  const stale=context.stale;context.stale=false;a.rememberCounts();context.stale=stale;a.fallbackBusy=cycle%3!==0;
  const tree=h.render(()=>p.render(h.cx));frames++;assert.equal(p.renderAttempt,null,'A complete frame retires its abort marker');
  assert.equal(find(tree,'git-task-waiting'),undefined,'Warm facts never become body Loading');
  assert.equal(words(find(tree,'git-view-open')).join(''),'Open');assert.equal(words(find(tree,'git-view-closed')).join(''),'Closed');
  assert.equal(Boolean(find(tree,'git-loading-track')),a.fallbackBusy||context.loading);
  const window=p.selectedTaskWindow,range=window.range();assert.ok(range.items.length<=100);assert.ok(range.revealedRows.length<=4);
  for(const section of p.repositorySections()){
   const header=find(tree,`task-repo-header-${section.repo}`);if(!header)continue;
   if(!p.foldedRepositories.has(section.repo))assert.ok(find(tree,`task-repo-body-${section.repo}`),'Each unfolded header retains real body content');
   if(cycle%12===0&&section.repo==='fixture/b')header.attrs.on_click[0]({},h.cx);
  }
  const elements=nodes(tree).length;peak=Math.max(peak,elements);assert.ok(elements<1000,'Four rich PRs do not grow an unbounded native subtree');
 }
}
console.log(`PASS ${frames} four-PR background frames at 100%/130%, three repositories, checks/membership/folds/tab updates, complete markers and bounded trees (peak ${peak} elements)`);
