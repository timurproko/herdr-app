'use strict';
const {id, exact, object} = require('./credentials.cjs');
const {authority} = require('./policy.cjs');
const {Client} = require('./client.cjs');
const {fail} = require('./errors.cjs');
const fields = 'name,desc,idBoard,idList,closed,due,start,dueComplete,pos,labels,url';
const definitions = {
  'boards.list': [], 'lists.list': ['board', 'filter'], 'cards.list': ['board', 'list', 'filter', 'limit', 'before'],
  'cards.get': ['board', 'card', 'limit', 'before'], 'labels.list': ['board', 'card'],
  'checklists.list': ['board', 'card'], 'checkitems.list': ['board', 'card', 'checklist'],
};
function validateArgs(op, args) {
  const allowed = definitions[op];
  if (!allowed || !exact(args, allowed)) fail('INPUT');
  if (op !== 'boards.list' && !id(args.board)) fail('INPUT');
  for (const key of ['card', 'list', 'checklist', 'before', 'item', 'label', 'destinationBoard']) if (key in args && !id(args[key])) fail('INPUT');
  if (['cards.get', 'checklists.list', 'checkitems.list'].includes(op) && !id(args.card)) fail('INPUT');
  if (op === 'checkitems.list' && !id(args.checklist)) fail('INPUT');
  if ('limit' in args && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)) fail('INPUT');
  if ('filter' in args && !['open', 'closed', 'all'].includes(args.filter)) fail('INPUT');
}
function record(v) { if (!object(v) || !id(v.id)) fail('RESPONSE'); return v; }
function array(v) { if (!Array.isArray(v)) fail('RESPONSE'); v.forEach(record); return v; }
function pick(v, keys) {
  record(v); const out = {id: v.id};
  for (const k of keys) if (Object.hasOwn(v, k)) {
    const x = v[k];
    if (x !== null && !['string', 'number', 'boolean'].includes(typeof x)) fail('RESPONSE');
    if (typeof x === 'string' && x.length > 131072) fail('RESPONSE');
    if (k === 'url') {
      try { const u = new URL(x); if (u.origin !== 'https://trello.com' || !/^\/[bc]\/[A-Za-z0-9]+(?:\/[^?#]*)?$/.test(u.pathname) || u.search || u.hash || u.username || u.password) continue; } catch { continue; }
    }
    out[k] = x;
  }
  return out;
}
function card(v, board) {
  record(v); if (v.idBoard !== board || !id(v.idList)) fail('SCOPE');
  const out = pick(v, fields.split(',').filter(k => k !== 'labels'));
  if (v.labels !== undefined) out.labels = array(v.labels).map(x => pick(x, ['name', 'color']));
  return out;
}
function page(rows, limit = 50, cursor = true) {
  array(rows); const items = rows.slice(0, limit), complete = rows.length < limit;
  return {items, complete, truncated: !complete, ...(cursor && !complete && items.length ? {nextBefore: items.at(-1).id} : {})};
}
class Scope {
  constructor(client) { this.client = client; }
  async lists(board) {
    const rows = array(await this.client.get(`/boards/${board}/lists`, {filter: 'all', fields: 'name,idBoard,closed,pos'}));
    if (rows.some(r => r.idBoard !== board)) fail('SCOPE'); return rows;
  }
  async list(board, target) { const row = (await this.lists(board)).find(r => r.id === target); if (!row) fail('SCOPE'); return row; }
  async card(board, target) {
    let before; const seen = new Set();
    for (let i = 0; i < 18; i++) {
      const rows = array(await this.client.get(`/boards/${board}/cards`, {filter: 'all', fields: 'idBoard,idList', limit: 100, ...(before ? {before} : {})}));
      if (rows.some(r => r.idBoard !== board || !id(r.idList))) fail('SCOPE');
      const row = rows.find(r => r.id === target); if (row) return row;
      if (rows.length < 100) break;
      before = rows.at(-1).id; if (seen.has(before)) break; seen.add(before);
    }
    fail('SCOPE');
  }
  async checklists(board, target) {
    await this.card(board, target);
    const rows = array(await this.client.get(`/cards/${target}/checklists`, {checkItems: 'all', filter: 'all', fields: 'all', checkItem_fields: 'name,pos,state'}));
    if (rows.some(r => r.idCard !== target || r.idBoard !== board)) fail('SCOPE');
    return rows.map(r => ({...pick(r, ['name', 'pos']), itemsComplete: array(r.checkItems).length < 100, itemsTruncated: r.checkItems.length >= 100, checkItems: r.checkItems.slice(0, 100).map(item => {
      if (!['complete', 'incomplete'].includes(item.state)) fail('RESPONSE');
      return pick(item, ['name', 'pos', 'state']);
    })}));
  }
}
async function readOperation(client, scope, op, a, gate) {
  const limit = a.limit ?? 50, paging = {limit, ...(a.before ? {before: a.before} : {})};
  if (op === 'boards.list') {
    const items = [];
    for (const board of gate.policy.boards.slice(0, 20)) {
      const row = record(await client.get(`/boards/${board}`, {fields: 'name,url,closed', actions: 'none', lists: 'none', cards: 'none', members: 'none', checklists: 'none'}));
      if (row.id !== board) fail('SCOPE'); items.push(pick(row, ['name', 'url', 'closed']));
    }
    return {items, complete: gate.policy.boards.length <= 20, truncated: gate.policy.boards.length > 20};
  }
  if (op === 'lists.list') return page((await scope.lists(a.board)).filter(r => (a.filter ?? 'open') === 'all' || r.closed === ((a.filter ?? 'open') === 'closed')).map(r => pick(r, ['name', 'idBoard', 'closed', 'pos'])), 100, false);
  if (op === 'cards.list') {
    if (a.list) await scope.list(a.board, a.list);
    const rows = array(await client.get(a.list ? `/lists/${a.list}/cards` : `/boards/${a.board}/cards`, {fields, filter: a.filter ?? 'open', ...paging}));
    if (a.list && rows.some(r => r.idList !== a.list)) fail('SCOPE');
    return page(rows.map(r => card(r, a.board)), limit);
  }
  if (op === 'labels.list') {
    if (a.card) { await scope.card(a.board, a.card); const row = await client.get(`/cards/${a.card}`, {fields: 'idBoard,idList,labels'}); card(row, a.board); if (row.id !== a.card) fail('SCOPE'); return page(array(row.labels).map(r => pick(r, ['name', 'color'])), 100, false); }
    const rows = array(await client.get(`/boards/${a.board}/labels`, {fields: 'name,color,idBoard', limit: 100}));
    if (rows.some(r => r.idBoard !== a.board)) fail('SCOPE');
    return page(rows.map(r => pick(r, ['name', 'color'])), 100, false);
  }
  if (op === 'cards.get') {
    await scope.card(a.board, a.card);
    const row = card(await client.get(`/cards/${a.card}`, {fields, attachments: false, members: false, checklists: 'none', actions: 'none', pluginData: false, stickers: false}), a.board);
    if (row.id !== a.card) fail('SCOPE');
    const comments = array(await client.get(`/cards/${a.card}/actions`, {filter: 'commentCard', ...paging})).map(r => {
      if (r.type !== 'commentCard' || r.data?.card?.id !== a.card || r.data?.board?.id !== a.board || typeof r.data.text !== 'string') fail('SCOPE');
      return {...pick(r, ['date']), text: r.data.text};
    });
    const checklists = await scope.checklists(a.board, a.card);
    return {card: row, comments: page(comments, limit), checklists: page(checklists, 100, false)};
  }
  const rows = await scope.checklists(a.board, a.card);
  if (op === 'checklists.list') return page(rows, 100, false);
  const checklist = rows.find(r => r.id === a.checklist); if (!checklist) fail('SCOPE');
  return page(checklist.checkItems, 100, false);
}
function redact(value, credentials) {
  return JSON.parse(JSON.stringify(value, (_, x) => typeof x === 'string' ? [credentials.apiKey, credentials.token].reduce((s, secret) => s.split(secret).join('[redacted]'), x) : x));
}
async function run(store, op, args = {}, options = {}) {
  validateArgs(op, args);
  const gate = authority(store, false, args.board ? [args.board] : []), client = new Client(store, gate, options);
  const data = await readOperation(client, new Scope(client), op, args, gate); gate.check();
  return redact({untrusted: true, ...data}, gate.credentials);
}
module.exports = {run, definitions, validateArgs, Scope, pick, array, card, page, redact};
