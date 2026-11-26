'use strict';
// Only this fixed service resolves/runs SSH. Callers cannot supply commands or files.
const fs=require('node:fs'),path=require('node:path'),os=require('node:os'),cp=require('node:child_process'),zlib=require('node:zlib');
const installer=require('./trello-install.cjs');
const controller=require('./trello-controller.cjs');
const defaults=()=>path.resolve(__dirname,'../..');
const safeMessages={SSH_UNAVAILABLE:'SSH unavailable. Check keys, host trust and connection.',MACHINE_CHANGED:'Machine changed. Check again.',MACHINE_IDENTITY:'Execution user or home could not be verified.',MACHINE_UNSUPPORTED:'Temporary or custom-via machines are unsupported.',RUNTIME_PREREQUISITE:'Node 20+ and the configured Core session are required.',RUNTIME_MISSING:'Install Trello on this machine.',RUNTIME_OUTDATED:'Update Trello on this machine.',RUNTIME_CONFLICT:'Trello runtime ownership conflict.',RUNTIME_BUSY:'Trello installer is busy.',RUNTIME_INVALID:'Trello runtime payload is invalid.',RUNTIME_PATH:'Add the user bin to PATH first.',CONFIG_UNKNOWN:'Setup outcome unknown. Check this machine before retrying.'};
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
 const m=machineList(spawnSync).find(m=>m.name===name);
 if(!m)fail('MACHINE_CHANGED');if(m.temporary||m.via)fail('MACHINE_UNSUPPORTED');
 const session=m.session||'default';
 if(typeof m.id!=='string'||!m.id||m.id.length>256||!/^[a-zA-Z0-9_-]{1,64}$/.test(session))fail('MACHINE_IDENTITY');
 if(expected&&(expected.id!==m.id||expected.session!==session))fail('MACHINE_CHANGED');
 sshTarget(m.target);return {...m,session};
}
function commandFor(machine,binding,expected,runtime){
 const config={version:1,machine:{id:machine.id,session:machine.session},binding:binding??null,expected};
 const source=fs.readFileSync(path.join(runtime,'lib/private-actions/trello-bootstrap.cjs'),'utf8');
 const installSource=fs.readFileSync(path.join(runtime,'lib/private-actions/trello-install.cjs'),'utf8');
 const script=`const m={exports:{}};new Function('require','module','exports',${JSON.stringify(source)})(require,m,m.exports);m.exports.main(${JSON.stringify(config)},${JSON.stringify(installSource)});`;
 const encoded=zlib.gzipSync(Buffer.from(script)).toString('base64');
 return `node -e "eval(require('node:zlib').gunzipSync(Buffer.from('${encoded}','base64')).toString())"`;
}
function validBinding(b){return b&&typeof b.id==='string'&&typeof b.session==='string'&&/^[a-f0-9]{64}$/.test(b.principal)&&/^[a-f0-9]{64}$/.test(b.home)&&Object.keys(b).sort().join()==='home,id,principal,session';}
async function remote(home,destination,payload,register,{runtime=defaults(),spawn=cp.spawn,spawnSync=cp.spawnSync,timeout=55000,storeOptions}={}){
 const machine=machineAt(destination.machine,destination.binding,spawnSync),p=installer.payload(runtime),expected=Object.fromEntries(Object.entries(p.files).map(([n,b])=>[n,installer.hash(Buffer.from(b,'base64'))]));
 const kind=payload.action==='runtime.install'?'install':payload.action==='runtime.probe'?'probe':'owner';
 if(kind!=='owner'&&Object.keys(payload).some(k=>k!=='action'))fail('INPUT');
 return new Promise(resolve=>{
  let child,buffer='',size=0,ready=false,sent=false,finished=false;
  const finish=result=>{if(finished)return;finished=true;clearTimeout(timer);child?.stdin.end();child?.kill();resolve(result);};
  const failed=()=>finish(error(sent&&kind!=='probe'&&payload.action!=='status'?'CONFIG_UNKNOWN':'SSH_UNAVAILABLE',runtime));
  const timer=setTimeout(failed,Math.min(timeout,55000));
  try{
   child=spawn('ssh',['-T','-o','BatchMode=yes','-o','StrictHostKeyChecking=yes','-o','ConnectTimeout=8',...sshTarget(machine.target),commandFor(machine,destination.binding,expected,runtime)],{windowsHide:true,stdio:['pipe','pipe','pipe']});register(child);
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
      ready=true;sent=true;
      child.stdin.write(JSON.stringify({version:1,kind,payload:kind==='install'?p:payload,...(initialControl?{initialControl}:{})})+'\n');
     }else if(frame.phase==='result'){
      const result=frame.result;
      if(!result||result.version!==1||typeof result.ok!=='boolean'||result.ok&&!ready)return failed();
      const encoded=JSON.stringify(result);if([payload.apiKey,payload.token].some(s=>typeof s==='string'&&s&&encoded.includes(s)))return failed();
      if(!result.ok){const safe=error(result.error?.code,runtime);if(Number.isSafeInteger(result.error?.retryAt))safe.error.retryAt=result.error.retryAt;return finish(safe);}
      if(!validBinding(result.data?.destination)||result.data.destination.id!==machine.id||result.data.destination.session!==machine.session)return failed();
      return finish(result);
     }else return failed();
    }
   });
  }catch{failed();}
 });
}
async function dispatch(home,destination,payload,register=()=>{},options={}){
 const runtime=options.runtime??defaults(),settings={runtime,storeOptions:options.storeOptions};
 let active=true;const children=new Set();register({kill(){active=false;for(const child of children)child.kill();}});
 const track=child=>children.add(child),isCurrent=()=>active&&options.isCurrent?.()!==false;
 let result;
 try{
  if(!destination||destination.machine!==null&&typeof destination.machine!=='string'||!payload||typeof payload!=='object'||Array.isArray(payload))fail('INPUT');
  if(payload.action==='global.status')result={version:1,ok:true,data:{global:controller.status(home,settings)}};
  else if(payload.action==='global.apply'){
   if(destination.machine!==null||Object.keys(payload).some(k=>!['action','access','expected'].includes(k)))fail('INPUT');
   const global=await controller.apply(home,payload,{...settings,isCurrent,listMachines:()=>machineList(options.spawnSync),dispatch:(h,d,p)=>dispatch(h,d,p,track,{...options,runtime,isCurrent})});
   result={version:1,ok:true,data:{global}};
  }else if(destination.machine!==null)result=await remote(home,destination,payload,track,{...options,runtime});
  else{
   const binding=bindingFor(home);
   if(destination.binding&&JSON.stringify(destination.binding)!==JSON.stringify(binding))fail('MACHINE_CHANGED');
   if(payload.action==='runtime.probe')result={version:1,ok:true,data:{runtime:'ready',destination:binding}};
   else if(payload.action==='runtime.install')result={version:1,ok:true,data:{...await installer.install(home,installer.payload(runtime)),destination:binding}};
   else{
    const initialControl=payload.action==='save'?controller.initial(home,binding,settings):undefined;
    result=await require(path.join(runtime,'lib/trello/owner.cjs')).execute(payload,{home,...options.ownerOptions,binding,initialControl,isCurrent});
    if(result.ok)result={...result,data:{...result.data,runtime:'ready',destination:binding}};
   }
  }
  if(result.ok&&payload.action==='save'){
   try{controller.register(home,destination.machine,result.data.destination,result.data.control,settings);}catch{result=error('CONFIG_UNKNOWN',runtime);}
  }
 }catch(e){result=error(e.code,runtime);}
 try{result.global=controller.status(home,settings);}catch(e){if(result.ok)result=error(e.code,runtime);}
 return result;
}
if(require.main===module){
 const [mode,home,machine]=process.argv.slice(2);
 if(!['--status','--probe'].includes(mode)||!path.isAbsolute(home||''))process.exitCode=2;
 else{let target;try{target=JSON.parse(machine??'null');}catch{target=undefined;}
  dispatch(home,{machine:target},{action:mode==='--probe'?'runtime.probe':'status'}).then(result=>{process.stdout.write(JSON.stringify(result)+'\n');process.exitCode=result.ok?0:3;});}
}
module.exports={dispatch,remote,machineAt,sshTarget,commandFor,validBinding,safeMessages,bindingFor};
