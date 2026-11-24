// Native size events are edge-triggered by element ID and dimensions. Keep
// historical IDs even while absent: replaying every callback hides these bugs.
import assert from 'node:assert/strict';
import {rowHarness as loadRows,find,nodes,t} from './support/git-row.mjs';
import {ordinaryContent,taskContent,activeContent,taskWindow,scrollTask} from './support/git-scroll.mjs';
const rowHarness=()=>loadRows({modules:process.env.GIT_LIFECYCLE_MAIN?{'main.js':process.env.GIT_LIFECYCLE_MAIN}:{}});
const only=process.argv[process.argv.indexOf('--case')+1];
const selected=name=>!process.argv.includes('--case')||only===name;
const nativeSizes=()=>{
 const sizes=new Map();
 return (node,size,cx)=>{
  const id=node.attrs.id[0],old=sizes.get(id);
  if(old?.width===size.width && old?.height===size.height)return false;
  sizes.set(id,{...size});node.attrs.on_size_change[0](size,cx);return true;
 };
};
const first=(tree,prefix)=>nodes(tree).find(node=>String(node.attrs.id?.[0]).startsWith(prefix));
const rows=(h,n=30)=>Array.from({length:n},(_,i)=>h.facts.pullRow({number:i+1,title:`PR ${i+1}`,state:'OPEN',author:{login:'fixture'}},'owner'));
function ordinary(h) {
 const {panel,cx}=h;panel.shown=()=>true;panel.pulls.open=rows(h);panel.pulls.closed=rows(h);
 const render=()=>h.render(()=>panel.renderPulls(t));
 const size=nativeSizes();
 const layout=(tree,content=2400,viewport=400)=>({
  frame:size(find(tree,'pulls-scroll-frame'),{width:390,height:viewport},cx),
  content:size(ordinaryContent(tree),{width:390,height:content},cx),
 });
 return {render,layout};
}
// Review #2: neither tab nor folder changes physically resize this frame.
if(selected('viewport')) {
 const h=await rowHarness(),{panel}=h,{render,layout}=ordinary(h);
 let tree=render();assert.deepEqual(layout(tree),{frame:true,content:true});tree=render();assert.ok(find(tree,'pulls-list-more-below'));
 for(const action of [()=>panel.view='closed',()=>panel.view='open',()=>panel.context='folder-b',()=>panel.context='folder-a',()=>panel.context='folder-b']) {
  action();tree=render();const emitted=layout(tree);assert.equal(emitted.frame,false,'Unchanged shared frame emits no new measurement');
  tree=render();assert.equal(panel.ordinaryScroll.get(panel.view).viewport,400);assert.ok(find(tree,'pulls-list-more-below'),'Overflow still fades without pointer movement');assert.equal(find(tree,'pulls-list-more-above'),undefined);
 }
}
// Audit: a retained tab can return after the shared frame changed in another
// tab. Its content size is unchanged, but its old edge flags are no longer valid.
if(selected('audit')) {
 const h=await rowHarness(),{panel}=h,{render,layout}=ordinary(h);
 let tree=render();layout(tree,390,400);tree=render();assert.equal(find(tree,'pulls-list-more-below'),undefined);
 panel.view='closed';tree=render();layout(tree,390,300);tree=render();assert.ok(find(tree,'pulls-list-more-below'));
 panel.view='open';tree=render();assert.deepEqual(layout(tree,390,300),{frame:false,content:true});tree=render();assert.ok(find(tree,'pulls-list-more-below'));
}
// Review #3: live zoom, not a fresh panel per scale. The physical frame remains
// 400px, so the old size-only callback must not be manufactured by the test.
if(selected('zoom')) {
 const h=await rowHarness(),{panel,cx}=h,{render,layout}=ordinary(h);
 let tree=render();layout(tree);tree=render();
 const event={position:{x:50,y:100},bounds:{x:0,y:-1000,width:390,height:2400},delta:{y:0}};
 ordinaryContent(tree).attrs.on_mouse_move[0](event);find(tree,'pulls-scroll-frame').attrs.on_mouse_move[0]({...event,bounds:{x:0,y:0,width:390,height:400}},cx);
 tree=render();assert.equal(panel.ordinaryScroll.get('open').offset,1000);
 const stale=ordinaryContent(tree).attrs.on_size_change[0];
 for(const [zoom,content,offset]of [[0.5,1200,500],[2,4800,2000],[1,2400,1000]]) {
  h.setZoom(zoom);tree=render();assert.equal(layout(tree,content).frame,false);tree=render();
  const metrics=panel.ordinaryScroll.get('open');assert.equal(metrics.viewport,400);assert.equal(metrics.offset,offset);
  assert.ok(find(tree,'pulls-list-more-above'));assert.ok(find(tree,'pulls-list-more-below'),'Zoom cannot hide the remaining content');
  if(zoom===0.5){stale({width:390,height:9999},cx);assert.equal(metrics.content,1200,'Old-zoom callback cannot overwrite current geometry');assert.equal(metrics.max-metrics.offset,300);}
 }
}
async function coordinator(count=1) {
 const h=await rowHarness(),{panel,cx}=h;
 let scope='home',notice='Task history: owner/repo #36 could not be read',repos=['owner/repo'];
 const list=rows(h,count).map(pr=>({...pr,key:`owner/repo#${pr.number}`,repo:'owner/repo'}));
 panel.context='tasks:home';panel.shown=()=>true;
 panel.aggregate={context:{scope},currentContext:()=>({scope}),repositories:()=>repos,rows:()=>repos.length?list:[],readNotice:()=>notice,counts:()=>({open:count,closed:0}),target:()=>null};
 panel.notices={sync(){},presentation(){}};panel.enrollmentPicker={render(){}};panel.syncChecksFallback=()=>{};
 const render=()=>h.render(()=>panel.renderAggregate(cx,t));
 const size=nativeSizes();
 return {h,panel,cx,render,size,notice:value=>{notice=value;},repos:value=>{repos=value;},scope:value=>{scope=value;panel.context=`tasks:${scope}`;panel.aggregate.context={scope};}};
}
// Review #1: replacement text has a new cache key but the exact same 41px
// native dimensions. The new measurement ID, not an unconditional callback,
// must recover the measured height and the complete spacer extent.
if(selected('notice')) {
 const c=await coordinator(),{panel,cx,render,size}=c;
 let tree=render();size(first(tree,'task-pulls-frame-'),{width:390,height:400},cx);tree=render();
 let notice=first(tree,'task-notice-measure-');assert.ok(size(notice,{width:382,height:41},cx));tree=render();
 const w=taskWindow(panel),total=w.height,oldId=notice.attrs.id[0],stale=notice.attrs.on_size_change[0];assert.equal(w.items.at(-1).height,41);
 c.notice('Task history: owner/repo #37 could not be read');tree=render();notice=first(tree,'task-notice-measure-');
 assert.notEqual(notice.attrs.id[0],oldId);assert.equal(w.items.at(-1).height,24.5);
 assert.ok(size(notice,{width:382,height:41},cx),'A fresh native ID emits the same dimensions again');tree=render();
 assert.equal(w.items.at(-1).height,41);assert.equal(w.height,total,'Wrapper and spacer extent retain the multiline height');
 assert.equal(first(tree,'task-item-notice:').attrs.h[0],41);assert.equal(size(first(tree,'task-notice-measure-'),{width:382,height:41},cx),false);
 stale({width:382,height:99},cx);assert.equal(w.noticeHeights.size,2,'Obsolete notice callbacks are rejected');
}
// Audit: a coordinator scope can return after its old TaskWindow was retired.
// New cache owners need fresh native frame/content identities at equal sizes.
if(selected('audit')) {
 const c=await coordinator(),{panel,cx,render,size}=c;c.notice(null);
 for(const scope of ['home','other','home']) {
  c.scope(scope);let tree=render();assert.ok(size(first(tree,'task-pulls-frame-'),{width:390,height:400},cx));tree=render();
  assert.ok(size(taskContent(tree),{width:390,height:taskWindow(panel).height+8},cx));tree=render();assert.equal(taskWindow(panel).viewport,400);
 }
}
// Audit: coordinator live zoom also keeps an unchanged physical frame while
// the logical viewport expands. The content measurement is zoom-keyed.
if(selected('audit')) {
 const c=await coordinator(30),{h,panel,cx,render,size}=c;c.notice(null);
 let tree=render();size(first(tree,'task-pulls-frame-'),{width:390,height:400},cx);tree=render();
 for(let i=0;i<5;i++){size(taskContent(tree),{width:390,height:taskWindow(panel).height+8},cx);scrollTask(panel,tree,cx,taskWindow(panel).max);tree=render();}
 size(taskContent(tree),{width:390,height:taskWindow(panel).height+8},cx);scrollTask(panel,tree,cx,1000);tree=render();
 h.setZoom(0.5);tree=render();assert.equal(size(first(tree,'task-pulls-frame-'),{width:390,height:400},cx),false);
 size(taskContent(tree),{width:390,height:(taskWindow(panel).height+8)*0.5},cx);tree=render();
 assert.equal(taskWindow(panel).viewport,800);assert.equal(taskWindow(panel).offset,1000);assert.ok(find(tree,'task-pulls-list-more-below'));
}
// Audit: removed repository labels lose their cache but native IDs can remain
// known. Reappearance must remeasure both available and natural widths.
if(selected('audit')) {
 const c=await coordinator(),{cx,render,size}=c;
 let tree=render();const label=()=>find(tree,'task-repo-name-home-owner/repo');
 size(label().kids[0],{width:100,height:16.5},cx);size(label().kids[1].kids[0],{width:200,height:16.5},cx);tree=render();assert.ok(label().attrs.tooltip);
 const stale=label().kids[0].attrs.on_size_change[0];c.repos([]);render();c.repos(['owner/repo']);tree=render();
 assert.ok(size(label().kids[0],{width:100,height:16.5},cx));assert.ok(size(label().kids[1].kids[0],{width:200,height:16.5},cx));tree=render();assert.ok(label().attrs.tooltip);
 stale({width:999,height:16.5},cx);tree=render();assert.ok(label().attrs.tooltip,'An obsolete cache owner cannot overwrite the replacement');
}
// Audit: native pin-body dimensions can stay fixed during zoom. Retain raw
// dimensions to normalize again; pin reveal A -> B -> A needs a fresh callback.
if(selected('audit')) {
 const h=await rowHarness(),{panel,cx}=h,{render,layout}=ordinary(h),size=nativeSizes();
 let tree=render();layout(tree);panel.pinMotion.measureBody({width:390,height:500},1);
 h.setZoom(0.5);tree=render();assert.deepEqual({...panel.pinMotion.bodySize},{width:780,height:1000});
 const retained=panel.pinMotion.bodySize;tree=render();assert.equal(panel.pinMotion.bodySize,retained,'Unchanged zoom/data keeps the retained geometry object');
 h.setZoom(1);
 for(const number of [1,2,1]) {
  panel.agentPull=number;tree=render();const pin=activeContent(tree,number);
  assert.ok(size(pin,{width:390,height:82},cx),'Even a returning pin gets its reveal callback');tree=render();assert.equal(activeContent(tree,number).attrs.opacity[0],1);
 }
}
console.log('PASS size-change-only measurement lifetimes: equal-height notice replacement, ordinary tab/context and live zoom, coordinator scope/zoom, repository cache recreation and pin body/reveal');
