import assert from 'node:assert/strict';
import {legacyTargetResponses} from './support/github-read.mjs';
import {loadMod} from '../tools/plugin-harness.mjs';
import {projectLinkedRows} from '../src/shared/workspace-links.js';
const element=()=>{const o={kids:[],attrs:{}};let p;p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;if(k==='when')return(yes,fn)=>yes?fn(p):p;if(k==='child')return c=>{o.kids.push(c);return p;};if(k==='children')return cs=>{o.kids.push(...cs);return p;};return(...args)=>{o.attrs[k]=args;return p;};}});return p;};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:[...(n?.kids??[]),...(n?.attrs?.trigger??[]),...(n?.attrs?.content??[])].map(c=>find(c,id)).find(Boolean);
const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
let selected={space:'coordinator',cwd:'/not-a-repository',on:null,terminal:'t1'},shown=true,failRepo=null,defer=false,pendingCI=false,bClosed=true;
const waiting=[],settingsOpened=[],noticeModes={};
let holdStatus=false,releaseStatus,failStatus=false,now=Date.now();
let checkFacts=null;
let assignedLabels=[{name:'🤖 Under review',color:'840479'}];
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'a'},{id:'b'},{id:'dup'}]}];
const all=[{pane:'cp',tab:'c',terminal:'t1'},...['a','b','dup'].map((id,i)=>({pane:id+'p',tab:id,terminal:'t'+(i+2)}))];
const list=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},...['a','b','dup'].map((id,i)=>({address:'t'+(i+2),state:'live',labels:{'crew.task':id,'crew.home':'home','herdr.space':'fm-crew-home',...(i===1?{'crew.space.version':'1','crew.space.mode':'combined','crew.space.project':'b'}:{})}}))];
const url=repo=>`https://github.com/example/${repo}/pull/12`;
const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'a',terminal:'t2',state:'reported',pr:url('a')},{id:'b',terminal:'t3',state:'working',pr:url('b')},{id:'dup',terminal:'t4',state:'reported',pr:url('a')}]};
let rendering=false,lifecycle,consumerRegistry;
const calls=[],focus=[],jobs=[];const cx={focus_handle(){assert.equal(rendering,false,'Never create a focus handle inside render');return {};},notify(){assert.equal(rendering,false,'No synchronous notify from fleet render');},stop_propagation(){},spawn(fn){const p=Promise.resolve().then(()=>fn(cx));jobs.push(p);},timer:{every(){},after(){} }};
const drain=async()=>{for(let pass=0;pass<3;pass++){for(let i=0;i<30;i++)await Promise.resolve();while(jobs.length)await Promise.all(jobs.splice(0));}};
const host={closeOverlay(){},openOverlay(){},nextCommand(){return new Promise(()=>{});},shared:k=>state[k],setShared:(k,v)=>{assert.equal(rendering,false,'No shared-state writes from fleet render');state[k]=v;if(k==='custom.fleet.request'&&v&&lifecycle)Promise.resolve().then(()=>lifecycle.pluginEvent('spaces.refresh',{cx}));if(k==='custom.fleet.reads'&&consumerRegistry)consumerRegistry.pluginWorkspaceLinks({presentation:true});},spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:'ready'}],checking:()=>false,
  props:()=>null,layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),settings:()=>({zoom:1}),theme:()=>({}),window:()=>({platform:'windows'}),notify(){},run:(...args)=>focus.push(args),
  hc:async args=>{assert.equal(rendering,false,'Status reads yield out of render');if(failStatus)throw Error('Crew status unavailable');assert.match(args.at(-1),/status '--all' '--json'/);if(holdStatus)await new Promise(resolve=>releaseStatus=resolve);return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(status)).toString('base64'),stderr:'',timed_out:false})};},
  exec:async(cmd,args)=>{assert.equal(rendering,false,'GitHub reads never start during render');if(cmd==='git'){assert.equal(state['custom.spaces.preferences'].connectFleetToCoordinator,false,'Enabled coordinator verification must never probe its non-repository cwd');return {code:128,stdout:'',stderr:'fatal: not a git repository'};}assert.equal(cmd,'gh','Coordinator cwd must not be probed as Git');calls.push(args);const capturedChecks=checkFacts??(pendingCI?[{name:'build',status:'IN_PROGRESS'}]:[]);if(defer)await new Promise(resolve=>waiting.push(resolve));const repo=args[args.indexOf('--repo')+1];if(repo===failRepo)return {code:1,stderr:'unreachable'};return {code:0,stdout:JSON.stringify({number:12,title:repo,url:`https://github.com/${repo}/pull/12`,state:repo==='example/b'&&bClosed?'CLOSED':'OPEN',author:{login:'fixture'},body:'',labels:assignedLabels,statusCheckRollup:capturedChecks})};}};
const storage=new Map(),writes=[];
const localStorage={getItem:key=>storage.get(key)??null,setItem:(key,value)=>{storage.set(key,value);writes.push(key);}};
const text=n=>typeof n==='string'?n:(n?.kids??[]).map(text).join(' ');
let websocket;
const modules={
 'label-colors.js':'src/plugins/git/mod/label-colors.js',
 'space-color-state.js':{currentSpaceColor:()=>null},'main.js':'src/plugins/git/mod/main.js','enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js','choice-menu.js':'src/ui/choice-menu.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js',
 'location.js':{location:()=>selected},'gpui-kit':{View:class{},div:element,svg:asset=>element().asset(asset),PathBuilder:{}},'gpui-base':{v_flex:element,h_flex:element,Popover:{new:id=>element().id(id)},Input:{}},'ui.js':'src/ui/ui.js',
 'agent-links.js':{AgentLinks:class{}},'pin-swap.js':'src/plugins/git/mod/pin-swap.js','panel-pin.js':{panelPin:(_t,o)=>element().id(o.id)},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings:options=>settingsOpened.push(options)},'panel-state.js':{changePanel(){}},
 'panel-kit.js':'src/ui/panel-kit.js',
 'relay-consumer.js':'src/plugins/git/mod/webhooks.js',
 'webhooks.js':{GitWebhooks:class{sync(_cx,options){websocket=options;}stop(){}retryNow(){}}},'notices.js':{GitNotices:class{sync(_cx,{enabled,repository}){this.active=enabled;return enabled?noticeModes[repository]??null:null;}presentation(repos){if(!this.active)return null;const choices=[...new Set(repos)].filter(repo=>noticeModes[repo]==='repository');return {choices,key:JSON.stringify([this.force,noticeModes,choices])};}stop(){this.active=false;}retryNow(){this.force=(this.force??0)+1;}}},
};
host.exec=legacyTargetResponses(host.exec);
const {Main,f,A,r,GitWebhooks,gitReads}=await loadMod({host,modules,globals:{URL,localStorage,Date:class extends Date{static now(){return now;}}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as f from "./plugins/crew/fleet.js";export * as A from "./aggregate.js";export * as r from "./plugins.js";export {GitWebhooks} from "./relay-consumer.js";export {gitReads} from "./pulls.js";'});
consumerRegistry=r;
({r:lifecycle}=await loadMod({host,modules,globals:{Date:class extends Date{static now(){return now;}}},mod:'custom-spaces',entry:'export * as r from "./plugins.js";'}));
f.refreshFleets(cx,async()=>JSON.stringify(status));await drain();
const panel=new Main();panel.init({},cx);await drain();let tree=panel.render(cx);await drain();tree=panel.render(cx);
// Explicit change injection for the existing semantic/race cases below;
// generic final-cache request budgets are measured without this adapter.
panel.aggregate.invalidate=(repository=null)=>{gitReads(host.exec).facts.clear();for(const e of panel.aggregate.entries.values())if(!repository||e.link.repo===repository)e.dirty=true;};
assert.equal(calls.length,2,'Duplicate task PR is fetched once');assert.equal(panel.aggregate.counts().open,1);assert.equal(panel.aggregate.counts().closed,1);
assert.ok(calls.every(args=>args.at(-1).split(',').includes('labels')));assert.equal(panel.aggregate.rows('open')[0].labels[0].name,'🤖 Under review');
assert.ok(find(tree,'pr-labels-example/a#12'),'Coordinator rows use the shared labels row');
// The mounted provider/panel must survive a real off/on invalidation while the
// first on-read is slow or fails. Off uses ordinary Git; on never flashes the
// ordinary non-repository result. No old inventory survives an off/on cycle.
for(const outcome of ['slow','failed']) {
 const reads=calls.length,robot=find(tree,'pr-agent-example/a#12');
 state['custom.spaces.preferences'].connectFleetToCoordinator=false;f.invalidateFleet();tree=panel.render(cx);await drain();tree=panel.render(cx);
 assert.match(text(tree),/Not a git repository/);assert.equal(panel.aggregate.entries.size,0);
 state['custom.spaces.preferences'].connectFleetToCoordinator=true;f.invalidateFleet();holdStatus=outcome==='slow';failStatus=outcome==='failed';
 const retainedFrame=()=>{tree=panel.render(cx);assert.doesNotMatch(text(tree),/Not a git repository|Waiting for fleet verification|Verifying|Stale/);assert.equal(text(find(tree,'git-task-empty')).trim(),'Loading');assert.equal(panel.aggregate.entries.size,0);assert.deepEqual(JSON.parse(JSON.stringify(panel.aggregate.counts())),{open:null,closed:null});assert.match(find(tree,'git-view-open-count').attrs.tooltip[0],/Count loading; showing 0/);assert.equal(r.pluginPullContext('coordinator'),null);assert.equal(find(tree,'pr-agent-example/a#12'),undefined);};
 retainedFrame();for(let i=0;i<30;i++)await Promise.resolve();retainedFrame();
 const navigations=focus.length;robot.attrs.on_click[0]({},cx);assert.equal(focus.length,navigations);assert.equal(calls.length,reads,'Pending verification grants no GitHub IO');
 if(holdStatus){holdStatus=false;releaseStatus();await drain();}else {await drain();retainedFrame();failStatus=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();}
 tree=panel.render(cx);await drain();tree=panel.render(cx);assert.equal(find(tree,'git-task-stale'),undefined);assert.ok(find(tree,'pr-agent-example/a#12'));
}
// Completion-before-toggle: an authoritative negative completes WITHOUT Git
// rendering, then off/on clears that evidence. Loading precedes ONLY fresh rows.
status.owner.live=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();
assert.equal(Object.keys(state[f.DISPLAY_KEY].entries).length,0);assert.ok(find(tree,'pr-example/a#12'),'Git has not rendered the negative completion');
state['custom.spaces.preferences'].connectFleetToCoordinator=false;f.invalidateFleet();
state['custom.spaces.preferences'].connectFleetToCoordinator=true;f.invalidateFleet();
status.owner.live=true;status.tasks[0].pr=status.tasks[2].pr=url('fresh');holdStatus=true;
tree=panel.render(cx);for(let i=0;i<30;i++)await Promise.resolve();tree=panel.render(cx);
assert.equal(text(find(tree,'git-task-empty')).trim(),'Loading');assert.equal(panel.aggregate.entries.size,0);assert.equal(find(tree,'git-task-stale'),undefined);assert.equal(find(tree,'pr-example/a#12'),undefined);assert.doesNotMatch(text(tree),/Not a git repository/);
holdStatus=false;releaseStatus();await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
assert.ok(find(tree,'pr-example/fresh#12'));assert.equal(find(tree,'pr-example/a#12'),undefined,'Completed negative cannot be undone by resurrecting the previous inventory');
status.tasks[0].pr=status.tasks[2].pr=url('a');f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
// Previous-owner negative: new labelled owner + pending read must show Loading,
// not ordinary Git. The old negative's broad dependency signature no longer fits.
status.owner.live=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();
list[0].address=all[0].terminal=status.owner.terminal='t-new';status.owner.live=true;holdStatus=true;
tree=panel.render(cx);lifecycle.pluginEvent('spaces.refresh',{cx});for(let i=0;i<30;i++)await Promise.resolve();tree=panel.render(cx);
assert.equal(state['custom.fleet.reads'].local.subject.owner,'t-new');assert.equal(state['custom.fleet.reads'].local.phase,'transport');
assert.equal(text(find(tree,'git-task-empty')).trim(),'Loading');assert.doesNotMatch(text(tree),/Not a git repository|Stale/);assert.equal(panel.aggregate.entries.size,0);assert.equal(r.pluginPullContext('coordinator'),null);
holdStatus=false;releaseStatus();await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);assert.ok(find(tree,'pr-example/a#12'));assert.equal(r.pluginPullContext('coordinator').owner,'t-new');
list[0].address=all[0].terminal=status.owner.terminal='t1';f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
// The same identity guard applies to retained shared display, not only the
// off/on cache. A warm owner move cannot keep the old inventory while failing.
failStatus=true;const warmPane=all[0].pane;all[0].pane='warm-owner-moved';tree=panel.render(cx);
assert.equal(find(tree,'pr-example/a#12'),undefined);assert.equal(find(tree,'git-task-stale'),undefined);assert.equal(text(find(tree,'git-task-empty')).trim(),'Loading');await drain();
all[0].pane=warmPane;failStatus=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
// Remembered spaces can outlive their live owner facts or contain a new owner.
// Keep the rows, but switch to an empty Loading scope rather than folder Git or
// the former owner's inventory, even when this panel already loaded that data.
for(const missingOwner of [true,false]) {
 const oldScope=r.pluginPullContext('coordinator').scope,oldOwner=list[0],oldPane=all[0];
 const reads=calls.length,navigations=focus.length,robot=find(tree,'pr-agent-example/a#12');
 failStatus=true;
 if(missingOwner){list.shift();all.shift();}
 else {list[0]={...oldOwner,address:'replacement-owner'};all[0]={...oldPane,terminal:'replacement-owner'};}
 tree=panel.render(cx);
 const waitingContext=r.pluginPullContext('coordinator',{presentation:true});
 assert.equal(r.pluginWorkspaceLinks({presentation:true}).length,1,'Missing/changing owner facts do not erase remembered space attachment');
 assert.equal(r.pluginPullContext('coordinator'),null,'Remembered identity grants no operational authority');
 assert.notEqual(waitingContext.scope,oldScope,'The old inventory cannot be retained under a different or absent native owner');
 assert.equal(waitingContext.links.length,0);
 assert.equal(text(find(tree,'git-task-empty')).trim(),'Loading');assert.equal(panel.aggregate.entries.size,0);
 assert.equal(find(tree,'pr-example/a#12'),undefined);assert.equal(find(tree,'git-task-stale'),undefined);assert.doesNotMatch(text(tree),/Not a git repository/);
 robot.attrs.on_click[0]({},cx);assert.equal(focus.length,navigations);await drain();assert.equal(calls.length,reads,'Waiting owner facts start no GitHub reads');
 if(missingOwner){list.unshift(oldOwner);all.unshift(oldPane);}else {list[0]=oldOwner;all[0]=oldPane;}
 failStatus=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
 assert.ok(find(tree,'pr-example/a#12'),'Fresh verification restores consolidated inventory');
}
// An optional role hint disappearing is not itself contradictory owner status:
// a witnessed exact native owner/home may retain read-only history without it.
failStatus=true;delete list[0].labels['custom.crew.home'];tree=panel.render(cx);assert.ok(find(tree,'pr-example/a#12'));assert.equal(find(tree,'git-task-stale'),undefined);assert.doesNotMatch(text(find(tree,'changes-header')),/Stale/);assert.equal(r.pluginPullContext('coordinator'),null);await drain();
status.owner.live=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();assert.equal(panel.aggregate.sync(cx),false,'A witnessed negative clears history even without a role-hint diagnostic subject');assert.equal(r.pluginPullContext('coordinator',{presentation:true}),null);
status.owner.live=true;list[0].labels['custom.crew.home']='1';failStatus=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
// A changed native owner membership cannot reuse the old inventory while the
// new identity is unverified, even if the parent space and role hint survive.
state['custom.spaces.preferences'].connectFleetToCoordinator=false;f.invalidateFleet();panel.render(cx);await drain();
state['custom.spaces.preferences'].connectFleetToCoordinator=true;f.invalidateFleet();holdStatus=true;panel.render(cx);for(let i=0;i<30;i++)await Promise.resolve();
const originalPane=all[0].pane;all[0].pane='replacement-owner-pane';tree=panel.render(cx);
assert.equal(find(tree,'pr-example/a#12'),undefined);assert.equal(find(tree,'git-task-stale'),undefined);assert.equal(text(find(tree,'git-task-empty')).trim(),'Loading');assert.equal(r.pluginPullContext('coordinator'),null);
holdStatus=false;releaseStatus();await drain();all[0].pane=originalPane;tree=panel.render(cx);assert.equal(find(tree,'pr-example/a#12'),undefined,'Restoring native membership alone is not fresh status evidence');
f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
// A coherent negative result ends presentation; a role hint must not override it.
status.owner.live=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();assert.equal(panel.aggregate.sync(cx),false);assert.equal(panel.aggregate.entries.size,0);assert.equal(r.pluginPullContext('coordinator',{presentation:true}),null);
status.owner.live=true;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
const absentFleet=groups.pop(),priorTasks=status.tasks;status.tasks=[];f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();assert.equal(panel.aggregate.sync(cx),false,'Confirmed no fleet and no historical PR scope returns ordinary Git');assert.equal(panel.aggregate.entries.size,0);
groups.push(absentFleet);status.tasks=priorTasks;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
// Real aggregate Refresh/relay/render lifecycle never emits an ordinary fleet row.
const refreshFrames=[],sample=()=>{
 const projected=projectLinkedRows(groups.map(w=>({w})),r.pluginWorkspaceLinks({presentation:true}));
 refreshFrames.push(projected.find(row=>row.w.id==='fm-crew-home').linked);
 assert.deepEqual(Array.from(r.pluginSpaceTags(groups[1]),tag=>[tag.label,tag.tooltip]),[['Crew','Crew worker']]);assert.equal(r.pluginSpaceTags(groups[0])[0].label,'Crew');
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
const nameOnly=(repo,root=tree)=>{const row=header(repo,root);assert.equal(row.kids.length,3,'Name, selected-tab count and shared chevron');assert.equal(text(find(root,`task-repo-count-example/${repo}`)),'1');assert.doesNotMatch(text(row),/Open|Closed/);assert.ok(text(row).includes(`example/${repo}`));};
const toggle=repo=>{header(repo).attrs.on_click[0]({},cx);tree=panel.render(cx);};
assert.ok(find(tree,'task-repo-body-example/a'));assert.equal(header('b'),undefined,'Closed-only repository has no Open header');
nameOnly('a');assert.equal(text(find(tree,'git-view-open')),'Open 1');assert.equal(text(find(tree,'git-view-closed')),'Closed 1');
const aHeader=header('a');assert.equal(aHeader.attrs.h[0],28);assert.equal(aHeader.attrs.pr[0],3);assert.equal(aHeader.kids.at(-1).attrs.size[0],24);
assert.match(aHeader.kids.at(-1).kids[0].attrs.asset[0],/chevron-down.svg$/);assert.equal(aHeader.attrs.accessibility_label[0],'Collapse example/a');
let foldCalls=calls.length;const foldWrites=writes.length;
toggle('a');assert.equal(find(tree,'pr-example/a#12'),undefined);assert.equal(header('b'),undefined);nameOnly('a');
assert.match(header('a').kids.at(-1).kids[0].attrs.asset[0],/chevron-right.svg$/);assert.equal(header('a').attrs.accessibility_label[0],'Expand example/a');
assert.equal(find(tree,'git-task-empty'),undefined,'All open PRs hidden by folding is not an empty data set');
assert.equal(calls.length,foldCalls,'Folding does no GitHub read');assert.deepEqual(writes.slice(foldWrites),['custom.git.task-repositories.folded']);
assert.deepEqual(JSON.parse(storage.get('custom.git.task-repositories.folded')),['example/a']);
panel.setView('closed',cx);tree=panel.render(cx);assert.equal(header('a'),undefined);assert.ok(find(tree,'task-repo-body-example/b'),'Eligible section starts expanded in its own tab');
toggle('b');assert.equal(find(tree,'task-repo-body-example/b'),undefined);assert.equal(header('a'),undefined);nameOnly('b');assert.equal(find(tree,'git-task-empty'),undefined);
panel.setView('open',cx);tree=panel.render(cx);assert.ok(header('a'));assert.equal(find(tree,'task-repo-body-example/a'),undefined,'Tab switches retain folded state when a section returns');assert.equal(header('b'),undefined);
panel.setView('closed',cx);tree=panel.render(cx);assert.equal(find(tree,'task-repo-body-example/b'),undefined,'Both folds remain independent');
// A recreated panel restores local state without loading a new source or altering preferences.
const restored=new Main();restored.init({},cx);await drain();restored.render(cx);await drain();const restoredTree=restored.render(cx);
assert.equal(find(restoredTree,'task-repo-body-example/a'),undefined);assert.equal(find(restoredTree,'task-repo-body-example/b'),undefined);nameOnly('b',restoredTree);restored.close();
// Restore original panel presentation; both toggles are independent and only affect UI.
toggle('b');panel.setView('open',cx);tree=panel.render(cx);toggle('a');
assert.equal(state['custom.spaces.preferences'].connectFleetToCoordinator,true);
panel.setView('closed',cx);tree=panel.render(cx);assert.ok(find(tree,'pr-example/b#12'));assert.ok(find(tree,'pr-labels-example/b#12'));assert.equal(find(tree,'pr-example/a#12'),undefined);
find(tree,'pr-agent-example/b#12').attrs.on_click[0]({},cx);assert.deepEqual(JSON.parse(JSON.stringify(focus.at(-1))),['agent.focus',{terminal:'t3'}]);
const captured=find(tree,'pr-agent-example/b#12');list[2].state='finished';captured.attrs.on_click[0]({},cx);assert.equal(focus.length,1,'Removed worker cannot be focused by stale callback');list[2].state='live';
const stableCalls=calls.length;for(let i=0;i<4;i++)panel.render(cx);await drain();assert.equal(calls.length,stableCalls,'Local context refresh does not poll GitHub facts');
tree=panel.render(cx);toggle('b');const vanishedHeader=header('b'),savedAbsentFolds=storage.get('custom.git.task-repositories.folded');
status.tasks[1].pr=null;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.render(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,0,'Null recorded links are not guessed from branches');assert.equal(find(panel.render(cx),'task-repo-example/b'),undefined);vanishedHeader.attrs.on_click[0]({},cx);assert.equal(storage.get('custom.git.task-repositories.folded'),savedAbsentFolds,'Removed repository headers cannot change saved folds');
status.tasks[1].pr=url('b');f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.render(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,1,'A newly recorded link enters without changing coordinator cwd');tree=panel.render(cx);assert.ok(header('b'));assert.equal(find(tree,'task-repo-body-example/b'),undefined,'A temporarily absent repository keeps its fold');toggle('b');
failRepo='example/b';panel.aggregate.refresh(cx);await drain();assert.equal(panel.aggregate.rows('closed').length,1,'A read failure retains same-binding facts');assert.ok([...panel.aggregate.entries.values()].find(e=>e.link.repo===failRepo).error);
noticeModes['example/b']='repository';panel.setView('open',cx);tree=panel.render(cx);assert.equal(find(tree,'task-error-example/b'),undefined,'A cached Closed failure never appears under Open');
panel.setView('closed',cx);tree=panel.render(cx);assert.ok(find(tree,'task-error-example/b'));assert.ok(find(tree,'git-enrollment-footer'));
toggle('b');assert.equal(find(tree,'task-error-example/b'),undefined);assert.ok(find(tree,'git-enrollment-footer'),'Folding cannot hide enrollment');nameOnly('b');
failRepo=null;bClosed=false;panel.aggregate.refresh(cx);await drain();tree=panel.render(cx);
assert.equal(header('b'),undefined,'Reopened PR no longer leaves an empty Closed header');assert.ok(find(tree,'git-enrollment-footer'),'Hidden section still contributes enrollment');assert.equal(find(tree,'git-task-empty').kids[0],'No closed pull requests');
assert.equal(text(find(tree,'git-view-open')),'Open 2','Top-level totals update while folded');assert.equal(panel.aggregate.counts().open,2);assert.equal(find(tree,'task-repo-body-example/b'),undefined);
bClosed=true;panel.aggregate.refresh(cx);await drain();tree=panel.render(cx);toggle('b');assert.ok(find(tree,'git-enrollment-footer'),'Reopening keeps the one footer');delete noticeModes['example/b'];
assert.equal(A.taskPullLink('https://github.com/example/a/pull/12').key,'example/a#12');for(const bad of ['https://evil.test/a/b/pull/12','https://github.com/a/b/pull/0','https://github.com/a/b/pull/1?x=1'])assert.equal(A.taskPullLink(bad),null);
// The same authenticated subscription routes only relevant repositories, coalescing bursts.
failRepo=null;pendingCI=true;defer=true;
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
let before=calls.length;websocket.onChange({repository:'elsewhere/repo'},cx);await tick();assert.equal(calls.length,before);
websocket.onChange({repository:'example/a'},cx);await tick();assert.equal(calls.length,before+1);
websocket.onChange({repository:'example/a'},cx);websocket.onChange({repository:'example/a'},cx);await tick();assert.equal(calls.length,before+1);
waiting.shift()();await tick();assert.equal(calls.length,before+2,'A burst produces only one coalesced follow-up');waiting.shift()();await drain();assert.equal(panel.panelLoading(),false,'Pending CI alone does not animate after reads finish');
// The actual relay consumer is called by render, not an asynchronous socket.
// Exercise the real fleet callback/sweep under an immediate-spawn render guard.
const savedWebhooks=panel.webhooks;panel.webhooks=new GitWebhooks({debounce:0});defer=false;
state['custom.plugins'].git.settings={relay:'https://relay.test'};
const relayState=state['custom.git.relay-runtime']={scope:'fleet-render',status:'connected',ready:1,repositories:{'example/a':{revision:1}}};
const renderCx={...cx,spawn:fn=>jobs.push(fn(renderCx))};
const renderSync=()=>{rendering=true;try{panel.syncTaskWebhooks(renderCx);}finally{rendering=false;}};
assert.ok(panel.aggregate.rows('open')[0].checks.pending>0);
before=calls.length;renderSync();
assert.equal(calls.length,before,'fleet render must not start GitHub reads');assert.equal(panel.panelLoading(),false,'Render does not invent loading for pending CI');
await drain();assert.equal(calls.length,before+2,'Main consumer initialization retains its repository catch-up');assert.equal(panel.panelLoading(),false);
// A new revision and repeated renders coalesce into one deferred refresh.
relayState.repositories['example/a'].revision++;
before=calls.length;renderSync();renderSync();renderSync();assert.equal(calls.length,before);
await drain();assert.equal(calls.length,before+1,'Only the affected repository refreshes');assert.equal(panel.panelLoading(),false);
// Disable/hide/context changes between render and delivery cannot start work.
for(const change of ['disable','hide','context']){
 relayState.repositories['example/a'].revision++;before=calls.length;renderSync();
 const context=panel.context;
 if(change==='disable')state['custom.plugins'].git.enabled=false;
 if(change==='hide')shown=false;
 if(change==='context')panel.context='tasks:replaced';
 await drain();assert.equal(calls.length,before,`${change} cancels queued fleet delivery`);assert.equal(panel.panelLoading(),false);
 state['custom.plugins'].git.enabled=true;shown=true;panel.context=context;panel.webhooks.stop();
}
panel.webhooks=savedWebhooks;defer=true;
noticeModes['example/b']='repository';tree=panel.render(cx);find(tree,'git-enrollment-popup').attrs.on_open_change[0](true,cx);tree=panel.render(cx);find(tree,'git-enrollment-choice-0').attrs.on_click[0]({},cx);assert.equal(settingsOpened.at(-1).pluginSearch,'example/b');assert.equal(settingsOpened.at(-1).pluginSection,'repository');
// Label add/remove invalidates the same targeted reads in both tabs.
defer=false;pendingCI=false;
for(const action of ['unlabeled','labeled']) {
  assignedLabels=action==='labeled'?[{name:'🤖 Under review',color:'840479'}]:[];
  const beforeLabels=calls.length;
  for(const repository of ['example/a','example/b'])websocket.onChange({repository,event:'pull_request',action},cx);
  await drain();assert.equal(calls.length,beforeLabels+2);
  for(const tab of ['open','closed'])assert.equal(panel.aggregate.rows(tab)[0].labels.length,assignedLabels.length);
}
// Completion arriving after a read captured old rollups must survive the
// in-flight lease and publish a full count on its coalesced follow-up.
const checkRuns=(ok,total)=>Array.from({length:total},(_,i)=>({name:`CI ${i}`,status:i<ok?'COMPLETED':'IN_PROGRESS',conclusion:i<ok?'SUCCESS':null}));
checkFacts=checkRuns(3,10);websocket.onChange({repository:'example/a',event:'check_run'},cx);await drain();
assert.equal(panel.aggregate.entries.get('example/a#12').pr.checks.label,'3/10');
defer=true;websocket.onChange({repository:'example/a',event:'check_run'},cx);await tick();
checkFacts=checkRuns(11,11);websocket.onChange({repository:'example/a',event:'workflow_run'},cx);
waiting.shift()();await tick();
assert.equal(panel.aggregate.entries.get('example/a#12').pr.checks.label,'3/10');
waiting.shift()();await drain();assert.equal(panel.aggregate.entries.get('example/a#12').pr.checks.label,'11/11');
defer=false;checkFacts=checkRuns(0,10);websocket.onChange({repository:'example/a',event:'check_suite'},cx);await drain();
assert.equal(panel.aggregate.entries.get('example/a#12').pr.checks.state,'pending','Rerun replaces the prior completed count');
checkFacts=checkRuns(3,10).map(c=>({...c,status:'COMPLETED',conclusion:c.conclusion??'FAILURE'}));
websocket.onChange({repository:'example/a',event:'status'},cx);await drain();
assert.equal(panel.aggregate.entries.get('example/a#12').pr.checks.label,'3/10');assert.equal(panel.aggregate.entries.get('example/a#12').pr.checks.state,'failure');checkFacts=null;
defer=true;
// Same-home refresh keeps each loaded row until its own replacement is ready;
// even a partial failure cannot substitute Loading/empty for the known facts.
const pendingFacts=new Map([...panel.aggregate.entries].map(([key,e])=>[key,e.pr]));
const pendingCounts=JSON.stringify(panel.aggregate.counts()),pendingScope=panel.aggregate.context.scope;
const retainedFrame=()=>{
 rendering=true;try{tree=panel.render(renderCx);}finally{rendering=false;}
 assert.equal(panel.aggregate.context.scope,pendingScope);assert.equal(JSON.stringify(panel.aggregate.counts()),pendingCounts);
 assert.ok(find(tree,'pr-example/b#12'));assert.equal(find(tree,'git-task-empty'),undefined);
};
panel.aggregate.refresh(cx);await tick();retainedFrame();
for(const [key,pr]of pendingFacts)assert.equal(panel.aggregate.entries.get(key).pr,pr,'No pending refresh clears a loaded PR');
failRepo='example/b';while(waiting.length)waiting.shift()();await drain();retainedFrame();
assert.equal(panel.aggregate.entries.get('example/b#12').pr,pendingFacts.get('example/b#12'),'The failed row retains its last-good facts');
assert.ok(find(tree,'task-error-example/b'));failRepo=null;
websocket.onChange(null,cx);await tick();retainedFrame();while(waiting.length)waiting.shift()();await drain();retainedFrame();assert.equal(find(tree,'task-error-example/b'),undefined);
// Hide/disable invalidates in-flight writes and starts no follow-up or polling.
before=calls.length;panel.aggregate.refresh(cx);await tick();shown=false;panel.render(cx);while(waiting.length)waiting.shift()();await drain();assert.equal(calls.length,before+2);assert.equal(websocket.enabled,false);assert.equal(panel.aggregate.busy,false);
shown=true;defer=false;panel.render(cx);await drain();assert.equal(calls.length,before+4,'Showing again catches up both linked repositories');
before=calls.length;websocket.onChange(null,cx);await drain();assert.equal(calls.length,before+2,'Socket ready/reconnect catches up all task repositories');
noticeModes['example/a']='setup';noticeModes['example/b']='setup';tree=panel.render(cx);assert.ok(find(tree,'git-live-ci-footer'));assert.equal(find(tree,'git-live-ci-example/b-footer'),undefined,'Missing global setup has one shared prompt, not per-repository enrollment');
// Long status outages retain rows/folds with an explicit stale state, never IO or robots.
failStatus=true;now+=2*86400000;defer=false;const staleCalls=calls.length,foldBefore=panel.foldedRepositories.has('example/a'),countsBefore=JSON.stringify(panel.aggregate.counts());
const lastRobot=find(tree,'pr-agent-example/b#12'),lateRelay=websocket.onChange;
rendering=true;try{tree=panel.render(renderCx);}finally{rendering=false;}
assert.equal(find(tree,'git-task-stale'),undefined,'Header bulb removed');assert.doesNotMatch(text(find(tree,'changes-header')),/Stale/);assert.ok(find(tree,'pr-example/b#12'));assert.equal(find(tree,'pr-agent-example/b#12'),undefined);assert.equal(JSON.stringify(panel.aggregate.counts()),countsBefore);sample();
assert.equal(websocket.enabled,false,'Stale presentation cannot subscribe for task reads');
lastRobot.attrs.on_click[0]({},cx);lateRelay({repository:'example/a'},cx);panel.aggregate.refresh(cx);await drain();assert.equal(calls.length,staleCalls);assert.equal(focus.length,1,'Stale callbacks cannot navigate');
panel.setView('open',cx);tree=panel.render(cx);toggle('a');assert.equal(panel.foldedRepositories.has('example/a'),!foldBefore);assert.equal(calls.length,staleCalls,'Read-only folding still works while verification is unavailable');panel.setView('closed',cx);tree=panel.render(cx);
assert.equal(find(tree,'git-task-stale'),undefined,'No replacement header tooltip; runtime diagnostics remain available');
// A cold controller/module gets the attached first frame, but no persisted PR inventory or authority.
const coldState=JSON.parse(JSON.stringify(state));delete coldState[f.FLEET_KEY];
const cold=await loadMod({host:{...host,shared:k=>coldState[k],setShared:(k,v)=>{assert.equal(rendering,false);coldState[k]=v;}},modules,globals:{URL,localStorage,Date:class extends Date{static now(){return now;}}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as r from "./plugins.js";'});
const coldPanel=new cold.Main();coldPanel.init({},cx);const first=coldPanel.render(cx);
assert.equal(find(first,'git-task-stale'),undefined);assert.equal(text(find(first,'git-task-empty')),' Loading');assert.equal(find(first,'git-task-empty').kids.length,2,'Use the actual standard bulb + Loading component');assert.equal(coldPanel.aggregate.entries.size,0);assert.equal(cold.r.pluginWorkspaceLinks({presentation:true}).length,1);
await drain();assert.equal(calls.length,staleCalls);coldPanel.close();
// Cold first failure without display history still routes only waiting feedback,
// not a guessed pair, folder Git probe, PR inventory or worker authority.
const candidateState=JSON.parse(JSON.stringify(coldState));delete candidateState[f.DISPLAY_KEY];
const candidate=await loadMod({host:{...host,shared:k=>candidateState[k],setShared:(k,v)=>{assert.equal(rendering,false);candidateState[k]=v;}},modules,globals:{URL,localStorage,Date:class extends Date{static now(){return now;}}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as r from "./plugins.js";'});
const candidatePanel=new candidate.Main();candidatePanel.init({},cx);const candidateTree=candidatePanel.render(cx);
assert.equal(find(candidateTree,'git-task-stale'),undefined);assert.match(find(candidateTree,'git-task-empty').attrs.tooltip[0],/transport-error at/);
assert.equal(text(find(candidateTree,'git-task-empty')),' Loading');assert.equal(candidatePanel.aggregate.entries.size,0);
assert.equal(candidate.r.pluginWorkspaceLinks({presentation:true}).length,0);assert.equal(candidate.r.pluginPullContext('coordinator'),null);
await drain();assert.equal(calls.length,staleCalls);candidatePanel.close();
// With no history AND no diagnostic, first verification uses the same standard
// loading component and no extra header text; no role hint grants actions.
const initialState=JSON.parse(JSON.stringify(candidateState));delete initialState['custom.fleet.diagnostics'];
const initial=await loadMod({host:{...host,shared:k=>initialState[k],setShared:(k,v)=>initialState[k]=v},modules,globals:{URL,localStorage,Date:class extends Date{static now(){return now;}}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as r from "./plugins.js";'});
const initialPanel=new initial.Main();initialPanel.init({},cx);const initialTree=initialPanel.render(cx),loading=find(initialTree,'git-task-empty');
assert.equal(text(loading),' Loading');assert.equal(loading.kids.length,2);assert.equal(find(initialTree,'git-task-stale'),undefined);assert.doesNotMatch(text(initialTree),/Not a git repository|Verifying/);assert.equal(initial.r.pluginPullContext('coordinator'),null);
await drain();const initialLocation=selected;selected={...selected,space:'other'};assert.equal(initialPanel.aggregate.sync(cx),false,'Leaving cold waiting without a cached inventory is safe');assert.equal(initialPanel.aggregate.entries.size,0);selected=initialLocation;initialPanel.close();
// Fresh same-home verification restores reads/robots, not a new folder/pin context.
failStatus=false;f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();tree=panel.render(cx);await drain();tree=panel.render(cx);
assert.equal(find(tree,'git-task-stale'),undefined);assert.ok(find(tree,'pr-agent-example/b#12'));assert.equal(panel.foldedRepositories.has('example/a'),!foldBefore);assert.equal(JSON.stringify(panel.aggregate.counts()),countsBefore);panel.setView('open',cx);tree=panel.render(cx);toggle('a');defer=true;
// Finished workers leave an extant fleet, but successful owner membership moves
// must refresh the retained display before a later status outage uses its scope.
defer=false;bClosed=false;panel.aggregate.invalidate('example/b');for(const task of status.tasks)task.state='closed';for(const worker of list.slice(1))worker.state='finished';all.splice(1);groups[1].tabs=[];
const priorDisplay=f.fleetContexts({presentation:true})[0];
f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();
for(const [ownerTab,ownerPane] of [['c','cp-moved'],['c-moved','cp-moved-again']]) {
 groups[0].tabs=[{id:ownerTab}];all[0].tab=ownerTab;all[0].pane=ownerPane;failStatus=false;
 f.refreshFleets(cx,async()=>JSON.stringify(status),true);await drain();panel.setView('open',cx);tree=panel.render(cx);await drain();tree=panel.render(cx);
 const verified=r.pluginPullContext('coordinator'),scope=verified.scope,entries=[...panel.aggregate.entries.values()],savedCounts=JSON.stringify(panel.aggregate.counts()),reads=calls.length;
 assert.equal(verified.child,null);assert.equal(verified.ownerTab,ownerTab);assert.equal(verified.ownerPane,ownerPane);assert.equal(entries.length,2);
 failStatus=true;now+=31000;tree=panel.render(cx);await drain();tree=panel.render(cx);
 assert.equal(panel.aggregate.entries.size,2,'Verified owner membership must not revert to an older stale scope and clear loaded PRs');
 assert.equal(panel.aggregate.context.scope,scope);assert.equal(JSON.stringify(panel.aggregate.counts()),savedCounts);assert.ok(find(tree,'pr-example/a#12'));assert.ok(find(tree,'pr-example/b#12'));assert.equal(find(tree,'git-task-stale'),undefined);
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
