import assert from 'node:assert/strict';import fs from 'node:fs';
import {rowBudgetHarness} from './support/git-row-budget.mjs';
import {element,nodes,find} from './support/git-row.mjs';
import {MAX_MOUNTED_ROWS} from '../src/plugins/git/mod/task-reveal.js';
const baseline=JSON.parse(fs.readFileSync(new URL('./fixtures/git-row-budget-baseline.json',import.meta.url),'utf8'));
function budget(result,mode,count) {
  const before=baseline[mode][count];
  assert.equal(result.repositoryCountElements,mode==='coordinator'?4:0,'Only two nodes per intentional repository count; PR-row baseline remains unchanged');
  assert.equal(result.mounted,mode==='coordinator'?Math.min(count,MAX_MOUNTED_ROWS):count,'All revealed rows mount; coordinator retains main\'s safe row cap');
  assert.ok(result.operations<=before.operations+2*result.mounted,`${mode}/${count}: tooltip policy adds only bounded decoration, not measurement subtrees`);
  // The new global disclosure action is fixed panel chrome, not a per-row
  // addition. Account for exactly its spacer/button/SVG; no blanket allowance.
  const strip=find(result.tree,'git-views'),chrome=strip?strip.kids.slice(2).flatMap(nodes):[];
  assert.equal(chrome.length,mode==='coordinator'?3:0,'Disclosure chrome is exactly one spacer, button and glyph, independent of mounted rows');
  if(strip){assert.equal(strip.kids.length,4);assert.equal(strip.kids[3].attrs.id[0],'git-disclosure');assert.equal(strip.kids[3].attrs.size[0],24);}
  assert.equal(result.elements-chrome.length,before.elements-result.mounted-(mode==='coordinator'?6:0),'PR-row element budget is unchanged after removing obsolete placeholders/tab badges and separately accounting for the fixed disclosure chrome');
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
find(result.tree,'git-disclosure').child(element());
assert.throws(()=>budget({...result,elements:result.elements+1},'coordinator',60),/Disclosure chrome/,'Extra chrome subtrees cannot hide in the fixed-cost accounting');
console.log(`PASS ${comparisons} cold mounted ordinary/coordinator Open/Closed tree budgets against main ${baseline.revision}, real #56 reveal/caps, no new PR elements or probes (four intentional header-count nodes and exactly three fixed disclosure-chrome nodes accounted separately), <=2 decorator operations/row and row/chrome/probe mutations; native 30/60 timing gate: tools/measure-git-row-budget.mjs --run`);
