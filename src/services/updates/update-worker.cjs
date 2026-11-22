// One-shot local operations. No terminal, daemon, scheduler or source-tree imports.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const REPOSITORY = 'https://github.com/timurproko/herdr-app.git';
const DEADLINE = 30 * 60 * 1000;
const HOUR = 60 * 60 * 1000;
const success = row => row && ['deployed', 'already current'].includes(row.action);
const read = file => { try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return null; } };
function files(home) {
  const dir = path.join(path.resolve(home), '.customizations');
  return Object.fromEntries(Object.entries({ dir: '', status: 'update-status.json', lock: 'update.lock', log: 'update.log', runner: 'update-runner.cjs', result: 'deploy-all-result.json', check: 'update-check.json', checkLock: 'update-check.lock', manifest: 'manifest.json' }).map(([key, name]) => [key, path.join(dir, name)]));
}
function atomic(file, value) {
  fs.mkdirSync(path.dirname(file), { recursive: true });
  const temp = `${file}.${randomUUID()}.tmp`;
  try { fs.writeFileSync(temp, typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n'); fs.renameSync(temp, file); }
  finally { if (fs.existsSync(temp)) fs.unlinkSync(temp); }
}
const shortError = error => String(error?.message || error || 'Update failed').replace(/[\x00-\x1f\x7f]/g, ' ').slice(0, 160);
function command(program, args, options = {}) {
  const value = cp.spawnSync(program, args, { encoding: 'utf8', windowsHide: true, timeout: 15000, maxBuffer: 8 * 1024 * 1024, ...options });
  return { code: value.status, stdout: value.stdout || '', stderr: value.stderr || '', error: value.error };
}
function alive(pid) {
  if (!Number.isInteger(pid) || pid < 1) return false;
  try { process.kill(pid, 0); return true; } catch (error) { return error.code !== 'ESRCH'; }
}
function unlock(p, token) {
  if (read(p.lock)?.token === token) fs.unlinkSync(p.lock);
}
function installedRevision(p, result) {
  const desktop = result?.desktop;
  if (!desktop?.verified || !/^[a-f0-9]{40,64}$/i.test(desktop.commit || '') || !desktop.manifest) return null;
  try {
    const bytes = fs.readFileSync(p.manifest), manifest = JSON.parse(bytes);
    if (manifest.version !== 2 || manifest.id !== 'custom' || !manifest.files) return null;
    return createHash('sha256').update(bytes).digest('hex') === desktop.manifest ? desktop.commit : null;
  } catch { return null; }
}
function outcome(result) {
  const local = result?.results?.find(row => row.machine === 'local');
  if (!success(local)) return { state: 'failed', error: shortError(result?.error || local?.reason || 'Desktop returned no successful result') };
  return { state: result.results.some(row => row.machine !== 'local' && !success(row)) ? 'partial' : 'complete', error: null };
}
function inspect(home, { now = Date.now, isAlive = alive } = {}) {
  const p = files(home), result = read(p.result);
  let job = read(p.status);
  // A lost supervisor may leave a complete CLI result. Never accept another run's
  // result or remove an uncertain lock just because a PID no longer exists.
  if (job && ['running', 'unknown'].includes(job.state) && !isAlive(job.pid) && !isAlive(job.childPid)
      && result?.complete === true && result.token === job.token) {
    job = { ...job, ...outcome(result), finished: now() };
    atomic(p.status, job); unlock(p, job.token);
  }
  if (job?.state === 'running' && (now() > job.deadline || (job.phase !== 'starting' && !isAlive(job.pid)) || (job.phase === 'starting' && now() - job.started > 5000))) job = { ...job, state: 'unknown' };
  const revision = installedRevision(p, result);
  let check = read(p.check);
  if (check?.target) check = { ...check, available: revision !== check.target && (!check.error || check.available === true) };
  return { job, result, check, checking: (read(p.checkLock)?.until || 0) > now(), revision, locked: fs.existsSync(p.lock), log: p.log };
}
function checkMain(home, { force = false, now = Date.now, run = command, env = process.env } = {}) {
  const p = files(home), snapshot = inspect(home, { now });
  if (snapshot.job?.state === 'running') return snapshot;
  const previous = snapshot.check || {};
  const afterUpdate = ['complete', 'partial'].includes(snapshot.job?.state) && (snapshot.job.finished || 0) > (previous.attempted || 0);
  if (!force && !afterUpdate && previous.attempted && now() - previous.attempted < HOUR) return snapshot;
  fs.mkdirSync(p.dir, { recursive: true });
  const held = read(p.checkLock);
  if (held && held.until < now() && read(p.checkLock)?.token === held.token) fs.unlinkSync(p.checkLock);
  let fd;
  try { fd = fs.openSync(p.checkLock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') return inspect(home, { now }); throw error; }
  const token = randomUUID(); fs.writeFileSync(fd, JSON.stringify({ token, until: now() + 20000 })); fs.closeSync(fd);
  const attempted = now();
  try {
    // Persist attempts before I/O: a failed request cannot create an hourly loop.
    atomic(p.check, { ...previous, attempted });
    const reply = run('git', ['ls-remote', '--', REPOSITORY, 'refs/heads/main'], { timeout: 15000, env: { ...env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } });
    const match = /^([a-f0-9]{40,64})\s+refs\/heads\/main\s*$/i.exec(reply.stdout.trim());
    if (reply.code !== 0 || !match) throw Error('Check failed. Try again.');
    atomic(p.check, { attempted, checked: now(), target: match[1], available: snapshot.revision !== match[1], error: null });
  } catch {
    atomic(p.check, { ...previous, attempted, error: 'Check failed. Try again.' });
  } finally { if (read(p.checkLock)?.token === token) fs.unlinkSync(p.checkLock); }
  return inspect(home, { now });
}
function noRedirect(file) {
  // Covers junctions as well as symlinks, including existing parent components.
  for (let part = path.resolve(file);; part = path.dirname(part)) {
    if (fs.existsSync(part) && fs.lstatSync(part).isSymbolicLink()) throw Error('Managed path is redirected; inspect it manually');
    if (path.dirname(part) === part) break;
  }
}
function prepareClone({ userHome = os.homedir(), run = command, env = process.env, log = () => {} } = {}) {
  const root = path.join(userHome, '.local/share/herdr-app');
  const gitEnv = { ...env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' };
  noRedirect(root);
  if (!fs.existsSync(root)) {
    fs.mkdirSync(path.dirname(root), { recursive: true });
    const clone = run('git', ['clone', '--branch', 'main', '--', REPOSITORY, root], { env: gitEnv, timeout: 120000 });
    log(clone.stdout); log(clone.stderr);
    if (clone.code !== 0) throw Error('Managed clone failed; inspect the log');
  }
  noRedirect(root);
  const dotGit = path.join(root, '.git');
  if (!fs.existsSync(dotGit) || fs.lstatSync(dotGit).isSymbolicLink() || !fs.lstatSync(dotGit).isDirectory()) throw Error('Managed source must be an ordinary clone, not a linked worktree');
  const git = args => {
    const result = run('git', ['-C', root, ...args], { env: gitEnv, timeout: args[0] === 'fetch' ? 60000 : 15000 });
    if (result.code !== 0) throw Error(`Managed source ${args[0]} failed`);
    return result.stdout.trim();
  };
  // Validate before executing ANY code from the checkout. deploy:all repeats the
  // authoritative gate and does the actual fast-forward, never this launcher.
  const top = git(['rev-parse', '--show-toplevel']);
  const same = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
  if (same(top) !== same(root)) throw Error('Managed path is not the repository root');
  if (git(['symbolic-ref', '--quiet', '--short', 'HEAD']) !== 'main') throw Error('Managed source is not on main');
  if (git(['status', '--porcelain', '--untracked-files=all'])) throw Error('Managed source is dirty');
  if (!/^(?:https:\/\/github\.com\/|git@github(?:\.com|-timurproko):|ssh:\/\/git@github(?:\.com|-timurproko)\/)(?:timurproko\/herdr-app)(?:\.git)?\/?$/i.test(git(['config', '--get', 'remote.origin.url']))) throw Error('Managed source origin is not this repository');
  git(['fetch', 'origin']);
  const target = git(['rev-parse', '--verify', 'origin/main^{commit}']);
  git(['merge-base', '--is-ancestor', 'HEAD', target]);
  return root;
}
function killTree(pid) {
  if (process.platform === 'win32') command('taskkill.exe', ['/pid', String(pid), '/t', '/f'], { timeout: 10000 });
  else try { process.kill(-pid, 'SIGKILL'); } catch { /* already exited */ }
}
async function runUpdate(home, token, { userHome, run = command, spawn = cp.spawn, now = Date.now, kill = killTree, deadlineMs = DEADLINE } = {}) {
  const p = files(home);
  let job = read(p.status);
  if (job?.token !== token || read(p.lock)?.token !== token || job.state !== 'running') throw Error('Update launch identity changed');
  job = { ...job, pid: process.pid, phase: 'preparing', deadline: job.started + deadlineMs };
  atomic(p.status, job);
  const log = text => { if (text) fs.appendFileSync(p.log, text.endsWith('\n') ? text : text + '\n'); };
  const finish = (state, error, release = true) => {
    job = { ...job, state, error: error ? shortError(error) : null, finished: now() };
    atomic(p.status, job);
    if (release) unlock(p, token);
    return job;
  };
  try {
    const root = prepareClone({ userHome, run, log });
    if (now() >= job.deadline) return finish('unknown', 'Update deadline exceeded', false);
    job = { ...job, phase: 'deploying' }; atomic(p.status, job);
    // CLI already owns the result writer, full pipeline and peer eligibility.
    return await new Promise(resolve => {
      let child, timer, settled = false;
      const done = (state, error, release = true) => {
        if (settled) return; settled = true; clearTimeout(timer);
        resolve(finish(state, error, release));
      };
      const fd = fs.openSync(p.log, 'a');
      try {
        child = spawn(process.execPath, [path.join(root, 'tools/deploy-all.mjs')], {
          cwd: root, env: { ...process.env, HERDR_APP_HOME: path.resolve(home), HERDR_UPDATE_RUN_ID: token },
          detached: true, windowsHide: true, stdio: ['ignore', fd, fd],
        });
      } catch (error) { done('failed', error); }
      finally { fs.closeSync(fd); }
      if (!child || settled) return;
      job = { ...job, childPid: child.pid }; atomic(p.status, job);
      child.once('error', error => done('failed', error));
      child.once('exit', code => {
        const result = read(p.result);
        if (result?.token !== token || result.complete !== true) return done('unknown', 'No final deployment result; inspect log', false);
        const final = outcome(result);
        if (code !== 0 && final.state === 'complete') return done('unknown', 'Deployment exit disagrees with result; inspect log', false);
        done(final.state, final.error);
      });
      timer = setTimeout(() => {
        log('Update deadline exceeded; dispatched remote outcomes may be unknown. No automatic retry.');
        kill(child.pid); done('unknown', 'Update deadline exceeded; inspect log', false);
      }, Math.max(1, job.deadline - now()));
    });
  } catch (error) { log(shortError(error)); return finish('failed', error); }
}
async function launch(home, { spawn = cp.spawn, source = fs.readFileSync(__filename, 'utf8'), now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const p = files(home);
  fs.mkdirSync(p.dir, { recursive: true });
  let fd;
  try { fd = fs.openSync(p.lock, 'wx'); }
  catch (error) { if (error.code === 'EEXIST') return inspect(home); throw error; }
  const token = randomUUID();
  fs.writeFileSync(fd, JSON.stringify({ token })); fs.closeSync(fd);
  let job = { token, state: 'running', phase: 'starting', started: now(), deadline: now() + DEADLINE, log: p.log };
  let dispatched = false;
  try {
    atomic(p.runner, source); fs.writeFileSync(p.log, 'Starting customization update.\n'); atomic(p.status, job);
    const logFd = fs.openSync(p.log, 'a');
    let child, failure;
    try { child = spawn(process.execPath, [p.runner, '--run', path.resolve(home), token], { detached: true, windowsHide: true, stdio: ['ignore', logFd, logFd] }); }
    finally { fs.closeSync(logFd); }
    child.once('error', error => { failure = error; });
    child.unref();
    // The runner alone writes its acknowledgement; a parent write here could
    // race it and erase an already completed phase/result.
    job.pid = child.pid; dispatched = Number.isInteger(child.pid);
    for (let i = 0; i < 30; i++) {
      await sleep(100);
      if (failure) throw failure;
      const current = read(p.status);
      if (current?.token === token && current.phase !== 'starting') return inspect(home);
    }
    // Child may still start: do not release the lock or replay after a lost ack.
    atomic(p.status, { ...job, state: 'unknown', error: 'Startup acknowledgement missing; inspect log' });
    return inspect(home);
  } catch (error) {
    atomic(p.status, { ...job, state: dispatched ? 'unknown' : 'failed', error: shortError(error), finished: now() });
    if (!dispatched) unlock(p, token);
    return inspect(home);
  }
}
module.exports = { REPOSITORY, DEADLINE, HOUR, files, read, atomic, command, installedRevision, inspect, checkMain, prepareClone, outcome, launch, runUpdate };
if (require.main === module) {
  if (process.argv[2] === '--run') runUpdate(process.argv[3], process.argv[4]).catch(error => { console.error(shortError(error)); process.exitCode = 1; });
  else {
    Promise.resolve().then(() => {
      const request = JSON.parse(process.argv[2]);
      if (!request.home || !path.isAbsolute(request.home)) throw Error('An absolute Herdr home is required');
      if (request.action === 'launch') return launch(request.home);
      if (request.action === 'status') return inspect(request.home);
      if (request.action === 'check') return checkMain(request.home, { force: request.force === true });
      throw Error('Unknown update action');
    }).then(value => console.log(JSON.stringify(value))).catch(error => { console.log(JSON.stringify({ error: shortError(error) })); process.exitCode = 1; });
  }
}
