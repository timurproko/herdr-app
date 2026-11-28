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
let clock = 1000000;
class Clock extends Date { static now() { return clock; } }
let snapshot = {}, checks = 0, updates = 0, layout = [{ name: 'pc2', layout: 'ready' }];
const { pluginUpdateRow, pluginUpdateRowState, initUpdateCheckFeedback } = await loadMod({ globals: { Date: Clock }, host: { machines: () => layout }, modules: {
  'gpui-kit': { div: element }, 'gpui-base': { h_flex: element, v_flex: element }, 'ui.js': { U: { field: 28 } },
  'plugins-updates.js': {
    pluginUpdateSnapshot: () => snapshot,
    refreshPluginUpdates: (_owner, _cx, options) => { assert.equal(options.force, true); checks++; snapshot.scan = { expires: clock + 90000 }; },
    updatePlugins: () => { updates++; snapshot.batch = { running: true }; },
  },
}, entry: "export { pluginUpdateRow } from './plugins-update-row.js'; export { pluginUpdateRowState } from './plugin-update-model.js'; export { initUpdateCheckFeedback } from './update-check-feedback.js';" });
const drawn = [], owner = {
  heading() { throw Error('Plugins must not add a heading'); },
  button: (_t, id, label, click, options) => element().id(id).child(label).on_click(click).options(options),
  row: (_t, title, about, action) => { drawn.push({ title, about: about.kids[0] }); return element().id(`st-row-${title}`).child(about).child(action); },
};
const draw = () => { drawn.length = 0; return pluginUpdateRow(owner, {}); };
const button = tree => find(tree, 'st-update-plugins');
const enabled = tree => button(tree).attrs.options[0].enabled;
const click = tree => button(tree).attrs.on_click[0](null, {});
const pending = { name: 'Crew', machine: null, pending: true };
let tree = draw();
assert.deepEqual(drawn, [{ title: 'herdr-app-plugins', about: 'Not checked.' }]);
assert.equal(button(tree).kids[0], 'Check now'); assert.equal(enabled(tree), true);
assert.deepEqual(find(tree, 'st-plugins-slot').attrs.w, [112]);
assert.deepEqual(find(tree, 'st-plugins-slot').attrs.h, [28]);
assert.deepEqual(tree.kids[0].attrs.max_h, [36], 'status stays within the ordinary two-line description');
assert.equal(find(tree, 'st-plugin-updates'), undefined, 'no separate section wrapper');
assert.equal(checks + updates, 0, 'render starts no work');
click(tree); click(tree);
assert.equal(checks, 1, 'explicit Check now is forced and duplicate retained callbacks respect the active lease');
assert.equal(enabled(draw()), false); assert.equal(button(draw()).kids[0], 'Checking…');
let tick, notifications = 0;
const passive = {};
const feedbackCx = { notify: () => notifications++, timer: { every: (ms, fn) => { assert.equal(ms, 300); tick = fn; } } };
initUpdateCheckFeedback(passive, feedbackCx, [{ key: 'asked', checking: () => false, watching: () => snapshot.scan.expires > clock }]);
tick(feedbackCx);
clock = snapshot.scan.expires;
tick(feedbackCx);
assert.equal(notifications, 2, 'existing cadence redraws once at expiry even without an initiating click');
tick(feedbackCx); assert.equal(notifications, 2, 'expired work does not keep redrawing');
assert.equal(passive.asked, undefined, 'background work never arms recent-check confirmation');
assert.equal(enabled(draw()), true, 'exact scan expiry releases Check now');
owner.pluginUpdateAsked = null;
const check = { checked: clock, known: true, machines: [null, 'pc2'] };
snapshot = { check };
tree = draw();
const date = new Date(clock), time = `${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
assert.equal(drawn[0].about, `Up to date. Checked at ${time}.`);
assert.equal(button(tree).kids[0], 'Check now');
owner.pluginUpdateAsked = clock;
assert.equal(button(draw()).kids[0], '✓ Up to date'); assert.equal(enabled(draw()), false);
clock += 3000;
assert.equal(button(draw()).kids[0], 'Check now', 'native three-second feedback expires');
const oldCheck = draw(); snapshot = { check, rows: [{ ...pending }, { ...pending, machine: 'pc2' }] };
click(oldCheck); assert.equal(checks, 1, 'retained Check now cannot dispatch after action changes');
tree = draw();
assert.equal(drawn[0].about, 'Update available: Crew on This computer; Crew on pc2.');
assert.equal(button(tree).kids[0], 'Update'); assert.equal(enabled(tree), true);
click(tree); click(tree); assert.equal(updates, 1, 'duplicate retained Update callbacks cannot start a second batch');
assert.equal(button(draw()).kids[0], 'Updating…'); assert.equal(enabled(draw()), false);
snapshot.rows[0].outcome = 'updated'; snapshot.rows[0].pending = false;
snapshot.rows[1].outcome = 'running'; draw();
assert.equal(drawn[0].about, 'Updating Crew on pc2. 1 updated.');
snapshot.batch.running = false; snapshot.rows[1].outcome = 'failed'; snapshot.rows[1].error = 'Permission denied'; draw();
assert.equal(drawn[0].about, 'Crew on pc2: Permission denied. 1 updated.');
snapshot.rows[1] = { ...snapshot.rows[1], pending: false, outcome: 'updated', error: null };
tree = draw(); assert.equal(drawn[0].about, `Up to date. Checked at ${time}.`); assert.equal(button(tree).kids[0], 'Check now');
for (const value of [{}, { check: { ...check, known: false } }, { check: { ...check, error: 'unavailable' } },
  { check, rows: [{ ...pending, pending: false, known: false }] }]) {
  snapshot = value; draw(); assert.doesNotMatch(drawn[0].about, /Up to date|Checked at/, 'unknown/failed evidence never claims current');
}
snapshot = { check }; layout.push({ name: 'new-peer', layout: 'ready' }); draw();
assert.equal(drawn[0].about, 'Not checked.', 'a new connected machine is not covered by an old successful check');
layout = [];
snapshot = { check, rows: [{ ...pending, machine: 'offline' }] }; tree = draw();
assert.equal(button(tree).kids[0], 'Check now'); assert.match(drawn[0].about, /^Up to date/);
const many = pluginUpdateRowState({ rows: ['a', 'b', 'c', 'd'].map(machine => ({ ...pending, machine })) }, {
  machines: ['a', 'b', 'c', 'd'].map(name => ({ name, layout: 'ready' })),
});
assert.equal(many.description, 'Update available: Crew on a; Crew on b; 2 more.');

// Real controller: retirement can leave shared scan metadata behind. A replacement
// row must recover without another read, and expired/obsolete replies cannot win.
const state = {}, jobs = []; let releaseInventory, inventoryReads = 0;
const real = await loadMod({ globals: { Date: Clock }, host: {
  shared: key => state[key], setShared: (key, value) => { state[key] = value; },
  checking: () => false, machines: () => [],
  hc: async () => { inventoryReads++; return new Promise(resolve => { releaseInventory = resolve; }); },
}, modules: {
  'gpui-kit': { div: element }, 'gpui-base': { h_flex: element, v_flex: element }, 'ui.js': { U: { field: 28 } },
  'plugins/index.js': { default: [] },
}, entry: "export { pluginUpdateRow } from './plugins-update-row.js'; export * from './plugins-updates.js';" });
state[real.PLUGIN_UPDATES_KEY] = { rows: [pending] };
const cx = { notify() {}, sleep: async () => {}, spawn(fn) {
  const job = { done: false, is_done() { return this.done; } };
  jobs.push(Promise.resolve().then(() => fn(cx)).finally(() => { job.done = true; })); return job;
} };
const retired = { ...owner };
real.refreshPluginUpdates(retired, cx, { force: true });
for (let i = 0; i < 100 && !releaseInventory; i++) await Promise.resolve();
assert.equal(inventoryReads, 1);
const expires = real.pluginUpdateSnapshot().scan.expires;
retired.pluginUpdatesClosed = true;
releaseInventory({ code: 0, stdout: JSON.stringify({ machines: [] }) }); await Promise.all(jobs);
assert.ok(state[real.PLUGIN_UPDATES_KEY].scan, 'retired owner leaves raw metadata behind');
const realEnabled = () => enabled(real.pluginUpdateRow(owner, {}));
clock = expires - 1; assert.equal(realEnabled(), false);
clock = expires; assert.equal(realEnabled(), true);
clock++; assert.equal(realEnabled(), true);
assert.equal(real.pluginUpdateSnapshot().rows[0].pending, true);
owner.pluginFixing = true; assert.equal(realEnabled(), false); owner.pluginFixing = false;
state[real.PLUGIN_UPDATES_KEY].batch = { running: true, expires: clock + 360000 };
assert.equal(realEnabled(), false, 'scan expiry cannot bypass batch ownership');
state[real.PLUGIN_UPDATES_KEY].batch = null;
assert.equal(inventoryReads, 1, 'render and expiry start no work');
releaseInventory = null;
real.refreshPluginUpdates(owner, cx, { force: true });
for (let i = 0; i < 100 && !releaseInventory; i++) await Promise.resolve();
clock = real.pluginUpdateSnapshot().scan.expires;
releaseInventory({ code: 0, stdout: JSON.stringify({ machines: [] }) }); await Promise.all(jobs);
assert.equal(real.pluginUpdateSnapshot().check.known, false, 'a read completing after lease expiry cannot publish successful completion');
assert.equal(real.pluginUpdateSnapshot().rows[0].pending, true);
console.log('PASS: single native-style plugin row, truthful current/check feedback, inline availability/progress/results, stale callbacks and retired/expired discovery leases');
