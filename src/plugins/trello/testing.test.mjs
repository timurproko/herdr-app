import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
export const {Store, security} = require('./credentials.cjs');
export const {setup, configure} = require('./setup.cjs');
export const A = 'a'.repeat(24), B = 'b'.repeat(24), C = 'c'.repeat(24), L = 'd'.repeat(24), LABEL = 'e'.repeat(24), CHECK = 'f'.repeat(24), ITEM = '1'.repeat(24);
export const credentials = {apiKey: 'FAKE_KEY_NOT_A_CREDENTIAL', token: 'FAKE_TOKEN_NOT_A_CREDENTIAL'};
export function fakeTransport(replace = () => undefined) {
  const calls = [];
  const transport = async (url, options) => {
    const u = new URL(url), route = u.pathname.slice(2);
    calls.push({method: options.method, route, query: Object.fromEntries([...u.searchParams].filter(([k]) => !['key', 'token'].includes(k))), options});
    const special = await replace(route, options, u, calls);
    if (special !== undefined) return special;
    const card = {id: C, idBoard: A, idList: L, name: 'Untrusted $(do not execute)', desc: 'hello', closed: false, labels: [{id: LABEL, name: 'ready', color: 'green'}], url: 'https://trello.com/c/FAKE/card'};
    const responses = {
      [`/boards/${A}`]: {id: A, name: 'Allowed', url: 'https://trello.com/b/FAKE/board'},
      [`/boards/${B}`]: {id: B, name: 'Second'},
      [`/boards/${A}/lists`]: [{id: L, idBoard: A, name: 'Todo', closed: false}],
      [`/boards/${B}/lists`]: [{id: L, idBoard: B, name: 'Other', closed: false}],
      [`/boards/${A}/cards`]: [card], [`/lists/${L}/cards`]: [card], [`/cards/${C}`]: card,
      [`/boards/${A}/labels`]: [{id: LABEL, idBoard: A, name: 'ready', color: 'green'}],
      [`/cards/${C}/actions`]: [{id: ITEM, type: 'commentCard', date: '2026-01-01', data: {board: {id: A}, card: {id: C}, text: 'untrusted comment'}}],
      [`/cards/${C}/attachments`]: [],
      [`/cards/${C}/checklists`]: [{id: CHECK, idBoard: A, idCard: C, name: 'Steps', checkItems: [{id: ITEM, name: 'one', state: 'incomplete'}]}],
    };
    if (options.method !== 'GET' || !Object.hasOwn(responses, route)) throw Error('Unfaked transport');
    return Response.json(responses[route]);
  };
  return {calls, transport};
}
// The fake ACL adapter allows portable transport tests; credentials.test also exercises real OS protection.
export function fixture({realSecurity = false} = {}) {
  const root = fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT || process.env.RUNNER_TEMP || os.tmpdir(), 'trello-'));
  const home = path.join(root, 'home');
  const store = new Store(home, realSecurity ? {} : {security: () => {}});
  setup(store, credentials); configure(store, 'allow', A);
  const state = (enabled = true, access = 'read-only') => fs.writeFileSync(path.join(home, 'shared.json'), JSON.stringify({'custom.plugins': {trello: {enabled, settings: {access}}}}));
  state();
  return {root, home, store, state, cleanup: () => fs.rmSync(root, {recursive: true, force: true})};
}
