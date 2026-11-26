// Production renderers and shared pulsing feedback; no IO or native input.
import assert from 'node:assert/strict';
import {rowHarness,find,nodes,t,words,rowGeometry} from './support/git-row.mjs';
let enabled=true,shown=true,context={scope:'one',parent:'coordinator',stale:false,loading:false,links:[]};
const h=await rowHarness({modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js',
 'plugins.js':{sidebarPanelEnabled:()=>enabled,pluginPullContext:()=>context,pluginEvent(){}},'panel-kit.js':'src/ui/panel-kit.js'}});
const p=h.panel;p.aggregate={context:null};p.shown=()=>enabled&&shown;p.notices={sync(){},presentation(){}};p.enrollmentPicker={render(){},stop(){}};
for(const name of ['syncAgent','loadRelatedPull','syncWebhooks','syncChecksFallback'])p[name]=()=>{};
p.pullsDue=()=>false;p.agentLinks.refresh=()=>{};p.syncAggregate=()=>false;
const animations=tree=>nodes(tree).filter(n=>n.attrs.loop||n.attrs.spin);
const track=tree=>find(tree,'git-loading-track');
const noBulbs=tree=>{assert.equal(find(tree,'git-task-activity'),undefined);assert.equal(find(tree,'git-task-stale'),undefined);};
const pulse=tree=>{const animation=animations(tree);assert.equal(animation.length,1);assert.equal(animation[0].attrs.loop[0],'opacity');assert.equal(track(tree),undefined);noBulbs(tree);};
// Warm authoritative empty results keep their empty presentation and only the line.
p.pulls.open=[];
for(const flag of ['loading','pullLoading','relatedRequest','fallbackRequest']) {
 p[flag]=true;let tree=h.render(()=>p.render(h.cx));assert.ok(track(tree),flag);noBulbs(tree);
 assert.equal(animations(tree).length,1,`${flag}: line is the only warm animation`);
 assert.equal(animations(tree)[0].attrs.loop[0],'left');
 for(let n=0;n<4;n++)assert.ok(track(h.render(()=>p.render(h.cx))));
 p[flag]=false;assert.equal(track(h.render(()=>p.render(h.cx))),undefined,`${flag}: completion stops motion`);
}
p.loading=true;p.pullLoading=true;p.loading=false;assert.ok(track(h.render(()=>p.render(h.cx))));p.pullLoading=false;
// Identity is already known, but its first page is not. A remembered fold must
// hide neither Loading nor an actionable first-page failure.
p.sectionEntry=true;p.pulls.open=null;p.loading=false;p.pullLoading=true;p.foldedRepositories.add('owner/repo');
const ordinary=h.render(()=>p.render(h.cx));pulse(ordinary);assert.ok(words(find(ordinary,'git-empty')).includes('Loading'));
assert.equal(find(ordinary,'task-repo-header-owner/repo'),undefined);
p.pullLoading=false;p.pullError='Synthetic page failure';let failure=h.render(()=>p.render(h.cx));assert.ok(words(failure).includes('Synthetic page failure'));assert.equal(animations(failure).length,0);
p.pullError=null;p.foldedRepositories.clear();
const a=new h.AggregatePulls({shown:()=>shown});p.aggregate=a;a.context=context;p.context='tasks:one';
let coordinator;
for(const state of ['cold','warm','background','verification','safety']) {
 a.entries.clear();a.pending.clear();a.fallbackBusy=false;a.returning=false;a.published=null;context={...context,stale:false,loading:false};a.context=context;
 if(state==='verification'){context={...context,stale:true,loading:true};a.context=context;}
 else if(state==='safety'){a.published=new Map();a.fallbackBusy=true;}
 else {a.pending.set('request',{});if(state!=='cold')a.published=new Map();else a.entries.set('fixture/a#1',{link:{repo:'fixture/a',targets:[]},pr:null,error:null});}
 const tree=h.render(()=>p.renderAggregate(h.cx,t));noBulbs(tree);
 if(['cold','verification'].includes(state)) {pulse(tree);if(state==='cold')coordinator=tree;}
 else {assert.ok(track(tree),state);assert.equal(animations(tree).length,1);assert.equal(find(tree,'git-task-waiting'),undefined);}
 shown=false;assert.equal(p.panelLoading(),false);shown=true;enabled=false;assert.equal(p.panelLoading(),false);enabled=true;
}
// Compare position relative to the tab-strip bottom, not a whole-window offset.
for(const zoom of [1,1.3]) {
 const position=(tree,id)=>{const g=rowGeometry(tree,390,zoom,600),tabs=g.get(find(tree,'git-views')),message=g.get(find(tree,id));return (message.y-tabs.y-tabs.height)/zoom;};
 assert.ok(Math.abs(position(ordinary,'git-empty')-position(coordinator,'git-task-empty'))<0.001,'Cold messages have identical top placement');
 assert.ok(Math.abs(position(ordinary,'git-empty')-4)<0.001);
}
a.pending.clear();a.fallbackBusy=false;context={...context,loading:false};a.context=context;
assert.equal(p.panelLoading(),false,'Stale failed verification awaiting retry is not active work');
a.context={...context,stale:false};a.returning=true;a.readWake={due:Date.now()+60000};assert.equal(p.panelLoading(),false,'Dormant cooldown does not animate the line');
a.readWake=null;assert.equal(p.panelLoading(),true,'Queued warm reconciliation animates');a.returning=false;
a.published=null;a.entries.set('fixture/unknown#2',{link:{repo:'fixture/unknown',targets:[]},pr:null,error:null});a.readWake={due:Date.now()+60000};pulse(h.render(()=>p.renderAggregate(h.cx,t)));
let notifications=0;const oldTrack=p.loadingLine(t);p.context='tasks:two';oldTrack.attrs.on_size_change[0]({width:999},{notify(){notifications++;}});assert.equal(notifications,0,'Retired measurement cannot update another context');
console.log('PASS pulsing aligned cold Git feedback without headers/line; warm line, failures, cooldown and retirement');
