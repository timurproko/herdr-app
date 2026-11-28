// Opt-in natural refresh replay: production Git, Crew provider and agent links.
// Synthetic topology/IO only; never touches the installed app or live terminals.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32'&&process.argv.includes('--run'));
const arg=(k,d)=>process.argv.includes(k)?process.argv[process.argv.indexOf(k)+1]:d;
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1')),workers=Number(arg('--workers','4')),unrelated=Number(arg('--unrelated','120')),cycles=Number(arg('--cycles','120'));
assert.ok(path.relative(project,output).startsWith('..'));assert.ok([1,1.3].includes(zoom));
const appBin=path.resolve(process.env.HERDR_APP_BIN),core=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
const archive=path.resolve(appBin,'../../app.tar.gz'),sha=x=>createHash('sha256').update(x).digest('hex'),expected='e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1';
assert.equal(sha(fs.readFileSync(archive)),expected);
const original=execFileSync(path.join(process.env.SystemRoot,'System32/tar.exe'),['-xOf',archive,'herdr-app/herdr-app.exe'],{maxBuffer:100*1024*1024});assert.equal(sha(original),sha(fs.readFileSync(appBin)));
fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,'gr-')),home=path.join(root,'a');fs.mkdirSync(home);
const env={...process.env,HERDR_APP_HOME:home,USERPROFILE:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-git-refresh-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-git-refresh',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const k of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[k];fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});
const put=(f,v)=>{f=path.join(home,f);fs.mkdirSync(path.dirname(f),{recursive:true});fs.writeFileSync(f,typeof v==='string'?v:JSON.stringify(v));};
deploy(build().output,home,{repair:false});
if(process.env.GIT_REFRESH_MAIN)fs.copyFileSync(process.env.GIT_REFRESH_MAIN,path.join(home,'mods/custom-changes/main.js'));
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
put('settings.json',{core,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'GitRefreshFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}});
put('layouts/GitRefreshFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'note',type:'block',content:{mod:'custom-proof-note'}},{id:'sidebar',type:'block',size:{px:460},content:{mod:'custom-changes'}}]});
put('mods/custom-proof-note/mod.json',{place:'none'});put('mods/custom-proof-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View{init(p,cx){this.n=0;cx.timer.every(33,cx=>{this.n++;cx.notify();});}render(){return div().p(24).child('Synthetic production-provider refresh · '+this.n);}}`);
for(const file of ['host.js','main.js'])fs.renameSync(path.join(home,'mods/custom-changes',file),path.join(home,'mods/custom-changes','native-'+file));
put('mods/custom-changes/fixture.js',`import {shared} from './native-host.js';
const workers=${workers};const unrelated=()=> (shared('fixture.tick')??0)>=10?${unrelated}:0;
export const terminals=()=>[{address:'owner',state:'live',labels:{'custom.crew.home':'1'}},...Array.from({length:workers},(_,i)=>({address:'worker'+i,state:'live',labels:{'crew.home':'fixture','crew.task':'task'+i,'herdr.space':'fm-crew-fixture','crew.kind':i%2?'review':'ship','crew.pr':'https://github.com/fixture/'+(i%3)+'/pull/'+(i+1)}})),...Array.from({length:unrelated()},(_,i)=>({address:'other'+i,state:'live',labels:{}}))];
export const spaces=()=>[{id:'coordinator',machine:null,active:true,tabs:[{id:'owner-tab'}]},{id:'fm-crew-fixture',machine:null,tabs:Array.from({length:workers},(_,i)=>({id:'worker-tab'+i}))},...Array.from({length:unrelated()},(_,i)=>({id:'other-space'+i,machine:null,tabs:[{id:'other-tab'+i}]}))];
export const panes=()=>terminals().map(t=>({terminal:t.address,pane:t.address+'-pane',tab:t.address==='owner'?'owner-tab':t.address.startsWith('worker')?'worker-tab'+t.address.slice(6):'other-tab'+t.address.slice(5),cwd:'/fixture',branch:'develop'}));
export const agents=()=>panes().map(p=>({address:p.terminal,pane:p.pane,tab:p.tab,space:p.terminal==='owner'?'coordinator':p.terminal.startsWith('worker')?'fm-crew-fixture':'other-space'+p.terminal.slice(5),app:'a1',program:{name:'A1'},title:'Synthetic agent'}));
export const report=()=>JSON.stringify({home:'/fixture/.crew',owner:{terminal:'owner',live:true},tasks:Array.from({length:workers},(_,i)=>({id:'task'+i,terminal:'worker'+i,state:'working',pr:'https://github.com/fixture/'+(i%3)+'/pull/'+(i+1)}))});
export async function exec(cmd,args){if(cmd==='git')return {code:0,stdout:args[0]==='config'?'remote.origin.url https://github.com/fixture/0':'/fixture',stderr:''};if(cmd!=='node'||!args[1]?.includes('GH_REPO:repo'))throw Error('No live IO');const repo=args[2],query=JSON.parse(args[3]).find(a=>a.startsWith('query='));if(!query)return {code:0,stdout:JSON.stringify({nameWithOwner:repo})};const tick=shared('fixture.tick')??0;return {code:0,stdout:JSON.stringify({data:{repository:Object.fromEntries([...query.matchAll(/pr(\\d+):pullRequest/g)].map(m=>{const number=Number(m[1]);return ['pr'+number,{number,title:'Synthetic PR '+number+' update '+tick,url:'https://github.com/'+repo+'/pull/'+number,state:'OPEN',headRefOid:'a'.repeat(40),headRefName:'work-'+number,author:{login:'fixture'},createdAt:'2026-11-26T10:00:00Z',body:'- [x] first task\\n- [ ] second task',labels:[{name:number%2?'Build':'Review',color:'840479'}],statusCheckRollup:[]}];}))}})};}
`);
put('mods/custom-changes/host.js',`export * from './native-host.js';export {spaces,panes,terminals,agents,exec} from './fixture.js';export const machines=()=>[{name:null,layout:'ready'}];export const focused=()=>({space:'coordinator'});export const props=()=>({});export const layout=()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]});export const hc=async()=>({code:0,stdout:'{}'});export const run=()=>{throw Error('No native mutation');};`);
put('mods/custom-changes/location.js',`export const location=()=>({space:'coordinator',cwd:'/fixture',on:null,terminal:'owner',app:'a1'});export const namedPullNumber=()=>null;`);
put('mods/custom-changes/main.js',`import Changes from './native-main.js';import {refreshFleets} from './plugins/crew/fleet.js';import {report} from './fixture.js';import {shared,setShared} from './host.js';
export default class Fixture extends Changes{
init(p,cx){this.tick=0;this.resetRepository();this.enrollmentFocus=cx.focus_handle();this.foldedRepositories=new Set();this.view='open';this.notices={sync(){},presentation(){},stop(){}};this.enrollmentPicker={render(){},stop(){}};super.init(p,cx);refreshFleets(cx,async()=>report(),true);
cx.timer.every(100,cx=>{if(this.tick>=${cycles})return;this.tick++;setShared('fixture.tick',this.tick);if(this.tick%10===0)refreshFleets(cx,async()=>report(),true);if(this.aggregate?.context&&!this.aggregate.context.stale){if(this.tick%3===0)this.aggregate.invalidate();if(this.tick%5===0)this.refresh(cx);if(this.selectedTaskWindow?.more&&!this.selectedTaskWindow.atCap)this.selectedTaskWindow.revealMore();}cx.notify();});}
shown(){return true;}syncMotionPreference(){this.motionReduced=false;}syncTaskWebhooks(){}syncWebhooks(){}
renderPart(name,build){const start=Date.now();const tree=super.renderPart(name,build);const ms=Date.now()-start;if(ms>2)console.log('GIT_REFRESH_PART '+JSON.stringify({name,ms,tick:this.tick}));return tree;}
render(cx){const start=Date.now(),tree=super.render(cx);console.log('GIT_REFRESH_FRAME '+JSON.stringify({ms:Date.now()-start,tick:this.tick,rows:this.aggregate?.rows('open').length??0,mounted:this.selectedTaskWindow?.range().revealedRows.length??0}));return tree;}}
`);
const logfile=path.join(root,'app.log'),fd=fs.openSync(logfile,'w'),child=spawn(appBin,[],{env,stdio:['ignore',fd,fd]});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const expectInterruption=process.argv.includes('--expect-interruption');
const receipt={version,zoom,workers,unrelated,cycles,expectInterruption,home,pid:child.pid,session:env.HC_SESSION,archiveSha256:expected,executableSha256:sha(original),sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),mainSha256:sha(fs.readFileSync(path.join(home,'mods/custom-changes/native-main.js'))),synthetic:true};
try{
 for(let i=0;i<cycles+200;i++){await sleep(100);assert.equal(child.exitCode,null);const log=fs.readFileSync(logfile,'utf8');
  if(!receipt.initialCaptured && /GIT_REFRESH_FRAME .*"rows":4/.test(log)){app(['shot',path.join(root,'initial.png')]);receipt.initialCaptured=true;}
  try{if(JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.tick']===cycles)break;}catch{}
 }
 app(['shot',path.join(root,'settled.png')]);receipt.status=JSON.parse(app(['status']));
 const log=fs.readFileSync(logfile,'utf8');receipt.frames=[...log.matchAll(/GIT_REFRESH_FRAME (.+)/g)].map(m=>JSON.parse(m[1]));receipt.parts=[...log.matchAll(/GIT_REFRESH_PART (.+)/g)].map(m=>JSON.parse(m[1]));receipt.failures=log.split(/\r?\n/).filter(line=>/render failed|previous render did not complete|interrupted|expects/.test(line));
 assert.ok(receipt.frames.some(f=>f.rows===workers),'All synthetic task PRs must load');if(expectInterruption)assert.ok(receipt.failures.length,'Baseline must reproduce a natural interrupted render');
 else {assert.ok(receipt.frames.some(f=>f.tick===cycles),'Refresh replay must complete');assert.deepEqual(receipt.status.errors,[]);assert.deepEqual(receipt.failures,[],'No native fallback or incomplete render marker');}
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(core,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop={code:e.status};}
 fs.closeSync(fd);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);assert.equal(JSON.parse(receipt.coreStop).stopped,true);
}
console.log(JSON.stringify({root,frames:receipt.frames?.length,failures:receipt.failures,stopped:receipt.stopped,coreStop:receipt.coreStop},null,2));
