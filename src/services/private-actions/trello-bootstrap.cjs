'use strict';
// Public bootstrap: no secrets or listener.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto'),net=require('node:net');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const refused=code=>{throw Object.assign(Error(code),{code});};
function cleanEnv(session,source=process.env){const env={...source,HC_SESSION:session};for(const k of Object.keys(env))if(['hc_socket','hc_terminal_id','psmodulepath'].includes(k.toLowerCase()))delete env[k];return env;}
// Connect to the existing public RPC endpoint directly: hc connect/exec can autostart Core.
function endpoint(session){
 if(process.platform==='win32')return `\\\\.\\pipe\\herdr-core-${os.userInfo().username.replace(/[^a-zA-Z0-9]/g,'')}-${session}.sock`;
 const state=path.join(process.env.XDG_STATE_HOME||path.join(os.homedir(),'.local/state'),'herdr-core',session);
 const run=process.env.XDG_RUNTIME_DIR||(fs.existsSync(`/run/user/${process.getuid()}`)?`/run/user/${process.getuid()}`:null);
 return path.join(run?path.join(run,'herdr-core'):state,session+'.sock');
}
function coreConnection(session,{connect=net.createConnection}={}){
 const socket=connect(endpoint(session)),pending=new Map();let seq=0,text='',size=0;
 const close=()=>{socket.destroy();for(const p of pending.values())p.reject(Object.assign(Error(),{code:'MACHINE_UNAVAILABLE'}));pending.clear();};
 socket.on('error',close);socket.on('close',close);socket.setEncoding('utf8');
 socket.on('data',chunk=>{size+=Buffer.byteLength(chunk);if(size>262144)return close();text+=chunk;let i;while((i=text.indexOf('\n'))>=0){let m;try{m=JSON.parse(text.slice(0,i));}catch{return close();}text=text.slice(i+1);const p=pending.get(m.id);if(!p)continue;pending.delete(m.id);m.error?p.reject(Object.assign(Error(),{code:'MACHINE_UNAVAILABLE'})):p.resolve(m.result);}});
 return {current:()=>!socket.destroyed,close,call(method,params){return new Promise((resolve,reject)=>{if(socket.destroyed)return reject(Object.assign(Error(),{code:'MACHINE_UNAVAILABLE'}));const id=++seq,timer=setTimeout(close,5000);pending.set(id,{resolve:v=>{clearTimeout(timer);resolve(v);},reject:e=>{clearTimeout(timer);reject(e);}});socket.write(JSON.stringify({jsonrpc:'2.0',id,method,params})+'\n');});}};
}
function safePath(file){for(let p=path.resolve(file);;p=path.dirname(p)){try{if(fs.lstatSync(p).isSymbolicLink()||fs.realpathSync.native(p).toLowerCase()!==p.toLowerCase())refused('MACHINE_IDENTITY');}catch(e){if(e.code!=='ENOENT')throw e;}if(path.dirname(p)===p)break;}}
const userScript=`$ErrorActionPreference='Stop';$i=[Security.Principal.WindowsIdentity]::GetCurrent();@{sid=$i.User.Value;profile=[Environment]::GetFolderPath('UserProfile');elevated=([Security.Principal.WindowsPrincipal]$i).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator)}|ConvertTo-Json -Compress`;
function windowsFacts({execute=cp.execFileSync,env=process.env}={}){
 try{return JSON.parse(execute(path.join(env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(userScript,'utf16le').toString('base64')],{env:cleanEnv('default',env),encoding:'utf8',timeout:5000,maxBuffer:32768,windowsHide:true}));}catch{refused('MACHINE_IDENTITY');}
}
function sameExecution(a,b){return a&&b&&['user','uid','userHome','home'].every(k=>a[k]===b[k])&&a.sid===b.sid;}
async function proveCore(connection,machine,execution){
 const identity=await connection.call('hello',{generation:1});
 if(identity?.generation!==1||typeof identity.core?.id!=='string')refused('MACHINE_IDENTITY');if(identity.core.id!==machine.id)refused('MACHINE_CHANGED');
 const source=`const os=require('node:os'),path=require('node:path'),cp=require('node:child_process');const f=process.platform==='win32'?JSON.parse(cp.execFileSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(${JSON.stringify(userScript)},'utf16le').toString('base64')],{encoding:'utf8',stdio:['ignore','pipe','ignore'],env:Object.fromEntries(Object.entries(process.env).filter(([k])=>k.toLowerCase()!=='psmodulepath'))})):{};console.log(JSON.stringify({...f,user:os.userInfo().username,uid:os.userInfo().uid,userHome:os.homedir(),home:path.resolve(process.env.HERDR_APP_HOME||path.join(os.homedir(),'.config/herdr-app')),elevated:process.platform==='win32'?f.elevated:process.getuid()===0}));`;
 const result=await connection.call('machine.exec',{argv:['node','-e',source],timeout:5});let facts;
 try{if(result.code!==0||result.timed_out||result.truncated)refused('MACHINE_IDENTITY');facts=JSON.parse(Buffer.from(result.stdout,'base64').toString());}catch{refused('MACHINE_IDENTITY');}
 if(facts.elevated===true)refused('CORE_ELEVATED');if(facts.elevated!==false||!sameExecution(execution,facts)||execution.sid&&facts.profile!==execution.userHome)refused('MACHINE_IDENTITY');
 const after=await connection.call('hello',{generation:1});if(after?.core?.id!==machine.id||after.generation!==1)refused('MACHINE_CHANGED');
}
function privateHome({user=os.userInfo(),platform=process.platform}={}){
 const home=path.resolve(process.env.HERDR_APP_HOME||path.join(os.homedir(),'.config/herdr-app'));
 if(platform==='win32'){
  if(!process.env.LOCALAPPDATA||!process.env.SystemRoot)refused('MACHINE_IDENTITY');
 }else if(user.uid===0)refused('MACHINE_ELEVATED');
 for(let p=home;;p=path.dirname(p)){try{if(fs.lstatSync(p).isSymbolicLink()||fs.existsSync(path.join(p,'.git')))refused('MACHINE_IDENTITY');}catch(e){if(e.code!=='ENOENT')throw e;}if(path.dirname(p)===p)break;}
 return {home,user:user.username,uid:user.uid,userHome:os.homedir()};
}
function windowsUser(session,{env=process.env,execute=cp.execFileSync}={}){
 if(!env.LOCALAPPDATA||!env.SystemRoot)refused('MACHINE_IDENTITY');
 const file=path.join(env.LOCALAPPDATA,'herdr-core',session,'core.json');
 const script=`try{$ErrorActionPreference='Stop';$i=[Security.Principal.WindowsIdentity]::GetCurrent();$o=(Get-Acl -LiteralPath $env:TRELLO_CORE_PATH).GetOwner([Security.Principal.SecurityIdentifier]).Value;if($o -ne $i.User.Value){exit 32};exit 0}catch{exit 33}`;
 try{execute(path.join(env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{env:{...cleanEnv(session,env),TRELLO_CORE_PATH:file},stdio:'ignore',timeout:10000,windowsHide:true});}catch(e){refused(e.status===31?'MACHINE_ELEVATED':'MACHINE_IDENTITY');}
}
async function main(config,installerDigest,{connectCore=coreConnection,verifyCore=proveCore,executionHome=privateHome,checkWindows=windowsUser,getWindowsFacts=windowsFacts,input=process.stdin,output=process.stdout,platform=process.platform}={}){
 let retired=false,timer,rejectInput,connection,requestDeadline=Infinity;const started=performance.now();
 const send=value=>{if(!retired)output.write(JSON.stringify(value)+'\n');};
 let onData;
 const nextInput=()=>new Promise((resolve,reject)=>{
  if(onData)input.removeListener('data',onData);
  rejectInput=reject;let data='',consumed=false;
  input.setEncoding('utf8');
  onData=chunk=>{
   if(consumed){retired=true;reject(Object.assign(Error(),{code:'INPUT'}));return;}
   data+=chunk;
   if(Buffer.byteLength(data)>262144){retired=true;reject(Object.assign(Error(),{code:'INPUT'}));return;}
   const i=data.indexOf('\n');
   if(i<0)return;
   consumed=true;
   if(data.slice(i+1).trim()){retired=true;reject(Object.assign(Error(),{code:'INPUT'}));return;}
   try{resolve(JSON.parse(data.slice(0,i)));}catch{reject(Object.assign(Error(),{code:'INPUT'}));}
  };
  input.on('data',onData);
 });
 let consumed=false;
 input.on('error',()=>{retired=true;rejectInput(Object.assign(Error(),{code:'SSH_UNAVAILABLE'}));});
 input.on('end',()=>{retired=true;if(!consumed)rejectInput(Object.assign(Error(),{code:'INPUT'}));});
 // Handle early input rejection before probing.
 let receive=nextInput();receive.catch(()=>{});
 timer=setTimeout(()=>{retired=true;input.destroy?.();rejectInput(Object.assign(Error(),{code:'SSH_UNAVAILABLE'}));},55000);
 output.on?.('error',()=>{retired=true;});
 const current=()=>!retired&&performance.now()<Math.min(started+55000,requestDeadline);
 try{
  if(config?.version!==1||!config.machine||!/^[a-zA-Z0-9_-]{1,64}$/.test(config.machine.session)||!config.expected||Number(process.versions.node.split('.')[0])<20)refused('RUNTIME_PREREQUISITE');
  const publicInput=await receive;
  if(publicInput?.phase!=='bootstrap'||typeof publicInput.source!=='string'||crypto.createHash('sha256').update(publicInput.source).digest('hex')!==installerDigest)refused('RUNTIME_INVALID');
  const installerSource=publicInput.source;
  const execution=executionHome();let metadata,metadataBytes,metadataStamp;
  if(platform==='win32'){
   try{
   checkWindows(config.machine.session);const facts=getWindowsFacts();if(!/^S-1-/.test(facts.sid)||facts.profile!==execution.userHome)refused('MACHINE_IDENTITY');execution.sid=facts.sid;
   metadata=path.join(process.env.LOCALAPPDATA,'herdr-core',config.machine.session,'core.json');safePath(metadata);const stat=fs.lstatSync(metadata);if(!stat.isFile()||stat.nlink!==1||stat.size>32768)refused('MACHINE_IDENTITY');metadataStamp=JSON.stringify([stat.ino,stat.ctimeMs,stat.mtimeMs]);metadataBytes=fs.readFileSync(metadata);if(JSON.parse(metadataBytes).id!==config.machine.id)refused('MACHINE_CHANGED');
   }catch(e){refused(e.code?.startsWith('MACHINE_')?e.code:e.code==='ENOENT'?'MACHINE_UNAVAILABLE':'MACHINE_IDENTITY');}
  }
  connection=connectCore(config.machine.session);await verifyCore(connection,config.machine,execution);
  const guard=()=>{if(!current())refused('STALE');if(!connection.current())refused('MACHINE_CHANGED');const now=executionHome();if(execution.sid){now.sid=execution.sid;safePath(metadata);const s=fs.lstatSync(metadata);if(!s.isFile()||s.nlink!==1||JSON.stringify([s.ino,s.ctimeMs,s.mtimeMs])!==metadataStamp||!fs.readFileSync(metadata).equals(metadataBytes))refused('MACHINE_CHANGED');}if(!sameExecution(execution,now))refused('MACHINE_CHANGED');if(!current())refused('STALE');};
  const binding={id:config.machine.id,session:config.machine.session,principal:hash([execution.user,execution.uid,execution.userHome]),home:hash(execution.home)};
  if(config.binding&&JSON.stringify(config.binding)!==JSON.stringify(binding))refused('MACHINE_CHANGED');
  const mod={exports:{}};new Function('require','module','exports',installerSource)(require,mod,mod.exports);const installer=mod.exports;
  const runtime=path.join(execution.home,'.customizations/runtime'),state=installer.probe(runtime,config.expected);
  guard();receive=nextInput();receive.catch(()=>{});send({version:1,phase:'ready',binding,...state});
  const request=await receive;consumed=true;
  guard();await verifyCore(connection,config.machine,execution);if(!current())refused('STALE');if(request?.version!==1||!['probe','install','owner'].includes(request.kind))refused('INPUT');
  const remaining=request.remaining??55000;if(!Number.isSafeInteger(remaining)||remaining<1||remaining>55000)refused('STALE');requestDeadline=performance.now()+remaining;
  let result;
  if(request.kind==='probe')result={version:1,ok:true,data:{...state,destination:binding}};
  else if(request.kind==='install'){
   installer.validate(request.payload);
   if(Object.entries(config.expected).some(([name,digest])=>installer.hash(Buffer.from(request.payload.files[name]??'','base64'))!==digest))refused('RUNTIME_INVALID');
   result={version:1,ok:true,data:{...await installer.install(execution.home,request.payload,{beforeCommit:guard}),destination:binding}};
  }
  else{
   if(state.runtime!=='ready')refused(state.runtime==='missing'?'RUNTIME_MISSING':state.runtime==='outdated'?'RUNTIME_OUTDATED':'RUNTIME_CONFLICT');
   const owner=require(path.join(runtime,'lib/trello/owner.cjs'));
   result=await owner.execute(request.payload,{home:execution.home,isCurrent:()=>{guard();return true;},binding,initialControl:request.initialControl});
   if(result.ok)result.data={...result.data,destination:binding};
  }
  send({version:1,phase:'result',result});
 }catch(e){send({version:1,phase:'result',result:{version:1,ok:false,error:{code:['INPUT','MACHINE_CHANGED','MACHINE_IDENTITY','MACHINE_ELEVATED','CORE_ELEVATED','MACHINE_UNAVAILABLE','STALE','RUNTIME_PREREQUISITE','RUNTIME_MISSING','RUNTIME_OUTDATED','RUNTIME_CONFLICT','RUNTIME_BUSY','RUNTIME_INVALID','RUNTIME_PATH','SSH_UNAVAILABLE'].includes(e.code)?e.code:'SSH_UNAVAILABLE'}}});}
 finally{clearTimeout(timer);connection?.close();input.destroy?.();}
}
module.exports={main,privateHome,windowsUser,windowsFacts,proveCore,coreConnection,endpoint,sameExecution};
