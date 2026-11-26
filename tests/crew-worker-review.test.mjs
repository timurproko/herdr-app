// Production discovery paths and retired command ownership, fake Crew only.
import assert from 'node:assert/strict';
import {test} from 'node:test';
import {loadMod} from '../tools/plugin-harness.mjs';
const KEY='custom.crew.worker-space',SETTING='separateProjectSpaces';
const cap={capability:'worker-space-local-set',version:1,modes:['combined','per-project'],explicitHome:true};
const reply=(stdout,code=0,timedOut=false)=>({code:0,stdout:JSON.stringify({code,stdout:Buffer.from(stdout).toString('base64'),stderr:'',timed_out:timedOut})});
async function fixture() {
 let now=100000,hold=null,groups=[{id:'coordinator',machine:null,tabs:[{id:'tab1'}]},{id:'fm-crew-tag',machine:null,tabs:[{id:'tab2'}]}];
 const state={'custom.plugins':{crew:{enabled:true,settings:{[SETTING]:true}}},'custom.spaces.preferences':{version:1,connectFleetToCoordinator:false}},calls=[],jobs=[];
 const modes=new Map([['C:/fixture/default','combined']]),readFailures=new Set();
 const host={checking:()=>false,shared:k=>state[k],setShared:(k,v)=>state[k]=v,notify(){},machines:()=>[{name:null,layout:'ready'}],spaces:()=>groups,panes:()=>[],terminals:()=>[],
  hc:async args=>{
   if(args[0]==='ls')return {code:0,stdout:'{"terminals":[]}'};
   assert.equal(args[0],'exec');assert.ok(!args.includes('--on'),'This fixture has local homes only');
   const script=args.at(-1);
   if(script==='$env:PROCESSOR_ARCHITECTURE')return reply('AMD64');
   if(script.includes("'root=' + $root"))return reply('root=C:/fixture/inspection\ntool=C:/fixture/tool/bin\nversion=1.0.0\nhome=1\nlegacy=1\nold=home\npath=C:/fixture/bin');
   if(script.includes('& node $main home --ensure'))return reply('C:/fixture/default/coordinator');
   if(script.includes('session-dir.js'))return reply('helper=');
   const kind=script.includes('--capabilities --json')?'capability':script.includes('status --json --view fleet')?'discover':script.includes('--set-local')?'set':'read';
   const home=/\$env:CREW_HOME = '([^']+)'/.exec(script)?.[1];calls.push({kind,home,at:now});
   if(kind==='capability')return reply(JSON.stringify({identity:'fixture',code:0,stdout:JSON.stringify(cap)}));
   if(kind==='discover')return reply(JSON.stringify({home:'C:/fixture/default'}));
   assert.ok(modes.has(home),'No unobserved root or real home may be read');
   if(kind==='read')return readFailures.has(home)?reply('',4):reply('worker-space: '+modes.get(home));
   const mode=/--set-local '(combined|per-project)'/.exec(script)?.[1];assert.ok(mode);
   if(hold){const fn=hold;hold=null;return await fn();}
   modes.set(home,mode);return reply(JSON.stringify({...cap,ok:true,home,mode,changed:true}));
  }};
 const api=await loadMod({host,globals:{Date:class extends Date{static now(){return now;}}},modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'export * as r from "./plugins.js";export * as f from "./plugins/crew/fleet.js";export * as crew from "./plugins/crew/plugin.js";'});
 const cx={spawn(fn){const p=fn(cx);jobs.push(p);return p;},notify(){}};
 const start=()=>api.r.pluginEvent('workspace.settings.refresh',{cx});
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
 const step=async(n=1)=>{for(let i=0;i<n;i++){start();await drain();now+=250;}};
 const plugin=api.r.pluginById('crew');
 return {api,plugin,state,modes,readFailures,calls,cx,start,step,drain,board:()=>state[KEY],time:()=>now,advance:n=>now+=n,set:v=>api.r.setPluginSetting(plugin,SETTING,v),enable:v=>api.r.setPluginEnabled(plugin,v),hold:fn=>hold=fn,groups:v=>groups=v};
}
const remembered={version:1,entries:{null:{machine:null,parent:'coordinator',child:'fm-crew-tag',home:'C:/fixture/custom',owner:'t1',ownerTab:'tab1',ownerPane:'pane1',adoption:'tag'}}};
for(const prune of [false,true])test('existing remembered/status roots enter attachment-off policy'+(prune?' before display pruning':''),async()=>{
 const f=await fixture();f.state['custom.fleet.display']=structuredClone(remembered);
 f.state['custom.fleet.links']={version:1,entries:{local:{machine:null,at:1,verificationStatus:{home:'C:/fixture/previous',owner:{terminal:null,live:false},tasks:[]}}}};
 f.modes.set('C:/fixture/custom','combined');f.modes.set('C:/fixture/previous','combined');
 f.state['custom.spaces.preferences'].connectFleetToCoordinator=true;
 assert.equal(f.api.f.fleetContexts({presentation:true})[0].home,'C:/fixture/custom','Production presentation validates the remembered identity');
 f.state['custom.spaces.preferences'].connectFleetToCoordinator=false;
 if(prune){f.groups([]);f.api.r.pluginEvent('spaces.refresh',{cx:f.cx});await f.drain();}
 await f.step();
 assert.ok(Object.values(f.board().targets).some(t=>t.home==='C:/fixture/custom'&&t.state==='pending'),'Remembered home must be admitted, never treated as confirmed');
 if(!prune) {
  f.readFailures.add('C:/fixture/custom');await f.step(12);
  assert.equal(f.modes.get('C:/fixture/default'),'per-project');assert.equal(f.modes.get('C:/fixture/custom'),'combined');
  assert.ok(f.board().statuses.some(s=>s.machine==='This computer'&&s.label==='Failed'),'A successful default cannot hide an unread remembered home');
  f.readFailures.clear();f.advance(10000);
 }
 await f.step(12);
 for(const home of f.modes.keys()) {
  assert.equal(f.modes.get(home),'per-project',home);
  assert.ok(f.calls.some(c=>c.kind==='read'&&c.home===home),'Each root needs a fresh scoped getter');
  assert.ok(f.calls.some(c=>c.kind==='set'&&c.home===home),'Each differing known root receives the explicit setter');
 }
 assert.equal(f.board().statuses.length,0);
});
test('successful existing-home inspection feeds policy without attachment',async()=>{
 const f=await fixture(),home='C:/fixture/inspection/home';f.modes.set(home,'combined');
 const check=f.plugin.prerequisites.find(p=>p.id==='home');
 assert.equal((await check.check(f.api.r.pluginContext(f.plugin))).status,'ready');
 assert.ok(Object.values(f.board()?.targets??{}).some(t=>t.home.replaceAll('\\','/')===home),'The real inspection path must publish its observed legacy root');
 await f.step(12);assert.equal(f.modes.get(home),'per-project');
});
test('successful coordinator preparation observes the actual Crew home',async()=>{
 const f=await fixture();
 const launch=await f.api.crew.prepareCoordinatorLaunch({machine:null,argv:['a1'],setting:()=>''});
 assert.equal(launch.cwd.replaceAll('\\','/'),'C:/fixture/default/coordinator');
 assert.ok(Object.values(f.board()?.targets??{}).some(t=>t.home==='C:/fixture/default'),'Successful preparation must feed the read-only home observation, not strip a guessed cwd suffix');
});
for(const disable of [false,true])test('superseded timed-out setter retains lease'+(disable?' across disable/re-enable':''),async()=>{
 const f=await fixture();await f.step();let release;
 f.hold(()=>new Promise(resolve=>{release=()=>resolve(reply('',null,true));}));f.start();
 for(let i=0;i<40&&!release;i++)await Promise.resolve();assert.equal(typeof release,'function');
 const deadline=f.board().lock.until;f.set(false);if(disable)f.enable(false);
 f.advance(deadline-3000-f.time());release();await f.drain();
 assert.equal(f.board().lock?.until,deadline,'Timeout evidence must survive supersession and retain the unexpired command bound');
 if(disable)f.enable(true);
 const before=f.calls.length;await f.step();assert.equal(f.calls.length,before,'No new getter or setter may run during the old command allowance');
 f.advance(deadline-1000-f.time());f.modes.set('C:/fixture/default','per-project'); // retired write publishes at 17s
 await f.step();assert.equal(f.calls.length,before);assert.ok(f.board().statuses.length,'An unknown retired write cannot clear incomplete status');
 assert.notEqual(Object.values(f.board().targets)[0].state,'ready');
 f.advance(deadline-f.time());await f.step(3);
 assert.equal(f.modes.get('C:/fixture/default'),'combined');assert.equal(f.board().intent,false);assert.equal(f.board().statuses.length,0);
 const finalSet=f.calls.filter(c=>c.kind==='set').at(-1);assert.ok(finalSet.at>=deadline,'Current intent is applied only after settlement or expiry');
});
