import assert from 'node:assert/strict';
import fs from 'node:fs';
import worker from '../src/services/updates/update-worker.cjs';
import { customizationRowState, updateProjection } from '../src/shared/customization-update-model.js';
import { fixture, clean } from './support/deploy-all.mjs';
const { atomic, read, files, inspect, launch, retryUpdate, DEADLINE } = worker;
function setup() {
  const f = fixture(), home = f.env.HERDR_APP_HOME, p = files(home), now = Date.now() + 10000;
  const job = { token: 'old-settings', state: 'complete', pid: 123456789, childPid: 123456788,
    started: now - 2 * DEADLINE, deadline: now - DEADLINE, finished: now - 20000 };
  atomic(p.status, job);
  atomic(p.result, { version: 1, token: job.token, at: job.finished, complete: true, results: [{ machine: 'local', action: 'deployed' }] });
  atomic(p.check, { attempted: now - 1, checked: now, available: true, target: 'b'.repeat(40) });
  fs.writeFileSync(p.log, 'Earlier Settings log, not the current CLI log.\n');
  return { home, p, now, job };
}
try {
  // P1: an old terminal Settings status must not lend its dead PID/deadline to
  // a newer incomplete CLI, including one which already has a timed-out peer.
  for (const settingsState of ['complete', 'unknown']) for (const peerUnknown of [false, true]) for (const expired of [false, true]) for (const skewedClock of [false, true]) {
    const h = setup(), owner = { pid: process.pid, started: h.now - 10000, deadline: expired ? h.now - 1000 : h.now + DEADLINE };
    atomic(h.p.status, { ...h.job, state: settingsState });
    atomic(h.p.result, { version: 1, runId: 'current-cli', token: null, owner, at: skewedClock ? h.job.started - 1000 : h.now - 6000, complete: false,
      results: [{ machine: 'local', action: 'deployed' }, ...(peerUnknown ? [{ machine: 'pc2', action: 'failed', reason: 'remote timed out; outcome unknown' }] : [])] });
    const snapshot = inspect(h.home, { now: () => h.now }); // real/default process liveness, no mocked Windows discovery
    if (settingsState === 'complete') {
      assert.equal(snapshot.job.token, 'current-cli'); assert.equal(snapshot.job.pid, process.pid);
      assert.equal(snapshot.job.state, expired || peerUnknown ? 'unknown' : 'running'); assert.equal(snapshot.job.source, 'cli');
      assert.equal(snapshot.details.kind, 'result');
    } else assert.equal(snapshot.recovery, null, 'overlapping unknown identities never borrow an owner, even with clock rollback');
    assert.equal(Boolean(snapshot.recovery?.retryable), false);
    const row = customizationRowState(updateProjection(snapshot), { now: h.now });
    assert.equal(row.canUpdate, false); assert.equal(row.canRetry, false); assert.equal(row.canRecover, false);
    let spawned = 0;
    await launch(h.home, { now: () => h.now, spawn() { spawned++; throw Error('must not dispatch'); } });
    await retryUpdate(h.home, { identity: snapshot.recovery?.identity, confirmedStopped: true }, { now: () => h.now, spawn() { spawned++; throw Error('must not dispatch'); } });
    assert.equal(spawned, 0); assert.equal(read(h.p.status).token, 'old-settings', 'projection does not overwrite another run');
  }
  // An ownerless legacy CLI is not ordinary Update permission either. The
  // default survey parser refuses an unrecorded live CLI after all time bounds.
  {
    const h = setup(), now = () => h.now + 2 * DEADLINE;
    atomic(h.p.result, { version: 1, token: null, at: h.now - 6000, complete: false, results: [{ machine: 'local', action: 'deployed' }] });
    let active = true;
    const options = { now, run(program) {
      const rows = [{ ProcessId: process.pid, ParentProcessId: 0, Name: 'node.exe', CommandLine: 'node fixture' },
        ...(active ? [{ ProcessId: 333, ParentProcessId: 0, Name: 'node.exe', CommandLine: 'node tools/deploy-all.mjs' }] : [])];
      return { code: 0, stdout: program === 'powershell.exe' ? JSON.stringify(rows) : rows.map(row => `${row.ProcessId} ${row.ParentProcessId} ${row.CommandLine}`).join('\n') };
    } };
    const blocked = inspect(h.home, options);
    assert.equal(blocked.job.state, 'unknown'); assert.equal(blocked.recovery, null); assert.equal(blocked.clearRecovery.eligible, false);
    await launch(h.home, { now, inspectOptions: options, spawn() { assert.fail('ownerless CLI must not dispatch'); } });
    active = false; const stopped = inspect(h.home, options);
    assert.equal(stopped.clearRecovery.eligible, true); assert.equal(stopped.recovery, null);
  }
  // P2: only expired AND dead-owner claims are reclaimed, irrespective of the
  // deployment result. Reclaiming a claim is not permission to replay unknowns.
  for (const state of ['complete', 'unknown']) for (const claim of ['dead-expired', 'live-expired', 'dead-unexpired']) {
    const h = setup(); atomic(h.p.status, { ...h.job, state });
    if (state === 'unknown') atomic(h.p.lock, { token: h.job.token });
    atomic(h.p.result, { version: 1, token: h.job.token, at: h.job.finished, complete: state === 'complete', results: state === 'complete' ? [{ machine: 'local', action: 'deployed' }] : [] });
    atomic(h.p.retryLock, { token: 'abandoned-claim', pid: claim === 'live-expired' ? process.pid : 123456787, until: claim === 'dead-unexpired' ? h.now + 30000 : h.now - 30000 });
    const snapshot = inspect(h.home, { now: () => h.now });
    assert.equal(fs.existsSync(h.p.retryLock), claim !== 'dead-expired', `${state}/${claim}`);
    let spawned = 0;
    await launch(h.home, { now: () => h.now, spawn() { spawned++; throw Error('fixture launch reached'); } });
    assert.equal(spawned, state === 'complete' && claim === 'dead-expired' ? 1 : 0, `${state}/${claim}`);
    if (state === 'unknown') { assert.equal(snapshot.job.state, 'unknown'); assert.equal(fs.existsSync(h.p.lock), true); }
  }
  console.log('PASS: current CLI owner/deadline binding, stale terminal disassociation, active CLI refusal and abandoned retry-claim recovery without automatic replay.');
} finally { clean(); }
