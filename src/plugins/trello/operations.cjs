'use strict';
const {id, exact, object} = require('./credentials.cjs');
const {authority} = require('./policy.cjs');
const {Client} = require('./client.cjs');
const {fail, Deadline} = require('./errors.cjs');
const {listAttachments} = require('./attachments.cjs');
const fields = 'name,desc,idBoard,idList,closed,due,start,dueComplete,pos,labels,url';
const cardFields = ['name', 'desc', 'due', 'start', 'dueComplete', 'pos'];
const definitions = {
  'boards.list': ['before'], 'lists.list': ['board', 'filter'], 'cards.list': ['board', 'list', 'filter', 'limit', 'before'],
  'cards.get': ['board', 'card', 'limit', 'before'], 'labels.list': ['board', 'card'],
  'attachments.list': ['board', 'card'],
  'attachments.get': ['board', 'card', 'attachment', 'out', 'previewWidth', 'allowOtherTypes'],
  'checklists.list': ['board', 'card'], 'checkitems.list': ['board', 'card', 'checklist'],
  'cards.create': ['board', 'list', ...cardFields], 'cards.update': ['board', 'card', ...cardFields],
  'cards.move': ['board', 'card', 'list', 'destinationBoard', 'pos'], 'cards.archive': ['board', 'card'],
  'comments.add': ['board', 'card', 'text'], 'cards.label.add': ['board', 'card', 'label'], 'cards.label.remove': ['board', 'card', 'label'],
  'checklists.add': ['board', 'card', 'name', 'pos'], 'checklists.update': ['board', 'card', 'checklist', 'name', 'pos'],
  'checkitems.add': ['board', 'card', 'checklist', 'name', 'pos', 'checked'],
  'checkitems.update': ['board', 'card', 'checklist', 'item', 'name', 'pos', 'state'],
};
const writes = new Set(['cards.create', 'cards.update', 'cards.move', 'cards.archive', 'comments.add', 'cards.label.add', 'cards.label.remove', 'checklists.add', 'checklists.update', 'checkitems.add', 'checkitems.update']);
function validateArgs(op, args) {
  const allowed = definitions[op];
  if (!allowed || !exact(args, allowed)) fail('INPUT');
  if (op !== 'boards.list' && !id(args.board)) fail('INPUT');
  for (const key of ['card', 'list', 'checklist', 'before', 'item', 'label', 'destinationBoard', 'attachment']) if (key in args && !id(args[key])) fail('INPUT');
  if (['cards.get', 'checklists.list', 'checkitems.list', 'attachments.list', 'attachments.get'].includes(op) && !id(args.card)) fail('INPUT');
  if (op === 'checkitems.list' && !id(args.checklist)) fail('INPUT');
  if (op === 'attachments.get' && (!id(args.attachment) || typeof args.out !== 'string' || !args.out.trim() || args.out.length > 4096 || /[\u0000-\u001f\u007f]/.test(args.out))) fail('INPUT');
  if ('previewWidth' in args && (!Number.isInteger(args.previewWidth) || args.previewWidth < 1 || args.previewWidth > 16384)) fail('INPUT');
  if ('allowOtherTypes' in args && typeof args.allowOtherTypes !== 'boolean') fail('INPUT');
  if ('limit' in args && (!Number.isInteger(args.limit) || args.limit < 1 || args.limit > 100)) fail('INPUT');
  if ('filter' in args && !['open', 'closed', 'all'].includes(args.filter)) fail('INPUT');
  if (writes.has(op)) {
    if (op !== 'cards.create' && !id(args.card)) fail('INPUT');
    if (['cards.create', 'cards.move'].includes(op) && !id(args.list)) fail('INPUT');
    if ((op.startsWith('checkitems.') || op === 'checklists.update') && !id(args.checklist)) fail('INPUT');
    if (op === 'checkitems.update' && !id(args.item)) fail('INPUT');
    if (op.startsWith('cards.label.') && !id(args.label)) fail('INPUT');
    for (const key of ['name', 'desc', 'text']) if (key in args && (typeof args[key] !== 'string' || args[key].includes('\u0000') || args[key].length > (key === 'name' ? 16384 : 131072) || (key !== 'desc' && !args[key].trim()))) fail('INPUT');
    if (['cards.create', 'checklists.add', 'checkitems.add'].includes(op) && !args.name?.trim()) fail('INPUT');
    if (op === 'comments.add' && !args.text?.trim()) fail('INPUT');
    for (const key of ['due', 'start']) if (key in args && args[key] !== null && (typeof args[key] !== 'string' || !/^\d{4}-\d{2}-\d{2}T/.test(args[key]) || !Number.isFinite(Date.parse(args[key])))) fail('INPUT');
    for (const key of ['dueComplete', 'checked']) if (key in args && typeof args[key] !== 'boolean') fail('INPUT');
    if ('pos' in args && !['top', 'bottom'].includes(args.pos) && !(typeof args.pos === 'number' && Number.isFinite(args.pos) && args.pos > 0)) fail('INPUT');
    if ('state' in args && !['complete', 'incomplete'].includes(args.state)) fail('INPUT');
    if (op.endsWith('.update') && !definitions[op].some(k => !['board', 'card', 'checklist', 'item'].includes(k) && Object.hasOwn(args, k))) fail('INPUT');
  }
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
      const rows = array(await this.client.get(`/boards/${board}/cards`, {filter: 'all', fields: 'idBoard,idList', sort: '-id', limit: 100, ...(before ? {before} : {})}));
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
    const items = [], start = a.before ? gate.policy.boards.indexOf(a.before) + 1 : 0;
    if (a.before && !start) fail('SCOPE');
    const selected = gate.policy.boards.slice(start, start + 20);
    for (const board of selected) {
      const row = record(await client.get(`/boards/${board}`, {fields: 'name,url,closed', actions: 'none', lists: 'none', cards: 'none', members: 'none', checklists: 'none'}));
      if (row.id !== board) fail('SCOPE'); items.push(pick(row, ['name', 'url', 'closed']));
    }
    const complete = start + selected.length >= gate.policy.boards.length;
    return {items, complete, truncated: !complete, ...(!complete ? {nextBefore: selected.at(-1)} : {})};
  }
  if (op === 'lists.list') return page((await scope.lists(a.board)).filter(r => (a.filter ?? 'open') === 'all' || r.closed === ((a.filter ?? 'open') === 'closed')).map(r => pick(r, ['name', 'idBoard', 'closed', 'pos'])), 100, false);
  if (op === 'cards.list') {
    if (a.list) await scope.list(a.board, a.list);
    const rows = array(await client.get(a.list ? `/lists/${a.list}/cards` : `/boards/${a.board}/cards`, {fields, filter: a.filter ?? 'open', sort: '-id', ...paging}));
    if (a.list && rows.some(r => r.idList !== a.list)) fail('SCOPE');
    return page(rows.map(r => card(r, a.board)), limit);
  }
  if (op === 'labels.list') {
    if (a.card) { await scope.card(a.board, a.card); const row = await client.get(`/cards/${a.card}`, {fields: 'idBoard,idList,labels'}); card(row, a.board); if (row.id !== a.card) fail('SCOPE'); return page(array(row.labels).map(r => pick(r, ['name', 'color'])), 100, false); }
    const rows = array(await client.get(`/boards/${a.board}/labels`, {fields: 'name,color,idBoard', limit: 100}));
    if (rows.some(r => r.idBoard !== a.board)) fail('SCOPE');
    return page(rows.map(r => pick(r, ['name', 'color'])), 100, false);
  }
  if (op === 'attachments.list') return listAttachments(client, scope, a.board, a.card);
  if (op === 'attachments.get') return require('./download.cjs').downloadAttachment(client, scope, a);
  if (op === 'cards.get') {
    await scope.card(a.board, a.card);
    // Nested resources default off; fetch each through its scoped typed route.
    const row = card(await client.get(`/cards/${a.card}`, {fields}), a.board);
    if (row.id !== a.card) fail('SCOPE');
    const comments = array(await client.get(`/cards/${a.card}/actions`, {filter: 'commentCard', ...paging})).map(r => {
      if (r.type !== 'commentCard' || r.data?.card?.id !== a.card || !id(r.data?.board?.id) || typeof r.data.text !== 'string') fail('SCOPE');
      return {...pick(r, ['date']), text: r.data.text};
    });
    const checklists = await scope.checklists(a.board, a.card);
    const attachments = await listAttachments(client, scope, a.board, a.card, row);
    return {card: {...row, attachmentIds: attachments.items.map(r => r.id), attachmentCount: attachments.count, attachmentCountExact: attachments.countExact},
      comments: page(comments, limit), checklists: page(checklists, 100, false), attachments};
  }
  const rows = await scope.checklists(a.board, a.card);
  if (op === 'checklists.list') return page(rows, 100, false);
  const checklist = rows.find(r => r.id === a.checklist); if (!checklist) fail('SCOPE');
  return page(checklist.checkItems, 100, false);
}
async function writeOperation(client, scope, op, a) {
  let method = 'POST', route, query = {}, destination = a.destinationBoard ?? a.board;
  const copy = keys => Object.fromEntries(keys.filter(k => Object.hasOwn(a, k)).map(k => [k, a[k]]));
  if (op === 'cards.create') {
    await scope.list(a.board, a.list); route = '/cards'; query = {idList: a.list, ...copy(cardFields)};
  } else {
    await scope.card(a.board, a.card);
    if (op === 'cards.update') { method = 'PUT'; route = `/cards/${a.card}`; query = copy(cardFields); }
    if (op === 'cards.archive') { method = 'PUT'; route = `/cards/${a.card}`; query = {closed: true}; }
    if (op === 'cards.move') {
      await scope.list(destination, a.list); method = 'PUT'; route = `/cards/${a.card}`;
      query = {idList: a.list, ...(destination !== a.board ? {idBoard: destination} : {}), ...copy(['pos'])};
    }
    if (op === 'comments.add') { route = `/cards/${a.card}/actions/comments`; query = {text: a.text}; }
    if (op.startsWith('cards.label.')) {
      const labels = array(await client.get(`/boards/${a.board}/labels`, {fields: 'name,color,idBoard', limit: 100}));
      if (labels.some(r => r.idBoard !== a.board) || !labels.some(r => r.id === a.label)) fail('SCOPE');
      route = `/cards/${a.card}/idLabels`; query = {value: a.label};
      if (op.endsWith('.remove')) { method = 'DELETE'; route += '/' + a.label; query = {}; }
    }
    if (op === 'checklists.add') { route = `/cards/${a.card}/checklists`; query = copy(['name', 'pos']); }
    if (op === 'checklists.update' || op.startsWith('checkitems.')) {
      const checklists = await scope.checklists(a.board, a.card), checklist = checklists.find(r => r.id === a.checklist);
      if (!checklist) fail('SCOPE');
      if (op === 'checklists.update') { method = 'PUT'; route = `/checklists/${a.checklist}`; query = copy(['name', 'pos']); }
      if (op === 'checkitems.add') { route = `/checklists/${a.checklist}/checkItems`; query = copy(['name', 'pos', 'checked']); }
      if (op === 'checkitems.update') {
        if (!checklist.checkItems.some(r => r.id === a.item)) fail('SCOPE');
        method = 'PUT'; route = `/cards/${a.card}/checkItem/${a.item}`; query = copy(['name', 'pos', 'state']);
      }
    }
  }
  // Re-prove minimal source/destination membership immediately before dispatch.
  if (a.card) await scope.card(a.board, a.card);
  if (a.list) await scope.list(destination, a.list);
  const response = await client.request(method, route, query);
  try {
    if (op.startsWith('cards.') && !op.startsWith('cards.label.')) {
      card(response, destination);
      if (a.card && response.id !== a.card || a.list && response.idList !== a.list) fail('SCOPE');
    } else if (op === 'comments.add') {
      record(response); if (response.data?.card?.id !== a.card || response.data?.board?.id !== a.board) fail('SCOPE');
    } else if (op.startsWith('checklists.')) {
      record(response);
      if (response.idCard !== a.card || response.idBoard !== a.board || a.checklist && response.id !== a.checklist) fail('SCOPE');
    } else if (op.startsWith('checkitems.')) {
      record(response); if (a.item && response.id !== a.item) fail('SCOPE');
    } else if (!object(response) && !Array.isArray(response)) fail('RESPONSE');
  } catch { fail('UNKNOWN_WRITE'); }
  // Never forward raw mutation replies, descriptions or auth echoes.
  return {applied: true, operation: op, board: destination, ...(a.card ? {card: a.card} : {}), ...(id(response?.id) ? {resourceId: response.id} : {})};
}
function redact(value, credentials) {
  return JSON.parse(JSON.stringify(value, (_, x) => typeof x === 'string' ? [credentials.apiKey, credentials.token].reduce((s, secret) => s.split(secret).join('[redacted]'), x) : x));
}
async function run(store, op, args = {}, options = {}) {
  const budget = options.budget || new Deadline(options.commandTimeout ?? 60000, options.clock);
  budget.check();
  if (store.withBudget) store = store.withBudget(budget);
  validateArgs(op, args);
  const write = writes.has(op), boards = args.board ? [...new Set([args.board, ...(args.destinationBoard ? [args.destinationBoard] : [])])] : [];
  const gate = authority(store, write, boards), client = new Client(store, gate, {...options, budget});
  const data = write ? await writeOperation(client, new Scope(client), op, args) : await readOperation(client, new Scope(client), op, args, gate);
  // Attachment publication already performs its final check inside protected output;
  // no asynchronous step or second authority read may orphan its successful file.
  try { if (op !== 'attachments.get') client.check(); } catch (e) { if (write) fail('WRITE_CHANGED'); throw e; }
  return redact({untrusted: true, ...data}, gate.credentials);
}
module.exports = {run, definitions, writes, validateArgs, Scope, pick, array, card, page, redact};
