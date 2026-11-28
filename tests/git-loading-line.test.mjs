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
 assert.equal(animations(tree)[0].attrs.loop[0],'opacity');
 assert.equal(animations(tree)[0].attrs.loop[1].period,2400);assert.equal(animations(tree)[0].attrs.loop[1].to,0);
 assert.equal(find(tree,'git-ci-line').attrs.left,undefined);assert.equal(find(tree,'git-ci-line').attrs.w,undefined);
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
const oldTrack=p.loadingLine(t);assert.equal(oldTrack.attrs.on_size_change,undefined,'Stationary line needs no geometry callback');
p.motionReduced=true;assert.equal(animations(p.loadingLine(t)).length,0);assert.equal(animations(p.loadingMessage(t,'reduced')).length,0);
p.motionReduced=false;const dot=animations(p.loadingMessage(t,'normal'))[0],line=animations(p.loadingLine(t))[0];assert.equal(dot.attrs.loop[1].period,line.attrs.loop[1].period,'Cold dot and warm line retain the same cadence');assert.equal(dot.attrs.loop[1].from,0.25);assert.equal(line.attrs.loop[1].to,0,'Native loop starts at its to endpoint');
// Finite lifecycle callbacks, never a JavaScript animation frame loop. Native
// transitions must be declared at zero in a prior frame before revealing.
{
 shown=true;enabled=true;p.motionReduced=false;p.loadingLineState=null;p.context='lifecycle';p.view='open';
 const jobs=[],timers=[];let notifications=0;
 const cx={spawn:fn=>jobs.push(fn(cx)),notify:()=>notifications++,timer:{after(ms,fn){timers.push({ms,fn});}}};
 const flush=async()=>{for(let i=0;i<5;i++)await Promise.resolve();};
 const step=ms=>{const timer=timers.shift();assert.equal(timer?.ms,ms);timer.fn(cx);};
 const draw=active=>p.syncLoadingLine(active,cx)?p.loadingLine(t):null;
 let tree=draw(true),state=p.loadingLineState;assert.equal(jobs.length,0,'Lifecycle uses the view timer directly like StatusReveal, not a spawned task that can lose arming');assert.equal(timers.length,1);assert.equal(tree.attrs.opacity[0],0);assert.equal(tree.attrs.transition,undefined,'First paint hides without a transition from native default opacity');
 await flush();assert.equal(timers.length,1);step(16);tree=draw(true);assert.equal(tree.attrs.opacity[0],0);assert.equal(tree.attrs.transition[0],'opacity');
 step(16);tree=draw(true);assert.equal(tree.attrs.opacity[0],1);assert.equal(timers.length,0);
 for(let i=0;i<20;i++){draw(true);assert.equal(p.loadingLineState,state);}assert.equal(timers.length,0,'Routine refresh/rerender never restarts pulse or schedules a frame timer');
 tree=draw(false);assert.equal(tree.attrs.opacity[0],0);assert.equal(tree.attrs.role,undefined,'Fading presentation is not active work');await flush();assert.equal(timers[0].ms,140);
 draw(true);assert.equal(p.loadingLineState,state);step(140);assert.equal(p.loadingLineState,state,'Old exit cannot remove resumed activity');assert.equal(draw(true).attrs.opacity[0],1);
 draw(false);await flush();step(140);assert.equal(draw(false),null,'Completion retires only after the native fade');
 tree=draw(true);await flush();draw(false);assert.equal(p.loadingLineState,null,'Short work before reveal never flashes');step(16);assert.equal(timers.length,0);
 draw(true);await flush();step(16);draw(true);step(16);draw(true);draw(false);await flush();p.context='replacement';draw(true);const replacement=p.loadingLineState;step(140);assert.equal(p.loadingLineState,replacement,'Retired context exit cannot clear newer feedback');await flush();step(16);draw(true);step(16);draw(true);
 p.aggregate.presentationGeneration='new-provider';draw(true);const generated=p.loadingLineState;assert.notEqual(generated,replacement,'Provider generation retires the previous presentation');
 assert.equal(p.syncLoadingLine(false,cx,true),false,'Cold Loading immediately removes even an exiting warm line');assert.equal(p.loadingLineState,null);
 shown=false;assert.equal(draw(true),null,'Hide retires feedback immediately');shown=true;draw(true);await flush();enabled=false;assert.equal(draw(true),null,'Disable retires feedback immediately');enabled=true;while(timers.length)step(timers[0].ms);
 p.motionReduced=true;tree=draw(true);assert.equal(tree.attrs.opacity[0],0.35);assert.equal(tree.attrs.transition,undefined);assert.equal(animations(tree).length,0);assert.equal(draw(false),null);p.motionReduced=false;
 draw(true);await flush();p.renderClosed=true;p.loadingLineState=null;while(timers.length)step(timers[0].ms);assert.equal(p.loadingLineState,null,'Close rejects old arming callbacks');p.renderClosed=false;
 assert.ok(notifications>0);await Promise.all(jobs);
}
console.log('PASS cold Git feedback, zero-first-frame native line entrance/pulse/exit, overlap/resume, finite timers, retirement and reduced motion');
