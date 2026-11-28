// Frame reuse must never become asynchronous read/publication authority.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const {PullFactsOrder}=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:'export {PullFactsOrder} from "./pulls.js";'});
const settle=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
for(const mode of ['healthy','retired-read','retired-error']) {
 const hold=deferred(),failure=deferred(),jobs=[];let reads=0,providerReads=0,diagnoses=0,hints=0;
 let context={scope:'frame',presentationGeneration:1,parent:'owner',links:Array.from({length:14},(_,i)=>({url:`https://github.com/fixture/repo/pull/${i+1}`,terminal:`worker-${i+1}`,task:`task-${i+1}`}))};
 const expected=context;
 const {AggregatePulls}=await loadMod({mod:'custom-changes',host:{spaces:()=>[],exec:()=>{throw Error('No live IO');}},modules:{
  'aggregate.js':'src/plugins/git/mod/aggregate.js',
  'location.js':{location:()=>({space:'owner'})},
  'plugins.js':{sidebarPanelEnabled:()=>true,pluginEvent(){hints++;},pluginPullContext:()=>{providerReads++;return context;}},
  'pulls.js':{PullFactsOrder,retimePull:pr=>pr,finalPull:()=>false,quietRead:()=>false,retryRead(){},pullFailure:()=>({kind:'read'}),
   repositoryFailure:async()=>{diagnoses++;await failure.promise;return {kind:'read',message:'Synthetic read failed'};},
   readTargetPulls:async(_exec,numbers,_repo,options)=>{
    assert.equal(options.current(),true,'Read dispatch revalidates after yielding');reads++;
    await hold.promise;
    return new Map(numbers.map(number=>[number,mode==='retired-error'&&number===1?{error:{stderr:'Synthetic failure'}}:{row:{number,state:'open',url:`https://github.com/fixture/repo/pull/${number}`,title:`PR ${number}`}}]));
   }},
 },entry:'export {AggregatePulls} from "./aggregate.js";'});
 const aggregate=new AggregatePulls({shown:()=>true}),frame={groups:[]};
 const cx={notify(){},spawn(fn){const job=fn(cx);jobs.push(job);return job;}};
 aggregate.sync(cx,frame);
 assert.equal(providerReads,1,'A frame binds once for inventory, demand and presentation');
 assert.equal(hints,0,'Provider proof/request work yields out of render rather than binding a second time');
 assert.equal(aggregate.frameContext(frame,true),expected);
 assert.equal(providerReads,1,'Strict identity is also the same-frame presentation context');
 await settle();assert.equal(hints,1);assert.equal(reads,1);assert.ok(providerReads>1,'Dispatch must not borrow the render frame');
 if(mode==='retired-read')context=null;
 hold.resolve();await settle();
 if(mode==='retired-error') {
  assert.equal(diagnoses,1);context=null;failure.resolve();
 }
 await Promise.all(jobs);await settle();
 const published=[...aggregate.entries.values()].filter(e=>e.pr);
 if(mode==='healthy') {
  assert.equal(published.length,14,'One complete synchronous commit admits every healthy alias');
  assert.ok(providerReads<12,`Provider work stays bounded per synchronous span, not per alias (${providerReads})`);
 } else {
  assert.equal(published.length,0,'A held read or awaited error handler cannot publish using an old frame');
  assert.equal(aggregate.entries.get('fixture/repo#1').error,null,'Retired diagnostics cannot publish either');
 }
 assert.equal(aggregate.pending.size,0);
}
console.log('PASS one frame-local provider bind, fresh asynchronous dispatch, bounded 14-alias commit and membership renewal after every awaited error path');
