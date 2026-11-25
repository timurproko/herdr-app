import assert from 'node:assert/strict';import fs from 'node:fs';
import {rowBudgetHarness} from './support/git-row-budget.mjs';
import {element,nodes} from './support/git-row.mjs';
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/git-row-budget-baseline.json',import.meta.url),'utf8'));
function budget(result,mode,count) {
  const before=baseline[mode][count];
  assert.equal(result.mounted,count,'Every loaded row must actually be mounted, including ordinary 100/200-row lists');
  assert.ok(result.operations/before.operations<=1,`${mode}/${count} operation ratio ${result.operations/before.operations} exceeds fc0dfde`);
  assert.ok(result.elements/before.elements<=1,`${mode}/${count} element ratio ${result.elements/before.elements} exceeds fc0dfde`);
  assert.ok(result.probes<=4,'At most four intrinsic probes in the entire render');
  assert.ok(result.settingsReads<=2,'Cache settings once per render entry, not per string/row/prefix');
}
const h=await rowBudgetHarness();let comparisons=0;
for(const mode of ['ordinary','coordinator'])for(const state of ['open','closed'])for(const count of [30,60,100,200])for(const [zoom,font]of [[1,'Geist'],[1.3,'Geist'],[1.3,'Another interface face']]) {
  h.setEnvironment(zoom,font);budget(h.renderMounted(count,mode,state),mode,count);comparisons++;
}
// A known bottom viewport takes priority without reordering/dropping any rows.
h.setEnvironment(1.3,'Geist');h.panel.context='ordinary';h.panel.view='open';h.renderMounted(100,'ordinary');
const step=(74+h.U.rowGap)*1.3,position={x:100,y:110};
h.panel.contentMotion({position,delta:{y:0},bounds:{y:100-92*step,height:100*step}},'wheel','open');
h.panel.scrollMotionAt({position,bounds:{y:100,height:7*step}},'wheel','open',h.cx);
assert.equal(h.panel.pullViewport.first,92,'Real bubbling content/frame bounds identify the bottom viewport');
assert.equal(h.panel.pullViewport.count,8);
const scrolled=h.renderMounted(100,'ordinary');budget(scrolled,'ordinary',100);
const probes=nodes(scrolled.tree).filter(n=>n.attrs.id?.[0]?.includes('-measure-'));
assert.equal(probes.length,4);assert.ok(probes.every(n=>n.attrs.id[0].startsWith('pr-byline-93-')),'Visible bottom rows precede offscreen top rows');
assert.equal(nodes(scrolled.tree).filter(n=>/^pr-\d+$/.test(n.attrs.id?.[0]??'')).length,100);
// Negative controls catch the former per-row subtree/probe strategy and repeated
// bridge reads rather than merely pinning a loose absolute operation ceiling.
h.panel.pullViewport=null;const render=h.panel.renderPullRow;
h.panel.renderPullRow=function(...args){const row=render.apply(this,args);for(let i=0;i<6;i++)row.child(element().absolute().invisible().w(0).h(0).child(element().id(`bad-measure-${args[1].number}-${i}`)));return row;};
assert.throws(()=>budget(h.renderMounted(100,'coordinator'),'coordinator',100),/element ratio|four intrinsic/);h.panel.renderPullRow=render;
const result=h.renderMounted(100,'ordinary');assert.throws(()=>budget({...result,settingsReads:400},'ordinary',100),/settings once/);
assert.throws(()=>budget({...result,probes:100},'ordinary',100),/four intrinsic/);
console.log(`PASS ${comparisons} cold 30/60/100/200 fully mounted ordinary/coordinator Open/Closed tree budgets, <= fc0dfde operations/elements, four probes total, constant settings reads, zoom/font cold starts, visible-row priority and regression mutations; native timings: tools/measure-git-row-budget.mjs --run`);
