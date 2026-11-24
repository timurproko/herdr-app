import assert from 'node:assert/strict';
import {rowHarness,find,words,t} from './support/git-row.mjs';

const rollup=(ok,total)=>Array.from({length:total},(_,i)=>({name:`CI ${i}`,status:i<ok?'COMPLETED':'IN_PROGRESS',conclusion:i<ok?'SUCCESS':null}));
const response=(numbers,ok,total)=>JSON.stringify({data:{repository:Object.fromEntries(numbers.map(number=>[`pr${number}`,{number,commits:{nodes:[{commit:{statusCheckRollup:{contexts:{nodes:rollup(ok,total)}}}}]}}]))}});
for(const coordinator of [false,true]) {
  let now=0,shown=true,online=true,fail=false,rate=false,held=null,requests=[],tasks=[],timers=[],notifications=0,rendering=false;
  let status={ok:3,total:10},machineShape=null;
  const context={scope:'home',machine:'pc2',links:[{url:'https://github.com/owner/repo/pull/1',terminal:'pc2/t1'}]};
  const h=await rowHarness({host:{machines:()=>machineShape??[{name:'pc2',layout:online?'ready':'loading'}],
    exec:async(_cmd,args)=>{
      assert.equal(rendering,false,'No read during render');
      const numbers=[...args.find(a=>a.startsWith('query=')).matchAll(/pr(\d+):pullRequest/g)].map(m=>Number(m[1]));
      requests.push({args,numbers});
      if(held)await held.promise;
      return {code:fail?1:0,stderr:fail?(rate?'API rate limit exceeded':'process could not start'):'',stdout:response(numbers,status.ok,status.total)};
    }},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
  const {panel,facts}=h;
  panel.on='pc2';h.place.on='pc2';panel.context=JSON.stringify([h.place.cwd,h.place.on]);
  panel.shown=()=>shown;
  panel.notices={active:true,relay:'',members:new Map()};
  const raw=number=>({number,url:`https://github.com/owner/repo/pull/${number}`,title:`PR ${number}`,state:'OPEN',statusCheckRollup:rollup(3,10)});
  const initial=[facts.pullRow(raw(1),'owner'),facts.pullRow(raw(2),'owner'),facts.pullRow({...raw(3),statusCheckRollup:rollup(11,11)},'owner')];
  if(coordinator) {
    panel.context='tasks:home';panel.aggregate=new h.AggregatePulls({shown:()=>shown});panel.aggregate.context=context;
    for(const pr of initial) {
      pr.key=`owner/repo#${pr.number}`;pr.repo='owner/repo';
      panel.aggregate.entries.set(pr.key,{pr,dirty:false,link:{repo:'owner/repo',number:pr.number,key:pr.key,targets:[{terminal:'pc2/t1'}]}});
    }
    // No unrelated pump reads: membership contains every loaded row.
    context.links=initial.map(pr=>({url:pr.url,terminal:'pc2/t1'}));
  } else {panel.pulls.open=initial;panel.agentPull=1;}
  const rows=()=>coordinator?panel.aggregate.rows('open'):panel.pulls.open;
  const cx={notify(){assert.equal(rendering,false);notifications++;},spawn(fn){const p=fn(cx);tasks.push(p);return p;},timer:{after(ms,fn){timers.push({at:now+ms,fn});}}};
  panel.checksFallback=new facts.ChecksFallback({snapshot:()=>panel.fallbackSnapshot(),read:(...args)=>panel.readPendingChecks(...args),now:()=>now});
  const sync=()=>{rendering=true;try {panel.syncChecksFallback(cx);}finally {rendering=false;}};
  const flush=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
  const advance=async ms=>{
    const end=now+ms;
    for(let steps=0;steps<1000;steps++) {
      timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;
      const timer=timers.shift();now=timer.at;timer.fn(cx);await flush();
      assert.ok(steps<999,'Timer loop must be bounded');
    }
    now=end;await flush();
  };
  // Native machines() exposes layout readiness, not hc machine ls's state.
  // Exercise the actual shape in both ordinary and coordinator remote paths.
  assert.equal(panel.fallbackSnapshot().enabled,true,'Native pc2 layout ready enables remote fallback without a state field');
  for(const unavailable of [[{name:'pc2',layout:'loading'}],[{name:'pc2'}],[{name:'pc2',state:'connected'}],[{name:'other',layout:'ready'}],[]]) {
    machineShape=unavailable;
    assert.equal(panel.fallbackSnapshot().enabled,false,'Only the selected native ready layout authorizes remote reads');
    sync();assert.equal(timers.length,0,'Unavailable native layouts arm no fallback timer');
  }
  machineShape=null;sync();
  assert.equal(timers.length,1);assert.equal(timers[0].at,45000,'Native ready machine arms the pending-check fallback');
  await advance(44999);assert.equal(requests.length,0);
  held={};held.promise=new Promise(resolve=>held.resolve=resolve);
  await advance(1);assert.equal(requests.length,1);assert.deepEqual(requests[0].numbers,[1,2],'One repository request excludes settled PR 3');
  assert.equal(rows()[0].checks.label,'3/10','Previous value remains while reading');
  const tree=panel.pullRow(t,rows()[0]);assert.equal(words(find(tree,`pr-checks-${rows()[0].key??1}`)).join(''),'3/10');
  status={ok:11,total:11};held.resolve();held=null;await flush();
  assert.equal(rows()[0].checks.label,'11/11');assert.equal(rows()[1].checks.label,'11/11');
  await advance(180000);assert.equal(requests.length,1,'Settlement stops polling');

  // A new pending run is eligible, but a hidden/offline panel cannot dispatch.
  rows()[0].checks=facts.checks(rollup(0,10));sync();shown=false;await advance(45000);
  assert.equal(requests.length,1,'Hide before the wakeup cancels reads');
  shown=true;sync();online=false;await advance(45000);assert.equal(requests.length,1,'Offline machine stops reads');
  online=true;sync();
  fail=true;await advance(45000);assert.equal(requests.length,2);assert.equal(rows()[0].checks.label,'0/10','Failure keeps last-good count');
  await advance(89999);assert.equal(requests.length,2,'First failure backs off 90 seconds');await advance(1);assert.equal(requests.length,3);
  rate=true;await advance(180000);assert.equal(requests.length,4);await advance(899999);assert.equal(requests.length,4,'Rate limit waits at least 15 minutes');
  rate=false;fail=false;status={ok:10,total:10};await advance(1);assert.equal(requests.length,5);assert.equal(rows()[0].checks.label,'10/10');
  await advance(900000);assert.equal(requests.length,5);

  // Enrolled repositories remain event-only, including relay outages.
  rows()[0].checks=facts.checks(rollup(1,10));panel.notices.relay='https://relay.example';panel.notices.setup=true;panel.notices.members.set('owner/repo',true);
  sync();await advance(900000);assert.equal(requests.length,5,'Enrolled rows must not poll');
  panel.notices.members.set('owner/repo',false);sync();
  if(coordinator)panel.aggregate.pending.set('existing',{});else panel.pullLoading=true;
  await advance(45000);assert.equal(requests.length,5,'Fallback coalesces behind existing queue');
  if(coordinator)panel.aggregate.pending.clear();else panel.pullLoading=false;
  status={ok:10,total:10};await advance(1000);assert.equal(requests.length,6);assert.equal(rows()[0].checks.label,'10/10');

  // Unknown is different from an authoritative empty rollup.
  rows()[0].checks=null;rows()[0].checksKnown=false;status={ok:0,total:0};sync();await advance(45000);
  assert.equal(requests.length,7);assert.equal(rows()[0].checks,null);assert.equal(rows()[0].checksKnown,true);
  await advance(90000);assert.equal(requests.length,7,'Known no-check rows are not polled');
  // A hidden/superseded in-flight request cannot publish a late count.
  rows()[0].checks=facts.checks(rollup(2,10));sync();
  held={};held.promise=new Promise(resolve=>held.resolve=resolve);
  await advance(45000);assert.equal(requests.length,8);
  shown=false;sync();status={ok:10,total:10};held.resolve();held=null;await flush();
  assert.equal(rows()[0].checks.label,'2/10','Hiding during a read suppresses its late result');
  await advance(180000);assert.equal(requests.length,8);
  shown=true;sync();held={};held.promise=new Promise(resolve=>held.resolve=resolve);
  await advance(45000);assert.equal(requests.length,9);
  panel.context='replacement';sync();held.resolve();held=null;await flush();
  assert.equal(rows()[0].checks.label,'2/10','Replacement context refuses an old result');
  assert.throws(()=>facts.parsePendingChecks('{"data":{"repository":{}}}',[1]),/Incomplete checks/);
  assert.ok(notifications>0);
  await Promise.all(tasks);
}
console.log('PASS native layout-ready ordinary/coordinator remote fallback (no hc state dependency), non-ready/missing/other-machine refusal: batched repository requests, full count retention, settlement stop, hidden/offline stop, failure/rate-limit backoff, enrolled event-only, queue contention and authoritative empty rollups (synthetic clock/transport)');
