// Real machine reader -> strict Crew adapter -> registry -> rendered Git panel.
// No Core, credentials, real Git/GitHub reads, reports or terminal transcripts.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const element=()=>{const o={kids:[],attrs:{}};let p;return p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;if(k==='when')return(yes,fn)=>yes?fn(p):p;if(k==='child')return c=>{o.kids.push(c);return p;};if(k==='children')return cs=>{o.kids.push(...cs);return p;};return(...args)=>{o.attrs[k]=args;return p;};}});};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const text=n=>typeof n==='string'?n:(n?.kids??[]).map(text).join(' ');
const DAY=86400000,url=(n,repo='example/repo')=>`https://github.com/${repo}/pull/${n}`;
const known=(n,source='github',repo='example/repo')=>({status:'known',url:url(n,repo),source,reason:null});
const none=()=>({status:'none',url:null,source:null,reason:null});
const unavailable=()=>({status:'unavailable',url:null,source:null,reason:'budget-exhausted'});
let now=Date.UTC(2026,10,23,12),mode='v1';
const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
const status={home:'C:/fixture/.crew',owner:{terminal:'owner',live:true,mine:false},prDiscovery:{version:1},tasks:[
  {id:'ship',state:'working',terminal:'t-ship',pr:null,prDiscovery:known(1)},
  {id:'dup',state:'working',terminal:'t-dup',pr:null,prDiscovery:known(1)},
  {id:'scout',state:'working',terminal:'t-scout',pr:null,prDiscovery:none()},
  {id:'budget',state:'working',terminal:'t-budget',pr:null,prDiscovery:unavailable()},
  {id:'closed-shared',state:'closed',terminal:null,pr:url(1),prDiscovery:known(1,'recorded')},
  {id:'closed-recent',state:'closed',terminal:null,pr:url(2),prDiscovery:known(2,'recorded')},
  {id:'closed-old',state:'closed',terminal:null,pr:url(3,'example/old'),prDiscovery:known(3,'recorded','example/old')},
  {id:'closed-none',state:'closed',terminal:null,pr:null,prDiscovery:none()},
  {id:'closed-unavailable',state:'closed',terminal:null,pr:null,prDiscovery:unavailable()},
]};
const ids=['ship','dup','scout','budget'];
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:ids.map(id=>({id:`w-${id}`}))}];
let panes=[{pane:'cp',tab:'c',terminal:'owner'},...ids.map(id=>({pane:`p-${id}`,tab:`w-${id}`,terminal:`t-${id}`}))];
const terminals=[{address:'owner',state:'live',labels:{'custom.crew.home':'1'}},...ids.map(id=>({address:`t-${id}`,state:'live',labels:{'crew.task':id,'crew.home':'home','herdr.space':'fm-crew-home'}}))];
const completed=now-3600000;
const facts=new Map([
  ['example/repo#1',{number:1,state:'OPEN',isDraft:true,url:url(1)}],
  ['example/repo#2',{number:2,state:'MERGED',mergedAt:new Date(completed).toISOString(),url:url(2)}],
  ['example/old#3',{number:3,state:'CLOSED',closedAt:new Date(now-2*DAY).toISOString(),url:url(3,'example/old')}],
  ['example/repo#4',{number:4,state:'OPEN',url:url(4)}],
]);
const statusCalls=[],pullCalls=[],focused=[],jobs=[],storage=new Map();
const cx={focus_handle:()=>({}),notify(){},stop_propagation(){},timer:{every(){},after(){}},spawn:fn=>jobs.push(Promise.resolve().then(()=>fn(cx)))};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const result=(stdout='',code=0,stderr='',timed_out=false)=>({code:0,stdout:JSON.stringify({code,stdout:Buffer.from(stdout).toString('base64'),stderr:Buffer.from(stderr).toString('base64'),timed_out})});
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>panes,terminals:()=>terminals,machines:()=>[{layout:'ready'}],checking:()=>false,
  props:()=>null,theme:()=>({}),settings:()=>({zoom:1}),window:()=>({platform:'windows'}),layout:()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]}),notify(){},run:(...args)=>focused.push(args),closeOverlay(){},openOverlay(){},nextCommand:()=>new Promise(()=>{}),
  hc:async args=>{
    const script=args.at(-1);assert.match(script,/& node \$main status '--all' '--json'/);statusCalls.push(args);
    if(mode==='timeout')return result('',null,'Timed out',true);
    if(mode==='auth')return result('',1,'GitHub authentication failed');
    if(mode==='unsupported' && script.includes("'--discover-prs'"))return result('',1,'crew: Unknown option: --discover-prs');
    const value=JSON.parse(JSON.stringify(status));
    if(mode!=='v1')value.prDiscovery=mode==='unknown'?{version:99}:undefined;
    return result(JSON.stringify(value));
  },
  exec:async(command,args)=>{
    assert.equal(command,'gh','No coordinator cwd/branch lookup or transcript inference');assert.deepEqual(Array.from(args.slice(0,2)),['pr','view']);
    const key=`${args[args.indexOf('--repo')+1]}#${args[2]}`;assert.ok(facts.has(key),'Only linked PR identities are queried');pullCalls.push(key);
    return {code:0,stdout:JSON.stringify({title:'Fixture',author:{login:'fixture'},body:'',labels:[],statusCheckRollup:[],...facts.get(key)})};
  }};
const modules={'enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js','choice-menu.js':'src/ui/choice-menu.js','label-colors.js':'src/plugins/git/mod/label-colors.js','main.js':'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','ui.js':'src/ui/ui.js','space-color-state.js':{currentSpaceColor:()=>null},
  'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},'gpui-base':{v_flex:element,h_flex:element,Popover:{},Input:{}},'location.js':{location:()=>({space:'coordinator',cwd:'/not-git',on:null,terminal:'owner'})},'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings(){}},'panel-state.js':{changePanel(){}},'panel-kit.js':{headerTool:element,contextMenu:element,tag:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},
  'webhooks.js':{GitWebhooks:class{sync(){}stop(){}retryNow(){}}},'notices.js':{GitNotices:class{sync(){return null;}presentation(){return null;}stop(){}retryNow(){}}}};
const {Main,r,f}=await loadMod({host,modules,globals:{Date:class extends Date{static now(){return now;}},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},mod:'custom-changes',
  entry:'export {default as Main} from "./main.js";export * as r from "./plugins.js";export * as f from "./plugins/crew/fleet.js";'});
const refresh=async()=>{r.pluginEvent('workspace.context.refresh',{cx,force:true});await drain();};
await refresh();assert.equal(statusCalls.length,1);assert.match(statusCalls[0].at(-1),/'--discover-prs'/);
assert.equal(statusCalls[0][statusCalls[0].indexOf('--timeout')+1],'25');
const firstContext=r.pluginPullContext('coordinator'),scope=firstContext.scope,binding=firstContext.binding;
assert.equal(firstContext.discovery.version,1);assert.equal(firstContext.discovery.tasks.length,9);
assert.equal(firstContext.discovery.tasks.find(t=>t.task==='scout').status,'none');assert.equal(firstContext.discovery.tasks.find(t=>t.task==='budget').status,'unavailable');
const panel=new Main();panel.init({},cx);await drain();
const paint=async()=>{panel.render(cx);await drain();return panel.render(cx);};
let tree=await paint();
assert.deepEqual([...pullCalls].sort(),['example/old#3','example/repo#1','example/repo#2']);
assert.equal(panel.aggregate.counts().open,1);assert.equal(panel.aggregate.counts().closed,1);assert.equal(panel.aggregate.rows('open')[0].state,'draft');
assert.ok(find(tree,'pr-example/repo#1'),'First draft appears with recorded pr null and working task, before a report');
assert.ok(find(tree,'pr-agent-example/repo#1'),'The exact live worker gets the robot');
assert.equal(find(tree,'task-repo-example/old'),undefined,'Old history leaves no repository header');
assert.equal(find(tree,'active-pull'),undefined);assert.equal(find(tree,'git-task-incomplete'),undefined);
assert.doesNotMatch(text(tree),/Recorded task PRs|possibly incomplete/);
assert.ok(find(tree,'git-actions'));assert.ok(find(tree,'git-views'));
const captured=find(tree,'pr-agent-example/repo#1');captured.attrs.on_click[0]({},cx);
assert.deepEqual(JSON.parse(JSON.stringify(focused)),[['agent.focus',{terminal:'t-ship'}]]);
const loaded=pullCalls.length;
now+=10001;await refresh();tree=await paint();assert.equal(pullCalls.length,loaded,'Local discovery refresh does not re-poll unchanged GitHub facts');
// UI folds and counts survive a discovery-only update; only the newly linked PR reads.
find(tree,'task-repo-header-example/repo').attrs.on_click[0]({},cx);tree=await paint();assert.equal(find(tree,'task-repo-body-example/repo'),undefined);
status.tasks[2].prDiscovery=known(4);now+=10001;await refresh();tree=await paint();
assert.equal(status.tasks[2].pr,null);assert.equal(pullCalls.length,loaded+1);assert.equal(pullCalls.at(-1),'example/repo#4');
assert.equal(panel.aggregate.counts().open,2);assert.equal(find(tree,'task-repo-body-example/repo'),undefined);
assert.equal(r.pluginPullContext('coordinator').binding,binding);assert.equal(r.pluginPullContext('coordinator').scope,scope);
find(tree,'task-repo-header-example/repo').attrs.on_click[0]({},cx);tree=await paint();assert.ok(find(tree,'pr-example/repo#4'));
status.tasks[0].prDiscovery=unavailable();status.tasks[1].prDiscovery=unavailable();await refresh();tree=await paint();
assert.ok(find(tree,'pr-example/repo#1'),'Recorded historical duplicate still contributes');assert.equal(find(tree,'pr-agent-example/repo#1'),undefined);
captured.attrs.on_click[0]({},cx);assert.equal(focused.length,1,'A stale link cannot borrow the unrelated worker identity');
assert.equal(pullCalls.length,loaded+1);assert.doesNotMatch(text(tree),/possibly incomplete/);
// Finish the final workers: same home scope retains task links, never robots.
status.tasks[0].prDiscovery=known(1);status.tasks[1].prDiscovery=known(1);
for(const task of status.tasks)task.state='closed';for(const terminal of terminals.slice(1))terminal.state='finished';panes=panes.slice(0,1);groups.splice(1,1);
await refresh();tree=await paint();
assert.equal(r.pluginPullContext('coordinator').scope,scope);assert.equal(r.pluginPullContext('coordinator').child,null);
assert.equal(panel.aggregate.counts().open,2);assert.equal(find(tree,'pr-agent-example/repo#1'),undefined);assert.equal(find(tree,'pr-agent-example/repo#4'),undefined);
now+=DAY+1;await refresh();tree=await paint();assert.equal(panel.aggregate.counts().closed,0);assert.equal(panel.aggregate.counts().open,2);
assert.equal(pullCalls.length,loaded+1,'Historical aging is local and does not add GitHub polling');
// Successful older/unknown versions reuse recorded links from that same read.
for(const compatibility of ['legacy','unknown','unsupported']) {
  mode=compatibility;const before=statusCalls.length;await refresh();tree=await paint();
  assert.equal(statusCalls.length-before,compatibility==='unsupported'?2:1);
  if(compatibility==='unsupported'){
    assert.doesNotMatch(statusCalls.at(-1).at(-1),/'--discover-prs'/);
    assert.equal(statusCalls.at(-1)[statusCalls.at(-1).indexOf('--timeout')+1],'15');
  }
  const context=r.pluginPullContext('coordinator');assert.equal(context.discovery,undefined);assert.equal(context.scope,scope);
  assert.equal(panel.aggregate.counts().open,1);assert.ok(find(tree,'pr-example/repo#1'));assert.equal(find(tree,'pr-example/repo#4'),undefined,'Missing legacy link is not inferred from prior discovered facts');
  assert.doesNotMatch(text(tree),/possibly incomplete/);
}
for(const failure of ['auth','timeout']) {
  mode=failure;const before=statusCalls.length,at=state[f.FLEET_KEY].entries.local.at,reads=pullCalls.length;
  now+=31001;await refresh();tree=await paint();
  assert.equal(statusCalls.length-before,1,'Auth/timeout never starts the recorded-only fallback');
  assert.equal(state[f.FLEET_KEY].entries.local.at,at);assert.equal(pullCalls.length,reads);
  assert.ok(find(tree,'git-task-stale'));assert.ok(find(tree,'pr-example/repo#1'));assert.equal(r.pluginPullContext('coordinator'),null);
  assert.equal(state[f.FLEET_KEY].entries.local.status.discovery,undefined,'Transport failure cannot fabricate none');
}
panel.close();
console.log('PASS reader-to-coordinator pre-report drafts, budget partials, unchanged bindings/folds/counts, exact robots, old-version capability fallback and historical aging without polling');
