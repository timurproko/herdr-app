import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { EventEmitter } from 'node:events';
import cp from 'node:child_process';
import { createRequire } from 'node:module';
import { fixture, clean, git, project } from './support/deploy-all.mjs';
const require = createRequire(import.meta.url);
const worker = require('../src/services/updates/update-worker.cjs');
const deployWorker = require('../tools/deploy-all-worker.cjs');
const { customizationRowState, updateProjection } = await import('../src/shared/customization-update-model.js');
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
