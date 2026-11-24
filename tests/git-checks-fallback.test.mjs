import assert from 'node:assert/strict';
import {spawnSync} from 'node:child_process';
import {rowHarness,find,words,t} from './support/git-row.mjs';

const rollup=(ok,total)=>Array.from({length:total},(_,i)=>({name:`CI ${i}`,status:i<ok?'COMPLETED':'IN_PROGRESS',conclusion:i<ok?'SUCCESS':null}));
const response=(numbers,status)=>JSON.stringify({data:{repository:{open:{totalCount:120},closed:{totalCount:27},...Object.fromEntries(numbers.map(number=>[`pr${number}`,{number,state:'OPEN',isDraft:false,createdAt:'2026-11-20T12:00:00Z',closedAt:null,mergedAt:null,commits:{nodes:[{commit:{statusCheckRollup:{contexts:{nodes:rollup(status.ok,status.total)}}}}]}}]))}}});
for(const coordinator of [false,true]) {
  let now=0,shown=true,online=true,fail=false,rate=false,held=null,requests=[],tasks=[],timers=[],notifications=0,rendering=false;
  let status={ok:3,total:10},machineShape=null,failAt=null;
  const context={scope:'home',machine:'pc2',links:[]};
  const h=await rowHarness({host:{machines:()=>machineShape??[{name:'pc2',layout:online?'ready':'loading'}],
    exec:async(_cmd,args)=>{
      assert.equal(rendering,false,'No read during render');
      const numbers=[...args.find(a=>a.startsWith('query=')).matchAll(/pr(\d+):pullRequest/g)].map(m=>Number(m[1]));
      requests.push({args,numbers});
      if(held)await held.promise;
      const failed=fail || requests.length===failAt;
      return {code:failed?1:0,stderr:failed?(rate?'API rate limit exceeded':'process could not start'):'',stdout:response(numbers,status)};
    }},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
  const {panel,facts}=h;
  panel.on='pc2';h.place.on='pc2';panel.context=JSON.stringify([h.place.cwd,h.place.on]);panel.shown=()=>shown;
  panel.notices={active:true,relay:'',members:new Map()};
  const raw=number=>({number,url:`https://github.com/owner/repo/pull/${number}`,title:`PR ${number}`,state:'OPEN',isDraft:false,statusCheckRollup:rollup(3,10)});
  const install=values=>{
    if(coordinator) {
      panel.context='tasks:home';if(!(panel.aggregate instanceof h.AggregatePulls))panel.aggregate=new h.AggregatePulls({shown:()=>shown});panel.aggregate.context=context;panel.aggregate.entries.clear();
      for(const pr of values) {
        pr.key=`owner/repo#${pr.number}`;pr.repo='owner/repo';
        panel.aggregate.entries.set(pr.key,{pr,dirty:false,link:{repo:'owner/repo',number:pr.number,key:pr.key,targets:[{terminal:'pc2/t1'}]}});
      }
      context.links=values.map(pr=>({url:pr.url,terminal:'pc2/t1'}));
    } else {panel.pulls.open=values;panel.agentPull=null;panel.relatedPull=null;}
  };
  install([facts.pullRow(raw(1),'owner'),facts.pullRow(raw(2),'owner'),facts.pullRow({...raw(3),statusCheckRollup:rollup(11,11)},'owner')]);
  const rows=()=>coordinator?panel.aggregate.rows('open'):panel.pulls.open;
  const cx={notify(){assert.equal(rendering,false);notifications++;},spawn(fn){const p=fn(cx);tasks.push(p);return p;},timer:{after(ms,fn){timers.push({at:now+ms,fn});}}};
  panel.checksFallback=new facts.ChecksFallback({snapshot:()=>panel.fallbackSnapshot(),read:(...args)=>panel.readPendingChecks(...args),now:()=>now});
  const sync=()=>{rendering=true;try {panel.syncChecksFallback(cx);}finally {rendering=false;}};
  const flush=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
  const advance=async ms=>{
    const end=now+ms;
    for(let steps=0;steps<1000;steps++) {
      timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;
      const timer=timers.shift();now=timer.at;timer.fn(cx);await flush();
      assert.ok(steps<999,'Timer loop must be bounded');
    }
    now=end;await flush();
  };
  assert.equal(panel.fallbackSnapshot().enabled,true,'Native pc2 layout ready enables remote fallback without a state field');
  for(const unavailable of [[{name:'pc2',layout:'loading'}],[{name:'pc2'}],[{name:'pc2',state:'connected'}],[{name:'other',layout:'ready'}],[]]) {
    machineShape=unavailable;assert.equal(panel.fallbackSnapshot().enabled,false);
    sync();assert.equal(timers.length,0,'Unavailable native layouts arm no fallback timer');
  }
  machineShape=null;sync();assert.equal(timers[0].at,45000);
  await advance(44999);assert.equal(requests.length,0);
  held={};held.promise=new Promise(resolve=>held.resolve=resolve);
  await advance(1);assert.equal(requests.length,1);assert.deepEqual(requests[0].numbers,[1,2,3],'Settled open PR 3 is also selected in the one repository batch');
  assert.equal(rows()[0].checks.label,'3/10','Previous value remains while reading');
  assert.equal(words(find(panel.pullRow(t,rows()[0]),`pr-checks-${rows()[0].key??1}`)).join(''),'3/10');
  status={ok:11,total:11};held.resolve();held=null;await flush();
  assert.ok(rows().every(pr=>pr.checks.label==='11/11'));
  await advance(45000);assert.equal(requests.length,2,'State refresh continues after checks settle');
  assert.ok(requests[0].args.some(arg=>arg.includes('state isDraft')),'Every safety query includes state and checks');
  if(!coordinator)assert.deepEqual({...panel.counts},{open:120,closed:27},'Repository totals are authoritative, not counts of the loaded subset');

  let before=requests.length;
  rows()[0].checks=facts.checks(rollup(0,10));shown=false;await advance(45000);assert.equal(requests.length,before);
  shown=true;sync();online=false;await advance(45000);assert.equal(requests.length,before);
  online=true;sync();fail=true;
  await advance(45000);assert.equal(requests.length,++before);assert.equal(rows()[0].checks.label,'0/10','Failure keeps last-good count');
  await advance(89999);assert.equal(requests.length,before);await advance(1);assert.equal(requests.length,++before);
  rate=true;await advance(180000);assert.equal(requests.length,++before);
  await advance(899999);assert.equal(requests.length,before,'Rate limit waits at least 15 minutes');
  rate=false;fail=false;status={ok:10,total:10};await advance(1);assert.equal(requests.length,++before);assert.equal(rows()[0].checks.label,'10/10');

  // The safety net survives a missed event or relay outage without tight polling.
  panel.notices.relay='https://relay.example';panel.notices.members.set('owner/repo',true);sync();
  await advance(119999);assert.equal(requests.length,before,'Enrolled safety cadence is 120 seconds, not 45');
  await advance(1);assert.equal(requests.length,++before,'Enrolled settled rows repair even without a relay event');
  await advance(120000);assert.equal(requests.length,++before);
  panel.notices.members.set('owner/repo',false);sync();
  if(coordinator)panel.aggregate.pending.set('existing',{});else panel.pullLoading=true;
  await advance(45000);assert.equal(requests.length,before,'Fallback shares the existing queue');
  if(coordinator)panel.aggregate.pending.clear();else panel.pullLoading=false;
  await advance(1000);assert.equal(requests.length,++before);

  rows()[0].checks=null;rows()[0].checksKnown=false;status={ok:0,total:0};sync();await advance(45000);
  assert.equal(requests.length,++before);assert.equal(rows()[0].checks,null);assert.equal(rows()[0].checksKnown,true);
  await advance(45000);assert.equal(requests.length,++before,'Known-empty open rows still need state repair');
  rows()[0].checks=facts.checks(rollup(2,10));held={};held.promise=new Promise(resolve=>held.resolve=resolve);
  await advance(45000);assert.equal(requests.length,++before);
  shown=false;sync();status={ok:10,total:10};held.resolve();held=null;await flush();
  assert.equal(rows()[0].checks.label,'2/10','Hiding during a read suppresses its late result');
  await advance(180000);assert.equal(requests.length,before);
  shown=true;sync();held={};held.promise=new Promise(resolve=>held.resolve=resolve);
  await advance(45000);assert.equal(requests.length,++before);
  panel.context='replacement';sync();held.resolve();held=null;await flush();
  assert.equal(rows()[0].checks.label,'2/10','Replacement context refuses an old result');
  assert.throws(()=>facts.parsePendingChecks('{"data":{"repository":{}}}',[1]),/Incomplete checks/);

  panel.context=coordinator?'tasks:home':JSON.stringify([h.place.cwd,h.place.on]);panel.checksFallback.stop();
  const large=Array.from({length:120},(_,i)=>facts.pullRow(raw(1001+i),'owner'));install(large);
  before=requests.length;failAt=before+2;status={ok:11,total:11};sync();await advance(45000);
  assert.equal(requests.length,before+2,'Stop at a failed second chunk');
  assert.ok(rows().every(pr=>pr.checks.label==='3/10'),'Partial failure retains every old row');
  failAt=null;await advance(90000);
  const chunks=requests.slice(before+2);assert.equal(chunks.length,6);
  assert.deepEqual(chunks.flatMap(c=>c.numbers),large.map(pr=>pr.number));
  for(const call of requests.slice(before)) {
    assert.ok(call.numbers.length<=facts.CHECKS_BATCH_SIZE);assert.ok(call.args.join(' ').length<12000,'Bound argv below Windows process limits');
  }
  const child=spawnSync(process.execPath,['-e','process.exit(0)','--',...chunks[0].args],{encoding:'utf8',timeout:10000});
  assert.equal(child.error,undefined);assert.equal(child.status,0);
  assert.throws(()=>facts.pendingChecksArgs(large.map(pr=>pr.number),'owner/repo'),/oversized checks batch/);
  assert.ok(rows().every(pr=>pr.checks.label==='11/11'));
  before=requests.length;await advance(45000);assert.equal(requests.length,before+6,'Large settled open inventories remain state-eligible');
  shown=false;sync();before=requests.length;await advance(90000);assert.equal(requests.length,before);
  assert.ok(notifications>0);await Promise.all(tasks);
}
console.log('PASS ordinary/coordinator state+checks safety: 45s unenrolled / 120s enrolled, settled and empty open rows, bounded 120-row chunks, full publication, retained failures/backoff, visibility/offline/context cancellation and shared queue (synthetic clocks/transport)');
