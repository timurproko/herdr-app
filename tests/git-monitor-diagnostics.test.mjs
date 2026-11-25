// Real engine/runner/diagnostics with disposable files and synthetic commands only.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';
import {main,DiagnosticJournal,diagnosticEvent,DIAGNOSTIC_LIMIT,DIAGNOSTIC_BYTES} from '../src/plugins/git/monitor-runner.js';
import {CoreCIMonitor} from '../src/plugins/git/monitor-engine.js';
import {DEFAULT_CI_MESSAGE,DEFAULT_CONFLICT_MESSAGE} from '../src/plugins/git/ci-message.js';
const installer=createRequire(import.meta.url)('../src/plugins/git/monitor-host.cjs');
fs.mkdirSync('.artifacts',{recursive:true});const root=fs.mkdtempSync(path.resolve('.artifacts/monitor-diagnostics-'));
const head='a'.repeat(40),coreId='c'.repeat(32),json=f=>JSON.parse(fs.readFileSync(f,'utf8'));
function fixture(name){
 const home=path.join(root,name);fs.mkdirSync(home);let sends=0,fail=false,response={code:0,stdout:'{"status":"idle","turn":1,"started":true}'};
 const c={version:1,enabled:true,states:['idle','done','error'],template:DEFAULT_CI_MESSAGE,repositories:['owner/repo'],coreId,revision:'one',commands:{hc:'/fixture/hc',gh:'/fixture/gh',git:'/fixture/git'}};
 const t={address:'t1',state:'live',created_ms:100,pid:42,cwd:'/fixture/repo',status:{state:'idle',app:'a1'},labels:{'custom.ci.pr':'12','custom.ci.repository':'owner/repo'}};
 const pull={number:12,state:'open',head:{sha:head},base:{ref:'main',repo:{full_name:'owner/repo'}}};
 const job={id:123,workflow_id:4,run_attempt:1,head_sha:head,status:'completed',conclusion:'failure',repository:{full_name:'owner/repo'}};
 let terminals=[t],runs=[job];
 const transport=async(command,args)=>{let v;
  if(command.endsWith('/hc')){
   if(args[0]==='server')v={core:{id:coreId}};else if(args[0]==='ls')v={terminals:terminals.map(t=>({...t,status:t.status.state}))};
   else if(args[0]==='get')v=terminals.find(t=>t.address===args[1]);else if(args[0]==='send'){sends++;return response;}else throw Error('Unexpected Core command');
  }else if(command.endsWith('/git'))return {code:args[0]==='merge-tree'?1:0,stdout:args[0]==='merge-tree'?'c'.repeat(40)+'\nx.js\n':'true\n'};
  else if(fail)throw Error('private raw error and token must not appear');
  else if(args[0]==='repo')v={nameWithOwner:'owner/repo'};else if(args[1].includes('/pulls/'))v=pull;
  else if(args[1].includes('/git/ref/'))v={object:{sha:'b'.repeat(40)}};else if(args[1].includes('?'))v={total_count:runs.length,workflow_runs:runs};else v=job;
  return {code:0,stdout:JSON.stringify(v)};
 };
 const config=()=>fs.writeFileSync(path.join(home,'config.json'),JSON.stringify(c));config();
 return {home,c,t,pull,job,transport,config,sends:()=>sends,status:()=>json(path.join(home,'status.json')),diagnostics:()=>json(path.join(home,'diagnostics.json')),
  cycle:async opts=>{config();return main(home,{once:true,transport,...opts});},setTerminals:v=>terminals=v,setRuns:v=>runs=v,setFail:()=>fail=true,setResponse:v=>response=v};
}
try{
 for(const scenario of ['empty','unselected','running','no-targets','none-selected']){
  const f=fixture(scenario);if(scenario==='empty')f.c.repositories=[];if(scenario==='unselected')f.t.status.state='working';if(scenario==='running')Object.assign(f.job,{status:'in_progress',conclusion:null});if(scenario==='no-targets')f.setTerminals([]);if(scenario==='none-selected')f.c.states=[];
  const result=await f.cycle();assert.equal(result.health,'suppressed');assert.equal(f.sends(),0);const reason={empty:'no-monitored-repositories',unselected:'agent-state-not-selected',running:'workflow-still-running','no-targets':'no-verified-targets','none-selected':'agent-state-not-selected'}[scenario];assert.equal(result.reason,reason);
  const entry=f.diagnostics().entries[0];assert.equal(entry.reason,reason);assert.equal(entry.repository,['empty','no-targets'].includes(scenario)?null:'owner/repo');assert.equal(entry.pr,['empty','no-targets'].includes(scenario)?null:12);assert.equal(entry.address,['empty','no-targets'].includes(scenario)?null:'t1');
  await f.cycle();assert.equal(f.diagnostics().entries.length,1,'Repeated unchanged episode coalesces across runner restart');
 }
 {
  const f=fixture('ci-dedup');assert.equal((await f.cycle()).health,'ready');assert.equal(f.status().lastEvent.event,'delivered');assert.equal(f.status().delivered,1);
  assert.equal((await f.cycle()).reason,'already-sent');assert.equal(f.sends(),1);assert.deepEqual(f.diagnostics().entries.map(e=>e.reason),['delivered','already-sent']);
  await f.cycle();assert.equal(f.diagnostics().entries.length,2);
 }
 {
  const f=fixture('conflict-dedup');Object.assign(f.c,{conflictEnabled:true,conflictTemplate:DEFAULT_CONFLICT_MESSAGE,ciEnabled:false});Object.assign(f.pull,{mergeable:false,mergeable_state:'dirty'});
  await f.cycle();assert.equal((await f.cycle()).reason,'already-sent');assert.equal(f.sends(),1);assert.equal(f.diagnostics().entries.at(-1).kind,'conflict');
 }
 {
  const f=fixture('unknown');f.setResponse({code:1,stdout:'',stderr:'timeout secret'});assert.equal((await f.cycle()).health,'uncertain');assert.equal(f.status().unknown,1);assert.equal(f.diagnostics().entries[0].event,'unknown');
  await f.cycle();assert.equal(f.sends(),1);assert.equal(json(path.join(f.home,'history.json')).entries[0].outcome,'unknown');assert.equal(f.status().reason,'already-sent','Recorded does not assert acknowledgement');
 }
 {
  const f=fixture('refused');f.setResponse({code:1,stdout:'',stderr:'{"error":{"kind":"status_mismatch"}}'});assert.equal((await f.cycle()).health,'suppressed');assert.equal(f.status().reason,'refused');assert.equal(json(path.join(f.home,'history.json')).entries.length,0);
  f.setResponse({code:0,stdout:'{"status":"idle","turn":2,"started":true}'});await f.cycle();assert.equal(f.sends(),2,'Diagnostic suppression never creates a receipt');
 }
 {
  const f=fixture('verification');f.setFail();assert.equal((await f.cycle()).health,'unavailable');assert.equal(f.status().reason,'verification-failed');assert.doesNotMatch(JSON.stringify(f.status())+JSON.stringify(f.diagnostics()),/private raw|token/);
 }
 {
  const f=fixture('latest');f.setRuns([{...f.job,id:122,status:'in_progress',conclusion:null},{...f.job,conclusion:'success'}]);assert.equal((await f.cycle()).reason,'no-failed-workflows','Obsolete running workflow is not current running evidence');
 }
 {
  const f=fixture('probe'),events=[];const monitor=new CoreCIMonitor({run:f.transport,config:async()=>f.c,journal:{claim(){assert.fail('Probe cannot claim');}},report:e=>events.push(e)});
  await monitor.cycle({send:false});assert.equal(events.at(-1).event,'would-request');assert.equal(f.sends(),0);assert.ok(!fs.existsSync(path.join(f.home,'diagnostics.json')));
  await f.cycle({dryRun:true});assert.ok(!fs.existsSync(path.join(f.home,'diagnostics.json')),'Dry-run diagnostics stay in memory/status only');
 }
 {
  const f=fixture('sink-fails');const monitor=new CoreCIMonitor({run:f.transport,config:async()=>f.c,journal:{claim:async keys=>({keys,token:'fixture'}),finish:async()=>{}},report(){throw Error('disk full');}});await monitor.cycle();assert.equal(f.sends(),1,'Throwing diagnostic sink cannot prevent delivery');
 }
 {
  const f=fixture('all-skipped');f.t.status.state='working';f.setTerminals([f.t,{...f.t,address:'t2',pid:43,created_ms:200,status:{state:'idle',app:'a1'}}]);
  const result=await f.cycle();assert.equal(result.health,'suppressed');assert.equal(result.reason,'all-candidates-skipped');assert.equal(f.sends(),0);assert.equal(result.reasons['not-owner'],1);assert.equal(result.reasons['agent-state-not-selected'],1);
 }
 // The real management status projection preserves the engine's health and summary.
 {
  const f=fixture('status');f.c.repositories=[];await f.cycle();fs.writeFileSync(path.join(f.home,'installation.json'),JSON.stringify({version:1,id:'herdr-ci-monitor-v1',root:f.home,entry:path.join(f.home,'versions','fixture','monitor-runner.js')}));
  const s=await installer.main({action:'status'},{root:f.home,platform:'win32',powershell:()=>''});assert.equal(s.health,'suppressed');assert.equal(s.reason,'no-monitored-repositories');assert.equal(s.targets,0);assert.equal(s.lastEvent.reason,s.reason);
  fs.writeFileSync(path.join(f.home,'status.json'),JSON.stringify({health:'ready',reason:'delivered',targets:2,attempts:1,delivered:1}));
  const empty=await installer.main({action:'status'},{root:f.home,platform:'win32',powershell:()=>''});assert.equal(empty.health,'suppressed','Empty current config cannot inherit an old healthy heartbeat');assert.equal(empty.reason,'no-monitored-repositories');assert.equal(empty.targets,0);
 }
 const file=path.join(root,'bounded.json'),journal=new DiagnosticJournal(file),event={event:'suppressed',reason:'agent-state-not-selected',repository:'owner/repo',pr:12,address:'t1',kind:'ci'};
 assert.equal(journal.record({...event,stdout:'secret',message:'private transcript',token:'secret'}),true);assert.doesNotMatch(fs.readFileSync(file,'utf8'),/secret|private|stdout/);
 const before=fs.readFileSync(file,'utf8');assert.equal(new DiagnosticJournal(file).record(event),true);assert.equal(fs.readFileSync(file,'utf8'),before);
 assert.equal(journal.record({...event,event:'delivered',reason:'delivered'}),true);assert.equal(journal.record(event),true,'A new suppression episode after delivery is retained');
 for(let i=1;i<=200;i++)journal.record({...event,pr:i});assert.equal(json(file).entries.length,DIAGNOSTIC_LIMIT);assert.ok(fs.statSync(file).size<=DIAGNOSTIC_BYTES);
 assert.equal(diagnosticEvent({event:'suppressed',reason:'untrusted arbitrary text'}),null);
 const malicious=diagnosticEvent({...event,repository:'secret\noutput',address:'pc2/t1',pr:-1});assert.equal(malicious.repository,null);assert.equal(malicious.pr,null);assert.equal(malicious.address,null);
 for(const [name,bytes] of [['unknown','{"version":2,"entries":[]}'],['broken','not json'],['oversize','x'.repeat(DIAGNOSTIC_BYTES+1)]]){
  const bad=path.join(root,name+'.json');fs.writeFileSync(bad,bytes);assert.equal(new DiagnosticJournal(bad).record(event),false);assert.equal(fs.readFileSync(bad,'utf8'),bytes,'Unknown diagnostics preserved');
 }
 const target=path.join(root,'link-target');fs.mkdirSync(target);const link=path.join(root,'linked');fs.symlinkSync(target,link,'junction');assert.equal(new DiagnosticJournal(link).record(event),false);assert.deepEqual(fs.readdirSync(target),[]);
 const blocked=path.join(root,'missing','diagnostics.json');assert.equal(new DiagnosticJournal(blocked).record(event),false,'Write failure is best-effort');
 {
  const f=fixture('malformed-diagnostic');fs.writeFileSync(path.join(f.home,'diagnostics.json'),'keep unknown bytes');await f.cycle();assert.equal(f.sends(),1);assert.equal(fs.readFileSync(path.join(f.home,'diagnostics.json'),'utf8'),'keep unknown bytes');
 }
 console.log('PASS: truthful engine/runner/status, bounded sent/suppressed episodes, no-state/empty/running/receipt reasons, delivered/refused/unknown, restart, privacy, read-only probes and non-blocking diagnostic failures (zero live operations)');
}finally{fs.rmSync(root,{recursive:true,force:true});}
