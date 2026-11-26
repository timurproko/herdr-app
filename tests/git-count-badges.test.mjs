// Label-only tab chrome, independent of internal count knowledge and refresh.
import assert from 'node:assert/strict';
import {rowHarness,find,words,t,nodes,rowGeometry} from './support/git-row.mjs';
const h=await rowHarness({modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','panel-kit.js':'src/ui/panel-kit.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>null,pluginEvent(){}}}});
const {panel:p,cx}=h;
p.shown=()=>true;p.notices={sync(){},presentation(){}};p.enrollmentPicker={render(){},stop(){}};
for(const name of ['syncAgent','loadRelatedPull','syncWebhooks','syncChecksFallback'])p[name]=()=>{};
p.pullsDue=()=>false;p.agentLinks.refresh=()=>{};p.syncAggregate=()=>false;p.sourceCurrent=()=>true;
const a=p.aggregate=new h.AggregatePulls({shown:()=>true});a.context={scope:'tabs',parent:'coordinator',stale:false,links:[]};
let comparisons=0;
for(const mode of ['ordinary','coordinator'])for(const width of [280,320,360,390,480])for(const zoom of [.75,1,1.25,1.3,1.5,2])for(const selected of ['open','closed']){
 h.setZoom(zoom);p.view=selected;p.context=mode==='coordinator'?'tasks:tabs':JSON.stringify([h.place.cwd,h.place.on]);let baseline;
 for(const count of [null,0,1,10,100,999,1000,99999]){
  p.counts={open:count,closed:count};a.counts=()=>({open:count,closed:count});
  p.pulls={open:count==null?null:[],closed:count==null?null:[]};p.pullLoading=count===100;p.entrySeed=count===10;
  a.published=count==null?null:new Map();a.context={...a.context,stale:count==null,loading:count==null};a.fallbackBusy=count===100;
  const tree=h.render(()=>mode==='ordinary'?p.renderPanel(cx):p.renderAggregate(cx,t)),geometry=rowGeometry(tree,width,zoom,600),snapshot=[];
  for(const state of ['open','closed']){
   const id=`git-view-${state}`,tab=find(tree,id),label=find(tab,id+'-label'),tb=geometry.get(tab),lb=geometry.get(label);
   assert.ok(tab);assert.equal(words(tab).join(''),state==='open'?'Open':'Closed');
   assert.equal(find(tree,id+'-count'),undefined);assert.equal(find(tree,id+'-count-slot'),undefined);
   assert.equal(nodes(tab).filter(n=>n.attrs.tooltip).length,0,'No count-only or repeat-only tab tooltip');
   assert.equal(tab.attrs.accessibility_label[0],state==='open'?'Open':'Closed');
   assert.equal(Boolean(tab.attrs.font_semibold),state===selected);
   assert.ok(Math.abs(lb.x-tb.x-8*zoom)<1e-6);assert.ok(Math.abs(tb.x+tb.width-lb.x-lb.width-8*zoom)<1e-6,'Only symmetric label padding remains');
   snapshot.push([tb.x,tb.width,lb.x,lb.width]);comparisons++;
  }
  baseline??=snapshot;assert.deepEqual(snapshot,baseline,'Internal counts never move the label-only tabs');
 }
 // Real click callback retains ordinary/coordinator selection and stable IDs.
 p.entrySeed=false;p.pulls={open:[],closed:[]};const tree=h.render(()=>mode==='ordinary'?p.renderPanel(cx):p.renderAggregate(cx,t));
 find(tree,`git-view-${selected==='open'?'closed':'open'}`).attrs.on_click[0]({},cx);assert.equal(p.view,selected==='open'?'closed':'open');
}
console.log(`PASS ${comparisons} label-only ordinary/coordinator tab comparisons, accessible names, symmetric padding and selection callbacks`);
