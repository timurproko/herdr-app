// Evaluate only the generated fixture render method: no app, build or host IO.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {rowHarness,element,find,rowGeometry,t} from './support/git-row.mjs';
const source=fs.readFileSync(new URL('./features/pr-stage-native.mjs',import.meta.url),'utf8');
const method=source.match(/^ render\(cx\).+$/m)?.[0];assert.ok(method,'Use the exact generated native fixture renderer');
const compile=(body,mode,zoom)=>new Function('div','theme','mode',`return ({${body.replaceAll('${zoom*100}',String(zoom*100))}}).render;`)(element,()=>t,mode);
const validChildren=node=>{for(const child of node?.kids??[]){assert.notEqual(child,null,'Native child(value) rejects null');assert.notEqual(child,undefined,'Native child(value) rejects undefined');validChildren(child);}};
for(const mode of ['ordinary','coordinator'])for(const zoom of [1,1.3]) {
 const {panel,cx,setZoom}=await rowHarness();setZoom(zoom);
 // Isolate the fixture shell and real production width-probe lifecycle. Other
 // panel content has its own renderer tests and must not start host work here.
 panel.rows=[];panel.renderPulls=()=>element().id('ordinary-content');
 panel.taskSections=()=>({sections:[{}]});panel.repositorySection=()=>element().id('coordinator-content');
 const render=compile(method,mode,zoom),first=render.call(panel,cx);validChildren(first);
 assert.ok(find(first,`${mode}-content`));
 const probe=find(first,`pr-stage-box-probes-${zoom}`),measure=find(probe,`pr-stage-box-measure-${zoom}`);assert.ok(measure);
 measure.attrs.on_size_change[0](rowGeometry(probe,700,zoom).get(measure),cx);
 assert.ok(panel.stageBoxWidth()>0);assert.equal(panel.stageBoxProbe(),null,'Production measurement is cached');
 for(let i=0;i<3;i++){const warm=render.call(panel,cx);validChildren(warm);assert.equal(find(warm,`pr-stage-box-probes-${zoom}`),undefined,'Cached probe is omitted, not appended as null');}
 const baseline=Object.create(panel);baseline.stageBoxProbe=undefined;
 validChildren(render.call(baseline,cx));assert.equal(find(render.call(baseline,cx),`pr-stage-box-probes-${zoom}`),undefined,'Pre-change baseline without helper still renders');
 const unguarded=method.replace('if(probe)tree.child(probe);','tree.child(probe);');assert.notEqual(unguarded,method);
 const broken=compile(unguarded,mode,zoom);
 assert.throws(()=>validChildren(broken.call(panel,cx)),/rejects null/,'Regression catches the measured second-render failure');
 assert.throws(()=>validChildren(broken.call(baseline,cx)),/rejects undefined/,'Regression catches the absent-helper baseline failure');
}
console.log('PASS exact native stage fixture cold/cached/baseline child contracts, both views at 100/130%, real width callback and null/undefined mutation guards');
