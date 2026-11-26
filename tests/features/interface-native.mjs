// Opt-in native fixture. Only synthetic facts; never opens a terminal or reads GitHub.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.argv.includes('--run')&&process.platform==='win32','Explicit Windows --run required');
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const output=path.resolve(arg('--output'));assert.ok(path.relative(project,output).startsWith('..'));
const appBin=path.resolve(process.env.HERDR_APP_BIN),coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
assert.ok(fs.existsSync(appBin));fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(output,'run-')),home=path.join(root,'a'),control=path.join(root,'control');
const zoom=Number(arg('--zoom','1.3')),count=Number(arg('--count','41'));
const env={...process.env,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-interface-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-interface',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});fs.writeFileSync(control,'0');
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
const {output:built}=build();deploy(built,home,{repair:false});
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
put('settings.json',{core:coreBin,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'InterfaceFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/InterfaceFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'body',type:'block',content:{mod:'custom-proof-note'}},{id:'sidebar',type:'block',size:{px:460},content:{mod:'custom-changes'}}]});
put('mods/custom-proof-note/mod.json',{place:'none'});put('mods/custom-proof-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View{render(){return div().size_full().p(24).text_size(16).child('Disposable interface fixture · synthetic PRs · no terminals');}}`);
put('mods/custom-changes/fixture.js',`export const context={scope:'fixture',machine:null,links:[]};`);
fs.renameSync(path.join(home,'mods/custom-changes/plugins.js'),path.join(home,'mods/custom-changes/native-plugins.js'));
put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';import {context} from './fixture.js';export const pluginPullContext=()=>context;export const pluginEvent=()=>{};`);
fs.renameSync(path.join(home,'mods/custom-changes/host.js'),path.join(home,'mods/custom-changes/native-host.js'));
put('mods/custom-changes/host.js',`export * from './native-host.js';export const exec=()=>{throw Error('No live IO allowed');};export const hc=exec;export const run=exec;`);
fs.renameSync(path.join(home,'mods/custom-changes/main.js'),path.join(home,'mods/custom-changes/changes-view.js'));
const mainSource=fs.readFileSync(path.join(home,'mods/custom-changes/changes-view.js'),'utf8');
const foldBody=mainSource.slice(mainSource.indexOf('  repositorySection(')).match(/\.on_click\(\(_e, cx\) => \{([\s\S]*?)\n        \}\)/)[1];
put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {AggregatePulls} from './aggregate.js';import {pullRow} from './pulls.js';import {context} from './fixture.js';import {theme,setShared,readTextFile} from './host.js';
export default class Fixture extends Changes{
init(_p,cx){this.resetRepository();this.foldedRepositories=new Set();this.view='closed';this.context='tasks:fixture';this.enrollmentFocus=cx.focus_handle();this.notices={sync(){},presentation(){}};this.syncChecksFallback=()=>{};this.aggregate=new AggregatePulls({shown:()=>true});this.aggregate.context=context;this.aggregate.target=()=>null;
for(let n=1;n<=${count};n++){const repo=n<=Math.ceil(${count}/2)?'fixture/crew':'fixture/herdr-app',key=repo+'#'+n;const link={repo,number:n,key,targets:[{terminal:n%3?'worker':null,historical:n%3===0}]};context.links.push({url:'https://github.com/'+repo+'/pull/'+n});const pr={...pullRow({number:n,title:'Closed fixture '+n,state:n%2?'MERGED':'CLOSED',closedAt:new Date().toISOString(),author:{login:'fixture'},body:'- [x] complete',labels:[{name:'fixture',color:'840479'}]},'fixture'),repo,key};this.aggregate.entries.set(key,{link,pr,completedAt:Date.now(),error:null});}
this.aggregate.rememberCounts();
cx.timer.every(250,cx=>cx.spawn(async view=>{const action=Number(await readTextFile(${JSON.stringify(control)}));if(this.action!==action){this.action=action;if(action===1){while(this.selectedTaskWindow?.revealMore()){};}if(action===2){this.view='open';for(const e of this.aggregate.entries.values())e.pr={...e.pr,state:'open'};this.aggregate.entries.set('fixture/unread#99',{link:{repo:'fixture/unread',number:99,key:'fixture/unread#99',targets:[{terminal:'worker'}]},pr:null,error:null});}if(action===3)this.aggregate.entries.get('fixture/unread#99').error={kind:'read',message:'Fixture read failed; refresh to retry'};if(action>=10){const repo=action%2?'fixture/herdr-app':'fixture/crew',aggregate=this.aggregate,scope=context.scope;const cx={stop_propagation(){},notify:()=>view.notify()};const originalFold=(_e,cx)=>{${foldBody}};originalFold({},cx);}view.notify();}setShared('fixture.snapshot',{action:this.action,folds:[...this.foldedRepositories],rows:this.selectedTaskWindow?.range().revealedRows.length,counts:this.aggregate.counts()});}));}
shown(){return true;}
render(cx){const start=Date.now(),tree=this.renderAggregate(cx,theme());console.error('INTERFACE_BUILD_MS '+(Date.now()-start));return tree;}}
`);
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const receipt={version,home,pid:child.pid,zoom,count,session:env.HC_SESSION,synthetic:true,frames:[]};
try{
 for(let i=0;i<100;i++){await sleep(200);assert.equal(child.exitCode,null);if(fs.existsSync(path.join(home,'shared.json'))){try{if(JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.snapshot'])break;}catch{}}}
 const capture=name=>{const file=path.join(root,name+'.png');app(['shot',file]);receipt.frames.push(file);receipt.status=JSON.parse(app(['status']));receipt.snapshot=JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.snapshot'];};
 capture('initial');fs.writeFileSync(control,'1');await sleep(1500);capture('revealed');
 for(let i=10;i<30;i++){fs.writeFileSync(control,String(i));await sleep(300);if(i%4===1)capture('fold-'+i);}
 receipt.foldProof='Exact production on_click callback driven outside render; not a native mouse hit-test';
 // Native pointer clicks are deliberately not automated on the person's display.
 // In --interactive mode the operator clicks this disposable window; all sessions
 // still have guaranteed cleanup. Programmatic render proof is labelled as such.
 if(process.argv.includes('--interactive'))await sleep(30000);
 for(const a of [2,3]){fs.writeFileSync(control,String(a));await sleep(1200);capture(a===2?'pending':'failure');}
 assert.deepEqual(receipt.status.errors,[]);
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(600);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop=e.status;}
 fs.closeSync(log);receipt.buildMilliseconds=[...fs.readFileSync(path.join(root,'app.log'),'utf8').matchAll(/INTERFACE_BUILD_MS (\d+)/g)].map(m=>Number(m[1]));fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);
}
console.log(JSON.stringify(receipt,null,2));
