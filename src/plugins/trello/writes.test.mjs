import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {fixture, fakeTransport, A, B, C, L, LABEL, CHECK, ITEM, credentials, configure} from './testing.test.mjs';
const require = createRequire(import.meta.url);
const {run} = require('./operations.cjs');
const {execute} = require('./cli.cjs');
const f = fixture();
const cases = [
  ['cards.create', {board: A, list: L, name: 'new', due: null}, 'POST', '/cards', {idList: L, name: 'new', due: 'null'}],
  ['cards.update', {board: A, card: C, desc: 'edit', dueComplete: true}, 'PUT', `/cards/${C}`, {desc: 'edit', dueComplete: 'true'}],
  ['cards.move', {board: A, card: C, list: L, destinationBoard: B, pos: 'top'}, 'PUT', `/cards/${C}`, {idList: L, idBoard: B, pos: 'top'}],
  ['cards.archive', {board: A, card: C}, 'PUT', `/cards/${C}`, {closed: 'true'}],
  ['comments.add', {board: A, card: C, text: 'hello'}, 'POST', `/cards/${C}/actions/comments`, {text: 'hello'}],
  ['cards.label.add', {board: A, card: C, label: LABEL}, 'POST', `/cards/${C}/idLabels`, {value: LABEL}],
  ['cards.label.remove', {board: A, card: C, label: LABEL}, 'DELETE', `/cards/${C}/idLabels/${LABEL}`, {}],
  ['checklists.add', {board: A, card: C, name: 'steps'}, 'POST', `/cards/${C}/checklists`, {name: 'steps'}],
  ['checklists.update', {board: A, card: C, checklist: CHECK, name: 'renamed', pos: 4}, 'PUT', `/checklists/${CHECK}`, {name: 'renamed', pos: '4'}],
  ['checkitems.add', {board: A, card: C, checklist: CHECK, name: 'item', checked: false}, 'POST', `/checklists/${CHECK}/checkItems`, {name: 'item', checked: 'false'}],
  ['checkitems.update', {board: A, card: C, checklist: CHECK, item: ITEM, state: 'complete'}, 'PUT', `/cards/${C}/checkItem/${ITEM}`, {state: 'complete'}],
];
try {
  const denied = fakeTransport();
  for (const [op, args] of cases) await assert.rejects(run(f.store, op, args, denied), e => ['READ_ONLY', 'SCOPE'].includes(e.code));
  assert.equal(denied.calls.length, 0);
  configure(f.store, 'writes', 'on'); f.state(true, 'read-write');
  await assert.rejects(run(f.store, 'cards.move', cases[2][1], denied), {code: 'SCOPE'});
  assert.equal(denied.calls.length, 0); configure(f.store, 'allow', B);
  for (const [op, args, method, route, expected] of cases) {
    const fake = fakeTransport((r, o) => {
      if (o.method === 'GET') return;
      if (op.startsWith('cards.label.')) return Response.json(op.endsWith('.add') ? [LABEL] : {});
      if (op.startsWith('checkitems.')) return Response.json({id: ITEM, state: 'complete'});
      if (op.startsWith('checklists.')) return Response.json({id: CHECK, idBoard: A, idCard: C});
      if (op === 'comments.add') return Response.json({id: ITEM, data: {card: {id: C}, board: {id: A}}});
      return Response.json({id: C, idBoard: args.destinationBoard ?? A, idList: L});
    });
    const result = await run(f.store, op, args, fake);
    assert.equal(result.applied, true);
    const mutations = fake.calls.filter(c => c.method !== 'GET'); assert.equal(mutations.length, 1);
    assert.equal(mutations[0].method, method); assert.equal(mutations[0].route, route); assert.deepEqual(mutations[0].query, expected);
  }
  for (const [op, args] of [
    ['cards.delete', {board: A, card: C}], ['cards.update', {board: A, card: C, closed: true}],
    ['cards.create', {board: A, list: L, name: 'x', idCardSource: C}], ['checklists.remove', {board: A, card: C, checklist: CHECK}],
    ['checkitems.update', {board: A, card: C, checklist: CHECK, item: ITEM, state: 'yes'}], ['labels.create', {board: A, name: 'no'}],
    ['cards.update', {board: A, card: C, pos: -1}], ['cards.update', {board: A, card: C, due: 'tomorrow'}],
  ]) await assert.rejects(run(f.store, op, args, denied), {code: 'INPUT'});
  for (const [op, args] of [
    ['cards.label.add', {board: A, card: C, label: B}], ['checklists.update', {board: A, card: C, checklist: B, name: 'x'}],
    ['checkitems.update', {board: A, card: C, checklist: CHECK, item: B, state: 'complete'}],
  ]) { const fake = fakeTransport(); await assert.rejects(run(f.store, op, args, fake), {code: 'SCOPE'}); assert.ok(fake.calls.every(c => c.method === 'GET')); }
  const stale = fakeTransport((r, o, u, calls) => { if (calls.length === 2) f.state(false); });
  await assert.rejects(run(f.store, 'comments.add', cases[4][1], stale), {code: 'STALE'}); assert.ok(stale.calls.every(c => c.method === 'GET')); f.state(true, 'read-write');
  for (const failure of [() => { throw Error(credentials.token); }, () => new Response('bad JSON'), () => new Response('x'.repeat(2097153)), () => new Response('error', {status: 503}), () => new Promise(() => {})]) {
    const fake = fakeTransport((r, o) => o.method !== 'GET' ? failure() : undefined);
    const out = await execute(['comments', 'add', '--board', A, '--card', C], {store: f.store, ...fake, input: '{"text":"hello"}', timeout: 10, clock: () => 0}); // Isolate post-dispatch failure from preflight filesystem timing.
    assert.equal(out.result.error.code, 'UNKNOWN_WRITE'); assert.equal(out.result.error.outcome, 'unknown'); assert.equal(out.exit, 4);
    assert.equal(fake.calls.filter(c => c.method !== 'GET').length, 1); assert.ok(!JSON.stringify(out).includes(credentials.token));
  }
  const changed = fakeTransport((r, o) => { if (o.method !== 'GET') { f.state(false); return Response.json({id: ITEM}); } });
  await assert.rejects(run(f.store, 'comments.add', cases[4][1], changed), {code: 'WRITE_CHANGED'});
  assert.equal(changed.calls.filter(c => c.method !== 'GET').length, 1);
} finally { f.cleanup(); }
console.log('PASS: all Trello mutations, strict inputs/parent scope, single dispatch, no replay and truthful unknown outcomes');
