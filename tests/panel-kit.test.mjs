// The panel kit (src/ui/panel-kit.js): the parts plugin panels share, with real behaviour.
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { kitModule, withKitUi, realUi } from './support/panel-kit.mjs';
function element() {
  const node = { kids: [], attrs: {} }; let p;
  return p = new Proxy(node, { get: (n, k) => k in n ? n[k] : k === 'when' ? (yes, fn) => yes ? fn(p) : p : k === 'child' ? c => { n.kids.push(c); return p; } : k === 'children' ? c => { n.kids.push(...c); return p; } : (...a) => { n.attrs[k] = a; return p; } });
}
const nodes = n => n && typeof n === 'object' ? [n, ...(n.kids ?? []).flatMap(nodes)] : [];
const find = (n, id) => nodes(n).find(x => x.attrs?.id?.[0] === id);
const words = n => nodes(n).flatMap(x => typeof x === 'string' ? [x] : (x.kids ?? []).filter(k => typeof k === 'string'));
const context = vm.createContext({});
const ui = withKitUi({ U: { row: 28, gap: 8, radius: 6, meta: 12, smallIcon: 14, insetControl: 24, insetRadius: 4, control: 28 },
  spinner: color => element().bulb(true).text_color(color), dropdown: (id, trigger, content, { open }) => element().id(id).child(trigger).when(open, e => e.child(content)) }, element);
const synthetic = values => new vm.SyntheticModule(Object.keys(values), function () { for (const [k, v] of Object.entries(values)) this.setExport(k, v); }, { context });
const kit = kitModule(context);
await kit.link(name => name === './ui.js' ? synthetic(ui) : name === 'gpui-kit' ? synthetic({ div: element, svg: element }) : synthetic({ h_flex: element, v_flex: element }));
await kit.evaluate();
const { headerTool, contextMenu, confirmDialog, panelMessage, tag, inlineDropdown } = kit.namespace;
const t = { dim: 'dim', foreground: 'fg', muted: 'muted', working: 'blue', hover: 'hover', border: 'border' };
const cx = { notify() { this.notified = (this.notified ?? 0) + 1; }, stop_propagation() {} };

// Header tool: inert until its header is hovered.
let clicks = 0;
const off = headerTool(t, { id: 'x-close', icon: 'close.svg', label: 'Close', enabled: false, onClick: () => clicks++ });
off.attrs.on_click[0]({}, cx); assert.equal(clicks, 0, 'A hidden tool does nothing');
headerTool(t, { id: 'x-close', icon: 'close.svg', label: 'Close', enabled: true, onClick: () => clicks++ }).attrs.on_click[0]({}, cx);
assert.equal(clicks, 1); assert.equal(off.attrs.accessibility_label[0], 'Close');

// Context menu: separator, arrow keys, Enter, Escape, pointer highlight.
const chosen = [], state = {}; let closed = 0;
const items = [{ id: 'open', label: 'Open...', icon: 'a.svg' }, { id: 'copy-path', label: 'Copy path', icon: 'b.svg', separator: true }, { id: 'delete', label: 'Delete...', icon: 'c.svg' }];
const menu = () => contextMenu(t, { id: 'm', prefix: 'm-item', items, state, onChoose: item => chosen.push(item.id), onClose: () => closed++ });
assert.ok(find(menu(), 'm-item-separator'), 'A separator sits above the item that asks for it');
const key = k => menu().attrs.on_key_down[0]({ key: k }, cx);
key('enter'); assert.deepEqual(chosen, ['open'], 'Enter with nothing highlighted chooses the first item');
key('down'); key('down'); assert.equal(state.menuAt, 1); assert.equal(find(menu(), 'm-item-copy-path').attrs.bg[0], 'hover', 'The keyboard highlight shows');
key('up'); key('up'); assert.equal(state.menuAt, 2, 'Arrows wrap around');
key('enter'); assert.deepEqual(chosen, ['open', 'delete']);
find(menu(), 'm-item-open').attrs.on_hover[0](true, cx); assert.equal(state.menuAt, 0); assert.equal(state.menuKeyboard, false, 'The pointer takes over the highlight');
key('escape'); assert.equal(closed, 1);
assert.ok(words(contextMenu(t, { id: 'h', prefix: 'h', items, heading: 'owner/repo', headingId: 'h-title', state: {}, onChoose() {}, onClose() {} })).includes('owner/repo'), 'An optional heading names what the menu is for');

// Confirmation: Escape cancels, Enter confirms, both buttons 80 wide.
const asked = [];
const dialog = confirmDialog(t, { id: 'd', title: 'Delete file?', body: 'It goes to the recycle bin.', subject: 'a.txt', confirm: 'Delete', onCancel: () => asked.push('cancel'), onConfirm: () => asked.push('confirm') });
dialog.attrs.on_key_down[0]({ key: 'escape' }, cx); dialog.attrs.on_key_down[0]({ key: 'enter' }, cx);
assert.deepEqual(asked, ['cancel', 'confirm']);
assert.equal(find(dialog, 'd-cancel').attrs.w[0], 80); assert.equal(find(dialog, 'd-confirm').attrs.w[0], 80);
assert.ok(words(dialog).includes('a.txt'));

// Messages: the bulb while loading, a plain muted line otherwise.
const loading = panelMessage(t, 'p', { loading: true });
assert.ok(nodes(loading).some(n => n.attrs?.bulb?.[0] === true), 'Loading shows the working bulb'); assert.ok(words(loading).includes('Loading')); assert.ok(!words(loading).includes('…'), 'The bulb says it’s busy: no ellipsis, like the plugins’ Checking');
const empty = panelMessage(t, 'p', { text: 'No open pull requests' });
assert.ok(!nodes(empty).some(n => n.attrs?.bulb), 'Empty has no bulb'); for (const m of [loading, empty]) { assert.equal(m.attrs.px[0], 8); assert.equal(m.attrs.py[0], 0); assert.equal(m.attrs.min_h[0], 28, 'Messages sit where the first list row does'); }
assert.equal(panelMessage(t, 'p', { text: 'x', rowInset: 2 }).attrs.min_h[0], 32, 'A deeper first line (Git PR rows) lowers the message to match'); assert.equal(empty.attrs.text_color[0], 'dim');

// Tags: capitalised; compact for meta lines.
assert.ok(words(tag(t, 'g', 'max')).includes('Max'));
assert.equal(tag(t, 'g', 'Owner', { compact: true }).attrs.h[0], 16);

// Inline dropdown: the chosen option is ticked, choosing reports its id.
let picked = null;
const dd = inlineDropdown(t, { id: 'acct', optionPrefix: 'acct-choice', text: 'a@x', label: 'Account', options: [{ id: '1', label: 'a@x' }, { id: '2', label: 'b@x' }], selected: '1', open: true, onOpen() {}, onSelect: id => { picked = id; } });
find(dd, 'acct-choice-2').attrs.on_click[0]({}, cx); assert.equal(picked, '2');
assert.equal(find(dd, 'acct-choice-1').kids[1].kids.length, 1, 'The chosen option carries the tick'); assert.equal(find(dd, 'acct-choice-2').kids[1].kids.length, 0);
// The app-wide basics in ui.js, as every header, menu and row uses them.
{
  const { iconButton, menuRow, tag: uiTag, panelTitle } = realUi(element);
  let pressed = 0;
  const dimmed = iconButton(t, { id: 'z', icon: 'zoom.svg', label: 'Zoom', available: false, onClick: () => pressed++ });
  dimmed.attrs.on_click[0]({}, cx); assert.equal(pressed, 0); assert.equal(dimmed.attrs.opacity[0], 0.35, 'An action that cannot apply is dimmed and inert');
  const hidden = iconButton(t, { id: 'h', icon: 'x.svg', label: 'Close', enabled: false, onClick: () => pressed++ });
  hidden.attrs.on_click[0]({}, cx); assert.equal(pressed, 0); assert.equal(hidden.attrs.opacity, undefined, 'A tool hidden until hover is inert, not dimmed');
  assert.equal(iconButton(t, { id: 'n', icon: '+.svg', label: 'New tab', large: true, onClick() {} }).attrs.size[0], 28, 'large is the bar size');
  const waiting = menuRow(t, { id: 'w', label: 'Codex', enabled: false, dim: false, onClick: () => pressed++ });
  waiting.attrs.on_click[0]({}, cx); assert.equal(pressed, 0); assert.equal(waiting.attrs.opacity, undefined, 'dim: false keeps an inert row looking normal');
  assert.equal(menuRow(t, { id: 'o', label: 'Off', enabled: false, onClick() {} }).attrs.opacity[0], 0.4);
  assert.equal(menuRow(t, { id: 'k', label: 'Kbd', highlighted: true, onClick() {} }).attrs.bg[0], 'hover', 'The keyboard highlight shows');
  const needs = uiTag(t, 'n', 'needs you', { tone: 'red' }); assert.equal(needs.attrs.bg[0], 'red26'); assert.ok(words(needs).includes('Needs you'));
  const icon = element().id('prog'), title = panelTitle(t, { id: 'pt', icon, label: 'bash', labelId: 'pt-name', shrink: true, menuLabel: 'Open tab' }, () => pressed++);
  assert.ok(find(title, 'prog') && find(title, 'pt-name'), 'A header title takes a ready icon element and names its label'); title.attrs.on_click[0]({}, cx); assert.equal(pressed, 1);
}
console.log('PASS: panel kit: header tools inert until hovered, context menus with separator/keys/pointer, confirmation keys and widths, loading/empty messages, tags and inline dropdowns');
