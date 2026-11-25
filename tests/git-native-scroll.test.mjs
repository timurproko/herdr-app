import assert from 'node:assert/strict';
import {rowHarness,element,find,nodes,t} from './support/git-row.mjs';
import {taskWindow,taskContent,ordinaryContent} from './support/git-scroll.mjs';
class NativeHandle {
  y=0;viewport=0;content=0;requests=[];
  offset(){return {x:0,y:this.y};}viewport_size(){return {width:390,height:this.viewport};}content_size(){return {width:390,height:Math.max(this.viewport,this.content)};}
  move(y){this.y=Math.max(0,Math.min(Math.max(0,this.content-this.viewport),y));}
  scroll_to_item(index){this.requests.push(index);this.pending=index;}release(){this.released=true;}
}
async function fixture(count=100,host={}){
 let rendering=false,notifications=0;const jobs=[],timers=[],history=new Map(),handles=[];
 const h=await rowHarness({host,modules:{'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover:{},Input:{},ScrollHandle:{new(){assert.equal(rendering,false);const handle=new NativeHandle();handles.push(handle);return handle;}}}}});
 const {panel}=h;panel.context='tasks:home';panel.shown=()=>true;
 const rows=Array.from({length:count},(_,i)=>Object.assign(h.facts.pullRow({number:i+1,title:`PR ${i+1}`,state:'OPEN',author:{login:'fixture'}},'owner'),{key:`owner/repo#${i+1}`,repo:'owner/repo'}));
 panel.aggregate={context:{scope:'home'},entries:new Map(rows.map(pr=>[pr.key,{pr,link:{repo:pr.repo}}])),currentContext:()=>({scope:'home'}),repositories:()=>['owner/repo'],rows:state=>state==='open'?rows:[],readNotice:()=>null,counts:()=>({open:count,closed:0}),target:()=>null};
 panel.notices={sync(){},presentation(){}};panel.enrollmentPicker={render(){},stop(){}};panel.syncChecksFallback=()=>{};
 const cx={notify(){assert.equal(rendering,false);notifications++;},spawn(fn){jobs.push(fn(cx));},timer:{after(ms,fn){assert.equal(ms,16);timers.push(fn);}}};
 const snapshots=new WeakMap();
 const render=(ordinary=false)=>{rendering=true;try{const tree=ordinary?panel.renderPulls(t):panel.renderAggregate(cx,t);if(!ordinary)snapshots.set(tree,taskWindow(panel).contentHeight);return tree;}finally{rendering=false;}};
 const size=(node,height)=>{const id=node.attrs.id[0],key=`390:${height}`;if(history.get(id)===key)return false;history.set(id,key);node.attrs.on_size_change[0]({width:390,height},cx);return true;};
 const frame=tree=>nodes(tree).find(n=>String(n.attrs.id?.[0]).startsWith('task-pulls-frame-'));
 const layout=(tree,viewport=400,emit=true)=>{const list=nodes(tree).find(n=>n.attrs.track_scroll),handle=list?.attrs.track_scroll[0],height=snapshots.get(tree);if(handle){handle.viewport=viewport;handle.content=height;const marker=find(tree,'task-pulls-anchor');if(handle.pending!=null&&marker){const y=marker.attrs.top[0];handle.move(y<handle.y?y:y+1>handle.y+viewport?y+1-viewport:handle.y);handle.pending=null;}else handle.move(handle.y);}if(emit){size(frame(tree),viewport);size(taskContent(tree),height);}};
 const flush=async()=>{await Promise.all(jobs.splice(0));for(const fn of timers.splice(0))fn(cx);await Promise.all(jobs.splice(0));};
 return {h,panel,rows,cx,render,frame,layout,size,flush,onlyJobs:()=>Promise.all(jobs.splice(0)),handles,timers,get notifications(){return notifications;}};
}
// Thumb/track/keyboard input changes the native handle only. There is NO
// synthetic content/frame mouse pair and unchanged sizes emit no callbacks.
{
 const f=await fixture();let tree=f.render();f.layout(tree);tree=f.render();f.layout(tree);
 const list=taskWindow(f.panel),handle=f.handles[0],keys=()=>nodes(tree).filter(n=>/^pr-owner\/repo#\d+$/.test(n.attrs.id?.[0]??'')).map(n=>n.attrs.id[0]);
 const initial=keys(),before=f.notifications;handle.move(1e6);assert.equal(f.notifications,before);assert.deepEqual(keys(),initial);assert.equal(find(tree,'task-pulls-spacer-top'),undefined);
 assert.equal(f.size(f.frame(tree),400),false);assert.equal(f.size(taskContent(tree),handle.content),false);
 tree=f.render();assert.deepEqual(keys(),initial);assert.ok(find(tree,'task-pulls-list-more-above'));assert.equal(find(tree,'task-pulls-list-more-below'),undefined);assert.equal(list.limit,10,'A render is not an input/reveal callback');
 f.frame(tree).attrs.on_mouse_move[0]({position:{x:389,y:399},bounds:{x:0,y:0,width:390,height:400}},f.cx);
 assert.equal(list.limit,20,'The next received pointer event reads the native bottom directly');tree=f.render();f.layout(tree);assert.equal(keys().length,19);for(const key of initial)assert.ok(keys().includes(key));
 const limit=list.limit;handle.move(handle.content-handle.viewport-150);
 f.frame(tree).attrs.on_scroll_wheel[0]({delta:{y:-50},position:{x:30,y:200},bounds:{x:0,y:0,width:390,height:400}},f.cx);assert.equal(list.limit,limit+10,'Bounded wheel look-ahead bridges the pre-layout native offset');
 tree=f.render();f.layout(tree);handle.move(1e6);tree=f.render();assert.equal(find(tree,'task-pulls-list-more-below'),undefined);assert.ok(keys().length>10,'Keyboard End cannot expose unmounted spacers');await f.flush();
}
// Same-height refreshes issue a repaint even in the middle, when neither
// fade changes. Native anchor requests only take effect in a later layout.
for(const target of [1000,1840]){
 const f=await fixture(30);f.render();const list=taskWindow(f.panel);while(list.revealMore()){};
 let tree=f.render();f.layout(tree);tree=f.render();f.layout(tree);const handle=f.handles[0];handle.move(target);tree=f.render();await f.flush();
 const before=f.notifications,height=handle.content;f.rows.unshift({...f.rows[0],number:0,key:'owner/repo#0'});f.rows.pop();tree=f.render();
 assert.equal(handle.y,target);await f.onlyJobs();assert.deepEqual(handle.requests,[1]);assert.equal(f.notifications,before+1,'Accepted native anchor always invalidates the snapshot');
 f.layout(tree);assert.equal(handle.y,target+76);assert.equal(handle.content,height);assert.equal(f.size(f.frame(tree),400),false);assert.equal(f.size(taskContent(tree),height),false);
 await f.flush();tree=f.render();assert.equal(list.metrics.offset,target+76);assert.equal(Boolean(find(tree,'task-pulls-list-more-below')),target!==1840);
 if(target===1000){
  f.rows.unshift({...f.rows[0],number:-1,key:'owner/repo#-1'});f.rows.pop();tree=f.render();assert.ok(list.correction);
  f.panel.setView('closed',f.cx);f.panel.setView('open',f.cx);f.render();await f.onlyJobs();assert.deepEqual(handle.requests,[1],'Tab-away-and-back rejects an obsolete anchor request');
 }
}
// A finite one-shot after a batch reads actual post-layout geometry even if
// no JS size notification arrives. Repeated checks stop as soon as it overflows.
{
 const f=await fixture();let tree=f.render();f.size(f.frame(tree),2000);tree=f.render();f.layout(tree,2000,false);
 const list=taskWindow(f.panel);assert.equal(list.limit,10);await f.flush();assert.equal(list.limit,20);
 tree=f.render();f.layout(tree,2000,false);await f.flush();assert.equal(list.limit,30);
 tree=f.render();f.layout(tree,2000,false);await f.flush();assert.equal(list.limit,30);assert.equal(f.timers.length,0,'No recurring polling');
 f.panel.shown=()=>false;const before=list.limit;await f.flush();assert.equal(list.limit,before);
}
// Even a coalesced tab-away-and-back, before another render, invalidates
// the old one-shot layout callback; a new activation can fill normally.
{
 const f=await fixture();let tree=f.render();f.size(f.frame(tree),2000);tree=f.render();f.layout(tree,2000,false);await f.onlyJobs();assert.ok(f.timers.length);
 const list=taskWindow(f.panel);f.panel.setView('closed',f.cx);f.panel.setView('open',f.cx);await f.flush();assert.equal(list.limit,10);
 tree=f.render();f.layout(tree,2000,false);await f.flush();assert.equal(list.limit,20);
}
// Ordinary rows keep normal pagination, but fades also sample the actual native
// handle on render rather than trusting a fabricated pointer notification.
{
 const f=await fixture(30),{panel,cx}=f;panel.context='ordinary';panel.pulls.open=f.rows.map(({key,repo,...row})=>row);
 let tree=f.render(true);f.size(find(tree,'pulls-scroll-frame'),400);f.size(ordinaryContent(tree),2400);tree=f.render(true);
 const handle=find(tree,'pulls-list-open').attrs.track_scroll[0];handle.viewport=400;handle.content=2400;handle.move(2000);
 const before=f.notifications;tree=f.render(true);assert.equal(f.notifications,before);assert.ok(find(tree,'pulls-list-more-above'));assert.equal(find(tree,'pulls-list-more-below'),undefined);
 const metrics=panel.ordinaryScroll.get('open');assert.equal(metrics.offset,2000);panel.view='closed';tree=f.render(true);assert.equal(panel.ordinaryScroll.get('closed').handle,undefined,'Render never allocates a handle');
 panel.view='open';tree=f.render(true);assert.equal(find(tree,'pulls-list-open').attrs.track_scroll[0],handle);
}
// Returning to a historical zoom must renew content measurement identity:
// native sizes are cached by ID, even after another zoom was laid out.
for(const ordinary of [true,false]) {
 const f=await fixture(30),{panel,cx}=f,kind=ordinary?'ordinary':'coordinator';
 if(ordinary){panel.context='ordinary';panel.pulls.open=f.rows.map(({key,repo,...row})=>row);}
 const content=ordinary?ordinaryContent:taskContent,frame=tree=>ordinary?find(tree,'pulls-scroll-frame'):f.frame(tree);
 let tree=f.render(ordinary);const height=ordinary?2400:taskWindow(panel).contentHeight;
 f.size(frame(tree),400);f.size(content(tree),height);tree=f.render(ordinary);
 const original=content(tree),originalId=original.attrs.id[0],stale=original.attrs.on_size_change[0];
 const metrics=ordinary?panel.ordinaryScroll.get('open'):taskWindow(panel).metrics;
 const handle=nodes(tree).find(node=>node.attrs.track_scroll).attrs.track_scroll[0];handle.viewport=400;handle.content=height;
 const ids=new Set([originalId]);
 for(const zoom of [1.3,1]) {
  f.h.setZoom(zoom);tree=f.render(ordinary);handle.viewport=400/zoom;handle.content=height;
  assert.equal(f.size(frame(tree),400),false,`${kind}: unchanged physical frame emits no callback`);
  const fresh=f.size(content(tree),height*zoom);tree=f.render(ordinary);
  if(zoom===1) {
   assert.equal(f.size(original,height),false,'The historical ID/dimensions really suppress a returning native callback');
   const before=f.notifications;handle.move(1e6);tree=f.render(ordinary);
   assert.equal(f.notifications,before,'Handle-only scrolling supplies no fabricated JS events');
   assert.equal(metrics.offset,handle.y,`${kind}: native bottom is sampled after 100 -> 130 -> 100`);
   const list=ordinary?'pulls-list':'task-pulls-list';
   assert.ok(find(tree,`${list}-more-above`));assert.equal(find(tree,`${list}-more-below`),undefined);
   assert.equal(f.size(content(tree),height),false,'Later renders need no repeat size notification');
   stale({width:390,height:9999},cx);assert.equal(metrics.content,height,`${kind}: prior 100% callback cannot poison the new 100% owner`);
   handle.move(0);tree=f.render(ordinary);assert.equal(metrics.offset,0);assert.equal(find(tree,`${list}-more-above`),undefined);assert.ok(find(tree,`${list}-more-below`));
  }
  assert.equal(fresh,true,`${kind}: every zoom change has a fresh native content identity`);
  assert.equal(ids.has(content(tree).attrs.id[0]),false);ids.add(content(tree).attrs.id[0]);assert.equal(metrics.awaitZoom,false);
 }
 assert.equal(f.handles.length,1);assert.equal(handle.released,undefined,'Zoom retains the native scroll handle');
}
// A robot's already-verified same-repository destination can live in another
// worktree. Exercise the real click -> retained refresh -> root reply path,
// rather than assigning a new context or manufacturing a pin-swap snapshot.
{
 let releaseRoot;const rootReply=new Promise(resolve=>{releaseRoot=resolve;});
 const f=await fixture(30,{exec:async(command,args,options)=>{
  assert.equal(command,'git');
  if(args[0]==='rev-parse')return options.cwd==='/worktree'?rootReply:{code:0,stdout:options.cwd};
  assert.equal(args[0],'symbolic-ref');return {code:0,stdout:'feature'};
 }}),{panel,h}=f;
 panel.syncAggregate=()=>false;panel.syncAgent=()=>{};
 const source=JSON.stringify([h.place.cwd,h.place.on]);panel.context=source;panel.on=h.place.on;panel.root=h.place.cwd;
 panel.pulls.open=f.rows.map(({key,repo,...row})=>row);panel.agentPull=1;
 // This is AgentLinks' confirmed canonical repository mapping; cwd alone is
 // never used to infer that two worktrees belong to the same repository.
 const target={key:'verified-worker',address:'t2',cwd:'/worktree',on:null};
 panel.agentLinks={related:(pr,repo)=>pr.number===12&&repo==='owner/repo'?target:null};
 const animationTimers=[],cx={...f.cx,stop_propagation(){},timer:{after(ms,fn){const timer={ms,fn,cancel(){this.cancelled=true;}};animationTimers.push(timer);return timer;}}};
 let tree=f.render(true);const height=29*76+6;
 f.size(find(tree,'pulls-scroll-frame'),400);f.size(ordinaryContent(tree),height);tree=f.render(true);
 const metrics=panel.ordinaryScroll.get('open'),handle=metrics.handle;
 handle.viewport=400;handle.content=height;handle.move(700);tree=f.render(true);
 const contentId=ordinaryContent(tree).attrs.id[0],measurement=metrics.measurement,rows=panel.pulls.open;
 const body=find(tree,'pulls-body'),bounds={x:0,y:100,width:390,height:400};
 body.attrs.on_size_change[0]({width:390,height:400},cx);body.attrs.on_mouse_move[0]({bounds});
 for(const pr of rows)panel.pinMotion.measureRow(pr.number,{width:374,height:74},1);
 const robot=find(tree,'pr-agent-12'),from=74+13+10*76-700,position={x:370,y:100+from+10};
 robot.mouse.left({position,bounds:{x:358,y:100+from+4,width:24,height:24}},cx);robot.attrs.on_click[0]({},cx);
 const swap=panel.pinMotion.current;assert.ok(swap);assert.equal(swap.phase,'waiting');assert.equal(swap.cards[0].from,from);
 assert.equal(h.focus.at(-1)[1].terminal,'t2','Robot navigation is immediate');
 Object.assign(h.place,{cwd:'/worktree',terminal:'t2'});panel.refresh(cx,false);
 const destination=JSON.stringify([h.place.cwd,h.place.on]);assert.equal(swap.context,destination);assert.equal(panel.pulls.open,rows);
 const assertRetained=()=>{
  tree=f.render(true);
  assert.equal(panel.ordinaryScroll.get('open'),metrics,'Retained worktree keeps the exact scroll metrics');
  assert.equal(find(tree,'pulls-list-open').attrs.track_scroll[0],handle,'The native list keeps its scroll handle');
  assert.equal(ordinaryContent(tree).attrs.id[0],contentId);assert.equal(metrics.measurement,measurement);
  assert.equal(f.size(find(tree,'pulls-scroll-frame'),400),false);assert.equal(f.size(ordinaryContent(tree),height),false,'Unchanged native sizes do not fire again');
  assert.equal(handle.released,undefined);assert.equal(handle.y,700);assert.equal(metrics.offset,700);assert.equal(f.handles.length,1);
 };
 assertRetained();releaseRoot({code:0,stdout:'/worktree'});await f.onlyJobs();assert.equal(panel.root,'/worktree');assertRetained();
 panel.agentPull=12;panel.agentResolved=JSON.stringify(h.place);assertRetained();
 assert.equal(swap.phase,'start');assert.equal(swap.cards[0].from,from,'Animation uses the same scrolled geometry');
 // Without the verified retained-robot identity, a context change still resets
 // its list and releases the old handle through the normal layout callback.
 Object.assign(h.place,{cwd:'/unrelated',terminal:'other'});panel.refresh(cx,false);tree=f.render(true);
 f.size(find(tree,'pulls-scroll-frame'),400);f.size(ordinaryContent(tree),400);await f.onlyJobs();
 const replacement=panel.ordinaryScroll.get('open');assert.notEqual(replacement,metrics);assert.notEqual(replacement.handle,handle);
 assert.equal(handle.released,true);assert.equal(replacement.offset,0);assert.equal(replacement.handle.y,0);
}
console.log('PASS real-handle-only scrolling, mounted reveal/fades/anchors and retained cross-worktree robot navigation at offset 700 with unchanged native sizes');
