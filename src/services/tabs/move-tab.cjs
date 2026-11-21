// Explicit same-machine tab relocation. The adapter scopes remote IDs/RPCs;
// this orchestrator always sees a machine-local document. No job replay.
'use strict';
const contract = require('./tab-move-v1.cjs');
const {connect} = require('./core-rpc.cjs');
const {execFileSync} = require('node:child_process');
const getAppVersion = () => execFileSync('herdr-app', ['--version'], {encoding: 'utf8', windowsHide: true, timeout: 5000}).trim().replace(/^herdr-app\s+/, '');
const read = rpc => rpc('doc.get', {name: 'herdr-app'});
const sameIdentity = (a, b) => a?.address === b?.address && a.created_ms === b.created_ms && a.pid === b.pid && a.parent === b.parent && b.state === 'live';
function validateRequest(request, now, mutation = false) {
  if (!['inspect', 'move', 'repair'].includes(request?.action) || request.machine !== null) throw Error('The tab-move service requires a machine-scoped request.');
  contract.id(request.tabId); contract.id(request.sourceSpaceId);
  if (mutation && (!Number.isFinite(request.expiresAt) || request.expiresAt <= now() || request.expiresAt > now() + 30000
      || !/^[a-z0-9-]{1,100}$/i.test(request.requestId ?? '') || !/^[a-f0-9]{64}$/.test(request.fingerprint ?? '') || typeof request.coreId !== 'string'))
    throw Error('The move request expired or is invalid. Reopen the tab menu.');
  if (request.action === 'move' && typeof request.keepSource !== 'boolean') throw Error('Missing source-space retention policy.');
}
async function handshake(request, rpc, actualVersion) {
  const hello = await rpc('hello', {generation: 1});
  if (actualVersion !== request.appVersion) throw Error('Herdr updated while the menu was open. Reopen it after the running app is updated.');
  contract.validateProfile(request.appVersion, hello);
  if (request.coreId && request.coreId !== hello.core.id) throw Error('The target Core changed. Reopen the tab menu.');
  return hello;
}
// Include only unshown children whose ancestry and adoption labels bind them to
// this tab. A child with its own pane in another tab is never relabeled.
async function bindings(snapshot, tabId, rpc) {
  const inventory = contract.checkedSnapshot(snapshot), found = inventory.tabs.get(tabId);
  if (!found) throw Error('The tab no longer exists.');
  const listing = await rpc('terminal.list', {});
  if (!Array.isArray(listing?.terminals)) throw Error('Invalid Core terminal listing.');
  const records = new Map(listing.terminals.map(t => [t.address, t]));
  const direct = new Set([...inventory.terminals].filter(([, p]) => p.tab === tabId).map(([a]) => a));
  const result = [];
  for (const address of direct) {
    const t = records.get(address);
    if (!t || t.state !== 'live' || !Number.isSafeInteger(t.created_ms) || t.labels?.['herdr.tab'] !== tabId)
      throw Error('A terminal is gone or its tab binding is unsupported. No layout was changed.');
    contract.id(t.labels?.['herdr.space']); result.push(t);
  }
  for (const t of records.values()) {
    if (!/^t[a-z0-9]+$/i.test(t.address ?? '') || direct.has(t.address) || inventory.terminals.has(t.address)
        || t.state !== 'live' || t.labels?.['herdr.tab'] !== tabId || !Number.isSafeInteger(t.created_ms)) continue;
    const visited = new Set(); let p = t;
    for (let i = 0; i < 64 && p?.parent && !visited.has(p.parent); i++) {
      if (inventory.terminals.has(p.parent) && !direct.has(p.parent)) break;
      if (direct.has(p.parent)) { contract.id(t.labels?.['herdr.space']); result.push(t); break; }
      visited.add(p.parent); p = records.get(p.parent);
    }
  }
  if (result.length > 128) throw Error('Too many terminal bindings for one tab move.');
  return {records: result, space: found.space.id};
}
async function reconcileMetadata(request, initial, rpc, now) {
  let pending = 0;
  for (const original of initial) {
    try {
      if (now() >= request.expiresAt) { pending++; continue; }
      const snapshot = await read(rpc), current = await bindings(snapshot, request.tabId, rpc);
      const wanted = current.records.find(t => t.address === original.address);
      if (!wanted || !sameIdentity(original, wanted)) { pending++; continue; }
      // Read the exact record just before writing; labels have no CAS, so a final
      // readback is still necessary and cannot provide full cross-client atomicity.
      const record = await rpc('terminal.get', {terminal: wanted.address});
      if (!sameIdentity(wanted, record) || record.labels?.['herdr.tab'] !== request.tabId
          || record.labels?.['herdr.space'] !== wanted.labels?.['herdr.space']) { pending++; continue; }
      if (record.labels['herdr.space'] !== current.space) {
        if (now() >= request.expiresAt) { pending++; continue; }
        await rpc('terminal.label', {terminal: record.address, labels: {'herdr.space': current.space, 'herdr.tab': request.tabId}});
      }
      const verified = await rpc('terminal.get', {terminal: record.address});
      const latest = contract.checkedSnapshot(await read(rpc)).tabs.get(request.tabId);
      if (!sameIdentity(record, verified) || !latest || verified.labels?.['herdr.space'] !== latest.space.id
          || verified.labels?.['herdr.tab'] !== request.tabId) pending++;
    } catch { pending++; }
  }
  // Detect children born during the operation or a concurrent second move.
  try {
    const latest = await bindings(await read(rpc), request.tabId, rpc);
    if (latest.records.some(t => t.labels['herdr.space'] !== latest.space)) pending++;
  } catch { pending++; }
  return pending;
}
async function operate(request, rpc, {now = Date.now, appVersion = getAppVersion} = {}) {
  let attempted = false, committed = false, initial = [];
  try {
    validateRequest(request, now, request.action !== 'inspect');
    const actualVersion = await appVersion(), hello = await handshake(request, rpc, actualVersion);
    let snapshot = await read(rpc);
    const found = contract.locate(snapshot, request);
    const members = await bindings(snapshot, request.tabId, rpc); initial = members.records;
    const repairNeeded = initial.some(t => t.labels['herdr.space'] !== members.space);
    if (request.action === 'inspect') return {ok: true, status: 'ready', coreId: hello.core.id, fingerprint: contract.fingerprint(found.tab), repairNeeded};
    if (request.action === 'repair') {
      const pending = await reconcileMetadata(request, initial, rpc, now);
      return {ok: !pending, status: pending ? 'partial' : 'repaired', message: pending ? 'Some metadata still needs repair. Reopen this tab menu and retry Repair move metadata.' : 'Move metadata repaired.'};
    }
    if (repairNeeded) throw Error('Repair this tab’s move metadata from its menu before moving it again.');
    for (let attempt = 0; attempt < 2; attempt++) {
      validateRequest(request, now, true);
      await handshake(request, rpc, actualVersion);
      // Validate before setting attempted; failures here cannot have changed layout.
      contract.planMove(snapshot, request);
      validateRequest(request, now, true); // An awaited handshake can cross the deadline.
      attempted = true;
      try { await contract.commitMove(rpc, snapshot, request); committed = true; break; }
      catch (error) {
        if (error.kind === 'conflict') attempted = false; // A rejected CAS did not write.
        if (error.kind === 'conflict' && attempt === 0) { snapshot = await read(rpc); continue; }
        if (error.kind === 'conflict') return {ok: false, status: 'failed', message: 'The layout changed elsewhere. Reopen the menu and try again.'};
        // A timed-out write may have committed. Observe it; never blindly replay it.
        const check = contract.checkedSnapshot(await read(rpc)).tabs.get(request.tabId);
        if (check?.space.id === request.destinationSpaceId && contract.fingerprint(check.tab) === request.fingerprint) { committed = true; break; }
        return {ok: false, status: 'unknown', message: 'The write could not be confirmed. Check the tab’s current space before retrying.'};
      }
    }
    const current = contract.checkedSnapshot(await read(rpc)).tabs.get(request.tabId);
    if (current?.space.id !== request.destinationSpaceId) return {ok: false, status: 'superseded', message: 'The move committed, but another layout change followed it. Check the tab’s current location.'};
    const pending = await reconcileMetadata(request, initial, rpc, now);
    return {ok: true, status: pending ? 'partial' : 'moved', message: pending ? 'Tab moved; some terminal metadata needs repair. Right-click it and choose Repair move metadata.' : 'Tab moved.'};
  } catch (error) {
    return {ok: false, status: committed ? 'partial' : attempted ? 'unknown' : 'failed', message: committed
      ? 'The move committed, but verification or metadata repair could not finish. Check its location and use Repair move metadata.'
      : attempted ? 'A layout write was attempted but not confirmed. Check the tab’s location before retrying.' : error.message};
  }
}
module.exports = {operate, bindings, sameIdentity};
if (require.main === module) {
  let client;
  Promise.resolve().then(async () => {
    const request = JSON.parse(process.argv[2] ?? '{}');
    // Reject malformed/expired jobs BEFORE opening a connection (which could
    // otherwise auto-start a Core). No source-checkout or document paths accepted.
    const scoped = contract.scopeRequest(request);
    validateRequest(scoped, Date.now, scoped.action !== 'inspect');
    client = connect(); return operate(scoped, contract.machineRpc(client.call, request.machine));
  }).then(value => console.log(JSON.stringify(value)))
    .catch(error => console.log(JSON.stringify({ok: false, status: 'failed', message: error.message})))
    .finally(() => client?.close());
}
