import assert from 'node:assert/strict';
import {linkedBlocks,captureSpaceBlock,planBlockDrop,SpaceBlockCommit,projectLinkedRows,blockTarget} from '../src/shared/workspace-links.js';
const s=id=>({id,machine:null,active:id==='f2'});
let all=['a','c','b','f','d'].map(s),links=[{parent:'c',child:'f',binding:'owner-1'}];
assert.deepEqual(linkedBlocks(all,links).flatMap(b=>b.ids),['a','c','f','b','d']);
const rows=projectLinkedRows(all.map((w,i)=>({w,i})),links);assert.deepEqual(rows.map(r=>r.i),[0,1,3,2,4]);assert.equal(rows[2].linked,true);
const cap=captureSpaceBlock(all,links,'c');
assert.deepEqual(planBlockDrop(all,links,'c','d',cap),['a','b','d','c','f']);
assert.deepEqual(planBlockDrop(all,links,'c','a',cap),['c','f','a','b','d']);
for(const target of ['a','c','f','d'])assert.equal(planBlockDrop(all,links,'f',target,captureSpaceBlock(all,links,'f')),null,'Singleton child cannot move its block');
assert.equal(planBlockDrop(all,[],'c','d',cap),null,'Disabling during drag cannot split the old pair');
links.push({parent:'b',child:'d',binding:'owner-2'});assert.equal(blockTarget(all,links,'c','b'),'d');assert.equal(blockTarget(all,links,'b','f'),'c');
assert.equal(blockTarget(all,links,'f','b'),'f','Child clamps within own siblings');
all.push({id:'remote',machine:'pc2'});assert.equal(planBlockDrop(all,links,'c','remote',cap),null);
let commands=[],errors=[],ack;
const commit=new SpaceBlockCommit({read:()=>all,links:()=>links,move:(id,index)=>{commands.push([id,index]);ack=()=>{const [m]=all.splice(all.findIndex(s=>s.id===id),1);all.splice(index-1,0,m);};},fail:m=>errors.push(m)});
const finish=()=>{for(let i=0;commit.pending&&i<30;i++){ack();commit.observe();}assert.equal(commit.pending,null);};
let captured=captureSpaceBlock(all,links,'c'),wanted=planBlockDrop(all,links,'c','a',captured);
commit.start('c',captured,wanted);assert.equal(commands.length,1);commit.observe();assert.equal(commands.length,1,'Queued command is not acknowledgement');finish();assert.deepEqual(all.map(s=>s.id),wanted);assert.equal(errors.length,0);
commands=[];commit.start('c',captured,planBlockDrop(all,links,'c','b',captured));assert.ok(commit.pending);commit.observe(Date.now()+6000);assert.equal(commit.pending,null);assert.match(errors.at(-1),/unknown/);const count=commands.length;commit.observe();assert.equal(commands.length,count);
commit.start('c',captured,planBlockDrop(all,links,'c','b',captured));links=[];commit.observe();assert.equal(commit.pending,null);assert.match(errors.at(-1),/relationship/);
// Noncontiguous native children, unrelated machine slots, mixed child kinds:
// only sibling slots change in the acknowledged final order.
const initial=()=>[{id:'remote',machine:'pc2'},...['c','other','f1','gap','f2','f3','end','c2','foreign'].map(s)];
const relations=()=>[...['f1','f2','f3'].map(child=>({parent:'c',child,binding:'home'})),{parent:'c2',child:'foreign',binding:'other'}];
for(const [source,target,expected]of [['f1','f3',['f2','f3','f1']],['f3','f1',['f3','f1','f2']],['f2','f1',['f2','f1','f3']]]) {
 all=initial();links=relations();commands=[];errors=[];captured=captureSpaceBlock(all,links,source);
 assert.deepEqual(captured.sources,[source]);assert.equal(captured.parent,'c');
 assert.equal(blockTarget(all,links,source,'c'),'f1');assert.equal(blockTarget(all,links,source,'foreign'),'f3');assert.equal(blockTarget(all,links,source,'remote'),'f1');
 for(const invalid of ['other','c','c2','foreign','remote'])assert.equal(planBlockDrop(all,links,source,invalid,captured),null,'No direct cross-parent/machine drop');
 wanted=planBlockDrop(all,links,source,target,captured);assert.deepEqual(wanted.filter(id=>id.startsWith('f')&&id!=='foreign'),expected);
 const unaffected=all.filter(s=>!captured.members.includes(s.id)).map(s=>[s.id,all.indexOf(s)]);
 commit.start(source,captured,wanted);finish();assert.equal(errors.length,0);assert.deepEqual(all.map(s=>s.id),wanted);
 for(const [id,index]of unaffected)assert.equal(all[index].id,id,'Unrelated final slot unchanged');
 assert.equal(all.find(s=>s.active).id,'f2','Selection survives');
 // Model re-creation simulates a restart: native order alone restores siblings,
 // their truthful shortcut indices and the final-child connector.
 const restarted=JSON.parse(JSON.stringify(all)),projected=projectLinkedRows(restarted.map((w,i)=>({w,i})),links);
 const children=projected.filter(r=>r.block[0]==='c'&&r.linked);assert.deepEqual(children.map(r=>r.w.id),expected);
 assert.equal(children.at(-1).lastChild,true);assert.equal(children[0].firstChild,true);assert.ok(children.every(r=>r.i===all.findIndex(s=>s.id===r.w.id)));
 const parentCapture=captureSpaceBlock(all,links,'c');assert.deepEqual(parentCapture.sources,['c',...expected]);
 assert.deepEqual(planBlockDrop(all,links,'c','end',parentCapture).filter(id=>parentCapture.sources.includes(id)),['c',...expected],'Parent carries new order');
}
for(const mutation of ['removed','binding','concurrent']) {
 all=initial();links=relations();commands=[];errors=[];captured=captureSpaceBlock(all,links,'f1');wanted=planBlockDrop(all,links,'f1','f3',captured);commit.start('f1',captured,wanted);
 if(mutation==='removed')links=links.filter(l=>l.child!=='f2');else if(mutation==='binding')links[1]={...links[1],binding:'new-owner'};else all.reverse();
 commit.observe();assert.equal(commit.pending,null);assert.match(errors.at(-1),mutation==='concurrent'?/concurrently/:/relationship/);const sent=commands.length;commit.observe();assert.equal(commands.length,sent);
}
all=initial();links=relations();assert.equal(projectLinkedRows(all.map(w=>({w})),[...links,{parent:'other',child:'f1',binding:'foreign'}]).find(r=>r.w.id==='f1').linked,false,'Ambiguous ownership fails closed');
assert.ok(projectLinkedRows(all.map(w=>({w})),[{parent:'c',child:'f1'},{parent:'f1',child:'c'}]).every(r=>!r.linked),'Cycles fail closed');
console.log('PASS sibling scopes, both directions, native persistence/indices/connectors, parent blocks, clamping, delayed acknowledgements, concurrent changes, expiry and no replay');
