import assert from 'node:assert/strict';
import {PinSwap,PIN_SWAP_MS} from '../src/plugins/git/mod/pin-swap.js';
const a={number:1},b={number:2},c={number:3},binding={source:'source',target:'target'};
function fixture({scroll=0,scale=1,sizeZoom=1}={}) {
  const motion=new PinSwap();motion.measureBody({width:300*sizeZoom,height:500*sizeZoom},sizeZoom);
  for(const [number,height] of [[1,60],[2,80],[3,70]])motion.measureRow(number,{width:292*sizeZoom,height:height*sizeZoom},sizeZoom);
  const top=155-scroll,position={x:280*scale,y:(top+110)*scale};
  motion.rowPointer(3,{position,bounds:{x:4*scale,y:(100+top)*scale,width:292*scale,height:70*scale}});
  motion.bodyPointer({position,bounds:{x:0,y:100*scale,width:300*scale,height:500*scale}});
  return {motion,snapshot:{context:'repo',state:'open',pinned:a,rows:[a,b,c]},event:{position}};
}
function clock() {
  const timers=[],notifies=[];
  const cx={notify:()=>notifies.push(true),timer:{after:(ms,fn)=>{const timer={ms,fn,cancel(){this.cancelled=true;}};timers.push(timer);return timer;}}};
  return {timers,notifies,cx};
}
for(const scale of [1,1.3,2])for(const scroll of [0,75]) {
  const {motion,snapshot,event}=fixture({scale,scroll}),{timers,notifies,cx}=clock();
  assert.equal(motion.start(snapshot,c,event,binding,cx),true);
  const swap=motion.current;
  assert.equal(swap.phase,'waiting');assert.equal(swap.snapshot.pinned.number,1);
  assert.deepEqual(swap.cards.slice(0,2).map(card=>[card.pr.number,Math.round(card.from),Math.round(card.to)]),[[3,155-scroll,4],[1,4,83-scroll]]);
  assert.deepEqual(swap.cards.slice(2).map(card=>[card.pr.number,Math.round(card.from),Math.round(card.to)]),[[2,73-scroll,145-scroll]],'Intermediate rows move too, without a final jump');
  motion.arm(swap,cx);assert.equal(timers.length,1,'Waiting for selection cannot start the motion');
  motion.resolve('source',1,true);assert.equal(swap.phase,'waiting','Queued navigation leaves the original slots intact');
  motion.resolve('target',1,false);assert.equal(swap.phase,'waiting','Switch first; stale footer cannot move rows');
  motion.resolve('target',3,true);assert.equal(swap.phase,'start');assert.equal(timers[0].cancelled,true);
  motion.arm(swap,cx);motion.arm(swap,cx);assert.equal(timers.length,2);
  assert.equal(swap.phase,'armed');assert.equal(timers[1].ms,16);
  timers[1].fn(cx);assert.equal(swap.phase,'moving');assert.equal(notifies.length,1);
  assert.equal(timers[2].ms,PIN_SWAP_MS+32);timers[2].fn(cx);
  assert.equal(motion.current,null);assert.equal(notifies.length,2);
  assert.equal(motion.settled('repo','open',3),true);assert.equal(motion.settled('repo','open',3),false);
}
for(const sizeZoom of [1.3,2]) {
  const h=fixture({scale:1.3,sizeZoom});h.motion.start(h.snapshot,c,h.event,binding);
  assert.equal(Math.round(h.motion.current.cards[0].from),155);assert.equal(h.motion.current.cards[1].to,83);
}
const h=fixture();
assert.equal(h.motion.start(h.snapshot,a,h.event,binding),false);
assert.equal(h.motion.start(h.snapshot,c,{},binding),false);
h.motion.sizes.delete(2);assert.equal(h.motion.start(h.snapshot,c,h.event,binding),false);
const direct=fixture();direct.motion.pointer=null;
assert.equal(direct.motion.start(direct.snapshot,c,{bounds:{x:268,y:259,width:24,height:24}},binding),true);
assert.equal(direct.motion.current.cards[0].from,155);
const moved=fixture();assert.equal(moved.motion.start(moved.snapshot,c,{position:{x:281,y:moved.event.position.y}},binding),true);
for(const [context,state] of [['other','open'],['repo','closed']]) {
  const h=fixture();h.motion.start(h.snapshot,c,h.event,binding);
  assert.equal(h.motion.active(context,state),null);
}
for(const [terminal,number] of [['another',3],['target',2]]) {
  const h=fixture();h.motion.start(h.snapshot,c,h.event,binding);h.motion.resolve(terminal,number,true);
  assert.equal(h.motion.current,null,'Unrelated selection or mismatching destination drops the retained layout');
}
const rapid=fixture(),timer=clock();rapid.motion.start(rapid.snapshot,c,rapid.event,binding,timer.cx);
const old=rapid.motion.current;rapid.motion.start(rapid.snapshot,c,rapid.event,binding,timer.cx);
assert.equal(timer.timers[0].cancelled,true);timer.timers[0].fn(timer.cx);
assert.notEqual(rapid.motion.current,old);assert.equal(timer.notifies.length,0);
timer.timers[1].fn(timer.cx);assert.equal(rapid.motion.current,null,'Unavailable destinations expire instead of freezing the old list');
console.log('PASS: retained PR slots, navigation-first/resolve-then-motion lifecycle, native timing, scroll/zoom, intermediate rows, timeout and stale-selection guards');
