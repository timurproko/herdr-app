// Model the real host: run() queues commands and readers keep the last published
// snapshot. No real spaces, processes or terminal input are used.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
let clock = 1000, seq = 0;
const state = { 'custom.spaces.preferences': { version: 1, closeOnLastTab: false, confirmLastTab: false } };
const requests = [], applied = [], notifications = [];
const ready = new Map([[null, 'loading'], ['pc2', 'ready']]);
let documents = [], documentPanes = [], world = [], paneList = [], documentFocus = null, focus = null;
let throwingSpace = null;
const clone = value => JSON.parse(JSON.stringify(value));
function addSpace(id, machine = null) {
  const tab = `${id}/work`, pane = `${id}/pane`;
  documents.push({ id, machine, active: !documents.length, tabs: [{ id: tab, active: true }] });
  documentPanes.push({ pane, tab, terminal: `${id}/terminal` });
  if (!documentFocus) documentFocus = { space: id, tab, pane };
}
function publish(includePanes = true) {
  world = clone(documents); focus = clone(documentFocus);
  if (includePanes) paneList = clone(documentPanes);
}
function flush() {
  for (const [name, args] of requests.splice(0)) {
    applied.push([name, args]);
    if (name === 'tab.new') {
      const space = documents.find(s => s.id === args.space);
      if (!space) continue;
      const id = `start-${++seq}`;
      for (const s of documents) s.active = s === space;
      for (const tab of space.tabs) tab.active = false;
      space.tabs.push({ id, active: true });
      documentPanes.push({ pane: `${id}/pane`, tab: id, mod: args.mod });
    } else if (name === 'tab.select') {
      const space = documents.find(s => s.tabs.some(t => t.id === args.id));
      if (!space) continue;
      for (const s of documents) s.active = s === space;
      for (const tab of space.tabs) tab.active = tab.id === args.id;
      documentFocus = { space: space.id, tab: args.id, pane: documentPanes.find(p => p.tab === args.id)?.pane ?? null };
    } else if (name === 'pane.focus') {
      const pane = documentPanes.find(p => p.pane === args.pane);
      if (pane) documentFocus = { space: documents.find(s => s.tabs.some(t => t.id === pane.tab))?.id, tab: pane.tab, pane: pane.pane };
    } else if (name === 'tab.settle') {
      documents.flatMap(s => s.tabs).find(t => t.id === args.id).settled = true;
    } else if (name === 'tab.move') {
      const space = documents.find(s => s.tabs.some(t => t.id === args.id));
      const at = space.tabs.findIndex(t => t.id === args.id), [tab] = space.tabs.splice(at, 1);
      space.tabs.splice(args.index - 1, 0, tab);
    } else throw Error(`Unexpected destructive command: ${name}`);
  }
}
const host = {
  shared: key => state[key], setShared: (key, value) => { state[key] = value; },
  spaces: () => world, panes: () => paneList, focused: () => focus,
  machines: () => [...ready].map(([name, layout]) => ({ name, layout })),
  notify: spec => notifications.push(spec),
  run(name, args) {
    if (name === 'tab.new' && args.space === throwingSpace) throw Error('fixture: rejected Start mod');
    requests.push([name, clone(args)]);
  },
};
const context = vm.createContext({ Date: class extends Date { static now() { return clock; } } }), modules = new Map();
async function load(name) {
  if (modules.has(name)) return modules.get(name);
  const values = name === './host.js' ? host : name === './directory.js' ? { rememberSpaceDirectory() {} } : null;
  const module = values ? new vm.SyntheticModule(Object.keys(values), function() {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context }) : new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/' + name.slice(2), import.meta.url), 'utf8'), { context });
  modules.set(name, module); await module.link(load); return module;
}
const module = await load('./space-lifecycle.js'); await module.evaluate();
const { ensureSpaceStart, reconcileSpaceStarts, isStartTab, startSpaceLifecycle } = module.namespace;
addSpace('new-local'); publish();
assert.equal(reconcileSpaceStarts().length, 0); assert.equal(requests.length, 0, 'Loading documents are not failures and are not structurally edited');
ready.set(null, 'ready'); addSpace('pc2/new-remote', 'pc2'); publish();
const originalFocus = clone(focus);
assert.equal(reconcileSpaceStarts().length, 0, 'The queued creation is pending, not an immediate failure');
assert.equal(requests.filter(([name]) => name === 'tab.new').length, 2);
const otherCopy = new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/space-lifecycle.js', import.meta.url), 'utf8'), { context });
await otherCopy.link(name => modules.get(name)); await otherCopy.evaluate();
assert.equal(otherCopy.namespace.ensureSpaceStart('new-local'), false);
assert.equal(requests.filter(([name]) => name === 'tab.new').length, 2, 'A different mod copy observes the shared pending lease instead of duplicating creation');
for (let i = 0; i < 4; i++) {
  clock += 250;
  assert.equal(ensureSpaceStart('new-local'), false);
  assert.equal(reconcileSpaceStarts().length, 0);
}
assert.equal(requests.filter(([name]) => name === 'tab.new').length, 2, 'Do not duplicate a creation request while awaiting the next snapshot');
flush(); publish(false); // Tabs appear before the pane metadata on purpose.
assert.equal(reconcileSpaceStarts().length, 0);
assert.equal(requests.filter(([name]) => name === 'tab.new').length, 0, 'A partial tab/pane snapshot must not create another Start tab');
publish(); assert.equal(reconcileSpaceStarts().length, 0);
flush(); publish();
assert.deepEqual(focus, originalFocus, 'Queued creation/settling preserves original local focus after preparing the remote space');
for (const space of world) assert.equal(space.tabs.filter(t => isStartTab(t)).length, 1);
assert.equal(Object.keys(state['custom.spaces.start-pending']).length, 0, 'Acknowledged leases are cleared');
assert.equal(reconcileSpaceStarts().length, 0); assert.equal(requests.length, 0, 'Ready snapshots settle to a command-free steady state');
assert.equal(notifications.length, 0);
// A genuine missing acknowledgement is reported after a bounded grace period,
// once per space, without blocking another space's preparation.
addSpace('never-acknowledged'); publish();
assert.equal(reconcileSpaceStarts().length, 0); requests.length = 0; // Simulate rejection/lost acknowledgement.
clock += 9999;
assert.equal(reconcileSpaceStarts().length, 0, 'No false warning before the grace deadline');
requests.length = 0;
addSpace('healthy'); publish(); clock += 1;
const issues = reconcileSpaceStarts();
assert.equal(issues.length, 1); assert.equal(issues[0].spaceId, 'never-acknowledged');
assert.match(issues[0].message, /10 seconds/);
assert.ok(requests.some(([name, args]) => name === 'tab.new' && args.space === 'healthy'), 'One pending space does not stall other spaces');
assert.equal(reconcileSpaceStarts().length, 0, 'A persistent timeout is not repeatedly reported');
// Native lifecycle changes aren't failures, even if they occur while pending.
documents = documents.filter(s => s.id !== 'never-acknowledged');
flush(); publish(); assert.equal(reconcileSpaceStarts().length, 0); flush(); publish();
// Real exceptions are isolated, throttled and still surface through the owner.
addSpace('rejected'); addSpace('next-healthy'); publish(); throwingSpace = 'rejected';
const timerCallbacks = [], jobs = [], owner = {};
const cx = { sleep: async () => {}, spawn: fn => jobs.push(fn(cx)), timer: { every: (ms, fn) => { assert.equal(ms, 250); timerCallbacks.push(fn); } } };
startSpaceLifecycle(owner, cx); await Promise.all(jobs);
assert.equal(notifications.length, 1); assert.match(notifications[0].body, /rejected Start mod/);
assert.ok(requests.some(([name, args]) => name === 'tab.new' && args.space === 'next-healthy'));
timerCallbacks[0](); assert.equal(notifications.length, 1, 'A persistent exception does not flood notifications');
throwingSpace = null; clock += 5000; timerCallbacks[0](); flush(); publish(); timerCallbacks[0](); flush(); publish();
assert.ok(world.find(s => s.id === 'rejected').tabs.some(t => isStartTab(t)), 'A failed space can recover without restarting the app');
assert.ok(!applied.some(([name]) => name === 'terminal.kill' || name === 'space.close'), 'No recovery path closes a terminal or space');
console.log('PASS: queued host acknowledgements, partial snapshots, loading documents, duplicate-request leases, focus restoration, timeout-only warnings, per-space isolation and recovery (no real terminals)');
