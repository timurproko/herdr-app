// Local bare origins only; never inherit live Herdr/Core homes or run real npm deploy.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { fileURLToPath } from 'node:url';
import worker from '../../tools/deploy-all-worker.cjs';
export const project = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../..');
const artifacts = path.join(project, '.artifacts');
fs.mkdirSync(artifacts, { recursive: true });
export const scratch = fs.mkdtempSync(path.join(fs.realpathSync(artifacts), 'deploy-all-'));
const empty = path.join(scratch, 'gitconfig'); fs.writeFileSync(empty, '');
export const env = { ...process.env, GIT_CONFIG_GLOBAL: empty, GIT_CONFIG_NOSYSTEM: '1',
  HERDR_APP_HOME: path.join(scratch, 'desktop home'), HERDR_APP_BIN: path.join(scratch, 'no-app'),
  GIT_AUTHOR_NAME: 'Fixture', GIT_AUTHOR_EMAIL: 'fixture@example.invalid',
  GIT_COMMITTER_NAME: 'Fixture', GIT_COMMITTER_EMAIL: 'fixture@example.invalid',
};
export function git(root, ...args) {
  // Pooled Windows paths are much deeper than hosted D:/a checkouts. Persist
  // long-path support in fixture clones, including the Update worker's clone;
  // never depend on or modify the person's excluded global Git configuration.
  if (process.platform === 'win32' && args[0] === 'clone') args.splice(1, 0, '-c', 'core.longpaths=true');
  const r = cp.spawnSync('git', ['-c', 'core.longpaths=true', '-C', root, ...args], { env, encoding: 'utf8', timeout: 15000 });
  assert.equal(r.status, 0, `${args.join(' ')}: ${r.stderr}`); return r.stdout.trim();
}
let sequence = 0;
export function fixture() {
  const base = path.join(scratch, String(++sequence)); fs.mkdirSync(base);
  const origin = path.join(base, 'origin.git'), author = path.join(base, 'author'), root = path.join(base, 'desktop');
  fs.mkdirSync(origin); git(origin, 'init', '--bare', '--initial-branch=main');
  fs.mkdirSync(author); git(author, 'init', '--initial-branch=main');
  fs.writeFileSync(path.join(author, 'source.txt'), 'first\n');
  git(author, 'add', '.'); git(author, 'commit', '-m', 'initial');
  git(author, 'remote', 'add', 'origin', origin); git(author, 'push', '-u', 'origin', 'main');
  git(base, 'clone', origin, root);
  const advance = () => {
    fs.appendFileSync(path.join(author, 'source.txt'), 'next\n');
    git(author, 'commit', '-am', 'advance'); git(author, 'push'); return git(author, 'rev-parse', 'HEAD');
  };
  const trelloBin=path.join(base,'user bin');fs.mkdirSync(trelloBin);
  const calls = [];
  const run = (command, args, opts) => {
    calls.push({ command, args, ...opts });
    if (command === 'git') return worker.runCommand(command, args, opts);
    if (command === 'hc' && args[0] === 'machine') return { code: 0, stdout: '{"machines":[]}' };
    if (command === 'npm' || command === 'cmd.exe') return { code: 0, stdout: 'npm banner\n' + JSON.stringify({ changed: 4, removed: 0, backup: '123-45', patches: null }), stderr: '' };
    throw Error(`Unexpected process: ${command} ${args}`);
  };
  return { base, root, origin, author, advance, calls, run,
    env: { ...env, HERDR_APP_HOME: path.join(base, 'desktop home'), HERDR_TRELLO_BIN: trelloBin, PATH: trelloBin+path.delimiter+process.env.PATH },
    originMatches: value => value === origin, log() {},
  };
}
// Windows subprocess/antivirus handles can outlive command completion briefly.
// Retry only transient removal failures; permanent failures still throw.
export const clean = () => fs.rmSync(scratch, { recursive: true, force: true, maxRetries: 5, retryDelay: 100 });
