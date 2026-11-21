import {validRepository} from './ci-evidence.js';
import {validCIMessage,validConflictMessage,validMergedMessage} from './ci-message.js';
import {validCIStates,rawCIState,allowsCIState} from './ci-states.js';
export const MONITOR_ID='herdr-ci-monitor-v1';
export function validateConfig(c) {
  if(c?.version!==1||typeof c.enabled!=='boolean'||!validCIStates(c.states)||!validCIMessage(c.template)
    ||!Array.isArray(c.repositories)||c.repositories.length>32||!c.repositories.every(validRepository)
    ||new Set(c.repositories.map(s=>s.toLowerCase())).size!==c.repositories.length
    ||typeof c.coreId!=='string'||!/^[a-z0-9-]{16,80}$/i.test(c.coreId)
    ||typeof c.revision!=='string'||!/^[a-z0-9-]{1,80}$/.test(c.revision)
    ||!c.commands||['hc','gh','git'].some(k=>typeof c.commands[k]!=='string'||! /^(?:[a-z]:[\\/]|\/)/i.test(c.commands[k])||/[\u0000-\u001f]/.test(c.commands[k]))
    // Per-message switches; a config written before they existed means CI on, conflicts off.
    ||![undefined,true,false].includes(c.ciEnabled)||![undefined,true,false].includes(c.conflictEnabled)
    ||(c.conflictEnabled===true&&!validConflictMessage(c.conflictTemplate))
    ||![undefined,true,false].includes(c.mergedEnabled)||(c.mergedEnabled===true&&!validMergedMessage(c.mergedTemplate)))throw Error('Invalid background CI configuration.');
  return c;
}
export const ciMessagesOn=c=>c.ciEnabled!==false;
export const conflictMessagesOn=c=>c.conflictEnabled===true;
export const mergedMessagesOn=c=>c.mergedEnabled===true;
export function localIdentity(t) {
  const app=t?.report?.app??t?.status?.app;
  if(!/^t[a-z0-9]+$/i.test(t?.address??'')||t.state!=='live'||!app||!Number.isSafeInteger(t.created_ms)
    ||!Number.isSafeInteger(t.pid)||typeof t.cwd!=='string'||!t.cwd)return null;
  return JSON.stringify([t.address,t.created_ms,t.pid,app,t.labels?.['a1.session']??null,t.labels?.['a1.runtime']??null,t.cwd]);
}
export const targetReady=(t,c)=>Boolean(localIdentity(t))&&allowsCIState(rawCIState(t),c.states);
export const targetKey=t=>`${t.repo.toLowerCase()}#${t.number}`;
