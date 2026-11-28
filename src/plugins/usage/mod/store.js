import { shared, setShared, exec, readTextFile, appHome, machines, window as appWindow } from './host.js';
import { machineKey, prefs, TTL, REFRESH_TIMEOUT, reportFresh } from './model.js';
import { pluginIsEnabled } from './plugins.js';
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
  if(!pluginIsEnabled('usage'))return;
  setShared(key(machine,'preferences'),{...preferences(machine),...change});
  if(change.enabled===false) setShared(key(machine,'cache'),{...cache(machine),loading:false,request:null});
}
const usable = entry => entry?.report?.status==='available';
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
export async function claimReset(machine,{provider,accountId,organizationId,grantId}) {
  const epoch=generation(),current=()=>pluginIsEnabled('usage')&&generation()===epoch&&preferences(machine).enabled;
  if(!current())return {obsolete:true};
  try {
    const source=await readTextFile(`${appHome()}/mods/custom-usage/bridge.cjs`);
    if(!source) return {error:'The usage bridge is missing. Reinstall the skin.'};
    if(!current())return {obsolete:true};
    const requestId=`herdr-${Date.now().toString(36)}-${Math.random().toString(36).slice(2,10)}`;
    const reply=await exec('node',['--input-type=commonjs','-e',source,'--',JSON.stringify({action:provider==='codex'?'codex-reset':'claude-reset',accountId,organizationId,grantId,requestId})],{on:machine??null,timeout:60000});
    const result=JSON.parse(reply.stdout);
    if(!current())return {obsolete:true};
    if(result?.result){const cached=cache(machine);if(cached.at)setShared(key(machine,'cache'),{...cached,at:0});}
    return result?.result||result?.error?{...result,epoch}:{error:'The reset did not finish. Nothing was claimed.'};
  } catch { return current()?{error:'The reset did not finish. Check usage before trying again.'}:{obsolete:true}; }
}
// missing: the session's account has no report yet (a login saved since the
// last collection). Skip the TTL wait; fresh reports are still reused, so only
// the new account is asked about.
// signedIn: a browser sign-in just finished. The browser holds focus then, so
// collect anyway; returns false when another collection is still running.
// Reset continuations keep the captured enable epoch and one account's scope;
// ordinary Claude card refreshes still collect all of that provider's accounts.
export function refresh(machine,cx,{force=false,reportId,missing=false,signedIn=false,accountOnly=false,epoch:expectedEpoch}={}) {
  if(!pluginIsEnabled('usage') || (expectedEpoch!==undefined&&expectedEpoch!==generation()) || !(signedIn||appWindow()?.active) || !preferences(machine).enabled) return true;
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
  setShared(key(machine,'cache'),{...previous,version:VERSION,generation:epoch,request,started:now,loading:true,reportId:reportId??null});
  cx.spawn(async cx=>{
    let result;
    try {
      const source=await readTextFile(`${appHome()}/mods/custom-usage/bridge.cjs`);
      if(!source) throw Error('The usage bridge is missing. Reinstall the skin.');
      if(!pluginIsEnabled('usage') || generation()!==epoch || !preferences(machine).enabled)return;
      const reply=await exec('node',['--input-type=commonjs','-e',source,'--',JSON.stringify({refresh:force,reportId:sourceId?undefined:reportId,sourceId:sourceId??undefined,hold,reuse:[...reuse.keys()]})],{on:machine??null,timeout:120000});
      if(reply.code!==0) throw Error('Usage requires Node on the selected machine. Its agents and daemons were not restarted.');
      result=JSON.parse(reply.stdout);
      if(result.error) throw Error(result.error);
      if(!Array.isArray(result.reports)) throw Error('Unsupported usage response.');
    } catch(e) { result={error:String(e.message??e)}; }
    const current=cache(machine);
    if(!pluginIsEnabled('usage') || generation()!==epoch || current.request!==request || !preferences(machine).enabled) return;
    // checkedAt is this app's clock at the real fetch; a failed account keeps
    // its last good numbers for the "Last known usage" card.
    const before=new Map((current.reports??[]).map(e=>[e.id,e]));
    const fetched=result.error?[]:result.reports.filter(r=>sourceId?r.sourceId===sourceId:reportId?r.id===reportId:true).map(r=>{
      const old=before.get(r.id),other=reuse.get(r.id);
      if(r.report?.status==='reused'&&other)return {...r,account:other.account,fetchedAt:other.fetchedAt,checkedAt:other.checkedAt,report:other.report};
      if(usable(r))return {...r,checkedAt:Date.now()};
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
    setShared(key(machine,'cache'),{version:VERSION,reports,at:Date.now(),loading:false,error:result.error??null});
    cx.notify();
  });
}
