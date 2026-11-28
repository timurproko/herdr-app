import { exec, appHome, shared, setShared, checking, window } from './host.js';
import { CUSTOMIZATION_UPDATE_KEY, updateProjection, updateAvailable, customizationRowState, updateTarget, updateLaunchProgress, sameUpdateRun } from './customization-update-model.js';

const BUSY_CHECK_RETRY = 30000;
export const customizationUpdateSnapshot = () => shared(CUSTOMIZATION_UPDATE_KEY) || null;
export const customizationUpdateAvailable = () => updateAvailable(customizationUpdateSnapshot());
async function request(owner, action, force = false, invalidate = false, authorization = null) {
  const pending = customizationUpdateSnapshot()?.launch;
  const expiredLaunch = pending && Number.isFinite(pending.deadline) && pending.deadline < Date.now()
    ? { started: pending.started, deadline: pending.deadline, ticket: pending.ticket, previousToken: pending.previousToken } : null;
  const reply = await exec('node', [`${appHome()}/mods/${owner.customUpdateMod}/update-worker.cjs`, JSON.stringify({ action, home: appHome(), force, invalidate,
    ...(expiredLaunch ? { expiredLaunch } : {}), ...(['retry', 'recover'].includes(action) ? authorization : {}) })], { on: null, timeout: 22000 });
  let value;
  try { value = JSON.parse(reply.stdout); } catch { throw Error('Update status unavailable. Check now.'); }
  if (reply.code !== 0 || value.error) throw Error(value.error || 'Update status unavailable. Check now.');
  return value;
}
const observesLaunch = (snapshot, launch) => Boolean(snapshot?.job &&
  ((snapshot.job.token && snapshot.job.token !== launch.previousToken) || snapshot.job.started >= launch.started));

export function refreshCustomizationUpdates(owner, cx, action = 'status', force = false, invalidate = false, authorization = null) {
  if (checking() || owner.customUpdateClosed || owner.customUpdatePending) return;
  owner.customUpdatePending = action; owner.customUpdateError = null;
  if (action === 'check') owner.customUpdateOnCheck?.(cx);
  const before = customizationUpdateSnapshot(), ticket = (before?.request || 0) + 1;
  const launching = action === 'launch' || action === 'retry';
  // Launch intent must survive before exec returns: deployment can replace this
  // copy before its receipt. The transport bound becomes unknown, never success.
  const launch = launching ? { ticket, started: Date.now(), deadline: Date.now() + 22000, previousToken: before?.job?.token || null, progress: updateLaunchProgress(before) } : before?.launch;
  setShared(CUSTOMIZATION_UPDATE_KEY, { ...before, request: ticket,
    ...(launching ? { resume: owner.settingsOpening ? { opening: owner.settingsOpening, started: launch.started } : null } : {}),
    ...(launch ? { launch } : {}), ...(action === 'check' ? { checking: true } : {}) });
  // Shared tickets reject pre-launch/older reads across independent mod copies.
  // A launch receipt may still settle its intent after a newer empty status read.
  const publish = snapshot => {
    const current = customizationUpdateSnapshot();
    const cleared = action === 'recover' && authorization?.confirmedStopped && (snapshot.recovered === true ||
      (snapshot.locked === false && !snapshot.job && !snapshot.result && !snapshot.clearRecovery && !snapshot.stateError));
    const settlesRecovery = cleared && (!current?.job?.token || current.job.token === before?.job?.token || snapshot.clearedTokens?.includes(current.job.token));
    if (owner.customUpdateClosed || (cleared && !settlesRecovery) || ticket < (current?.launch?.ticket || 0) ||
        (ticket < (current?.observed || 0) && !(launching && current?.launch?.ticket === ticket) && !settlesRecovery) ||
        (launch && !launching && !current?.launch && !observesLaunch(snapshot, launch) && !settlesRecovery)) return false;
    const pending = current?.launch;
    const job = snapshot?.job;
    const prior = pending && observesLaunch(snapshot, pending) ? pending.progress
      : sameUpdateRun(current?.progress, job) ? current.progress : null;
    const progress = job?.state === 'running' ? { token: job.token, started: job.started,
      target: updateTarget(snapshot) || prior?.target || null, peerRevision: prior?.peerRevision || null } : null;
    setShared(CUSTOMIZATION_UPDATE_KEY, { ...updateProjection(snapshot), progress, request: current?.request,
      resume: cleared ? null : current?.resume || null, observed: Math.max(ticket, current?.observed || 0),
      ...(cleared ? { launch: null } : pending && !launching && !observesLaunch(snapshot, pending) ? { launch: pending } : {}) });
    return true;
  };
  cx.notify();
  cx.spawn(async cx => {
    let checkedCurrent = false;
    try {
      let snapshot = await request(owner, action, force, invalidate, authorization);
      owner.customAutoRetry = 0; owner.customAutoFailures = 0;
      if (invalidate && (snapshot.retryAfter > Date.now() || snapshot.job?.state === 'running')) {
        owner.customAutoDirty = true;
        owner.customAutoHintRetry = snapshot.job?.state === 'running'
          ? Math.max(Date.now() + BUSY_CHECK_RETRY, snapshot.retryAfter || 0) : snapshot.retryAfter;
      }
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
      if (owner.customUpdateChrome) {
        owner.customAutoFailures = Math.min(4, (owner.customAutoFailures || 0) + 1);
        owner.customAutoRetry = Date.now() + Math.min(1800000, Math.min(1800000, 300000 * 2 ** (owner.customAutoFailures - 1)) * (0.9 + Math.random() * 0.2));
      }
      const failedAction = owner.customUpdatePending;
      const previous = customizationUpdateSnapshot();
      if (owner.customUpdateClosed || ticket < (previous?.observed || 0) || ticket < (previous?.launch?.ticket || 0)) return;
      owner.customUpdateError = failedAction === 'check' ? 'Check failed. Try again.' : error.message;
      setShared(CUSTOMIZATION_UPDATE_KEY, { ...previous, observed: ticket, checking: false,
        ...(['launch', 'retry'].includes(failedAction) ? { launch: null } : {}),
        ...(failedAction === 'check' ? { check: { ...previous?.check, error: 'Check failed. Try again.' } } : {}),
        ...(['launch', 'retry'].includes(failedAction) ? { locked: true, job: { state: 'unknown' }, details: null, log: previous?.log || `${appHome()}/.customizations/update.log` } : {}) });
    } finally {
      // Do not let a later status reload revive a failed/unknown requested check
      // using its old timestamp and an unchanged cached current result.
      if (!checkedCurrent) owner.customUpdateAsked = null;
      owner.customUpdatePending = null;
      if (owner.customUpdateChrome) scheduleCustomizationCheck(owner, cx, true);
      cx.notify();
    }
  });
}
// Only automatic scheduling lives here. Neither timers nor hints can launch an
// update, and the worker remains the cross-mod/process cache and lease authority.
function scheduleCustomizationCheck(owner, cx, replace = false) {
  if (checking() || owner.customUpdateClosed || !owner.customUpdateChrome) return;
  const now = Date.now(), snapshot = customizationUpdateSnapshot();
  let due = snapshot?.check?.nextAttempt;
  if (!Number.isFinite(due) || due > now + 1800000) due = now + 120000;
  if (owner.customAutoDirty) due = snapshot?.check?.error ? due : Math.max(now + 300, (owner.customAutoStarted || 0) + 15000, owner.customAutoHintRetry || 0);
  // A running deploy cannot advance the main-check deadline. Ignore that
  // expired deadline (and hint urgency) until a bounded busy-job retry instead
  // of repeatedly spawning the worker at the 300 ms debounce minimum.
  if (snapshot?.job?.state === 'running' || snapshot?.launch) due = now + BUSY_CHECK_RETRY;
  if (snapshot?.checking) due = Math.max(due, now + 20000);
  due = Math.max(now + 300, due, owner.customAutoRetry || 0);
  if (!replace && owner.customAutoDue && owner.customAutoDue <= due) return;
  const token = owner.customAutoTimer = {};
  owner.customAutoDue = due;
  cx.timer.after(due - now, cx => {
    if (owner.customAutoTimer !== token || owner.customUpdateClosed || checking()) return;
    owner.customAutoDue = null;
    if (owner.customAutoDirty && owner.customAutoValid && !owner.customAutoValid()) {
      owner.customAutoDirty = false; owner.customAutoValid = null;
      scheduleCustomizationCheck(owner,cx,true); return;
    }
    if (owner.customUpdatePending) { scheduleCustomizationCheck(owner, cx); return; }
    const invalidate = owner.customAutoDirty === true || Date.now() - due >= 120000;
    owner.customAutoDirty = false; owner.customAutoHintRetry = 0; owner.customAutoStarted = Date.now();
    refreshCustomizationUpdates(owner, cx, 'check', false, invalidate);
  });
}
export function invalidateCustomizationUpdates(owner, cx, current = null) {
  if (checking() || owner.customUpdateClosed || !owner.customUpdateChrome) return;
  owner.customAutoDirty = true;
  owner.customAutoValid = current;
  scheduleCustomizationCheck(owner, cx);
}
export function observeCustomizationUpdates(owner, cx) {
  if (!owner.customUpdateChrome || checking()) return;
  const active = window()?.active;
  if (typeof active !== 'boolean' || active === owner.customWindowActive) return;
  const idle = owner.customInactiveSince;
  owner.customWindowActive = active;
  if (!active) owner.customInactiveSince = Date.now();
  else if (idle != null && Date.now() - idle >= 120000) {
    owner.customInactiveSince = null;
    cx.spawn(async cx => { await Promise.resolve(); invalidateCustomizationUpdates(owner, cx); });
  }
}
export function initCustomizationUpdates(owner, cx, mod, { chrome = false, onCheck = null } = {}) {
  owner.customUpdateMod = mod;
  owner.customUpdateOnCheck = onCheck;
  if (checking()) return;
  owner.customUpdateChrome = chrome;
  if (chrome) observeCustomizationUpdates(owner, cx);
  refreshCustomizationUpdates(owner, cx, chrome ? 'check' : 'status');
  if (!chrome) cx.timer.every(1000, cx => {
    if (owner.section !== 'updates') return;
    const snapshot = customizationUpdateSnapshot();
    if (snapshot?.launch && snapshot.launch.deadline < Date.now()) { cx.notify(); return; }
    if (snapshot?.job?.state === 'running' || snapshot?.checking || snapshot?.launch) refreshCustomizationUpdates(owner, cx);
  });
}
