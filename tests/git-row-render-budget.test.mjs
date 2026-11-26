import assert from 'node:assert/strict';import fs from 'node:fs';
import {rowBudgetHarness} from './support/git-row-budget.mjs';
import {element} from './support/git-row.mjs';
import {MAX_MOUNTED_ROWS} from '../src/plugins/git/mod/task-reveal.js';
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/git-row-budget-baseline.json',import.meta.url),'utf8'));
function budget(result,mode,count) {
  const before=baseline[mode][count];
  assert.equal(result.repositoryCountElements,mode==='coordinator'?4:0,'Only two nodes per intentional repository count; PR-row baseline remains unchanged');
  assert.equal(result.mounted,mode==='coordinator'?Math.min(count,MAX_MOUNTED_ROWS):count,'All revealed rows mount; coordinator retains main\'s safe row cap');
  assert.ok(result.operations<=before.operations+2*result.mounted,`${mode}/${count}: tooltip policy adds only bounded decoration, not measurement subtrees`);
  assert.equal(result.elements,before.elements-result.mounted-(mode==='coordinator'?6:0),'One obsolete title-control placeholder per row and six coordinator chrome tab-badge nodes are removed; ordinary measurements include only the list body; no native elements added');
  assert.equal(result.probes,before.probes,'No intrinsic probe is added to main\'s fit computation');
}
const h=await rowBudgetHarness();let comparisons=0;
for(const mode of ['ordinary','coordinator'])for(const state of ['open','closed'])for(const count of [30,60,100,200])for(const zoom of [1,1.3]) {
  h.setEnvironment(zoom);budget(h.renderMounted(count,mode,state),mode,count);comparisons++;
}
const render=h.panel.renderPullRow;
h.panel.renderPullRow=function(...args){return render.apply(this,args).child(element().absolute().invisible().w(0).h(0).child(element().id(`bad-probe-${args[1].number}`).on_size_change(()=>{})));};
assert.throws(()=>budget(h.renderMounted(60,'coordinator'),'coordinator',60),/decoration|element|probe/);
h.panel.renderPullRow=render;
const result=h.renderMounted(60,'coordinator');assert.throws(()=>budget({...result,probes:result.probes+1},'coordinator',60),/probe/);
console.log(`PASS ${comparisons} cold mounted ordinary/coordinator Open/Closed tree budgets against main ${baseline.revision}, real #56 reveal/caps, no new PR elements or probes (four intentional header-count nodes excluded), <=2 decorator operations/row and subtree/probe mutations; native 30/60 timing gate: tools/measure-git-row-budget.mjs --run`);
