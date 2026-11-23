import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
import { framePatch } from './frame-palette.mjs';
import { restoreStartupFrames } from './startup-frames.mjs';
import { loadFrameRegistry } from './frame-registry.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const home = fs.mkdtempSync(path.join(os.tmpdir(), 'custom startup '));
const registry = loadFrameRegistry(), names = registry.map(p => p.id);
const dir = name => path.join(home, registry.find(p => p.id === name).target);
const snapshot = () => Object.fromEntries(names.flatMap(name => fs.readdirSync(dir(name)).map(file => {
  const target = path.join(dir(name), file), stat = fs.statSync(target, { bigint: true });
  return [`${name}/${file}`, [fs.readFileSync(target, 'utf8'), String(stat.ino), String(stat.mtimeNs)]];
})));
const previousBin=process.env.HERDR_APP_BIN;
process.env.HERDR_APP_BIN=path.join(home,'synthetic-host');
fs.writeFileSync(process.env.HERDR_APP_BIN,Buffer.concat(registry.map(p=>fs.readFileSync(path.join(root,p.originals[0])))));
try {
  assert.deepEqual(restoreStartupFrames(home), { ok: true, frames: {} });
  assert.equal(fs.existsSync(path.join(home, '.customizations')), false, 'No patch records means no writes or opt-in');
  for (const name of names) {
    fs.mkdirSync(dir(name), { recursive: true });
    fs.copyFileSync(path.join(root, `frame-patches/${name}/original.js`), path.join(dir(name), 'main.js'));
    framePatch('apply', home, root, name);
  }
  // Simulate the exact startup reset: stock entrypoints and deleted helpers.
  for (const name of names) {
    for (const file of fs.readdirSync(dir(name))) fs.unlinkSync(path.join(dir(name), file));
    fs.copyFileSync(path.join(root, `frame-patches/${name}/original.js`), path.join(dir(name), 'main.js'));
  }
  const result = restoreStartupFrames(home);
  assert.equal(result.ok, true);
  for (const name of names) assert.match(framePatch('check', home, root, name), /match/);
  const current = snapshot();
  assert.equal(restoreStartupFrames(home).ok, true);
  assert.deepEqual(snapshot(), current, 'Already-current files retain content, identity and timestamps');
  // Independent failures must not prevent repair of the remaining dialogs.
  const personal = '// Unknown/new stock or personal edit: never overwrite.\n';
  fs.writeFileSync(path.join(dir('palette'), 'main.js'), personal);
  fs.copyFileSync(path.join(root, 'frame-patches/feedback/original.js'), path.join(dir('feedback'), 'main.js'));
  const conflict = restoreStartupFrames(home);
  assert.equal(conflict.ok, true);
  assert.equal(conflict.frames.palette.status, 'skipped');
  assert.match(conflict.frames.palette.advisory, /unsupported original/);
  assert.equal(conflict.frames.feedback.ok, true);
  assert.equal(fs.readFileSync(path.join(dir('palette'), 'main.js'), 'utf8'), personal);
  fs.writeFileSync(path.join(dir('feedback'), 'custom-ui.js'), personal);
  assert.equal(restoreStartupFrames(home).frames.feedback.ok, false);
  assert.equal(fs.readFileSync(path.join(dir('feedback'), 'custom-ui.js'), 'utf8'), personal);
  const lock = path.join(home, '.customizations/startup-frames.lock');
  fs.writeFileSync(lock, String(process.pid));
  assert.deepEqual(restoreStartupFrames(home), { busy: true }, 'Another live worker is not disturbed');
  fs.unlinkSync(lock);
  fs.unlinkSync(path.join(home, '.customizations/frame-palette.json'));
  for (const file of fs.readdirSync(dir('palette'))) fs.unlinkSync(path.join(dir('palette'), file));
  fs.copyFileSync(path.join(root, 'frame-patches/palette/original.js'), path.join(dir('palette'), 'main.js'));
  assert.equal(restoreStartupFrames(home).frames.palette, undefined, 'Removed opt-in is respected');
  assert.equal(fs.readFileSync(path.join(dir('palette'), 'main.js'), 'utf8'), fs.readFileSync(path.join(root, 'frame-patches/palette/original.js'), 'utf8'));

  let layout = 'Custom', executions = [], replies = [], saved = [], sleeps = [], jobs = [];
  const context = vm.createContext({});
  const herdr = new vm.SyntheticModule(['appHome', 'exec', 'shared', 'setShared'], function () {
    this.setExport('appHome', () => home);
    this.setExport('shared', () => layout);
    this.setExport('setShared', (key, value) => saved.push([key, JSON.parse(JSON.stringify(value))]));
    this.setExport('exec', async (...args) => { executions.push(args); const reply = replies.shift(); if (reply instanceof Error) throw reply; return reply; });
  }, { context });
  const module = new vm.SourceTextModule(fs.readFileSync(path.join(root, 'mods/custom-workspace-chrome/startup.js'), 'utf8'), { context });
  await module.link(() => herdr); await module.evaluate();
  const cx = { spawn: job => jobs.push(job), sleep: async ms => sleeps.push(ms) };
  const start = async () => { module.namespace.restoreFrames(cx); for (const job of jobs.splice(0)) await job(cx); };
  replies = [{ code: 0, stdout: JSON.stringify({ ok: true, frames: {} }) }];
  await start();
  assert.deepEqual(JSON.parse(JSON.stringify(executions[0])), ['node', [`${home}/.customizations/runtime/scripts/startup-frames.mjs`, home], { on: null, timeout: 15000 }]);
  assert.equal(saved.at(-1)[0], 'custom.frame-startup');
  assert.equal(executions.length, 1, 'One local process, direct argv even with spaces');
  executions = []; layout = 'main'; await start(); assert.equal(executions.length, 0);
  layout = 'custom'; replies = [Error('core starting'), { code: 75, stderr: '' }, { code: 0, stdout: '{"ok":true}' }];
  await start(); assert.equal(executions.length, 3); assert.deepEqual(sleeps, [1000, 1000]);
  executions = []; sleeps = []; replies = Array(3).fill({ code: 1, stderr: 'unavailable' });
  await start(); assert.equal(executions.length, 3); assert.equal(saved.at(-1)[1].ok, false);
  executions = []; replies = [{ code: 0, stdout: '{"ok":false,"frames":{"palette":{"ok":false}}}' }];
  await start(); assert.equal(executions.length, 1, 'Conflicts are not retried');
  console.log('PASS: startup stock-reset repair, no-op identities, opt-in/conflict guards, lock, local hook and bounded retries');
} finally { if(previousBin===undefined)delete process.env.HERDR_APP_BIN;else process.env.HERDR_APP_BIN=previousBin; fs.rmSync(home, { recursive: true, force: true }); }
