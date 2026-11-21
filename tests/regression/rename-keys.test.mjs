// Synthetic routing coverage for F2 / Shift+F2 / palette rename; nothing is renamed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const source = fs.readFileSync(new URL('../mods/custom-tabs/rename-keys.js', import.meta.url), 'utf8')
  .replace(/^import .*;\r?\n/gm, '').replace(/^export /gm, '');
let inlineTab = true, inlineSpace = true;
const runs = [], requests = [], closes = [], launches = [];
let shown = [{ id: 'pc2/s', active: true, machine: 'pc2' }];
const context = vm.createContext({
  Object, nextCommand: () => new Promise(() => {}),
  run: (...args) => runs.push(args),
  spaces: () => shown,
  composeProfiles: machine => [{ key: 'terminal', name: 'Terminal', available: true, machine }, { key: 'claude', available: true }],
  launchSpaceProfile: (...args) => launches.push(args),
  closeWithConfirmation: (...args) => closes.push(args),
  requestInlineTabRename: p => { requests.push(p.command); return inlineTab; },
  requestInlineSpaceRename: p => { requests.push(p.command); return inlineSpace; },
});
vm.runInContext(source + '\nglobalThis.api={routeRename,RENAME_COMMANDS,routeClose,routeNewTab};', context);
const { routeRename } = context.api;
const reset = () => { runs.length = requests.length = 0; inlineTab = inlineSpace = true; };

reset();
assert.equal(routeRename('rename-tab'), true);
assert.deepEqual(JSON.parse(JSON.stringify(requests)), [{ name: 'tab.rename', args: {} }]);
assert.deepEqual(runs, [], 'Inline editor claimed the tab rename; no native prompt');

reset();
assert.equal(routeRename('rename-space'), true);
assert.deepEqual(JSON.parse(JSON.stringify(requests)), [{ name: 'space.rename', args: {} }]);
assert.deepEqual(runs, []);

reset(); inlineTab = false;
routeRename('rename-tab');
assert.deepEqual(runs, [['tab.rename']], 'No inline target falls back to the native prompt');

reset(); inlineSpace = false;
routeRename('rename-space');
assert.deepEqual(runs, [['space.rename']], 'Hidden sidebar falls back to the native prompt');

reset();
for (const other of ['focus', 'copy', 'constructor', '__proto__', 'toString', ''])
  assert.equal(routeRename(other), false);
assert.deepEqual(runs, []); assert.deepEqual(requests, []);

for (const [command, native] of [['close-pane', 'pane.close'], ['close-tab', 'tab.close'], ['close-space', 'space.close']]) {
  const before = closes.length;
  assert.equal(context.api.routeClose(command), true);
  assert.equal(closes.length, before + 1);
  assert.deepEqual(closes.at(-1), [native], 'Keys/palette use the same close helper as mouse controls');
}
for (const other of ['focus', 'rename-tab', 'constructor', '__proto__', 'toString', ''])
  assert.equal(context.api.routeClose(other), false);
assert.equal(closes.length, 3, 'Unknown mod commands cannot trigger a close');
// Ctrl+Shift+T in Custom: the + menu's Terminal launch in the shown space (so it starts where
// that row does, never in a worker's copy); with no space shown, Herdr's own new tab.
runs.length = 0;
assert.equal(context.api.routeNewTab('new-tab'), true);
assert.equal(launches.length, 1);
assert.deepEqual(JSON.parse(JSON.stringify(launches[0])), [{ key: 'terminal', name: 'Terminal', available: true, machine: 'pc2' }, 'pc2/s', 'pc2'], 'The Terminal profile, in the shown space on its machine');
assert.deepEqual(runs, [], 'No native tab.new that would inherit the folder');
shown = [];
context.api.routeNewTab('new-tab');
assert.deepEqual(runs, [['tab.new']]); assert.equal(launches.length, 1);
for (const other of ['new', 'tab.new', 'constructor', '']) assert.equal(context.api.routeNewTab(other), false);
console.log('PASS: rename keys route to inline editors; close keys/palette route to shared confirmation; new-tab key uses the + Terminal launch; unknown-command guards');
