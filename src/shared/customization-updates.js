import { exec, appHome, shared, setShared, checking } from './host.js';
import { CUSTOMIZATION_UPDATE_KEY, updateProjection, updateAvailable, customizationRowState } from './customization-update-model.js';

export const customizationUpdateSnapshot = () => shared(CUSTOMIZATION_UPDATE_KEY) || null;
export const customizationUpdateAvailable = () => updateAvailable(customizationUpdateSnapshot());
// Public invalidations are hints only. Neither URLs nor revisions cross this boundary.
const HINTS_KEY = 'custom.git.webhook-events';
function hintRecord(owner) {
  const record = shared(HINTS_KEY);
  if (!owner.customUpdateHint?.enabled || shared('custom.plugins')?.git?.enabled === false ||
      record?.version !== 1 || !record.active || typeof record.generation !== 'string' || record.generation.length > 200 ||
      !Number.isSafeInteger(record.ready) || record.ready < 0) return null;
  return record;
}
function wakeCustomizationHints(owner, cx) {
  const hint = owner.customUpdateHint;
  if (!hint?.pending || hint.timer || checking() || owner.customUpdateClosed) return;
  const record = hintRecord(owner);
  if (!record?.connected || record.generation !== hint.generation) { hint.pending = null; return; }
  const snapshot = customizationUpdateSnapshot();
  // Completion/shared publication wakes us; never poll an updater or start another launch.
  if (owner.customUpdatePending || snapshot?.launch || snapshot?.job?.state === 'running') return;
  const due = Math.max(hint.retryAt || 0, Math.min(hint.lastAt + 1000, hint.firstAt + 3000));
  const timer = hint.timer = {};
  cx.timer.after(Math.max(1, due - Date.now()), cx => {
    if (hint.timer !== timer) return;
    hint.timer = null;
    if (!hint.pending || owner.customUpdateClosed || checking()) return;
    const current = hintRecord(owner);
    if (!current?.connected || current.generation !== hint.generation) { hint.pending = null; return; }
    const latest = customizationUpdateSnapshot();
    if (owner.customUpdatePending || latest?.launch || latest?.job?.state === 'running') return;
    const deadline = Math.max(hint.retryAt || 0, Math.min(hint.lastAt + 1000, hint.firstAt + 3000));
    if (deadline > Date.now()) { wakeCustomizationHints(owner, cx); return; }
    refreshCustomizationUpdates(owner, cx, 'check', false, 'webhook');
  });
}
export function syncCustomizationUpdateHints(owner, cx, { enabled = true } = {}) {
  const hint = owner.customUpdateHint ??= { marker: undefined };
  hint.enabled = enabled;
  if (checking() || owner.customUpdateClosed || !enabled || shared('custom.plugins')?.git?.enabled === false) {
    hint.pending = null; hint.timer = null; hint.marker = undefined; return;
  }
  const record = hintRecord(owner), push = record?.repositories?.['timurproko/herdr-app']?.push;
  const marker = record ? JSON.stringify([record.generation, record.ready, Number.isSafeInteger(push) && push > 0 ? push : 0]) : null;
  const previous = hint.marker;
  hint.marker = marker;
  if (hint.generation !== record?.generation) { hint.pending = null; hint.timer = null; }
  hint.generation = record?.generation;
  // Ignore a persisted record on first observation. A fresh ready counter catches up.
  if (previous === undefined) return;
  if (!record?.connected) { hint.pending = null; hint.timer = null; return; }
  if (marker !== previous && record.ready > 0) {
    if (!hint.pending) { hint.firstAt = Date.now(); hint.retryAt = 0; }
    hint.lastAt = Date.now(); hint.pending = marker;
  }
  wakeCustomizationHints(owner, cx);
}
async function request(owner, action, force = false, reason = null) {
  const reply = await exec('node', [`${appHome()}/mods/${owner.customUpdateMod}/update-worker.cjs`, JSON.stringify({ action, home: appHome(), force, ...(reason ? { reason } : {}) })], { on: null, timeout: 22000 });
  let value;
  try { value = JSON.parse(reply.stdout); } catch { throw Error('Update status unavailable. Check now.'); }
  if (reply.code !== 0 || value.error) throw Error(value.error || 'Update status unavailable. Check now.');
  return value;
}
const observesLaunch = (snapshot, launch) => Boolean(snapshot?.job &&
  ((snapshot.job.token && snapshot.job.token !== launch.previousToken) || snapshot.job.started >= launch.started));

export function refreshCustomizationUpdates(owner, cx, action = 'status', force = false, reason = null) {
  if (checking() || owner.customUpdateClosed || owner.customUpdatePending) return;
  owner.customUpdatePending = action; owner.customUpdateError = null;
  const hint = reason === 'webhook' ? owner.customUpdateHint : null, signal = hint?.pending;
  let deferred = false;
  const before = customizationUpdateSnapshot(), ticket = (before?.request || 0) + 1;
  // Launch intent must survive before exec returns: deployment can replace this
  // copy before its receipt. The transport bound becomes unknown, never success.
  const launch = action === 'launch' ? { ticket, started: Date.now(), deadline: Date.now() + 22000, previousToken: before?.job?.token || null } : before?.launch;
  setShared(CUSTOMIZATION_UPDATE_KEY, { ...before, request: ticket,
    ...(action === 'launch' ? { resume: owner.settingsOpening ? { opening: owner.settingsOpening, started: launch.started } : null } : {}),
    ...(launch ? { launch } : {}), ...(action === 'check' ? { checking: true } : {}) });
  // Shared tickets reject pre-launch/older reads across independent mod copies.
  // A launch receipt may still settle its intent after a newer empty status read.
  const publish = snapshot => {
    const current = customizationUpdateSnapshot();
    if (owner.customUpdateClosed || ticket < (current?.launch?.ticket || 0) ||
        (ticket < (current?.observed || 0) && !(action === 'launch' && current?.launch?.ticket === ticket)) ||
        (launch && action !== 'launch' && !current?.launch && !observesLaunch(snapshot, launch))) return false;
    const pending = current?.launch;
    setShared(CUSTOMIZATION_UPDATE_KEY, { ...updateProjection(snapshot), request: current?.request,
      resume: current?.resume || null, observed: Math.max(ticket, current?.observed || 0),
      ...(pending && action !== 'launch' && !observesLaunch(snapshot, pending) ? { launch: pending } : {}) });
    return true;
  };
  cx.notify();
  cx.spawn(async cx => {
    let checkedCurrent = false;
    try {
      let snapshot = await request(owner, action, force, reason);
      if (hint && snapshot.retryAfter > Date.now()) { hint.retryAt = snapshot.retryAfter; deferred = true; }
      if (!publish(snapshot)) return;
      // A successful deploy needs a fresh main check, including after a reload.
      // Failed checks persist an attempt time so a visible page cannot retry-loop.
      const latest = snapshot.job || snapshot.lastRun;
      if (!customizationUpdateSnapshot()?.launch && ['complete', 'partial'].includes(latest?.state) && (snapshot.check?.attempted || 0) < latest.finished) {
        owner.customUpdatePending = 'check'; cx.notify();
        snapshot = await request(owner, 'check');
        if (!publish(snapshot)) return;
      }
      const completed = customizationRowState(customizationUpdateSnapshot());
      checkedCurrent = completed.current && completed.enabled;
    } catch (error) {
      const failedAction = owner.customUpdatePending;
      const previous = customizationUpdateSnapshot();
      if (owner.customUpdateClosed || ticket < (previous?.observed || 0) || ticket < (previous?.launch?.ticket || 0)) return;
      owner.customUpdateError = failedAction === 'check' ? 'Check failed. Try again.' : error.message;
      setShared(CUSTOMIZATION_UPDATE_KEY, { ...previous, observed: ticket, checking: false,
        ...(failedAction === 'launch' ? { launch: null } : {}),
        ...(failedAction === 'check' ? { check: { ...previous?.check, error: 'Check failed. Try again.' } } : {}),
        ...(failedAction === 'launch' ? { locked: true, job: { state: 'unknown' }, details: null, log: previous?.log || `${appHome()}/.customizations/update.log` } : {}) });
    } finally {
      // Do not let a later status reload revive a failed/unknown requested check
      // using its old timestamp and an unchanged cached current result.
      if (!checkedCurrent) owner.customUpdateAsked = null;
      owner.customUpdatePending = null;
      if (hint && !deferred && hint.pending === signal) hint.pending = null;
      wakeCustomizationHints(owner, cx);
      cx.notify();
    }
  });
}
export function initCustomizationUpdates(owner, cx, mod, { chrome = false } = {}) {
  owner.customUpdateMod = mod;
  if (checking()) return;
  refreshCustomizationUpdates(owner, cx, chrome ? 'check' : 'status');
  if (chrome) cx.timer.every(3600000, cx => refreshCustomizationUpdates(owner, cx, 'check'));
  else cx.timer.every(1000, cx => {
    if (owner.section !== 'updates') return;
    const snapshot = customizationUpdateSnapshot();
    if (snapshot?.launch && snapshot.launch.deadline < Date.now()) { cx.notify(); return; }
    if (snapshot?.job?.state === 'running' || snapshot?.checking || snapshot?.launch) refreshCustomizationUpdates(owner, cx);
  });
}
