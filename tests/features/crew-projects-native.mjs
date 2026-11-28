// Opt-in native tooltip proof. Production Settings renderer, synthetic rows, no Crew IO.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32'&&process.argv.includes('--run'),'Explicit Windows --run required');
const arg=(key,fallback)=>{const i=process.argv.indexOf(key);return i<0?fallback:process.argv[i+1];};
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1')),before=process.argv.includes('--before');
assert.ok(path.relative(project,output).startsWith('..'));assert.ok([1,1.3].includes(zoom));
const appBin=path.resolve(process.env.HERDR_APP_BIN),coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
assert.ok(fs.existsSync(appBin)&&fs.existsSync(coreBin));
fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,'kt-')),home=path.join(root,'a'),bin=path.join(root,'bin');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const env={...process.env,USERPROFILE:home,HOME:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HERDR_APP_ID:'herdr-disposable-kinds-tooltip',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of Object.keys(env))if(key.startsWith('HC_')||key.startsWith('CREW_')||['GH_TOKEN','GITHUB_TOKEN','NODE_OPTIONS'].includes(key))delete env[key];
env.HC_SESSION='test-kinds-tooltip-'+Date.now();
for(const dir of [home,bin,env.LOCALAPPDATA,env.APPDATA])fs.mkdirSync(dir,{recursive:true});
const priorPath=process.env.PATH;process.env.PATH=bin+path.delimiter+priorPath;
try{deploy(build().output,home,{repair:false,trelloBin:bin});}finally{process.env.PATH=priorPath;}
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).match(/\d+\.\d+\.\d+/)[0];
put('settings.json',{core:coreBin,zoom,telemetry:false});put('update-notes.json',{last_run:version,presented:[version]});
put('shared.json',{layout:'KindsFixture','frame.welcomed':'skipped','custom.plugins':{crew:{enabled:true},git:{enabled:false},files:{enabled:false},usage:{enabled:false}}});
put('layouts/KindsFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'body',type:'block',content:{mod:'custom-settings'}}]});
if(before)for(const [source,target]of [['src/ui/settings-kit.js','settings-kit.js'],['src/plugins/crew/plugin.js','plugins/crew/plugin.js']]){
  put('mods/custom-settings/'+target,execFileSync('git',['show','647129c:'+source],{cwd:project,encoding:'utf8'}));
}
const dir=path.join(home,'mods/custom-settings');fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
put('mods/custom-settings/host.js',`export * from './native-host.js';
export const spaces=()=>[],panes=()=>[],terminals=()=>[],machines=()=>[],focused=()=>null,props=()=>({});
export const exec=()=>{throw Error('Fixture forbids subprocesses');};export const hc=exec;export const run=exec;
`);
fs.renameSync(path.join(dir,'main.js'),path.join(dir,'settings-view.js'));
put('mods/custom-settings/main.js',`import Settings from './settings-view.js';import {div} from 'gpui-kit';import {h_flex,v_flex} from 'gpui-base';
import {initPlugins,pluginsPage} from './plugins-ui.js';import {PLUGINS} from './plugins.js';import {theme,checking,setShared} from './host.js';
export default class Fixture extends Settings{
 init(_p,cx){initPlugins(this,cx,'crew');this.pluginOpen={'crew-projects':true};const plugin=PLUGINS.find(p=>p.id==='crew');
 this.pluginChecks.crew={items:plugin.prerequisites.map(p=>({...p,status:'ready',usable:true,rows:p.id==='projects'?['herdr-app','crew','website'].map((id,i)=>({id,label:id,path:'D:/Git/'+id,detail:'D:/Git/'+id})):[]}))};
 if(!checking())cx.timer.after(600,cx=>{this.pluginFocus['crew-projects-hint'].focus();setShared('fixture.ready',true);cx.notify();});}
 heading(t,title,about){return v_flex().gap(8).child(div().text_size(20).font_medium().child(title)).when(Boolean(about),e=>e.child(div().text_size(12).text_color(t.muted).child(about)));}
 render(){const t=theme();return v_flex().size_full().bg(t.background).text_color(t.foreground).p(24).gap(24)
 .child(div().text_size(20).font_medium().child('Settings'))
 .child(h_flex().gap(32).child(v_flex().w(140).gap(18).text_size(13).text_color(t.muted).child('Look').child('Machines').child('Core').child('Spaces').child('Profiles').child('Terminals').child(div().text_color(t.foreground).child('Plugins')))
 .child(v_flex().flex_1().min_w(0).child(pluginsPage(this,t))))
 .child(div().text_size(12).text_color(t.muted).child('Disposable fixture · synthetic projects · no Crew commands'));}}
`);
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const result={version,zoom,before,home,pid:child.pid,session:env.HC_SESSION,executableSha256:createHash('sha256').update(fs.readFileSync(appBin)).digest('hex'),synthetic:true,interaction:'Production keyboard-focus tooltip; synthetic rows, not live Crew or pointer hit-testing'};
try{
 let ready=false;for(let i=0;i<160;i++){await sleep(150);assert.equal(child.exitCode,null,'Disposable app exited');try{if(JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.ready']){ready=true;break;}}catch{}}
 assert.ok(ready,'Native fixture ready');await sleep(1000);
 result.picture=path.join(output,`${before?'before':'after'}-${zoom===1?'100':'130'}.png`);app(['shot',result.picture]);
 result.status=JSON.parse(app(['status']));assert.equal(result.status.zoom,zoom);assert.deepEqual(result.status.errors,[]);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'app.log'),'utf8'),/not a function|ReferenceError|SyntaxError|could not be rendered/i);
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}result.stopped=child.exitCode!==null||child.signalCode!==null;
 try{result.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(error){result.coreStop={code:error.status,stderr:String(error.stderr)};}
 fs.closeSync(log);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(result,null,2));assert.ok(result.stopped);
}
console.log(JSON.stringify(result,null,2));
