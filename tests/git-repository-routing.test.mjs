// Execute the actual per-child env worker with fake process IO and gh, never credentials/network.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import {loadMod} from '../tools/plugin-harness.mjs';
const {repositoryRead,repositoryFailure,GH_REPOSITORY_ENV,pullListArgs,countArgs}=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:'export * from "./pulls.js";'});
for(const ambient of [{},{GH_REPO:''},{GH_REPO:'unrelated/work',GH_HOST:'github.com'},{GH_TOKEN:'fixture-token',GITHUB_TOKEN:'fixture-other',GH_REPO:'wrong/repo'}]){
 const before=JSON.stringify(ambient),calls=[];
 const exec=async(command,args,options)=>{
  calls.push({command,args,options});assert.equal(command,'node');assert.equal(args[0],'-e');assert.equal(args[1],GH_REPOSITORY_ENV);
  let out='',err='',exit=null;
  vm.runInNewContext(args[1],{require:name=>{assert.equal(name,'node:child_process');return {spawnSync:(program,argv,child)=>{
   assert.equal(program,'gh');assert.deepEqual(Array.from(argv),JSON.parse(args[3]));assert.equal(child.env.GH_REPO,args[2]);
   for(const key of ['GH_TOKEN','GITHUB_TOKEN','GH_HOST'])assert.equal(child.env[key],ambient[key],'Explicit credential/host passes through unchanged');
   assert.equal(child.windowsHide,true);assert.ok(child.timeout<options.timeout);assert.equal(child.maxBuffer,8*1024*1024);
   return {status:0,stdout:argv[1]==='user'?'fixture-account':'{"data":{}}',stderr:''};
  }};},process:{argv:['node',...args.slice(2)],env:ambient,stdout:{write:v=>out+=v},stderr:{write:v=>err+=v},set exitCode(value){exit=value;}}});
  return {code:exit,stdout:out,stderr:err};
 };
 for(const repo of ['owner/crew','work/other'])for(const args of [pullListArgs('closed',repo),countArgs(repo),['api',`repos/${repo}/actions/runs`]]){
  const options={cwd:'/unrelated-worktree',on:'pc2',timeout:30000};await repositoryRead(exec,args,repo,options);
  assert.equal(calls.at(-1).args[2],repo);assert.equal(calls.at(-1).options,options,'Machine/cwd/outer timeout unchanged');
 }
 const refused=await repositoryFailure(exec,{code:1,stderr:'HTTP 403: Resource not accessible by integration'},'owner/crew',{on:'pc2'});
 assert.equal(refused.account,'fixture-account');assert.match(refused.message,/owner\/crew not accessible with the GitHub account fixture-account/);
 assert.equal(JSON.stringify(ambient),before,'No process-global environment writes');assert.ok(!JSON.stringify(calls).includes('fixture-token'),'Tokens never become argv or transport options');
}
for(const invalid of ['',null,'owner','../repo','owner/..','owner/repo\n'])assert.throws(()=>repositoryRead(()=>{throw Error('must not spawn');},['api','graphql'],invalid),/Invalid GitHub repository/);
const direct=[];await repositoryRead((...args)=>direct.push(args),['pr','view','7','--repo','owner/crew'],'owner/crew',{on:'pc2'});
assert.equal(direct[0][0],'gh');assert.deepEqual(direct[0][1],['pr','view','7','--repo','owner/crew']);
let requests=0;
const transient=await repositoryFailure(()=>{requests++;},{code:3221225794,stderr:''},'owner/crew');assert.equal(transient.kind,'transient');assert.equal(requests,0,'No identity read for local failures');
for(const result of [{code:1,stdout:'private diagnostic text'},{code:0,stdout:'not a valid login\nsecret'},{code:0,stdout:'fixture',timed_out:true}]){
 const f=await repositoryFailure(async()=>result,{code:1,stderr:'HTTP 403: Resource not accessible by integration'},'owner/crew');assert.equal(f.account,null);assert.match(f.message,/GitHub account \(unknown\)/);assert.ok(!f.message.includes('secret'));
}
// A slow identity diagnosis cannot publish or start follow-ups after context replacement.
for(const stderr of ['HTTP 404: Not Found','GraphQL: Could not resolve to a PullRequest with the number of 36.','GraphQL: Could not resolve to a Repository with the name owner/crew']){
 const f=await repositoryFailure(()=>{throw Error('Not-found must never diagnose an account');},{code:1,stderr},'owner/crew');
 assert.equal(f.kind,'notfound');assert.equal(f.message,'owner/crew not found');assert.equal(f.account,undefined);
}
let release,visible=true,holdIdentity=true,identityReads=0,refusal='HTTP 403: Resource not accessible by integration';
const binding={scope:'home',links:[{url:'https://github.com/owner/crew/pull/36',historical:true}]},jobs=[];
const {AggregatePulls}=await loadMod({host:{exec:async(command)=>{if(command==='gh')return {code:1,stderr:refusal};identityReads++;return holdIdentity?new Promise(resolve=>release=resolve):{code:0,stdout:'fixture-account'};},run(){}},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>binding,pluginEvent(){}},'location.js':{location:()=>({space:'coordinator'})}},entry:'export {AggregatePulls} from "./aggregate.js";'});
const cx={notify(){},spawn(fn){jobs.push(fn(cx));}},aggregate=new AggregatePulls({shown:()=>visible});aggregate.sync(cx);
for(let i=0;i<20&&!release;i++)await Promise.resolve();assert.equal(typeof release,'function');
const old=aggregate.entries.get('owner/crew#36');binding.scope='replacement';visible=false;
release({code:0,stdout:'fixture-account'});await Promise.all(jobs);assert.equal(old.error,null);assert.equal(aggregate.busy,false);
// Twelve refused PRs across two repositories share two identity children, not
// twelve. The next refresh must not reuse the preceding refresh's account.
visible=true;holdIdentity=false;binding.scope='cohort';binding.links=Array.from({length:12},(_,i)=>({url:`https://github.com/owner/${i<6?'crew':'other'}/pull/${i%6+1}`,historical:true}));
const cohort=new AggregatePulls({shown:()=>visible}),baseline=identityReads;
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};cohort.sync(cx);await drain();
assert.equal(identityReads-baseline,2);assert.equal(cohort.diagnostics.size,0,'Cohort cache is discarded after refresh');
assert.match(cohort.readNotice('owner/crew','closed'),/not accessible with the GitHub account fixture-account/);
cohort.refresh(cx);await drain();assert.equal(identityReads-baseline,4,'Refresh re-verifies each repository account');
refusal='HTTP 404: Not Found';cohort.refresh(cx);await drain();assert.equal(identityReads-baseline,4,'Two-repo not-found refresh starts zero identity children');
assert.equal(cohort.readNotice('owner/crew','closed'),'Task PR history: owner/crew #1, #2, #3, #4, #5, #6 not found');
console.log('PASS per-call GH_REPO for API/GraphQL, empty/wrong ambient context, remote/cwd preservation, explicit tokens untouched, effective login/unknown refusals and no account switching');
