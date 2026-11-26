import assert from 'node:assert/strict';
import {Publication,PresentationMemory} from '../src/plugins/git/mod/presentations.js';
import {rowHarness,find,words} from './support/git-row.mjs';
const memory=new PresentationMemory(),pub=new Publication();
pub.commit(['old']);assert.deepEqual(pub.project(['partial'],true),['old']);pub.commit(['new'],true);assert.deepEqual(pub.value,['old']);
const row=(n,state='open')=>({number:n,title:`PR ${n}`,state,url:`https://github.com/fixture/repo/pull/${n}`,headRefName:`branch-${n}`});
const e=(n,state='open')=>({link:{repo:'fixture/repo',number:n,key:`fixture/repo#${n}`,targets:[{terminal:'worker'}]},pr:{...row(n,state),key:`fixture/repo#${n}`,repo:'fixture/repo'},dirty:false});
memory.set('home',{machine:null,published:[[e(1).link.key,e(1)],[e(2,'merged').link.key,e(2,'merged')]],entries:[[e(1).link.key,e(1)],[e(2,'merged').link.key,e(2,'merged')]]});
const seed=memory.repository(null,'FIXTURE/REPO');assert.equal(seed.seed,true);assert.equal(seed.counts.open,1);assert.equal(seed.counts.closed,1);assert.equal(seed.pulls.open[0].key,undefined);
assert.equal(memory.repository('pc2','fixture/repo'),null);assert.equal(memory.repository(null,'another/repo'),null);
assert.equal(memory.repository(null,'fixture/repo',()=>false),null,'source generation refusal cannot seed a worker');
memory.get('home').entries.splice(0,1);assert.equal(memory.repository(null,'fixture/repo').pulls.open.length,0,'authoritative membership removal cannot resurrect a published task row');
for(let i=0;i<6;i++)memory.set(`repo-${i}`,{repository:true,pulls:{open:[row(i)]}});assert.equal(memory.size,4);
memory.set('oversize',{entries:Array(4097)});assert.equal(memory.size,0);
memory.set(JSON.stringify(['repository',null,'fixture/empty']),{repository:true,repo:{name:'fixture/empty'},pulls:{open:[],closed:[]},counts:{open:0,closed:0}});
assert.deepEqual(memory.repository(null,'fixture/empty').counts,{open:0,closed:0},'authoritative empty snapshot is warm, not absent');
memory.rememberFolder('/repo',null,'fixture/repo');assert.equal(memory.name('/repo',null),'fixture/repo');assert.equal(memory.name('/repo','pc2'),null);memory.clear();assert.equal(memory.folders.size,0);

let context={scope:'home',parent:'coordinator',machine:null,presentationGeneration:0,links:[1,2].map(n=>({url:row(n).url,terminal:`worker-${n}`}))};
const ownerContext=context;
let epoch=0,remoteReady=true;const calls=[];
const h=await rowHarness({host:{shared:()=>epoch,spaces:()=>[{id:'coordinator',machine:null}],machines:()=>remoteReady?[{name:'pc2',layout:'ready'}]:[],
 exec:(cmd,args,options)=>new Promise(resolve=>calls.push({cmd,args,options,resolve}))},
 modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','panel-kit.js':'src/ui/panel-kit.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:space=>space==='coordinator'?(context??ownerContext):context,pluginEvent(){}}}});
const {panel:p,place,cx}=h;cx.timer={after:()=>({cancel(){}})};
p.aggregate=new h.AggregatePulls({shown:()=>p.shown(),presentationEpoch:()=>epoch});
p.aggregate.context=context;p.aggregate.presentationGeneration=JSON.stringify([0,0]);p.aggregate.providerGeneration=0;
for(let n=1;n<=2;n++){const value=e(n);value.pr={...h.facts.pullRow({number:n,title:`Cached ${n}`,state:'OPEN',url:row(n).url},'fixture'),repo:'fixture/repo',key:value.link.key};p.aggregate.entries.set(value.link.key,value);}
p.aggregate.rememberCounts();p.context='tasks:home';p.aggregateGeneration=p.aggregate.presentationGeneration;
p.agentLinks={cachedRepository:()=> 'fixture/repo',related:()=>null,refresh(){}};p.notices={sync(){},presentation(){},stop(){}};p.enrollmentPicker={render(){},stop(){}};p.syncChecksFallback=()=>{};
Object.assign(place,{cwd:'/worktree-a',space:'worker-space-a',terminal:'worker-1',app:'a1',pullNumber:1});context=null;
let tree=h.render(()=>p.renderPanel(cx));
assert.ok(find(tree,'task-repo-header-fixture/repo'),'first destination frame has section');
assert.ok(find(tree,'pr-1'));assert.ok(find(tree,'pr-2'));assert.equal(find(tree,'active-pull'),undefined,'entry does not pin its matching PR');assert.equal(p.pinMotion.current,null);
assert.equal(find(tree,'git-empty'),undefined,'no body Loading');assert.ok(find(tree,'git-task-activity'),'existing header activity, not a new treatment');
assert.equal(p.counts.open,2);assert.equal(p.entrySeed,true);assert.equal(find(tree,'git-repo-name'),undefined);assert.equal(find(tree,'changes-header').attrs.on_mouse_down,undefined);
assert.equal(p.repositoryPublication.value.pulls.open.length,2);
for(let i=0;i<16;i++)await Promise.resolve();assert.equal(calls[0].cmd,'git');
// Root and canonical identity are independent from immediately painted data.
calls.shift().resolve({code:0,stdout:'/worktree-a'});for(let i=0;i<16;i++)await Promise.resolve();
const branch=calls.shift();assert.equal(branch.args[0],'symbolic-ref');branch.resolve({code:0,stdout:'branch-1'});for(let i=0;i<16;i++)await Promise.resolve();
tree=h.render(()=>p.renderPanel(cx));for(let i=0;i<16;i++)await Promise.resolve();
assert.ok(find(tree,'pr-1'));assert.equal(find(tree,'active-pull'),undefined);const canonical=calls.shift();assert.equal(canonical.cmd,'gh');canonical.resolve({code:0,stdout:JSON.stringify({nameWithOwner:'fixture/repo',url:'https://github.com/fixture/repo'})});
for(let i=0;i<16;i++)await Promise.resolve();
// Hold page one: warm rows survive and all requests stay on this machine/folder.
assert.equal(calls.at(-1).options.on,null);assert.equal(p.pulls.open.length,2);
tree=h.render(()=>p.renderPanel(cx));assert.ok(find(tree,'pr-2'));assert.equal(find(tree,'git-empty'),undefined);
// A coherent successful replacement changes rows and both totals in place.
const pageCall=calls.shift();assert.ok(pageCall.args.some(a=>a.startsWith('query=')));
pageCall.resolve({code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:19},closed:{totalCount:9},pullRequests:{nodes:[{number:7,title:'Fresh 7',state:'OPEN',url:'https://github.com/fixture/repo/pull/7',commits:{nodes:[{commit:{statusCheckRollup:null}}]}}],pageInfo:{endCursor:'next',hasNextPage:true}}}}})});
for(let i=0;i<40;i++)await Promise.resolve();tree=h.render(()=>p.renderPanel(cx));
assert.ok(find(tree,'pr-7'));assert.equal(find(tree,'pr-1'),undefined);assert.equal(p.counts.open,19);assert.equal(p.counts.closed,9);assert.equal(p.entrySeed,false);assert.equal(p.pages.open.cursor,'next');assert.equal(find(tree,'git-empty'),undefined);
// A second worker gets the same scoped order, never a new active pin.
Object.assign(place,{cwd:'/worktree-b',space:'worker-space-b',terminal:'worker-2',pullNumber:2});
tree=h.render(()=>p.renderPanel(cx));assert.ok(find(tree,'pr-7'));assert.equal(p.counts.open,19);assert.equal(p.pages.open.cursor,'next');assert.equal(find(tree,'active-pull'),undefined);assert.equal(p.pinMotion.current,null);assert.equal(find(tree,'git-empty'),undefined);
// A failed warm canonical refresh retains rows/counts/cursors and stops retrying until demand.
for(let i=0;i<20;i++)await Promise.resolve();const rootB=calls.shift();assert.equal(rootB.args[0],'rev-parse');rootB.resolve({code:0,stdout:'/worktree-b'});
for(let i=0;i<20;i++)await Promise.resolve();calls.shift().resolve({code:0,stdout:'branch-2'});for(let i=0;i<20;i++)await Promise.resolve();
h.render(()=>p.renderPanel(cx));for(let i=0;i<20;i++)await Promise.resolve();const failedIdentity=calls.shift();failedIdentity.resolve({code:1,stderr:'local command failed'});for(let i=0;i<40;i++)await Promise.resolve();
tree=h.render(()=>p.renderPanel(cx));assert.ok(find(tree,'pr-7'));assert.equal(p.counts.open,19);assert.equal(p.pages.open.cursor,'next');assert.equal(find(tree,'git-empty'),undefined);assert.ok(find(tree,'git-read-error'));assert.equal(calls.length,0,'failure does not create a render-driven retry loop');
// A direct return restores coordinator presentation with no fetch flash.
Object.assign(place,{space:'coordinator',terminal:'owner',cwd:'/home'});context={scope:'home',parent:'coordinator',machine:null,presentationGeneration:0,stale:true,links:[]};
tree=h.render(()=>p.renderPanel(cx));assert.ok(find(tree,'pr-fixture/repo#1'));assert.ok(find(tree,'task-repo-header-fixture/repo'));assert.equal(find(tree,'git-task-waiting'),undefined);assert.equal(find(tree,'active-pull'),undefined);
// A different machine cannot borrow that section, even with the same repo name.
context=null;Object.assign(place,{space:'remote-worker',terminal:'pc2/worker',cwd:'/worktree-a',on:'pc2'});
tree=h.render(()=>p.renderPanel(cx));assert.equal(find(tree,'pr-1'),undefined);assert.equal(p.counts,null);assert.ok(words(tree).join(' ').includes('Loading'));
// Off/on without an intermediate render invalidates the active seed and held root reply.
for(let i=0;i<20;i++)await Promise.resolve();const staleRoot=calls.shift();assert.equal(staleRoot.args[0],'rev-parse');epoch++;
staleRoot.resolve({code:0,stdout:'/stale-root'});for(let i=0;i<20;i++)await Promise.resolve();assert.equal(p.root,null,'old enable epoch cannot publish root after off/on');
tree=h.render(()=>p.renderPanel(cx));assert.equal(p.counts,null);assert.equal(find(tree,'pr-7'),undefined);assert.equal(p.aggregate.presentations.size,0);
remoteReady=false;const beforeOffline=calls.length;p.refresh(cx);for(let i=0;i<20;i++)await Promise.resolve();assert.equal(calls.length,beforeOffline,'disconnected machine starts no root or GitHub follow-ups');
// A seed's unselected tab is not a complete page. Its first selection reads
// real membership while keeping the seed visible until rows and totals settle.
let releaseClosed;const tab=await rowHarness({host:{exec:()=>new Promise(resolve=>{releaseClosed=resolve;})}}),v=tab.panel;
v.aggregate=null;v.sectionEntry=true;v.entrySeed=true;v.seedTabs={open:true,closed:true};
v.pulls={open:[tab.facts.pullRow({number:1,state:'OPEN'},'owner')],closed:[tab.facts.pullRow({number:2,state:'MERGED'},'owner')]};v.counts={open:1,closed:1};v.commitRepository();
v.setView('closed',tab.cx);assert.equal(v.pullsDue('closed'),true);v.loadPulls('closed',tab.cx);
for(let i=0;i<20;i++)await Promise.resolve();assert.equal(typeof releaseClosed,'function');assert.equal(v.repositoryPresentation().pulls.closed.length,1,'seed remains displayed during the real Closed request');
releaseClosed({code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:20},closed:{totalCount:0},pullRequests:{nodes:[],pageInfo:{endCursor:null,hasNextPage:false}}}}})});
for(let i=0;i<40;i++)await Promise.resolve();assert.equal(v.pulls.closed.length,0);assert.equal(v.counts.open,20);assert.equal(v.counts.closed,0);assert.equal(v.seedTabs.closed,false);assert.equal(v.seedTabs.open,true);assert.equal(v.entrySeed,false);
console.log('PASS shared warm entry, task seed provenance, header-only activity, no entry pin, coordinator return, cold/machine isolation and bounded pure memory');
