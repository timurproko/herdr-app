// One-shot local operations. No terminal, daemon, scheduler or source-tree imports.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const { createHash, randomUUID } = require('node:crypto');
const REPOSITORY = 'https://github.com/timurproko/herdr-app.git';
const DEADLINE = 30 * 60 * 1000;
const SETTLE = 5000, TERMINAL = 'HERDR_UPDATE_COMPLETION=';
const CHECK_MIN = 120000, CHECK_MAX = 180000, RETRY_MAX = 1800000;
const INVALIDATE_MIN = 15000, BUSY_CHECK_RETRY = 30000;
const failures = check => Number.isInteger(check?.failures) ? Math.max(0, Math.min(4, check.failures)) : check?.error ? 1 : 0;
function nextAttempt(check, now) {
  if (!Number.isFinite(check?.attempted) || check.attempted > now || check.attempted < 1) return now;
  const max = check.error ? RETRY_MAX : CHECK_MAX;
  const next = check.nextAttempt;
  return Number.isFinite(next) && next >= check.attempted && next <= check.attempted + max
    ? next : check.attempted + (check.error ? 300000 : CHECK_MIN);
}
function checkDelay(count, random) {
  const jitter = Math.max(0, Math.min(1, Number(random()) || 0));
  return count ? Math.min(RETRY_MAX, Math.round(Math.min(RETRY_MAX, 300000 * 2 ** (count - 1)) * (0.9 + jitter * 0.2)))
    : Math.round(CHECK_MIN + jitter * (CHECK_MAX - CHECK_MIN));
}
const success = row => row && ['deployed', 'already current'].includes(row.action);
// Kept identical to the UI model's policy; this runner must remain self-contained.
const peerSkipKind = row => row?.action !== 'skipped' || row.outcome === 'unknown' ? null
  : /^offline \((?:offline|unreachable|disconnected)\)$/.test(row.reason) ? 'offline'
  : row.reason === 'needs its own full deploy' ? 'desktop' : null;
function deferredPeers(result) {
  const saved = Array.isArray(result?.deferredPeers) ? result.deferredPeers
    : (Array.isArray(result?.results) ? result.results : []).filter(row => peerSkipKind(row) === 'offline').map(row => row.machine);
  return [...new Set(saved.filter(name => typeof name === 'string' && name !== 'local' && !name.startsWith('(') && name.length <= 200 && name.trim() === name && name.length > 0 && !/[\x00-\x1f\x7f]/.test(name)).slice(0, 256))];
}
const sharing = error => ['EPERM', 'EBUSY', 'EACCES'].includes(error?.code);
const pause = ms => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
function retryIO(operation, { budget = 3000, sleep = pause } = {}) {
  // Bounded attempt count even with a clock jump; only one-shot Node workers.
  let waited = 0, delay = 25;
  for (;;) {
    try { return operation(); }
    catch (error) {
      if (!sharing(error) || waited >= budget) throw error;
      const wait = Math.min(delay, budget - waited);
      sleep(wait); waited += wait; delay = Math.min(200, delay * 2);
    }
  }
}
function read(file, options = {}) {
  const io = options.io || fs;
  try {
    return retryIO(() => {
      const text = io.readFileSync(file, 'utf8'); // closed before parsing
      try { return JSON.parse(text); }
      catch (error) { error.code = 'EBUSY'; throw error; }
    }, { budget: 150, ...options });
  } catch (error) {
    if (error.code === 'ENOENT') return null;
    throw error; // unreadable is not absent, particularly for locks/status
  }
}
function acquire(file, value, options = {}) {
  const io = options.io || fs;
  const fd = retryIO(() => io.openSync(file, 'wx'), options);
  try { retryIO(() => io.writeFileSync(fd, JSON.stringify(value)), options); }
  finally { io.closeSync(fd); }
}
const remove = file => retryIO(() => fs.unlinkSync(file));
function files(home) {
  const dir = path.join(path.resolve(home), '.customizations');
  return Object.fromEntries(Object.entries({ dir: '', status: 'update-status.json', lock: 'update.lock', log: 'update.log', runner: 'update-runner.cjs', result: 'deploy-all-result.json', check: 'update-check.json', checkLock: 'update-check.lock', manifest: 'manifest.json' }).map(([key, name]) => [key, path.join(dir, name)]));
}
function atomic(file, value, options = {}) {
  const io = options.io || fs, policy = { ...options, budget: options.budget ?? 2500 };
  retryIO(() => io.mkdirSync(path.dirname(file), { recursive: true }), policy);
  const temp = `${file}.${randomUUID()}.tmp`;
  const text = typeof value === 'string' ? value : JSON.stringify(value, null, 2) + '\n';
  retryIO(() => io.writeFileSync(temp, text), policy);
  try { retryIO(() => io.renameSync(temp, file), policy); }
  catch (error) {
    if (!sharing(error)) throw error;
    try { retryIO(() => io.writeFileSync(file, text), { ...options, budget: 500 }); }
    catch (fallback) {
      // Only receipts have a recovery reader. Other publication fails closed.
      if (value?.complete === true) return { recovery: temp };
      throw fallback;
    }
  }
  try { if (io.existsSync(temp)) retryIO(() => io.unlinkSync(temp), { ...options, budget: 100 }); } catch {}
  return { recovery: null };
}
function readResult(p, job, options = {}) {
  for (const dir of [p.dir, path.dirname(p.dir)]) {
    if (fs.existsSync(dir) && fs.lstatSync(dir).isSymbolicLink()) throw Error('Update state path is redirected; inspect it manually');
  }
  let primary, unreadable;
  try { primary = read(p.result, options); } catch (error) { unreadable = error; }
  const token = job?.token || primary?.token, runId = primary?.runId;
  if (primary?.complete === true) return primary;
  if (!token && !runId) { if (unreadable) throw unreadable; return primary; }
  const prefix = path.basename(p.result) + '.', candidates = [];
  if (!fs.existsSync(p.dir)) return primary;
  for (const name of fs.readdirSync(p.dir).filter(name => name.startsWith(prefix) && /^[a-f0-9-]{36}\.tmp$/.test(name.slice(prefix.length))).slice(0, 64)) {
    const file = path.join(p.dir, name), stat = fs.lstatSync(file);
    if (!stat.isFile() || stat.isSymbolicLink() || stat.size > 1024 * 1024) continue;
    let candidate; try { candidate = read(file, options); } catch { continue; }
    if (candidate?.version !== 1 || candidate.complete !== true || !Array.isArray(candidate.results)
        || !Number.isFinite(candidate.at) || candidate.at < (job?.started || primary?.at || 0)
        || (token ? candidate.token !== token : candidate.runId !== runId)
        || (runId && candidate.runId !== runId)) continue;
    candidates.push(candidate);
  }
  if (candidates.length) return candidates.sort((a, b) => b.at - a.at)[0];
  if (unreadable) throw unreadable;
  return primary;
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
  if (read(p.lock)?.token === token) remove(p.lock);
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
  if (local?.outcome === 'unknown' || /\boutcome unknown\b/i.test(local?.reason || '')) return { state: 'unknown', error: shortError(local.reason || 'Desktop deployment outcome unknown') };
  if (!success(local)) return { state: 'failed', error: shortError(result?.error || local?.reason || 'Desktop returned no successful result') };
  return { state: result.results.some(row => row.machine !== 'local' && !success(row) && !peerSkipKind(row)) ? 'partial' : 'complete', error: null };
}
function deploymentTarget(job, result) {
  // Carried desktop provenance can belong to an earlier run. Prefer this run's
  // local attempt, or its fetched source while inventory/install is still busy.
  if (!job?.token || result?.token !== job.token || !Number.isFinite(result.at) || result.at < job.started) return null;
  const local = result.results?.find(row => row.machine === 'local');
  return [local?.commit, result.target].find(value => typeof value === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(value)) || null;
}
function summaryLines(results) {
  const cell = value => String(value || '-').replace(/[\r\n\t\x00-\x1f\x7f|]/g, ' ').slice(0, 250);
  return ['Machine | Action | Source commit | Backup', ...results.map(row => {
    const qualifier = row.action === 'failed' ? ' (attempted)' : row.action === 'would deploy' ? ' (target)' : row.action === 'skipped' ? ' (checkout only)' : '';
    return [row.machine, row.action + (row.reason ? ': ' + row.reason : ''), row.commit ? row.commit + qualifier : '-', row.backup || '-'].map(cell).join(' | ');
  })];
}
function settled(p, job, now) {
  const times = [job.started, job.finished || 0];
  for (const file of [p.log, p.result, p.status]) {
    try { times.push(fs.statSync(file).mtimeMs); } catch (error) { if (error.code !== 'ENOENT') return false; }
  }
  return now >= Math.max(...times) + SETTLE || (Number.isFinite(job.deadline) && now >= job.deadline);
}
function terminalEvidence(p, job, result) {
  if (!job?.token || !Number.isFinite(job.started)) return null;
  let text;
  try {
    // No stream or persistent descriptor. Refuse oversized/truncated logs rather
    // than accidentally treating an earlier machine's success as final.
    if (fs.statSync(p.log).size > 1024 * 1024) return null;
    text = retryIO(() => fs.readFileSync(p.log, 'utf8'), { budget: 150 });
  } catch { return null; }
  const lines = text.trimEnd().split(/\r?\n/), marker = lines.findLast(line => line.startsWith(TERMINAL));
  if (marker) {
    try {
      const value = JSON.parse(marker.slice(TERMINAL.length));
      if (value.version === 1 && value.token === job.token && value.complete === true && value.at >= job.started && Array.isArray(value.results)) return value;
    } catch {}
    return null;
  }
  // Older CLIs print their complete summary immediately before the failed final
  // rename. It must match *every* intermediate row and the exact result path.
  if (result?.token !== job.token || result.complete !== false || result.at < job.started || !Array.isArray(result.results) || !result.results.length) return null;
  const summary = summaryLines(result.results), index = lines.lastIndexOf(summary[0]);
  const tail = lines.slice(index + summary.length);
  const failure = tail.join('\n').replaceAll('\\', '/').toLowerCase();
  const destination = failure.slice(failure.lastIndexOf('->') + 2).trim().replace(/^['"]|['"]$/g, '');
  if (index < 0 || tail.length !== 1 || lines.slice(index, index + summary.length).join('\n') !== summary.join('\n')
      || !/\b(?:eperm|ebusy|eacces)\b/.test(failure) || !failure.includes('rename')
      || destination !== p.result.replaceAll('\\', '/').toLowerCase()) return null;
  return { ...result, complete: true };
}
function inspect(home, { now = Date.now, isAlive = alive } = {}) {
  const p = files(home);
  let job = read(p.status);
  let result = readResult(p, job);
  const dead = job && !isAlive(job.pid) && !isAlive(job.childPid);
  const ready = dead && settled(p, job, now());
  if (job && ['running', 'unknown'].includes(job.state) && ready && result?.complete !== true) {
    const recovered = terminalEvidence(p, job, result);
    if (recovered) {
      result = recovered;
      job = { ...job, receiptUnsaved: true };
    }
  }
  // A lost supervisor may leave a complete CLI result. Never accept another run's
  // result or remove an uncertain lock just because a PID no longer exists.
  if (job && ['running', 'unknown'].includes(job.state) && ready
      && result?.complete === true && result.token === job.token) {
    job = { ...job, ...outcome(result), finished: now() };
    atomic(p.status, job);
    if (job.state !== 'unknown') unlock(p, job.token);
  }
  if (job?.state === 'running' && (now() > job.deadline || (job.phase !== 'starting' && !isAlive(job.pid)) || (job.phase === 'starting' && now() - job.started > 5000))) job = { ...job, state: 'unknown' };
  // A later ordinary CLI run has no Settings launch token/log. Do not attach
  // its result to a stale completed Settings job or that job's unrelated log.
  if (job && !['running', 'unknown'].includes(job.state) && result?.complete && result.at >= job.started && result.token !== job.token) job = null;
  // Old completed Settings jobs may have called a benign skip partial. Only
  // their exact final receipt can refine that state; never resolve live/unknown work.
  if (job && ['complete', 'partial'].includes(job.state) && !fs.existsSync(p.lock)
      && result?.complete === true && result.token === job.token && result.at >= job.started) {
    job = { ...job, ...outcome(result) };
  }
  const target = deploymentTarget(job, result);
  if (target) job = { ...job, target };
  const details = job && fs.existsSync(p.log) ? { kind: 'log', path: p.log }
    : result && (!job || result.token === job.token) ? { kind: 'result', path: p.result } : null;
  // Plain CLI runs have no Settings job. Preserve their terminal outcome (and
  // an already-known local uncertainty even while peers are still finishing).
  const classified = result ? outcome(result) : null;
  const local = result?.results?.find(row => row.machine === 'local');
  const lastRun = result && local?.action !== 'skipped' && (result.complete === true || classified.state === 'unknown')
    ? { ...classified, source: result.token ? 'settings' : 'cli', finished: result.at || 0 } : null;
  const revision = installedRevision(p, result);
  let check = read(p.check);
  if (check) check = { ...check, nextAttempt: nextAttempt(check, now()) };
  if (check?.target) check = { ...check, available: revision !== check.target && (!check.error || check.available === true) };
  const peerPending = deferredPeers(result).length > 0;
  const peerUnknown = Boolean(result?.results?.some(row => row.machine !== 'local' && (row.outcome === 'unknown' || /\boutcome unknown\b/i.test(row.reason || ''))));
  return { job, lastRun, result, peerPending, peerUnknown, check, checking: (read(p.checkLock)?.until || 0) > now(), revision, locked: fs.existsSync(p.lock), details, log: details?.kind === 'log' ? details.path : '' };
}
function checkMain(home, { force = false, invalidate = false, now = Date.now, random = Math.random, run = command, env = process.env } = {}) {
  const p = files(home), snapshot = inspect(home, { now });
  if (snapshot.job?.state === 'running') return { ...snapshot, retryAfter:now() + BUSY_CHECK_RETRY };
  let previous = snapshot.check || {};
  const latest = snapshot.job || snapshot.lastRun;
  const afterUpdate = ['complete', 'partial'].includes(latest?.state) && (latest.finished || 0) > (previous.attempted || 0);
  // Automatic hints bypass healthy freshness, never failure backoff or the
  // cross-process rate floor. Explicit Check now preserves its force semantics.
  const cached = value => {
    if (force || afterUpdate) return null;
    const check = value.check || {}, age = now() - (check.attempted || 0);
    if (invalidate && !check.error) {
      return check.attempted && age >= 0 && age < INVALIDATE_MIN
        ? { ...value, retryAfter:check.attempted + INVALIDATE_MIN } : null;
    }
    return now() < nextAttempt(check, now()) ? value : null;
  };
  const reused = cached(snapshot); if (reused) return reused;
  fs.mkdirSync(p.dir, { recursive: true });
  const held = read(p.checkLock);
  if (held && held.until <= now() && read(p.checkLock)?.token === held.token) remove(p.checkLock);
  const token = randomUUID();
  try { acquire(p.checkLock, { token, until: now() + 20000 }); }
  catch (error) {
    if (error.code === 'EEXIST') return { ...inspect(home, { now }),
      ...(invalidate ? { retryAfter:Math.max(now() + 300, read(p.checkLock)?.until || now() + 20000) } : {}) };
    throw error;
  }
  const attempted = now();
  try {
    // Recheck after exclusive acquisition: another process can have completed
    // between our first snapshot and open. Do not lose a deferred merge hint.
    const fresh = { ...inspect(home, { now }), checking:false };
    if (fresh.job?.state === 'running') return { ...fresh, retryAfter:now() + BUSY_CHECK_RETRY };
    const reused = cached(fresh); if (reused) return reused;
    previous = fresh.check || {};
    // A killed transport also leaves a bounded retry deadline, not a hot loop.
    atomic(p.check, { ...previous, attempted, nextAttempt: attempted + CHECK_MIN });
    const reply = run('git', ['ls-remote', '--', REPOSITORY, 'refs/heads/main'], { timeout: 15000, env: { ...env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' } });
    const match = /^([a-f0-9]{40,64})\s+refs\/heads\/main\s*$/i.exec(reply.stdout.trim());
    if (reply.code !== 0 || !match) throw Error('Check failed. Try again.');
    atomic(p.check, { attempted, checked: now(), nextAttempt: attempted + checkDelay(0, random), failures: 0,
      target: match[1], available: snapshot.revision !== match[1], error: null });
  } catch {
    const count = Math.min(4, failures(previous) + 1);
    atomic(p.check, { ...previous, attempted, nextAttempt: attempted + checkDelay(count, random), failures: count, error: 'Check failed. Try again.' });
  } finally { if (read(p.checkLock)?.token === token) remove(p.checkLock); }
  return inspect(home, { now });
}
function noRedirect(file) {
  // Covers junctions as well as symlinks, including existing parent components.
  for (let part = path.resolve(file);; part = path.dirname(part)) {
    if (fs.existsSync(part) && fs.lstatSync(part).isSymbolicLink()) throw Error('Managed path is redirected; inspect it manually');
    if (path.dirname(part) === part) break;
  }
}
function prepareClone({ userHome = os.homedir(), run = command, env = process.env, log = () => {}, onTarget = () => {} } = {}) {
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
  // Validate before executing ANY code from the checkout. Bootstrap it first:
  // executing an old CLI before its own fast-forward keeps that old module loaded.
  const top = git(['rev-parse', '--show-toplevel']);
  const same = value => process.platform === 'win32' ? path.resolve(value).toLowerCase() : path.resolve(value);
  if (same(top) !== same(root)) throw Error('Managed path is not the repository root');
  if (git(['symbolic-ref', '--quiet', '--short', 'HEAD']) !== 'main') throw Error('Managed source is not on main');
  if (git(['status', '--porcelain', '--untracked-files=all'])) throw Error('Managed source is dirty');
  if (!/^(?:https:\/\/github\.com\/|git@github(?:\.com|-timurproko):|ssh:\/\/git@github(?:\.com|-timurproko)\/)(?:timurproko\/herdr-app)(?:\.git)?\/?$/i.test(git(['config', '--get', 'remote.origin.url']))) throw Error('Managed source origin is not this repository');
  git(['fetch', 'origin']);
  const target = git(['rev-parse', '--verify', 'origin/main^{commit}']);
  git(['merge-base', '--is-ancestor', 'HEAD', target]);
  onTarget(target);
  log(git(['merge', '--ff-only', target]));
  if (git(['symbolic-ref', '--quiet', '--short', 'HEAD']) !== 'main' || git(['status', '--porcelain', '--untracked-files=all'])) throw Error('Managed source changed during bootstrap');
  const probe = run(process.execPath, [path.join(root, 'tools/deploy-all.mjs'), '--protocol'], { cwd: root, env: gitEnv, timeout: 15000 });
  let protocol;
  try { protocol = JSON.parse(probe.stdout); } catch {}
  if (probe.code !== 0 || protocol?.resultProtocol !== 1) throw Error('Managed updater result protocol unavailable; nothing deployed');
  return root;
}
function killTree(pid) {
  if (process.platform === 'win32') command('taskkill.exe', ['/pid', String(pid), '/t', '/f'], { timeout: 10000 });
  else try { process.kill(-pid, 'SIGKILL'); } catch { /* already exited */ }
}
async function runUpdate(home, token, { userHome, run = command, spawn = cp.spawn, now = Date.now, kill = killTree, deadlineMs = DEADLINE, setTimer = setTimeout, clearTimer = clearTimeout } = {}) {
  const p = files(home);
  let job = read(p.status);
  if (job?.token !== token || read(p.lock)?.token !== token || job.state !== 'running') throw Error('Update launch identity changed');
  job = { ...job, pid: process.pid, phase: 'preparing', deadline: job.started + deadlineMs };
  atomic(p.status, job);
  const log = text => { if (text) fs.appendFileSync(p.log, text.endsWith('\n') ? text : text + '\n'); };
  const finish = (state, error, release = state !== 'unknown') => {
    job = { ...job, target: deploymentTarget(job, read(p.result)) || job.target, state, error: error ? shortError(error) : null, finished: now() };
    atomic(p.status, job);
    if (release) unlock(p, token);
    return job;
  };
  try {
    const root = prepareClone({ userHome, run, log, onTarget(target) {
      job = { ...job, target }; atomic(p.status, job);
    } });
    if (now() >= job.deadline) return finish('unknown', 'Update deadline exceeded', false);
    job = { ...job, phase: 'deploying' }; atomic(p.status, job);
    // CLI already owns the result writer, full pipeline and peer eligibility.
    return await new Promise(resolve => {
      let child, timer, settled = false;
      const done = (state, error, release = state !== 'unknown') => {
        if (settled) return; settled = true; clearTimer(timer);
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
        const result = readResult(p, job);
        if (result?.token !== token || result.complete !== true) return done('unknown', 'No final deployment result; inspect log', false);
        const final = outcome(result);
        if (code !== 0 && final.state === 'complete') return done('unknown', 'Deployment exit disagrees with result; inspect log', false);
        done(final.state, final.error);
      });
      timer = setTimer(() => {
        log('Update deadline exceeded; dispatched remote outcomes may be unknown. No automatic retry.');
        kill(child.pid); done('unknown', 'Update deadline exceeded; inspect log', false);
      }, Math.max(1, job.deadline - now()));
    });
  } catch (error) { log(shortError(error)); return finish('failed', error); }
}
async function launch(home, { spawn = cp.spawn, source = fs.readFileSync(__filename, 'utf8'), now = Date.now, sleep = ms => new Promise(resolve => setTimeout(resolve, ms)) } = {}) {
  const p = files(home), current = inspect(home);
  // Enforce this at the process boundary too: a stale UI or absent Settings lock
  // cannot replay a tokenless CLI timeout whose descendants may still be alive.
  if (current.job?.state === 'unknown' || current.lastRun?.state === 'unknown' || current.peerUnknown) return current;
  fs.mkdirSync(p.dir, { recursive: true });
  const token = randomUUID();
  try { acquire(p.lock, { token }); }
  catch (error) { if (error.code === 'EEXIST') return inspect(home); throw error; }
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
module.exports = { SETTLE, TERMINAL, summaryLines, terminalEvidence, settled, retryIO, acquire, remove, readResult, REPOSITORY, DEADLINE, CHECK_MIN, CHECK_MAX, RETRY_MAX, INVALIDATE_MIN, BUSY_CHECK_RETRY, nextAttempt, checkDelay, files, read, atomic, command, installedRevision, inspect, checkMain, prepareClone, peerSkipKind, deferredPeers, outcome, launch, runUpdate };
if (require.main === module) {
  if (process.argv[2] === '--run') runUpdate(process.argv[3], process.argv[4]).catch(error => { console.error(shortError(error)); process.exitCode = 1; });
  else {
    Promise.resolve().then(() => {
      const request = JSON.parse(process.argv[2]);
      if (!request.home || !path.isAbsolute(request.home)) throw Error('An absolute Herdr home is required');
      if (request.action === 'launch') return launch(request.home);
      if (request.action === 'status') return inspect(request.home);
      if (request.action === 'check') return checkMain(request.home, { force: request.force === true, invalidate: request.invalidate === true });
      throw Error('Unknown update action');
    }).then(value => console.log(JSON.stringify(value))).catch(error => { console.log(JSON.stringify({ error: shortError(error) })); process.exitCode = 1; });
  }
}
