import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {projectLinkedRows} from '../src/shared/workspace-links.js';
const element=()=>{const o={kids:[],attrs:{}};let p;p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;if(k==='when')return(yes,fn)=>yes?fn(p):p;if(k==='child')return c=>{o.kids.push(c);return p;};if(k==='children')return cs=>{o.kids.push(...cs);return p;};return(...args)=>{o.attrs[k]=args;return p;};}});return p;};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
let selected={space:'coordinator',cwd:'/not-a-repository',on:null,terminal:'t1'},shown=true,failRepo=null,defer=false,pendingCI=false,bClosed=true;
const waiting=[],settingsOpened=[],noticeModes={};
let holdStatus=false,releaseStatus,failStatus=false,now=Date.now();
let assignedLabels=[{name:'🤖 Under review',color:'840479'}];
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'a'},{id:'b'},{id:'dup'}]}];
const all=[{pane:'cp',tab:'c',terminal:'t1'},...['a','b','dup'].map((id,i)=>({pane:id+'p',tab:id,terminal:'t'+(i+2)}))];
const list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},...['a','b','dup'].map((id,i)=>({address:'t'+(i+2),state:'live',labels:{'crew.task':id,'crew.home':'home','herdr.space':'fm-crew-home'}}))];
const url=repo=>`https://github.com/example/${repo}/pull/12`;
const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'a',terminal:'t2',state:'reported',pr:url('a')},{id:'b',terminal:'t3',state:'working',pr:url('b')},{id:'dup',terminal:'t4',state:'reported',pr:url('a')}]};
let rendering=false;
const calls=[],focus=[],jobs=[];const cx={notify(){assert.equal(rendering,false,'No synchronous notify from fleet render');},stop_propagation(){},spawn(fn){const p=Promise.resolve().then(()=>fn(cx));jobs.push(p);},timer:{every(){},after(){} }};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={closeOverlay(){},openOverlay(){},nextCommand(){return new Promise(()=>{});},shared:k=>state[k],setShared:(k,v)=>{assert.equal(rendering,false,'No shared-state writes from fleet render');state[k]=v;},spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:'ready'}],checking:()=>false,
  props:()=>null,layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),settings:()=>({zoom:1}),theme:()=>({}),window:()=>({platform:'windows'}),notify(){},run:(...args)=>focus.push(args),
  hc:async args=>{assert.equal(rendering,false,'Status reads yield out of render');if(failStatus)throw Error('Crew status unavailable');assert.match(args.at(-1),/status '--all' '--json'/);if(holdStatus)await new Promise(resolve=>releaseStatus=resolve);return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(status)).toString('base64'),stderr:'',timed_out:false})};},
  exec:async(cmd,args)=>{assert.equal(rendering,false,'GitHub reads never start during render');assert.equal(cmd,'gh','Coordinator cwd must not be probed as Git');calls.push(args);if(defer)await new Promise(resolve=>waiting.push(resolve));const repo=args[args.indexOf('--repo')+1];if(repo===failRepo)return {code:1,stderr:'unreachable'};return {code:0,stdout:JSON.stringify({number:12,title:repo,url:`https://github.com/${repo}/pull/12`,state:repo==='example/b'&&bClosed?'CLOSED':'OPEN',author:{login:'fixture'},body:'',labels:assignedLabels,statusCheckRollup:pendingCI?[{name:'build',status:'IN_PROGRESS'}]:[]})};}};
const storage=new Map(),writes=[];
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{storage.set(key,value);writes.push(key);}};
const text=n=>typeof n==='string'?n:(n?.kids??[]).map(text).join(' ');
let websocket;
const modules={
 'space-color-state.js':{currentSpaceColor:()=>null},'main.js':'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js',
 'location.js':{location:()=>selected},'gpui-kit':{View:class{},div:element,svg:asset=>element().asset(asset),PathBuilder:{}},'gpui-base':{v_flex:element,h_flex:element,Popover:{},Input:{}},'ui.js':'src/ui/ui.js',
 'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'panel-pin.js':{panelPin:(_t,o)=>element().id(o.id)},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings:options=>settingsOpened.push(options)},'panel-state.js':{changePanel(){}},
 'panel-kit.js':{headerTool:(_t,o)=>element().id(o.id).on_click(o.onClick),contextMenu:element,tag:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},
 'relay-consumer.js':'src/plugins/git/mod/webhooks.js',
 'webhooks.js':{GitWebhooks:class{sync(_cx,options){websocket=options;}stop(){}retryNow(){}}},'notices.js':{GitNotices:class{sync(_cx,{enabled,repository}){return enabled?noticeModes[repository]??null:null;}stop(){}retryNow(){}}},
};
const {Main,f,A,r,GitWebhooks}=await loadMod({host,modules,globals:{URL,localStorage,Date:class extends Date{static now(){return now;}}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as f from "./plugins/crew/fleet.js";export * as A from "./aggregate.js";export * as r from "./plugins.js";export {GitWebhooks} from "./relay-consumer.js";'});
f.refreshFleets(cx,async()=>JSON.stringify(status));await drain();
const panel=new Main();panel.init({},cx);await drain();let tree=panel.render(cx);await drain();tree=panel.render(cx);
assert.equal(calls.length,2,'Duplicate task PR is fetched once');assert.equal(panel.aggregate.counts().open,1);assert.equal(panel.aggregate.counts().closed,1);
assert.ok(calls.every(args=>args.at(-1).split(',').includes('labels')));assert.equal(panel.aggregate.rows('open')[0].labels[0].name,'🤖 Under review');
assert.ok(find(tree,'pr-labels-example/a#12'),'Coordinator rows use the shared labels row');
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
const counts=(repo,root=tree)=>find(root,`task-repo-counts-example/${repo}`).kids.map(child=>child.attrs?.size?.[0]===3?'·':text(child)).join(' ');
const toggle=repo=>{header(repo).attrs.on_click[0]({},cx);tree=panel.render(cx);};
assert.ok(find(tree,'task-repo-body-example/a'));assert.ok(find(tree,'task-repo-body-example/b'),'Default expanded, including a zero-row current tab');
assert.equal(counts('a'),'Open 1 · Closed 0');assert.equal(counts('b'),'Open 0 · Closed 1');
const countStrip=find(tree,'task-repo-counts-example/a');assert.equal(countStrip.attrs.gap[0],6);assert.ok(countStrip.attrs.items_center);assert.equal(countStrip.kids[1].attrs.size[0],3);assert.ok(countStrip.kids[1].attrs.rounded_full,'Collapsible sections reuse the shared metadata separator');
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
panel.setView('closed',cx);tree=panel.render(cx);assert.ok(find(tree,'pr-example/b#12'));assert.ok(find(tree,'pr-labels-example/b#12'));assert.equal(find(tree,'pr-example/a#12'),undefined);
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
// The actual relay consumer is called by render, not an asynchronous socket.
// Exercise the real fleet callback/sweep under an immediate-spawn render guard.
const savedWebhooks=panel.webhooks;panel.webhooks=new GitWebhooks();defer=false;
state['custom.plugins'].git.settings={relay:'https://relay.test'};
const relayState=state['custom.git.relay-runtime']={scope:'fleet-render',status:'connected',ready:1,repositories:{'example/a':{revision:1}}};
const renderCx={...cx,spawn:fn=>jobs.push(fn(renderCx))};
const renderSync=()=>{rendering=true;try{panel.syncTaskWebhooks(renderCx);}finally{rendering=false;}};
assert.ok(panel.aggregate.rows('open')[0].checks.pending>0);panel.ciSweep=null;
before=calls.length;renderSync();
assert.equal(calls.length,before,'fleet render must not start GitHub reads');assert.equal(panel.ciSweep,null,'fleet render must not arm a sweep synchronously');
await drain();assert.equal(calls.length,before+2);assert.ok(panel.ciSweep,'deferred delivery still arms the native sweep');
// A new revision and repeated renders coalesce into one deferred refresh.
panel.ciSweep=null;relayState.repositories['example/a'].revision++;
before=calls.length;renderSync();renderSync();renderSync();assert.equal(calls.length,before);
await drain();assert.equal(calls.length,before+2);assert.ok(panel.ciSweep);
// Disable/hide/context changes between render and delivery cannot start work.
for(const change of ['disable','hide','context']){
 panel.ciSweep=null;relayState.repositories['example/a'].revision++;before=calls.length;renderSync();
 const context=panel.context;
 if(change==='disable')state['custom.plugins'].git.enabled=false;
 if(change==='hide')shown=false;
 if(change==='context')panel.context='tasks:replaced';
 await drain();assert.equal(calls.length,before,`${change} cancels queued fleet delivery`);assert.equal(panel.ciSweep,null);
 state['custom.plugins'].git.enabled=true;shown=true;panel.context=context;panel.webhooks.stop();
}
panel.webhooks=savedWebhooks;defer=true;
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
// Long status outages retain rows/folds with an explicit stale state, never IO or robots.
failStatus=true;now+=2*86400000;defer=false;const staleCalls=calls.length,foldBefore=panel.foldedRepositories.has('example/a'),countsBefore=JSON.stringify(panel.aggregate.counts());
const lastRobot=find(tree,'pr-agent-example/b#12'),lateRelay=websocket.onChange;
rendering=true;try{tree=panel.render(renderCx);}finally{rendering=false;}
assert.equal(find(tree,'git-task-stale').kids[0],'Stale');assert.ok(find(tree,'pr-example/b#12'));assert.equal(find(tree,'pr-agent-example/b#12'),undefined);assert.equal(JSON.stringify(panel.aggregate.counts()),countsBefore);sample();
assert.equal(websocket.enabled,false,'Stale presentation cannot subscribe for task reads');assert.equal(panel.ciSweep,null);
lastRobot.attrs.on_click[0]({},cx);lateRelay({repository:'example/a'},cx);panel.aggregate.refresh(cx);await drain();assert.equal(calls.length,staleCalls);assert.equal(focus.length,1,'Stale callbacks cannot navigate');
toggle('a');assert.equal(panel.foldedRepositories.has('example/a'),!foldBefore);assert.equal(calls.length,staleCalls,'Read-only folding still works while verification is unavailable');
// A cold controller/module gets the attached first frame, but no persisted PR inventory or authority.
const coldState=JSON.parse(JSON.stringify(state));delete coldState[f.FLEET_KEY];
const cold=await loadMod({host:{...host,shared:k=>coldState[k],setShared:(k,v)=>{assert.equal(rendering,false);coldState[k]=v;}},modules,globals:{URL,localStorage,Date:class extends Date{static now(){return now;}}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as r from "./plugins.js";'});
const coldPanel=new cold.Main();coldPanel.init({},cx);const first=coldPanel.render(cx);
assert.equal(find(first,'git-task-stale').kids[0],'Verifying');assert.equal(find(first,'git-task-empty').kids[0],'Waiting for fleet verification');assert.equal(coldPanel.aggregate.entries.size,0);assert.equal(cold.r.pluginWorkspaceLinks({presentation:true}).length,1);
await drain();assert.equal(calls.length,staleCalls);coldPanel.close();
// Fresh same-home verification restores reads/robots, not a new folder/pin context.
failStatus=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
assert.equal(find(tree,'git-task-stale'),undefined);assert.ok(find(tree,'pr-agent-example/b#12'));assert.equal(panel.foldedRepositories.has('example/a'),!foldBefore);assert.equal(JSON.stringify(panel.aggregate.counts()),countsBefore);toggle('a');defer=true;
// Finished workers leave an extant fleet, but successful owner membership moves
// must refresh the retained display before a later status outage uses its scope.
defer=false;bClosed=false;for(const task of status.tasks)task.state='closed';for(const worker of list.slice(1))worker.state='finished';all.splice(1);groups[1].tabs=[];
const priorDisplay=f.fleetContexts({presentation:true})[0];
f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();
for(const [ownerTab,ownerPane] of [['c','cp-moved'],['c-moved','cp-moved-again']]) {
 groups[0].tabs=[{id:ownerTab}];all[0].tab=ownerTab;all[0].pane=ownerPane;failStatus=false;
 f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.setView('open',cx);tree=panel.render(cx);await drain();tree=panel.render(cx);
 const verified=r.pluginPullContext('coordinator'),scope=verified.scope,entries=[...panel.aggregate.entries.values()],savedCounts=JSON.stringify(panel.aggregate.counts()),reads=calls.length;
 assert.equal(verified.child,null);assert.equal(verified.ownerTab,ownerTab);assert.equal(verified.ownerPane,ownerPane);assert.equal(entries.length,2);
 failStatus=true;now+=31000;tree=panel.render(cx);await drain();tree=panel.render(cx);
 assert.equal(panel.aggregate.entries.size,2,'Verified owner membership must not revert to an older stale scope and clear loaded PRs');
 assert.equal(panel.aggregate.context.scope,scope);assert.equal(JSON.stringify(panel.aggregate.counts()),savedCounts);assert.ok(find(tree,'pr-example/a#12'));assert.ok(find(tree,'pr-example/b#12'));assert.ok(find(tree,'git-task-stale'));
 assert.ok(entries.every(entry=>panel.aggregate.entries.get(entry.link.key)===entry));assert.equal(calls.length,reads,'Retained scope grants no new GitHub reads');assert.equal(r.pluginPullContext('coordinator'),null);assert.equal(find(tree,'pr-agent-example/b#12'),undefined);captured.attrs.on_click[0]({},cx);assert.equal(focus.length,1);
 const display=f.fleetContexts({presentation:true})[0];
 for(const field of ['machine','parent','home','owner','ownerTab','ownerPane'])assert.equal(display[field],verified[field],`${field} comes from successful verification`);
 for(const field of ['child','adoption'])assert.equal(display[field],priorDisplay[field],`${field} retains the extant fleet identity`);
 assert.equal(display.pullScope,scope);assert.equal(display.binding,JSON.stringify([...JSON.parse(scope),display.child]));
}
failStatus=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
// A slow old context cannot publish after the preference or selected space changes.
const staleHeader=header('a',tree),savedFolds=storage.get('custom.git.task-repositories.folded');
defer=true;before=calls.length;panel.aggregate.refresh(cx);await tick();selected={...selected,space:'other'};staleHeader.attrs.on_click[0]({},cx);assert.equal(storage.get('custom.git.task-repositories.folded'),savedFolds,'Stale headers cannot change fold state after context replacement');assert.equal(panel.aggregate.currentContext(),null);assert.equal(panel.aggregate.sync(cx),false);while(waiting.length)waiting.shift()();await drain();assert.equal(calls.length,before+2,'Old context starts no follow-up reads');assert.equal(panel.aggregate.entries.size,0,'Old replies cannot populate another selected space');captured.attrs.on_click[0]({},cx);assert.equal(focus.length,1);
state['custom.spaces.preferences'].connectFleetToCoordinator=false;assert.equal(panel.aggregate.sync(cx),false);
console.log('PASS coordinator non-repo routing, recorded source, working/reported inclusion, cross-repo identity, grouped counts, no active pin, scoped errors and exact worker navigation');
