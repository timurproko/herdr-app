import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {githubInvocation} from './support/github-read.mjs';
let oldCurrent=true,newCurrent=true,release,held=true;const calls=[];
const exec=async(command,args,options)=>{
 const call=githubInvocation(command,args,options);args=call.args;const q=args.find(a=>a.startsWith('query=')),detail=q.includes('contexts('),numbers=[...q.matchAll(/pr(\d+):pullRequest/g)].map(m=>+m[1]);calls.push({numbers,detail,on:options.on});
 if(held){held=false;await new Promise(r=>release=r);}
 const repository={};for(const n of numbers)if(n>2)repository[`pr${n}`]={number:n,url:`https://github.com/owner/repo/pull/${n}`,title:'Retained',state:'MERGED',isDraft:false,headRefOid:'head',commits:{nodes:[{commit:{statusCheckRollup:{state:'SUCCESS',...(detail?{contexts:{nodes:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}],pageInfo:{hasNextPage:false}}}:{})}}}]}};
 const errors=numbers.filter(n=>n<=2).map(n=>({path:['repository',`pr${n}`],message:n===1?'Could not resolve to a PullRequest with the number of 1.':'Resource not accessible by integration'}));
 return {code:0,stdout:JSON.stringify({data:{repository},...(errors.length?{errors}:{})})};
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
console.log('PASS overlapping ordinary/coordinator target facts, stale-subscriber isolation, per-alias access/absence, changed-only details, final cache and machine isolation');
