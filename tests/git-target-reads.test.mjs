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
await f.readTargetPulls(exec,[3],'owner/repo',{on:'peer'});assert.equal(calls.length,4,'Another machine cannot inherit cached facts');
assert.ok(calls.every(c=>c.numbers.length<=20));
assert.throws(()=>f.targetPullArgs(Array.from({length:21},(_,i)=>i+1),'owner/repo'),/Invalid targeted batch/);
console.log('PASS overlapping ordinary/coordinator target facts, stale-subscriber isolation, per-alias access/absence, changed-only details, final cache and machine isolation');
