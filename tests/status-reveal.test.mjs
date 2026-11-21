// StatusReveal: an item hides only when what it shows changed or it moved; hidden items
// reveal strictly left to right once the bar stops changing. Nothing hides twice for one
// switch, nothing else blinks, and no frame shows new content before its turn.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(name) {
  const node={name,attrs:{},kids:[]};let el;
  el=new Proxy(node,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(el):el:k==='child'?v=>{o.kids.push(v);return el;}:(...args)=>{o.attrs[k]=args;return el;}});
  return el;
}
const context=vm.createContext({});
const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/status-reveal.js',import.meta.url),'utf8'),{context});
await mod.link(()=>{throw new Error('StatusReveal has no imports');});
await mod.evaluate();
const {StatusReveal}=mod.namespace;

const reveal=new StatusReveal({first:30,step:100,hold:2000,duration:180});
const pc=value=>({id:'machine',value,element:element('machine')});
const branch=value=>({id:'branch',value,element:element('branch')});
const reading={id:'branch',loading:true};
const claude=value=>({id:'claude',value,element:element('claude')});
let now=0,last=new Map(),hides=0,frames=[];
// Draws one frame; checks the no-flash invariant on every hide.
const at=(ms,items)=>{
  // Like a real render, every frame builds fresh elements.
  items=items.map(i=>i&&i.element?{...i,element:element(i.element.name)}:i);
  now=ms;const out=Array.from(reveal.items(items,now));
  const drawn=new Map();
  for(const el of out){
    const o=el.attrs.opacity[0];drawn.set(el.name,o);
    if(o===0&&last.get(el.name)!==0)assert.equal(el.attrs.transition,undefined,`${el.name} hides without a transition (no frame of new content)`);
    if(last.get(el.name)===1&&o===0)hides++;
    if(o===1&&last.get(el.name)===0)assert.equal(el.attrs.transition?.[1].duration,180,`${el.name} reveals eased, from an armed hidden frame`);
  }
  last=drawn;const frame=Array.from(drawn.values());frames.push(frame);return frame;
};
// Follows the bar's own one-shot redraws until `until`, then draws at `until`.
const play=(from,until,items)=>{at(from,items);while(reveal.next<=until)at(reveal.next,items);return at(until,items);};
const order=()=>{for(const f of frames)for(let i=1;i<f.length;i++)assert.ok(!(f[i]===1&&f[i-1]===0),`Never out of order: ${JSON.stringify(f)}`);frames=[];};

// First appearance: everything hides at once, then reveals one by one, left to right.
const full=[pc('This computer'),branch('main'),false,claude('a@x')];
assert.deepEqual(at(1000,full),[0,0,0],'New items hide first (falsy entries are skipped)');
assert.equal(reveal.next,1016,'A redraw soon arms the eased reveal');
assert.deepEqual(at(1016,full),[0,0,0]);
assert.equal(reveal.items(full,now)[0].attrs.transition[1].duration,180,'The armed hidden frame declares the transition');
assert.deepEqual(play(1016,1030,full),[1,0,0]);
assert.deepEqual(play(1030,1130,full),[1,1,0]);
assert.deepEqual(play(1130,1230,full),[1,1,1]);
assert.equal(reveal.next,Infinity,'Settled bars schedule nothing');order();
assert.deepEqual(at(2000,full),[1,1,1],'Same values on another tab: nothing blinks');

// Account switch: [pc, account A] → [pc, branch, account B], branch read first.
// Claude hides exactly once; pc never; branch, then claude reveal.
const home=[pc('This computer'),claude('account-a@example.test')];
play(3000,3600,home);assert.deepEqual(at(3600,home),[1,1]);
hides=0;frames=[];
assert.deepEqual(at(4000,[pc('This computer'),reading,claude('account-b@example.test')]),[1,0],'No placeholder; claude hides at once');
assert.deepEqual(play(4000,4300,[pc('This computer'),reading,claude('account-b@example.test')]),[1,0],'claude waits for the branch');
assert.deepEqual(at(4310,[pc('This computer'),branch('feature/x'),claude('account-b@example.test')]),[1,0,0],'The branch arrives');
assert.deepEqual(play(4310,4600,[pc('This computer'),branch('feature/x'),claude('account-b@example.test')]),[1,1,1],'branch, then claude');
assert.equal(hides,1,'Claude hid exactly once for the whole switch');order();

// In-between states while hidden don't add a flash: the countdown restarts instead.
hides=0;
at(5000,[pc('This computer'),branch('feature/x'),claude(null)]);
at(5020,[pc('This computer'),branch('feature/x'),claude('other@x')]);
assert.deepEqual(play(5020,5049,[pc('This computer'),branch('feature/x'),claude('other@x')]),[1,1,0],'Still settling');
assert.deepEqual(play(5049,5060,[pc('This computer'),branch('feature/x'),claude('other@x')]),[1,1,1],'Reveals after the last change');
assert.equal(hides,1,'One hide for a burst of changes');order();

// Reverse: a vanished branch moves claude, which hides once.
hides=0;play(6000,6400,home);assert.deepEqual(at(6400,home),[1,1]);assert.equal(hides,1);order();

// A slow read: the hold is bounded.
assert.deepEqual(play(7000,8990,[pc('This computer'),reading,claude('account-a@example.test')]),[1,0],'Held while young');
assert.deepEqual(play(8990,9100,[pc('This computer'),reading,claude('account-a@example.test')]),[1,1],'Hold is bounded');order();

// Machine change: everything after it re-reveals, strictly in order, frame by frame.
assert.deepEqual(play(10000,10400,[pc('vps'),branch('dev'),claude('z@x')]),[1,1,1]);order();

// Vanished items are forgotten; settle schedules one-shot redraws only while pending.
at(11000,[pc('vps')]);assert.equal(reveal.seen.has('claude'),false);
const timers=[];const cx={timer:{after:(ms)=>timers.push(ms)}};
at(12000,[pc('vps'),claude('a')]);reveal.settle(cx,now);assert.deepEqual(timers,[16]);
play(12000,12300,[pc('vps'),claude('a')]);timers.length=0;reveal.settle(cx,now);assert.deepEqual(timers,[],'Nothing runs once settled');
console.log('PASS: status reveal: no frame of new content before its turn (hide without transition, armed eased reveal), one hide per switch, changed/moved items only, strict left-to-right order, loading holds what follows (bounded), no placeholders, one-shot redraws');
