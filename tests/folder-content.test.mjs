import assert from 'node:assert/strict';
import {kitModule,withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import vm from 'node:vm';

let platform = process.platform === 'win32' ? 'windows' : 'linux';
const calls = [];
function element(asset) {
  const target = { asset, kids: [] }; let proxy;
  proxy = new Proxy(target, { get: (o, k) => k in o ? o[k]
    : k === 'child' ? value => { o.kids.push(value); return proxy; }
    : k === 'tooltip' ? value => { o.tip = value; return proxy; }
    : k === 'when' ? (yes, fn) => yes ? fn(proxy) : proxy : () => proxy });
  return proxy;
}
const exec = (command, args, options) => {
  calls.push({ command, args, options });
  return new Promise((resolve, reject) => cp.execFile(command, args, { encoding: 'utf8', maxBuffer: 1024 * 1024 }, (error, stdout, stderr) => {
    if (error) return reject(new Error(`${command} failed (${error.code}): ${stderr}; args=${JSON.stringify(args)}`));
    resolve({ code: error?.code ?? 0, stdout, stderr });
  }));
};
const imports = {
  'gpui-kit': { View: class {}, div: element, svg: element, image: element },
  'gpui-base': { v_flex: element, h_flex: () => element(), Editor: {}, EditorState: {} },
  './ui.js': { U: {}, slot: v => v, headerTools: v => v, reveal: v => v, subtleActionFill: () => '', panelTitle: element, refreshButton: element, emptyState: element, menuSurface: element, dialogSurface: element, dialogHeader: element, dialogBody: element, description: element, button: element },
  './delete-entry.js': { deleteEntry() { throw Error('No deletion during folder listings'); } },
  './host.js': { spaces: () => [], panes: () => [], terminals: () => [], focused: () => null, home: () => '', exec, readTextFile: () => '', writeTextFile: async () => null, notify: () => {}, watchFolder: () => {}, layout: () => ({}), theme: () => ({}), window: () => ({ platform }), run: () => {}, props: () => ({}), openOverlay: () => {}, closeOverlay: () => {}, nextCommand: () => new Promise(() => {}) },
  './file-icons.js': { fileIconAsset: name => `file:${name}` },
  './file-header.js': { fullFilePath: () => '', fileHeader: (_tab, fallback) => fallback, publishFileHeader: () => {}, fileReloadStamp: () => '', finishFileReload: () => {} },
  './preview-font.js': { previewFont: () => ({}) },
  './location.js': { location: () => ({}) },
  './plugins.js': { runPluginHook: async () => false, sidebarPanelEnabled: () => true },
  './sidebar-title.js': { sidebarTitle: element },
  './panel-pin.js': {panelPin:(_t,{id})=>element().id(id)}, './panel-state.js': {changePanel(){}},
};
const context = vm.createContext({});
const mod = new vm.SourceTextModule(fs.readFileSync(new URL('../src/plugins/files/mod/main.js', import.meta.url), 'utf8'), { context });
const panelKit=kitModule(context);withKitUi(imports['./ui.js'],element);
await mod.link(name => name === './panel-kit.js' ? panelKit : new vm.SyntheticModule(Object.keys(imports[name]), function () {
  for (const [key, value] of Object.entries(imports[name])) this.setExport(key, value);
}, { context }));
await mod.evaluate();
const { directory, directories, default: Files } = mod.namespace;
// Several folders in one process: listings in order, a missing folder fails alone.
const checkBatch = async (base, on, join) => {
  const count = calls.length;
  const batch = await directories([base, join(base, 'filled'), join(base, 'no-such-folder'), join(base, 'nested')], on);
  assert.equal(calls.length, count + 1, 'One process for every folder');
  return batch;
};
const root = fs.mkdtempSync(path.join(os.tmpdir(), "herdr-folders-'目录-’"));
let unixFixture;
try {
  for (const name of ['empty', 'filled', 'hidden', 'git-only', 'nested']) fs.mkdirSync(path.join(root, name));
  fs.writeFileSync(path.join(root, 'filled', 'file.txt'), 'hello');
  fs.writeFileSync(path.join(root, 'hidden', '.hidden'), '');
  fs.mkdirSync(path.join(root, 'git-only', '.git'));
  fs.mkdirSync(path.join(root, 'nested', 'empty-child'));
  fs.writeFileSync(path.join(root, 'plain.txt'), '');
  fs.mkdirSync(path.join(root, 'long-folder-name-truncated-in-the-sidebar-中文'));
  fs.writeFileSync(path.join(root, 'long-file-name-truncated-in-the-sidebar-中文.txt'), '');
  fs.mkdirSync(path.join(root, '.git'));
  const check = entries => {
    const byName = new Map(entries.map(entry => [entry.name, entry]));
    assert.equal(byName.get('empty').hasContent, false);
    for (const name of ['filled', 'hidden', 'git-only', 'nested']) {
      assert.equal(byName.get(name).dir, true);
      assert.equal(byName.get(name).hasContent, true, `${name} counts as content, without expanding it`);
    }
    assert.equal(byName.get('plain.txt').dir, false);
    assert.equal(byName.has('.git'), false, 'Preserve the browser listing filter');
    return byName;
  };
  let entries;
  if (process.platform === 'win32') {
    entries = await directory(root, null); check(entries);
    assert.equal(calls.at(-1).command, 'powershell');
    check(await directory(root, 'pc2'));
    assert.equal(calls.at(-1).options.on, 'pc2', 'Probe on the same machine as the listing');
    const batch = await checkBatch(root, 'pc2', path.join);
    assert.equal(calls.at(-1).command, 'powershell'); assert.equal(calls.at(-1).options.on, 'pc2');
    check(batch[0].entries);
    assert.equal(JSON.stringify(batch[1].entries.map(e => e.name)), JSON.stringify(['file.txt']), 'A one-entry folder stays a list');
    assert.ok(batch[2].error, 'A missing folder reports its own failure');
    assert.equal(JSON.stringify(batch[3].entries.map(e => [e.name, e.dir, e.hasContent])), JSON.stringify([['empty-child', true, false]]));
  }
  if (!cp.spawnSync('sh', ['-c', 'exit 0']).error) {
    platform = 'linux';
    // Git Bash accepts drive paths, but avoid the Windows-path routing guard.
    // Git's sh.exe Windows argv conversion cannot represent every Unicode path.
    unixFixture = fs.mkdtempSync(path.join(os.tmpdir(), 'herdr-unix-folders-'));
    fs.cpSync(root, unixFixture, { recursive: true });
    const unixRoot = process.platform === 'win32' ? fs.realpathSync.native(unixFixture).replace(/^([A-Za-z]):/, (_, drive) => '/' + drive.toLowerCase()).replaceAll('\\', '/') : unixFixture;
    entries = await directory(unixRoot, 'remote'); check(entries);
    assert.equal(calls.at(-1).command, 'sh');
    assert.equal(calls.at(-1).options.on, 'remote');
    fs.writeFileSync(path.join(unixFixture, 'empty', 'new.txt'), '');
    assert.equal((await directory(unixRoot, 'remote')).find(e => e.name === 'empty').hasContent, true);
    fs.unlinkSync(path.join(unixFixture, 'empty', 'new.txt'));
    assert.equal((await directory(unixRoot, 'remote')).find(e => e.name === 'empty').hasContent, false);
    const batch = await checkBatch(unixRoot, 'remote', (a, b) => `${a}/${b}`);
    assert.equal(calls.at(-1).command, 'sh');
    check(batch[0].entries);
    assert.equal(JSON.stringify(batch[1].entries.map(e => e.name)), JSON.stringify(['file.txt']));
    assert.ok(batch[2].error, 'A missing folder reports its own failure');
    assert.equal(JSON.stringify(batch[3].entries.map(e => [e.name, e.dir, e.hasContent])), JSON.stringify([['empty-child', true, false]]));
  }
  assert.ok(entries, 'At least one native directory backend was tested');
  const view = new Files();
  view.root = root; view.entries = new Map([['', [...entries, { name: 'unknown', dir: true, hasContent: null }]]]);
  view.folders = new Set(); view.marks = {};
  const findAssets = node => typeof node === 'object' && node !== null ? [node.asset, ...node.kids.flatMap(findAssets)].filter(Boolean) : [];
  const before = calls.length;
  for (const open of [false, true]) {
    view.folders = new Set(open ? ['empty', 'filled'] : []);
    const rows = view.rows('', 0, [], {});
    for (const [i, entry] of view.entries.get('').entries()) {
      assert.equal(rows[i].tip, entry.name, 'File and folder rows retain the entire name in their hover tooltip');
    }
    const index = entries.findIndex(e => e.name === 'empty');
    assert.ok(findAssets(rows[index]).includes('mods/custom-files/folder.svg'));
    assert.ok(findAssets(rows[entries.findIndex(e => e.name === 'filled')]).includes('mods/custom-files/folder-filled.svg'));
    assert.ok(findAssets(rows.at(-1)).includes('mods/custom-files/folder.svg'), 'Unknown/unreadable is not presented as filled');
    assert.ok(findAssets(rows[entries.findIndex(e => e.name === 'plain.txt')]).includes('file:plain.txt'));
  }
  assert.equal(calls.length, before, 'Rendering never probes folders or runs processes');
  const filled = fs.readFileSync(new URL('../src/plugins/files/mod/folder-filled.svg', import.meta.url), 'utf8');
  assert.match(filled, /fill="currentColor"/);
  console.log('PASS: shallow Windows/Unix folder-content probes, hidden/git-only/nested content, quoting/Unicode, refresh, collapsed/expanded icon selection and full-name file/folder tooltips');
} finally {
  fs.rmSync(root, { recursive: true, force: true });
  if (unixFixture) fs.rmSync(unixFixture, { recursive: true, force: true });
}
