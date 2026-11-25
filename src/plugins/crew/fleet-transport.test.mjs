import assert from 'node:assert/strict';
import {loadMod} from '../../../tools/plugin-harness.mjs';
const url='https://github.com/example/repo/pull/12';
const legacy={home:'C:/fixture/.crew',owner:{terminal:'owner',live:true},tasks:[{id:'ship',terminal:'worker',state:'working',pr:url}]};
const discovered={...legacy,prDiscovery:{version:1},tasks:[{...legacy.tasks[0],pr:null,prDiscovery:{status:'known',url,source:'github',reason:null}}]};
const reply=(stdout='',code=0,stderr='',extra={})=>({code:0,stdout:JSON.stringify({code,stdout:Buffer.from(stdout).toString('base64'),stderr:Buffer.from(stderr).toString('base64'),...extra})});
const unsupported=()=>reply('',1,'crew: Unknown option: --discover-prs\n');
const copy=value=>JSON.parse(JSON.stringify(value));
const tick=async()=>{for(let i=0;i<40;i++)await Promise.resolve();};
async function fixture(machine=null) {
 let now=100000,answer=async()=>reply(JSON.stringify(legacy));
 const q=id=>machine?`${machine}/${id}`:id;
 const groups=[{id:q('coordinator'),machine,tabs:[{id:q('c')}]},{id:q('fm-crew-home'),machine,tabs:[{id:q('w')}]}];
 const all=[{tab:q('c'),pane:'cp',terminal:q('owner')},{tab:q('w'),pane:'wp',terminal:q('worker')}];
 const list=[{address:q('owner'),state:'live',labels:{'custom.crew.home':'1'}},{address:q('worker'),state:'live',labels:{'crew.task':'ship','crew.home':'home','herdr.space':'fm-crew-home'}}];
 const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}},calls=[],jobs=[],handles=[];
 const hosts=[{name:machine,layout:'ready'}];
 const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>hosts,checking:()=>false,hc:async args=>{calls.push(args);return answer(args);}};
 const load=()=>loadMod({host,mod:'custom-changes',globals:{Date:class extends Date{static now(){return now;}}},modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'export * as f from "./plugins/crew/fleet.js";export * as p from "./plugins/crew/plugin.js";export * as r from "./plugins.js";'});
 const {f,p,r}=await load(),cx={spawn(fn){const handle={done:false,is_done(){return this.done;},cancel(){this.done=true;}};handles.push(handle);jobs.push(Promise.resolve().then(()=>fn(cx)).finally(()=>handle.done=true));return handle;},notify(){},timer:{after(_ms,fn){Promise.resolve().then(()=>fn(cx));}}};
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
 return {f,p,r,load,cx,drain,calls,state,groups,all,list,hosts,handles,get now(){return now;},advance:ms=>now+=ms,setAnswer:fn=>answer=fn,
  event:(force=false)=>r.pluginEvent('spaces.refresh',{cx,force}),context:()=>r.pluginPullContext(q('coordinator'))};
}
const command=call=>call.at(-1),timeout=call=>call[call.indexOf('--timeout')+1];
function checkCommand(call,machine,discover){
 assert.deepEqual(Array.from(call.slice(0,call.indexOf('--'))),['exec',...(machine?['--on',machine]:[]),'--timeout',discover?'25':'15','--json']);
 assert.deepEqual(Array.from(call.slice(call.indexOf('--')+1,-1)),['powershell','-NoProfile','-NonInteractive','-Command']);
 assert.match(command(call),/Get-Item -LiteralPath \$main/);assert.match(command(call),/LastWriteTimeUtc.Ticks/);
 assert.match(command(call),/InvokeCrew status '--all' '--json'/);assert.equal(command(call).includes("'--discover-prs'"),discover);
 assert.doesNotMatch(command(call),/home --ensure|\b(?:install|clone|fetch|pull|init|Set-Content|New-Item|Remove-Item)\b/);
}
for(const machine of [null,'pc2'])for(const payload of [discovered,legacy,{...legacy,prDiscovery:{version:99}}]){
 const x=await fixture(machine);x.setAnswer(async()=>reply(JSON.stringify(payload)));
 assert.equal(await x.p.readFleetStatus(machine),JSON.stringify(payload));assert.equal(x.calls.length,1);checkCommand(x.calls[0],machine,false);
 assert.equal(x.f.recordedSource(JSON.stringify(payload)).tasks[0].pr,url);
}
for(const message of ['crew: Unknown option: --discover-prs','unknown flag --discover-prs','unsupported argument: "--discover-prs"']){
 const x=await fixture('pc2');x.setAnswer(async()=>x.calls.length===1?reply('',2,message):reply(JSON.stringify(legacy)));
 assert.equal(await x.p.readFleetStatus('pc2',{discover:true}),JSON.stringify(legacy));assert.equal(x.calls.length,2);checkCommand(x.calls[0],'pc2',true);checkCommand(x.calls[1],'pc2',false);
}
for(const message of ['crew: Unknown option: --view','unsupported flag --view fleet','unsupported view: fleet']){
 const x=await fixture();x.setAnswer(async()=>x.calls.length===1?reply('',2,message):reply(JSON.stringify(legacy)));
 assert.equal(await x.p.readFleetStatus(null),JSON.stringify(legacy));assert.equal(x.calls.length,2);assert.ok(!command(x.calls[1]).includes('--help'));assert.match(command(x.calls[1]),/\$fleetView = \$false/);
}
{
 const x=await fixture();x.setAnswer(async()=>{if(x.calls.length===1){x.advance(24000);return reply('',2,'unknown option --view');}if(x.calls.length===2){x.advance(14000);return unsupported();}return reply(JSON.stringify(legacy));});
 await x.p.readFleetStatus(null,{discover:true});assert.deepEqual(x.calls.map(timeout),['25','16','2']);
}
for(const failure of [()=>reply('',1,'authentication required'),()=>reply('',1,'auth failed: unknown option --view'),()=>reply('output',1,'unknown option --view'),()=>reply('',1,'unknown option --view\npermission denied'),()=>reply('',1,'unsupported view: another'),()=>reply('',1,'crew: Unknown option: --all'),()=>reply('',1,'crew: Unknown option: --discover-prs\nAuthentication failed'),()=>reply('auth',1,'crew: Unknown option: --discover-prs'),()=>reply('',127,'crew: Unknown option: --discover-prs'),()=>reply('',null,'unsupported --discover-prs',{timed_out:true}),()=>({code:1,stderr:JSON.stringify({error:{kind:'machine_unreachable',message:'offline'}})}),()=>{throw Error('transport failed');}]){
 const x=await fixture();x.setAnswer(async()=>failure());await assert.rejects(x.p.readFleetStatus(null,{discover:true}));assert.equal(x.calls.length,1,'Non-capability failures never fall back');
}
for(const failure of [unsupported,()=>reply('',1,'auth failed'),()=>reply('',null,'timeout',{timed_out:true})]){
 const x=await fixture();x.setAnswer(async()=>x.calls.length===1?unsupported():failure());await assert.rejects(x.p.readFleetStatus(null,{discover:true}));assert.equal(x.calls.length,2);
}
// Capability evidence is shared by module copies and keyed by the CLI path+mtime.
{
 const x=await fixture();let fact={key:'c:\\fixture\\crew.mjs|1234',view:true};
 x.setAnswer(async()=>reply('__HERDR_FLEET_CAPABILITY__'+JSON.stringify(fact)+'\n'+JSON.stringify(legacy)));
 assert.equal(await x.p.readFleetStatus(null),JSON.stringify(legacy));assert.deepEqual(copy(x.state['custom.fleet.capabilities'].local),fact);
 const peer=await x.load();await peer.p.readFleetStatus(null);assert.ok(command(x.calls[1]).includes("if ($capabilityKey -eq 'c:\\fixture\\crew.mjs|1234')"));
 x.f.invalidateFleet();await x.p.readFleetStatus(null);assert.ok(command(x.calls[2]).includes('crew.mjs|1234'),'Toggle does not discard installation capability evidence');
 fact={...fact,key:'c:\\fixture\\crew.mjs|5678'};await peer.p.readFleetStatus(null);
 await x.p.readFleetStatus(null);
 assert.ok(command(x.calls.at(-1)).includes('crew.mjs|5678'),'A peer-probed installation update supersedes stale module-local evidence without another help probe');
}
// Settings requests work, but cannot own a native IO promise. The stable Spaces
// lifecycle services the request and keeps a healthy slow transport single-flight.
{
 const x=await fixture();x.r.pluginEvent('workspace.context.refresh',{cx:x.cx,force:true});await tick();assert.equal(x.calls.length,0);assert.ok(x.state['custom.fleet.request']);
 let release;x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event();await tick();assert.equal(x.calls.length,1);checkCommand(x.calls[0],null,false);
 for(let i=0;i<24;i++){x.advance(250);x.event();await tick();assert.equal(x.calls.length,1);}
 release(reply(JSON.stringify(legacy)));await x.drain();assert.ok(x.context());assert.equal(x.state[x.f.FLEET_KEY].entries.local.at,x.now);
}
// Real Task cancellation leaves its promise permanently pending; owner liveness
// and another module's lifecycle recover it, independently of catch/finally.
for(const sameOwner of [false,true]){
 const x=await fixture();let release;x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event();await tick();
 const lease=copy(x.state['custom.fleet.reads'].local);assert.equal(lease.until,x.now+2000);assert.equal(lease.transportUntil,x.now+45000);
 x.handles.at(-1).cancel();const peer=sameOwner?x:await x.load();x.setAnswer(async()=>reply(JSON.stringify(legacy)));
 x.advance(1999);peer.r.pluginEvent('spaces.refresh',{cx:x.cx});await tick();assert.equal(x.calls.length,1);
 x.advance(1);peer.r.pluginEvent('spaces.refresh',{cx:x.cx});await tick();assert.equal(x.calls.length,2,'Dead owner replaced after 2s, never 45s');
 const recovered=copy(x.state[x.f.FLEET_KEY]);release(reply(JSON.stringify({...legacy,owner:null})));await x.drain();assert.deepEqual(copy(x.state[x.f.FLEET_KEY]),recovered,'Late predecessor cannot publish absence or retire successor');
 assert.ok(x.state[x.f.DISPLAY_KEY].entries.null);
}
// Enrichment is a separate lower-priority read AFTER recorded inventory exists.
{
 const x=await fixture();x.event();await x.drain();assert.equal(x.calls.length,1);const at=x.state[x.f.FLEET_KEY].entries.local.at;
 assert.equal(x.context().links[0].url,url);let release;x.setAnswer(()=>new Promise(resolve=>release=resolve));x.r.pluginEvent('workspace.context.refresh',{cx:x.cx});await tick();assert.equal(x.calls.length,2);checkCommand(x.calls[1],null,true);
 assert.equal(x.context().links[0].url,url,'First inventory stays usable during slow discovery');
 x.advance(1000);x.event();await tick();release(reply(JSON.stringify(discovered)));await x.drain();assert.equal(x.state[x.f.FLEET_KEY].entries.local.at,at,'Discovery never renews verification authority');assert.equal(x.context().discovery.version,1);
 const enriched=copy(x.state[x.f.FLEET_KEY].entries.local.status);x.setAnswer(async()=>reply(JSON.stringify(legacy)));x.advance(10001);x.event();await x.drain();assert.deepEqual(copy(x.state[x.f.FLEET_KEY].entries.local.status),enriched,'Unchanged recorded refresh does not flicker discovered links away');
 x.state['custom.plugins'].git.enabled=false;const before=x.calls.length;x.context();x.event();await x.drain();assert.equal(x.calls.length,before,'Disabled Git never starts PR discovery');
}
// Render-driven demand must not turn an ordinary failure into forced retries.
{
 const x=await fixture();x.setAnswer(async()=>{throw Error('unavailable');});x.event();await x.drain();
 for(let i=0;i<3;i++){x.advance(500);x.r.pluginEvent('workspace.context.refresh',{cx:x.cx});await x.drain();assert.equal(x.calls.length,1,'Shown cold Git respects the failure retry deadline');}
 x.advance(500);x.event();await x.drain();assert.equal(x.calls.length,2);
}
// A cold local consumer cannot make another machine's cached token force local
// reads, defeat local backoff, or starve lower-priority discovery.
for(const failure of [false,true])for(const remoteLayout of ['unavailable','ready'])for(const space of remoteLayout==='ready'?['coordinator']:[undefined,'coordinator']){
 const x=await fixture();
 x.groups.push(...x.groups.map(s=>({...copy(s),id:`pc2/${s.id}`,machine:'pc2',tabs:s.tabs.map(t=>({id:`pc2/${t.id}`}))})));
 x.all.push(...x.all.map(p=>({...p,tab:`pc2/${p.tab}`,terminal:`pc2/${p.terminal}`})));
 x.list.push(...x.list.map(t=>({...copy(t),address:`pc2/${t.address}`})));
 x.hosts.push({name:'pc2',layout:'ready'});x.event();await x.drain();assert.equal(x.calls.length,2);
 x.hosts[1].layout=remoteLayout;
 const peer=await x.load(),localCalls=()=>x.calls.filter(call=>!call.includes('--on')),before=localCalls().length;let release;
 x.setAnswer(args=>args.includes('--on')?Promise.resolve(reply(JSON.stringify(legacy))):new Promise(resolve=>release=resolve));
 x.groups.push({id:'ordinary',tabs:[]});assert.equal(peer.f.fleetWitnessMachines('ordinary').length,0,'An unrelated selected space requests no proof');
 const request=async()=>{peer.r.pluginEvent('workspace.context.refresh',{cx:x.cx,space});await tick();x.event();await tick();};
 const settle=async()=>{
  peer.r.pluginPullContext('coordinator',{presentation:true}); // Witness before completion.
  release(failure?reply('',1,'offline'):reply(JSON.stringify(legacy)));await x.drain();
 };
 await request();assert.equal(localCalls().length,before+1);checkCommand(localCalls().at(-1),null,false);await settle();
 for(let second=1;second<=3;second++){
  x.advance(1000);await request();
  if(second===1 && !failure){assert.equal(localCalls().length,before+2);checkCommand(localCalls().at(-1),null,true);await settle();}
  if(second===2 && failure){assert.equal(localCalls().length,before+2);checkCommand(localCalls().at(-1),null,false);await settle();}
  assert.equal(localCalls().length,before+(!failure || second>=2?2:1),'Other-machine proof cannot bypass the local TTL or failure deadline');
 }
 if(failure){x.advance(3999);await request();assert.equal(localCalls().length,before+2);x.advance(1);await request();assert.equal(localCalls().length,before+3);await settle();}
 const remoteReads=x.calls.filter(call=>call.includes('--on'));
 assert.equal(remoteReads.length,remoteLayout==='ready'?2:1,'Unavailable machine is skipped; a ready unrelated machine only gets optional discovery');
 if(remoteLayout==='ready')checkCommand(remoteReads.at(-1),'pc2',true);
}
// Coalescing another machine's proof into a recent request must not replay an
// already consumed local proof under the new request ID.
{
 const x=await fixture();x.state['custom.plugins'].git.enabled=false;
 x.groups.push(...x.groups.map(s=>({...copy(s),id:`pc2/${s.id}`,machine:'pc2',tabs:s.tabs.map(t=>({id:`pc2/${t.id}`}))})));
 x.all.push(...x.all.map(p=>({...p,tab:`pc2/${p.tab}`,terminal:`pc2/${p.terminal}`})));
 x.list.push(...x.list.map(t=>({...copy(t),address:`pc2/${t.address}`})));
 x.hosts.push({name:'pc2',layout:'ready'});x.event();await x.drain();
 for(const space of ['coordinator','pc2/coordinator']){
  const peer=await x.load();peer.r.pluginEvent('workspace.context.refresh',{cx:x.cx,space});await tick();x.event();await x.drain();
 }
 assert.equal(x.calls.filter(call=>!call.includes('--on')).length,2,'Remote urgency cannot replay consumed local proof');
 assert.equal(x.calls.filter(call=>call.includes('--on')).length,2,'Each consumer receives proof only on its own machine');
}
// A distinct sandbox can witness an active lifecycle read, but cannot borrow a
// completed persisted token. This is required for real Git/menu copies.
{
 const x=await fixture();x.event();await x.drain();const peer=await x.load();assert.equal(peer.r.pluginPullContext('coordinator'),null);
 let release;x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event(true);await tick();
 peer.r.pluginWorkspaceLinks({presentation:true});assert.equal(peer.r.pluginPullContext('coordinator'),null);
 release(reply(JSON.stringify(legacy)));await x.drain();assert.equal(peer.r.pluginPullContext('coordinator').links[0].url,url);
}
// Explicit verification requested during optional discovery is queued, not lost.
{
 const x=await fixture();x.event();await x.drain();let release;x.setAnswer(()=>new Promise(resolve=>release=resolve));
 x.r.pluginEvent('workspace.context.refresh',{cx:x.cx});await tick();assert.equal(x.state['custom.fleet.reads'].local.kind,'discovery');
 x.r.pluginEvent('workspace.context.refresh',{cx:x.cx,force:true});await tick();assert.equal(x.calls.length,2);
 x.advance(1001);x.r.pluginEvent('workspace.context.refresh',{cx:x.cx});await tick();assert.equal(x.calls.length,2,'Renewed nonurgent demand keeps only discovery-blocked urgency');
 release(reply(JSON.stringify(discovered)));await x.drain();x.setAnswer(async()=>reply(JSON.stringify(legacy)));x.event();await x.drain();
 assert.equal(x.calls.length,3);checkCommand(x.calls.at(-1),null,false);
}
for(const change of ['plugin','preference','generation','read','owner']){
 const x=await fixture();x.event();await x.drain();const before=copy(x.state[x.f.FLEET_KEY].entries.local);let release;
 x.setAnswer(()=>new Promise(resolve=>release=resolve));x.event(true);await tick();
 if(change==='plugin')x.state['custom.plugins'].crew.enabled=false;
 if(change==='preference')x.state['custom.spaces.preferences'].connectFleetToCoordinator=false;
 if(change==='generation')x.f.invalidateFleet();
 if(change==='read')x.state['custom.fleet.reads'].local.token='newer-read';
 if(change==='owner'){x.list[0].address='replacement';x.all[0].terminal='replacement';}
 release(reply(JSON.stringify({...legacy,owner:null})));await x.drain();const after=x.state[x.f.FLEET_KEY]?.entries?.local;
 if(after){assert.equal(after.at,before.at);assert.deepEqual(copy(after.status),before.status);}
 if(['plugin','preference','generation','owner'].includes(change))assert.equal(x.context(),null);
}
{
 const x=await fixture();x.setAnswer(async()=>reply('{malformed'));x.event();await x.drain();assert.equal(x.context(),null);assert.equal(x.state[x.f.FLEET_KEY].entries.local.status,undefined);
 await assert.rejects(x.p.readFleetStatus(null,{current:()=>false}),e=>e.reason==='obsolete-generation');assert.equal(x.calls.length,1);
}
console.log('PASS recorded-first fleet transport, installation capability cache, isolated discovery, stable lifecycle ownership, native task death, cross-instance two-second recovery and stale-reply guards');
