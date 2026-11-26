// Empty/unverified coordinator memory must never substitute for a worker read.
import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,find,t} from './support/git-row.mjs';
const tick=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
for(const seed of ['none','empty','unverified'])for(const orphan of [false,'root','page']) {
 const calls=[],tasks=[];
 const h=await rowHarness({host:{shared:()=>0,spaces:()=>[],exec:(cmd,args,options)=>new Promise(resolve=>calls.push({cmd,args,options,resolve}))},modules:{
  'aggregate.js':'src/plugins/git/mod/aggregate.js','panel-kit.js':'src/ui/panel-kit.js',
  'plugins.js':{sidebarPanelEnabled:()=>true,pluginEvent(){},pluginPullContext:space=>space==='coordinator'?{parent:'coordinator',scope:'home',stale:true,links:[]}:null},
 }}),p=h.panel;
 h.cx.spawn=fn=>{const task={done:false,is_done(){return this.done;}};tasks.push(task);Promise.resolve().then(()=>fn(h.cx)).finally(()=>task.done=true);return task;};
 p.aggregate=new h.AggregatePulls({shown:()=>p.shown()});p.aggregate.sync(h.cx);p.repositoryGeneration=p.aggregate.presentationGeneration;
 p.agentLinks={cachedRepository:()=> 'owner/repo',related:()=>null,refresh(){},pullNumber:()=>94};
 p.notices={sync(){},stop(){}};p.webhooks={sync(){},stop(){}};p.enrollmentPicker={stop(){}};p.syncChecksFallback=()=>{};
 if(seed!=='none')p.aggregate.presentations.set(JSON.stringify(['repository',null,'owner/repo']),{
  repository:true,repo:{name:'owner/repo'},root:'/repo',seed:seed==='unverified',seedTabs:{open:true,closed:true},source:{parent:'coordinator',scope:'home',machine:null},pulls:{open:null,closed:null},counts:{open:0,closed:0},pullsAt:{open:123,closed:123},
 });
 Object.assign(h.place,{cwd:'/worker',space:'worker',terminal:'builder',app:'codex'});
 h.render(()=>p.renderPanel(h.cx));await tick();let root=calls.shift();assert.equal(root.cmd,'git');assert.equal(root.args[0],'rev-parse');
 if(orphan==='root'){
  // A native deadline can end a Task before finally clears the busy latch.
  p.rootRequest.task.done=true;h.render(()=>p.renderPanel(h.cx));await tick();const replacement=calls.shift();assert.ok(replacement,'A definitively ended root task cannot strand Loading');
  root.resolve({code:0,stdout:'/obsolete'});await tick();root=replacement;assert.notEqual(p.root,'/obsolete');
 }
 root.resolve({code:0,stdout:'/worker'});await tick();const branch=calls.shift();assert.equal(branch.args[0],'symbolic-ref');branch.resolve({code:0,stdout:'fix/visual'});await tick();
 h.render(()=>p.renderPanel(h.cx));await tick();const repo=calls.shift();assert.ok(repo,`${seed}: own canonical repository read starts`);assert.equal(repo.args[0],'repo');
 repo.resolve({code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo'})});await tick();let page=calls.shift();assert.ok(page,`${seed}: zero counts do not mean the page is loaded`);
 if(orphan==='page'){
  p.pullRequest.task.done=true;h.render(()=>p.renderPanel(h.cx));await tick();const replacement=calls.shift();assert.ok(replacement,'A definitively ended page task cannot strand Loading');
  page.resolve({code:0,stdout:'{}'});await tick();assert.equal(p.pulls.open,null,'An obsolete page cannot publish or settle its replacement');assert.equal(p.pullLoading,true);page=replacement;
 }
 page.resolve({code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:0},pullRequests:{nodes:[{number:94,title:'Draft visual correction',state:'OPEN',isDraft:true,headRefName:'fix/visual',url:'https://github.com/owner/repo/pull/94',labels:[],commits:{nodes:[]}}],pageInfo:{endCursor:null,hasNextPage:false}}}}})});await tick();
 const tree=h.render(()=>p.renderPanel(h.cx));assert.equal(p.pullLoading,false);assert.equal(p.loading,false);assert.equal(p.pulls.open[0].state,'draft');assert.equal(p.counts.open,1);assert.equal(find(tree,'git-empty'),undefined);
 const pin=find(tree,'active-pull'),header=find(tree,'task-repo-header-owner/repo');assert.ok(pin);assert.ok(find(pin,'pr-94'),'Selected draft pins inside its repository section');
 const geometry=rowGeometry(tree,320,1,500);assert.ok(geometry.get(header).y+geometry.get(header).height<=geometry.get(pin).y);assert.equal(p.pinMotion.current,null,'Entry pins without click-only motion');
 assert.equal(calls.length,0);
}
// Repeated orphaning stops automatic demand, but Refresh remains reachable even
// when the first root was never established. The retry budget is context-local.
{
 const calls=[],h=await rowHarness({host:{exec:(cmd,args)=>new Promise(resolve=>calls.push({cmd,args,resolve}))}}),p=h.panel;
 p.context=JSON.stringify([h.place.cwd,h.place.on]);p.syncAggregate=()=>false;p.syncAgent=()=>{};p.syncWebhooks=()=>{};p.loadRelatedPull=()=>{};p.agentLinks={refresh(){}};p.notices={sync(){},retryNow(){}};p.enrollmentPicker={stop(){}};p.syncChecksFallback=()=>{};p.root=null;p.repo=null;p.counts=null;
 p.orphanReadRetries.add('root');p.loading=true;p.rootRequest={task:{is_done:()=>true}};p.recoverReadTasks();
 assert.match(p.error,/interrupted; refresh to retry/);p.refresh(h.cx);await tick();assert.equal(calls.length,0,'Existing lifecycle ticks cannot retry a repeatedly abandoned root');
 h.cx.timer={after(){return {cancel(){}};}};p.headerHovered=true;const tree=h.render(()=>p.renderPanel(h.cx));const refresh=find(tree,'git-refresh');assert.ok(refresh,'Rootless interrupted entry still has a manual Refresh action');
 refresh.attrs.on_click[0]({},h.cx);await tick();assert.equal(calls[0].args[0],'rev-parse','Explicit Refresh permits a guarded retry');
 p.resetRepository();assert.equal(p.orphanReadRetries.size,0,'A new repository context has its own retry budget');
 p.orphanReadRetries.add('page');p.pullLoading=true;p.pullRequest={task:{is_done:()=>true}};p.recoverReadTasks();assert.match(p.pullError,/interrupted; refresh to retry/);assert.equal(p.pullsDue('open'),false,'Repeated abandoned pages do not auto-read');
}
console.log('PASS cold worker independent reads with absent/empty/unverified seeds, abandoned root/page tasks, bounded repeated failure with accessible manual retry, stale replies and selected Draft below its header');
