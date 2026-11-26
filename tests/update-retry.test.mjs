import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import updater from '../src/services/updates/update-worker.cjs';
import { customizationRowState, updateProjection } from '../src/shared/customization-update-model.js';
import { fixture, clean } from './support/deploy-all.mjs';
const { atomic, read, files, inspect, retryUpdate, DEADLINE, SETTLE } = updater;
function unknown() {
  const f = fixture(), home = f.env.HERDR_APP_HOME, p = files(home), clock = Date.now() + SETTLE + 100;
  const job = { token: 'old-run', state: 'unknown', pid: 123456789, childPid: 123456788, started: clock - DEADLINE - SETTLE, deadline: clock - SETTLE, finished: clock - SETTLE };
  atomic(p.status, job); atomic(p.lock, { token: job.token });
  atomic(p.result, { version: 1, token: job.token, at: job.finished, complete: false, results: [] });
  atomic(p.check, { attempted: clock - 1, checked: clock, available: true, target: 'b'.repeat(40) });
  fs.writeFileSync(p.log, 'Unfinished deployment; no terminal evidence.\n');
  const options = { now: () => clock, isAlive: () => false, isQuiescent: () => true };
  return { f, home, p, clock, job, options, snapshot: () => inspect(home, options) };
}
try {
  for (const changed of ['eligible', 'live', 'descendants', 'before-deadline', 'stale-check', 'failed-check', 'no-check', 'deploy-lock', 'foreign-lock']) {
    const h = unknown(), { p, clock } = h;
    if (changed === 'live' || changed === 'descendants') h.options.isQuiescent = () => false;
    if (changed === 'before-deadline') atomic(p.status, { ...h.job, deadline: clock + 10000 });
    if (changed === 'stale-check') atomic(p.check, { attempted: h.job.started, checked: h.job.started, available: true });
    if (changed === 'failed-check') atomic(p.check, { attempted: clock, checked: clock, available: true, error: 'offline' });
    if (changed === 'no-check') fs.unlinkSync(p.check);
    if (changed === 'deploy-lock') fs.writeFileSync(p.deployLock, '12345');
    if (changed === 'foreign-lock') atomic(p.lock, { token: 'other-run' });
    const snapshot = h.snapshot(), row = customizationRowState(updateProjection(snapshot), { now: clock });
    assert.equal(row.canUpdate, false, changed);
    assert.equal(snapshot.recovery.retryable, changed === 'eligible', changed);
    assert.equal(row.canRetry, changed === 'eligible', changed);
    assert.equal(row.action, changed === 'eligible' ? 'retry' : 'check', changed);
    // Neither status inspection nor the ordinary launch route can replay it.
    h.snapshot(); h.snapshot();
    await updater.launch(h.home, { now: () => clock, inspectOptions: h.options, spawn() { assert.fail('automatic/ordinary launch must remain blocked'); } });
    assert.equal(read(p.status).token, 'old-run');
    await retryUpdate(h.home, { identity: snapshot.recovery.identity, confirmedStopped: false }, { now: () => clock, inspectOptions: h.options, spawn() { assert.fail('confirmation required'); } });
    assert.equal(read(p.status).token, 'old-run');
  }
  // Late completion invalidates a previously captured confirmation.
  {
    const h = unknown(), identity = h.snapshot().recovery.identity;
    atomic(h.p.result, { version: 1, token: h.job.token, at: h.job.finished, complete: true, results: [{ machine: 'local', action: 'deployed' }] });
    await retryUpdate(h.home, { identity, confirmedStopped: true }, { now: () => h.clock, inspectOptions: h.options, spawn() { assert.fail('late completion settled this run'); } });
    assert.equal(read(h.p.status).state, 'complete');
  }
  // An unidentifiable old CLI unknown still requires manual investigation.
  {
    const h = unknown(); fs.unlinkSync(h.p.status); fs.unlinkSync(h.p.lock);
    atomic(h.p.result, { version: 1, complete: true, results: [{ machine: 'local', action: 'failed', outcome: 'unknown' }] });
    assert.equal(h.snapshot().recovery, null);
    // New CLI metadata identifies the same deliberate retry boundary without Settings files.
    atomic(h.p.result, { version: 1, runId: 'cli-run', owner: { pid: h.job.pid, started: h.job.started, deadline: h.job.deadline }, at: h.job.finished, complete: true, results: [{ machine: 'local', action: 'failed', outcome: 'unknown' }] });
    assert.equal(h.snapshot().recovery.retryable, true);
  }
  // A failed archive cannot consume the old status/lock or dispatch anything.
  {
    const h = unknown(), identity = h.snapshot().recovery.identity;
    const before = fs.readFileSync(h.p.status), lock = fs.readFileSync(h.p.lock), copy = fs.copyFileSync;
    fs.copyFileSync = () => { throw Object.assign(Error('fixture disk full'), { code: 'ENOSPC' }); };
    try {
      await assert.rejects(retryUpdate(h.home, { identity, confirmedStopped: true }, { now: () => h.clock, inspectOptions: h.options, spawn() { assert.fail('archive must precede dispatch'); } }), /disk full/);
    } finally { fs.copyFileSync = copy; }
    assert.deepEqual(fs.readFileSync(h.p.status), before); assert.deepEqual(fs.readFileSync(h.p.lock), lock);
    assert.equal(fs.existsSync(h.p.retryLock), false);
  }
  // Two windows confirm the same unknown; only one can claim a new launch.
  {
    const h = unknown(), snapshot = h.snapshot(), before = Object.fromEntries(['status', 'result', 'lock', 'log'].map(key => [key, fs.readFileSync(h.p[key])]));
    let launches = 0;
    const options = { now: () => h.clock, inspectOptions: h.options, sleep: async () => {}, spawn() {
      launches++; const job = read(h.p.status);
      atomic(h.p.status, { ...job, phase: 'preparing', pid: 123456787 });
      const child = new EventEmitter(); child.pid = 123456787; child.unref = () => {}; return child;
    } };
    const request = { identity: snapshot.recovery.identity, confirmedStopped: true };
    await Promise.all([retryUpdate(h.home, request, options), retryUpdate(h.home, request, options)]);
    assert.equal(launches, 1); assert.notEqual(read(h.p.status).token, h.job.token);
    const recovery = path.join(h.p.dir, 'recovery');
    const archives = fs.readdirSync(recovery); assert.equal(archives.length, 1);
    for (const [key, bytes] of Object.entries(before)) assert.deepEqual(fs.readFileSync(path.join(recovery, archives[0], path.basename(h.p[key]))), bytes);
    assert.equal(fs.existsSync(h.p.retryLock), false);
    assert.equal(read(h.p.result).complete, false);
  }
  for (const [processes, expected] of [[[{ ProcessId: 1, ParentProcessId: 0 }], true], [[], false], [[{ ProcessId: 999, ParentProcessId: 12345 }], false], [[{ ProcessId: 12345, ParentProcessId: 1 }], false]]) {
    assert.equal(updater.quiescent({ pid: 12345 }, { platform: 'win32', isAlive: () => false, run: () => ({ code: 0, stdout: JSON.stringify(processes) }) }), expected);
  }
  assert.equal(updater.quiescent({ pid: 12345 }, { platform: 'win32', isAlive: () => false, run: () => ({ code: 1 }) }), false);
  assert.equal(updater.quiescent({ pid: 12345 }, { isAlive: () => true, run() { assert.fail('live owner refuses before discovery'); } }), false);
  console.log('PASS: unknown retry matrix, explicit confirmation, deadline/descendant/lock guards, CLI identity, late receipts and concurrent archived single-launch recovery.');
} finally { clean(); }
