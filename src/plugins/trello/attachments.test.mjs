import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture, fakeTransport, A, B, C, L, ITEM, credentials} from './testing.test.mjs';
import {trelloServer, json} from '../../../tests/support/trello-server.mjs';
const require = createRequire(import.meta.url);
const {run} = require('./operations.cjs'), {execute} = require('./cli.cjs');
const {attachment, singleAttachment} = require('./attachments.cjs');
const image = {id: ITEM, name: 'Untrusted screenshot', fileName: 'screen.png', mimeType: 'image/png', bytes: '42', date: '2026-01-01T00:00:00Z', isUpload: true,
  url: `https://trello.com/1/cards/${C}/attachments/${ITEM}/download/screen.png`,
  previews: [{id: B, width: 300, height: 200, bytes: 12, scaled: true, url: `https://trello.com/1/cards/${C}/attachments/${ITEM}/previews/${B}/download`}]};
const f = fixture(); let rows = [image], mode = 'normal';
const api = await trelloServer((url, request, response) => {
  assert.equal(request.method, 'GET');
  assert.equal(url.searchParams.get('key'), credentials.apiKey); assert.equal(url.searchParams.get('token'), credentials.token);
  if (mode === 'rate') return json(response, {}, 429, {'Retry-After': '120'});
  if (url.pathname === `/1/boards/${A}/cards`) return json(response, [{id: C, idBoard: A, idList: L}]);
  if (url.pathname === `/1/cards/${C}`) {
    assert.deepEqual([...url.searchParams.keys()].sort(), ['fields', 'key', 'token']);
    return json(response, {id: C, idBoard: A, idList: L});
  }
  if (url.pathname === `/1/cards/${C}/actions` || url.pathname === `/1/cards/${C}/checklists`) return json(response, []);
  assert.equal(url.pathname, `/1/cards/${C}/attachments`);
  assert.equal(url.searchParams.get('fields'), 'all');
  // Contract fixture deliberately rejects the old undocumented filter=all.
  if (url.searchParams.has('filter')) return json(response, {message: 'invalid value for filter'}, 400);
  if (mode === 'oversize') { response.end('x'.repeat(2097153)); return; }
  if (mode === 'disable') f.state(false);
  json(response, rows);
});
try {
  const read = () => run(f.store, 'attachments.list', {board: A, card: C}, api);
  const list = await read(); assert.equal(list.items[0].bytes, 42); assert.equal(list.items[0].previews[0].width, 300);
  assert.equal(list.count, 1); assert.equal(list.countExact, true); assert.equal(list.untrusted, true);
  const detail = await run(f.store, 'cards.get', {board: A, card: C}, api);
  assert.deepEqual(detail.card.attachmentIds, [ITEM]); assert.equal(detail.card.attachmentCount, 1); assert.equal(detail.card.attachmentCountExact, true);
  let count = api.calls.length;
  await assert.rejects(run(f.store, 'attachments.list', {board: B, card: C}, api), {code: 'SCOPE'}); assert.equal(api.calls.length, count);
  await assert.rejects(run(f.store, 'attachments.list', {board: A, card: B}, api), {code: 'SCOPE'}); assert.equal(api.calls.at(-1).url.pathname, `/1/boards/${A}/cards`);
  for (const args of [{board: A}, {board: A, card: C, url: image.url}, {board: A, card: '../'}]) await assert.rejects(run(f.store, 'attachments.list', args, api), {code: 'INPUT'});
  rows = []; assert.equal((await read()).count, 0); assert.equal((await read()).complete, true);
  rows = [{id: ITEM, isUpload: false, name: 'Link', url: 'https://external.invalid/page', bytes: null}];
  assert.equal((await read()).items[0].isUpload, false); assert.equal(api.calls.at(-1).url.pathname, `/1/cards/${C}/attachments`);
  rows = Array.from({length: 101}, (_, n) => ({...image, id: n.toString(16).padStart(24, '0')}));
  const large = await read(); assert.equal(large.items.length, 100); assert.equal(large.countExact, false); assert.equal(large.truncated, true); assert.ok(!large.nextBefore);
  rows = [image, image]; await assert.rejects(read(), {code: 'RESPONSE'});
  for (const value of [{...image, bytes: -1}, {...image, previews: ['bad']}, {...image, url: 'file:///secret'}, {...image, url: 'https://example.invalid/?token=secret'}, {...image, name: 'bad\nname'}]) assert.throws(() => attachment(value), {code: 'RESPONSE'});
  assert.deepEqual(singleAttachment(image, ITEM), singleAttachment([image], ITEM));
  assert.throws(() => singleAttachment([image, image], ITEM), {code: 'RESPONSE'});
  assert.throws(() => singleAttachment(image, B), {code: 'SCOPE'});
  mode = 'oversize'; await assert.rejects(read(), {code: 'RESPONSE'});
  mode = 'disable'; rows = [image]; await assert.rejects(read(), {code: 'STALE'}); f.state();
  mode = 'rate'; await assert.rejects(read(), {code: 'RATE_LIMIT'}); count = api.calls.length;
  await assert.rejects(read(), {code: 'RATE_LIMIT'}); assert.equal(api.calls.length, count);
  const safe = fakeTransport(route => route.endsWith('/attachments') ? Response.json([{...image, name: credentials.token}]) : undefined);
  f.store.write('cooldown', {version: 1, retryAt: 0}, f.store.read('cooldown'));
  assert.equal((await run(f.store, 'attachments.list', {board: A, card: C}, safe)).items[0].name, '[redacted]');
  assert.equal((await execute(['attachments', 'list', '--board', A, '--card', C], {store: f.store, ...safe})).exit, 0);
} finally { await api.close(); f.cleanup(); }
console.log('PASS: fake-server scoped attachment metadata, card counts, parent proof, bounds, redaction and cooldown');
