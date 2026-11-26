import {exec, appHome, checking, privateAction} from '../api.js';
const ID = /^[a-f0-9]{24}$/, REV = /^[a-f0-9]{64}$/;
const reads = new WeakMap(); // One local service read per captured check context.
const sessions = new WeakMap(); // Non-secret account/board hints, one mounted view/machine only.
function hints(cx) {
  if (!cx.session) return {names: new Map()};
  if (!sessions.has(cx.session)) sessions.set(cx.session, {names: new Map()});
  return sessions.get(cx.session);
}
function current(cx) {
  if (cx.machine != null && !hints(cx).destination) throw Error('Check this machine first.');
  if (checking() || cx.isCurrent?.() === false || cx.enabled?.() === false) throw Error('Enable Trello and check setup first.');
}
const safeErrors = {
  INPUT: 'Enter a valid Trello API key and user token, then try again.',
  AUTH: 'Trello rejected the API key or user token. Check its expiry and generate a new token if needed.',
  FORBIDDEN: 'Trello refused this account’s access.',
  RATE_LIMIT: 'Trello rate limit. Wait for the cooldown before an explicit retry.',
  CONFLICT: 'Private Trello configuration changed. Check it again before applying this action.',
  STORE: 'Private setup is unavailable. Check permissions.',
  STORE_MISSING: 'No account added',
  STORE_MALFORMED: 'Private setup is malformed. It was not replaced.',
  STORE_PERMISSIONS: 'Private setup permissions are unsafe.',
  STORE_PERMISSION_CHECK: 'Storage permission check failed. Check ACL tooling.',
  STORE_IN_CHECKOUT: 'Private setup must be outside a Git checkout.',
  STORE_UNSAFE_PATH: 'Private setup uses an unsafe path.',
  STORE_BUSY: 'Private setup is busy. Check again.',
  STORE_IO: 'Private setup could not be read or updated.',
  PUBLIC_STATE_INVALID: 'Activation or Access could not be checked.',
  INTERNAL: 'Setup could not finish. No retry was started.',
  SSH_UNAVAILABLE: 'SSH unavailable. Check keys and host trust.',
  MACHINE_CHANGED: 'Machine changed. Check again.',
  MACHINE_IDENTITY: 'Execution user or home could not be verified.',
  MACHINE_UNSUPPORTED: 'Temporary or custom-via machine unsupported.',
  RUNTIME_PREREQUISITE: 'Node 20+ and the configured Core are required.',
  RUNTIME_MISSING: 'Install Trello on this machine.',
  RUNTIME_OUTDATED: 'Update Trello on this machine.',
  RUNTIME_CONFLICT: 'Trello runtime ownership conflict.',
  RUNTIME_BUSY: 'Trello installer is busy.',
  RUNTIME_INVALID: 'Trello runtime payload is invalid.',
  RUNTIME_PATH: 'Add the user bin to PATH first.',
  CONFIG_UNKNOWN: 'Setup outcome unknown. Check before retrying.',
  CONTROL_CONFLICT: 'Managed by another controller. Remove the account first.',
  SCOPE: 'A selected board is no longer visible to this token. Refresh the board picker.',
};
function destination(value) {
  if (!value || typeof value.id !== 'string' || typeof value.session !== 'string' || !REV.test(value.principal) || !REV.test(value.home)) return null;
  return {id: value.id, session: value.session, principal: value.principal, home: value.home};
}
function globalState(value) {
  if (!value || !['read-only','read-write'].includes(value.access) || !REV.test(value.revision) || !Array.isArray(value.pending) || value.pending.length > 256 || value.pending.some(s => typeof s !== 'string' || s.length > 256 || /[\u0000-\u001f\u007f]/.test(s))) return null;
  return {access:value.access,revision:value.revision,pending:[...value.pending]};
}
function rememberGlobal(cx, result) { const g=globalState(result?.global ?? result?.data?.global); if(g && cx.isCurrent?.() !== false) hints(cx).global=g; return g; }
function data(result) {
  if (result?.version !== 1 || result.ok !== true) {
    const error = Error(safeErrors[result?.error?.code] ?? 'Private Trello setup did not finish. Check status before trying again.');
    error.code = Object.hasOwn(safeErrors, result?.error?.code) ? result.error.code : 'INTERNAL'; throw error;
  }
  const d = result.data;
  if (typeof d?.configured !== 'boolean' || !REV.test(d.revision) || typeof d.localWrites !== 'boolean' || !Number.isInteger(d.allowedBoards) || d.allowedBoards < 0 || d.allowedBoards > 100 || !Array.isArray(d.boards) || d.boards.length !== d.allowedBoards || d.boards.some(b => !ID.test(b)) || new Set(d.boards).size !== d.boards.length) throw Error('Invalid setup status. Check the runtime.');
  const clean = {configured: d.configured, revision: d.revision, localWrites: d.localWrites, allowedBoards: d.allowedBoards, boards: d.boards};
  if (d.account && ID.test(d.account.id) && [d.account.username, d.account.name].every(s => typeof s === 'string' && s.length > 0 && s.length <= 256 && !/[\u0000-\u001f\u007f]/.test(s))) clean.account = {id: d.account.id, username: d.account.username, name: d.account.name};
  if (d.namedBoards !== undefined) {
    if (!Array.isArray(d.namedBoards) || d.namedBoards.length > 100 || d.namedBoards.some(b => !ID.test(b?.id) || !d.boards.includes(b.id) || typeof b.label !== 'string' || !b.label || b.label.length > 1024 || /[\u0000-\u001f\u007f]/.test(b.label))) throw Error('Saved board names were invalid. Check private setup.');
    clean.namedBoards = d.namedBoards.map(b => ({id: b.id, label: b.label}));
  }
  clean.namesMissing = d.namesMissing === true;
  if (['enabled','disabled','invalid'].includes(d.activation)) clean.activation=d.activation;
  if (d.destination) { clean.destination = destination(d.destination); if (!clean.destination) throw Error('Machine identity was invalid.'); }
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
  if (d.destination) h.destination = d.destination;
  if (d.account) h.account = d.account;
  if (d.items) for (const b of d.items) h.names.set(b.id, b.label);
  if (d.namedBoards) for (const b of d.namedBoards) h.names.set(b.id, b.label);
  if (!d.configured) { h.names.clear(); h.account = null; }
  return h;
}
async function invoke(cx, action, expected, extra = {}) {
  current(cx);
  const d = data(await privateAction('trello', {action, expected, ...extra}, {...cx, privateDestination: hints(cx).destination}));
  if (cx.isCurrent?.() === false) throw Error('Settings changed. Check again.');
  // Own acknowledged policy edits preserve known board names/account hints.
  const h = hints(cx); if (h.revision === expected && !['save', 'replace', 'remove'].includes(action)) h.revision = d.revision;
  remember(cx, d, ['save', 'replace', 'remove'].includes(action));
  return d;
}
async function readStatus(cx) {
  if (!reads.has(cx)) reads.set(cx, exec('node', [`${appHome()}/.customizations/runtime/lib/private-actions/trello-transport.cjs`, '--status', appHome(), JSON.stringify(cx.machine ?? null)], {timeout: 60000}).then(r => { const result=JSON.parse(r.stdout);rememberGlobal(cx,result);return result; }));
  return reads.get(cx);
}
export async function runtimeStatus(cx = {}) {
  if (checking()) return {status: 'recommended', statusLabel: 'Check in app', fix: null};
  try {
    const r = await exec('node', [`${appHome()}/.customizations/runtime/lib/private-actions/trello-transport.cjs`, '--probe', appHome(), JSON.stringify(cx.machine ?? null)], {timeout: 60000});
    const result = JSON.parse(r.stdout); rememberGlobal(cx, result);
    if (!result.ok) throw Error(safeErrors[result.error?.code] ?? 'Runtime check failed.');
    const d = result.data, binding = destination(d?.destination);
    if (!binding || !['ready', 'missing', 'outdated'].includes(d.runtime)) throw Error('Runtime check failed.');
    if (cx.isCurrent?.() === false) return {status: 'error', statusLabel: 'Check again', fix: null};
    hints(cx).destination = binding;
    const ready = d.runtime === 'ready';
    return {status: ready ? 'ready' : 'missing', statusLabel: ready ? 'Ready' : d.runtime === 'missing' ? 'Not installed' : 'Outdated',
      fix: ready ? null : {label: d.runtime === 'missing' ? 'Install' : 'Update', manual: true, requiresEnabled: true,
        run: async current => {
          const result = await privateAction('trello', {action: 'runtime.install'}, {...current, privateDestination: binding});
          if (!result?.ok) throw Error(safeErrors[result?.error?.code] ?? 'Installation failed. Check again.');
        }}};
  } catch (e) { return {status: 'error', statusLabel: 'Unavailable', detail: Object.values(safeErrors).includes(e.message) ? e.message : 'Runtime check failed.', fix: null}; }
}
export async function localStatus(cx = {}) {
  if (checking()) return {status: 'recommended', detail: 'Private setup is checked only in the running app.', configured: null, usable: false};
  let cached;
  try {
    let d = data(await readStatus(cx)); cached = d; remember(cx, d);
    const verified = d.configured && cx.checkReason === 'manual' && cx.enabled?.() !== false;
    if (verified) d = await invoke(cx, 'verify', d.revision);
    if (cx.isCurrent?.() === false) return {status: 'missing', detail: 'Settings changed. Check again.', usable: false};
    remember(cx, d);
    const activationBlocked=d.configured && d.activation && d.activation!=='enabled';
    return {...d, refreshSections: verified, status: d.configured && d.allowedBoards && !d.namesMissing && !activationBlocked ? 'ready' : 'missing', usable: d.configured,
      statusLabel:!d.configured ? 'Add account' : d.namesMissing ? 'Check names' : !d.allowedBoards ? 'Add boards' : activationBlocked ? d.activation==='disabled'?'Enable on host':'Check activation' : 'Ready',
      detail:activationBlocked ? `${cx.machine ?? 'This computer'} · ${d.activation==='disabled'?'Trello is disabled':'Activation check failed'}` : null};
  } catch (e) { return {...cached, status: 'error', statusLabel:'Check failed', detail:Object.values(safeErrors).includes(e?.message) ? e.message : 'Setup check failed.', configured:cached?.configured ?? null, problem:e.code ?? 'INTERNAL', usable:cached?.configured === true}; }
}
export async function credentialAction(cx, values, item, action) {
  try {
    const d = await invoke(cx, action, item.revision, values);
    if (action !== 'remove' && !d.account) throw Error('Account check failed. Check again.');
    return {detail:null};
  } catch (e) { return {detail: e.message}; } // Only our own sanitized errors, never provider/worker text.
}
export async function removeAccount(cx, item) { await invoke(cx, 'remove', item.revision); }
export async function boardCheck(cx) {
  const d = await localStatus(cx), h = hints(cx);
  return {...d, statusLabel: d.configured ? `${d.allowedBoards} added` : null,
    rows: (d.boards ?? []).map(id => ({id, label: h.names.get(id) ?? 'Check to load name'})),
    detail: d.status === 'error' ? d.detail : d.configured ? null : 'Add an account first.'};
}
export async function boardCandidates(cx) {
  const saved = cx.result?.('boards');
  const d = await invoke(cx, 'discover', saved?.revision);
  const allowed = new Set(d.boards), items = d.items.filter(b => !allowed.has(b.id)).map(b => ({id: b.id, label: b.label, tab:b.closed ? 'inactive' : 'active'}));
  const candidates = new Set(items.map(b => b.id));
  return {items, detail: d.complete ? null : 'List incomplete; existing boards are retained.',
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
  const g = hints(cx).global;
  return {shown:true, available:Boolean(g), revision:g?.revision, value:g?.access ?? 'read-only',
    statusLabel:!g ? 'Check needed' : g.pending.length ? 'Pending' : null,
    detail:g?.pending.length ? g.pending.join(', ') : null, retry:Boolean(g?.pending.length)};
}
export async function setAccess(cx, value, snapshot) {
  if (!['read-only','read-write'].includes(value) || !REV.test(snapshot?.revision)) throw Error('Check Access first.');
  if (checking() || cx.isCurrent?.() === false || cx.enabled?.() === false) throw Error('Access action unavailable.');
  const old = cx.setting('access'), context = {...cx,machine:null,privateDestination:undefined};
  const result=await privateAction('trello',{action:'global.apply',access:value,expected:snapshot.revision},context);
  const g=rememberGlobal(cx,result);
  if (!result?.ok || !g) throw Error(safeErrors[result?.error?.code] ?? 'Access could not be applied. Check again.');
  if (!cx.setSetting?.('access',value,old)) {
    if (value==='read-write') {
      const reduced=await privateAction('trello',{action:'global.apply',access:'read-only',expected:g.revision},context);
      rememberGlobal(cx,reduced);
      if (!reduced?.ok || reduced.data?.global?.pending?.length) throw Error('Access cleanup pending. Check machines before retrying.');
    }
    throw Error('The public Access setting changed. Check Access again.');
  }
}
