// Actual Crew reader/provider + Git controller/aggregate; synthetic home/Core/GitHub only.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const element=()=>{const o={kids:[],attrs:{}};let p;return p=new Proxy(o,{get(t,k){if(k in t)return t[k];if(k==='then')return undefined;if(k==='when')return(yes,fn)=>yes?fn(p):p;if(k==='child')return c=>{o.kids.push(c);return p;};if(k==='children')return cs=>{o.kids.push(...cs);return p;};return(...args)=>{o.attrs[k]=args;return p;};}});};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const DAY=86400000;let now=Date.UTC(2026,10,23,12),active=0,peak=0,statusReads=0,readMode='success',releaseStatus;
const iso=at=>new Date(at).toISOString(),url=(number,repo='example/repo')=>`https://github.com/${repo}/pull/${number}`;
const facts=new Map();
const fact=(number,state,completedAt,repo='example/repo',draft=false)=>facts.set(`${repo}#${number}`,{number,state,isDraft:draft,url:url(number,repo),title:`PR ${number}`,author:{login:'fixture'},body:'',labels:[{name:'🤖 Under review',color:'840479'}],createdAt:iso(now-100*DAY),...(completedAt===undefined?{}:{closedAt:completedAt}),...(state==='MERGED'?{mergedAt:completedAt}:{}),statusCheckRollup:[]});
fact(1,'OPEN');fact(2,'OPEN');fact(3,'OPEN',undefined,'example/repo',true);fact(4,'MERGED',iso(now-3600000));fact(5,'CLOSED',iso(now-2*3600000));fact(6,'CLOSED',iso(now-2*DAY),'example/old');fact(7,'CLOSED');fact(8,'CLOSED','invalid-date');fact(9,'CLOSED',iso(now-DAY));fact(10,'CLOSED',iso(now+DAY));
const tasks=[{id:'live',terminal:'t2',state:'working',pr:url(1)},...Array.from({length:10},(_,i)=>({id:`done-${i+1}`,terminal:`old${i}`,state:'closed',pr:url(i+1,i+1===6?'example/old':'example/repo')})),{id:'duplicate',terminal:null,state:'closed',pr:url(1)},{id:'scout',terminal:null,state:'closed',pr:null},{id:'bad',terminal:null,state:'closed',pr:'https://evil.test/example/repo/pull/99'}];
const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks};
const state={'custom.plugins':{crew:{enabled:true},git:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
const groups=[{id:'coordinator',tabs:[{id:'c'}]},{id:'fm-crew-home',tabs:[{id:'w'}]}];
let panes=[{pane:'cp',tab:'c',terminal:'t1'},{pane:'wp',tab:'w',terminal:'t2'}];
const terminals=[{address:'t1',state:'live',labels:{'custom.crew.home':'1'}},{address:'t2',state:'live',labels:{'crew.task':'live','crew.home':'home','herdr.space':'fm-crew-home'}}];
const calls=[],focused=[],jobs=[],storage=new Map();let socket,heldRead;
const cx={focus_handle:()=>({}),notify(){},stop_propagation(){},timer:{every(){},after(){}},spawn:fn=>jobs.push(Promise.resolve().then(()=>fn(cx)))};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={shared:key=>state[key],setShared:(key,value)=>state[key]=value,spaces:()=>groups,panes:()=>panes,terminals:()=>terminals,machines:()=>[{layout:'ready'}],checking:()=>false,props:()=>null,theme:()=>({}),settings:()=>({zoom:1}),window:()=>({platform:'windows'}),layout:()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]}),notify(){},run:(...args)=>focused.push(args),closeOverlay(){},openOverlay(){},nextCommand:()=>new Promise(()=>{}),
 hc:async args=>{assert.match(args.at(-1),/status '--all' '--json'/);statusReads++;if(readMode==='pending')await new Promise(resolve=>releaseStatus=resolve);if(readMode==='failure')throw Error('Status unavailable');return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(status)).toString('base64'),stderr:'',timed_out:false})};},
 exec:async(command,args)=>{assert.equal(command,'gh');assert.equal(args[0],'pr');assert.equal(args[1],'view');assert.ok(args.at(-1).includes('closedAt'));assert.ok(args.at(-1).split(',').includes('labels'));const key=`${args[args.indexOf('--repo')+1]}#${args[2]}`;assert.ok(facts.has(key),'No malformed URL or no-PR task starts a read');calls.push(key);peak=Math.max(peak,++active);const stdout=JSON.stringify(facts.get(key));if(heldRead?.key===key){const hold=heldRead;heldRead=null;await new Promise(resolve=>hold.release=resolve);}await Promise.resolve();active--;return {code:0,stdout};}};
const modules={'label-colors.js':'src/plugins/git/mod/label-colors.js','enrollment-picker.js':{EnrollmentPicker:class{stop(){}render(){return null;}}},'main.js':'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','ui.js':'src/ui/ui.js','space-color-state.js':{currentSpaceColor:()=>null},
 'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},'gpui-base':{v_flex:element,h_flex:element,Popover:{},Input:{}},'location.js':{location:()=>({space:'coordinator',cwd:'/not-git',on:null,terminal:'t1'})},'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings(){}},'panel-state.js':{changePanel(){}},'panel-kit.js':{headerTool:element,contextMenu:element,tag:element,panelMessage:(_t,id)=>element().id(id)},
 'relay-consumer.js':'src/plugins/git/mod/webhooks.js','webhooks.js':{GitWebhooks:class{sync(_cx,options){socket=options;}stop(){}retryNow(){}}},'notices.js':{GitNotices:class{sync(){return null;}presentation(){return null;}stop(){}retryNow(){}}}};
const {Main,r,GitWebhooks}=await loadMod({host,modules,globals:{URL,Date:class extends Date{static now(){return now;}},localStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value)}},mod:'custom-changes',entry:'export {default as Main} from "./main.js";export * as r from "./plugins.js";export {GitWebhooks} from "./relay-consumer.js";'});
const refreshStatus=async()=>{r.pluginEvent('spaces.refresh',{cx,force:true});await drain();};
await refreshStatus();assert.equal(statusReads,1);
const panel=new Main();panel.init({},cx);await drain();panel.render(cx);await drain();let tree=panel.render(cx);
assert.equal(calls.length,10,'One targeted read per full PR identity, not per task');assert.ok(peak<=3,'History preserves the three-request concurrency bound');
assert.equal(panel.aggregate.counts().open,3);assert.equal(panel.aggregate.counts().closed,2,'Only recent closed/merged history contributes');
for(const number of [1,2,3])assert.ok(find(tree,`pr-example/repo#${number}`));
assert.ok(find(tree,'pr-agent-example/repo#1'),'Live source wins over historical duplicates');
for(const number of [2,3]){
 assert.equal(find(tree,`pr-agent-example/repo#${number}`),undefined,'Historical-only rows have no robot');
 assert.ok(find(tree,`pr-labels-example/repo#${number}`),'Finished-task rows use the new shared label-pill row');
 assert.equal(find(tree,`pr-owner-example/repo#${number}`),undefined,'No old Owner badge on historical rows');
 const byline=find(tree,`pr-byline-example/repo#${number}`);assert.equal(byline.kids[1].attrs.size[0],3);assert.equal(byline.attrs.gap[0],6,'Historical metadata uses the shared centred separator');
}
assert.equal(find(tree,'task-repo-example/old'),undefined,'An old historical-only repository leaves no empty header');
panel.setView('closed',cx);tree=panel.render(cx);for(const number of [4,5])assert.ok(find(tree,`pr-example/repo#${number}`));for(const number of [6,7,8,9,10])assert.equal(find(tree,`pr-${number===6?'example/old':'example/repo'}#${number}`),undefined,'Old, boundary-expired, undated, invalid and future-dated Closed history is excluded');
// A worker's Core exit may precede crew finish's closed record. Another live
// worker keeps adoption unchanged, so task authority must have its own witness.
const savedPanes=panes,savedTabs=groups[1].tabs;
fact(11,'OPEN');tasks[0].pr=url(11);tasks.push({id:'helper',state:'working',terminal:'t3',pr:null});
terminals.push({address:'t3',state:'live',labels:{'crew.task':'helper','crew.home':'home','herdr.space':'fm-crew-home'}});panes=[...panes,{pane:'hp',tab:'h',terminal:'t3'}];groups[1].tabs=[...savedTabs,{id:'h'}];
await refreshStatus();panel.setView('open',cx);tree=panel.render(cx);await drain();tree=panel.render(cx);assert.ok(find(tree,'pr-example/repo#11'));
const beforeExit=calls.length;terminals[1].state='finished';panes=panes.filter(p=>p.terminal!=='t2');groups[1].tabs=[{id:'h'}];
tree=panel.render(cx);assert.ok(find(tree,'pr-example/repo#11'),'Core-first exit retains the row until the task record is confirmed');assert.equal(find(tree,'pr-agent-example/repo#11'),undefined);assert.ok(find(tree,'git-task-stale'));await drain();
await refreshStatus();tree=panel.render(cx);assert.ok(find(tree,'pr-example/repo#11'));assert.equal(calls.length,beforeExit,'An inconsistent working/finished result grants no new reads');
tasks[0].state='closed';await refreshStatus();tree=panel.render(cx);assert.ok(find(tree,'pr-example/repo#11'));assert.equal(find(tree,'pr-agent-example/repo#11'),undefined);await drain();
tasks[0].state='working';tasks[0].pr=url(1);tasks.pop();terminals.pop();terminals[1].state='live';panes=savedPanes;groups[1].tabs=savedTabs;
await refreshStatus();panel.setView('closed',cx);tree=panel.render(cx);await drain();
// Live-task closed PRs are not subjected to the historical cutoff.
fact(1,'CLOSED',iso(now-10*DAY));socket.onChange({repository:'example/repo'},cx);await drain();tree=panel.render(cx);assert.ok(find(tree,'pr-example/repo#1'));assert.equal(panel.aggregate.counts().closed,3);assert.ok(find(tree,'pr-agent-example/repo#1'));
fact(1,'OPEN');socket.onChange({repository:'example/repo'},cx);await drain();panel.setView('open',cx);tree=panel.render(cx);
const oldRobot=find(tree,'pr-agent-example/repo#1'),scope=panel.aggregate.context.scope,beforeFinish=calls.length;
// Herdr removes the empty fleet before the final-worker status read completes.
// Sidebar attachment ends, but the same live owner/home keeps read-only Git scope.
const retainedEntry=panel.aggregate.entries.get('example/repo#1');
tasks[0].state='closed';terminals[1].state='finished';panes=panes.filter(p=>p.terminal!=='t2');groups.splice(1,1);
assert.equal(r.pluginPullContext('coordinator',{presentation:true})?.scope,scope,'Child removal immediately retains coordinator Git scope');
assert.equal(r.pluginPullContext('coordinator'),null,'Missing child never authorizes fresh reads');
readMode='pending';r.pluginEvent('workspace.context.refresh',{cx,force:true});for(let i=0;i<30;i++)await Promise.resolve();assert.equal(typeof releaseStatus,'function');
assert.equal(Object.keys(state['custom.fleet.display'].entries).length,0,'Missing child prunes only the attachment display');
const staleFrame=()=>{tree=panel.render(cx);assert.equal(panel.aggregate.context?.scope,scope);assert.ok(find(tree,'git-task-stale'));assert.ok(find(tree,'pr-example/repo#1'));assert.equal(find(tree,'pr-agent-example/repo#1'),undefined);assert.equal(panel.aggregate.entries.get('example/repo#1'),retainedEntry,'Loaded PR facts are not cleared');assert.equal(panel.aggregate.counts().open,3);assert.equal(calls.length,beforeFinish,'Stale history starts no GitHub reads');oldRobot.attrs.on_click[0]({},cx);assert.equal(focused.length,0,'A stale robot cannot navigate to the finished worker');};
staleFrame();readMode='failure';releaseStatus();await drain();staleFrame();await drain();
now+=60000;await refreshStatus();staleFrame();await drain();
terminals[0].state='finished';assert.equal(r.pluginPullContext('coordinator',{presentation:true}),null,'An ended owner cannot retain the child-independent scope');terminals[0].state='live';
readMode='success';await refreshStatus();tree=panel.render(cx);assert.equal(panel.aggregate.context.scope,scope);assert.equal(panel.aggregate.entries.get('example/repo#1'),retainedEntry);assert.ok(find(tree,'pr-example/repo#1'));assert.equal(find(tree,'git-task-stale'),undefined);assert.equal(r.pluginPullContext('coordinator').child,null);await drain();
assert.equal(calls.length-beforeFinish,panel.aggregate.entries.size,'Fresh verification catches up once per retained PR, not while stale');
assert.equal(find(tree,'pr-agent-example/repo#1'),undefined);assert.equal(panel.aggregate.counts().open,3);
// GitHub closure/reopen transitions and age changes use normal webhook/context refresh.
fact(2,'CLOSED',iso(now));socket.onChange({repository:'example/repo'},cx);await drain();tree=panel.render(cx);assert.equal(panel.aggregate.counts().open,2);panel.setView('closed',cx);tree=panel.render(cx);assert.ok(find(tree,'pr-example/repo#2'));assert.equal(find(tree,'pr-agent-example/repo#2'),undefined);
const beforeClock=calls.length;now+=DAY+1;await refreshStatus();tree=panel.render(cx);assert.equal(calls.length,beforeClock,'Aging history does not poll GitHub');assert.equal(panel.aggregate.counts().closed,0);assert.equal(panel.aggregate.counts().open,2,'Old recorded Open/Draft PRs remain');assert.equal(find(tree,'task-repo-example/old'),undefined);
fact(6,'OPEN',undefined,'example/old');socket.onChange({repository:'example/old'},cx);await drain();panel.setView('open',cx);tree=panel.render(cx);assert.ok(find(tree,'pr-example/old#6'),'A recorded historical PR can reopen through the existing relay subscription');assert.equal(panel.aggregate.counts().open,3);
// The enrolled screenshot scenario through the actual deferred relay consumer,
// actual Crew provider and aggregate. No missing event is invented as a diagnosis.
state['custom.plugins'].git.settings={relay:'https://relay.test'};
const relay=state['custom.git.relay-runtime']={scope:'history-events',status:'connected',ready:1,repositories:{'example/repo':{revision:1}}};
panel.webhooks=new GitWebhooks();
const event=()=>{relay.repositories['example/repo'].revision++;panel.syncTaskWebhooks(cx);};
fact(2,'OPEN');event();await drain();
assert.ok(panel.aggregate.rows('open').some(pr=>pr.number===2));
const unaffected=panel.aggregate.rows('open').filter(pr=>pr.number!==2).map(pr=>pr.key),otherClosed=panel.aggregate.counts().closed;
const hold=heldRead={key:'example/repo#2'};event();
for(let i=0;i<50;i++)await Promise.resolve();assert.equal(typeof hold.release,'function');
fact(2,'MERGED',iso(now));event();
assert.ok(panel.aggregate.rows('open').some(pr=>pr.number===2),'An in-flight refresh retains the loaded row');
hold.release();await drain();
assert.equal(panel.aggregate.rows('open').some(pr=>pr.number===2),false,'A merge during an enrolled read gets its coalesced state reread');
assert.equal(panel.aggregate.rows('closed').find(pr=>pr.number===2)?.state,'merged');
assert.equal(panel.aggregate.counts().open,unaffected.length);assert.equal(panel.aggregate.counts().closed,otherClosed+1);
assert.deepEqual(panel.aggregate.rows('open').map(pr=>pr.key),unaffected,'Other rows keep their relative order');
for(const [stateName,draft,expected] of [['OPEN',false,'open'],['OPEN',true,'draft'],['CLOSED',false,'closed'],['OPEN',false,'open']]) {
 fact(2,stateName,stateName==='CLOSED'?iso(now):undefined,'example/repo',draft);event();await drain();
 const open=['open','draft'].includes(expected);assert.equal(panel.aggregate.rows(open?'open':'closed').find(pr=>pr.number===2)?.state,expected);
 assert.equal(panel.aggregate.counts().open,unaffected.length+(open?1:0));assert.equal(panel.aggregate.counts().closed,otherClosed+(open?0:1));
}
await refreshStatus();panel.render(cx);await drain();assert.equal(panel.aggregate.rows('open').find(pr=>pr.number===2)?.state,'open','Same-home verification does not restore the former state');
status.home='C:/another-home';status.owner.terminal='foreign-owner';await refreshStatus();assert.equal(r.pluginPullContext('coordinator'),null);assert.equal(panel.aggregate.sync(cx),false,'A different home/owner cannot contribute old or new rows');assert.equal(panel.aggregate.entries.size,0);
console.log('PASS same-home --all history, no-robot finished tasks, live dedup precedence, last-worker scope continuity, 24-hour Closed bounds/counts, empty-header filtering, webhook reopen and strict stale navigation');
