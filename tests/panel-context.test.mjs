// Actual packaged location/state adapters plus coordinator context selection.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const plain=value=>JSON.parse(JSON.stringify(value));
for(const initial of ['files','changes']) {
 const values=new Map([['layout','Custom']]),memory=new Map(),disabled=new Set(),commands=[];
 const source={id:'pc2/coordinator',machine:'pc2',active:true,tabs:[{id:'pc2/tab',name:'#109',named:true,active:true}]};
 const destination={id:'local-worker',machine:null,tabs:[{id:'local-tab',name:'#110',named:true,active:true}]};
 const groups=[source,destination],all=[{pane:'pc2/p',tab:'pc2/tab',terminal:'pc2/owner',app:'a1',cwd:'D:/held'}];
 const list=[{address:'pc2/owner',report:{app:'a1'}}];
 let focus={space:source.id,tab:'pc2/tab',terminal:'pc2/owner'},provider={scope:'verified-home',parent:source.id,machine:'pc2',links:[]};
 const panel={id:'panel',hidden:false},body={id:'panel-body',active:initial},root={children:[panel,body]};
 const host={spaces:()=>groups,panes:()=>all,terminals:()=>list,focused:()=>focus,
   shared:key=>values.get(key)??null,setShared:(key,value)=>values.set(key,plain(value)),layout:()=>root,
   exec(){assert.fail('Source selection starts no transport');},run:(name,args)=>{commands.push([name,args]);if(name==='layout.select')body.active=args.child;else panel.hidden=name==='layout.hide';}};
 const modules={
  'files-location.js':'src/plugins/files/mod/location.js',
  'directory.js':{paneDirectory:(p,_list,f)=>({cwd:p?.cwd??f?.cwd??null})},
  'plugins.js':{sidebarPanels:({enabled=true}={})=>['files','changes'].filter(id=>!enabled||!disabled.has(id)).map(id=>({id})),sidebarPanelEnabled:id=>!disabled.has(id),
   pluginPullContext:(space,{presentation}={})=>space===provider?.parent && (presentation||!provider?.stale)?provider:null,pluginEvent(){}},
  'pulls.js':{PullFactsOrder:class{},pullFailure(){},repositoryFailure(){},readTargetPulls(){assert.fail('No inventory reads from retained identity');},finalPull(){},retimePull:v=>v,quietRead(){},retryRead(){}},
 };
 const globals=storage=>({sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},window:{refresh(){}}});
 const load=storage=>loadMod({mod:'custom-changes',host,modules,globals:globals(storage),entry:'export {location as git} from "./location.js"; export {location as files} from "./files-location.js"; export * from "./panel-state.js"; export {AggregatePulls} from "./aggregate.js";'});
 const api=await load(memory);assert.equal(api.togglePanelPin(),true);const held=plain(api.git());
 assert.equal(held.app,'a1');assert.equal(held.pullNumber,109);assert.equal(held.cwd,'D:/held');
 source.active=false;destination.active=true;all.push({pane:'local-p',tab:'local-tab',terminal:'local-agent',app:'bash',cwd:'/other'});list.push({address:'local-agent'});
 focus={space:destination.id,tab:'local-tab',terminal:'local-agent'};all[0].cwd='D:/original-moved';
 const aggregate=new api.AggregatePulls({shown:()=>true,onUpdate(){}});
 assert.equal(aggregate.currentContext().scope,'verified-home','Coordinator scope follows the held space, not the selected worker');
 for(const view of ['files','changes','files']) {
   api.changePanel({view});assert.deepEqual(plain(api.git()),held);assert.deepEqual(plain(api.files()),held);
 }
 const otherMod=await load(memory);assert.deepEqual(plain(otherMod.git()),held,'Separate mod module graphs share the same app-session hold');
 const jobs=[],owner={},cx={sleep:async()=>{},notify(){},spawn:fn=>jobs.push(fn(cx))};
 for(const combination of [['files'],['changes'],['files','changes'],[]]) {
   disabled.clear();combination.forEach(id=>disabled.add(id));api.syncPanelState(owner,cx);await Promise.all(jobs.splice(0));
   assert.deepEqual(plain(api.panelSource()),held);assert.equal(panel.hidden,combination.length===2);
 }
 disabled.clear();provider={...provider,stale:true};assert.equal(aggregate.currentContext(),null,'A held source grants no fresh coordinator authority');
 assert.equal(aggregate.currentContext({presentation:true}).scope,'verified-home');
 provider=null;assert.equal(aggregate.currentContext(),null);all.shift();list.shift();assert.deepEqual(plain(api.git()),held,'Missing original identities cannot select the current agent');
 assert.equal(api.togglePanelPin(undefined,false),true);assert.equal(api.git().terminal,'local-agent');assert.equal(api.files().cwd,'/other');
 assert.equal(api.togglePanelPin(),true);const restart=await load(new Map());
 assert.equal(restart.panelPinned(),false);assert.equal(restart.git().terminal,'local-agent');
 assert.equal(JSON.stringify([...values]).includes('D:/held'),false,'The source is never written to shared/durable state');
 assert.equal(JSON.stringify([...values]).includes('local-agent'),false);
}
console.log('PASS: real Files/Git held-source switching, independent mod graphs, coordinator scope/authority, availability, missing source and unpinned restart');
