import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const element=()=>{const o={kids:[],attrs:{}};let p;p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;if(k==='when')return(yes,fn)=>yes?fn(p):p;if(k==='child')return c=>{o.kids.push(c);return p;};if(k==='children')return cs=>{o.kids.push(...cs);return p;};return(...args)=>{o.attrs[k]=args;return p;};}});return p;};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
let selected={space:'coordinator',cwd:'/not-a-repository',on:null,terminal:'t1'},shown=true,failRepo=null,defer=false,pendingCI=false;
const waiting=[],settingsOpened=[],noticeModes={};
let assignedLabels=[{name:'🤖 Under review',color:'840479'}];
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'a'},{id:'b'},{id:'dup'}]}];
const all=[{pane:'cp',tab:'c',terminal:'t1'},...['a','b','dup'].map((id,i)=>({pane:id+'p',tab:id,terminal:'t'+(i+2)}))];
const list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},...['a','b','dup'].map((id,i)=>({address:'t'+(i+2),state:'live',labels:{'crew.task':id,'crew.home':'home','herdr.space':'fm-crew-home'}}))];
const url=repo=>`https://github.com/example/${repo}/pull/12`;
const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'a',terminal:'t2',state:'reported',pr:url('a')},{id:'b',terminal:'t3',state:'working',pr:url('b')},{id:'dup',terminal:'t4',state:'reported',pr:url('a')}]};
const calls=[],focus=[],jobs=[];const cx={notify(){},stop_propagation(){},spawn(fn){const p=Promise.resolve().then(()=>fn(cx));jobs.push(p);},timer:{every(){},after(){} }};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={closeOverlay(){},openOverlay(){},nextCommand(){return new Promise(()=>{});},shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[],checking:()=>false,
  props:()=>null,layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),settings:()=>({zoom:1}),theme:()=>({}),window:()=>({platform:'windows'}),notify(){},run:(...args)=>focus.push(args),
  hc:async args=>{assert.match(args.at(-1),/status '--json'/);return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(status)).toString('base64'),stderr:'',timed_out:false})};},
  exec:async(cmd,args)=>{assert.equal(cmd,'gh','Coordinator cwd must not be probed as Git');calls.push(args);if(defer)await new Promise(resolve=>waiting.push(resolve));const repo=args[args.indexOf('--repo')+1];if(repo===failRepo)return {code:1,stderr:'unreachable'};return {code:0,stdout:JSON.stringify({number:12,title:repo,url:`https://github.com/${repo}/pull/12`,state:repo==='example/b'?'CLOSED':'OPEN',author:{login:'fixture'},body:'',labels:assignedLabels,statusCheckRollup:pendingCI?[{name:'build',status:'IN_PROGRESS'}]:[]})};}};
const ui={U:{row:28,section:36,control:28,insetControl:24,gutter:8,gap:8,rowGap:2,font:12,meta:11,icon:16,tinyIcon:12,radius:6,insetRadius:4},headerTools:e=>e,reveal:e=>e,subtleActionFill:()=>'',refreshButton:(_t,opts)=>element().id(opts.id).on_click(opts.onClick)};
let websocket;
const modules={
 'space-color-state.js':{currentSpaceColor:()=>null},'main.js':'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js',
 'location.js':{location:()=>selected},'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},'gpui-base':{v_flex:element,h_flex:element},'ui.js':ui,
 'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'panel-pin.js':{panelPin:(_t,o)=>element().id(o.id)},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings:options=>settingsOpened.push(options)},'panel-state.js':{changePanel(){}},
 'panel-kit.js':{headerTool:(_t,o)=>element().id(o.id).on_click(o.onClick),contextMenu:element,tag:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},
 'webhooks.js':{GitWebhooks:class{sync(_cx,options){websocket=options;}stop(){}retryNow(){}}},'notices.js':{GitNotices:class{sync(_cx,{enabled,repository}){return enabled?noticeModes[repository]??null:null;}stop(){}retryNow(){}}},
};
const {Main,f,A}=await loadMod({host,modules,globals:{localStorage:{getItem(){return null;},setItem(){}}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as f from "./plugins/crew/fleet.js";export * as A from "./aggregate.js";'});
f.refreshFleets(cx,async()=>JSON.stringify(status));await drain();
const panel=new Main();panel.init({},cx);await drain();let tree=panel.render(cx);await drain();tree=panel.render(cx);
assert.equal(calls.length,2,'Duplicate task PR is fetched once');
assert.ok(calls.every(args=>args.at(-1).split(',').includes('labels')));
assert.equal(panel.aggregate.rows('open')[0].labels[0].name,'🤖 Under review');assert.equal(panel.aggregate.counts().open,1);assert.equal(panel.aggregate.counts().closed,1);
assert.ok(find(tree,'pr-example/a#12'));assert.ok(find(tree,'pr-labels-example/a#12'));assert.equal(find(tree,'pr-example/b#12'),undefined);assert.ok(find(tree,'git-task-incomplete'));assert.equal(find(tree,'active-pull'),undefined);
panel.setView('closed',cx);tree=panel.render(cx);assert.ok(find(tree,'pr-example/b#12'));assert.ok(find(tree,'pr-labels-example/b#12'));assert.equal(find(tree,'pr-example/a#12'),undefined);
find(tree,'pr-agent-example/b#12').attrs.on_click[0]({},cx);assert.deepEqual(JSON.parse(JSON.stringify(focus.at(-1))),['agent.focus',{terminal:'t3'}]);
const captured=find(tree,'pr-agent-example/b#12');list[2].state='finished';captured.attrs.on_click[0]({},cx);assert.equal(focus.length,1,'Removed worker cannot be focused by stale callback');list[2].state='live';
for(let i=0;i<4;i++)panel.render(cx);await drain();assert.equal(calls.length,2,'Local context refresh does not poll GitHub facts');
status.tasks[1].pr=null;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.render(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,0,'Null recorded links are not guessed from branches');
status.tasks[1].pr=url('b');f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.render(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,1,'A newly recorded link enters without changing coordinator cwd');
failRepo='example/b';panel.aggregate.refresh(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,1,'A read failure retains same-binding facts');assert.ok([...panel.aggregate.entries.values()].find(e=>e.link.repo===failRepo).error);
assert.equal(A.taskPullLink('https://github.com/example/a/pull/12').key,'example/a#12');for(const bad of ['https://evil.test/a/b/pull/12','https://github.com/a/b/pull/0','https://github.com/a/b/pull/1?x=1'])assert.equal(A.taskPullLink(bad),null);
// The same authenticated subscription routes only relevant repositories, coalescing bursts.
failRepo=null;pendingCI=true;defer=true;
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
let before=calls.length;websocket.onChange({repository:'elsewhere/repo'},cx);await tick();assert.equal(calls.length,before);
websocket.onChange({repository:'example/a'},cx);await tick();assert.equal(calls.length,before+1);
websocket.onChange({repository:'example/a'},cx);websocket.onChange({repository:'example/a'},cx);await tick();assert.equal(calls.length,before+1);
waiting.shift()();await tick();assert.equal(calls.length,before+2,'A burst produces only one coalesced follow-up');waiting.shift()();await drain();assert.ok(panel.ciSweep,'Task-linked running CI uses the header sweep');
noticeModes['example/b']='repository';tree=panel.render(cx);find(tree,'git-live-ci-example/b-settings').attrs.on_click[0]({},cx);assert.equal(settingsOpened.at(-1).pluginSearch,'example/b');assert.equal(settingsOpened.at(-1).pluginSection,'repository');
// Label add/remove invalidates the same targeted reads in both tabs.
defer=false;pendingCI=false;
for(const action of ['unlabeled','labeled']) {
  assignedLabels=action==='labeled'?[{name:'🤖 Under review',color:'840479'}]:[];
  const beforeLabels=calls.length;
  for(const repository of ['example/a','example/b'])websocket.onChange({repository,event:'pull_request',action},cx);
  await drain();assert.equal(calls.length,beforeLabels+2);
  for(const tab of ['open','closed'])assert.equal(panel.aggregate.rows(tab)[0].labels.length,assignedLabels.length);
}
defer=true;
// Hide/disable invalidates in-flight writes and starts no follow-up or polling.
before=calls.length;panel.aggregate.refresh(cx);await tick();shown=false;panel.render(cx);while(waiting.length)waiting.shift()();await drain();assert.equal(calls.length,before+2);assert.equal(websocket.enabled,false);assert.equal(panel.aggregate.busy,false);
shown=true;defer=false;panel.render(cx);await drain();assert.equal(calls.length,before+4,'Showing again catches up both linked repositories');
before=calls.length;websocket.onChange(null,cx);await drain();assert.equal(calls.length,before+2,'Socket ready/reconnect catches up all task repositories');
noticeModes['example/a']='setup';noticeModes['example/b']='setup';tree=panel.render(cx);assert.ok(find(tree,'git-live-ci-footer'));assert.equal(find(tree,'git-live-ci-example/b-footer'),undefined,'Missing global setup has one shared prompt, not per-repository enrollment');
// A slow old context cannot publish after the preference or selected space changes.
defer=true;before=calls.length;panel.aggregate.refresh(cx);await tick();selected={...selected,space:'other'};assert.equal(panel.aggregate.currentContext(),null);assert.equal(panel.aggregate.sync(cx),false);while(waiting.length)waiting.shift()();await drain();assert.equal(calls.length,before+2,'Old context starts no follow-up reads');assert.equal(panel.aggregate.entries.size,0,'Old replies cannot populate another selected space');captured.attrs.on_click[0]({},cx);assert.equal(focus.length,1);
state['custom.spaces.preferences'].connectFleetToCoordinator=false;assert.equal(panel.aggregate.sync(cx),false);
console.log('PASS coordinator non-repo routing, recorded source, working/reported inclusion, cross-repo identity, grouped counts, no active pin, scoped errors and exact worker navigation');
