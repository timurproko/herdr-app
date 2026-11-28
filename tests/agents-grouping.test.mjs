import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {realUi} from './support/panel-kit.mjs';
import {projectLinkedRows} from '../src/shared/workspace-links.js';

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
let spaceList = list.map(a=>({id:a.space,name:a.address.includes('/')?'a1':a.space_name,machine:a.address.includes('/')?'pc2':null}));
let links=[],linkQueries=0;
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
  './workspace-links.js': {projectLinkedRows},
  './plugins.js': { pluginWorkspaceLinks:context=>{assert.equal(context.presentation,true);linkQueries++;return links;}, pluginMenuItems:(name) => {
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
const expected = ['t0', 't1', 't4', 't2', 't5', 't6', 'pc2/t3'];
let view = render();
assert.deepEqual(view.all.filter(node => node.attrs.id?.[0]?.startsWith('sp-')).map(node => node.kids[0].kids[0]), ['a1', 'Other', 'A1', 'Pinned', 'a1']);
assert.deepEqual(order, expected);
assert.deepEqual(view.rows, expected.map(address => `ag-${address}`));
assert.equal(view.byId('agent-count-sp-a1').kids[0].kids[0], '2');
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
assert.deepEqual(view.rows, ['ag-t0', 'ag-t2', 'ag-t5', 'ag-t6', 'ag-pc2/t3']);
assert.deepEqual(order, expected, 'Folding does not change agent navigation membership');
view.byId('sp-a1').attrs.on_click[0]({}, cx);
assert.deepEqual(render().rows, expected.map(address => `ag-${address}`));
let stopped=0,notified=0;const foldCx={stop_propagation(){stopped++;},notify(){notified++;}};
const beforeFoldActions=calls.length;
render().byId('agent-group-fold-sp-a1').attrs.on_click[0]({},foldCx);
assert.equal(stopped,1,'Chevron stops the parent header click');assert.equal(notified,1,'One click folds exactly once');
assert.ok(agents.folded.has('sp-a1'));assert.deepEqual(order,expected);
render().byId('agent-group-fold-sp-a1').attrs.on_key_down[0]({key:'enter'},foldCx);
assert.ok(!agents.folded.has('sp-a1'),'Keyboard disclosure reopens only its group');
assert.equal(calls.length,beforeFoldActions,'Folding does not navigate');
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
assert.deepEqual(headingText(view), ['firstmate', 'Git', 'firstmate']);
assert.deepEqual(order, ['t1', 't3', 't4', 't2', 'pc2/t5'], 'Equal names combine across same-machine spaces/folders, never across machines');
const groupIds = headings(view).map(node => node.attrs.id[0]);
selection = { space: 's', tab: 'tab2', pane: 'p2', terminal: 't2', cwd: 'D:/Git' };
spaceList[0].name = 'Git';
view = render();
assert.deepEqual(headingText(view), ['firstmate', 'Git', 'firstmate']);
assert.deepEqual(headings(view).map(node => node.attrs.id[0]), groupIds, 'Selection and native space naming never change folder group identities');
headings(view)[0].attrs.on_click[0]({}, cx);
assert.deepEqual(render().rows, ['ag-t2','ag-pc2/t5'], 'Folding one machine group does not fold the same name on another machine');
headings(render())[0].attrs.on_click[0]({}, cx);
terminalList[1].labels['custom.cwd'] = 'D:/Git/firstmate';
view = render();
assert.deepEqual(headingText(view), ['firstmate','firstmate'], 'Cwd changes merge only the same-machine folder groups');
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
// Deliberately interleave native machines and agent rows. Spaces displays local
// first, then alphabetic remote machines, with connected children at their parent.
spaceList=[
 {id:'pc2/child2',machine:'pc2',name:'core'},
 {id:'local-x',machine:null,name:'xrbuild'},
 {id:'pc2/parent',machine:'pc2',name:'coordinator'},
 {id:'local-c',machine:null,name:'coordinator'},
 {id:'pc2/gap',machine:'pc2',name:'other'},
 {id:'aa/x',machine:'aa',name:'xrbuild'},
 {id:'pc2/child1',machine:'pc2',name:'herdr-app'},
].map(s=>({...s,named:true}));
const records=[['pc2/t-gap','pc2/gap','idle'],['t-coord','local-c','working'],['pc2/t-one','pc2/child1','done'],['aa/t-x','aa/x','idle'],['t-x','local-x','idle'],['pc2/t-parent','pc2/parent','blocked'],['pc2/t-two','pc2/child2','working'],['t-x2','local-x','idle']];
list.splice(0,list.length,...records.map(([address,space,status],seq)=>({address,space,status,seq,pane:`p-${address}`,space_name:spaceList.find(s=>s.id===space).name,title:`Task ${seq}`})));
paneList=[];selection=null;agents.folded=new Set(['sp-coordinator']);width=268;sort='grouped';
terminalList=list.map(a=>({address:a.address,state:'live',labels:a.address==='t-coord'||a.address==='pc2/t-parent'?{'custom.crew.home':'1'}:{}}));
links=['pc2/child2','pc2/child1'].map(child=>({parent:'pc2/parent',child,binding:'verified'}));
view=render();assert.deepEqual(headingText(view),['xrbuild','coordinator','xrbuild','coordinator','core','herdr-app','other']);
const ordered=['t-x','t-x2','t-coord','aa/t-x','pc2/t-parent','pc2/t-two','pc2/t-one','pc2/t-gap'];
assert.deepEqual(order,ordered,'Group order follows Spaces machine blocks, not agent arrival or coordinator metadata');
assert.equal(view.byId('agent-count-sp-xrbuild').kids[0].kids[0],'2');
assert.ok(!view.byId('ag-t-coord'),'Local saved fold remains');assert.ok(view.byId('ag-pc2/t-parent'),'Same-named remote group is independent');
const keys=headings(view).map(n=>n.attrs.id[0]),actions=calls.length;
view.byId('ag-pc2/t-one').attrs.on_click[0]({},cx);assert.equal(calls.length,actions+1);assert.deepEqual(structuredClone(calls.at(-1)),['pane.focus',{pane:'p-pc2/t-one'}]);
// Priority is its exact original urgency/time/sequence order, without querying
// presentation links, even after native space reorder or coordinator-label edits.
const priority=['pc2/t-parent','pc2/t-one','pc2/t-two','t-coord','t-x2','t-x','aa/t-x','pc2/t-gap'];
sort='priority';const queried=linkQueries;view=render();assert.deepEqual(order,priority);assert.equal(linkQueries,queried);
assert.deepEqual(view.all.map(n=>n.attrs.id?.[0]).filter(id=>id?.startsWith('sec-')),['sec-4','sec-3','sec-2','sec-1']);
// Reorder local rows and reverse connected siblings through the native snapshot.
[spaceList[1],spaceList[3]]=[spaceList[3],spaceList[1]];
[spaceList[0],spaceList[6]]=[spaceList[6],spaceList[0]];
terminalList.forEach(t=>t.labels={});view=render();assert.deepEqual(order,priority);assert.equal(linkQueries,queried,'Priority starts no attachment contribution query');
sort='grouped';view=render();assert.deepEqual(headingText(view),['coordinator','xrbuild','xrbuild','coordinator','herdr-app','core','other']);
assert.deepEqual([...headings(view).map(n=>n.attrs.id[0])].sort(),[...keys].sort(),'Order changes preserve group identities/folds');
assert.deepEqual(order,['t-coord','t-x','t-x2','aa/t-x','pc2/t-parent','pc2/t-one','pc2/t-two','pc2/t-gap']);
// Detachment follows native sibling placement, while pinned rows remain the
// separate leading section and missing spaces stay visible at their machine tail.
links=[];list[4].pinned=true;view=render();assert.equal(order[0],'t-x');assert.equal(view.all.find(n=>n.attrs.id?.[0]==='pinned').kids[0].kids[0],'Pinned');
assert.deepEqual(headingText(view),['coordinator','xrbuild','xrbuild','herdr-app','coordinator','other','core']);list[4].pinned=false;
list.push({address:'pc2/missing',pane:'p-missing',space:'pc2/unavailable',space_name:'Missing',status:'idle',seq:8,title:'Still running'});
view=render();assert.equal(headingText(view).at(-1),'Missing');assert.equal(order.at(-1),'pc2/missing');
assert.equal(calls.length,actions+1,'Ordering starts no native action');
console.log('PASS Spaces-projected Agents ordering machine by machine, linked-child/live reorder, independent equal names/folds, pins/missing spaces and exact unchanged Priority');
console.log('PASS named-space and same-machine folder grouping, focus stability, counts, fold-once controls and navigation');
