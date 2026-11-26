import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import worker from '../src/services/updates/update-worker.cjs';
import { deployAll } from '../tools/deploy-all.mjs';
import { customizationRowState, updateProjection } from '../src/shared/customization-update-model.js';
import { fixture, clean, project } from './support/deploy-all.mjs';
const { atomic, read, files, inspect, recoverUpdate, DEADLINE } = worker;
function setup(kind) {
  const f = fixture(), home = f.env.HERDR_APP_HOME, p = files(home), now = Date.now() + 2 * DEADLINE;
  fs.mkdirSync(p.dir, { recursive: true });
  const pid = 123456789, started = now - 2 * DEADLINE, deadline = now - DEADLINE;
  if (kind === 'installer') fs.writeFileSync(p.deployLock, String(pid));
  if (kind === 'lock-before-status') atomic(p.lock, { token: 'orphan', pid, started, deadline });
  if (kind === 'legacy-token-only') atomic(p.lock, { token: 'orphan' });
  if (kind === 'empty-check') fs.writeFileSync(p.checkLock, '');
  if (kind === 'empty-claim') fs.writeFileSync(p.retryLock, '');
  if (kind === 'bad-check-lease') atomic(p.checkLock, { token: 'legacy', until: now + DEADLINE * 10 });
  if (kind === 'bad-retry-lease') atomic(p.retryLock, { token: 'legacy', pid, until: now + DEADLINE * 10 });
  if (kind === 'bad-status') fs.writeFileSync(p.status, '{');
  if (kind === 'bad-status-shape') atomic(p.status, ['legacy']);
  if (kind === 'bad-result-shape') atomic(p.result, { version: 1, results: { some: 7 } });
  if (kind === 'bad-result') fs.writeFileSync(p.result, '{');
  if (kind === 'bad-cache') fs.writeFileSync(p.check, '{');
  if (kind === 'ownerless-status') atomic(p.status, { token: 'legacy', state: 'unknown', started, deadline });
  if (kind === 'ownerless-result') atomic(p.result, { version: 1, token: null, at: started, complete: false, results: [{ machine: 'local', action: 'deployed' }] });
  if (kind === 'future-work-deadline') atomic(p.status, { token: 'legacy', state: 'unknown', pid, started, deadline: now + DEADLINE * 100 });
  if (kind === 'future-file-time') { fs.writeFileSync(p.deployLock, String(pid)); const future = new Date(now + DEADLINE * 100); fs.utimesSync(p.deployLock, future, future); }
  if (kind === 'failed-lock-write') {
    assert.throws(() => worker.acquire(p.lock, { token: 'orphan', pid, started, deadline }, { io: { ...fs, writeFileSync() { throw Object.assign(Error('fixture write failure'), { code: 'ENOSPC' }); } } }), /write failure/);
    assert.equal(fs.readFileSync(p.lock, 'utf8'), '');
  }
  if (kind === 'mixed-orphans') {
    atomic(p.lock, { token: 'orphan', pid, started, deadline });
    atomic(p.status, { token: 'older', state: 'unknown', started, deadline });
    for (const key of ['result', 'check', 'checkLock', 'retryLock']) fs.writeFileSync(p[key], '{');
    fs.writeFileSync(p.deployLock, String(pid));
  }
  const journals = path.join(p.dir, 'backups/fixture-journal'); fs.mkdirSync(journals, { recursive: true });
  fs.writeFileSync(path.join(journals, 'rollback.json'), 'preserve journal');
  fs.writeFileSync(path.join(p.dir, 'manifest.json'), 'preserve ownership');
  fs.writeFileSync(p.log, 'Preserve the old diagnostic log.\n');
  const payload = path.join(home, 'mods/custom-owned/main.js'); fs.mkdirSync(path.dirname(payload), { recursive: true }); fs.writeFileSync(payload, 'preserve payload');
  let settledWait = 0;
  const options = { now: () => now, isAlive: () => false, isQuiescent: () => true, updatersStopped: () => true, sleep: ms => { settledWait += ms; } };
  return { f, home, p, now, journals, payload, options, settledWait: () => settledWait };
}
try {
  for (const kind of ['installer', 'lock-before-status', 'legacy-token-only', 'empty-check', 'empty-claim', 'bad-check-lease', 'bad-retry-lease', 'bad-status', 'bad-status-shape', 'bad-result', 'bad-result-shape', 'bad-cache',  'ownerless-status', 'ownerless-result', 'future-work-deadline', 'future-file-time', 'failed-lock-write', 'mixed-orphans']) {
    const h = setup(kind), snapshot = inspect(h.home, h.options);
    assert.equal(snapshot.clearRecovery?.eligible, true, kind);
    const row = customizationRowState(updateProjection(snapshot), { now: h.now });
    assert.equal(row.action, 'recover', kind); assert.equal(row.canUpdate, false); assert.equal(row.canRetry, false);
    const before = worker.stateRecords(h.p), originals = Object.fromEntries(Object.entries(before).map(([key, value]) => [path.basename(h.p[key]), value.raw]));
    const canceled = await recoverUpdate(h.home, { identity: snapshot.clearRecovery.identity, confirmedStopped: false }, h.options);
    assert.equal(canceled.clearRecovery.eligible, true); assert.equal(worker.stateRecords(h.p).status?.raw, before.status?.raw);
    const recovered = await recoverUpdate(h.home, { identity: snapshot.clearRecovery.identity, confirmedStopped: true }, h.options);
    assert.equal(recovered.recovered, true, kind);
    if (process.platform !== 'win32') assert.equal(fs.statSync(recovered.recoveryDirectory).mode & 0o777, 0o700);
    assert.equal(h.settledWait(), kind === 'future-file-time' ? worker.SETTLE : 0, kind);
    for (const [name, raw] of Object.entries(originals)) assert.equal(fs.readFileSync(path.join(recovered.recoveryDirectory, name), 'utf8'), raw, `${kind}/${name}`);
    for (const key of ['status', 'result', 'check', 'checkLock', 'retryLock', 'lock', 'deployLock']) assert.equal(fs.existsSync(h.p[key]), false, `${kind}/${key}`);
    assert.equal(fs.readFileSync(path.join(h.journals, 'rollback.json'), 'utf8'), 'preserve journal');
    assert.equal(fs.readFileSync(h.p.manifest, 'utf8'), 'preserve ownership');
    assert.equal(fs.readFileSync(h.payload, 'utf8'), 'preserve payload');
    assert.equal(fs.readFileSync(path.join(recovered.recoveryDirectory, 'update.log'), 'utf8'), 'Preserve the old diagnostic log.\n');
    assert.match(fs.readFileSync(h.p.log, 'utf8'), /Explicit stopped-update recovery.*No update (?:will be|was) started/);
    const after = customizationRowState(updateProjection(recovered), { now: h.now });
    assert.equal(after.action, 'check'); assert.equal(after.label, 'Check now');
    await worker.launch(h.home, { spawn() { throw Error('fixture explicit launch only'); } });
    assert.equal(read(h.p.status).state, 'failed', 'a later explicit launch is no longer blocked by orphan metadata');
  }
  // Active or undiscoverable owners, fresh leases and changed evidence refuse
  // recovery. No automatic trigger ever clears an installer lock.
  for (const reason of ['live-owner', 'string-live-owner', 'live-survey', 'unavailable-quiescence', 'unsettled', 'changed']) {
    const h = setup('installer');
    if (reason === 'live-owner') h.options.isAlive = pid => pid === 123456789;
    if (reason === 'string-live-owner') { fs.writeFileSync(h.p.deployLock, JSON.stringify(String(process.pid))); h.options.isAlive = pid => pid === process.pid; }
    if (reason === 'unavailable-quiescence') h.options.isQuiescent = () => false;
    if (reason === 'live-survey') h.options.updatersStopped = () => false;
    if (reason === 'unsettled') h.options.now = Date.now;
    const snapshot = inspect(h.home, h.options);
    if (reason === 'changed') fs.writeFileSync(h.p.deployLock, '123456788');
    await recoverUpdate(h.home, { identity: snapshot.clearRecovery.identity, confirmedStopped: true }, h.options);
    assert.equal(fs.existsSync(h.p.deployLock), true, reason);
    await worker.launch(h.home, { now: h.options.now, inspectOptions: h.options, spawn() { assert.fail('ordinary launch cannot clear installer locks'); } });
    assert.equal(fs.existsSync(h.p.deployLock), true, reason);
  }
  // Current CLI owner wins even when recovery metadata and an old terminal job coexist.
  {
    const h = setup('installer');
    atomic(h.p.status, { token: 'older', state: 'complete', pid: 123456788, started: 1, deadline: 2, finished: 3 });
    atomic(h.p.result, { version: 1, runId: 'live-cli', token: null, owner: { pid: process.pid, started: h.now - 10000, deadline: h.now + DEADLINE }, at: h.now - 1, complete: false, results: [{ machine: 'local', action: 'deployed' }, { machine: 'pc2', action: 'failed', outcome: 'unknown' }] });
    const snapshot = inspect(h.home, { ...h.options, isAlive: pid => pid === process.pid });
    assert.equal(snapshot.clearRecovery.eligible, false); assert.equal(snapshot.recovery.retryable, false);
    assert.equal(snapshot.job.pid, process.pid);
  }
  // Recovery cannot follow a redirected archive root or touch its contents.
  {
    const h = setup('installer'), target = path.join(h.f.base, 'unowned-archive'); fs.mkdirSync(target);
    fs.writeFileSync(path.join(target, 'marker'), 'untouched');
    fs.symlinkSync(target, path.join(h.p.dir, 'recovery'), process.platform === 'win32' ? 'junction' : 'dir');
    const snapshot = worker.inspect(h.home, h.options); assert.equal(snapshot.clearRecovery.eligible, false);
    assert.throws(() => worker.reapRetryClaim(h.p, h.now), /Linked updater state/);
    await worker.recoverUpdate(h.home, { confirmedStopped: true, identity: snapshot.clearRecovery.identity }, h.options);
    assert.equal(fs.existsSync(h.p.deployLock), true); assert.deepEqual(fs.readdirSync(target), ['marker']);
    assert.equal(fs.readFileSync(path.join(target, 'marker'), 'utf8'), 'untouched');
  }
  // A recovery claim prevents an ordinary CLI from publishing a new result or dispatching.
  {
    const h = setup('installer'); atomic(h.p.retryLock, { token: 'recovering', pid: process.pid, until: h.now + 30000 });
    assert.throws(() => deployAll([], { ...h.f, run() { assert.fail('no source/peer/deploy work during recovery'); } }), /claim is active/);
    assert.equal(fs.existsSync(h.p.result), false);
  }
  // Empty homes do not need recovery; an expired receipt-less runtime launch does.
  {
    const h = setup('empty-runtime'); assert.equal(worker.inspect(h.home, h.options).clearRecovery, null);
    h.options.expiredLaunch = { ticket: 1, started: h.now - DEADLINE - 1000, deadline: h.now - 1000 };
    const offer = worker.inspect(h.home, h.options).clearRecovery; assert.equal(offer.eligible, true);
    assert.equal(worker.inspect(h.home, { ...h.options, expiredLaunch: { ...h.options.expiredLaunch, started: h.now - 1000 } }).clearRecovery.eligible, false);
    assert.equal(worker.inspect(h.home, { ...h.options, updatersStopped: () => false }).clearRecovery.eligible, false);
    const recovered = await worker.recoverUpdate(h.home, { confirmedStopped: true, identity: offer.identity }, h.options);
    assert.equal(recovered.recovered, true); assert.deepEqual(recovered.clearedTokens, []);
    assert.deepEqual(JSON.parse(fs.readFileSync(path.join(recovered.recoveryDirectory, 'recovery.json'), 'utf8')).expiredLaunch, h.options.expiredLaunch);
  }
  // The documented command previews without mutation; an active recorded owner
  // is refused even with the confirmation flag (no real process survey needed).
  {
    const h = setup('installer'); fs.writeFileSync(h.p.deployLock, String(process.pid));
    const command = cp.spawnSync(process.execPath, [path.join(project, 'src/services/updates/update-worker.cjs'), '--recover', h.home], { encoding: 'utf8', env: { ...process.env, HERDR_APP_HOME: h.home } });
    assert.equal(command.status, 0); const preview = JSON.parse(command.stdout);
    assert.match(preview.confirmation, /local and remote.*does not retry/); assert.equal(preview.clearRecovery.eligible, false);
    assert.equal(fs.existsSync(h.p.deployLock), true);
  }
  // The real command dispatcher can complete recovery, with only its read-only
  // process survey mocked; it cannot fall through to network/deployment tools.
  {
    const h = setup('lock-before-status'), preload = path.join(h.f.base, 'stopped-survey.cjs');
    fs.writeFileSync(preload, `Date.now=()=>${h.now}; const cp=require('node:child_process'); cp.spawnSync=(program,args)=>{ if(program==='powershell.exe')return {status:0,stdout:JSON.stringify([{ProcessId:1,ParentProcessId:0,CommandLine:'init',Name:'init'},{ProcessId:process.pid,ParentProcessId:1,CommandLine:'node',Name:'node.exe'}]),stderr:''}; if(program==='ps')return {status:0,stdout:'1 0 init\\n'+process.pid+' 1 node\\n',stderr:''}; throw Error('No external tool allowed: '+program); };`);
    const command = cp.spawnSync(process.execPath, ['--require', preload, path.join(project, 'src/services/updates/update-worker.cjs'), '--recover', h.home, '--confirm-stopped'], { encoding: 'utf8', timeout: 15000, env: { ...process.env, HERDR_APP_HOME: h.home } });
    assert.equal(command.status, 0, command.stderr); assert.equal(JSON.parse(command.stdout).recovered, true, command.stdout);
    assert.equal(fs.existsSync(h.p.lock), false); assert.equal(fs.existsSync(h.p.status), false);
  }
  // An ordinary check recovers a dead reader's bounded lease without an update.
  {
    const h = setup('empty-check'); atomic(h.p.checkLock, { token: 'dead-reader', pid: 123456789, until: h.now - 1 });
    const snapshot = worker.checkMain(h.home, { force: true, now: () => h.now, run: () => ({ code: 0, stdout: `${'b'.repeat(40)}\trefs/heads/main\n` }) });
    assert.equal(snapshot.check.available, true); assert.equal(fs.existsSync(h.p.checkLock), false); assert.equal(snapshot.job, null);
  }
  console.log('PASS: explicit non-deploying state recovery, every orphan/malformed file, owner/lease/survey/identity guards, byte-preserving archives, journals, CLI and later Update reachability.');
} finally { clean(); }
