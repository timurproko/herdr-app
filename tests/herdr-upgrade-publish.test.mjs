import assert from 'node:assert/strict';
import fs from 'node:fs';
import {reviewInventory,gitBlob,releaseIdentity} from '../tools/herdr-upgrade-releases.mjs';
import {migrationBranch,migrationFiles,SKIP_LABEL} from '../tools/herdr-upgrade-report.mjs';
import {TARGET_REPOSITORY,pages,frozenUntil,verifyActivation,validateBundle,validateGeneratedFiles,planProposals,publishMigration,publicationGate,githubApi,boundedComment} from '../tools/publish-herdr-upgrade.mjs';
const base='a'.repeat(40),probeSha='b'.repeat(40),treeSha='c'.repeat(40),commit='d'.repeat(40);
const inventory=reviewInventory(process.cwd());
function bundle(versions={app:'0.1.17'}) {
  return {schema:'herdr-upgrade-bundle-v1',mode:'evaluate',identity:releaseIdentity(versions),baseSha:base,headSha:base,report:{schema:'herdr-migration-v1',worktreeDirty:false,generatedAt:'2026-11-23T12:00:00Z',baseSha:base,headSha:base,inventory,discovery:{candidates:versions,errors:{},releases:{app:{version:versions.app??'0.1.16',commit:base,feedSha256:'e'.repeat(64)},core:{version:versions.core??'0.1.22',commit:inventory.coreSource.commit,feedSha256:'f'.repeat(64)}}},checks:{},steps:[{name:'reachability',status:'passed',detail:'reachable',operation:'GET',requires:[],evidence:'logs/reachability.txt'}],actions:[],evidence:{'logs/reachability.txt':'source only, no writes'}}};
}
function pr(number,versions,{state='open',skipped=false,merged=false}={}){return {number,state,merged_at:merged?'date':null,html_url:`https://github.com/${TARGET_REPOSITORY}/pull/${number}`,base:{ref:'main'},head:{ref:migrationBranch(releaseIdentity(versions)),sha:base,repo:{full_name:TARGET_REPOSITORY}},labels:skipped?[{name:SKIP_LABEL}]:[],versions};}
function server(initial=[]) {
  const state={prs:structuredClone(initial),refs:{main:base},comments:{},calls:[],label:null,stale:false,oldProbe:false,sourceChanged:false,trees:{},commits:{},blobs:{}};
  const baseTree=[{path:'README.md',mode:'100644',type:'blob',sha:'e'.repeat(40)},{path:'.github/workflows/herdr-upstream-sync.yml',mode:'100644',type:'blob',sha:'f'.repeat(40)}];
  state.trees[base]=baseTree;state.trees[probeSha]=baseTree;state.commits[base]={sha:base,tree:{sha:treeSha},parents:[]};
  const missing=()=>{const e=Error('not found');e.status=404;throw e;};
  const api=async(method,url,body)=>{
    state.calls.push({method,url,body});const pathname=url.split('?')[0];
    if(method==='GET'){
      if(url==='')return {full_name:TARGET_REPOSITORY,default_branch:'main'};
      if(url==='actions/runs/12')return {repository:{full_name:TARGET_REPOSITORY},path:'.github/workflows/herdr-upstream-sync.yml',head_branch:'main',head_sha:probeSha,event:'workflow_dispatch',status:'completed',conclusion:'success'};
      if(pathname==='actions/runs/12/jobs')return {jobs:[{name:state.oldProbe?'Migration evaluation':'Hosted no-write probe',conclusion:'success',steps:[{name:'Record successful no-write probe',conclusion:'success'}]}]};
      if(pathname.startsWith('git/trees/')) {const sha=pathname.split('/').at(-1),tree=state.trees[sha]??missing();return {truncated:false,tree:state.sourceChanged&&sha===probeSha?tree.map(e=>({...e,sha:'9'.repeat(40)})):tree};}
      if(pathname.startsWith('git/commits/'))return state.commits[pathname.split('/').at(-1)]??missing();
      if(pathname.startsWith('git/ref/heads/')){const name=decodeURIComponent(pathname.slice('git/ref/heads/'.length));const sha=state.stale&&name==='main'?probeSha:state.refs[name];return sha?{object:{sha}}:missing();}
      if(pathname==='pulls')return structuredClone(state.prs);
      if(pathname.startsWith('labels/'))return state.label??missing();
      if(/^issues\/\d+\/comments$/.test(pathname))return state.comments[pathname.split('/')[1]]??[];
    }
    if(method==='POST'){
      if(url==='labels'){state.label=body;return body;}
      if(url==='git/blobs'){const sha=gitBlob(Buffer.from(body.content,'base64'));state.blobs[sha]=body;return {sha};}
      if(url==='git/trees'){state.trees[treeSha]=[...baseTree,...body.tree];return {sha:treeSha};}
      if(url==='git/commits'){state.commits[commit]={sha:commit,...body,tree:{sha:body.tree},parents:body.parents.map(sha=>({sha}))};state.trees[commit]=state.trees[body.tree];return {sha:commit};}
      if(url==='git/refs'){const name=body.ref.slice('refs/heads/'.length);assert.equal(state.refs[name],undefined);state.refs[name]=body.sha;return {};}
      if(url==='pulls'){const created=pr(state.prs.length+1,Object.fromEntries(Object.entries(bundle().report.discovery.candidates)));created.head.ref=body.head;created.isDraft=body.draft;created.title=body.title;created.body=body.body;created.versions=undefined;state.prs.push(created);return created;}
      if(/^issues\/\d+\/comments$/.test(url)){const number=url.split('/')[1];(state.comments[number]??=[]).push(body);return {};}
    }
    if(method==='PATCH'&&/^pulls\/\d+$/.test(url)){const target=state.prs.find(p=>p.number===Number(url.split('/')[1]));assert.deepEqual(body,{state:'open'});target.state='open';return target;}
    throw Error(`Unexpected fake GitHub operation: ${method} ${url}`);
  };
  return {api,state};
}
const options=api=>({api,enabled:'true',probeRunId:'12'});
const writes=state=>state.calls.filter(c=>c.method!=='GET');
assert.equal(frozenUntil('2026-12-01','schedule',Date.parse('2026-11-01')),true);
assert.equal(frozenUntil('2026-12-01T00:00:00Z','schedule',Date.parse('2026-11-01')),true);
assert.equal(frozenUntil('2026-12-01','workflow_dispatch',Date.parse('2026-11-01')),false);
assert.throws(()=>frozenUntil('2026-02-30'),/Invalid/);assert.throws(()=>frozenUntil('tomorrow'),/Malformed/);
{
  const {api,state}=server();await verifyActivation(api,{...options(api),baseSha:base,defaultBranch:'main'});
  state.oldProbe=true;await assert.rejects(verifyActivation(api,{...options(api),baseSha:base,defaultBranch:'main'}),/no-write probe/);
  state.oldProbe=false;state.sourceChanged=true;await assert.rejects(verifyActivation(api,{...options(api),baseSha:base,defaultBranch:'main'}),/predates/);assert.equal(writes(state).length,0);
}
{
  const {api,state}=server();const b=bundle();b.mode='probe';assert.equal((await publishMigration(b,options(api))).status,'no-write-probe');assert.equal(state.calls.length,0);
  await assert.rejects(publishMigration(bundle(),{api,enabled:'false'}),/disabled/);assert.equal(writes(state).length,0);
  assert.equal((await publicationGate({api,env:{EVENT_NAME:'schedule',MODE:'publish'}})).publish,false);
  await assert.rejects(publicationGate({api,env:{EVENT_NAME:'workflow_dispatch',MODE:'publish'}}),/disabled/);
}
{
  const {api,state}=server();const result=await publishMigration(bundle(),options(api));assert.equal(result.proposals.length,1);assert.equal(state.prs.length,1);assert.equal(state.prs[0].isDraft,true);
  assert.equal(state.label.name,'\u{1F916} Skip');assert.equal(state.label.color,'6e7781');assert.match(state.label.description,/Closing.*skips that version/);
  assert.ok(writes(state).every(c=>!c.url.includes('MyWorkflows')));
  const branchSha=state.refs['chore/herdr-app-0.1.17'];state.prs[0].body='human checklist';state.refs['chore/herdr-app-0.1.17']='9'.repeat(40);
  await publishMigration(bundle(),options(api));assert.equal(state.prs.length,1);assert.equal(state.prs[0].body,'human checklist');assert.equal(state.refs['chore/herdr-app-0.1.17'],'9'.repeat(40));
  assert.equal(state.calls.filter(c=>c.method==='POST'&&c.url==='git/refs').length,1);assert.equal(state.comments[1].length,2); // initial and one fresh evaluation marker
  await publishMigration(bundle(),options(api));assert.equal(state.comments[1].length,2);assert.ok(branchSha);
}
{
  const closed=pr(1,{app:'0.1.17'},{state:'closed',skipped:true}),{api,state}=server([closed]);
  const result=await publishMigration(bundle(),options(api));assert.equal(result.reused[0].action,'skipped');assert.equal(state.prs.length,1);assert.equal(writes(state).filter(c=>c.url==='pulls').length,0);
  await assert.rejects(publishMigration(bundle(),{...options(api),manual:true,event:'workflow_dispatch'}),/Restore branch/);
  state.refs[closed.head.ref]=base;await publishMigration(bundle(),{...options(api),manual:true,event:'workflow_dispatch'});assert.equal(state.prs[0].state,'open');assert.equal(state.prs.length,1);
}
{
  const older=pr(1,{app:'0.1.16'}),{api,state}=server([older]);await publishMigration(bundle(),options(api));
  assert.match(state.comments[1][0].body,/supersedes/);assert.equal(state.prs[0].state,'open');assert.equal(state.calls.filter(c=>c.method==='PATCH').length,0);
}
for(const failingEndpoint of ['issues/2/comments','issues/1/comments']) {
  const older=pr(1,{app:'0.1.16'}),{api,state}=server([older]);let fail=true;
  const flaky=async(method,url,body)=>{if(method==='POST'&&url===failingEndpoint&&fail){fail=false;throw Error('transient comment failure');}return api(method,url,body);};
  await assert.rejects(publishMigration(bundle(),options(flaky)),/transient comment failure/);assert.equal(state.prs.length,2);
  await publishMigration(bundle(),options(api));
  const notices=()=>state.comments[1].filter(c=>c.body.includes('herdr-superseded:app-0.1.17'));
  assert.equal(notices().length,1);assert.match(notices()[0].body,/pull\/2/);
  await publishMigration(bundle(),options(api));assert.equal(notices().length,1);assert.equal(state.prs.length,2);
  assert.equal(state.calls.filter(c=>c.method==='POST'&&c.url==='git/refs').length,1);assert.equal(state.prs[0].state,'open');
}
{
  const {api,state}=server([pr(1,{core:'0.1.23'})]);let fail=true;
  const flaky=async(method,url,body)=>{if(method==='POST'&&url==='issues/1/comments'&&fail){fail=false;throw Error('cross-link temporarily unavailable');}return api(method,url,body);};
  await assert.rejects(publishMigration(bundle(),options(flaky)),/temporarily unavailable/);
  await publishMigration(bundle(),options(api));await publishMigration(bundle(),options(api));
  assert.equal(state.comments[1].filter(c=>c.body.includes('herdr-related:app-0.1.17')).length,1);
  assert.equal(state.comments[2].filter(c=>c.body.includes('herdr-related:core-0.1.23')).length,1);assert.equal(state.prs.length,2);
}
{
  const {api,state}=server();state.stale=true;await assert.rejects(publishMigration(bundle(),options(api)),/advanced/);assert.equal(writes(state).length,0);
}
{
  const {api,state}=server();state.refs['chore/herdr-app-0.1.17']=base;await assert.rejects(publishMigration(bundle(),options(api)),/interrupted initial/);assert.equal(state.prs.length,0);
}
{
  const {api,state}=server();let interrupted=true;const flaky=async(method,url,body)=>{if(method==='POST'&&url==='pulls'&&interrupted){interrupted=false;throw Error('network uncertainty');}return api(method,url,body);};
  await assert.rejects(publishMigration(bundle(),options(flaky)),/uncertainty/);assert.ok(state.refs['chore/herdr-app-0.1.17']);
  await publishMigration(bundle(),options(api));assert.equal(state.prs.length,1);assert.equal(state.calls.filter(c=>c.method==='POST'&&c.url==='git/refs').length,1);
}
{
  const {api,state}=server([pr(1,{app:'0.1.17'})]);const b=bundle();b.mode='refresh';b.headSha=b.report.headSha='9'.repeat(40);
  await assert.rejects(publishMigration(b,{...options(api),refresh:'app-0.1.17'}),/head changed/);assert.equal(writes(state).length,0);
}
const existing=[pr(1,{app:'0.1.17'})];assert.equal(planProposals({app:'0.1.17',core:'0.1.23'},existing).identity,'core-0.1.23');
assert.equal(planProposals({app:'0.1.17'},[pr(1,{app:'0.1.17'},{merged:true})]).reuse[0].action,'merged-metadata-gap');
assert.equal(planProposals({app:'0.1.17'},[pr(1,{app:'0.1.17'},{state:'closed'})]).reuse[0].action,'closed');
{
  const b=bundle();b.report.evidence['../../.github/workflows/x.yml']='malicious';assert.throws(()=>validateBundle(b),/Unsafe/);
  const c=bundle();c.report.evidence['logs/attack.mjs']='process.env';assert.throws(()=>validateBundle(c),/Unsafe/);
  const dirty=bundle();dirty.report.worktreeDirty=true;assert.throws(()=>validateBundle(dirty),/Mismatched/);
  const linked=bundle();linked.report.runUrl='https://evil.example/run';assert.throws(()=>validateBundle(linked),/Untrusted/);
  assert.throws(()=>validateGeneratedFiles({'src/integration/native-patches/palette/original.js':'overwrite'},'app-0.1.17'),/Unsafe/);
  const generated=migrationFiles(bundle().report,'app-0.1.17');assert.equal(validateGeneratedFiles(generated,'app-0.1.17'),generated);
}
{
  let count=0;const entries=await pages(async()=>++count===1?Array.from({length:100},()=>({})):['last'],'pulls?state=all');assert.equal(entries.length,101);assert.equal(count,2);
  await assert.rejects(pages(async()=>({truncated:true}),'pulls'),/Invalid/);
}
{
  const seen=[];const api=githubApi({token:'fake',fetchImpl:async(url,options)=>{seen.push({url,options});return new Response('{}');}});await api('GET','');assert.equal(seen[0].url,'https://api.github.com/repos/timurproko/herdr-app');assert.equal(seen[0].options.redirect,'error');await assert.rejects(api('GET','../MyWorkflows'),/Unsafe/);
}
{
  const {api,state}=server();state.label={name:SKIP_LABEL,color:'aaaaaa',description:'person-owned metadata'};await publishMigration(bundle(),options(api));assert.equal(state.label.color,'aaaaaa');assert.equal(state.calls.filter(c=>c.method==='POST'&&c.url==='labels').length,0);
}
{
  const {api,state}=server();const denied=async(method,url,body)=>{if(method==='POST'&&url==='labels'){const error=Error('label permission denied');error.status=403;throw error;}return api(method,url,body);};await assert.rejects(publishMigration(bundle(),options(denied)),/permission denied/);assert.equal(state.prs.length,0);assert.equal(state.calls.filter(c=>c.url==='git/refs').length,0);
}
const oversizedComment=('native hunk evidence 🤖\n').repeat(10000),comment=boundedComment(oversizedComment);assert.ok(Buffer.byteLength(comment)<55000);assert.match(comment,/complete report, hunks and migration checklist/);assert.equal(boundedComment('short'),'short');
const workflow=fs.readFileSync('.github/workflows/herdr-upstream-sync.yml','utf8');
for(const expected of ['schedule:','workflow_dispatch:','options: [probe, publish]','cancel-in-progress: false','Record successful no-write probe','permission-contents: write','permission-pull-requests: write','persist-credentials: false','secrets.DELIVERY_BOT_PRIVATE_KEY'])assert.ok(workflow.includes(expected),expected);
assert.ok(!workflow.includes('issues: write'));assert.ok(!workflow.includes('actions: write'));assert.ok(!workflow.includes('pull_request_target'));
assert.equal(workflow.match(/secrets\./g).length,1);assert.ok(workflow.indexOf('secrets.DELIVERY_BOT_PRIVATE_KEY')>workflow.indexOf('\n  publish:'));
assert.ok(!workflow.includes('git push'));assert.ok(!workflow.includes('npm ci'));
console.log('PASS fake GitHub: activation proof, local Skip creation, duplicate/skip/supersession controls, orphan recovery, agent branch preservation and writer permissions');
