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
const zoom=Number(arg('--zoom','1.3')),count=Number(arg('--count','41')),withSpaces=process.argv.includes('--spaces');
const env={...process.env,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-interface-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-interface',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});fs.writeFileSync(control,'0');
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
const {output:built}=build();deploy(built,home,{repair:false});
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
put('settings.json',{core:coreBin,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'InterfaceFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/InterfaceFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[...(withSpaces?[{id:'left',type:'column',size:{px:360},children:[{id:'spaces-fixture',type:'block',size:{px:400},content:{mod:'custom-spaces'}},{id:'agents-fixture',type:'block',content:{mod:'custom-agents'}}]}]:[]),{id:'body',type:'block',content:{mod:'custom-proof-note'}},{id:'sidebar',type:'block',size:{px:460},content:{mod:'custom-changes'}}]});
put('mods/custom-proof-note/mod.json',{place:'none'});put('mods/custom-proof-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View{render(){return div().size_full().p(24).text_size(16).child('Disposable interface fixture · synthetic PRs · no terminals');}}`);
put('mods/custom-changes/fixture.js',`export const context={scope:'fixture',parent:'fixture-coordinator',machine:null,links:[]};export let current=context;export const setCurrent=value=>current=value;`);
fs.renameSync(path.join(home,'mods/custom-changes/plugins.js'),path.join(home,'mods/custom-changes/native-plugins.js'));
put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';import {current} from './fixture.js';export const pluginPullContext=()=>current;export const pluginEvent=()=>{};`);
fs.renameSync(path.join(home,'mods/custom-changes/host.js'),path.join(home,'mods/custom-changes/native-host.js'));
put('mods/custom-changes/host.js',`export * from './native-host.js';export const exec=()=>{throw Error('No live IO allowed');};export const hc=exec;export const run=exec;`);
fs.renameSync(path.join(home,'mods/custom-changes/main.js'),path.join(home,'mods/custom-changes/changes-view.js'));
const mainSource=fs.readFileSync(path.join(home,'mods/custom-changes/changes-view.js'),'utf8');
const foldBody=mainSource.slice(mainSource.indexOf('  repositorySection(')).match(/\.on_click\(\(_e, cx\) => \{([\s\S]*?)\n        \}\)/)[1];
put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {AggregatePulls} from './aggregate.js';import {pullRow} from './pulls.js';import {context,setCurrent} from './fixture.js';import {div} from 'gpui-kit';import {theme,setShared,readTextFile} from './host.js';
export default class Fixture extends Changes{
init(_p,cx){this.resetRepository();this.foldedRepositories=new Set();this.view='closed';this.context='tasks:fixture';this.enrollmentFocus=cx.focus_handle();this.notices={sync(){},presentation(){}};this.syncChecksFallback=()=>{};this.aggregate=new AggregatePulls({shown:()=>true});this.aggregate.sync(cx);this.aggregate.target=()=>null;
for(let n=1;n<=${count};n++){const repo=n<=Math.ceil(${count}/2)?'fixture/crew':'fixture/herdr-app',key=repo+'#'+n;const link={repo,number:n,key,targets:[{terminal:n%3?'worker':null,historical:n%3===0}]};context.links.push({url:'https://github.com/'+repo+'/pull/'+n});const pr={...pullRow({number:n,title:'Closed fixture '+n,state:n%2?'MERGED':'CLOSED',closedAt:new Date().toISOString(),author:{login:'fixture'},body:'- [x] complete',labels:[{name:'fixture',color:'840479'}]},'fixture'),repo,key};this.aggregate.entries.set(key,{link,pr,completedAt:Date.now(),error:null});}
this.aggregate.rememberCounts();
cx.timer.every(250,cx=>cx.spawn(async view=>{const action=Number(await readTextFile(${JSON.stringify(control)}));if(this.action!==action){this.action=action;if(action===1){while(this.selectedTaskWindow?.revealMore()){};}if(action===2){this.view='open';for(const e of this.aggregate.entries.values())e.pr={...e.pr,state:'open'};this.aggregate.entries.set('fixture/aaa-unread#99',{link:{repo:'fixture/aaa-unread',number:99,key:'fixture/aaa-unread#99',targets:[{terminal:'worker'}]},pr:null,error:null});}if(action===3)this.aggregate.entries.get('fixture/aaa-unread#99').error={kind:'read',message:'Fixture read failed; refresh to retry'};if(action===4){setCurrent(null);this.aggregate.sync(view);}if(action===5){setCurrent({...context,stale:true,links:[]});this.aggregate.sync(view);}if(action>=10){const repo=action%2?'fixture/herdr-app':'fixture/crew',aggregate=this.aggregate,scope=context.scope;const cx={stop_propagation(){},notify:()=>view.notify()};const originalFold=(_e,cx)=>{${foldBody}};originalFold({},cx);}view.notify();}setShared('fixture.snapshot',{action:this.action,folds:[...this.foldedRepositories],rows:this.selectedTaskWindow?.range().revealedRows.length,counts:this.aggregate.counts()});}));}
shown(){return true;}
render(cx){if(!this.aggregate.context)return div().child('Another space · no cached coordinator rows');const start=Date.now(),tree=this.renderAggregate(cx,theme());console.error('INTERFACE_BUILD_MS '+(Date.now()-start));return tree;}}
`);
if(withSpaces){
 put('mods/custom-spaces/fixture.js',`export const all=[{id:'parent',name:'Coordinator',machine:null,active:true},{id:'other',name:'Unrelated',machine:null},{id:'child',name:'crew',machine:null}];export const links=[{parent:'parent',child:'child',binding:'fixture-home-owner'}];export let compact=false;export const setCompact=value=>compact=value;export const run=(command,args)=>{if(command==='space.move'){const [space]=all.splice(all.findIndex(s=>s.id===args.id),1);all.splice(args.index-1,0,space);return;}if(command==='space.select'){for(const space of all)space.active=space.id===args.id;return;}throw Error('No native model mutation allowed');};`);
 fs.renameSync(path.join(home,'mods/custom-spaces/host.js'),path.join(home,'mods/custom-spaces/native-host.js'));
 put('mods/custom-spaces/host.js',`export * from './native-host.js';export {run} from './fixture.js';import {all,compact} from './fixture.js';export const spaces=()=>all;export const panes=()=>[];export const machines=()=>[];export const layout=()=>({id:'sidebar',size:{px:compact?100:360}});export const exec=()=>{throw Error('No live IO');};export const hc=exec;`);
 fs.renameSync(path.join(home,'mods/custom-spaces/plugins.js'),path.join(home,'mods/custom-spaces/native-plugins.js'));
 put('mods/custom-spaces/plugins.js',`export * from './native-plugins.js';import {links} from './fixture.js';export const pluginWorkspaceLinks=()=>links;export const pluginSpaceTags=()=>[{plugin:'crew',label:'Crew'}];export const pluginEvent=()=>{};`);
 fs.renameSync(path.join(home,'mods/custom-spaces/main.js'),path.join(home,'mods/custom-spaces/spaces-view.js'));
 put('mods/custom-spaces/main.js',`import Spaces from './spaces-view.js';import {ScrollHandle} from 'gpui-base';import {readTextFile,setShared} from './host.js';import {all,run,setCompact} from './fixture.js';export default class Fixture extends Spaces{init(_p,cx){this.git={};this.shown=new Set(all.map(s=>s.id));this.born={};this.folded=new Set();this.machines=[];this.reconnecting={};this.rename=null;this.listScroll=ScrollHandle.new();this.connectedSelection='parent';cx.timer.every(250,cx=>cx.spawn(async view=>{const action=Number(await readTextFile(${JSON.stringify(control)}));if(this.action!==action){this.action=action;if(action===6)setCompact(true);if(action===7){setCompact(false);this.connectedFolds().clear();this.drag.begin('child',{position:{x:80,y:85},bounds:{x:8,y:70,width:344,height:26}},view,{meta:{sources:['parent','child'],binding:'fixture-home-owner'}});this.drag.track({position:{x:100,y:100},local_position:{x:100,y:100},bounds:{height:400}},view);}if(action===8){this.drag.over({position:{x:100,y:150}},'other',view);}if(action===9)this.drop('other',view);if(action>=10){if(action%4===2||action%4===1)this.toggleConnected(this.ordered()[0],view);if(action%4===3)run('space.select',{id:'child'});if(action%4===0)run('space.select',{id:'parent'});this.syncConnectedSelection(view);}view.notify();}this.blockCommit?.observe();setShared('fixture.spaces',{order:all.map(s=>s.id),folds:[...this.connectedFolds()],visible:this.visibleRows(false).map(r=>r.w.id),selected:all.find(s=>s.active)?.id});}));}}`);
 fs.renameSync(path.join(home,'mods/custom-agents/host.js'),path.join(home,'mods/custom-agents/native-host.js'));
 put('mods/custom-agents/host.js',`export * from './native-host.js';const counts=[${Math.ceil(count/2)},${Math.floor(count/2)}];export const agents=()=>counts.flatMap((count,g)=>Array.from({length:count},(_,i)=>({address:'fixture-'+g+'-'+i,space:'s'+g,space_name:g?'fixture/herdr-app':'fixture/crew',pane:'p'+g+'-'+i,title:'Synthetic agent',program:{key:'a1',name:'A1'},seq:g*100+i,status:'done'})));export const spaces=()=>counts.map((count,g)=>({id:'s'+g,name:g?'fixture/herdr-app':'fixture/crew',named:true}));export const terminals=()=>[];export const panes=()=>[];export const focused=()=>null;export const props=()=>({});export const layout=()=>({id:'sidebar',size:{px:360}});export const shared=key=>key==='agents.sort'?'grouped':null;export const setShared=()=>{};export const setAgentOrder=()=>{};export const exec=()=>{throw Error('No live IO');};export const hc=exec;export const run=exec;`);
 fs.renameSync(path.join(home,'mods/custom-agents/main.js'),path.join(home,'mods/custom-agents/agents-view.js'));
 put('mods/custom-agents/main.js',`import Agents from './agents-view.js';export default class Fixture extends Agents{init(p,cx){super.init(p,cx);this.folded=new Set(['sp-fixture/crew','sp-fixture/herdr-app']);}}`);
}
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const receipt={version,home,pid:child.pid,zoom,count,session:env.HC_SESSION,synthetic:true,frames:[]};
try{
 for(let i=0;i<100;i++){await sleep(200);assert.equal(child.exitCode,null);if(fs.existsSync(path.join(home,'shared.json'))){try{if(JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.snapshot'])break;}catch{}}}
 const capture=name=>{const file=path.join(root,name+'.png');app(['shot',file]);receipt.frames.push(file);receipt.status=JSON.parse(app(['status']));receipt.snapshot=JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.snapshot'];receipt.spaces=JSON.parse(fs.readFileSync(path.join(home,'shared.json')))['fixture.spaces'];};
 capture('initial');fs.writeFileSync(control,'1');await sleep(1500);capture('revealed');
 for(let i=10;i<30;i++){fs.writeFileSync(control,String(i));await sleep(300);if(i%4===1)capture('fold-'+i);}
 receipt.foldProof='Exact production on_click callback driven outside render; not a native mouse hit-test';
 // Native pointer clicks are deliberately not automated on the person's display.
 // In --interactive mode the operator clicks this disposable window; all sessions
 // still have guaranteed cleanup. Programmatic render proof is labelled as such.
 if(process.argv.includes('--interactive'))await sleep(30000);
 for(const [a,name]of [[2,'pending'],[3,'failure'],[6,'compact'],[7,'drag-child'],[8,'drag-target'],[9,'reordered'],[4,'away'],[5,'returned']]){fs.writeFileSync(control,String(a));await sleep(1200);capture(name);}
 assert.deepEqual(receipt.status.errors,[]);
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(600);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop=e.status;}
 fs.closeSync(log);receipt.buildMilliseconds=[...fs.readFileSync(path.join(root,'app.log'),'utf8').matchAll(/INTERFACE_BUILD_MS (\d+)/g)].map(m=>Number(m[1]));fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);
}
console.log(JSON.stringify(receipt,null,2));
