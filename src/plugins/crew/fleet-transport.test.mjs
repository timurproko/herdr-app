import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadMod} from '../../../tools/plugin-harness.mjs';

const url='https://github.com/example/repo/pull/12';
const legacy={home:'C:/fixture/.crew',owner:{terminal:'owner',live:true},tasks:[{id:'ship',terminal:'worker',state:'working',pr:url}]};
const discovered={...legacy,prDiscovery:{version:1},tasks:[{...legacy.tasks[0],pr:null,prDiscovery:{status:'known',url,source:'github',reason:null}}]};
const b64=text=>Buffer.from(text).toString('base64');
const reply=(stdout='',code=0,stderr='',extra={})=>({code:0,stdout:JSON.stringify({code,stdout:b64(stdout),stderr:b64(stderr),...extra})});
const unsupported=()=>reply('',1,'crew: Unknown option: --discover-prs\n');
const copy=value=>JSON.parse(JSON.stringify(value));
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function fixture(machine=null) {
  let now=100000,answer=async()=>reply(JSON.stringify(discovered));
  const qualify=id=>machine?`${machine}/${id}`:id;
  const groups=[{id:qualify('coordinator'),machine,tabs:[{id:qualify('c')}]},{id:qualify('fm-crew-home'),machine,tabs:[{id:qualify('w')}]}];
  const all=[{tab:qualify('c'),pane:'cp',terminal:qualify('owner')},{tab:qualify('w'),pane:'wp',terminal:qualify('worker')}];
  const list=[{address:qualify('owner'),state:'live',labels:{'custom.crew.home':'1'}},{address:qualify('worker'),state:'live',labels:{'crew.task':'ship','crew.home':'home','herdr.space':'fm-crew-home'}}];
  const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}},calls=[],jobs=[];
  const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:machine,layout:'ready'}],checking:()=>false,
    hc:async args=>{calls.push(args);return answer(args);}};
  const load=()=>loadMod({host,globals:{Date:class extends Date{static now(){return now;}}},modules:{'space-color-state.js':'src/shared/space-color-state.js'},
    entry:'import * as f from "./plugins/crew/fleet.js";import * as p from "./plugins/crew/plugin.js";import * as r from "./plugins.js";export {f,p,r};'});
  const {f,p,r}=await load(),cx={spawn:fn=>jobs.push(Promise.resolve().then(()=>fn(cx))),notify(){}};
  const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
  return {f,p,r,load,cx,drain,calls,state,groups,all,list,qualify,get now(){return now;},advance:ms=>now+=ms,setAnswer:fn=>answer=fn,
    event:(force=false)=>r.pluginEvent('workspace.context.refresh',{cx,force}),context:()=>r.pluginPullContext(qualify('coordinator'))};
}
const command=call=>call.at(-1),timeout=call=>call[call.indexOf('--timeout')+1];
const checkCommand=(call,machine,discover)=>{
  assert.deepEqual(Array.from(call.slice(0,call.indexOf('--'))),['exec',...(machine?['--on',machine]:[]),'--timeout',discover?'25':'15','--json']);
  assert.deepEqual(Array.from(call.slice(call.indexOf('--')+1,-1)),['powershell','-NoProfile','-NonInteractive','-Command']);
  assert.match(command(call),/\$main = Join-Path \$tool 'crew\.mjs'/);
  assert.match(command(call),/InvokeCrew status '--all' '--json'/);
  assert.equal(command(call).includes("'--discover-prs'"),discover);
  assert.doesNotMatch(command(call),/home --ensure|\b(?:install|clone|fetch|pull|init|Set-Content|New-Item|Remove-Item)\b/);
};
for(const machine of [null,'pc2'])for(const payload of [discovered,legacy,{...legacy,prDiscovery:{version:99}}]) {
  const x=await fixture(machine);x.setAnswer(async()=>reply(JSON.stringify(payload)));
  const output=await x.p.readFleetStatus(machine);assert.equal(output,JSON.stringify(payload));
  assert.equal(x.calls.length,1,'Successful missing/unknown versions never get a compatibility retry');checkCommand(x.calls[0],machine,true);
  assert.equal(x.f.recordedSource(output).tasks[0].pr,url);
}
for(const message of ['crew: Unknown option: --discover-prs','unknown flag --discover-prs','unsupported argument: "--discover-prs"']) {
  const x=await fixture('pc2');x.setAnswer(async()=>x.calls.length===1?reply('',2,message):reply(JSON.stringify(legacy)));
  assert.equal(await x.p.readFleetStatus('pc2'),JSON.stringify(legacy));assert.equal(x.calls.length,2);
  checkCommand(x.calls[0],'pc2',true);checkCommand(x.calls[1],'pc2',false);
}
for(const message of ['crew: Unknown option: --view','unsupported flag --view fleet','unsupported view: fleet']) {
  const x=await fixture();x.setAnswer(async()=>x.calls.length===1?reply('',2,message):reply(JSON.stringify(discovered)));
  assert.equal(await x.p.readFleetStatus(null),JSON.stringify(discovered));assert.equal(x.calls.length,2);
  assert.ok(!command(x.calls[1]).includes('--help'),'A narrowly refused advertised view explicitly forces projected legacy status');
  assert.match(command(x.calls[1]),/\$fleetView = \$false/);
}
{
  const x=await fixture();x.setAnswer(async()=>x.calls.length===1?reply('',2,'unknown option --view'):x.calls.length===2?unsupported():reply(JSON.stringify(legacy)));
  assert.equal(await x.p.readFleetStatus(null),JSON.stringify(legacy));assert.equal(x.calls.length,3,'Only independent exact capability refusals permit both fallbacks');
  assert.ok(!command(x.calls[2]).includes("'--discover-prs'"));
}
{
  const x=await fixture();x.setAnswer(async()=>{
    if(x.calls.length===1){x.advance(24000);return reply('',2,'unknown option --view');}
    if(x.calls.length===2){x.advance(14000);return unsupported();}
    return reply(JSON.stringify(legacy));
  });
  await x.p.readFleetStatus(null);
  assert.deepEqual(x.calls.map(timeout),['25','16','2'],'All capability fallbacks share a 40-second total command budget inside the transport lease');
}
for(const failure of [
  ()=>reply('',1,'authentication required'),
  ()=>reply('',1,'auth failed: unknown option --view'),()=>reply('output',1,'unknown option --view'),
  ()=>reply('',1,'unknown option --view\npermission denied'),()=>reply('',1,'unsupported view: another'),()=>reply('',1,'auth failed: unknown option --discover-prs'),
  ()=>reply('',1,'crew: Unknown option: --all'),()=>reply('',1,'crew: Unknown option: --discover-prs\nAuthentication failed'),
  ()=>reply('authentication required',1,'crew: Unknown option: --discover-prs'),
  ()=>reply('',127,'crew: Unknown option: --discover-prs'),()=>reply('',null,'crew: Unknown option: --discover-prs',{timed_out:true}),
  ()=>({code:1,stderr:JSON.stringify({error:{kind:'machine_unreachable',message:'offline'}})}),
  ()=>({code:1,stderr:JSON.stringify({error:{kind:'spawn_failed',message:'crew: Unknown option: --discover-prs'}})}),
  ()=>{throw Error('transport authentication failed');},
]) {
  const x=await fixture();x.setAnswer(async()=>failure());
  await assert.rejects(x.p.readFleetStatus(null));assert.equal(x.calls.length,1,'Non-capability failures never fall back');
}
for(const failure of [unsupported,()=>reply('',1,'auth failed'),()=>reply('',null,'timeout',{timed_out:true})]) {
  const x=await fixture();x.setAnswer(async()=>x.calls.length===1?unsupported():failure());
  await assert.rejects(x.p.readFleetStatus(null));assert.equal(x.calls.length,2,'Fallback failure never retries');
}
{
  const x=await fixture();x.setAnswer(async()=>reply('{malformed'));
  await x.event();await x.drain();assert.equal(x.calls.length,1);assert.equal(x.context(),null,'Malformed success is uncertainty, not none');
  assert.equal(x.state[x.f.FLEET_KEY].entries.local.status,undefined);
}
{
  const x=await fixture();await assert.rejects(x.p.readFleetStatus(null,{current:()=>false}),error=>error.reason==='obsolete-generation');assert.equal(x.calls.length,0);
}

// Fake-clock worst case: a 25-second discovery refusal followed by a 15-second
// compatibility read must stay single-flight across packaged mod copies.
{
  const x=await fixture();x.event(true);await x.drain();const at=x.state[x.f.FLEET_KEY].entries.local.at;
  x.advance(10001);let releaseDiscovery,releaseFallback;
  x.setAnswer(()=>new Promise(resolve=>{if(x.calls.length===2)releaseDiscovery=resolve;else releaseFallback=resolve;}));
  x.event();await tick();assert.equal(x.state['custom.fleet.reads'].local.until,x.now+45000);
  x.advance(25000);releaseDiscovery(unsupported());await tick();
  assert.equal(x.calls.length,3);assert.equal(timeout(x.calls[2]),'15');
  const peer=await x.load();peer.r.pluginEvent('spaces.refresh',{cx:x.cx});x.event(true);await tick();assert.equal(x.calls.length,3,'Both entrypoints and mod copies coalesce');
  assert.equal(x.context(),null,'Long reads never extend 30-second action freshness');
  assert.equal(x.r.pluginPullContext('coordinator',{presentation:true}).stale,true);
  x.advance(14000);x.event();await tick();assert.equal(x.calls.length,3,'Lease covers discovery plus bounded fallback');
  releaseFallback(reply(JSON.stringify(legacy)));await x.drain();assert.equal(x.context().links[0].url,url);
  assert.equal(x.state[x.f.FLEET_KEY].entries.local.at,x.now);assert.ok(x.now>at+30000);
  x.setAnswer(async()=>reply('',null,'timeout',{timed_out:true}));
  x.advance(9999);x.event();await x.drain();assert.equal(x.calls.length,3,'TTL is still ten seconds after completion');
  x.advance(2);x.event();await x.drain();assert.equal(x.calls.length,4);
  const successAt=x.state[x.f.FLEET_KEY].entries.local.at;
  for(let i=0;i<5;i++)x.event();await x.drain();assert.equal(x.calls.length,4,'Failures use existing attempt backoff, no retry loop');
  assert.equal(x.state[x.f.FLEET_KEY].entries.local.at,successAt,'Timeout does not renew successful freshness');
  assert.equal(x.state[x.f.FLEET_KEY].entries.local.status.discovery,undefined,'Timeout is not a new discovery none result');
}
for(const change of ['plugin','preference','generation','read','owner']) {
  const x=await fixture();x.event(true);await x.drain();const before=copy(x.state[x.f.FLEET_KEY].entries.local);let release;
  x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event(true);await tick();
  if(change==='plugin')x.state['custom.plugins'].crew.enabled=false;
  if(change==='preference')x.state['custom.spaces.preferences'].connectFleetToCoordinator=false;
  if(change==='generation')x.f.invalidateFleet();
  if(change==='read')x.state['custom.fleet.reads'].local.token='newer-read';
  if(change==='owner'){x.list[0].address='replacement';x.all[0].terminal='replacement';}
  release(unsupported());await x.drain();assert.equal(x.calls.length,2,`${change}: obsolete read cannot start fallback`);
  const after=x.state[x.f.FLEET_KEY]?.entries?.local;
  if(after){assert.equal(after.at,before.at);assert.deepEqual(copy(after.status),before.status,'No obsolete discovery publication');}
  if(['plugin','preference','generation','owner'].includes(change))assert.equal(x.context(),null,`${change}: no worker action authority`);
}
for(const change of ['plugin','preference','generation','owner']) {
  const x=await fixture();x.event(true);await x.drain();let release;
  x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event(true);await tick();
  if(change==='plugin')x.state['custom.plugins'].crew.enabled=false;
  if(change==='preference')x.state['custom.spaces.preferences'].connectFleetToCoordinator=false;
  if(change==='generation')x.f.invalidateFleet();
  if(change==='owner'){x.list[0].address='replacement';x.all[0].terminal='replacement';}
  release(reply(JSON.stringify(discovered)));await x.drain();assert.equal(x.context(),null,`${change}: late successful discovery cannot restore action context`);
}
{
  const x=await fixture();x.event(true);await x.drain();const before=copy(x.state[x.f.FLEET_KEY].entries.local);let release;
  x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event(true);await tick();x.advance(45001);
  release(unsupported());await x.drain();assert.equal(x.calls.length,2,'Expired lease cannot start fallback');
  assert.equal(x.state[x.f.FLEET_KEY].entries.local.at,before.at);assert.equal(x.context(),null);
}
const docs=fs.readFileSync(new URL('../../../docs/ARCHITECTURE.md',import.meta.url),'utf8');
for(const text of ['25-second','15-second','45-second','10-second TTL','30-second freshness'])assert.ok(docs.includes(text),`Timing guidance contains ${text}`);
console.log('PASS Crew advertised fleet view/projected legacy transport, exact view/discovery fallbacks, joint command budget, transport/processing leases and unchanged obsolete generations');
