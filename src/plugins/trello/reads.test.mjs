import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture, fakeTransport, A, B, C, L, CHECK, ITEM, credentials, configure} from './testing.test.mjs';
const require = createRequire(import.meta.url);
const {run} = require('./operations.cjs');
const {execute} = require('./cli.cjs');
const {Client} = require('./client.cjs');
const {authority} = require('./policy.cjs');
const f = fixture(), fake = fakeTransport((route, options, url) => {
  assert.equal(url.origin, 'https://api.trello.com');
  assert.equal(url.searchParams.get('key'), credentials.apiKey);
  assert.equal(url.searchParams.get('token'), credentials.token);
  assert.equal(options.redirect, 'manual');
});
try {
  const boards = await run(f.store, 'boards.list', {}, fake);
  assert.equal(boards.items[0].id, A); assert.ok(fake.calls.every(r => !r.route.includes('members')));
  for (const [op, args] of [
    ['lists.list', {board: A}], ['cards.list', {board: A}], ['cards.list', {board: A, list: L}],
    ['labels.list', {board: A}], ['labels.list', {board: A, card: C}], ['checklists.list', {board: A, card: C}],
    ['checkitems.list', {board: A, card: C, checklist: CHECK}],
  ]) assert.ok((await run(f.store, op, args, fake)).items.length);
  const card = await run(f.store, 'cards.get', {board: A, card: C}, fake);
  assert.equal(card.comments.items[0].text, 'untrusted comment');
  assert.equal(card.checklists.items[0].checkItems[0].state, 'incomplete');
  assert.equal(card.card.name, 'Untrusted $(do not execute)'); assert.equal(card.untrusted, true);
  const count = fake.calls.length;
  await assert.rejects(run(f.store, 'cards.get', {board: B, card: C}, fake), {code: 'SCOPE'});
  assert.equal(fake.calls.length, count);
  await assert.rejects(run(f.store, 'cards.get', {board: A, card: B}, fake), {code: 'SCOPE'});
  assert.equal(fake.calls.at(-1).route, `/boards/${A}/cards`);
  for (const args of [{board: A, limit: 101}, {board: A, token: 'no'}, {board: A, before: '../'}]) await assert.rejects(run(f.store, 'cards.list', args, fake), {code: 'INPUT'});
  const paged = fakeTransport(route => route === `/boards/${A}/cards` ? Response.json([{id: C, idBoard: A, idList: L}]) : undefined);
  const p = await run(f.store, 'cards.list', {board: A, limit: 1}, paged);
  assert.equal(p.complete, false); assert.equal(p.nextBefore, C);
  const badCard = fakeTransport(route => route === `/cards/${C}` ? Response.json({id: C, idBoard: B, idList: L}) : undefined);
  await assert.rejects(run(f.store, 'cards.get', {board: A, card: C}, badCard), {code: 'SCOPE'});
  assert.equal(badCard.calls.length, 2);
  const stale = fakeTransport(() => { f.state(false); return Response.json({id: A}); });
  await assert.rejects(run(f.store, 'boards.list', {}, stale), {code: 'STALE'}); assert.equal(stale.calls.length, 1); f.state();
  for (const [status, code] of [[401, 'AUTH'], [403, 'FORBIDDEN'], [404, 'NOT_FOUND'], [302, 'REMOTE'], [500, 'REMOTE']]) {
    const x = fakeTransport(() => new Response(credentials.token, {status}));
    const out = await execute(['boards', 'list'], {store: f.store, ...x});
    assert.equal(out.result.error.code, code); assert.ok(!JSON.stringify(out).includes(credentials.token)); assert.equal(x.calls.length, 1);
  }
  const leaked = fakeTransport(() => Response.json({id: A, name: credentials.token, url: `https://evil.invalid/${credentials.apiKey}`}));
  const clean = await run(f.store, 'boards.list', {}, leaked); assert.equal(clean.items[0].name, '[redacted]'); assert.ok(!clean.items[0].url);
  const oversized = fakeTransport(() => new Response('x'.repeat(2097153)));
  await assert.rejects(run(f.store, 'boards.list', {}, oversized), {code: 'RESPONSE'});
  const malformed = fakeTransport(() => new Response('not json'));
  await assert.rejects(run(f.store, 'boards.list', {}, malformed), {code: 'RESPONSE'});
  const client = new Client(f.store, authority(f.store), {...fake, timeout: 5, transport: async () => new Promise(() => {})});
  await assert.rejects(client.get(`/boards/${A}`, {}), {code: 'TRANSPORT'});
  await assert.rejects(client.get('https://evil.invalid', {}), {code: 'INPUT'});
  const limited = fakeTransport(() => new Response('no', {status: 429, headers: {'Retry-After': '120'}}));
  let retryAt;
  await assert.rejects(run(f.store, 'boards.list', {}, limited), e => { retryAt = e.retryAt; return e.code === 'RATE_LIMIT' && retryAt >= Date.now() + 119000; });
  const cold = fakeTransport(); await assert.rejects(run(f.store, 'boards.list', {}, cold), {code: 'RATE_LIMIT'}); assert.equal(cold.calls.length, 0);
  const old = f.store.read('cooldown'); f.store.write('cooldown', {version: 1, retryAt: 0}, old);
  assert.equal((await execute(['cards', 'get', C, '--board', A], {store: f.store, ...fake})).exit, 0);
  for (const argv of [['request', 'GET'], ['boards', 'list', '--url', 'https://evil.invalid'], ['cards', 'list', '--board', A, '--input', 'no'], ['status', '--token', 'no']]) assert.equal((await execute(argv, {store: f.store, ...fake})).exit, 2);
  configure(f.store, 'remove', A); const empty = fakeTransport(); assert.equal((await run(f.store, 'boards.list', {}, empty)).items.length, 0); assert.equal(empty.calls.length, 0);
} finally { f.cleanup(); }
console.log('PASS: scoped Trello reads, official routing/auth, pagination, bounds, JSON errors, redaction and cooldown');
