import assert from 'node:assert/strict';
import {rowHarness,find,nodes,t,rowGeometry} from './support/git-row.mjs';
const h=await rowHarness({modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
const {panel,cx}=h,context={scope:'counts',links:[]};panel.context='tasks:counts';panel.shown=()=>true;
panel.aggregate=new h.AggregatePulls({shown:()=>true});panel.aggregate.context=context;panel.notices={sync(){},presentation(){}};panel.enrollmentPicker={render(){}};panel.syncChecksFallback=()=>{};
for(const count of [1,10,100]) {
 panel.aggregate.entries.clear();
 for(let n=1;n<=count;n++)for(const state of ['open','closed']){const repo='fixture/repository',key=`${repo}#${n}-${state}`;panel.aggregate.entries.set(key,{link:{repo,key,targets:[{terminal:'worker'}]},pr:{...h.facts.pullRow({number:n,title:'Fixture',state:state.toUpperCase()},'fixture'),repo,key}});}
 for(const view of ['open','closed'])for(const folded of [false,true])for(const zoom of [.75,1,1.3,2]) {
  panel.view=view;h.setZoom(zoom);panel.foldedRepositories=folded?new Set(['fixture/repository']):new Set();
  const tree=h.render(()=>panel.renderAggregate(cx,t)),countNode=find(tree,'task-repo-count-fixture/repository');
  assert.equal(countNode.kids[0].kids[0],String(count));assert.ok(countNode.kids[0].attrs.text_right);assert.equal(countNode.attrs.w[0],32);
  assert.equal(countNode.attrs.tooltip,undefined);assert.equal(countNode.attrs.mr[0],1,'24px Git chevron and 8px gap compensate Agents 16px slot/6px gap');
  assert.equal(panel.aggregate.counts()[view],count);
  assert.ok(nodes(tree).filter(n=>/^pr-fixture/.test(n.attrs.id?.[0]??'')).length<=60);
  const boxes=rowGeometry(tree,390,zoom),box=boxes.get(countNode);assert.equal(box.width,32*zoom);
 }
}
console.log('PASS full-inventory selected-tab repository counts independent of folds/reveal, Agents numeric rail and larger-chevron spacing compensation');
