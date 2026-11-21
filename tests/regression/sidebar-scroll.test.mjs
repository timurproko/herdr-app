import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import vm from 'node:vm';

function element() {
  const node={kids:[],style:{},events:{}};let el;
  el=new Proxy(node,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(el):el:k==='child'?v=>{o.kids.push(v);return el;}:k==='children'?vs=>{o.kids.push(...vs);return el;}:String(k).startsWith('on_')?(...args)=>{o.events[k]=args.at(-1);return el;}:(...args)=>{o.style[k]=args;return el;}});
  return el;
}
const nodes=n=>n&&typeof n==='object'?[n,...(n.kids??[]).flatMap(nodes)]:[];
const byId=(n,id)=>nodes(n).find(n=>n.style.id?.[0]===id);
const source=await fs.readFile(new URL('../lib/sidebar-scroll.js',import.meta.url),'utf8');
for(const name of ['custom-agents','custom-spaces'])assert.equal(await fs.readFile(new URL(`../mods/${name}/sidebar-scroll.js`,import.meta.url),'utf8'),source);
const context=vm.createContext({window:{paint_path:(shape,background)=>{const el=element();el.shape=shape;el.background=background;return el;}}});
const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});
const builder=()=>{const b={points:[],move_to(x,y){this.points.push([x,y]);return this;},line_to(x,y){this.points.push([x,y]);return this;},close(){return this;},build(){return {points:this.points};}};return b;};
const fadeSource=await fs.readFile(new URL('../lib/scroll-fade.js',import.meta.url),'utf8');
for(const name of ['custom-agents','custom-spaces','custom-picker'])assert.equal(await fs.readFile(new URL(`../mods/${name}/scroll-fade.js`,import.meta.url),'utf8'),fadeSource);
const fadeModule=new vm.SourceTextModule(fadeSource,{context});
await fadeModule.link(()=>synthetic({div:element,PathBuilder:{fill:builder},Background:{linear_gradient:(angle,from,to)=>({angle,from,to,color_space(value){this.space=value;return this;}})}}));
const mod=new vm.SourceTextModule(source,{context});
await mod.link(s=>s==='./scroll-fade.js'?fadeModule:s==='gpui-kit'?synthetic({div:element}):s==='gpui-base'?synthetic({v_flex:element}):synthetic({U:{row:28,rowGap:2}}));
await mod.evaluate();
const {SidebarScrollState,sidebarScroll}=mod.namespace;
const {bottomFade}=fadeModule.namespace;
const dialogFade=bottomFade({},'dialog','#242424',{left:0,right:8});
assert.equal(dialogFade.style.left[0],0);assert.equal(dialogFade.style.right[0],8,'Dialog fade leaves the scrollbar lane unobscured');
let notifications=0;const cx={notify:()=>notifications++};
const state=new SidebarScrollState();
state.measure('viewport',{height:100},cx);state.measure('content',{height:300},cx);
assert.equal(state.moreBelow,true);assert.equal(state.moreAbove,false);assert.equal(notifications,1);
function wheel(offset,delta,model=state){const position={x:20,y:70};model.contentMotion({position,bounds:{y:50-offset},delta:{x:0,y:delta}},'wheel');model.viewportMotion({position,bounds:{y:50,height:model.viewport}},'wheel',cx);}
wheel(0,-25);assert.equal(state.offset,25);assert.equal(state.moreAbove,true,'Top fade appears when rows are hidden above');assert.equal(notifications,2,'Entering the middle updates both edge hints once');
wheel(25,-25);assert.equal(state.offset,50);assert.equal(notifications,2,'No JS rerender for ordinary scrolling away from an edge');
wheel(50,-150);assert.equal(state.moreBelow,false,'Bottom fade disappears at the end');assert.equal(state.moreAbove,true,'Top fade remains at the bottom');assert.equal(state.offset,200);
wheel(200,15);assert.equal(state.moreBelow,true,'Scrolling upward reveals the continuation hint again');
wheel(185,10000);assert.equal(state.offset,0,'Overscroll is clamped without affecting native scroll state');assert.equal(state.moreAbove,false,'Top fade disappears at the start');
wheel(0,-10);
const before=notifications;
for(let i=10;i<110;i++)wheel(i,-1);
assert.equal(notifications,before,'One hundred non-boundary wheel events do not request repaints');
const offset=state.offset;
state.viewportMotion({position:{x:999,y:999},bounds:{y:50,height:100}},'move',cx);
assert.equal(state.offset,offset,'Unrelated viewport events cannot reuse stale content geometry');
// Rebase after native scrollbar dragging or a retained position change, as the pointer crosses content.
state.contentMotion({position:{x:20,y:70},bounds:{y:-150}},'move');
state.viewportMotion({position:{x:20,y:70},bounds:{y:50,height:100}},'move',cx);
assert.equal(state.moreBelow,false);
assert.equal(state.moreAbove,true,'Retained scroll/scrollbar geometry restores the top hint');
state.measure('viewport',{height:400},cx);assert.equal(state.moreBelow,false,'A list that fits has no fade');assert.equal(state.moreAbove,false);
state.measure('viewport',{height:100},cx);wheel(0,-100);assert.equal(state.moreAbove,true);
state.measure('content',{height:40},cx);assert.equal(state.moreBelow,false,'Folding/removing rows clears the hint');assert.equal(state.moreAbove,false);
const padded=new SidebarScrollState(12);padded.measure('viewport',{height:100},cx);padded.measure('content',{height:95},cx);assert.equal(padded.moreBelow,true,'Spaces retain bottom breathing room in overflow measurements');
const zoomed=new SidebarScrollState();zoomed.measure('viewport',{height:250},cx);zoomed.measure('content',{height:750},cx);wheel(0,-500,zoomed);assert.equal(zoomed.offset,500);assert.equal(zoomed.moreBelow,false,'Pixel bounds and wheel deltas use the same units at zoom');
const owner={},theme={chrome:'#202020'};let released=0;
let tree=sidebarScroll(owner,'test-list',theme,[element(),element()],{onMouseUp:()=>released++});
assert.equal(byId(tree,'test-list').style.mode[0],'scrolling');
byId(tree,'test-list').events.on_mouse_up({},cx);assert.equal(released,1,'Existing drag-release behavior is retained');
assert.equal(byId(tree,'test-list-content').style.gap[0],2);
assert.equal(byId(tree,'test-list-more-below'),undefined);assert.equal(byId(tree,'test-list-more-above'),undefined);
byId(tree,'test-list-frame').events.on_size_change({height:100},cx);
byId(tree,'test-list-content').events.on_size_change({height:300},cx);
tree=sidebarScroll(owner,'test-list',theme,[element(),element()]);
const fade=byId(tree,'test-list-more-below');assert.equal(fade.style.h[0],40);assert.equal(fade.style.bottom[0],0);
assert.equal(fade.kids[0].background.angle,180);assert.equal(fade.kids[0].background.from,'#20202000');assert.equal(fade.kids[0].background.to,'#202020');
assert.ok(nodes(fade).every(node=>Object.keys(node.events).length===0),'Decoration installs no wheel/click handlers or input blocker');
assert.equal(byId(tree,'test-list').style.px[0],8,'Existing content rails stay unchanged');
wheel(0,-25,owner.sidebarScroll);
tree=sidebarScroll(owner,'test-list',theme,[element(),element()]);
const top=byId(tree,'test-list-more-above'),bottom=byId(tree,'test-list-more-below');
assert.equal(top.style.h[0],40);assert.equal(top.style.top[0],0);assert.equal(top.style.bottom,undefined);
assert.equal(top.kids[0].background.angle,180);assert.equal(top.kids[0].background.from,'#202020');assert.equal(top.kids[0].background.to,'#20202000');
assert.equal(top.kids[0].background.space,'srgb');assert.equal(top.style.left[0],8);assert.equal(top.style.right[0],8);
assert.equal(top.kids[0].shape,bottom.kids[0].shape,'Both edges reuse the same immutable path');
assert.ok(nodes(top).every(node=>Object.keys(node.events).length===0),'Top gradient is passive too');
const oldTop=top.kids[0].background;
tree=sidebarScroll(owner,'test-list',{chrome:'#303030'},[element(),element()]);
assert.equal(byId(tree,'test-list-more-above').kids[0].background.from,'#303030','Theme changes rebuild the top gradient');
assert.equal(byId(tree,'test-list-more-below').kids[0].background.to,'#303030');
assert.notEqual(byId(tree,'test-list-more-above').kids[0].background,oldTop);
wheel(25,25,owner.sidebarScroll);
tree=sidebarScroll(owner,'test-list',theme,[element(),element()]);
assert.equal(byId(tree,'test-list-more-above'),undefined,'Returning to the start removes the top overlay');
console.log('PASS: matching top/bottom passive gradients, boundary-only repaint, overflow/end/resize/fold/zoom hints and retained geometry');
{
  // Dragging into the top edge band scrolls up on a timer until the start, then stops.
  const timers=[];const tcx={notify(){},timer:{after:(_ms,fn)=>timers.push(fn)}};
  const s=new SidebarScrollState(12);s.measure('viewport',{height:200},tcx);s.measure('content',{height:600},tcx);s.offset=30;
  const asks=[];const handle={scroll_to_item:i=>asks.push(i)};let held=true;
  s.dragMotion({position:{x:20,y:52},bounds:{y:50,height:200}},()=>held,handle,tcx);
  assert.equal(s.edge,-1);assert.ok(s.offset<30,'Drag at the top edge scrolls up immediately');assert.equal(s.target,s.offset,'Marker lands on the new top');assert.deepEqual(asks,[1]);
  for(let n=0;timers.length&&s.offset>0&&n<1000;n++)timers.shift()(tcx);
  assert.equal(s.offset,0);timers.shift()?.(tcx);assert.equal(s.ticking,false,'Stops at the start');assert.equal(s.target,null);
  s.dragMotion({position:{x:20,y:248},bounds:{y:50,height:200}},()=>held,handle,tcx);
  assert.equal(s.edge,1);assert.equal(s.target,s.offset+199,'Marker sits at the new view bottom');
  held=false;timers.shift()(tcx);assert.equal(s.ticking,false,'Release stops auto-scroll');assert.equal(s.edge,0);
  const before=s.offset;held=true;s.dragMotion({position:{x:20,y:150},bounds:{y:50,height:200}},()=>held,handle,tcx);assert.equal(s.edge,0);assert.equal(s.offset,before,'Middle of the list never scrolls');
  const tree=sidebarScroll({},'drag-list',theme,[element()],{dragging:()=>true,scroll:handle});assert.equal(byId(tree,'drag-list').style.track_scroll[0],handle);
  console.log('PASS: drag auto-scroll at list edges');
}
{
  // Auto-scroll stops once the droppable rows are in view; the rest of the list is unreachable.
  const timers=[];const tcx={notify(){},timer:{after:(_ms,fn)=>timers.push(fn)}};
  const s=new SidebarScrollState();s.count=20;s.measure('viewport',{height:150},tcx);s.measure('content',{height:20*30-2},tcx);
  s.range=()=>[5,9];s.offset=270;const handle={scroll_to_item(){}};
  s.dragMotion({position:{x:20,y:52},bounds:{y:50,height:150}},()=>true,handle,tcx);
  for(let n=0;timers.length&&n<1000;n++)timers.shift()(tcx);
  assert.equal(s.offset,120,'Up stops with the row above the first droppable row at the top');
  s.dragMotion({position:{x:20,y:198},bounds:{y:50,height:150}},()=>true,handle,tcx);
  for(let n=0;timers.length&&n<1000;n++)timers.shift()(tcx);
  assert.equal(s.offset,150,'Down stops once the last droppable row is in view');
  console.log('PASS: drag auto-scroll stays within the droppable rows');
}
