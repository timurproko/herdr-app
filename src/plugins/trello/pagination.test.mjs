import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture, fakeTransport, configure, A, C, L, ITEM} from './testing.test.mjs';
const require = createRequire(import.meta.url), {run} = require('./operations.cjs');
// Distinct creation timestamps; position order is deliberately not newest-first.
const created = Array.from({length: 101}, (_, i) => ({
  id: (i + 1).toString(16).padStart(8, '0') + '0'.repeat(16), idBoard: A, idList: L, name: `card ${i + 1}`,
}));
const newestFirst = [...created].reverse().map(r => r.id);
for (const order of ['ascending', 'permuted']) {
  const f = fixture();
  const positioned = created.map((_, i) => ({...created[order === 'ascending' ? i : i * 37 % 101], pos: i + 1}));
  const fake = fakeTransport((route, options, url) => {
    if (route === `/boards/${A}/cards` || route === `/lists/${L}/cards`) {
      let rows = [...positioned];
      const before = url.searchParams.get('before');
      if (before) rows = rows.filter(r => r.id < before);
      // Emulate Trello's sort=none default, not an implicitly sorted fake.
      if (url.searchParams.get('sort') === '-id') rows.sort((a, b) => b.id.localeCompare(a.id));
      return Response.json(rows.slice(0, Number(url.searchParams.get('limit') || 1000)));
    }
    const target = positioned.find(r => route.startsWith(`/cards/${r.id}`));
    if (!target) return;
    if (options.method === 'POST' && route.endsWith('/actions/comments')) return Response.json({id: ITEM, data: {card: {id: target.id}, board: {id: A}}});
    if (options.method !== 'GET') throw Error('Unfaked mutation');
    if (route === `/cards/${target.id}`) return Response.json(target);
    if (route.endsWith('/actions') || route.endsWith('/checklists') || route.endsWith('/attachments')) return Response.json([]);
    throw Error('Unfaked card route');
  });
  try {
    for (const list of [undefined, L]) for (const limit of [1, 50, 100]) {
      const ids = []; let before, complete = false, pages = 0;
      while (!complete && pages++ < positioned.length + 2) {
        const page = await run(f.store, 'cards.list', {board: A, ...(list ? {list} : {}), limit, ...(before ? {before} : {})}, fake);
        ids.push(...page.items.map(r => r.id));
        complete = page.complete;
        if (!complete) { assert.equal(page.nextBefore, page.items.at(-1).id); before = page.nextBefore; }
      }
      assert.equal(complete, true, `${order}: pagination terminates`);
      assert.deepEqual(ids, newestFirst, `${order}: board/list pages have no gaps, duplicates or premature completion at limit ${limit}`);
      assert.equal(new Set(ids).size, positioned.length);
    }
    // The original proof's final-position card must remain readable; the oldest
    // card additionally forces the fixed membership scanner past its first 100.
    for (const target of new Set([positioned.at(-1).id, created[0].id])) {
      assert.equal((await run(f.store, 'cards.get', {board: A, card: target}, fake)).card.id, target);
    }
    configure(f.store, 'writes', 'on'); f.state(true, 'read-write');
    assert.equal((await run(f.store, 'comments.add', {board: A, card: created[0].id, text: 'fake scoped write'}, fake)).applied, true);
    assert.equal(fake.calls.filter(c => c.method !== 'GET').length, 1);
    const scans = fake.calls.filter(c => c.route === `/boards/${A}/cards` && c.query.fields === 'idBoard,idList');
    assert.ok(scans.some(c => c.query.before === created[1].id), 'membership reads its second creation-ordered page');
    for (const c of fake.calls.filter(c => c.route === `/boards/${A}/cards` || c.route === `/lists/${L}/cards`)) assert.equal(c.query.sort, '-id');
  } finally { f.cleanup(); }
}
// Card detail must not add a third membership scan for attachment metadata.
// 600 newer cards took 17 requests before attachments; the added endpoint should
// cost one request, not another seven-page proof that exhausts the 20-read budget.
{
  const f = fixture();
  const older = {id: C, idBoard: A, idList: L, name: 'Existing older card', labels: []};
  const rows = [...Array.from({length: 600}, (_, n) => ({id: 'd' + (600 - n).toString(16).padStart(23, '0'), idBoard: A, idList: L})), older];
  let revoke = false;
  const fake = fakeTransport((route, options, url) => {
    assert.equal(options.method, 'GET');
    if (route === `/boards/${A}/cards`) {
      assert.equal(url.searchParams.get('sort'), '-id');
      const before = url.searchParams.get('before'), start = before ? rows.findIndex(r => r.id === before) + 1 : 0;
      return Response.json(rows.slice(start, start + 100));
    }
    if (route === `/cards/${C}`) return Response.json(older);
    if (route === `/cards/${C}/checklists` && revoke) f.state(false);
    if (['/actions', '/checklists', '/attachments'].some(s => route === `/cards/${C}` + s)) return Response.json([]);
    throw Error('Unfaked card-detail route');
  });
  try {
    const detail = await run(f.store, 'cards.get', {board: A, card: C}, fake);
    assert.equal(detail.card.name, older.name); assert.deepEqual(detail.card.attachmentIds, []);
    assert.equal(detail.card.attachmentCount, 0); assert.equal(detail.attachments.complete, true);
    assert.equal(fake.calls.length, 18, 'Only one metadata request is added to the baseline 17');
    assert.equal(fake.calls.filter(c => c.route === `/boards/${A}/cards`).length, 14, 'Existing initial/checklist proofs are retained, without a third scan');
    fake.calls.length = 0;
    await run(f.store, 'attachments.list', {board: A, card: C}, fake);
    assert.equal(fake.calls.length, 8, 'Standalone attachment access still proves its own membership');
    fake.calls.length = 0; revoke = true;
    await assert.rejects(run(f.store, 'cards.get', {board: A, card: C}, fake), {code: 'STALE'});
    assert.ok(!fake.calls.some(c => c.route.endsWith('/attachments')), 'Reused proof cannot bypass per-request authority revocation');
  } finally { f.cleanup(); }
}
console.log('PASS: creation-ordered pagination, multi-page membership and 601-card detail within the unchanged request/authority bounds');
