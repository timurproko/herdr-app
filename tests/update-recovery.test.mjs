import assert from 'node:assert/strict';
import fs from 'node:fs';
import updater from '../src/services/updates/update-worker.cjs';
import { resultRecorder, printSummary } from '../tools/deploy-all.mjs';
import { updateProjection, customizationRowState } from '../src/shared/customization-update-model.js';
import { fixture, clean } from './support/deploy-all.mjs';
const { atomic, read, files, inspect, SETTLE, TERMINAL } = updater;
try {
  for (const kind of ['legacy', 'marker', 'partial', 'failed', 'installer-unknown', 'remote-unknown', 'foreign', 'truncated', 'wrong-path', 'live', 'unsettled']) {
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
    if (kind === 'marker') log.push(TERMINAL + JSON.stringify({ ...result, complete: true }));
    else log.push(`EPERM: operation not permitted, rename '${p.result}.uuid.tmp' -> '${kind === 'wrong-path' ? 'foreign-result.json' : p.result}'`);
    if (kind === 'foreign') atomic(p.result, { ...result, token: 'foreign' });
    if (kind === 'truncated') log.splice(2, 1);
    fs.writeFileSync(p.log, log.join('\n') + '\n');
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
  console.log('PASS: same-run terminal evidence, legacy final rename failure, precise outcomes, settlement, live owners and unchanged revision provenance.');
} finally { clean(); }
