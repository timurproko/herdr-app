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
console.log('PASS attached block projection, either source, pair edges, delayed acknowledgements, expiry, no replay and cross-machine protection');
