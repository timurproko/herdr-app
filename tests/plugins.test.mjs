import assert from 'node:assert/strict';
import fs from 'node:fs';
import { loadMod } from '../tools/plugin-harness.mjs';

// Plugins: the registry's state and hooks, the VS Code Remote hook and the A1 colors adapter.
const state = {}, calls = [], notes = [];
let machines = [{ name: 'pc2', target: 'pc2', state: 'connected' }];
const impl = {
  shared: key => state[key], setShared: (key, value) => { state[key] = value; }, spaces: () => [],
  notify: note => notes.push(note), window: () => ({ platform: 'windows' }),
  hc: async () => ({ code: 0, stdout: JSON.stringify({ machines }), stderr: '' }),
  exec: async (command, args) => { calls.push([command, ...args]); return { code: 0, stdout: 'ms-vscode-remote.remote-ssh\n', stderr: '' }; },
};
const host = { ...impl, hc: (...a) => impl.hc(...a), exec: (...a) => impl.exec(...a), window: () => impl.window() };
// Loaded as packaged: registry, plugin API and every plugin folder (tools/plugin-harness.mjs).
const { r, v } = await loadMod({ host, modules: { 'space-color-state.js': 'src/shared/space-color-state.js' },
  entry: 'import * as r from "./plugins.js"; import * as v from "./plugins/vscode-remote/plugin.js"; export {r,v};' });
const vscode = r.pluginById('vscode-remote'), a1 = r.pluginById('a1-colors');

// URIs: Windows drives lowercase and keep their colon; other parts are encoded.
assert.equal(v.remoteFileUri('pc2', 'D:/Git/a1/config/x.json'), 'vscode-remote://ssh-remote+pc2/d:/Git/a1/config/x.json');
assert.equal(v.remoteFileUri('pc2', 'D:\\My Files\\a#b.txt'), 'vscode-remote://ssh-remote+pc2/d:/My%20Files/a%23b.txt');
assert.equal(v.remoteFileUri('box', '/home/me/x.txt'), 'vscode-remote://ssh-remote+box/home/me/x.txt');

// Off by default: Files keeps its own behaviour.
assert.equal(r.pluginEnabled(vscode), false);
assert.equal(await r.runPluginHook('files.open', { on: 'pc2', fullPath: 'D:/Git/x.json' }), false);
assert.equal(calls.length, 0);

// On: a pc2 file opens in VS Code over SSH, reusing the window.
r.setPluginEnabled(vscode, true);
assert.equal(JSON.stringify(state['custom.plugins']), JSON.stringify({ 'vscode-remote': { enabled: true } }));
assert.equal(await r.runPluginHook('files.open', { on: 'pc2', fullPath: 'D:/Git/x.json' }), true);
assert.equal(calls[0][0], 'powershell');
assert.match(calls[0].at(-1), /^& code '--reuse-window' '--file-uri' 'vscode-remote:\/\/ssh-remote\+pc2\/d:\/Git\/x\.json'$/);

// A pc2 folder opens as a VS Code folder; this computer's folders stay with the file manager.
await r.runPluginHook('files.open', { on: 'pc2', dir: true, fullPath: 'D:/Git/a1' });
assert.match(calls.at(-1).at(-1), /'--folder-uri' 'vscode-remote:\/\/ssh-remote\+pc2\/d:\/Git\/a1'$/);
const before = calls.length;
assert.equal(await r.runPluginHook('files.open', { on: null, dir: true, fullPath: 'C:/Git' }), false);
assert.equal(calls.length, before);

// The machine's ssh target is used, not its Herdr name.
machines = [{ name: 'pc2', target: 'me@pc2.lan', state: 'connected' }];
await r.runPluginHook('files.open', { on: 'pc2', fullPath: '/srv/x' });
assert.match(calls.at(-1).at(-1), /ssh-remote\+me@pc2\.lan\/srv\/x'$/);

// Local files stay with Windows unless asked; settings validate their values.
calls.length = 0;
assert.equal(await r.runPluginHook('files.open', { on: null, fullPath: 'C:/a.txt' }), false);
r.setPluginSetting(vscode, 'localFiles', true);
r.setPluginSetting(vscode, 'window', 'sideways');
assert.equal(r.pluginSetting(vscode, 'window'), 'reuse', 'Unknown choices are refused');
r.setPluginSetting(vscode, 'window', 'new');
assert.equal(await r.runPluginHook('files.open', { on: null, fullPath: 'C:/a.txt' }), true);
assert.match(calls[0].at(-1), /^& code '--new-window' 'C:\/a\.txt'$/);
assert.equal(r.pluginEnabled(vscode), true, 'Settings keep the switch');

// Remote files can be handed back to the cached copy.
r.setPluginSetting(vscode, 'remoteFiles', false);
assert.equal(await r.runPluginHook('files.open', { on: 'pc2', fullPath: 'D:/x' }), false);

// A failing plugin is reported and the feature falls back.
impl.exec = async () => ({ code: 1, stdout: '', stderr: 'code: not found' });
assert.equal(await r.runPluginHook('files.open', { on: null, fullPath: 'C:/a.txt' }), false);
assert.match(notes.at(-1).title, /VS Code Remote/);

// Prerequisites report each check; a broken check is an error, not a crash.
impl.exec = async (_c, args) => ({ code: 0, stdout: args.at(-1).includes('--version') ? '1.99.0\nabc\n' : 'other.ext\n', stderr: '' });
const checks = await r.checkPlugin(vscode);
assert.equal(JSON.stringify(checks.map(c => [c.id, c.status])), JSON.stringify([['code', 'ready'], ['remote-ssh', 'missing'], ['machines', 'ready']]));
assert.equal(checks[0].detail, 'VS Code 1.99.0');
impl.hc = async () => { throw new Error('core offline'); };
assert.equal((await r.checkPlugin(vscode)).at(-1).status, 'error');

// Multiselect settings accept only unique declared values, including no selection.
const git=r.pluginById('git');
sameStates(['idle','done']);
function sameStates(expected){assert.equal(JSON.stringify(r.pluginSetting(git,'ciFixStates')),JSON.stringify(expected));}
for(const invalid of ['error',null,{},['unknown'],['blocked'],['idle','blocked'],['idle','idle'],['error',42]]){
 r.setPluginSetting(git,'ciFixStates',invalid);sameStates(['idle','done']);
}
r.setPluginSetting(git,'ciFixStates',['error','working']);sameStates(['error','working']);
r.setPluginSetting(git,'ciFixStates',[]);sameStates([]);
state['custom.plugins'].git.settings.ciFixStates=['unknown'];sameStates(['idle','done']);
assert.equal(state['custom.plugins'].git.settings.ciFixStates[0],'unknown','Reading invalid preferences never rewrites them');
r.setPluginSetting(git,'ciFixStates',['idle','done']);

// Generic A1 retains legacy choices until explicit master/feature settings exist.
assert.equal(a1.name, 'A1');
assert.equal(r.pluginEnabled(a1), false);
state['custom.match-agent-session-color'] = true;
assert.equal(r.pluginEnabled(a1), true);
assert.equal(r.pluginSetting(a1, 'matchSpaceColor'), true);
assert.equal(r.pluginSetting(a1, 'renameSession'), undefined);
r.setPluginEnabled(a1, false);
assert.equal(r.pluginEnabled(a1), false);
assert.equal(state['custom.match-agent-session-color'], true, 'Legacy records are not destructively rewritten');
assert.equal(state['custom.plugins']['a1-colors'].enabled, false);

// Transforms: a value passes through enabled plugins only (A1 colors on profile.launch).
state['custom.space-colors'] = { 'pc2/space': 'ansi3' };
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
same(await r.pluginTransform('profile.launch', ['a1'], { space: 'pc2/space' }), ['a1'], 'Off: the argv is untouched');
r.setPluginEnabled(a1, true);
same(await r.pluginTransform('profile.launch', ['a1'], { space: 'pc2/space' }), ['a1', '--session-color', 'orange']);
r.setPluginSetting(a1, 'matchSpaceColor', false);
same(await r.pluginTransform('profile.launch', ['a1'], { space: 'pc2/space' }), ['a1'], 'Color off is independent of master');
assert.equal(r.pluginSetting(a1, 'renameSession'), undefined);
r.setPluginSetting(a1, 'renameSession', true);
assert.equal(r.pluginSetting(a1, 'renameSession'), undefined, 'Removed setting cannot be enabled');
r.setPluginSetting(a1, 'matchSpaceColor', true);
same(await r.pluginTransform('profile.launch', ['a1'], { space: 'pc2/space' }), ['a1', '--session-color', 'orange'], 'Retired rename preference does not stop colors');
same(await r.pluginTransform('profile.launch', ['claude'], { space: 'pc2/space' }), ['claude'], 'Other agents are left alone');
same(await r.pluginTransform('unknown.moment', ['x']), ['x']);

// Events: every enabled plugin hears them; a throwing plugin is reported once and the caller carries on.
notes.length = 0;
const owner = {}, jobs = [];
impl.window = () => ({ platform: 'windows', active: true }); // the sync now reads panes, which this test does not fake
r.pluginEvent('spaces.refresh', { owner, cx: { spawn: fn => jobs.push(fn), notify() {} } });
assert.equal(notes.length, 1, 'A1 sync failing (host.panes is not faked) is reported');
r.pluginEvent('spaces.refresh', { owner, cx: { spawn: fn => jobs.push(fn), notify() {} } });
assert.equal(notes.length, 1, 'Reported once per plugin and moment, not on every render');
r.setPluginEnabled(a1, false);
r.pluginEvent('spaces.refresh', { owner: {}, cx: null });
assert.equal(notes.length, 1, 'Disabled plugins do not hear events');

// Row details on the Plugins page read like labels: no final full stop, an ellipsis stays.
const page = fs.readFileSync(new URL('../src/features/settings/plugins-ui.js', import.meta.url), 'utf8'), kit = fs.readFileSync(new URL('../src/ui/settings-kit.js', import.meta.url), 'utf8');
const statusText = new Function(`${kit.match(/export const statusText = ([^;]+);/)[1].replace(/^/, 'return ')}`)();
for (const [given, shown] of [['Linked.', 'Linked'], ['jq-1.8.2', 'jq-1.8.2'], ['v1.2.', 'v1.2'], ['Not set.  ', 'Not set'],
  ['Checked out as a plain file. Fix re-creates it as a link.', 'Checked out as a plain file. Fix re-creates it as a link'],
  ['Loading...', 'Loading...'], ['Checking…', 'Checking…'], ['D:\\Git\\firstmate', 'D:\\Git\\firstmate']]) assert.equal(statusText(given), shown);
assert.match(page, /const detail = statusText\(/, 'Every row detail goes through it');

console.log('PASS: plugin registry state/hooks/events/transforms/prerequisites, VS Code Remote URIs and launch, A1 colors preference adapter');
