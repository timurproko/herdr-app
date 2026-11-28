import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { syncPreferences } from '../tools/runtime/preferences.mjs';

function element(asset) {
  const node = { asset, attrs: {}, kids: [] };
  let proxy;
  proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'when') return (yes, fn) => yes ? fn(proxy) : proxy;
    if (key === 'child') return child => { node.kids.push(child); return proxy; };
    if (key === 'children') return children => { node.kids.push(...children); return proxy; };
    return (...args) => { node.attrs[key] = args; if (key === 'on_mouse_down' || key === 'on_mouse_up') node.attrs[`${key}_${args[0]}`] = args[1]; return proxy; };
  } });
  return proxy;
}
function find(node, id) {
  if (!node || typeof node !== 'object') return null;
  if (node.attrs?.id?.[0] === id) return node;
  return node.kids?.map(child => find(child, id)).find(Boolean);
}
const state = new Map(), calls = [], context = vm.createContext({});
let props = { footer: true }, width = 248, boot = 0, platform = 'windows', nativeReady = true, customReady = false;
const host = {
  props: () => props, theme: () => ({}), layout: () => ({ id: 'sidebar', size: { px: width } }),
  window: () => ({ platform }), updates: () => ({ app: { ready: nativeReady } }),
  shared: key => state.get(key), setShared: (key, value) => state.set(key, structuredClone(value)),
  run: (...args) => calls.push(args), openOverlay: spec => calls.push(spec), closeOverlay: id => calls.push(['close', id]),
};
const exports = {
  './host.js': host,
  'gpui-kit': { View: class {}, div: element, svg: element, image: element },
  'gpui-base': { h_flex: element, v_flex: element, Popover: {}, Input: {}, Popup: { new: (id, trigger) => element().id(id).child(trigger) }, ScrollHandle:{new:()=>({scroll_to_item(){}})} },
  './palette-startup.js': { initPalettePolicy() {} },
  './look.js': { enterCustom: () => boot++ }, './startup.js': { restoreFrames: () => boot++ },
  './sidebar-usage.js': { syncSidebarUsage: () => boot++ },
  './customization-updates.js': { initCustomizationUpdates() {}, customizationUpdateAvailable: () => customReady, observeCustomizationUpdates() {}, invalidateCustomizationUpdates() {} },
  './plugins.js': {pluginIsEnabled:()=>true,pluginEvent:()=>boot++},
  './plugins-updates.js': {pluginUpdateAvailable:()=>false,refreshPluginUpdates:()=>boot++},
};
const cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const values = exports[name];
  const file = name === './main.js' ? '../src/features/workspace-chrome/main.js'
    : name === './sidebar-ui.js' ? '../src/features/settings/sidebar-ui.js' : '../src/ui/' + name.slice(2);
  const mod = values ? new vm.SyntheticModule(Object.keys(values), function() {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context }) : new vm.SourceTextModule(fs.readFileSync(new URL(file, import.meta.url), 'utf8'), { context });
  cache.set(name, mod); await mod.link(load); return mod;
}
const mod = await load('./main.js'); await mod.evaluate();
const model = cache.get('./sidebar-footer.js').namespace;
const timers = [];
const cx = { focus_handle: () => ({ focus() {} }), notify() {}, stop_propagation() {},
  timer: { after: (ms, fn) => { timers.push({ ms, fn }); } } };
const tick = ms => { const at = timers.findIndex(timer => timer.ms === ms); assert.ok(at >= 0); timers.splice(at, 1)[0].fn(cx); };
const view = new mod.namespace.default(); view.init({}, cx);
for (const id of ['usage', 'machine', 'plugins', 'settings']) assert.ok(find(view.render(cx), id));
assert.equal(find(view.render(cx), 'settings').kids.length, 2, 'Native readiness retains its dot');
nativeReady = false;
assert.equal(find(view.render(cx), 'settings').kids.length, 1);
customReady = true;
assert.equal(find(view.render(cx), 'settings').kids.length, 2, 'Confirmed Custom availability adds the same expanded dot');
width = 44; assert.equal(find(view.render(cx), 'footer-menu').kids.length, 2, 'Custom availability also lights compact More');
customReady = false; assert.equal(find(view.render(cx), 'footer-menu').kids.length, 1);
width = 248; nativeReady = true;
const footer = find(view.render(cx), 'sidebar-footer-controls');
footer.attrs.on_mouse_down[1]({}, cx);
assert.equal(calls.at(-1).mod, 'custom-workspace-chrome');
assert.equal(calls.at(-1).props.footerMenu, true);
props = { footerMenu: true, overlay: 'test' };
const menu = new mod.namespace.default(); menu.init({}, cx);
assert.equal(boot, 0, 'Opening menu must not start layout/frame/usage controllers');
const configure = find(menu.render(cx), 'footer-toggle-configure');
assert.ok(configure);
assert.equal(configure.attrs.role[0], 'menu_item');
assert.equal(menu.footerEntries().length, 1, 'Context menu has Configure only');
configure.attrs.on_click[0]();
assert.deepEqual(calls.at(-2), ['close', 'test']);
assert.equal(calls.at(-1).mod, 'custom-settings');
assert.equal(calls.at(-1).props.section, 'look');
assert.equal(calls.at(-1).props.lookPage, 'sidebar');
assert.equal(state.size, 0, 'Configure never changes icon preferences');
props = { footer: true };
for (const id of ['usage', 'machines', 'plugins']) model.toggleFooter(id);
model.toggleFooter('settings');
for (const id of ['usage', 'machine', 'plugins']) assert.equal(find(view.render(cx), id), undefined);
assert.ok(find(view.render(cx), 'settings'), 'The global Settings icon cannot be hidden');
width = 44;
assert.ok(find(view.render(cx), 'footer-menu'), 'Compact bar always provides access to Settings');
width = 248;
const next = new mod.namespace.default(); next.init({}, cx);
assert.ok(find(next.render(cx), 'settings'), 'New view retains the mandatory icon');
props = { footerMenu: true, overlay: 'test' };
const key = key => menu.render(cx).attrs.on_key_down[0]({ key }, cx);
for (const k of ['down', 'enter', 'space', 'up', 'enter']) key(k);
assert.equal(calls.at(-1).props.lookPage, 'sidebar', 'Keyboard opens the toggle list directly');
key('escape'); assert.deepEqual(calls.at(-1), ['close', 'test']);
state.set(model.FOOTER_KEY, { version: 99, usage: false });
assert.equal(model.footerVisible('usage'), true, 'Unknown schemas safely default to shown');
model.toggleFooter('unknown'); assert.equal(state.get(model.FOOTER_KEY).version, 99);

// Old visibility-only values gain defaults without losing hidden choices.
state.set(model.FOOTER_KEY, { version: 1, usage: false, machines: true, settings: false });
assert.equal(model.footerVisible('usage'), false); assert.equal(model.footerVisible('plugins'), true);
assert.equal(model.footerSide('plugins'), 'right');
state.delete(model.FOOTER_KEY);
model.moveFooter('settings', 'left', 'usage');
assert.deepEqual(Array.from(model.footerItems('left'), i => i.id), ['settings', 'usage', 'machines']);
model.toggleFooter('usage'); model.toggleFooter('usage');
assert.equal(model.footerSide('settings'), 'left', 'Visibility preserves pinning/order');
model.moveFooter('usage', 'right', 'plugins');
assert.deepEqual(Array.from(model.footerItems('right'), i => i.id), ['usage', 'plugins']);
props = { footerMenu: true, footerItem: 'usage', overlay: 'target-menu' };
assert.equal(find(menu.render(cx), 'footer-pin-left'), undefined);
assert.equal(find(menu.render(cx), 'footer-pin-right'), undefined, 'Icon context menu contains visibility toggles only');

// Actual footer handlers: click vs drag, reorder, cross-side and empty-side drops,
// zoom-aware midpoint hit testing, cancellation and plugin action.
props = { footer: true }; state.delete(model.FOOTER_KEY);
function press(id, x, scale = 1) {
  find(view.render(cx), id).attrs.on_mouse_down_left({ position: { x, y: 12 }, bounds: { x: x - 14 * scale, y: 4 * scale, width: 28 * scale } }, cx);
}
function move(x, scale = 1) {
  find(view.render(cx), 'sidebar-footer-controls').attrs.on_mouse_move[0]({ position: { x, y: 12 }, local_position: { x, y: 12 }, bounds: { width: 248 * scale } }, cx);
}
function release(id = null) {
  find(view.render(cx), id ?? 'sidebar-footer-controls').attrs.on_mouse_up_left({}, cx);
}
let before = calls.length;
press('usage', 22); move(25); release('usage');
assert.equal(calls.length, before + 1); assert.equal(calls.at(-1)[1].name, 'custom-usage');
before = calls.length;
press('usage', 22); move(60);
let dragging = view.render(cx);
for (const id of ['usage', 'machine', 'plugins', 'settings']) {
  const icon = find(dragging, id);
  assert.equal(icon.attrs.hover, undefined, 'All icon hover effects are disabled during drag');
  assert.equal(icon.attrs.tooltip, undefined, 'Normal tooltips are suppressed during drag');
}
assert.equal(find(dragging, 'footer-group-left').attrs.bg, undefined, 'Only the insertion line highlights the destination');
let preview = find(dragging, 'footer-drag-preview');
assert.ok(preview, 'A native popup follows the dragged icon');
const chip = preview.attrs.content[0];
assert.equal(chip.kids.length, 1, 'The drag tooltip contains only its icon');
assert.equal(chip.kids[0].asset, 'mods/custom-usage/gauge.svg');
const oldX = preview.attrs.left[0];
move(61); dragging = view.render(cx); preview = find(dragging, 'footer-drag-preview');
assert.notEqual(preview.attrs.left[0], oldX, 'Preview follows movement even within the same drop slot');
release('machine');
assert.equal(find(view.render(cx), 'footer-drag-preview'), undefined, 'Release removes the drag tooltip');
assert.ok(find(view.render(cx), 'machine').attrs.hover, 'Normal hover returns after drop');
assert.ok(find(view.render(cx), 'machine').attrs.tooltip);
assert.deepEqual(Array.from(model.footerItems('left'), i => i.id), ['machines', 'usage']);
assert.equal(calls.length, before, 'Dragging never opens the icon action');
press('usage', 50); move(232); release('settings');
assert.equal(model.footerSide('usage'), 'right');
assert.deepEqual(Array.from(model.footerItems('right'), i => i.id), ['plugins', 'settings', 'usage']);
state.delete(model.FOOTER_KEY);
press('settings', 452, 2); move(36, 2);
assert.equal(find(view.render(cx), 'footer-drag-preview').attrs.left[0], 28, 'Preview uses zoom-free coordinates');
release('usage');
assert.equal(model.footerSide('settings'), 'left');
assert.deepEqual(Array.from(model.footerItems('left'), i => i.id), ['settings', 'usage', 'machines']);
press('plugins', 226); move(20); release('settings');
assert.equal(model.footerItems('right').length, 0);
press('usage', 78); move(232);
const emptyRight = find(view.render(cx), 'footer-group-right');
assert.equal(emptyRight.attrs.min_w[0], 0, 'Empty right group reserves no phantom icon slot');
assert.equal(find(emptyRight, 'footer-drop-right-end').attrs.left[0], -1, 'Empty-right indicator is centered on the actual footer edge');
release();
assert.equal(model.footerSide('usage'), 'right', 'An empty side accepts a drop');
const savedOrder = JSON.stringify(state.get(model.FOOTER_KEY));
press('usage', 226); move(20);
find(view.render(cx), 'sidebar-footer-controls').attrs.on_hover[0](false, cx);
release(); assert.equal(JSON.stringify(state.get(model.FOOTER_KEY)), savedOrder, 'Leaving cancels without persistence');
assert.equal(find(view.render(cx), 'footer-drag-preview'), undefined, 'Cancellation replaces the popup with a returning chip');
let returning = find(view.render(cx), 'footer-drag-return');
assert.ok(returning);
assert.equal(returning.attrs.left[0], 30, 'Return arms at the last preview position');
assert.equal(find(view.render(cx), 'usage').attrs.opacity[0], 0.45, 'Source stays dim while the chip returns');
assert.deepEqual(timers.map(t => t.ms), [16, 236, 416], 'Only three bounded one-shot phase callbacks');
tick(16);
returning = find(view.render(cx), 'footer-drag-return');
assert.equal(returning.attrs.left[0], 212, 'Return targets the measured source icon');
assert.equal(returning.attrs.top[0], 4);
assert.equal(returning.attrs.opacity[0], 1);
tick(236);
assert.equal(find(view.render(cx), 'footer-drag-return').attrs.opacity[0], 0, 'Chip fades after returning');
assert.equal(find(view.render(cx), 'usage').attrs.opacity[0], 1, 'Source un-dims during the chip fade');
tick(416);
assert.equal(find(view.render(cx), 'footer-drag-return'), undefined, 'Finished return removes the chip');
assert.equal(timers.length, 0);
assert.equal(JSON.stringify(state.get(model.FOOTER_KEY)), savedOrder, 'Return/fade never persists a placement');
press('plugins', 22); release('plugins');
assert.equal(calls.at(-1).mod, 'custom-settings'); assert.equal(calls.at(-1).props.section, 'plugins');
find(view.render(cx), 'plugins').attrs.on_mouse_down_right({}, cx);
assert.equal(calls.at(-1).props.footerMenu, true);
assert.equal(calls.at(-1).props.footerItem, undefined, 'Icon right-click opens the same visibility menu as the empty bar');
// Mirror the empty-right case: both edges use the same zero-width anchor,
// independent of UI zoom or an icon being hidden.
for (const scale of [1, 1.3, 2]) {
  state.set(model.FOOTER_KEY, { version: 1, machines: false, sides: { usage: 'right', plugins: 'right', settings: 'right' } });
  press('usage', 200 * scale, scale); move(10 * scale, scale);
  const emptyLeft = find(view.render(cx), 'footer-group-left');
  assert.equal(emptyLeft.attrs.min_w[0], 0);
  assert.equal(find(emptyLeft, 'footer-drop-left-end').attrs.left[0], -1, 'Left and right insertion anchors are symmetric');
  find(view.render(cx), 'sidebar-footer-controls').attrs.on_hover[0](false, cx);
}
const oldReturn = view.drag.leaving;
const staleTimers = timers.splice(0);
press('plugins', 200); move(20);
assert.equal(view.drag.leaving, null, 'A new press cancels the prior returning chip');
for (const timer of staleTimers) timer.fn(cx);
assert.equal(view.drag.leaving, null);
assert.ok(view.drag.active, 'Stale return callbacks cannot cancel the new drag');
find(view.render(cx), 'sidebar-footer-controls').attrs.on_hover[0](false, cx);
assert.notEqual(view.drag.leaving, oldReturn);
tick(16); tick(236); tick(416);
assert.equal(view.drag.leaving, null);
// A press without a drag cancels without scheduling an animation.
press('plugins', 200);
find(view.render(cx), 'sidebar-footer-controls').attrs.on_hover[0](false, cx);
assert.equal(timers.length, 0);
state.set(model.FOOTER_KEY, { version: 1, order: ['settings', 'settings', 'unknown'], sides: { usage: 'bad' } });
assert.equal(model.footerPreferences().order.length, model.FOOTER_ITEMS.length); assert.equal(model.footerSide('usage'), 'left');

// Settings' chevron opens a fixed section list, never a reorder editor.
const sidebarUI = await load('./sidebar-ui.js'); await sidebarUI.evaluate();
const catalog = cache.get('./settings-sections.js').namespace;
for (const platform of ['windows', 'macos', 'linux']) {
  const ids = Array.from(catalog.settingsSections(platform), section => section.id);
  assert.equal(ids[0], 'look');
  assert.equal(ids.indexOf('core'), ids.indexOf('machines') + 1, 'Core follows Machines on every platform');
}
assert.equal(catalog.SETTINGS_SECTIONS.find(section => section.id === 'core').icon, 'cpu');
assert.equal(model.FOOTER_ITEMS.find(item => item.id === 'core').icon, 'mods/custom-settings/cpu.svg');
assert.equal(catalog.SETTINGS_SECTIONS.find(section => section.id === 'plugins').icon, 'plug');
assert.equal(model.FOOTER_ITEMS.find(item => item.id === 'plugins').icon, 'mods/custom-settings/plug.svg');
const plugGlyph = fs.readFileSync(new URL('../src/shared/plug.svg', import.meta.url), 'utf8');
assert.match(plugGlyph, /fill="none"/);
assert.match(plugGlyph, /stroke-width="1.5"/);
assert.equal(model.FOOTER_ITEMS.find(item => item.id === 'settings').icon, 'mods/custom-workspace-chrome/settings.svg', 'Global Settings keeps its gear');
const coreGlyph = fs.readFileSync(new URL('../src/shared/cpu.svg', import.meta.url), 'utf8');
assert.match(coreGlyph, /<path /);
assert.match(coreGlyph, /fill="none"/);
assert.match(coreGlyph, /stroke="currentColor"/);
assert.match(coreGlyph, /stroke-width="1.5"/);
assert.match(coreGlyph, /x="4" y="4" width="16" height="16"/, 'Core has a slightly larger optical footprint without changing stroke or layout');
assert.match(coreGlyph, /viewBox="0 0 24 24"/);
assert.match(coreGlyph, /stroke-linecap="round"/);
assert.match(coreGlyph, /stroke-linejoin="round"/);
assert.ok(!coreGlyph.includes('fill="currentColor"'), 'Core uses strokes rather than a filled silhouette');
state.set(model.FOOTER_KEY, { version: 1, usage: false, machines: true, settings: false });
assert.equal(model.footerVisible('settings'), true, 'Old hidden-Settings values cannot remove the escape hatch');
assert.equal(model.footerVisible('look'), false, 'New shortcuts do not silently crowd the footer');
const owner = {
  lookPage: null,
  button: (_t, id, label, handler) => element().id(id).child(label).on_click(handler),
  heading: (_t, label) => element().child(label),
  row: (_t, title, _about, control) => element().child(title).child(control),
  toggle: (_t, id, on, handler) => element().id(id).on_click(handler).child(on),
};
const inlineSection = sidebarUI.namespace.statusbarSection(owner, {});
assert.ok(find(inlineSection, 'st-statusbar'));
assert.ok(inlineSection.kids.some(node => node.kids?.includes('Statusbar')), 'Statusbar is an inline Look heading');
const sidebarLink = find(inlineSection, 'st-left-sidebar');
const dimensions=cache.get('./ui.js').namespace.U;
assert.equal(sidebarLink.attrs.h[0],dimensions.field,'Navigation uses the same height as Settings left navigation');
assert.equal(sidebarLink.attrs.px[0],8);assert.equal(sidebarLink.attrs.gap[0],dimensions.gap);
assert.equal(sidebarLink.attrs.rounded[0],dimensions.radius);assert.ok(sidebarLink.attrs.w_auto);assert.ok(sidebarLink.attrs.self_stretch);assert.ok(sidebarLink.attrs.flex_none);assert.equal(sidebarLink.attrs.w_full,undefined);
assert.equal(sidebarLink.attrs.ml[0],-8);assert.equal(sidebarLink.attrs.ml[0]+sidebarLink.attrs.px[0],0,'Left text alignment stays unchanged');
assert.equal(sidebarLink.attrs.mr[0],-8,'The hover reaches 8px past the content on both sides, like a section header');
for(const edge of ['mx','py'])assert.equal(sidebarLink.attrs[edge],undefined,'No conflicting margin or oversized vertical padding');
const hover=element();sidebarLink.attrs.hover[0](hover);assert.ok('bg' in hover.attrs,'Rounded row keeps themed hover feedback');
assert.ok(sidebarLink.kids[0].kids.includes('Left sidebar'));
assert.equal(sidebarLink.kids.at(-1).kids[0].asset,'mods/custom-workspace-chrome/chevron-right.svg','Navigation retains its trailing chevron, in the shared chevron slot');
assert.equal(sidebarLink.kids.at(-1).attrs.size[0],dimensions.control,'The slot is a control-sized box, like a section chevron');assert.ok(sidebarLink.kids.at(-1).attrs.flex_none);
const arrow=sidebarLink.kids.at(-1);assert.equal(arrow.attrs.mr,undefined,'No optical offset: it ends at the content edge');
assert.equal(-sidebarLink.attrs.mr[0]-sidebarLink.attrs.px[0],0,'The chevron slot ends at the content edge, under a section’s chevron');
assert.match(fs.readFileSync(new URL('../src/shared/chevron-right.svg',import.meta.url),'utf8'),/m9 18 6-6-6-6/,'Optical compensation follows the shared stroked glyph geometry');
sidebarLink.attrs.on_click[0]({}, cx);
assert.equal(owner.lookPage, 'sidebar');
for (const section of catalog.settingsSections('windows')) {
  let page = sidebarUI.namespace.sidebarLookPage(owner, {});
  const row = find(page, `st-sidebar-${section.id}`);
  assert.ok(row, `${section.title} has a toggle`);
  assert.equal(find(page, `st-profile-up-${section.id}`), undefined);
  const previous = model.footerVisible(section.id);
  row.attrs.on_click[0]({}, cx);
  assert.equal(model.footerVisible(section.id), !previous);
  props = { footer: true };
  const icon = find(view.render(cx), section.id === 'machines' ? 'machine' : section.id);
  assert.equal(Boolean(icon), !previous, 'Each toggle updates the actual footer');
  if (!previous && section.id !== 'usage') {
    view.openFooter(section.id);
    assert.equal(calls.at(-1).props.section, section.id, 'Section shortcut opens its own Settings page');
  }
}
let page = sidebarUI.namespace.sidebarLookPage(owner, {});
assert.equal(find(page, 'st-sidebar-settings'), undefined, 'Global Settings is not a toggle');
assert.ok(page.kids.some(node => node.kids?.includes('Choose the settings shortcuts shown in the left sidebar status bar.')), 'Description contains only the shortcut instruction');
assert.equal(find(page, 'st-sidebar-keyboard'), undefined);
platform = 'macos'; page = sidebarUI.namespace.sidebarLookPage(owner, {});
assert.ok(find(page, 'st-sidebar-keyboard'), 'macOS includes its Keyboard settings');
model.toggleFooter('keyboard');
assert.ok(model.footerItems().some(item => item.id === 'keyboard'));
platform = 'windows';
assert.ok(!model.footerItems().some(item => item.id === 'keyboard'), 'Restored macOS preferences cannot expose a missing Windows page');
assert.equal(find(page, 'st-look-back'), undefined, 'Back navigation is not part of the scrolling page');
const back = sidebarUI.namespace.lookBackButton(owner, {});
assert.equal(back.attrs.accessibility_label[0], 'Back to Look');
back.attrs.on_click[0]({}, cx); assert.equal(owner.lookPage, null, 'Back returns directly to Look, with no intermediate page');

// Enabling the entire catalog must not push the global gear off the bar.
state.set(model.FOOTER_KEY, { version: 1, ...Object.fromEntries(model.FOOTER_ITEMS.map(item => [item.id, true])) });
props = { footer: true };
for (const sidebarWidth of [160, 248, 480]) {
  width = sidebarWidth;
  const visible = model.footerItems();
  assert.ok(view.footerUnit() * visible.length <= width - 16);
  const tree = view.render(cx);
  assert.ok(find(tree, 'settings'));
  for (const item of visible) assert.equal(find(tree, item.id === 'machines' ? 'machine' : item.id).attrs.w[0], view.footerUnit());
}
width = 248;

const home = fs.mkdtempSync(path.join(os.tmpdir(), 'sidebar-footer-'));
try {
  const saved = { version: 1, usage: false, machines: true, plugins: true, settings: false,
    look: true, core: false, spaces: true, profiles: false, terminals: true, alerts: false, updates: true, privacy: true, keyboard: false,
    order: ['settings', 'usage', 'plugins', 'machines', 'look'], sides: { settings: 'left', plugins: 'right' } };
  fs.writeFileSync(path.join(home, 'shared.json'), JSON.stringify({ [model.FOOTER_KEY]: { ...saved, ignored: 'not portable' }, session: 'private' }));
  syncPreferences('export', home, { hostname: 'fixture' });
  const snapshot = JSON.parse(fs.readFileSync(path.join(home, 'preferences/fixture.json')));
  assert.deepEqual(snapshot.shared, { [model.FOOTER_KEY]: saved });
  fs.writeFileSync(path.join(home, 'shared.json'), JSON.stringify({ session: 'preserved' }));
  syncPreferences('import', home, { hostname: 'fixture', isDesktopOpen: () => false });
  const restored = JSON.parse(fs.readFileSync(path.join(home, 'shared.json')));
  assert.deepEqual(restored[model.FOOTER_KEY], saved); assert.equal(restored.session, 'preserved');
} finally { fs.rmSync(home, { recursive: true, force: true }); }
console.log('PASS: Configure navigation/keyboard, mandatory Settings, section shortcuts, existing drag placement and allowlisted preferences');
