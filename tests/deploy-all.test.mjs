import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deployAll } from '../tools/deploy-all.mjs';
import worker from '../tools/deploy-all-worker.cjs';
import { project, fixture, git, clean } from './support/deploy-all.mjs';
try {
  for (const url of ['https://github.com/timurproko/herdr-app.git', 'git@github.com:timurproko/herdr-app.git', 'git@github-timurproko:timurproko/herdr-app.git', 'ssh://git@github.com/timurproko/herdr-app.git']) assert.ok(worker.repositoryOrigin(url), url);
  for (const url of ['https://github.com/other/herdr-app.git', 'https://evil.invalid/timurproko/herdr-app.git', '/local/path', 'git@github.com:other/herdr-app.git']) assert.ok(!worker.repositoryOrigin(url), url);
  for (const kind of ['dirty', 'untracked', 'branch', 'detached', 'ahead', 'diverged', 'origin', 'fetch']) {
    const f = fixture(), before = git(f.root, 'rev-parse', 'HEAD');
    if (kind === 'dirty') fs.appendFileSync(path.join(f.root, 'source.txt'), 'personal');
    if (kind === 'untracked') fs.writeFileSync(path.join(f.root, 'personal.txt'), 'keep');
    if (kind === 'branch') git(f.root, 'checkout', '-b', 'feature/work');
    if (kind === 'detached') git(f.root, 'checkout', '--detach');
    if (['ahead', 'diverged'].includes(kind)) {
      fs.writeFileSync(path.join(f.root, 'personal.txt'), 'keep'); git(f.root, 'add', '.'); git(f.root, 'commit', '-m', 'local');
      if (kind === 'diverged') f.advance();
    }
    const head = git(f.root, 'rev-parse', 'HEAD'), status = git(f.root, 'status', '--porcelain');
    if (kind === 'origin') f.originMatches = () => false;
    if (kind === 'fetch') { const run = f.run; f.run = (c,a,o) => a.includes('fetch') ? { code: 1 } : run(c,a,o); }
    const messages = []; f.log = line => messages.push(line);
    const r = deployAll([], f);
    assert.equal(r.code, 1, kind); assert.match(messages.join('\n'), /nothing deployed anywhere/);
    assert.ok(f.calls.every(c => c.command === 'git'), kind);
    assert.equal(git(f.root, 'rev-parse', 'HEAD'), head);
    assert.equal(git(f.root, 'status', '--porcelain'), status);
    assert.ok(before);
  }
  const f = fixture(), next = f.advance();
  let r = deployAll([], f); assert.equal(r.code, 0); assert.equal(git(f.root, 'rev-parse', 'HEAD'), next);
  assert.equal(r.results[0].commit, next); assert.equal(r.results[0].backup, '123-45');
  const npm = f.calls.find(c => c.command !== 'git'); assert.equal(npm.cwd, f.root); assert.equal(npm.env.HERDR_APP_HOME, f.env.HERDR_APP_HOME);
  assert.deepEqual([npm.command,npm.args], worker.npmCommand('deploy'));
  f.calls.length = 0; r = deployAll([], f); assert.equal(r.code, 0);
  assert.ok(f.calls.some(c => c.command !== 'git'), 'equal HEAD still invokes installer');
  assert.deepEqual(worker.npmCommand('deploy:shell', 'win32'), ['cmd.exe', ['/d', '/s', '/c', 'npm run deploy:shell']]);
  assert.deepEqual(worker.npmCommand('deploy:shell', 'linux'), ['npm', ['run', 'deploy:shell']]);
  const pkg = JSON.parse(fs.readFileSync(path.join(project, 'package.json')));
  assert.equal(pkg.scripts['deploy:all'], 'node tools/deploy-all.mjs');
  assert.equal(pkg.scripts.deploy, 'node tools/check-host-api.mjs && node tools/build.mjs && node tools/deploy.mjs deploy');
  const readme = fs.readFileSync(path.join(project, 'README.md'), 'utf8');
  assert.match(readme, /npm run deploy:all/); assert.match(readme, /clean main/); assert.match(readme, /never stashes, resets or switches branches/);
  console.log('PASS: deploy-all source refusal, fast-forward, exact full pipeline invocation and command docs (fixtures only).');
} finally { clean(); }
