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
 let focus={space:source.id,tab:'pc2/tab',terminal:'pc2/owner'},provider={kind:'tasks',provider:'crew',scope:'verified-home',parent:source.id,machine:'pc2',home:'D:/crew-home',owner:'pc2/owner',ownerTab:'pc2/tab',ownerPane:'pc2/p',links:[]};
 const panel={id:'panel',hidden:false},body={id:'panel-body',active:initial},root={children:[panel,body]};
 const host={spaces:()=>groups,panes:()=>all,terminals:()=>list,focused:()=>focus,
   shared:key=>values.get(key)??null,setShared:(key,value)=>values.set(key,plain(value)),layout:()=>root,
   exec(){assert.fail('Source selection starts no transport');},run:(name,args)=>{commands.push([name,args]);if(name==='layout.select')body.active=args.child;else panel.hidden=name==='layout.hide';}};
 const modules={
  'files-location.js':'src/plugins/files/mod/location.js',
  'directory.js':{paneDirectory:(p,_list,f)=>({cwd:p?.cwd??f?.cwd??null})},
  'plugins.js':{sidebarPanels:({enabled=true}={})=>['files','changes'].filter(id=>!enabled||!disabled.has(id)).map(id=>({id})),sidebarPanelEnabled:id=>!disabled.has(id),
   pluginPullContext:(space,{presentation}={})=>space===provider?.parent && (presentation||!provider?.stale)?provider:null,pluginEvent(){}},
  'pulls.js':{PullFactsOrder:class{reset(){}}, pullFailure(){},repositoryFailure(){},readTargetPulls(){assert.fail('No inventory reads from retained identity');},finalPull(){},retimePull:v=>v,quietRead(){},retryRead(){}},
 };
 const globals=storage=>({sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)},window:{refresh(){}}});
 const load=storage=>loadMod({mod:'custom-changes',host,modules,globals:globals(storage),entry:'export {location as git} from "./location.js"; export {location as files} from "./files-location.js"; export * from "./panel-state.js"; export {AggregatePulls} from "./aggregate.js";'});
 const api=await load(memory);assert.equal(api.togglePanelPin(),true);const held=plain(api.git());
 assert.equal(held.app,'a1');assert.equal(held.pullNumber,109);assert.equal(held.cwd,'D:/held');
 assert.equal(held.git.mode,'tasks');assert.equal(held.git.identity.owner,'pc2/owner');assert.equal(held.git.identity.home,'D:/crew-home');assert.equal('links' in held.git.identity,false,'Only provenance, not inventory, enters the held record');
 source.active=false;destination.active=true;all.push({pane:'local-p',tab:'local-tab',terminal:'local-agent',app:'bash',cwd:'/other'});list.push({address:'local-agent'});
 focus={space:destination.id,tab:'local-tab',terminal:'local-agent'};all[0].cwd='D:/original-moved';
 const aggregate=new api.AggregatePulls({shown:()=>true,onUpdate(){}});
 assert.equal(aggregate.currentContext().scope,'verified-home','Coordinator scope follows the held space, not the selected worker');
 const destinationFrame={place:{space:destination.id,terminal:'local-agent'}};
 assert.equal(aggregate.frameContext(destinationFrame).scope,'verified-home','Main\'s frame reuse must retain the held coordinator scope');
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
 const original={...provider,stale:false};provider=original;
 aggregate.pump=()=>{};aggregate.sync({});
 const retained={link:{repo:'example/repo',targets:[]},pr:{number:109,state:'open'}};aggregate.entries.set('held-row',retained);
 aggregate.published=new Map([['held-row',retained]]);
 for(const change of [
   {scope:'different-home-and-owner',home:'D:/different-home',owner:'pc2/new-owner'},
   {owner:'pc2/new-owner'},{home:'D:/different-home'},{ownerTab:'pc2/replacement-tab'},
   {ownerPane:'pc2/replacement-pane'},{provider:'another-provider'},
 ]) {
   provider={...original,...change};
   assert.equal(aggregate.currentContext(),null,'Replacement provider identity grants no reads or actions');
   assert.equal(aggregate.currentContext({presentation:true}).scope,'verified-home');
   aggregate.sync({});assert.equal(aggregate.context.stale,true);
   assert.equal(aggregate.entries.get('held-row'),retained,'Replacement cannot clear or repopulate the held overview');
   assert.equal(aggregate.presentationRows('open')[0],retained.pr,'The held last-good row stays published');
   assert.deepEqual(plain(api.panelSource()),held);
 }
 provider=original;assert.equal(aggregate.currentContext().scope,'verified-home','Exact original provider can recover fresh authority');
 provider=null;assert.equal(aggregate.currentContext(),null);
 assert.equal(aggregate.currentContext({presentation:true}).scope,'verified-home','Absence retains only the held stale scope');
 all.shift();list.shift();assert.deepEqual(plain(api.git()),held,'Missing original identities cannot select the current agent');
 assert.equal(api.togglePanelPin(undefined,false),true);assert.equal(api.git().terminal,'local-agent');assert.equal(api.files().cwd,'/other');
 assert.equal(api.togglePanelPin(),true);assert.equal(api.panelSource().git.mode,'folder');
 provider={...original,parent:destination.id,scope:'new-coordinator-at-folder'};
 assert.equal(aggregate.currentContext(),null,'A held folder cannot become a coordinator overview');
 assert.equal(aggregate.currentContext({presentation:true}),null);
 const restart=await load(new Map());
 assert.equal(restart.panelPinned(),false);assert.equal(restart.git().terminal,'local-agent');
 assert.equal(JSON.stringify([...values]).includes('D:/held'),false,'The source is never written to shared/durable state');
 assert.equal(JSON.stringify([...values]).includes('local-agent'),false);
 assert.equal(JSON.stringify([...values]).includes('D:/crew-home'),false);
}
console.log('PASS: real Files/Git held-source switching, independent mod graphs, coordinator scope/authority, availability, missing source and unpinned restart');
