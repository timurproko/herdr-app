import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const {SidebarScrollState,scrollMetrics}=await loadMod({mod:'custom-changes',host:{},modules:{
 'gpui-kit':{div(){}},'gpui-base':{v_flex(){}},'ui.js':{U:{row:28,rowGap:2}},
},entry:'export {SidebarScrollState,scrollMetrics} from "./sidebar-scroll.js";'});
// All edge decisions, including clamping and Spaces' bottom padding, belong to
// this one pure projection. Exercise ends, subpixel thresholds and no viewport.
for(const offset of [-50,0,0.5,1,1.5,76,200,5000])for(const viewport of [0,100,400])for(const content of [0,40,100,300,2400])for(const bottomPadding of [0,12]) {
 const max=Math.max(0,content+bottomPadding-viewport),clamped=Math.max(0,Math.min(max,offset));
 const input={offset,viewport,content,bottomPadding},before={...input};
 const projected=scrollMetrics(input);assert.ok(Object.isFrozen(projected));assert.deepEqual(input,before);
 assert.deepEqual({...projected},{offset:clamped,viewport,content,bottomPadding,max,
  moreAbove:viewport>0&&clamped>1,moreBelow:viewport>0&&max-clamped>1});
}
let notices=0;const cx={notify(){notices++;}},state=new SidebarScrollState();
state.setMetrics({offset:1000,content:2400,viewport:400},cx);
assert.equal(state.offset,1000);assert.equal(state.moreAbove,true);assert.equal(state.moreBelow,true);assert.equal(notices,1);
for(const field of ['offset','content','viewport','bottomPadding','max','moreAbove','moreBelow'])assert.throws(()=>{state[field]=0;},/getter|read only|Cannot set/,'Geometry and derived fields are read-only outside the atomic setter');
state.setMetrics({offset:2000},cx);assert.equal(state.moreBelow,false);assert.equal(state.moreAbove,true);assert.equal(notices,2);
state.setMetrics({offset:2000,content:2480,viewport:480},cx);assert.equal(state.max,2000);assert.equal(notices,2,'No repaint for unchanged edge decisions');
state.setMetrics({offset:1800});assert.equal(state.moreBelow,true);assert.equal(notices,2,'Pure render-time projection cannot notify');
state.update(cx);assert.equal(notices,3,'A yielded correction still publishes its new edges without a native callback');
state.update(cx);assert.equal(notices,3);
state.update(cx,true);assert.equal(notices,4,'Native layout requests force one repaint even when both fades remain unchanged');
state.update(cx);assert.equal(notices,4);
state.setMetrics({moreBelow:false,max:0});assert.equal(state.moreBelow,true);assert.equal(state.max,2000,'Derived fields cannot be overridden through the setter');
state.setMetrics({offset:500,viewport:1000,content:900},cx);assert.equal(state.offset,0);assert.equal(state.moreAbove,false);assert.equal(state.moreBelow,false);
console.log('PASS pure scroll metric projection: 240 geometry cases, read-only inputs/edges, atomic programmatic changes and boundary-only notifications');
