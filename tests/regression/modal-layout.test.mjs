import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(){const node={style:{},kids:[]};let el;el=new Proxy(node,{get(o,k){if(k in o)return o[k];if(k==='when')return(test,fn)=>test?fn(el):el;if(k==='child')return child=>{o.kids.push(child);return el;};return(...args)=>{o.style[k]=args;return el;};}});return el;}
const context=vm.createContext({}),kit=new vm.SyntheticModule(['div'],function(){this.setExport('div',element);},{context});
const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../lib/modal-layout.js',import.meta.url),'utf8'),{context});await mod.link(()=>kit);await mod.evaluate();const m=mod.namespace,t={border:'#303030'};
for(const compact of [false,true]){const line=m.divider(t,{compact});assert.equal((line.style.h[0]-1)/2,compact?8:12);assert.equal(line.kids[0].style.h[0],1);assert.equal(line.kids[0].style.bg[0],t.border);assert.ok(line.style.items_center);assert.ok(line.style.flex_none);}
const stack=m.sectionStack(element());assert.equal(stack.style.gap[0],0);const row=m.sectionRow(t,element());assert.equal(row.style.py[0],12);assert.equal(row.style.min_h[0],64);assert.equal(row.style.border_b[0],1);assert.equal(m.sectionRow(t,element(),{last:true}).style.border_b,undefined);const footer=m.modalFooter(t,element());assert.equal(footer.style.py[0],16);assert.equal(footer.style.px[0],16);assert.equal(footer.style.border_t[0],1);
const action=m.sectionAction(element());for(const key of ['w_full','min_h','py'])assert.deepEqual(action.style[key],row.style[key],'Leading actions and settings controls share one layout geometry');assert.ok(action.style.items_center);assert.equal(action.style.border_t,undefined);assert.equal(action.style.border_b,undefined);
console.log('PASS: canonical symmetric modal separators, zero-gap stacks, matching 64px leading actions/rows with 12px insets and 16px body/footer boundaries');
