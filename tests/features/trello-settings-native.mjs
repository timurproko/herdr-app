// Explicit Windows disposable proof: production Settings/card/worker/bridge, fake
// credentials and injected Trello transport. Never reads the person's app home.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';import {deploy} from '../../tools/deploy.mjs';
import {temporaryMod} from '../../tools/temporary-mod.mjs';
if(process.platform!=='win32'||!process.argv.includes('--run'))throw Error('Explicit Windows opt-in required: --run --output <outside-checkout-directory>');
const at=process.argv.indexOf('--output');assert.ok(at>=0);
const output=path.resolve(process.argv[at+1]);assert.ok(path.relative(project,output).startsWith('..'));
fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(output,'n-')),home=path.join(root,'a'),control=path.join(root,'phase'),bin=path.join(root,'bin');
const appBin=process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe'),coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
assert.ok(fs.existsSync(appBin)&&fs.existsSync(coreBin),'Supply an existing, reviewed app binary; no native installation or build');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const session=`test-trello-${crypto.randomBytes(6).toString('hex')}`;
const env={...process.env,USERPROFILE:home,HOME:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HERDR_APP_ID:'herdr-disposable-trello',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of Object.keys(env))if(key.startsWith('HC_')||['GH_TOKEN','GITHUB_TOKEN','NODE_OPTIONS'].includes(key))delete env[key];env.HC_SESSION=session;
for(const dir of [home,bin,env.LOCALAPPDATA,env.APPDATA])fs.mkdirSync(dir,{recursive:true});
const oldPath=process.env.PATH;process.env.PATH=bin+path.delimiter+oldPath;
try {deploy(build().output,home,{repair:false,trelloBin:bin});}finally{process.env.PATH=oldPath;}
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).match(/\d+\.\d+\.\d+/)[0];
put('settings.json',{core:coreBin,telemetry:false,zoom:1});put('update-notes.json',{last_run:version,presented:[version]});
put('shared.json',{layout:'TrelloFixture','frame.welcomed':'skipped'});
put('layouts/TrelloFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'body',type:'block',content:{mod:'custom-trello-proof'}}]});
const dispose=temporaryMod(home,'custom-trello-proof');
const dir=path.join(home,'mods/custom-trello-proof');fs.cpSync(path.join(home,'mods/custom-settings'),dir,{recursive:true});
put('mods/custom-trello-proof/mod.json',{place:'none'});
fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));fs.renameSync(path.join(dir,'main.js'),path.join(dir,'settings-view.js'));
// Entire provider boundary is injected in the disposable worker, with no fetch fallback.
const owner=path.join(home,'.customizations/runtime/lib/trello/owner.cjs');
fs.writeFileSync(owner,`globalThis.fetch=async(url,options)=>{if(options.method!=='GET'||new URL(url).origin!=='https://api.trello.com')throw Error('Fixture forbids real network');const route=new URL(url).pathname;
 if(route==='/1/members/me')return Response.json({id:'${'a'.repeat(24)}',username:'fixture-owner',fullName:'Fixture Owner'});
 if(route==='/1/members/me/boards')return Response.json([{id:'${'a'.repeat(24)}',name:'Design board',closed:false},{id:'${'b'.repeat(24)}',name:'Engineering board',closed:false}]);throw Error('Fixture forbids unfaked route');};\n`+fs.readFileSync(owner,'utf8'));
put('mods/custom-trello-proof/host.js',`export * from './native-host.js';
import {exec as nativeExec,setShared as nativeSet,readTextFile as nativeRead} from './native-host.js';
const state={'custom.plugins':{trello:{enabled:true},git:{enabled:false},files:{enabled:false},usage:{enabled:false},crew:{enabled:false},firstmate:{enabled:false},'a1-colors':{enabled:false}}};
export const shared=k=>state[k];export const setShared=(k,v)=>{if(k==='proof.snapshot')return nativeSet(k,v);state[k]=v;};
export const props=()=>({section:'plugins',plugin:'trello'});export const spaces=()=>[];export const panes=()=>[];export const terminals=()=>[];export const focused=()=>null;
export const machines=()=>[{name:'fixture-ssh',connected:true}];export const knownAgents=async()=>[];
export const exec=(command,args,options)=>{if(command==='node'&&args[0].split(String.fromCharCode(92)).join('/').startsWith(${JSON.stringify(home.replaceAll('\\','/'))})&&(args.includes('--status')||args.includes('--start')))return nativeExec(command,args,options);throw Error('Fixture forbids unrelated exec');};
export const hc=()=>{throw Error('Fixture forbids Core reads');};export const run=()=>{throw Error('Fixture forbids commands');};
export const readTextFile=file=>file===${JSON.stringify(control)}?nativeRead(file):Promise.resolve(null);export const writeTextFile=()=>{throw Error('Fixture forbids writes');};
`);
// Test-only exports invoke the very same event handlers as the native controls.
fs.appendFileSync(path.join(dir,'plugins-ui.js'),'\nexport {submitActionForm,openListPicker,runListAction,runFixes,viewContext};\n');
put('mods/custom-trello-proof/main.js',`import Settings from './settings-view.js';
import {checking,readTextFile,setShared} from './host.js';import {pluginById} from './plugins.js';
import {submitActionForm,openListPicker,runListAction,runFixes,viewContext,followSettingsMachine,reloadPlugins} from './plugins-ui.js';
export default class Fixture extends Settings {
 init(p,cx){super.init(p,cx);this.pluginOpen['trello-requirements']=true;this.pluginOpen['trello-boards']=true;this.pluginOpen['trello-settings']=true;this.phase='missing';
 if(!checking())cx.timer.every(200,cx=>cx.spawn(async cx=>{const command=(await readTextFile(${JSON.stringify(control)}))?.trim();const plugin=pluginById('trello');
 const item=id=>this.pluginChecks.trello?.items?.find(i=>i.id===id);const busy=()=>this.pluginChecks.trello?.loading||this.pluginFixing||this.pluginForms['trello:local-setup']?.busy;
 if(command&&command!==this.command&&!busy()){this.command=command;this.phase='working';
 if(command==='entered'){const s=this.pluginForms['trello:local-setup'];s.fields.apiKey.set_value('FAKE_NATIVE_KEY_NOT_REAL');s.fields.token.set_value('FAKE_NATIVE_TOKEN_NOT_REAL');this.phase=command;}
 if(command==='saved'){const i=item('local-setup');submitActionForm(this,cx,plugin,i,i.form.actions.find(a=>a.id==='save'));}
 if(command==='picker')openListPicker(this,cx,plugin,item('boards'));
 if(command==='allowed'){const picker=this.listPicker;this.listPicker=null;runListAction(this,cx,plugin,item('boards'),context=>picker.add(context,['${'a'.repeat(24)}']));}
 if(command==='writable'){const def=plugin.settings[0],snapshot=def.live.state(viewContext(this,plugin));runFixes(this,cx,plugin,[{id:'live-access',fix:{requiresEnabled:true,run:context=>def.live.set(context,'read-write',snapshot)}}]);}
 if(command==='remote'){this.pluginOpen['trello-requirements']=true;this.settingsMachine='fixture-ssh';followSettingsMachine(this);reloadPlugins(this,cx,'trello');}}
 const s=item('local-setup');if(!busy()){
 if(this.command==='saved'&&s?.configured)this.phase='saved';if(this.command==='picker'&&this.listPicker&&!this.listPicker.loading)this.phase='picker';
 if(this.command==='allowed'&&s?.allowedBoards===1){this.pluginOpen['trello-requirements']=false;this.phase='allowed';}if(this.command==='writable'&&s?.localWrites)this.phase='writable';
 if(this.command==='remote'&&this.settingsMachine==='fixture-ssh')this.phase='remote';}
 setShared('proof.snapshot',{phase:this.phase,configured:s?.configured??false,allowed:s?.allowedBoards??0,writes:s?.localWrites??false});cx.notify();}));}
}
`);
fs.writeFileSync(control,'');
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const result={home,session,pid:child.pid,version,synthetic:true,pictures:[]};
const wait=async phase=>{for(let i=0;i<240;i++){await sleep(250);assert.equal(child.exitCode,null,'Disposable app exited');try{const data=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'))['proof.snapshot'];if(data?.phase===phase)return data;}catch{}}throw Error('Timed out waiting for '+phase);};
try {
 for(const phase of ['missing','entered','saved','picker','allowed','writable','remote']){
  if(phase!=='missing')fs.writeFileSync(control,phase);const state=await wait(phase);await sleep(500);
  const picture=path.join(output,phase+'.png');app(['shot',picture]);result.pictures.push({phase,picture,state});
  const status=JSON.parse(app(['status']));assert.deepEqual(status.errors,[],JSON.stringify(status.errors));
 }
 result.status=JSON.parse(app(['status']));
} finally {
 try {
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}result.stopped=child.exitCode!==null||child.signalCode!==null;
 assert.ok(session.startsWith('test-trello-'));
 try{execFileSync(coreBin,['server','stop'],{env,timeout:10000,stdio:'pipe'});result.coreStop='acknowledged';}catch(error){result.coreStop='stop requested; '+(error.status??'unavailable');}
 // Scope cleanup to the random disposable home, never other Node processes.
 const quoted=home.replaceAll("'","''");
 const cleanup=`$p=@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains('${quoted}')});foreach($i in $p){Stop-Process -Id $i.ProcessId -Force -ErrorAction SilentlyContinue};$left=@(Get-CimInstance Win32_Process -Filter \"Name='node.exe'\" | Where-Object {$_.CommandLine -and $_.CommandLine.Contains('${quoted}')});Write-Output $left.Count`;
 result.remainingOwnedWorkers=Number(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',cleanup],{encoding:'utf8',timeout:15000} ).trim());
 assert.equal(result.remainingOwnedWorkers,0,'No owned bridge/worker may survive the proof');
 fs.closeSync(log);result.log=path.join(root,'app.log');fs.writeFileSync(path.join(output,'native-proof.json'),JSON.stringify(result,null,2));assert.equal(result.stopped,true);
 } finally {dispose();}
}
console.log(JSON.stringify(result,null,2));
