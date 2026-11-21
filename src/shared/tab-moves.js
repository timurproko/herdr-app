// Domain bridge: ephemeral mod commands, never persisted mutation jobs/documents.
import { spaces, panes, machines, run, exec, appHome, hostVersion, window as appWindow, shared, setShared, notify } from './host.js';
import { ensureSpaceStart, isStartTab } from './space-lifecycle.js';

const PREFIX = 'tab-move:';
const BUSY = 'custom.tab-move.busy';
const machineOf = space => space?.machine ?? null;
const ready = space => Boolean(space) && machines().some(m => m.name === machineOf(space) && m.layout === 'ready');
const currentSpace = id => spaces().find(s => s.id === id);
const message = error => error?.message || 'Tab moving is unavailable.';
async function worker(request) {
  const result = await exec('node', [`${appHome()}/mods/custom-tabs/move-tab.cjs`, JSON.stringify(request)], {timeout: 45000});
  if (result.code !== 0) throw Error('The tab-move worker did not finish. Check the current tab location before retrying.');
  try { return JSON.parse(result.stdout); } catch { throw Error('The move result is unknown. Check the tab location before retrying.'); }
}
export function tabMoveDestinations(sourceSpaceId) {
  const source = currentSpace(sourceSpaceId);
  return source ? spaces().filter(s => machineOf(s) === machineOf(source) && s.id !== source.id) : [];
}
export async function inspectTabMove(target) {
  const space = currentSpace(target?.space), tab = space?.tabs.find(t => t.id === target?.id);
  if (!tab || !ready(space)) return {ok: false, message: 'The tab’s machine is not ready. Reconnect it before moving tabs.'};
  if (isStartTab(tab, panes())) return {ok: false, message: 'Start pages belong to their space.'};
  try { return await worker({action: 'inspect', machine: machineOf(space), appVersion: hostVersion(), sourceSpaceId: space.id, tabId: tab.id}); }
  catch (error) { return {ok: false, message: message(error)}; }
}
export function requestTabMove(target, destinationSpaceId, capability, action = 'move') {
  const space = currentSpace(target?.space);
  if (!capability?.ok || !space?.tabs.some(t => t.id === target.id) || !ready(space)) return false;
  if (action === 'move' && !tabMoveDestinations(space.id).some(s => s.id === destinationSpaceId)) return false;
  if (shared(BUSY)?.until > Date.now()) return false;
  const request = {action, machine: machineOf(space), requestId: `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`,
    expiresAt: Date.now() + 30000, appVersion: hostVersion(), coreId: capability.coreId, fingerprint: capability.fingerprint,
    sourceSpaceId: space.id, destinationSpaceId, tabId: target.id, keepSource: true};
  // nextCommand is a string channel (its ordinary args are not delivered). Carry
  // a small validated domain request, not a raw document, to the mounted Tabs owner.
  run(`custom-tabs.${PREFIX}${JSON.stringify(request)}`);
  return true;
}
async function execute(request, cx) {
  let lease = false;
  try {
    const now = Date.now();
    if (!['move', 'repair'].includes(request.action) || !Number.isFinite(request.expiresAt)
        || request.expiresAt <= now || request.expiresAt > now + 30000 || !/^[a-z0-9-]{1,100}$/i.test(request.requestId ?? '')) return;
    if (appWindow()?.active === false) return;
    const busy = shared(BUSY);
    if (busy?.until > now) {
      if (busy.requestId !== request.requestId) notify({title: 'A tab move is already running', level: 'info'});
      return;
    }
    setShared(BUSY, {requestId: request.requestId, sourceSpaceId: request.action === 'move' ? request.sourceSpaceId : null, until: now + 60000}); lease = true;
    let source = currentSpace(request.sourceSpaceId);
    if (!source?.tabs.some(t => t.id === request.tabId) || machineOf(source) !== request.machine || !ready(source)) throw Error('The clicked tab or machine is no longer available.');
    if (request.action === 'move') {
      if (!tabMoveDestinations(source.id).some(s => s.id === request.destinationSpaceId)) throw Error('The destination is no longer available.');
      // Moving is not closing: keep the source open, including its final tab,
      // without changing the person's normal close-on-last-tab preference.
      request.keepSource = true;
      if (request.keepSource) {
        for (let i = 0; i < 80 && !ensureSpaceStart(source.id); i++) {
          if (Date.now() >= request.expiresAt) throw Error('Preparing the source space timed out. No move was requested.');
          await cx.sleep(100);
        }
        source = currentSpace(source.id);
        if (!source?.tabs.some(t => isStartTab(t))) throw Error('The source Start page is not ready. No move was requested.');
      }
    }
    const reply = await worker(request);
    if (request.action === 'move' && ['moved', 'partial'].includes(reply.status)) {
      let acknowledged = false;
      for (let i = 0; i < 50; i++) {
        acknowledged = currentSpace(request.destinationSpaceId)?.tabs.some(t => t.id === request.tabId);
        if (acknowledged) break;
        await cx.sleep(100);
      }
      if (!acknowledged) throw Error('Core accepted the move, but the window has not acknowledged it. Check the tab’s location before retrying.');
      // Only an acknowledged move gets sidebar feedback, including partial label
      // success. This short-lived UI command never selects the tab/space or replays.
      run(`custom-spaces.tab-arrived:${JSON.stringify({requestId: request.requestId,
        spaceId: request.destinationSpaceId, tabId: request.tabId, expiresAt: Date.now() + 3000})}`);
      // Do not select the moved tab or switch to its destination.
    }
    if (!reply.ok || reply.status === 'partial') notify({title: reply.status === 'partial' ? 'Move metadata needs attention' : 'Tab move not completed', body: reply.message, level: 'warning', timeout: 12000});
    else if (reply.status === 'repaired') notify({title: 'Move metadata repaired', level: 'success'});
  } catch (error) { notify({title: 'Check the tab’s current location', body: message(error), level: 'warning', timeout: 12000}); }
  finally { if (lease && shared(BUSY)?.requestId === request.requestId) setShared(BUSY, null); }
}
export function routeTabMove(command, cx) {
  if (typeof command !== 'string' || !command.startsWith(PREFIX)) return false;
  if (command.length > 4096) return true;
  let request; try { request = JSON.parse(command.slice(PREFIX.length)); } catch { return true; }
  cx.spawn(async cx => { await cx.sleep(0); await execute(request, cx); });
  return true;
}
