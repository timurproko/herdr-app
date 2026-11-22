import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { deployAll, deployPeer, remoteArgs } from '../tools/deploy-all.mjs';
import worker from '../tools/deploy-all-worker.cjs';
import { shellPaths } from '../tools/deploy.mjs';
import { project, fixture, git, clean } from './support/deploy-all.mjs';
const require = createRequire(import.meta.url);
function peer(f) {
  const home = path.join(f.base, 'remote home'), root = path.join(home, '.local/share/herdr-app');
  fs.mkdirSync(path.dirname(root), { recursive: true }); git(f.base, 'clone', f.origin, root);
  // A canonical origin with a fixture-local rewrite: no production network access.
  git(root, 'remote', 'set-url', 'origin', 'https://github.com/timurproko/herdr-app.git');
  git(root, 'config', `url.${f.origin}.insteadOf`, 'https://github.com/timurproko/herdr-app.git');
  return { home, root, run: f.run, env: f.env, log() {} };
}
function execute(args, p, nodeVersion = process.versions.node) {
  const lines = [];
  const context = {
    Buffer, module: { exports: {} }, console: { log: line => lines.push(line) },
    process: { platform: process.platform, versions: { node: nodeVersion }, env: p.env },
    require(name) {
      if (name === 'node:os') return { homedir: () => p.home };
      if (name === 'node:child_process') return { spawnSync(command, argv, options) {
        const r = p.run(command, argv, options);
        return { status: r.code, stdout: r.stdout, stderr: r.stderr, error: r.error ? { code: r.error } : undefined };
      } };
      return require(name);
    },
  };
  vm.runInNewContext(args.at(-1), context, { timeout: 30000 });
  return lines.join('\n') + '\n';
}
try {
  assert.deepEqual(worker.SHELL_PATHS, shellPaths);
  const f = fixture(), p = peer(f), next = f.advance();
  let r = worker.runRemote({}, p);
  assert.equal(r.action, 'deployed'); assert.equal(r.commit, next); assert.equal(git(p.root, 'rev-parse', 'HEAD'), next);
  const npm = f.calls.find(c => c.args.includes('deploy:shell') || c.args.includes('npm run deploy:shell'));
  assert.ok(npm); assert.equal(npm.cwd, p.root); assert.equal(npm.env.HERDR_APP_HOME, path.join(p.home, '.config/herdr-app'));
  assert.equal(npm.timeout, 480000);
  assert.ok(f.calls.some(c => c.args.includes('fetch') && c.timeout === 60000 && c.env.GIT_TERMINAL_PROMPT === '0'));
  for (const kind of ['absent', 'dirty', 'untracked', 'branch', 'ahead', 'diverged', 'origin', 'git', 'npm', 'manifest', 'unknown', 'desktop', 'layout', 'fetch']) {
    const f = fixture(), p = peer(f), target = path.join(p.home, '.config/herdr-app/.customizations/manifest.json');
    if (kind === 'absent') fs.renameSync(p.root, p.root + '-aside');
    if (kind === 'dirty') fs.appendFileSync(path.join(p.root, 'source.txt'), 'personal');
    if (kind === 'untracked') fs.writeFileSync(path.join(p.root, 'personal'), 'keep');
    if (kind === 'branch') git(p.root, 'checkout', '-b', 'feature/work');
    if (['ahead','diverged'].includes(kind)) {
      fs.writeFileSync(path.join(p.root, 'personal'), 'keep'); git(p.root, 'add', '.'); git(p.root, 'commit', '-m', 'local');
      if (kind === 'diverged') f.advance();
    }
    if (kind === 'origin') git(p.root, 'remote', 'set-url', 'origin', 'https://invalid.example/other.git');
    if (['manifest','unknown','desktop','layout'].includes(kind)) {
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, kind === 'manifest' ? 'bad json' : JSON.stringify({ version: kind === 'unknown' ? 8 : 2, id: 'custom', files: kind === 'desktop' ? {'mods/custom-tabs/main.js':'hash'} : {}, ...(kind === 'layout' ? {layoutBase:{}} : {}) }));
    }
    const original = p.run;
    if (kind === 'git') p.run = (c,a,o) => c === 'git' ? {code:null,missing:true} : original(c,a,o);
    if (kind === 'npm') p.run = (c,a,o) => c !== 'git' ? {code:1} : original(c,a,o);
    if (kind === 'fetch') p.run = (c,a,o) => a.includes('fetch') ? {code:1} : original(c,a,o);
    const r = worker.runRemote({}, p);
    assert.equal(r.action, kind === 'fetch' ? 'failed' : 'skipped', kind); assert.ok(r.reason, kind);
    if (['desktop','layout'].includes(kind)) { assert.equal(r.reason, 'needs its own full deploy'); assert.ok(!f.calls.some(c => c.args.includes('fetch'))); }
    assert.ok(!f.calls.some(c => c.args.includes('deploy:shell') || c.args.includes('npm run deploy:shell')), kind);
  }
  const a = remoteArgs('peer');
  assert.deepEqual(a.slice(0,9), ['exec','--on','peer','--timeout','600','--json','--','node','-e']);
  assert.ok(a.at(-1).startsWith("eval(Buffer.from('")); assert.ok(a.join(' ').length < 30000, 'Windows command line bound');
  assert.match(execute(a, p, '12.0.0'), /Node 20\+ is required/);
  const transport = (c,args,o) => {
    assert.equal(c, 'hc'); assert.equal(o.timeout, 615000);
    return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(execute(args,p)).toString('base64'),stderr:''})};
  };
  r = deployPeer({name:'peer',state:'connected'}, {run:transport,env:f.env,log(){}});
  assert.equal(r.action, 'deployed'); assert.equal(r.commit, next); assert.equal(r.backup, '123-45');
  r = deployPeer({name:'off',state:'disconnected'}, {run(){throw Error('must not execute');}}); assert.equal(r.action,'skipped'); assert.match(r.reason,/offline/);
  for (const response of [
    {code:0,stdout:JSON.stringify({error:{kind:'spawn_failed'}})},
    {code:1,stdout:JSON.stringify({timed_out:true,stdout:'',stderr:''})},
    {code:null,stdout:'',timedOut:true},
    {code:1,stdout:JSON.stringify({error:{kind:'transport_error'}})},
  ]) {
    r = deployPeer({name:'peer',state:'connected'}, {run:()=>response,log(){}});
    assert.equal(r.action, response.stdout.includes('spawn_failed') ? 'skipped' : 'failed');
  }
  // A failed local install and first peer cannot prevent a subsequent peer attempt.
  const g = fixture(), calls = [], original = g.run;
  g.run = (c,a,o) => {
    if (c !== 'git' && c !== 'hc') return {code:1,stdout:'',stderr:'fixture local failure'};
    if (c !== 'hc') return original(c,a,o);
    if (a[0] === 'machine') { assert.deepEqual(a,['machine','ls','--json']); assert.equal(o.timeout,15000); return {code:0,stdout:JSON.stringify({machines:[{name:'bad',state:'connected'},{name:'good',state:'connected'},{name:'off',state:'offline'}]})}; }
    calls.push(a[2]);
    if (a[2] === 'bad') return {code:1,stdout:JSON.stringify({timed_out:true})};
    return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from('HERDR_DEPLOY_ALL_RESULT='+JSON.stringify({action:'already current',commit:'abc'})).toString('base64')})};
  };
  r = deployAll([],g); assert.equal(r.code,1); assert.deepEqual(calls,['bad','good']);
  assert.deepEqual(r.results.map(r=>r.action), ['failed','failed','already current','skipped']);
  assert.ok(!g.calls.some(c=>c.command==='hc'), 'only mocked hc handles peers');
  const docs = fs.readFileSync(path.join(project,'docs/COMMANDS.md'),'utf8');
  for (const text of ['hc machine ls --json','hc exec --on','needs its own full deploy']) assert.ok(docs.includes(text));
  console.log('PASS: deploy-all existing peer checkout/eligibility, exact transport, default home, deadlines, old Node and independent failures (no real hc).');
} finally { clean(); }
