import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function element() {
  const node = { attrs: {}, kids: [] }; let proxy;
  proxy = new Proxy(node, { get(target, key) {
    if (key in target) return target[key];
    if (key === 'when') return (yes, fn) => yes ? fn(proxy) : proxy;
    if (key === 'child') return child => { node.kids.push(child); return proxy; };
    return (...args) => { node.attrs[key] = args; return proxy; };
  } });
  return proxy;
}
function find(node, id) {
  if (node?.attrs?.id?.[0] === id) return node;
  return node?.kids?.map(k => find(k, id)).find(Boolean);
}
const calls = [], overlays = [], closed = [];
let spacePrefs;
let world = [{ id: 'pc2/space', name: 'Project', active: true, tabs: [{ id: 'pc2/tab', active: true }] }];
let p;
let paneList = [{ pane: 'pc2/pane', tab: 'pc2/tab', terminal: 'pc2/t1' }], agentList = [];
let focusState = { space: 'pc2/space', tab: 'pc2/tab', pane: 'pc2/pane' };
const t = { background: 'background', surface: 'surface', border: 'border', solid: 'solid', solid_foreground: 'on-solid' };
let execStub = async () => ({ code: 0, stdout: '{}' }), notifyStub = spec => { throw Error(JSON.stringify(spec)); };
const host = { exec: (...a) => execStub(...a), appHome: () => '/app', spaces: () => world, panes: () => paneList, agents: () => agentList, focused: () => focusState,
  run: (...args) => calls.push(args), openOverlay: spec => overlays.push(spec),
  props: () => p, closeOverlay: id => closed.push(id), theme: () => t,
  shared: () => spacePrefs, setShared: (_key, value) => { spacePrefs = value; },
  machines: () => [{ name: 'pc2', layout: 'ready' }], notify: spec => notifyStub(spec) };
const context = vm.createContext({});
const cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  let mod;
  const values = name === './directory.js' ? { rememberSpaceDirectory() {} } : name === './host.js' ? host : name === 'gpui-kit' ? { View: class {}, div: element, svg: element }
    : name === 'gpui-base' ? { h_flex: element, v_flex: element, Popover: {}, Input: {} } : null;
  if (values) mod = new vm.SyntheticModule(Object.keys(values), function() {
    for (const [key, value] of Object.entries(values)) this.setExport(key, value);
  }, { context });
  else {
    const file = name === 'confirm' ? 'src/features/confirm/main.js' : name === './ui.js' ? 'src/ui/ui.js' : name === './panel-kit.js' ? 'src/ui/panel-kit.js'
      : ['./space-preferences.js', './space-lifecycle.js'].includes(name) ? 'src/shared/' + name.slice(2) : 'src/ui/close-space.js';
    mod = new vm.SourceTextModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { context });
  }
  cache.set(name, mod);
  await mod.link(load);
  return mod;
}
const helper = await load('helper'); await helper.evaluate();
const close = helper.namespace.closeWithConfirmation;
for (const [command, args] of [['space.close', { id: 'pc2/space' }], ['space.close', {}]]) {
  close(command, args);
  assert.equal(calls.length, 0, 'Opening confirmation must not close anything');
  const spec = overlays.at(-1);
  assert.equal(spec.mod, 'custom-confirm'); assert.equal(spec.frame, 'none');
  assert.equal(spec.props.spaceId, 'pc2/space'); assert.equal(spec.props.detail, '1 terminal');
  assert.equal(spec.props.name, undefined, 'The space name is not included in dialog content');
}
function closesSpace(command, args = {}, spaceId = 'pc2/space') {
  const before = calls.length, beforeOverlays = overlays.length;
  close(command, args);
  assert.equal(calls.length, before + 1, 'A final tab/pane close runs immediately');
  assert.equal(calls.at(-1)[0], 'space.close');
  assert.equal(JSON.stringify(calls.at(-1)[1]), JSON.stringify({ id: spaceId, confirmed: true }));
  assert.equal(overlays.length, beforeOverlays, 'A final tab/pane never opens a confirmation');
}
for (const [command, args] of [['tab.close', { id: 'pc2/tab' }], ['pane.close', { pane: 'pc2/pane' }], ['tab.close', {}], ['pane.close', {}]]) {
  closesSpace(command, args);
}
function delegates(command, args = {}) {
  const before = calls.length, beforeOverlays = overlays.length;
  close(command, args);
  assert.equal(calls.length, before + 1);
  assert.equal(calls.at(-1)[0], command);
  assert.equal(calls.at(-1)[1], args, 'Native passthrough preserves exact target arguments');
  assert.equal(overlays.length, beforeOverlays, 'Non-space closes never open an extra confirmation');
}
// Closing a split must not close its tab/space, even if it is the last agent.
paneList.push({ pane: 'pc2/shell-pane', tab: 'pc2/tab', terminal: 'pc2/shell' });
agentList = [{ address: 'pc2/t1' }];
delegates('pane.close', { pane: 'pc2/pane' });
paneList.pop(); agentList = [];
delegates('pane.close', { pane: 'missing/pane' });
delegates('terminal.kill', { terminal: 'pc2/subagent' });
// Implicit composition/peek focus must retain native validation, not borrow a pane.
focusState = { space: 'pc2/space', tab: 'pc2/tab', pane: null };
delegates('pane.close');
focusState = null; delegates('pane.close');
focusState = { space: 'pc2/space', tab: 'pc2/tab', pane: 'pc2/pane' };
// A remote/background sidebar target wins over the current focused space/pane.
world[0].active = false;
world.push({ id: 'local/space', active: true, tabs: [{ id: 'local/tab', active: true }] });
paneList.push({ pane: 'local/pane', tab: 'local/tab', terminal: 'local/agent' });
focusState = { space: 'local/space', tab: 'local/tab', pane: 'local/pane' };
closesSpace('pane.close', { pane: 'pc2/pane' });
closesSpace('tab.close', { id: 'pc2/tab' });
closesSpace('pane.close', {}, 'local/space');
closesSpace('tab.close', {}, 'local/space');
world.pop(); paneList.pop(); world[0].active = true;
focusState = { space: 'pc2/space', tab: 'pc2/tab', pane: 'pc2/pane' };
// A sole mod pane also closes its space immediately, without terminal stats.
const terminalPane = paneList[0];
paneList[0] = { pane: 'pc2/pane', tab: 'pc2/tab', mod: 'files' };
closesSpace('pane.close', { pane: 'pc2/pane' });
paneList[0] = terminalPane;
world[0].tabs.push({ id: 'pc2/tab2' });
// Closing the shown tab selects a neighbouring work tab first, so Herdr never
// shows the hidden Start page (kept last) for a frame.
function selectsThenCloses(command, args, next, target) {
  const before = calls.length, beforeOverlays = overlays.length;
  close(command, args);
  assert.equal(calls.length, before + 2);
  assert.equal(JSON.stringify(calls.at(-2)), JSON.stringify(['tab.select', { id: next }]));
  assert.equal(JSON.stringify(calls.at(-1)), JSON.stringify([command, target]), 'The close keeps its original target after selection moves');
  assert.equal(overlays.length, beforeOverlays);
}
selectsThenCloses('pane.close', { pane: 'pc2/pane' }, 'pc2/tab2', { pane: 'pc2/pane' });
selectsThenCloses('pane.close', {}, 'pc2/tab2', { pane: 'pc2/pane' });
selectsThenCloses('tab.close', { id: 'pc2/tab' }, 'pc2/tab2', { id: 'pc2/tab' });
selectsThenCloses('tab.close', {}, 'pc2/tab2', { id: 'pc2/tab' });
world[0].tabs.push({ id: 'pc2/start', settled: true });
paneList.push({ pane: 'pc2/start-pane', tab: 'pc2/start', mod: 'custom-space-start' });
world[0].tabs[0].active = false; world[0].tabs[1].active = true;
paneList.push({ pane: 'pc2/pane2', tab: 'pc2/tab2', terminal: 'pc2/t2' });
selectsThenCloses('tab.close', { id: 'pc2/tab2' }, 'pc2/tab', { id: 'pc2/tab2' });
delegates('tab.close', { id: 'pc2/tab' });
world[0].active = false; world[0].tabs[0].active = true; world[0].tabs[1].active = false;
delegates('tab.close', { id: 'pc2/tab' });
world[0].active = true; world[0].tabs.pop(); paneList.splice(-2, 2);
delegates('tab.close', { id: 'missing/tab' });
for (const [agentCount, terminalCount, expected] of [
  [1, 2, '1 agent · 2 terminals'], [2, 1, '2 agents · 1 terminal'],
  [1, 0, '1 agent'], [0, 2, '2 terminals'], [0, 0, ''],
]) {
  paneList = Array.from({ length: agentCount + terminalCount }, (_, i) => ({ tab: i % 2 ? 'pc2/tab2' : 'pc2/tab', terminal: `pc2/t${i}` }));
  agentList = paneList.slice(0, agentCount).map(pane => ({ address: pane.terminal }));
  if (paneList.length) paneList.push(paneList[0]);
  paneList.push({ tab: 'other/tab', terminal: 'other/t1' }, { tab: 'pc2/tab', mod: 'files' });
  agentList.push({ address: 'other/t1' });
  close('space.close', { id: 'pc2/space' });
  assert.equal(overlays.at(-1).props.detail, expected, 'Count agents separately from terminals, across all tabs, excluding other spaces, mod panes and duplicates');
}
paneList = [{ pane: 'pc2/pane', tab: 'pc2/tab', terminal: 'pc2/t1' }]; agentList = [];
close('tab.close', { id: 'pc2/tab' });
assert.equal(calls.at(-1)[0], 'tab.close', 'Normal tab close bypasses confirmation');
for (const [command, args] of [['space.close', { id: 'missing' }], ['space.close', { id: 'pc2/space', confirmed: true }], ['space.rename', { id: 'pc2/space', name: 'New' }]]) {
  const before = calls.length; close(command, args); assert.equal(calls.length, before + 1);
  assert.equal(calls.at(-1)[0], command); assert.equal(calls.at(-1)[1], args);
}
const component = await load('confirm'); await component.evaluate();
const Confirm = component.namespace.default;
let focused = 0, stopped = 0;
const cx = { focus_handle: () => ({ focus() { focused++; } }), stop_propagation() { stopped++; } };
function dialog() {
  p = { ...overlays[0].props, name: 'Do not display this space name', overlay: 'confirmation' };
  const view = new Confirm(); view.init({}, cx); return view;
}
for (const cancel of ['confirm-cancel', 'dialog-close', 'escape']) {
  const view = dialog(), before = calls.length, tree = view.render();
  if (cancel === 'escape') tree.attrs.on_key_down[0]({ key: 'escape' }, cx);
  else find(tree, cancel).attrs.on_click[0]({}, cx);
  view.confirm();
  assert.equal(calls.length, before, 'Cancel and repeated events never close a space');
  assert.equal(closed.at(-1), 'confirmation');
}
for (const action of ['click', 'enter']) {
  const view = dialog(), tree = view.render(), before = calls.length;
  assert.equal(tree.attrs.bg[0], t.background);
  assert.equal(tree.attrs.border_color[0], t.border);
  assert.equal(find(tree, 'dialog-header').attrs.h[0], 48);
  assert.equal(find(tree, 'confirm-close-space').attrs.bg[0], t.solid);
  for (const id of ['confirm-cancel', 'confirm-close-space']) {
    assert.equal(find(tree, id).attrs.w[0], 80, 'Both dialog buttons have the same fixed width');
    assert.equal(find(tree, id).attrs.h[0], 32, 'Both dialog buttons retain the shared control height');
  }
  assert.equal(find(tree, 'confirm-actions').attrs.gap[0], 8, 'Button spacing is unchanged');
  assert.deepEqual(find(tree, 'confirm-close-space').kids, ['Close']);
  assert.equal(find(tree, 'confirm-space-name'), undefined);
  const body = find(tree, 'confirm-description');
  assert.deepEqual(body.kids.map(child => child.kids[0]), [
    'This ends all terminals and agents in this space.', '1 terminal',
  ], 'Explain the consequence before the statistics; never show the space name');
  const detail = p.detail;
  p.detail = '';
  assert.equal(find(view.render(), 'confirm-description').kids.length, 1, 'Missing statistics do not leave an empty description row');
  p.detail = detail;
  // A focus change after opening must not retarget the destructive command.
  world[0].active = false;
  world.push({ id: 'other/space', active: true, tabs: [] });
  if (action === 'enter') tree.attrs.on_key_down[0]({ key: 'enter' }, cx);
  else find(tree, 'confirm-close-space').attrs.on_click[0]({}, cx);
  view.confirm();
  assert.equal(calls.length, before + 1, 'Confirm is single-flight');
  assert.equal(calls.at(-1)[0], 'space.close');
  assert.equal(JSON.stringify(calls.at(-1)[1]), JSON.stringify({ id: 'pc2/space', confirmed: true }));
}
for (const invalid of [false, true]) {
  const view = dialog(), before = calls.length;
  if (invalid) p.spaceId = null;
  else world = [];
  view.confirm(); assert.equal(calls.length, before, 'Missing/removed targets cannot close the focused space');
}
assert.ok(focused && stopped);
// Opting into last-tab confirmation is independent of keeping the space.
world = [{ id: 'pc2/space', machine: 'pc2', active: true, tabs: [{ id: 'pc2/tab', active: true }, { id: 'pc2/start' }] }];
paneList = [{ pane: 'pc2/pane', tab: 'pc2/tab', terminal: 'pc2/t1' }, { pane: 'pc2/start-pane', tab: 'pc2/start', mod: 'custom-space-start' }];
spacePrefs = { version: 1, confirmLastTab: true, closeOnLastTab: true };
let before = calls.length;
close('tab.close', { id: 'pc2/tab' });
assert.equal(calls.length, before);
assert.equal(overlays.at(-1).props.spaceId, 'pc2/space');
assert.equal(overlays.at(-1).props.tabId, undefined);
spacePrefs.closeOnLastTab = false;
close('pane.close', { pane: 'pc2/pane' });
assert.equal(calls.length, before);
assert.equal(overlays.at(-1).props.tabId, 'pc2/tab');
p = { ...overlays.at(-1).props, overlay: 'keep-confirmation' };
const keepConfirm = new Confirm(); keepConfirm.init({}, cx);
assert.equal(find(keepConfirm.render(), 'dialog-title').kids[0], 'Close last tab?');
keepConfirm.confirm();
assert.equal(calls.at(-1)[0], 'tab.close');
assert.equal(JSON.stringify(calls.at(-1)[1]), JSON.stringify({ id: 'pc2/tab', confirmed: true }));
spacePrefs.confirmLastTab = false;
close('tab.close', { id: 'pc2/tab' });
assert.equal(calls.at(-1)[0], 'tab.close');
const count = calls.length;
close('tab.close', { id: 'pc2/start' });
assert.equal(calls.length, count, 'Closing the empty Start page must not remove a kept space');
// Stale confirmation never closes another tab or space.
p = { ...overlays.at(-1).props, tabId: 'missing', overlay: 'stale' };
const staleConfirm = new Confirm(); staleConfirm.init({}, cx); staleConfirm.confirm();
assert.equal(calls.length, count);
// Explicitly closing an empty Start-only space never needs confirmation, even
// when retention and final-tab prompting are enabled. Remote IDs stay captured.
world = [{ id: 'local-empty', machine: null, active: true, tabs: [{ id: 'local-start', active: true }] },
  { id: 'pc2/empty', machine: 'pc2', active: false, tabs: [{ id: 'pc2/empty-start', active: true }] }];
paneList = [{ pane: 'local-start-pane', tab: 'local-start', mod: 'custom-space-start' },
  { pane: 'pc2/empty-pane', tab: 'pc2/empty-start', mod: 'custom-space-start' }];
agentList = [];
for (const confirmLastTab of [false, true]) for (const closeOnLastTab of [false, true]) {
  spacePrefs = { version: 1, confirmLastTab, closeOnLastTab };
  closesSpace('space.close', { id: 'local-empty' }, 'local-empty');
  closesSpace('space.close', {}, 'local-empty');
  closesSpace('space.close', { id: 'pc2/empty' }, 'pc2/empty');
}
// A Start tab split with a real terminal is work, not an empty state.
paneList.push({ pane: 'pc2/live-pane', tab: 'pc2/empty-start', terminal: 'pc2/live' });
let unchanged = calls.length, opened = overlays.length;
close('space.close', { id: 'pc2/empty' });
assert.equal(calls.length, unchanged); assert.equal(overlays.length, opened + 1);
assert.equal(overlays.at(-1).props.spaceId, 'pc2/empty');
paneList.pop();
// A file/other mod is not disposable just because it has no terminal.
paneList[1].mod = 'custom-files';
opened = overlays.length; close('space.close', { id: 'pc2/empty' });
assert.equal(calls.length, unchanged); assert.equal(overlays.length, opened + 1);
// Restart machine (Settings › Core): the kit's confirm dialog; nothing is sent until
// Restart, then the core bridge restarts that machine and the dialog closes with a toast.
{
  const execs = [], notes = [], jobs = [];
  execStub = async (...a) => { execs.push(a); return { code: 0, stdout: JSON.stringify({ rebooting: true }) }; };
  notifyStub = spec => notes.push(spec);
  const rcx = { ...cx, notify() {}, spawn: f => jobs.push(f) };
  p = { action: 'reboot', machine: 'pc2', label: 'pc2', overlay: 'reboot-dialog' };
  const view = new Confirm(); view.init({}, rcx);
  const tree = view.render();
  assert.ok(find(tree, 'confirm-reboot'), 'Reboot uses the kit confirmation dialog');
  find(tree, 'confirm-reboot-cancel').attrs.on_click[0]({}, rcx);
  assert.equal(execs.length, 0, 'Cancel sends nothing'); assert.equal(closed.at(-1), 'reboot-dialog');
  const again = new Confirm(); again.init({}, rcx);
  find(again.render(), 'confirm-reboot-confirm').attrs.on_click[0]({}, rcx);
  while (jobs.length) await jobs.shift()(rcx);
  assert.equal(execs.length, 0, 'A remote machine also needs the second "Really?" press');
  assert.ok(JSON.stringify(again.render()).includes('Really?'), 'The armed button reads Really?');
  find(again.render(), 'confirm-reboot-confirm').attrs.on_click[0]({}, rcx);
  find(again.render(), 'confirm-reboot-confirm').attrs.on_click[0]({}, rcx);
  while (jobs.length) await jobs.shift()(rcx);
  assert.equal(execs.length, 1, 'One restart per confirmation');
  const sent = JSON.parse(execs[0][1].at(-1));
  assert.equal(sent.machine, 'pc2'); assert.equal(sent.request.action, 'reboot'); assert.match(sent.request.request, /^[a-z0-9-]{10,80}$/);
  assert.ok(execs[0][1][0].endsWith('/mods/custom-settings/core-control.cjs'));
  assert.equal(closed.at(-1), 'reboot-dialog'); assert.equal(notes.at(-1).level, 'success');
  execStub = async () => ({ code: 1, stdout: JSON.stringify({ error: 'Windows refused the restart.' }) });
  const refused = new Confirm(); refused.init({}, rcx); refused.reboot(rcx); refused.reboot(rcx);
  while (jobs.length) await jobs.shift()(rcx);
  assert.equal(notes.at(-1).level, 'error'); assert.equal(notes.at(-1).body, 'Windows refused the restart.');
}
console.log('PASS: empty Start-only spaces close immediately across settings/local/remote targets; nonempty spaces retain confirmation; final tab/pane, split/mod/peek/subagent guards, counts and cancel/Escape/Enter safety (no real terminals closed)');
