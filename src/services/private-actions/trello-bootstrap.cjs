'use strict';
// Public fixed bootstrap sent as code, never containing credentials. No remote listener.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),crypto=require('node:crypto');
const hash=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const refused=code=>{throw Object.assign(Error(code),{code});};
function cleanEnv(session){const env={...process.env,HC_SESSION:session};for(const k of Object.keys(env))if(['hc_socket','hc_terminal_id','psmodulepath'].includes(k.toLowerCase()))delete env[k];return env;}
async function hello(session){
 return new Promise((resolve,reject)=>{
  const child=cp.spawn(process.platform==='win32'?'hc.exe':'hc',['connect','--session',session],{env:cleanEnv(session),windowsHide:true,stdio:['pipe','pipe','pipe']});let done=false,text='';
  const end=(value)=>{if(done)return;done=true;clearTimeout(timer);child.kill();value?resolve(value):reject(Object.assign(Error('MACHINE_CHANGED'),{code:'MACHINE_CHANGED'}));};
  const timer=setTimeout(()=>end(null),5000);child.on('error',()=>end(null));child.on('close',()=>end(null));child.stdin.on('error',()=>end(null));child.stderr.resume();
  child.stdout.setEncoding('utf8');child.stdout.on('data',chunk=>{text+=chunk;if(text.length>262144)return end(null);let i;while((i=text.indexOf('\n'))>=0){let message;try{message=JSON.parse(text.slice(0,i));}catch{}text=text.slice(i+1);if(message?.id===1)end(message.error?null:message.result);}});
  child.stdin.write(JSON.stringify({jsonrpc:'2.0',id:1,method:'hello',params:{generation:1}})+'\n');
 });
}
function privateHome(){
 const user=os.userInfo(),home=path.resolve(process.env.HERDR_APP_HOME||path.join(os.homedir(),'.config/herdr-app'));
 if(process.platform==='win32'){
  if(!process.env.LOCALAPPDATA||!process.env.SystemRoot)refused('MACHINE_IDENTITY');
 }else if(user.uid===0)refused('MACHINE_IDENTITY');
 for(let p=home;;p=path.dirname(p)){try{if(fs.lstatSync(p).isSymbolicLink()||fs.existsSync(path.join(p,'.git')))refused('MACHINE_IDENTITY');}catch(e){if(e.code!=='ENOENT')throw e;}if(path.dirname(p)===p)break;}
 return {home,user:user.username,uid:user.uid,userHome:os.homedir()};
}
function windowsUser(session){
 const file=path.join(process.env.LOCALAPPDATA,'herdr-core',session,'core.json');
 const script=`try{$ErrorActionPreference='Stop';$i=[Security.Principal.WindowsIdentity]::GetCurrent();$a=([Security.Principal.WindowsPrincipal]::new($i)).IsInRole([Security.Principal.WindowsBuiltInRole]::Administrator);$o=(Get-Acl -LiteralPath $env:TRELLO_CORE_PATH).GetOwner([Security.Principal.SecurityIdentifier]).Value;if($a -or $o -ne $i.User.Value){exit 1};exit 0}catch{exit 1}`;
 try{cp.execFileSync(path.join(process.env.SystemRoot,'System32/WindowsPowerShell/v1.0/powershell.exe'),['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],{env:{...cleanEnv(session),TRELLO_CORE_PATH:file},stdio:'ignore',timeout:10000,windowsHide:true});}catch{refused('MACHINE_IDENTITY');}
}
async function main(config,installerSource,{getHello=hello,executionHome=privateHome,checkWindows=windowsUser,input=process.stdin,output=process.stdout}={}){
 let retired=false,timer,rejectInput;const started=Date.now();
 const send=value=>{if(!retired)output.write(JSON.stringify(value)+'\n');};
 const receive=new Promise((resolve,reject)=>{
  rejectInput=reject;let data='',consumed=false;
  input.setEncoding('utf8');
  input.on('data',chunk=>{
   if(consumed){retired=true;reject(Object.assign(Error(),{code:'INPUT'}));return;}
   data+=chunk;
   if(Buffer.byteLength(data)>262144){retired=true;reject(Object.assign(Error(),{code:'INPUT'}));return;}
   const i=data.indexOf('\n');
   if(i<0)return;
   consumed=true;
   if(data.slice(i+1).trim()){retired=true;reject(Object.assign(Error(),{code:'INPUT'}));return;}
   try{resolve(JSON.parse(data.slice(0,i)));}catch{reject(Object.assign(Error(),{code:'INPUT'}));}
  });
  input.on('error',()=>{retired=true;reject(Object.assign(Error(),{code:'SSH_UNAVAILABLE'}));});
  input.on('end',()=>{retired=true;if(!consumed)reject(Object.assign(Error(),{code:'INPUT'}));});
 });
 // Attach rejection handling before readiness probes; no unhandled payload failure.
 receive.catch(()=>{});
 timer=setTimeout(()=>{retired=true;input.destroy?.();rejectInput(Object.assign(Error(),{code:'SSH_UNAVAILABLE'}));},55000);
 output.on?.('error',()=>{retired=true;});
 const current=()=>!retired&&Date.now()-started<55000;
 try{
  if(config?.version!==1||!config.machine||!/^[a-zA-Z0-9_-]{1,64}$/.test(config.machine.session)||!config.expected||Number(process.versions.node.split('.')[0])<20)refused('RUNTIME_PREREQUISITE');
  const execution=executionHome();if(process.platform==='win32')checkWindows(config.machine.session);
  const identity=await getHello(config.machine.session);if(identity?.core?.id!==config.machine.id||identity.generation!==1)refused('MACHINE_CHANGED');
  const binding={id:config.machine.id,session:config.machine.session,principal:hash([execution.user,execution.uid,execution.userHome]),home:hash(execution.home)};
  if(config.binding&&JSON.stringify(config.binding)!==JSON.stringify(binding))refused('MACHINE_CHANGED');
  const mod={exports:{}};new Function('require','module','exports',installerSource)(require,mod,mod.exports);const installer=mod.exports;
  const runtime=path.join(execution.home,'.customizations/runtime'),state=installer.probe(runtime,config.expected);
  if(!current())refused('MACHINE_CHANGED');send({version:1,phase:'ready',binding,...state});
  const request=await receive;
  if(!current()||request?.version!==1||!['probe','install','owner'].includes(request.kind))refused('INPUT');
  let result;
  if(request.kind==='probe')result={version:1,ok:true,data:{...state,destination:binding}};
  else if(request.kind==='install'){
   installer.validate(request.payload);
   if(Object.entries(config.expected).some(([name,digest])=>installer.hash(Buffer.from(request.payload.files[name]??'','base64'))!==digest))refused('RUNTIME_INVALID');
   result={version:1,ok:true,data:{...await installer.install(execution.home,request.payload,{beforeCommit(){if(!current())refused('MACHINE_CHANGED');}}),destination:binding}};
  }
  else{
   if(state.runtime!=='ready')refused(state.runtime==='missing'?'RUNTIME_MISSING':state.runtime==='outdated'?'RUNTIME_OUTDATED':'RUNTIME_CONFLICT');
   const owner=require(path.join(runtime,'lib/trello/owner.cjs'));
   result=await owner.execute(request.payload,{home:execution.home,isCurrent:current});
   if(result.ok)result.data={...result.data,destination:binding};
  }
  send({version:1,phase:'result',result});
 }catch(e){send({version:1,phase:'result',result:{version:1,ok:false,error:{code:['INPUT','MACHINE_CHANGED','MACHINE_IDENTITY','RUNTIME_PREREQUISITE','RUNTIME_MISSING','RUNTIME_OUTDATED','RUNTIME_CONFLICT','RUNTIME_BUSY','RUNTIME_INVALID','SSH_UNAVAILABLE'].includes(e.code)?e.code:'SSH_UNAVAILABLE'}}});}
 finally{clearTimeout(timer);input.destroy?.();}
}
module.exports={main,privateHome,windowsUser,hello};
