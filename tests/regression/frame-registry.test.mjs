// A new dialog is entirely data: no new CLI wrapper or startup/installer edits.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import { bundle, loadFrameRegistry } from './frame-registry.mjs';
import { framePatch } from './frame-patch.mjs';
import { restoreStartupFrames } from './startup-frames.mjs';
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'custom registry '));
const root = path.join(temp, 'bundle'), home = path.join(temp, 'app home');
const put = (file, text) => { fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
const catalog = patches => put(path.join(root, 'frame-patches/registry.json'), JSON.stringify({ version: 1, patches }));
const patch = {
  id: 'rename', target: 'mods/prompt',
  originals: ['frame-patches/rename/original.js'],
  files: { 'main.js': 'frame-patches/rename/main.js', 'custom-helper.js': 'lib/helper.js' },
};
const main = path.join(home, 'mods/prompt/main.js'), helper = path.join(home, 'mods/prompt/custom-helper.js');
const previousBin=process.env.HERDR_APP_BIN;
process.env.HERDR_APP_BIN=path.join(temp,'synthetic-host');
put(process.env.HERDR_APP_BIN,'// reviewed original\n');
try {
  assert.deepEqual(loadFrameRegistry().map(p=>p.id).sort(), ['feedback','palette']);
  catalog([patch]);
  put(path.join(root, patch.originals[0]), '// reviewed original\n');
  put(path.join(root, patch.files['main.js']), '// patched dialog\n');
  put(path.join(root, patch.files['custom-helper.js']), '// private helper\n');
  put(main, '// reviewed original\n');
  assert.deepEqual(restoreStartupFrames(home, root), { ok: true, frames: {} });
  framePatch('apply', home, root, 'rename'); // Explicit opt-in creates the ownership record.
  assert.match(framePatch('check', home, root, 'rename'), /match/);
  fs.unlinkSync(helper); put(main, '// reviewed original\n');
  const repaired = restoreStartupFrames(home, root);
  assert.equal(repaired.ok, true);
  assert.deepEqual(Object.keys(repaired.frames), ['rename']);
  assert.equal(fs.readFileSync(main, 'utf8'), '// patched dialog\n');
  assert.equal(fs.readFileSync(helper, 'utf8'), '// private helper\n');
  framePatch('restore', home, root, 'rename');
  assert.equal(fs.readFileSync(main, 'utf8'), '// reviewed original\n');
  assert.equal(fs.existsSync(helper), false);
  assert.throws(() => framePatch('apply', home, root, 'not-registered'), /Unregistered/);
  for (const invalid of [
    { ...patch, id: '../escape' }, { ...patch, id: ['rename'] },
    { ...patch, target: '../outside' }, { ...patch, target: 'settings.json' },
    { ...patch, files: { 'main.js': '../outside.js' } },
    { ...patch, files: { '../main.js': patch.files['main.js'] } },
    { ...patch, files: { 'main.js': 'C:/outside.js' } },
    { ...patch, files: { 'main.js': 'lib/helper.js', 'MAIN.JS': 'lib/helper.js' } },
    { ...patch, originals: [] }, { ...patch, originals: ['/absolute.js'] },
  ]) {
    catalog([invalid]); assert.throws(() => loadFrameRegistry(root), /Invalid/);
  }
  catalog([patch, patch]); assert.throws(() => loadFrameRegistry(root), /duplicate/);
  catalog([patch, { ...patch, id: 'other-id' }]); assert.throws(() => loadFrameRegistry(root), /duplicate/);
  catalog([patch]);
  fs.unlinkSync(path.join(root, patch.originals[0]));
  assert.throws(() => framePatch('apply', home, root, 'rename'), /Missing original/);
  assert.equal(fs.readFileSync(main, 'utf8'), '// reviewed original\n');
  put(path.join(root, patch.originals[0]), '// reviewed original\n');

  // Registry-driven repair is the optional deployment boundary, independent of UI features.
  const extra = { ...patch, id: 'extra', target: 'frame/extra-dialog' };
  catalog([patch, extra]);
  const extraMain = path.join(home, extra.target, 'main.js');
  put(extraMain, '// reviewed original\n');
  framePatch('apply', home, root, 'extra'); put(extraMain, '// reviewed original\n');
  framePatch('apply', home, root, 'rename'); put(main, '// reviewed original\n'); fs.unlinkSync(helper);
  const install = () => JSON.stringify(restoreStartupFrames(home, root));
  const installed = install();
  assert.match(installed, /rename frame applied/);
  assert.match(installed, /extra frame applied/, 'Deployment repair enumerates every registry entry');
  assert.equal(fs.readFileSync(extraMain, 'utf8'), '// patched dialog\n');
  assert.equal(fs.readFileSync(helper, 'utf8'), '// private helper\n');
  const stat = fs.statSync(main, { bigint: true });
  assert.match(install(), /already current/);
  const after = fs.statSync(main, { bigint: true });
  assert.equal(after.ino, stat.ino); assert.equal(after.mtimeNs, stat.mtimeNs);
  console.log('PASS: registry-only new dialog, generic apply/check/restore/startup/installer, path/duplicate validation and quiet refresh');
} finally { if(previousBin===undefined)delete process.env.HERDR_APP_BIN;else process.env.HERDR_APP_BIN=previousBin; fs.rmSync(temp, { recursive: true, force: true }); }
