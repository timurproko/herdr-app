import assert from 'node:assert/strict';
import {rowHarness} from './support/git-row.mjs';

// Invariant (real broker + ordinary/aggregate controllers, not a delivery mock):
// an accepted invalidation for a retained repository remains owned by either
// the broker or the consumer's dirty queue until one successful current read.
// Before dispatch, transitions and duplicate notices coalesce without extending
// the first two-second deadline. Pauses retain demand/deadlines; rate/failure
// backoff postpones dispatch, not acknowledgement. Failed attempts are not reads
// that satisfy this invariant, and never remove the pending successful read.
const transitions={
 tab:'switch the selected Open/Closed tab',
 visibility:'hide and show before the next dispatch',
 membership:'remove B while retaining A',
 cooldownStart:'start/extend the shared rate cooldown',
 cooldownEnd:'publish successful recovery of that shared cooldown',
 event:'accept another A invalidation',
 failure:'fail the next A attempt with an actionable network error',
};
const sequences=[[],...Object.keys(transitions).map(name=>[name]),...Object.keys(transitions).flatMap(a=>Object.keys(transitions).map(b=>[a,b]))];
let cases=0;
for(const mode of ['coordinator','ordinary-warm','ordinary-cold'])for(const phase of ['debounce','rate-backoff','failure-backoff'])for(const sequence of sequences) {
 const label=`${mode}/${phase}/${sequence.join(' + ')||'identity'}`;
 let clock=0,shown=true,version=1,eventPhase=false,failNext=0,hiddenReads=0;
 const timers=[],jobs=[],attempts=[];
 const relay={scope:'authenticated-relay',ready:1,status:'connected',repositories:{'example/a':{revision:1},'example/b':{revision:1}}};
 const context={scope:'verified-home',machine:null,links:[{url:'https://github.com/example/a/pull/1',terminal:'a'},{url:'https://github.com/example/b/pull/2',terminal:'b'}]};
 const raw=(repository,number)=>({number,url:`https://github.com/${repository}/pull/${number}`,state:'OPEN',isDraft:false,headRefOid:'unchanged',title:`title v${version}`,body:`- [${version>1?'x':' '}] task`,labels:{nodes:[{name:`label v${version}`,color:'abcdef'}]},commits:{nodes:[{commit:{statusCheckRollup:null}}]}});
 const h=await rowHarness({globals:{URL,Date:class extends Date{static now(){return clock;}}},
  modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','webhooks.js':'src/plugins/git/mod/webhooks.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){},pluginById:()=>({}),pluginSetting:()=> 'https://relay.example'}},
  host:{shared:()=>relay,setShared(){},checking:()=>false,window:()=>({active:true}),layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),exec:async(_command,args,options)=>{
   if(!shown)hiddenReads++;
   const repository=options.env.GH_REPO,query=args.find(arg=>arg.startsWith('query='));
   assert.ok(query,'The fixture runs actual GraphQL operations');
   const attempt={repository,at:clock,query,success:!(eventPhase && repository==='example/a' && failNext>0)};
   if(eventPhase)attempts.push(attempt);
   if(!attempt.success) {failNext--;return {code:1,stderr:'connection refused'};}
   if(query.includes('pullRequests(first:')) {
    const closed=query.includes('after:$after,states:[CLOSED,MERGED]');
    return {code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:0},pullRequests:{nodes:closed?[]:[raw(repository,1)],pageInfo:{hasNextPage:false,endCursor:null}}}}})};
   }
   const values=Object.fromEntries([...query.matchAll(/pr(\d+):pullRequest/g)].map(([,number])=>[`pr${number}`,raw(repository,+number)]));
   return {code:0,stdout:JSON.stringify({data:{repository:values}})};
  }}});
 const panel=h.panel,cx={...h.cx,spawn:fn=>jobs.push(fn(cx)),timer:{after:(ms,fn)=>timers.push({at:clock+ms,fn})}};
 const drain=async()=>{for(let pass=0;pass<4;pass++){while(jobs.length)await Promise.all(jobs.splice(0));for(let i=0;i<20;i++)await Promise.resolve();}};
 const session=h.facts.gitReads(h.transport);session.log=()=>{};
 if(mode==='coordinator') {
  panel.context='tasks:verified-home';
  panel.aggregate=new h.AggregatePulls({shown:()=>panel.shown(),blocked:repository=>panel.webhooks?.hasPending(repository)});
 } else {panel.aggregate=null;panel.repo={name:'example/a'};if(mode==='ordinary-warm')panel.pulls.closed=[];}
 const lifecycle=()=>{
  if(mode==='coordinator')panel.syncAggregate(cx);
  else {panel.syncWebhooks(cx);if(panel.shown()&&panel.pullsDue(panel.view))panel.loadPulls(panel.view,cx);}
 };
 const advance=async until=>{
  for(let n=0;n<100;n++) {
   timers.sort((a,b)=>a.at-b.at);
   if(!timers.length||timers[0].at>until)break;
   const timer=timers.shift();clock=Math.max(clock,timer.at);timer.fn(cx);await drain();lifecycle();await drain();
   assert.ok(n<99,`${label}: no timer/failed-read hot loop`);
  }
  clock=until;
 };
 lifecycle();await drain();lifecycle();await drain();
 const old=mode==='coordinator'?panel.aggregate.entries.get('example/a#1').pr:panel.pulls.open[0];
 assert.equal(old.title,'title v1');
 eventPhase=true;version=2;
 if(phase==='rate-backoff')session.state({}).until=900000;
 if(phase==='failure-backoff')failNext=1;
 relay.repositories['example/a'].revision++;lifecycle();await drain();
 if(phase!=='debounce')await advance(2000);
 const start=clock;
 for(let index=0;index<sequence.length;index++) {
  clock=start+250+index*500;
  switch(sequence[index]) {
   case 'tab':panel.setView(panel.view==='open'?'closed':'open',cx);break;
   case 'visibility':shown=false;lifecycle();shown=true;break;
   case 'membership':context.links=context.links.filter(link=>!link.url.includes('example/b/'));break;
   case 'cooldownStart':session.state({}).until=clock+900000;break;
   // Model the published admission state of a successful manual recovery. The
   // boundary's manual/episode rules are independently tested in rate-quiet.
   case 'cooldownEnd':session.state({}).until=clock;break;
   case 'event':version++;relay.repositories['example/a'].revision++;break;
   case 'failure':failNext++;break;
  }
  lifecycle();
 }
 await drain();
 const failed=attempts.filter(a=>a.repository==='example/a'&&!a.success),failedAlready=failed.length;
 // Independent oracle: derive the allowed backoff from observed failed wire
 // attempts, never from the scheduler's own wakeup/deadline under test.
 const failureDue=failed.length?failed.at(-1).at+Math.min(720000,45000*2**Math.min(failed.length,4)):0;
 const base=Math.max(clock,2000,session.state({}).until,failureDue);
 let bound=base;
 for(let n=1;n<=failNext;n++)bound+=Math.min(720000,45000*2**Math.min(failedAlready+n,4));
 await advance(bound);lifecycle();await drain();
 const successful=attempts.filter(a=>a.repository==='example/a'&&a.success);
 assert.equal(successful.length,1,`${label}: exactly one eventual successful A read; attempts=${JSON.stringify(attempts)}`);
 assert.equal(attempts.filter(a=>a.repository==='example/a'&&!a.success).length,(phase==='failure-backoff'?1:0)+sequence.filter(step=>step==='failure').length,`${label}: every injected failure was actually exercised`);
 assert.equal(hiddenReads,0,`${label}: no hidden dispatch`);
 assert.ok(successful[0].at<=bound,`${label}: first deadline plus only active cooldown/backoff`);
 if(mode==='coordinator') {
  const row=panel.aggregate.entries.get('example/a#1').pr;
  assert.equal(row.title,`title v${version}`,label);assert.equal(row.labels[0].name,`label v${version}`,label);assert.equal(row.tasks.done,1,label);
 } else {
  assert.ok(successful[0].query.includes(panel.view==='open'?'after:$after,states:[OPEN]':'after:$after,states:[CLOSED,MERGED]'),`${label}: current tab, never hidden pages`);
  assert.notEqual(panel.pulls[panel.view],null,label);
  if(panel.view==='open')assert.equal(panel.pulls.open[0].title,`title v${version}`,label);
 }
 assert.equal(panel.webhooks.hasPending('example/a'),false,`${label}: ownership transferred, not redelivered`);
 await advance(Math.max(bound,1000000));for(let n=0;n<3;n++){lifecycle();await drain();}
 assert.equal(attempts.filter(a=>a.repository==='example/a'&&a.success).length,1,`${label}: stale wakeups/lifecycle do not duplicate acknowledgement`);
 cases++;
}
console.log(`PASS invalidation ownership/deadline invariant: ${cases} actual-controller cases, every transition and ordered pair in debounce/rate/failure phases, coordinator and warm/cold ordinary tabs`);
