import assert from 'node:assert/strict';
import {kitModule,withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import vm from 'node:vm';

const serviceSource = fs.readFileSync(new URL('../src/plugins/files/mod/delete-entry.js', import.meta.url), 'utf8');
async function service(exec, platform = 'windows') {
  const context = vm.createContext({});
  const mod = new vm.SourceTextModule(serviceSource, { context });
  await mod.link(() => new vm.SyntheticModule(['exec', 'window'], function () {
    this.setExport('exec', exec); this.setExport('window', () => ({ platform }));
  }, { context }));
  await mod.evaluate(); return mod.namespace;
}
const plain = value => JSON.parse(JSON.stringify(value));
let calls = [];
const api = await service(async (...args) => { calls.push(plain(args)); return { code: 0 }; });
for (const target of [
  { root: '/', path: '' }, { root: '/', path: '.' }, { root: '/p', path: '..' },
  { root: '/p', path: '../other' }, { root: '/p', path: 'a/../b' }, { root: '/p', path: '/etc' },
  { root: '/p', path: 'a//b' }, { root: '/p', path: 'a\\b' }, { root: '/p', path: 'a\0b' },
  { root: 'relative', path: 'file' }, { root: '/p', path: 'file', on: '' },
]) await assert.rejects(api.deleteEntry(target), /invalid file path/);
assert.equal(calls.length, 0, 'Invalid targets cannot start any process');
await api.deleteEntry({ root: "C:/项目/O’Brien's [folder]", path: '$file; [*].txt', on: 'pc2' });
assert.equal(calls[0][0], 'powershell'); assert.deepEqual(calls[0][2], { on: 'pc2' });
assert.ok(calls[0][1].at(-1).includes("'C:\\项目\\O’’Brien''s [folder]\\$file; [*].txt'"));
assert.match(calls[0][1].at(-1), /RECYCLEONDELETE/);
assert.match(calls[0][1].at(-1), /TSF_DELETE_RECYCLE_IF_POSSIBLE/);
assert.match(calls[0][1].at(-1), /DriveType.Fixed/);
assert.doesNotMatch(serviceSource, /Remove-Item|exec rm|FileSystem\.Delete|SHFileOperation\(/, 'No permanent-delete implementation or fallback');
calls = [];
await api.deleteEntry({ root: '/remote', path: "O'Brien; $(touch BAD) [*].txt", on: 'linux' });
assert.equal(calls[0][0], 'sh'); assert.deepEqual(calls[0][2], { on: 'linux' });
assert.equal(calls[0][1][2], 'files-trash'); assert.equal(calls[0][1][3], "/remote/O'Brien; $(touch BAD) [*].txt");
assert.match(calls[0][1][1], /gio trash/); assert.match(calls[0][1][1], /trash-put/); assert.match(calls[0][1][4], /trashItemAtURL/);
calls = [];
const fallback = await service(async (command, args, options) => {
  calls.push([command, options.on]);
  if (command === 'sh') throw Error('herdr.exec: cannot start sh: program not found');
  return { code: 0 };
}, 'linux');
await fallback.deleteEntry({ root: '/remote', path: 'file', on: 'windows-remote' });
assert.deepEqual(calls, [['sh', 'windows-remote'], ['powershell', 'windows-remote']]);
for (const failure of [Error('connection lost'), Error('cannot start sh: permission denied'), { code: 1, stderr: 'permission denied' }]) {
  calls = [];
  const failing = await service(async command => { calls.push(command); if (failure instanceof Error) throw failure; return failure; });
  await assert.rejects(failing.deleteEntry({ root: '/p', path: 'f', on: 'remote' }), /lost|denied/);
  assert.deepEqual(calls, ['sh'], 'Failures must not retry destructive operations on another backend/machine');
}

// Exercise POSIX backend selection with fixture-only utilities, never real trash.
const shell = cp.spawnSync('sh', ['-c', 'exit 0']);
if (!shell.error) {
  const fixture = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'herdr-trash-tools-')));
  const shellPath = value => process.platform === 'win32' ? value.replace(/^([A-Za-z]):/, (_, drive) => '/' + drive.toLowerCase()).replaceAll('\\', '/') : value;
  const bin = path.join(fixture, 'bin'); fs.mkdirSync(bin);
  const tool = (name, body) => { fs.writeFileSync(path.join(bin, name), '#!/bin/sh\n' + body + '\n'); fs.chmodSync(path.join(bin, name), 0o755); };
  calls = [];
  await api.deleteEntry({ root: '/fixture', path: 'literal', on: 'posix' });
  const args = calls[0][1];
  const shExecutable = process.platform === 'win32' ? cp.execFileSync('where.exe', ['sh'], { encoding: 'utf8' }).trim().split(/\r?\n/)[0] : '/bin/sh';
  const run = () => cp.spawnSync(shExecutable, args, { encoding: 'utf8', env: { ...process.env, PATH: shellPath(bin) } });
  try {
    tool('uname', 'printf Linux');
    let result = run(); assert.equal(result.status, 1); assert.match(result.stderr, /not deleted/);
    tool('trash-put', 'printf "trash-put:%s" "$2"');
    result = run(); assert.equal(result.status, 0); assert.equal(result.stdout, 'trash-put:/fixture/literal');
    tool('gio', 'printf "gio:%s:%s" "$1" "$3"');
    result = run(); assert.equal(result.status, 0); assert.equal(result.stdout, 'gio:trash:/fixture/literal');
    tool('gio', 'printf failed >&2; exit 7');
    result = run(); assert.equal(result.status, 7); assert.equal(result.stdout, '', 'A failed gio does not retry with trash-put');
    tool('uname', 'printf Darwin'); tool('osascript', 'printf "mac:%s" "$3"');
    result = run(); assert.equal(result.status, 0); assert.equal(result.stdout, 'mac:-e');
  } finally { fs.rmSync(fixture, { recursive: true, force: true }); }
}

// Exercise real Windows recycling on disposable fixtures, verify the $I restore
// metadata, then restore/clean only each exact test-created $R/$I pair. Never
// empty the user's bin or inspect/modify existing recycle entries.
const real = await service((command, args) => new Promise((resolve, reject) => {
  cp.execFile(command, args, { encoding: 'utf8', windowsHide: true }, (error, stdout, stderr) => {
    if (error && typeof error.code !== 'number') reject(error);
    else resolve({ code: error?.code ?? 0, stdout, stderr });
  });
}), process.platform === 'win32' ? 'windows' : 'linux');
const root = fs.realpathSync.native(fs.mkdtempSync(path.join(os.tmpdir(), 'herdr-delete-')));
const recycleDirectory = process.platform === 'win32' ? path.join(path.parse(root).root, '$Recycle.Bin', cp.execFileSync('powershell', ['-NoProfile', '-Command', '[Security.Principal.WindowsIdentity]::GetCurrent().User.Value'], { encoding: 'utf8', windowsHide: true }).trim()) : null;
const recycledNames = () => new Set(recycleDirectory && fs.existsSync(recycleDirectory) ? fs.readdirSync(recycleDirectory).filter(n => n.startsWith('$I')) : []);
const restore = async (target, dir = false) => {
  const before = recycledNames();
  await real.deleteEntry({ root, path: target, dir });
  const original = path.join(root, target);
  assert.equal(fs.existsSync(original), false);
  const names = [...recycledNames()].filter(n => !before.has(n));
  const name = names.find(n => {
    const data = fs.readFileSync(path.join(recycleDirectory, n));
    return data.subarray(data.readBigUInt64LE(0) === 2n ? 28 : 24).toString('utf16le').replace(/\0+$/, '').toLowerCase() === original.toLowerCase();
  });
  assert.ok(name, `Recycle Bin must contain restore metadata for ${original}`);
  fs.renameSync(path.join(recycleDirectory, '$R' + name.slice(2)), original);
  fs.unlinkSync(path.join(recycleDirectory, name));
};
try {
 if (process.platform === 'win32') {
  const file = "O’Brien's [x] $file; test.txt";
  fs.writeFileSync(path.join(root, file), 'delete me');
  fs.writeFileSync(path.join(root, 'keep.txt'), 'keep');
  await restore(file);
  assert.equal(fs.readFileSync(path.join(root, file), 'utf8'), 'delete me'); assert.equal(fs.existsSync(path.join(root, 'keep.txt')), true);
  fs.mkdirSync(path.join(root, 'target')); fs.writeFileSync(path.join(root, 'target', 'keep.txt'), 'keep');
  fs.mkdirSync(path.join(root, 'folder')); fs.writeFileSync(path.join(root, 'folder', '.hidden'), 'delete');
  fs.symlinkSync(path.join(root, 'target'), path.join(root, 'folder', 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  await restore('folder', true);
  assert.equal(fs.readFileSync(path.join(root, 'folder', '.hidden'), 'utf8'), 'delete');
  assert.equal(fs.readFileSync(path.join(root, 'target', 'keep.txt'), 'utf8'), 'keep', 'Nested junction/link targets survive');
  fs.symlinkSync(path.join(root, 'target'), path.join(root, 'link'), process.platform === 'win32' ? 'junction' : 'dir');
  await restore('link', true);
  assert.equal(fs.existsSync(path.join(root, 'link')), true); assert.equal(fs.existsSync(path.join(root, 'target', 'keep.txt')), true);
  await assert.rejects(real.deleteEntry({ root, path: 'absent.txt' }), /./, 'A stale row is an error, not a false success');
  await assert.rejects(real.deleteEntry({ root: '//server/share', path: 'file' }), /unavailable|volume/, 'Network paths cannot silently permanently delete');
 }
} finally { fs.rmSync(root, { recursive: true, force: true }); }

// Deferred UI paths: no disk/SSH access, only captured targets and fixture state.
function element() {
  const target = { attrs: {}, kids: [] }; let proxy;
  proxy = new Proxy(target, { get: (o, k) => k in o ? o[k] :
    k === 'child' ? value => { o.kids.push(value); return proxy; } :
    k === 'children' ? values => { o.kids.push(...values); return proxy; } :
    k === 'when' ? (yes, fn) => yes ? fn(proxy) : proxy :
    (...args) => { o.attrs[k] = args; return proxy; } });
  return proxy;
}
const tasks = [], overlays = [], commands = [], closes = [], deletions = [], notifications = [];
let properties = {}, release, failDelete = false;
const context = vm.createContext({});
const host = { props: () => properties, spaces: () => [], panes: () => [], terminals: () => [], focused: () => null, home: () => '',
  exec() { throw Error('Unexpected process'); }, readTextFile() {}, writeTextFile() {}, theme: () => ({}), window: () => ({ platform: 'windows' }),
  notify: value => notifications.push(value), run: name => commands.push(name), openOverlay: spec => overlays.push(plain(spec)), closeOverlay: id => closes.push(id),
  layout: () => ({}), nextCommand: () => new Promise(() => {}) };
const imports = {
  'gpui-kit': { View: class {}, div: element, svg: element, image: element },
  'gpui-base': { v_flex: element, h_flex: element, Editor: {}, EditorState: {} }, './host.js': host,
  './ui.js': { U: { row: 28 }, slot: x => x, headerTools: x => x, reveal: x => x, subtleActionFill() {}, panelTitle: element, refreshButton: element, emptyState: element,
    menuSurface: (_t, el) => el, dialogSurface: (_t, el) => el, dialogBody: el => el,
    dialogHeader: (_t, title, close) => element().child(title).on_click(close), description: (_t, text) => element().child(text),
    button: (_t, id, label, click) => element().id(id).child(label).on_click(click) },
  './delete-entry.js': { deleteEntry: async target => { deletions.push(plain(target)); await new Promise(resolve => { release = resolve; }); if (failDelete) throw Error('offline'); } },
  './file-icons.js': { fileIconAsset() {} }, './file-header.js': { fullFilePath: (root, path) => `${root}/${path}`, fileHeader() {}, publishFileHeader() {}, fileViewerRoute() {}, beginFileViewerOpen() {}, cancelFileViewerOpen() {}, acknowledgeFileViewers() {}, fileReloadStamp() {}, finishFileReload() {} },
  './preview-font.js': { previewFont() {} }, './location.js': { location() {} }, './plugins.js': { runPluginHook() {}, sidebarPanelEnabled: () => true }, './sidebar-title.js': { sidebarTitle: element },
  './panel-pin.js': { panelPin() {} }, './panel-state.js': { changePanel() {} },
};
const main = new vm.SourceTextModule(fs.readFileSync(new URL('../src/plugins/files/mod/main.js', import.meta.url), 'utf8'), { context });
const panelKit=kitModule(context);withKitUi(imports['./ui.js'],element);
await main.link(name => name === './panel-kit.js' ? panelKit : new vm.SyntheticModule(Object.keys(imports[name]), function () { for (const [k, v] of Object.entries(imports[name])) this.setExport(k, v); }, { context }));
await main.evaluate(); const Files = main.namespace.default;
const cx = { spawn: fn => tasks.push(fn(cx)), notify() {}, stop_propagation() {}, focus_handle: () => ({ focus() {} }), write_to_clipboard() {} };
const nodes = node => node && typeof node === 'object' ? [node, ...node.kids.flatMap(nodes)] : [];
const panel = new Files(); panel.root = 'C:/original'; panel.on = 'pc2'; panel.listening = true;
panel.showFileMenu('folder/file.txt', cx, false);
const menuSpec = overlays.at(-1), target = menuSpec.props.fileMenu;
assert.equal(menuSpec.height, 105, 'Three rows fit without clipping');
const menu = new Files(); properties = { ...menuSpec.props, overlay: 'popup' }; menu.init({}, cx);
const deleteItem = nodes(menu.renderFileMenu({})).find(n => n.attrs.id?.[0] === 'file-context-delete');
assert.ok(deleteItem); deleteItem.attrs.on_click[0]({}, cx);
assert.equal(closes.at(-1), 'popup'); assert.equal(deletions.length, 0, 'Menu only opens confirmation');
const dialogSpec = overlays.at(-1); assert.equal(dialogSpec.kind, 'dialog'); assert.equal(dialogSpec.modal, true);
assert.deepEqual(dialogSpec.props.fileDelete, target);
for (const method of ['cancelDelete', 'confirmDelete']) {
  properties = { ...dialogSpec.props, overlay: method };
  const dialog = new Files(); dialog.init({}, cx);
  const texts = nodes(dialog.renderDeleteConfirmation({})).flatMap(n => n.kids).filter(n => typeof n === 'string');
  assert.deepEqual(texts, ['Delete file?', 'Deleting this file moves it to the recycle bin.', 'file.txt', 'Cancel', 'Delete'], 'Show one description sentence above the filename; no full path or machine label');
  const before = commands.length; dialog[method](); dialog[method]();
  assert.equal(commands.length, before + (method === 'confirmDelete' ? 1 : 0), 'Cancel never mutates; confirm is single-use');
}
const confirmed = commands.at(-1).slice('custom-files.'.length);
panel.root = 'C:/elsewhere'; panel.on = null; panel.deleted = target => { panel.refreshed = plain(target); };
panel.fileMenuCommand('delete-confirmed:wrong-token', cx); assert.equal(deletions.length, 0);
panel.fileMenuCommand(confirmed, cx); panel.fileMenuCommand(confirmed, cx);
assert.equal(deletions.length, 1); assert.equal(deletions[0].on, 'pc2'); assert.equal(deletions[0].root, 'C:/original');
release(); await Promise.all(tasks); assert.deepEqual(panel.refreshed, target);
assert.deepEqual(plain(notifications.at(-1)), { title: 'File successfully deleted', body: 'file.txt', level: 'success' }, 'Success toast shows only a general title and filename');
panel.showFileMenu('nested/folder', cx, true);
panel.fileMenuCommand(`delete-confirmed:${panel.menuTarget.token}`, cx); release(); await Promise.all(tasks);
assert.deepEqual(plain(notifications.at(-1)), { title: 'Folder successfully deleted', body: 'folder', level: 'success' });
const completedDeletes = deletions.length;
// Replaced/expired menus never replay old mutations.
panel.showFileMenu('other', cx, true); panel.menuTarget.expires = 0;
panel.fileMenuCommand(`delete-confirmed:${panel.menuTarget.token}`, cx); assert.equal(deletions.length, completedDeletes);
panel.showFileMenu('new', cx, true); panel.fileMenuCommand(confirmed, cx); assert.equal(deletions.length, completedDeletes);
failDelete = true; panel.refreshed = null;
panel.fileMenuCommand(`delete-confirmed:${panel.menuTarget.token}`, cx); release(); await Promise.all(tasks);
assert.equal(panel.refreshed, null); assert.equal(notifications.at(-1).level, 'error'); assert.match(notifications.at(-1).body, /No permanent-delete fallback/);
// A successful delete drops expanded descendants and invalidates pending reads,
// but a different machine/folder must not be refreshed or changed.
const tree = new Files(), treeTarget = { root: '/project', path: 'dir', on: 'linux' };
tree.context = { cwd: '/project', on: 'linux' }; const oldContext = tree.context;
tree.current = () => true; tree.folders = new Set(['dir', 'dir/child', 'sibling']);
tree.entries = new Map([['', [{ name: 'dir' }, { name: 'keep' }]], ['dir', []], ['dir/child', []]]);
tree.loadedAt = new Map(); tree.pending = new Set(['dir']); tree.loading = true; tree.refresh = () => tree.refreshed = true;
tree.deleted(treeTarget, cx);
assert.notEqual(tree.context, oldContext); assert.equal(tree.loading, false); assert.equal(tree.pending.size, 0);
assert.deepEqual([...tree.folders], ['sibling']); assert.deepEqual(tree.entries.get(''), [{ name: 'keep' }]); assert.equal(tree.refreshed, true);
tree.refreshed = false; tree.deleted({ ...treeTarget, on: null }, cx); assert.equal(tree.refreshed, false);
console.log('PASS: confirmed local/SSH recycling, Windows restore metadata, literal paths, links, no permanent fallback, modal cancellation, captured targets and scoped refresh');
