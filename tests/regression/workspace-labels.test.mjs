import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const source = mod => readFileSync(new URL(`../mods/${mod}/main.js`, import.meta.url), 'utf8');

// Files uses the focused machine's home, never a guessed remote username.
let address = 't1', labels = {};
const files = { focused: () => ({ terminal: address }), terminals: () => [{ address, labels }], home: () => String.raw`C:\Users\fixture` };
let text = source('custom-files');
vm.runInNewContext(text.slice(text.indexOf('function folderName('), text.indexOf('const LANG')), files);
assert.equal(files.folderName('c:/users/FIXTURE/', null), '~');
assert.equal(files.folderName(String.raw`C:\Users\fixture`, null), '~');
assert.equal(files.folderName('C:/Users/fixture/project', null), 'project');
assert.equal(files.folderName(null, null), '');
address = 'pc2/t2'; labels = { 'custom.home': '/home/remote' };
assert.equal(files.folderName('/home/remote/', 'pc2'), '~');
assert.equal(files.folderName('/home/REMOTE', 'pc2'), 'REMOTE');
assert.equal(files.folderName('/home/remote', 'other'), 'remote');
labels = {}; assert.equal(files.folderName('C:/Users/fixture', 'pc2'), 'fixture');

// Jump's right-hand labels include shells but preserve agent labels and files.
const picker = {}; text = source('custom-picker');
vm.runInNewContext(text.slice(text.indexOf('function jumpProgramLabel('), text.indexOf('export default class')), picker);
const panes = [{ tab: 'local', terminal: 't1', program: { name: 'PowerShell' } }, { tab: 'remote', terminal: 'pc2/t2' }, { tab: 'file', mod: 'custom-files' }];
const terminals = [{ address: 'pc2/t2', program: { name: 'Bash' } }];
assert.equal(picker.tabProgramNames('local', [], panes, terminals), 'PowerShell');
assert.equal(picker.tabProgramNames('remote', [], panes, terminals), 'Bash');
assert.equal(picker.tabProgramNames('local', [{ program: { name: 'A1' } }], panes, terminals), 'A1');
assert.equal(picker.tabProgramNames('file', [], panes, terminals), '');

// Agent Close must never accidentally target a different focused pane.
let listed = [{ pane: 'pc2/clicked-pane', terminal: 'pc2/clicked' }, { pane: 'focused-pane', terminal: 'focused' }];
const menu = { agents: () => [], terminals: () => [], panes: () => listed };
text = source('custom-menu');
vm.runInNewContext(text.slice(text.indexOf('function items('), text.indexOf('// The key bound')), menu);
const items = () => JSON.parse(JSON.stringify(menu.items({ tab: 'agent', target: { terminal: 'pc2/clicked' } })));
assert.deepEqual(items()[1], ['Close', 'pane.close', { pane: 'pc2/clicked-pane' }]);
listed = []; assert.deepEqual(items()[1], ['Close', 'terminal.kill', { terminal: 'pc2/clicked' }]);
assert.equal(menu.menuIcon('terminal.kill', {}), 'mods/custom-workspace-chrome/x.svg');
console.log('PASS: local/remote Files home labels, Jump shell names and explicit agent close targets (no real commands).');
