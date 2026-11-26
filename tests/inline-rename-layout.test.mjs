import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {spacesGeometryHarness} from './support/spaces-geometry.mjs';
import {element,svg,find,nodes,rowGeometry,t} from './support/git-row.mjs';
const noop=()=>{},space={id:'s',active:true,tabs:[{id:'tab-with-dashes',name:'A longer named tab',named:true,active:true}]};
const drag={active:false,current:null,view:null,guard:fn=>fn,control:e=>e,item:e=>e,surface:e=>e,preview:()=>null};
const {Tabs,R}=await loadMod({mod:'custom-tabs',host:{spaces:()=>[space],panes:()=>[],run:noop,openOverlay:noop,theme:()=>t,settings:()=>({zoom:1}),window:()=>({platform:'windows'}),layout:()=>({id:'root',children:[]})},modules:{
 'main.js':'src/features/tabs/main.js','ui.js':'src/ui/ui.js','gpui-kit':{View:class{},div:element,svg,image:element},'gpui-base':{h_flex:()=>element().flex(),Popover:{},Input:{new:()=>element()},Toggle:{new:()=>element()}},
 'file-icons.js':{fileIconAsset:()=>''},'program-icon.js':{programIcon:()=>element().size(16)},'directory.js':{tabDirectory:()=>null},
 'profile-warm.js':{startProfileWarm:noop},'profile-launches.js':{startProfileLaunches:noop},
 'tab-rename.js':{tabTitle:tab=>tab.name,beginTabRename:noop,cancelTabRename:noop,saveTabRename:noop,syncTabRename:noop},'rename-keys.js':{startRenameKeys:noop},'close-space.js':{closeWithConfirmation:noop},'space-lifecycle.js':{startSpaceLifecycle:noop,workTabs:s=>s.tabs},'reorder.js':{reorder:()=>drag,insertionIndex:()=>null,insertionSlot:()=>null},'panel-state.js':{changePanel:noop,syncPanelState:noop},'plugins.js':{sidebarPanels:()=>[]},
},entry:'export {default as Tabs} from "./main.js";export {INLINE_RENAME as R} from "./ui.js";'});
const tabs=new Tabs(),spaces=await spacesGeometryHarness(),id=space.tabs[0].id;
for(const width of [180,260,400])for(const zoom of [1,1.3]) {
 tabs.rename=null;const normal=tabs.render({}),normalBox=rowGeometry(normal,width,zoom,28).get(find(normal,`tab-${id}`));
 const startWidth=90;tabs.rename={id,space:'s',input:{},handle:{},token:'fixture',expanded:true,startWidth};
 spaces.panel.rename={id:'coordinator',input:{},handle:{}};
 const tabTree=tabs.render({}),sideTree=spaces.render(),tabGeometry=rowGeometry(tabTree,width,zoom,28),sideGeometry=rowGeometry(sideTree,width,zoom,600);
 const frame=find(tabTree,`tab-rename-${id}`),sideFrame=find(sideTree,'space-rename-coordinator');
 assert.equal(frame.attrs.gap[0],R.gap);assert.equal(sideFrame.attrs.gap[0],R.gap);
 assert.equal(find(tabTree,`tab-title-slot-${id}-fixture`).attrs.w[0],Math.max(startWidth,R.minFieldWidth+R.gap+R.actionsWidth),'No extra 24px width inflation');
 assert.equal(tabGeometry.get(find(tabTree,`tab-${id}`)).height,normalBox.height,'Entering rename does not change tab height');
 for(const [tabId,sideId]of [[`rename-apply-${id}`,'space-rename-apply-coordinator'],[`rename-cancel-${id}`,'space-rename-cancel-coordinator']]) {
  const a=find(tabTree,tabId),b=find(sideTree,sideId);assert.ok(a&&b);
  for(const key of ['size','rounded','text_color','disabled','tab_index'])assert.deepEqual(a.attrs[key],b.attrs[key]);
  assert.equal(a.attrs.size[0],24);assert.equal(nodes(a).find(n=>n.attrs.asset)?.attrs.size[0],14);
  for(const state of ['hover','focus']){const at=element(),bt=element();a.attrs[state][0](at);b.attrs[state][0](bt);assert.deepEqual(at.attrs,bt.attrs,'Shared hover/focus treatment');}
 }
 for(const [tree,geometry,prefix,target,apply,cancel]of [[tabTree,tabGeometry,'tab-rename',id,`rename-apply-${id}`,`rename-cancel-${id}`],[sideTree,sideGeometry,'space-rename','coordinator','space-rename-apply-coordinator','space-rename-cancel-coordinator']]) {
  const field=geometry.get(find(tree,`${prefix}-field-${target}`)),a=geometry.get(find(tree,apply)),b=geometry.get(find(tree,cancel));
  assert.equal(field.height,24*zoom);assert.ok(field.width>0);assert.ok(Math.abs(a.x-field.x-field.width-4*zoom)<1e-6);assert.ok(Math.abs(b.x-a.x-a.width-2*zoom)<1e-6);
  assert.equal(field.y+field.height/2,a.y+a.height/2);assert.equal(a.y+a.height/2,b.y+b.height/2);
 }
}
console.log('PASS actual Tabs/Spaces inline rename parity at default/narrow widths and 100/130%: dimensions, glyphs, gaps, centres, hover/focus, stable height and minimal tab expansion');
