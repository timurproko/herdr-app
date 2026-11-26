import assert from 'node:assert/strict';
import {rowHarness,find,words,nodes,t} from './support/git-row.mjs';
let context={scope:'one',parent:'coordinator',stale:false,links:[{url:'https://github.com/fixture/a/pull/1',terminal:'worker',task:'task'}]};
const h=await rowHarness({modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}},'panel-kit.js':'src/ui/panel-kit.js'}});
const a=new h.AggregatePulls({shown:()=>true}),p=h.panel;a.context=context;p.aggregate=a;p.context='tasks:one';p.shown=()=>true;p.notices={sync(){},presentation(){}};p.enrollmentPicker={render(){}};p.syncChecksFallback=()=>{};
const entry=(repo,n,pr=true)=>({link:{repo,number:n,key:`${repo}#${n}`,targets:[{terminal:'worker'}]},dirty:false,pr:pr?{...h.facts.pullRow({number:n,title:'Old '+n,state:'OPEN'},'fixture'),repo,key:`${repo}#${n}`}:null});
const render=()=>h.render(()=>p.renderAggregate(h.cx,t));
const bodyLoading=tree=>find(tree,'git-task-waiting');const activity=tree=>find(tree,'git-loading-track');
a.entries.set('fixture/a#1',entry('fixture/a',1));a.entries.set('fixture/b#2',entry('fixture/b',2,false));
let tree=render();assert.ok(bodyLoading(tree));assert.equal(find(tree,'task-repo-header-fixture/a'),undefined);assert.equal(activity(tree),undefined);
assert.ok(tree.kids.indexOf(bodyLoading(tree))>tree.kids.indexOf(find(tree,'git-views')));assert.ok(tree.kids.indexOf(bodyLoading(tree))<tree.kids.indexOf(find(tree,'task-pulls-scroll')),'Cold Loading is above the scroller, never the footer');
// A failed sibling is visible immediately; it cannot leak the healthy cold row.
a.entries.get('fixture/b#2').error={kind:'read',message:'Fixture refusal; refresh to retry'};
tree=render();assert.equal(bodyLoading(tree),undefined);assert.ok(find(tree,'task-error-fixture/b'));assert.ok(find(tree,'pr-fixture/a#1'),'All first attempts settled; success may appear');assert.equal(a.countsLoading,true);
a.entries.set('fixture/c#3',entry('fixture/c',3,false));p.foldedRepositories.add('fixture/b');tree=render();assert.ok(bodyLoading(tree));assert.ok(find(tree,'task-error-fixture/b'),'Cold failure remains visible even with a saved fold');assert.equal(find(tree,'pr-fixture/a#1'),undefined);
for(const repo of ['fixture/a','fixture/b','fixture/c'])assert.equal(find(tree,`task-repo-header-${repo}`),undefined,'No repository header alongside cold Loading');
p.foldedRepositories.clear();
// A never-published partial visit must not reappear as a warm return.
a.rememberPresentation();assert.equal(a.presentations.get('one').published,null);
a.entries.delete('fixture/c#3');a.entries.delete('fixture/b#2');a.rememberCounts();assert.equal(a.hasPresentation,true);
// Full known list is frozen during a multi-repository background update.
a.entries.set('fixture/b#2',entry('fixture/b',2));a.rememberCounts();
a.entries.get('fixture/a#1').dirty=true;a.entries.get('fixture/b#2').dirty=true;
tree=render();assert.equal(bodyLoading(tree),undefined);assert.ok(find(activity(tree),'git-ci-line')?.attrs.loop);assert.equal(words(find(tree,'pr-fixture/a#1')).includes('Old 1'),true);
assert.ok(a.target(a.rows('open')[0]),'Healthy update retains an available worker target');
assert.equal(find(tree,'git-task-activity'),undefined);assert.equal(find(tree,'git-task-stale'),undefined);assert.equal(activity(tree).attrs.tooltip,undefined,'No replacement header tooltip');
a.entries.get('fixture/a#1').pr={...a.entries.get('fixture/a#1').pr,title:'Updated'};a.entries.get('fixture/a#1').dirty=false;
tree=render();assert.ok(words(find(tree,'pr-fixture/a#1')).includes('Old 1'),'Partial replacement remains staged');assert.equal(bodyLoading(tree),undefined);
a.entries.get('fixture/b#2').dirty=false;a.rememberCounts();tree=render();assert.equal(activity(tree),undefined);assert.ok(words(find(tree,'pr-fixture/a#1')).includes('Updated'));
// Warm new membership stays header-only even after a quiet deferred read.
a.entries.set('fixture/c#3',entry('fixture/c',3,false));a.entries.get('fixture/c#3').dirty=true;
tree=render();assert.equal(bodyLoading(tree),undefined);assert.ok(activity(tree));assert.equal(find(tree,'task-repo-header-fixture/c'),undefined);
a.readWake={due:Date.now()+100000};tree=render();assert.equal(activity(tree),undefined,'Quiet cooldown is not an endlessly active warm request');assert.equal(bodyLoading(tree),undefined);assert.ok(find(tree,'pr-fixture/a#1'));
// Verification keeps prior list but grants no worker target and no Stale text.
context={...context,stale:true,loading:true,verification:{reason:'transport-error',at:1000,generation:7}};a.context=context;tree=render();assert.equal(bodyLoading(tree),undefined);assert.ok(activity(tree));assert.doesNotMatch(words(tree).join(' '),/Stale|Loading/);
assert.equal(a.target(a.rows('open')[0]),null,'Unverified activity still refuses worker actions');
assert.equal(activity(tree).attrs.tooltip,undefined,'Removed header diagnostic tooltip has no replacement');
context={...context,loading:false};a.context=context;assert.equal(activity(render()),undefined,'Failed verification waiting for retry has no active animation');
context={...context,stale:false};a.context=context;a.fallbackBusy=true;tree=render();assert.ok(activity(tree),'Safety updates use the same line');a.fallbackBusy=false;
// Real return-memory restoration includes the published snapshot, not partial facts.
a.context=context;a.rememberPresentation();const saved=a.presentations.get('one');assert.ok(saved.published.length===2);
a.published=null;a.entries.clear();context={scope:'other',parent:'other',links:[]};a.context=context;
context={scope:'one',parent:'coordinator',stale:true,loading:true,links:[]};a.sync(h.cx);tree=render();assert.equal(bodyLoading(tree),undefined);assert.ok(activity(tree));assert.ok(find(tree,'pr-fixture/a#1'));assert.equal(a.target(a.rows('open')[0]),null);
// Headerless cold failures still use measured, capped reveal (not an unbounded
// second list). Saved folds cannot suppress these notices.
a.entries.clear();a.published=null;a.lastCounts=null;a.fallbackBusy=false;context={scope:'cold-notices',parent:'coordinator',stale:false,links:[]};a.context=context;
for(let n=0;n<140;n++){const repo=`fixture/failed-${n}`,e=entry(repo,n,false);e.error={kind:'read',message:`${repo}: Refresh to retry`};a.entries.set(repo,e);p.foldedRepositories.add(repo);}
a.entries.set('unread',entry('fixture/unread',999,false));tree=render();while(p.selectedTaskWindow.revealMore())tree=render();
assert.ok(bodyLoading(tree));assert.equal(p.selectedTaskWindow.range().items.length,100);assert.equal(p.selectedTaskWindow.leading,0);
assert.ok(p.selectedTaskWindow.canTurn);assert.equal(nodes(tree).filter(n=>n.attrs.id?.[0]?.startsWith('task-repo-header-')).length,0);
assert.equal(nodes(tree).filter(n=>n.attrs.id?.[0]?.startsWith('task-error-')).length,100);
p.nextTaskChunk(p.selectedTaskWindow,context.scope,h.cx);tree=render();while(p.selectedTaskWindow.revealMore())tree=render();assert.equal(p.selectedTaskWindow.range().items.length,40);
console.log('PASS cold coherent inventory, immediate failures, no partial return leak, warm atomic replacement/header-only native activity, quiet cooldown, retained verification and action refusal');
