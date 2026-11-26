import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {githubInvocation} from './support/github-read.mjs';
let oldCurrent=true,newCurrent=true,release,held=true;const calls=[];
const exec=async(command,args,options)=>{
 const call=githubInvocation(command,args,options);args=call.args;const q=args.find(a=>a.startsWith('query=')),detail=q.includes('contexts('),numbers=[...q.matchAll(/pr(\d+):pullRequest/g)].map(m=>+m[1]);calls.push({numbers,detail,on:options.on});
 if(held){held=false;await new Promise(r=>release=r);}
 const repository={};for(const n of numbers)if(n>2)repository[`pr${n}`]={number:n,url:`https://github.com/owner/repo/pull/${n}`,title:'Retained',state:'MERGED',isDraft:false,headRefOid:'head',commits:{nodes:[{commit:{statusCheckRollup:{state:'SUCCESS',...(detail?{contexts:{nodes:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}],pageInfo:{hasNextPage:false}}}:{})}}}]}};
 const errors=numbers.filter(n=>n<=2).map(n=>({type:n===1?'NOT_FOUND':'FORBIDDEN',path:['repository',`pr${n}`],message:n===1?'Could not resolve to a PullRequest with the number of 1.':'Resource not accessible by integration'}));
 // gh api graphql exits 1 for scoped errors, even with valid sibling data.
 return {code:errors.length?1:0,stderr:errors.map(error=>`gh: ${error.message}`).join('\n'),stdout:JSON.stringify({data:{repository},...(errors.length?{errors}:{})})};
};
const f=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:'export * from "./pulls.js";'});
const old=f.readTargetPulls(exec,[1,2,3],'owner/repo',{current:()=>oldCurrent}),next=f.readTargetPulls(exec,[3],'owner/repo',{current:()=>newCurrent});
oldCurrent=false;release();const [a,b]=await Promise.all([old,next]);
assert.equal(calls.length,2,'One metadata command and one changed-detail command shared by overlapping subscribers');
assert.equal(a.get(1).error.stderr,'Could not resolve to a PullRequest with the number of 1.');
assert.equal(f.pullFailure(a.get(2).error).kind,'access');assert.equal(b.get(3).row.checks.label,'1/1');
const cached=await f.readTargetPulls(exec,[3],'owner/repo');assert.equal(cached.get(3).row,b.get(3).row);assert.equal(calls.length,2,'Final facts survive consumer recreation');
f.rememberPull(exec,'owner/repo',{...b.get(3).row,key:'owner/repo#3',repo:'owner/repo'});
const ordinary=(await f.readTargetPulls(exec,[3],'owner/repo')).get(3).row;
assert.equal(ordinary.key,undefined);assert.equal(ordinary.repo,undefined,'Coordinator projection cannot change ordinary row/pin element IDs');
await f.readTargetPulls(exec,[3],'owner/repo',{on:'peer'});assert.equal(calls.length,4,'Another machine cannot inherit cached facts');
assert.ok(calls.every(c=>c.numbers.length<=20));
assert.throws(()=>f.targetPullArgs(Array.from({length:21},(_,i)=>i+1),'owner/repo'),/Invalid targeted batch/);
let unblock;const selectionCalls=[];
const metadata=n=>({number:n,url:`https://github.com/owner/repo/pull/${n}`,state:'OPEN',isDraft:false,headRefOid:'new',commits:{nodes:[{commit:{statusCheckRollup:null}}]}});
const selectionExec=async(command,args,options)=>{
 const call=githubInvocation(command,args,options),query=call.args.find(a=>a.startsWith('query='));selectionCalls.push(query);
 if(query.includes('pullRequests(first:')) {await new Promise(resolve=>unblock=resolve);return {code:0,stdout:JSON.stringify({data:{repository:{pullRequests:{nodes:[metadata(3)],pageInfo:{hasNextPage:false,endCursor:null}}}}})};}
 return {code:0,stdout:JSON.stringify({data:{repository:{pr908:metadata(908)}}})};
};
f.rememberPull(selectionExec,'owner/repo',f.pullRow({number:908,state:'OPEN',headRefOid:'old',statusCheckRollup:[]}));
const page=f.readPullPage(selectionExec,'open','owner/repo'),older=f.readTargetPulls(selectionExec,[908],'owner/repo');unblock();await page;
assert.equal((await older).get(908).row.headRefOid,'new');assert.equal(selectionCalls.length,2,'An in-flight first page cannot satisfy an older Open PR it did not contain');
const date=Date.UTC(2026,0,1),final=f.pullRow({number:9,state:'MERGED',mergedAt:new Date(date).toISOString(),labels:[{name:'kept',color:'abcdef'}],statusCheckRollup:[]},'owner',date+1000);
const aged=f.retimePull(final,date+3600000);assert.equal(aged.when,'merged 1 hour ago');assert.equal(aged.checks,final.checks);assert.equal(aged.labels,final.labels);assert.equal(f.retimePull(aged,date+3600000),aged,'Local aging does not reread facts or churn an unchanged row');
const partial={data:{repository:{pr1:null,pr2:metadata(2)}},errors:[{type:'NOT_FOUND',path:['repository','pr1'],message:'Could not resolve to a PullRequest with the number of 1.'}]};
const cliResult={code:1,stdout:`HTTP/2.0 200 OK\r\n\r\n${JSON.stringify(partial)}`,stderr:'gh: Could not resolve to a PullRequest with the number of 1.'};
const realStatus=await f.readTargetPulls(async()=>cliResult,[1,2],'owner/repo');
assert.equal(realStatus.get(1).error.code,1);assert.equal(f.pullFailure(realStatus.get(1).error).kind,'notfound');
assert.equal(realStatus.get(2).row.number,2,'A missing alias with real CLI exit 1 cannot erase a healthy sibling');
for(const result of [
 {...cliResult,code:-1073741502},
 {...cliResult,signal:'SIGTERM'},
 {...cliResult,timed_out:true},
 {...cliResult,timedOut:true},
 {...cliResult,stderr:'Could not resolve host: api.github.com'},
 {...cliResult,stderr:'connection refused'},
 {...cliResult,stderr:'command timed out'},
 {...cliResult,stdout:`HTTP/2.0 403 Forbidden\r\n\r\n${JSON.stringify(partial)}`},
 {...cliResult,stdout:'malformed JSON'},
 {...cliResult,stdout:JSON.stringify({...partial,errors:[{message:'Repository unavailable',path:['repository']}]})},
])await assert.rejects(f.readTargetPulls(async()=>result,[1,2],'owner/repo'),undefined,'Transport, process, malformed and unscoped failures remain whole-batch failures');
const limited={...partial,errors:[{type:'RATE_LIMITED',path:['repository','pr1'],message:'API rate limit exceeded'}]};
await assert.rejects(f.readTargetPulls(async()=>({code:1,stdout:JSON.stringify(limited)}),[1,2],'owner/repo'),error=>error.quiet&&error.kind==='rate','A rate refusal still defers the complete batch');
for(const bad of [{...metadata(1),number:99},{...metadata(1),url:42},{...metadata(1),state:{}},{...metadata(1),title:{unrecognized:true}}]) {
 const isolated=await f.readTargetPulls(async()=>({code:0,stdout:JSON.stringify({data:{repository:{pr1:bad,pr2:metadata(2)}}})}),[1,2],'owner/repo');
 assert.ok(isolated.get(1).error,'Bad alias is refused, never cached as facts');
 assert.equal(isolated.get(2).row.number,2,'A healthy sibling survives invalid identity and normalization');
}
console.log('PASS shared target facts, per-alias access/absence/identity/shape isolation, whole-batch rate/transport handling, changed-only details, final cache and machine isolation');
