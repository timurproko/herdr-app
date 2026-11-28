// No agents are started: shell quoting and core/controller startup are fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { execFileSync } from 'node:child_process';
const require=createRequire(import.meta.url);
const {profileLine,profileShellArgv,launchProfile}=require('../mods/custom-new-menu/profile-launch.cjs');
const bash=['C:\\Program Files\\Git\\bin\\bash.exe','--login','-i'];
assert.equal(profileLine(bash,['a1']),"'a1'");
assert.equal(profileLine(bash,['C:\\tools\\agent.exe','two words']),"'C:/tools/agent.exe' 'two words'");
assert.equal(profileLine(['pwsh.exe'],['agent',"a'b",'$HOME; $(whoami)']),"& 'agent' 'a''b' '$HOME; $(whoami)'");
assert.equal(profileLine(['cmd.exe'],['a1','two words','& exit']), '"a1" "two words" "& exit"');
for(const value of ['%PATH%','!x!','" & exit','line\nbreak'])assert.throws(()=>profileLine(['cmd.exe'],['agent',value]),/literally/);
assert.throws(()=>profileLine(['unknown-shell'],['agent']),/not supported/);
assert.throws(()=>profileLine(bash,['agent','\0']),/Invalid/);
// Exercise actual POSIX quoting using Node, not a candidate/agent command.
const literal=['','two words',"a'b",'$(touch /no-such-test-file)','; echo injected','%PATH%','!value!','C:\\a b','line\nbreak'];
const exe=process.platform==='win32'?bash[0]:'/bin/bash';
const actual=execFileSync(exe,['-c',profileLine(bash,[process.execPath,'-e','process.stdout.write(JSON.stringify(process.argv.slice(1)))',...literal])],{encoding:'utf8',env:{...process.env,MSYS_NO_PATHCONV:'1'}});
assert.deepEqual(JSON.parse(actual),literal);

assert.deepEqual(profileShellArgv(bash,['a1']),[...bash,'-c',"'a1'; exec 'C:/Program Files/Git/bin/bash.exe' '--login' '-i'"]);
assert.deepEqual(profileShellArgv(['pwsh.exe','-NoProfile'],['a1']),['pwsh.exe','-NoProfile','-NoExit','-Command',"& 'a1'"]);
assert.deepEqual(profileShellArgv(['cmd.exe','/d'],['a1']),['cmd.exe','/d','/s','/k','""a1""']);
assert.equal(profileShellArgv(['nu'],['a1'])[1],'--execute');
for(const shell of [[...bash,'-c','existing'],['pwsh.exe','-File','existing.ps1'],['cmd.exe','/k','existing']])assert.throws(()=>profileShellArgv(shell,['a1']),/already has a startup command/);
function fixture({shell=bash,defaultShell=bash,closed=false,probeError=false,runError=false,killError=false}={}){
 const calls=[];let reads=0;
 const rpc=async(method,p)=>{calls.push([method,p]);
  if(method==='doc.get')return{value:{spaces:closed&&++reads>1?[]:[{id:'space'}]}};
  if(method==='terminal.run'){
   if(!p.argv.length)return{address:'probe',state:probeError?'finished':'live',argv:defaultShell};
   if(runError)throw Error('Lost run reply');
   return{address:'new',state:'live',argv:p.argv};
  }
  if(method==='terminal.kill'&&killError)throw Error('Probe cleanup failed');
  assert.ok(!['terminal.send','terminal.read','terminal.get','terminal.label'].includes(method),'Startup never waits for, pastes into, or renders a shell prompt');
  return{};
 };
 return{calls,rpc,target:{space:'space',shell,argv:['a1','--flag','two words'],cwd:'D:/project'}};
}
let f=fixture();let reply=await launchProfile(f.target,f.rpc);assert.equal(reply.ok,true);assert.match(reply.tab,/^tb/);
const startup=f.calls.find(c=>c[0]==='terminal.run')[1];
assert.deepEqual(startup.argv,profileShellArgv(bash,f.target.argv));
assert.deepEqual(startup.labels,{'herdr.space':'space','herdr.tab':reply.tab,'herdr.right-click':'menu'});
assert.equal(startup.keep,true);assert.ok(!f.calls.some(c=>c[0]==='terminal.kill'),'Explicit shell starts once, without a probe');
f=fixture({shell:[],defaultShell:['powershell.exe','-NoLogo']});reply=await launchProfile(f.target,f.rpc);assert.equal(reply.ok,true);
const probe=f.calls.find(c=>c[0]==='terminal.run')[1];assert.deepEqual(probe.argv,[]);assert.equal(probe.keep,false);assert.equal(probe.labels,undefined,'The core-default probe is private, command-free and never adopted');
assert.equal(f.calls.filter(c=>c[0]==='terminal.run').length,2);assert.deepEqual(f.calls.find(c=>c[0]==='terminal.kill')[1],{terminal:'probe'});
assert.deepEqual(f.calls.filter(c=>c[0]==='terminal.run')[1][1].argv,profileShellArgv(['powershell.exe','-NoLogo'],f.target.argv),'Startup uses the actual target core default');
for(const options of [{closed:true},{shell:['unknown-shell']},{shell:[],probeError:true},{shell:[],killError:true}]){
 f=fixture(options);reply=await launchProfile(f.target,f.rpc);assert.equal(reply.ok,false);assert.ok(!f.calls.some(c=>c[0]==='terminal.run'&&c[1].labels),'Failures before startup never run the agent');
}
f=fixture({runError:true});reply=await launchProfile(f.target,f.rpc);assert.equal(reply.ok,false);assert.ok(!f.calls.some(c=>c[0]==='terminal.kill'),'A possibly running visible agent is never killed or retried');

// Mounted-controller ownership, one-shot claims, target-machine IDs and focus.
let state,world,execs,notifications,runs,jobs,away;
const api={pluginPrepareProfile:async()=>[],pluginTransform:async(_name,argv)=>argv,shared:k=>state.get(k),setShared:(k,v)=>state.set(k,v),panes:()=>[],spaces:()=>world,machines:()=>[{name:'pc2',layout:'ready'}],readTextFile:async()=> 'fixture source',appHome:()=> 'C:/app',run:(...x)=>runs.push(x),notify:x=>notifications.push(x),exec:async(...x)=>{execs.push(x);world[0].tabs.push({id:'pc2/new-tab',active:false});if(away){world[0].tabs[0].active=false;world[0].tabs.push({id:'pc2/user-choice',active:true});}return{code:0,stdout:JSON.stringify({ok:true,address:'new',space:'space',tab:'new-tab'})};}};
const context=vm.createContext(api),source=fs.readFileSync(new URL('../mods/custom-tabs/profile-launches.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
vm.runInContext(source+'\nglobalThis.start=startProfileLaunches;',context);
const cx={spawn:fn=>jobs.push(fn),sleep:async()=>{}};
function setup(){state=new Map([['custom.profile-launches',[{token:'one',phase:'queued',expiresAt:Date.now()+60000,machine:'pc2',space:'pc2/space',originTab:'pc2/old-tab',name:'A1',profile:'a1',shell:[],argv:['a1'],cwd:'D:/project'}]]]);world=[{id:'pc2/space',machine:'pc2',active:true,tabs:[{id:'pc2/old-tab',active:true}]}];execs=[];notifications=[];runs=[];jobs=[];away=false;}
setup();context.start({},cx);context.start({},cx);while(jobs.length)await jobs.shift()(cx);assert.equal(execs.length,1,'Multiple tab bars cannot replay one startup');assert.equal(execs[0][2].on,'pc2');assert.equal(JSON.parse(execs[0][1].at(-1)).space,'space');assert.equal(JSON.parse(execs[0][1].at(-1)).stage,'launch-profile');assert.equal(JSON.parse(execs[0][1].at(-1)).profile,'a1','Profile identity reaches the target-machine launch worker');assert.deepEqual(structuredClone(runs),[['tab.select',{id:'pc2/new-tab'}]]);assert.equal(state.get('custom.profile-launches')[0].phase,'done');
setup();away=true;context.start({},cx);while(jobs.length)await jobs.shift()(cx);assert.equal(runs.length,0,'Navigating elsewhere during startup never pulls the person back');
setup();world=[];context.start({},cx);while(jobs.length)await jobs.shift()(cx);assert.equal(execs.length,0);assert.equal(notifications.length,1);assert.equal(state.get('custom.profile-launches')[0].phase,'failed');
setup();state.get('custom.profile-launches')[0].expiresAt=0;context.start({},cx);assert.equal(jobs.length,0,'Expired persisted requests cannot launch agents after restart');
console.log('PASS: default/selected-shell profile startup, literal Bash argv, shell-specific quoting, prompt-free startup without paste delays, remote IDs, one-shot mounted ownership, focus preservation and failure cleanup.');
