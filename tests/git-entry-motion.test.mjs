import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,find,t} from './support/git-row.mjs';
for(const control of ['chip','robot'])for(const zoom of [1,1.3]){
 const h=await rowHarness(),p=h.panel,timers=[];h.setZoom(zoom);
 h.cx.timer={after(ms,fn){const timer={ms,fn,cancel(){this.cancelled=true;}};timers.push(timer);return timer;}};
 Object.assign(h.place,{space:'worker-a',terminal:'a',app:'codex'});p.sectionEntry=true;p.on=null;
 const facts=n=>h.facts.pullRow({number:n,title:`PR ${n}`,url:`https://github.com/owner/repo/pull/${n}`,state:'OPEN',headRefName:`work-${n}`,labels:control==='chip'?[{name:'Build',color:'aaaa00'}]:[]},'owner');
 p.pulls={open:[facts(1),facts(2)],closed:[]};p.agentPull=1;p.agentResolved=JSON.stringify(h.place);p.commitRepository();
 const agent={address:'b',key:'target-b',cwd:h.place.cwd,on:null,availability:'live',crew:{},displayName:'Worker B'};
 p.agentLinks={related:pr=>pr.number===2?agent:null,confirm:async()=>true,pullNumber:terminal=>terminal==='b'?2:null};
 let tree=h.render(()=>p.renderPulls(t));assert.equal(find(tree,'active-pull'),undefined,'enter worker space: cached list has no pin');assert.equal(p.pinMotion.current,null);
 assert.ok(find(tree,'task-repo-header-owner/repo'));
 const geometry=rowGeometry(tree,320,zoom,500),body=geometry.get(tree);
 tree.attrs.on_size_change[0]({width:body.width,height:body.height},h.cx);
 for(const n of [1,2]){const node=find(tree,`pr-${n}`),box=geometry.get(node);node.attrs.on_size_change[0]({width:box.width,height:box.height},h.cx);}
 const row=find(tree,'pr-2'),box=geometry.get(row),button=find(tree,control==='chip'?'pr-stage-2':'pr-agent-2'),bounds=geometry.get(button),event={bounds,position:{x:bounds.x+2,y:bounds.y+2}};
 tree.attrs.on_mouse_move[0]({bounds:body,position:event.position});row.attrs.on_mouse_move[0]({bounds:box,position:event.position});
 button.mouse.left(event,h.cx);button.attrs.on_click[0]({},h.cx);for(let i=0;i<20;i++)await Promise.resolve();
 const swap=p.pinMotion.current;assert.ok(swap,'click from unpinned cached list uses #87 controller');assert.equal(swap.snapshot.pinned,null);assert.equal(swap.phase,'waiting');
 assert.equal(h.focus.length,1);assert.equal(h.focus[0][0],'agent.focus');assert.equal(h.focus[0][1].terminal,'b','navigation is immediate');
 assert.ok(Math.abs(swap.cards[0].from-box.y/zoom)<0.1,'motion starts at actual row, including section header');
 Object.assign(h.place,{space:'worker-b',terminal:'b'});p.syncAgent(h.cx);
 tree=h.render(()=>p.renderPulls(t));assert.equal(p.pinMotion.current,swap);assert.equal(swap.phase,'start');assert.equal(find(tree,'active-pull'),undefined,'native selection acknowledgement retains old row slots');
 const overlay=find(tree,`pin-swap-${swap.id}`);overlay.attrs.on_size_change[0]({},h.cx);timers.find(timer=>timer.ms===16).fn(h.cx);
 assert.equal(swap.phase,'moving');assert.equal(swap.cards[0].to,4);
 timers.find(timer=>timer.ms===352).fn(h.cx);assert.equal(p.pinMotion.current,null);
 tree=h.render(()=>p.renderPulls(t));assert.ok(find(tree,'active-pull'));assert.equal(p.pullPresentation.pinned.number,2);assert.equal(h.focus.length,1,'entry/ack never sends a second focus');
 const final=rowGeometry(tree,320,zoom,500);for(const card of swap.cards){const node=find(tree,`pr-${card.pr.number}`);assert.ok(node);assert.ok(Math.abs(final.get(node).y/zoom-card.to)<0.1,'native motion settles at the actual final row position');}
 assert.equal(timers.length,3,'one wait, one arming and one cleanup, no frame loop');
}
for(const terminal of [null,undefined]){const h=await rowHarness();h.panel.sectionEntry=true;h.place.terminal=terminal;h.panel.agentResolved=JSON.stringify(h.place);assert.doesNotThrow(()=>h.render(()=>h.panel.renderPulls(t)),'a space without a terminal cannot dereference a missing click');}
console.log('PASS enter worker unpinned -> chip/robot click -> existing native pin motion, actual section geometry, one focus, retained acknowledgement and exact settled positions at 100/130%');
