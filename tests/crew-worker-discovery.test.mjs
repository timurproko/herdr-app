// Completed discovery failures are not quiet work. Drive the actual recurring
// policy + registry row with fake Crew replies and a deterministic clock only.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const KEY='custom.crew.worker-space',SETTING='separateProjectSpaces';
const capability={capability:'worker-space-local-set',version:1,modes:['combined','per-project'],explicitHome:true};
async function fixture({failure,remote=false,known=false,hold=false}) {
 let now=100000,discoveryFailure=failure,release;
 const state={'custom.plugins':{crew:{enabled:true,settings:{[SETTING]:true}}}},calls=[],jobs=[],modes=new Map();
 const home=machine=>`C:/fixture/${machine??'local'}`,target=(machine,root)=>JSON.stringify([machine,root]);
 if(known)modes.set(target(null,'C:/fixture/custom'),'combined');
 const cx={spawn(fn){const p=fn(cx);jobs.push(p);return p;},notify(){}};
 const api=await loadMod({host:{checking:()=>false,shared:k=>state[k],setShared:(k,v)=>state[k]=v,machines:()=>remote?[{name:'pc2',layout:'ready'}]:[]},
  modules:{'space-color-state.js':'src/shared/space-color-state.js'},globals:{Date:class extends Date{static now(){return now;}}},
  entry:'export * as p from "./plugins/crew/worker-space.js";export * as r from "./plugins.js";'});
 const ask=async(machine,request)=>{
  calls.push({at:now,machine,...request});
  if(request.kind==='capability')return {code:0,stdout:JSON.stringify({identity:'fixture-'+machine,code:0,stdout:JSON.stringify(capability)})};
  if(request.kind==='discover') {
   if(hold && machine===null){hold=false;await new Promise(resolve=>release=resolve);}
   if(machine===null && discoveryFailure)return discoveryFailure;
   const root=home(machine);if(!modes.has(target(machine,root)))modes.set(target(machine,root),'combined');return {code:0,stdout:JSON.stringify({home:root})};
  }
  const key=target(machine,request.home);assert.ok(modes.has(key),'Only known roots may be read/written');
  if(request.kind==='read')return {code:0,stdout:'worker-space: '+modes.get(key)};
  assert.equal(request.kind,'set');const changed=modes.get(key)!==request.mode;modes.set(key,request.mode);
  return {code:0,stdout:JSON.stringify({...capability,ok:true,changed,home:request.home,mode:request.mode})};
 };
 const pulse=()=>api.p.refreshWorkerSpaces({cx,setting:()=>state['custom.plugins'].crew.settings[SETTING],knownHomes:()=>known?[{machine:null,home:'C:/fixture/custom'}]:[]},ask);
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
 const step=async(ms=1000)=>{pulse();await drain();now+=ms;};
 const row=()=>api.r.pluginSettingsRows('spaces')[0],board=()=>state[KEY];
 return {state,calls,modes,board,row,step,pulse,drain,advance:ms=>now+=ms,recover:()=>discoveryFailure=null,release:()=>release?.()};
}
for(const failure of [{code:2,stdout:''},{code:0,stdout:'{invalid'},{code:0,stdout:'{}'},{code:0,stdout:JSON.stringify({home:'relative'})}]) {
 const f=await fixture({failure});
 for(let i=0;i<120;i++)await f.step();
 const board=f.board(),row=f.row();assert.equal(board.available,false);assert.equal(board.lock,null);assert.equal(board.hosts.null.state,'failed');
 assert.equal(board.statuses.length,1,'Completed refused/invalid discovery must stay visible after retries');
 assert.equal(row.statuses.length,1);assert.equal(row.statuses[0].machine,'This computer');assert.match(row.statuses[0].detail,/discover.*Crew home/i);assert.equal(row.statuses[0].label,undefined,'One plain line, not a progress badge');
 assert.equal(f.calls.filter(c=>c.kind==='discover').length,12,'Retry uses the existing ten-second cadence, never every lifecycle tick');assert.equal(f.calls.filter(c=>c.kind==='set').length,0);
 f.recover();await f.step();await f.step();assert.equal(f.board().available,true);assert.equal(f.row().statuses.length,0);assert.equal(f.modes.get(JSON.stringify([null,'C:/fixture/local'])),'per-project');assert.equal(f.board().intent,true);
}
// A healthy subset must neither hide a failed machine nor block its own setter.
{
 const f=await fixture({failure:{code:2,stdout:''},remote:true});for(let i=0;i<8;i++)await f.step();
 assert.equal(f.board().available,true);assert.equal(f.row().statuses.length,1);assert.equal(f.row().statuses[0].machine,'This computer');assert.equal(f.modes.get(JSON.stringify(['pc2','C:/fixture/pc2'])),'per-project');
 f.recover();f.advance(10000);for(let i=0;i<5;i++)await f.step();assert.equal(f.row().statuses.length,0);
}
// Known custom roots can still reconcile even if default-home discovery fails;
// the unsuccessful discovery remains a separate, machine-named failure line.
{
 const f=await fixture({failure:{code:2,stdout:''},known:true});for(let i=0;i<6;i++)await f.step();
 assert.equal(f.modes.get(JSON.stringify([null,'C:/fixture/custom'])),'per-project');assert.equal(f.row().statuses.length,1);assert.equal(f.row().statuses[0].machine,'This computer');
 f.recover();f.advance(10000);for(let i=0;i<5;i++)await f.step();assert.equal(f.row().statuses.length,0);
}
// In-flight discovery remains quiet, and publishes failure only on completion.
{
 const f=await fixture({failure:{code:2,stdout:''},hold:true});f.pulse();for(let i=0;i<50;i++)await Promise.resolve();
 assert.ok(f.board().lock);assert.equal(f.row().statuses.length,0);f.release();await f.drain();assert.equal(f.row().statuses.length,1);
}
console.log('PASS completed discovery refusals/malformed replies, plain machine failure, bounded retry/recovery, healthy subsets, known custom roots and quiet in-flight discovery');
