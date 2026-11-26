// Actual Git renderers/shared controls; no timers, IO, sessions or native input.
import assert from 'node:assert/strict';
import {rowHarness,find,nodes,t,words} from './support/git-row.mjs';
let enabled=true,shown=true,context={scope:'one',parent:'coordinator',stale:false,loading:false,links:[]};
const h=await rowHarness({modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js',
 'plugins.js':{sidebarPanelEnabled:()=>enabled,pluginPullContext:()=>context,pluginEvent(){}},'panel-kit.js':'src/ui/panel-kit.js'}});
const p=h.panel;p.aggregate={context:null};p.shown=()=>enabled&&shown;p.notices={sync(){},presentation(){}};p.enrollmentPicker={render(){},stop(){}};
for(const name of ['syncAgent','loadRelatedPull','syncWebhooks','syncChecksFallback'])p[name]=()=>{};
p.pullsDue=()=>false;p.agentLinks.refresh=()=>{};p.syncAggregate=()=>false;
const animations=tree=>nodes(tree).filter(n=>n.attrs.loop||n.attrs.spin);
const track=tree=>find(tree,'git-loading-track');
const noBulbs=tree=>{assert.equal(find(tree,'git-task-activity'),undefined);assert.equal(find(tree,'git-task-stale'),undefined);};
for(const flag of ['loading','pullLoading','relatedRequest','fallbackRequest']) {
 p[flag]=true;let tree=h.render(()=>p.render(h.cx));assert.ok(track(tree),flag);noBulbs(tree);
 assert.equal(animations(tree).length,1,`${flag}: line is the only panel-loading animation`);
 assert.equal(animations(tree)[0].attrs.loop[0],'left');
 // More than one pass remains active, independent of CI state or a fixed timeout.
 for(let n=0;n<4;n++)assert.ok(track(h.render(()=>p.render(h.cx))));
 p[flag]=false;assert.equal(track(h.render(()=>p.render(h.cx))),undefined,`${flag}: completion stops motion`);
}
p.loading=true;p.pullLoading=true;p.loading=false;assert.ok(track(h.render(()=>p.render(h.cx))),'Overlapping work retains one track');p.pullLoading=false;
const a=new h.AggregatePulls({shown:()=>shown});p.aggregate=a;a.context=context;p.context='tasks:one';
for(const state of ['cold','warm','background','verification','safety']) {
 a.entries.clear();a.pending.clear();a.fallbackBusy=false;a.returning=false;a.published=null;context={...context,stale:false,loading:false};a.context=context;
 if(state==='verification'){context={...context,stale:true,loading:true};a.context=context;}
 else if(state==='safety')a.fallbackBusy=true;
 else {a.pending.set('request',{});if(state!=='cold')a.published=new Map();else a.entries.set('fixture/a#1',{link:{repo:'fixture/a',targets:[]},pr:null,error:null});}
 const tree=h.render(()=>p.renderAggregate(h.cx,t));assert.ok(track(tree),state);noBulbs(tree);
 assert.equal(animations(tree).length,1,`${state}: no second loading animation`);
 if(state==='cold') {const message=find(tree,'git-task-empty');assert.ok(words(message).includes('Loading'));assert.equal(message.kids[0].attrs.size[0],7);assert.equal(message.kids[0].attrs.loop,undefined);}
 if(['warm','background'].includes(state))assert.equal(find(tree,'git-task-waiting'),undefined);
 shown=false;assert.equal(p.panelLoading(),false);shown=true;enabled=false;assert.equal(p.panelLoading(),false);enabled=true;
}
a.pending.clear();a.fallbackBusy=false;context={...context,loading:false};a.context=context;
assert.equal(p.panelLoading(),false,'Stale failed verification awaiting retry is not active work');
a.context={...context,stale:false};a.returning=true;a.readWake={due:Date.now()+60000};assert.equal(p.panelLoading(),false,'Dormant cooldown does not animate');
a.readWake=null;assert.equal(p.panelLoading(),true,'Queued warm reconciliation animates');a.returning=false;
let notifications=0;const oldTrack=p.loadingLine(t);p.context='tasks:two';oldTrack.attrs.on_size_change[0]({width:999},{notify(){notifications++;}});assert.equal(notifications,0,'Retired measurement cannot update another context');
console.log('PASS one native Git loading line: cold/warm/background/ordinary/verification/safety, overlap, completion, cooldown and scope retirement');
