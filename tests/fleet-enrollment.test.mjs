// Real coordinator renderer, GitNotices, enrollment controller and shared UI. No real IO.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {choiceModules,element,svg,Popover,theme as t} from './support/choice-menu.mjs';
const walk=n=>n&&typeof n==='object'?[n,...[...(n.kids??[]),...(n.attrs.trigger??[]),...(n.attrs.content??[])].flatMap(walk)]:[];
const find=(n,id)=>walk(n).find(e=>e.attrs.id?.[0]===id);
const text=n=>typeof n==='string'?n:[...(n?.kids??[]),...(n?.attrs?.trigger??[]),...(n?.attrs?.content??[])].map(text).join(' ');
let visible=true,enabled=true,context={scope:'machine/coordinator/home/owner',stale:false},selected={space:'coordinator',terminal:'t1',tab:'c',on:null,cwd:'/home'},rendering=false;
let raw='https://relay.example',account='fixture',snapshot={version:1,relay:raw,revision:1,members:{'owner/a':true,'owner/b':true,'owner/c':true}};
let repositories=['owner/c','owner/a','owner/b','owner/a'];
const reads=[],settings=[],jobs=[],handles=[];let notifications=0;
const cx={focus_handle(){assert.equal(rendering,false,'Never create a focus handle inside render');const handle={};handles.push(handle);return handle;},notify(){assert.equal(rendering,false,'Never notify inside render');notifications++;},stop_propagation(){},spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));}};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={checking:()=>false,props:()=>null,closeOverlay(){},openOverlay(){},nextCommand(){},notify(){},settings:()=>({zoom:1}),theme:()=>t,run(){},layout:()=>({id:'panel',hidden:!visible,children:[{id:'panel-body',active:'changes'}]}),
 appHome:()=>'/fixture',shared:()=>snapshot,setShared(){throw Error('No shared writes from presentation');},
 exec:async(command,args)=>{assert.equal(rendering,false);reads.push([command,args]);assert.equal(command,'node','No GitHub read or enrollment');assert.ok(['notice','notice-repository','notice-repositories'].includes(args[1]),'Only existing readiness reads, never enrollment');return {code:0,stdout:JSON.stringify(args[1]==='notice'?{setup:'ready'}:args[1]==='notice-repositories'?{members:Object.fromEntries(JSON.parse(args[4]).map(name=>[name,{status:snapshot.members[name]===false?'missing':snapshot.members[name]===true?'ready':'error'}]))}:{status:snapshot.members[args[4]]===false?'missing':snapshot.members[args[4]]===true?'ready':'error'})};}};
const modules={...choiceModules,'label-colors.js':'src/plugins/git/mod/label-colors.js','gpui-kit':{View:class{},div:element,svg,PathBuilder:{}},'gpui-base':{Popover,Input:{},h_flex:element,v_flex:element},
 'main.js':'src/plugins/git/mod/main.js','enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js','notices.js':'src/plugins/git/mod/notices.js','pulls.js':'src/plugins/git/mod/pulls.js',
 'location.js':{location:()=>selected},'plugins.js':{sidebarPanelEnabled:()=>enabled,pluginById:()=>({}),pluginSetting:(_p,key)=>key==='relay'?raw:account},
 'aggregate.js':{AggregatePulls:class{}},'agent-links.js':{AgentLinks:class{}},'webhooks.js':{GitWebhooks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},
 'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},'panel-state.js':{changePanel(){}},'space-color-state.js':{currentSpaceColor:()=>null},
 'panel-kit.js':{headerTool:(_t,o)=>element().id(o.id).on_click(o.onClick),contextMenu:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},'settings-dialog.js':{openSettings:value=>settings.push(value)}};
const {Main,GitNotices}=await loadMod({mod:'custom-changes',host,modules,globals:{URL},entry:'export {default as Main} from "./main.js";export * from "./notices.js";'});
const panel=new Main();panel.refresh=()=>{};panel.init({}, {...cx,timer:{every(){}}});delete panel.refresh;
assert.equal(handles.length,1,'Initialization owns exactly one enrollment focus handle');
panel.view='open';panel.foldedRepositories=new Set();panel.context='tasks:fixture';panel.notices=new GitNotices();
const entries=new Map();
for(let i=0;i<80;i++){const repo=i%2?'owner/a':'owner/b',key=`${repo}#${i+1}`;entries.set(key,{link:{repo,key},pr:{key,repo,number:i+1,title:`Fixture ${i}`,state:'open',url:`https://github.com/${repo}/pull/${i+1}`,labels:[]},error:null});}
entries.set('owner/c#1',{link:{repo:'owner/c',key:'owner/c#1'},pr:null,error:'Scoped repository read failed'});
panel.aggregate={context,entries,readNotice:repo=>entries.get(`${repo}#1`)?.error??null,currentContext:()=>context,repositories:()=>repositories,rows:state=>[...entries.values()].flatMap(e=>e.pr && (state==='open'?['open','draft']:['closed','merged']).includes(e.pr.state)?[e.pr]:[]),counts:()=>({open:80,closed:0}),target:()=>null,refresh(){},busy:false};
let tree;const render=()=>{rendering=true;try{return tree=panel.renderAggregate(cx,t);}finally{rendering=false;}};
render();await drain();render();assert.equal(find(tree,'git-enrollment-footer'),undefined,'Zero confirmed choices');
const change=members=>{snapshot={...snapshot,revision:snapshot.revision+1,members};render();};
const popup=()=>{const node=find(tree,'git-enrollment-popup');if(node)assert.equal(node.attrs.track_focus[0],handles[0],'Native Popover reuses the initialization handle');return node;};
const open=()=>{render();assert.ok(popup(),JSON.stringify({setup:panel.notices.setup,active:panel.notices.active,members:[...panel.notices.members],context,selected,raw,account,notice:panel.enrollmentPresentation()}));popup().attrs.on_open_change[0](true,cx);render();assert.ok(panel.enrollmentPicker.opening);};
const key=value=>{find(tree,'git-enrollment-choice-0');popup().attrs.content[0].kids[0].attrs.on_key_down[0]({key:value},cx);render();};
change({'owner/a':true,'owner/b':false,'owner/c':true});await drain();render();
assert.ok(find(tree,'git-enrollment-icon'));assert.match(text(find(tree,'git-enrollment-info')),/Add this repo in Settings/);
const before=reads.length;open();assert.equal(reads.length,before,'Opening uses cached membership only');
assert.equal(find(tree,'git-enrollment-choice-1'),undefined,'One repo still uses a menu');
find(tree,'git-enrollment-choice-0').attrs.on_click[0]({},cx);assert.equal(panel.enrollmentPicker.opening,null);
assert.deepEqual(JSON.parse(JSON.stringify(settings.at(-1))),{section:'plugins',plugin:'git',pluginSection:'repository',pluginSearch:'owner/b'});assert.equal(reads.length,before,'Choosing does not enroll or read');
change({'owner/a':false,'owner/b':false,'owner/c':false});await drain();open();
assert.deepEqual([...panel.enrollmentPicker.opening.choices],['owner/c','owner/a','owner/b'],'Deduplicated exact rendered section order');
const footer=find(tree,'git-enrollment-footer'),scroll=find(tree,'task-pulls-scroll');assert.ok(footer.attrs.flex_none);assert.ok(scroll.attrs.flex_1);assert.ok(scroll.attrs.min_h);assert.ok(scroll.attrs.overflow_hidden);assert.ok(walk(scroll).some(node=>node.attrs.overflow_y_scrollbar));
assert.ok(tree.kids.indexOf(footer)>tree.kids.indexOf(scroll));assert.ok(new Set(walk(scroll).filter(e=>/^pr-owner\//.test(e.attrs.id?.[0]??'')).map(e=>e.attrs.id[0])).size<=10,'Long PR inventory builds only the bounded window in the scroll sibling');assert.equal(text(find(tree,'git-view-open')),'Open','Revealing does not add a tab counter');assert.equal(panel.aggregate.counts().open,80);assert.equal(find(tree,'task-pulls-more'),undefined);
assert.equal(find(scroll,'git-enrollment-footer'),undefined);assert.ok(find(tree,'task-error-owner/c'));assert.equal(find(tree,'task-repo-header-owner/c'),undefined,'An error-only repository has no zero-count header');
for(const repo of repositories)panel.foldedRepositories.add(repo);render();assert.ok(find(tree,'git-enrollment-footer'));assert.match(text(find(tree,'task-error-owner/c')),/Scoped repository read failed/,'Saved folds cannot hide headerless failures');assert.equal(find(tree,'task-repo-header-owner/c'),undefined);assert.equal(find(tree,'task-repo-body-owner/a'),undefined);assert.equal(find(tree,'git-task-empty'),undefined);
key('up');assert.equal(panel.enrollmentPicker.index,2);key('down');assert.equal(panel.enrollmentPicker.index,0);key('down');assert.equal(find(tree,'git-enrollment-choice-1').attrs.bg[0],t.hover);key('enter');assert.equal(settings.at(-1).pluginSearch,'owner/a');
open();find(tree,'git-enrollment-choice-2').attrs.on_hover[0](true,cx);render();assert.equal(panel.enrollmentPicker.index,2);assert.equal(find(tree,'git-enrollment-choice-2').attrs.bg[0],t.hover);key('escape');assert.equal(panel.enrollmentPicker.opening,null);
open();const count=settings.length;popup().attrs.on_open_change[0](false,cx);render();assert.equal(panel.enrollmentPicker.opening,null);assert.equal(settings.length,count,'Backdrop dismisses without Settings');
// Mutations before any rerender must invalidate retained callbacks, not just close the painted menu.
for(const mutate of [()=>{selected={...selected,tab:'other'};},()=>{panel.view='closed';},()=>{context={...context,scope:'another-home-owner'};},()=>{visible=false;},()=>{enabled=false;},()=>{context={...context,stale:true};},()=>{panel.notices.retryNow();},()=>{account='other';},()=>{raw='https://other.example';},()=>{snapshot={...snapshot,revision:snapshot.revision+1,members:{'owner/a':false,'owner/c':false,'owner/b':true}};}]){
 visible=true;enabled=true;context={scope:'machine/coordinator/home/owner',stale:false};panel.aggregate.context=context;selected={space:'coordinator',terminal:'t1',tab:'c',on:null,cwd:'/home'};panel.view='open';account='fixture';raw='https://relay.example';change({'owner/a':false,'owner/b':false,'owner/c':false});await drain();render();open();
 const callback=find(tree,'git-enrollment-choice-2').attrs.on_click[0],at=settings.length;
 mutate();callback({},cx);assert.equal(settings.length,at,'Obsolete choices cannot navigate before rerender');assert.equal(panel.enrollmentPicker.opening,null);
}
visible=true;enabled=true;context={scope:'machine/coordinator/home/owner',stale:false};panel.aggregate.context=context;raw='https://relay.example';account='fixture';panel.view='open';
change({'owner/a':false,'owner/b':false,'owner/c':false});await drain();open();const oldRows=[...panel.enrollmentPicker.opening.choices];
repositories=['owner/b','owner/a','owner/c'];render();assert.equal(panel.enrollmentPicker.opening,null,'Order changes close rather than shift the list');assert.deepEqual(oldRows,['owner/c','owner/a','owner/b']);
change({'owner/a':true,'owner/b':true,'owner/c':true});await drain();render();assert.equal(find(tree,'git-enrollment-footer'),undefined,'Completing final enrollment removes footer');
change({'owner/a':true});await drain();render();assert.equal(find(tree,'git-enrollment-footer'),undefined,'Pending membership quiet');
// Unknown membership is quiet too; no IO is introduced by popup presentation.
panel.notices.members.set('owner/b','unknown');panel.notices.members.set('owner/c','unknown');render();assert.equal(find(tree,'git-enrollment-footer'),undefined);
// Section visibility is independent of the inventory used by the fixed footer.
change({'owner/a':false,'owner/b':false,'owner/c':false});await drain();
for(const entry of entries.values())if(entry.pr?.repo==='owner/b')entry.pr.state='merged';
render();assert.equal(find(tree,'task-repo-owner/b'),undefined);assert.ok(find(tree,'task-repo-owner/a'));open();
assert.deepEqual([...panel.enrollmentPicker.opening.choices],['owner/b','owner/a','owner/c'],'Hidden-tab repositories remain enrollment choices in inventory order');key('escape');
panel.view='closed';render();assert.ok(find(tree,'task-repo-owner/b'));assert.equal(find(tree,'task-repo-owner/a'),undefined);assert.equal(find(tree,'task-repo-body-owner/b'),undefined,'Hidden sections keep their fold when eligible again');assert.equal(find(tree,'git-task-empty'),undefined);
for(const entry of entries.values())if(entry.pr)entry.pr.state='open';panel.view='open';render();assert.ok(find(tree,'task-repo-owner/a'));assert.ok(find(tree,'task-repo-owner/b'));
raw='';render();assert.ok(find(tree,'git-live-ci-footer'));assert.equal(find(tree,'git-enrollment-footer'),undefined,'Global missing setup takes precedence');
// Header name uses the count-strip width; tooltips require measured real overflow.
const longRepo='owner/a-very-long-canonical-repository-name';repositories=[longRepo];entries.clear();panel.aggregate.counts=()=>({open:1,closed:0});
entries.set(`${longRepo}#1`,{link:{repo:longRepo},pr:{key:`${longRepo}#1`,repo:longRepo,number:1,title:'Eligible header fixture',state:'open',url:`https://github.com/${longRepo}/pull/1`,labels:[]},error:'Scoped repository read failed'});render();
const label=()=>find(tree,`task-repo-name-${context.scope}-${longRepo}`);
const probe=()=>label().kids[1].kids[0];
assert.equal(find(tree,`task-repo-header-${longRepo}`).kids.length,3);assert.ok(find(tree,`task-repo-count-${longRepo}`));assert.ok(label().attrs.flex_1);assert.equal(label().attrs.min_w[0],0);assert.ok(label().kids[0].attrs.truncate);assert.ok(label().attrs.overflow_hidden);
assert.ok(label().kids[1].attrs.absolute);assert.ok(label().kids[1].attrs.invisible);assert.ok(probe().attrs.flex_none);assert.ok(probe().attrs.whitespace_nowrap);
for(const zoom of [0.75,1,1.25,1.5,2]){
 label().kids[0].attrs.on_size_change[0]({width:320*zoom},cx);probe().attrs.on_size_change[0]({width:250*zoom},cx);render();assert.equal(label().attrs.tooltip,undefined,'Fitting text has no tooltip');
 label().kids[0].attrs.on_size_change[0]({width:120*zoom},cx);render();assert.equal(label().attrs.tooltip[0],longRepo);
 const notified=notifications;label().kids[0].attrs.on_size_change[0]({width:120*zoom},cx);probe().attrs.on_size_change[0]({width:250*zoom},cx);assert.equal(notifications,notified,'Repeated layout measurements never loop notifications');
 panel.foldedRepositories.add(longRepo);render();assert.equal(label().attrs.tooltip[0],longRepo);assert.equal(find(tree,`task-repo-body-${longRepo}`),undefined);
 label().kids[0].attrs.on_size_change[0]({width:320*zoom},cx);render();assert.equal(label().attrs.tooltip,undefined,'Widening removes unnecessary tooltip even when folded');panel.foldedRepositories.delete(longRepo);
}
const staleMeasure=label().kids[0].attrs.on_size_change[0],notified=notifications;context={...context,scope:'replacement'};panel.aggregate.context=context;render();staleMeasure({width:1},cx);assert.equal(notifications,notified,'Old-scope geometry cannot affect another coordinator');assert.equal(label().attrs.tooltip,undefined);
assert.equal(text(find(tree,'git-view-open')),'Open');assert.equal(text(find(tree,'git-view-closed')),'Closed');assert.deepEqual({...panel.aggregate.counts()},{open:1,closed:0});
assert.equal(handles.length,1,'Repeated render, open/close and context changes never allocate another handle');
console.log('PASS real coordinator footer, zero/one/many choices, ordered dedup, fold/scroll, keyboard/dismissal, cached reads and stale Settings guards');
