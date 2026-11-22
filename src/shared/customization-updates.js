import { exec, appHome, shared, setShared, checking } from './host.js';
import { CUSTOMIZATION_UPDATE_KEY, updateProjection, updateAvailable } from './customization-update-model.js';

export const customizationUpdateSnapshot = () => shared(CUSTOMIZATION_UPDATE_KEY) || null;
export const customizationUpdateAvailable = () => updateAvailable(customizationUpdateSnapshot());
async function request(owner, action, force = false) {
  const reply = await exec('node', [`${appHome()}/mods/${owner.customUpdateMod}/update-worker.cjs`, JSON.stringify({ action, home: appHome(), force })], { on: null, timeout: 22000 });
  let value;
  try { value = JSON.parse(reply.stdout); } catch { throw Error('Update status unavailable. Check now.'); }
  if (reply.code !== 0 || value.error) throw Error(value.error || 'Update status unavailable. Check now.');
  return value;
}
export function refreshCustomizationUpdates(owner, cx, action = 'status', force = false) {
  if (checking() || owner.customUpdatePending) return;
  owner.customUpdatePending = action; owner.customUpdateError = null;
  if (action === 'check') setShared(CUSTOMIZATION_UPDATE_KEY, { ...customizationUpdateSnapshot(), checking: true });
  cx.notify();
  cx.spawn(async cx => {
    try {
      let snapshot = await request(owner, action, force);
      setShared(CUSTOMIZATION_UPDATE_KEY, updateProjection(snapshot));
      // A successful deploy needs a fresh main check, including after a reload.
      // Failed checks persist an attempt time so a visible page cannot retry-loop.
      if (['complete', 'partial'].includes(snapshot.job?.state) && (snapshot.check?.attempted || 0) < snapshot.job.finished) {
        owner.customUpdatePending = 'check'; cx.notify();
        snapshot = await request(owner, 'check');
        setShared(CUSTOMIZATION_UPDATE_KEY, updateProjection(snapshot));
      }
    } catch (error) {
      const failedAction = owner.customUpdatePending;
      owner.customUpdateError = failedAction === 'check' ? 'Check failed. Try again.' : error.message;
      const previous = customizationUpdateSnapshot();
      setShared(CUSTOMIZATION_UPDATE_KEY, { ...previous, checking: false,
        ...(failedAction === 'check' ? { check: { ...previous?.check, error: 'Check failed. Try again.' } } : {}),
        ...(failedAction === 'launch' ? { locked: true, job: { state: 'unknown' }, details: null, log: previous?.log || `${appHome()}/.customizations/update.log` } : {}) });
    } finally { owner.customUpdatePending = null; cx.notify(); }
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
    if (snapshot?.job?.state === 'running' || snapshot?.checking) refreshCustomizationUpdates(owner, cx);
  });
}
