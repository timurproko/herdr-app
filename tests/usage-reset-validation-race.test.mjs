// Same-enable-generation reset validation races against newer collection ownership.
// Packaged production store, synthetic transport only: no credentials or processes.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
for(const machine of [null,'pc2'])for(const provider of ['claude','codex'])for(const mode of ['completed','pending','failed','account-failed','expired','unrelated','current','current-legacy']) {
  const scope=`${provider}/${machine??'local'}/${mode}`,state=new Map(),jobs=[],requests=[];
  const entered=deferred(),validation=deferred(),collecting=deferred(),collected=deferred();
  const account={id:'account',...(provider==='claude'?{organizationId:'organization'}:{})};
  const origin={machine,epoch:0,request:'initial-read',startedAt:Date.now(),receivedAt:Date.now()};
  const entry={id:'quota',sourceId:provider,account,report:{status:'available',windows:[{id:'weekly',usedPct:100}],resetCredits:{applicable:1},
    [provider==='claude'?'claudeResets':'codexResets']:{groups:[{name:'Full reset',typeId:'full',covers:['weekly'],grantId:'grant',left:1,usable:true}]}},actionRead:origin};
  const {actionRead,...wire}=entry;
  const fresh={...wire,report:{...entry.report,windows:[{id:'weekly',usedPct:20}]}},sibling={...fresh,id:'sibling',account:{...account,id:'other'}};
  const cacheKey=`custom.usage.${machine===null?'local':'remote:'+machine}.cache`;
  state.set('custom.usage.generation',0);
  state.set(cacheKey,{version:5,reports:[entry,sibling],at:Date.now(),loading:false,...(mode==='current-legacy'?{}:{collectionRequest:origin.request})});
  state.set(cacheKey.replace(/cache$/,'preferences'),{enabled:true,automaticReset:true,resetSelections:[JSON.stringify([provider,account.id,account.organizationId??null,'full'])]});
  const host={shared:k=>state.get(k),setShared:(k,v)=>state.set(k,structuredClone(v)),spaces:()=>[{active:true,machine}],machines:()=>[{name:'pc2',layout:'ready'}],window:()=>({active:true}),
    appHome:()=>'/fixture',readTextFile:async()=> 'synthetic worker',checking:()=>false,notify(){assert.fail('A failed validation cannot emit a success toast');},
    exec:async(_command,args,options)=>{
      if(args[0].endsWith('reset-journal.cjs'))return {code:0,stdout:JSON.stringify({requestId:'herdr-fixture',observed:true,finished:true})};
      assert.equal(options.on,machine,scope);
      const request=JSON.parse(args.at(-1));requests.push(request);
      if(request.action){entered.resolve();return validation.promise;}
      collecting.resolve();
      if(mode==='pending'||mode==='expired')await collected.promise;
      return {code:0,stdout:JSON.stringify(mode==='failed'?{error:'Newer collection failed'}:{reports:mode==='account-failed'?[{...wire,report:{status:'error',error:'Newer account refusal',retryAt:Date.now()+30000}},sibling]:[fresh,sibling]})};
    }};
  const {store}=await loadMod({host,modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:'import * as store from "./plugins/usage/store.js";export {store};'});
  const cx={spawn:fn=>jobs.push(fn),notify(){},sleep:async()=>{}};
  const pending=store.claimReset(machine,{provider,accountId:account.id,organizationId:account.organizationId,grantId:'grant',
    automatic:{typeId:'full',grantId:'grant',covers:['weekly'],label:'Full reset'},entry});
  await entered.promise;
  let readJob;
  if(!mode.startsWith('current')) {
    store.refresh(machine,cx,{force:true,reportId:mode==='unrelated'?sibling.id:entry.id,accountOnly:true});
    readJob=jobs.shift()(cx);await collecting.promise;
    if(mode==='expired')state.set(cacheKey,{...state.get(cacheKey),started:Date.now()-135001});
    if(mode!=='pending'&&mode!=='expired')await readJob;
  }
  const before=JSON.stringify(state.get(cacheKey));
  const retryAt=Date.now()+3600000;
  validation.resolve({code:0,stdout:JSON.stringify({result:'unavailable',validationReport:{status:'error',error:'Obsolete validation refusal',retryAt}})});
  const result=await pending;
  assert.equal(state.get('custom.usage.generation'),0,`${scope}: no disable/re-enable obsolescence`);
  if(mode.startsWith('current')) {
    assert.equal(result.result,'unavailable',scope);
    assert.equal(store.cache(machine).reports[0].report.retryAt,retryAt,`${scope}: a genuinely current validation keeps its Retry-After`);
    assert.equal(store.cache(machine).reports[0].actionRead,null,scope);
  } else {
    assert.equal(JSON.stringify(state.get(cacheKey)),before,`${scope}: obsolete validation must preserve the entire newer cache and retry state`);
    assert.equal(result.obsolete,true,scope);
  }
  if(readJob&&(mode==='pending'||mode==='expired')){collected.resolve();await readJob;}
  if(mode==='completed'||mode==='pending') {
    const current=store.cache(machine).reports[0];
    assert.equal(current.report.status,'available',scope);assert.equal(current.report.windows[0].usedPct,20,scope);
    assert.notEqual(current.actionRead.request,origin.request,scope);assert.equal(current.actionRead.epoch,origin.epoch,scope);
  }
  if(!mode.startsWith('current')) {
    // An obsolete one-hour Retry-After must not reach even the next forced collection.
    store.refresh(machine,cx,{force:true,reportId:entry.id,accountOnly:true});
    await jobs.shift()(cx);
    assert.notEqual(requests.at(-1).hold?.[entry.id],retryAt,scope);
    if(mode!=='account-failed')assert.equal(requests.at(-1).hold?.[entry.id],undefined,scope);
  }
  assert.equal(requests.filter(r=>r.action).length,1,`${scope}: no extra reset submission`);
}
console.log('PASS: same-generation local/remote Claude/Codex validation races preserve newer reads, pending/failed/expired ownership and Retry-After');
