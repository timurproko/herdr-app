import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {rowHarness} from './support/git-row.mjs';
import fs from 'node:fs';
import path from 'node:path';
import {syncPreferences} from '../tools/runtime/preferences.mjs';
const f=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:'export * from "./pulls.js";'});
let now=1000;const events=[],logs=[];
const reads=new f.GitReads({now:()=>now,onDiagnostic:r=>events.push(r),log:line=>logs.push(line)});
const last=(repo='owner/repo',machine=null)=>reads.diagnostics.get(JSON.stringify([machine,repo]));
const refuse=()=>({code:1,stderr:'secondary rate limit SECRET raw payload C:/private'});
await assert.rejects(reads.read(f.targetPullArgs([74,76],'owner/repo'),'owner/repo',{cwd:'C:/private',credentialScope:'TOKEN'},refuse));
assert.equal(last().phase,'target');assert.equal(last().outcome,'quiet-refusal');assert.equal(last().lastRefusalAt,1000);assert.equal(last().retryAt,901000);
now=2000;await assert.rejects(reads.read(f.countArgs('owner/repo'),'owner/repo',{},()=>assert.fail('Cooldown starts no IO')));
assert.equal(last().phase,'count');assert.equal(last().outcome,'cooldown-skip');assert.equal(last().lastRefusalAt,1000);assert.equal(last().retryAt,901000);assert.equal(logs.length,1);
now=901000;await reads.read(f.pullListArgs('open','owner/repo'),'owner/repo',{},()=>({code:0}));
assert.equal(last().phase,'list');assert.equal(last().outcome,'success');assert.equal(last().lastRefusalAt,1000);assert.equal(last().retryAt,901000,'Recovery keeps refusal evidence');
await reads.read('a','owner/repo',{on:'peer'},()=>({code:0}));assert.equal(last('owner/repo','peer').outcome,'success');
let finish;const held=reads.read('old','owner/repo',{},()=>new Promise(resolve=>finish=resolve));now++;
const next=reads.read('new','owner/repo',{},()=>({code:0}));const attempt=last().attempt;
finish({code:0});await Promise.all([held,next]);assert.equal(last().attempt,attempt);assert.equal(last().startedAt,now);
// Even a late genuine refusal keeps evidence without replacing newer phase facts.
const old=reads.beginDiagnostic(f.targetPullArgs([1],'owner/repo'),'owner/repo',{});now++;
reads.beginDiagnostic(f.countArgs('owner/repo'),'owner/repo',{});reads.recordDiagnostic(old,'quiet-refusal',{retryAt:now+900000});
assert.equal(last().phase,'count');assert.equal(last().outcome,'queued');assert.equal(last().lastRefusalAt,now);
for(let i=0;i<150;i++){now++;await reads.read('a',`owner/repo${i}`,{},()=>({code:0}));}
assert.equal(reads.diagnostics.size,128);assert.equal(last(),undefined);
const before=reads.diagnostics.size;await reads.read('a',null,{cwd:'C:/private'},()=>({code:0}));assert.equal(reads.diagnostics.size,before,'Unknown repository cannot invent a diagnostic key');
await Promise.resolve();assert.doesNotMatch(JSON.stringify(events),/SECRET|TOKEN|C:\/private|stderr|query=/);
const broken=new f.GitReads({onDiagnostic(){throw Error('Sink unavailable');}});await broken.read('a','owner/repo',{},()=>({code:0}));await Promise.resolve();
let synchronous=true;const sinkTurns=[];const yielded=new f.GitReads({onDiagnostic(){sinkTurns.push(synchronous);}});const job=yielded.read('a','owner/repo',{},()=>({code:0}));synchronous=false;await job;assert.ok(sinkTurns.length);assert.ok(sinkTurns.every(turn=>turn===false));
console.log('PASS bounded per-repository read phases, genuine refusal vs cooldown skip, recovery evidence, late-attempt rejection, machine isolation, safe fields and best-effort yielded sink');

// Actual main sink: reads started in a render-like synchronous turn cannot
// publish shared state until that turn yields. No UI or notifications involved.
const state={};let rendering=false,writes=0,renderWriteAttempts=0,failSink=false;
const h=await rowHarness({host:{shared:k=>state[k],setShared:(k,v)=>{if(rendering)renderWriteAttempts++;assert.equal(rendering,false);if(failSink)throw Error('Disk unavailable');writes++;state[k]=v;},exec:async()=>({code:0,stdout:'{}'})}});
h.panel.enableReadDiagnostics();const runtime=h.facts.gitReads(h.transport);
rendering=true;const pending=runtime.read(h.facts.targetPullArgs([74],'owner/repo'),'owner/repo',{cwd:'C:/secret'},()=>({code:1,stderr:'private'}));assert.equal(writes,0);rendering=false;await pending;await Promise.resolve();
assert.equal(renderWriteAttempts,0);const key=JSON.stringify([null,'owner/repo']);assert.equal(state['custom.git.read-diagnostics'].entries[key].phase,'target');
const existing=state['custom.git.read-diagnostics'].entries[key];runtime.onDiagnostic({...existing,startedAt:existing.startedAt-1,outcome:'success'});
assert.equal(state['custom.git.read-diagnostics'].entries[key].outcome,'failure','Older producer cannot replace newer runtime phase');
for(let i=0;i<140;i++)await runtime.read('x',`owner/r${i}`,{on:i%2?'peer':null},()=>({code:0}));
assert.equal(Object.keys(state['custom.git.read-diagnostics'].entries).length,128);
assert.doesNotMatch(JSON.stringify(state),/C:\/secret|private|stderr/);
failSink=true;await runtime.read('x','owner/healthy',{},()=>({code:0}));await Promise.resolve();
fs.mkdirSync('.artifacts',{recursive:true});const home=fs.mkdtempSync(path.resolve('.artifacts/git-diagnostic-export-'));
try{fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({...state,'agents.sort':'grouped'}));syncPreferences('export',home,{hostname:'fixture'});const exported=JSON.parse(fs.readFileSync(path.join(home,'preferences/fixture.json')));assert.deepEqual(exported.shared,{'agents.sort':'grouped'});}finally{fs.rmSync(home,{recursive:true,force:true});}
console.log('PASS actual yielded main runtime publication, bounded shared snapshot, stale-producer guard, safe fields, sink failure tolerance and portable export exclusion');
