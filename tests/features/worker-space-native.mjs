// Opt-in, checksum-pinned native row proof. Production Settings/registry/policy;
// all Crew commands, machine inventory and home modes are synthetic in memory.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32'&&process.argv.includes('--run'),'Explicit Windows --run required');
const arg=(key,fallback)=>{const at=process.argv.indexOf(key);return at<0?fallback:process.argv[at+1];};
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1'));assert.ok(path.relative(project,output).startsWith('..'));assert.ok([1,1.3].includes(zoom));
const appBin=path.resolve(process.env.HERDR_APP_BIN),binRoot=path.resolve(path.dirname(appBin),'..');
const hash=bytes=>createHash('sha256').update(bytes).digest('hex'),archive=path.join(binRoot,'app.tar.gz');
const release=JSON.parse(fs.readFileSync(path.join(binRoot,'release.json'))),expected=release.targets['windows-x86_64'].sha256;
assert.equal(expected,'e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1');assert.equal(hash(fs.readFileSync(archive)),expected);
const archivedExe=execFileSync(path.join(process.env.SystemRoot,'System32/tar.exe'),['-xOf',archive,'herdr-app/herdr-app.exe'],{maxBuffer:100*1024*1024});
assert.equal(hash(fs.readFileSync(appBin)),hash(archivedExe));const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,'ws-')),home=path.join(root,'a'),control=path.join(root,'control');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
const env={...process.env,USERPROFILE:home,HOME:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HERDR_APP_ID:'herdr-disposable-worker-space',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of Object.keys(env))if(key.startsWith('HC_')||key.startsWith('CREW_')||['GH_TOKEN','GITHUB_TOKEN','NODE_OPTIONS'].includes(key))delete env[key];env.HC_SESSION='test-worker-space-'+Date.now();
for(const dir of [home,env.LOCALAPPDATA,env.APPDATA])fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(control,'{}');
const priorPath=process.env.PATH,fixtureBin=path.join(root,'bin');
process.env.PATH=fixtureBin+path.delimiter+priorPath;
try{deploy(build().output,home,{repair:false,trelloBin:fixtureBin});}finally{process.env.PATH=priorPath;}
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json',{core:coreBin,zoom,telemetry:false});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'WorkerFixture','frame.welcomed':'skipped','custom.plugins':{crew:{enabled:true},git:{enabled:false},files:{enabled:false},usage:{enabled:false}},'fixture.modes':{local:'combined',pc2:'combined'}});
put('layouts/WorkerFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'body',type:'block',content:{mod:'custom-settings'}}]});
const dir=path.join(home,'mods/custom-settings');fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));fs.renameSync(path.join(dir,'main.js'),path.join(dir,'settings-view.js'));
put('mods/custom-settings/host.js',`export * from './native-host.js';import * as native from './native-host.js';
export const spaces=()=>[],panes=()=>[],terminals=()=>[],props=()=>({});
export const machines=()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}];
export const exec=()=>{throw Error('No real subprocess permitted');};export const run=()=>{throw Error('No coordinator/native-space control');};
const cap={capability:'worker-space-local-set',version:1,modes:['combined','per-project'],explicitHome:true};
function b64(text){const abc='ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';let out='';for(let i=0;i<text.length;i+=3){const a=text.charCodeAt(i),b=text.charCodeAt(i+1),c=text.charCodeAt(i+2),v=(a<<16)|((b||0)<<8)|(c||0);out+=abc[(v>>>18)&63]+abc[(v>>>12)&63]+(i+1<text.length?abc[(v>>>6)&63]:'=')+(i+2<text.length?abc[v&63]:'=');}return out;}
let held;export const releaseFixture=()=>{held?.();held=null;};
export async function hc(args){if(args[0]!=='exec')throw Error('Only fake Crew execution');const script=args.at(-1),machine=args.includes('--on')?'pc2':'local',home='C:/fixture/'+machine;let stdout,code=0;
if(script.includes('--capabilities --json'))stdout=JSON.stringify({identity:'fixture-'+machine,code:0,stdout:JSON.stringify(cap)});
else if(script.includes('status --json --view fleet')){if(native.shared('fixture.discoveryFail')===machine){code=2;stdout='';}else stdout=JSON.stringify({home});}
else if(script.includes('--set-local')){if(native.shared('fixture.hold'))await new Promise(resolve=>held=resolve);const mode=script.includes(\"--set-local 'per-project'\")?'per-project':'combined';if(machine==='pc2'&&native.shared('fixture.refuse')){code=2;stdout=JSON.stringify({...cap,ok:false,home,mode:null,changed:false,error:{code:'invalid-registry',message:'synthetic refusal'}});}else{const modes=native.shared('fixture.modes');native.setShared('fixture.modes',{...modes,[machine]:mode});stdout=JSON.stringify({...cap,ok:true,home,mode,changed:modes[machine]!==mode});}}
else if(script.includes('config worker-space'))stdout='worker-space: '+native.shared('fixture.modes')[machine];else throw Error('Unfaked command refused');
return {code:0,stdout:JSON.stringify({code,stdout:b64(stdout),stderr:'',timed_out:false})};}
`);
put('mods/custom-settings/main.js',`import Settings from './settings-view.js';import {spacesPage} from './spaces-ui.js';import {pluginEvent} from './plugins.js';import {v_flex,h_flex} from 'gpui-base';import {div} from 'gpui-kit';import {theme,checking,readTextFile,shared,setShared,releaseFixture} from './host.js';
export default class Fixture extends Settings {
init(_p,cx){this.action=0;if(checking())return;cx.timer.every(250,cx=>{pluginEvent('workspace.settings.refresh',{owner:this,cx});cx.spawn(async view=>{const command=JSON.parse(await readTextFile(${JSON.stringify(control)}));if(!command.id||command.id===this.action)return;this.action=command.id;if(command.refuse!==undefined)setShared('fixture.refuse',command.refuse);if(command.discoveryFail!==undefined)setShared('fixture.discoveryFail',command.discoveryFail);if(command.hold!==undefined)setShared('fixture.hold',command.hold);if(command.release)releaseFixture();if(command.flip)this.flip({},view);setShared('fixture.ack',command.id);view.notify();});});}
toggle(t,id,on,fn){if(id==='st-crew-separateProjectSpaces')this.flip=fn;return super.toggle(t,id,on,fn);}
render(){const t=theme();return v_flex().size_full().bg(t.background).text_color(t.foreground).p(32).gap(24).child(div().text_size(20).font_medium().child('Settings')).child(h_flex().gap(32).child(v_flex().w(140).gap(18).text_color(t.muted).child('Look').child('Machines').child('Core').child(div().text_color(t.foreground).child('Spaces')).child('Profiles').child('Terminals').child('Plugins')).child(v_flex().flex_1().min_w(0).child(spacesPage(this,t)))).child(div().text_size(12).text_color(t.muted).child('Disposable synthetic Crew homes · no real configuration or coordinator changed'));}}
`);
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const state=()=>JSON.parse(fs.readFileSync(path.join(home,'shared.json')));
const wait=async predicate=>{for(let i=0;i<240;i++){await sleep(100);assert.equal(child.exitCode,null,'Disposable desktop exited');try{if(predicate(state()))return;}catch{}}throw Error('Synthetic worker policy timed out');};
const result={version,zoom,home,pid:child.pid,session:env.HC_SESSION,archiveSha256:expected,executableSha256:hash(archivedExe),synthetic:true,interaction:'Production Settings callback and policy; synthetic lifecycle owner/transport, not physical pointer or live SSH proof',frames:[]};
let id=0;const command=async c=>{fs.writeFileSync(control,JSON.stringify({...c,id:++id}));await wait(s=>s['fixture.ack']===id);};
const settled=desired=>s=>Object.values(s['fixture.modes']??{}).every(m=>m===desired)&&s['custom.crew.worker-space']?.statuses?.length===0;
const capture=async name=>{await sleep(500);const file=path.join(root,name+'.png');app(['shot',file]);result.frames.push({name,file,intent:state()['custom.plugins'].crew.settings?.separateProjectSpaces??false,statuses:state()['custom.crew.worker-space'].statuses});assert.deepEqual(JSON.parse(app(['status'])).errors,[]);};
try {
 await wait(settled('combined'));await capture('off');await command({hold:true,flip:true});await wait(s=>s['custom.crew.worker-space']?.lock && s['custom.plugins'].crew.settings?.separateProjectSpaces===true);await capture('applying');await command({hold:false,release:true});await wait(settled('per-project'));await capture('on');
 await command({flip:true});await wait(settled('combined'));await command({refuse:true,flip:true});await wait(s=>s['custom.crew.worker-space']?.statuses?.some(x=>x.machine==='pc2'&&x.label==='Refused'));await capture('refused');
 await command({refuse:false,discoveryFail:'pc2'});await wait(s=>s['custom.crew.worker-space']?.hosts?.['"pc2"']?.discoveryFailure===true);await capture('discovery-failed');
 await command({discoveryFail:'',flip:true});await wait(settled('combined'));await capture('discovery-recovered');
 result.status=JSON.parse(app(['status']));assert.equal(result.status.zoom,zoom);result.board=state()['custom.crew.worker-space'];
}finally {
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}result.stopped=child.exitCode!==null||child.signalCode!==null;
 try{result.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(error){result.coreStop={code:error.status,stderr:String(error.stderr)};}
 fs.closeSync(log);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(result,null,2));assert.ok(result.stopped);
}
console.log(JSON.stringify(result,null,2));
