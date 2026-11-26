// Empty/unverified coordinator memory must never substitute for a worker read.
import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,find,words,t} from './support/git-row.mjs';
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
 const pin=find(tree,'active-pull'),header=find(tree,'task-repo-header-owner/repo');assert.ok(pin);assert.ok(find(pin,'pr-94'),'Selected draft pins above its repository section');
 assert.equal(header,undefined,'A lone pinned PR has no empty repository header');
 p.pulls.open.push(h.facts.pullRow({number:95,title:'Other',state:'OPEN'}));
 let section=p.renderPulls(t),geometry=rowGeometry(section,320,1,500);assert.ok(geometry.get(find(section,'active-pull')).y<geometry.get(find(section,'task-repo-header-owner/repo')).y,'Pin precedes the section header');
 p.foldedRepositories.add('owner/repo');section=p.renderPulls(t);assert.ok(find(find(section,'active-pull'),'pr-94'),'Collapsed section never hides its selected pin');assert.equal(find(section,'pr-95'),undefined);assert.ok(find(section,'task-repo-header-owner/repo')); assert.equal(p.pinMotion.current,null,'Entry pins without click-only motion');
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
// A root task includes branch resolution: rev-parse alone must not reset its
// retry budget, including when repository reset occurs inside that same task.
for(const entryRefreshing of [false,true]) {
 const calls=[],h=await rowHarness({host:{exec:(cmd,args)=>new Promise(resolve=>calls.push({cmd,args,resolve}))}}),p=h.panel;
 h.cx.spawn=fn=>{const task={done:false,is_done(){return this.done;}};Promise.resolve().then(()=>fn(h.cx)).finally(()=>task.done=true);return task;};h.cx.timer={after(){return {cancel(){}};}};
 p.syncAggregate=()=>false;p.syncAgent=()=>{};p.syncWebhooks=()=>{};p.syncChecksFallback=()=>{};p.loadPulls=()=>{};p.loadRelatedPull=()=>{};p.agentLinks={refresh(){}};p.notices={sync(){},retryNow(){}};p.enrollmentPicker={stop(){}};p.root=null;p.repo=null;p.loading=false;p.entryRefreshing=entryRefreshing;
 p.refresh(h.cx);await tick();
 for(let attempt=0;attempt<2;attempt++){
  const top=calls.shift();assert.equal(top.args[0],'rev-parse');if(attempt)p.entryRefreshing=false;top.resolve({code:0,stdout:'/root-'+attempt});await tick();assert.equal(calls.shift().args[0],'symbolic-ref');
  p.rootRequest.task.done=true;p.refresh(h.cx);await tick();
 }
 assert.match(p.error,/interrupted; refresh to retry/);assert.equal(calls.length,0,'Two abandoned branch reads exhaust automatic root recovery');
 for(const credit of [{remaining:1,expires:Date.now()-1},{remaining:1,expires:Date.now()+30000}]){p.manualRead=credit;p.refresh(h.cx);await tick();assert.equal(calls.length,0,'Rate credits are not root retry authorization');}
 p.headerHovered=true;find(p.renderPanel(h.cx),'git-refresh').attrs.on_click[0]({},h.cx);await tick();assert.equal(calls.shift().args[0],'rev-parse');assert.equal(p.rootRetryAuthorized,false,'Explicit Refresh consumes one root authorization');
 p.rootRequest.task.done=true;p.refresh(h.cx);await tick();assert.equal(calls.length,0,'Abandoning the manual attempt cannot start another automatic attempt');assert.match(p.error,/interrupted/);
 for(let i=0;i<4;i++){p.refresh(h.cx);await tick();assert.equal(calls.length,0,'Retained manual rate credit cannot loop root retries');}
}
// Tab-local page errors must not suppress the other tab's first read.
for(const failed of ['open','closed']) {
 const calls=[],h=await rowHarness({host:{exec:async(cmd,args)=>{calls.push({cmd,args});return {code:1,stderr:'HTTP 503 Service Unavailable'};}}}),p=h.panel;
 p.view=failed;p.loadPulls(failed,h.cx);await tick();assert.ok(p.pullError);assert.equal(p.pullsDue(failed),false);
 const other=failed==='open'?'closed':'open';p.setView(other,h.cx);assert.equal(p.pullError,null);assert.equal(p.pullsDue(other),true,'A failed sibling tab does not suppress this tab');
 const before=calls.length;p.loadPulls(other,h.cx);await tick();assert.ok(calls.length>before);assert.ok(p.pullError);p.setView(failed,h.cx);assert.equal(p.pullsDue(failed),false,'Both tabs retain their own failures');
}
// Tab, sidebar and keyboard selection all resolve the same selected-agent pin.
{
 const h=await rowHarness(),p=h.panel;p.sectionEntry=true;p.branch=null;p.agentLinks={pullNumber:terminal=>({first:94,second:95}[terminal]??null),related:()=>null};
 p.pulls.open=[94,95,96,97].map(number=>h.facts.pullRow({number,title:'Selected '+number,state:'OPEN',headRefName:'head-'+number}));p.counts={open:4,closed:0};p.branch='head-94';
 for(const [via,terminal,number]of [['tab','first',94],['sidebar','second',95],['keyboard','first',94],['tab','no-pr',null]]){
  p.branch=number?'head-94':null;
  Object.assign(h.place,{terminal,app:number?'codex':'bash',tab:'tab-'+terminal,pullNumber:number});p.syncAgent(h.cx);const tree=p.renderPulls(t);const pin=find(tree,'active-pull');
  assert.equal(p.reportedRenderError??null,null,'Selection fixtures must render real PR rows, not caught row errors');
  assert.ok(!words(tree).join(' ').includes('Row unavailable'),'No error fallback may satisfy pin/count assertions');
  assert.equal(Boolean(pin),number!==null,`${via}: pin follows the resolved selected agent`);if(number)assert.ok(find(pin,'pr-'+number));assert.equal(p.pinMotion.current,null,'Direct selection never starts label-click motion');
  assert.equal(words(find(tree,'task-repo-count-owner/repo')).join(''),number?'3':'4','Header counts only its unpinned rows');
  assert.ok(words(p.segment(t,'git-view-open','Open',p.counts.open,true,()=>{})).join('').includes('4'),'Open badge retains the full total');
  if(number){p.foldedRepositories.add('owner/repo');const folded=p.renderPulls(t);assert.ok(find(folded,'active-pull'));assert.equal(words(find(folded,'task-repo-count-owner/repo')).join(''),'3');p.foldedRepositories.clear();}
 }
}
// Missing footer evidence keeps supported explicit-tab and branch fallbacks.
for(const app of ['bash','a1','claude-code','codex'])for(const source of ['branch','named-tab']) {
 const h=await rowHarness({host:{hc:async()=>({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'/repo\n13.1%/500k'})})}}),p=h.panel;
 Object.assign(h.place,{app,terminal:'selected',pullNumber:source==='named-tab'?94:null});
 p.agentLinks={pullNumber:()=>null,related:()=>null};p.branch=source==='branch'?'fix/94':'fix/95';
 p.pulls.open=[94,95].map(number=>h.facts.pullRow({number,title:'Fallback '+number,state:'OPEN',headRefName:'fix/'+number}));
 p.syncAgent(h.cx);await tick();assert.equal(p.pullSelection().active?.number,94,`${app}/${source}: explicit tab precedes branch and missing footer vetoes neither`);
 assert.ok(find(find(p.renderPulls(t),'active-pull'),'pr-94'));assert.equal(p.reportedRenderError??null,null);
 Object.assign(h.place,{terminal:'replacement',pullNumber:null});p.branch='unrelated';p.syncAgent(h.cx);await tick();
 assert.equal(p.pullSelection().active,undefined,'Clear the old pin only when footer, explicit tab and branch yield no PR');
}
console.log('PASS independent worker reads, bounded branch/manual root recovery, tab-local errors, selected pin fallback precedence, healthy actual rows, counts and collapse survival');
