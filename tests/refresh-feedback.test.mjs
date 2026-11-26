import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element() {
  const node={attrs:{},kids:[]};let el;
  el=new Proxy(node,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(el):el:k==='child'?v=>{o.kids.push(v);return el;}:(...args)=>{o.attrs[k]=args;return el;}});
  return el;
}
const context=vm.createContext({});
const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/ui.js',import.meta.url),'utf8'),{context});
await mod.link(name=>{
  const values=name==='gpui-kit'?{div:element,svg:element}:{Popover:{},Input:{}};
  return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});
});
await mod.evaluate();
const {refreshButton,startRefreshFeedback,REFRESH_MIN_MS}=mod.namespace;
assert.equal(REFRESH_MIN_MS,600);
let clock=0,notifications=0,calls=0,busy=false,result=null,scope='local',fail=false;
const owner={},timers=[];
const cx={stop_propagation(){},notify:()=>notifications++,timer:{after:(ms,fn)=>timers.push({at:clock+ms,fn})}};
const advance=ms=>{clock+=ms;for(let i=0;i<timers.length;){if(timers[i].at<=clock)timers.splice(i,1)[0].fn(cx);else i++;}};
const button=(extra={})=>refreshButton({}, {id:'refresh',icon:'refresh.svg',owner,scope,busy,onClick:()=>{calls++;result=fail?'error':'fresh';},...extra});
const click=node=>node.attrs.on_click[0]({},cx);
const spinning=node=>node.kids[0].attrs.spin?.[0];

// A fast real result is immediate; only presentation stays busy until 600ms.
const original=button();assert.equal(original.attrs.tooltip,undefined);assert.equal(original.attrs.accessibility_label[0],'Refresh');click(original);
assert.equal(result,'fresh');assert.equal(calls,1);assert.equal(timers.length,1);
assert.equal(button().attrs.disabled[0],true);assert.equal(spinning(button()),900);
click(original);click(button());assert.equal(calls,1,'Stale or current duplicate clicks cannot restart feedback/work');
advance(599);assert.equal(button().attrs.disabled[0],true);
advance(1);assert.equal(button().attrs.disabled[0],false);assert.equal(spinning(button()),undefined);
assert.equal(notifications,2,'Only start and one-shot expiry notify, never animation frames');

// Longer operations get no additional delay after the minimum has elapsed.
click(button());busy=true;advance(600);
assert.equal(button().attrs.disabled[0],true);assert.equal(spinning(button()),900);
busy=false;assert.equal(button().attrs.disabled[0],false);

// Failures also settle predictably, without postponing their error result.
fail=true;click(button());assert.equal(result,'error');assert.equal(button().attrs.disabled[0],true);
advance(600);assert.equal(button().attrs.disabled[0],false);fail=false;

// Machine/section/folder changes do not inherit another context's cooldown.
click(button());advance(300);scope='remote';assert.equal(button().attrs.disabled[0],false);
click(button());advance(300);assert.equal(button().attrs.disabled[0],true,'The old timer cannot clear a new feedback token');
advance(300);assert.equal(button().attrs.disabled[0],false);

// Rendering background activity and disabled controls never schedules feedback.
const count=timers.length,before=calls;busy=true;button();assert.equal(spinning(button({animate:false})),undefined,'Git can keep disabled busy feedback without a second animation');busy=false;
click(button({enabled:false}));assert.equal(timers.length,count);assert.equal(calls,before);
assert.equal(button({enabled:false}).attrs.disabled[0],true);
// A fresh section entry restarts the visual minimum even during an older hold.
startRefreshFeedback(owner,'refresh',scope,cx);assert.equal(spinning(button({animate:false})),undefined,'Static option also covers the minimum-feedback interval');advance(400);
startRefreshFeedback(owner,'refresh',scope,cx,true);advance(200);
assert.equal(button().attrs.disabled[0],true,'Returning to a section gets a fresh 600ms, not the old remaining 200ms');
advance(399);assert.equal(button().attrs.disabled[0],true);advance(1);assert.equal(button().attrs.disabled[0],false);
console.log('PASS: 600ms visual minimum, immediate results/errors, long requests, duplicate guards, scoped/restarted timers and no per-frame JS work');
