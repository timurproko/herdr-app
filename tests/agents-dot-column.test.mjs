// Real Agents renderer + shared status/slot helpers; no native host or sessions.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {element,svg,nodes,find,t,rowGeometry} from './support/git-row.mjs';
let list=[],sort='grouped',sidebarWidth=268;
const fail=()=>{throw Error('Geometry rendering must not perform host actions');};
const {Main}=await loadMod({mod:'custom-agents',
  host:{agents:()=>list,terminals:()=>[],panes:()=>[],focused:()=>null,
    spaces:()=>[],theme:()=>t,shared:key=>key==='agents.sort'?sort:null,
    setShared:fail,setAgentOrder(){},run:fail,openOverlay:fail,closeOverlay:fail,
    props:()=>({}),window:()=>({platform:'windows'}),layout:()=>({id:'sidebar',size:{px:sidebarWidth}})},
  modules:{'main.js':'src/features/agents/main.js','ui.js':'src/ui/ui.js',
    'gpui-kit':{View:class{},div:element,image:element,svg},
    'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover:{},Input:{}},
    'program-icon.js':{programIcon:()=>element().size(16).flex_none()},
    'directory.js':{paneDirectory:()=>({})},'plugins.js':{pluginAgentGroupFirst:()=>false,pluginMenuItems:()=>[]},
    'sidebar-scroll.js':{sidebarScroll:(_view,id,_t,rows)=>element().id(id).flex().flex_col().children(rows)}},
  entry:'export {default as Main} from "./main.js";'});
const panel=new Main(),cx={notify:fail};panel.changed={};panel.pendingPins=[];panel.migratingPins=new Set();
panel.track=()=>{}; // Changes are controller-owned; no storage/timing IO in geometry.
const setGroups=(counts,statuses)=>{
  list=counts.flatMap((count,g)=>Array.from({length:count},(_,i)=>({address:`t${g}-${i}`,space:`s${g}`,
    space_name:`Group ${g}`,title:'Copy toast not showing',status:statuses[g],seq:g*1000+i})));
};
const render=(width,zoom)=>{
  sidebarWidth=width;const tree=panel.render(cx);
  // Resolve the margin shorthand used by Done/Idle. The shared box model handles
  // physical margins; forgetting these would miss the original mixed-state bug.
  for(const node of nodes(tree))if(node.attrs.mx){node.attrs.ml??=node.attrs.mx;node.attrs.mr??=node.attrs.mx;}
  return {tree,boxes:rowGeometry(tree,width,zoom)};
};
const near=(a,b,message)=>assert.ok(Math.abs(a-b)<1e-7,`${message}: ${a} versus ${b}`);
const center=(boxes,node)=>{const b=boxes.get(node);return b.x+b.width/2;};
let comparisons=0;
for(const width of [220,268,300,390])for(const zoom of [.75,1,1.25,1.3,1.5,2]) {
  // Count length AND status vary independently: the screenshot mixes green Done
  // (with margins) and blue Working (without), not merely different counts.
  for(const statuses of [['done','working','done'],['working','done','working'],['done','done','done']]) {
    setGroups([1,10,100],statuses);panel.folded=new Set([0,1,2].map(g=>`sp-Group ${g}`));
    const {tree,boxes}=render(width,zoom);let dotX,countRight,chevronX;
    for(let g=0;g<3;g++) {
      const header=find(tree,`sp-Group ${g}`),meta=find(tree,`agent-group-meta-sp-Group ${g}`);
      const bulb=nodes(header).find(n=>n.attrs.size?.[0]===7),count=find(tree,`agent-count-sp-Group ${g}`);
      assert.ok(bulb);const x=center(boxes,bulb),box=boxes.get(count),right=box.x+box.width;
      if(g===0){dotX=x;countRight=right;chevronX=center(boxes,meta.kids.at(-1));}
      near(x,dotX,'Mixed-state 1/2/3-digit group dots occupy one column');
      near(right,countRight,'Count slots have one fixed right edge');
      near(box.width,32*zoom,'Three-digit count slot stays fixed');
      assert.ok(count.kids[0].attrs.text_right,'Digits are right aligned, not centred');
      assert.ok(count.attrs.flex_none,'Count width cannot shrink');
      near(center(boxes,meta.kids.at(-1)),chevronX,'Chevron rail stays fixed');comparisons++;
    }
    panel.folded.clear();const expanded=render(width,zoom);
    for(let g=0;g<3;g++) {
      assert.equal(find(expanded.tree,`agent-group-status-sp-Group ${g}`),undefined,'Expanded headers omit the dot');
      const count=find(expanded.tree,`agent-count-sp-Group ${g}`),box=expanded.boxes.get(count);
      near(box.x+box.width,countRight,'Expanded and collapsed count slots align');
      const age=find(expanded.tree,`agent-age-t${g}-0`),ageBox=expanded.boxes.get(age);
      near(ageBox.x+ageBox.width,countRight,'Time text keeps its existing right edge');
      const row=find(expanded.tree,`ag-t${g}-0`),bulb=nodes(row).find(n=>n.attrs.size?.[0]===7);
      near(center(expanded.boxes,bulb),chevronX,'Agent-row dots remain on the chevron rail by design');
    }
  }
  for(const counts of [[9,10,100],[10,10,100],[99,10,100],[100,10,100]]) {
    setGroups(counts,['working','done','working']);panel.folded=new Set([0,1,2].map(g=>`sp-Group ${g}`));
    const {tree,boxes}=render(width,zoom),bulbs=[0,1,2].map(g=>nodes(find(tree,`sp-Group ${g}`)).find(n=>n.attrs.size?.[0]===7));
    near(center(boxes,bulbs[0]),center(boxes,bulbs[1]),'9/10 and 99/100 transitions cannot move the dot');
  }
}
// Compact indices share the existing two-digit font, never the larger body font.
// Keep the original 8/12px number slots, 2px gap and 14px status rail unchanged.
for(const mode of ['grouped','priority'])for(const width of [44,76])for(const zoom of [1,1.3]) {
 sort=mode;setGroups([12],['working']);panel.folded.clear();
 list.forEach((agent,i)=>agent.status=['working','done','idle'][i%3]);
 const {tree}=render(width,zoom),rows=nodes(tree).filter(n=>/^ag-t/.test(n.attrs.id?.[0]??''));
 assert.equal(rows.length,12);const indices=[];
 for(const row of rows) {
  const number=row.kids[0],status=row.kids[1],index=Number(number.kids[0]);indices.push(index);
  assert.equal(number.attrs.text_size[0],10,`Compact index ${index} uses the two-digit size`);
  assert.equal(number.attrs.w[0],index>=10?12:8);assert.equal(status.attrs.w[0],14);
  assert.equal(row.attrs.gap[0],2);assert.equal(row.attrs.w[0],28);assert.equal(row.attrs.h[0],28);
  const boxes=rowGeometry(row,28,zoom);
  near(center(boxes,number),6*zoom,'Number-slot centre stays unchanged');
  near(center(boxes,status),(index>=10?21:19)*zoom,'Status rail keeps its original digit-specific position');
  const dot=nodes(status).find(n=>n.attrs.size?.[0]===7);assert.ok(dot);near(center(boxes,dot),center(boxes,status),'Status dots remain centred in their retained rail');
 }
 assert.deepEqual(indices,[1,2,3,4,5,6,7,8,9,10,11,12]);
}
console.log(`PASS: Agents dot/count columns; ${comparisons} mixed-state/count comparisons, zoom 75–200%, unchanged time/chevron rails; compact 1–12 use 10px at 100/130% with retained slots and dots`);
