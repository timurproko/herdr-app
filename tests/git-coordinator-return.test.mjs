import assert from 'node:assert/strict';
import {rowHarness,find,t} from './support/git-row.mjs';
let context={scope:'a',parent:'space-a',machine:null,presentationGeneration:0,links:[]},epoch=0;
const h=await rowHarness({modules:{'panel-kit.js':'src/ui/panel-kit.js','aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
const a=new h.AggregatePulls({shown:()=>true,presentationEpoch:()=>epoch});a.fallbackBusy=true;
const add=(n=1)=>{for(let i=1;i<=n;i++){const repo='fixture/repo',key=`${repo}#${i}`;context.links.push({url:`https://github.com/${repo}/pull/${i}`,terminal:'worker'});a.entries.set(key,{link:{repo,number:i,key,targets:[{terminal:'worker'}]},pr:{...h.facts.pullRow({number:i,title:'Known',state:'OPEN'},'fixture'),repo,key},dirty:false});}a.rememberCounts();};
a.sync(h.cx);add();const original=a.rows('open')[0];context=null;a.sync(h.cx);assert.equal(a.entries.size,0);assert.equal(a.presentations.size,1);
context={scope:'a',parent:'space-a',machine:null,presentationGeneration:0,stale:true,links:[]};a.sync(h.cx);assert.equal(a.rows('open')[0],original,'Unverified return retains same-home presentation only');assert.equal(a.target(original),null,'Cached targets grant no worker authority');
context.stale=false;context.links=[{url:'https://github.com/fixture/repo/pull/1',terminal:'worker'}];a.sync(h.cx);assert.equal(a.rows('open').length,1);
context=null;a.sync(h.cx);epoch++;context={scope:'a',parent:'space-a',presentationGeneration:0,links:[]};a.sync(h.cx);assert.equal(a.entries.size,0,'Git off/on generation cannot resurrect inventory');
add();context=null;a.sync(h.cx);context={scope:'a',parent:'space-a',presentationGeneration:1,links:[]};a.sync(h.cx);assert.equal(a.entries.size,0,'Provider off/on invalidates runtime memory even without intermediate render');
for(let i=0;i<6;i++){context={scope:'scope-'+i,parent:'space-'+i,presentationGeneration:1,links:[]};a.sync(h.cx);add();}
assert.ok(a.presentations.size<=4);
context=null;a.sync(h.cx);assert.ok(a.presentations.size<=4);a.stop();assert.equal(a.presentations.size,0);
context={scope:'loading',links:[]};a.context=context;
a.entries.set('unknown',{link:{repo:'fixture/unknown',targets:[{terminal:'worker'}]},pr:null});
const {panel}=h;panel.context='tasks:loading';panel.aggregate=a;panel.shown=()=>true;panel.notices={sync(){},presentation(){}};panel.enrollmentPicker={render(){}};panel.syncChecksFallback=()=>{};
let tree=h.render(()=>panel.renderAggregate(h.cx,t));assert.equal(find(tree,'task-repo-header-fixture/unknown'),undefined);assert.ok(find(tree,'git-task-waiting'));assert.ok(find(tree,'git-task-empty'));
a.entries.get('unknown').error={kind:'read',message:'Read failed'};tree=h.render(()=>panel.renderAggregate(h.cx,t));assert.ok(find(tree,'task-repo-header-fixture/unknown'));assert.ok(find(tree,'task-error-fixture/unknown'));assert.equal(find(tree,'git-task-loading'),undefined);
// Re-entry gets a new native window/measurement owner but retains pure reveal/anchor facts.
const sections=[{repo:'fixture/repo',rows:Array.from({length:30},(_,i)=>({key:`fixture/repo#${i}`}))}];
let w=panel.taskSections(sections,'scroll-a').window;while(w.revealMore()){}w.observe(700,400);const depth=w.limit;
panel.taskSections(sections,'scroll-b');w=panel.taskSections(sections,'scroll-a').window;
assert.equal(w.offset,700);assert.equal(w.limit,depth);assert.equal(w.correction.to,700,'New native handle must receive the saved anchor, not start at zero');assert.equal(w.handle,undefined);
a.presentationGeneration='new-enable-generation';const replacement=panel.taskSections(sections,'scroll-a').window;
assert.notEqual(replacement,w,'Off/on renews native measurement/safety owners even for the same scope');
console.log('PASS bounded same-home return, stale action refusal, Git/provider generation invalidation, one panel Loading and visible actionable cold failure');
