// Actual publication/controller and renderers, separate sandbox contexts, with
// Herdr 0.1.16's changed-setShared => queued refresh of every loaded root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = file => fs.readFileSync(file, 'utf8');
const KEY = 'custom.customization-update';
function element(asset) {
  const node = { asset, attrs: {}, kids: [] }; let el;
  el = new Proxy(node, { get(o, key) {
    if (key in o) return o[key];
    if (key === 'then') return undefined;
    if (key === 'when') return (yes, fn) => yes ? fn(el) : el;
    if (key === 'child') return child => { o.kids.push(child); return el; };
    if (key === 'children') return children => { o.kids.push(...children); return el; };
    return (...args) => { o.attrs[key] = args; return el; };
  } }); return el;
}
const nodes = el => el && typeof el === 'object' && el.kids ? [el, ...el.kids.flatMap(nodes)] : [];
const find = (tree, id) => nodes(tree).find(el => el.attrs.id?.[0] === id);
const marker = (tree, size) => nodes(tree).find(el => el.attrs.bg?.[0] === '#8844cc' && (el.attrs.size?.[0] === size || el.attrs.w?.[0] === size));
const signature = node => JSON.stringify(node?.attrs);
const store = new Map(), copies = [], refreshes = new Set(), jobs = [], calls = [];
let width = 248, nativeReady = false, coreReady = false, managed = false;
let next = { revision: 'a'.repeat(40), check: { checked: 1000, available: false } };
const theme = Object.fromEntries(['accent', 'chrome', 'muted', 'foreground', 'dim', 'border', 'selected', 'solid', 'solid_foreground'].map((key, i) => [key, i === 0 ? '#8844cc' : `#${String(i).repeat(6)}`]));
const realFiles = {
  './ui.js': 'src/ui/ui.js', './reorder.js': 'src/ui/reorder.js',
  './sidebar-footer.js': 'src/ui/sidebar-footer.js', './settings-sections.js': 'src/ui/settings-sections.js',
  './settings-back.js': 'src/ui/settings-back.js',
  './customization-updates.js': 'src/shared/customization-updates.js',
  './customization-update-model.js': 'src/shared/customization-update-model.js',
  './customization-update-row.js': 'src/features/settings/customization-update-row.js',
  './update-check-feedback.js': 'src/features/settings/update-check-feedback.js',
};
async function mount(kind, props) {
  const context = vm.createContext({ Date, console }), cache = new Map(), requested = new Map();
  const copy = { kind, props, renders: 0, timers: [] };
  const clone = value => value === undefined ? undefined : vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context);
  const noop = () => null;
  const host = {
    props: () => clone(copy.props), theme: () => clone(theme), updates: () => clone({ app: { ready: nativeReady, updates: true }, core: { ready: coreReady, managed }, checks: true }),
    window: () => clone({ platform: 'windows' }), layout: () => clone({ id: 'sidebar', size: { px: width } }),
    appHome: () => '/fixture', checking: () => false, shared: key => clone(store.get(key)),
    setShared(key, value) {
      const encoded = JSON.stringify(value);
      if (encoded === JSON.stringify(store.get(key))) return;
      store.set(key, JSON.parse(encoded));
      for (const root of copies) refreshes.add(root);
    },
    exec: async (_command, args) => { const request = JSON.parse(args[1]); calls.push({ kind, ...request }); return { code: 0, stdout: JSON.stringify(next) }; },
    keys: () => [], spaces: () => [], terminals: () => [], panes: () => [], agents: () => [],
    run: noop, openOverlay: noop, closeOverlay: noop,
  };
  const primitives = { View: class {}, div: element, svg: element, image: element, h_flex: element, v_flex: element,
    Input: {}, InputState: {}, Popover: {}, Scrollbar: { vertical: element }, ScrollHandle: { new: () => ({ scroll_to_item() {} }) },
    Popup: { new: (id, trigger) => element().id(id).child(trigger) } };
  const values = { liveTheme: host.theme, pluginIsEnabled: () => true, pluginTextOpen: () => false,
    M: { bodyInset: 16 }, sectionRow: (_t, el) => el, sectionStack: (_t, el) => el, divider: () => element(), dividerHeight: () => 1 };
  function source(name, file) {
    const text = read(file);
    for (const match of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      const names = requested.get(match[2]) ?? new Set();
      for (const binding of match[1].split(',')) names.add(binding.trim().split(/\s+as\s+/)[0]);
      requested.set(match[2], names);
    }
    return new vm.SourceTextModule(text, { context, identifier: name });
  }
  async function load(name) {
    if (cache.has(name)) return cache.get(name);
    const file = name === './main.js' ? `src/features/${kind}/main.js` : realFiles[name];
    let mod;
    if (file) mod = source(name, file);
    else {
      const exports = name === './host.js' ? { ...Object.fromEntries([...(requested.get(name) ?? [])].map(key => [key, () => { throw Error(`Unexpected host call: ${key}`); }])), ...host } : name.startsWith('gpui-') ? primitives
        : Object.fromEntries([...(requested.get(name) ?? [])].map(key => [key, values[key] ?? noop]));
      mod = new vm.SyntheticModule(Object.keys(exports), function() { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    }
    cache.set(name, mod); return mod;
  }
  const main = await load('./main.js'); await main.link(load); await main.evaluate();
  copy.view = new main.namespace.default();
  copy.cx = { notify: () => refreshes.add(copy), stop_propagation() {}, focus_handle: () => ({ focus() {} }),
    spawn: fn => jobs.push(fn(copy.cx)), timer: { every: (ms, fn) => copy.timers.push({ ms, fn }), after() {} } };
  copy.render = () => { copy.tree = copy.view.render(copy.cx); copy.renders++; };
  copies.push(copy);
  if (kind === 'settings') {
    copy.view.section = 'updates'; copy.view.handle = copy.cx.focus_handle();
    // Unrelated page initialization is excluded, not the real Updates renderer,
    // controller, shared helper, host facade contract or publication path.
    cache.get('./customization-updates.js').namespace.initCustomizationUpdates(copy.view, copy.cx, 'custom-settings');
  } else copy.view.init({}, copy.cx);
  copy.api = cache.get('./customization-updates.js')?.namespace;
  copy.render(); return copy;
}
async function settle() {
  while (jobs.length || refreshes.size) {
    while (jobs.length) await Promise.all(jobs.splice(0));
    const dirty = [...refreshes]; refreshes.clear();
    for (const copy of dirty) copy.render();
  }
}
const settings = await mount('settings', {});
const header = await mount('workspace-chrome', {});
const footer = await mount('workspace-chrome', { footer: true });
const compact = await mount('workspace-chrome', { footer: true });
const menu = await mount('menu', { tab: 'footer' });
await settle();
// Different live layout widths for the two footer roots, as two windows could use.
compact.render = () => { const before = width; width = 44; compact.tree = compact.view.render(compact.cx); compact.renders++; width = before; };
compact.render();
const settingsEntry = () => {
  const index = menu.view.list().findIndex(it => it[7] === 'settings');
  return find(menu.tree, `mi-${index}`);
};
const surfaces = () => [find(footer.tree, 'settings'), find(compact.tree, 'footer-menu'), settingsEntry(), find(settings.tree, 'st-s-updates')];
const markers = () => surfaces().map((tree, i) => marker(tree, i === 3 ? 7 : 6));
assert.deepEqual(markers().map(Boolean), [false, false, false, false]);
assert.equal(footer.timers.length, 0, 'Footer reader has no polling/controller');
assert.ok(header.timers.some(timer => timer.ms === 3600000));
const before = copies.map(copy => copy.renders);
// This is the real rendered row callback, not a test-only publication or render.
next = { ...next, check: { checked: 2000, available: true } };
find(settings.tree, 'st-check-customizations').attrs.on_click[0](null, settings.cx);
await settle();
assert.equal(store.get(KEY).check.available, true);
assert.equal(calls.at(-1).kind, 'settings'); assert.equal(calls.at(-1).action, 'check');
assert.equal(calls.at(-1).force, true);
assert.deepEqual(markers().map(Boolean), [true, true, true, true], 'manual publication refreshes all already-mounted marker roots');
assert.ok(copies.every((copy, i) => copy.renders > before[i]));
const customSignatures = markers().map(signature);
assert.deepEqual(find(footer.tree, 'settings').attrs.relative, []);
assert.deepEqual(markers()[0].attrs.top, [2]); assert.deepEqual(markers()[0].attrs.right, [2]);
assert.deepEqual(markers()[0].attrs.rounded_full, []);
assert.deepEqual(markers()[3].attrs.h, [7]); assert.deepEqual(markers()[3].attrs.rounded, [4]);
// Status publications let us exercise current clearing without a new custom UI
// confirmation or a manually forced render; native changes use the host's refresh.
for (const native of [false, true]) for (const custom of [false, true]) {
  nativeReady = native;
  for (const copy of copies) refreshes.add(copy); // native update-status changed
  next = { ...next, check: { checked: 3000, available: custom } };
  settings.api.refreshCustomizationUpdates(settings.view, settings.cx);
  await settle();
  assert.deepEqual(markers().map(Boolean), Array(4).fill(native || custom), `native=${native}, custom=${custom}`);
  if (native && !custom) assert.deepEqual(markers().map(signature), customSignatures, 'native-only and custom-only markers have identical markup');
}
nativeReady = false; coreReady = true;
next = { ...next, check: { checked: 4000, available: false } };
settings.api.refreshCustomizationUpdates(settings.view, settings.cx); await settle();
assert.deepEqual(markers().map(Boolean), [false, false, false, true], 'Core-only readiness retains the native nav predicate');
managed = true; for (const copy of copies) refreshes.add(copy); await settle();
assert.deepEqual(markers().map(Boolean), [false, false, false, false], 'managed Core does not light navigation');
assert.equal(find(footer.tree, 'settings').attrs.accessibility_label[0], 'Settings');
assert.ok(!markers().some(Boolean));
console.log('PASS: separate Settings/header/footer/menu sandboxes, real manual publication and queued host refresh; all marker combinations and native markup parity. Expanded-footer failure NOT reproduced; no native UI exercised.');
