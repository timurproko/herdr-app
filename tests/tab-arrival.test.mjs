import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {realUi} from './support/panel-kit.mjs';

function element() {
  const data = {kids: [], style: {}, transitions: {} }; let el;
  el = new Proxy(data, {get(o, k) {
    if (k in o) return o[k];
    if (k === 'then') return undefined;
    if (k === 'when') return (yes, f) => yes ? f(el) : el;
    if (k === 'child') return c => { if (c != null) o.kids.push(c); return el; };
    if (k === 'children') return cs => { o.kids.push(...cs); return el; };
    if (k === 'transition') return (p, policy) => { o.transitions[p] = policy; return el; };
    return (...args) => { o.style[k] = args; return el; };
  }});
  return el;
}
let world = [{id: 'remote/dest', machine: 'remote', tabs: [{id: 'remote/tab'}]}], active = true;
const timers = [], tasks = [];
let redraws = 0;
const cx = {notify() {redraws++;}, timer: {after(ms, fn) { timers.push({ms, fn}); }}, spawn(fn) { tasks.push(fn); }};
const host = {spaces: () => world, window: () => ({active}), nextCommand: async () => {throw Error('fixture stopped');}};
const context = vm.createContext({});
const module = new vm.SourceTextModule(fs.readFileSync(new URL('../src/features/spaces/tab-arrival.js', import.meta.url), 'utf8'), {context});
await module.link(name => {
  const exports = name === 'gpui-kit' ? {div: element} : host;
  return new vm.SyntheticModule(Object.keys(exports), function() { for (const [k,v] of Object.entries(exports)) this.setExport(k,v); }, {context});
});
await module.evaluate();
const {receiveTabArrival, startTabArrivals, tabArrivalMotion} = module.namespace;
const command = (changes = {}) => 'tab-arrived:' + JSON.stringify({requestId: 'one', spaceId: 'remote/dest', tabId: 'remote/tab', expiresAt: Date.now() + 2000, ...changes});
const owner = {};
assert.equal(receiveTabArrival(owner, 'rename-space', cx), false);
for (const bad of ['tab-arrived:null', 'tab-arrived:{', 'tab-arrived:' + 'x'.repeat(4096), command({expiresAt: 1}), command({expiresAt: Date.now() + 6000}), command({spaceId: 'dest'}), command({tabId: 'missing'}), command({requestId: ''})])
  assert.equal(receiveTabArrival(owner, bad, cx), true);
assert.equal(timers.length, 0);
active = false; receiveTabArrival(owner, command(), cx); assert.equal(timers.length, 0); active = true;
assert.equal(receiveTabArrival(owner, command(), cx), true);
assert.equal(owner.tabArrival.spaceId, 'remote/dest'); assert.equal(owner.tabArrival.machine, 'remote');
assert.equal(owner.tabArrival.phase, 'arm'); assert.equal(timers.length, 3, 'Only phase-boundary timers, not a JS frame loop');
assert.equal(redraws, 1);
const t = {accent: '#abcdef'};
let row = tabArrivalMotion(owner, element(), t);
assert.equal(row.style.top[0], 0); assert.equal(row.kids.length, 0, 'No background/glow layer is created');
const first = timers.splice(0);
first[0].fn(cx); row = tabArrivalMotion(owner, element(), t);
assert.equal(row.style.top[0], -7); assert.equal(row.style.bg, undefined);
assert.equal(row.transitions.top.duration, 140); assert.equal(row.transitions.top.easing, 'ease-out');
assert.equal(row.kids.length, 0, 'The pop animates only the existing content');
first[1].fn(cx); row = tabArrivalMotion(owner, element(), t);
assert.equal(row.style.top[0], 0); assert.equal(row.style.bg, undefined);
assert.equal(row.transitions.top.duration, 220, 'The content settles natively, without a color flash');
first[2].fn(cx); assert.equal(owner.tabArrival, null);
receiveTabArrival(owner, command(), cx); assert.equal(timers.length, 0, 'Duplicate completion commands do not replay');
receiveTabArrival(owner, command({requestId: 'two'}), cx); const old = timers.splice(0);
receiveTabArrival(owner, command({requestId: 'three'}), cx); const current = owner.tabArrival;
for (const step of old) step.fn(cx);
assert.equal(owner.tabArrival, current, 'Old cleanup cannot clear a newer move');
for (const step of timers.splice(0)) step.fn(cx);
startTabArrivals(owner, cx); assert.equal(tasks.length, 1); await assert.rejects(tasks[0](cx), /fixture stopped/);

// Exercise both actual row builders and folded group headers, not just the helper.
const source = fs.readFileSync(new URL('../src/features/spaces/main.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace('export default class Spaces', 'class Spaces').replace(/^export /gm, '');
const reorderSource = fs.readFileSync(new URL('../src/ui/reorder.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
const reorder = new Function('div', 'h_flex', 'Popup', 'U', reorderSource + '; return reorder;')(element, element, {}, {section:36, control:28});
const Spaces = new Function('View', 'div', 'svg', 'h_flex', 'v_flex', 'U', 'spaces', 'shared', 'spaceBadgeColor', 'badge', 'spaceTitle', 'tabArrivalMotion', 'machines', 'slot', 'sidebarSectionHeader', 'itemHover', 'reorder', 'pluginSpaceTags', 'rolePill', 'sidebarDisclosure',
  source + '; return Spaces;')(class {}, element, element, element, element, {row:28,control:28,radius:6,gap:8}, () => world, () => ({}), () => '#123456', element, element, tabArrivalMotion, () => [], x => x, realUi(element).sidebarSectionHeader, () => '#222222', reorder, () => [], element, realUi(element).sidebarDisclosure);
const view = new Spaces(); view.pressed = null; view.folded = new Set(['remote']); view.machines = []; view.reconnecting = {};
view.tabArrival = {spaceId: 'remote/dest', machine: 'remote', phase: 'hop'};
const w = {...world[0], name: 'Destination'};
const nodes = el => [el, ...el.kids.flatMap(c => c && typeof c === 'object' ? nodes(c) : [])];
for (const builder of ['row', 'compact']) {
  const row = view[builder]({w, i:0}, t);
  assert.equal(row.style.top, undefined, 'Hover/selection surface stays fixed');
  const moving = nodes(row).filter(n => n.style.top?.[0] === -7);
  assert.equal(moving.length, 1, `${builder} animates just its content`);
  assert.equal(moving[0].style.id[0], builder === 'row' ? 'space-content-remote/dest' : 'space-badge-remote/dest');
  assert.equal(nodes(row).some(n => n.style.id?.[0] === 'tab-arrival-glow'), false);
  const other = view[builder]({w: {...w, id: 'other'}, i:1}, t);
  assert.equal(nodes(other).some(n => n.style.top), false, 'Unrelated spaces do not move');
}
for (const collapsed of [false, true]) {
  const rows = view.groupRows('remote', [{w}], collapsed, t, () => {throw Error('Folded spaces must remain folded');}, () => false, element);
  assert.equal(rows.length, 1); assert.equal(rows[0].style.top, undefined, 'Machine header surface stays still');
  assert.equal(nodes(rows[0]).filter(n => n.style.top?.[0] === -7).length, 1, 'Folded destination pops only its machine label/icon');
}
assert.deepEqual([...view.folded], ['remote'], 'Feedback never changes saved folding');
console.log('PASS: acknowledged-tab feedback, background-free native pop phases, compact/expanded/folded rows, expiry, qualified identity, deduplication and supersession; no navigation or live Core');
