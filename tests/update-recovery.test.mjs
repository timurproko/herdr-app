import assert from 'node:assert/strict';
import fs from 'node:fs';
import updater from '../src/services/updates/update-worker.cjs';
import { resultRecorder, printSummary } from '../tools/deploy-all.mjs';
import { updateProjection, customizationRowState } from '../src/shared/customization-update-model.js';
import { fixture, clean } from './support/deploy-all.mjs';
const { atomic, read, files, inspect, SETTLE, TERMINAL } = updater;
try {
  for (const kind of ['legacy', 'marker', 'large-log', 'partial', 'failed', 'installer-unknown', 'remote-unknown', 'foreign', 'truncated', 'wrong-path', 'live', 'unsettled']) {
    const f = fixture(), p = files(f.env.HERDR_APP_HOME), started = Date.now() - 100;
    const job = { token: 'run', state: 'unknown', pid: 123456789, childPid: 123456788, started, deadline: started + 1800000 };
    atomic(p.status, job); atomic(p.lock, { token: job.token });
    atomic(p.manifest, { version: 2, id: 'custom', files: {} });
    const rows = [{ machine: 'local', action: 'deployed', commit: 'a'.repeat(40) }, { machine: 'pc2', action: 'already current' }];
    if (kind === 'partial') rows[1] = { machine: 'pc2', action: 'failed', reason: 'conflict' };
    if (kind === 'failed') rows[0] = { machine: 'local', action: 'failed', reason: 'install refused' };
    if (kind === 'installer-unknown') rows[0] = { machine: 'local', action: 'failed', outcome: 'unknown', reason: 'installer timed out; outcome unknown' };
    if (kind === 'remote-unknown') rows[1] = { machine: 'pc2', action: 'failed', reason: 'remote timed out; outcome unknown' };
    const record = resultRecorder({ ...f.env, HERDR_UPDATE_RUN_ID: 'run' }); record(rows);
    const result = read(p.result), log = [];
    printSummary(rows, line => log.push(line));
    if (kind === 'marker' || kind === 'large-log') log.push(TERMINAL + JSON.stringify({ ...result, complete: true }));
    else log.push(`EPERM: operation not permitted, rename '${p.result}.uuid.tmp' -> '${kind === 'wrong-path' ? 'foreign-result.json' : p.result}'`);
    if (kind === 'foreign') atomic(p.result, { ...result, token: 'foreign' });
    if (kind === 'truncated') log.splice(2, 1);
    fs.writeFileSync(p.log, (kind === 'large-log' ? 'x'.repeat(1024 * 1024) + '\n' : '') + log.join('\n') + '\n');
    const snapshot = inspect(f.env.HERDR_APP_HOME, { now: () => Date.now() + (kind === 'unsettled' ? 0 : SETTLE + 1), isAlive: () => kind === 'live' });
    const expected = ['foreign', 'truncated', 'wrong-path', 'live', 'unsettled', 'installer-unknown'].includes(kind) ? 'unknown'
      : ['partial', 'remote-unknown'].includes(kind) ? 'partial' : kind === 'failed' ? 'failed' : 'complete';
    assert.equal(snapshot.job.state, expected, kind);
    assert.equal(snapshot.locked, expected === 'unknown', kind);
    if (expected === 'complete') {
      assert.equal(snapshot.job.receiptUnsaved, true);
      assert.equal(snapshot.revision, 'a'.repeat(40), 'only existing matching manifest evidence verifies the revision');
      assert.match(customizationRowState(updateProjection(snapshot)).description, /^Deployed, but the result could not be saved\./);
      assert.equal(inspect(f.env.HERDR_APP_HOME).job.receiptUnsaved, true, 'classification survives a later reader');
      atomic(p.manifest, { version: 2, id: 'custom', files: { changed: true } });
      assert.equal(inspect(f.env.HERDR_APP_HOME).revision, null, 'log text cannot manufacture installed provenance');
    }
    if (kind === 'remote-unknown') assert.equal(snapshot.peerUnknown, true);
  }
  // Completion publication and lock removal are separate writes. A long scanner
  // hold can exhaust unlink retries, but a later inspection must release only
  // that dead, settled terminal owner's lock, not block future updates forever.
  {
    const f = fixture(), p = files(f.env.HERDR_APP_HOME);
    atomic(p.status, { token: 'finished', state: 'complete', pid: 123456789, started: 0, deadline: 1 });
    atomic(p.lock, { token: 'finished' });
    const unlink = fs.unlinkSync;
    fs.unlinkSync = file => { if (file === p.lock) throw Object.assign(Error('held completed lock'), { code: 'EPERM' }); return unlink(file); };
    try { assert.throws(() => inspect(f.env.HERDR_APP_HOME, { isAlive: () => false }), /held completed lock/); }
    finally { fs.unlinkSync = unlink; }
    assert.equal(fs.existsSync(p.lock), true);
    assert.equal(inspect(f.env.HERDR_APP_HOME, { isAlive: () => true }).locked, true, 'live terminal owner is not reclaimed');
    assert.equal(inspect(f.env.HERDR_APP_HOME, { isAlive: () => false }).locked, false);
    atomic(p.lock, { token: 'foreign' });
    assert.equal(inspect(f.env.HERDR_APP_HOME, { isAlive: () => false }).locked, true, 'never release a different owner');
  }
  console.log('PASS: same-run terminal evidence, legacy final rename failure, precise outcomes, settlement, live owners, stale completed locks and unchanged revision provenance.');
} finally { clean(); }
