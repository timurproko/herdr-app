// Render-only regression: no live window, SSH commands or machine changes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root = new URL('../', import.meta.url);
function element() {
  const node = { style: {}, kids: [], events: {} };
  let el;
  el = new Proxy(node, { get(o, key) {
    if (key in o) return o[key];
    if (key === 'child') return child => { o.kids.push(child); return el; };
    if (key === 'children') return children => { o.kids.push(...children); return el; };
    if (key === 'when') return (test, fn) => test ? fn(el) : el;
    if (String(key).startsWith('on_')) return (...args) => { o.events[key] = args.at(-1); return el; };
    return (...args) => { o.style[key] = args; return el; };
  } });
  return el;
}
function walk(n, out = []) {
  if (n && typeof n === 'object') { out.push(n); for (const c of n.kids ?? []) walk(c, out); }
  return out;
}
const stripImports = source => source.replace(/^import .*;\r?\n/gm, '');
const context = vm.createContext({
  View: class {}, div: element, svg: element, v_flex: element, h_flex: element,
  Input: { new: element }, props: () => ({}), theme: () => ({ ansi2: '#33aa66' }),
});
vm.runInContext(stripImports(fs.readFileSync(new URL('lib/ui.js', root), 'utf8')).replace(/export /g, ''), context);
const source = fs.readFileSync(new URL('mods/custom-machine-add/main.js', root), 'utf8');
vm.runInContext(stripImports(source).replace('export default class MachineAdd', 'globalThis.MachineAdd = class MachineAdd'), context);
const view = new context.MachineAdd();
Object.assign(view, { state: {}, added: [], macs: {}, typed: '', input: {}, inputFocused: false });
for (const count of [null, 0, 1, 4, 7, 25]) {
  view.hosts = count === null ? null : Array.from({ length: count }, (_, i) => ({ alias: `host${i}`, aliases: [], hostname: `server${i}`, user: 'user' }));
  const nodes = walk(view.render());
  const area = nodes.find(n => n.style.id?.[0] === 'ma-hosts');
  assert.equal(area.style.h[0], Math.min(280, Math.max(1, count ?? 0) * 40), 'Auto-height dialog needs a definite, bounded native scrollbar viewport');
  assert.ok(area.style.flex_none, 'The viewport cannot shrink back to zero');
  assert.ok(area.style.overflow_y_scrollbar, 'Long lists and expanded row details remain scrollable');
  assert.equal(area.kids.length, count === null ? 1 : count);
  assert.equal(area.style.ml[0] + 16, 8);
  assert.equal(area.style.mr[0] + 16, 0);
  assert.ok(nodes.some(n => n.style.id?.[0] === 'ma-host'), 'Manual entry stays outside the scrolling host list');
}
view.hosts = [{ alias: 'pc2', aliases: [], hostname: '192.168.0.197', user: 'user' }];
view.added = [{ target: 'pc2' }];
let nodes = walk(view.render());
assert.ok(nodes.some(n => n.style.id?.[0] === 'ma-added-pc2'), 'Added status is retained');
view.added = [];
view.state.pc2 = 'Connection failed';
nodes = walk(view.render());
assert.ok(nodes.some(n => n.kids.includes('Connection failed')), 'Expanded errors remain in the scroll content');
const calls = [];
view.add = target => calls.push(target);
nodes.find(n => n.style.id?.[0] === 'ma-add-pc2').events.on_click({}, { stop_propagation() {} });
assert.deepEqual(calls, ['pc2'], 'Add still targets the chosen SSH alias');
console.log('PASS: Add machine definite viewport for loading/empty/short/long lists, shared gutters, manual entry, added state, errors and alias dispatch');
