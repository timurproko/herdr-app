// Exercise the real Settings render tree: Back belongs to the fixed dialog header.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const read = rel => fs.readFileSync(new URL('../src/' + rel, import.meta.url), 'utf8');
const sources = {
  './settings.js': read('features/settings/main.js'),
  './sidebar-ui.js': read('features/settings/sidebar-ui.js'),
  './settings-back.js': read('ui/settings-back.js'),
  './sidebar-footer.js': read('ui/sidebar-footer.js'),
  './settings-sections.js': read('ui/settings-sections.js'),
};
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
const noop = () => {};
const values = {
  View: class {}, div: element, svg: element, image: element, h_flex: element, v_flex: element,
  U: { field: 32, control: 28, icon: 16, smallIcon: 14, font: 13, meta: 12, gap: 8, radius: 6, rowGap: 2 },
  DIALOG_SCROLL: { inset: 8, gutter: 8 },
  liveTheme: () => ({}), updates: () => ({ app: {}, core: {} }), window: () => ({ platform: 'windows' }),
  props: () => ({}), shared: () => undefined,
  dialogSurface: (_t, el) => el,
  dialogHeader: (_t, title, close, tools) => element().id('dialog-header').child(title).child(tools),
  dialogScrollFrame: el => el, dialogScrollBody: el => el, dialogScrollbar: el => el,
  Scrollbar: { vertical: id => element().id('scrollbar').target(id) },
  ScrollHandle: { new: () => ({ resets: 0, scroll_to_item(index) { assert.equal(index, 0); this.resets++; } }) },
  slot: child => element().child(child), sectionRow: (_t, el) => el,
};
// Mock unrelated page controllers without running their initialization or services.
const requested = new Map();
for (const source of Object.values(sources)) for (const match of source.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
  const names = requested.get(match[2]) ?? new Set();
  for (const binding of match[1].split(',')) names.add(binding.trim().split(/\s+as\s+/)[0]);
  requested.set(match[2], names);
}
const context = vm.createContext({}), cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const mod = sources[name] ? new vm.SourceTextModule(sources[name], { context })
    : new vm.SyntheticModule([...requested.get(name)], function() {
      for (const key of requested.get(name)) this.setExport(key, values[key] ?? noop);
    }, { context });
  cache.set(name, mod); await mod.link(load); return mod;
}
const main = await load('./settings.js'); await main.evaluate();
const view = new main.namespace.default();
view.section = 'look'; view.lookPage = 'sidebar';
view.button = (_t, id, label, click) => element().id(id).child(label).on_click(click);
view.heading = (_t, label) => element().child(label);
view.toggle = (_t, id, on, click) => element().id(id).child(on).on_click(click);
view.handle = { focus() {} };
view.close = () => assert.fail('Subpage navigation must not close Settings');
const renderLook = view.look.bind(view);
view.look = (t, cx) => view.lookPage ? renderLook(t, cx) : element().id('main-look');
const cx = { notify() {}, stop_propagation() {} };
let tree = view.render(cx);
const button = find(tree, 'st-look-back');
assert.ok(button);
assert.deepEqual(find(button, 'st-look-back-label').kids,['Look'],'Sidebar navigation names its destination');
const chevron = nodes(button).find(node => node.asset === 'mods/custom-workspace-chrome/chevron-left.svg');
assert.ok(chevron, 'Back keeps the outline chevron');
assert.ok(button.attrs.absolute);
assert.equal(button.attrs.left[0] + button.attrs.px[0] + chevron.attrs.size[0] + button.attrs.gap[0],
  176 + values.DIALOG_SCROLL.inset + 16, 'The destination label, not its hover box or chevron, aligns with content');
assert.equal(button.attrs.border_1, undefined, 'Back is not a boxed form button');
assert.equal(button.attrs.bg, undefined, 'Normal Back has no persistent background');
assert.ok(button.attrs.hover);
assert.equal(button.attrs.top[0], 8, 'Back stays vertically centered in the fixed header');
assert.ok(nodes(find(tree, 'dialog-header')).includes(button), 'Back stays in the native fixed header');
assert.equal(find(find(tree, 'st-content'), 'st-look-back'), undefined, 'No navigation spacer or button in the content column');
assert.equal(find(find(tree, 'st-body-sidebar'), 'st-look-back'), undefined, 'Scrolling the page cannot move the button');
assert.ok(find(tree, 'st-sidebar-look'), 'Normal page content still renders');
assert.ok(find(tree, 'st-scroll-frame').attrs.absolute);
assert.equal(button.attrs.accessibility_label[0], 'Back to Look');
button.attrs.on_click[0]({}, cx);
assert.equal(view.lookPage, null);
tree = view.render(cx);
assert.equal(find(tree, 'st-look-back'), undefined, 'Main Look has the ordinary header');
assert.ok(find(tree, 'main-look'));
view.lookPage = 'sidebar'; tree = view.render(cx);
tree.attrs.on_key_down[0]({ key: 'escape' }, cx);
assert.equal(view.lookPage, null, 'Escape preserves the same back behavior');
view.section='plugins';view.pluginTarget='git';tree=view.render(cx);
const pluginBack=find(tree,'st-plugin-back');assert.ok(pluginBack);
assert.deepEqual(find(pluginBack,'st-plugin-back-label').kids,['Plugins'],'Plugin navigation names its destination');
assert.equal(pluginBack.attrs.accessibility_label[0],'Back to Plugins');
for(const key of ['absolute','top','left','px','gap','h','rounded','border_1','bg'])assert.deepEqual(pluginBack.attrs[key],button.attrs[key],`The same header Back style is used: ${key}`);
assert.ok(nodes(find(tree,'dialog-header')).includes(pluginBack));
assert.equal(find(find(tree,'st-content'),'st-plugin-back'),undefined,'Plugin Back is outside the scrolling content');
pluginBack.attrs.on_click[0]({},cx);assert.equal(view.pluginTarget,null);
tree=view.render(cx);assert.equal(find(tree,'st-plugin-back'),undefined,'Full plugin catalog uses the ordinary header');
view.pluginTarget='git';tree=view.render(cx);tree.attrs.on_key_down[0]({key:'escape'},cx);assert.equal(view.pluginTarget,null,'Escape returns to Plugins without closing Settings');
let closed=0;view.close=()=>closed++;tree=view.render(cx);tree.attrs.on_key_down[0]({key:'escape'},cx);assert.equal(closed,1,'Escape from the full catalog still closes Settings');
// Back restores the parent's position: each depth owns a handle that outlives the
// frame, and only a newly opened subpage is sent to the top.
const scrollOf = (tree, id) => find(tree, id).attrs.track_scroll[0];
view.section = 'look'; view.lookPage = null; view.pluginTarget = null;
tree = view.render(cx); const parentScroll = scrollOf(tree, 'st-body');
view.lookPage = 'sidebar'; tree = view.render(cx); const childScroll = scrollOf(tree, 'st-body-sidebar');
assert.notEqual(childScroll, parentScroll, 'A subpage never shares the parent page scroll position');
const opened = childScroll.resets; tree = view.render(cx);
assert.equal(childScroll.resets, opened, 'Redrawing an open subpage keeps its scroll position');
tree.attrs.on_key_down[0]({ key: 'escape' }, cx); tree = view.render(cx);
assert.equal(scrollOf(tree, 'st-body'), parentScroll, 'Back returns to the parent page at its kept position');
assert.equal(parentScroll.resets, 0, 'The parent page is never reset to the top');
view.lookPage = 'sidebar'; tree = view.render(cx);
assert.equal(childScroll.resets, opened + 1, 'Reopening a subpage starts at the top');
view.section = 'plugins'; view.lookPage = null; view.pluginTarget = 'git'; tree = view.render(cx);
assert.equal(scrollOf(tree, 'st-body'), childScroll, 'Plugin subpages use the same component-level scroll rule');
assert.equal(childScroll.resets, opened + 2, 'Switching to another subpage starts at the top');
find(tree, 'st-plugin-back').attrs.on_click[0]({}, cx); tree = view.render(cx);
assert.equal(scrollOf(tree, 'st-body'), parentScroll);
assert.match(sources['./settings.js'], /init\([^)]*\)\s*\{[\s\S]*?initSettingsPageScroll\(this\)/, 'Scroll handles are created in init');
const component=cache.get('./settings-back.js').namespace.settingsBackButton;
let navigated=0;const extra=component(view,{}, {id:'another-parent',parent:'Profiles',onBack:()=>navigated++});
assert.deepEqual(find(extra,'another-parent-label').kids,['Profiles']);assert.equal(extra.attrs.accessibility_label[0],'Back to Profiles');
extra.attrs.on_click[0]({},cx);assert.equal(navigated,1,'New callers automatically follow the same parent-label convention');
assert.throws(()=>component(view,{}, {id:'invalid-parent',onBack(){}}),/parent section name/);
console.log('PASS: shared parent-section header component derives destination/accessibility labels, preserves geometry and supports click/Escape navigation');
