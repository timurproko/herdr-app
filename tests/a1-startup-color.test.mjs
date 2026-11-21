// All commands, cores and launches are fixtures; no remote files or real agents.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {loadMod} from '../tools/plugin-harness.mjs';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url);
const {launchProfile,profileShellArgv}=require('../src/services/terminals/profile-launch.cjs');

// Retired queued metadata remains ignored by the worker. Only actual argv chosen
// by the mounted controller reaches one literal shell invocation.
for(const argv of [['a1'],['a1','--','literal --session-color','two words'],['a1','--session-color','pink'],['a1','--session-color=pink'],['a1','pi'],['wrapper','two words']]) {
  for(const shell of [['bash','--login','-i'],['pwsh','-NoProfile'],['cmd'],['nu'],['fish']]) {
    const calls=[];
    const result=await launchProfile({profile:'custom-a1',argv,sessionColor:'orange',shell,space:'space',cwd:'/fixture'},async(method,params)=>{calls.push([method,params]);if(method==='doc.get')return{value:{spaces:[{id:'space'}]}};if(method==='terminal.run')return{address:'t1',state:'live'};throw Error(method);});
    assert.equal(result.ok,true,shell[0]);
    const started=calls.find(([method])=>method==='terminal.run')[1];
    assert.deepEqual(started.argv,profileShellArgv(shell,argv));
    assert.ok(!Object.hasOwn(started,'env'),'No shell environment leaks a launch color into later agents');
    assert.equal(calls.filter(([method])=>method==='terminal.run').length,1,'No failed color launch and retry');
  }
}

const state=new Map([['custom.match-agent-session-color',true],['custom.space-colors',{'pc2/space':'ansi3'}]]);
let requests=[],notices=[],selected=[],expectedMachine='pc2',replyError=null,onRead=()=>{};
const ss=[{id:'pc2/space',machine:'pc2',active:true,tabs:[{id:'pc2/origin',active:true},{id:'pc2/new'}]}];
const host={shared:key=>state.get(key),setShared:(key,value)=>state.set(key,value),spaces:()=>ss,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],appHome:()=>'/desktop-only',readTextFile:async file=>{assert.equal(file,'/desktop-only/mods/custom-new-menu/profile-launch.cjs','Startup needs no version/capability worker');onRead();return 'fixture-launch';},run:(...args)=>selected.push(args),notify:value=>notices.push(value),exec:async(command,args,options)=>{
  assert.equal(command,'node');assert.equal(options.on,expectedMachine);
  const request=JSON.parse(args.at(-1));requests.push(request);
  assert.equal(request.stage,'launch-profile','No capability probes or test UI launches');assert.equal(args[2],'fixture-launch');
  return{code:0,stdout:JSON.stringify(replyError?{ok:false,error:replyError}:{ok:true,tab:'new',space:'space'})};
}};
// The tab bar's launcher and the A1 colors plugin, loaded as packaged in the Tabs mod:
// Tabs only passes argv through plugins ('profile.launch'); the color comes from the plugin.
const entry={namespace:await loadMod({host,mod:'custom-tabs',globals:{Date},modules:{'profile-launches.js':'src/features/tabs/profile-launches.js','space-color-state.js':'src/shared/space-color-state.js'},
  entry:'export * from "./profile-launches.js"; export { startupColorCandidate } from "./plugins/a1-colors/launch-color.js";'})};
const job={token:'fixture',profile:'custom-fixture-a1',name:'A1',phase:'queued',expiresAt:Date.now()+60000,machine:'pc2',space:'pc2/space',originTab:'pc2/origin',argv:['a1'],shell:['bash'],cwd:'/remote/project'};
async function launch(value=job){requests=[];state.set('custom.profile-launches',[{...value}]);const tasks=[],cx={spawn:fn=>tasks.push(fn),sleep:async()=>{}};entry.namespace.startProfileLaunches({},cx);while(tasks.length)await tasks.shift()(cx);return requests[0];}
for(const argv of [['a1'],['D:\\chosen\\a1.cmd','--','--session-color','pink','$(literal)'],['/opt/a1/bin/a1','--session','uuid','--session-dir','/fixture'],['a1','--session-dir','/fixture','--session','uuid']]) {
  const before=JSON.stringify(argv),request=await launch({...job,argv,sessionColor:'pink'});
  assert.equal(requests.length,1);
  assert.deepEqual(request.argv,[argv[0],'--session-color','orange',...argv.slice(1)]);
  assert.equal(JSON.stringify(argv),before,'Configured argv is not mutated');
  assert.equal(request.sessionColor,undefined,'Retired queued metadata is never authoritative');
  assert.equal(request.space,'space');assert.equal(state.get('custom.profile-launches')[0].phase,'done');
  for(const shell of [['bash'],['pwsh'],['cmd'],['nu'],['fish']]) {
    const calls=[];const result=await launchProfile({...request,shell},async(method,params)=>{calls.push([method,params]);if(method==='doc.get')return{value:{spaces:[{id:'space'}]}};if(method==='terminal.run')return{address:'t1',state:'live'};throw Error(method);});
    assert.equal(result.ok,true);
    const started=calls.find(([method])=>method==='terminal.run')[1];
    assert.deepEqual(started.argv,profileShellArgv(shell,request.argv),'First shell command carries the override before the literal prompt');
    assert.equal(started.labels['custom.profile.a1-command'],/[\\/]/.test(argv[0])?argv[0]:undefined,'Explicit selected A1 installation survives its shell wrapper as a routing hint only');
    assert.ok(!Object.hasOwn(started,'env'));assert.equal(calls.filter(([method])=>method==='terminal.run').length,1);
  }
}
state.set('custom.match-agent-session-color',false);
assert.deepEqual((await launch()).argv,['a1']);assert.equal(requests.length,1,'Disabled matching preserves ordinary launching');
state.set('custom.match-agent-session-color',true);
for(const argv of [['a1','pi'],['a1','help'],['a1','api','{}'],['a1','session','color','list'],['wrapper'],['a1','--session-color','pink'],['a1','--session-color=pink'],['a1','--unknown'],['a1','--session-dir','/fixture'],['a1','--session'],['a1','--session','one','--session','two']]) {
  assert.deepEqual((await launch({...job,argv})).argv,argv);assert.equal(requests.length,1,'Unrelated commands and explicit overrides are not rewritten');
}
assert.equal(entry.namespace.startupColorCandidate(['a1','--','--session-color','pink']),true,'A literal prompt is not a conflicting option');
assert.equal(entry.namespace.startupColorCandidate(['a1',null]),false);
assert.equal(entry.namespace.startupColorCandidate(['a1','\0']),false);
// Latest state after the asynchronous worker read wins, not the queued color.
onRead=()=>state.set('custom.space-colors',{'pc2/space':'ansi5'});
assert.deepEqual((await launch()).argv,['a1','--session-color','purple']);
onRead=()=>state.set('custom.match-agent-session-color',false);
assert.deepEqual((await launch()).argv,['a1']);
state.set('custom.match-agent-session-color',true);onRead=()=>{};
for(const [spaceColor,color] of [['ansi4','blue'],['ansi2','green'],['ansi3','orange'],['ansi1','pink'],['ansi5','purple'],['ansi6','cyan'],['#8e98a8','grey'],['#df7ac7','pink']]) {
  state.set('custom.space-colors',{'pc2/space':spaceColor});assert.deepEqual((await launch()).argv,['a1','--session-color',color]);
}
state.set('custom.space-colors',{'pc2/space':'invalid'});assert.deepEqual((await launch()).argv,['a1']);
onRead=()=>ss.splice(0);assert.equal(await launch(),undefined);assert.equal(requests.length,0,'A space closed while loading the worker is never launched');
assert.equal(state.get('custom.profile-launches')[0].phase,'failed');assert.equal(notices.length,1);notices=[];
onRead=()=>{};
ss.push({id:'space',machine:null,active:true,tabs:[{id:'origin',active:true},{id:'new'}]});
expectedMachine=null;state.set('custom.space-colors',{'space':'ansi6'});
assert.deepEqual((await launch({...job,profile:'arbitrary-local-profile',machine:null,space:'space',originTab:'origin'})).argv,['a1','--session-color','cyan']);
assert.equal(requests[0].profile,'arbitrary-local-profile');assert.equal(requests.length,1,'Local/remote startup follows the same direct path');
assert.deepEqual((await launch({...job,machine:null,space:null})).argv,['a1']);assert.equal(requests.length,1,'New spaces without an identified target retain live-sync fallback');
// Genuine launch failures are reported exactly once, never retried silently.
replyError='Fixture launch failure';await launch({...job,machine:null,space:'space',originTab:'origin'});
assert.equal(requests.length,1);assert.equal(state.get('custom.profile-launches')[0].phase,'failed');assert.equal(notices.length,1);assert.equal(notices[0].body,replyError);
assert.ok(selected.length,'Existing native tab selection is preserved');
console.log('PASS: current-A1 first-frame space colors, no compatibility probes/retries, latest color/toggle, literal prompt/explicit override preservation, local/remote profiles and no shell environment leaks');
