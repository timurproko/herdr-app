import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const KEY='custom.crew.worker-space',SETTING='separateProjectSpaces';
const capability={capability:'worker-space-local-set',version:1,modes:['combined','per-project'],explicitHome:true};
const reply=(stdout,code=0)=>({code:0,stdout:JSON.stringify({code,stdout:Buffer.from(stdout).toString('base64'),stderr:'',timed_out:false}),stderr:''});
async function fixture({intent=false,remote=true,cap=capability,persisted,holdKind}={}) {
 let now=100000,online=remote,mode=new Map([['local|C:/fixture/local','combined'],['pc2|C:/fixture/remote','combined']]),refused=new Set(),hold=null;
 const state=persisted??{'custom.plugins':{crew:{enabled:true,settings:{[SETTING]:intent}}}},calls=[],jobs=[];
 const cx={spawn(fn){const p=fn(cx);jobs.push(p);return p;},notify(){}};
 const host={checking:()=>false,shared:k=>state[k],setShared:(k,v)=>state[k]=v,notify(){},
  machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:online?'ready':'offline'}],
  hc:async args=>{
   assert.equal(args[0],'exec','No real or orchestration command');assert.equal(args[args.indexOf('--')+1],'powershell');
   const script=args.at(-1),machine=args.includes('--on')?args[args.indexOf('--on')+1]:'local';
   assert.ok(machine!=='pc2'||online,'No offline execution');
   const home=/\$env:CREW_HOME = '([^']+)'/.exec(script)?.[1];
   let kind;if(script.includes('--capabilities --json'))kind='capability';else if(script.includes('status --json --view fleet'))kind='discover';else if(script.includes('--set-local'))kind='set';else if(script.includes('& node $main config worker-space'))kind='read';else throw Error('Unexpected script');
   calls.push({kind,machine,home,script});
   if(kind===holdKind && hold){const fn=hold;hold=null;await fn({kind,machine,home});}
   if(kind==='capability')return reply(JSON.stringify({identity:'fixture-'+machine,code:cap===null?2:0,stdout:JSON.stringify(cap)}));
   if(kind==='discover')return reply(JSON.stringify({home:machine==='local'?'C:/fixture/local':'C:/fixture/remote'}));
   const key=machine+'|'+home;assert.ok(mode.has(key),'Exact known home only');
   if(kind==='read')return reply('worker-space: '+mode.get(key));
   const desired=/--set-local '(combined|per-project)'/.exec(script)?.[1];assert.ok(desired);assert.ok(script.includes(`--home '${home}' --json`));
   assert.ok(!/CREW_TERMINAL|HC_TERMINAL_ID|crew\.json|start|end|takeover/.test(script),'No ownership/configuration workaround');
   if(!holdKind && hold){const fn=hold;hold=null;await fn({key,desired});}
   const envelope={capability:'worker-space-local-set',version:1,home,mode:desired,changed:mode.get(key)!==desired};
   if(refused.has(key))return reply(JSON.stringify({...envelope,ok:false,mode:null,changed:false,error:{code:'invalid-registry',message:'private detail not for UI'}}),2);
   mode.set(key,desired);return reply(JSON.stringify({...envelope,ok:true}));
  }};
 const load=()=>loadMod({host,globals:{Date:class extends Date{static now(){return now;}}},modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'export * as r from "./plugins.js";export * as p from "./plugins/crew/worker-space.js";export * as c from "./plugins/crew/worker-space-command.js";'});
 let api=await load();
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
 const step=async(n=1)=>{for(let i=0;i<n;i++){api.r.pluginEvent('workspace.settings.refresh',{cx});await drain();now+=250;}};
 const set=value=>api.r.setPluginSetting(api.r.pluginById('crew'),SETTING,value);
 return {state,calls,mode,refused,cx,step,set,drain,api,pulse:async()=>{api.r.pluginEvent('workspace.settings.refresh',{cx});await jobs.at(-1);},advance:n=>now+=n,online:v=>online=v,hold:fn=>hold=fn,restart:async()=>{api=await load();},board:()=>state[KEY]};
}
// On: every known home, not selected machine; two separate homes on one machine.
{
 const f=await fixture({intent:true});f.mode.set('local|C:/fixture/custom','combined');f.api.p.observeWorkerHome(null,'C:/fixture/custom');await f.step(20);
 assert.deepEqual([...f.mode.values()],['per-project','per-project','per-project'],JSON.stringify(f.board()));assert.equal(f.board().statuses.length,0);assert.equal(f.board().available,true);
 assert.equal(f.calls.filter(c=>c.kind==='set').length,3);
 // Off/default and both switch directions preserve exactly the same targets.
 f.set(false);await f.step(15);assert.deepEqual([...f.mode.values()],['combined','combined','combined']);f.set(true);await f.step(15);assert.ok([...f.mode.values()].every(m=>m==='per-project'));
}
// Missing capability, wrong marker/version and ignored flags cannot authorize setters.
for(const cap of [null,{...capability,version:2},{...capability,explicitHome:false},'worker-space: combined']) {
 const f=await fixture({intent:true,cap});await f.step(10);assert.equal(f.calls.filter(c=>c.kind==='set').length,0);assert.equal(f.board().available,false);assert.ok(f.board().statuses.some(s=>s.label==='Unsupported'));
}
// One refused home: successes survive, intent stays on, private prose never appears.
{
 const f=await fixture({intent:true});f.refused.add('pc2|C:/fixture/remote');await f.step(15);
 assert.equal(f.mode.get('local|C:/fixture/local'),'per-project');assert.equal(f.mode.get('pc2|C:/fixture/remote'),'combined');assert.equal(f.board().intent,true);
 assert.ok(f.board().statuses.some(s=>s.machine==='pc2'&&s.label==='Refused'));assert.ok(!JSON.stringify(f.board().statuses).includes('private detail'));
 f.refused.clear();f.advance(60000);await f.step(15);assert.equal(f.mode.get('pc2|C:/fixture/remote'),'per-project');
 // Latest intent while a setter is in flight is serialized after settlement.
 f.set(false);let release;f.hold(()=>new Promise(r=>release=r));f.api.r.pluginEvent('workspace.settings.refresh',{cx:f.cx});
 for(let i=0;i<30&&!release;i++)await Promise.resolve();assert.equal(typeof release,'function');f.set(true);
 const before=f.calls.filter(c=>c.kind==='set').length;f.api.r.pluginEvent('workspace.settings.refresh',{cx:f.cx});await Promise.resolve();assert.equal(f.calls.filter(c=>c.kind==='set').length,before);
 release();await f.drain();await f.step(15);assert.ok([...f.mode.values()].every(m=>m==='per-project'));
 // A lost reply may already have committed: retain the command deadline and
 // re-read, never overlap or blindly replay that home's setter.
 f.set(false);f.hold(({key,desired})=>{f.mode.set(key,desired);throw Error('lost reply');});
 await f.step();const afterLost=f.calls.filter(c=>c.kind==='set'&&c.machine==='local').length;
 await f.step(3);assert.equal(f.calls.filter(c=>c.kind==='set'&&c.machine==='local').length,afterLost);assert.ok(f.board().lock);
 f.advance(18000);await f.step(15);assert.ok([...f.mode.values()].every(m=>m==='combined'));
 assert.equal(f.calls.filter(c=>c.kind==='set'&&c.machine==='local').length,afterLost,'Committed unknown outcome was confirmed by read, not rewritten');
 // Refusal/protocol mapping is strict for all contract exits and wrong targets.
 for(const [code,error]of [[2,'invalid-home'],[3,'registry-busy'],[4,'io-error'],[70,'internal-error']]) {
  const r=f.api.c.setterResult({code,stdout:JSON.stringify({...capability,ok:false,home:null,mode:null,changed:false,error:{code:error}})},'C:/fixture/local','combined');assert.notEqual(r.status,'accepted');
 }
 assert.equal(f.api.c.setterResult({code:0,stdout:JSON.stringify({...capability,ok:true,home:'C:/other',mode:'combined',changed:true})},'C:/fixture/local','combined').status,'failed');
}
// Offline then reachable: apply only the newest intent, no offline subprocess.
{
 const f=await fixture({intent:true,remote:false});await f.step(10);assert.ok(f.board().statuses.some(s=>s.machine==='pc2'&&s.detail==='Not connected'));
 f.set(false);await f.step(10);f.set(true);f.online(true);await f.step(15);assert.equal(f.mode.get('pc2|C:/fixture/remote'),'per-project');
}
// A later observed home gets current intent, including a second home on pc2.
{
 const f=await fixture({intent:true});await f.step(15);f.mode.set('pc2|C:/fixture/later','combined');f.api.p.observeWorkerHome('pc2','C:/fixture/later');await f.step(10);assert.equal(f.mode.get('pc2|C:/fixture/later'),'per-project');
 for(let i=0;i<260;i++)f.api.p.observeWorkerHome('unreachable','C:/fixture/extra'+i);
 assert.equal(Object.keys(f.board().targets).length,256);assert.equal(f.board().overflow,true);assert.equal(f.board().available,false);
 assert.equal(f.api.c.absoluteHome('C:relative'),false);assert.equal(f.api.c.absoluteHome('\\\\server\\share'),false);
}
// Restart retains intent but not confirmation authority; disabled work has no followups.
{
 const f=await fixture({intent:true});await f.step(15);const count=f.calls.length;await f.restart();await f.step(15);assert.ok(f.calls.length>count);assert.ok([...f.mode.values()].every(m=>m==='per-project'));
 f.api.r.setPluginEnabled(f.api.r.pluginById('crew'),false);const before=f.calls.length;await f.step(5);assert.equal(f.calls.length,before);
}
// Each slow phase stays quiet and resumes without a Settings close/click.
for(const holdKind of ['capability','discover','read','set']) {
 const f=await fixture({intent:true,holdKind});let release;
 f.hold(()=>new Promise(r=>release=r));f.api.r.pluginEvent('workspace.settings.refresh',{cx:f.cx});
 for(let i=0;i<100&&!release;i++)await Promise.resolve();
 // Reads/sets first require the capability/discovery turns.
 if(!release){await f.drain();f.api.r.pluginEvent('workspace.settings.refresh',{cx:f.cx});for(let i=0;i<100&&!release;i++)await Promise.resolve();}
 assert.equal(typeof release,'function',holdKind);assert.equal(f.board().statuses.length,0,holdKind+' has no progress/error lines');
 f.advance(15000);const count=f.calls.length;await f.pulse();assert.equal(f.calls.length,count,'live bounded command coalesces');
 release();await f.drain();await f.step(20);assert.ok([...f.mode.values()].every(m=>m==='per-project'),holdKind+' resumes');assert.equal(f.board().statuses.length,0);
}
// A native continuation lost while reading is replaced after its command lease;
// its eventual receipt cannot start another setter or overwrite its successor.
{
 const f=await fixture({intent:true,holdKind:'read'});await f.step();let release;
 f.hold(()=>new Promise(r=>release=r));f.api.r.pluginEvent('workspace.settings.refresh',{cx:f.cx});for(let i=0;i<100&&!release;i++)await Promise.resolve();assert.ok(release);
 f.advance(18001);await f.pulse();const setters=f.calls.filter(c=>c.kind==='set').length;
 release();await f.drain();assert.equal(f.calls.filter(c=>c.kind==='set').length,setters,'obsolete reader cannot write');await f.step(20);assert.equal(f.board().statuses.length,0);
}
console.log('PASS fake Crew on/off, quiet slow phases, abandoned read, capability missing, refused home, offline return, later home and restart');
