// Mounted-prefix model: native scrolling never controls which rows exist.
import assert from 'node:assert/strict';
import {TaskReveal,MAX_MOUNTED_ROWS,MAX_MOUNTED_ITEMS} from '../src/plugins/git/mod/task-reveal.js';
const row=n=>({key:`owner/repo#${n}`,number:n});
const sections=[{repo:'owner/repo',rows:Array.from({length:200},(_,i)=>row(i+1)),error:'Scoped notice'}],folded=new Set(),list=new TaskReveal();
const project=()=>list.project(sections,folded,28,2,'1:390');project();assert.equal(list.length,10);
const seen=new Set();
for(let chunk=0;chunk<5;chunk++){
 while(list.revealMore()){}
 const items=list.range().items,rows=items.filter(i=>i.row);assert.ok(rows.length<=MAX_MOUNTED_ROWS);assert.ok(items.length<=MAX_MOUNTED_ITEMS);
 for(const item of rows)seen.add(item.row.number);
 const before=rows.map(i=>i.row.key);list.move(100000,400);assert.deepEqual(list.range().visible.map(pr=>pr.key),before,'Native viewport movement cannot unmount revealed rows');
 if(!list.more)break;assert.ok(list.canTurn);list.nextChunk();project();
}
assert.equal(seen.size,200);list.nextChunk();project();assert.equal(list.start,0,'The only paging row can cycle back to earlier batches');
list.maxRows=Infinity;while(list.revealMore()){};list.move(1200,400);let anchor=list.range().visible.find(pr=>pr.key===list.items[list.index(1196)].key)?.key,before=list.offset;
sections[0].rows.unshift(row(0));project();assert.equal(list.offset,before+76);assert.ok(list.range().visible.some(pr=>pr.key===anchor));
const retained=list.offset;sections[0].rows.push(row(201));project();assert.equal(list.offset,retained);
const notice=list.items.at(-1);list.noticeHeights.set(notice.measureKey,41);project();assert.equal(list.items.at(-1).height,41);
folded.add('owner/repo');project();assert.equal(list.items.length,1);assert.equal(list.range().visible.length,0);assert.equal(list.height,28);
const headers=new TaskReveal();headers.project(Array.from({length:500},(_,i)=>({repo:`owner/repo-${i}`,rows:[]})),new Set(),28,2,'1:390');while(headers.revealMore()){};assert.ok(headers.range().items.length<=MAX_MOUNTED_ITEMS,'Header-only inventories also have a finite native tree');
console.log('PASS mounted revealed prefix, 60-PR/100-item safety cap, forward/cycling Show more, 200-row reachability, retained anchors, notice heights and folds');
