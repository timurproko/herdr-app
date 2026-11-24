// Runtime evidence only: never binding/authorization, raw errors or portable settings.
import { shared, setShared, appHome, readTextFile, writeTextFile, checking } from '../api.js';
export const DIAGNOSTICS_KEY = 'custom.fleet.diagnostics';
export const LOG_NAME = 'fleet-verification.log';
const REASONS = new Set(['transport-error','status-timeout','status-exit','invalid-status','layout-unready','membership-incomplete',
  'no-owner','identity-mismatch','no-fleet','disabled','obsolete-generation','obsolete-identity','replaced-read','expired-read']);
const integer = value => Number.isSafeInteger(value) && value >= 0;
export const fleetGeneration = () => integer(shared('custom.fleet.generation')) ? shared('custom.fleet.generation') : 0;
export const fleetError = (reason, details = {}) => Object.assign(new Error(reason), { reason, ...details });
const entries = () => {
  const value=shared(DIAGNOSTICS_KEY);
  return value?.version===1 && value.entries && typeof value.entries==='object' && !Array.isArray(value.entries) ? value.entries : {};
};
export const fleetDiagnostic = machine => entries()[machine??'local'];
const RETRY_DELAYS=[2000,5000,15000,60000];
// Deadlines are serviced by the existing Spaces lifecycle, not another timer.
export function fleetRetry(machine) {
  const retry=fleetDiagnostic(machine)?.retry;
  return retry?.generation===fleetGeneration() && integer(retry.attempts) && retry.attempts>=1 && retry.attempts<=4 &&
    integer(retry.at) && retry.at<=Date.now() && retry.nextAt===retry.at+RETRY_DELAYS[retry.attempts-1] ? retry : null;
}
export function deferFleetRetry(machine, reset=false) {
  const prior=reset?null:fleetRetry(machine), attempts=Math.min((prior?.attempts??0)+1,4), at=Date.now();
  update(machine,{retry:{generation:fleetGeneration(),attempts,at,nextAt:at+RETRY_DELAYS[attempts-1]}});
}
export function clearFleetRetry(machine) {
  if(fleetDiagnostic(machine)?.retry)update(machine,{retry:null});
}
export function clearFleetRetries(active=null) {
  const all=entries(), obsolete=key=>!active || !active.has(key);
  if(Object.entries(all).some(([key,entry])=>entry?.retry && obsolete(key)))setShared(DIAGNOSTICS_KEY,{version:1,
    entries:Object.fromEntries(Object.entries(all).map(([key,entry])=>[key,obsolete(key)?{...entry,retry:null}:entry]))});
}
function update(machine, change) {
  const key=machine??'local', all=entries();
  const next={...all,[key]:{...all[key],...change}};
  // The runtime may outlive removed machines. Never accumulate unbounded history.
  const keys=Object.keys(next);for(const old of keys.slice(0,Math.max(0,keys.length-256)))delete next[old];
  setShared(DIAGNOSTICS_KEY,{version:1,entries:next});
}
let logQueue=Promise.resolve();
export const flushFleetLog = () => logQueue;
const safeMachine = machine => machine===null ? null : String(machine).replace(/[^a-zA-Z0-9_.-]/g,'_').slice(0,128);
async function append(line) {
  const path=`${appHome()}/.customizations/${LOG_NAME}`;
  for(let attempt=0;attempt<2;attempt++) {
    const before=await readTextFile(path);
    // All emitted fields are ASCII; character and byte bounds therefore agree.
    const prior=typeof before==='string' ? before.split('\n').filter(s=>s && /^[\x20-\x7e]+$/.test(s)).slice(-127) : [];
    prior.push(line);
    while(prior.join('\n').length+1>65536)prior.shift();
    try {await writeTextFile(path,`${prior.join('\n')}\n`,before);return;}
    catch(error) {if(attempt===1)throw error;}
  }
}
export function recordFleetFailure(machine, reason, generation, {discard=false,subject=null,code,timeout} = {}) {
  if(checking())return;
  const prior=fleetDiagnostic(machine)??{}, at=Date.now();
  const event={reason:REASONS.has(reason)?reason:'transport-error',at,generation:integer(generation)?generation:0,currentGeneration:fleetGeneration()};
  if(Number.isSafeInteger(code))event.code=code;
  if(integer(timeout) && timeout<=600)event.timeout=timeout;
  if(subject && ['parent','owner'].every(k=>typeof subject[k]==='string' && subject[k].length<=512 && !/[\x00-\x1f\x7f]/.test(subject[k])))
    event.subject={parent:subject.parent,owner:subject.owner};
  const field=discard?'lastDiscard':'lastFailure';
  // Attempts from old generations have their own last-discard slot, never current failure state.
  const logField=discard?'discardLogEpisode':'failureLogEpisode', episode=JSON.stringify([event.generation,event.reason]);
  update(machine,{[field]:event,...(!discard?{resolvedAt:null}:{}),[logField]:episode});
  if(prior[logField]===episode && !prior.logFailed)return;
  const line=JSON.stringify({at,machine:safeMachine(machine),reason:event.reason,generation:event.generation,currentGeneration:event.currentGeneration,
    ...(event.code!==undefined?{code:event.code}:{}),...(event.timeout!==undefined?{timeout:event.timeout}:{})});
  const logged=logFailed=>{if(fleetDiagnostic(machine)?.[logField]===episode)update(machine,{logFailed});};
  logQueue=logQueue.then(()=>append(line)).then(()=>logged(false),()=>logged(true));
}
export function resolveFleetFailure(machine) {
  const prior=fleetDiagnostic(machine);
  if(prior && (prior.retry || Math.max(prior.lastFailure?.at??0,prior.lastDiscard?.at??0)>(prior.resolvedAt??-1)))
    update(machine,{resolvedAt:Date.now(),retry:null,failureLogEpisode:null,discardLogEpisode:null});
}
export function fleetVerification(machine, subject) {
  const diagnostic=fleetDiagnostic(machine);
  const failure=[diagnostic?.resolvedAt?null:diagnostic?.lastFailure,diagnostic?.lastDiscard]
    .filter(event=>event && REASONS.has(event.reason) && integer(event.at) && event.at<=8640000000000000 &&
      (!diagnostic.resolvedAt || event.at>diagnostic.resolvedAt) && event.generation===fleetGeneration() && subject &&
      event.subject?.parent===subject.parent && event.subject?.owner===subject.owner)
    .sort((a,b)=>b.at-a.at)[0];
  if(!failure)return null;
  // Presentation gets only safe scalar facts, not scheduler state or arbitrary error text.
  return {reason:failure.reason,at:failure.at,generation:failure.generation,
    ...(integer(failure.timeout) && failure.timeout<=600?{timeout:failure.timeout}:{})};
}
