import assert from 'node:assert/strict';
import {rowHarness} from './support/git-row.mjs';
let now=0,ok=2,summary='PENDING',hold=null;
const calls=[],timers=[];
const contexts=()=>Array.from({length:10},(_,i)=>({name:`job-${i}`,status:i<ok?'COMPLETED':'IN_PROGRESS',conclusion:i<ok?'SUCCESS':null}));
const h=await rowHarness({globals:{Date:class extends Date{static now(){return now;}}},host:{exec:async(_cmd,args)=>{
  calls.push({at:now,query:args.find(a=>a.startsWith('query='))});
  const pr={number:1,state:'OPEN',isDraft:false,headRefOid:'same',commits:{nodes:[{commit:{statusCheckRollup:{state:summary,contexts:{nodes:contexts(),pageInfo:{hasNextPage:false}}}}}]}};
  const value=JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:0},pr1:pr}}});
  if(hold){const wait=hold;hold=null;await wait.promise;}
  return {code:0,stdout:value};
}}});
const {panel,facts:f}=h;panel.shown=()=>true;
panel.notices={active:true,relay:'https://relay.invalid',members:new Map([['owner/repo',true]])};
panel.pulls.open=[f.pullRow({number:1,state:'OPEN',isDraft:false,headRefOid:'same',statusCheckRollup:contexts()},'owner')];
const row=()=>panel.pulls.open[0];
const cx={notify(){},spawn:fn=>fn(cx),timer:{after(ms,fn){timers.push({at:now+ms,fn});}}};
const fallback=panel.checksFallback=new f.ChecksFallback({snapshot:()=>panel.fallbackSnapshot(),read:(...a)=>panel.readPendingChecks(...a),now:()=>now});
const flush=async()=>{for(let i=0;i<100;i++)await Promise.resolve();};
const advance=async ms=>{const end=now+ms;for(let i=0;i<1000;i++){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;const timer=timers.shift();now=timer.at;timer.fn(cx);await flush();assert.ok(i<999);}now=end;await flush();};
fallback.sync(cx);assert.equal(fallback.jobs.get('owner/repo').due,45000,'Enrollment cannot slow pending numbers');
for(const passed of [2,5,10]){ok=passed;const before=calls.length;await advance(45000);assert.equal(calls.length,before+1);assert.equal(row().checks.label,`${passed}/10`);assert.equal(row().checksReadAt,now);}
assert.equal(fallback.eligible().repositories[0].interval,45000,'A PENDING summary remains pending even when all listed jobs have finished');
summary='SUCCESS';await advance(45000);const confirmed=row().checksReadAt;
assert.equal(fallback.eligible().repositories[0].interval,120000,'Settlement restores enrolled state cadence');
await advance(120000);assert.equal(row().checksReadAt,confirmed,'A successful thin state read cannot confirm numeric freshness');
assert.ok(!calls.at(-1).query.includes('contexts('));
const cached=await f.completePulls(h.transport,[{number:1,state:'OPEN',isDraft:false,headRefOid:'same',checkSummary:'success'}],'owner/repo');
assert.equal(cached[0].checksReadAt,confirmed,'Cached settled hydration preserves numeric age');

// Busy queue does not reset an overdue obligation; its existing one-second retry
// services that obligation as soon as the active read releases its lease.
summary='PENDING';ok=5;row().checks=f.checks(contexts());row().checkSummary='pending';row().checksReadAt=now-90000;
assert.equal(f.overdueChecks(row(),now),false);now++;
assert.equal(fallback.eligible().repositories[0].fresh,true,'More than 90 seconds forces a fresh demand');
fallback.sync(cx);fallback.jobs.get('owner/repo').due=now;panel.pullLoading=true;
const beforeBusy=calls.length,oldConfirmed=row().checksReadAt;
await fallback.run(cx);assert.equal(calls.length,beforeBusy);assert.equal(row().checksReadAt,oldConfirmed);
panel.pullLoading=false;await advance(1000);assert.equal(calls.length,beforeBusy+1);assert.equal(row().checksReadAt,now);

// A refusal from an existing cooldown must not restart its fifteen-minute floor.
const gate=f.gitReads(h.transport),state=gate.state({});state.until=now+5000;
fallback.jobs.get('owner/repo').due=now;const beforeCooldown=calls.length,last=row();
await fallback.run(cx);assert.equal(calls.length,beforeCooldown);assert.equal(row(),last,'Quiet cooldown retains loaded facts');
assert.equal(fallback.jobs.get('owner/repo').due,state.until,'Retry is at shared cooldown expiry, not another fifteen minutes later');
await advance(4999);assert.equal(calls.length,beforeCooldown);
await advance(1);assert.equal(calls.length,beforeCooldown+1,'No event is needed after cooldown expiry');assert.equal(row().checksReadAt,now);

// An overdue probe waits for, but does not join, an already-started matching
// transport read. Its new response is authoritative even if the old one is stale.
row().checksReadAt=now-90001;ok=2;
let release;hold={promise:new Promise(resolve=>release=resolve)};
const args=f.pullStateArgs([1],'owner/repo',true,[1]),beforeFresh=calls.length;
const old=f.repositoryRead(h.transport,args,'owner/repo',{cwd:'/repo',on:null,timeout:30000});await flush();
const repo=fallback.eligible().repositories[0];assert.equal(repo.fresh,true);
const fresh=panel.readPendingChecks(repo,cx,()=>true);await flush();assert.equal(calls.length,beforeFresh+1,'Forced demand keeps repository serialization');
ok=8;release();await old;await fresh;
assert.equal(calls.length,beforeFresh+2,'Forced demand does not reuse an already-started response');assert.equal(row().checks.label,'8/10');assert.equal(row().checksReadAt,now);
console.log('PASS enrolled no-event 45-second progression, numeric confirmation age, settled cadence, overdue/busy/fresh-coalescing guard and exact quiet cooldown expiry');
