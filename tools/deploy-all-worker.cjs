// Shared desktop/peer operations. Built-ins only so this file can travel in node -e.
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');

const TIMEOUT = { check: 15000, fetch: 60000, deploy: 480000 };
function runCommand(command, args, options = {}) {
  const r = cp.spawnSync(command, args, {
    encoding: 'utf8', windowsHide: true, maxBuffer: 8 * 1024 * 1024,
    timeout: TIMEOUT.check, ...options,
  });
  return { code: r.status, stdout: r.stdout || '', stderr: r.stderr || '',
    missing: r.error?.code === 'ENOENT', timedOut: r.error?.code === 'ETIMEDOUT', error: r.error?.code };
}
function repositoryOrigin(url) {
  // Read the stored URL: remote get-url would apply insteadOf rewrites.
  return /^(?:https:\/\/github\.com\/|git@github(?:\.com|-timurproko):|ssh:\/\/git@github(?:\.com|-timurproko)\/)(?:timurproko\/herdr-app)(?:\.git)?\/?$/i.test(url);
}
function npmCommand(script, platform = process.platform) {
  return platform === 'win32'
    ? ['cmd.exe', ['/d', '/s', '/c', `npm run ${script}`]]
    : ['npm', ['run', script]];
}
function gitAt(root, args, { run = runCommand, env = process.env } = {}) {
  return run('git', ['-C', root, ...args], {
    timeout: args[0] === 'fetch' ? TIMEOUT.fetch : TIMEOUT.check,
    env: { ...env, GIT_TERMINAL_PROMPT: '0', GCM_INTERACTIVE: 'never' },
  });
}
function checkSource(root, options = {}) {
  const git = args => gitAt(root, args, options);
  const must = (args, reason) => {
    const r = git(args);
    if (r.code !== 0) throw Error(r.missing ? 'git is missing' : `${reason}${r.timedOut ? ' (timed out)' : ''}`);
    return r.stdout.trim();
  };
  const top = must(['rev-parse', '--show-toplevel'], 'not a readable Git checkout');
  if (path.resolve(top) !== path.resolve(root)) throw Error('path is not the repository root');
  if (must(['symbolic-ref', '--quiet', '--short', 'HEAD'], 'not on main') !== 'main') throw Error('not on main');
  if (must(['status', '--porcelain', '--untracked-files=all'], 'cannot check cleanliness')) throw Error('checkout is dirty');
  const origin = must(['config', '--get', 'remote.origin.url'], 'origin is missing');
  if (!(options.originMatches || repositoryOrigin)(origin)) throw Error('origin is not this repository');
  must(['fetch', 'origin'], 'fetch origin failed');
  const commit = must(['rev-parse', '--verify', 'origin/main^{commit}'], 'origin/main is missing');
  const before = must(['rev-parse', 'HEAD'], 'cannot read HEAD');
  const ancestor = git(['merge-base', '--is-ancestor', before, commit]);
  if (ancestor.code !== 0) {
    if (ancestor.code !== 1) throw Error('cannot compare HEAD with origin/main');
    const ahead = git(['merge-base', '--is-ancestor', commit, before]);
    throw Error(ahead.code === 0 ? 'checkout is ahead of origin/main' : 'checkout has diverged from origin/main');
  }
  return { before, commit };
}
function fastForward(root, commit, options = {}) {
  const r = gitAt(root, ['merge', '--ff-only', commit], options);
  if (r.code !== 0) throw Error('fast-forward failed; checkout left for manual inspection');
}
// npm prints banners before deploy's final JSON. Find the complete trailing object.
function deployResult(stdout) {
  const text = stdout.trim();
  for (let at = text.indexOf('{'); at !== -1; at = text.indexOf('{', at + 1)) {
    try {
      const value = JSON.parse(text.slice(at));
      if (Number.isInteger(value.changed) && Number.isInteger(value.removed) && Object.hasOwn(value, 'backup')) return value;
    } catch { /* not the final deploy object */ }
  }
  return null;
}
function deployCheckout(root, commit, script, { run = runCommand, env = process.env, log = console.log, platform = process.platform } = {}) {
  log(`Source commit: ${commit}; npm run ${script}`);
  const [command, args] = npmCommand(script, platform);
  const r = run(command, args, { cwd: root, env, timeout: TIMEOUT.deploy });
  if (r.stdout.trim()) log(r.stdout.trim());
  if (r.stderr.trim()) log(r.stderr.trim());
  const result = deployResult(r.stdout);
  const backup = result?.backup || null;
  if (r.code !== 0 || result?.patches?.ok === false) return {
    action: 'failed', reason: r.timedOut ? 'deployment timed out; outcome unknown' : 'deployment failed; inspect output', commit, backup,
  };
  if (!result) return { action: 'failed', reason: 'deployment returned no result; outcome unknown', commit, backup };
  return { action: result.changed || result.removed || backup || result.patches?.changed ? 'deployed' : 'already current', commit, backup };
}
module.exports = { TIMEOUT, runCommand, repositoryOrigin, npmCommand, gitAt, checkSource, fastForward, deployResult, deployCheckout };
