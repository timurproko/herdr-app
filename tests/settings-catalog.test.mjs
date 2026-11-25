// Adding one catalog entry must wire every sidebar surface and snapshot validation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { pathToFileURL } from 'node:url';
import { build, project } from '../tools/build.mjs';
import {withKitUi} from './support/panel-kit.mjs';
const read = rel => fs.readFileSync(path.join(project, rel), 'utf8');
const original = read('src/ui/settings-sections.js');
// The only fixture customization is a new section, exactly as a developer adds one.
const catalogSource = original.replace('export const SETTINGS_SECTIONS = [',
  "export const SETTINGS_SECTIONS = [\n  { id: 'future', title: 'Future section', icon: 'cpu' },");
assert.notEqual(catalogSource, original);
function element(asset) {
  const node = { asset, attrs: {}, kids: [] };
  let el;
  el = new Proxy(node, { get(o, key) {
    if (key in o) return o[key];
    if (key === 'when') return (yes, fn) => yes ? fn(el) : el;
    if (key === 'child') return child => { o.kids.push(child); return el; };
    if (key === 'children') return children => { o.kids.push(...children); return el; };
    return (...args) => { o.attrs[key] = args; return el; };
  } });
  return el;
}
const nodes = el => el && typeof el === 'object' ? [el, ...el.kids.flatMap(nodes)] : [];
const find = (el, id) => nodes(el).find(n => n.attrs.id?.[0] === id);
const state = new Map(), overlays = [], calls = [], context = vm.createContext({});
let props = { footer: true };
const host = {
  shared: key => state.get(key), setShared: (key, value) => state.set(key, value),
  window: () => ({ platform: 'windows' }), props: () => props, theme: () => ({}),
  layout: () => ({ id: 'sidebar', size: { px: 268 } }), updates: () => ({ app: {} }),
  run: (...args) => calls.push(args), openOverlay: spec => overlays.push(spec), closeOverlay() {},
  notify() {}, keys: () => [], spaces: () => [], panes: () => [], terminals: () => [], agents: () => [], exec: async () => ({}),
};
const U = { control: 28, row: 28, smallIcon: 14, icon: 16, gap: 8, radius: 6 };
const mocks = {
  './host.js': host,
  './plugins.js': {pluginAllows:()=>false,pluginIsEnabled:()=>true,pluginEvent(){},pluginMenuItems:()=>[],pluginWorkspaceLinks:()=>[]},
  './agent-rename.js': {requestInlineAgentRename:()=>true},

  'gpui-kit': { View: class {}, div: element, svg: element, image: element },
  'gpui-base': { h_flex: element, v_flex: element, Popup: {}, ScrollHandle: { new: () => ({ scroll_to_item() {} }) } },
  './ui.js': { U, DIALOG_SCROLL: { inset: 8, gutter: 8 }, slot: child => element().child(child),
    interactionFill: t => t.hover, menuSurface: (_t, el) => el, hotkey: value => value,
    emptyState: element, badge: element, spaceBadgeColor: () => '#abcdef', menuHeading: (_t,text,el=element()) => el.child(text) },
  // Shared rows and buttons from the real ui.js (filled below).
  './directory.js': { displaySpace: s => s },
  './tab-moves.js': { inspectTabMove: async () => ({ok:false}), tabMoveDestinations: () => [], requestTabMove: () => false },
  './modal-layout.js': { sectionRow: (_t, el) => el, divider: element, dividerHeight: () => 17 },
  './palette-startup.js': { initPalettePolicy() {} },
  './look.js': { enterCustom() {} }, './startup.js': { restoreFrames() {} }, './sidebar-usage.js': { syncSidebarUsage() {} },
  './customization-updates.js': { initCustomizationUpdates() {}, customizationUpdateAvailable: () => false, observeCustomizationUpdates() {}, invalidateCustomizationUpdates() {} },
  './space-colors.js': { spaceColorPicker() {}, setSpaceColor() {}, selectedColorIndex() {}, colorAt() {}, COLOR_COUNT: 0 },
  './tab-rename.js': { requestInlineTabRename() {} }, './space-rename.js': { requestInlineSpaceRename() {} },
  './close-space.js': { closeWithConfirmation() {} },
};
withKitUi(mocks['./ui.js'],element);
const sources = {
  './settings-sections.js': catalogSource,
  './settings-dialog.js': read('src/ui/settings-dialog.js'),
  './sidebar-footer.js': read('src/ui/sidebar-footer.js'),
  './reorder.js': read('src/ui/reorder.js'),
  './sidebar-ui.js': read('src/features/settings/sidebar-ui.js'),
  './settings-back.js': read('src/ui/settings-back.js'),
  './chrome.js': read('src/features/workspace-chrome/main.js'),
  './menu.js': read('src/features/menu/main.js'),
};
const cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const values = mocks[name];
  assert.ok(values || sources[name], `Unknown fixture import: ${name}`);
  const mod = values ? new vm.SyntheticModule(Object.keys(values), function() {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context }) : new vm.SourceTextModule(sources[name], { context });
  cache.set(name, mod); await mod.link(load); return mod;
}
const chromeModule = await load('./chrome.js'); await chromeModule.evaluate();
const model = cache.get('./sidebar-footer.js').namespace;
const catalog = cache.get('./settings-sections.js').namespace;
assert.ok(catalog.settingsSections('windows').some(section => section.id === 'future'), 'Navigation sees the new section');
assert.equal(model.FOOTER_ITEMS.filter(item => item.id === 'future').length, 1);
assert.equal(model.footerVisible('future'), false, 'New shortcuts start off without altering saved choices');
const sidebar = await load('./sidebar-ui.js'); await sidebar.evaluate();
const owner = {
  button: (_t, id, label, handler) => element().id(id).child(label).on_click(handler),
  heading: (_t, label) => element().child(label),
  toggle: (_t, id, on, handler) => element().id(id).child(on).on_click(handler),
};
const cx = { notify() {}, stop_propagation() {}, focus_handle: () => ({ focus() {} }) };
const toggle = find(sidebar.namespace.sidebarLookPage(owner, {}), 'st-sidebar-future');
assert.ok(toggle, 'Configuration includes the new section without another list');
toggle.attrs.on_click[0]({}, cx);
assert.equal(model.footerVisible('future'), true);
const item = model.footerItems().find(item => item.id === 'future');
assert.equal(item.icon, 'mods/custom-settings/cpu.svg');
assert.equal(item.action.command, 'custom.settings');
assert.equal(item.action.args.section, 'future');
const chrome = new chromeModule.namespace.default(); chrome.init({}, cx);
assert.ok(find(chrome.render(cx), 'future'), 'The real footer renders the newly enabled shortcut');
chrome.openFooter('future');
assert.equal(overlays.at(-1).props.section, 'future', 'The real shortcut opens its new section');
props = { tab: 'footer', overlay: 'fixture' };
const menuModule = await load('./menu.js'); await menuModule.evaluate();
const menu = new menuModule.namespace.default(); menu.init({}, cx);
const index = model.footerItems().findIndex(item => item.id === 'future');
const row = find(menu.render(cx), `mi-${index}`);
assert.ok(nodes(row).some(node => node.asset === item.icon), 'Compact menu uses the catalog icon');
menu.choose(index, cx);
assert.equal(overlays.at(-1).props.section, 'future', 'Compact navigation needs no section-specific handler');
assert.equal(calls.length, 0, 'Settings shortcuts never launch terminals');

// Validate the actual standalone Node snapshot module with the same one-entry catalog edit.
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'settings-catalog-'));
try {
  fs.writeFileSync(path.join(temp, 'package.json'), '{"type":"module"}');
  fs.writeFileSync(path.join(temp, 'settings-sections.js'), catalogSource);
  fs.writeFileSync(path.join(temp, 'preferences.mjs'), read('tools/runtime/preferences.mjs'));
  const { syncPreferences } = await import(pathToFileURL(path.join(temp, 'preferences.mjs')));
  const home = path.join(temp, 'home'); fs.mkdirSync(home);
  const saved = JSON.parse(JSON.stringify(state.get(model.FOOTER_KEY)));
  const put = value => fs.writeFileSync(path.join(home, 'shared.json'), JSON.stringify(value));
  const get = rel => JSON.parse(fs.readFileSync(path.join(home, rel), 'utf8'));
  put({ [model.FOOTER_KEY]: saved, session: 'private' });
  const options = { hostname: 'fixture', isDesktopOpen: () => false };
  syncPreferences('export', home, options);
  assert.equal(get('preferences/fixture.json').shared[model.FOOTER_KEY].future, true, 'New section preference is automatically allowlisted');
  put({ session: 'preserved' }); syncPreferences('import', home, options);
  assert.equal(get('shared.json')[model.FOOTER_KEY].future, true);
  assert.equal(get('shared.json').session, 'preserved');
  put({ [model.FOOTER_KEY]: { ...saved, future: 'invalid' } });
  assert.throws(() => syncPreferences('export', home, options), /Invalid sidebar shortcut/);
  put({ [model.FOOTER_KEY]: { ...saved, order: [...saved.order, 'unknown'] } });
  assert.throws(() => syncPreferences('export', home, options), /Invalid sidebar icon order/);
  put({ [model.FOOTER_KEY]: { ...saved, sides: { ...saved.sides, unknown: 'left' } } });
  assert.throws(() => syncPreferences('export', home, options), /Invalid sidebar icon pinning/);
  // Portable multi-select preferences survive round trips; nested/runtime data does not.
  const pluginPrefs={git:{enabled:true,settings:{ciFixStates:['idle','done','error'],autoFixCI:false,ciFixMessage:'Analyze {runUrl}',bad:[{}],duplicate:['idle','idle']}}};
  put({'custom.plugins':pluginPrefs,'custom.git.ci-runtime':{terminal:'private'}});
  syncPreferences('export',home,options);
  assert.deepEqual(get('preferences/fixture.json').shared['custom.plugins'].git.settings,{ciFixStates:['idle','done','error'],autoFixCI:false,ciFixMessage:'Analyze {runUrl}'});
  assert.equal(get('preferences/fixture.json').shared['custom.git.ci-runtime'],undefined);
  put({session:'preserved'});syncPreferences('import',home,options);
  assert.deepEqual(get('shared.json')['custom.plugins'].git.settings.ciFixStates,['idle','done','error']);
  assert.equal(get('shared.json').session,'preserved');
  const { output } = build();
  assert.equal(fs.readFileSync(path.join(output, 'scripts/settings-sections.js'), 'utf8'), original,
    'Packaged snapshot tooling receives the canonical catalog, not a source-dependent bridge');
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
console.log('PASS: one catalog entry automatically adds navigation, configuration, footer/compact icons and actions, safe preference export/import and validation');
