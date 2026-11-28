import assert from 'node:assert/strict';
import { loadMod } from '../tools/plugin-harness.mjs';

const state = {}, reads = [], jobs = [], writes = [];
let inventory = [{ name: 'z-peer', state: 'connected' }, { name: 'a-peer', state: 'connected' }, { name: 'offline', state: 'disconnected' }];
let layout = inventory.map(m => ({ name: m.name, layout: m.state === 'connected' ? 'ready' : 'unavailable' }));
let modes = new Map([[null, true], ['z-peer', true], ['a-peer', false]]), hold = null, nativeChecking = false;
const update = { label: 'Update', async run(cx) { writes.push(cx.setting('machine')); } };
const plugin = { id: 'probe', name: 'Probe', settings: [{ key: 'machine', type: 'machine', default: null }], prerequisites: [
  { id: 'tool', updates: true, async check(cx) {
    const machine = cx.setting('machine'); reads.push(machine);
    assert.equal(cx.updateCheck, true);
    assert.equal(cx.machine, machine);
    if (hold) await hold;
    const mode = modes.get(machine);
    if (mode === 'error') throw Error('Cannot inspect');
    return { status: mode === true ? 'missing' : 'ready', update: mode, fix: update, detail: 'fixture revision' };
  } },
  { id: 'projects', check() { throw Error('Unrelated checks must not run'); } },
] };
const host = {
  shared: key => state[key], setShared: (key, value) => { state[key] = JSON.parse(JSON.stringify(value)); },
  checking: () => nativeChecking, machines: () => layout,
  hc: async args => { assert.deepEqual([...args], ['machine', 'ls', '--json']); return { code: 0, stdout: JSON.stringify({ machines: inventory }) }; },
};
async function load() {
  return loadMod({ host, modules: { 'plugins/index.js': { default: [plugin] } },
    entry: "export * from './plugin-updates.js'; export * as registry from './plugins.js';" });
}
const api = await load(), other = await load();
const cx = { notify() {}, sleep: async () => {}, spawn(fn) { const job = { done: false, is_done() { return this.done; } }; jobs.push(Promise.resolve().then(() => fn(cx)).finally(() => { job.done = true; })); return job; } };
const drain = async () => { while (jobs.length) await Promise.all(jobs.splice(0)); };
const owner = {};
const refresh = async () => { api.refreshPluginUpdates(owner, cx, { force: true }); await drain(); };
const snapshot = () => api.pluginUpdateSnapshot();
api.registry.setPluginSetting(plugin, 'machine', 'saved-selection');
const saved = JSON.stringify(state['custom.plugins']);
api.refreshPluginUpdates(owner, cx, { force: true });
other.refreshPluginUpdates({}, cx, { force: true });
await drain();
assert.deepEqual(reads, [null, 'z-peer', 'a-peer'], 'local first, peers in inventory order; coalesced across modules');
assert.equal(api.pluginUpdateAvailable(), true);
assert.equal(JSON.stringify(state['custom.plugins']), saved, 'discovery does not change selected machine settings');
assert.deepEqual(writes, [], 'discovery never invokes fixes');
assert.equal(snapshot().rows.filter(row => row.pending).length, 2);
assert.equal(snapshot().scan, null);
const count = reads.length; api.refreshPluginUpdates(owner, cx); await drain();
assert.equal(reads.length, count, 'healthy read is bounded by shared cadence');
modes = new Map([[null, null], ['z-peer', 'error'], ['a-peer', true]]); await refresh();
assert.equal(snapshot().rows.filter(row => row.pending).length, 3, 'unknown and failed reads preserve known pending facts');
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
console.log('PASS: explicit plugin updates, captured machine reads, connected inventory order, shared coalescing, unknown preservation and no automatic writes');
