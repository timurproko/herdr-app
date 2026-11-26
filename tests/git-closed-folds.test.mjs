// Report-shaped fold exploration; this is NOT a reproduction of a native interrupt.
import assert from 'node:assert/strict';
import {rowHarness,find,nodes,t} from './support/git-row.mjs';
import {measureTask,scrollTask} from './support/git-scroll.mjs';
import {assertTaskSections} from './support/git-section-invariant.mjs';
for(const count of [41,60,100,200])for(const zoom of [1,1.3]) {
 const context={scope:'fold-fixture',links:[]};let reads=0;
 const h=await rowHarness({host:{exec(){reads++;throw Error('No external IO');}},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
 const {panel,cx}=h;h.setZoom(zoom);panel.view='closed';panel.context='tasks:fold-fixture';panel.shown=()=>true;
 panel.aggregate=new h.AggregatePulls({shown:()=>true});panel.aggregate.context=context;
 panel.notices={sync(){},presentation(){}};panel.enrollmentPicker={render(){}};panel.syncChecksFallback=()=>{};
 for(let n=1;n<=count;n++) {
  const repo=n<=Math.ceil(count/2)?'fixture/a':'fixture/b',key=`${repo}#${n}`;
  const pr={...h.facts.pullRow({number:n,title:`Closed fixture ${n}`,state:n%2?'MERGED':'CLOSED',closedAt:new Date().toISOString(),author:{login:'fixture'},body:'- [x] complete',labels:[{name:'fixture',color:'840479'}]},'fixture'),repo,key};
  const link={repo,number:n,key,targets:[{terminal:n%3?'worker':null,historical:n%3===0}]};context.links.push({url:`https://github.com/${repo}/pull/${n}`});
  panel.aggregate.entries.set(key,{link,pr,completedAt:Date.now(),error:n===2?{kind:'read',message:'Fixture scoped refusal'}:null});
 }
 const render=()=>{const tree=h.render(()=>panel.renderAggregate(cx,t));assertTaskSections(tree,panel);assert.ok(nodes(tree).filter(n=>/^pr-fixture\//.test(n.attrs.id?.[0]??'')).length<=60);return tree;};
 let tree=render();
 for(let step=0;step<60;step++) {
  measureTask(panel,tree,cx,400,390,zoom);scrollTask(panel,tree,cx,step%3*600,400,zoom);tree=render();
  const header=nodes(tree).find(n=>String(n.attrs.id?.[0]).startsWith('task-repo-header-'));
  if(header){header.attrs.on_click[0]({},cx);tree=render();}
  if(step%4===0){panel.foldedRepositories.clear();tree=render();}
  if(panel.selectedTaskWindow.atCap)panel.nextTaskChunk(panel.selectedTaskWindow,context.scope,cx);
  else panel.selectedTaskWindow.revealMore();tree=render();
  assert.equal(panel.aggregate.counts().closed,count);
 }
 assert.equal(reads,0);
 console.log(`PASS report-shaped Closed folds: ${count} PRs, ${zoom*100}% zoom, 60 fold/reveal/scroll transitions (native interruption not established)`);
}
