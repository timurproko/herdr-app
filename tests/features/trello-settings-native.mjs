// Explicit disposable native proof. Provider, SSH and machine inventory are injected;
// no production home, real remote machine or real Trello request is used.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';import {deploy} from '../../tools/deploy.mjs';import {temporaryMod} from '../../tools/temporary-mod.mjs';
if(process.platform!=='win32'||!process.argv.includes('--run'))throw Error('Explicit Windows opt-in required: --run --output <outside-checkout-directory>');
const at=process.argv.indexOf('--output');assert.ok(at>=0);const output=path.resolve(process.argv[at+1]);assert.ok(path.relative(project,output).startsWith('..'));fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(output,'n-')),home=path.join(root,'a'),control=path.join(root,'phase'),bin=path.join(root,'bin'),remoteHome=path.join(root,'r'),remoteBin=path.join(root,'rbin');
const appBin=process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe'),coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
assert.ok(fs.existsSync(appBin)&&fs.existsSync(coreBin),'Supply an existing reviewed app binary; no native install/build');assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const session=`test-trello-${crypto.randomBytes(6).toString('hex')}`;
const env={...process.env,USERPROFILE:home,HOME:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HERDR_APP_ID:'herdr-disposable-trello',HERDR_RELEASES_URL:'http://127.0.0.1:1',PATH:bin+path.delimiter+process.env.PATH};
for(const key of Object.keys(env))if(key.startsWith('HC_')||['GH_TOKEN','GITHUB_TOKEN','NODE_OPTIONS'].includes(key))delete env[key];env.HC_SESSION=session;
for(const dir of [home,bin,remoteHome,remoteBin,env.LOCALAPPDATA,env.APPDATA])fs.mkdirSync(dir,{recursive:true});
const oldPath=process.env.PATH;process.env.PATH=env.PATH;try{deploy(build().output,home,{repair:false,trelloBin:bin});}finally{process.env.PATH=oldPath;}
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).match(/\d+\.\d+\.\d+/)[0];
put('settings.json',{core:coreBin,telemetry:false,zoom:1});put('update-notes.json',{last_run:version,presented:[version]});
put('shared.json',{layout:'TrelloFixture','frame.welcomed':'skipped','custom.plugins':{trello:{enabled:true,settings:{access:'read-only'}}}});
put('layouts/TrelloFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'body',type:'block',content:{mod:'custom-trello-proof'}}]});
const dispose=temporaryMod(home,'custom-trello-proof'),dir=path.join(home,'mods/custom-trello-proof');fs.cpSync(path.join(home,'mods/custom-settings'),dir,{recursive:true});put('mods/custom-trello-proof/mod.json',{place:'none'});
fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));fs.renameSync(path.join(dir,'main.js'),path.join(dir,'settings-view.js'));
const runtime=path.join(home,'.customizations/runtime'),owner=path.join(runtime,'lib/trello/owner.cjs');
fs.writeFileSync(owner,`globalThis.fetch=async(url,options)=>{if(options.method!=='GET'||new URL(url).origin!=='https://api.trello.com')throw Error('Fixture forbids real network');const u=new URL(url),route=u.pathname;
if(route==='/1/members/me')return Response.json({id:'${'a'.repeat(24)}',username:'fixture-owner',fullName:u.searchParams.get('token').includes('REMOTE')?'Remote Owner':'Fixture Owner'});
if(route==='/1/members/me/boards')return Response.json([{id:'${'a'.repeat(24)}',name:'Design board',closed:false},{id:'${'b'.repeat(24)}',name:'Engineering board',closed:false},{id:'${'c'.repeat(24)}',name:'Archive board',closed:true}]);throw Error('Fixture forbids unfaked route');};\n`+fs.readFileSync(owner,'utf8'));
// Preserve the production dispatcher verbatim and wrap only its injected IO options.
const transportFile=path.join(runtime,'lib/private-actions/trello-transport.cjs');fs.renameSync(transportFile,path.join(runtime,'lib/private-actions/trello-transport-real.cjs'));
fs.writeFileSync(transportFile,`const fs=require('node:fs'),path=require('node:path'),{EventEmitter}=require('node:events'),{PassThrough}=require('node:stream');
const service=require('./trello-transport-real.cjs'),installer=require('./trello-install.cjs');
const runtime=${JSON.stringify(runtime)},remoteHome=${JSON.stringify(remoteHome)},remoteBin=${JSON.stringify(remoteBin)},phaseFile=${JSON.stringify(control)};
const machine={name:'fixture-ssh',id:'fake-core',session:'fixture',target:'fixture-ssh',state:'connected'};
const binding=()=>({...service.bindingFor(remoteHome),id:machine.id,session:machine.session});
const remoteState=()=>installer.probe(path.join(remoteHome,'.customizations/runtime'),Object.fromEntries(Object.entries(installer.payload(runtime).files).map(([n,b])=>[n,installer.hash(Buffer.from(b,'base64'))]))).runtime;
const options={runtime,spawnSync:()=>({status:0,stdout:JSON.stringify({machines:[machine]})}),spawn:(program,args)=>{
 if(program!=='ssh')throw Error('Fixture forbids non-SSH spawn');
 const child=new EventEmitter();let alive=true;child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.stdout.on('error',()=>{});child.kill=()=>{alive=false;child.stdin.destroy();child.stdout.destroy();};
 child.stdin.on('data',async bytes=>{let result;try{const request=JSON.parse(bytes);
 if(request.kind==='probe')result={version:1,ok:true,data:{runtime:remoteState(),destination:binding()}};
 else if(request.kind==='install')result={version:1,ok:true,data:{...await installer.install(remoteHome,request.payload,{bin:remoteBin,envPath:remoteBin}),destination:binding()}};
 else if(remoteState()!=='ready')result={version:1,ok:false,error:{code:'RUNTIME_MISSING'}};
 else{const owner=require(path.join(remoteHome,'.customizations/runtime/lib/trello/owner.cjs'));result=await owner.execute(request.payload,{home:remoteHome,binding:binding(),initialControl:request.initialControl,isCurrent:()=>alive});if(result.ok)result.data.destination=binding();}
 }catch{result={version:1,ok:false,error:{code:'INTERNAL'}};}if(alive)child.stdout.write(JSON.stringify({version:1,phase:'result',result})+'\\n');});
 queueMicrotask(()=>child.stdout.write(JSON.stringify({version:1,phase:'ready',binding:binding(),runtime:remoteState()})+'\\n'));return child;
}};
module.exports={...service,dispatch:async(home,destination,payload,register)=>{
 const phase=fs.readFileSync(phaseFile,'utf8').trim();if(phase==='storage-error'&&payload.action==='status'){const r=await service.dispatch(home,{machine:null},{action:'global.status'},register,options);return {version:1,ok:false,error:{code:'STORE_PERMISSION_CHECK'},global:r.data.global};}
 return service.dispatch(home,destination,payload,register,options);
}};
if(require.main===module){const [mode,home,machine]=process.argv.slice(2);module.exports.dispatch(home,{machine:JSON.parse(machine??'null')},{action:mode==='--probe'?'runtime.probe':'status'},()=>{}).then(r=>{console.log(JSON.stringify(r));process.exitCode=r.ok?0:3;});}
`);
put('mods/custom-trello-proof/host.js',`export * from './native-host.js';
import {exec as nativeExec,setShared as nativeSet,readTextFile as nativeRead} from './native-host.js';
const state={'custom.plugins':{trello:{enabled:true},git:{enabled:false},files:{enabled:false},usage:{enabled:false},crew:{enabled:false},firstmate:{enabled:false},'a1-colors':{enabled:false}}};
export const shared=k=>state[k];export const setShared=(k,v)=>{if(k==='proof.snapshot')return nativeSet(k,v);state[k]=v;};
export const props=()=>({section:'plugins',plugin:'trello'});export const spaces=()=>[];export const panes=()=>[];export const terminals=()=>[];export const focused=()=>null;
export const machines=()=>[{name:'fixture-ssh',connected:true}];export const knownAgents=async()=>[];
export const exec=(command,args,options)=>{if(command==='node'&&args[0].split(String.fromCharCode(92)).join('/').startsWith(${JSON.stringify(home.split(path.sep).join('/'))})&&(args.includes('--status')||args.includes('--probe')||args.includes('--start')))return nativeExec(command,args,options);throw Error('Fixture forbids unrelated exec');};
export const hc=()=>{throw Error('Fixture forbids Core reads');};export const run=()=>{throw Error('Fixture forbids commands');};
export const readTextFile=file=>file===${JSON.stringify(control)}?nativeRead(file):Promise.resolve(null);export const writeTextFile=()=>{throw Error('Fixture forbids writes');};
`);
fs.appendFileSync(path.join(dir,'plugins-ui.js'),'\nexport {submitActionForm,openListPicker,runListAction,runFixes,viewContext};\n');
put('mods/custom-trello-proof/main.js',`import Settings from './settings-view.js';import {checking,readTextFile,setShared} from './host.js';import {pluginById} from './plugins.js';
import {submitActionForm,openListPicker,runListAction,runFixes,viewContext,followSettingsMachine,reloadPlugins} from './plugins-ui.js';
export default class Fixture extends Settings {
 init(p,cx){super.init(p,cx);this.pluginOpen['trello-requirements']=true;this.pluginOpen['trello-boards']=true;this.pluginOpen['trello-settings']=true;this.phase='missing';
 if(!checking())cx.timer.every(200,cx=>cx.spawn(async cx=>{const command=(await readTextFile(${JSON.stringify(control)}))?.trim(),plugin=pluginById('trello');
 const item=id=>this.pluginChecks.trello?.items?.find(i=>i.id===id),busy=()=>this.pluginChecks.trello?.loading||this.pluginFixing||this.pluginForms['trello:local-setup']?.busy;
 const access=()=>plugin.settings[0].live.state(viewContext(this,plugin));
 if(command&&command!==this.command&&!busy()){this.command=command;this.phase='working';
 if(command==='entered'||command==='remote-entered'){const s=this.pluginForms['trello:local-setup'];s.fields.apiKey.set_value(command==='entered'?'FAKE_NATIVE_KEY_NOT_REAL':'FAKE_NATIVE_REMOTE_KEY_NOT_REAL');s.fields.token.set_value(command==='entered'?'FAKE_NATIVE_TOKEN_NOT_REAL':'FAKE_NATIVE_REMOTE_TOKEN_NOT_REAL');this.phase=command;}
 if(command==='saved'||command==='remote-saved'){const i=item('local-setup');submitActionForm(this,cx,plugin,i,i.form.actions.find(a=>a.id==='save'));}
 if(command==='picker-active'||command==='remote-picker')openListPicker(this,cx,plugin,item('boards'));
 if(command==='picker-inactive'){this.listPicker.tab='inactive';this.phase=command;}
 if(command==='picker-search'){this.pluginSearches['trello:boards'].set_value('Engineering');this.phase=command;}
 if(command==='allowed'||command==='remote-allowed'){const picker=this.listPicker;this.listPicker=null;runListAction(this,cx,plugin,item('boards'),context=>picker.add(context,['${'a'.repeat(24)}']));}
 if(command==='writable'||command==='remote-writable'){const def=plugin.settings[0],snapshot=access();runFixes(this,cx,plugin,[{id:'live-access',fix:{requiresEnabled:true,run:context=>def.live.set(context,'read-write',snapshot)}}]);}
 if(command==='remote-missing'){this.settingsMachine='fixture-ssh';followSettingsMachine(this);reloadPlugins(this,cx,'trello');}
 if(command==='remote-installed')runFixes(this,cx,plugin,[item('runtime')]);
 if(command==='remove-confirm'){const i=item('local-setup'),context=viewContext(this,plugin);runFixes(this,cx,plugin,[{...i,fix:{requiresEnabled:true,confirm:i.saved.confirm(context,i),run:context=>i.saved.remove(context,i)}}]);this.phase=command;}
 if(command==='storage-error'){this.pluginConfirm=null;reloadPlugins(this,cx,'trello');}}
 const s=item('local-setup');if(!busy()){
 if((this.command==='saved'||this.command==='remote-saved')&&s?.configured){this.pluginRowHover='st-plugin-saved-trello-local-setup-row-0';this.phase=this.command;}
 if((this.command==='picker-active'||this.command==='remote-picker')&&this.listPicker&&!this.listPicker.loading)this.phase=this.command;
 if((this.command==='allowed'||this.command==='remote-allowed')&&s?.allowedBoards===1){this.pluginRowHover='st-plugin-list-trello-boards-row-0';this.phase=this.command;}
 if((this.command==='writable'||this.command==='remote-writable')&&s?.localWrites)this.phase=this.command;
 if(this.command==='remote-missing'&&this.settingsMachine==='fixture-ssh'&&item('runtime')?.statusLabel==='Not installed')this.phase=this.command;
 if(this.command==='remote-installed'&&item('runtime')?.status==='ready'&&s?.configured===false)this.phase=this.command;
 if(this.command==='storage-error'&&s?.problem==='STORE_PERMISSION_CHECK')this.phase=this.command;}
 setShared('proof.snapshot',{phase:this.phase,machine:this.settingsMachine??null,configured:s?.configured??false,allowed:s?.allowedBoards??0,writes:s?.localWrites??false,access:access()?.value,pending:access()?.statusLabel});cx.notify();}));}
}
`);
fs.writeFileSync(control,'');
for(const file of [path.join(dir,'host.js'),path.join(dir,'main.js')]){
 try{execFileSync(process.execPath,['--check','--input-type=module'],{input:fs.readFileSync(file),stdio:['pipe','pipe','pipe']});}catch{throw Error('Generated native fixture source failed syntax check: '+path.basename(file));}
}
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const result={home,remoteHome,session,pid:child.pid,version,synthetic:true,interaction:'Production native controls/handlers; injected provider, SSH and inventory; not a mouse hit-test or real remote acceptance',pictures:[]};
const wait=async phase=>{for(let i=0;i<480;i++){await sleep(250);assert.equal(child.exitCode,null,'Disposable app exited');try{const data=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'))['proof.snapshot'];if(data?.phase===phase)return data;}catch{}}throw Error('Timed out waiting for '+phase);};
try{
 for(const phase of ['missing','entered','saved','picker-active','picker-inactive','picker-search','allowed','writable','remote-missing','remote-installed','remote-entered','remote-saved','remote-picker','remote-allowed','remote-writable','remove-confirm','storage-error']){
  if(phase!=='missing')fs.writeFileSync(control,phase);const state=await wait(phase);await sleep(500);const picture=path.join(output,phase+'.png');app(['shot',picture]);result.pictures.push({phase,picture,state});const status=JSON.parse(app(['status']));assert.deepEqual(status.errors,[],JSON.stringify(status.errors));
 }
 result.status=JSON.parse(app(['status']));
}finally{
 try{
  try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}result.stopped=child.exitCode!==null||child.signalCode!==null;
  assert.ok(session.startsWith('test-trello-'));try{execFileSync(coreBin,['server','stop'],{env,timeout:10000,stdio:'pipe'});result.coreStop='acknowledged';}catch(error){result.coreStop='stop requested; '+(error.status??'unavailable');}
  const quoted=home.replaceAll("'","''"),cleanup=`$p=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains('${quoted}')});foreach($i in $p){Stop-Process -Id $i.ProcessId -Force -ErrorAction SilentlyContinue};$left=@(Get-CimInstance Win32_Process -Filter "Name='node.exe'" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains('${quoted}')});Write-Output $left.Count`;
  const psEnv=Object.fromEntries(Object.entries(process.env).filter(([k])=>k.toLowerCase()!=='psmodulepath'));
  result.remainingOwnedWorkers=Number(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',cleanup],{env:psEnv,encoding:'utf8',timeout:15000}).trim());assert.equal(result.remainingOwnedWorkers,0);
  fs.closeSync(log);result.log=path.join(root,'app.log');fs.writeFileSync(path.join(output,'native-proof.json'),JSON.stringify(result,null,2));assert.equal(result.stopped,true);
 }finally{dispose();}
}
console.log(JSON.stringify(result,null,2));
