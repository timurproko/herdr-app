import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture, fakeTransport} from './testing.test.mjs';
const {run} = createRequire(import.meta.url)('./operations.cjs');
for (const [ownSeconds, racingSeconds] of [[600, 10], [10, 900]]) {
  const f = fixture(), now = Date.now();
  try {
    const refused = fakeTransport(() => ({status: 429, headers: new Headers({'Retry-After': String(ownSeconds)}), body: {async cancel() {
      // Another invocation commits after this response's original read, before
      // its CAS. Cancellation is deliberately asynchronous to model the race.
      f.store.write('cooldown', {version: 1, retryAt: now + racingSeconds * 1000});
    }}}));
    const expected = now + Math.max(ownSeconds, racingSeconds) * 1000;
    await assert.rejects(run(f.store, 'boards.list', {}, {...refused, now: () => now}), e => e.code === 'RATE_LIMIT' && e.retryAt === expected);
    assert.equal(f.store.read('cooldown').retryAt, expected, 'the longest refusal is persisted, not merely reported');
    const blocked = fakeTransport();
    await assert.rejects(run(f.store, 'boards.list', {}, {...blocked, now: () => now + 11000}), e => e.code === 'RATE_LIMIT' && e.retryAt === expected);
    assert.equal(blocked.calls.length, 0, 'another invocation cannot dispatch at the shorter deadline');
    assert.equal((await run(f.store, 'boards.list', {}, {...blocked, now: () => expected + 1})).complete, true);
    assert.equal(blocked.calls.length, 1);
  } finally { f.cleanup(); }
}
const f = fixture(), now = Date.now();
try {
  const write = f.store.write.bind(f.store); let conflicts = 0;
  f.store.write = (name, value, expected) => {
    if (name === 'cooldown' && conflicts < 3) {
      const seconds = [20, 30, 900][conflicts++];
      write(name, {version: 1, retryAt: now + seconds * 1000}, f.store.read(name, true));
    }
    return write(name, value, expected);
  };
  const refused = fakeTransport(() => new Response('rate', {status: 429, headers: {'Retry-After': '600'}}));
  await assert.rejects(run(f.store, 'boards.list', {}, {...refused, now: () => now}), e => e.code === 'RATE_LIMIT' && e.retryAt === now + 900000);
  assert.equal(conflicts, 3);
  assert.equal(f.store.read('cooldown').retryAt, now + 900000, 'repeated conflicts merge a newly larger deadline');
  assert.equal(refused.calls.length, 1, 'local CAS retries never replay the HTTP request');
} finally { f.cleanup(); }
console.log('PASS: concurrent Trello 429 deadlines merge atomically, survive repeated conflicts and block premature requests');
