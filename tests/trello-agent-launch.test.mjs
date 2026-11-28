import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import cp from 'node:child_process';import {createRequire} from 'node:module';
import {build} from '../tools/build.mjs';
const require=createRequire(import.meta.url),transport=require('../src/services/private-actions/trello-transport.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-launch-'));
try{
 const store=new Map(),calls=[],notices=[];let reject=false,owned=false,probeFailure=false;
 const host={checking:()=>false,shared:k=>store.get(k),setShared:(k,v)=>store.set(k,v),appHome:()=>'/fixture',notify:n=>notices.push(n),exec:async(...args)=>{calls.push(args);if(args[1][0]==='-e')return {code:probeFailure?3:0,stdout:JSON.stringify({owned})};return reject?{code:3,stdout:JSON.stringify({ok:false,error:{message:'Owned skill conflict'}})}:{code:0,stdout:JSON.stringify({ok:true,data:args[1].includes('--discovery-all')?{pending:[]}:{announced:args[1].at(-2)==='true'}})};}};
 const {r,p,ownershipProbe}=await loadMod({host,entry:'import * as r from "./plugins.js"; import p from "./plugins/trello/plugin.js"; import {ownershipProbe} from "./plugins/trello/discovery.js"; export {r,p,ownershipProbe};'});
 // Disabled never-announced peers do not enter Trello's SSH/runtime gate,
 // whether that optional setup would be custom-via, outdated or unavailable.
 for(const machine of ['custom-via','outdated','node-unavailable']){probeFailure=machine==='node-unavailable';reject=true;await r.pluginPrepareProfile({machine,profile:'a1',argv:['a1']});assert.equal(calls.at(-1)[1][0],'-e');assert.equal(calls.at(-1)[2].on,machine);}
 probeFailure=false;reject=false;owned=true;await r.pluginPrepareProfile({machine:'owned-peer',profile:'a1',argv:['a1']});assert.ok(calls.at(-1)[1].includes('--prepare'));assert.equal(calls.at(-1)[1].at(-2),'false');
 reject=true;await assert.rejects(r.pluginPrepareProfile({machine:'owned-peer'}),/Trello agent preparation failed/);reject=false;owned=false;
 store.set('custom.plugins',{trello:{enabled:true}});
 for(const [profile,argv,role] of [['a1',['a1'],null],['claude',['claude','--','literal --prompt'],null],['custom',['C:/agent/codex.exe'],null],['a1',['a1'],'firstmate']]){await r.pluginPrepareProfile({machine:null,profile,argv,role});assert.equal(calls.at(-1)[1].at(-2),'true');}
 reject=true;await assert.rejects(r.pluginPrepareProfile({machine:null}),/Trello agent preparation failed/);reject=false;
 await assert.rejects(r.pluginPrepareProfile({machine:null,isCurrent:()=>false}),/Plugin settings changed/);
 const owner={},jobs=[],cx={spawn:fn=>jobs.push(fn)};p.lifecycle['sidebar.sync']({owner,cx,enabled:true});p.lifecycle['sidebar.sync']({owner,cx,enabled:true});assert.equal(jobs.length,1);await jobs.shift()({sleep:async()=>{}});assert.ok(calls.at(-1)[1].includes('--discovery-all'));assert.equal(notices.length,0);
 store.set('custom.plugins',{trello:{enabled:false}});p.lifecycle['sidebar.sync']({owner,cx,enabled:false});await jobs.shift()({sleep:async()=>{}});assert.equal(calls.at(-1)[1].at(-2),'false');
 // Execute the real installed service with fake homes, not the person's skills.
 const {output}=build(),runtime=path.join(root,'payload'),home=path.join(root,'app'),userHome=path.join(root,'user'),bin=path.join(root,'user bin-é');
 fs.mkdirSync(runtime);for(const dir of ['lib','scripts'])fs.cpSync(path.join(output,dir),path.join(runtime,dir),{recursive:true});fs.writeFileSync(path.join(runtime,'package.json'),'\u007b"type":"module"\u007d\n');
 const installer=require('../src/services/private-actions/trello-install.cjs');await installer.install(home,installer.payload(runtime),{bin,envPath:''});fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:true}}}));
 const options={runtime,discoveryOptions:{userHome}};
 const prepared=await transport.dispatch(home,{machine:null},{action:'discovery.prepare',enabled:true},()=>{},options);assert.equal(prepared.ok,true);assert.equal(prepared.data.announced,true);assert.ok(fs.existsSync(path.join(userHome,'.agents/skills/herdr-trello/SKILL.md')));
 const {preparedEnvironment,profileShellArgv,launchProfile}=require('../src/services/terminals/profile-launch.cjs');
 const win=process.platform==='win32',git=path.join(process.env.ProgramFiles||'C:/Program Files','Git'),bash=win?path.join(git,'bin/bash.exe'):'/bin/bash';
 const initialPath=[path.dirname(process.execPath),...(win?[path.join(process.env.SystemRoot,'System32'),path.join(git,'bin'),path.join(git,'usr/bin')]:['/usr/bin','/bin'])].join(path.delimiter);
 const prior=path.join(root,'previous hook.txt');fs.writeFileSync(prior,'HERDR_PREVIOUS_HOOK=present; export HERDR_PREVIOUS_HOOK\n');
 const base={...process.env,PATH:initialPath,HOME:userHome,USERPROFILE:userHome,BASH_ENV:prior.replaceAll('\\','/')};delete base.Path;
 const prep=preparedEnvironment({preparations:[prepared.data.launch]},{},{env:base});
 const env={...base,...prep.env};assert.ok(env.PATH.startsWith(bin+path.delimiter));assert.equal(base.PATH,initialPath);
 const tool=(program,args,extra={})=>{const r=cp.spawnSync(program,args,{cwd:root,env:{...env,...extra},encoding:'utf8',timeout:30000,windowsHide:true,windowsVerbatimArguments:program.toLowerCase().endsWith('cmd.exe')});assert.equal(r.status,0,`${program}: ${r.stderr}\n${r.stdout}`);return r.stdout;};
 for(const mode of ['-c','-lc']){assert.match(tool(bash,[mode,'herdr-trello --help']),/herdr-trello/);assert.equal(tool(bash,[mode,'printf %s "$HERDR_PREVIOUS_HOOK"']),'present');assert.equal(JSON.parse(tool(bash,[mode,'herdr-trello status'])).version,1);}
 fs.copyFileSync(prior,path.join(userHome,'previous hook.txt'));
 for(const previous of ['$HOME/previous hook.txt','$(printf "%s" "$HOME")/previous hook.txt'])assert.equal(tool(bash,['-c','[ -n "$HERDR_PREVIOUS_HOOK" ] || { printf "hook missing; HOME=%s\\n" "$HOME" >&2; exit 1; }; printf %s "$HERDR_PREVIOUS_HOOK"'],{HERDR_AGENT_PREVIOUS_BASH_ENV:previous}),'present');
 if(win){
  const pwsh=cp.spawnSync('pwsh',['-NoProfile','-Command','$PSHOME'],{encoding:'utf8'});
  const profileBin=path.join(root,'profile-only tools');fs.mkdirSync(profileBin);fs.writeFileSync(path.join(profileBin,'profile-only-agent.cmd'),'@echo AGENT_STARTED\r\n');
  for(const program of [path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),...(pwsh.status===0?[path.join(pwsh.stdout.trim(),'pwsh.exe')]:[])]){
   assert.match(tool(program,['-NoProfile','-NonInteractive','-Command','herdr-trello --help']),/herdr-trello/);assert.equal(JSON.parse(tool(program,['-NoProfile','-NonInteractive','-Command','herdr-trello status'])).version,1);
   // Simulate a profile's PATH addition BEFORE the exact generated startup
   // command, without touching the person's actual PowerShell profile files.
   const initialized=`$env:PATH='${profileBin.replaceAll("'","''")}'+[IO.Path]::PathSeparator+$env:PATH; `;
   const line=profileShellArgv([program],['profile-only-agent'],prep.shell).at(-1);
   assert.match(tool(program,['-NoProfile','-NonInteractive','-Command',initialized+line]),/AGENT_STARTED/);
   const explicit=profileShellArgv([program],[process.execPath,'-e','console.log(process.env.PATH.indexOf(process.argv[1])>=0)',profileBin],prep.shell).at(-1);
   assert.equal(tool(program,['-NoProfile','-NonInteractive','-Command',initialized+explicit]).trim(),'true','Explicit-path agent subprocess retains profile tools too');
  }
  const cmd=path.join(process.env.SystemRoot,'System32/cmd.exe');assert.match(tool(cmd,['/d','/s','/c','herdr-trello --help']),/herdr-trello/);assert.equal(JSON.parse(tool(cmd,['/d','/s','/c','herdr-trello status'])).version,1);
 }
 const coordinator=preparedEnvironment({preparations:[prepared.data.launch]},{PATH:path.join(root,'coordinator-bin')+path.delimiter+initialPath},{env:base});assert.ok(coordinator.env.PATH.startsWith(path.join(root,'coordinator-bin')+path.delimiter+bin));
 const starts=[];const launched=await launchProfile({space:'fixture',argv:[process.execPath,'--','literal prompt'],shell:[bash],cwd:root,preparations:[prepared.data.launch]},async(method,request)=>{starts.push([method,request]);return method==='doc.get'?{value:{spaces:[{id:'fixture'}]}}:{address:'fake',state:'live'};},{env:base});assert.equal(launched.ok,true);assert.equal(starts.find(([m])=>m==='terminal.run')[1].env.PATH,prep.env.PATH);
 assert.match(profileShellArgv([bash],['agent'],prep.shell).at(-1),/bash-env/);assert.match(profileShellArgv(['pwsh'],['agent'],prep.shell).at(-1),/HERDR_AGENT_PATH/);assert.match(profileShellArgv(['cmd'],['agent'],prep.shell).at(-1),/DisableDelayedExpansion/);
 console.log('PASS: real Bash login/nonlogin, PowerShell and CMD tool shells resolve owned help/status by name from restricted PATH; original BASH_ENV and role prefix preserved');
 const publicOwnership=()=>{const probe=cp.spawnSync(process.execPath,['-e',ownershipProbe,home],{env,cwd:root,encoding:'utf8',timeout:10000});assert.equal(probe.status,0);return JSON.parse(probe.stdout).owned;};
 assert.equal(publicOwnership(),true);
 const removed=await transport.dispatch(home,{machine:null},{action:'discovery.prepare',enabled:false},()=>{},options);assert.equal(removed.ok,true);assert.ok(!fs.existsSync(path.join(userHome,'.claude/skills/herdr-trello/SKILL.md')));assert.equal(publicOwnership(),false);
 assert.equal((await transport.dispatch(home,{machine:null},{action:'discovery.prepare',enabled:true,token:'forbidden'},()=>{},options)).error.code,'INPUT');
 const {Store}=require('../src/plugins/trello/credentials.cjs'),controller=require('../src/services/private-actions/trello-controller.cjs');
 const privateStore=new Store(home,{security:()=>{}}),record=controller.fresh();record.hosts.push({machine:'offline',binding:{id:'remote',session:'default',principal:'a'.repeat(64),home:'b'.repeat(64)},access:'read-only',intent:record.intent});privateStore.write('controller',record);
 const all=await transport.dispatch(home,{machine:null},{action:'discovery.all',enabled:false},()=>{},{...options,storeOptions:{security:()=>{}},spawnSync:()=>({status:0,stdout:JSON.stringify({machines:[]})})});
 assert.deepEqual(all.data.pending,['offline']);assert.ok(!fs.existsSync(path.join(userHome,'.agents/skills/herdr-trello/SKILL.md')),'Offline peer cannot substitute local skills');
 // The existing shared +/Start queue has one agent startup boundary.
 const source=fs.readFileSync(new URL('../src/features/tabs/profile-launches.js',import.meta.url),'utf8');assert.ok(source.indexOf('await pluginPrepareProfile')<source.indexOf('const source = await readTextFile'));
 console.log('PASS: disabled/enabled preparation, ordinary/role/explicit profiles, awaited refusal, lifecycle coalescing and real fake-home note publication; no agents or model calls');
}finally{fs.rmSync(root,{recursive:true,force:true});}
