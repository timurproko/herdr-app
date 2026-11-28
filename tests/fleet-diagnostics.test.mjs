// Packaged Crew provider/transport and disposable supported CAS log IO. No live app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadMod} from '../tools/plugin-harness.mjs';
const secret='PRIVATE_TOKEN_and_task_transcript';
const clone=x=>JSON.parse(JSON.stringify(x));
const b64=x=>Buffer.from(x).toString('base64');
const reply=(value,code=0,extra={})=>({code:0,stdout:JSON.stringify({code,stdout:b64(typeof value==='string'?value:JSON.stringify(value)),stderr:b64(secret),...extra})});
const root=fs.mkdtempSync(path.resolve('.artifacts/fleet-diagnostics-'));
const status={home:'C:/private-home/.crew',owner:{terminal:'owner',live:true},tasks:[{id:'ship',terminal:'worker',state:'working',pr:null,report:secret}]};
async function fixture() {
 const home=fs.mkdtempSync(path.join(root,'case-'));fs.mkdirSync(path.join(home,'.customizations'));
 let now=100000,rendering=false,checking=false,layout='ready',answer=()=>reply(status),failWrites=false,conflicts=0,reads=0,writes=0;
 const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true},'custom.fleet.generation':7};
 const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'w'}]},{id:'other',tabs:[]}];
 const all=[{tab:'c',pane:'cp',terminal:'owner'},{tab:'w',pane:'wp',terminal:'worker'}];
 const list=[{address:'owner',state:'live',labels:{'custom.crew.home':'1'}},{address:'worker',state:'live',labels:{'crew.task':'ship','crew.home':'home','herdr.space':'fm-crew-home'}}];
 const noRender=()=>assert.equal(rendering,false,'No render effects');
 const jobs=[],cx={spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));},notify(){noRender();}};
 const host={shared:k=>state[k],setShared(k,v){noRender();state[k]=clone(v);},spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout}],checking:()=>checking,
  appHome:()=>home,async readTextFile(file){noRender();reads++;return fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;},
  async writeTextFile(file,text,expected){noRender();writes++;if(failWrites || conflicts-->0)throw Error(secret);assert.equal(fs.existsSync(file)?fs.readFileSync(file,'utf8'):null,expected);fs.writeFileSync(file,text);},
  async hc(){noRender();return answer();}};
 const load=()=>loadMod({host,globals:{Date:class extends Date{static now(){return now;}}},modules:{'space-color-state.js':'src/shared/space-color-state.js'},
  entry:'export * as f from "./plugins/crew/fleet.js";export * as d from "./plugins/crew/fleet-diagnostics.js";export * as p from "./plugins/crew/plugin.js";export * as r from "./plugins.js";'});
 const api=await load(),drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));await api.d.flushFleetLog();};
 return {...api,state,groups,all,list,load,cx,home,drain,advance:ms=>now+=ms,setAnswer:fn=>answer=fn,setLayout:v=>layout=v,setFailWrites:v=>failWrites=v,setConflicts:v=>conflicts=v,setChecking:v=>checking=v,
  event:()=>api.r.pluginEvent('spaces.refresh',{cx,force:true}),
  inspect(fn){const before=JSON.stringify(state),io=reads+writes;rendering=true;try{fn();}finally{rendering=false;}assert.equal(JSON.stringify(state),before);assert.equal(reads+writes,io);},
  diagnostic:()=>state[api.d.DIAGNOSTICS_KEY]?.entries.local,
  log:()=>fs.existsSync(path.join(home,'.customizations',api.d.LOG_NAME))?fs.readFileSync(path.join(home,'.customizations',api.d.LOG_NAME),'utf8'):''};
}
try {
 for(const [reason,prepare]of [
  ['transport-error',x=>x.setAnswer(()=>{throw Error(secret);})],
  ['status-timeout',x=>x.setAnswer(()=>reply('',null,{timed_out:true}))],
  ['status-exit',x=>x.setAnswer(()=>reply('',19))],
  ['invalid-status',x=>x.setAnswer(()=>reply('{broken '+secret))],
  ['no-owner',x=>x.setAnswer(()=>reply({...status,owner:null}))],
  ['no-fleet',x=>x.setAnswer(()=>reply({...status,tasks:[]}))],
  ['identity-mismatch',x=>x.list[1].labels['crew.home']='conflict'],
  ['membership-incomplete',x=>x.all.pop()],
  ['layout-unready',x=>x.setLayout('loading')],
 ]) {
  const x=await fixture();prepare(x);x.event();await x.drain();
  const event=x.diagnostic().lastFailure;
  assert.equal(event.reason,reason);assert.equal(event.at,100000);assert.equal(event.generation,7);assert.equal(event.currentGeneration,7);
  assert.deepEqual(event.subject,{parent:'coordinator',owner:'owner'});
  if(reason==='status-timeout')assert.equal(event.timeout,15);
  if(reason==='status-exit')assert.equal(event.code,19);
  if(['no-owner','no-fleet','identity-mismatch'].includes(reason))assert.equal(x.diagnostic().retry??null,null,'Authoritative absence/conflict does not start recovery');
  else assert.equal(x.diagnostic().retry.nextAt,102000);
  assert.equal(x.r.pluginWorkspaceLinks().length,0);assert.equal(x.r.pluginWorkspaceLinks({presentation:true}).length,0);
  x.inspect(()=>{
   const context=x.r.pluginPullContext('coordinator',{presentation:true});
   if(!['no-owner','no-fleet','identity-mismatch'].includes(reason)) {assert.equal(context.stale,true);assert.equal(context.verification.reason,reason);assert.equal(context.links.length,0);}
   assert.equal(x.r.pluginPullContext('other',{presentation:true}),null);
  });
  const diag=JSON.stringify(x.diagnostic());assert.doesNotMatch(diag,new RegExp(secret+'|private-home|report|stdout|stderr'));
  const lines=x.log().trim().split('\n');assert.equal(lines.length,1);assert.equal(JSON.parse(lines[0]).reason,reason);assert.doesNotMatch(x.log(),new RegExp(secret+'|private-home|"ship"|"worker"'));
  // Duplicate mod copies retain the latest timestamp but not repeated log spam.
  x.advance(1);const peer=await x.load();peer.r.pluginEvent('spaces.refresh',{cx:x.cx,force:true});await x.drain();await peer.d.flushFleetLog();
  assert.equal(x.log().trim().split('\n').length,1);assert.equal(x.diagnostic().lastFailure.at,100001);
 }
 {
  const x=await fixture();x.setAnswer(()=>reply('',null,{timed_out:true}));x.event();await x.drain();
  x.setAnswer(()=>reply(status));x.event();await x.drain();assert.equal(x.diagnostic().resolvedAt,100000);assert.equal(x.diagnostic().lastFailure.reason,'status-timeout');
  assert.equal(x.r.pluginWorkspaceLinks().length,1);assert.equal(x.r.pluginPullContext('coordinator',{presentation:true}).stale,false);
  assert.equal(x.r.pluginPullContext('coordinator',{presentation:true}).provider,'crew','The registry supplies immutable provider provenance, not a provider-supplied alias');
  const at=x.state[x.f.FLEET_KEY].entries.local.at;x.advance(31000);x.setAnswer(()=>{throw Error(secret);});x.event();await x.drain();
  assert.equal(x.state[x.f.FLEET_KEY].entries.local.at,at,'Failure never renews success');
  const stale=x.r.pluginPullContext('coordinator',{presentation:true});assert.equal(stale.stale,true);assert.equal(stale.verification.reason,'transport-error');
  x.list[0].address='replacement';
  const waiting=x.r.pluginPullContext('coordinator',{presentation:true});
  assert.notEqual(waiting.scope,stale.scope,'Changed owner gets an empty Loading scope, never the prior inventory');
  assert.equal(waiting.stale,true);assert.equal(waiting.links.length,0);
  assert.equal(waiting.verification,null,'Changed/missing owner cannot inherit the former owner failure feedback');
  assert.equal(x.r.pluginPullContext('coordinator'),null,'Remembered Loading grants no operational authority');
 }
 for(const [change,reason]of [
  [x=>x.state['custom.fleet.generation']++,'obsolete-generation'],
  [x=>x.state['custom.plugins'].crew.enabled=false,'disabled'],
  [x=>x.state['custom.fleet.reads'].local.token='replacement','replaced-read'],
  [x=>x.advance(45001),'expired-read'],
  [x=>x.list[1].labels['crew.home']='changed','obsolete-identity'],
 ]) {
  const x=await fixture();let release;x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event();for(let i=0;i<30;i++)await Promise.resolve();change(x);
  release(reply(status));await x.drain();assert.equal(x.diagnostic().lastDiscard.reason,reason);assert.equal(x.diagnostic().lastDiscard.generation,7);
  assert.equal(x.r.pluginWorkspaceLinks().length,0);assert.equal(JSON.parse(x.log().trim()).reason,reason);
 }
 {
  const x=await fixture();let release;x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event();for(let i=0;i<30;i++)await Promise.resolve();
  x.state['custom.fleet.generation']++;x.state['custom.fleet.reads']={};x.setAnswer(()=>reply(status));x.event();
  for(let i=0;i<60;i++)await Promise.resolve();const success=clone(x.state[x.f.FLEET_KEY]);
  release(reply(status));await x.drain();assert.deepEqual(x.state[x.f.FLEET_KEY],success,'Old completion cannot overwrite newer success');
  assert.equal(x.diagnostic().lastDiscard.reason,'obsolete-generation');assert.equal(x.diagnostic().lastFailure,undefined);
 }
 {
  const x=await fixture();x.setConflicts(1);x.setAnswer(()=>{throw Error(secret);});x.event();await x.drain();assert.equal(x.diagnostic().logFailed,false);assert.equal(x.log().trim().split('\n').length,1);
  x.setFailWrites(true);x.advance(1);x.setAnswer(()=>reply('',9));x.event();await x.drain();assert.equal(x.diagnostic().logFailed,true);assert.equal(x.diagnostic().lastFailure.reason,'status-exit');
  x.setAnswer(()=>reply(status));x.event();await x.drain();assert.equal(x.r.pluginWorkspaceLinks().length,1,'Log failure does not prevent verification');
 }
 {
  const x=await fixture();for(let i=0;i<150;i++){x.advance(1);x.d.recordFleetFailure(null,i%2?'status-exit':'status-timeout',7);await x.d.flushFleetLog();}
  assert.equal(x.log().trim().split('\n').length,128);assert.ok(Buffer.byteLength(x.log())<=65536);
  fs.writeFileSync(path.join(x.home,'.customizations',x.d.LOG_NAME),('x'.repeat(1024)+'\n').repeat(128));
  x.d.recordFleetFailure(null,'invalid-status',7);await x.d.flushFleetLog();assert.ok(Buffer.byteLength(x.log())<=65536);assert.ok(x.log().trim().split('\n').length<=128);
  for(let i=0;i<260;i++)x.d.recordFleetFailure(`machine-${i}`,'no-fleet',7);await x.d.flushFleetLog();assert.equal(Object.keys(x.state[x.d.DIAGNOSTICS_KEY].entries).length,256);
 }
 {
  const x=await fixture();x.setAnswer(()=>{throw Error(secret);});x.event();await x.drain();
  const original=clone(x.diagnostic().lastFailure),subject={parent:'coordinator',owner:'owner'};
  for(const bad of [{reason:secret},{at:secret},{at:8640000000000001},{generation:999}]){
   x.state[x.d.DIAGNOSTICS_KEY].entries.local.lastFailure={...original,...bad};
   x.inspect(()=>assert.equal(x.d.fleetVerification(null,subject),null,'Corrupt persisted diagnostics cannot break native date formatting or expose raw text'));
  }
 }
 {
  const x=await fixture();let calls=0;x.setAnswer(()=>{calls++;throw Error(secret);});x.event();await x.drain();assert.equal(x.diagnostic().retry.attempts,1);
  x.list.splice(0);x.advance(60001);x.event();await x.drain();assert.equal(calls,1,'No candidate means no recovery IO');assert.equal(x.diagnostic().retry,null);
 }
 {
  const x=await fixture();x.setChecking(true);x.setAnswer(()=>{assert.fail('No checking-time IO');});x.event();x.d.recordFleetFailure(null,'transport-error',7);await x.drain();
  assert.equal(x.diagnostic(),undefined);assert.equal(x.log(),'');
 }
 console.log('PASS packaged fleet reason/time/generation diagnostics, safe bounded CAS log, deduplication, cold/stale scope, obsolete replies and log-failure isolation');
} finally {fs.rmSync(root,{recursive:true,force:true});}
