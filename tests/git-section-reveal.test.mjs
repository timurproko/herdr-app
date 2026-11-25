import assert from 'node:assert/strict';
import {rowHarness,find,t} from './support/git-row.mjs';
import {taskWindow} from './support/git-scroll.mjs';
import {assertTaskSections} from './support/git-section-invariant.mjs';
const context={scope:'sections-home',links:[]};
const h=await rowHarness({modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
const {panel}=h,jobs=[];
const cx={notify(){},stop_propagation(){},spawn(fn){jobs.push(fn(cx));},timer:{after(){}}};
panel.context='tasks:sections-home';panel.shown=()=>true;
panel.aggregate=new h.AggregatePulls({shown:()=>true});panel.aggregate.context=context;
panel.notices={sync(){},presentation(){}};panel.enrollmentPicker={render(){},stop(){}};panel.syncChecksFallback=()=>{};
function add(repo,number,state='OPEN') {
 const pr={...h.facts.pullRow({number,title:`PR ${number}`,state,author:{login:'fixture'}},'owner'),repo,key:`${repo}#${number}`};
 const entry={pr,link:{repo,number,targets:[{historical:true}]},completedAt:Date.now()-1000};panel.aggregate.entries.set(pr.key,entry);return entry;
}
for(let n=1;n<=8;n++)add('owner/a',n);
const boundary=add('owner/b',9),notice=add('owner/c',10);notice.pr=null;notice.error={kind:'transient',message:'Refresh to retry'};
add('owner/other-tab',11,'CLOSED');
const render=()=>{const tree=h.render(()=>panel.renderAggregate(cx,t));assertTaskSections(tree,panel);return tree;};
let tree=render();assert.ok(find(tree,'task-repo-owner/a'));assert.equal(find(tree,'task-repo-owner/b'),undefined,'Tenth-item header waits for its first row');
const revealAll=()=>{let count=0;while(taskWindow(panel).revealMore()){tree=render();assert.ok(++count<100);}tree=render();};
revealAll();assert.ok(find(tree,'pr-owner/b#9'));assert.equal(find(tree,'task-repo-owner/c'),undefined,'Unknown historical state belongs only to Closed');
panel.setView('closed',cx);tree=render();revealAll();assert.ok(find(tree,'task-error-owner/c'),'A visible notice alone is valid section content');assert.equal(find(tree,'task-repo-owner/a'),undefined);
panel.setView('open',cx);tree=render();
// State moves remove the old-tab header, and the new tab reveals it with content.
boundary.pr={...boundary.pr,state:'closed'};tree=render();assert.equal(find(tree,'task-repo-owner/b'),undefined);
panel.setView('closed',cx);tree=render();revealAll();assert.ok(find(tree,'pr-owner/b#9'));
// Expired history, authoritative absence, and resolved notices cannot leave headers.
boundary.completedAt=Date.now()-86400001;tree=render();assert.equal(find(tree,'task-repo-owner/b'),undefined);
notice.error=null;notice.missing=true;tree=render();assert.equal(find(tree,'task-repo-owner/c'),undefined);
for(const entry of panel.aggregate.entries.values())if(entry.link.repo==='owner/other-tab'){entry.pr=null;entry.missing=true;}
tree=render();assert.equal(find(tree,'task-repo-owner/other-tab'),undefined);assert.equal(panel.aggregate.rows('closed').length,0);assert.equal(taskWindow(panel).range().items.length,0);
panel.setView('open',cx);tree=render();
find(tree,'task-repo-header-owner/a').attrs.on_click[0]({},cx);tree=render();assert.ok(find(tree,'task-repo-header-owner/a'));assert.equal(find(tree,'task-repo-body-owner/a'),undefined);
find(tree,'task-repo-header-owner/a').attrs.on_click[0]({},cx);tree=render();revealAll();
// A refresh can place a header exactly at the retained boundary as well.
for(const [key,entry] of panel.aggregate.entries)if(entry.link.repo==='owner/a'&&entry.pr.number>7)panel.aggregate.entries.delete(key);
add('owner/b',12);tree=render();revealAll();
// Exercise every reveal/cap boundary through a header-heavy 200-row inventory,
// including batch starts in the middle of a repository and the final cycle.
for(let n=20;n<220;n++)add(`owner/repo-${String(Math.floor(n/3)).padStart(3,'0')}`,n);
let seen=new Set();
for(let batch=0;batch<10;batch++) {
 tree=render();revealAll();const window=taskWindow(panel);for(const row of window.range().revealedRows)seen.add(row.key);
 assert.ok(window.range().revealedRows.length<=60);assert.ok(window.range().items.length<=100);
 if(!window.more){panel.nextTaskChunk(window,context.scope,cx);tree=render();assert.equal(window.start,0);break;}
 assert.ok(window.canTurn);panel.nextTaskChunk(window,context.scope,cx);tree=render();
}
assert.equal(seen.size,208);
// A new repository arriving before a full batch cannot leave its deferred
// first row's header behind, nor evict the batch's already revealed PRs.
revealAll();const retained=taskWindow(panel).range().revealedRows.map(row=>row.key);assert.equal(retained.length,60);
add('aaa/new-repo',999);tree=render();assert.equal(find(tree,'task-repo-aaa/new-repo'),undefined);
assert.deepEqual(taskWindow(panel).range().revealedRows.map(row=>row.key),retained);assert.ok(taskWindow(panel).canTurn);
// The independent 100-item cap must retain rows too, even below 60 PRs.
panel.aggregate.entries.clear();context.scope='header-heavy-home';panel.context='tasks:header-heavy-home';
for(let n=0;n<50;n++)add(`owner/single-${String(n).padStart(2,'0')}`,n);
tree=render();revealAll();const itemCapped=taskWindow(panel).range().revealedRows.map(row=>row.key);assert.equal(itemCapped.length,50);assert.equal(taskWindow(panel).range().items.length,100);
add('aaa/header-heavy-arrival',1000);tree=render();assert.equal(find(tree,'task-repo-aaa/header-heavy-arrival'),undefined);
assert.deepEqual(taskWindow(panel).range().revealedRows.map(row=>row.key),itemCapped);assert.ok(taskWindow(panel).canTurn);
await Promise.all(jobs);
console.log('PASS unfolded-section invariant after every reveal, refresh, tab move, expiry, absence, notice resolution, fold and capped batch cycle');
