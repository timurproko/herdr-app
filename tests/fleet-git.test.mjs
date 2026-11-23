import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {projectLinkedRows} from '../src/shared/workspace-links.js';
const element=()=>{const o={kids:[],attrs:{}};let p;p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;if(k==='when')return(yes,fn)=>yes?fn(p):p;if(k==='child')return c=>{o.kids.push(c);return p;};if(k==='children')return cs=>{o.kids.push(...cs);return p;};return(...args)=>{o.attrs[k]=args;return p;};}});return p;};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
let selected={space:'coordinator',cwd:'/not-a-repository',on:null,terminal:'t1'},shown=true,failRepo=null,defer=false,pendingCI=false,bClosed=true;
const waiting=[],settingsOpened=[],noticeModes={};
let holdStatus=false,releaseStatus;
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'a'},{id:'b'},{id:'dup'}]}];
const all=[{pane:'cp',tab:'c',terminal:'t1'},...['a','b','dup'].map((id,i)=>({pane:id+'p',tab:id,terminal:'t'+(i+2)}))];
const list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},...['a','b','dup'].map((id,i)=>({address:'t'+(i+2),state:'live',labels:{'crew.task':id,'crew.home':'home','herdr.space':'fm-crew-home'}}))];
const url=repo=>`https://github.com/example/${repo}/pull/12`;
const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'a',terminal:'t2',state:'reported',pr:url('a')},{id:'b',terminal:'t3',state:'working',pr:url('b')},{id:'dup',terminal:'t4',state:'reported',pr:url('a')}]};
const calls=[],focus=[],jobs=[];const cx={notify(){},stop_propagation(){},spawn(fn){const p=Promise.resolve().then(()=>fn(cx));jobs.push(p);},timer:{every(){},after(){} }};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={closeOverlay(){},openOverlay(){},nextCommand(){return new Promise(()=>{});},shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[],checking:()=>false,
  props:()=>null,layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),settings:()=>({zoom:1}),theme:()=>({}),window:()=>({platform:'windows'}),notify(){},run:(...args)=>focus.push(args),
  hc:async args=>{assert.match(args.at(-1),/status '--json'/);if(holdStatus)await new Promise(resolve=>releaseStatus=resolve);return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(status)).toString('base64'),stderr:'',timed_out:false})};},
  exec:async(cmd,args)=>{assert.equal(cmd,'gh','Coordinator cwd must not be probed as Git');calls.push(args);if(defer)await new Promise(resolve=>waiting.push(resolve));const repo=args[args.indexOf('--repo')+1];if(repo===failRepo)return {code:1,stderr:'unreachable'};return {code:0,stdout:JSON.stringify({number:12,title:repo,url:`https://github.com/${repo}/pull/12`,state:repo==='example/b'&&bClosed?'CLOSED':'OPEN',author:{login:'fixture'},body:'',statusCheckRollup:pendingCI?[{name:'build',status:'IN_PROGRESS'}]:[]})};}};
const storage=new Map(),writes=[];
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{storage.set(key,value);writes.push(key);}};
const text=n=>typeof n==='string'?n:(n?.kids??[]).map(text).join(' ');
let websocket;
const modules={
 'space-color-state.js':{currentSpaceColor:()=>null},'main.js':'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js',
 'location.js':{location:()=>selected},'gpui-kit':{View:class{},div:element,svg:asset=>element().asset(asset),PathBuilder:{}},'gpui-base':{v_flex:element,h_flex:element,Popover:{},Input:{}},'ui.js':'src/ui/ui.js',
 'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'panel-pin.js':{panelPin:(_t,o)=>element().id(o.id)},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings:options=>settingsOpened.push(options)},'panel-state.js':{changePanel(){}},
 'panel-kit.js':{headerTool:(_t,o)=>element().id(o.id).on_click(o.onClick),contextMenu:element,tag:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},
 'webhooks.js':{GitWebhooks:class{sync(_cx,options){websocket=options;}stop(){}retryNow(){}}},'notices.js':{GitNotices:class{sync(_cx,{enabled,repository}){return enabled?noticeModes[repository]??null:null;}stop(){}retryNow(){}}},
};
const {Main,f,A,r}=await loadMod({host,modules,globals:{localStorage},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as f from "./plugins/crew/fleet.js";export * as A from "./aggregate.js";export * as r from "./plugins.js";'});
f.refreshFleets(cx,async()=>JSON.stringify(status));await drain();
const panel=new Main();panel.init({},cx);await drain();let tree=panel.render(cx);await drain();tree=panel.render(cx);
assert.equal(calls.length,2,'Duplicate task PR is fetched once');assert.equal(panel.aggregate.counts().open,1);assert.equal(panel.aggregate.counts().closed,1);
// Real aggregate Refresh/relay/render lifecycle never emits an ordinary fleet row.
const refreshFrames=[],sample=()=>{
 const projected=projectLinkedRows(groups.map(w=>({w})),r.pluginWorkspaceLinks({presentation:true}));
 refreshFrames.push(projected.find(row=>row.w.id==='fm-crew-home').linked);
 assert.equal(r.pluginSpaceTags(groups[1]).length,0);assert.equal(r.pluginSpaceTags(groups[0])[0].label,'Crew');
};
holdStatus=true;sample();panel.aggregate.refresh(cx);for(let i=0;i<20;i++)await Promise.resolve();sample();
all.push({pane:'unrelated',tab:'c',terminal:'t9'});selected={...selected,terminal:'t2'};panel.render(cx);sample();
websocket.onChange({repository:'example/a'},cx);panel.render(cx);sample();
releaseStatus();holdStatus=false;await drain();panel.render(cx);sample();all.pop();selected={...selected,terminal:'t1'};
assert.ok(refreshFrames.every(Boolean),'Refresh, relay and focus/topology changes preserve every sidebar projection');tree=panel.render(cx);
assert.ok(find(tree,'pr-example/a#12'));assert.equal(find(tree,'pr-example/b#12'),undefined);assert.equal(find(tree,'git-task-incomplete'),undefined);assert.equal(find(tree,'active-pull'),undefined);
assert.doesNotMatch(text(tree),/Recorded task PRs|possibly incomplete until tasks report/);
assert.ok(find(tree,'git-actions'));assert.ok(find(tree,'git-views'));
const header=(repo,root=tree)=>find(root,`task-repo-header-example/${repo}`);
const counts=(repo,root=tree)=>text(find(root,`task-repo-counts-example/${repo}`));
const toggle=repo=>{header(repo).attrs.on_click[0]({},cx);tree=panel.render(cx);};
assert.ok(find(tree,'task-repo-body-example/a'));assert.ok(find(tree,'task-repo-body-example/b'),'Default expanded, including a zero-row current tab');
assert.equal(counts('a'),'Open 1 · Closed 0');assert.equal(counts('b'),'Open 0 · Closed 1');
const aHeader=header('a');assert.equal(aHeader.attrs.h[0],28);assert.equal(aHeader.attrs.pr[0],4);assert.equal(aHeader.kids.at(-1).attrs.size[0],16);
assert.match(aHeader.kids.at(-1).kids[0].attrs.asset[0],/chevron-down.svg$/);assert.equal(aHeader.attrs.accessibility_label[0],'Collapse example/a');
let foldCalls=calls.length;const foldWrites=writes.length;
toggle('a');assert.equal(find(tree,'pr-example/a#12'),undefined);assert.ok(find(tree,'task-repo-body-example/b'));assert.equal(counts('a'),'Open 1 · Closed 0');
assert.match(header('a').kids.at(-1).kids[0].attrs.asset[0],/chevron-right.svg$/);assert.equal(header('a').attrs.accessibility_label[0],'Expand example/a');
assert.equal(find(tree,'git-task-empty'),undefined,'All open PRs hidden by folding is not an empty data set');
assert.equal(calls.length,foldCalls,'Folding does no GitHub read');assert.deepEqual(writes.slice(foldWrites),['custom.git.task-repositories.folded']);
assert.deepEqual(JSON.parse(storage.get('custom.git.task-repositories.folded')),['example/a']);
toggle('b');assert.equal(find(tree,'task-repo-body-example/b'),undefined);assert.ok(header('a'));assert.ok(header('b'));assert.equal(find(tree,'git-task-empty'),undefined);
panel.setView('closed',cx);tree=panel.render(cx);assert.equal(find(tree,'task-repo-body-example/a'),undefined);assert.equal(find(tree,'task-repo-body-example/b'),undefined,'Tab switches preserve independent folds');
// A recreated panel restores local state without loading a new source or altering preferences.
const restored=new Main();restored.init({},cx);await drain();restored.render(cx);await drain();const restoredTree=restored.render(cx);
assert.equal(find(restoredTree,'task-repo-body-example/a'),undefined);assert.equal(find(restoredTree,'task-repo-body-example/b'),undefined);assert.equal(counts('b',restoredTree),'Open 0 · Closed 1');restored.close();
// Restore original panel presentation; both toggles are independent and only affect UI.
toggle('a');toggle('b');panel.setView('open',cx);tree=panel.render(cx);
assert.equal(state['custom.spaces.preferences'].connectFleetToCoordinator,true);
panel.setView('closed',cx);tree=panel.render(cx);assert.ok(find(tree,'pr-example/b#12'));assert.equal(find(tree,'pr-example/a#12'),undefined);
find(tree,'pr-agent-example/b#12').attrs.on_click[0]({},cx);assert.deepEqual(JSON.parse(JSON.stringify(focus.at(-1))),['agent.focus',{terminal:'t3'}]);
const captured=find(tree,'pr-agent-example/b#12');list[2].state='finished';captured.attrs.on_click[0]({},cx);assert.equal(focus.length,1,'Removed worker cannot be focused by stale callback');list[2].state='live';
const stableCalls=calls.length;for(let i=0;i<4;i++)panel.render(cx);await drain();assert.equal(calls.length,stableCalls,'Local context refresh does not poll GitHub facts');
tree=panel.render(cx);toggle('b');const vanishedHeader=header('b'),savedAbsentFolds=storage.get('custom.git.task-repositories.folded');
status.tasks[1].pr=null;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.render(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,0,'Null recorded links are not guessed from branches');assert.equal(find(panel.render(cx),'task-repo-example/b'),undefined);vanishedHeader.attrs.on_click[0]({},cx);assert.equal(storage.get('custom.git.task-repositories.folded'),savedAbsentFolds,'Removed repository headers cannot change saved folds');
status.tasks[1].pr=url('b');f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.render(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,1,'A newly recorded link enters without changing coordinator cwd');tree=panel.render(cx);assert.ok(header('b'));assert.equal(find(tree,'task-repo-body-example/b'),undefined,'A temporarily absent repository keeps its fold');toggle('b');
failRepo='example/b';panel.aggregate.refresh(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,1,'A read failure retains same-binding facts');assert.ok([...panel.aggregate.entries.values()].find(e=>e.link.repo===failRepo).error);
noticeModes['example/b']='repository';tree=panel.render(cx);assert.ok(find(tree,'task-error-example/b#12'));assert.ok(find(tree,'git-live-ci-example/b-settings'));
toggle('b');assert.equal(find(tree,'task-error-example/b#12'),undefined);assert.equal(find(tree,'git-live-ci-example/b-settings'),undefined);assert.equal(counts('b'),'Open 0 · Closed 1');
failRepo=null;bClosed=false;panel.aggregate.refresh(cx);await drain();tree=panel.render(cx);
assert.equal(counts('b'),'Open 1 · Closed 0','Counts update while folded');assert.equal(panel.aggregate.counts().open,2);assert.equal(find(tree,'task-repo-body-example/b'),undefined);
bClosed=true;panel.aggregate.refresh(cx);await drain();tree=panel.render(cx);toggle('b');assert.ok(find(tree,'git-live-ci-example/b-settings'),'Reopening restores scoped body notices');delete noticeModes['example/b'];
assert.equal(A.taskPullLink('https://github.com/example/a/pull/12').key,'example/a#12');for(const bad of ['https://evil.test/a/b/pull/12','https://github.com/a/b/pull/0','https://github.com/a/b/pull/1?x=1'])assert.equal(A.taskPullLink(bad),null);
// The same authenticated subscription routes only relevant repositories, coalescing bursts.
failRepo=null;pendingCI=true;defer=true;
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
let before=calls.length;websocket.onChange({repository:'elsewhere/repo'},cx);await tick();assert.equal(calls.length,before);
websocket.onChange({repository:'example/a'},cx);await tick();assert.equal(calls.length,before+1);
websocket.onChange({repository:'example/a'},cx);websocket.onChange({repository:'example/a'},cx);await tick();assert.equal(calls.length,before+1);
waiting.shift()();await tick();assert.equal(calls.length,before+2,'A burst produces only one coalesced follow-up');waiting.shift()();await drain();assert.ok(panel.ciSweep,'Task-linked running CI uses the header sweep');
noticeModes['example/b']='repository';tree=panel.render(cx);find(tree,'git-live-ci-example/b-settings').attrs.on_click[0]({},cx);assert.equal(settingsOpened.at(-1).pluginSearch,'example/b');assert.equal(settingsOpened.at(-1).pluginSection,'repository');
// Hide/disable invalidates in-flight writes and starts no follow-up or polling.
before=calls.length;panel.aggregate.refresh(cx);await tick();shown=false;panel.render(cx);while(waiting.length)waiting.shift()();await drain();assert.equal(calls.length,before+2);assert.equal(websocket.enabled,false);assert.equal(panel.aggregate.busy,false);
shown=true;defer=false;panel.render(cx);await drain();assert.equal(calls.length,before+4,'Showing again catches up both linked repositories');
before=calls.length;websocket.onChange(null,cx);await drain();assert.equal(calls.length,before+2,'Socket ready/reconnect catches up all task repositories');
noticeModes['example/a']='setup';noticeModes['example/b']='setup';tree=panel.render(cx);assert.ok(find(tree,'git-live-ci-footer'));assert.equal(find(tree,'git-live-ci-example/b-footer'),undefined,'Missing global setup has one shared prompt, not per-repository enrollment');
// A slow old context cannot publish after the preference or selected space changes.
const staleHeader=header('a',tree),savedFolds=storage.get('custom.git.task-repositories.folded');
defer=true;before=calls.length;panel.aggregate.refresh(cx);await tick();selected={...selected,space:'other'};staleHeader.attrs.on_click[0]({},cx);assert.equal(storage.get('custom.git.task-repositories.folded'),savedFolds,'Stale headers cannot change fold state after context replacement');assert.equal(panel.aggregate.currentContext(),null);assert.equal(panel.aggregate.sync(cx),false);while(waiting.length)waiting.shift()();await drain();assert.equal(calls.length,before+2,'Old context starts no follow-up reads');assert.equal(panel.aggregate.entries.size,0,'Old replies cannot populate another selected space');captured.attrs.on_click[0]({},cx);assert.equal(focus.length,1);
state['custom.spaces.preferences'].connectFleetToCoordinator=false;assert.equal(panel.aggregate.sync(cx),false);
console.log('PASS coordinator non-repo routing, recorded source, working/reported inclusion, cross-repo identity, grouped counts, no active pin, scoped errors and exact worker navigation');
