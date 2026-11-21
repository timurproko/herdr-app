// Herdr removes zero-tab spaces. A terminal-free mod tab keeps them alive through
// process exits too, using only public commands. Never starts or replaces a shell.
import { spaces, panes, machines, focused, run, notify, shared, setShared } from './host.js';
import { spacePreferences } from './space-preferences.js';
import { rememberSpaceDirectory } from './directory.js';
export const START_MOD = 'custom-space-start';
const PENDING = 'custom.spaces.start-pending';
const RETRY_MS = 5000, PREPARE_TIMEOUT_MS = 10000;
const waiting = new Map();
export function isStartTab(tab, allPanes = panes()) {
  const members = allPanes.filter(p => p.tab === tab.id);
  return members.length === 1 && members[0].mod === START_MOD;
}
// Firstmate's hc backend puts each worker terminal in a space it names itself
// (`herdr.space=fm-<home>`), and Herdr adopts that id. Nobody opened such a space, so
// it is never retained: it gets no Start page, and goes when its last terminal does.
export function isAutomaticSpace(space) {
  return /^fm-[A-Za-z0-9._-]+$/.test(String(space?.id ?? '').split('/').at(-1));
}
export function workTabs(space, allPanes = panes()) {
  return (space.tabs ?? []).filter(tab => !isStartTab(tab, allPanes));
}
function pendingRequests() {
  const value = shared(PENDING);
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}
function clearPending(id) {
  const value = pendingRequests();
  if (!Object.hasOwn(value, id)) return;
  const next = { ...value }; delete next[id];
  setShared(PENDING, next);
}
function machineReady(space) {
  return machines().some(m => m.name === (space.machine ?? null) && m.layout === 'ready');
}
function restoreSelection(previous, space, tab) {
  if (tab && spaces().some(s => s.id === space && s.tabs.some(t => t.id === tab))) run('tab.select', { id: tab });
  if (previous?.tab && spaces().some(s => s.id === previous.space && s.tabs.some(t => t.id === previous.tab))) {
    if (previous.tab !== tab) run('tab.select', { id: previous.tab });
    if (previous.pane && panes().some(p => p.pane === previous.pane && p.tab === previous.tab)) run('pane.focus', { pane: previous.pane });
  }
}
export function ensureSpaceStart(spaceId) {
  const space = spaces().find(s => s.id === spaceId);
  if (!space || !machineReady(space)) return false;
  rememberSpaceDirectory(space);
  if (space.tabs.some(tab => isStartTab(tab))) { clearPending(space.id); return true; }
  const now = Date.now(), pending = pendingRequests(), lease = pending[space.id];
  // run() queues a command; spaces()/panes() can still be the old snapshot.
  // Share a short lease across mod copies so that they don't create duplicates.
  if (lease?.machine === (space.machine ?? null) && lease.until > now) return false;
  const next = Object.fromEntries(Object.entries(pending).filter(([, value]) => value?.until > now));
  next[space.id] = { machine: space.machine ?? null, at: now, until: now + RETRY_MS };
  setShared(PENDING, next);
  const previous = focused(), tab = space.tabs.find(t => t.active)?.id;
  try {
    run('tab.new', { space: space.id, mod: START_MOD, name: 'Start', props: { spaceId: space.id } });
    const updated = spaces().find(s => s.id === spaceId), start = updated?.tabs.find(t => isStartTab(t));
    if (!start) return false; // Pending, not a failure. Observe the next host snapshot.
    clearPending(space.id);
    run('tab.move', { id: start.id, index: updated.tabs.length });
    if (workTabs(updated).length) run('tab.settle', { id: start.id });
    return true;
  } catch (error) {
    clearPending(space.id);
    throw error;
  } finally { restoreSelection(previous, space.id, tab); }
}
export function reconcileSpaceStarts() {
  const prefs = spacePreferences(), snapshot = spaces(), issues = [], now = Date.now();
  for (const id of waiting.keys()) if (prefs.closeOnLastTab || !snapshot.some(s => s.id === id)) waiting.delete(id);
  for (const initial of snapshot) {
    if (!machineReady(initial)) { waiting.delete(initial.id); continue; }
    const state = waiting.get(initial.id) ?? { since: now, reported: false, retryAt: 0 };
    if (state.retryAt > now) continue;
    const automatic = isAutomaticSpace(initial), closeOnLastTab = prefs.closeOnLastTab || automatic;
    try {
      if (!closeOnLastTab && !ensureSpaceStart(initial.id)) {
        // Creation or pane publication is still in flight. Offline/removed spaces
        // are ordinary lifecycle changes, not customization failures.
        const live = spaces().find(s => s.id === initial.id);
        if (!live || !machineReady(live)) { waiting.delete(initial.id); continue; }
        waiting.set(initial.id, state);
        if (!state.reported && now - state.since >= PREPARE_TIMEOUT_MS) {
          state.reported = true;
          issues.push({ spaceId: initial.id, message: 'The Start page did not appear after 10 seconds. Existing tabs were left untouched; check the machine connection or customization errors.' });
        }
        continue;
      }
      waiting.delete(initial.id);
      const space = spaces().find(s => s.id === initial.id);
      if (!space) continue;
      const allPanes = panes(), starts = space.tabs.filter(t => isStartTab(t, allPanes)), work = workTabs(space, allPanes);
      if (automatic && starts.length && !work.length) {
        // A Start page left alone in an automatic space (one prepared before this rule,
        // or by a manual close) is the last tab: closing it lets Herdr remove the space.
        for (const tab of starts) run('tab.close', { id: tab.id, confirmed: true });
        continue;
      }
      if (!starts.length || !work.length) continue; // Never close an already-empty space on a preference change.
      // A move temporarily prepares a Start page even under auto-close. Keep it
      // until the move finishes, so extracting the final work tab cannot switch
      // spaces. The ordinary close preference resumes when the lease is cleared.
      const moving = shared('custom.tab-move.busy');
      if (closeOnLastTab && moving?.sourceSpaceId === space.id && moving.until > now) continue;
      const previous = focused(), selected = space.tabs.find(t => t.active);
      if (!closeOnLastTab && !starts.some(t => !t.settled || space.tabs.at(-1)?.id !== t.id) && !starts.some(t => t.id === selected?.id)) continue;
      if (closeOnLastTab) {
        for (const tab of starts) run('tab.close', { id: tab.id, confirmed: true });
      } else {
        for (const tab of starts) {
          if (space.tabs.at(-1)?.id !== tab.id) run('tab.move', { id: tab.id, index: space.tabs.length });
          if (!tab.settled) run('tab.settle', { id: tab.id });
        }
      }
      if (selected && isStartTab(selected, allPanes)) {
        // Don't restore the invisible Start tab over work after a native exit.
        restoreSelection(previous?.space === space.id ? null : previous, space.id, work.at(-1).id);
      } else restoreSelection(previous, space.id, selected?.id);
    } catch (error) {
      state.retryAt = now + RETRY_MS;
      if (!state.reported) {
        state.reported = true;
        issues.push({ spaceId: initial.id, message: String(error.message ?? error) });
      }
      waiting.set(initial.id, state);
    }
  }
  return issues;
}
export function startSpaceLifecycle(owner, cx) {
  const tick = () => {
    if (Date.now() < (owner.spaceRetryAt ?? 0)) return;
    try {
      for (const issue of reconcileSpaceStarts()) notify({ title: 'Empty space could not be prepared', body: issue.message, level: 'error' });
      owner.spaceLifecycleError = null;
    } catch (error) {
      owner.spaceRetryAt = Date.now() + RETRY_MS;
      if (!owner.spaceLifecycleError) notify({ title: 'Empty space could not be prepared', body: String(error.message ?? error), level: 'error' });
      owner.spaceLifecycleError = error;
    }
  };
  cx.spawn(async cx => { await cx.sleep(0); tick(); });
  cx.timer.every(250, tick);
}
