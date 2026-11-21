// Synthetic Core/GitHub/task transports only. Never installs a real task or sends input.
import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';
import {CoreCIMonitor,projectFolder,memoryOwners,validOwners} from '../src/plugins/git/monitor-engine.js';
import {DiskJournal,acquireLock} from '../src/plugins/git/monitor-runner.js';
import {DEFAULT_CI_MESSAGE,DEFAULT_CONFLICT_MESSAGE,DEFAULT_MERGED_MESSAGE} from '../src/plugins/git/ci-message.js';
import {validateConfig} from '../src/plugins/git/monitor-policy.js';
const require=createRequire(import.meta.url),installer=require('../src/plugins/git/monitor-host.cjs');
const root=fs.mkdtempSync(path.join(os.tmpdir(),'herdr-core-ci-test-')),head='a'.repeat(40),coreId='c'.repeat(32);
let assertions=0;
function fixture(name){
 const dir=path.join(root,name);fs.mkdirSync(dir);
 let config={version:1,enabled:true,states:['idle','done','error'],template:DEFAULT_CI_MESSAGE,repositories:['owner/repo'],coreId,revision:'one',commands:{hc:'/fixture/hc',gh:'/fixture/gh',git:'/fixture/git'}};
 const t={address:'t1',state:'live',created_ms:100,pid:42,cwd:'/repo',status:{state:'idle',app:'a1'},labels:{'custom.ci.pr':'12','custom.ci.repository':'owner/repo'}};
 const pull={number:12,state:'open',head:{sha:head},base:{ref:'main',repo:{full_name:'owner/repo'}}};
 const job={id:123,workflow_id:4,run_attempt:1,head_sha:head,status:'completed',conclusion:'failure',repository:{full_name:'owner/repo'}};
 const calls=[],events=[];let openPrs=[],gitReply=()=>({code:0,stdout:'true\n'}),terminals=[t],runs=[job],afterClaim=null,response={code:0,stdout:JSON.stringify({status:'idle',turn:1,started:true})};
 const disk=new DiskJournal(path.join(dir,'history.json')),journal={claim:async keys=>{const result=await disk.claim(keys);afterClaim?.();return result;},finish:(...args)=>disk.finish(...args)};
 const run=async(command,args)=>{
  calls.push([command,args]);let value;
  if(command.endsWith('/hc')){
   if(args[0]==='server')value={core:{id:coreId}};
   else if(args[0]==='ls')value={terminals:[...terminals.map(t=>({...t,status:t.status.state})),{address:'pc2/t99',state:'live',status:'idle'}]};
   else if(args[0]==='get')value=terminals.find(t=>t.address===args[1]);
   else if(args[0]==='send')return response;
   else if(args[0]==='label'){const x=terminals.find(t=>t.address===args[1]);for(const kv of args.slice(2)){const i=kv.indexOf('=');x.labels={...x.labels,[kv.slice(0,i)]:kv.slice(i+1)};}return {code:0,stdout:''};}
   else throw Error('Unexpected Core operation');
  }else if(command.endsWith('/git'))return gitReply(args);
  else if(args[0]==='repo')value={nameWithOwner:'owner/repo'};
  else if(args[0]==='pr')value=openPrs;
  else if(args[1].includes('/git/ref/heads/'))value={object:{sha:'b'.repeat(40)}};
  else if(args[1].includes('/pulls/'))value=pull;
  else if(args[1].includes('?'))value={total_count:runs.length,workflow_runs:runs};
  else value=runs.find(r=>args[1].endsWith('/'+r.id));
  return {code:0,stdout:JSON.stringify(value)};
 };
 const owners=memoryOwners();
 const make=()=>new CoreCIMonitor({run,config:async()=>config,journal,owners,report:e=>events.push(e)});
 return {make,calls,events,t,pull,job,disk,setConfig:v=>{config={...config,...v};},setRuns:v=>runs=v,setTerminals:v=>terminals=v,afterClaim:fn=>afterClaim=fn,
  response:v=>response=v,setOpenPrs:v=>openPrs=v,git:fn=>gitReply=fn,sends:()=>calls.filter(([,a])=>a[0]==='send'),config:()=>config,owners};
}
try{
 for(const state of ['idle','done','error','working']){
  const f=fixture(state);f.t.status.state=state;f.setConfig({states:[state]});await f.make().cycle();
  assert.equal(f.sends().length,1);const args=f.sends()[0][1];assert.equal(args.includes('--force'),false);assert.ok(args.includes('t1'));assert.equal(args.some(a=>a==='pc2/t99'),false);
  await f.make().cycle();assert.equal(f.sends().length,1,'New worker retains attempted-failure receipts');assertions+=5;
 }
 for(const scenario of ['disabled','blocked','unselected','wrong-repo','empty-scope','closed','cancelled','superseded','busy-owner','config-race','identity-race','dry-run']){
  const f=fixture(scenario);
  if(scenario==='disabled')f.setConfig({enabled:false});
  if(scenario==='blocked')f.t.status.state='blocked';
  if(scenario==='unselected')f.setConfig({states:[]});
  if(scenario==='wrong-repo')f.setConfig({repositories:['other/repo']});
  if(scenario==='empty-scope')f.setConfig({repositories:[]});
  if(scenario==='closed')f.pull.state='closed';
  if(scenario==='cancelled')f.job.conclusion='cancelled';
  if(scenario==='superseded')f.setRuns([f.job,{...f.job,id:124,conclusion:'success'}]);
  if(scenario==='busy-owner'){f.t.status.state='working';f.setTerminals([f.t,{...f.t,address:'t2',pid:43,created_ms:200,status:{state:'idle',app:'a1'}}]);}
  if(scenario==='config-race')f.afterClaim(()=>f.setConfig({revision:'two',enabled:false}));
  if(scenario==='identity-race')f.afterClaim(()=>f.t.pid++);
  await f.make().cycle({send:scenario!=='dry-run'});
  assert.equal(f.sends().length,0,scenario);assert.equal(f.disk.read().entries.length,0,'No unsent claims retained');assertions+=2;
 }
 // Two agents on one PR: the oldest owns it, whichever order Core lists them in.
 for(const order of ['oldest-first','newest-first']){
  const f=fixture(order),helper={...f.t,address:'t0',pid:43,created_ms:200,status:{state:'idle',app:'a1'}};
  f.setTerminals(order==='oldest-first'?[f.t,helper]:[helper,f.t]);await f.make().cycle();
  assert.equal(f.sends().length,1,order);assert.ok(f.sends()[0][1].includes('t1'),'The original agent gets it');assert.ok(!f.sends()[0][1].includes('t0'),'Not the helper opened later');assertions+=3;
 }
 {
  const f=fixture('same-age');f.setTerminals([{...f.t,address:'t2',pid:43},f.t]);await f.make().cycle();
  assert.equal(f.sends().length,1);assert.ok(f.sends()[0][1].includes('t1'),'Same age: a stable pick, still one send');assertions+=2;
 }
 // The PR's agent is remembered: a newcomer never takes over while the owner lives.
 {
  const f=fixture('remembered'),helper={...f.t,address:'t0',pid:43,created_ms:200,status:{state:'idle',app:'a1'}};
  f.t.status.state='working';await f.make().cycle();
  assert.deepEqual(f.owners.read(),{'owner/repo#12':{address:'t1',created:100}},'The attached agent is remembered');
  // The owner's footer can't be read now (no PR link), a helper opened later shows the PR.
  const {labels,...unreadable}=f.t;f.setTerminals([{...unreadable,status:{state:'idle',app:'a1'},labels:{}},helper]);
  await f.make().cycle();assert.equal(f.sends().length,0,'The live owner keeps the PR even unread');
  // The owner ends: the PR moves to the oldest remaining agent.
  f.setTerminals([helper]);await f.make().cycle();
  assert.equal(f.sends().length,1);assert.ok(f.sends()[0][1].includes('t0'));assert.equal(f.owners.read()['owner/repo#12'].address,'t0');assertions+=5;
 }
 {
  const f=fixture('owner-moved-on'),helper={...f.t,address:'t0',pid:43,created_ms:200};
  f.t.status.state='working';await f.make().cycle();
  f.t.status.state='idle';f.t.labels={...f.t.labels,'custom.ci.pr':'13'};f.setTerminals([f.t,helper]);await f.make().cycle();
  assert.ok(f.sends().some(([,a])=>a.includes('t0')),'An owner now on another PR releases this one');assertions++;
 }
 {
  const f=fixture('owner-restart');f.t.status.state='working';await f.make().cycle();
  f.setTerminals([{...f.t,created_ms:300,status:{state:'idle',app:'a1'}}]);await f.make().cycle();
  assert.equal(f.sends().length,1,'A new terminal at the old address is a new agent, not the remembered one');assertions++;
 }
 assert.deepEqual(validOwners({'o/r#1':{address:'t1',created:1},'bad':{address:'t1',created:1},'o/r#2':{address:'x',created:1},'o/r#3':{address:'t3'}}),{'o/r#1':{address:'t1',created:1}});
 assert.deepEqual(validOwners([1]),{});assertions+=2;
 {
  const f=fixture('unreadable-unrelated-agent');f.setTerminals([f.t,{...f.t,address:'t2',pid:43,labels:{}}]);await f.make().cycle();
  assert.equal(f.sends().length,1,'An unreadable unrelated footer cannot suppress a separately verified target');assert.ok(f.events.some(e=>e.event==='agent-unverified'));assertions+=2;
 }
 for(const kind of ['blocked','status_mismatch','unknown']){
  const f=fixture('refusal-'+kind);f.response({code:1,stdout:'',stderr:JSON.stringify({error:{kind}})});await f.make().cycle();
  assert.equal(f.sends().length,1);assert.equal(f.disk.read().entries.length,kind==='unknown'?1:0);
  f.response({code:0,stdout:'{"status":"idle","turn":2,"started":true}'});await f.make().cycle();
  assert.equal(f.sends().length,kind==='unknown'?1:2);assertions+=3;
 }
 // Merge conflicts: listed from the agent's checkout, sent once per head/base, before CI.
 {
  const conflicted=f=>{Object.assign(f.pull,{mergeable:false,mergeable_state:'dirty'});f.setConfig({conflictEnabled:true,conflictTemplate:DEFAULT_CONFLICT_MESSAGE});
   f.git(args=>args[0]==='merge-tree'?{code:1,stdout:'c'.repeat(40)+'\nsrc/a.js\nsrc/b.js\nsrc/a.js\n'}:{code:0,stdout:'true\n'});};
  const f=fixture('conflict');conflicted(f);await f.make().cycle();
  assert.equal(f.sends().length,1,'One message for the conflicts');const text=f.sends()[0][1].at(-1);
  assert.match(text,/^https:\/\/github\.com\/owner\/repo\/pull\/12 has merge conflicts with main at commit a{40}\./);
  assert.match(text,/Conflicting files:\n- src\/a\.js\n- src\/b\.js$/,'Each conflicting file once');assert.doesNotMatch(text,/actions\/runs/,'Not the CI message');
  const fetch=f.calls.find(([c,a])=>c.endsWith('/git')&&a[0]==='fetch')[1];assert.ok(fetch.includes('--no-write-fetch-head')&&!fetch.some(a=>a.startsWith('refs/')),'Objects only, no ref changes');
  await f.make().cycle();assert.equal(f.sends().length,2,'Asked once: the next cycle goes on to CI');assert.match(f.sends()[1][1].at(-1),/^CI failed/);
  await f.make().cycle();assert.equal(f.sends().length,2,'Neither is repeated');assertions+=7;
 }
 for(const scenario of ['conflicts-off','clean-here','computing','ci-off']){
  const f=fixture(scenario);Object.assign(f.pull,{mergeable:false,mergeable_state:'dirty'});f.setConfig({conflictEnabled:true,conflictTemplate:DEFAULT_CONFLICT_MESSAGE});
  f.git(args=>args[0]==='merge-tree'?{code:scenario==='clean-here'?0:1,stdout:'c'.repeat(40)+'\nx.js\n'}:{code:0,stdout:'true\n'});
  if(scenario==='conflicts-off')f.setConfig({conflictEnabled:false});
  if(scenario==='computing')Object.assign(f.pull,{mergeable:null,mergeable_state:'unknown'});
  if(scenario==='ci-off')Object.assign(f.pull,{mergeable:true,mergeable_state:'clean'}),f.setConfig({ciEnabled:false});
  await f.make().cycle();const texts=f.sends().map(([,a])=>a.at(-1));
  assert.equal(texts.some(x=>/merge conflicts/.test(x)),false,scenario);
  assert.equal(texts.length,{'conflicts-off':1,'clean-here':0,computing:1,'ci-off':0}[scenario],scenario);assertions+=2;
 }
 {
  const f=fixture('no-files');Object.assign(f.pull,{mergeable:false,mergeable_state:'dirty'});f.setConfig({conflictEnabled:true,conflictTemplate:DEFAULT_CONFLICT_MESSAGE});
  f.git(args=>args[0]==='fetch'?{code:128,stdout:''}:{code:0,stdout:'true\n'});await f.make().cycle();
  assert.match(f.sends()[0][1].at(-1),/- \(not listed: merge main to see them\)$/,'A failed fetch still asks, without a list');assertions++;
 }
 // Pull request merged: the linked agent is told once to clean up; no CI or conflict checks.
 {
  const f=fixture('merged');Object.assign(f.pull,{state:'closed',merged:true,head:{...f.pull.head,ref:'feature/x'}});
  f.setConfig({mergedEnabled:true,mergedTemplate:DEFAULT_MERGED_MESSAGE});
  await f.make().cycle();assert.equal(f.sends().length,1,'One merged message');
  assert.equal(f.sends()[0][1].at(-1),'https://github.com/owner/repo/pull/12 was merged successfully. Clean up its worktree.');
  await f.make().cycle();assert.equal(f.sends().length,1,'Never repeated');assertions+=3;
 }
 // The link outlives the merge: a branch agent seen on PR 12 is still reached once GitHub
 // no longer lists the PR as open for its branch.
 {
  const branchGit=args=>args[0]==='branch'?{code:0,stdout:'feature/x\n'}:{code:0,stdout:'true\n'};
  const f=fixture('merged-link');f.t.status.app='codex';f.t.labels={};f.setOpenPrs([{number:12}]);f.git(branchGit);
  f.setConfig({ciEnabled:false,mergedEnabled:true,mergedTemplate:DEFAULT_MERGED_MESSAGE});
  await f.make().cycle();assert.equal(f.t.labels['custom.ci.link.pr'],'12','Linked while open');assert.equal(f.t.labels['custom.ci.link.repository'],'owner/repo');
  assert.equal(f.sends().length,0,'Nothing to say while open');
  f.setOpenPrs([]);Object.assign(f.pull,{state:'closed',merged:true});
  await f.make().cycle();assert.equal(f.sends().length,1,'Merged message reaches the linked agent');assert.ok(f.sends()[0][1].includes('t1'));
  const g=fixture('no-link');g.t.status.app='codex';g.t.labels={};g.setOpenPrs([]);Object.assign(g.pull,{state:'closed',merged:true});g.git(branchGit);
  g.setConfig({mergedEnabled:true,mergedTemplate:DEFAULT_MERGED_MESSAGE});
  await g.make().cycle();assert.equal(g.sends().length,0,'No link, no guess');assertions+=6;
 }
 for(const scenario of ['merged-off','closed-unmerged']){
  const f=fixture(scenario);Object.assign(f.pull,{state:'closed',merged:scenario==='merged-off'});
  f.setConfig({mergedEnabled:scenario!=='merged-off',mergedTemplate:DEFAULT_MERGED_MESSAGE});
  await f.make().cycle();assert.equal(f.sends().length,0,scenario);assertions++;
 }
 assert.throws(()=>validateConfig({...fixture('bad-merged').config(),mergedEnabled:true,mergedTemplate:'{oops}'}));assertions++;
 assert.doesNotThrow(()=>validateConfig({...fixture('legacy').config()}),'A config from before the switches is valid');
 assert.throws(()=>validateConfig({...fixture('bad-conflict').config(),conflictEnabled:true,conflictTemplate:'{oops}'}));assertions+=2;
 const directory=path.join(root,'lock');fs.mkdirSync(directory);const release=acquireLock(directory);assert.ok(release);assert.equal(acquireLock(directory),null);release();assert.ok(acquireLock(directory));assertions+=3;
 const bad=fixture('invalid');assert.throws(()=>validateConfig({...bad.config(),states:['blocked']}));assertions++;
 // Desktop delivery is retired: background delivery does not depend on a panel.
 const main=fs.readFileSync(new URL('../src/plugins/git/mod/main.js',import.meta.url),'utf8');assert.ok(!main.includes('new CIFix'));assert.ok(!main.includes('syncCIFix'));assertions+=2;
 // Installer executes only synthetic task APIs here; its output is immutable code plus public config.
 const installRoot=path.join(root,'installation'),files=Object.fromEntries(installer.FILES.map(file=>[file,fs.readFileSync(new URL('../src/plugins/git/'+file,import.meta.url),'utf8')]));
 const scripts=[];let task=null;
 const options={root:installRoot,platform:'win32',resolveCommand:n=>'/fixture/'+n,
  run:(cmd,args)=>args[0]==='server'?JSON.stringify({core:{id:coreId}}):'fixture-login',
  powershell:script=>{scripts.push(script);return script.includes('Get-ScheduledTask')?(task?JSON.stringify(task):''):'';}};
 let result=await installer.main({action:'install',files,config:bad.config()},options);assert.equal(result.installed,true);
 const record=JSON.parse(fs.readFileSync(path.join(installRoot,'installation.json'),'utf8'));
 task={description:'herdr-ci-monitor-v1',state:'Running',actions:[{execute:record.launcher,arguments:record.arguments}]};
 result=await installer.main({action:'update',config:{...bad.config(),enabled:false}},options);assert.equal(result.enabled,false);
 assert.ok(scripts.some(s=>s.includes('-LogonType Interactive -RunLevel Limited')));assert.ok(scripts.some(s=>s.includes('IgnoreNew')));
 assert.ok(!scripts.join('\n').includes('Stop-Service'));assert.ok(!scripts.join('\n').includes('core restart'));
 task.actions[0].arguments='unowned program';await assert.rejects(()=>installer.main({action:'install',files,config:bad.config()},options),/not owned/);assertions+=7;
 // node.exe launched directly by Task Scheduler opens a console window; the task must go through a headless conhost.
 assert.match(record.launcher,/[\\/]conhost\.exe$/i);assert.ok(record.arguments.startsWith('--headless "'+process.execPath+'" '));
 const registration=scripts.find(s=>s.includes('Register-ScheduledTask'));assert.ok(registration.includes(record.launcher));assert.ok(registration.includes('--headless'));assertions+=4;
 // A legacy install (task runs node.exe directly, no launcher recorded) is still owned and is migrated on update.
 const legacy={...record,arguments:'"'+record.entry+'" --home "'+installRoot+'"'};delete legacy.launcher;
 fs.writeFileSync(path.join(installRoot,'installation.json'),JSON.stringify(legacy));
 task={description:'herdr-ci-monitor-v1',state:'Running',actions:[{execute:legacy.node,arguments:legacy.arguments}]};
 assert.ok(installer.ownedTask(task,legacy));assert.ok(!installer.ownedTask(task,record),'A node.exe action is not owned by a conhost record');
 fs.writeFileSync(path.join(installRoot,'worker.lock'),JSON.stringify({pid:999999,token:'t'}));
 scripts.length=0;await installer.main({action:'update',config:bad.config()},options);
 assert.ok(scripts.some(s=>s.includes('Register-ScheduledTask')&&s.includes('--headless')),'Legacy task re-registered headless');
 const kill=scripts.find(s=>s.includes('Stop-Process'));assert.ok(kill.includes('ProcessId=999999')&&kill.includes("Contains('monitor-runner.js')")&&kill.includes('"'+installRoot+'"'),'Only this monitor runner is stopped');assert.ok(kill.includes("EndsWith('--home "+installRoot+"')"),'A runner launched with an unquoted --home is stopped too');assertions++;
 const migrated=JSON.parse(fs.readFileSync(path.join(installRoot,'installation.json'),'utf8'));assert.equal(migrated.launcher,record.launcher);assert.equal(migrated.arguments,record.arguments);
 task={description:'herdr-ci-monitor-v1',state:'Running',actions:[{execute:migrated.launcher,arguments:migrated.arguments}]};
 scripts.length=0;await installer.main({action:'update',config:bad.config()},options);assert.ok(!scripts.some(s=>s.includes('Register-ScheduledTask')),'Migrated task is not re-registered again');assertions+=7;
 // A Claude launched from a shell in home: Core's cwd is home, the project comes from its fresh report.
 {
  const now=1_000_000,shellAt=String(now-1000);
  const claude=(labels,cwd='C:/Users/me')=>projectFolder({cwd,labels},'claude-code',now);
  assert.equal(claude({'custom.claude.session':'s1','custom.claude.at':shellAt,'custom.claude.cwd':'D:/Git/a1','custom.cwd':'D:/Git'}),'D:/Git/a1','Fresh Claude project report wins');
  assert.equal(claude({'custom.claude.session':'s1','custom.claude.at':String(now-120000),'custom.claude.cwd':'D:/Git/a1','custom.cwd':'D:/Git/b'}),'D:/Git/b','A stale Claude report falls back to the shell-reported folder');
  assert.equal(claude({'custom.claude.cwd':'D:/Git/a1'}),'C:/Users/me','No session: Core cwd is the last fallback');
  assert.equal(claude({'custom.claude.session':'s1','custom.claude.at':shellAt,'custom.claude.cwd':'relative/path'}),'C:/Users/me','Relative paths are refused');
  assert.equal(projectFolder({cwd:'/repo',labels:{'custom.claude.session':'s1','custom.claude.at':shellAt,'custom.claude.cwd':'/other'}},'a1',now),'/repo','Claude reports only count for Claude terminals');
  assertions+=5;
 }
 console.log(`PASS: ${assertions} Core CI monitor assertions; desktop-independent discovery, local-only routing, default/blocked guards, current evidence, races, durable dedup, dry-run, singleton and owned limited-task startup (zero real sends/tasks)`);
}finally{fs.rmSync(root,{recursive:true,force:true});}
