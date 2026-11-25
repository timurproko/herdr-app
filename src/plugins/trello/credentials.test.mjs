import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixture, Store, setup, configure, credentials, A, B} from './testing.test.mjs';
const require = createRequire(import.meta.url);
const {authority} = require('./policy.cjs');
const {homePath, validate} = require('./credentials.cjs');
const {publicError} = require('./errors.cjs');
const f = fixture();
try {
  assert.equal(homePath(f.home), path.resolve(f.home));
  assert.equal(f.store.read('policy').allowWrites, false);
  assert.throws(() => setup(f.store, credentials), {code: 'CONFLICT'});
  assert.throws(() => setup(f.store, {...credentials, secret: 'no'}), {code: 'INPUT'});
  assert.throws(() => configure(f.store, 'allow', '*'), {code: 'INPUT'});
  assert.throws(() => validate('policy', {version: 1, boards: [A, A], allowWrites: false}), {code: 'STORE'});
  assert.throws(() => authority(f.store, true, [A]), {code: 'READ_ONLY'});
  configure(f.store, 'writes', 'on');
  assert.throws(() => authority(f.store, true, [A]), {code: 'READ_ONLY'});
  f.state(true, 'read-write');
  const gate = authority(f.store, true, [A]); gate.check();
  configure(f.store, 'allow', B);
  assert.throws(() => gate.check(), {code: 'STALE'});
  const next = authority(f.store, true, [A]); f.state(false);
  assert.throws(() => next.check(), {code: 'STALE'});
  assert.throws(() => authority(f.store), {code: 'DISABLED'});
  f.state();
  const raw = fs.readFileSync(path.join(f.home, 'shared.json'), 'utf8');
  setup(f.store, {...credentials, token: 'FAKE_ROTATED_TOKEN_123456'}, true);
  assert.equal(fs.readFileSync(path.join(f.home, 'shared.json'), 'utf8'), raw);
  assert.ok(!JSON.stringify(publicError(new Error(credentials.token))).includes(credentials.token));
  fs.writeFileSync(f.store.file('policy'), '{}');
  assert.throws(() => setup(f.store, credentials, true), {code: 'STORE'});
  const checkout = path.join(f.root, 'checkout'); fs.mkdirSync(path.join(checkout, '.git'), {recursive: true});
  assert.throws(() => new Store(checkout).directory(true), {code: 'STORE'});
  const unsafe = new Store(path.join(f.root, 'unsafe'), {security: () => { throw Error('unverifiable ACL'); }});
  assert.throws(() => unsafe.directory(true));
} finally { f.cleanup(); }
const real = fixture({realSecurity: true});
try {
  assert.equal(real.store.read('credentials').token, credentials.token);
  setup(real.store, {...credentials, token: 'FAKE_ROTATED_TOKEN_123456'}, true);
  if (process.platform !== 'win32') {
    assert.equal(fs.statSync(real.store.file('credentials')).mode & 0o777, 0o600);
    fs.chmodSync(real.store.file('credentials'), 0o644);
    assert.throws(() => real.store.read('credentials'), {code: 'STORE'});
    fs.unlinkSync(real.store.file('credentials'));
    fs.symlinkSync(path.join(real.root, 'missing'), real.store.file('credentials'));
    assert.throws(() => real.store.read('credentials'), {code: 'STORE'});
  }
} finally { real.cleanup(); }
console.log('PASS: Trello private stores, real OS protection, rotation, local policy and stale authority');
