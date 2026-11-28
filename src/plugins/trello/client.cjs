'use strict';
const {TrelloError, fail, providerReason} = require('./errors.cjs');
const ID = '[a-f0-9]{24}';
// Transport is private to typed operations. No request/URL command is exposed.
const routes = [
  ['GET', new RegExp(`^/boards/${ID}$`), ['fields', 'actions', 'lists', 'cards', 'members', 'checklists']],
  ['GET', new RegExp(`^/boards/${ID}/lists$`), ['fields', 'filter']],
  ['GET', new RegExp(`^/boards/${ID}/cards$`), ['fields', 'filter', 'sort', 'limit', 'before']],
  ['GET', new RegExp(`^/boards/${ID}/labels$`), ['fields', 'limit']],
  ['GET', new RegExp(`^/lists/${ID}/cards$`), ['fields', 'filter', 'sort', 'limit', 'before']],
  ['GET', new RegExp(`^/cards/${ID}$`), ['fields', 'attachments', 'members', 'checklists', 'actions', 'pluginData', 'stickers']],
  ['GET', new RegExp(`^/cards/${ID}/actions$`), ['filter', 'limit', 'before']],
  ['GET', new RegExp(`^/cards/${ID}/attachments$`), ['fields', 'filter']],
  ['GET', new RegExp(`^/cards/${ID}/attachments/${ID}$`), ['fields']],
  ['GET', new RegExp(`^/cards/${ID}/checklists$`), ['checkItems', 'filter', 'fields', 'checkItem_fields']],
  ['POST', /^\/cards$/, ['idList', 'name', 'desc', 'due', 'start', 'dueComplete', 'pos']],
  ['PUT', new RegExp(`^/cards/${ID}$`), ['name', 'desc', 'due', 'start', 'dueComplete', 'pos', 'idList', 'idBoard', 'closed']],
  ['POST', new RegExp(`^/cards/${ID}/actions/comments$`), ['text']],
  ['POST', new RegExp(`^/cards/${ID}/idLabels$`), ['value']],
  ['DELETE', new RegExp(`^/cards/${ID}/idLabels/${ID}$`), []],
  ['POST', new RegExp(`^/cards/${ID}/checklists$`), ['name', 'pos']],
  ['PUT', new RegExp(`^/checklists/${ID}$`), ['name', 'pos']],
  ['POST', new RegExp(`^/checklists/${ID}/checkItems$`), ['name', 'pos', 'checked']],
  ['PUT', new RegExp(`^/cards/${ID}/checkItem/${ID}$`), ['name', 'pos', 'state']],
];
const nowMs = () => Date.now();
async function jsonResponse(response) {
  const chunks = []; let size = 0;
  if (!response.body || typeof response.body[Symbol.asyncIterator] !== 'function') fail('RESPONSE');
  for await (const chunk of response.body) {
    size += chunk.byteLength; if (size > 2097152) fail('RESPONSE'); chunks.push(Buffer.from(chunk));
  }
  try { return JSON.parse(Buffer.concat(chunks).toString('utf8')); } catch { fail('RESPONSE'); }
}
function cancelBody(body) {
  // Cleanup is best effort; cancellation itself must never hold the command open.
  try { Promise.resolve(body?.cancel()).catch(() => {}); } catch {}
}
async function rejectionReason(response, credentials) {
  if (!response.body?.getReader) return;
  const reader = response.body.getReader(); let timer;
  const read = async () => {
    const chunks = []; let size = 0;
    for (;;) {
      const {done, value} = await reader.read();
      if (done) return providerReason(Buffer.concat(chunks).toString('utf8'), credentials);
      size += value.byteLength;
      if (size > 4096) return; // Never interpret a truncated body as a complete reason.
      chunks.push(Buffer.from(value));
    }
  };
  try {
    // Diagnostics get a small sub-budget, not a fresh remote-read timeout.
    return await Promise.race([read(), new Promise(resolve => { timer = setTimeout(resolve, 200); })]);
  } catch { return; }
  finally {
    clearTimeout(timer);
    try { Promise.resolve(reader.cancel()).catch(() => {}); } catch {}
    try { reader.releaseLock(); } catch {}
  }
}
function retryTime(headers, now) {
  const retry = headers.get('retry-after');
  let until = /^\d+(?:\.\d+)?$/.test(retry || '') ? Math.min(Number.MAX_SAFE_INTEGER, now + Math.ceil(Number(retry) * 1000)) : Date.parse(retry || '');
  const intervals = ['x-rate-limit-api-key-interval-ms', 'x-rate-limit-api-token-interval-ms'].map(k => Number(headers.get(k))).filter(n => Number.isFinite(n) && n > 0);
  until = Math.max(now + 10000, ...intervals.map(n => now + n), Number.isFinite(until) ? until : now + 60000);
  return Math.min(Number.MAX_SAFE_INTEGER, Math.ceil(until));
}
function mergeCooldown(store, deadline) {
  // The store's expected-value write is atomic under config.lock. Every lost
  // CAS must re-read; never acknowledge a deadline which was not persisted.
  for (let attempt = 0; attempt < 8; attempt++) {
    const old = store.read('cooldown', true), retryAt = Math.max(old?.retryAt || 0, deadline);
    try { store.write('cooldown', {version: 1, retryAt}, old); return retryAt; }
    catch (e) { if (e.code !== 'CONFLICT') throw e; }
  }
  fail('STORE_BUSY'); // Bounded local contention refusal, never an HTTP replay.
}
class Client {
  constructor(store, gate, {transport = globalThis.fetch, now = nowMs, timeout = 20000, routeRules = routes} = {}) {
    this.store = store; this.gate = gate; this.transport = transport; this.now = now; this.timeout = timeout;
    this.started = now(); this.count = 0; this.writes = 0; this.routes = routeRules;
  }
  async request(method, route, query = {}) {
    const rule = this.routes.find(([m, re]) => method === m && re.test(route));
    if (!rule || Object.keys(query).some(k => !rule[2].includes(k))) fail('INPUT');
    const url = new URL('https://api.trello.com/1' + route);
    for (const [k, v] of Object.entries(query)) url.searchParams.set(k, String(v));
    url.searchParams.set('key', this.gate.credentials.apiKey); url.searchParams.set('token', this.gate.credentials.token);
    return this.exchange(method, url, jsonResponse, {Accept: 'application/json'});
  }
  check() {
    this.gate.check();
    if (this.now() - this.started >= 60000) fail('LIMIT');
  }
  async download(url, card, attachment, consume) {
    // This method is private to the typed attachment command, never a CLI URL flag.
    const {downloadUrl} = require('./attachments.cjs');
    downloadUrl(url, card, attachment);
    const {apiKey, token} = this.gate.credentials;
    return this.exchange('GET', new URL(url), consume, {Authorization: `OAuth oauth_consumer_key="${encodeURIComponent(apiKey)}", oauth_token="${encodeURIComponent(token)}"`});
  }
  async exchange(method, url, consume, headers) {
    this.check();
    const cooldown = this.store.read('cooldown', true);
    if (cooldown?.retryAt > this.now()) throw new TrelloError('RATE_LIMIT', {retryAt: cooldown.retryAt});
    if (++this.count > 20) fail('LIMIT');
    const write = method !== 'GET';
    if (write && ++this.writes !== 1) fail('INPUT');
    const controller = new AbortController(); let timer, dispatched = false, rejection;
    const work = async () => {
      // Last authority check immediately precedes the only dispatch.
      this.gate.check();
      if (this.now() - this.started >= 60000) fail('LIMIT');
      dispatched = true;
      const response = await this.transport(url, {method, redirect: 'manual', signal: controller.signal, headers});
      if (response.status < 200 || response.status >= 300) {
        const code = response.status === 429 ? 'RATE_LIMIT' : write && (response.status >= 500 || response.status < 400) ? 'UNKNOWN_WRITE' : ({401: 'AUTH', 403: 'FORBIDDEN', 404: 'NOT_FOUND'})[response.status] || 'REMOTE';
        rejection = new TrelloError(code, {httpStatus: response.status});
        // Persist rate refusal before optional diagnostic parsing.
        if (response.status === 429) rejection.retryAt = mergeCooldown(this.store, retryTime(response.headers, this.now()));
        rejection.providerReason = await rejectionReason(response, this.gate.credentials);
        cancelBody(response.body);
        throw rejection;
      }
      const value = await consume(response, controller.signal);
      if (controller.signal.aborted) fail('TRANSPORT');
      try { this.check(); } catch (e) { if (write) fail('WRITE_CHANGED'); throw e; }
      return value;
    };
    try {
      return await Promise.race([work(), new Promise((_, reject) => {
        timer = setTimeout(() => { controller.abort(); reject(rejection || new TrelloError('TRANSPORT')); }, Math.min(this.timeout, 60000 - (this.now() - this.started)));
      })]);
    } catch (e) {
      if (write && dispatched && (!(e instanceof TrelloError) || (['TRANSPORT', 'RESPONSE', 'INTERNAL'].includes(e.code) || e.code.startsWith('STORE')))) fail('UNKNOWN_WRITE');
      if (e instanceof TrelloError) throw e; fail('TRANSPORT');
    }
    finally { clearTimeout(timer); controller.abort(); }
  }
  get(route, query) { return this.request('GET', route, query); }
}
module.exports = {Client, routes, retryTime};
