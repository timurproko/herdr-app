import assert from 'node:assert/strict';
import {rowHarness,element,find,nodes,t} from './support/git-row.mjs';
import {taskWindow,taskContent,ordinaryContent} from './support/git-scroll.mjs';
class NativeHandle {
  y=0;viewport=0;content=0;requests=[];
  offset(){return {x:0,y:this.y};}viewport_size(){return {width:390,height:this.viewport};}content_size(){return {width:390,height:Math.max(this.viewport,this.content)};}
  move(y){this.y=Math.max(0,Math.min(Math.max(0,this.content-this.viewport),y));}
  scroll_to_item(index){this.requests.push(index);this.pending=index;}release(){this.released=true;}
}
async function fixture(count=100){
 let rendering=false,notifications=0;const jobs=[],timers=[],history=new Map(),handles=[];
 const h=await rowHarness({modules:{'gpui-base':{h_flex:()=>element().flex(),v_flex:()=>element().flex().flex_col(),Popover:{},Input:{},ScrollHandle:{new(){assert.equal(rendering,false);const handle=new NativeHandle();handles.push(handle);return handle;}}}}});
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
console.log('PASS real-handle-only thumb/track/keyboard geometry, mounted rows, next-event reveal, wheel look-ahead, finite post-layout fill and ordinary native fades');
