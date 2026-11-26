// Explicit disposable GPUI proof: synthetic identity/transport only. No native
// pointer/keyboard injection, credentials, real terminals or production deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32' && process.argv.includes('--run'));
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1.3')),baseline=process.argv.includes('--baseline');
assert.ok(path.relative(project,output).startsWith('..'));
const appBin=path.resolve(process.env.HERDR_APP_BIN),coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
assert.ok(fs.existsSync(appBin));fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(output,`${baseline?'before':'after'}-${zoom}-`)),home=path.join(root,'home'),control=path.join(root,'control');
const env={...process.env,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`git-entry-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-git-entry',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});fs.writeFileSync(control,'0');
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
const built=build().output;deploy(built,home,{repair:false});
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
put('settings.json',{core:coreBin,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'GitEntryFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:true},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/GitEntryFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'note',type:'block',content:{mod:'custom-proof-note'}},{id:'sidebar',type:'block',size:{px:460},content:{mod:'custom-changes'}}]});
put('mods/custom-proof-note/mod.json',{place:'none'});put('mods/custom-proof-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View{render(){return div().size_full().p(24).text_size(16).child('Disposable Git entry proof · ${baseline?'before b22df88':'current implementation'} · ${zoom*100}% · synthetic repositories and agents · no live input');}}`);
put('mods/custom-changes/fixture.js',`
export const place={cwd:'/home',on:null,terminal:'owner',space:'coordinator',tab:'owner-tab',app:'codex'};
export const context={scope:'fixture-home',parent:'coordinator',machine:null,presentationGeneration:0,links:[1,2,9].map(n=>({url:'https://github.com/fixture/repo/pull/'+n,terminal:'worker-'+n,task:'task-'+n})).concat([{url:'https://github.com/fixture/other/pull/3',terminal:'other',task:'other'}])};
export let holding=true;const pending=[];export const hold=()=>{holding=true;};export const release=()=>{holding=false;for(const run of pending.splice(0))run();};
const raw=(n,repo='fixture/repo')=>({number:n,title:(n===1?'Keep loaded rows while refreshing':n===2?'Build worker navigation':n===9?'Closed history stays cached':'Independent repository section'),url:'https://github.com/'+repo+'/pull/'+n,state:n===9?'MERGED':'OPEN',headRefName:'branch-'+n,createdAt:'2026-11-26T10:00:00Z',closedAt:n===9?new Date().toISOString():null,author:{login:'fixture'},body:'- [x] cached',labels:{nodes:[{name:n===2?'Build':'fixture',color:'840479'}]},commits:{nodes:[{commit:{statusCheckRollup:null}}]}});
export const exec=(command,args,options={})=>new Promise(resolve=>{const run=()=>{let repo='fixture/repo';if(command==='node'){repo=args[2];args=JSON.parse(args[3]);command='gh';}if(command==='git'){resolve({code:0,stdout:args[0]==='rev-parse'?options.cwd:'branch-'+(place.terminal==='worker-2'?2:1)});return;}if(command!=='gh')throw Error('No live command permitted');if(args[0]==='repo'){resolve({code:0,stdout:JSON.stringify({nameWithOwner:repo,url:'https://github.com/'+repo})});return;}const query=args.find(a=>a.startsWith('query='))??'',repository={open:{totalCount:2},closed:{totalCount:1}};if(query.includes('pullRequests(first:')){const closed=query.includes('after:$after,states:[CLOSED,MERGED]');repository.pullRequests={nodes:(closed?[9]:[1,2]).map(n=>closed?{number:n}:raw(n)),pageInfo:{endCursor:null,hasNextPage:false}};}else for(const [,n]of query.matchAll(/pr(\\d+):pullRequest/g))repository['pr'+n]=raw(Number(n),repo);resolve({code:0,stdout:JSON.stringify({data:{repository}})});};holding?pending.push(run):run();});
export const target={address:'worker-2',key:'fixture-worker-2',cwd:'/worktree-b',on:null,availability:'live',crew:{},displayName:'Synthetic worker 2'};
export const run=(command,args)=>{if(command!=='agent.focus')throw Error('No live action permitted');Object.assign(place,{terminal:args.terminal,space:'worker-c',tab:'worker-c-tab'});};
`);
fs.renameSync(path.join(home,'mods/custom-changes/plugins.js'),path.join(home,'mods/custom-changes/native-plugins.js'));
put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';import {context} from './fixture.js';export const pluginPullContext=space=>space==='coordinator'?context:null;export const pluginEvent=()=>{};`);
fs.renameSync(path.join(home,'mods/custom-changes/host.js'),path.join(home,'mods/custom-changes/native-host.js'));
put('mods/custom-changes/host.js',`export * from './native-host.js';export {exec,run} from './fixture.js';export const hc=()=>Promise.resolve({code:1,stdout:''});export const spaces=()=>[{id:'coordinator',machine:null}];export const machines=()=>[];`);
put('mods/custom-changes/location.js',`export {place} from './fixture.js';import {place} from './fixture.js';export const location=()=>place;export const namedPullNumber=()=>null;`);
if(baseline)put('mods/custom-changes/main.js',execFileSync('git',['show','b22df88:src/plugins/git/mod/main.js'],{cwd:project,encoding:'utf8'}));
fs.renameSync(path.join(home,'mods/custom-changes/main.js'),path.join(home,'mods/custom-changes/changes-view.js'));
put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {AggregatePulls} from './aggregate.js';import {pullRow} from './pulls.js';import {place,context,hold,release,target,run} from './fixture.js';import {readTextFile,setShared,settings} from './host.js';
export default class Fixture extends Changes{
init(_p,cx){this.resetRepository();this.on=null;this.view='open';this.headerHovered=true;this.foldedRepositories=new Set();this.enrollmentFocus=cx.focus_handle();this.notices={sync(){},presentation(){},stop(){}};this.enrollmentPicker={render(){},stop(){}};this.syncChecksFallback=()=>{};this.syncWebhooks=()=>{};this.syncTaskWebhooks=()=>{};this.agentLinks={refresh(){},cachedRepository:p=>p.cwd.startsWith('/worktree')?'fixture/repo':null,related:pr=>pr.number===2?target:null,pullNumber:terminal=>terminal==='worker-2'?2:null,confirm:async()=>true};this.aggregate=new AggregatePulls({shown:()=>true});this.aggregate.fallbackBusy=true;this.aggregate.sync(cx);this.aggregate.fallbackBusy=false;for(const link of context.links){const m=link.url.match(/github.com\\/(.+)\\/pull\\/(\\d+)/),repo=m[1],number=Number(m[2]),key=repo+'#'+number;const pr={...pullRow({number,title:number===1?'Keep loaded rows while refreshing':number===2?'Build worker navigation':number===9?'Closed history stays cached':'Independent repository section',url:link.url,state:number===9?'MERGED':'OPEN',closedAt:number===9?new Date().toISOString():null,createdAt:'2026-11-26T10:00:00Z',author:{login:'fixture'},labels:[{name:number===2?'Build':'fixture',color:'840479'}],body:'- [x] cached'},'fixture'),repo,key};this.aggregate.entries.set(key,{link:{repo,number,key,targets:[{terminal:link.terminal}]},pr,completedAt:Date.now(),dirty:false});}this.aggregate.rememberCounts();this.context='tasks:fixture-home';this.aggregateGeneration=this.aggregate.presentationGeneration;
cx.timer.every(80,cx=>cx.spawn(async view=>{const action=Number(await readTextFile(${JSON.stringify(control)}));if(this.action!==action){this.action=action;if(action===1){hold();Object.assign(place,{cwd:'/worktree-a',terminal:'worker-1',space:'worker-a',tab:'worker-a-tab'});}if(action===2)release();if(action===3){hold();Object.assign(place,{cwd:'/worktree-b',terminal:'worker-1',space:'worker-b',tab:'worker-b-tab'});}if(action===4){const pr=this.pulls.open.find(pr=>pr.number===2),z=settings().zoom||1,body=this.pinMotion.bodySize;this.pinMotion.bodyPointer({bounds:{x:0,y:0,width:body.width*z,height:body.height*z}});if(this.beginAgentMotion?.(pr,{number:2,at:Date.now(),bounds:{x:300*z,y:116*z,width:80*z,height:20*z}},target,view)){run('agent.focus',{terminal:target.address});this.syncAgent(view,true);}}if(action===5){hold();Object.assign(place,{cwd:'/home',terminal:'owner',space:'coordinator',tab:'owner-tab'});}if(action===6){hold();Object.assign(place,{cwd:'/unknown',terminal:'cold',space:'cold',tab:'cold-tab'});}view.notify();}setShared('fixture.entry',{action:this.action,context:this.context,pin:this.pullPresentation?.pinned?.number??null,phase:this.pinMotion.current?.phase??null,root:this.root,sectionEntry:this.sectionEntry,clickPin:this.clickPin,ready:this.agentResolved===JSON.stringify(place),motionTarget:this.pinMotion.current?.target,motionNumber:this.pinMotion.current?.number,selection:this.selection,agentResolved:this.agentResolved,agentPull:this.agentPull,place:{...place},rows:(this.pulls.open??[]).map(pr=>pr.number),counts:this.context?.startsWith('tasks:')?this.aggregate.counts():this.counts});}));}
shown(){return true;}}
`);
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const receipt={home,version,baseline,baselineRevision:baseline?'b22df88':null,zoom,pid:child.pid,synthetic:true,frames:[],interaction:'production entry renderer; synthetic control/identity; controller-driven click, no native hit-test'};
const snapshot=()=>{try{return JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.entry'];}catch{return null;}};
const capture=name=>{const file=path.join(root,name+'.png');app(['shot',file]);receipt.frames.push({name,file,snapshot:snapshot(),at:Date.now()});};
const action=async n=>{fs.writeFileSync(control,String(n));for(let i=0;i<100;i++){await sleep(40);if(snapshot()?.action===n)return;}throw Error('Fixture action timed out '+n);};
try{
 for(let i=0;i<100;i++){await sleep(200);assert.equal(child.exitCode,null);if(snapshot())break;}
 capture('coordinator-known');await action(1);await sleep(350);capture('worker-entry');
 await action(2);await sleep(700);capture('worker-updated');
 await action(3);await sleep(250);capture('second-worker-entry');await action(2);await sleep(500);
 if(!baseline){await action(4);capture('chip-motion-start');await sleep(90);capture('chip-motion-middle');await sleep(500);capture('chip-motion-settled');}
 await action(5);await sleep(250);capture('coordinator-return');await action(6);await sleep(250);capture('uncached-loading');
 receipt.status=JSON.parse(app(['status']));assert.deepEqual(receipt.status.errors,[]);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'app.log'),'utf8'),/render failed|previous render did not complete|child\(value\) expects/,'Native logs, not only status.errors, must be clean');
 if(!baseline){assert.deepEqual(receipt.frames.find(f=>f.name==='worker-entry').snapshot.counts,{open:2,closed:1});assert.equal(receipt.frames.find(f=>f.name==='worker-entry').snapshot.pin,null);assert.equal(receipt.frames.find(f=>f.name==='coordinator-return').snapshot.counts.open,3);assert.equal(receipt.frames.find(f=>f.name==='chip-motion-settled').snapshot.pin,2);}
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(600);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(error){receipt.coreStop=error.status;}
 fs.closeSync(log);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);
}
console.log(JSON.stringify(receipt,null,2));
