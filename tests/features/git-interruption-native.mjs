// Opt-in native 50ms watchdog proof. Synthetic facts; no accounts or terminals.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32'&&process.argv.includes('--run'));
const arg=(key,fallback)=>{const at=process.argv.indexOf(key);return at<0?fallback:process.argv[at+1];};
const worker=process.argv.includes('--worker-cold');
const output=path.resolve(arg('--output')),baseline=arg('--baseline',null),appBin=path.resolve(process.env.HERDR_APP_BIN),core=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
assert.ok(path.relative(project,output).startsWith('..'));fs.mkdirSync(output,{recursive:true});
const archive=path.resolve(appBin,'../../app.tar.gz'),sha=x=>createHash('sha256').update(x).digest('hex'),expected='e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1';
assert.equal(sha(fs.readFileSync(archive)),expected);const original=execFileSync(path.join(process.env.SystemRoot,'System32/tar.exe'),['-xOf',archive,'herdr-app/herdr-app.exe'],{maxBuffer:100*1024*1024});assert.equal(sha(original),sha(fs.readFileSync(appBin)));
const root=fs.mkdtempSync(path.join(output,'irq-')),home=path.join(root,'a'),control=path.join(root,'control');fs.mkdirSync(home);
const env={...process.env,HERDR_APP_HOME:home,USERPROFILE:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-interrupt-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-interrupt',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[key];fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});
const put=(name,text)=>{const file=path.join(home,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof text==='string'?text:JSON.stringify(text));};
const {output:built}=build();deploy(built,home,{repair:false});
if(baseline)put('mods/custom-changes/main.js',execFileSync('git',['show',`${baseline}:src/plugins/git/mod/main.js`],{encoding:'utf8'}));
put('settings.json',{core,telemetry:false,zoom:1});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'InterruptFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/InterruptFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'git',type:'block',content:{mod:'custom-changes'}}]});
fs.renameSync(path.join(home,'mods/custom-changes/host.js'),path.join(home,'mods/custom-changes/native-host.js'));
put('mods/custom-changes/host.js',`export * from './native-host.js';export const exec=()=>{throw Error('No IO');};export const hc=exec;export const run=exec;`);
put('mods/custom-changes/location.js',`export const location=()=>({space:'coordinator',terminal:'fixture',cwd:'/fixture',on:null});export const namedPullNumber=()=>null;`);
fs.renameSync(path.join(home,'mods/custom-changes/plugins.js'),path.join(home,'mods/custom-changes/native-plugins.js'));
put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';export const pluginPullContext=()=>({scope:'fixture',parent:'coordinator',stale:false,links:[]});export const pluginEvent=()=>{};`);
fs.renameSync(path.join(home,'mods/custom-changes/main.js'),path.join(home,'mods/custom-changes/changes-view.js'));
put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {AggregatePulls} from './aggregate.js';import {pullRow} from './pulls.js';import {readTextFile} from './host.js';
export default class Fixture extends Changes{
 init(_p,cx){this.resetRepository();this.phase='normal';this.view='open';this.context='tasks:fixture';this.foldedRepositories=new Set();this.enrollmentFocus=cx.focus_handle();this.notices={sync(){},presentation(){},stop(){}};this.enrollmentPicker={render(){return null;},stop(){}};this.agentLinks={refresh(){},related(){return null;}};this.syncChecksFallback=()=>{};this.syncAggregate=()=>true;this.scheduleTaskLayout=()=>{};this.applyTaskAnchor=()=>{};
 this.aggregate=new AggregatePulls({shown:()=>true});this.aggregate.context={scope:'fixture',parent:'coordinator',stale:false,links:[]};
 this.rows=[1,2,3].map(number=>({...pullRow({number,state:'OPEN',title:'Published PR '+number,url:'https://github.com/fixture/repo/pull/'+number,labels:[{name:['','Build','Review','Approved'][number],color:'840479'}]}),key:'fixture/repo#'+number,repo:'fixture/repo'}));this.publish(this.rows);
 cx.timer.every(100,cx=>cx.spawn(async view=>{const phase=await readTextFile(${JSON.stringify(control)});if(phase===this.phase)return;this.phase=phase;this.publish(this.rows.filter(pr=>pr.number!==3));view.notify();}));}
 publish(rows){this.aggregate.entries=new Map(rows.map(pr=>[pr.key,{pr,dirty:false,link:{repo:'fixture/repo',key:pr.key,targets:[{terminal:'fixture'}]}}]));this.aggregate.rememberCounts();}
 shown(){return true;}
 renderPullRow(t,pr,ghost){if(this.phase==='interrupt'&&!this.didInterrupt&&!ghost){this.didInterrupt=true;console.log('FORCED_NATIVE_INTERRUPT_AFTER_ROW_REMOVAL');while(true){}}return super.renderPullRow(t,pr,ghost);}
}`);
if(worker){
 put('mods/custom-changes/location.js',`export const location=()=>({space:'worker',terminal:'builder',cwd:'/worker',on:null,app:'codex'});export const namedPullNumber=()=>null;`);
 put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';export const pluginPullContext=()=>null;export const pluginEvent=()=>{};`);
 put('mods/custom-changes/host.js',`export * from './native-host.js';export const spaces=()=>[],panes=()=>[],agents=()=>[],terminals=()=>[];export const watchFolder=()=>({stop(){}});export const run=()=>{throw Error('No native mutation');};export const hc=()=>{throw Error('No Core reads');};export async function exec(cmd,args){console.log('WORKER_IO '+JSON.stringify([cmd,args]));if(cmd==='git')return {code:0,stdout:args[0]==='rev-parse'?'/worker':args[0]==='symbolic-ref'?'fix/spaces-sidebar-crew-label':''};if(cmd!=='gh'&&(cmd!=='node'||!args[1]?.includes('GH_REPO:repo')))throw Error('No real subprocess');const argv=cmd==='gh'?args:JSON.parse(args[3]);if(argv[0]==='repo')return {code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo'})};const pr={number:94,title:'Draft worker independently loaded',url:'https://github.com/owner/repo/pull/94',state:'OPEN',isDraft:true,headRefName:'fix/spaces-sidebar-crew-label',labels:[],commits:{nodes:[]}};return {code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:0},pullRequests:{nodes:[pr],pageInfo:{endCursor:null,hasNextPage:false}}}}})};}`);
 put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {AggregatePulls} from './aggregate.js';import {readTextFile,shared,setShared} from './host.js';export default class Fixture extends Changes{
 init(_p,cx){this.foldedRepositories=new Set();this.view='open';this.enrollmentFocus=cx.focus_handle();this.notices={sync(){},presentation(){},stop(){}};this.webhooks={sync(){},stop(){}};this.enrollmentPicker={render(){},stop(){}};this.agentLinks={cachedRepository:()=> 'owner/repo',pullNumber:()=>94,related:()=>null,refresh(){}};this.syncChecksFallback=()=>{};this.aggregate=new AggregatePulls({shown:()=>true});this.aggregate.sync(cx);this.seed('none');cx.timer.every(100,cx=>cx.spawn(async view=>{const seed=await readTextFile(${JSON.stringify(control)});if(seed!==this.phase){this.seed(seed);view.notify();}const snap={seed:this.phase,loading:this.loading,pullLoading:this.pullLoading,counts:this.counts,rows:this.pulls.open,active:this.agentPull};if(JSON.stringify(snap)!==JSON.stringify(shared('fixture.worker')))setShared('fixture.worker',snap);}));}
 seed(seed){this.resetRepository();this.context=null;this.phase=seed;this.repositoryGeneration=this.aggregate.presentationGeneration;this.aggregate.presentations.clear();if(seed!=='none')this.aggregate.presentations.set(JSON.stringify(['repository',null,'owner/repo']),{repository:true,repo:{name:'owner/repo'},root:'/repo',seed:seed==='unverified',seedTabs:{open:true,closed:true},source:{parent:'coordinator',scope:'home',machine:null},pulls:{open:null,closed:null},counts:{open:0,closed:0},pullsAt:{open:123,closed:123}});}
 shown(){return true;}syncTaskWebhooks(){}syncWebhooks(){}
 }`);
}
fs.writeFileSync(control,worker?'none':'normal');const logfile=path.join(root,'app.log'),fd=fs.openSync(logfile,'w'),child=spawn(appBin,[],{env,stdio:['ignore',fd,fd]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const receipt={baseline,worker,home,pid:child.pid,session:env.HC_SESSION,archiveSha256:expected,synthetic:true,forcedLoop:'test-only infinite loop stopped by the native watchdog',shippingRetryDelayMs:64,frames:[]};
const capture=name=>{const file=path.join(root,name+'.png');app(['shot',file]);receipt.frames.push(file);};
try {
 for(let i=0;i<150;i++){await sleep(100);assert.equal(child.exitCode,null);try{if(JSON.parse(app(['status'])).layout==='InterruptFixture')break;}catch{}}
 if(worker){
  receipt.seeds=[];for(const seed of ['none','empty','unverified']){fs.writeFileSync(control,seed);let snap;for(let i=0;i<150;i++){await sleep(100);try{snap=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'))['fixture.worker'];if(snap?.seed===seed&&!snap.loading&&!snap.pullLoading&&snap.rows?.[0]?.number===94&&snap.counts?.open===1)break;}catch{}}assert.equal(snap?.rows?.[0]?.state,'draft');assert.equal(snap.active,94);receipt.seeds.push(snap);capture('worker-'+seed);}
  receipt.final=JSON.parse(app(['status']));assert.deepEqual(receipt.final.errors,[]);
 }else{
 await sleep(700);capture('normal');receipt.initial=JSON.parse(app(['status']));assert.deepEqual(receipt.initial.errors,[]);
 fs.writeFileSync(control,'interrupt');for(let i=0;i<200;i++){if(fs.readFileSync(logfile,'utf8').includes('FORCED_NATIVE_INTERRUPT'))break;await sleep(5);}
 capture('after-interrupt');receipt.immediate=JSON.parse(app(['status']));await sleep(1000);capture('without-new-data-change');receipt.settled=JSON.parse(app(['status']));
 receipt.forcedInterrupt=fs.readFileSync(logfile,'utf8').includes('FORCED_NATIVE_INTERRUPT_AFTER_ROW_REMOVAL');assert.equal(receipt.forcedInterrupt,true);
 receipt.loggedIncomplete=fs.readFileSync(logfile,'utf8').includes('previous render did not complete');
 if(baseline)assert.equal(receipt.loggedIncomplete,false,'Baseline does not attempt a rebuild before the next explicit change');
 receipt.renderBannerRequiresPixelInspection=true; // status.errors excludes last-frame render banners.
 if(!baseline){assert.deepEqual(receipt.settled.errors,[],'One shipping retry clears the real native interrupted banner');assert.equal(receipt.loggedIncomplete,true,'Recovery observed a real surviving native-abort marker');}
 // A later explicit data change clears the baseline too; no watchdog override.
 fs.writeFileSync(control,'next-change');await sleep(400);capture('next-change');receipt.final=JSON.parse(app(['status']));assert.deepEqual(receipt.final.errors,[]);
 }
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(400);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(core,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop={code:e.status};}
 fs.closeSync(fd);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);assert.equal(JSON.parse(receipt.coreStop).stopped,true);
}
console.log(JSON.stringify(receipt,null,2));
