// Render-tree regression only: no installed mod, native app or real space creation.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { realUi } from './support/panel-kit.mjs';

function element() {
  const node = { attrs: {}, kids: [] };
  let proxy;
  return proxy = new Proxy(node, {
    get: (n, key) => key in n ? n[key]
      : key === 'when' ? (yes, fn) => yes ? fn(proxy) : proxy
      : key === 'child' ? child => { n.kids.push(child); return proxy; }
      : key === 'children' ? children => { n.kids.push(...children); return proxy; }
      : (...args) => { n.attrs[key] = args; return proxy; },
  });
}
const read = path => fs.readFileSync(new URL(path, import.meta.url), 'utf8');
const script = source => source.replace(/^import .*;\r?\n/gm, '').replace(/\bexport default /g, '').replace(/\bexport /g, '');
const find = (node, id) => node?.attrs?.id?.[0] === id ? node : node?.kids?.map(child => find(child, id)).find(Boolean);
const theme = { dim: '#889099', muted: '#aabbcc', foreground: '#ffffff', hover: '#202432', selected: '#293248', chrome: '#151821' };
const source = read('../src/features/spaces/main.js');

function fixture(main = source) {
  let width = 240, hostSpaces = [];
  const calls = [];
  const context = vm.createContext({
    ...realUi(element), View: class {}, div: element, h_flex: element, v_flex: element,
    svg: path => element().asset(path), Popup: { new: element },
    spaces: () => hostSpaces, panes: () => [], machines: () => [{ name: 'pc2', layout: 'ready' }],
    layout: () => ({ id: 'sidebar', size: { px: width } }), settings: () => ({ zoom: 1 }),
    theme: () => theme, shared: () => undefined, props: () => ({}),
    pluginWorkspaceLinks: () => [], pluginSpaceTags: () => [], projectLinkedRows: rows => rows,
    displaySpace: space => space, spaceDirectory: () => ({}), reconcileSpaceColors() {}, syncSpaceRename() {},
    sidebarScroll: (_owner, id, _theme, children) => element().id(id).children(children),
    run: (command, args) => calls.push([command, args]),
  });
  vm.runInContext(script(read('../src/ui/reorder.js')) + '\nglobalThis.reorder = reorder;', context);
  vm.runInContext(script(read('../src/ui/space-title.js')) + '\nglobalThis.spaceTitle = spaceTitle;', context);
  vm.runInContext(script(main) + '\nglobalThis.Spaces = Spaces;', context);
  const view = new context.Spaces();
  Object.assign(view, { machines: [{ name: 'pc2', state: 'connected' }], reconnecting: {}, folded: new Set(), shown: new Set(), born: {}, git: {} });
  return { view, calls, retainDragSource: () => { hostSpaces = [{ id: 'ordinary', name: 'Ordinary', machine: 'pc3' }]; view.shown.add('ordinary'); },
    render: compact => { width = compact ? 40 : 240; return view.render({}); } };
}

// Apply recorded native state styles, including inherited foreground on SVG/text.
function style(node, states, inherited = {}) {
  const own = { ...inherited };
  for (const key of ['bg', 'text_color']) if (node.attrs[key]) own[key] = node.attrs[key][0];
  for (const state of states) {
    const callback = node.attrs[state]?.[0];
    if (typeof callback === 'function') Object.assign(own, style(callback(element()), []));
  }
  return own;
}
function assertMuted(node, states, inherited) {
  const resolved = style(node, states, inherited);
  assert.equal(resolved.text_color, theme.dim, 'New space text and inherited plus colour must stay at their resting dim token');
  for (const child of node.kids) if (child?.attrs) assertMuted(child, states, resolved);
}
function check(compact, main = source) {
  const { view, calls, render, retainDragSource } = fixture(main);
  const tree = render(compact);
  const ordinary = compact ? view.compact({ w: { id: 'ordinary', name: 'Ordinary', active: false }, i: 0 }, theme)
    : view.row({ w: { id: 'ordinary', name: 'Ordinary', active: false }, i: 0 }, theme);
  const ids = ['machine-new-local', 'machine-new-pc2', ...(compact ? ['space-new'] : [])];
  for (const id of ids) {
    const row = find(tree, id);
    assert.ok(row, `${id} is rendered by the actual Custom sidebar`);
    assert.equal(row.kids[0].attrs.asset[0], 'mods/custom-workspace-chrome/plus.svg');
    assert.equal(row.kids.includes('New space'), !compact);
    // These plain div controls have no tracked keyboard focus or focus/pressed
    // foreground overrides. Pressing while hovered must retain the same colour.
    assert.equal(row.attrs.track_focus, undefined);
    for (const states of [[], ['hover'], ['focus'], ['active'], ['hover', 'focus'], ['hover', 'active']]) {
      assertMuted(row, states);
      assert.equal(style(row, states).bg, style(ordinary, states).bg, 'New space uses ordinary inactive-row background treatment');
    }
    if (!compact) {
      const title = find(ordinary, 'space-content-ordinary').kids[1];
      assert.equal(style(title, ['hover'], style(ordinary, ['hover'])).text_color, theme.muted, 'Ordinary titles also retain their resting colour');
    }
    assert.equal(calls.length, ids.indexOf(id), 'Rendering and resolving state styles cannot create a space');
    row.attrs.on_click[0]();
    assert.equal(calls.at(-1)[0], 'space.new');
    assert.equal(calls.at(-1)[1]?.machine, id === 'machine-new-local' ? '' : id === 'machine-new-pc2' ? 'pc2' : undefined, 'Creation keeps its original machine routing');
  }
  // Real shared reorder controls continue suppressing New space hover/actions.
  retainDragSource();
  view.drag.begin('ordinary', { position: { x: 0, y: 0 } });
  view.drag.activate({ position: { x: 10, y: 10 } });
  const dragging = render(compact), count = calls.length;
  for (const id of ids) {
    const row = find(dragging, id);
    assert.equal(row.attrs.hover, undefined);
    row.attrs.on_click[0]();
    assert.equal(calls.length, count);
    assertMuted(row, ['hover', 'active']);
  }
}
check(false);
check(true);
// Both original foreground overrides must independently fail this regression.
assert.throws(() => check(false, source.replace(
  '.text_size(12).text_color(t.dim), {hover: s => s.bg(t.hover)})',
  '.text_size(12).text_color(t.dim), {hover: s => s.bg(t.hover).text_color(t.foreground)})',
)), /resting dim token/);
assert.throws(() => check(true, source.replace(
  '{hover: s => s.bg(interactionFill(t))})',
  '{hover: s => s.bg(interactionFill(t)).text_color(t.foreground)})',
)), /resting dim token/);
console.log('PASS: local/remote New space rows and compact creation retain dim text/icon, ordinary hover backgrounds, state and drag guards; both old overrides fail');
