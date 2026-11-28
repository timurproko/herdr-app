import assert from 'node:assert/strict';
import { loadMod } from '../tools/plugin-harness.mjs';

const state = {}, reads = [], jobs = [], writes = [];
let inventory = [{ name: 'z-peer', state: 'connected' }, { name: 'a-peer', state: 'connected' }, { name: 'offline', state: 'disconnected' }];
let layout = inventory.map(m => ({ name: m.name, layout: m.state === 'connected' ? 'ready' : 'unavailable' }));
let modes = new Map([[null, true], ['z-peer', true], ['a-peer', false]]), hold = null, nativeChecking = false;
let failures = new Map(), afterWrite = () => {}, holdWrite = null, inventoryError = false;
let clock = 1000000;
class Clock extends Date { static now() { return clock; } }
const update = { label: 'Update', async run(cx) {
  const machine = cx.setting('machine'); writes.push(machine);
  if (holdWrite) await holdWrite;
  if (failures.has(machine)) throw failures.get(machine);
  modes.set(machine, false); afterWrite(machine);
} };
const plugin = { id: 'probe', name: 'Probe', settings: [{ key: 'machine', type: 'machine', default: null }], prerequisites: [
  { id: 'tool', updates: true, async check(cx) {
    const machine = cx.setting('machine'); reads.push(machine);
    assert.equal(cx.updateCheck, true);
    assert.equal(cx.machine, machine);
    if (hold) await hold;
    const mode = modes.get(machine);
    if (mode === 'error') throw Error('Cannot inspect');
    return { status: mode === true || mode === 'absent' ? 'missing' : 'ready', update: mode === 'absent' ? false : mode, fix: update, detail: 'fixture revision' };
  } },
  { id: 'projects', check() { throw Error('Unrelated checks must not run'); } },
] };
const host = {
  shared: key => state[key], setShared: (key, value) => { state[key] = JSON.parse(JSON.stringify(value)); },
  checking: () => nativeChecking, machines: () => layout,
  hc: async args => { assert.deepEqual([...args], ['machine', 'ls', '--json']); return inventoryError ? { code: 1, stdout: '' } : { code: 0, stdout: JSON.stringify({ machines: inventory }) }; },
};
async function load() {
  return loadMod({ host, globals: { Date: Clock }, modules: { 'plugins/index.js': { default: [plugin] } },
    entry: "export * from './plugins-updates.js'; export * as registry from './plugins.js'; export * as operations from './plugins-operations.js';" });
}
const api = await load(), other = await load();
const cx = { notify() {}, sleep: async () => {}, spawn(fn) { const job = { done: false, is_done() { return this.done; } }; jobs.push(Promise.resolve().then(() => fn(cx)).finally(() => { job.done = true; })); return job; } };
const drain = async () => { while (jobs.length) await Promise.all(jobs.splice(0)); };
const owner = {};
const refresh = async () => { clock += 1000; api.refreshPluginUpdates(owner, cx, { force: true }); await drain(); };
const snapshot = () => api.pluginUpdateSnapshot();
api.registry.setPluginSetting(plugin, 'machine', 'saved-selection');
const saved = JSON.stringify(state['custom.plugins']);
assert.equal(api.operations.pluginMachineContext(plugin, { machine: 'captured' }).setting('machine'), 'captured', 'Update contexts pin the captured machine');
const scoped = api.operations.pluginMachineContext(plugin, { machine: 'captured', captureMachine: false });
assert.equal(scoped.setting('machine'), 'saved-selection', 'Ordinary plugin contexts preserve their existing list scope');
assert.equal(scoped.machine, 'captured', 'The header context remains separately captured');
api.refreshPluginUpdates(owner, cx, { force: true });
other.refreshPluginUpdates({}, cx, { force: true });
await drain();
assert.deepEqual(reads, [null, 'z-peer', 'a-peer'], 'local first, peers in inventory order; coalesced across modules');
assert.equal(api.pluginUpdateAvailable(), true);
assert.equal(JSON.stringify(state['custom.plugins']), saved, 'discovery does not change selected machine settings');
assert.deepEqual(writes, [], 'discovery never invokes fixes');
assert.equal(snapshot().rows.filter(row => row.pending).length, 2);
assert.equal(snapshot().scan, null);
assert.equal(snapshot().check.known, true);
assert.equal(snapshot().check.attempted, clock);
assert.equal(snapshot().check.completed, clock);
assert.equal(snapshot().check.checked, clock);
assert.deepEqual([...snapshot().check.machines], [null, 'z-peer', 'a-peer']);
const checkedBeforeUnknown = snapshot().check.checked;
const count = reads.length; api.refreshPluginUpdates(owner, cx); await drain();
assert.equal(reads.length, count, 'healthy read is bounded by shared cadence');
modes = new Map([[null, null], ['z-peer', 'error'], ['a-peer', true]]); await refresh();
assert.equal(snapshot().rows.filter(row => row.pending).length, 3, 'unknown and failed reads preserve known pending facts');
assert.equal(snapshot().check.known, false, 'an unknown provider cannot establish aggregate currency');
assert.equal(snapshot().check.checked, checkedBeforeUnknown, 'failed/unknown checks do not renew successful check time');
assert.ok(snapshot().check.completed > snapshot().check.checked);
layout = layout.map(m => ({ ...m, layout: 'unavailable' }));
modes.set(null, false); await refresh();
assert.equal(api.pluginUpdateAvailable(), false, 'disconnected peers do not light dots');
layout = [{ name: 'z-peer', layout: 'ready' }];
assert.equal(api.pluginUpdateAvailable(), true);
inventory = [{ name: 'z-peer', state: 'disconnected' }]; await refresh();
assert.deepEqual([...snapshot().machines], [null]);
assert.equal(snapshot().rows.length, 1, 'authoritative inventory prunes disconnected rows');
assert.equal(api.pluginUpdateAvailable(), false);

// Retired owners/requests cannot publish a late result.
let release; hold = new Promise(resolve => { release = resolve; });
modes.set(null, true);
api.refreshPluginUpdates(owner, cx, { force: true });
for (let i = 0; i < 20; i++) await Promise.resolve();
owner.pluginUpdatesClosed = true;
release(); await drain(); hold = null;
assert.equal(snapshot().rows[0].pending, false);
state[api.PLUGIN_UPDATES_KEY].scan = null;
nativeChecking = true; api.refreshPluginUpdates({}, cx, { force: true }); await drain();
assert.equal(snapshot().scan, null, 'eager checking starts no work');
nativeChecking = false;
// Explicit Update uses the same callback through the shared Settings executor.
owner.pluginUpdatesClosed = false;
const prepare = async () => {
  inventory = [{ name: 'z-peer', state: 'connected' }, { name: 'a-peer', state: 'connected' }];
  layout = inventory.map(m => ({ name: m.name, layout: 'ready' }));
  modes = new Map([[null, true], ['z-peer', true], ['a-peer', true]]);
  failures.clear(); afterWrite = () => {}; writes.length = 0;
  state[api.PLUGIN_UPDATES_KEY].scan = null;
  await refresh();
};
await prepare();
api.updatePlugins(owner, cx); other.updatePlugins({}, cx);
assert.equal(snapshot().batch.running, true);
await drain();
assert.deepEqual(writes, [null, 'z-peer', 'a-peer'], 'one batch, sequential local-first inventory order');
assert.equal(snapshot().batch.running, false);
assert.equal(snapshot().check.checked, snapshot().batch.completed, 'successful batch rechecks supply the current result time');
assert.ok(snapshot().rows.every(row => !row.pending && row.outcome === 'updated'));
assert.equal(api.pluginUpdateAvailable(), false);
assert.equal(JSON.stringify(state['custom.plugins']), saved, 'batch does not mutate portable machine selection');

await prepare();
modes.set('z-peer', false); // stale pending entry already updated elsewhere
api.updatePlugins(owner, cx); await drain();
assert.deepEqual(writes, [null, 'a-peer'], 'fresh preflight skips an already-current tool');

await prepare(); modes.set('z-peer', 'absent');
api.updatePlugins(owner, cx); await drain();
assert.deepEqual(writes, [null, 'a-peer'], 'a missing tool is not installed by a stale update entry');
assert.ok(!api.pluginUpdateRows().some(row => row.machine === 'z-peer'), 'absent tools are not described as Up to date');

await prepare(); failures.set(null, Error('Local update refused'));
api.updatePlugins(owner, cx); await drain();
assert.deepEqual(writes, [null, 'z-peer', 'a-peer'], 'failure does not stop other machines');
assert.equal(snapshot().rows.find(row => row.machine === null).error, 'Local update refused');
assert.ok(snapshot().rows.filter(row => row.machine !== null).every(row => row.outcome === 'updated'));

await prepare();
afterWrite = machine => { if (machine === null) layout.find(m => m.name === 'z-peer').layout = 'unavailable'; };
api.updatePlugins(owner, cx); await drain();
assert.deepEqual(writes, [null, 'a-peer']);
assert.equal(snapshot().rows.find(row => row.machine === 'z-peer').error, 'Machine not connected.');

await prepare(); failures.set('z-peer', Object.assign(Error('Timed out after 300 s.'), { uncertain: true }));
api.updatePlugins(owner, cx); await drain();
assert.equal(snapshot().rows.find(row => row.machine === 'z-peer').outcome, 'unknown');
assert.deepEqual(writes, [null, 'z-peer', 'a-peer']);
failures.clear(); writes.length = 0;
await refresh(); assert.deepEqual(writes, [], 'read does not replay uncertain writes');
other.updatePlugins({}, cx); await drain();
assert.deepEqual(writes, [], 'another module cannot repeat an unresolved submitted write');
assert.match(snapshot().rows.find(row => row.machine === 'z-peer').error, /outcome unknown/);
modes.set('z-peer', false); await refresh();
assert.equal(api.pluginUpdateAvailable(), false, 'authoritative current result reconciles late success');

await prepare();
let releaseWrite; holdWrite = new Promise(resolve => { releaseWrite = resolve; });
api.updatePlugins(owner, cx);
for (let i = 0; i < 100 && !writes.length; i++) await Promise.resolve();
assert.deepEqual(writes, [null]);
owner.pluginUpdatesClosed = true; releaseWrite(); await drain(); holdWrite = null;
assert.deepEqual(writes, [null], 'closing retires further dispatch but never kills the running action');
assert.equal(snapshot().batch.running, false);
owner.pluginUpdatesClosed = false; await refresh();
assert.equal(snapshot().rows.find(row => row.machine === null).outcome, 'updated');
assert.equal(api.pluginUpdateAvailable(), true, 'unattempted peers remain pending');

// Shared executor preserves required enablement/confirmation and original callback.
const item = { id: 'guarded', updates: true, fix: { ...update, requiresEnabled: true, confirm: { title: 'Confirm' } } };
const context = api.operations.pluginMachineContext(plugin, { machine: 'captured', current: () => true });
api.registry.setPluginEnabled(plugin, false);
await assert.rejects(api.operations.runPluginFixes(plugin, [item], context, { confirmed: true }), /turned off/);
api.registry.setPluginEnabled(plugin, true);
await assert.rejects(api.operations.runPluginFixes(plugin, [item], context), /confirmation/);
const beforeDirect = writes.length;
await api.operations.runPluginFixes(plugin, [item], context, { confirmed: true });
assert.equal(writes[beforeDirect], 'captured');
await assert.rejects(api.operations.runPluginFixes(plugin, [item], { ...context, isCurrent: () => false }, { confirmed: true }), /Obsolete/);

// Ordinary Plugins checks and background checks share publication ordering.
const pre = plugin.prerequisites[0];
const oldRead = api.operations.beginPluginUpdateCheck(null, plugin, pre);
const newRead = other.operations.beginPluginUpdateCheck(null, plugin, pre);
api.recordPluginUpdate(null, plugin, { ...pre, update: false, updateRead: newRead });
api.recordPluginUpdate(null, plugin, { ...pre, update: true, fix: update, updateRead: oldRead });
assert.equal(snapshot().rows.find(row => row.machine === null).pending, false, 'late older check cannot overwrite another entrypoint');
api.recordPluginUpdate(null, plugin, { ...pre, update: true, fix: update, updateRead: newRead });
assert.equal(snapshot().rows.find(row => row.machine === null).outcome, undefined, 'new availability never retains an old Up to date result');

// A changed plugin configuration retires an in-flight result without selecting machines.
plugin.settings.push({ key: 'channel', type: 'choice', default: 'stable', options: [['stable', 'Stable'], ['next', 'Next']] });
let releaseRead; hold = new Promise(resolve => { releaseRead = resolve; });
modes.set(null, false);
const beforeRead = reads.length;
api.refreshPluginUpdates(owner, cx, { force: true });
for (let i = 0; i < 100 && reads.length === beforeRead; i++) await Promise.resolve();
assert.ok(reads.length > beforeRead);
api.registry.setPluginSetting(plugin, 'channel', 'next');
releaseRead(); await drain(); hold = null;
assert.equal(snapshot().rows.find(row => row.machine === null).pending, true, 'retired configuration cannot clear confirmed facts');
await refresh();
assert.equal(snapshot().rows.find(row => row.machine === null).pending, false);

// Successful aggregate time requires a complete inventory and known providers.
const lastSuccess = snapshot().check.checked;
inventoryError = true; await refresh(); inventoryError = false;
assert.equal(snapshot().check.known, false);
assert.equal(snapshot().check.checked, lastSuccess, 'inventory failure cannot renew successful time');
assert.match(snapshot().check.error, /connected machines/);
modes.set(null, null); await refresh();
assert.equal(snapshot().check.known, false);
modes.set(null, false); await refresh();
assert.equal(snapshot().check.known, true);
assert.equal(snapshot().check.checked, clock);
assert.equal(snapshot().check.error, null);

// The controller also guards stale pre-paint clicks during a live discovery.
await prepare();
state[api.PLUGIN_UPDATES_KEY].scan = { token: 'abandoned-scan', expires: clock + 1 };
api.updatePlugins(owner, cx); await drain();
assert.deepEqual(writes, [], 'an unexpired scan blocks dispatch, not just the rendered button');
clock++;
api.updatePlugins(owner, cx); await drain();
assert.deepEqual(writes, [null, 'z-peer', 'a-peer'], 'explicit Update works at exact scan expiry');
assert.equal(snapshot().check.known, true, 'complete batch evidence recovers aggregate current feedback after scan expiry');
assert.equal(snapshot().check.checked, clock);
assert.equal(snapshot().check.error, null);

// Abandoned native batch metadata becomes truthful unknown, never eternal busy.
const writesBeforeExpiry = writes.length;
state[api.PLUGIN_UPDATES_KEY].batch = { token: 'abandoned', running: true, expires: 0 };
state[api.PLUGIN_UPDATES_KEY].rows[0].outcome = 'running';
assert.equal(snapshot().batch.running, false);
assert.equal(snapshot().rows[0].outcome, 'unknown');
assert.equal(writes.length, writesBeforeExpiry, 'expiry itself cannot dispatch');
console.log('PASS: plugin discovery, shared dots facts, captured context/action reuse, sequential batches, single-flight, failure continuation, preflight, disconnect, cancellation and uncertain-write guards');
