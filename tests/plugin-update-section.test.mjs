import assert from 'node:assert/strict';
import { loadMod } from '../tools/plugin-harness.mjs';
function element() {
  const node = { attrs: {}, kids: [] }; let el;
  return el = new Proxy(node, { get: (n, key) => key in n ? n[key] : key === 'then' ? undefined
    : key === 'child' ? child => { n.kids.push(child); return el; }
    : key === 'children' ? children => { n.kids.push(...children); return el; }
    : key === 'when' ? (yes, fn) => yes ? fn(el) : el
    : (...args) => { n.attrs[key] = args; return el; } });
}
const nodes = el => el && typeof el === 'object' ? [el, ...(el.kids ?? []).flatMap(nodes)] : [];
const find = (tree, id) => nodes(tree).find(el => el.attrs?.id?.[0] === id);
let snapshot = {}, rows = [], dispatched = 0;
const { pluginUpdateSection } = await loadMod({ host: {}, modules: {
  'gpui-kit': { div: element }, 'gpui-base': { h_flex: element, v_flex: element },
  'plugins-updates.js': { pluginUpdateSnapshot: () => snapshot, pluginUpdateRows: () => rows, pluginUpdateAvailable: () => rows.some(row => row.pending && row.machine !== 'offline'), updatePlugins: () => dispatched++ },
}, entry: "export { pluginUpdateSection } from './plugins-update-section.js';" });
const drawn = [];
const owner = {
  heading: (_t, text) => element().child(text),
  button: (_t, id, label, click, options) => element().id(id).child(label).on_click(click).options(options),
  row: (_t, title, about, action, last) => { drawn.push({ title, about, last }); return element().child(title).child(about).child(action); },
};
let tree = pluginUpdateSection(owner, {});
assert.equal(tree, null, 'no empty Plugins section, heading or spacing');
assert.equal(drawn.length, 0);
snapshot = { scan: { expires: Date.now() + 90000 } };
assert.equal(pluginUpdateSection(owner, {}), null, 'discovery alone does not reveal an empty section');
snapshot = { batch: { running: true } };
tree = pluginUpdateSection(owner, {});
assert.ok(find(tree, 'st-plugin-updates'), 'a running batch remains visible even without pending rows');
assert.equal(find(tree, 'st-update-plugins').kids[0], 'Updating…');
assert.equal(find(tree, 'st-update-plugins').attrs.options[0].enabled, false);
snapshot = {};
rows = [{ name: 'Crew', machine: null, pending: true }, { name: 'Crew', machine: 'pc2', pending: true }];
tree = pluginUpdateSection(owner, {});
assert.deepEqual(drawn.map(row => row.title), ['Crew · This computer', 'Crew · pc2']);
assert.ok(drawn.every(row => row.about === 'Update available.'));
assert.equal(nodes(tree).filter(el => el.attrs?.options).length, 1, 'one section-level action, no machine controls');
assert.equal(dispatched, 0, 'render starts no work');
assert.equal(find(tree, 'st-update-plugins').attrs.options[0].enabled, true);
find(tree, 'st-update-plugins').attrs.on_click[0](null, {});
assert.equal(dispatched, 1);
snapshot = { batch: { running: true } };
rows = [{ name: 'Crew', machine: null, pending: true, outcome: 'running' }, { name: 'Crew', machine: 'pc2', pending: true, outcome: 'queued' }];
drawn.length = 0; tree = pluginUpdateSection(owner, {});
assert.equal(find(tree, 'st-update-plugins').kids[0], 'Updating…');
assert.equal(find(tree, 'st-update-plugins').attrs.options[0].enabled, false);
assert.deepEqual(drawn.map(row => row.about), ['Updating.', 'Waiting.']);
snapshot = { batch: { running: false } };
rows = [{ name: 'Crew', machine: null, pending: false, outcome: 'updated' }, { name: 'Crew', machine: 'pc2', pending: true, outcome: 'failed', error: 'Permission denied' }];
drawn.length = 0; tree = pluginUpdateSection(owner, {});
assert.deepEqual(drawn, [{ title: 'Crew · This computer', about: 'Up to date.', last: false }, { title: 'Crew · pc2', about: 'Permission denied.', last: true }]);
assert.equal(nodes(tree).filter(el => el.attrs?.options).length, 1);
snapshot.scan = { token: 'refresh', expires: Date.now() + 90000 }; tree = pluginUpdateSection(owner, {});
assert.equal(find(tree, 'st-update-plugins').attrs.options[0].enabled, false);
rows = [{ name: 'Crew', machine: null, pending: false, outcome: 'updated' }];
drawn.length = 0; tree = pluginUpdateSection(owner, {});
assert.ok(find(tree, 'st-plugin-updates'), 'completed batch results remain visible after availability clears');
assert.equal(find(tree, 'st-update-plugins'), undefined, 'completed results add no action');
assert.deepEqual(drawn.map(row => row.about), ['Up to date.']);

// Use the real shared controller to reproduce a discovery owner retiring before
// finally can clear its scan. A later Settings owner must recover at lease expiry.
let clock = 1000000, releaseInventory;
const state = {}, jobs = [];
let inventoryReads = 0;
const real = await loadMod({ globals: { Date: class extends Date { static now() { return clock; } } }, host: {
  shared: key => state[key], setShared: (key, value) => { state[key] = value; },
  checking: () => false, machines: () => [],
  hc: async () => { inventoryReads++; return new Promise(resolve => { releaseInventory = resolve; }); },
}, modules: {
  'gpui-kit': { div: element }, 'gpui-base': { h_flex: element, v_flex: element },
  'plugins/index.js': { default: [] },
}, entry: "export { pluginUpdateSection } from './plugins-update-section.js'; export * from './plugins-updates.js';" });
const pendingRow = { name: 'Crew', machine: null, pending: true };
state[real.PLUGIN_UPDATES_KEY] = { rows: [pendingRow] };
const cx = { notify() {}, sleep: async () => {}, spawn(fn) {
  const job = { done: false, is_done() { return this.done; } };
  jobs.push(Promise.resolve().then(() => fn(cx)).finally(() => { job.done = true; }));
  return job;
} };
const retired = { ...owner };
real.refreshPluginUpdates(retired, cx, { force: true });
for (let i = 0; i < 100 && !releaseInventory; i++) await Promise.resolve();
assert.equal(inventoryReads, 1);
const expires = real.pluginUpdateSnapshot().scan.expires;
retired.pluginUpdatesClosed = true;
releaseInventory({ code: 0, stdout: JSON.stringify({ machines: [] }) });
await Promise.all(jobs);
assert.ok(real.pluginUpdateSnapshot().scan, 'retired owner leaves discovery metadata behind');
assert.equal(real.pluginUpdateSnapshot().rows[0].pending, true, 'retired read preserves pending evidence');
const enabled = () => find(real.pluginUpdateSection(owner, {}), 'st-update-plugins').attrs.options[0].enabled;
assert.equal(enabled(), false, 'replacement owner respects an unexpired discovery lease');
clock = expires - 1;
assert.equal(enabled(), false, 'discovery blocks Update until its full lease elapses');
clock = expires;
assert.equal(enabled(), true, 'Update recovers at the exact scan expiry without a new discovery');
clock++;
assert.equal(enabled(), true, 'abandoned scan metadata cannot keep Update disabled');
owner.pluginFixing = true;
assert.equal(enabled(), false, 'scan expiry does not bypass an ordinary plugin fix');
owner.pluginFixing = false;
assert.equal(inventoryReads, 1, 'render and expiry start no work');
state[real.PLUGIN_UPDATES_KEY] = { rows: [{ ...pendingRow, machine: 'offline' }] };
assert.equal(real.pluginUpdateSection(owner, {}), null, 'disconnected-only pending updates do not leave an empty section');
console.log('PASS: hidden empty Plugins section, retained batch progress/results, one Update action, inline outcomes and retired discovery owner lease expiry');
