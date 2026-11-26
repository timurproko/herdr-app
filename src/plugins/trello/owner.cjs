'use strict';
// Owner Settings only. Not imported by the agent CLI and never a CLI discovery flag.
const fs = require('node:fs');
const crypto = require('node:crypto');
const {Store, safePath, validate, exact, id} = require('./credentials.cjs');
const {Client} = require('./client.cjs');
const {fail, publicError, TrelloError} = require('./errors.cjs');
const ownerRoutes = [
  ['GET', /^\/members\/me$/, ['fields']],
  ['GET', /^\/members\/me\/boards$/, ['fields', 'filter']],
];
const {applyControl, resetControl} = require('./control.cjs');
const defaults = policy => ({version: 1, boards: [], allowWrites: false, ...(policy?.authority === 'managed' ? {authority: 'managed'} : {})});
const text = (value, max = 256) => typeof value === 'string' && value.length > 0 && value.length <= max && !/[\u0000-\u001f\u007f]/.test(value);
function snapshot(store) {
  safePath(store.dir);
  const exists = fs.existsSync(store.dir);
  const credentials = exists ? store.read('credentials', true) : null;
  const policy = exists ? store.read('policy', true) : null;
  const display = exists ? store.read('display', true) : null;
  const control = exists ? store.read('control', true) : null;
  const revision = crypto.createHash('sha256').update(JSON.stringify([credentials, policy, display, control])).digest('hex');
  return {credentials, policy, display, control, revision};
}
const credentialTag = credentials => crypto.createHash('sha256').update(JSON.stringify(credentials)).digest('hex');
function displayFor(s) {
  const d = s.credentials && s.display?.credentialTag === credentialTag(s.credentials) ? s.display : null;
  return {account: d?.account ?? null, boards: (d?.boards ?? []).filter(b => s.policy?.boards.includes(b.id))};
}
function publicStatus(s) {
  const named = displayFor(s), boards = s.policy?.boards ?? [];
  return {configured: s.credentials !== null, storage: s.credentials === null ? 'missing' : 'ready', revision: s.revision,
    allowedBoards: boards.length, localWrites: s.policy?.allowWrites ?? false, boards,
    ...(named.account ? {account: named.account} : {}), namedBoards: named.boards,
    namesMissing: Boolean(s.credentials && (!named.account || boards.some(id => !named.boards.some(b => b.id === id)))),
    control: s.control, managed: s.policy?.authority === 'managed'};
}
function writeDisplay(store, previous, credentials, policy, account, items = []) {
  const old = displayFor({...previous, credentials, policy});
  const names = new Map(old.boards.map(b => [b.id, b.label]));
  for (const b of items) if (policy.boards.includes(b.id)) names.set(b.id, b.label);
  const next = {version: 1, credentialTag: credentialTag(credentials), account: account ?? old.account,
    boards: policy.boards.filter(id => names.has(id)).map(id => ({id, label: names.get(id)}))};
  if ([credentials.apiKey, credentials.token].some(secret => JSON.stringify(next.account).includes(secret) || JSON.stringify(next.boards).includes(secret))) fail('RESPONSE');
  if (JSON.stringify(next) !== JSON.stringify(previous.display)) store.write('display', next, previous.display);
}
function expected(store, revision) {
  const s = snapshot(store);
  if (!/^[a-f0-9]{64}$/.test(revision ?? '') || s.revision !== revision) fail('CONFLICT');
  return s;
}
function client(store, s, credentials, io) {
  const gate = {credentials, check() { if (io.isCurrent?.() === false) fail('STALE'); expected(store, s.revision); }};
  // Verification before first save needs no credential file or directory. A 429
  // may create only the protected non-secret cooldown, never save an unverified key.
  const cooldownStore = {read(name, optional) { safePath(store.dir); return fs.existsSync(store.dir) ? store.read(name, optional) : null; }, write: (...args) => store.write(...args)};
  return new Client(cooldownStore, gate, {...io, routeRules: ownerRoutes});
}
async function identity(c) {
  const value = await c.get('/members/me', {fields: 'id,username,fullName'});
  if (!id(value?.id) || !text(value.username) || !text(value.fullName)) fail('RESPONSE');
  const account = {id: value.id, username: value.username, name: value.fullName};
  if ([c.gate.credentials.apiKey, c.gate.credentials.token].some(secret => JSON.stringify(account).includes(secret))) fail('RESPONSE');
  return account;
}
async function inventory(c) {
  const boards = await c.get('/members/me/boards', {fields: 'id,name,closed', filter: 'all'});
  if (!Array.isArray(boards) || boards.some(b => !id(b?.id) || !text(b.name, 1024) || typeof b.closed !== 'boolean') || new Set(boards.map(b => b.id)).size !== boards.length) fail('RESPONSE');
  if ([c.gate.credentials.apiKey, c.gate.credentials.token].some(secret => JSON.stringify(boards).includes(secret))) fail('RESPONSE');
  // This endpoint has no documented cursor; never invent one or erase unseen grants.
  return {items: boards.slice(0, 1000).map(b => ({id: b.id, label: b.name, closed: b.closed})), complete: boards.length <= 1000};
}
async function operate(input, {store, ...io}) {
  if (!exact(input, ['action', 'apiKey', 'token', 'expected', 'add', 'remove', 'allowWrites', 'control'])) fail('INPUT');
  const keys = {
    status: ['action'], save: ['action', 'apiKey', 'token', 'expected'], replace: ['action', 'apiKey', 'token', 'expected'],
    verify: ['action', 'expected'], remove: ['action', 'expected'], discover: ['action', 'expected'],
    policy: ['action', 'expected', 'add', 'remove', 'allowWrites'],
    control: ['action', 'expected', 'control'],
  }[input.action];
  if (!keys || !exact(input, keys)) fail('INPUT');
  if (input.action === 'status') return publicStatus(snapshot(store));
  const s = expected(store, input.expected);
  if (['save', 'replace'].includes(input.action)) {
    if (io.initialControl && s.control && s.control.controller !== io.initialControl.controller) fail('CONTROL_CONFLICT');
    if ((s.credentials !== null) !== (input.action === 'replace')) fail('CONFLICT');
    let credentials;
    try { credentials = validate('credentials', {version: 1, apiKey: input.apiKey, token: input.token}); }
    catch { fail('INPUT'); }
    const account = await identity(client(store, s, credentials, io));
    // All network work is done. Reset grants first, under one local lock; an
    // interrupted transition can only lose authority, not inherit another account's.
    store.withLock(() => {
      expected(store, s.revision);
      store.write('policy', defaults(s.policy), s.policy);
      resetControl(store, s);
      store.write('credentials', credentials, s.credentials);
      // A different account never inherits former names, even with reused grants.
      writeDisplay(store, {...s, credentials: null, policy: null, display: s.display}, credentials, defaults(s.policy), account);
      if (io.initialControl) applyControl(store, snapshot(store), io.initialControl, io.binding);
    });
    return {...publicStatus(snapshot(store)), account};
  }
  if (!s.credentials) fail('STORE_MISSING');
  if (input.action === 'control') {
    store.withLock(() => { expected(store, s.revision); applyControl(store, s, input.control, io.binding); });
    return publicStatus(snapshot(store));
  }
  if (input.action === 'verify') {
    const c = client(store, s, s.credentials, io), account = await identity(c);
    // Only explicit verification hydrates missing legacy board names.
    const items = publicStatus(s).namesMissing && s.policy?.boards.length ? (await inventory(c)).items : [];
    store.withLock(() => { expected(store, s.revision); writeDisplay(store, s, s.credentials, s.policy ?? defaults(), account, items); });
    return publicStatus(snapshot(store));
  }
  if (input.action === 'remove') {
    store.withLock(() => { expected(store, s.revision); store.write('policy', defaults(s.policy), s.policy); resetControl(store, s); if (s.display) store.remove('display', s.display); store.remove('credentials', s.credentials); if (s.control) store.remove('control', store.read('control')); });
    return {...publicStatus(snapshot(store)), removed: true};
  }
  if (input.action === 'discover') {
    const found = await inventory(client(store, s, s.credentials, io));
    store.withLock(() => { expected(store, s.revision); writeDisplay(store, s, s.credentials, s.policy ?? defaults(), null, found.items); });
    return {...publicStatus(snapshot(store)), ...found};
  }
  const adds = input.add ?? [], removes = input.remove ?? [];
  if (![adds, removes].every(a => Array.isArray(a) && a.length <= 100 && a.every(id) && new Set(a).size === a.length) || adds.some(b => removes.includes(b)) || input.allowWrites !== undefined && typeof input.allowWrites !== 'boolean') fail('INPUT');
  const policy = structuredClone(s.policy ?? defaults());
  policy.boards = [...new Set([...policy.boards.filter(b => !removes.includes(b)), ...adds])];
  if (input.allowWrites !== undefined) policy.allowWrites = input.allowWrites;
  validate('policy', policy);
  let items = [];
  if (adds.length) {
    const found = await inventory(client(store, s, s.credentials, io)); items = found.items;
    if (adds.some(b => !items.some(item => item.id === b))) fail('SCOPE');
  }
  store.withLock(() => {
    expected(store, s.revision); store.write('policy', policy, s.policy);
    writeDisplay(store, s, s.credentials, policy, null, items);
  });
  return publicStatus(snapshot(store));
}
async function execute(input, options = {}) {
  let commitAttempted = false;
  try {
    const backing = options.store ?? new Store(options.home);
    // The transport's lifetime is checked again under the local commit lock.
    const store = new Proxy(backing, {get(target, key, receiver) {
      if (key === 'withLock') return action => target.withLock(() => { if (options.isCurrent?.() === false) fail('STALE'); return action(); });
      if (key === 'beforeCommit') return () => { if (options.isCurrent?.() === false) fail('STALE'); target.beforeCommit?.(); };
      if (['write','remove'].includes(key)) return (...args) => {
        if (['credentials','policy','display','control'].includes(args[0])) commitAttempted = true;
        return Reflect.get(target, key, receiver).apply(receiver,args);
      };
      return Reflect.get(target, key, receiver);
    }});
    if (options.isCurrent?.() === false) fail('STALE');
    const previous = snapshot(store);
    const data = await operate(input, {...options, store});
    if (data.configured) {
      try { data.activation = require('./policy.cjs').state(store).enabled ? 'enabled' : 'disabled'; }
      catch { data.activation = 'invalid'; }
    }
    // Defense in depth: never forward an account/board name echoing submitted secrets.
    const result = {version: 1, ok: true, data}, encoded = JSON.stringify(result);
    for (const value of [input?.apiKey, input?.token, previous.credentials?.apiKey, previous.credentials?.token].filter(v => typeof v === 'string' && v)) if (encoded.includes(value)) fail('RESPONSE');
    return result;
  } catch (e) { return {version: 1, ok: false, error: publicError(e, {configurationUnknown:commitAttempted})}; }
}
if (require.main === module) {
  (async () => {
    let result;
    if (process.argv[2] === '--status' && process.argv.length === 4) result = await execute({action: 'status'}, {home: process.argv[3]});
    else if (process.argv.length === 3) {
      let input = '', bytes = 0;
      try {
        for await (const chunk of process.stdin) { bytes += chunk.length; if (bytes > 262144) fail('INPUT'); input += chunk.toString('utf8'); }
        result = await execute(JSON.parse(input), {home: process.argv[2]});
      } catch { result = {version: 1, ok: false, error: publicError(new TrelloError('INPUT'))}; }
    } else result = {version: 1, ok: false, error: publicError(new TrelloError('INPUT'))};
    process.stdout.write(JSON.stringify(result) + '\n'); process.exitCode = result.ok ? 0 : 3;
  })();
}
module.exports = {execute, snapshot, publicStatus, ownerRoutes};
