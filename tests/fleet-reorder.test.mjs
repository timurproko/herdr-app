import assert from 'node:assert/strict';
import {linkedBlocks,captureSpaceBlock,planBlockDrop,SpaceBlockCommit,projectLinkedRows,blockTarget} from '../src/shared/workspace-links.js';
const s=id=>({id,machine:null});
let all=['a','c','b','f','d'].map(s),links=[{parent:'c',child:'f',binding:'owner-1'}];
assert.deepEqual(linkedBlocks(all,links).flatMap(b=>b.ids),['a','c','f','b','d']);
const rows=projectLinkedRows(all.map((w,i)=>({w,i})),links);assert.deepEqual(rows.map(r=>r.i),[0,1,3,2,4]);assert.equal(rows[2].linked,true);
for(const source of ['c','f']) {
 const cap=captureSpaceBlock(all,links,source),wanted=planBlockDrop(all,links,source,'d',cap);
 assert.deepEqual(wanted,['a','b','d','c','f']);
 assert.deepEqual(planBlockDrop(all,links,source,'a',cap),['c','f','a','b','d']);
 assert.equal(planBlockDrop(all,links,source,'f',cap),null);
 assert.equal(planBlockDrop(all,[],source,'d',cap),null,'Disabling during drag cannot split the old pair');
}
links.push({parent:'b',child:'d',binding:'owner-2'});assert.equal(blockTarget(all,links,'f','b'),'d');assert.equal(blockTarget(all,links,'b','f'),'c');
all.push({id:'remote',machine:'pc2'});assert.equal(planBlockDrop(all,links,'f','remote',captureSpaceBlock(all,links,'f')),null);
let commands=[],errors=[],pending;
const commit=new SpaceBlockCommit({read:()=>all,links:()=>links,move:(id,index)=>{commands.push([id,index]);pending=()=>{const [m]=all.splice(all.findIndex(s=>s.id===id),1);all.splice(index-1,0,m);};},fail:m=>errors.push(m)});
const captured=captureSpaceBlock(all,links,'f'),wanted=planBlockDrop(all,links,'f','a',captured);
commit.start('f',captured,wanted);assert.equal(commands.length,1);commit.observe();assert.equal(commands.length,1,'A queued command is not acknowledgement');
while(commit.pending) {pending();commit.observe();}
assert.deepEqual(all.map(s=>s.id),wanted);assert.equal(errors.length,0);
// A fresh gesture with no acknowledgement expires and is never replayed.
commands=[];commit.start('f',captured,planBlockDrop(all,links,'f','a',captured));assert.ok(commit.pending);commit.observe(Date.now()+6000);assert.equal(commit.pending,null);assert.match(errors.at(-1),/unknown/);const count=commands.length;commit.observe();assert.equal(commands.length,count);
// Current relation changes invalidate remaining commands, with no rollback.
commit.start('f',captured,planBlockDrop(all,links,'f','a',captured));links=[];commit.observe();assert.equal(commit.pending,null);assert.match(errors.at(-1),/relationship/);
all=['c','other','f1','f2','f3','end'].map(s);links=['f1','f2','f3'].map(child=>({parent:'c',child,binding:'home'}));
for(const source of ['c','f1','f2','f3']) {
 const cap=captureSpaceBlock(all,links,source);assert.deepEqual(cap.sources,['c','f1','f2','f3']);
 const wanted=planBlockDrop(all,links,source,'end',cap);assert.deepEqual(wanted,['other','end','c','f1','f2','f3']);
 const prior=[...all];commands=[];errors=[];commit.start(source,cap,wanted);links=links.slice(0,2);commit.observe();
 assert.equal(commit.pending,null);assert.match(errors.at(-1),/relationship/);const sent=commands.length;commit.observe();assert.equal(commands.length,sent);
 all=prior;links=['f1','f2','f3'].map(child=>({parent:'c',child,binding:'home'}));
}
assert.equal(projectLinkedRows(all.map(w=>({w})),[...links,{parent:'other',child:'f1',binding:'foreign'}]).find(r=>r.w.id==='f1').linked,false,'Ambiguous ownership cannot silently select a parent');
assert.ok(projectLinkedRows(all.map(w=>({w})),[{parent:'c',child:'f1'},{parent:'f1',child:'c'}]).every(r=>!r.linked),'Cycles are not connected blocks');
console.log('PASS single/multi-child block projection, any source, pair edges, delayed acknowledgements, changed membership, expiry, no replay and cross-machine protection');
