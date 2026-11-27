import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {realUi} from './support/panel-kit.mjs';
import {loadMod} from '../tools/plugin-harness.mjs';
const {pluginAgentGroupFirst}=await loadMod({host:{},entry:"export {pluginAgentGroupFirst} from './plugins.js';"});

function element() {
  const node = { attrs: {}, kids: [] }; let proxy;
  proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'then') return undefined;
    if (key === 'when') return (yes, fn) => yes ? fn(proxy) : proxy;
    if (key === 'child') return child => { node.kids.push(child); return proxy; };
    if (key === 'children') return children => { node.kids.push(...children); return proxy; };
    return (...args) => { node.attrs[key] = args; return proxy; };
  } });
  return proxy;
}
function nodes(node, out = []) {
  if (node && typeof node === 'object') { out.push(node); for (const child of node.kids ?? []) nodes(child, out); }
  return out;
}
const list = [
  { address: 't0', space: 's0', space_name: 'Pinned', pinned: true, status: 'idle' },
  { address: 't1', space: 's1', space_name: 'a1', status: 'idle' },
  { address: 't2', space: 's2', space_name: 'Other', status: 'working' },
  { address: 'pc2/t3', space: 'pc2/s1', space_name: 'remote-folder', status: 'blocked' },
  { address: 't4', space: 's3', space_name: 'a1', status: 'idle' },
  { address: 't5', space: 's4', space_name: 'A1', status: 'idle' },
  { address: 't6', space: 's5', space_name: 'Pinned', status: 'idle' },
].map((agent, seq) => ({ ...agent, pane: `p-${agent.address}`, title: `Task ${seq}`, seq }));
let sort = 'grouped', width = 268, order;
let paneList = [], terminalList = [], selection = null;
let spaceList = [{ id: 'pc2/s1', name: 'a1' }];
const calls = [], overlays = [], storage = new Map();
const host = {
  agents: () => list, terminals: () => terminalList, panes: () => paneList, focused: () => selection,
  spaces: () => spaceList, home: () => 'C:/Users/me',
  run: (...args) => calls.push(args), theme: () => ({}), shared: () => sort,
  setShared() {}, setAgentOrder: value => { order = Array.from(value); },
  openOverlay: value => overlays.push(value), closeOverlay() {}, props: () => ({}),
  window: () => ({ platform: 'windows' }), layout: () => ({ id: 'sidebar', size: { px: width } }),
};
const context = vm.createContext({ localStorage: {
  getItem: key => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value), removeItem: key => storage.delete(key),
} });
const dependencies = {
  'gpui-kit': { View: class {}, div: element, image: element, svg: element },
  'gpui-base': { v_flex: element, h_flex: element },
  './ui.js': { ...realUi(element), U: {}, emptyState: element, slot: element, itemHover() {}, statusBulb: element, menuSurface: (_t, el) => el, chevron: element, menuHeading: element },
  './program-icon.js': { programIcon: element },
  './plugins.js': { pluginAgentGroupFirst, pluginMenuItems:(name) => {
    assert.equal(name, 'agents.context');
    return [{id:'other',run(){throw Error('Agent clicks must not run plugin menu actions');}}];
  } },
  './sidebar-scroll.js': { sidebarScroll: (_view, _id, _t, rows) => element().children(rows) },
  './host.js': host,
};
const mod = new vm.SourceTextModule(fs.readFileSync(new URL('../src/features/agents/main.js', import.meta.url), 'utf8'), { context });
const native = new vm.SyntheticModule(Object.keys(host), function() {
  for (const [key, value] of Object.entries(host)) this.setExport(key, value);
}, { context });
const terminalLabels = new vm.SourceTextModule(fs.readFileSync(new URL('../src/integration/herdr/terminal-labels.js', import.meta.url), 'utf8'), { context });
await terminalLabels.link(() => { throw Error('Unexpected terminal-label dependency'); });
const directory = new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/directory.js', import.meta.url), 'utf8'), { context });
const providerModules = new Map();
function providerModule(url) { const key=String(url);if(!providerModules.has(key))providerModules.set(key,new vm.SourceTextModule(fs.readFileSync(url,'utf8'),{context,identifier:key}));return providerModules.get(key); }
const provider = providerModule(new URL('../src/integration/agent-context/context.js',import.meta.url));
await provider.link((name,ref)=>providerModule(new URL(name,ref.identifier)));
await directory.link(name => name === './host.js' ? native : name === './terminal-labels.js' ? terminalLabels : provider);
await mod.link(name => name === './directory.js' ? directory : name === './host.js' ? native : new vm.SyntheticModule(Object.keys(dependencies[name]), function() {
  for (const [key, value] of Object.entries(dependencies[name])) this.setExport(key, value);
}, { context }));
await mod.evaluate();
const agents = new mod.namespace.default();
const cx = { timer: { every() {} }, notify() {}, stop_propagation() {} };
agents.init({}, cx);
function render() {
  const all = nodes(agents.render(cx));
  return {
    all, byId: id => all.find(node => node.attrs.id?.[0] === id),
    rows: all.map(node => node.attrs.id?.[0]).filter(id => id?.startsWith('ag-') && !['ag-sort', 'ag-header'].includes(id)),
  };
}
const expected = ['t0', 't1', 'pc2/t3', 't4', 't2', 't5', 't6'];
let view = render();
assert.deepEqual(view.all.filter(node => node.attrs.id?.[0]?.startsWith('sp-')).map(node => node.kids[0].kids[0]), ['a1', 'Other', 'A1', 'Pinned']);
assert.deepEqual(order, expected);
assert.deepEqual(view.rows, expected.map(address => `ag-${address}`));
assert.equal(view.byId('agent-count-sp-a1').kids[0].kids[0], '3');
assert.ok(nodes(view.byId('ag-pc2/t3')).some(node => node.kids.includes('pc2')));
view.byId('ag-pc2/t3').attrs.on_click[0]();
assert.deepEqual(structuredClone(calls.at(-1)), ['pane.focus', { pane: 'p-pc2/t3' }]);
assert.ok(view.byId('pinned')); assert.ok(view.byId('sp-Pinned'));
// Every click count keeps ordinary navigation, never an editor or plugin action.
const overlayCount = overlays.length;
assert.equal(agents.renameFromClick, undefined, 'Retired inline editor has no entrypoint');
for (const mode of ['grouped', 'priority']) for (const size of [268, 44]) {
  sort = mode; width = size;
  for (const address of ['t0', 't1', 'pc2/t3']) for (const count of [1, 2, 3]) {
    const row = render().byId(`ag-${address}`), before = calls.length;
    row.attrs.on_click[0]({click_count:count}, cx);
    assert.equal(calls.length, before + 1);
    assert.deepEqual(structuredClone(calls.at(-1)), ['pane.focus', {pane:`p-${address}`}]);
    assert.ok(!render().all.some(node => node.attrs.id?.[0]?.startsWith('agent-rename-')));
  }
}
sort = 'grouped'; width = 268;
terminalList.push({address:'tchild',parent:'t1',state:'live',status:'idle',name:'Child'});
for (const count of [1, 2, 3]) {
  const subrow = render().byId('sub-tchild'), before = calls.length;
  subrow.attrs.on_click[0]({click_count:count}, cx);
  assert.equal(calls.length, before + 1);
  assert.deepEqual(structuredClone(calls.at(-1)), ['terminal.peek', {terminal:'tchild'}]);
}
terminalList.pop();
assert.equal(overlays.length, overlayCount, 'Agent clicks never open a rename modal or context menu');
view = render();
view.byId('sp-a1').attrs.on_click[0]({}, cx);
view = render();
assert.deepEqual(view.rows, ['ag-t0', 'ag-t2', 'ag-t5', 'ag-t6']);
assert.deepEqual(order, expected, 'Folding does not change agent navigation membership');
view.byId('sp-a1').attrs.on_click[0]({}, cx);
assert.deepEqual(render().rows, expected.map(address => `ag-${address}`));
width = 44; view = render();
assert.deepEqual(view.rows, expected.map(address => `ag-${address}`));
assert.deepEqual(order, expected); assert.equal(view.byId('sp-a1'), undefined);
for (const mode of ['priority', 'grouped']) {
  sort = mode; width = 268; view = render();
  const button = view.byId('ag-sort');
  assert.equal(button.attrs.tooltip, undefined);
  assert.equal(button.attrs.accessibility_label[0], 'Group agents by');
  button.attrs.on_click[0]({}, cx);
  assert.equal(overlays.at(-1).mod, 'custom-agents');
  assert.equal(overlays.at(-1).props.sortMenu, true);
  if (mode === 'priority') {
    assert.deepEqual(order, ['t0', 'pc2/t3', 't2', 't6', 't5', 't4', 't1']);
    assert.deepEqual(view.all.map(node => node.attrs.id?.[0]).filter(id => id === 'pinned' || id?.startsWith('sec-')), ['pinned', 'sec-4', 'sec-2', 'sec-1']);
  }
}
// Real directory resolver: two tabs in ONE native space must not inherit its
// selected folder. Launch folders are deliberately stale, as in remote shells.
list.splice(0, list.length, ...['firstmate', 'Git', 'again', 'duplicate', 'remote'].map((name, seq) => ({
  address: name === 'remote' ? 'pc2/t5' : `t${seq + 1}`, space: name === 'remote' ? 'pc2/s' : 's',
  pane: `p${seq + 1}`, tab: `tab${seq + 1}`, title: name, status: 'idle', seq,
  space_name: 'Changing native name',
})));
spaceList = [{ id: 's', name: 'firstmate', named: false, machine: null }, { id: 'pc2/s', name: '~', machine: 'pc2' }];
paneList = list.map(a => ({ pane: a.pane, terminal: a.address, tab: a.tab, cwd: 'C:/Users/me' }));
terminalList = list.map((a, i) => ({ address: a.address, labels: {
  'custom.cwd': ['D:/Git/firstmate', 'D:/Git', 'd:\\git\\FIRSTMATE\\', 'D:/Other/firstmate', 'D:/Git/firstmate'][i],
  'custom.home': 'C:/Users/me',
} }));
sort = 'grouped';
const headings = view => view.all.filter(node => node.attrs.id?.[0]?.startsWith('sp-'));
const headingText = view => headings(view).map(node => node.kids[0].kids[0]);
selection = { space: 's', tab: 'tab1', pane: 'p1', terminal: 't1', cwd: 'D:/Git/firstmate' };
view = render();
assert.deepEqual(headingText(view), ['firstmate', 'Git']);
assert.deepEqual(order, ['t1', 't3', 't4', 'pc2/t5', 't2'], 'Equal shown names combine across tabs, folders and machines');
const groupIds = headings(view).map(node => node.attrs.id[0]);
selection = { space: 's', tab: 'tab2', pane: 'p2', terminal: 't2', cwd: 'D:/Git' };
spaceList[0].name = 'Git';
view = render();
assert.deepEqual(headingText(view), ['firstmate', 'Git']);
assert.deepEqual(headings(view).map(node => node.attrs.id[0]), groupIds, 'Selection and native space naming never change folder group identities');
headings(view)[0].attrs.on_click[0]({}, cx);
assert.deepEqual(render().rows, ['ag-t2'], 'Folding a heading folds every agent shown under that name');
headings(render())[0].attrs.on_click[0]({}, cx);
terminalList[1].labels['custom.cwd'] = 'D:/Git/firstmate';
view = render();
assert.deepEqual(headingText(view), ['firstmate'], 'An actual cwd change moves only that agent into its new folder group');
assert.deepEqual(order, ['t1', 't2', 't3', 't4', 'pc2/t5']);
list[1].pinned = true;
view = render();
assert.ok(view.byId('pinned'));
assert.deepEqual(order, ['t2', 't1', 't3', 't4', 'pc2/t5'], 'Pinned agents remain independent of folder groups');
list[1].pinned = false;
terminalList[1].labels['custom.cwd'] = 'D:/Git';
spaceList[0].name = 'Custom title'; spaceList[0].named = true;
view = render();
assert.deepEqual(headingText(view), ['Custom title', 'firstmate'], 'A manually named space keeps all its tabs in one group under its name');
assert.deepEqual(order, ['t1', 't2', 't3', 't4', 'pc2/t5']);
selection = { space: 's', tab: 'tab1', pane: 'p1', terminal: 't1', cwd: 'D:/Git/firstmate' };
assert.deepEqual(headingText(render()), ['Custom title', 'firstmate'], 'Switching tabs never splits a named space');
// Reported interleaving, multiple machines and role metadata (not group names).
const names=['xrbuild','coordinator','.xrbuild','herdr-app','crew','another coordinator'];
list.splice(0,list.length,...names.map((name,i)=>({address:i===5?'pc2/t6':`t${i+1}`,pane:`p${i+1}`,space:`s${i+1}`,space_name:name,title:`Task ${i}`,status:'idle',seq:i})));
spaceList=list.map((a,i)=>({id:a.space,name:names[i],named:true}));paneList=[];
terminalList=list.map((a,i)=>({address:a.address,state:'live',labels:i===1||i===5?{'custom.crew.home':'1'}:{}}));
selection={pane:'p4',terminal:'t4'};agents.folded=new Set(['sp-.xrbuild']);sort='grouped';width=268;
const expectedGroups=['coordinator','another coordinator','xrbuild','.xrbuild','herdr-app','crew'];
view=render();assert.deepEqual(headingText(view),expectedGroups);
assert.deepEqual(order,['t2','pc2/t6','t1','t3','t4','t5'],'Stable partition preserves both relative orders and full membership');
assert.ok(agents.folded.has('sp-.xrbuild'));assert.ok(!view.byId('ag-t3'),'Collapse state stays on the same group id');
assert.equal(view.byId('agent-count-sp-.xrbuild').kids[0].kids[0],'1','Folded count is unchanged');
const before=calls.length;view.byId('ag-t4').attrs.on_click[0]({},cx);assert.equal(calls.length,before+1);assert.deepEqual(structuredClone(calls.at(-1)),['pane.focus',{pane:'p4'}]);
// A non-coordinator Pinned group retains its relative place among other groups.
list[0].pinned=true;view=render();assert.deepEqual(view.all.map(n=>n.attrs.id?.[0]).filter(id=>id==='pinned'||id?.startsWith('sp-')),['sp-coordinator','sp-another coordinator','pinned','sp-.xrbuild','sp-herdr-app','sp-crew']);list[0].pinned=false;
terminalList.forEach(t=>t.labels={});assert.deepEqual(headingText(render()),names,'Names alone never promote a group; no-coordinator order is identical');
console.log('PASS coordinator-first stable partition across machines, metadata-only classification, unchanged folds/counts/focus/pins and no-coordinator order');
console.log('PASS: named spaces group as one; agent-owned folder grouping, focus-stable headings, same-name merging across folders and machines, folds/counts/navigation, pins and priority');
