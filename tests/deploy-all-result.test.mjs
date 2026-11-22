import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deployAll, manifestDigest } from '../tools/deploy-all.mjs';
import { fixture, clean } from './support/deploy-all.mjs';
try {
  const f = fixture(), home = f.env.HERDR_APP_HOME;
  const directory = path.join(home, '.customizations');
  fs.mkdirSync(directory, { recursive: true });
  const manifest = path.join(directory, 'manifest.json'), file = path.join(directory, 'deploy-all-result.json');
  fs.writeFileSync(manifest, JSON.stringify({ version: 2, id: 'custom', files: {} }));
  f.env = { ...f.env, HERDR_UPDATE_RUN_ID: 'fixture-run' };
  const read = () => JSON.parse(fs.readFileSync(file));
  let result = deployAll([], f), saved = read();
  assert.equal(result.code, 0);
  assert.equal(saved.complete, true); assert.equal(saved.token, 'fixture-run');
  assert.equal(saved.desktop.commit, result.results[0].commit);
  assert.equal(saved.desktop.manifest, manifestDigest(home)); assert.equal(saved.desktop.verified, true);
  assert.equal(saved.results[0].backup, '123-45');
  const original = f.run, seen = [];
  f.run = (command, args, options) => {
    if (command !== 'hc') return original(command, args, options);
    if (args[0] === 'machine') return { code: 0, stdout: JSON.stringify({ machines: [{ name: 'bad', state: 'connected' }, { name: 'off', state: 'offline' }] }) };
    seen.push(read()); // local completion must be durable before peer dispatch
    return { code: 1, stdout: 'transport failed' };
  };
  result = deployAll([], f); saved = read();
  assert.equal(result.code, 1); assert.equal(seen[0].complete, false);
  assert.equal(seen[0].desktop.verified, true);
  assert.deepEqual(saved.results.map(row => row.action), ['deployed', 'failed', 'skipped']);
  assert.equal(saved.desktop.verified, true, 'peer failure preserves desktop success');
  const bytes = fs.readFileSync(file);
  deployAll(['--dry-run'], f); assert.deepEqual(fs.readFileSync(file), bytes);
  f.run = (command, args, options) => command === 'git' || command === 'hc' ? original(command, args, options) : { code: 1, stdout: '', stderr: 'fixture installer failed' };
  deployAll([], f); saved = read();
  assert.equal(saved.desktop.verified, false); assert.equal(saved.desktop.commit, result.results[0].commit);
  assert.equal(saved.results[0].action, 'failed');
  fs.appendFileSync(path.join(f.root, 'source.txt'), 'dirty');
  deployAll([], f); saved = read(); assert.equal(saved.complete, true); assert.match(saved.error, /dirty/);
  assert.deepEqual(saved.results, []);
  assert.throws(() => deployAll(['--bad'], f)); assert.match(read().error, /Use npm/);
  fs.writeFileSync(manifest, 'bad json'); assert.equal(manifestDigest(home), null);
  console.log('PASS: atomic deploy-all latest results, incremental local evidence, mixed outcomes, refusals and untouched dry-run (fixtures).');
} finally { clean(); }
