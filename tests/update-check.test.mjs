import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
import { CUSTOMIZATION_LABEL, customizationRowState, updateProjection, updateAvailable, CUSTOMIZATION_UPDATE_KEY } from '../src/shared/customization-update-model.js';
import { syncPreferences } from '../tools/runtime/preferences.mjs';
import { deployAll } from '../tools/deploy-all.mjs';
import { fixture, clean as cleanRunFixtures } from './support/deploy-all.mjs';
const require = createRequire(import.meta.url), worker = require('../src/services/updates/update-worker.cjs');
fs.mkdirSync(path.resolve('.artifacts'), { recursive: true });
const base = fs.mkdtempSync(path.resolve('.artifacts/update-check-'));
try {
  const home = path.join(base, 'home'), p = worker.files(home);
  assert.equal(fs.existsSync(home), false); worker.inspect(home); assert.equal(fs.existsSync(home), false);
  let clock = 1000000, calls = 0, target = 'a'.repeat(40), fail = false;
  const options = { now: () => clock, random: () => 0, run(command, args, config) {
    calls++; assert.equal(command, 'git'); assert.deepEqual(args, ['ls-remote', '--', worker.REPOSITORY, 'refs/heads/main']);
    assert.equal(config.timeout, 15000); assert.equal(config.env.GIT_TERMINAL_PROMPT, '0');
    return { code: fail ? 1 : 0, stdout: `${target}\trefs/heads/main\n` };
  } };
  const manifest = JSON.stringify({ version: 2, id: 'custom', files: {} });
  worker.atomic(p.manifest, manifest);
  worker.atomic(p.result, { complete: true, desktop: { commit: target, verified: true, manifest: createHash('sha256').update(manifest).digest('hex') }, results: [{ machine: 'local', action: 'deployed' }] });
  let snapshot = worker.checkMain(home, options);
  assert.equal(snapshot.revision, target); assert.equal(snapshot.check.available, false);
  assert.equal(customizationRowState(updateProjection(snapshot)).title, 'herdr-app-custom aaaaaaa');
  assert.match(customizationRowState(updateProjection(snapshot)).description, /^Up to date\. Checked at \d\d:\d\d\.$/);
  worker.checkMain(home, options); assert.equal(calls, 1, 'mounts coalesce within the persisted healthy delay');
  assert.equal(snapshot.check.nextAttempt, clock + worker.CHECK_MIN);
  assert.equal(worker.checkDelay(0, () => 1), worker.CHECK_MAX);
  assert.equal(worker.checkDelay(4, () => 0), 1620000, 'backoff still jitters at the cap');
  assert.equal(worker.checkDelay(4, () => 1), worker.RETRY_MAX);
  clock += worker.CHECK_MIN; target = 'b'.repeat(40); snapshot = worker.checkMain(home, options);
  assert.equal(calls, 2); assert.equal(snapshot.check.available, true);
  let row = customizationRowState(updateProjection(snapshot)); assert.equal(row.label, 'Update'); assert.equal(row.description, 'Update available.');
  fail = true; clock++; const checked = snapshot.check.checked;
  snapshot = worker.checkMain(home, { ...options, force: true });
  assert.equal(snapshot.check.checked, checked); assert.equal(updateAvailable(snapshot), true);
  row = customizationRowState(updateProjection(snapshot)); assert.equal(row.label, 'Check now'); assert.equal(row.description, 'Check failed. Try again.');
  worker.checkMain(home, options); assert.equal(calls, 3, 'failed attempts do not retry-loop');
  worker.atomic(p.checkLock, { token: 'other-check', until: clock + 20000 });
  assert.equal(worker.checkMain(home, { ...options, force: true }).checking, true); assert.equal(calls, 3);
  clock += 21000; fail = false; worker.checkMain(home, { ...options, force: true }); assert.equal(calls, 4);
  worker.atomic(p.manifest, JSON.stringify({ version: 2, id: 'custom', files: { changed: 'hash' } }));
  assert.equal(worker.inspect(home).revision, null);
  assert.match(customizationRowState(updateProjection(worker.inspect(home))).title, /revision unknown/);
  fs.rmSync(p.check); fail = true;
  assert.equal(updateAvailable(worker.checkMain(home, { ...options, force: true })), false, 'failed first check never invents availability');
  // Separate desktops, legacy caches, failures, invalidation and clock skew.
  {
    const one = path.join(base, 'one'), two = path.join(base, 'two');
    let at = 5000000, reads = 0, offline = false;
    const io = { now: () => at, random: () => 0.5, run() { reads++; return { code: offline ? 1 : 0, stdout: `${target}\trefs/heads/main\n` }; } };
    let first = worker.checkMain(one, io); worker.checkMain(two, io);
    assert.equal(reads, 2, 'desktops have independent caches and evidence');
    assert.equal(first.check.nextAttempt, at + 150000);
    assert.equal(first.check.failures, 0);
    at += 15000;
    worker.checkMain(one, { ...io, invalidate: true }); assert.equal(reads, 3, 'hint bypasses healthy cache');
    worker.checkMain(one, { ...io, invalidate: true }); assert.equal(reads, 3, 'automatic rate floor');
    offline = true; worker.checkMain(one, { ...io, force: true }); assert.equal(reads, 4);
    for (const delay of [300000, 600000, 1200000, 1800000]) {
      const cached = worker.inspect(one, { now: io.now }).check;
      assert.equal(cached.nextAttempt - at, delay);
      worker.checkMain(one, { ...io, invalidate: true }); assert.equal(reads, 4 + [300000,600000,1200000,1800000].indexOf(delay), 'failure backoff wins over hints');
      at = cached.nextAttempt; worker.checkMain(one, io);
    }
    offline = false; first = worker.checkMain(one, { ...io, force: true });
    assert.equal(first.check.failures, 0); assert.equal(first.check.nextAttempt, at + 150000);
    const before = reads;
    worker.atomic(worker.files(one).check, { attempted: at - 120000, target, available: true });
    worker.checkMain(one, io); assert.equal(reads, before + 1, 'legacy cache does not retain hourly gate');
    worker.atomic(worker.files(one).check, { attempted: at + 9999999, nextAttempt: at + 99999999 });
    worker.checkMain(one, io); assert.equal(reads, before + 2, 'backwards clock cannot postpone forever');
    // The command can reenter from another mod, but its lease is already held.
    worker.checkMain(one, { ...io, force: true, run() {
      const held = worker.checkMain(one, { ...io, force: true });
      assert.equal(held.checking, true); assert.equal(reads, before + 2);
      return { code: 0, stdout: `${target}\trefs/heads/main\n` };
    } });
  }
  const current = { revision: 'a'.repeat(40), check: { checked: clock, attempted: clock, available: false }, log: '/fixture/update.log' };
  assert.equal(customizationRowState(current, { busy: 'check' }).description, customizationRowState(current).description);
  assert.equal(customizationRowState(current, { busy: 'check' }).label, 'Checking…');
  row = customizationRowState({ ...current, job: { state: 'running', deadline: clock + 10000 } }, { now: clock });
  assert.equal(row.description, 'Updating all machines…'); assert.equal(row.enabled, false);
  row = customizationRowState({ ...current, job: { state: 'unknown' }, locked: true });
  assert.match(row.description, /outcome unknown.*fixture/); assert.equal(row.action, 'check');
  row = customizationRowState({ ...current, job: { state: 'failed', error: 'fixture conflict', finished: clock } });
  assert.match(row.description, /fixture conflict.*documented rollback.*fixture/); assert.equal(row.action, 'check');
  row = customizationRowState({ ...current, partial: true }); assert.match(row.description, /some machines skipped or failed.*fixture/);
  row = customizationRowState({ ...current, job: { state: 'complete', finished: clock + 1 } }); assert.equal(row.description, 'Updated. Check now.');
  assert.equal(CUSTOMIZATION_LABEL, 'herdr-app-custom');
  // Runtime projection and sidecars are never preference export inputs.
  fs.writeFileSync(path.join(home, 'shared.json'), JSON.stringify({ [CUSTOMIZATION_UPDATE_KEY]: { log: '/private', token: 'private', resume: { opening: 'private-opening', started: 1000 } }, 'custom.settings.navigation': { version: 1, dialogs: [{ overlay: 'private-dialog', section: 'updates' }] }, 'custom.git.relay-runtime': { owner:'private-lease', repositories:{ 'private/repo':{ revision:3,main:2 } } }, 'custom.git.relay-retry': 4, 'sidebar.width': 268 }));
  syncPreferences('export', home, { hostname: 'fixture', isDesktopOpen: () => false });
  const exported = JSON.parse(fs.readFileSync(path.join(home, 'preferences/fixture.json')));
  assert.deepEqual(exported.shared, { 'sidebar.width': 268 });
  assert.ok(!JSON.stringify(exported).includes('private'));
  // Full 2 x 4 matrix: use the real deploy:all result writer, worker inspection,
  // successful follow-up Check, public projection and row renderer for both run
  // sources. Only Git's bare fixture origin and mocked installers/hc are used.
  for (const source of ['settings', 'cli']) for (const state of ['success', 'partial', 'failed', 'unknown']) {
    const f = fixture(), home = f.env.HERDR_APP_HOME, p = worker.files(home);
    const token = source === 'settings' ? 'matrix-settings-run' : null;
    const original = f.run;
    f.env = { ...f.env, HERDR_UPDATE_RUN_ID: token || '' };
    f.run = (program, args, options) => {
      if (program === 'git') return original(program, args, options);
      if (program === 'hc') return { code: 0, stdout: JSON.stringify({ machines: state === 'partial' ? [{ name: 'offline-fixture', state: 'offline' }] : [] }) };
      if (state === 'failed') return { code: 1, stdout: '', stderr: 'fixture refused install' };
      if (state === 'unknown') { assert.equal(options.timeout, 480000); return { code: null, timedOut: true, stdout: '', stderr: 'fixture installer timeout' }; }
      worker.atomic(p.manifest, { version: 2, id: 'custom', files: {} });
      return { code: 0, stdout: JSON.stringify({ changed: 1, removed: 0, backup: 'matrix-backup' }), stderr: '' };
    };
    const run = deployAll([], f), result = worker.read(p.result);
    const title = `${source}/${state}`;
    assert.equal(result.complete, true, title); assert.equal(result.token, token, title);
    assert.equal(run.code, ['failed', 'unknown'].includes(state) ? 1 : 0, title);
    if (source === 'settings') {
      worker.atomic(p.status, { token, ...worker.outcome(result), source, started: result.at - 10, finished: result.at });
      fs.writeFileSync(p.log, 'matching Settings output');
      if (state === 'unknown') worker.atomic(p.lock, { token });
    }
    let snapshot = worker.inspect(home), projected = updateProjection(snapshot);
    assert.equal(projected.job.state, state === 'success' ? 'complete' : state, title);
    assert.equal(snapshot.details.kind, source === 'settings' ? 'log' : 'result', title);
    assert.equal(fs.existsSync(snapshot.details.path), true, title);
    if (['failed', 'unknown'].includes(state)) {
      const initial = customizationRowState(projected);
      assert.equal(initial.action, 'check', `${title}: no retry before a fresh check`);
      assert.match(initial.description, state === 'failed' ? /Update failed:.*documented rollback/ : /Update outcome unknown: deployment timed out/, title);
    }
    // A successful main check must not erase a failed/unknown deployment. For a
    // definite failure only, a fresh check can permit an explicit retry while
    // keeping its failure/cause/recovery/details visible.
    const main = result.results.find(row => row.machine === 'local').commit;
    snapshot = worker.checkMain(home, { force: true, now: () => result.at + 100, run: () => ({ code: 0, stdout: `${main}\trefs/heads/main\n` }) });
    projected = updateProjection(snapshot);
    const row = customizationRowState(projected, { now: result.at + 100 });
    if (state === 'success') { assert.match(row.description, /^Up to date\. Checked at \d\d:\d\d\.$/, title); assert.equal(row.action, 'check', title); }
    if (state === 'partial') { assert.match(row.description, /Desktop updated; some machines skipped or failed/, title); assert.equal(row.action, 'check', title); }
    if (state === 'failed') { assert.match(row.description, /Update failed: deployment failed; inspect output\. Recovery: documented rollback\./, title); assert.equal(row.action, 'launch', title); }
    if (state === 'unknown') {
      assert.match(row.description, /Update outcome unknown: deployment timed out/, title); assert.equal(row.action, 'check', title);
      assert.equal(snapshot.check.available, true, title);
      let dispatches = 0;
      await worker.launch(home, { spawn() { dispatches++; throw Error('must not dispatch'); } });
      assert.equal(dispatches, 0, `${title}: process boundary blocks even without a Settings lock`);
      if (source === 'cli') {
        assert.equal(fs.existsSync(p.lock), false, title);
        const pending = { ...result, complete: false }; worker.atomic(p.result, pending);
        assert.equal(updateProjection(worker.inspect(home)).job.state, 'unknown', 'CLI local uncertainty blocks while peers are still finishing');
        worker.atomic(p.result, result);
      }
    }
    if (state !== 'success') assert.ok(row.description.includes(snapshot.details.path), title);
    if (source === 'cli') {
      worker.atomic(p.status, { token: 'old-settings', state: 'complete', started: 0, finished: 1 });
      fs.writeFileSync(p.log, 'unrelated Settings output');
      const latest = worker.inspect(home), rendered = customizationRowState(updateProjection(latest), { now: result.at + 100 });
      assert.equal(latest.job, null, title); assert.equal(latest.lastRun.source, 'cli', title);
      assert.equal(rendered.description, row.description, `${title}: stale completed job cannot change latest CLI presentation`);
      assert.equal(latest.details.path, p.result, title);
    }
    console.log(`PASS: outcome matrix ${title}: ${row.description}`);
  }
  console.log('PASS: bounded main-only checks, jittered persisted cache/lease/backoff semantics, installed evidence, all eight run-source/outcome cells and preference exclusion (fixtures).');
} finally { fs.rmSync(base, { recursive: true, force: true }); cleanRunFixtures(); }
