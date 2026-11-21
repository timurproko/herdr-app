// Disposable fixtures only: never query/change a real agent or terminal.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {syncPreferences} from '../../../tools/runtime/preferences.mjs';
import {loadMod} from '../../../tools/plugin-harness.mjs';
import os from 'node:os';
import path from 'node:path';
const require=createRequire(import.meta.url),{collect}=require('./session-color.cjs'),{createA1Client}=require('../api.cjs');
const session='11111111-1111-1111-1111-111111111111',runtime='22222222-2222-2222-2222-222222222222',other='33333333-3333-3333-3333-333333333333';
const now=100000,target={terminal:'t1',space:'local',tab:'tb',session,runtime,color:'orange'},request={expiresAt:now+10000,targets:[target]};
const terminal=()=>({address:'t1',state:'live',status:{app:'a1'},labels:{'a1.session':session,'a1.runtime':runtime,'a1.at':String(now),'herdr.space':'local','herdr.tab':'tb'}});
const nativeTerminal=terminal;
const palette=['blue','green','orange','pink','purple','cyan','grey'];
let reads=0,calls=0,sets=0,current='blue',patch=null,onGet=()=>{},applied=null;
const clientFor=command=>createA1Client({command,id:()=> 'color-fixture',resolveCommand:async options=>{assert.equal(options.command,command);return ['fixture-a1'];},execute:async(executable,args)=>{
  assert.equal(executable,'fixture-a1');assert.equal(args[0],'api');const input=JSON.parse(args[1]);
  let data;
  if(input.type==='settings.list')data={settings:[{id:'accentColor',scope:'session',type:'string',application:'live',choices:palette}]};
  else {
    assert.deepEqual(input.target,{scope:'session',sessionId:session,runtimeId:runtime});assert.equal(input.setting,'accentColor');
    if(input.type==='settings.get'){calls++;onGet();}
    else {sets++;applied=input.value;}
    const color=input.type==='settings.get'?current:input.value;
    data={target:input.target,setting:'accentColor',storedValue:color,effectiveValue:color,origin:'session',application:'live',...(input.type==='settings.update'?{status:'applied'}:{})};
  }
  const response={version:1,id:input.id,type:'response',command:input.type,success:true,data};
  if(patch)patch(response,input);
  return {code:response.success?0:1,stdout:JSON.stringify(response)+'\n'};
}});
const defaults={now:()=>now,getTerminal:async()=>{reads++;return terminal();},clientFor};
let result=await collect(request,defaults);
assert.equal(result.colors[0].color,'orange');assert.equal(result.colors[0].changed,true);assert.equal(reads,2);assert.equal(calls,1);assert.equal(sets,1);
sets=0;current='orange';result=await collect(request,defaults);assert.equal(sets,0);assert.equal(result.colors[0].changed,false,'Do not rewrite an already matching agent');current='blue';
for(const mutate of [t=>t.state='finished',t=>t.status.app='claude-code',t=>t.labels['a1.session']=other,t=>t.labels['a1.runtime']=other,t=>t.labels['a1.at']='0',t=>t.labels['a1.at']=String(now+6000),t=>t.labels['herdr.space']='moved',t=>t.labels['herdr.tab']='moved',t=>t.labels['custom.profile.a1-command']='D:/changed/a1.cmd']) {
  calls=sets=0;assert.equal((await collect(request,{...defaults,getTerminal:async()=>{const t=terminal();mutate(t);return t;}})).colors.length,0);assert.equal(calls,0);assert.equal(sets,0);
}
for(const color of palette) {
  applied=null;current=color==='blue'?'green':'blue';result=await collect({...request,targets:[{...target,color}]},defaults);
  assert.equal(applied,color);assert.equal(result.colors[0].color,color);
}
current='blue';
for(const type of ['settings.get','settings.update'])for(const mutate of [r=>r.id='wrong',r=>r.version=2,r=>r.command='wrong',r=>r.data.target.runtimeId=other,r=>r.data.effectiveValue='red',r=>{r.success=false;delete r.data;r.error={code:'session-unavailable',message:'fixture'};}]) {
  sets=0;patch=(reply,input)=>{if(input.type===type)mutate(reply);};result=await collect(request,defaults);
  assert.equal(result.colors.length,0,'Malformed/mismatched acknowledgements never count');
  if(type==='settings.get')assert.equal(sets,0,'A malformed read never authorizes a write');
}
patch=null;
for(const mutate of [t=>t.labels['a1.session']=other,t=>t.labels['herdr.space']='moved',t=>t.labels['herdr.tab']='moved']) {
  reads=sets=0;assert.equal((await collect(request,{...defaults,getTerminal:async()=>{const t=terminal();if(++reads===2)mutate(t);return t;}})).colors.length,0);assert.equal(sets,0,'Replaced/moved sessions cannot receive a write');
}
calls=sets=0;assert.equal((await collect({...request,expiresAt:now},defaults)).colors.length,0);assert.equal(calls,0);assert.equal(sets,0);
let time=now;sets=0;onGet=()=>{time+=10000;};assert.equal((await collect(request,{...defaults,now:()=>time})).colors.length,0);assert.equal(sets,0,'Requests that expire while reading cannot apply later');onGet=()=>{};
await assert.rejects(collect({...request,targets:[{...target,session:'prefix'}]},defaults));
sets=0;assert.equal((await collect({...request,targets:[{...target,color:'red'}]},defaults)).colors.length,0);assert.equal(sets,0,'Only descriptor choices authorize writes');
for(const native of [false,true]) {
  sets=0;assert.equal((await collect(request,{...defaults,getTerminal:async()=>{const t=terminal();for(const key of ['session','runtime','at']){t.labels['custom.a1.'+key]=t.labels['a1.'+key];delete t.labels['a1.'+key];}if(native)t.labels['a1.runtime']=runtime;return t;}})).colors.length,0);assert.equal(sets,0,'Legacy-only and partial native identities cannot authorize control');
}

const state=new Map(),jobs=[],requests=[],notices=[];
let ss=[{id:'local',machine:null,name:'project',tabs:[{id:'tb',active:true},{id:'tb2',active:false}]},{id:'pc2/space',machine:'pc2',name:'remote',tabs:[{id:'pc2/tab',active:true}]}];
let ps=[{tab:'tb2',terminal:'t2',focused:false},{tab:'tb',terminal:'t1',focused:true},{tab:'pc2/tab',terminal:'pc2/t1',focused:false},{tab:'tb',terminal:'claude',focused:false}];
let ts=[{...terminal(),report:{app:'a1'},status:'working'}, {...terminal(),address:'t2',report:{app:'a1'},status:'idle'}, {...terminal(),address:'pc2/t1',report:{app:'a1'},status:'idle'}, {...terminal(),address:'claude',report:{app:'claude-code'},status:'working'}];
let active=true,clock=now,resolveReply=null,execFailure=null;
const context=vm.createContext({Date:class extends Date{static now(){return clock;}},console}),cache=new Map();
const host={notify:notice=>notices.push(notice),spaces:()=>ss,panes:()=>ps,terminals:()=>ts,window:()=>({active}),shared:k=>state.get(k),setShared:(k,v)=>state.set(k,v),appHome:()=>'/fixture',readTextFile:async file=>{assert.equal(file,'/fixture/mods/custom-spaces/plugins/a1-colors/session-color.cjs','The worker ships in the plugin folder');return fs.readFileSync(new URL('./session-color.cjs',import.meta.url),'utf8');},exec:async(cmd,args,options)=>{
  assert.equal(cmd,'node');assert.ok(args.includes('--input-type=commonjs'));const request=JSON.parse(args.at(-1));requests.push({request,on:options.on});
  if(execFailure==='throw')throw Error('Color control unavailable');
  const reply=execFailure??{code:0,stdout:JSON.stringify({colors:request.targets.map(t=>({...t,changed:true}))})};
  return resolveReply?await new Promise(resolve=>resolveReply=()=>resolve(reply)):reply;
}};
// Loaded as packaged in the Spaces mod, with the clock under the test's control.
const {state:pluginState,spaceState,agent:a,plugin:p}=await loadMod({host,mod:'custom-spaces',globals:{Date:context.Date},modules:{'space-color-state.js':'src/shared/space-color-state.js'},
  entry:'import * as state from "./plugins/a1-colors/state.js"; import * as agent from "./plugins/a1-colors/session-sync.js"; import plugin from "./plugins/a1-colors/plugin.js"; import * as spaceState from "./space-color-state.js"; export {state,agent,plugin,spaceState};'});
// Space colors belong to Spaces, the switch to the plugin; the test drives both.
const s={...spaceState,...pluginState};
for(const[value,color]of Object.entries({ansi4:'blue',ansi2:'green',ansi3:'orange',ansi1:'pink',ansi5:'purple',ansi6:'cyan','#8e98a8':'grey','#82a0f1':'blue','#df7ac7':'pink'}))assert.equal(a.agentColorForSpace(value),color);
assert.equal(a.agentColorForSpace('unknown'),null);
state.set('custom.space-colors',{local:'ansi3','pc2/space':'ansi5'});
state.set('space.colors',{local:'#82a0f1','pc2/space':'#a3a3a3'});state.set('custom.agent-space-colors',{local:'#82a0f1'});
const controller=new a.AgentSpaceColors(),cx={notify(){},spawn:fn=>jobs.push(fn)};
const drain=async()=>{while(jobs.length)await jobs.shift()(cx);};
controller.refresh(cx);assert.equal(jobs.length,0);assert.equal(s.matchAgentSessionColor(),false);assert.equal(JSON.stringify(state.get('custom.agent-space-colors')),'{"local":"#82a0f1"}','Refresh leaves unrelated stored state untouched');
s.setMatchAgentSessionColor(true);controller.refresh(cx);assert.equal(jobs.length,2);await drain();
assert.equal(JSON.stringify(state.get('custom.agent-space-colors')),'{"local":"#82a0f1"}','Toggling matching does not migrate or clear unrelated state');
assert.equal(requests.length,2,'One synchronizer per machine');assert.equal(requests[0].on,null);assert.equal(requests[1].on,'pc2');
assert.deepEqual(requests[0].request.targets.map(t=>[t.terminal,t.color]),[['t2','orange'],['t1','orange']],'Every A1 agent, including inactive tabs, follows the space');
assert.equal(requests[1].request.targets[0].color,'purple');assert.equal(requests[1].request.targets[0].space,'space');assert.equal(requests[1].request.targets[0].tab,'tab','Remote worker receives local core IDs');
assert.equal(state.get('space.colors').local,'#82a0f1');assert.equal(state.get('space.colors')['pc2/space'],'#a3a3a3','Sync never recolors spaces');
controller.refresh(cx);assert.equal(jobs.length,0);clock+=5000;controller.refresh(cx);assert.equal(jobs.length,2);await drain();
s.setSpaceColor('local','ansi2');controller.refresh(cx);assert.equal(jobs.length,1,'Space color changes trigger immediate sync without waiting for the timer');await drain();
assert.ok(requests.at(-1).request.targets.every(t=>t.color==='green'));assert.equal(state.get('space.colors').local,'ansi2');
s.setMatchAgentSessionColor(false);controller.refresh(cx);assert.equal(jobs.length,0);clock+=5000;controller.refresh(cx);assert.equal(jobs.length,0,'Disabled sync performs no reads or writes');
const count=requests.length;s.setMatchAgentSessionColor(true);controller.refresh(cx);s.setMatchAgentSessionColor(false);await drain();assert.equal(requests.length,count,'Disabling also cancels jobs that have not started');
s.setMatchAgentSessionColor(true);controller.refresh(cx);resolveReply=()=>{};
const pending=jobs.shift()(cx);await new Promise(resolve=>setImmediate(resolve));s.setSpaceColor('local','ansi5');resolveReply();resolveReply=null;await pending;await drain();controller.refresh(cx);await drain();
assert.ok(requests.at(-1).request.targets.every(t=>t.color==='purple'),'Rapid edits converge to the latest space color');assert.equal(state.get('space.colors').local,'ansi5');
const before=requests.length;ts.push({...terminal(),address:'t3',report:{app:'a1'},status:'idle'});ps.push({tab:'tb',terminal:'t3'});controller.refresh(cx);await drain();assert.equal(requests.length,before+1);assert.ok(requests.at(-1).request.targets.some(t=>t.terminal==='t3'&&t.color==='purple'),'New agents inherit the current space color');
ts[0].labels['a1.session']=other;controller.refresh(cx);await drain();assert.equal(requests.at(-1).request.targets.find(t=>t.terminal==='t1').session,other);
active=false;clock+=5000;controller.refresh(cx);assert.equal(jobs.length,0,'Inactive windows do no new work');
assert.ok(!a.agentColorTargets(ss,ps,ts,now+100000).length,'Stale/unreported agents stay untouched');
ss=ss.slice(1);assert.ok(a.agentColorTargets().every(t=>t.machine==='pc2'),'Closed spaces cannot target their former agents');
ts=[{...nativeTerminal(),address:'pc2/t1',report:{app:'a1'}}];
assert.equal(a.agentColorTargets()[0].session,session,'Native A1 labels work across Core-only SSH connections');
ts[0].labels['custom.a1.session']=other;
assert.equal(a.agentColorTargets()[0].session,session,'Native identity wins over an old companion');
// Normal startup has no invocation override: wait for A1's native identity,
// then use the latest space color without waiting for the fallback timer.
active=true;
const startupLabels=ts[0].labels,startupRequests=requests.length;
ts[0].labels={};controller.refresh(cx);await drain();
assert.equal(requests.length,startupRequests,'Never guess a new session identity during startup');
s.setSpaceColor('pc2/space','ansi2');
ts[0].labels=startupLabels;controller.refresh(cx);await drain();
assert.equal(requests.length,startupRequests+1,'Identity arrival triggers immediate live color sync');
assert.equal(requests.at(-1).on,'pc2');
assert.equal(requests.at(-1).request.targets[0].session,session);
assert.equal(requests.at(-1).request.targets[0].color,'green','A startup-time space edit wins over any old launch color');
delete ts[0].labels['a1.runtime'];assert.equal(a.agentColorTargets().length,0,'Incomplete native metadata fails closed');
active=true;controller.refresh(cx);assert.equal(notices.length,0,'Missing identity stays silent');
clock+=15000;controller.refresh(cx);clock+=90000;controller.refresh(cx);
assert.equal(notices.length,0,'Missing/stale identity never shows an update warning');
for(const machine of [null,'pc2']) {
  ss=[{id:'local',machine,tabs:[{id:'tb'}]}];ps=[{tab:'tb',terminal:'t1'}];
  ts=[nativeTerminal()];ts[0].labels['a1.at']=String(clock);
  for(const failure of [{code:1,stdout:''},{code:0,stdout:'{"colors":[]}'},{code:0,stdout:'invalid JSON'},'throw']) {
    execFailure=failure;s.setMatchAgentSessionColor(false);controller.refresh(cx);
    s.setMatchAgentSessionColor(true);controller.refresh(cx);assert.equal(jobs.length,1);await drain();
    assert.equal(controller.pending.size,0,'Failed color control releases its machine for retry');
    assert.equal(notices.length,0,'Local/remote color-control failures never show a toast');
  }
}
execFailure=null;clock+=5000;controller.refresh(cx);assert.equal(jobs.length,1);await drain();
assert.equal(notices.length,0,'Matching recovers silently after color control becomes available');
s.setMatchAgentSessionColor(false);controller.refresh(cx);clock+=15000;controller.refresh(cx);assert.equal(notices.length,0,'Disabled matching makes no notices');
const settings=fs.readFileSync(new URL('../../features/settings/main.js',import.meta.url),'utf8');
const look=settings.slice(settings.indexOf('  look(t, cx) {'),settings.indexOf('  changeTerminalSpacing(delta, cx) {'));
// The switch moved from Look to Settings > Plugins (A1 session colors), still on the same preference.
assert.doesNotMatch(look,/setMatchAgentSessionColor/);
const plugin=fs.readFileSync(new URL('./plugin.js',import.meta.url),'utf8');
assert.match(plugin,/name: 'A1'/);assert.match(plugin,/state: \{ get: a1Enabled, set: setA1Enabled \}/);
assert.match(plugin,/matchSpaceColor/);assert.doesNotMatch(plugin,/renameSession|sidebar\.rename/);
// Spaces and Tabs reach A1 colors only through plugin moments, never its files.
assert.equal(typeof p.events['spaces.refresh'],'function');assert.equal(typeof p.transforms['profile.launch'],'function');

const dir=fs.mkdtempSync(path.join(os.tmpdir(),'agent-color-preferences-'));
try{fs.writeFileSync(path.join(dir,'shared.json'),JSON.stringify({'custom.match-agent-session-color':true,'custom.agent-space-colors':{local:'#123456'},'custom.agent-space-color-epoch':2}));syncPreferences('export',dir,{hostname:'fixture',snapshotDir:path.join(dir,'prefs')});const prefs=JSON.parse(fs.readFileSync(path.join(dir,'prefs/fixture.json')));assert.deepEqual(prefs.shared,{'custom.match-agent-session-color':true});}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS: space -> all A1 agents, live space edits/new agents, unchanged space state, named palette mapping, get/set acknowledgements, no redundant writes, deadlines/stale/moved/disabled guards, remote routing and reporting');
