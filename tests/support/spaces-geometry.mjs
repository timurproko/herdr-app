// Real Spaces chrome/list/rows and shared UI; inert host and drag transport only.
import {loadMod} from '../../tools/plugin-harness.mjs';
import {element,svg,t} from './git-row.mjs';
export async function spacesGeometryHarness() {
  const spaces=[{id:'coordinator',name:'Coordinator',machine:null},{id:'fleet',name:'Fleet',machine:null}];
  const drag={view:null,control:e=>e,item:e=>e,sourceLayer:e=>e,surface:e=>e,guard:fn=>fn};
  const fail=()=>{throw Error('Geometry must not perform host actions');};
  const {Main}=await loadMod({mod:'custom-spaces',host:{spaces:()=>spaces,panes:()=>[],machines:()=>[],theme:()=>t,
    props:()=>null,layout:()=>({}),shared:()=>undefined,run:fail,setShared:fail,openOverlay:fail,watchFolder:fail,settings:()=>({zoom:1})},
    modules:{'main.js':'src/features/spaces/main.js','ui.js':'src/ui/ui.js','space-title.js':'src/ui/space-title.js',
      'sidebar-scroll.js':'src/ui/sidebar-scroll.js','scroll-fade.js':{topFade:element,bottomFade:element},
      'gpui-kit':{View:class{},div:element,svg},
      'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover:{},Input:{},ScrollHandle:{}},
      'tab-arrival.js':{startTabArrivals(){},tabArrivalMotion:(_o,e)=>e},'reorder.js':{reorder:()=>drag},
      'space-rename.js':{beginSpaceRename:fail,cancelSpaceRename:fail,saveSpaceRename:fail,syncSpaceRename(){}},
      'directory.js':{displaySpace:s=>s,spaceDirectory:()=>({cwd:'/fixture'})},'space-color-state.js':{reconcileSpaceColors(){}},
      'plugins.js':{pluginEvent:fail,pluginSpaceTags:()=>[{plugin:'crew',label:'Crew'}],pluginWorkspaceLinks:()=>[]},
      'workspace-links.js':{projectLinkedRows:rows=>rows,captureSpaceBlock(){},blockTarget(){},planBlockDrop(){},SpaceBlockCommit:class{}}},
    entry:'export {default as Main} from "./main.js";'});
  const panel=new Main();panel.machines=[];panel.reconnecting={};panel.shown=new Set(spaces.map(s=>s.id));
  panel.ordered=()=>spaces.map((w,i)=>({w,i,linked:i===1,block:['coordinator','fleet']}));
  return {panel,render:()=>panel.render({notify:fail})};
}
