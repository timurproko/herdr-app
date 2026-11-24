// Real targeted-reader modules; synthetic host/GitHub responses, no live account.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const DAY=86400000;let now=Date.UTC(2026,10,23,18),shown=true,active=0,peak=0;
const url=(n,repo='example/crew')=>`https://github.com/${repo}/pull/${n}`;
const key=(n,repo='example/crew')=>`${repo}#${n}`;
const iso=n=>new Date(n).toISOString();
const context={scope:'verified-home',machine:'pc2',links:[8,5,6,7].map(n=>({url:url(n),task:`task-${n}`,terminal:n===8?'live-worker':null,historical:n!==8}))};
const facts=new Map([8,5,6,7].map(n=>[key(n),{number:n,url:url(n),state:n===8?'OPEN':'MERGED',isDraft:n===8,title:`PR ${n}`,mergedAt:n===8?null:iso(now-3600000),closedAt:n===8?null:iso(now-1000),labels:[],statusCheckRollup:[]}]));
const failures=new Map(),jobs=[],calls=[];
const cx={spawn:fn=>jobs.push(Promise.resolve().then(()=>fn(cx))),notify(){}};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={run(){},exec:async(cmd,args,options)=>{
 if(cmd==='node'){assert.equal(args[2],'example/crew');assert.equal(options.on,'pc2');assert.equal(options.timeout,5000);return {code:0,stdout:'fixture-user'};}
 assert.equal(cmd,'gh');assert.equal(args[0],'pr');assert.equal(args[1],'view');assert.equal(options.on,'pc2');assert.equal(options.timeout,30000);
 const fields=args.at(-1).split(',');for(const f of ['mergedAt','closedAt','labels'])assert.ok(fields.includes(f));
 const repo=args[args.indexOf('--repo')+1],k=key(Number(args[2]),repo);assert.ok(facts.has(k));calls.push(k);peak=Math.max(peak,++active);await Promise.resolve();active--;
 const failure=failures.get(k);if(failure instanceof Error)throw failure;if(failure)return failure;
 return {code:0,stdout:JSON.stringify(facts.get(k))};
}};
const {AggregatePulls,pullFailure,pullError}=await loadMod({host,modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}},'location.js':{location:()=>({space:'coordinator'})}},globals:{Date:class extends Date{static now(){return now;}}},entry:'export {AggregatePulls} from "./aggregate.js";export {pullFailure,pullError} from "./pulls.js";'});
const a=new AggregatePulls({shown:()=>shown});a.sync(cx);await drain();
assert.equal(calls.length,4);assert.ok(peak<=3);assert.equal(JSON.stringify(a.counts()),JSON.stringify({open:1,closed:3}));
assert.deepEqual(Array.from(a.rows('open'),p=>p.number),[8]);assert.deepEqual(Array.from(a.rows('closed'),p=>p.number),[5,6,7]);
for(const p of a.rows('closed'))assert.equal(a.target(p),null);assert.equal(a.target(a.rows('open')[0]).terminal,'live-worker');
const transient='Could not read pull requests; refresh to retry';
const access='Repository or pull request is not accessible with the GitHub account';
const missing='Repository or pull request not found';
const cases=[
 [new Error('failed to spawn gh: EAGAIN'),'transient',transient],
 [new Error('cannot start gh: process initialisation failed (0xC0000142)'),'transient',transient],
 [{code:3221225794,stderr:''},'transient',transient],
 [{code:-1073741502,stderr:''},'transient',transient],
 [{code:1,stderr:''},'transient',transient],
 [{code:null,signal:'SIGTERM',stderr:''},'transient',transient],
 [{code:0,timed_out:true,stderr:''},'transient',transient],
 [new Error('execution timed out after 30000ms'),'transient',transient],
 [new Error('request timeout'),'transient',transient],
 [{code:1,stderr:'GraphQL: Could not resolve to a Repository with the name example/crew. (repository)'},'notfound',missing],
 [{code:1,stderr:'GraphQL: Could not resolve to a PullRequest with the number of 5. (repository.pullRequest)'},'notfound',missing],
 [{code:1,stderr:'HTTP 404: Not Found'},'notfound',missing],
 [{code:1,stderr:'HTTP 403: Resource not accessible by integration'},'access',access],
 [{code:1,stderr:'HTTP 401: Bad credentials'},'auth','Sign in first: gh auth login'],
 [{code:1,stderr:'HTTP 403: API rate limit exceeded'},'rate','Could not read pull requests: GitHub rate limit exceeded'],
 [{code:1,stderr:'HTTP 502: timeout at GitHub gateway'},'response','Could not read pull requests: GitHub returned an error'],
 [{code:1,stderr:'GraphQL: error in network field'},'response','Could not read pull requests: GitHub returned an error'],
 [{code:1,stderr:'Could not resolve host: api.github.com'},'unreachable','GitHub is unreachable'],
 [{code:1,stderr:'dial tcp: connect: connection refused'},'unreachable','GitHub is unreachable'],
 [{code:1,stderr:'dial tcp: i/o timeout'},'unreachable','GitHub is unreachable'],
];
for(const [failure,kind,message]of cases){
 const f=pullFailure(failure);assert.equal(f.kind,kind);assert.equal(f.message,message);
 // String callers in ordinary Git must retain truthful response classification.
 assert.equal(pullError(failure),message);
 // Exact targeted PR absence is covered by fleet-missing-pulls: unlike
 // uncertain repository resolution it is no longer a retained row/error.
 if(kind==='notfound' && /PullRequest|HTTP 404/.test(failure.stderr??''))continue;
 for(const n of [5,6,7])failures.set(key(n),failure);
 a.invalidate();a.pump(cx);await drain();assert.equal(JSON.stringify(a.counts()),JSON.stringify({open:1,closed:3}));
 for(const n of [5,6,7]){const e=a.entries.get(key(n));assert.equal(e.error.kind,kind);assert.equal(e.error.message,kind==='notfound'?'example/crew not found':['access','auth'].includes(kind)?`example/crew not accessible with the GitHub account fixture-user${kind==='auth'?'; sign in with gh auth login':''}`:message);assert.equal(e.pr.state,'merged');}
 assert.equal(a.entries.get(key(8)).error,null,'Healthy live row survives failed historical reads');
}
assert.equal(pullError(new Error('cannot start gh: program not found')),'GitHub CLI (gh) is not installed');
failures.clear();a.invalidate();a.pump(cx);await drain();for(const e of a.entries.values())assert.equal(e.error,null);
failures.set(key(5),{code:0,stdout:'not JSON'});a.invalidate();a.pump(cx);await drain();
assert.equal(a.entries.get(key(5)).error.message,'Could not read pull requests: invalid GitHub response');assert.equal(a.counts().closed,3);
failures.clear();
// Same PR number in a different repository retains independent facts and identity.
context.links.push({url:url(5,'example/other'),task:'other',terminal:'other-worker',historical:false});facts.set(key(5,'example/other'),{number:5,url:url(5,'example/other'),state:'CLOSED',closedAt:iso(now-10*DAY)});
a.sync(cx);await drain();assert.equal(a.counts().closed,4);assert.ok(a.rows('closed').some(p=>p.key==='example/other#5'));
// mergedAt wins over closedAt; exact boundary, invalid, missing and future exclude
// historical Closed rows, but a live-source old Closed row stays eligible.
for(const date of [iso(now-DAY),iso(now-DAY-1),undefined,'invalid',iso(now+1)]){
 for(const n of [5,6,7]){const f=facts.get(key(n));f.mergedAt=date;f.closedAt=date;}
 a.invalidate();a.pump(cx);await drain();assert.equal(a.counts().closed,1);
}
for(const n of [5,6,7]){const f=facts.get(key(n));f.mergedAt=iso(now-1000);f.closedAt=iso(now-2*DAY);}
a.invalidate();a.pump(cx);await drain();assert.equal(a.counts().closed,4);
const beforeHide=calls.length;shown=false;a.invalidate();a.pump(cx);await drain();assert.equal(calls.length,beforeHide);
shown=true;context.links=context.links.filter(l=>l.url===url(8));
const callbackFailure=new AggregatePulls({shown:()=>shown,onUpdate(){throw Error('presentation callback failed');}});callbackFailure.sync(cx);
await assert.rejects(drain,/presentation callback failed/);assert.equal(callbackFailure.entries.get(key(8)).error,null,'Presentation callback exceptions cannot invent PR read failures');assert.equal(callbackFailure.busy,false);
console.log('PASS targeted one-live/three-merged reads, last-good facts, identity/history bounds, spawn/NTSTATUS/timeout/access versus connectivity classification');
