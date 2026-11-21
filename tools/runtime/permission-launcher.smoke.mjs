// Explicit opt-in live test. Never calls stop/start on the default session.
// Usage: node scripts/permission-launcher.smoke.mjs --on remote-workstation
import assert from 'node:assert/strict';
import fs from 'node:fs';
import crypto from 'node:crypto';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
const require=createRequire(import.meta.url);
const {sshTarget,remoteSource}=require('../mods/custom-settings/core-control.cjs');
const target=process.argv[2]==='--on'?process.argv[3]:null;
if(!target)throw Error('Pass --on <machine> to test a disposable session explicitly.');
const session=`custom-permission-smoke-${Date.now().toString(36)}`;
const hash=crypto.createHash('sha256').update(session).digest('hex').slice(0,16);
const source=fs.readFileSync(new URL('../mods/custom-settings/permission-launcher.cjs',import.meta.url),'utf8');
const list=spawnSync('hc.exe',['machine','ls','--json'],{encoding:'utf8'});
const descriptor=JSON.parse(list.stdout).machines.find(m=>m.name===target&&!m.temporary&&!m.via);
if(!descriptor)throw Error('A configured direct SSH machine is required.');
let scratchId=null;
const requests=[];
function remote(command,args=[]){const r=spawnSync('hc.exe',['exec','--on',target,command,...args],{encoding:'utf8',timeout:45000});if(r.status!==0)throw Error(r.stdout+r.stderr+String(r.error||''));return r.stdout;}
function ssh(args,input){const r=spawnSync('ssh',['-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8',...sshTarget(descriptor.target),...args],{input,encoding:'utf8',timeout:45000});if(r.status!==0)throw Error(r.stdout+r.stderr+String(r.error||''));return r.stdout;}
function node(script){return ssh(['node -'],script);}
function bridge(input){
 const request={...input,session};
 const script=scratchId?remoteSource(source,{...descriptor,id:scratchId,session},request):`process.env.HC_SESSION=${JSON.stringify(session)};const m={exports:{},id:'smoke-launcher'};new Function('require','module','process',${JSON.stringify(source)})(require,m,process);console.log(JSON.stringify(m.exports.main(${JSON.stringify(request)})));`;
 const result=JSON.parse(node(script));if(result.error)throw Error(result.error);return result;
}
function ps(script){return ssh(['powershell.exe','-NoLogo','-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')]);}
async function wait(request){let outcome;for(let i=0;i<30;i++){await new Promise(r=>setTimeout(r,1500));outcome=bridge({action:'status',request});if(['failed','complete'].includes(outcome.state))break;}assert.equal(outcome.state,'complete',JSON.stringify(outcome));return outcome;}
// Use raw API calls from an intentionally wrong client cwd. The CLI normally
// supplies its own cwd, which would conceal a bad core/holder startup default.
async function checkDirectories(session, hash) {
  const fs=require('node:fs'),path=require('node:path'),os=require('node:os');
  const {spawn}=require('node:child_process'),{createInterface}=require('node:readline');
  const core=path.join(process.env.LOCALAPPDATA,'Programs','herdr-core','herdr-core.exe');
  const child=spawn(core,['connect'],{env:{...process.env,HC_SESSION:session},cwd:path.join(process.env.SystemRoot,'System32'),windowsHide:true,stdio:['pipe','pipe','pipe']});
  const waiting=new Map();let id=0;
  createInterface({input:child.stdout}).on('line',line=>{const message=JSON.parse(line),job=waiting.get(message.id);if(!job)return;waiting.delete(message.id);clearTimeout(job.timer);message.error?job.reject(Error(message.error.message)):job.resolve(message.result);});
  const call=(method,params)=>new Promise((resolve,reject)=>{const n=++id,timer=setTimeout(()=>{waiting.delete(n);reject(Error('Directory API test timed out'));},10000);waiting.set(n,{resolve,reject,timer});child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:n,method,params})+'\n');});
  const terminals=[];
  try {
    const home=os.homedir(),project=path.join(process.env.LOCALAPPDATA,'herdr-core-permissions',hash,'Project space # Ю');fs.mkdirSync(project,{recursive:true});
    const noCwd=await call('machine.exec',{argv:['node','-p','process.cwd()']});
    const explicit=await call('machine.exec',{argv:['node','-p','process.cwd()'],cwd:project});
    const plain=await call('terminal.run',{argv:['cmd.exe','/d'],no_parent:true,no_notify:true});terminals.push(plain.address);
    const custom=await call('terminal.run',{argv:['cmd.exe','/d'],cwd:project,no_parent:true,no_notify:true});terminals.push(custom.address);
    if(noCwd.code!==0||explicit.code!==0)throw Error('Directory exec failed');
    return {home,project,defaultExec:Buffer.from(noCwd.stdout,'base64').toString('utf8').trim(),explicitExec:Buffer.from(explicit.stdout,'base64').toString('utf8').trim(),defaultTerminal:plain.cwd,explicitTerminal:custom.cwd};
  } finally {for(const terminal of terminals){await call('terminal.kill',{terminal});await call('terminal.rm',{terminal});}child.stdin.end();}
}
const before=JSON.parse(remote('hc',['server','status']));
let info;
try{
  info=bridge({action:'inspect'});assert.equal(info.desktop,true);assert.equal(info.session,session);
  for(const mode of ['standard','administrator','standard']){
    const request=`smoke-${Date.now().toString(36)}-${mode}`;requests.push(request);
    console.log(`Testing ${target}/${session}: ${mode}`);
    const prior=bridge({action:'inspect'});
    const configure=request+'-config';requests.push(configure);
    assert.equal(bridge({action:'autostart',request:configure,mode,remember:true}).configured,true);
    const configured=bridge({action:'inspect'});assert.equal(configured.running,prior.running);assert.equal(configured.pid,prior.pid,'Apply/autostart never starts, stops or relaunches core');
    assert.equal(bridge({action:prior.running?'apply':'start',request,mode}).queued,true);
    await wait(request);
    if(!scratchId)scratchId=ps(`(Get-Content -LiteralPath (Join-Path $env:LOCALAPPDATA 'herdr-core\\${session}\\core.json') -Raw|ConvertFrom-Json).id`).trim();
    // Give the next transition a real disposable terminal holder to replace.
    ps(`$env:HC_SESSION='${session}'; & "$env:LOCALAPPDATA\\Programs\\herdr-core\\herdr-core.exe" run --bg --keep --name smoke-${Date.now().toString(36)} -- cmd.exe; if($LASTEXITCODE -ne 0 -and $LASTEXITCODE -ne 1){exit $LASTEXITCODE}`);
    const inspected=bridge({action:'inspect'});assert.equal(inspected.savedMode,mode);assert.equal(inspected.remember,true);
    const dirs=JSON.parse(node(`(${checkDirectories.toString()})(${JSON.stringify(session)},${JSON.stringify(hash)}).then(v=>console.log(JSON.stringify(v))).catch(e=>{console.error(e);process.exitCode=1;})`));
    assert.equal(dirs.defaultExec.toLowerCase(),dirs.home.toLowerCase());assert.equal(dirs.defaultTerminal.toLowerCase(),dirs.home.toLowerCase());
    assert.equal(dirs.explicitExec,dirs.project);assert.equal(dirs.explicitTerminal,dirs.project);
    console.log(`PASS: ${mode}; new core token verified; default exec/terminal start at home and explicit project paths are preserved`);
    const startup=JSON.parse(ps(`$ErrorActionPreference='Stop'; $env:HC_SESSION='${session}'; $core=\"$env:LOCALAPPDATA\\Programs\\herdr-core\\herdr-core.exe\"; $before=& $core server status|ConvertFrom-Json; $file=Join-Path $env:LOCALAPPDATA 'herdr-core-permissions\\${hash}\\startup.json'; Remove-Item -LiteralPath $file -ErrorAction SilentlyContinue; Start-ScheduledTask -TaskName 'Custom-Herdr-${info.sid}-${hash}'; for($i=0;$i -lt 30 -and -not(Test-Path -LiteralPath $file);$i++){Start-Sleep -Milliseconds 500}; $receipt=Get-Content -LiteralPath $file -Raw|ConvertFrom-Json; $after=& $core server status|ConvertFrom-Json; @{state=$receipt.state;samePid=($before.pid -eq $after.pid)}|ConvertTo-Json -Compress`));
    assert.equal(startup.state,'complete');assert.equal(startup.samePid,true,'The sign-in task must reuse, not stop, an existing core');
  }
  const stop=`smoke-${Date.now().toString(36)}-stop`;requests.push(stop);
  assert.equal(bridge({action:'stop',request:stop,mode:'standard'}).queued,true);await wait(stop);
  assert.equal(bridge({action:'inspect'}).running,false,'SSH inspection must not bootstrap the stopped core');
  const off=`smoke-${Date.now().toString(36)}-off`;requests.push(off);
  assert.equal(bridge({action:'autostart',request:off,mode:'standard',remember:false}).configured,true);
  const stopped=bridge({action:'inspect'});assert.equal(stopped.running,false);assert.equal(stopped.remember,false);
  const start=`smoke-${Date.now().toString(36)}-start`;requests.push(start);
  assert.equal(bridge({action:'start',request:start,mode:'standard'}).queued,true);await wait(start);
  const running=bridge({action:'inspect'});assert.equal(running.running,true);assert.equal(running.remember,false,'Start does not enable autostart');
  const repeat=`smoke-${Date.now().toString(36)}-repeat`;requests.push(repeat);
  assert.equal(bridge({action:'start',request:repeat,mode:'standard'}).queued,true);await wait(repeat);
  assert.equal(bridge({action:'inspect'}).pid,running.pid,'Start reuses a running core without stopping it');
  console.log('PASS: Stop, offline SSH inspect, independent autostart disable, cold Start and non-destructive repeated Start');
}finally{
  const taskNames=[`Custom-Herdr-${info?.sid}-${hash}`,...requests.flatMap(r=>[`Custom-Herdr-Relaunch-${r}`,`Custom-Herdr-Relaunch-${r}-stop`])];
  const script=`$ErrorActionPreference='Stop'; $session='${session}'; if($session -notlike 'custom-permission-smoke-*'){throw 'Invalid cleanup scope'}; $env:HC_SESSION=$session; & "$env:LOCALAPPDATA\\Programs\\herdr-core\\herdr-core.exe" server stop | Out-Null; Start-Sleep -Seconds 2; $names=@(${taskNames.map(s=>"'"+s.replaceAll("'","''")+"'").join(',')}); foreach($name in $names){$task=Get-ScheduledTask -TaskName $name -ErrorAction SilentlyContinue;if($task -and $task.Description.EndsWith('; '+$session)){Unregister-ScheduledTask -TaskName $name -Confirm:$false}}; $root=Join-Path $env:LOCALAPPDATA 'herdr-core-permissions\\${hash}'; if(Test-Path -LiteralPath $root){Remove-Item -LiteralPath $root -Recurse -Force}; $coreRoot=Join-Path $env:LOCALAPPDATA ('herdr-core\\'+$session); if(Test-Path -LiteralPath $coreRoot){Remove-Item -LiteralPath $coreRoot -Recurse -Force}`;
  console.log(ps(script).trim());
  const after=JSON.parse(remote('hc',['server','status']));assert.equal(after.pid,before.pid,'The real core must not be restarted');assert.deepEqual(after.holders.map(h=>[h.pid,h.instance]),before.holders.map(h=>[h.pid,h.instance]),'Real terminal holders must remain unchanged');
  console.log('PASS: scratch tasks/session cleaned up; real core and holders unchanged');
}
