// Real selection/actions/installer/engine, fake Core/GitHub/tasks; no live home or sends.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';
import {loadMod} from '../tools/plugin-harness.mjs';
import {CoreCIMonitor} from '../src/plugins/git/monitor-engine.js';
import {DiskJournal} from '../src/plugins/git/monitor-runner.js';
const installer=createRequire(import.meta.url)('../src/plugins/git/monitor-host.cjs');
fs.mkdirSync('.artifacts',{recursive:true});const root=fs.mkdtempSync(path.resolve('.artifacts/monitor-scope-'));
const relay='https://relay.example',coreId='c'.repeat(32),head='a'.repeat(40),files=Object.fromEntries(installer.FILES.map(f=>[f,fs.readFileSync(new URL('../src/plugins/git/'+f,import.meta.url),'utf8')]));
const state={'custom.plugins':{git:{enabled:true,settings:{autoFixCI:true,relay,githubAccount:'Owner'}}}};
const calls=[],workerRoot=path.join(root,'worker');let task=null,checked=false,mutationErrors={},afterMutation=()=>{};
const options={root:workerRoot,platform:'win32',resolveCommand:n=>'/fixture/'+n,
 run:(_cmd,args)=>args[0]==='server'?JSON.stringify({core:{id:coreId}}):'fixture-user',
 powershell:s=>s.includes('Get-ScheduledTask')?(task?JSON.stringify(task):''):''};
const host={shared:k=>state[k],setShared:(k,v)=>state[k]=v,checking:()=>false,machines:()=>[],appHome:()=>root,readTextFile:async()=>null,
 notify(){assert.fail('No setup warning expected');},exec:async(_cmd,args)=>{
  if(args[0].endsWith('monitor-control.cjs')){
   const input=JSON.parse(args[1]);calls.push(input);
   const result=await installer.main({...input,...(input.action==='install'?{files}:{})},options);
   if(input.action==='install'){const r=JSON.parse(fs.readFileSync(path.join(workerRoot,'installation.json')));task={description:'herdr-ci-monitor-v1',state:'Running',actions:[{execute:r.launcher,arguments:r.arguments}]};}
   return {code:0,stdout:JSON.stringify({ok:true,upToDate:true,...result})};
  }
  const mode=args[1];let result;
  if(args[0].endsWith('github.cjs'))result={status:'ready',active:'Owner',accounts:[{login:'Owner',administers:true}]};
  else if(args[0].endsWith('cloudflare.cjs'))result=mode==='status'?{installed:true,loggedIn:true,accounts:[{id:'cloud',name:'Fixture'}]}:{status:'ready',relay,account:'cloud'};
  else if(mode==='relay')result={status:'ready',noticeVersion:1};
  else if(mode==='repositories')result={status:'ready',account:'Owner',repositories:[{name:'Owner/Repo',repositoryId:1,checked}]};
  else if(mode==='set-repositories'){if(!Object.keys(mutationErrors).length)checked=JSON.parse(args[4]).enabled;result={status:'ready',errors:mutationErrors};afterMutation();}
  else if(mode==='create')result={status:'ready'};else assert.fail('Unexpected setup '+args);
  return {code:0,stdout:JSON.stringify(result)};
 }};
const load=()=>loadMod({host,globals:{URL},modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:"export * as r from './plugins.js';export * as m from './plugins/git/monitor-actions.js';export * as a from './plugins/git/actions.js';export * as added from './plugins/git/added-repositories.js';"});
const plain=v=>JSON.parse(JSON.stringify(v)),written=()=>JSON.parse(fs.readFileSync(path.join(workerRoot,'config.json')));
try{
 let {r,m,a,added}=await load();const git=r.pluginById('git'),cx={...r.pluginContext(git),enabled:()=>true,isCurrent:()=>true,
  setSetting:(key,value,prior)=>{if((state['custom.plugins'].git.settings[key]??'')!==prior)return false;state['custom.plugins'].git.settings[key]=value;return true;}};
 const config=()=>plain(m.monitorConfig(cx));
 state['custom.plugins'].git.settings.repository='legacy/repo';state['custom.plugins'].git.settings.ciMonitorRepositories='legacy/other';
 state['custom.git.webhook-state']={version:1,relay,members:{'notice/repo':true}};
 assert.deepEqual(config().repositories,[],'No durable selection: no notice/legacy fallback');
 added.saveAddedRepositories(relay+'|owner',[{name:'Owner/Repo',repositoryId:1}]);
 assert.deepEqual(config().repositories,['owner/repo']);
 // Run the actual management CLI against fixture public state; intercept its control boundary.
 const preload=path.join(root,'control.cjs');fs.writeFileSync(preload,"const M=require('module'),load=M._load;M._load=function(id,...rest){if(id.endsWith('monitor-control.cjs'))return {dispatch:request=>({request})};return load.call(this,id,...rest);};");
 const cli=()=>{fs.writeFileSync(path.join(root,'shared.json'),JSON.stringify(state));return JSON.parse(execFileSync(process.execPath,['--require',preload,'tools/core-ci-monitor.mjs','update'],{encoding:'utf8',env:{...process.env,HERDR_APP_HOME:root}})).request.config;};
 assert.deepEqual(cli().repositories,config().repositories,'Actual CLI and runtime use the same durable selection');
 for(const [key,value] of [['githubAccount','other'],['relay','https://other.example'],['githubAccount','']]){
  const before=state['custom.plugins'].git.settings[key];state['custom.plugins'].git.settings[key]=value;assert.deepEqual(config().repositories,[]);assert.deepEqual(cli().repositories,[]);state['custom.plugins'].git.settings[key]=before;
 }
 added.saveAddedRepositories(relay+'|owner',[]);assert.deepEqual(config().repositories,[]);
 state['custom.plugins'].git.settings.githubAccount='';
 const displayed=await a.repositoryCheck(cx);assert.equal(displayed.selection.value,'Owner','The default account is displayed before it has been saved');
 assert.equal(cx.setting('githubAccount'),'','Reading Settings cannot pin an account');
 let picker=await a.repositoryCandidates(cx);assert.deepEqual(config().repositories,[]);assert.equal(cx.setting('githubAccount'),'','Opening/cancelling the picker cannot pin an account');
 mutationErrors={'Owner/Repo':'Fixture Add failure'};const failed=await picker.add(cx,['Owner/Repo']);assert.equal(failed.errors['Owner/Repo'],'Fixture Add failure');assert.equal(cx.setting('githubAccount'),'','A failed Add cannot pin an account');assert.deepEqual(config().repositories,[]);mutationErrors={};
 await picker.add(cx,['Owner/Repo']);assert.equal(cx.setting('githubAccount'),'Owner','Confirmed default-account Add persists its effective account');
 assert.deepEqual(plain(state['custom.git.webhook-state'].members),{});assert.deepEqual(config().repositories,['owner/repo'],'Default-account Add notice invalidation cannot empty scope');assert.deepEqual(cli().repositories,['owner/repo'],'The CLI sees the confirmed default-account binding');
 const sync=async()=>{const jobs=[];m.ensureMonitors({setting:cx.setting,enabled:true,cx:{spawn:fn=>jobs.push(fn)}});for(const job of jobs)await job();};
 await sync();assert.deepEqual(written().repositories,['owner/repo'],'Actual installed worker config receives selection');
 await a.createCredentials(cx);await sync();assert.deepEqual(config().repositories,['owner/repo']);assert.deepEqual(written().repositories,['owner/repo']);
 state['custom.plugins'].git.settings.account='cloud';const configure=await a.configureCheck(cx);await configure.fix.run(cx);await sync();assert.deepEqual(config().repositories,['owner/repo'],'Configure cache invalidation keeps selection');
 await a.removeRepository(cx,'Owner/Repo');await sync();assert.deepEqual(written().repositories,[],'Last removal writes empty scope');
 picker=await a.repositoryCandidates(cx);await picker.add(cx,['Owner/Repo']);await sync();assert.deepEqual(written().repositories,['owner/repo']);
 // Existing hooks promptly revoke a changed account/relay scope, even before sidebar sync.
 await git.onSettingChange('githubAccount',{...cx,setting:k=>k==='githubAccount'?'other':cx.setting(k)});assert.deepEqual(written().repositories,[]);
 await git.onSettingChange('relay',{...cx,setting:k=>k==='relay'?'https://other.example':cx.setting(k)});assert.deepEqual(written().repositories,[]);
 ({m}=await load());await sync();assert.deepEqual(written().repositories,['owner/repo'],'Fresh module/startup needs no setting re-save');
 const expected=written();
 // A newer account choice while the approved request finishes must never be overwritten.
 state['custom.plugins'].git.settings.githubAccount='';checked=false;const stalePicker=await a.repositoryCandidates(cx);
 afterMutation=()=>{state['custom.plugins'].git.settings.githubAccount='Other';};await stalePicker.add(cx,['Owner/Repo']);
 assert.equal(cx.setting('githubAccount'),'Other');assert.deepEqual(config().repositories,[],'An account change during Add remains fail-closed');afterMutation=()=>{};
 state['custom.plugins'].git.settings.githubAccount='';checked=false;const closedPicker=await a.repositoryCandidates(cx);
 await assert.rejects(closedPicker.add({...cx,setSetting:()=>false},['Owner/Repo']),/account selection could not be saved/,'A refused public-setting save is explicit, not silent healthy-zero');assert.equal(cx.setting('githubAccount'),'');assert.deepEqual(config().repositories,[]);
 state['custom.plugins'].git.settings.githubAccount='Owner';
 // Real footer mapping and disk receipts, no real Core commands or repository operations.
 for(const kind of ['ci','conflict']){
  const t={address:'t1',state:'live',created_ms:100,pid:42,cwd:'/fixture/repo',status:{state:'idle',app:'a1'},labels:{}};
  const pull={number:12,state:'open',head:{sha:head},base:{ref:'main',repo:{full_name:'owner/repo'}},...(kind==='conflict'?{mergeable:false,mergeable_state:'dirty'}:{})};
  const job={id:123,workflow_id:4,run_attempt:1,head_sha:head,status:'completed',conclusion:'failure',repository:{full_name:'owner/repo'}};
  const sent=[],journal=new DiskJournal(path.join(root,kind+'-history.json')),c={...expected,ciEnabled:kind==='ci',conflictEnabled:kind==='conflict'};
  const run=async(command,args)=>{let v;
   if(command.endsWith('/hc')){
    if(args[0]==='server')v={core:{id:coreId}};else if(args[0]==='ls')v={terminals:[{address:'t1',state:'live',status:'idle'}]};
    else if(args[0]==='get')v=t;else if(args[0]==='read')v={how:'screen',complete:true,text:'/fixture/repo • fix/example • #12\n↑1k ↓2k 10%/100k'};
    else if(args[0]==='label'){for(const kv of args.slice(2)){const i=kv.indexOf('=');t.labels[kv.slice(0,i)]=kv.slice(i+1);}v={};}
    else if(args[0]==='send'){sent.push(args);v={status:'idle',turn:1,started:true};}else assert.fail(args);
   }else if(command.endsWith('/git'))return {code:args[0]==='merge-tree'?1:0,stdout:args[0]==='merge-tree'?'c'.repeat(40)+'\nx.js\n':'true\n'};
   else if(args[0]==='repo')v={nameWithOwner:'owner/repo'};else if(args[1].includes('/pulls/'))v=pull;
   else if(args[1].includes('/git/ref/'))v={object:{sha:'b'.repeat(40)}};else if(args[1].includes('?'))v={total_count:1,workflow_runs:[job]};else v=job;
   return {code:0,stdout:JSON.stringify(v)};
  };
  const make=()=>new CoreCIMonitor({run,config:async()=>c,journal});
  t.status.state='working';await make().cycle();assert.equal(sent.length,0,'Working remains opt-in');t.status.state='idle';
  if(kind==='ci'){job.status='in_progress';job.conclusion=null;await make().cycle();assert.equal(sent.length,0,'No early job alert');job.status='completed';job.conclusion='failure';}
  await make().cycle();await make().cycle();await make().cycle();assert.equal(sent.length,1,kind+' unchanged evidence sends once across restart');assert.ok(!sent[0].includes('--force'));assert.ok(sent[0].includes('t1'));assert.equal(journal.read().entries.length,1);
 }
 assert.ok(calls.some(c=>c.action==='install')&&calls.some(c=>c.action==='update'));
 console.log('PASS: confirmed default-account Add persistence, no read/cancel/failed-Add save, durable selection, actual Add/Remove/Configure/credential invalidation, scope mismatch, real CLI parity, actual worker config, code replacement and idle CI/conflict restart dedup (zero live operations)');
}finally{fs.rmSync(root,{recursive:true,force:true});}
