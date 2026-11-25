import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import cp from 'node:child_process';
import { createRequire } from 'node:module';
import { fixture, clean, git, project } from './support/deploy-all.mjs';
import { deployAll, resultRecorder } from '../tools/deploy-all.mjs';
const require = createRequire(import.meta.url);
const worker = require('../src/services/updates/update-worker.cjs');
const deployWorker = require('../tools/deploy-all-worker.cjs');
const { customizationRowState, updateProjection, updateLaunchProgress } = await import('../src/shared/customization-update-model.js');
const { files, atomic, read, prepareClone, runUpdate, launch, inspect, outcome } = worker;
function setup() {
  const f = fixture(), userHome = path.join(f.base, 'user'), root = path.join(userHome, '.local/share/herdr-app');
  fs.mkdirSync(path.dirname(root), { recursive: true }); fs.renameSync(f.root, root);
  git(root, 'remote', 'set-url', 'origin', worker.REPOSITORY);
  git(root, 'config', `url.${f.origin}.insteadOf`, worker.REPOSITORY);
  return { ...f, root, userHome, home: f.env.HERDR_APP_HOME, run(program, args, options) {
    if (program === process.execPath) {
      assert.deepEqual(args, [path.join(root, 'tools/deploy-all.mjs'), '--protocol']);
      return { code: 0, stdout: '{"resultProtocol":1}' };
    }
    return f.run(program, args, { ...options, env: { ...options.env, GIT_CONFIG_GLOBAL: f.env.GIT_CONFIG_GLOBAL, GIT_CONFIG_NOSYSTEM: '1' } });
  } };
}
function pending(f) {
  const p = files(f.home), token = 'fixture-run';
  atomic(p.lock, { token }); atomic(p.status, { token, pid: process.pid, state: 'running', phase: 'starting', started: Date.now(), deadline: Date.now() + 1800000 });
  fs.writeFileSync(p.log, 'fixture\n'); return { p, token };
}
function final(p, token, rows = [{ machine: 'local', action: 'deployed', commit: 'a'.repeat(40), backup: 'fixture-backup' }]) {
  atomic(p.result, { token, complete: true, results: rows });
}
try {
  let f = setup();
  assert.equal(prepareClone(f), f.root);
  for (const kind of ['dirty', 'branch', 'ahead', 'origin', 'linked', 'redirect']) {
    const g = setup();
    if (kind === 'dirty') fs.writeFileSync(path.join(g.root, 'personal'), 'keep');
    if (kind === 'branch') git(g.root, 'checkout', '-b', 'feature/personal');
    if (kind === 'ahead') { fs.writeFileSync(path.join(g.root, 'personal'), 'keep'); git(g.root, 'add', '.'); git(g.root, 'commit', '-m', 'ahead'); }
    if (kind === 'origin') git(g.root, 'remote', 'set-url', 'origin', 'https://invalid.example/other.git');
    if (kind === 'linked') { fs.renameSync(path.join(g.root, '.git'), path.join(g.base, 'git-aside')); fs.writeFileSync(path.join(g.root, '.git'), 'gitdir: elsewhere'); }
    if (kind === 'redirect') { fs.renameSync(g.root, g.root + '-aside'); fs.symlinkSync(g.root + '-aside', g.root, process.platform === 'win32' ? 'junction' : 'dir'); }
    assert.throws(() => prepareClone(g), undefined, kind);
  }
  // Clone only at explicit preparation; canonical URL is intercepted to a bare fixture.
  const g = setup(); fs.renameSync(g.root, g.root + '-aside');
  let cloned = false;
  const run = (program, args, options) => {
    if (args[0] !== 'clone') return g.run(program, args, options);
    cloned = true; assert.equal(args.at(-2), worker.REPOSITORY); assert.equal(options.timeout, 120000);
    const result = worker.command(program, [...args.slice(0, -2), g.origin, args.at(-1)], options);
    git(g.root, 'remote', 'set-url', 'origin', worker.REPOSITORY);
    git(g.root, 'config', `url.${g.origin}.insteadOf`, worker.REPOSITORY);
    return result;
  };
  inspect(g.home); assert.equal(cloned, false); assert.equal(fs.existsSync(g.root), false);
  prepareClone({ ...g, run }); assert.equal(cloned, true);
  // Real Git + worker + deploy:all receipts: main advances after the check and
  // again between bootstrap and deploy:all's fetch. Hold the supervisor open
  // while the real pipeline records its desktop result and visits a mock peer.
  for (const peerOnly of [false, true]) {
    const advancing = setup(), p = files(advancing.home);
    atomic(p.manifest, { version: 2, id: 'custom', files: {} });
    const installed = git(advancing.root, 'rev-parse', 'HEAD');
    const prior = resultRecorder({ ...advancing.env, HERDR_UPDATE_RUN_ID: 'previous-run' });
    prior([{ machine: 'local', action: 'deployed', commit: installed },
      ...(peerOnly ? [{ machine: 'peer', action: 'skipped', reason: 'offline (offline)' }] : [])], true);
    const checkedTarget = peerOnly ? installed : advancing.advance();
    const checked = worker.checkMain(advancing.home, { force: true, run(program, args, options) {
      assert.equal(program, 'git'); assert.deepEqual(args, ['ls-remote', '--', worker.REPOSITORY, 'refs/heads/main']);
      return worker.command(program, ['ls-remote', '--', advancing.origin, 'refs/heads/main'], { ...options, env: advancing.env });
    } });
    assert.equal(checked.check.target, checkedTarget);
    assert.equal(customizationRowState(updateProjection(checked)).action, 'launch');
    const progress = updateLaunchProgress(checked);
    assert.equal(progress.peerRevision, peerOnly ? installed : null);
    const launching = customizationRowState({ ...updateProjection(checked), launch: { deadline: Date.now() + 30000, progress } });
    assert.equal(launching.title, `herdr-app-custom ${installed.slice(0, 7)}`);
    assert.equal(launching.description, `${peerOnly ? 'Updating other machines' : 'Updating this machine'} to ${checkedTarget.slice(0, 7)}.`);
    assert.equal(launching.label, 'Updating…'); assert.equal(launching.enabled, false);
    const fetchedTarget = advancing.advance();
    const { token } = pending(advancing);
    let child;
    const active = runUpdate(advancing.home, token, { userHome: advancing.userHome, run: advancing.run, spawn() {
      assert.equal(read(p.status).target, fetchedTarget, 'worker publishes its actual fetched target before dispatch');
      child = new EventEmitter(); child.pid = 123456789; return child;
    } });
    const row = snapshot => customizationRowState({ ...updateProjection(snapshot), progress: { ...progress, token } });
    let snapshot = inspect(advancing.home);
    assert.equal(snapshot.job.state, 'running'); assert.equal(snapshot.job.target, fetchedTarget);
    assert.equal(snapshot.check.target, checkedTarget, 'cached availability is deliberately still the old main');
    assert.equal(row(snapshot).title, `herdr-app-custom ${installed.slice(0, 7)}`, 'fetching a target does not install it');
    assert.equal(row(snapshot).description, `Updating this machine to ${fetchedTarget.slice(0, 7)}.`, 'fetched target replaces both stale target and peer-only wording');
    snapshot = worker.checkMain(advancing.home, { force: true, run() { assert.fail('running jobs do not start another main check'); } });
    assert.equal(row(snapshot).description, `Updating this machine to ${fetchedTarget.slice(0, 7)}.`);
    const deployedTarget = advancing.advance();
    let peerVisited = false, desktopVisited = false;
    const deployed = deployAll([], { root: advancing.root, env: { ...advancing.env, HERDR_UPDATE_RUN_ID: token }, log() {}, run(program, args, options) {
      if (program === 'npm' || program === 'cmd.exe') {
        desktopVisited = true;
        const installing = row(inspect(advancing.home));
        assert.equal(installing.title, `herdr-app-custom ${installed.slice(0, 7)}`, 'desktop installer has not succeeded yet');
        assert.equal(installing.description, `Updating this machine to ${deployedTarget.slice(0, 7)}.`);
        assert.equal(installing.label, 'Updating…'); assert.equal(installing.enabled, false);
        // Real installation changes ownership before the successful result is
        // recorded. Neither the carried provenance nor the target proves it yet.
        atomic(p.manifest, { version: 2, id: 'custom', files: {}, installed: deployedTarget });
        assert.equal(row(inspect(advancing.home)).title, 'herdr-app-custom', 'changed ownership cannot retain a stale installed claim');
      }
      if (program !== 'hc') return advancing.run(program, args, options);
      if (args[0] === 'machine') {
        const fetched = read(p.result);
        assert.equal(fetched.target, deployedTarget); assert.equal(fetched.results.length, 0);
        assert.equal(fetched.desktop.commit, installed, 'old installed provenance is still carried before deployment');
        assert.equal(row(inspect(advancing.home)).title, `herdr-app-custom ${installed.slice(0, 7)}`);
        assert.equal(row(inspect(advancing.home)).description, `Updating this machine to ${deployedTarget.slice(0, 7)}.`, 'pipeline fetch publishes the newer target before inventory or installation finishes');
        return { code: 0, stdout: JSON.stringify({ machines: [{ name: 'peer', state: 'connected' }] }) };
      }
      assert.equal(args[0], 'exec'); peerVisited = true;
      const receipt = read(p.result);
      assert.equal(receipt.complete, false); assert.equal(receipt.token, token);
      assert.equal(receipt.results.find(value => value.machine === 'local').commit, deployedTarget);
      snapshot = inspect(advancing.home);
      assert.equal(snapshot.job.state, 'running'); assert.equal(snapshot.job.target, deployedTarget, 'same-run desktop attempt supersedes the bootstrap target while peer work runs');
      assert.equal(row(snapshot).title, `herdr-app-custom ${deployedTarget.slice(0, 7)}`, 'real recorder verifies desktop success before peers finish');
      assert.equal(row(snapshot).description, `Updating other machines to ${deployedTarget.slice(0, 7)}.`);
      assert.equal(customizationRowState(updateProjection(snapshot)).description, row(snapshot).description, 'replacement needs no remembered launch progress');
      assert.equal(row(snapshot).label, 'Updating…'); assert.equal(row(snapshot).enabled, false);
      atomic(p.result, { ...receipt, target: fetchedTarget });
      assert.equal(inspect(advancing.home).job.target, deployedTarget, 'actual local attempt wins over a preliminary source target');
      for (const foreign of [
        { ...receipt, token: 'other-run' },
        { ...receipt, at: snapshot.job.started - 1 },
        { ...receipt, target: null, results: [] },
        { ...receipt, target: 'malformed', results: [] },
        { ...receipt, target: [deployedTarget], results: [] },
        { ...receipt, target: null, results: [{ machine: 'local', commit: 'malformed' }] },
        { ...receipt, target: null, results: [{ machine: 'local', commit: [deployedTarget] }] },
      ]) {
        atomic(p.result, foreign);
        assert.equal(inspect(advancing.home).job.target, fetchedTarget, 'foreign, old, carried desktop-only and malformed evidence cannot set the run target');
      }
      atomic(p.result, receipt);
      const output = 'HERDR_DEPLOY_ALL_RESULT=' + JSON.stringify({ action: 'already current', commit: deployedTarget });
      return { code: 0, stdout: JSON.stringify({ code: 0, stdout: Buffer.from(output).toString('base64') }) };
    } });
    assert.equal(deployed.code, 0); assert.equal(peerVisited, true); assert.equal(desktopVisited, true);
    child.emit('exit', 0);
    const completed = await active;
    assert.equal(completed.state, 'complete'); assert.equal(completed.target, deployedTarget);
    assert.equal(inspect(advancing.home).revision, deployedTarget);
    assert.equal(read(p.status).target, deployedTarget, 'final durable receipt preserves the actual deployment target');
    const reconciled = worker.checkMain(advancing.home, { force: true, run: () => ({ code: 0, stdout: `${deployedTarget}\trefs/heads/main\n` }) });
    assert.equal(row(reconciled).title, `herdr-app-custom ${deployedTarget.slice(0, 7)}`);
    assert.match(row(reconciled).description, /^Up to date\. Checked at/);
    assert.equal(row(reconciled).label, 'Check now'); assert.equal(row(reconciled).enabled, true);
  }
  // Terminal failures use the actual recorder's provenance policy, not targets
  // fabricated as installed revisions: refusal retains prior evidence, a failed
  // installer invalidates it, and peer failure retains desktop success.
  for (const phase of ['before-install', 'desktop-failed', 'peer-failed']) {
    const failed = setup(), p = files(failed.home);
    atomic(p.manifest, { version: 2, id: 'custom', files: {} });
    const installed = git(failed.root, 'rev-parse', 'HEAD'), target = failed.advance();
    resultRecorder(failed.env)([{ machine: 'local', action: 'deployed', commit: installed }], true);
    const { token } = pending(failed);
    const record = resultRecorder({ ...failed.env, HERDR_UPDATE_RUN_ID: token });
    record([], false, null, null, target);
    if (phase !== 'before-install') record([
      { machine: 'local', action: phase === 'desktop-failed' ? 'failed' : 'deployed', commit: target, reason: 'fixture install failure' },
      ...(phase === 'peer-failed' ? [{ machine: 'peer', action: 'failed', reason: 'fixture peer failure' }] : []),
    ], true);
    const status = { ...read(p.status), target, state: phase === 'peer-failed' ? 'partial' : 'failed', error: 'fixture failure', finished: Date.now() };
    atomic(p.status, status); fs.unlinkSync(p.lock);
    const snapshot = worker.checkMain(failed.home, { force: true, run: () => ({ code: 0, stdout: `${target}\trefs/heads/main\n` }) });
    const row = customizationRowState(updateProjection(snapshot));
    const revision = phase === 'before-install' ? installed : phase === 'peer-failed' ? target : null;
    assert.equal(row.title, revision ? `herdr-app-custom ${revision.slice(0, 7)}` : 'herdr-app-custom', phase);
    assert.match(row.description, phase === 'peer-failed' ? /^Desktop updated; some machines skipped or failed\./ : /^Update failed:/, phase);
    assert.doesNotMatch(row.description, /Updating/);
    assert.notEqual(row.label, 'Updating…');
  }
  for (const kind of ['success', 'partial', 'local-failure', 'installer-timeout', 'missing', 'wrong-token', 'spawn-error', 'timeout']) {
    const h = setup(), { p, token } = pending(h); let killed = false;
    const spawn = (program, args, options) => {
      assert.equal(program, process.execPath); assert.deepEqual(args, [path.join(h.root, 'tools/deploy-all.mjs')]);
      assert.equal(options.cwd, h.root); assert.equal(options.env.HERDR_APP_HOME, path.resolve(h.home)); assert.equal(options.env.HERDR_UPDATE_RUN_ID, token);
      assert.equal(options.detached, true);
      const child = new EventEmitter(); child.pid = 123456789;
      setImmediate(() => {
        if (kind === 'timeout') return;
        if (kind === 'spawn-error') return child.emit('error', Error('fixture spawn failure'));
        if (!['missing', 'wrong-token'].includes(kind)) final(p, token, kind === 'partial' ? [{ machine: 'local', action: 'deployed' }, { machine: 'off', action: 'skipped', reason: 'offline' }] : kind === 'local-failure' ? [{ machine: 'local', action: 'failed', reason: 'fixture install failure' }] : undefined);
        if (kind === 'installer-timeout') {
          const local = deployWorker.deployCheckout(h.root, 'a'.repeat(40), 'deploy', {
            platform: 'win32', log() {}, run(program, args, options) {
              assert.equal(program, 'cmd.exe'); assert.equal(options.timeout, 480000);
              return { code: null, timedOut: true, stdout: '', stderr: 'fixture npm timeout' };
            },
          });
          assert.equal(local.outcome, 'unknown'); final(p, token, [{ machine: 'local', ...local }]);
        }
        if (kind === 'wrong-token') final(p, 'other-run');
        child.emit('exit', ['local-failure', 'partial', 'installer-timeout'].includes(kind) ? 1 : 0);
      });
      return child;
    };
    const result = await runUpdate(h.home, token, { userHome: h.userHome, run: h.run, spawn, deadlineMs: kind === 'timeout' ? 1000 : 30000, kill: () => { killed = true; } });
    assert.equal(result.state, kind === 'success' ? 'complete' : kind === 'partial' ? 'partial' : ['missing', 'wrong-token', 'timeout', 'installer-timeout'].includes(kind) ? 'unknown' : 'failed', kind);
    assert.equal(fs.existsSync(p.lock), result.state === 'unknown', kind);
    assert.equal(killed, kind === 'timeout');
    if (kind === 'installer-timeout') {
      const reloaded = inspect(h.home, { isAlive: () => false });
      assert.equal(reloaded.job.state, 'unknown'); assert.equal(reloaded.locked, true, 'completed CLI receipt does not resolve uncertain descendants');
      const checked = worker.checkMain(h.home, { force: true, run: () => ({ code: 0, stdout: `${'b'.repeat(40)}\trefs/heads/main\n` }) });
      assert.equal(checked.check.available, true);
      assert.equal(customizationRowState(updateProjection(checked)).action, 'check', 'fresh successful Check cannot re-enable Update');
      await launch(h.home, { spawn() { assert.fail('uncertain installer must not be replayed'); } });
      assert.equal(fs.existsSync(p.lock), true);
      // Simulate the documented human-only resolution after verifying no work is
      // active in this fixture; deleting only the lock is insufficient.
      fs.unlinkSync(p.lock);
      assert.equal(customizationRowState(updateProjection(inspect(h.home))).action, 'check');
      fs.unlinkSync(p.status);
      assert.equal(customizationRowState(updateProjection(inspect(h.home))).action, 'check', 'orphaned unknown result remains blocking');
      fs.renameSync(p.result, `${p.result}.resolved`);
      assert.equal(customizationRowState(updateProjection(worker.checkMain(h.home, { force: true, run: () => ({ code: 0, stdout: `${'b'.repeat(40)}\trefs/heads/main\n` }) }))).action, 'launch');
    }
    if (kind === 'missing') {
      // Reload sees the same unresolved job; a later exact result can settle it.
      assert.equal(inspect(h.home, { isAlive: () => false }).job.state, 'unknown');
      final(p, token); assert.equal(inspect(h.home, { isAlive: () => false }).job.state, 'complete'); assert.equal(fs.existsSync(p.lock), false);
    }
  }
  // An ordinary clean main clone can predate the result protocol. Only Git is
  // allowed to bootstrap it; the legacy loaded CLI must never run the deploy.
  const old = setup();
  const put = (name, text) => { const file = path.join(old.author, name); fs.mkdirSync(path.dirname(file), { recursive: true }); fs.writeFileSync(file, text); };
  put('package.json', JSON.stringify({ type: 'module', scripts: { deploy: 'node tools/fake-deploy.mjs' } }));
  put('tools/deploy-all.mjs', `import fs from 'node:fs'; import path from 'node:path'; import cp from 'node:child_process'; cp.execFileSync('git',['merge','--ff-only','origin/main']); fs.writeFileSync(path.join(process.env.HERDR_APP_HOME,'legacy-cli-ran'),'old loaded CLI ran');`);
  put('tools/fake-deploy.mjs', `import fs from 'node:fs'; import path from 'node:path'; const dir=path.join(process.env.HERDR_APP_HOME,'.customizations'); fs.mkdirSync(dir,{recursive:true}); fs.writeFileSync(path.join(dir,'manifest.json'),JSON.stringify({version:2,id:'custom',files:{}})); console.log(JSON.stringify({changed:1,removed:0,backup:'fixture-backup'}));`);
  git(old.author, 'add', '.'); git(old.author, 'commit', '-m', 'legacy CLI'); git(old.author, 'push'); git(old.root, 'pull', '--ff-only');
  const before = git(old.root, 'rev-parse', 'HEAD');
  for (const name of ['deploy-all.mjs', 'deploy-all-worker.cjs']) put(`tools/${name}`, fs.readFileSync(path.join(project, 'tools', name)));
  git(old.author, 'add', '.'); git(old.author, 'commit', '-m', 'published result protocol'); git(old.author, 'push');
  const target = git(old.author, 'rev-parse', 'HEAD');
  const preload = path.join(old.base, 'mock-hc.cjs');
  fs.writeFileSync(preload, `const cp=require('node:child_process'),real=cp.spawnSync; cp.spawnSync=(program,args,options)=>{if(program==='hc'){if(args.join(' ')==='machine ls --json')return {status:0,stdout:'{"machines":[]}',stderr:''};throw Error('No real remote transport permitted');}return real(program,args,options);};`);
  const launched = pending(old);
  const upgraded = await runUpdate(old.home, launched.token, {
    userHome: old.userHome,
    run(program, args, options) { return program === process.execPath ? worker.command(program, args, options) : old.run(program, args, options); },
    spawn(program, args, options) { return cp.spawn(program, ['--require', preload, ...args], { ...options, env: { ...options.env, GIT_CONFIG_GLOBAL: old.env.GIT_CONFIG_GLOBAL, GIT_CONFIG_NOSYSTEM: '1' } }); },
  });
  assert.notEqual(before, target); assert.equal(git(old.root, 'rev-parse', 'HEAD'), target);
  assert.equal(upgraded.state, 'complete', JSON.stringify(upgraded)); assert.equal(fs.existsSync(launched.p.lock), false);
  assert.equal(read(launched.p.result).token, launched.token); assert.equal(inspect(old.home).revision, target);
  assert.equal(fs.existsSync(path.join(old.home, 'legacy-cli-ran')), false, 'legacy CLI must not be loaded even for a protocol probe');
  const unsupported = setup(), unsupportedJob = pending(unsupported);
  const refused = await runUpdate(unsupported.home, unsupportedJob.token, { userHome: unsupported.userHome, run(program, args, options) { return program === process.execPath ? { code: 0, stdout: '{}' } : unsupported.run(program, args, options); }, spawn() { assert.fail('unsupported result protocol must not deploy'); } });
  assert.equal(refused.state, 'failed'); assert.match(refused.error, /result protocol unavailable/);
  const h = setup(), { p, token } = pending(h);
  let spawns = 0;
  await launch(h.home, { spawn() { spawns++; throw Error('must not duplicate'); } }); assert.equal(spawns, 0);
  atomic(p.status, { ...read(p.status), pid: 123456789, deadline: 1 });
  assert.equal(inspect(h.home, { isAlive: () => false }).job.state, 'unknown');
  assert.equal(fs.existsSync(p.lock), true, 'crash is not permission to remove a lock');
  fs.unlinkSync(p.lock); fs.unlinkSync(p.status);
  const failed = await launch(h.home, { spawn() { throw Error('fixture launcher failed'); } }); assert.equal(failed.job.state, 'failed'); assert.equal(failed.locked, false);
  const noAck = await launch(h.home, { spawn() { const child = new EventEmitter(); child.pid = 123456789; child.unref = () => {}; return child; }, sleep: async () => {} });
  assert.equal(noAck.job.state, 'unknown'); assert.equal(noAck.locked, true);
  assert.equal(outcome({ results: [{ machine: 'local', action: 'already current' }, { machine: '(inventory)', action: 'failed' }] }).state, 'partial');
  console.log('PASS: managed source safety, clone-on-Update, exact CLI routing, duplicate launch, bounded supervision and reload/late-result recovery (isolated fixtures).');
} finally { clean(); }
