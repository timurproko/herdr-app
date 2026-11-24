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
])assert.equal(f.rateRefusal(result),true);
for(const result of [
 {code:1,stderr:'HTTP 403: Resource not accessible by integration'},
 {code:1,stderr:'HTTP 401: bad credentials'},
 {code:1,stderr:'Could not resolve host: api.github.com'},
 {code:1,timed_out:true,stderr:'API rate limit exceeded'},
 {code:1,stderr:'execution timed out; check API rate limits'},
 {code:-1073741502,stderr:'API rate limit exceeded'},
 {code:0,stdout:'malformed rate limit response'},
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
console.log('PASS quiet primary/secondary/GraphQL/worker refusals, strict actionable exceptions, shared admission, Retry-After, manual bypass, episode logs and retained/cold panel presentation');
