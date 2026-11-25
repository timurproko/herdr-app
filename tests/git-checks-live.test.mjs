import assert from 'node:assert/strict';
import {rowHarness} from './support/git-row.mjs';

const runs=(ok,total)=>Array.from({length:total},(_,i)=>({name:`job-${i}`,status:i<ok?'COMPLETED':'IN_PROGRESS',conclusion:i<ok?'SUCCESS':null}));
const job=(workflow,run,name,status,conclusion,at)=>({name,status,conclusion,startedAt:at,detailsUrl:`https://github.com/owner/repo/actions/runs/${run}/job/1`,checkSuite:{workflowRun:{workflow:{name:workflow}}}});
// Superseded workflow-only jobs, repeated attempts, same job in two workflows,
// skipped/neutral, a failing run and both successful/pending status contexts.
const mixed=[
  job('CI',1,'obsolete','COMPLETED','SUCCESS','2026-11-25T10:00:00Z'),
  job('CI',2,'build','COMPLETED','FAILURE','2026-11-25T10:01:00Z'),
  job('CI',2,'build','COMPLETED','SUCCESS','2026-11-25T10:02:00Z'),
  job('CI',2,'skip','COMPLETED','SKIPPED','2026-11-25T10:01:00Z'),
  job('CI',2,'neutral','COMPLETED','NEUTRAL','2026-11-25T10:01:00Z'),
  job('CI',2,'rerun','COMPLETED','SUCCESS','2026-11-25T10:00:00Z'),
  {...job('CI',2,'rerun','IN_PROGRESS',null,'2026-11-25T10:03:00Z'),completedAt:'0001-01-01T00:00:00Z'},
  job('Delivery',3,'build','COMPLETED','FAILURE','2026-11-25T10:01:00Z'),
  {context:'external',state:'FAILURE',createdAt:'2026-11-25T10:01:00Z'},
  {context:'external',state:'SUCCESS',createdAt:'2026-11-25T10:02:00Z'},
  {context:'waiting',state:'PENDING',createdAt:'2026-11-25T10:01:00Z'},
];
for(const coordinator of [false,true]) {
  let now=0,contexts=runs(2,10),summary='PENDING',incomplete=false;
  const calls=[],context={scope:'home',machine:null,links:[{url:'https://github.com/owner/repo/pull/1',terminal:'t1'}]};
  const h=await rowHarness({globals:{Date:class extends Date{static now(){return now;}}},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}},host:{exec:async(_cmd,args)=>{
    const query=args.find(a=>a.startsWith('query='));calls.push(query);
    let depth=0;for(const c of query){if(c==='{')depth++;if(c==='}')depth--;assert.ok(depth>=0,'GraphQL braces cannot underflow');}assert.equal(depth,0,'GraphQL selection must balance');
    const numbers=[...query.matchAll(/pr(\d+):pullRequest/g)].map(m=>Number(m[1]));
    return {code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:2},closed:{totalCount:0},...Object.fromEntries(numbers.map(number=>[`pr${number}`,{number,state:'OPEN',isDraft:false,headRefOid:'same',commits:{nodes:[{commit:{statusCheckRollup:{state:summary,contexts:{nodes:contexts,pageInfo:{hasNextPage:incomplete}}}}}]}}]))}}})};
  }}});
  const {panel,facts:f}=h;panel.shown=()=>true;
  const raw={number:1,title:'CI',state:'OPEN',isDraft:false,headRefOid:'same',statusCheckRollup:contexts};
  let row=f.pullRow(raw,'owner');
  if(coordinator){panel.context='tasks:home';panel.aggregate=new h.AggregatePulls({shown:()=>true});panel.aggregate.context=context;row={...row,key:'owner/repo#1',repo:'owner/repo'};panel.aggregate.entries.set(row.key,{pr:row,dirty:false,link:{repo:'owner/repo',number:1,key:row.key,targets:[{terminal:'t1'}]}});}
  else panel.pulls.open=[row];
  const current=()=>true,cx={notify(){},spawn:fn=>fn(cx)};
  const rows=()=>coordinator?panel.aggregate.rows('open'):panel.pulls.open;
  for(const ok of [2,5,10]){
    now+=45000;contexts=runs(ok,10); // Even the final numeric update retains PENDING.
    const before=calls.length;assert.equal((await panel.readPendingChecks({name:'owner/repo',rows:rows()},cx,current)).failed,false);
    assert.equal(calls.length,before+1,'Already-pending rows need exactly one repository request');
    assert.equal(rows()[0].checks.label,`${ok}/10`,'No event/head/summary change is required');
    assert.match(calls.at(-1),/contexts\(first:100\)/);
  }
  contexts=mixed;summary='FAILURE';
  // Reinstall a pending row to select inline details even with a failing rollup.
  rows()[0].checks=f.checks(runs(2,10));
  assert.equal((await panel.readPendingChecks({name:'owner/repo',rows:rows()},cx,current)).failed,false);
  const full=f.checks(mixed.map(c=>({...c,workflowName:c.checkSuite?.workflowRun?.workflow?.name??null})));
  assert.deepEqual({...rows()[0].checks},{...full});assert.equal(full.label,'4/7');assert.equal(full.pending,2);
  incomplete=true;const before=rows()[0];
  assert.equal((await panel.readPendingChecks({name:'owner/repo',rows:rows()},cx,current)).failed,true);
  assert.equal(rows()[0],before,'More than 100 contexts retains last-good facts');incomplete=false;
  // Same-summary event/list/target hydration must not reuse pending cached counts.
  const metadata={number:1,state:'OPEN',isDraft:false,headRefOid:'same',checkSummary:'pending'};
  f.rememberPull(h.transport,'owner/repo',{...row,checkSummary:'pending',checks:f.checks(runs(2,10))});
  contexts=runs(7,10);summary='PENDING';let count=calls.length;
  const event=await f.completePulls(h.transport,[metadata],'owner/repo');
  assert.equal(calls.length,count+1);assert.equal(event[0].checks.label,'7/10');
  // Detailed alias bound and thin settled siblings share one request.
  const pending=Array.from({length:45},(_,i)=>({...row,number:i+1,checks:f.checks(runs(2,10)),checkSummary:'pending'}));
  const batches=f.stateBatches(pending);assert.deepEqual(Array.from(batches,b=>b.length),[20,20,5]);
  for(const batch of batches){const numbers=batch.map(p=>p.number);const query=f.pullStateArgs(numbers,'owner/repo',false,numbers).join(' ');assert.ok(query.length<16000);}
  assert.throws(()=>f.pullStateArgs(pending.map(p=>p.number).slice(0,21),'owner/repo',false,pending.map(p=>p.number).slice(0,21)),/oversized/);
  const settled={...row,number:2,checks:f.checks(runs(10,10)),checkSummary:'success',checksKnown:true};
  const mixedBatch=f.stateBatches([...pending.slice(0,20),...Array.from({length:20},(_,i)=>({...settled,number:i+21}))]);
  assert.equal(mixedBatch.length,1);assert.equal(mixedBatch[0].length,40,'Forty state aliases can share a chunk with twenty detailed aliases');
  const query=f.pullStateArgs([1,2],'owner/repo',false,[1]).join(' ');
  assert.match(query,/pr1:.*contexts\(first:100\)/);assert.ok(!query.split('pr2:')[1].includes('contexts('),'Settled sibling stays thin');
  count=calls.length;contexts=runs(10,10);summary='SUCCESS';
  await panel.readPendingChecks({name:'owner/repo',rows:[settled]},cx,current);
  assert.equal(calls.length,count+1);assert.ok(!calls.at(-1).includes('contexts('));
}
console.log('PASS pending numeric progression, one-request probes, mixed/rerun parity, event hydration, context/alias bounds and thin settled rows');
