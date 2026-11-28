import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import {automaticCandidate,prefs,resetSelectionKey,summaryWindows} from '../src/plugins/usage/model.js';
import {loadMod} from '../tools/plugin-harness.mjs';
import {syncPreferences} from '../tools/runtime/preferences.mjs';
const require=createRequire(import.meta.url),{transact}=require('../src/plugins/usage/reset-journal.cjs'),bridge=require('../src/plugins/usage/mod/bridge.cjs');
const root=fs.mkdtempSync(path.join(process.env.HERDR_TEST_OUTPUT??os.tmpdir(),'usage-reset-'));
const sleep=ms=>new Promise(r=>setTimeout(r,ms));
const entry={id:'quota',sourceId:'codex',sourceLabel:'Codex',account:{id:'a',label:'fixture@example.test'},report:{status:'available',resetCredits:{applicable:1},windows:[{id:'weekly',usedPct:99}],codexResets:{groups:[{name:'Full reset',typeId:'full',covers:['weekly'],grantId:'g',left:2,usable:true}]}}};
const consent=prefs({automaticReset:true,resetSelections:[resetSelectionKey(entry,'full')]});
try {
 assert.ok(automaticCandidate(entry,consent));
 for(const used of [98.99,NaN,Infinity,-1,101])assert.equal(automaticCandidate({...entry,report:{...entry.report,windows:[{id:'weekly',usedPct:used}]}},consent),null);
 for(const used of [99,100])assert.ok(automaticCandidate({...entry,report:{...entry.report,windows:[{id:'weekly',usedPct:used}]}},{...consent,remaining:false}));
 for(const patch of [{automaticReset:false},{enabled:false},{resetSelections:[]}])assert.equal(automaticCandidate(entry,{...consent,...patch}),null);
 for(const patch of [{status:'error'},{resetCredits:{applicable:0}},{windows:[{id:'model:other',usedPct:100}]}])assert.equal(automaticCandidate({...entry,report:{...entry.report,...patch}},consent),null);
 for(const patch of [{usable:false},{left:0},{covers:[]},{endsAt:'invalid'},{endsAt:new Date(Date.now()-1000).toISOString()},{cooldownUntil:new Date(Date.now()+10000).toISOString()}])assert.equal(automaticCandidate({...entry,report:{...entry.report,codexResets:{groups:[{...entry.report.codexResets.groups[0],...patch}]}}},consent),null);
 const admission={root,provider:'codex',accountId:'a',windows:[{id:'weekly',remaining:0,end:null}],startedAt:Date.now(),action:'reserve',automatic:true};
 const journalFile=new URL('../src/plugins/usage/reset-journal.cjs',import.meta.url);
 const replies=await Promise.all(Array.from({length:8},async()=>JSON.parse((await promisify(execFile)(process.execPath,[journalFile.pathname.replace(/^\/([A-Za-z]:)/,'$1'),JSON.stringify(admission)])).stdout)));
 assert.equal(replies.filter(r=>r.requestId).length,1,'Concurrent windows get only one durable admission');
 const requestId=replies.find(r=>r.requestId).requestId;
 assert.equal((await transact({...admission,automatic:false})).blocked,true,'A manual claim cannot race an automatic claim');
 assert.equal((await transact({...admission,machine:'pc2'})).blocked,true,'Another selected machine cannot double-admit the same account');
 await transact({...admission,action:'finish',requestId});await sleep(5);
 assert.equal((await transact({...admission,startedAt:Date.now()})).blocked,true,'Still-low readings cannot consume another reset');
 const now=Date.now();await transact({...admission,action:'observe',startedAt:now,windows:[{id:'weekly',remaining:25,end:null}]});await sleep(5);
 assert.ok((await transact({...admission,startedAt:Date.now()})).requestId,'Fresh recovery rearms a later depletion');
 // A changed future reset timestamp alone never rearms an unresolved episode.
 assert.equal((await transact({...admission,startedAt:Date.now(),windows:[{id:'weekly',remaining:0,end:Date.now()+100000}]})).blocked,true);
 const crashed={...admission,root:path.join(root,'crashed')};assert.ok((await transact(crashed)).requestId);
 const originalNow=Date.now;let simulated=originalNow()+300100;
 try {Date.now=()=>simulated;
  assert.equal((await transact({...crashed,startedAt:simulated})).blocked,true,'A crashed request never rearms from lease expiry alone');
  await transact({...crashed,action:'observe',startedAt:simulated,windows:[{id:'weekly',remaining:20,end:null}]});simulated++;
  assert.ok((await transact({...crashed,startedAt:simulated})).requestId,'Recovery after the bounded action deadline survives restart');
 } finally {Date.now=originalNow;}
 const period={...admission,root:path.join(root,'period'),windows:[{id:'weekly',remaining:0,end:Date.now()+400}],startedAt:Date.now()};
 const periodId=(await transact(period)).requestId;await transact({...period,action:'finish',requestId:periodId});await sleep(5);
 assert.equal((await transact({...period,startedAt:Date.now(),windows:[{id:'weekly',remaining:0,end:period.windows[0].end+60000}]})).blocked,true,'A timestamp change before period end is not a new depletion');
 await sleep(410);assert.ok((await transact({...period,startedAt:Date.now(),windows:[{id:'weekly',remaining:0,end:period.windows[0].end+60000}]})).requestId,'A proven new natural period can rearm');
 const uuid='12345678-abcd-1234-abcd-123456789abc';assert.ok((await transact({...admission,accountId:uuid})).requestId);
 assert.equal((await transact({...admission,accountId:uuid.toUpperCase()})).blocked,true,'UUID spelling cannot bypass account admission');
 const portable=path.join(root,'portable');fs.mkdirSync(portable);fs.writeFileSync(path.join(portable,'shared.json'),JSON.stringify({'custom.usage.local.preferences':consent,'custom.usage.reset-journal-active':true,'custom.usage.manual-reset-fences':{version:1,accounts:{fixture:{id:'private-attempt'}}}}));
 syncPreferences('export',portable,{hostname:'fixture'});
 const exported=JSON.parse(fs.readFileSync(path.join(portable,'preferences/fixture.json'))).shared;
 assert.equal(exported['custom.usage.local.preferences'].automaticReset,undefined);assert.equal(exported['custom.usage.local.preferences'].resetSelections,undefined);assert.equal(exported['custom.usage.reset-journal-active'],undefined);assert.equal(exported['custom.usage.manual-reset-fences'],undefined);
 const corrupt=path.join(root,'corrupt');fs.mkdirSync(path.join(corrupt,'.customizations/usage'),{recursive:true});fs.writeFileSync(path.join(corrupt,'.customizations/usage/admission.json'),'broken');
 await assert.rejects(transact({...admission,root:corrupt}));
 const capacity=path.join(root,'capacity');fs.mkdirSync(path.join(capacity,'.customizations/usage'),{recursive:true});
 fs.writeFileSync(path.join(capacity,'.customizations/usage/admission.json'),JSON.stringify({version:1,accounts:Object.fromEntries(Array.from({length:256},(_,i)=>[i.toString(16).padStart(64,'0'),{}]))}));
 await assert.rejects(transact({...admission,root:capacity}),/capacity/);
 // The real target worker re-reads this exact account before using the existing POST.
 const opts={home:path.join(root,'credentials-fixture'),env:{},readJson:async file=>file.endsWith(path.join('.codex','auth.json'))?{tokens:{access_token:'synthetic-token',account_id:'a'}}:null,readJsonc:async()=>null};
 let posts=0,remaining=1,fail=false;
 opts.requestJson=async(url,_headers,request)=>{
  if(request?.method==='POST'){posts++;return {status:200,body:{}};}
  if(fail)return {status:429};
  if(url===bridge.ENDPOINTS.codex)return {status:200,body:{rate_limit:{secondary_window:{used_percent:100-remaining,limit_window_seconds:604800}},rate_limit_reset_credits:{available_count:1,applicable_available_count:1}}};
  if(url===bridge.ENDPOINTS.codexResets)return {status:200,body:{credits:[{id:'g',title:'Full reset',status:'available'}]}};
  throw Error('Unexpected endpoint');
 };
 const request={accountId:'a',grantId:'g',requestId:'herdr-fixture',automatic:{typeId:'full',covers:['session','weekly']}};
 assert.equal((await bridge.codexReset(request,opts)).result,'reset');assert.equal(posts,1);
 remaining=2;assert.equal((await bridge.codexReset(request,opts)).result,'unavailable');assert.equal(posts,1);
 remaining=0;fail=true;const refused=await bridge.codexReset(request,opts);assert.equal(refused.result,'unavailable');assert.ok(refused.validationReport.retryAt>Date.now());assert.equal(posts,1);
 fail=false;assert.equal((await bridge.codexReset({...request,automatic:{...request.automatic,covers:['model:other']}},opts)).result,'unavailable');assert.equal(posts,1);
 const realNow=Date.now,issued=realNow();
 try {const timed=await bridge.codexReset(request,{...opts,requestJson:async(...args)=>{const reply=await opts.requestJson(...args);if(args[0]===bridge.ENDPOINTS.codex)Date.now=()=>issued+100000;return reply;}});
  assert.equal(timed.result,'unavailable');assert.equal(posts,1,'A delayed worker cannot POST after its action deadline');
 } finally {Date.now=realNow;}
 // Packaged production store/lifecycle, real durable journal, fake native transport.
 const state=new Map(),jobs=[],timers=[],notifications=[];let active=true,machine=null,connected=true,reads=0,claims=0,reports=[entry],readHook=()=>{},afterClaim=()=>{},claimReply={result:'reset'};
 const runtime=path.join(root,'runtime');
 const host={shared:k=>state.get(k),setShared:(k,v)=>state.set(k,structuredClone(v)),spaces:()=>[{active:true,machine}],machines:()=>[{name:'pc2',layout:connected?'ready':'loading'}],window:()=>({active}),
  appHome:()=>runtime,readTextFile:async()=>{reads++;readHook();return 'synthetic worker';},notify:n=>notifications.push(n),checking:()=>false,layout:()=>null,
  exec:async(_command,args,options)=>{
    const request=JSON.parse(args.at(-1));
    if(args[0].endsWith('reset-journal.cjs'))return {code:0,stdout:JSON.stringify(await transact({...request,root:runtime}))};
    if(request.action){assert.equal(options.on,machine);assert.equal(request.automatic?.typeId,'full');claims++;afterClaim();return {code:0,stdout:JSON.stringify(claimReply)};}
    return {code:0,stdout:JSON.stringify({reports})};
  }};
 const {store,registry}=await loadMod({host,modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:'import * as store from "./plugins/usage/store.js";import * as registry from "./plugins.js";export {store,registry};'});
 const cx={spawn:fn=>jobs.push(fn),sleep:async()=>{},notify(){},timer:{every:(_ms,fn)=>timers.push(fn)}};
 const drain=async()=>{while(jobs.length)await jobs.shift()(cx);};
 state.set('custom.usage.local.preferences',consent);
 store.syncAutomaticUsage({},cx);await drain();assert.equal(claims,1,'No summary or dialog is required');assert.equal(timers.length,1);
 store.refresh(null,cx,{force:true});await drain();assert.equal(claims,1,'Repeated low completion does not spend twice');
 await sleep(5);reports=[{...entry,report:{...entry.report,windows:[{id:'weekly',usedPct:20}]}}];store.refresh(null,cx,{force:true});await drain();
 await sleep(5);reports=[entry];store.refresh(null,cx,{force:true});await drain();assert.equal(claims,2,'A later witnessed depletion may spend once');
 // A different, never-spent account makes negative provenance assertions independent of the old latch.
 const other={...entry,id:'other',account:{id:'b',label:'b@example.test'}};
 const otherConsent=prefs({automaticReset:true,resetSelections:[resetSelectionKey(other,'full')]});
 state.set('custom.usage.local.preferences',otherConsent);
 reports=[{...other,report:{status:'error',error:'Synthetic failed read'}}];store.refresh(null,cx,{force:true});await drain();assert.equal(claims,2);
 reports=[{...other,report:{status:'reused'}}];store.refresh(null,cx,{force:true});await drain();assert.equal(claims,2,'Borrowed quota is never automatic authority');
 reports=[other];active=false;store.refresh(null,cx,{force:true});await drain();assert.equal(claims,2,'Inactive return cannot replay stored low readings');active=true;
 store.refresh(null,cx,{force:true});await drain();assert.equal(claims,3,'A genuinely current read of that account remains eligible');
 const changed={...entry,id:'changed',account:{id:'c'}},changedConsent=prefs({automaticReset:true,resetSelections:[resetSelectionKey(changed,'full')]});
 state.set('custom.usage.local.preferences',changedConsent);reports=[changed];const at=reads;
 readHook=()=>{if(reads===at+2)state.set('custom.usage.local.preferences',{...changedConsent,resetSelections:[]});};
 store.refresh(null,cx,{force:true});await drain();readHook=()=>{};assert.equal(claims,3,'Unticking during reset-worker loading revokes dispatch');
 const before=reads;active=false;timers[0](cx);await drain();assert.equal(reads,before);active=true;
 machine='pc2';state.set('custom.usage.remote:pc2.preferences',consent);connected=false;store.syncAutomaticUsage({},cx);await drain();assert.equal(reads,before);
 connected=true;registry.setPluginEnabled(registry.pluginById('usage'),false);timers[0](cx);await drain();assert.equal(reads,before,'Disabled lifecycle cannot launch collectors');
 // Automatic origin uses the same captured-account publication as manual Reset.
 registry.setPluginEnabled(registry.pluginById('usage'),true);connected=true;active=true;readHook=()=>{};
 for(const on of [null,'pc2'])for(const outcome of ['success','read-failure','obsolete']) {
  machine=on;const suffix=`${on??'local'}-${outcome}`;
  const target={...entry,id:'target-'+suffix,account:{id:'account-'+suffix,label:'person-'+suffix+'@fixture.test'}};
  const sibling={...entry,id:'sibling-'+suffix,account:{id:'sibling-'+suffix},report:{...entry.report,windows:[{id:'weekly',usedPct:30}]}};
  const pins=[JSON.stringify([target.id,'weekly']),JSON.stringify([sibling.id,'weekly'])];
  const prefKey=`custom.usage.${on===null?'local':'remote:'+on}.preferences`;
  state.set(prefKey,prefs({automaticReset:true,resetSelections:[resetSelectionKey(target,'full')],pins}));reports=[target,sibling];
  const beforeClaims=claims,beforeNotices=notifications.length;let continuationReads=0;
  afterClaim=()=>{
   continuationReads=reads;
   if(outcome==='obsolete'){registry.setPluginEnabled(registry.pluginById('usage'),false);registry.setPluginEnabled(registry.pluginById('usage'),true);return;}
   reports=[{...target,report:outcome==='read-failure'?{status:'error',error:'Synthetic follow-up failure'}:{...target.report,windows:[{id:'weekly',usedPct:5}],codexResets:{groups:[{...target.report.codexResets.groups[0],left:1,grantId:'next'}]}}},
    {...sibling,report:{...sibling.report,windows:[{id:'weekly',usedPct:100}]}}];
  };
  store.refresh(on,cx,{force:true});await drain();
  assert.equal(claims,beforeClaims+1);assert.equal(notifications.length,beforeNotices+1,'One toast per confirmed automatic spend');
  const toast=notifications.at(-1);assert.equal(toast.title,'Automatic reset used');assert.equal(toast.level,'success');
  assert.ok(toast.body.includes(on??'This computer'));assert.ok(toast.body.includes(target.account.label));assert.ok(toast.body.includes('Codex'));assert.ok(toast.body.includes('Full reset'));
  const data=store.cache(on),actual=data.reports.find(e=>e.id===target.id);
  if(outcome==='success') {assert.equal(actual.report.windows[0].usedPct,5);assert.equal(actual.report.codexResets.groups[0].left,1);assert.equal(summaryWindows(data.reports,store.preferences(on))[0].window.usedPct,5);}
  if(outcome==='read-failure') {assert.equal(actual.report.status,'error');assert.equal(summaryWindows(data.reports,store.preferences(on))[0].available,false);}
  if(outcome==='obsolete')assert.equal(reads,continuationReads,'Obsolete automatic result cannot revive a collector');
  assert.deepEqual(JSON.parse(JSON.stringify(data.reports.find(e=>e.id===sibling.id).report)),sibling.report,'Captured continuation preserves unrelated quotas');
  assert.deepEqual(Array.from(store.preferences(on).pins),pins);
 }
 const refusedEntry={...entry,id:'validation-refused',account:{id:'validation-refused'}};
 state.set('custom.usage.remote:pc2.preferences',prefs({automaticReset:true,resetSelections:[resetSelectionKey(refusedEntry,'full')]}));reports=[refusedEntry];
 const notices=notifications.length;let validationReads;
 afterClaim=()=>{validationReads=reads;claimReply={result:'unavailable',validationReport:{status:'error',error:'Usage requests are rate limited.',retryAt:Date.now()+600000}};};
 store.refresh('pc2',cx,{force:true});await drain();assert.equal(reads,validationReads,'A refused validation read is not immediately retried');assert.equal(notifications.length,notices);
 assert.ok(store.cache('pc2').reports[0].report.retryAt>Date.now());assert.equal(store.cache('pc2').reports[0].actionRead,null);
 console.log('PASS: reset policy, durable admission, worker/lifecycle guards, automatic scoped reconciliation and deduplicated captured-spend toasts');
} finally {fs.rmSync(root,{recursive:true,force:true});}
