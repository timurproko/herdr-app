import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {rowHarness,words,element} from './support/git-row.mjs';
const f=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:'export * from "./pulls.js";'});
for(const result of [
 {code:1,stderr:'GraphQL: API rate limit already exceeded for user ID 123'},
 {code:1,stderr:'You have exceeded a secondary rate limit'},
 {code:1,stdout:'HTTP/2.0 429 Too Many Requests\r\nRetry-After: 1200\r\n\r\n{}'},
 {code:0,stdout:JSON.stringify({errors:[{type:'RATE_LIMITED',message:'API rate limit exceeded'}]})},
 {code:1,stdout:JSON.stringify({rateLimited:true,retryAfter:1800000})},
 {code:1,stdout:'HTTP/2.0 403 Forbidden\r\nX-RateLimit-Remaining: 3300\r\n\r\n{"message":"You have exceeded a secondary rate limit"}' },
])assert.equal(f.rateRefusal(result),true);
for(const result of [
 {code:1,stderr:'HTTP 403: Resource not accessible by integration'},
 {code:1,stderr:'HTTP 401: bad credentials'},
 {code:1,stdout:'HTTP/2.0 401 Unauthorized\r\n\r\n{"message":"API rate limit exceeded"}'},

 {code:1,stderr:'Could not resolve host: api.github.com'},
 {code:1,timed_out:true,stderr:'API rate limit exceeded'},
 {code:1,stderr:'execution timed out; check API rate limits'},
 {code:-1073741502,stderr:'API rate limit exceeded'},
 {code:0,stdout:'malformed rate limit response'},
 {code:0,stdout:'{"message":"rate limit exceeded"}'},
 {code:1,stderr:'GraphQL: Cannot query field rateLimit on type Query'},
 {code:'ENOTFOUND',message:'DNS lookup failed; check API rate limits'},
 {code:'EAGAIN',message:'Failed to spawn gh; check API rate limits'},
 new SyntaxError('Invalid JSON near API rate limit text'),
 {code:1,stdout:'HTTP/2.0 401 Unauthorized\r\nX-RateLimit-Remaining: 3300\r\n\r\n{"message":"Bad credentials"}' },
])assert.equal(f.rateRefusal(result),false,JSON.stringify(result));
let now=0,calls=0;const logs=[],reads=new f.GitReads({now:()=>now,log:line=>logs.push(line)});
const refused=()=>{calls++;return {code:1,stderr:'secondary rate limit',headers:{'retry-after':'1200'}};};
await assert.rejects(reads.read('a','owner/a',{},refused),e=>e.quiet&&e.retryAt===1200000);
await assert.rejects(reads.read('b','owner/b',{},refused),e=>e.quiet);
assert.equal(calls,1,'A refusal stops account fan-out into another repository');assert.equal(logs.length,1);
await assert.rejects(reads.read('a','owner/a',{manual:{remaining:1}},refused),e=>e.quiet);
assert.equal(calls,2);assert.equal(logs.length,1,'Manual refusals are the same episode');
now=1200001;await reads.read('a','owner/a',{},()=>({code:0,stdout:'{}'}));
await assert.rejects(reads.read('a','owner/a',{},refused));assert.equal(logs.length,2,'Successful recovery ends an episode');
await reads.read('a','owner/a',{on:'peer'},()=>({code:0}));
let resolve;const shared=new f.GitReads();const run=()=>{calls++;return new Promise(r=>resolve=r);};
const start=calls,a=shared.read('same','owner/repo',{},run),b=shared.read('same','OWNER/REPO',{},run);
assert.equal(calls-start,1);resolve({code:0});await Promise.all([a,b]);
const racing=new f.GitReads({now:()=>now,log(){}});let finish;
const older=racing.read('old','owner/a',{},()=>new Promise(resolve=>finish=resolve));
await assert.rejects(racing.read('refused','owner/b',{},refused));finish({code:0});await older;
await assert.rejects(racing.read('next','owner/a',{},()=>assert.fail('Older success must not bypass newer cooldown')),e=>e.quiet);
const credits=new f.GitReads({now:()=>now,log(){}}),ticket={remaining:1};
await credits.read('healthy','owner/repo',{manual:ticket},()=>({code:0}));assert.equal(ticket.remaining,0);
await assert.rejects(credits.read('rate','owner/repo',{},refused));
await assert.rejects(credits.read('automatic','owner/repo',{manual:ticket},()=>assert.fail('A healthy manual click cannot become a later automatic bypass')),e=>e.quiet);
const rejected=new f.GitReads({now:()=>now,log(){}});
await assert.rejects(rejected.read('throw','owner/repo',{},async()=>{throw Error('GraphQL: API rate limit exceeded');}),e=>e.quiet&&e.kind==='rate');
const malformed=new f.GitReads({log(){}});
await assert.rejects(malformed.read('syntax','owner/repo',{},async()=>{throw new SyntaxError('Invalid JSON near API rate limit');}),e=>e.name==='SyntaxError'&&!e.quiet);
const serial=new f.GitReads();let finishSerial,serialCalls=0;
const first=serial.read('first','owner/repo',{},()=>{serialCalls++;return new Promise(resolve=>finishSerial=resolve);});
const second=serial.read('different-shape','owner/repo',{},()=>{serialCalls++;return {code:0};});
assert.equal(serialCalls,1,'Different shapes queue behind the repository in-flight read');finishSerial({code:0});await Promise.all([first,second]);assert.equal(serialCalls,2);assert.equal(serial.tails.size,0);
let retired=false;
const heldJob=serial.read('held','owner/repo',{},()=>new Promise(resolve=>finishSerial=resolve));
const retiring=serial.read('joined','owner/repo',{current:()=>!retired},()=>{serialCalls++;return {code:0};});
const subscriber=serial.read('joined','owner/repo',{current:()=>true},()=>assert.fail('Compatible read must be shared'));
retired=true;finishSerial({code:0});await Promise.all([heldJob,retiring,subscriber]);assert.equal(serialCalls,3,'A retired queued subscriber cannot cancel a still-current subscriber');
let eligible=true;
const third=serial.read('third','owner/repo',{},()=>new Promise(resolve=>finishSerial=resolve));
const cancelled=serial.read('cancelled','owner/repo',{current:()=>eligible},()=>assert.fail('Queued obsolete work cannot dispatch'));
eligible=false;serial.retireObsolete();const afterRetirement=serial.read('after-retirement','owner/repo',{},()=>{serialCalls++;return {code:0};});assert.equal(serialCalls,3,'Retiring an obsolete queued tail still waits behind its live predecessor');finishSerial({code:0});await third;await assert.rejects(cancelled,e=>e.quiet);await afterRetirement;assert.equal(serial.tails.size,0);
// Native task abandonment may strand an inner promise. Only all-obsolete
// leases may be detached; neither live consumers nor rate/fact state is erased.
{
 const leases=new f.GitReads();let owner=true,peer=true,releaseOld,releaseNew,runs=0;
 const old=leases.read('page','owner/repo',{current:()=>owner},()=>{runs++;return new Promise(resolve=>releaseOld=resolve);});
 const joined=leases.read('page','owner/repo',{current:()=>peer},()=>assert.fail('Healthy subscriber shares work'));
 const job=[...leases.pending.values()][0];leases.lists.set('list',job);leases.targets.set('target',job);leases.facts.set('fact',42);leases.versions.set('version',7);
 owner=false;leases.retireObsolete();assert.equal(leases.pending.size,1,'A healthy subscriber prevents retirement');
 peer=false;leases.state({}).until=123;leases.retireObsolete();for(const map of [leases.pending,leases.tails,leases.lists,leases.targets])assert.equal(map.size,0);
 assert.equal(leases.state({}).until,123);assert.equal(leases.facts.get('fact'),42);assert.equal(leases.versions.get('version'),7);leases.state({}).until=0;
 const replacement=leases.read('page','owner/repo',{current:()=>true},()=>{runs++;return new Promise(resolve=>releaseNew=resolve);});assert.equal(runs,2,'Replacement does not wait on the abandoned repository tail');
 releaseOld({code:0});await Promise.all([old,joined]);assert.equal(leases.pending.size,1,'Late obsolete cleanup cannot erase its replacement');
 releaseNew({code:0});await replacement;assert.equal(leases.pending.size,0);
}
const tick=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
for(const initial of [true,false]) {
 const h=await rowHarness({host:{exec:async()=>({code:1,stderr:'GraphQL: API rate limit already exceeded for user ID 123'})},modules:{'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)}}});
 const {panel,cx}=h;cx.timer={after(){}};panel.aggregate=null;
 if(!initial){panel.pulls.open=[h.facts.pullRow({number:1,title:'Retained',state:'OPEN',url:'https://github.com/owner/repo/pull/1',statusCheckRollup:[]})];panel.counts={open:5,closed:30};}
 const previous=panel.pulls.open;panel.loadPulls('open',cx,true);await tick();
 assert.equal(panel.pullError,null);assert.equal(panel.pulls.open,previous);assert.equal(panel.pullLoading,false);
 const text=words(panel.renderPulls({})).join(' ');
 assert.ok(!/rate limit|Could not read|No open/.test(text));
 if(initial)assert.match(text,/Loading/);else assert.deepEqual(panel.counts,{open:5,closed:30});
 assert.ok(panel.readWake,'Cold refusal retains retry demand without known rows');
}
// Compatibility count read can itself be refused after a successful list.
// It must keep a retry, and a missing total must not use loaded page length.
for(const warm of [false,true]) {
 let clock=2000000,reads=0;const wakeups=[];
 const h=await rowHarness({globals:{Date:class extends Date{static now(){return clock;}}},host:{exec:async()=>{
   reads++;
   if(reads===2)return {code:1,stderr:'secondary rate limit'};
   const repository={pullRequests:{nodes:[],pageInfo:{hasNextPage:false,endCursor:null}},...(reads>2?{open:{totalCount:12},closed:{totalCount:7}}:{})};
   return {code:0,stdout:JSON.stringify({data:{repository}})};
 }}});
 const {panel}=h;panel.aggregate=null;panel.loadRelatedPull=()=>{};panel.syncAggregate=()=>false;panel.syncAgent=()=>{};panel.syncWebhooks=()=>{};panel.syncChecksFallback=()=>{};panel.notices={sync(){}};panel.agentLinks.refresh=()=>{};
 if(warm)panel.counts={open:12,closed:7};
 const cx={...h.cx,spawn:fn=>fn(cx),timer:{after(ms,fn){wakeups.push({at:clock+ms,fn});}}};
 panel.loadPulls('open',cx,true);await tick();assert.equal(reads,2);assert.ok(panel.readWake,'Quiet fallback count failure must retain cooldown recovery');
 assert.equal(panel.pullError,null);
 let tree=h.render(()=>panel.render(cx));
 for(const tab of ['open','closed']) {
   const badge=(await import('./support/git-row.mjs')).find(tree,`git-view-${tab}-count`);
   assert.equal(words(badge).join(''),warm?(tab==='open'?'12':'7'):'0');
   if(!warm)assert.match(badge.attrs.tooltip[0],/Count loading/);
 }
 const wake=wakeups.find(w=>w.at===panel.readWake.due);clock=wake.at;wake.fn(cx);await tick();
 assert.deepEqual({...panel.counts},{open:12,closed:7});assert.equal(panel.pullError,null);
}
console.log('PASS quiet primary/secondary/GraphQL/worker refusals, strict actionable exceptions, shared admission, Retry-After, manual bypass, episode logs, ordinary fallback-count recovery and retained/cold panel presentation');
