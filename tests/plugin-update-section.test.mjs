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
assert.equal(find(tree, 'st-update-plugins'), undefined, 'empty heading has no extra messages or actions');
assert.equal(drawn.length, 0);
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
snapshot.scan = { token: 'refresh' }; tree = pluginUpdateSection(owner, {});
assert.equal(find(tree, 'st-update-plugins').attrs.options[0].enabled, false);
console.log('PASS: minimal Plugins heading/rows, one Update action, local/peer identification and inline running, waiting, success and machine failure');
