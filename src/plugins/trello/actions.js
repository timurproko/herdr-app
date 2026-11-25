import {exec, appHome, checking, privateAction} from '../api.js';
const ID = /^[a-f0-9]{24}$/, REV = /^[a-f0-9]{64}$/;
const remote = 'Private Trello setup is not supported for SSH-selected machines here. Run herdr-trello setup and policy commands on that machine; no local store was accessed.';
const sessions = new WeakMap(); // Non-secret account/board hints, one mounted view/machine only.
function hints(cx) {
  if (!cx.session) return {names: new Map()};
  if (!sessions.has(cx.session)) sessions.set(cx.session, {names: new Map()});
  return sessions.get(cx.session);
}
function current(cx) {
  if (cx.machine != null) throw Error(remote);
  if (checking() || cx.isCurrent?.() === false || cx.enabled?.() === false) throw Error('Enable Trello on this computer and check setup before continuing.');
}
const safeErrors = {
  AUTH: 'Trello rejected the API key or user token. Check its expiry and generate a new token if needed.',
  FORBIDDEN: 'Trello refused this account’s access.',
  RATE_LIMIT: 'Trello rate limit. Wait for the cooldown before an explicit retry.',
  CONFLICT: 'Private Trello configuration changed. Check it again before applying this action.',
  STORE: 'Private Trello storage is missing, invalid or unsafe. Check local setup and permissions.',
  SCOPE: 'A selected board is no longer visible to this token. Refresh the board picker.',
};
function data(result) {
  if (result?.version !== 1 || result.ok !== true) throw Error(safeErrors[result?.error?.code] ?? 'Private Trello setup did not finish. Check local status before trying again.');
  const d = result.data;
  if (typeof d?.configured !== 'boolean' || !REV.test(d.revision) || typeof d.localWrites !== 'boolean' || !Number.isInteger(d.allowedBoards) || d.allowedBoards < 0 || d.allowedBoards > 100 || !Array.isArray(d.boards) || d.boards.length !== d.allowedBoards || d.boards.some(b => !ID.test(b)) || new Set(d.boards).size !== d.boards.length) throw Error('Private Trello status was invalid. Check the local installation.');
  const clean = {configured: d.configured, revision: d.revision, localWrites: d.localWrites, allowedBoards: d.allowedBoards, boards: d.boards};
  if (d.account && ID.test(d.account.id) && [d.account.username, d.account.name].every(s => typeof s === 'string' && s.length > 0 && s.length <= 256 && !/[\u0000-\u001f\u007f]/.test(s))) clean.account = {id: d.account.id, username: d.account.username, name: d.account.name};
  if (d.items !== undefined) {
    if (!Array.isArray(d.items) || d.items.length > 1000 || typeof d.complete !== 'boolean' || d.items.some(b => !ID.test(b?.id) || typeof b.label !== 'string' || b.label.length > 1024 || /[\u0000-\u001f\u007f]/.test(b.label) || typeof b.closed !== 'boolean')) throw Error('Trello board inventory was invalid.');
    clean.items = d.items.map(b => ({id: b.id, label: b.label, closed: b.closed})); clean.complete = d.complete;
  }
  return clean;
}
function remember(cx, d, reset = false) {
  const h = hints(cx);
  if (reset || h.revision && h.revision !== d.revision) { h.names.clear(); h.account = null; }
  h.revision = d.revision;
  if (d.account) h.account = d.account;
  if (d.items) for (const b of d.items) h.names.set(b.id, b.label);
  if (!d.configured) { h.names.clear(); h.account = null; }
  return h;
}
async function invoke(cx, action, expected, extra = {}) {
  current(cx);
  const d = data(await privateAction('trello', {action, expected, ...extra}, cx));
  if (cx.isCurrent?.() === false) throw Error('Settings changed before the result arrived. Check local status.');
  // Own acknowledged policy edits preserve known board names/account hints.
  const h = hints(cx); if (h.revision === expected && !['save', 'replace', 'remove'].includes(action)) h.revision = d.revision;
  remember(cx, d, ['save', 'replace', 'remove'].includes(action));
  return d;
}
export async function localStatus(cx = {}) {
  if (cx.machine != null) return {status: 'missing', detail: remote, configured: false, usable: false};
  if (checking()) return {status: 'recommended', detail: 'Private setup is checked only in the running app.', configured: false, usable: false};
  try {
    const r = await exec('node', [`${appHome()}/.customizations/runtime/lib/trello/owner.cjs`, '--status', appHome()], {timeout: 30000});
    const d = data(JSON.parse(r.stdout));
    if (cx.isCurrent?.() === false) return {status: 'missing', detail: 'Settings changed. Check again.', usable: false};
    const h = remember(cx, d), saved = h.account ? `Saved · ${h.account.name} (@${h.account.username})` : 'Credentials saved';
    return {...d, status: d.configured && d.allowedBoards ? 'ready' : 'missing', usable: d.configured,
      detail: !d.configured ? 'Enter an API key and user token below, then choose allowed boards.' : `${saved} · ${d.allowedBoards} allowed boards · ${d.localWrites ? 'Local writes permitted' : 'Local read-only policy'}.`};
  } catch (e) { return {status: 'error', detail: e instanceof SyntaxError ? 'Install the Trello runtime through normal full deployment.' : (Object.values(safeErrors).includes(e?.message) ? e.message : 'Local Trello status could not be read. Check Node.js and protected setup.'), configured: false, usable: false}; }
}
export async function credentialAction(cx, values, item, action) {
  try {
    const d = await invoke(cx, action, item.revision, values);
    return {detail: action === 'remove' ? 'Saved credentials removed; board scope and local writes cleared. This does not revoke the token at Trello.'
      : `Saved · ${d.account?.name ?? 'Verified account'}${d.account ? ` (@${d.account.username})` : ''}${action === 'replace' ? ' · Board scope and local writes cleared' : ''}.`};
  } catch (e) { return {detail: e.message}; } // Only our own sanitized errors, never provider/worker text.
}
export async function boardCheck(cx) {
  const d = await localStatus(cx), h = hints(cx);
  return {...d, statusLabel: d.configured ? `${d.allowedBoards} allowed` : null,
    rows: (d.boards ?? []).map(id => ({id, label: h.names.get(id) ?? `Saved board ${id}`})),
    detail: cx.machine != null ? remote : d.configured ? 'Only these boards are available to agents. Add boards by name; Remove revokes that board’s local permission.' : 'Save credentials above before choosing boards.'};
}
export async function boardCandidates(cx) {
  const saved = cx.result?.('boards');
  const d = await invoke(cx, 'discover', saved?.revision);
  const allowed = new Set(d.boards), items = d.items.filter(b => !allowed.has(b.id)).map(b => ({id: b.id, label: b.label, ...(b.closed ? {detail: 'Closed board'} : {})}));
  const candidates = new Set(items.map(b => b.id));
  return {items, detail: d.complete ? null : 'Board discovery reached its safety bound; this list is incomplete. Existing unseen permissions are retained.',
    add: async (currentContext, ids) => {
      if (!Array.isArray(ids) || ids.some(id => !candidates.has(id))) throw Error('Invalid board selection.');
      await invoke(currentContext, 'policy', d.revision, {add: ids});
      return {errors: {}};
    }};
}
export async function removeBoard(cx, id) {
  const s = cx.result?.('boards');
  if (!s?.boards?.includes(id)) throw Error('Board selection changed. Check again.');
  await invoke(cx, 'policy', s.revision, {remove: [id]});
}
export function accessState(cx) {
  const s = cx.result?.('local-setup');
  return {shown: cx.machine == null && s?.configured === true, revision: s?.revision,
    value: s?.localWrites === true && cx.setting('access') === 'read-write' ? 'read-write' : 'read-only'};
}
export async function setAccess(cx, value, snapshot) {
  if (!['read-only', 'read-write'].includes(value)) throw Error('Invalid access selection.');
  const old = cx.setting('access');
  await invoke(cx, 'policy', snapshot?.revision, {allowWrites: value === 'read-write'});
  if (!cx.setSetting?.('access', value, old)) {
    // Public preference failure must not leave a newly granted private write opt-in.
    if (value === 'read-write' && cx.isCurrent?.() !== false) await invoke(cx, 'policy', hints(cx).revision, {allowWrites: false});
    throw Error('The public Access setting changed. Check private status before choosing access again.');
  }
}
