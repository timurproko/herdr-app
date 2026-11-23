// Actual UI controller + actual check worker. Only Git/time and exec are fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const worker=createRequire(import.meta.url)('../src/services/updates/update-worker.cjs');
fs.mkdirSync('.artifacts',{recursive:true});
const home=fs.mkdtempSync(path.resolve('.artifacts/update-hints-')),p=worker.files(home);
let clock=1000000,target='a'.repeat(40),fail=false,reads=0;
class Clock extends Date{static now(){return clock;}}
const state=new Map(),timers=[],jobs=[],calls=[];
const cx={notify(){},spawn:fn=>jobs.push(fn(cx)),timer:{after:(ms,fn)=>timers.push({at:clock+ms,fn})}};
const options={now:()=>clock,random:()=>0.5,run(program,args){reads++;assert.equal(program,'git');assert.deepEqual(args,['ls-remote','--',worker.REPOSITORY,'refs/heads/main']);return {code:fail?1:0,stdout:`${target}\trefs/heads/main\n`};}};
const host={appHome:()=>home,checking:()=>false,window:()=>({active:true}),shared:key=>state.get(key),setShared:(key,value)=>state.set(key,value),
  exec:async(program,args)=>{assert.equal(program,'node');const request=JSON.parse(args[1]);calls.push(request);assert.equal(request.action,'check','automatic observer cannot launch or inspect peers');return {code:0,stdout:JSON.stringify(worker.checkMain(home,{...options,force:request.force,invalidate:request.invalidate}))};}};
const context=vm.createContext({Date:Clock,console}),modules=new Map();
const load=name=>{
  if(!modules.has(name))modules.set(name,name==='./host.js'?new vm.SyntheticModule(Object.keys(host),function(){for(const[k,v]of Object.entries(host))this.setExport(k,v);},{context})
    :new vm.SourceTextModule(fs.readFileSync(`src/shared/${name.slice(2)}`,'utf8'),{context,identifier:name}));return modules.get(name);
};
const main=load('./customization-updates.js');await main.link(load);await main.evaluate();const api=main.namespace;
async function settle(){while(jobs.length)await Promise.all(jobs.splice(0));}
async function advance(ms){const end=clock+ms;for(;;){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;const timer=timers.shift();clock=timer.at;timer.fn(cx);await settle();}clock=end;}
try{
  const manifest=JSON.stringify({version:2,id:'custom',files:{}});
  worker.atomic(p.manifest,manifest);worker.atomic(p.result,{complete:true,desktop:{verified:true,commit:target,manifest:createHash('sha256').update(manifest).digest('hex')},results:[{machine:'local',action:'deployed'}]});
  const owner={};api.initCustomizationUpdates(owner,cx,'custom-workspace-chrome',{chrome:true});await settle();
  assert.equal(reads,1);assert.equal(api.customizationUpdateAvailable(),false);
  target='b'.repeat(40);api.invalidateCustomizationUpdates(owner,cx);
  await advance(300);assert.equal(reads,1,'fresh startup read defers hint through persisted rate floor');
  await advance(15000);assert.equal(reads,2);assert.equal(api.customizationUpdateAvailable(),true,'deferred authoritative check finds main without waiting healthy TTL');
  await advance(15000);worker.atomic(p.checkLock,{token:'other-mod',until:clock+20000});
  const beforeLease=reads;for(let i=0;i<20;i++)api.invalidateCustomizationUpdates(owner,cx);
  await advance(300);assert.equal(reads,beforeLease);assert.equal(api.customizationUpdateSnapshot().checking,true);
  await advance(20001);assert.equal(reads,beforeLease+1,'held lease retains exactly one pending authoritative check');
  fail=true;await advance(15000);api.invalidateCustomizationUpdates(owner,cx);await advance(300);
  const failed=reads;assert.equal(api.customizationUpdateAvailable(),true,'failed authoritative check preserves known availability');
  for(let i=0;i<20;i++)api.invalidateCustomizationUpdates(owner,cx);
  await advance(299999);assert.equal(reads,failed,'event storms cannot bypass persisted failure delay');
  await advance(1);assert.equal(reads,failed+1,'one automatic retry at persisted failure deadline');
  fail=false;api.refreshCustomizationUpdates(owner,cx,'check',true);await settle();assert.equal(reads,failed+2,'manual force remains available');
  let enabled=true;api.invalidateCustomizationUpdates(owner,cx,()=>enabled);enabled=false;
  const disabled=reads;await advance(15000);assert.equal(reads,disabled,'queued relay generation is canceled on disable');
  await advance(150000);assert.equal(reads,disabled+1,'updater polling still works with relay disabled');
  owner.customUpdateClosed=true;await advance(1000000);assert.equal(reads,disabled+1,'closed chrome does not keep checking');
  // A deployment begins before the main-check deadline and is still running
  // after it expires. Its readonly worker responses must not create a 300 ms
  // subprocess loop, and a newer merge hint must survive until it completes.
  const previous=worker.read(p.check);
  worker.atomic(p.check,{...previous,attempted:clock-160000,nextAttempt:clock-10000});
  const running={token:'busy-deployment',state:'running',phase:'deploying',pid:process.pid,started:clock-60000,deadline:clock+600000};
  worker.atomic(p.status,running);worker.atomic(p.lock,{token:running.token});
  const busy={};const beforeBusyReads=reads;
  api.initCustomizationUpdates(busy,cx,'custom-workspace-chrome',{chrome:true});await settle();
  const beforeBusyCalls=calls.length;
  assert.equal(worker.checkMain(home,options).retryAfter,clock+worker.BUSY_CHECK_RETRY,'worker explicitly defers a busy check');
  assert.equal(worker.read(p.check).nextAttempt,clock-10000,'busy checks do not fake a new main-check deadline');
  await advance(3000);
  assert.equal(calls.length,beforeBusyCalls,'overdue main-check deadline must not launch workers every 300 ms during deployment');
  assert.equal(reads,beforeBusyReads,'running deployment never checks Git');
  api.invalidateCustomizationUpdates(busy,cx);
  await advance(26999);assert.equal(calls.length,beforeBusyCalls,'hints cannot shorten the busy-job retry floor');
  await advance(1);assert.equal(calls.length,beforeBusyCalls+1);
  assert.equal(calls.at(-1).invalidate,true);assert.equal(busy.customAutoDirty,true,'busy reply preserves the pending hint');
  await advance(60000);assert.equal(calls.length,beforeBusyCalls+3,'long deployments use a bounded 30-second retry cadence');
  assert.equal(reads,beforeBusyReads);assert.equal(busy.customAutoDirty,true);
  const finished=clock;worker.atomic(p.status,{...running,state:'complete',finished});target='c'.repeat(40);
  await advance(30000);
  assert.equal(reads,beforeBusyReads+1,'one authoritative check catches up after completion');
  assert.equal(api.customizationUpdateSnapshot().check.target,target);assert.equal(busy.customAutoDirty,false);
  assert.equal(api.customizationUpdateSnapshot().locked,true,'availability catch-up cannot remove the deployment lock');
  busy.customUpdateClosed=true;
  assert.ok(calls.every(call=>call.action==='check'));console.log('PASS: actual controller/worker main availability, deferred rate/lease hints, storm backoff, busy-deploy retry/hint retention, manual bypass and independent fallback (no deployment)');
}finally{fs.rmSync(home,{recursive:true,force:true});}
