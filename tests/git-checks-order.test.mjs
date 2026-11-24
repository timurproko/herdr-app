import assert from 'node:assert/strict';
import {rowHarness} from './support/git-row.mjs';

const checks=(ok,total)=>Array.from({length:total},(_,i)=>({name:`CI ${i}`,status:i<ok?'COMPLETED':'IN_PROGRESS',conclusion:i<ok?'SUCCESS':null}));
const raw=(number,ok=3,total=10)=>({number,url:`https://github.com/owner/repo/pull/${number}`,title:`PR ${number}`,state:'OPEN',statusCheckRollup:checks(ok,total)});
const page=value=>JSON.stringify({data:{repository:{pullRequests:{nodes:[{...value,commits:{nodes:[{commit:{statusCheckRollup:{contexts:{nodes:value.statusCheckRollup}}}}]}}],pageInfo:{endCursor:'end',hasNextPage:false},totalCount:1}}}});
const graph=value=>JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:0},[`pr${value.number}`]:{number:value.number,state:value.state,isDraft:false,commits:{nodes:[{commit:{statusCheckRollup:{contexts:{nodes:value.statusCheckRollup}}}}]}}}}});
const pending=[];
const context={scope:'home',machine:null,links:[{url:raw(1).url,terminal:'t1'}]};
const h=await rowHarness({host:{exec:(_cmd,args)=>new Promise(resolve=>pending.push({args,resolve}))},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
const {panel,facts,cx}=h;panel.aggregate=null;cx.timer={after(){}};
const tick=async()=>{for(let i=0;i<50;i++)await Promise.resolve();};
const reply=async(stdout,code=0)=>{assert.ok(pending.length,'Expected one queued read');pending.shift().resolve({code,stdout,stderr:code?'failed':''});await tick();};
const newer=(number,order=panel.factOrder)=>{
  const read=order.begin(),value=facts.pullRow(raw(number,11,11),'owner');
  return order.publish(read,`owner/repo#${number}`,()=>value).value;
};

// The generation is request issuance order, not the number of checks passed:
// new runs can legitimately reduce counts. Old epochs cannot return after A-B-A.
{
  const order=new facts.PullFactsOrder(),old=order.begin(),next=order.begin();
  assert.equal(order.publish(next,'repo#1',()=>({checks:'3/10'})).accepted,true);
  assert.equal(order.publish(old,'repo#1',()=>({checks:'11/11'})).accepted,false);
  assert.equal(order.publish(next,'repo#2',()=>({checks:'1/2'})).accepted,true,'Ordering is per PR, not a global publication lock');
  order.reset();assert.deepEqual({...order.publish(next,'repo#1',()=>({checks:'stale'}))},{accepted:false,value:null});
}
// Inject a newer publication while an old reply is held. This deliberately
// exercises the guard behind each real path in addition to queue interleavings.
panel.pulls.open=[];panel.pulls.closed=null;
panel.loadPulls('open',cx,true);newer(1);await reply(page(raw(1)));await reply('{}');
assert.equal(panel.pulls.open[0].checks.label,'11/11','List publication cannot replace newer per-PR facts');

panel.agentPull=908;panel.loadRelatedPull(cx);await tick();newer(908);
await reply(JSON.stringify(raw(908)));
assert.equal(panel.relatedPull.checks.label,'11/11','Discarded targeted reply retains latest published facts');
assert.equal(panel.relatedKey,null,'A discarded targeted reply never caches the selection');
assert.ok(panel.relatedRetry,'Retry is bounded rather than a render-time hot loop');

panel.agentPull=909;panel.queueWebhook({repository:'owner/repo'},cx);await tick();
newer(1);newer(909);await reply(page(raw(1)));await reply(JSON.stringify(raw(909)));await reply('{}');
assert.equal(panel.pulls.open[0].checks.label,'11/11');assert.equal(panel.relatedPull.checks.label,'11/11','Event list and embedded older-PR reads use the same guard');
assert.equal(panel.relatedKey,null,'Rejected embedded reads leave no retry-blocking key');

panel.pulls.open[0]={...panel.pulls.open[0],checks:facts.checks(checks(3,10))};
const fallback=panel.readPendingChecks({name:'owner/repo',rows:panel.pulls.open},cx,()=>true);
newer(1);await reply(graph(raw(1)));await fallback;
assert.equal(panel.pulls.open[0].checks.label,'11/11','Fallback checks merge also obeys publication order');

const aggregate=new h.AggregatePulls({shown:()=>true});aggregate.context=context;
const entry={pr:{...facts.pullRow(raw(1),'owner'),key:'owner/repo#1',repo:'owner/repo'},dirty:true,link:{repo:'owner/repo',number:1,key:'owner/repo#1',targets:[{terminal:'t1'}]}};
aggregate.entries.set(entry.link.key,entry);aggregate.pump(cx);await tick();
entry.pr={...newer(1,aggregate.factOrder),key:entry.link.key,repo:'owner/repo'};
await reply(JSON.stringify(raw(1)));
assert.equal(entry.pr.checks.label,'11/11','Aggregate target cannot regress a newer publication');
assert.equal(pending.length,1,'Discarded aggregate reads release their lease and request a new generation');
await reply(JSON.stringify(raw(1,11,11)));assert.equal(aggregate.busy,false);assert.equal(entry.dirty,false);
assert.equal(entry.pr.checks.label,'11/11');
console.log('PASS one epoch/generation publication gate wired through list, targeted, event/embedded older PR, fallback and aggregate reads; discarded cache release, per-PR isolation and obsolete epoch rejection (synthetic held replies)');
