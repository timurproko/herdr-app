// Runs ON the selected Core host. Explicit setup only; never manages Core/agents.
'use strict';
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),crypto=require('node:crypto');
const {execFileSync}=require('node:child_process');
const {pathToFileURL}=require('node:url');
const FILES=['monitor-runner.js','monitor-engine.js','monitor-policy.js','ci-evidence.js','ci-message.js','ci-states.js','ci-delivery.js','ci-footer.js','ci-history.js'];
const ID='herdr-ci-monitor-v1',TASK='Herdr CI Monitor';
// node.exe is a console program: launched directly by Task Scheduler it gets a visible console window
// (Windows Terminal on Windows 11). A headless conhost gives it a console without a window.
const LAUNCHER=path.join(process.env.SystemRoot??'C:\\Windows','System32','conhost.exe');
const q=s=>"'"+s.replace(/'/g,"''")+"'";
function execute(command,args){return execFileSync(command,args,{encoding:'utf8',timeout:20000,windowsHide:true,maxBuffer:2*1024*1024,env:{...process.env,GH_PROMPT_DISABLED:'1'}}).trim();}
function ps(script){return execute('powershell.exe',['-NoProfile','-NonInteractive','-Command',"$ErrorActionPreference='Stop';"+script+';exit 0']);}
function json(file){return JSON.parse(fs.readFileSync(file,'utf8'));}
function atomic(file,value){if(fs.existsSync(file)&&fs.lstatSync(file).isSymbolicLink())throw Error('Linked monitor state refused');const temp=file+'.'+crypto.randomUUID()+'.tmp';fs.writeFileSync(temp,JSON.stringify(value),{flag:'wx',mode:0o600});try{fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}}
function resolve(name){const found=execute('where.exe',[name+'.exe']).split(/\r?\n/).find(file=>path.isAbsolute(file)&&fs.existsSync(file));if(!found)throw Error('Required command unavailable: '+name);return found;}
function task(readPS=ps){const result=readPS(`$t=Get-ScheduledTask -TaskName ${q(TASK)} -ErrorAction SilentlyContinue;if($t){[pscustomobject]@{description=$t.Description;state=[string]$t.State;actions=@($t.Actions|ForEach-Object{[pscustomobject]@{execute=$_.Execute;arguments=$_.Arguments}})}|ConvertTo-Json -Compress -Depth 5}`);return result?JSON.parse(result):null;}
// Killing the headless conhost does not end node, so stop the runner recorded in worker.lock, but only if it is this monitor's node.
function stopRunner(root,powershell){
  const lock=path.join(root,'worker.lock');let pid;
  try{pid=json(lock).pid;}catch{return;}
  if(!Number.isSafeInteger(pid)||pid<=0||pid===process.pid)return;
  powershell(`$p=Get-CimInstance Win32_Process -Filter 'ProcessId=${pid}';if($p -and $p.Name -eq 'node.exe' -and $p.CommandLine -and $p.CommandLine.Contains('monitor-runner.js') -and ($p.CommandLine.Contains(${q('--home "'+root+'"')}) -or $p.CommandLine.EndsWith(${q('--home '+root)}))){Stop-Process -Id ${pid} -Force}`);
}
function register(args,powershell){
  // Limited interactive-user task. Never elevate or ask for/store a password.
  powershell(`$user=[Security.Principal.WindowsIdentity]::GetCurrent().Name;$a=New-ScheduledTaskAction -Execute ${q(LAUNCHER)} -Argument ${q(args)};$logon=New-ScheduledTaskTrigger -AtLogOn -User $user;$retry=New-ScheduledTaskTrigger -Once -At (Get-Date).AddMinutes(1) -RepetitionInterval (New-TimeSpan -Minutes 1);$s=New-ScheduledTaskSettingsSet -MultipleInstances IgnoreNew -ExecutionTimeLimit ([TimeSpan]::Zero) -AllowStartIfOnBatteries -DontStopIfGoingOnBatteries -StartWhenAvailable;$p=New-ScheduledTaskPrincipal -UserId $user -LogonType Interactive -RunLevel Limited;Register-ScheduledTask -TaskName ${q(TASK)} -Action $a -Trigger @($logon,$retry) -Settings $s -Principal $p -Description ${q(ID)} -Force|Out-Null`);
}
function ownedTask(t,installed){return !t||(installed&&t.description===ID&&t.actions?.length===1&&t.actions[0].execute===(installed.launcher??installed.node)&&t.actions[0].arguments===installed.arguments);}
async function main(input,{root=path.join(os.homedir(),'.local','state','herdr-ci-monitor'),platform=process.platform,run=execute,powershell=ps,resolveCommand=resolve}={}){
  if(platform!=='win32')throw Error('Background CI startup currently supports Windows Core hosts only. No service was installed.');
  if(!['status','install','update','stop','probe'].includes(input?.action))throw Error('Invalid monitor operation');
  if(fs.existsSync(root)&&fs.lstatSync(root).isSymbolicLink())throw Error('Linked monitor directory refused');
  const installedFile=path.join(root,'installation.json'),installed=fs.existsSync(installedFile)?json(installedFile):null;
  if(installed&&(installed.version!==1||installed.id!==ID||installed.root!==root))throw Error('Unknown monitor installation; nothing replaced');
  const t=task(powershell);if(!ownedTask(t,installed))throw Error('Task name/action is not owned by this monitor; nothing replaced');
  if(input.action==='status'){
    const state=installed&&fs.existsSync(path.join(root,'status.json'))?json(path.join(root,'status.json')):null;
    const config=installed&&fs.existsSync(path.join(root,'config.json'))?json(path.join(root,'config.json')):null;
    const emptyScope=config?.enabled===true&&Array.isArray(config.repositories)&&config.repositories.length===0;
    return {installed:Boolean(installed),packageHash:installed?path.basename(path.dirname(installed.entry)):null,task:t?.state??null,running:Boolean(t?.state==='Running'&&state&&Date.now()-state.heartbeat<180000),enabled:config?.enabled??false,states:config?.states??[],repositories:config?.repositories??[],heartbeat:state?.heartbeat??null,health:emptyScope?'suppressed':state?.health??null,reason:emptyScope?'no-monitored-repositories':state?.reason??null,targets:emptyScope?0:state?.targets??0,attempts:emptyScope?0:state?.attempts??0,delivered:emptyScope?0:state?.delivered??0,unknown:emptyScope?0:state?.unknown??0,suppressed:emptyScope?0:state?.suppressed??0,reasons:emptyScope?{'no-monitored-repositories':1}:state?.reasons??{},lastEvent:state?.lastEvent??null,root};
  }
  if(!installed&&input.action!=='install')throw Error('Install the monitor on this machine first');
  if(installed&&(!installed.hashes||fs.readFileSync(path.join(path.dirname(installed.entry),'package.json'),'utf8')!=='{"type":"module"}'||FILES.some(file=>{
    const target=path.join(path.dirname(installed.entry),file);
    return !fs.existsSync(target)||fs.lstatSync(target).isSymbolicLink()||crypto.createHash('sha256').update(fs.readFileSync(target)).digest('hex')!==installed.hashes[file];
  })))throw Error('Monitor package changed; preserving it');
  if(input.action==='stop'){
    const config=json(path.join(root,'config.json'));config.enabled=false;config.revision=crypto.randomUUID();atomic(path.join(root,'config.json'),config);
    if(t)powershell(`Stop-ScheduledTask -TaskName ${q(TASK)};Disable-ScheduledTask -TaskName ${q(TASK)}|Out-Null`);
    stopRunner(root,powershell);
    return {installed:true,enabled:false,running:false};
  }
  const hc=installed?.commands?.hc??resolveCommand('hc'),core=JSON.parse(run(hc,['server','status','--json']));
  if(!/^[a-z0-9-]{16,80}$/i.test(core.core?.id??''))throw Error('Core is unavailable');
  if(input.coreId&&core.core.id!==input.coreId)throw Error('Selected Core identity changed');
  if(installed&&installed.coreId!==core.core.id)throw Error('Installed Core identity changed; explicit reinstall review required');
  if(input.action==='probe'){
    const base=path.dirname(installed.entry),{CoreCIMonitor}=await import(pathToFileURL(path.join(base,'monitor-engine.js')).href);
    const {run:transport}=await import(pathToFileURL(installed.entry).href),events=[];
    const monitor=new CoreCIMonitor({run:transport,config:async()=>({...json(path.join(root,'config.json')),enabled:true}),
      journal:{claim(){throw Error('Read-only probe cannot claim or send');}},report:event=>events.push(event)});
    return {probe:await monitor.cycle({send:false}),events};
  }
  let entry=installed?.entry,entryHash=installed?.entryHash,commands=installed?.commands;
  if(input.action==='install'){
    if(!input.files||FILES.some(file=>typeof input.files[file]!=='string')||Object.keys(input.files).length!==FILES.length)throw Error('Incomplete monitor package');
    const hash=crypto.createHash('sha256').update(JSON.stringify(input.files)).digest('hex'),version=path.join(root,'versions',hash);
    if(fs.existsSync(root)&&!installed&&fs.readdirSync(root).length)throw Error('Unknown existing monitor directory; nothing overwritten');
    fs.mkdirSync(version,{recursive:true,mode:0o700});
    for(const file of FILES){const dest=path.join(version,file),bytes=input.files[file];if(fs.existsSync(dest)){if(fs.readFileSync(dest,'utf8')!==bytes)throw Error('Modified monitor package; preserving it');}else fs.writeFileSync(dest,bytes,{flag:'wx',mode:0o600});}
    const pkg=path.join(version,'package.json');if(fs.existsSync(pkg)&&fs.readFileSync(pkg,'utf8')!=='{"type":"module"}')throw Error('Modified package declaration; preserving it');if(!fs.existsSync(pkg))fs.writeFileSync(pkg,'{"type":"module"}',{flag:'wx',mode:0o600});
    entry=path.join(version,'monitor-runner.js');entryHash=crypto.createHash('sha256').update(fs.readFileSync(entry)).digest('hex');
    commands={hc,gh:resolveCommand('gh'),git:resolveCommand('git')};
  }
  const {validateConfig}=await import(pathToFileURL(path.join(path.dirname(entry),'monitor-policy.js')).href);
  const config=validateConfig({version:1,...input.config,coreId:core.core.id,commands,revision:crypto.randomUUID()});
  // No tokens are copied. Each host uses its own gh login; verify it can identify itself.
  run(commands.gh,['api','user','--jq','.login']);
  const historyFile=path.join(root,'history.json');
  if(!fs.existsSync(historyFile)){
    const {parseHistory}=await import(pathToFileURL(path.join(path.dirname(entry),'ci-history.js')).href);
    atomic(historyFile,parseHistory(input.history??null));
  }
  atomic(path.join(root,'config.json'),config);
  const args='--headless "'+process.execPath+'" "'+entry+'" --home "'+root+'"';
  const record={version:1,id:ID,root,coreId:core.core.id,node:process.execPath,launcher:LAUNCHER,entry,entryHash,arguments:args,commands,hashes:Object.fromEntries(FILES.map(file=>[file,crypto.createHash('sha256').update(fs.readFileSync(path.join(path.dirname(entry),file))).digest('hex')]))};
  if(input.action==='install'){
    if(t)powershell(`Stop-ScheduledTask -TaskName ${q(TASK)}`);
    stopRunner(root,powershell);
    if(!installed)atomic(installedFile,record); // Own staged files even if task registration is refused.
    register(args,powershell);
    atomic(installedFile,record);
  }else if(!installed.launcher){
    // Migrate a task that launches node.exe directly (visible console window) to the headless launcher.
    if(t)powershell(`Stop-ScheduledTask -TaskName ${q(TASK)}`);
    stopRunner(root,powershell);
    register(args,powershell);
    atomic(installedFile,record);
  }
  powershell(`Enable-ScheduledTask -TaskName ${q(TASK)}|Out-Null;Start-ScheduledTask -TaskName ${q(TASK)}`);
  return {installed:true,enabled:config.enabled,starting:true,coreId:core.core.id,root};
}
module.exports={main,FILES,ownedTask};
