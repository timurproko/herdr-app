// Kill real journal writers at acquisition boundaries. No provider/credential IO.
import assert from 'node:assert/strict';
import fs from 'node:fs';import fsp from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import {createRequire} from 'node:module';import {fork,execFile} from 'node:child_process';import {fileURLToPath} from 'node:url';import {promisify} from 'node:util';
import {loadMod} from '../tools/plugin-harness.mjs';
const require=createRequire(import.meta.url),journal=require('../src/plugins/usage/reset-journal.cjs');
const worker=fileURLToPath(new URL('../src/plugins/usage/reset-journal.cjs',import.meta.url));
if(process.argv[2]==='--writer') {
  const [phase,json]=process.argv.slice(3),request=JSON.parse(json);
  process.on('message',()=>{});
  const pause=async()=>{process.send({phase});await new Promise(()=>{});};
  const open=fsp.open,rename=fsp.rename,read=fsp.readFile;
  fsp.open=async(...args)=>{
    const owner=String(args[0]).includes('admission-owner-')&&/owner.*\.json$/.test(String(args[0]));
    if(owner&&phase==='before-owner')await pause();
    const handle=await open(...args);
    if(owner&&phase==='empty-owner')await pause();
    return handle;
  };
  fsp.rename=async(...args)=>{
    if(String(args[0]).includes('admission-owner-')&&phase==='before-publish')await pause();
    const result=await rename(...args);
    if(String(args[1]).endsWith('admission.json')&&phase==='committed')await pause();
    return result;
  };
  fsp.readFile=async(...args)=>{if(String(args[0]).endsWith('admission.json')&&phase==='published')await pause();return read(...args);};
  await journal.transact(request);
  throw Error('Writer failed to pause at '+phase);
} else {
  const root=fs.mkdtempSync(path.join(process.env.HERDR_TEST_OUTPUT??os.tmpdir(),'usage-lock-'));
  const children=new Set(),sleep=ms=>new Promise(r=>setTimeout(r,ms));
  const request=home=>({root:home,action:'reserve',provider:'codex',accountId:'a',automatic:true,startedAt:Date.now(),windows:[{id:'weekly',remaining:0,end:null}]});
  const run=async r=>JSON.parse((await promisify(execFile)(process.execPath,[worker,JSON.stringify(r)])).stdout);
  const old=Date.now()/1000-30;
  const legacy=(home,content,aged=true)=>{const lock=path.join(home,'.customizations/usage/admission.lock');fs.mkdirSync(lock,{recursive:true});
    if(content!==undefined){fs.writeFileSync(path.join(lock,'owner.json'),content);if(aged)fs.utimesSync(path.join(lock,'owner.json'),old,old);}
    if(aged)fs.utimesSync(lock,old,old);return lock;};
  async function killWriter(home,phase) {
    const child=fork(fileURLToPath(import.meta.url),['--writer',phase,JSON.stringify(request(home))],{stdio:['ignore','ignore','pipe','ipc']});children.add(child);
    let stderr='';child.stderr.on('data',b=>{stderr+=b;});
    const exited=new Promise(resolve=>child.once('exit',resolve));
    try {
      await new Promise((resolve,reject)=>{const timeout=setTimeout(()=>reject(Error('Writer timeout: '+phase+' '+stderr)),20000);
        child.once('message',message=>{clearTimeout(timeout);assert.equal(message.phase,phase);resolve();});
        child.once('error',error=>{clearTimeout(timeout);reject(error);});
        child.once('exit',()=>{clearTimeout(timeout);reject(Error('Early writer exit: '+stderr));});});
      const lock=path.join(home,'.customizations/usage/admission.lock');
      if(['before-owner','empty-owner','before-publish'].includes(phase))assert.equal(fs.existsSync(lock),false,'An unpublished candidate is never a lock');
      else {const files=fs.readdirSync(lock);assert.equal(files.length,1);assert.match(files[0],/^owner-[a-f0-9]{32}\.json$/);assert.equal(JSON.parse(fs.readFileSync(path.join(lock,files[0]))).pid,child.pid);}
    } finally {child.kill('SIGKILL');await exited;children.delete(child);}
  }
  try {
    // Existing directories left by the old mkdir/write protocol must also recover.
    for(const [name,content] of [['missing',undefined],['empty',''],['truncated','{"pid":'],['invalid','{"pid":"unknown"}']]) {
      const home=path.join(root,name);legacy(home,content);
      assert.ok((await run(request(home))).requestId,`${name}: legacy orphan recovers without hand deletion`);
    }
    for(const kind of ['corrupt','capacity','unknown-lock']) {
      const home=path.join(root,kind),dir=path.join(home,'.customizations/usage');fs.mkdirSync(dir,{recursive:true});
      const file=path.join(dir,kind==='unknown-lock'?'admission.lock':'admission.json');
      const bytes=kind==='capacity'?JSON.stringify({version:1,accounts:Object.fromEntries(Array.from({length:256},(_,i)=>[i.toString(16).padStart(64,'0'),{}]))}):'preserved invalid data';
      fs.writeFileSync(file,bytes);assert.equal((await run(request(home))).unhealthy,true,`${kind}: storage failure is not a pending claim`);
      assert.equal(fs.readFileSync(file,'utf8'),bytes,'Unhealthy journal bytes are not deleted or silently replaced');
    }
    const young=path.join(root,'young'),youngLock=legacy(young,undefined,false);
    assert.equal((await run(request(young))).blocked,true,'Do not reclaim an initializing legacy writer');
    fs.utimesSync(youngLock,old,old);assert.ok((await run(request(young))).requestId);
    const alive=path.join(root,'alive');legacy(alive,JSON.stringify({pid:process.pid}));
    assert.equal((await run(request(alive))).blocked,true,'Never evict a known live owner, even an old lock');
    for(const phase of ['before-owner','empty-owner','before-publish','published','committed']) {
      const home=path.join(root,phase);await killWriter(home,phase);
      const reply=await run(request(home));
      if(phase==='committed')assert.equal(reply.blocked,true,'Dead-lock recovery must preserve the already committed spend receipt');
      else assert.ok(reply.requestId,`${phase}: killed acquisition cannot strand the next reset`);
    }
    const concurrent=path.join(root,'concurrent');legacy(concurrent,undefined);
    const replies=await Promise.all(Array.from({length:8},()=>run(request(concurrent))));
    assert.equal(replies.filter(r=>r.requestId).length,1,'Concurrent orphan reclaim still admits exactly one reset');

    // Production store: journal health cannot turn the confirmed manual action off.
    for(const machine of [null,'pc2'])for(const provider of ['claude','codex'])for(const fault of ['missing-node','io','corrupt','capacity','unknown-lock','malformed','malformed-id','manual-timeout']) {
      const state=new Map(),jobs=[],actions=[],transport=[],account={id:'fixture',...(provider==='claude'?{organizationId:'org'}:{})};
      let health=fault,used=100;
      let entered,release;const held=fault==='corrupt'&&machine===null&&provider==='codex';
      const started=new Promise(r=>entered=r),pendingManual=new Promise(r=>release=r);
      const entry={id:'quota',sourceId:provider,account,report:{status:'available',windows:[{id:'weekly',usedPct:100}],resetCredits:{applicable:1},
        [provider==='claude'?'claudeResets':'codexResets']:{groups:[{name:'Full reset',typeId:'full',covers:['weekly'],grantId:'grant',left:1,usable:true}]}},actionRead:{machine,epoch:0,request:'seed',startedAt:Date.now(),receivedAt:Date.now()}};
      const cacheKey=`custom.usage.${machine===null?'local':'remote:'+machine}.cache`;
      state.set(cacheKey,{version:5,reports:[entry],at:Date.now(),loading:false,collectionRequest:'seed'});
      state.set(cacheKey.replace(/cache$/,'preferences'),{enabled:true,automaticReset:true,resetSelections:[JSON.stringify([provider,account.id,account.organizationId??null,'full'])]});
      const host={shared:k=>state.get(k),setShared:(k,v)=>state.set(k,structuredClone(v)),checking:()=>false,appHome:()=>'/fixture',readTextFile:async()=> 'synthetic worker',
        window:()=>({active:true}),spaces:()=>[{active:true,machine}],machines:()=>[{name:'pc2',layout:'ready'}],notify(){assert.fail('Manual success has no toast');},
        exec:async(_command,args,options)=>{
          const request=JSON.parse(args.at(-1));
          if(args[0].endsWith('reset-journal.cjs')) {
            if(health==='missing-node')return {code:1,stdout:''};if(health==='io')throw Error('Synthetic journal IO failure');
            if(health==='malformed')return {code:0,stdout:'not JSON'};
            if(health==='malformed-id')return {code:0,stdout:JSON.stringify({requestId:3})};
            return {code:0,stdout:JSON.stringify(health==='healthy'?{requestId:'herdr-fixture',observed:true,finished:true}:health==='busy'?{blocked:true}:{unhealthy:true})};
          }
          transport.push(request);assert.equal(options.on,machine);
          if(request.action){actions.push(request);if(!request.automatic&&held){entered();await pendingManual;}if(!request.automatic&&fault==='manual-timeout')throw Error('Synthetic uncertain submitted reset');return {code:0,stdout:JSON.stringify(request.automatic?{result:'unavailable',validationReport:{status:'error',error:'Synthetic revalidation refusal'}}:{result:'reset'})};}
          return {code:0,stdout:JSON.stringify({reports:[{...entry,report:{...entry.report,windows:[{id:'weekly',usedPct:used}]}}]})};
        }};
      const {store}=await loadMod({host,modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:'import * as store from "./plugins/usage/store.js";export {store};'});
      const cx={spawn:fn=>jobs.push(fn),notify(){},sleep:async()=>{if(jobs.length)await jobs.shift()(cx);}};
      const claim={provider,accountId:account.id,organizationId:account.organizationId,grantId:'grant'};
      const automatic={typeId:'full',grantId:'grant',covers:['weekly'],label:'Full reset'};
      await store.claimReset(machine,{...claim,entry,automatic});assert.equal(actions.length,0,'Unhealthy storage cannot admit an automatic spend');
      health='busy';assert.match((await store.claimReset(machine,claim)).error,/pending/);assert.equal(actions.length,0,'A healthy busy owner is not a manual fallback');
      health=fault;const manualTask=store.claimReset(machine,claim);
      if(held){await started;assert.match((await store.claimReset(machine,claim)).error,/pending/);
        assert.equal((await store.claimReset(machine,{...claim,entry,automatic})).obsolete,true,'A manual fallback in flight excludes automatic submission');
        assert.equal(actions.length,1,'Another window cannot double-submit the fallback');release();}
      const manual=await manualTask;
      if(fault==='manual-timeout')assert.match(manual.error,/did not finish/);
      else assert.equal(manual.result,'reset',`${machine}/${provider}/${fault}: manual reset remains usable`);
      assert.equal(actions.length,1);assert.equal(actions[0].automatic,undefined);assert.match(actions[0].requestId,/^herdr-[A-Za-z0-9_-]+$/);
      assert.ok(state.get('custom.usage.manual-reset-fences').accounts,'Manual fallback persists an automatic-spend fence');
      // A replacement module reads the persisted fence, not a view-local busy flag.
      const observer=fault==='corrupt'?(await loadMod({host,modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:'import * as store from "./plugins/usage/store.js";export {store};'})).store:store;
      health='healthy';await sleep(5);
      observer.refresh(machine,cx,{force:true});while(jobs.length)await jobs.shift()(cx);
      assert.equal(actions.length,1,'Repairing the journal while quota is still low cannot consume another reset');
      await sleep(5);used=20;await observer.refreshAfterReset(machine,cx,entry.id,0);
      assert.equal(store.cache(machine).reports[0].report.windows[0].usedPct,20,'Existing captured-account continuation still updates manual-reset quotas');
      assert.equal(transport.at(-1).reportId,entry.id);
      assert.equal(Object.keys(state.get('custom.usage.manual-reset-fences').accounts).length,0,'Only a genuine later recovery rearms automatic spending');
      await sleep(5);used=100;observer.refresh(machine,cx,{force:true});while(jobs.length)await jobs.shift()(cx);
      assert.equal(actions.length,2);assert.ok(actions[1].automatic,'A distinct fresh depletion may use the healthy journal again');
    }
    console.log('PASS: legacy orphan recovery, killed atomic acquisitions, live-owner exclusion, preserved receipts, concurrent reclaim and journal-independent manual Reset with recovery fences');
  } finally {for(const child of children)child.kill('SIGKILL');fs.rmSync(root,{recursive:true,force:true});}
}
