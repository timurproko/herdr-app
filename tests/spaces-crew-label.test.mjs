// Real Spaces + registry + Crew declaration. No app, Crew command or network.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {element,svg,find,nodes,t,rowGeometry} from './support/git-row.mjs';
const store=new Map(),storage=new Map(),overlays=[];let all=[],panes=[],terminals=[],links=[];
const fail=()=>assert.fail('Label visibility must not start IO, navigation or Crew work');
const drag={view:null,active:false,control:e=>e,item:e=>e,sourceLayer:e=>e,guard:f=>f};
const host={shared:k=>store.get(k),setShared:(k,v)=>store.set(k,v),notify(){},spaces:()=>all,panes:()=>panes,terminals:()=>terminals,
  machines:()=>[],settings:()=>({zoom:1}),theme:()=>t,props:()=>null,window:()=>({active:false}),layout:()=>({id:'sidebar',size:{px:268}}),
  exec:fail,hc:fail,run:fail,watchFolder:fail,openOverlay:p=>overlays.push(p),closeOverlay:fail};
const {Main,r}=await loadMod({mod:'custom-spaces',host,globals:{localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}},
  modules:{'main.js':'src/features/spaces/main.js','ui.js':'src/ui/ui.js','space-title.js':'src/ui/space-title.js','workspace-links.js':'src/shared/workspace-links.js',
    'space-rename.js':{beginSpaceRename:fail,cancelSpaceRename:fail,saveSpaceRename:fail,syncSpaceRename(){}},'sidebar-scroll.js':{sidebarScroll:fail},
    'gpui-kit':{View:class{},div:element,svg},'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Input:{},Popover:{},ScrollHandle:{}},
    'reorder.js':{reorder:()=>drag},'directory.js':{displaySpace:s=>s,spaceDirectory:()=>({cwd:'/fixture'})},'space-color-state.js':'src/shared/space-color-state.js',
    'tab-arrival.js':{startTabArrivals(){},tabArrivalMotion:(_v,e)=>e}},
  entry:'export {default as Main} from "./main.js";import * as r from "./plugins.js";export {r};'});
const crew=r.pluginById('crew'),other=r.pluginById('files');
crew.workspaceLinks=()=>links;other.spaceTags=()=>[{label:'Other',tooltip:'Other role'}];r.setPluginEnabled(other,true);
const panel=new Main();Object.assign(panel,{shown:new Set(),born:{},git:{},folded:new Set(),machines:[],reconnecting:{},rebuilt:()=>false});
let notifications=0;const cx={stop_propagation(){},notify(){notifications++;}};
const option=()=>find(panel.optionsMenu(t),'spaces-option-crew-label');
const tag=(tree,id)=>nodes(tree).find(n=>n.attrs.id?.[0]?.startsWith(`space-tag-${id}-crew-`));
const row=(space,attached)=>panel.row({w:space,i:all.indexOf(space),...(attached?{block:all.map(s=>s.id),binding:'fixture',linked:space!==all[0]}:{})},t);
assert.equal(option(),undefined,'Crew off means no menu entry');
assert.equal(r.pluginSetting(crew,'showSpaceLabel'),true,'Missing setting defaults on');
r.setPluginEnabled(crew,true);
assert.ok(option());assert.equal(option().kids.at(-1).attrs.size[0],14,'Same checked-row check glyph as built-ins');
assert.deepEqual(Array.from(panel.options(),o=>o.label),['Machine status','Worktree icon','Crew label']);
panel.optionsButton(t).attrs.on_click[0]({},cx);assert.equal(overlays.at(-1).height,40+3*30+8,'Popup includes the contributed row');
const menuBefore=overlays.length;option().attrs.on_click[0]({},cx);
assert.equal(r.pluginSetting(crew,'showSpaceLabel'),false);assert.equal(option().kids.length,2,'Unchecked icon and label, no check');
assert.equal(overlays.length,menuBefore,'Toggling does not open or close a popup');
assert.equal(notifications,1,'Immediate repaint is requested once');
for(const machine of [null,'pc2'])for(const attached of [false,true]) {
  all=['parent','child'].map(id=>({id:machine?`${machine}/${id}`:id,name:id,machine,tabs:[{id:`tab-${id}`}]}));
  panes=all.map((s,i)=>({tab:s.tabs[0].id,terminal:`${machine?machine+'/':''}t${i}`}));
  terminals=panes.map((p,i)=>({address:p.terminal,state:'live',labels:i?{'crew.task':'fixture','crew.kind':'ship'}:{'custom.crew.home':'1'}}));
  links=attached?[{parent:all[0].id,child:all[1].id,binding:'fixture'}]:[];panel.shown=new Set(all.map(s=>s.id));
  for(const space of all) {
    assert.equal(tag(row(space,attached),space.id),undefined,'Hidden labels on local/remote connected/independent rows');
    assert.ok(nodes(row(space,attached)).some(n=>n.kids?.includes('Other')),'Other plugin tags remain');
    assert.equal(r.pluginSpaceTags(space).find(tag=>tag.plugin==='crew')?.label,'Crew','Unscoped terminal-pane tag query remains unchanged');
  }
  const hiddenParent=row(all[0],attached),hiddenGeometry=rowGeometry(hiddenParent,268);
  if(attached){assert.ok(find(hiddenParent,`space-fold-${all[0].id}`));assert.ok(find(hiddenParent,`space-count-${all[0].id}`));}
  option().attrs.on_click[0]({},cx);assert.equal(r.pluginSetting(crew,'showSpaceLabel'),true);
  assert.equal(tag(row(all[0],attached),all[0].id).kids[0],'crew');
  if(attached) {
    assert.equal(tag(row(all[1],attached),all[1].id),undefined,'Connected child never duplicates Crew');
    const visibleParent=row(all[0],attached),geometry=rowGeometry(visibleParent,268);
    for(const id of [`space-fold-${all[0].id}`,`space-count-${all[0].id}`])assert.deepEqual(geometry.get(find(visibleParent,id)),hiddenGeometry.get(find(hiddenParent,id)),'Hiding text does not move real count/disclosure controls');
  }
  option().attrs.on_click[0]({},cx);assert.equal(r.pluginSetting(crew,'showSpaceLabel'),false);
}
// Existing toggle values are independent and remain checkable in the same popup.
for(const key of ['spaces.show.machineStatus','spaces.show.worktree']) {
  find(panel.optionsMenu(t),`spaces-option-${key}`).attrs.on_click[0]({},cx);assert.equal(store.get(key),false);
  assert.equal(r.pluginSetting(crew,'showSpaceLabel'),false);
}
const stale=option();r.setPluginEnabled(crew,false);assert.equal(option(),undefined);
stale.attrs.on_click[0]({},cx);assert.equal(r.pluginSetting(crew,'showSpaceLabel'),false,'Disabled captured callback cannot write');
panel.optionsButton(t).attrs.on_click[0]({},cx);assert.equal(overlays.at(-1).height,40+2*30+8);
r.setPluginEnabled(crew,true);assert.equal(option().kids.length,2,'Re-enable preserves hidden labels');
const restored=new Main();assert.equal(find(restored.optionsMenu(t),'spaces-option-crew-label').kids.length,2,'New view restores stored choice');
r.setPluginSetting(crew,'showSpaceLabel','false');assert.equal(r.pluginSetting(crew,'showSpaceLabel'),false,'Only typed booleans are accepted');
assert.equal(store.get('spaces.show.machineStatus'),false);assert.equal(store.get('spaces.show.worktree'),false);
console.log('PASS real Crew/registry/Spaces default-on menu, captured enablement, persistence, checks/height, local/remote connected/independent labels, unrelated tags and terminal badges without IO');
