// Actual aggregate/diagnosis modules, synthetic responses and clock only.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
let now=1_800_000_000_000,shown=true,enabled=true,identityReads=0,hold=null;
const repo='example/crew',other='example/other',url=(n,r=repo)=>`https://github.com/${r}/pull/${n}`,key=(n,r=repo)=>`${r}#${n}`;
const source=(n,historical=true,r=repo)=>({url:url(n,r),task:`private-task-${n}`,historical,terminal:historical?null:'worker'});
const context={scope:'home',machine:'pc2',links:[source(36),source(37),source(38)]};
const missing=n=>({code:1,stderr:`GraphQL: Could not resolve to a PullRequest with the number of ${n}. (repository.pullRequest)`});
const found=(n,r=repo)=>({code:0,stdout:JSON.stringify({number:n,url:url(n,r),title:`PR ${n}`,state:'MERGED',mergedAt:new Date(now-1000).toISOString(),labels:[],statusCheckRollup:[]})});
const results=new Map([[key(36),missing(36)],[key(37),{code:1,stderr:'HTTP 404: Not Found'}],[key(38),found(38)]]),calls=[],logs=[],jobs=[];
const cx={notify(){},spawn:fn=>jobs.push(Promise.resolve().then(()=>fn(cx))),timer:{after(){throw Error('No new timer');},every(){throw Error('No new timer');}}};
const tick=async()=>{for(let i=0;i<20;i++)await Promise.resolve();};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={run(){throw Error('No worker action');},exec:async(cmd,args,options)=>{
 assert.equal(options.on,'pc2');
 if(cmd==='node'){identityReads++;return {code:0,stdout:'fixture-user'};}
 assert.equal(cmd,'gh');assert.equal(options.timeout,30000);const n=Number(args[2]),r=args[args.indexOf('--repo')+1],k=key(n,r);calls.push(k);
 if(hold)return new Promise(resolve=>hold.push(()=>resolve(results.get(k))));
 const value=results.get(k);assert.ok(value,`Missing fixture ${k}`);if(value instanceof Error)throw value;return value;
}};
const load=(log=line=>logs.push(line))=>loadMod({host,modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','plugins.js':{sidebarPanelEnabled:()=>enabled,pluginPullContext:()=>context,pluginEvent(){}},'location.js':{location:()=>({space:'coordinator'})}},globals:{Date:class extends Date{static now(){return now;}},console:{log}},entry:'export {AggregatePulls} from "./aggregate.js";'});
const {AggregatePulls}=await load();let a=new AggregatePulls({shown:()=>shown});
const reads=k=>calls.filter(c=>c===k).length;
const silent=()=>{for(const state of ['open','closed'])assert.equal(a.readNotice(repo,state),null);};
a.sync(cx);await drain();silent();assert.deepEqual(Array.from(a.rows('closed'),pr=>pr.number),[38]);assert.equal(a.counts().closed,1);assert.equal(logs.length,2);assert.equal(identityReads,0);
assert.equal(logs[0],'[custom-changes] task PR not found: example/crew #36');assert.ok(!logs.join('\n').includes('private-task'));
for(let i=0;i<3;i++){a.refresh(cx);a.invalidate(repo);a.pump(cx);await drain();}
shown=false;a.sync(cx);shown=true;a.sync(cx);await drain();
context.scope='another-home';a.sync(cx);await drain();a.stop();a=new AggregatePulls({shown:()=>shown});a.sync(cx);await drain();
context.links=[];a.sync(cx);context.links=[source(36),source(37),source(38),source(36,true,other)];results.set(key(36,other),found(36,other));a.sync(cx);await drain();
assert.equal(reads(key(36)),1);assert.equal(reads(key(37)),1);assert.equal(reads(key(36,other)),1);assert.equal(logs.length,2);silent();
// Previously loaded facts are removed only for authoritative absence.
results.set(key(38),missing(38));a.refresh(cx);await drain();assert.equal(a.entries.get(key(38)).pr,null);assert.equal(a.counts().closed,1);assert.deepEqual(Array.from(a.repositories()),[other]);silent();
// Live and shared live/history sources are equally silent, but may be retried.
context.links=[source(40,false),source(40)];results.set(key(40),missing(40));a.sync(cx);await drain();silent();assert.equal(a.counts().open,0);assert.equal(a.counts().closed,0);assert.equal(a.repositories().length,0);
const firstMissing=now;for(let i=0;i<4;i++){a.refresh(cx);await drain();}assert.equal(reads(key(40)),1);
now=firstMissing+300000-1;a.sync(cx);await drain();assert.equal(reads(key(40)),1);
now++;hold=[];a.sync(cx);await tick();assert.equal(hold.length,1);
for(let i=0;i<3;i++)a.sync(cx);assert.equal(hold.length,1,'Repeated renders do not queue another recheck');
hold.shift()();hold=null;await drain();assert.equal(reads(key(40)),2);assert.equal(logs.filter(l=>l.endsWith('#40')).length,1);silent();
// Task completion suppresses the same identity for the remainder of the session.
context.links=[source(40)];now+=600000;a.sync(cx);a.refresh(cx);await drain();assert.equal(reads(key(40)),2);
// A corrected URL does not inherit another identity's cooldown.
context.links=[source(41,false)];results.set(key(41),found(41));a.sync(cx);await drain();assert.equal(reads(key(41)),1);assert.equal(a.rows('closed')[0].number,41);
context.links=[source(40,false)];results.set(key(40),found(40));a.sync(cx);await drain();assert.equal(reads(key(40)),3);assert.equal(a.rows('closed')[0].number,40,'A later created PR becomes visible normally');
results.set(key(40),missing(40));a.refresh(cx);await drain();assert.equal(logs.filter(l=>l.endsWith('#40')).length,1,'Success never resets log deduplication');
// A real error during an expired-live recheck becomes an explicit notice, not
// another cached absence; the next explicit Refresh can retry immediately.
now+=300000;results.set(key(40),{code:1,stderr:'HTTP 403: Resource not accessible by integration'});a.sync(cx);await drain();
assert.match(a.readNotice(repo,'open'),/example\/crew.*fixture-user/);const failedReads=reads(key(40));a.refresh(cx);await drain();assert.equal(reads(key(40)),failedReads+1);
// Real/ambiguous failures must remain retryable, even when quoting absence.
const failures=[
 [{code:1,stderr:'HTTP 403: Resource not accessible by integration\nHTTP 404: Not Found'},'access'],
 [{code:1,stderr:'HTTP 401: Bad credentials\nHTTP 404: Not Found'},'auth'],
 [{code:1,stderr:'HTTP 403: secondary rate limit\nHTTP 404: Not Found'},'rate'],
 [{code:1,stderr:'Could not resolve host: api.github.com\nHTTP 404: Not Found'},'unreachable'],
 [{code:1,stderr:'HTTP 502: gateway timeout\nHTTP 404: Not Found'},'response'],
 [{code:1,timed_out:true,stderr:'HTTP 404: Not Found'},'transient'],
 [{code:3221225794,stderr:'HTTP 404: Not Found'},'transient'],
 [{code:1,stderr:'GraphQL: Could not resolve to a Repository with the name example/crew'},'notfound'],
 [{code:1,stderr:'Arbitrary local thing not found'},'notfound'],
 [{code:1,stderr:'GraphQL: Could not resolve to a PullRequest with the number of 9999.'},'notfound'],
 [new Error('execution timed out'),'transient'],
];
for(const [i,[failure,kind]]of failures.entries()){
 const n=100+i;context.links=[source(n)];results.set(key(n),failure);a.sync(cx);await drain();
 assert.equal(a.entries.get(key(n)).error.kind,kind);assert.ok(a.readNotice(repo,'closed'));const before=reads(key(n));a.refresh(cx);await drain();assert.equal(reads(key(n)),before+1);
}
// Missing replies from obsolete hidden/disabled/superseded contexts cannot log
// or poison the module-session cache for a later legitimate read.
for(const mode of ['hidden','disabled','scope','removed','stale']){
 const n=200+['hidden','disabled','scope','removed','stale'].indexOf(mode);context.links=[source(n)];results.set(key(n),missing(n));hold=[];a.sync(cx);await tick();assert.equal(hold.length,1);const logged=logs.length;
 if(mode==='hidden')shown=false;if(mode==='disabled')enabled=false;if(mode==='scope')context.scope+='-new';if(mode==='removed')context.links=[];if(mode==='stale')context.stale=true;
 hold.shift()();hold=null;await drain();assert.equal(logs.length,logged);shown=true;enabled=true;context.stale=false;context.links=[source(n)];a.sync(cx);a.refresh(cx);await drain();assert.equal(reads(key(n)),2);assert.equal(logs.length,logged+1);
}
// New module graph / app session has no persisted negative inventory.
const fresh=await load();context.links=[source(36)];const cold=new fresh.AggregatePulls({shown:()=>shown});cold.sync(cx);await drain();assert.equal(reads(key(36)),2);
// Logging is best-effort and cannot turn absence back into a read error.
const noLog=await load(()=>{throw Error('Log unavailable');});const quiet=new noLog.AggregatePulls({shown:()=>shown});quiet.sync(cx);await drain();assert.equal(quiet.entries.get(key(36)).error,null);assert.equal(quiet.rows('closed').length,0);
console.log('PASS silent missing task PRs, exact session cache, one diagnostic, five-minute live rechecks, real refusals and obsolete-result guards (synthetic only)');
