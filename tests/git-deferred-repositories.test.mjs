import assert from 'node:assert/strict';
import {rowHarness,find,words,t} from './support/git-row.mjs';
import {TaskReveal} from '../src/plugins/git/mod/task-reveal.js';
import {assertTaskSections} from './support/git-section-invariant.mjs';
import {loadMod} from '../tools/plugin-harness.mjs';
import {deferredFleet} from './fixtures/deferred-fleet.mjs';
const context={scope:'home',machine:null,links:[]};
const jobs=[],timers=[],calls=[];let now=1000000,shown=true;
const held=[];
const h=await rowHarness({globals:{Date:class extends Date{static now(){return now;}}},host:{exec:async(_cmd,args,options)=>{
  calls.push(args);
  return await new Promise(resolve=>held.push({args,options,resolve}));
}},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}},
  'panel-kit.js':'src/ui/panel-kit.js'}});
const cx={...h.cx,spawn:fn=>{const job=Promise.resolve().then(()=>fn(cx));jobs.push(job);return job;},timer:{after(ms,fn){timers.push({at:now+ms,fn});}}};
const aggregate=new h.AggregatePulls({shown:()=>shown});
const entry=(repo,number,extra={})=>({link:{repo,number,key:`${repo}#${number}`,targets:[{terminal:'t1'}]},pr:null,error:null,...extra});
aggregate.context=context;
aggregate.entries.set('owner/repo#1',entry('owner/repo',1,{dirty:true}));
assert.equal(aggregate.loading('owner/repo'),true,'Queued cold PR stays unresolved');
assert.equal(aggregate.countsLoading,true);assert.deepEqual({...aggregate.counts()},{open:null,closed:null});
aggregate.entries.get('owner/repo#1').dirty=false;
assert.equal(aggregate.loading('owner/repo'),true,'In-flight cold PR stays unresolved even after dirty clears');
aggregate.entries.get('owner/repo#1').error={kind:'read',message:'Read failed'};
assert.equal(aggregate.loading('owner/repo'),false,'Actionable notice is not replaced with Loading');
assert.equal(aggregate.countsLoading,true,'Cold actionable failures cannot turn partial totals into exact totals');
aggregate.entries.get('owner/repo#1').missing=true;
assert.equal(aggregate.countsLoading,false);assert.equal(aggregate.loading('owner/repo'),false);
aggregate.entries.clear();aggregate.entries.set('owner/repo#1',entry('owner/repo',1,{pr:{state:'open'}}));
aggregate.rememberCounts();aggregate.entries.get('owner/repo#1').dirty=true;
assert.equal(aggregate.loading('owner/repo'),false);assert.deepEqual({...aggregate.counts()},{open:1,closed:0});
aggregate.entries.set('owner/repo#2',entry('owner/repo',2));
assert.equal(aggregate.countsLoading,true);assert.deepEqual({...aggregate.counts()},{open:1,closed:0},'New unread membership retains compatible last-complete counts');
aggregate.entries.delete('owner/repo#1');assert.deepEqual({...aggregate.counts()},{open:0,closed:0},'Removed membership is not retained in counts');
aggregate.stop();assert.equal(aggregate.lastCounts,null);
console.log('PASS cold queued/in-flight/error/missing completeness and warm/new/removed membership count projection');

// Actual render + atomic prefix: Loading is real content, never a PR/safety row.
const {panel}=h;panel.context='tasks:home';panel.shown=()=>shown;panel.aggregate=aggregate;aggregate.context=context;
panel.notices={sync(){},presentation(){}};panel.enrollmentPicker={render(){},stop(){}};panel.syncChecksFallback=()=>{};
aggregate.entries.set('owner/loading#1',entry('owner/loading',1));
const render=()=>{const tree=h.render(()=>panel.renderAggregate(cx,t));assertTaskSections(tree,panel);return tree;};
let tree=render();assert.equal(words(find(tree,'task-loading-owner/loading')).join(' '),'Loading');
for(const state of ['open','closed'])assert.match(find(tree,`git-view-${state}`).attrs.accessibility_label[0],/0 \(loading\)/);
const headerId='task-repo-header-owner/loading',listId=panel.selectedTaskWindow.key;
panel.foldedRepositories.add('owner/loading');tree=render();assert.ok(find(tree,headerId));assert.equal(find(tree,'task-loading-owner/loading'),undefined);
panel.foldedRepositories.clear();tree=render();
const e=aggregate.entries.get('owner/loading#1');e.pr={...h.facts.pullRow({number:1,title:'Arrived',state:'OPEN'},'fixture'),repo:'owner/loading',key:'owner/loading#1'};
tree=render();assert.ok(find(tree,headerId));assert.ok(find(tree,'pr-owner/loading#1'));assert.equal(find(tree,'task-loading-owner/loading'),undefined);assert.equal(panel.selectedTaskWindow.key,listId);
const reveal=new TaskReveal(),sections=Array.from({length:80},(_,i)=>({repo:`owner/r${i}`,rows:[],loading:true}));
reveal.project(sections,new Set(),28,2,'130');
while(reveal.revealMore()){}
assert.equal(reveal.range().items.length,100);assert.equal(reveal.range().revealedRows.length,0);assert.equal(reveal.atCap,true);
for(let i=0;i<reveal.range().items.length;i+=2){assert.ok(reveal.range().items[i].header);assert.ok(reveal.range().items[i+1].loading);}
const boundary=new TaskReveal();boundary.project([{repo:'owner/a',rows:Array.from({length:8},(_,i)=>({key:`owner/a#${i}`}))},{repo:'owner/b',rows:[],loading:true}],new Set(),28,2,'130');
assert.equal(boundary.range().items.length,9,'Boundary header waits for Loading body');boundary.revealMore();assert.equal(boundary.range().items.at(-1).loading,true);
const anchor=new TaskReveal();const loaded=[{repo:'owner/a',rows:[{key:'owner/a#1'}]},{repo:'owner/b',rows:[],loading:true},{repo:'owner/c',rows:[{key:'owner/c#1'}]}];
anchor.project(loaded,new Set(),28,2,'130');anchor.observe(200,100);const prior=anchor.offset;
loaded[1]={repo:'owner/b',rows:[{key:'owner/b#1'},{key:'owner/b#2'}]};anchor.project(loaded,new Set(),28,2,'130');
assert.ok(anchor.offset>prior);assert.ok(anchor.correction,'Arrival preserves the surviving lower repository anchor');
await Promise.all(jobs);
console.log('PASS standard Loading, incomplete badges, folded/header/list continuity, atomic boundaries, 100-item cap and surviving scroll anchor');

// Real Crew verification/admission, aggregate, read queue and renderer; only
// transport, clock and native builders are synthetic. Healthy replies complete
// before the refusal so machine-shared cooldown does not prevent those replies.
const fixture=deferredFleet(now),state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
const provider=await loadMod({host:{shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>fixture.groups,panes:()=>fixture.all,terminals:()=>fixture.list,machines:()=>[{name:null,layout:'ready'}],checking:()=>false},
  globals:{Date:class extends Date{static now(){return now;}}},modules:{'space-color-state.js':{currentSpaceColor:()=>null}},entry:'export {refreshFleets,fleetPullContext} from "./plugins/crew/fleet.js";'});
provider.refreshFleets(cx,async()=>JSON.stringify(fixture.status));await Promise.all(jobs);
const admitted=provider.fleetPullContext('coordinator');assert.equal(admitted.stale,false);assert.equal(admitted.links.length,9);
Object.assign(context,admitted);aggregate.stop();aggregate.sync(cx);panel.context=`tasks:${context.scope}`;
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};await flush();assert.equal(held.length,3);
const respond=(repository,result)=>{const at=held.findIndex(r=>r.options.env.GH_REPO===repository);assert.ok(at>=0,`Expected pending ${repository}`);held.splice(at,1)[0].resolve(result);};
const healthy=repository=>({code:0,stdout:JSON.stringify({data:{repository:Object.fromEntries(fixture.rows.filter(r=>r.url.toLowerCase().includes(`/${repository.toLowerCase()}/`)).map(r=>[`pr${r.number}`,r]))}})});
respond('timurproko/crew',healthy('timurproko/crew'));respond('timurproko/myworkflows',healthy('timurproko/myworkflows'));await flush();
respond('timurproko/herdr-app',{code:1,stderr:'You have exceeded a secondary rate limit'});await flush();
const allVisible=()=>{let out=render();while(panel.selectedTaskWindow.revealMore())out=render();return out;};
tree=allVisible();assert.ok(find(tree,'task-repo-header-timurproko/herdr-app'));assert.ok(find(tree,'task-loading-timurproko/herdr-app'));
assert.equal(aggregate.rows('open').length,2);assert.equal(aggregate.rows('closed').length,5);
assert.deepEqual({...aggregate.counts()},{open:null,closed:null});assert.doesNotMatch(words(tree).join(' '),/rate limit|Could not read|Stale/);
for(const tab of ['open','closed']){assert.equal(words(find(tree,`git-view-${tab}-count`)).join(''),'0');assert.match(find(tree,`git-view-${tab}-count`).attrs.tooltip[0],/Count loading; showing 0/);}
panel.view='closed';tree=allVisible();assert.ok(find(tree,'task-loading-timurproko/herdr-app'));assert.equal(aggregate.rows('closed').length,5);
panel.view='open';tree=allVisible();const selectedWindow=panel.selectedTaskWindow,readsBefore=calls.length;
const due=aggregate.readWake.due;now=due-1;aggregate.pump(cx);await flush();assert.equal(calls.length,readsBefore,'No automatic read before cooldown ends');
now=due;timers.find(w=>w.at===due).fn(cx);await flush();assert.equal(held.length,1,'Cold aggregate retries without another event');
respond('timurproko/herdr-app',healthy('timurproko/herdr-app'));await flush();tree=allVisible();
assert.ok(find(tree,'pr-timurproko/herdr-app#74'));assert.ok(find(tree,'pr-timurproko/herdr-app#76'));assert.equal(find(tree,'task-loading-timurproko/herdr-app'),undefined);
assert.equal(panel.selectedTaskWindow,selectedWindow);assert.deepEqual({...aggregate.counts()},{open:4,closed:5});
assert.equal(find(tree,'git-view-open-count').attrs.tooltip,undefined);
// Newly admitted membership retains compatible known totals, explicitly loading.
context.links.push({url:'https://github.com/other/new/pull/99',terminal:'t9'});aggregate.sync(cx);await flush();tree=allVisible();
assert.equal(words(find(tree,'git-view-open-count')).join(''),'4');assert.match(find(tree,'git-view-open-count').attrs.tooltip[0],/Count loading; showing 4/);
respond('other/new',{code:1,stderr:'secondary rate limit'});await flush();
// Warm repository refusal retains facts and never replaces them with Loading.
aggregate.refresh(cx);await flush();if(held.length)respond(held[0].options.env.GH_REPO,{code:1,stderr:'secondary rate limit'});await flush();tree=allVisible();
assert.ok(find(tree,'pr-timurproko/herdr-app#74'));assert.equal(find(tree,'task-loading-timurproko/herdr-app'),undefined);
shown=false;const beforeHide=calls.length;now=aggregate.readWake.due;timers.filter(w=>w.at<=now).forEach(w=>w.fn(cx));await flush();assert.equal(calls.length,beforeHide,'Hidden scope cannot retry');
shown=true;context.scope='replacement-home';context.links=[];aggregate.sync(cx);assert.deepEqual({...aggregate.counts()},{open:0,closed:0});assert.equal(aggregate.lastCounts.size,0);
await Promise.all(jobs);
console.log('PASS report-equivalent verified mixed fleet: herdr-app Loading with Open 0/Closed 0 loading instead of partial 2/5, automatic exact-deadline retry to both PRs and 4/5, warm retention and hidden/superseded guards');
