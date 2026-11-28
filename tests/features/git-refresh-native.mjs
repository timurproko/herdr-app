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
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1')),workers=Number(arg('--workers','14')),unrelated=Number(arg('--unrelated','120')),cycles=Number(arg('--cycles','60'));
const initialWorkers=Number(arg('--initial-workers',String(Math.min(4,workers)))),growAt=Number(arg('--grow-at','20')),profile=process.argv.includes('--profile');
const maxRenderMs=35; // Keep 15ms margin below the unchanged native 50ms deadline.
assert.ok(initialWorkers>0&&initialWorkers<=workers&&growAt>=0&&cycles>growAt);
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
for(const [key,file]of [['GIT_REFRESH_MAIN','main.js'],['GIT_REFRESH_AGGREGATE','aggregate.js'],['GIT_REFRESH_LINKS','agent-links.js'],['GIT_REFRESH_FLEET','plugins/crew/fleet.js'],['GIT_REFRESH_LOCATION','location.js'],['GIT_REFRESH_PULLS','pulls.js']])if(process.env[key])fs.copyFileSync(process.env[key],path.join(home,'mods/custom-changes',file));
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
put('settings.json',{core,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'GitRefreshFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}});
put('layouts/GitRefreshFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'note',type:'block',content:{mod:'custom-proof-note'}},{id:'sidebar',type:'block',size:{px:460},content:{mod:'custom-changes'}}]});
put('mods/custom-proof-note/mod.json',{place:'none'});put('mods/custom-proof-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View{init(p,cx){this.n=0;cx.timer.every(33,cx=>{this.n++;cx.notify();});}render(){return div().p(24).child('Synthetic production-provider refresh · '+this.n);}}`);
for(const file of ['host.js','main.js'])fs.renameSync(path.join(home,'mods/custom-changes',file),path.join(home,'mods/custom-changes','native-'+file));
put('mods/custom-changes/fixture.js',`import {shared} from './native-host.js';
const workers=()=> (shared('fixture.tick')??0)>=${growAt}?${workers}:${initialWorkers};const unrelated=()=> (shared('fixture.tick')??0)>=10?${unrelated}:0;
export const terminals=()=>[{address:'owner',state:'live',labels:{'custom.crew.home':'1'}},...Array.from({length:workers()},(_,i)=>({address:'worker'+i,state:'live',labels:{'crew.home':'fixture','crew.task':'task'+i,'herdr.space':'fm-crew-fixture','crew.kind':i%2?'review':'ship','crew.pr':'https://github.com/fixture/'+(i%3)+'/pull/'+(i+1)}})),...Array.from({length:unrelated()},(_,i)=>({address:'other'+i,state:'live',labels:{}}))];
export const spaces=()=>[{id:'coordinator',machine:null,active:true,tabs:[{id:'owner-tab',active:true}]},{id:'fm-crew-fixture',machine:null,tabs:Array.from({length:workers()},(_,i)=>({id:'worker-tab'+i}))},...Array.from({length:unrelated()},(_,i)=>({id:'other-space'+i,machine:null,tabs:[{id:'other-tab'+i}]}))];
export const panes=()=>terminals().map(t=>({terminal:t.address,pane:t.address+'-pane',tab:t.address==='owner'?'owner-tab':t.address.startsWith('worker')?'worker-tab'+t.address.slice(6):'other-tab'+t.address.slice(5),cwd:'/fixture',branch:'develop',app:'a1'}));
export const agents=()=>panes().map(p=>({address:p.terminal,pane:p.pane,tab:p.tab,space:p.terminal==='owner'?'coordinator':p.terminal.startsWith('worker')?'fm-crew-fixture':'other-space'+p.terminal.slice(5),app:'a1',program:{name:'A1'},title:'Synthetic agent'}));
export const report=()=>JSON.stringify({home:'/fixture/.crew',owner:{terminal:'owner',live:true},tasks:Array.from({length:workers()},(_,i)=>({id:'task'+i,terminal:'worker'+i,state:'working',pr:'https://github.com/fixture/'+(i%3)+'/pull/'+(i+1)}))});
export async function exec(cmd,args){if(cmd==='git')return {code:0,stdout:args[0]==='config'?'remote.origin.url https://github.com/fixture/0':'/fixture',stderr:''};if(cmd!=='node'||!args[1]?.includes('GH_REPO:repo'))throw Error('No live IO');const repo=args[2],query=JSON.parse(args[3]).find(a=>a.startsWith('query='));if(!query)return {code:0,stdout:JSON.stringify({nameWithOwner:repo})};const tick=shared('fixture.tick')??0;return {code:0,stdout:JSON.stringify({data:{repository:Object.fromEntries([...query.matchAll(/pr(\\d+):pullRequest/g)].map(m=>{const number=Number(m[1]);return ['pr'+number,{number,title:'Synthetic PR '+number+' update '+tick,url:'https://github.com/'+repo+'/pull/'+number,state:'OPEN',headRefOid:'a'.repeat(40),headRefName:'work-'+number,author:{login:'fixture'},createdAt:'2026-11-26T10:00:00Z',body:'- [x] first task\\n- [ ] second task',labels:[{name:number%2?'Build':'Review',color:'840479'}],statusCheckRollup:[]}];}))}})};}
`);
put('mods/custom-changes/profile.js',`let active=null;export const begin=()=>{const previous=active;active={calls:{},ms:{}};return previous;};export const end=()=>{const result=active;active=null;return result;};export function measure(key,fn){if(!active)return fn();const entry=active,start=Date.now();entry.calls[key]=(entry.calls[key]??0)+1;entry.last=key;try{return fn();}finally{entry.ms[key]=(entry.ms[key]??0)+Date.now()-start;}}export function instrument(object,names,prefix){for(const name of names){const original=object?.[name];if(typeof original==='function')object[name]=function(...args){return measure(prefix+'.'+name,()=>original.apply(this,args));};}}`);
put('mods/custom-changes/host.js',`export * from './native-host.js';export {exec} from './fixture.js';import * as facts from './fixture.js';import * as native from './native-host.js';import {measure} from './profile.js';export const spaces=()=>measure('host.spaces',facts.spaces),panes=()=>measure('host.panes',facts.panes),terminals=()=>measure('host.terminals',facts.terminals),agents=()=>measure('host.agents',facts.agents);export const shared=key=>measure('host.shared:'+key,()=>native.shared(key));export const settings=()=>measure('host.settings',()=>native.settings());export const machines=()=>[{name:null,layout:'ready'}];export const focused=()=>measure('host.focused',()=>({space:'coordinator',tab:'owner-tab',terminal:'owner',pane:'owner-pane',cwd:'/fixture'}));export const props=()=>({});export const layout=()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]});export const hc=async()=>({code:0,stdout:'{}'});export const run=()=>{throw Error('No native mutation');};`);
put('mods/custom-changes/main.js',`import Changes from './native-main.js';import {refreshFleets} from './plugins/crew/fleet.js';import {report} from './fixture.js';import {shared,setShared} from './host.js';import {begin,end,instrument} from './profile.js';
export default class Fixture extends Changes{
init(p,cx){this.tick=0;this.proofs=[];this.parts=[];this.resetRepository();this.enrollmentFocus=cx.focus_handle();this.foldedRepositories=new Set();this.view='open';this.notices={sync(){},presentation(){},stop(){}};this.enrollmentPicker={render(){},stop(){}};super.init(p,cx);if(${profile}){instrument(this,['syncAggregate','repositorySections','taskSections','renderAggregate','renderPullRow','pullLine','stageDescriptor','stageBoxWidth','syncChecksFallback'],'panel');instrument(this.aggregate,['currentContext','sync','pump','frameContext','repositories','presentationRows','rememberCounts'],'aggregate');instrument(this.agentLinks,['refresh','roleMatches','presentationSnapshot'],'links');}refreshFleets(cx,async()=>report(),true);
cx.timer.every(100,cx=>{this.flushProof();if(this.tick>=${cycles})return;this.tick++;setShared('fixture.tick',this.tick);if(this.tick%10===0)refreshFleets(cx,async()=>report(),true);if(this.aggregate?.context&&!this.aggregate.context.stale){if(this.tick%3===0)this.aggregate.invalidate();if(this.tick%5===0)this.refresh(cx);if(this.selectedTaskWindow?.more&&!this.selectedTaskWindow.atCap)this.selectedTaskWindow.revealMore();}cx.notify();});}
shown(){return true;}syncMotionPreference(){this.motionReduced=false;}syncTaskWebhooks(){}syncWebhooks(){}
// Never write diagnostics during render: synchronous tracing IO can consume
// the very deadline being measured. Flush one bounded sample per existing tick.
flushProof(){const sample=this.proofs.shift();if(sample)console.log('GIT_REFRESH_SAMPLE '+JSON.stringify(sample));}
renderPart(name,build){if(!${profile})return super.renderPart(name,build);const start=Date.now(),tree=super.renderPart(name,build),ms=Date.now()-start;if(ms>2)this.parts.push({name,ms,tick:this.tick});return tree;}
render(cx){this.parts=[];if(${profile}){const aborted=begin();if(aborted)this.proofs.push({aborted,tick:this.tick});}const start=Date.now(),tree=super.render(cx),ms=Date.now()-start;this.proofs.push({ms,tick:this.tick,rows:this.aggregate?.rows('open').length??0,mounted:this.selectedTaskWindow?.range().revealedRows.length??0,parts:this.parts,profile:${profile}?end():null});return tree;}}
`);
const logfile=path.join(root,'app.log'),fd=fs.openSync(logfile,'w'),child=spawn(appBin,[],{env,stdio:['ignore',fd,fd]});
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const expectInterruption=process.argv.includes('--expect-interruption');
const receipt={version,zoom,workers,initialWorkers,growAt,unrelated,cycles,profile,maxRenderMs,expectInterruption,home,pid:child.pid,session:env.HC_SESSION,archiveSha256:expected,executableSha256:sha(original),sourceHead:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),mainSha256:sha(fs.readFileSync(path.join(home,'mods/custom-changes/native-main.js'))),aggregateSha256:sha(fs.readFileSync(path.join(home,'mods/custom-changes/aggregate.js'))),linksSha256:sha(fs.readFileSync(path.join(home,'mods/custom-changes/agent-links.js'))),pullsSha256:sha(fs.readFileSync(path.join(home,'mods/custom-changes/pulls.js'))),fleetSha256:sha(fs.readFileSync(path.join(home,'mods/custom-changes/plugins/crew/fleet.js'))),locationSha256:sha(fs.readFileSync(path.join(home,'mods/custom-changes/location.js'))),synthetic:true};
try{
 for(let i=0;i<cycles+200;i++){await sleep(100);assert.equal(child.exitCode,null);const log=fs.readFileSync(logfile,'utf8');
  const incomplete=log.match(/previous render did not complete/g)?.length??0;
  if(incomplete>(receipt.capturedFailures??0)&&(receipt.failureShots??0)<4){receipt.capturedFailures=incomplete;receipt.failureShots=(receipt.failureShots??0)+1;app(['shot',path.join(root,'interruption-'+receipt.failureShots+'.png')]);}
  if(!receipt.initialCaptured && new RegExp('GIT_REFRESH_SAMPLE .*"rows":'+initialWorkers+'(?:,|})').test(log)){app(['shot',path.join(root,'initial.png')]);receipt.initialCaptured=true;}
  try{if(JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.tick']===cycles&&new RegExp('GIT_REFRESH_SAMPLE .*"tick":'+cycles+'[,}]').test(log))break;}catch{}
 }
 app(['shot',path.join(root,'settled.png')]);receipt.status=JSON.parse(app(['status']));
 const log=fs.readFileSync(logfile,'utf8');const samples=[...log.matchAll(/GIT_REFRESH_SAMPLE (.+)/g)].map(m=>JSON.parse(m[1]));receipt.frames=samples.filter(s=>Number.isFinite(s.ms)).map(({ms,tick,rows,mounted})=>({ms,tick,rows,mounted}));receipt.parts=samples.flatMap(s=>s.parts??[]);receipt.failures=log.split(/\r?\n/).filter(line=>/render failed|previous render did not complete|interrupted|expects/.test(line));
 receipt.profiles=samples.filter(s=>s.profile).map(s=>({tick:s.tick,...s.profile}));receipt.abortedProfiles=samples.flatMap(s=>s.aborted?[s.aborted]:[]);
 assert.ok(receipt.frames.some(f=>f.tick<growAt&&f.rows===initialWorkers),'Initial workers must load before growth');
 assert.ok(receipt.frames.some(f=>f.rows===workers),'All synthetic task PRs must load');if(expectInterruption)assert.ok(receipt.failures.length,'Baseline must reproduce a natural interrupted render');
 else {assert.ok(receipt.frames.some(f=>f.tick===cycles),'Refresh replay must complete');assert.ok(receipt.frames.some(f=>f.tick>=growAt&&f.mounted===workers),'The complete grown list must actually be mounted');assert.deepEqual(receipt.status.errors,[]);assert.deepEqual(receipt.failures,[],'No native fallback or incomplete render marker');assert.ok(Math.max(...receipt.frames.map(f=>f.ms))<=maxRenderMs,'Complete render must retain margin below the native deadline');}
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(core,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop={code:e.status};}
 fs.closeSync(fd);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);assert.equal(JSON.parse(receipt.coreStop).stopped,true);
}
console.log(JSON.stringify({root,frames:receipt.frames?.length,failures:receipt.failures,stopped:receipt.stopped,coreStop:receipt.coreStop},null,2));
