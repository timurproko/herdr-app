import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const context = vm.createContext({});
const state = {}, calls = [], remembered = [];
let world = [
  { id: 'local', active: true, machine: null, tabs: [{ id: 'a', active: true }] },
  { id: 'pc2/project', machine: 'pc2', tabs: [{ id: 'pc2/b', active: true }] },
];
let paneList = [{ pane: 'pa', tab: 'a', terminal: 't1' }, { pane: 'pc2/pb', tab: 'pc2/b', terminal: 'pc2/t1' }];
let ready = true, seq = 0, focus = 'pa';
const current = () => {
  const s = world.find(s => s.active), tab = s?.tabs.find(t => t.active);
  return { space: s?.id, tab: tab?.id, pane: focus };
};
function removeTab(id) {
  const s = world.find(s => s.tabs.some(t => t.id === id));
  const wasActive = s.tabs.find(t => t.id === id)?.active;
  s.tabs = s.tabs.filter(t => t.id !== id); paneList = paneList.filter(p => p.tab !== id);
  if (!s.tabs.length) world = world.filter(w => w !== s);
  else if (wasActive) s.tabs.at(-1).active = true;
}
const host = {
  shared: key => state[key], setShared: (key, value) => { state[key] = value; },
  spaces: () => world, panes: () => paneList, focused: current,
  machines: () => [{ name: null, layout: 'ready' }, { name: 'pc2', layout: ready ? 'ready' : 'unavailable' }],
  notify: () => { throw Error('Unexpected notification'); },
  run(name, args) {
    calls.push([name, args]);
    if (name === 'tab.new') {
      const s = world.find(s => s.id === args.space), id = `start-${++seq}`;
      for (const w of world) w.active = w === s;
      for (const t of s.tabs) t.active = false;
      s.tabs.push({ id, active: true });
      paneList.push({ pane: `p-${id}`, tab: id, mod: args.mod });
    } else if (name === 'tab.select') {
      const s = world.find(s => s.tabs.some(t => t.id === args.id));
      for (const w of world) w.active = w === s;
      for (const t of s.tabs) t.active = t.id === args.id;
    } else if (name === 'pane.focus') focus = args.pane;
    else if (name === 'tab.settle') world.flatMap(s => s.tabs).find(t => t.id === args.id).settled = true;
    else if (name === 'tab.close') removeTab(args.id);
    else if (name !== 'tab.move') throw Error(`Unexpected command ${name}`);
  },
};
const cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const values = name === './directory.js' ? { rememberSpaceDirectory: space => remembered.push(space.id) } : name === './host.js' ? host : null;
  const module = values ? new vm.SyntheticModule(Object.keys(values), function() {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context }) : new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/' + name.slice(2), import.meta.url), 'utf8'), { context });
  cache.set(name, module); await module.link(load); return module;
}
const mod = await load('./space-lifecycle.js'); await mod.evaluate();
const { reconcileSpaceStarts, workTabs, isStartTab } = mod.namespace;
const prefs = cache.get('./space-preferences.js').namespace;
assert.equal(prefs.spacePreferences().closeOnLastTab, true);
assert.equal(prefs.spacePreferences().confirmLastTab, false);
reconcileSpaceStarts(); assert.equal(calls.length, 0, 'Deployment/default settings must not change topology');
prefs.updateSpacePreferences({ closeOnLastTab: false, ignored: 'not saved' });
assert.equal(state['custom.spaces.preferences'].ignored, undefined);
const original = JSON.stringify(current());
reconcileSpaceStarts();
assert.equal(JSON.stringify(current()), original, 'Preparing local and background remote spaces restores focus');
assert.equal(calls.filter(([n]) => n === 'tab.new').length, 2);
assert.deepEqual(remembered, ['local', 'pc2/project'], 'The lifecycle observer captures live directories for both machines before natural exits');
for (const space of world) {
  assert.equal(workTabs(space).length, 1);
  assert.equal(space.tabs.filter(t => isStartTab(t)).length, 1);
}
let before = calls.length; reconcileSpaceStarts();
assert.equal(calls.length, before, 'Steady state issues no commands, focus changes or repeated writes');
// A terminal process exits, not a custom close command. The native-style removal
// leaves its Start tab in the existing space, even when the machine is remote.
removeTab('pc2/b');
assert.ok(world.some(s => s.id === 'pc2/project'));
assert.equal(workTabs(world[1]).length, 0);
reconcileSpaceStarts(); assert.equal(calls.length, before);
// Re-enabling auto-close is non-destructive for an already-empty space; populated
// spaces lose only their terminal-free Start tab, not work or processes.
prefs.updateSpacePreferences({ closeOnLastTab: true });
state['custom.tab-move.busy'] = {sourceSpaceId:'local',until:Date.now()+5000};
reconcileSpaceStarts();
assert.equal(world[0].tabs.filter(t=>isStartTab(t)).length,1,'An in-flight move keeps its prepared Start page even under auto-close');
state['custom.tab-move.busy'] = null;
reconcileSpaceStarts();
assert.equal(world[0].tabs.length, 1); assert.equal(world[0].tabs[0].id, 'a');
assert.equal(world[1].tabs.length, 1);
assert.equal(calls.filter(([n]) => n === 'tab.close').length, 1);
// When work is added again, the old empty page is removed, restoring native exits.
world[1].tabs.push({ id: 'pc2/c', active: true }); paneList.push({ pane: 'pc2/pc', tab: 'pc2/c', terminal: 'pc2/t2' });
reconcileSpaceStarts();
assert.equal(world[1].tabs.length, 1); assert.equal(world[1].tabs[0].id, 'pc2/c');
removeTab('pc2/c'); assert.equal(world.length, 1);
// Offline machines aren't structurally edited or silently replaced.
prefs.updateSpacePreferences({ closeOnLastTab: false }); ready = false;
world.push({ id: 'pc2/offline', machine: 'pc2', tabs: [{ id: 'pc2/offline-tab', active: true }] });
reconcileSpaceStarts();
assert.equal(world[1].tabs.length, 1);
assert.equal(mod.namespace.ensureSpaceStart('pc2/offline'), false);
assert.equal(mod.namespace.ensureSpaceStart('gone'), false);
// Splitting a Start tab converts it to ordinary work, which must never be hidden
// or deleted by lifecycle cleanup.
const start = world[0].tabs.find(t => isStartTab(t));
paneList.push({ pane: 'extra', tab: start.id, terminal: 'extra-terminal' });
assert.equal(isStartTab(start), false);
assert.ok(workTabs(world[0]).some(t => t.id === start.id));
// A space Firstmate's backend named itself (herdr.space=fm-<home>) is nobody's to keep:
// no Start page while retention is on, and one already left alone there closes with it.
assert.equal(mod.namespace.isAutomaticSpace({ id: 'pc2/fm-firstmate-6e82e264' }), true);
assert.equal(mod.namespace.isAutomaticSpace({ id: 'fm-home' }), true);
for (const id of ['local', 'pc2/project', 'sp36b80c87fc60857b1e60e250dc3a437f', 'pc2/spbb214ae7082d46429715c12fd4d91834', 'fm-', 'my-fm-x']) {
  assert.equal(mod.namespace.isAutomaticSpace({ id }), false, id);
}
world.push({ id: 'fm-home-1a2b', machine: null, tabs: [{ id: 'fm-w1', active: false }] });
paneList.push({ pane: 'fm-p1', tab: 'fm-w1', terminal: 't-fm' });
before = calls.length; reconcileSpaceStarts();
assert.ok(!calls.slice(before).some(([n, args]) => n === 'tab.new' && args.space === 'fm-home-1a2b'), 'An automatic space is never given a Start page');
const automatic = world.find(s => s.id === 'fm-home-1a2b');
automatic.tabs.push({ id: 'fm-start', active: false, settled: true }); paneList.push({ pane: 'fm-ps', tab: 'fm-start', mod: 'custom-space-start' });
reconcileSpaceStarts();
assert.deepEqual(automatic.tabs.map(t => t.id), ['fm-w1'], 'A Start page beside automatic work is removed, the work stays');
automatic.tabs.push({ id: 'fm-start-2', active: false, settled: true }); paneList.push({ pane: 'fm-ps2', tab: 'fm-start-2', mod: 'custom-space-start' });
removeTab('fm-w1'); reconcileSpaceStarts();
assert.ok(!world.some(s => s.id === 'fm-home-1a2b'), 'An automatic space left with only a Start page is closed');
console.log('PASS: Spaces preference defaults, persistence, terminal-free retention, natural exits, hidden Start identity, focus/background/remote safety, no-op reconciliation and non-destructive auto-close changes, and automatic Firstmate spaces never retained');
