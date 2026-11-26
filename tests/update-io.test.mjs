import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { randomUUID } from 'node:crypto';
import updater from '../src/services/updates/update-worker.cjs';
import { resultRecorder } from '../tools/deploy-all.mjs';
import { fixture, clean, project } from './support/deploy-all.mjs';
const fault = code => Object.assign(Error(code), { code });
try {
  const f = fixture(), p = updater.files(f.env.HERDR_APP_HOME);
  const rows = [{ machine: 'local', action: 'deployed', commit: 'a'.repeat(40) }];
  for (const persistent of [false, true]) {
    let attempts = 0, slept = 0, fallback = 0;
    const io = { ...fs, renameSync(...args) { if (persistent || ++attempts < 4) throw fault('EPERM'); return fs.renameSync(...args); },
      writeFileSync(file, ...args) { if (file === p.result) fallback++; return fs.writeFileSync(file, ...args); } };
    const record = resultRecorder({ ...f.env, HERDR_UPDATE_RUN_ID: 'publication' }, false, { io, sleep: ms => { slept += ms; } });
    record(rows); record(rows, true);
    assert.equal(updater.read(p.result).complete, true);
    assert.equal(updater.read(p.result).token, 'publication');
    assert.ok(slept > 0 && slept <= 6000); assert.equal(fallback > 0, persistent);
    updater.atomic(p.status, { token: 'publication', pid: 123456789, state: 'unknown', started: 0, deadline: 1 });
    updater.atomic(p.lock, { token: 'publication' });
    assert.equal(updater.inspect(f.env.HERDR_APP_HOME, { isAlive: () => false }).job.state, 'complete', 'a locked final target still settles complete');
    assert.equal(fs.existsSync(p.lock), false);
  }
  // If neither destination operation succeeds, the closed complete temp survives.
  const record = resultRecorder({ ...f.env, HERDR_UPDATE_RUN_ID: 'recovery' }); record(rows);
  const intermediate = updater.read(p.result);
  let slept = 0;
  const blocked = { ...fs, renameSync() { throw fault('EBUSY'); }, writeFileSync(file, ...args) {
    if (file === p.result) throw fault('EACCES'); return fs.writeFileSync(file, ...args);
  } };
  const final = { ...intermediate, at: intermediate.at + 10, complete: true };
  const saved = updater.atomic(p.result, final, { io: blocked, sleep: ms => { slept += ms; } });
  assert.ok(saved.recovery); assert.equal(slept, 3000);
  assert.equal(updater.read(saved.recovery).complete, true);
  assert.equal(updater.read(p.result).complete, false);
  assert.equal(updater.readResult(p, { token: 'recovery', started: intermediate.at }).complete, true);
  assert.equal(updater.readResult(p, { token: 'foreign', started: intermediate.at }).complete, false);
  assert.equal(updater.readResult(p, { token: 'recovery', started: final.at + 1 }).complete, false);
  fs.unlinkSync(saved.recovery);
  const candidate = `${p.result}.${randomUUID()}.tmp`;
  fs.writeFileSync(candidate, '{bad');
  assert.equal(updater.readResult(p, { token: 'recovery' }).complete, false);
  fs.unlinkSync(candidate);
  fs.symlinkSync(process.platform === 'win32' ? p.dir : p.result, candidate, process.platform === 'win32' ? 'junction' : 'file');
  assert.equal(updater.readResult(p, { token: 'recovery' }).complete, false);
  if (process.platform === 'win32') fs.rmdirSync(candidate); else fs.unlinkSync(candidate);
  const before = fs.readdirSync(p.dir).sort(); resultRecorder(f.env, true)(rows, true);
  assert.deepEqual(fs.readdirSync(p.dir).sort(), before);

  // Every atomic state helper uses the same policy; a failed read is not absence.
  for (const file of [p.status, p.check, p.runner]) {
    let calls = 0;
    updater.atomic(file, { token: 'state' }, { io: { ...fs, renameSync(...args) { if (++calls < 3) throw fault('EACCES'); fs.renameSync(...args); } }, sleep() {} });
    assert.equal(updater.read(file).token, 'state'); assert.equal(calls, 3);
  }
  let reads = 0;
  assert.deepEqual(updater.read(p.status, { io: { readFileSync() { if (++reads === 1) throw fault('EPERM'); if (reads === 2) return '{'; return '{"token":"closed"}'; } }, sleep() {} }), { token: 'closed' });
  assert.equal(reads, 3);
  assert.throws(() => updater.read(p.status, { io: { readFileSync() { throw fault('EACCES'); } }, sleep() {} }), /EACCES/);
  let closed = false, tries = 0;
  assert.throws(() => updater.acquire(p.lock, { token: 'owner' }, { io: { ...fs,
    writeFileSync() { tries++; throw fault('EPERM'); }, closeSync(fd) { closed = true; fs.closeSync(fd); } }, sleep() {} }), /EPERM/);
  assert.ok(closed); assert.ok(tries > 1);
  assert.throws(() => updater.acquire(p.lock, { token: 'intruder' }), error => error.code === 'EEXIST');
  fs.unlinkSync(p.lock);
  updater.acquire(p.lock, { token: 'owner' }); assert.equal(updater.read(p.lock).token, 'owner');
  // Both installed copies and the detached source remain built-ins-only.
  const manifest = JSON.parse(fs.readFileSync(path.join(project, 'customization.json')));
  assert.equal(manifest.files['mods/custom-settings/update-worker.cjs'], 'src/services/updates/update-worker.cjs');
  assert.equal(manifest.files['mods/custom-workspace-chrome/update-worker.cjs'], 'src/services/updates/update-worker.cjs');
  assert.ok([...fs.readFileSync(path.join(project, 'src/services/updates/update-worker.cjs'), 'utf8').matchAll(/require\('([^']+)'\)/g)].every(match => match[1].startsWith('node:')));

  if (process.platform === 'win32') {
    // Real Windows handle allowing read/write but not delete (rename) sharing.
    const ready = path.join(f.base, 'handle-ready'), release = path.join(f.base, 'handle-release'), quote = value => "'" + value.replaceAll("'", "''") + "'";
    // Release only after the actual rename has failed. A fixed hold duration
    // would itself flake when a loaded CI runner notices readiness too late.
    const script = `$f=[IO.File]::Open(${quote(p.result)},'Open','ReadWrite','ReadWrite'); try { [IO.File]::WriteAllText(${quote(ready)},'ready'); $until=[DateTime]::UtcNow.AddSeconds(15); while(-not [IO.File]::Exists(${quote(release)})) { if([DateTime]::UtcNow -gt $until){throw 'handle release not received'}; Start-Sleep -Milliseconds 20 } } finally { $f.Dispose() }`;
    const child = cp.spawn('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', script], { stdio: 'ignore', windowsHide: true });
    const exited = new Promise((resolve, reject) => { child.once('error', reject); child.once('exit', code => code === 0 ? resolve() : reject(Error(`handle fixture exited ${code}`))); });
    try {
      updater.retryIO(() => { if (!fs.existsSync(ready)) throw fault('EBUSY'); }, { budget: 10000 });
      let retries = 0;
      updater.atomic(p.result, final, { sleep(ms) { retries++; fs.writeFileSync(release, 'release'); Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms); } });
      assert.equal(updater.read(p.result).complete, true); assert.ok(retries > 0, 'real held target exercised rename retries');
      await exited;
    } finally { if (child.exitCode === null) { child.kill(); await exited.catch(() => {}); } }
  }
  console.log('PASS: transient/real Windows sharing, persistent rename fallback, complete recovery receipts, bounded read/lock IO and self-contained packaging.');
} finally { clean(); }
