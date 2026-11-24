import assert from 'node:assert/strict';
import {TaskWindow} from '../src/plugins/git/mod/task-window.js';
const row=n=>({key:`owner/repo#${n}`,number:n});
const sections=[{repo:'owner/repo',rows:Array.from({length:100},(_,i)=>row(i+1)),error:'A scoped notice'}];
const folded=new Set(),w=new TaskWindow();
const project=()=>w.project(sections,folded,28,2,'1:390');
project();assert.equal(w.length,10);assert.equal(w.height,28+2+9*76);
assert.equal(w.range().items.length,10);assert.equal(w.range().visible.length,0,'Cold unmeasured rows cannot authorize probes');
w.move(109,400);assert.equal(w.range().visible[0].number,2,'A row whose trailing gap alone intersects the viewport is not safety-visible');
const seen=new Set();
for(let offset=0;offset<10000;offset+=200) {
 w.move(offset,400);const range=w.range();
 assert.ok(range.items.filter(i=>i.row).length<=9);
 assert.equal(range.top+range.items.reduce((h,i)=>h+i.height+i.gap,0)+range.bottom,w.height,'Spacers preserve exact total height');
 for(const item of range.items)if(item.row)seen.add(item.row.number);
 if(w.limit>=w.items.length&&w.offset===w.max)break;
}
assert.equal(seen.size,100);assert.ok(w.range().items.length<10);
w.move(1200,400);let range=w.range();const anchor=range.visible[0].key,at=w.items.findIndex(i=>i.key===anchor),inset=w.offset-w.starts[at];
const before=w.offset;sections[0].rows.unshift(row(0));project();
assert.equal(w.offset,before+76,'Insertion above the viewport keeps the same row and inset');
assert.equal(w.offset-w.starts[w.items.findIndex(i=>i.key===anchor)],inset);assert.ok(w.correction);
const retained=w.offset;sections[0].rows.push(row(101));project();assert.equal(w.offset,retained,'Append below never moves the viewport');
const generation=w.generation;w.move(0,400);w.move(retained,400);assert.ok(w.generation>generation,'Away-and-back changes selection generation');
const notice=w.items.at(-1);w.noticeHeights.set(notice.measureKey,49);project();assert.equal(w.items.at(-1).height,49,'Native notice height replaces only that keyed measurement');
folded.add('owner/repo');project();assert.equal(w.items.length,1);assert.equal(w.height,28);assert.equal(w.offset,0);assert.equal(w.range().visible.length,0);
folded.clear();project();assert.equal(w.items.length,104);assert.equal(w.items[1].height,74);
for(const viewport of [250,400,700]) {w.move(1000,viewport);const range=w.range();assert.ok(range.items.length<=Math.ceil(viewport/74)+4);}
console.log('PASS exact-height window spacers, incremental reveal, 100-row reachability, insertion anchors, notice heights, folds and bounded overscan');
