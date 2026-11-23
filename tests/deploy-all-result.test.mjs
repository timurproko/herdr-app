import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { deployAll, manifestDigest, resultRecorder } from '../tools/deploy-all.mjs';
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
    fs.writeFileSync(manifest, JSON.stringify({ version: 2, id: 'custom', files: { later: 'other deployment' } }));
    return { code: 1, stdout: 'transport failed' };
  };
  result = deployAll([], f); saved = read();
  assert.equal(result.code, 1); assert.equal(seen[0].complete, false);
  assert.equal(seen[0].desktop.verified, true);
  assert.deepEqual(saved.results.map(row => row.action), ['deployed', 'failed', 'skipped']);
  assert.equal(saved.desktop.verified, true, 'peer failure preserves desktop success');
  assert.equal(saved.desktop.manifest, seen[0].desktop.manifest, 'peer callbacks cannot restamp another deployment as the earlier desktop SHA');
  assert.notEqual(saved.desktop.manifest, manifestDigest(home));
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
  // A later run must not lose an offline peer when replacing the latest rows.
  {
    const f = fixture(), home = f.env.HERDR_APP_HOME, file = path.join(home, '.customizations/deploy-all-result.json');
    const original = f.run, read = () => JSON.parse(fs.readFileSync(file));
    let state = 'unreachable', inventoryFails = false, present = true, peerAction = 'deployed', peerCalls = 0;
    f.run = (program, args, options) => {
      if (program !== 'hc') return original(program, args, options);
      if (args[0] === 'machine') return inventoryFails ? { code: 1 } : { code: 0, stdout: JSON.stringify({ machines: present ? [{ name: 'pc2', state }] : [] }) };
      peerCalls++;
      const result = { action: peerAction, reason: peerAction === 'skipped' ? 'needs its own full deploy' : peerAction === 'failed' ? 'deploy lock held' : undefined };
      return { code: 0, stdout: JSON.stringify({ code: 0, stdout: Buffer.from('HERDR_DEPLOY_ALL_RESULT=' + JSON.stringify(result)).toString('base64') }) };
    };
    deployAll([], f); assert.deepEqual(read().deferredPeers, ['pc2']); assert.equal(peerCalls, 0);
    const digest = read().desktop;
    deployAll([], f); assert.deepEqual(read().deferredPeers, ['pc2'], 'repeated offline skip retains work');
    deployAll(['--only', 'local'], f); assert.deepEqual(read().deferredPeers, ['pc2'], 'selection omission is not resolution');
    inventoryFails = true; deployAll([], f); assert.deepEqual(read().deferredPeers, ['pc2'], 'failed inventory is not removal');
    inventoryFails = false; state = 'connected'; peerAction = 'failed';
    deployAll([], f); assert.deepEqual(read().deferredPeers, ['pc2'], 'reachable failure keeps unresolved work');
    const bytes = fs.readFileSync(file);
    deployAll(['--dry-run'], f); assert.deepEqual(fs.readFileSync(file), bytes);
    peerAction = 'already current'; deployAll(['--skip-local'], f);
    assert.deepEqual(read().deferredPeers, []); assert.equal(read().desktop.commit, digest.commit, 'peer facts do not replace installed desktop provenance');
    state = 'offline'; deployAll([], f); assert.deepEqual(read().deferredPeers, ['pc2']);
    state = 'connected'; peerAction = 'skipped'; deployAll([], f); assert.deepEqual(read().deferredPeers, [], 'confirmed desktop exclusion resolves shell work');
    state = 'disconnected'; deployAll([], f); assert.deepEqual(read().deferredPeers, ['pc2']);
    present = false; deployAll([], f); assert.deepEqual(read().deferredPeers, [], 'successful full inventory proves removal');
    // Legacy recovery, incremental writes, validation and explicit empty sets.
    const legacy = { desktop: digest, results: [{ machine: 'pc2', action: 'skipped', reason: 'offline (unreachable)' }] };
    fs.writeFileSync(file, JSON.stringify(legacy));
    const record = resultRecorder(f.env); record([]); assert.deepEqual(read().deferredPeers, ['pc2']);
    record([{ machine: 'pc2', action: 'deployed' }]); assert.deepEqual(read().deferredPeers, []);
    fs.writeFileSync(file, JSON.stringify({ ...legacy, deferredPeers: [] }));
    resultRecorder(f.env)([]); assert.deepEqual(read().deferredPeers, [], 'resolved facts are not inferred again from old rows');
    fs.writeFileSync(file, JSON.stringify({ ...legacy, deferredPeers: ['pc2', 'pc2', 'local', '', '(inventory)', 'line\nbreak', 'x'.repeat(201), null, 1] }));
    resultRecorder(f.env)([]); assert.deepEqual(read().deferredPeers, ['pc2']);
    fs.writeFileSync(file, JSON.stringify({ deferredPeers: Array.from({ length: 300 }, (_, i) => 'peer-' + i) }));
    resultRecorder(f.env)([]); assert.equal(read().deferredPeers.length, 256, 'bounded runtime identities');
    fs.writeFileSync(file, JSON.stringify({ results: {} })); resultRecorder(f.env)([]); assert.deepEqual(read().deferredPeers, []);
  }
  console.log('PASS: atomic deploy-all results, durable deferred peers, selections/inventory, legacy receipts, bounded identities, provenance and untouched dry-run (fixtures).');
} finally { clean(); }
