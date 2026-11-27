// Pending admission must terminate: real raw targeted replies and held footer/root reads.
import assert from 'node:assert/strict';
import {rowHarness,find,words,rowGeometry,t} from './support/git-row.mjs';
const tick=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
const footer=number=>({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:`Fable 5.2 · 166.0k/200.0k 83% · $4.6684\n⏵⏵ auto mode on (shift+tab to cycle)${number?` · PR #${number}`:''}`})});
const setup=h=>{const p=h.panel;p.shown=()=>true;p.sectionEntry=true;p.branch='main';p.agentLinks={pullNumber:()=>null,related:()=>null};p.pulls.open=[1,2].map(number=>h.facts.pullRow({number,title:'Healthy '+number,state:'OPEN'}));p.counts={open:2,closed:0};p.commitRepository();return p;};
const paint=(h,zoom=1)=>{const tree=h.render(()=>h.panel.renderPulls(t)),g=rowGeometry(tree,390,zoom,600);return {tree,y:find(tree,'pr-1')?g.get(find(tree,'pr-1')).y:null};};
for(const zoom of [1,1.3])for(const pinned of [false,true])for(const kind of ['missing','503','timeout','rejected','repository-missing','quiet']) {
 const calls=[];const h=await rowHarness({modules:{'panel-kit.js':'src/ui/panel-kit.js'},host:{exec:async(_cmd,args)=>{
  calls.push(args);
  if(kind==='missing')return {code:1,stderr:'GraphQL: Could not resolve to a PullRequest with the number of 99.',stdout:JSON.stringify({data:{repository:{pr99:null}},errors:[{path:['repository','pr99'],message:'Could not resolve to a PullRequest with the number of 99.'}]})};
  if(kind==='503')return {code:1,stderr:'HTTP 503 Service Unavailable'};
  if(kind==='timeout')return {code:0,timed_out:true,stdout:''};
  if(kind==='rejected')throw Error('failed to spawn gh: EAGAIN');
  if(kind==='repository-missing')return {code:1,stderr:'Could not resolve to a Repository with the name owner/repo'};
  return {code:1,stderr:'HTTP 403 API rate limit exceeded'};
 }}}),p=setup(h);h.setZoom(zoom);h.cx.timer={after:()=>({cancel(){}})};
 p.agentPull=pinned?1:null;p.agentResolved=JSON.stringify(h.place);const before=paint(h,zoom);
 p.agentPull=99;assert.equal(p.associationPending(),true);p.loadRelatedPull(h.cx);await tick();
 const after=paint(h,zoom);assert.ok(find(after.tree,'pr-1'));assert.equal(find(after.tree,'git-association-pending'),undefined);assert.equal(p.associationPending(),false);
 if(kind==='missing') {assert.ok(p.relatedAbsent);assert.equal(p.associationError(),null);assert.equal(find(after.tree,'active-pull'),undefined,'Authoritative absence releases to the final ordinary layout');}
 else {assert.equal(after.y,before.y,'Failed/deferred read retains the last-good row position');if(kind==='quiet')assert.equal(p.associationError(),null);else assert.match(words(find(after.tree,'git-read-error')).join(' '),/retry|unavailable|not found/i);}
 const count=calls.length;for(let n=0;n<4;n++){p.loadRelatedPull(h.cx);paint(h,zoom);}await tick();assert.equal(calls.length,count,'Failed target never hot-loops from render');
}
// An authoritative miss after a quiet refusal must release the old held pin.
{
 let quiet=true;const h=await rowHarness({host:{exec:async()=>quiet?{code:1,stderr:'HTTP 403 API rate limit exceeded'}:{code:1,stderr:'Could not resolve to a PullRequest with the number of 99.',stdout:JSON.stringify({data:{repository:{pr99:null}},errors:[{path:['repository','pr99'],message:'Could not resolve to a PullRequest with the number of 99.'}]})}}}),p=setup(h);h.cx.timer={after:()=>({cancel(){}})};
 p.agentPull=1;p.agentResolved=JSON.stringify(h.place);paint(h);p.agentPull=99;p.loadRelatedPull(h.cx);await tick();assert.ok(find(paint(h).tree,'active-pull'));
 quiet=false;p.relatedRetry=null;p.readWake=null;p.manualRead={remaining:1,expires:Date.now()+30000};p.loadRelatedPull(h.cx);await tick();assert.ok(p.relatedAbsent);assert.equal(p.relatedDeferred,null);assert.equal(find(paint(h).tree,'active-pull'),undefined);
}
// Same terminal, same folder: every successful root/branch refresh forces a new
// footer read after loading clears; old pin remains until that read resolves.
{
 let value=1,reads=0;const h=await rowHarness({host:{exec:async(_cmd,args)=>({code:0,stdout:args[0]==='rev-parse'?'/repo':'main'}),hc:async()=>{reads++;return footer(value);}}}),p=setup(h);
 Object.assign(h.place,{app:'claude-code'});p.syncAggregate=()=>false;h.cx.timer={after:()=>({cancel(){}})};
 p.syncAgent(h.cx);await tick();assert.equal(p.agentPull,1);paint(h);
 for(const number of [2,null,1]){value=number;p.agentAssociations.clear();p.refresh(h.cx);await tick();assert.equal(p.loading,false);assert.equal(p.agentPull,number);const tree=paint(h).tree;assert.equal(Boolean(find(tree,'active-pull')),number!==null);}
 assert.equal(reads,4,'Periodic/manual root refresh cannot discard forced footer demand');
 p.loading=true;p.syncAgent(h.cx,true);assert.ok(p.agentRefresh);p.loading=false;value=2;p.syncAgent(h.cx);await tick();assert.equal(p.agentPull,2);assert.equal(reads,5,'Explicit forced demand queued during loading is consumed afterward');
}
// Forced demand arriving during an existing footer read is consumed after it,
// rather than being cleared by that older read's resolve path.
{
 const reads=[],h=await rowHarness({host:{hc:()=>new Promise(resolve=>reads.push(resolve))}}),p=setup(h);Object.assign(h.place,{app:'claude-code'});h.cx.timer={after:()=>({cancel(){}})};
 p.syncAgent(h.cx);await tick();p.syncAgent(h.cx,true);assert.ok(p.agentRefresh);reads[0](footer(1));await tick();assert.equal(reads.length,2);assert.equal(p.agentPull,1);reads[1](footer(2));await tick();assert.equal(p.agentPull,2);assert.equal(p.agentRefresh,null);
}
// Unknown association failures terminate in retained content + actionable text,
// including an hc promise that never resolves until its finite deadline.
for(const failure of ['exit','timeout','reject','hung']) {
 const timers=[],reads=[];const h=await rowHarness({modules:{'panel-kit.js':'src/ui/panel-kit.js'},host:{hc:()=>new Promise((resolve,reject)=>reads.push({resolve,reject}))}}),p=setup(h);
 h.cx.timer={after:(ms,fn)=>{const timer={ms,fn,cancel(){this.cancelled=true;}};timers.push(timer);return timer;}};
 p.agentPull=1;paint(h);Object.assign(h.place,{terminal:'unknown',app:'claude-code'});p.syncAgent(h.cx);await tick();assert.equal(p.associationPending(),true);
 const stale=reads[0];if(failure==='hung')timers.find(timer=>timer.ms===15000).fn(h.cx);else if(failure==='reject')stale.reject(Error('offline'));else stale.resolve({code:failure==='exit'?1:0,timed_out:failure==='timeout',stdout:''});await tick();
 assert.equal(p.associationPending(),false);const failed=paint(h);assert.ok(find(failed.tree,'pr-1'));assert.ok(find(failed.tree,'git-read-error'));assert.doesNotMatch(words(failed.tree).join(' '),/Loading/);
 p.syncAgent(h.cx);await tick();assert.equal(reads.length,1,'Failure cooldown prevents read-per-render');
 p.syncAgent(h.cx,true);await tick();reads[1].resolve(footer(2));await tick();assert.equal(p.agentPull,2);assert.equal(p.associationError(),null);
 if(failure==='hung'){stale.resolve(footer(1));await tick();assert.equal(p.agentPull,2,'Timed-out reply cannot repin after recovery');}
}
// Native task cancellation can bypass finally: retire the targeted task into a
// visible failure, not an eternal relatedKey/association latch.
{
 let release;const h=await rowHarness({host:{exec:()=>new Promise(resolve=>release=resolve)}}),p=setup(h);
 const task={is_done:()=>true};h.cx.spawn=fn=>{Promise.resolve().then(()=>fn(h.cx));return task;};h.cx.timer={after:()=>({cancel(){}})};
 paint(h);p.agentPull=99;p.agentResolved=JSON.stringify(h.place);p.loadRelatedPull(h.cx);await tick();p.recoverReadTasks();assert.equal(p.associationPending(),false);assert.ok(find(paint(h).tree,'git-read-error'));
 release({code:1,stderr:'HTTP 503'});await tick();assert.equal(p.associationPending(),false);
}
// Non-readable contexts are not active pending work either.
{
 const h=await rowHarness({modules:{'panel-kit.js':'src/ui/panel-kit.js'}}),p=setup(h);Object.assign(h.place,{cwd:null,terminal:null,app:null});p.context=JSON.stringify([null,null]);p.root=null;p.repo=null;p.pulls.open=null;p.syncAgent(h.cx);
 assert.equal(p.associationPending(),false);assert.ok(words(p.renderPulls(t)).includes('No folder'));
}
{
 const h=await rowHarness({host:{machines:()=>[]},modules:{'panel-kit.js':'src/ui/panel-kit.js'}}),p=setup(h);h.place.on='pc2';p.on='pc2';p.context=JSON.stringify(['/repo','pc2']);p.agentPull=1;p.agentResolved=JSON.stringify(h.place);const before=paint(h);
 p.agentPull=99;assert.equal(p.associationPending(),false);const offline=paint(h);assert.equal(offline.y,before.y);assert.match(words(offline.tree).join(' '),/machine unavailable/);assert.equal(find(offline.tree,'git-association-pending'),undefined);
}
console.log('PASS raw missing/failed/deferred targets, forced same-terminal footer replacement/removal, queued force, failed/hung footer bounds and abandoned targeted-task recovery');
