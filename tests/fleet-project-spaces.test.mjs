import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {element,svg,find,t} from './support/git-row.mjs';
const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true}};
let groups=[],all=[],list=[];
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,spaces:()=>groups,panes:()=>all,terminals:()=>list,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],checking:()=>false};
const {f,r,links}=await loadMod({host,entry:'import * as f from "./plugins/crew/fleet.js";import * as r from "./plugins.js";import * as links from "./workspace-links.js";export {f,r,links};',modules:{'workspace-links.js':'src/shared/workspace-links.js','space-color-state.js':'src/shared/space-color-state.js'}});
const storage=new Map(),drag={view:null,active:false,item:e=>e,sourceLayer:e=>e,guard:fn=>fn,control:e=>e};
const {Main:Spaces}=await loadMod({mod:'custom-spaces',host:{...host,openOverlay(){},watchFolder(){throw Error('No IO');},props:()=>null,settings:()=>({zoom:1}),theme:()=>t,window:()=>({active:false}),layout:()=>({id:'sidebar',size:{px:268}})},
 globals:{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},modules:{
  'main.js':'src/features/spaces/main.js','space-title.js':'src/ui/space-title.js','workspace-links.js':'src/shared/workspace-links.js','ui.js':'src/ui/ui.js',
  'gpui-kit':{View:class{},div:element,svg},'gpui-base':{h_flex:element,v_flex:element,Input:{},Popover:{},ScrollHandle:{}},
  'plugins.js':{pluginWorkspaceLinks:r.pluginWorkspaceLinks,pluginSpaceTags:r.pluginSpaceTags,pluginMenuItems:r.pluginMenuItems,pluginEvent(){}},'reorder.js':{reorder:()=>drag},
  'space-rename.js':{beginSpaceRename(){},cancelSpaceRename(){},saveSpaceRename(){},syncSpaceRename(){}},'sidebar-scroll.js':{sidebarScroll(){}},
  'directory.js':{displaySpace:s=>s,spaceDirectory:()=>({cwd:'/fixture'})},'space-color-state.js':{reconcileSpaceColors(){}},'tab-arrival.js':{startTabArrivals(){},tabArrivalMotion:(_v,e)=>e},
 },entry:'export {default as Main} from "./main.js";'});
const model=()=>({groups,all,list}),copy=v=>JSON.parse(JSON.stringify(v));
for(const machine of [null,'pc2'])for(const repositoryNames of [false,true])for(const modes of [['combined'],['herdr-app','crew'],['combined','herdr-app','crew'],['.dot','self'],['herdr-app','self'],['alias','crew']]) {
 const q=s=>machine?`${machine}/${s}`:s;
 const name=mode=>repositoryNames?({self:'core',crew:'Core',alias:'MyWorkflows','.dot':'.Dot','herdr-app':'Herdr-App'}[mode]??mode):mode==='self'?'crew':mode;
 groups=[{id:q('owner'),machine,tabs:[{id:q('owner-tab')}]}];all=[{tab:q('owner-tab'),pane:q('owner-pane'),terminal:q('t0')}];list=[{address:q('t0'),state:'live',labels:{'custom.crew.home':'1'}}];
 const tasks=modes.map((mode,i)=>{
  const suffix=mode==='combined'?'':mode==='self'?'-self':`-project-${mode}`,id=`fm-crew-home${suffix}`,terminal=q(`t${i+1}`),tab=q(`tab${i}`),project=mode==='self'?'crew:self':mode;
  groups.push({id:q(id),machine,named:false,name:'worktree',tabs:[{id:tab}]});all.push({tab,pane:q(`pane${i}`),terminal});
  list.push({address:terminal,state:'live',labels:{'crew.home':'home','crew.task':`ship${i}`,'herdr.space':id,...(mode==='combined'?{}:{'crew.space.version':'1','crew.space.mode':'per-project','crew.space.project':project,'crew.space.name':name(mode)})}});
  return {id:`ship${i}`,state:'working',terminal:`t${i+1}`,project:repositoryNames&&mode==='crew'?'crew:self':project,pr:`https://github.com/fixture/repo/pull/${i+1}`};
 });
 const status={home:'/fixture/home',owner:{terminal:'t0',live:true},tasks},bound=f.bindFleet(status,machine,model());assert.ok(bound);
 assert.equal(f.fleetChildren(bound).length,modes.length);assert.equal(bound.tasks.length,modes.length);
 const onlyOwner=f.bindFleet({...status,tasks:[]},machine,model());assert.equal(bound.pullScope,onlyOwner.pullScope,'Project cardinality is not Git home scope');
 const projected=links.projectLinkedRows(groups.map((w,i)=>({w,i})),f.fleetLinks(bound));
 assert.equal(projected.length,modes.length+1);assert.ok(projected.slice(1).every(row=>row.linked));
 for(let i=0;i<modes.length;i++)assert.equal(projected[i+1].w.name,modes[i]==='combined'?'worktree':name(modes[i]));
 const renamed=copy(groups);renamed[1].named=true;renamed[1].name='My name';assert.equal(links.projectLinkedRows(renamed.map((w,i)=>({w,i})),f.fleetLinks(bound))[1].w.name,'My name');
 // Real verification, durable presentation and registry links, not bind-only proof.
 const jobs=[],cx={spawn(fn){const job=Promise.resolve().then(()=>fn(cx));jobs.push(job);return {is_done:()=>false};},notify(){}};
 f.invalidateFleet();f.refreshFleets(cx,async()=>JSON.stringify(status),true);await Promise.all(jobs.splice(0));
 assert.equal(r.pluginWorkspaceLinks({presentation:true}).length,modes.length);assert.equal(r.pluginWorkspaceLinks().length,modes.length);
 assert.equal(r.pluginPullContext(q('owner')).links.length,modes.length);
 const view=new Spaces();view.shown=new Set(groups.map(s=>s.id));view.born={};view.git={};view.rebuilt=()=>false;
 const rows=view.ordered(),parent=rows.find(row=>row.w.id===q('owner')),parentTree=view.row(parent,t);
 assert.equal(find(parentTree,`space-count-${q('owner')}`).kids[0].kids[0],String(modes.length),'Actual Spaces counts connected children, not workers');
 const disclosure=find(parentTree,`space-fold-${q('owner')}`);assert.ok(disclosure,'Actual coordinator has a disclosure control');
 for(const child of rows.filter(row=>row.linked))assert.ok(find(view.row(child,t),`space-branch-${child.w.id}`));
 view.connectedFolds().clear();disclosure.attrs.on_click[0]({},{stop_propagation(){},notify(){}});
 assert.equal(view.visibleRows(false).length,1,'Disclosure hides all children');view.connectedFolds().clear();
 for(const source of r.pluginPullContext(q('owner')).links)assert.equal(source.space,bound.tasks.find(t=>t.id===source.task).space,'Generic PR ordering carries exact verified native child membership');
 for(const link of r.pluginWorkspaceLinks({presentation:true}))assert.equal(f.fleetColorAllowed(link),true);
 // Fresh module restores safe captions through the durable decoder, not action tokens.
 const cold=await loadMod({host,modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'export * as r from "./plugins.js";'});
 assert.equal(cold.r.pluginWorkspaceLinks({presentation:true}).length,modes.length,'Repository-named display survives a cold provider');
 assert.equal(cold.r.pluginWorkspaceLinks().length,0,'Persisted names and tokens grant no cold action authority');
 assert.equal(cold.r.pluginPullContext(q('owner'),{presentation:true}).links.length,0);
 state['custom.spaces.preferences'].connectFleetToCoordinator=false;f.invalidateFleet();
 assert.equal(r.pluginWorkspaceLinks({presentation:true}).length,0);
 state['custom.spaces.preferences'].connectFleetToCoordinator=true;
 assert.equal(r.pluginWorkspaceLinks({presentation:true}).length,modes.length,'Toggle restores remembered names before a fresh read');
 assert.equal(r.pluginPullContext(q('owner')),null);
 f.refreshFleets(cx,async()=>JSON.stringify(status),true);await Promise.all(jobs.splice(0));
 assert.equal(r.pluginPullContext(q('owner')).links.length,modes.length);
 const before=copy(list);
 for(const mutate of [t=>t.labels['crew.home']='other',t=>t.labels['crew.task']='wrong',t=>t.labels['herdr.space']='wrong',t=>t.address='other/t1',...(modes[0]==='combined'?[]:[t=>t.labels['crew.space.version']='2',t=>t.labels['crew.space.project']='wrong',t=>t.labels['crew.space.name']='../wrong'])]) {
  list=copy(before);mutate(list[1]);assert.equal(f.bindFleet(status,machine,model())?.tasks.length===tasks.length,false,'Contradictory membership cannot attest all tasks');
 }
 list=before;const saved=copy(all);all.push({...all[1],pane:'duplicate'});assert.equal(f.bindFleet(status,machine,model())?.tasks.length===tasks.length,false);all=saved;
 const parsed=f.recordedSource(JSON.stringify(status));assert.equal(parsed.tasks[0].project,tasks[0].project,'Transport project survives normalization');
 if(modes[0]!=='combined') {
  const original=list[1].labels['crew.space.name'];
  for(const invalid of [undefined,null,'',' ','.','..','a/b','a\\b','x\n','x\u007f',42,'x'.repeat(4097)]) {
   list[1].labels['crew.space.name']=invalid;
   assert.equal(f.bindFleet(status,machine,model()),null,'Unsafe or absent display metadata still refuses');
  }
  for(const valid of ['Other repository','Répo 😀','x'.repeat(4096)]) {
   list[1].labels['crew.space.name']=valid;
   assert.ok(f.bindFleet(status,machine,model()),'A safe basename does not have to equal its project');
  }
  list[1].labels['crew.space.name']=original;
  const duplicate={...list[1],address:q('conflicting-worker'),labels:{...list[1].labels,'crew.task':'conflict','crew.space.name':'Different name'}};
  list.push(duplicate);all.push({...all[1],pane:q('conflict-pane'),terminal:duplicate.address});
  assert.equal(f.bindFleet({...status,tasks:[...tasks,{...tasks[0],id:'conflict',terminal:'conflicting-worker'}]},machine,model()),null,'One native child cannot carry conflicting saved names');
  list.pop();all.pop();
 }
 if(modes[0]!=='combined') {
  f.refreshFleets(cx,async()=>{throw Error('Cached discovery must not reverify');},false,async()=>JSON.stringify({...status,tasks:tasks.map((t,i)=>i?t:{...t,project:'foreign-project'})}));
  await Promise.all(jobs.splice(0));assert.equal(r.pluginPullContext(q('owner')).links.length,modes.length,'Discovery cannot replace a verified project binding or invalidate known facts');
 }
}
console.log('PASS combined/project/mixed placement-v1 exact identities, names, native membership, qualified machines, durable registry links and colour authority');
