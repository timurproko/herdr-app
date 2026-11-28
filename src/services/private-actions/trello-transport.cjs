'use strict';
// Only this fixed service resolves/runs SSH. Callers cannot supply commands or files.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),zlib=require('node:zlib');
const installer=require('./trello-install.cjs');
const controller=require('./trello-controller.cjs');
const defaults=()=>path.resolve(__dirname,'../..');
// CMD accepts 8,191 characters, not Windows CreateProcess's 32K. Reserve shell overhead.
const COMMAND_LIMIT=7600;
const safeMessages={SSH_UNAVAILABLE:'SSH or Node unavailable. Check host trust and prerequisites.',MACHINE_UNAVAILABLE:'The configured Core session is unavailable.',MACHINE_CHANGED:'Machine changed. Check again.',MACHINE_IDENTITY:'Execution user or home could not be verified.',MACHINE_ELEVATED:'Elevated SSH logins are unsupported. Use the Core user without elevation.',MACHINE_UNSUPPORTED:'Temporary or custom-via machines are unsupported.',RUNTIME_PREREQUISITE:'Node 20+ and the configured Core session are required.',RUNTIME_MISSING:'Install Trello on this machine.',RUNTIME_OUTDATED:'Update Trello on this machine.',RUNTIME_CONFLICT:'Trello runtime ownership conflict.',RUNTIME_BUSY:'Trello installer is busy.',RUNTIME_INVALID:'Trello runtime payload is invalid.',RUNTIME_PATH:'Add the user bin to PATH first.',CONFIG_UNKNOWN:'Setup outcome unknown. Check this machine before retrying.'};
const fail=code=>{throw Object.assign(Error(code),{code});};
function error(code,runtime){let messages={};try{messages=require(path.join(runtime,'lib/trello/errors.cjs')).messages;}catch{}const known=Object.hasOwn(safeMessages,code)||Object.hasOwn(messages,code);code=known?code:'INTERNAL';return {version:1,ok:false,error:{code,message:safeMessages[code]??messages[code]??'Setup failed. No retry was started.',outcome:code==='CONFIG_UNKNOWN'?'unknown':code==='WRITE_CHANGED'?'applied':code==='UNKNOWN_WRITE'?'unknown':'refused'}};}
function bindingFor(home){return {id:'local',session:'local',principal:installer.hash(Buffer.from(JSON.stringify([os.userInfo().username,os.userInfo().uid,os.homedir()]))),home:installer.hash(Buffer.from(JSON.stringify(path.resolve(home)))) };}
function sshTarget(target){
 if(typeof target!=='string'||!target||target.startsWith('-')||/[\s\0\r\n]/.test(target))fail('MACHINE_UNSUPPORTED');
 const port=/^(.*):(\d+)$/.exec(target);
 if(port&&(!port[1].includes(':')||/^([^@]+@)?\[.*\]$/.test(port[1]))){if(+port[2]<1||+port[2]>65535)fail('MACHINE_UNSUPPORTED');return ['-p',port[2],'--',port[1]];}
 return ['--',target];
}
function machineList(spawnSync=cp.spawnSync){
 const result=spawnSync(process.platform==='win32'?'hc.exe':'hc',['machine','ls','--json'],{encoding:'utf8',timeout:10000,maxBuffer:1048576,windowsHide:true});
 if(result.error||result.status!==0)fail('SSH_UNAVAILABLE');let list;try{list=JSON.parse(result.stdout).machines;}catch{fail('SSH_UNAVAILABLE');}
 if(!Array.isArray(list)||list.length>256)fail('SSH_UNAVAILABLE');return list;
}
function machineAt(name,expected,spawnSync=cp.spawnSync){
 if(typeof name!=='string'||!name||name.length>256||/[\u0000-\u001f\u007f]/.test(name))fail('MACHINE_IDENTITY');
 const matches=machineList(spawnSync).filter(m=>m.name===name);
 if(matches.length!==1)fail(matches.length?'MACHINE_IDENTITY':'MACHINE_CHANGED');
 const m=matches[0];if(m.temporary||m.via)fail('MACHINE_UNSUPPORTED');
 const session=m.session||'default';
 if(typeof m.id!=='string'||!/^[a-zA-Z0-9._:-]{1,256}$/.test(m.id)||!/^[a-zA-Z0-9_-]{1,64}$/.test(session))fail('MACHINE_IDENTITY');
 if(expected&&(expected.id!==m.id||expected.session!==session))fail('MACHINE_CHANGED');
 sshTarget(m.target);return {...m,session};
}
function commandFor(machine,binding,expected,runtime){
 const revision=installer.hash(Buffer.from(JSON.stringify(Object.entries(expected).sort(([a],[b])=>a.localeCompare(b)))));
 const config={version:1,machine:{id:machine.id,session:machine.session},binding:binding??null,expected:revision};
 const source=fs.readFileSync(path.join(runtime,'lib/private-actions/trello-bootstrap.cjs'),'utf8');
 const installSource=fs.readFileSync(path.join(runtime,'lib/private-actions/trello-install.cjs'),'utf8');
 const script=`const m={exports:{}};new Function('require','module','exports',${JSON.stringify(source)})(require,m,m.exports);m.exports.main(${JSON.stringify(config)},${JSON.stringify(installSource)});`;
 const encoded=zlib.brotliCompressSync(Buffer.from(script),{params:{[zlib.constants.BROTLI_PARAM_QUALITY]:11}}).toString('base64');
 const command=`node -e "eval(require('node:zlib').brotliDecompressSync(Buffer.from('${encoded}','base64')).toString())"`;
 if(command.length>COMMAND_LIMIT)fail('RUNTIME_INVALID');
 return command;
}
function validBinding(b){return b&&typeof b.id==='string'&&/^[a-zA-Z0-9._:-]{1,256}$/.test(b.id)&&typeof b.session==='string'&&/^[a-zA-Z0-9_-]{1,64}$/.test(b.session)&&/^[a-f0-9]{64}$/.test(b.principal)&&/^[a-f0-9]{64}$/.test(b.home)&&Object.keys(b).sort().join()==='home,id,principal,session';}
async function remote(home,destination,payload,register,{runtime=defaults(),spawn=cp.spawn,spawnSync=cp.spawnSync,timeout=55000,storeOptions,deadline=Infinity,isCurrent=()=>true}={}){
 const current=()=>performance.now()<deadline&&isCurrent();
 if(!current())fail('STALE');
 const machine=machineAt(destination.machine,destination.binding,spawnSync),p=installer.payload(runtime),expected=Object.fromEntries(Object.entries(p.files).map(([n,b])=>[n,installer.hash(Buffer.from(b,'base64'))]));
 const kind=payload.action==='runtime.install'?'install':payload.action==='runtime.probe'?'probe':'owner';
 if(!current())fail('STALE');
 if(kind!=='owner'&&Object.keys(payload).some(k=>k!=='action'))fail('INPUT');
 const command=commandFor(machine,destination.binding,expected,runtime);
 return new Promise(resolve=>{
  let child,buffer='',size=0,ready=false,sent=false,finished=false,readyBinding;
  const finish=result=>{if(finished)return;finished=true;clearTimeout(timer);child?.stdin.end();child?.kill();resolve(result);};
  const failed=()=>finish(error(sent&&kind!=='probe'&&payload.action!=='status'?'CONFIG_UNKNOWN':'SSH_UNAVAILABLE',runtime));
  const timer=setTimeout(failed,Math.max(1,Math.min(timeout,55000,deadline-performance.now())));
  try{
   child=spawn('ssh',['-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8','-o','ClearAllForwardings=yes','-o','ForwardAgent=no','-o','UpdateHostKeys=no','-o','PermitLocalCommand=no','-o','ControlMaster=no','-o','ControlPath=none','-o','ServerAliveInterval=5','-o','ServerAliveCountMax=2',...sshTarget(machine.target),command],{windowsHide:true,stdio:['pipe','pipe','pipe']});register(child);
   child.on('error',failed);child.on('close',failed);child.stdin.on('error',failed);child.stderr.resume();child.stdout.setEncoding('utf8');
   child.stdout.on('data',chunk=>{
    if(finished)return;size+=Buffer.byteLength(chunk);if(size>2097152)return failed();buffer+=chunk;
    let i;while((i=buffer.indexOf('\n'))>=0){const line=buffer.slice(0,i);buffer=buffer.slice(i+1);let frame;try{frame=JSON.parse(line);}catch{return failed();}
     if(frame?.version!==1)return failed();
     if(frame.phase==='ready'){
      if(ready||!validBinding(frame.binding)||frame.binding.id!==machine.id||frame.binding.session!==machine.session||destination.binding&&JSON.stringify(frame.binding)!==JSON.stringify(destination.binding))return finish(error('MACHINE_CHANGED',runtime));
      try{machineAt(destination.machine,frame.binding,spawnSync);}catch{return finish(error('MACHINE_CHANGED',runtime));}
      let initialControl;
      try { if(kind==='owner'&&payload.action==='save')initialControl=controller.initial(home,frame.binding,{runtime,storeOptions}); }
      catch(e){return finish(error(e.code,runtime));}
      if(!current())return finish(error('STALE',runtime));
      const remaining=Math.floor(Math.min(55000,deadline-performance.now()));if(remaining<1)return finish(error('STALE',runtime));
      ready=true;sent=true;readyBinding=frame.binding;
      child.stdin.write(JSON.stringify({version:1,kind,remaining,payload:kind==='install'?p:payload,...(initialControl?{initialControl}:{})})+'\n');
     }else if(frame.phase==='result'){
      const result=frame.result;
      if(!result||result.version!==1||typeof result.ok!=='boolean'||result.ok&&!ready)return failed();
      const encoded=JSON.stringify(result);if([payload.apiKey,payload.token].some(s=>typeof s==='string'&&s&&encoded.includes(s)))return failed();
      if(ready){try{machineAt(destination.machine,readyBinding,spawnSync);}catch{return finish(error(kind!=='probe'&&payload.action!=='status'?'CONFIG_UNKNOWN':'MACHINE_CHANGED',runtime));}}
      if(!current())return finish(error(sent&&kind!=='probe'&&payload.action!=='status'?'CONFIG_UNKNOWN':'STALE',runtime));
      if(!result.ok){const safe=error(result.error?.code,runtime);if(result.error?.outcome==='unknown')safe.error.outcome='unknown';if(Number.isSafeInteger(result.error?.retryAt))safe.error.retryAt=result.error.retryAt;return finish(safe);}
      if(!validBinding(result.data?.destination)||!['id','session','principal','home'].every(k=>result.data.destination[k]===readyBinding[k]))return failed();
      return finish(result);
     }else return failed();
    }
   });
  }catch{failed();}
 });
}
async function dispatch(home,destination,payload,register=()=>{},options={}){
 const runtime=options.runtime??defaults();
 let active=true;const children=new Set();register({kill(){active=false;for(const child of children)child.kill();}});
 const track=child=>children.add(child),isCurrent=()=>active&&performance.now()<(options.deadline??Infinity)&&options.isCurrent?.()!==false;
 const settings={runtime,storeOptions:{...options.storeOptions,beforeCommit(){if(!isCurrent())fail('STALE');options.storeOptions?.beforeCommit?.();}}};
 let result,globalAttempted=false;
 try{
  if(!isCurrent())fail('STALE');
  if(!destination||destination.machine!==null&&typeof destination.machine!=='string'||!payload||typeof payload!=='object'||Array.isArray(payload))fail('INPUT');
  if(payload.action==='discovery.all'){
   if(destination.machine!==null||typeof payload.enabled!=='boolean'||Object.keys(payload).some(k=>!['action','enabled'].includes(k)))fail('INPUT');
   const {record}=controller.read(home,settings),hosts=[{machine:null},...(record?.hosts??[]).filter(h=>h.machine!==null)];
   const pending=[];for(const host of hosts){if(!isCurrent())fail('STALE');const r=await dispatch(home,{machine:host.machine,...(host.binding?{binding:host.binding}:{})},{action:'discovery.prepare',enabled:payload.enabled},track,{...options,runtime,isCurrent});if(!r.ok)pending.push(host.machine??'This computer');}
   return {version:1,ok:true,data:{pending:[...new Set(pending)]}};
  }
  if(payload.action==='global.status')result={version:1,ok:true,data:{global:controller.status(home,settings)}};
  else if(payload.action==='global.apply'){
   if(destination.machine!==null||Object.keys(payload).some(k=>!['action','access','expected'].includes(k)))fail('INPUT');
   const global=await controller.apply(home,payload,{...settings,isCurrent,onApply:()=>{globalAttempted=true;},listMachines:()=>machineList(options.spawnSync),dispatch:(h,d,p)=>dispatch(h,d,p,track,{...options,runtime,isCurrent})});
   result={version:1,ok:true,data:{global}};
  }else if(destination.machine!==null)result=await remote(home,destination,payload,track,{...options,...settings,isCurrent});
  else{
   const binding=bindingFor(home);
   if(destination.binding&&JSON.stringify(destination.binding)!==JSON.stringify(binding))fail('MACHINE_CHANGED');
   if(payload.action==='discovery.prepare'){
    if(typeof payload.enabled!=='boolean'||Object.keys(payload).some(k=>!['action','enabled'].includes(k)))fail('INPUT');
    return {version:1,ok:true,data:{...require(path.join(runtime,'lib/trello/discovery.cjs')).prepare(home,{enabled:payload.enabled,isCurrent,...options.discoveryOptions}),destination:binding}};
   }
   if(payload.action==='runtime.probe')result={version:1,ok:true,data:{runtime:'ready',destination:binding}};
   else if(payload.action==='runtime.install')result={version:1,ok:true,data:{...await installer.install(home,installer.payload(runtime),{beforeCommit(){if(!isCurrent())fail('STALE');}}),destination:binding}};
   else{
    const initialControl=payload.action==='save'?controller.initial(home,binding,settings):undefined;
    result=await require(path.join(runtime,'lib/trello/owner.cjs')).execute(payload,{home,...options.ownerOptions,binding,initialControl,isCurrent});
    if(result.ok)result={...result,data:{...result.data,runtime:'ready',destination:binding}};
   }
  }
  if(payload.action==='discovery.prepare')return result;
  if(result.ok&&payload.action==='save'){
   try{controller.register(home,destination.machine,result.data.destination,result.data.control,settings);}catch{result=error('CONFIG_UNKNOWN',runtime);}
  }
 }catch(e){result=error(e.code,runtime);if(globalAttempted)result.error.outcome='unknown';}
 try{
  result.global=controller.status(home,settings);
  if(payload?.action==='status'&&result.ok&&result.data.configured&&(!result.data.managed||result.data.control?.access!==result.global.access||result.data.localWrites!==(result.global.access==='read-write')))
    result.global.pending=[...new Set([...result.global.pending,destination.machine??'This computer'])];
 }catch(e){if(result.ok)result=error(e.code,runtime);}
 return result;
}
if(require.main===module){
 const [mode,home,machine,enabled]=process.argv.slice(2);
 if(!['--status','--probe','--prepare','--discovery-all'].includes(mode)||!path.isAbsolute(home||'')||['--prepare','--discovery-all'].includes(mode)&&!['true','false'].includes(enabled))process.exitCode=2;
 else{let target;try{target=JSON.parse(machine??'null');}catch{target=undefined;}
  const payload=mode==='--prepare'||mode==='--discovery-all'?{action:mode==='--prepare'?'discovery.prepare':'discovery.all',enabled:enabled==='true'}:{action:mode==='--probe'?'runtime.probe':'status'};
  dispatch(home,{machine:target},payload).then(result=>{process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.ok?0:3;});}
}
module.exports={dispatch,remote,machineAt,sshTarget,commandFor,validBinding,safeMessages,bindingFor,COMMAND_LIMIT};
