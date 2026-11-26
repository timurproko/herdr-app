// Opt-in release-native presentation and background-update probe. Synthetic only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32'&&process.argv.includes('--run'));
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1')),stress=process.argv.includes('--stress');
assert.ok(path.relative(project,output).startsWith('..'));assert.ok([1,1.3].includes(zoom));
const appBin=path.resolve(process.env.HERDR_APP_BIN),core=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
const archive=path.resolve(appBin,'../../app.tar.gz'),sha=x=>createHash('sha256').update(x).digest('hex'),expected='e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1';
assert.equal(sha(fs.readFileSync(archive)),expected);
const original=execFileSync(path.join(process.env.SystemRoot,'System32/tar.exe'),['-xOf',archive,'herdr-app/herdr-app.exe'],{maxBuffer:100*1024*1024});
assert.equal(sha(original),sha(fs.readFileSync(appBin)));
fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,`loading-${zoom}-`)),home=path.join(root,'a'),control=path.join(root,'control');fs.mkdirSync(home);
const env={...process.env,HERDR_APP_HOME:home,USERPROFILE:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-git-loading-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-git-loading',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[key];fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});
const put=(file,value)=>{file=path.join(home,file);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value));};
deploy(build().output,home,{repair:false});
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
put('settings.json',{core,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'GitLoadingFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/GitLoadingFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'note',type:'block',content:{mod:'custom-proof-note'}},{id:'sidebar',type:'block',size:{px:460},content:{mod:'custom-changes'}}]});
put('mods/custom-proof-note/mod.json',{place:'none'});
put('mods/custom-proof-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View{init(p,cx){this.n=0;cx.timer.every(33,cx=>{this.n++;cx.notify();});}render(){return div().p(24).text_size(14).child('Synthetic Git proof · ${zoom*100}% · sibling updates '+this.n+' · no agents or network');}}`);
for(const file of ['host.js','plugins.js','main.js'])fs.renameSync(path.join(home,'mods/custom-changes',file),path.join(home,'mods/custom-changes','native-'+file));
put('mods/custom-changes/host.js',`export * from './native-host.js';export const spaces=()=>[],panes=()=>[],terminals=()=>[],agents=()=>[],machines=()=>[];export const exec=()=>{throw Error('No live IO');};export const hc=exec;export const run=exec;`);
put('mods/custom-changes/location.js',`export const location=()=>({cwd:'/fixture',on:null,terminal:'fixture'});export const namedPullNumber=()=>null;`);
put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';export const pluginPullContext=()=>({scope:'fixture',parent:'owner',stale:false,links:[]});export const pluginEvent=()=>{};`);
put('mods/custom-changes/main.js',`import Changes from './native-main.js';import {AggregatePulls} from './aggregate.js';import {pullRow} from './pulls.js';import {readTextFile,setShared} from './host.js';
export default class Fixture extends Changes{
init(p,cx){this.resetRepository();this.enrollmentFocus=cx.focus_handle();this.foldedRepositories=new Set();this.view='open';this.headerHovered=true;this.notices={sync(){},presentation(){},stop(){}};this.enrollmentPicker={render(){},stop(){}};this.agentLinks={refresh(){},related(){return null;}};for(const name of ['syncChecksFallback','syncWebhooks','syncTaskWebhooks','syncAgent','loadRelatedPull'])this[name]=()=>{};this.pullsDue=()=>false;this.aggregate=new AggregatePulls({shown:()=>true});this.phase='';this.updates=0;this.setPhase('coordinator-cold');
cx.timer.every(40,cx=>cx.spawn(async view=>{const phase=await readTextFile(${JSON.stringify(control)});if(phase!==this.phase){this.setPhase(phase);view.notify();}if(phase==='stress'&&this.updates<240){this.updates++;this.setRows(this.updates);if(this.updates%12===0)this.foldedRepositories=new Set(this.updates%24?['fixture/b']:[]);if(this.updates%40===0)this.view=this.view==='open'?'closed':'open';this.aggregate.fallbackBusy=this.updates%3!==0;view.notify();}setShared('fixture.loading',{phase:this.phase,updates:this.updates});}));}
shown(){return true;}syncAggregate(){return !this.phase.startsWith('ordinary');}
setRows(n=0){const a=this.aggregate;a.entries=new Map();for(let number=1;number<=4;number++){if(n&&n%7===0&&number===4)continue;const repo=number<=2?'fixture/a':number===3?'fixture/b':'fixture/c',key=repo+'#'+number;const pr={...pullRow({number,title:'Synthetic background PR '+number+' revision '+n,url:'https://github.com/'+repo+'/pull/'+number,state:this.view==='closed'?'MERGED':'OPEN',closedAt:new Date().toISOString(),author:{login:'fixture'},createdAt:'2026-11-26T10:00:00Z',body:'- [x] first task\\n- [ ] second task',labels:[{name:['Build','Review','Approved','fixture'][number-1],color:'840479'}],commits:{nodes:[{commit:{statusCheckRollup:{contexts:{nodes:[{__typename:'StatusContext',context:'synthetic',state:n%2?'PENDING':'SUCCESS'}]}}}}]}},'fixture'),repo,key};a.entries.set(key,{link:{repo,number,key,targets:[{terminal:'fixture'}]},pr,dirty:false});}a.rememberCounts();}
setPhase(phase){this.phase=phase;this.view=phase.endsWith('closed')?'closed':'open';this.foldedRepositories.clear();this.context=phase.startsWith('ordinary')?JSON.stringify(['/fixture',null]):'tasks:fixture';this.root='/fixture';this.repo={name:'fixture/a'};this.sectionEntry=true;this.error=null;this.pullError=null;this.loading=false;this.pullLoading=false;const a=this.aggregate;a.context={scope:'fixture',parent:'owner',stale:false,links:[]};a.published=null;a.lastCounts=null;a.pending.clear();a.readWake=null;a.returning=false;a.fallbackBusy=false;this.setRows();this.pulls={open:[...a.entries.values()].filter(e=>e.pr.repo==='fixture/a').map(e=>e.pr),closed:[]};this.counts={open:2,closed:0};if(this.view==='closed')this.pulls.closed=this.pulls.open;
if(phase.includes('cold')){if(phase.startsWith('ordinary')){this.pulls.open=null;this.pullLoading=true;this.foldedRepositories.add('fixture/a');}else{a.published=null;a.lastCounts=null;for(const e of a.entries.values()){e.pr=null;e.dirty=true;}a.context={...a.context,loading:true};if(phase.includes('failure')){a.entries.get('fixture/c#4').error={kind:'read',message:'fixture/c: Synthetic read failed; refresh to retry'};this.foldedRepositories.add('fixture/c');}}}
if(phase.includes('warm')||phase.includes('background')){if(phase.startsWith('ordinary'))this.pullLoading=true;else a.fallbackBusy=true;}
if(phase==='ordinary-failure')this.pullError='fixture/a: Synthetic read failed; refresh to retry';
}
render(cx){const start=Date.now(),tree=super.render(cx);console.log('GIT_LOADING_BUILD '+JSON.stringify({phase:this.phase,updates:this.updates,ms:Date.now()-start}));return tree;}}
`);
fs.writeFileSync(control,'coordinator-cold');const logfile=path.join(root,'app.log'),fd=fs.openSync(logfile,'w'),child=spawn(appBin,[],{env,stdio:['ignore',fd,fd]});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const receipt={version,zoom,home,pid:child.pid,session:env.HC_SESSION,archiveSha256:expected,executableSha256:sha(original),synthetic:true,frames:[]};
const snapshot=()=>{try{return JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.loading'];}catch{return null;}};
const capture=name=>{const file=path.join(root,name+'.png');app(['shot',file]);receipt.frames.push({name,file});};
try{
 for(let i=0;i<150;i++){await sleep(100);assert.equal(child.exitCode,null);if(snapshot())break;}assert.ok(snapshot());
 for(const phase of ['coordinator-cold','ordinary-cold','coordinator-cold-failure','coordinator-open','coordinator-closed','coordinator-warm','coordinator-background','ordinary-open','ordinary-closed','ordinary-warm','ordinary-background','ordinary-failure']){
 fs.writeFileSync(control,phase);for(let i=0;i<100&&snapshot()?.phase!==phase;i++)await sleep(50);assert.equal(snapshot()?.phase,phase);await sleep(200);capture(phase);
 if(phase.includes('cold')||phase.includes('background')){await sleep(350);capture(phase+'-phase2');}
 }
 if(stress){fs.writeFileSync(control,'stress');for(let i=0;i<400&&snapshot()?.updates<240;i++)await sleep(50);assert.equal(snapshot()?.updates,240);capture('stress-complete');receipt.stressUpdates=240;}
 receipt.status=JSON.parse(app(['status']));receipt.nativeLog=fs.readFileSync(logfile,'utf8');receipt.builds=[...receipt.nativeLog.matchAll(/GIT_LOADING_BUILD (.+)/g)].map(m=>JSON.parse(m[1]));delete receipt.nativeLog;
 assert.deepEqual(receipt.status.errors,[]);assert.doesNotMatch(fs.readFileSync(logfile,'utf8'),/render failed|previous render did not complete|child\(value\) expects|interrupted/,'Native fallback banners must not be hidden by a clean status.errors');
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(core,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop={code:e.status};}
 fs.closeSync(fd);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);assert.equal(JSON.parse(receipt.coreStop).stopped,true);
}
console.log(JSON.stringify({root,frames:receipt.frames.length,builds:receipt.builds?.length,stressUpdates:receipt.stressUpdates,stopped:receipt.stopped,coreStop:receipt.coreStop},null,2));
