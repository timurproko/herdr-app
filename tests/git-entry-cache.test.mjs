import assert from 'node:assert/strict';
import {Publication,PresentationMemory} from '../src/plugins/git/mod/presentations.js';
import {rowHarness,find,words} from './support/git-row.mjs';
const memory=new PresentationMemory(),pub=new Publication();
pub.commit(['old']);assert.deepEqual(pub.project(['partial'],true),['old']);pub.commit(['new'],true);assert.deepEqual(pub.value,['old']);
const row=(n,state='open')=>({number:n,title:`PR ${n}`,state,url:`https://github.com/fixture/repo/pull/${n}`,headRefName:`branch-${n}`});
const e=(n,state='open')=>({link:{repo:'fixture/repo',number:n,key:`fixture/repo#${n}`,targets:[{terminal:'worker'}]},pr:{...row(n,state),key:`fixture/repo#${n}`,repo:'fixture/repo'},dirty:false});
memory.set('home',{machine:null,published:[[e(1).link.key,e(1)],[e(2,'merged').link.key,e(2,'merged')]],entries:[1,2]});
const seed=memory.repository(null,'FIXTURE/REPO');assert.equal(seed.seed,true);assert.equal(seed.counts.open,1);assert.equal(seed.counts.closed,1);assert.equal(seed.pulls.open[0].key,undefined);
assert.equal(memory.repository('pc2','fixture/repo'),null);assert.equal(memory.repository(null,'another/repo'),null);
for(let i=0;i<6;i++)memory.set(`repo-${i}`,{repository:true,pulls:{open:[row(i)]}});assert.equal(memory.size,4);
memory.set('oversize',{entries:Array(4097)});assert.equal(memory.size,0);
memory.rememberFolder('/repo',null,'fixture/repo');assert.equal(memory.name('/repo',null),'fixture/repo');assert.equal(memory.name('/repo','pc2'),null);memory.clear();assert.equal(memory.folders.size,0);

let context={scope:'home',parent:'coordinator',machine:null,presentationGeneration:0,links:[1,2].map(n=>({url:row(n).url,terminal:`worker-${n}`}))};
let epoch=0;const calls=[];
const h=await rowHarness({host:{shared:()=>epoch,spaces:()=>[{id:'coordinator',machine:null}],machines:()=>[],
 exec:(cmd,args,options)=>new Promise(resolve=>calls.push({cmd,args,options,resolve}))},
 modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','panel-kit.js':'src/ui/panel-kit.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
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
// A direct return restores coordinator presentation with no fetch flash.
Object.assign(place,{space:'coordinator',terminal:'owner',cwd:'/home'});context={scope:'home',parent:'coordinator',machine:null,presentationGeneration:0,stale:true,links:[]};
tree=h.render(()=>p.renderPanel(cx));assert.ok(find(tree,'pr-fixture/repo#1'));assert.ok(find(tree,'task-repo-header-fixture/repo'));assert.equal(find(tree,'git-task-waiting'),undefined);assert.equal(find(tree,'active-pull'),undefined);
// A different machine cannot borrow that section, even with the same repo name.
context=null;Object.assign(place,{space:'remote-worker',terminal:'pc2/worker',cwd:'/worktree-a',on:'pc2'});
tree=h.render(()=>p.renderPanel(cx));assert.equal(find(tree,'pr-1'),undefined);assert.equal(p.counts,null);assert.ok(words(tree).join(' ').includes('Loading'));
console.log('PASS shared warm entry, task seed provenance, header-only activity, no entry pin, coordinator return, cold/machine isolation and bounded pure memory');
