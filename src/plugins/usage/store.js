import { shared, setShared, exec, readTextFile, appHome, machines, spaces, window as appWindow, pluginFile, checking, notify } from '../api.js';
import { machineKey, prefs, TTL, REFRESH_INTERVAL, REFRESH_TIMEOUT, reportFresh, resetTypes, resetWindows, automaticCandidate } from './model.js';
const usageEnabled=()=>shared('custom.plugins')?.usage?.enabled!==false;
const generation=()=>Number(shared('custom.usage.generation'))||0;
const key = (machine,part) => `custom.usage.${machineKey(machine)}.${part}`;
export const preferences = machine => prefs(shared(key(machine,'preferences')));
const VERSION = 5; // account-aware reports and compact worker transport
export const cache = machine => {
  const value=shared(key(machine,'cache'));
  if(value?.version!==VERSION)return {};
  if(value.loading && (value.generation??0)!==generation())return {...value,loading:false,request:null};
  if(value.loading && (!Number.isFinite(value.started)||Date.now()-value.started>=REFRESH_TIMEOUT))
    return {...value,loading:false,request:null,error:value.error??'Usage refresh timed out.'};
  return value;
};
export function updatePreferences(machine,change) {
  if(!usageEnabled())return;
  setShared(key(machine,'preferences'),{...preferences(machine),...change});
  if(change.enabled===false) setShared(key(machine,'cache'),{...cache(machine),loading:false,request:null});
}
const usable = entry => entry?.report?.status==='available';
const selectedMachine=()=>spaces().find(s=>s.active)?.machine??null;
const ready=machine=>machine==null||machines().some(m=>m.name===machine&&!m.temporary&&(m.layout==='ready'||m.state==='connected'));
async function resetJournal(request) {
  try {const reply=await exec('node',[pluginFile('usage','reset-journal.cjs'),JSON.stringify({...request,root:appHome()})],{timeout:10000});
    if(reply.code!==0)return {unhealthy:true};
    const result=JSON.parse(reply.stdout);
    if(result?.requestId!==undefined&&(typeof result.requestId!=='string'||!/^[A-Za-z0-9_-]{1,64}$/.test(result.requestId)))return {unhealthy:true};
    return result&&(result.requestId||result.blocked===true||result.unhealthy===true||result.observed||result.finished)?result:{unhealthy:true};
  }catch{return {unhealthy:true};}
}
const MANUAL_FENCES='custom.usage.manual-reset-fences';
const resetAccount=(provider,id,organization)=>JSON.stringify([provider,id,organization??null].map(v=>typeof v==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(v)?v.toLowerCase():v));
function manualFences() {
  const value=shared(MANUAL_FENCES);
  if(value==null)return {version:1,accounts:{}};
  return value.version===1&&value.accounts&&typeof value.accounts==='object'&&!Array.isArray(value.accounts)&&Object.keys(value.accounts).length<=256&&
    Object.values(value.accounts).every(f=>f&&typeof f.id==='string'&&Number.isFinite(f.until)&&(f.finishedAt===undefined||Number.isFinite(f.finishedAt))&&
      Array.isArray(f.windows)&&f.windows.length<=64&&f.windows.every(w=>typeof w.id==='string'&&(w.end===null||Number.isFinite(w.end))))?value:null;
}
function manualFence(provider,id,organization) {
  const state=manualFences();return !state||state.blocked?true:state.accounts[resetAccount(provider,id,organization)];
}
function beginManualFence(machine,admission,id) {
  const state=manualFences();if(!state)return; // Unknown state already denies automatic claims.
  const account=resetAccount(admission.provider,admission.accountId,admission.organizationId),old=state.accounts[account];
  if(!old&&Object.keys(state.accounts).length>=256){setShared(MANUAL_FENCES,{...state,blocked:true});return;}
  const windows=new Map((old?.windows??[]).map(w=>[w.id,w]));
  for(const w of admission.windows)if(w.remaining!==null&&w.remaining>=0&&w.remaining<=1)windows.set(w.id,w);
  setShared(MANUAL_FENCES,{...state,accounts:{...state.accounts,[account]:{id,machine,at:Date.now(),until:Date.now()+300000,windows:[...windows.values()]}}});
}
function finishManualFence(admission,id) {
  const state=manualFences(),account=resetAccount(admission.provider,admission.accountId,admission.organizationId),fence=state?.accounts[account];
  if(fence?.id===id)setShared(MANUAL_FENCES,{...state,accounts:{...state.accounts,[account]:{...fence,finishedAt:Date.now()}}});
}
function observeManualFence(machine,entry) {
  const state=manualFences(),account=resetAccount(entry.sourceId,entry.account.id,entry.account.organizationId),fence=state?.accounts[account],read=entry.actionRead;
  if(!fence||fence.machine!==machine||!read||read.machine!==machine||!(read.startedAt>(fence.finishedAt??fence.until)))return;
  const windows=resetWindows(entry),healthy=w=>w&&typeof w.remaining==='number'&&w.remaining>1&&w.remaining<=100;
  const recovered=fence.windows.length?fence.windows.every(old=>{const current=windows.find(w=>w.id===old.id);return healthy(current)||
    (current&&old.end!==null&&old.end<=read.startedAt&&current.end!==null&&current.end>old.end);}):windows.length>0&&windows.every(healthy);
  if(recovered){const accounts={...state.accounts};delete accounts[account];setShared(MANUAL_FENCES,{...state,accounts});}
}
function automaticCurrent(machine,entry,epoch,automatic) {
  const data=cache(machine),live=(data.reports??[]).find(e=>e.id===entry?.id),read=entry?.actionRead;
  if(manualFence(entry?.sourceId,entry?.account?.id,entry?.account?.organizationId)||checking()||!usageEnabled()||generation()!==epoch||!appWindow()?.active||selectedMachine()!==machine||!ready(machine)||data.error||!read||
    read.machine!==machine||read.epoch!==epoch||read.receivedAt>Date.now()||Date.now()-read.receivedAt>=TTL||live?.actionRead?.request!==read.request)return false;
  const candidate=automaticCandidate(live,preferences(machine));
  return candidate?.type.id===automatic.typeId&&candidate?.grant.grantId===automatic.grantId;
}
async function evaluateAutomatic(machine,cx,fetched,epoch) {
  for(const entry of fetched) {
    if(!usageEnabled()||generation()!==epoch||!preferences(machine).enabled)return;
    if(!['claude','codex'].includes(entry.sourceId)||!entry.account?.id||!entry.actionRead)continue;
    observeManualFence(machine,entry);
    if(shared('custom.usage.reset-journal-active')||preferences(machine).automaticReset)await resetJournal({action:'observe',provider:entry.sourceId,accountId:entry.account.id,organizationId:entry.account.organizationId,windows:resetWindows(entry),startedAt:entry.actionRead.startedAt});
    const candidate=automaticCandidate(entry,preferences(machine));if(!candidate)continue;
    const automatic={typeId:candidate.type.id,covers:candidate.grant.covers,grantId:candidate.grant.grantId,label:candidate.type.label};
    if(!automaticCurrent(machine,entry,epoch,automatic))continue;
    const result=await claimReset(machine,{provider:entry.sourceId,accountId:entry.account.id,organizationId:entry.account.organizationId,grantId:candidate.grant.grantId,automatic,entry});
    if(!result.obsolete&&result.result&&!result.validationReport)await refreshAfterReset(machine,cx,entry.id,result.epoch);
    cx.notify();
  }
}
// The mounted header keeps automatic collection alive without summary pins or a dialog.
export function syncAutomaticUsage(owner,cx,enabled=true) {
  const check=cx=>{const machine=selectedMachine();if(!checking()&&usageEnabled()&&preferences(machine).automaticReset&&appWindow()?.active&&ready(machine))refresh(machine,cx);};
  if(checking()||!enabled||!cx?.spawn||!preferences(selectedMachine()).automaticReset)return;
  const context=JSON.stringify([selectedMachine(),Boolean(appWindow()?.active),preferences(selectedMachine())]);
  if(owner.usageAutoContext===context)return;owner.usageAutoContext=context;
  cx.spawn(async cx=>{await cx.sleep(0);if(!usageEnabled())return;
    if(!owner.usageAutoTimer&&cx.timer?.every){owner.usageAutoTimer=true;cx.timer.every(REFRESH_INTERVAL,check);}check(cx);});
}
// Machines usually share accounts. A report another machine fetched within the
// TTL is shown here too, so each account is asked about once, not once per machine.
function fetchedElsewhere(machine,now) {
  const found=new Map();
  for(const other of new Set([null,...machines().map(m=>m.name??null)])) {
    if(machineKey(other)===machineKey(machine))continue;
    for(const e of cache(other).reports??[])
      if(reportFresh(e,now)&&e.account?.id&&!(found.get(e.id)?.checkedAt>=e.checkedAt))found.set(e.id,e);
  }
  return found;
}
// Opens the browser on `machine` to sign `email` in again (the helper waits up
// to 5 minutes for it). Resolves {login:{email}} or {error}.
export async function signIn(machine,email) {
  try {
    const source=await readTextFile(`${appHome()}/mods/custom-usage/bridge.cjs`);
    if(!source) return {error:'The usage bridge is missing. Reinstall the skin.'};
    const reply=await exec('node',['--input-type=commonjs','-e',source,'--',JSON.stringify({action:'login',email})],{on:machine??null,timeout:320000});
    const result=JSON.parse(reply.stdout);
    // New tokens: the cached reports are stale, whoever collects next (even a
    // reopened dialog) must not wait out the TTL.
    if(result?.login){const current=cache(machine);if(current.at)setShared(key(machine,'cache'),{...current,at:0});}
    return result?.login||result?.error?result:{error:'Sign-in did not finish.'};
  } catch { return {error:'Sign-in did not finish.'}; }
}
// Opens a page in a private browser window on this computer, so the person can sign in
// there as whichever of their accounts they mean. Chrome first, then Edge (Windows), then
// Chrome on macOS/Linux. Resolves false when none started; the caller opens it normally.
export async function openPrivate(url) {
  if(!/^https:\/\/[\w.-]+\/[\w#/?=.-]*$/.test(url))return false;
  // Windows: Start-Process finds browsers by their registered name; the URL is checked above
  // (no quotes or spaces), so it is safe inside the single-quoted argument.
  const windows=(browser,flag)=>['powershell.exe',['-NoProfile','-NonInteractive','-Command',
    `try { Start-Process ${browser} -ArgumentList '${flag}','${url}' -ErrorAction Stop } catch { exit 1 }`]];
  const tries=[windows('chrome','--incognito'),windows('msedge','--inprivate'),
    ['open',['-na','Google Chrome','--args','--incognito',url]],['google-chrome',['--incognito',url]],['chromium',['--incognito',url]]];
  for(const [command,args] of tries) {
    try{const r=await exec(command,args,{timeout:10000});if(r.code===0)return true;}catch{}
  }
  return false;
}
// Uses one limit reset (Claude or Codex) for one account. Resolves {result} or {error}; never retried here.
export async function claimReset(machine,{provider,accountId,organizationId,grantId,automatic,entry}) {
  const epoch=generation(),alive=()=>usageEnabled()&&generation()===epoch&&preferences(machine).enabled;
  const current=()=>alive()&&(!automatic||automaticCurrent(machine,entry,epoch,automatic));
  if(!current())return {obsolete:true};
  try {
    const source=await readTextFile(`${appHome()}/mods/custom-usage/bridge.cjs`);
    if(!source) return {error:'The usage bridge is missing. Reinstall the skin.'};
    if(!current())return {obsolete:true};
    const target=entry??(cache(machine).reports??[]).find(e=>e.sourceId===provider&&e.account?.id===accountId&&(e.account?.organizationId??null)===(organizationId??null));
    const admission={provider,accountId,organizationId,windows:resetWindows(target)};
    const activeKey=`custom.usage.reset-active.${resetAccount(provider,accountId,organizationId)}`;
    const fence=manualFence(provider,accountId,organizationId);
    const pending=()=>({error:'A reset is already pending. Refresh usage before trying again.'});
    if(shared(activeKey)?.until>Date.now()||(fence!==true&&!fence?.finishedAt&&fence?.until>Date.now()))return pending();
    const reservation=await resetJournal({...admission,action:'reserve',automatic:Boolean(automatic),startedAt:target?.actionRead?.startedAt});
    if(!reservation.requestId&&(automatic||reservation.blocked===true||reservation.unhealthy!==true))return pending();
    const journalled=Boolean(reservation.requestId),requestId=reservation.requestId??`herdr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,14)}`;
    if(journalled)setShared('custom.usage.reset-journal-active',true);
    if(!current()) {if(journalled)await resetJournal({...admission,action:'finish',requestId});return {obsolete:true};}
    // A confirmed manual click must not depend on local journal health. Its
    // persisted fence still forbids automatic use until a later real recovery.
    if(!journalled)beginManualFence(machine,admission,requestId);
    setShared(activeKey,{id:requestId,until:Date.now()+300000});
    let result;
    try {
      const reply=await exec('node',['--input-type=commonjs','-e',source,'--',JSON.stringify({action:provider==='codex'?'codex-reset':'claude-reset',accountId,organizationId,grantId,requestId,automatic})],{on:machine??null,timeout:120000});
      result=reply.code===0?JSON.parse(reply.stdout):{error:'The reset did not finish. Check usage before trying again.'};
    } finally {
      if(journalled)await resetJournal({...admission,action:'finish',requestId,outcome:result?.result==='reset'?'reset':'unknown'});
      else finishManualFence(admission,requestId);
      if(shared(activeKey)?.id===requestId)setShared(activeKey,null);
    }
    // Report the confirmed irreversible fact even if consent changed after dispatch.
    // The one admitted request owns this notification; obsolete results still cannot refresh.
    if(automatic&&result?.result==='reset')try{notify({title:'Automatic reset used',
      body:`${machine??'This computer'} · ${provider==='claude'?'Claude':'Codex'} · ${entry?.account?.email??entry?.account?.label??accountId} · ${automatic.label}`,level:'success'});}catch{}
    if(!alive())return {obsolete:true};
    if(['error','unavailable'].includes(result?.validationReport?.status)&&entry) {
      const cached=cache(machine),live=(cached.reports??[]).find(e=>e.id===entry.id),read=entry.actionRead;
      // Same enable epoch is insufficient: a later collector may have replaced
      // this account or taken ownership, even if it failed or its lease expired.
      if(!read?.request||live?.sourceId!==provider||live?.account?.id!==accountId||
        (live?.account?.organizationId??null)!==(organizationId??null)||
        live.actionRead?.request!==read.request||live.actionRead?.machine!==machine||live.actionRead?.epoch!==epoch||
        cached.loading||(cached.collectionRequest??cached.request??read.request)!==read.request)return {obsolete:true};
      setShared(key(machine,'cache'),{...cached,reports:(cached.reports??[]).map(e=>e.id!==entry.id?e:{...e,actionRead:null,report:result.validationReport,
        lastSuccessful:usable(e)?{fetchedAt:e.fetchedAt,report:e.report}:e.lastSuccessful})});
    }
    if(result?.result){const cached=cache(machine);if(cached.at)setShared(key(machine,'cache'),{...cached,at:0});}
    return result?.result||result?.error?{...result,epoch}:{error:'The reset did not finish. Nothing was claimed.'};
  } catch { return current()?{error:'The reset did not finish. Check usage before trying again.'}:{obsolete:true}; }
}
// Shared PR #107 continuation: wait through the old collector's complete lease,
// then force only the captured account, never the newly inspected account/machine.
export async function refreshAfterReset(machine,cx,reportId,epoch) {
  const attempts=Math.ceil(REFRESH_TIMEOUT/500),options={force:true,reportId,signedIn:true,accountOnly:true,epoch};
  for(let i=0;i<=attempts&&refresh(machine,cx,options)===false;i++)await cx.sleep(500);
  for(let i=0;i<=attempts&&cache(machine).loading&&(cache(machine).generation??0)===epoch;i++)await cx.sleep(500);
}
// missing: the session's account has no report yet (a login saved since the
// last collection). Skip the TTL wait; fresh reports are still reused, so only
// the new account is asked about.
// signedIn: a browser sign-in just finished. The browser holds focus then, so
// collect anyway; returns false when another collection is still running.
// Reset continuations keep the captured enable epoch and one account's scope;
// ordinary Claude card refreshes still collect all of that provider's accounts.
export function refresh(machine,cx,{force=false,reportId,missing=false,signedIn=false,accountOnly=false,epoch:expectedEpoch}={}) {
  if(!usageEnabled() || (expectedEpoch!==undefined&&expectedEpoch!==generation()) || !(signedIn||appWindow()?.active) || !preferences(machine).enabled) return true;
  const epoch=generation(),previous=cache(machine),now=Date.now();
  if(previous.loading && now-previous.started<REFRESH_TIMEOUT) return false;
  // Reused accounts (or accounts untouched by a scoped refresh) keep their
  // original fetch time. A recent collector completion must not postpone them.
  const expired=(previous.reports??[]).some(e=>usable(e)&&!reportFresh(e,now));
  if(!force && !missing && previous.at && now-previous.at<TTL && (previous.error||!expired)) return;
  const request=`${now}-${Math.random()}`;
  // Claude's card represents the provider, including accounts hidden by its picker.
  // Keep reportId as the feedback owner, but collect/merge all Claude identities.
  const sourceId=!accountOnly&&reportId&&(previous.reports??[]).find(e=>e.id===reportId)?.sourceId==='claude'?'claude':null;
  // A manual refresh asks the provider again, except inside its Retry-After window:
  // asking then only prolongs the limit. The collector compares with its own clock.
  const reuse=force?new Map():fetchedElsewhere(machine,now),hold={};
  for(const e of previous.reports??[]) {
    // An older reused account becoming due must not re-request healthy siblings.
    if(!force&&reportFresh(e,now)&&e.account?.id&&!(reuse.get(e.id)?.checkedAt>=e.checkedAt))reuse.set(e.id,e);
    if(e.report?.retryAt)hold[e.id]=e.report.retryAt;
  }
  // Consented accounts must be read on this machine; cross-host reuse stays display-only.
  const p=preferences(machine);
  if(p.automaticReset)for(const [id,entry] of reuse)if(resetTypes(entry).some(type=>p.resetSelections.includes(type.key)))reuse.delete(id);
  setShared(key(machine,'cache'),{...previous,version:VERSION,generation:epoch,request,collectionRequest:request,started:now,loading:true,reportId:reportId??null});
  cx.spawn(async cx=>{
    let result;
    try {
      const source=await readTextFile(`${appHome()}/mods/custom-usage/bridge.cjs`);
      if(!source) throw Error('The usage bridge is missing. Reinstall the skin.');
      if(!usageEnabled() || generation()!==epoch || !preferences(machine).enabled)return;
      const reply=await exec('node',['--input-type=commonjs','-e',source,'--',JSON.stringify({refresh:force,reportId:sourceId?undefined:reportId,sourceId:sourceId??undefined,hold,reuse:[...reuse.keys()]})],{on:machine??null,timeout:120000});
      if(reply.code!==0) throw Error('Usage requires Node on the selected machine. Its agents and daemons were not restarted.');
      result=JSON.parse(reply.stdout);
      if(result.error) throw Error(result.error);
      if(!Array.isArray(result.reports)) throw Error('Unsupported usage response.');
    } catch(e) { result={error:String(e.message??e)}; }
    const current=cache(machine);
    if(!usageEnabled() || generation()!==epoch || current.request!==request || !preferences(machine).enabled) return;
    // checkedAt is this app's clock at the real fetch; a failed account keeps
    // its last good numbers for the "Last known usage" card.
    const before=new Map((current.reports??[]).map(e=>[e.id,e]));
    const fetched=result.error?[]:result.reports.filter(r=>sourceId?r.sourceId===sourceId:reportId?r.id===reportId:true).map(r=>{
      const old=before.get(r.id),other=reuse.get(r.id);
      if(r.report?.status==='reused'&&other)return {...r,account:other.account,fetchedAt:other.fetchedAt,checkedAt:other.checkedAt,report:other.report};
      if(usable(r))return {...r,checkedAt:Date.now(),actionRead:{machine,epoch,request,startedAt:now,receivedAt:Date.now()}};
      const last=usable(old)?{fetchedAt:old.fetchedAt,report:old.report}:old?.lastSuccessful;
      return last?{...r,lastSuccessful:last}:r;
    });
    const reports=result.error ? current.reports??[] : sourceId
      ? [...(current.reports??[]).flatMap(e=>e.sourceId===sourceId?fetched.filter(r=>r.id===e.id):[e]),...fetched.filter(r=>!before.has(r.id))]
      : reportId
      ? (current.reports??[]).some(e=>e.id===reportId)
        ? current.reports.map(e=>e.id===reportId?(fetched.find(r=>r.id===reportId)??e):e)
        : [...(current.reports??[]),...fetched]
      : fetched;
    // Old Claude IDs predate organization-aware saved accounts. Migrate a pin
    // only when its former identity has exactly one unambiguous successor.
    if(!result.error&&(!reportId||sourceId)) {
      const p=preferences(machine),pins=p.pins.map(pin=>{
        try {const [id,window]=JSON.parse(pin),matches=reports.filter(e=>e.previousId===id);return matches.length===1?JSON.stringify([matches[0].id,window]):pin;}catch{return pin;}
      });
      if(JSON.stringify(pins)!==JSON.stringify(p.pins))updatePreferences(machine,{pins});
    }
    setShared(key(machine,'cache'),{version:VERSION,reports,collectionRequest:request,at:Date.now(),loading:false,error:result.error??null});
    cx.notify();
    await evaluateAutomatic(machine,cx,fetched,epoch);
  });
}
