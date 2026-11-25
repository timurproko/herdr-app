import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {createRequire} from 'node:module';
const require = createRequire(import.meta.url);
export const {Store, security} = require('./credentials.cjs');
export const {setup, configure} = require('./setup.cjs');
export const A = 'a'.repeat(24), B = 'b'.repeat(24), C = 'c'.repeat(24), L = 'd'.repeat(24), LABEL = 'e'.repeat(24), CHECK = 'f'.repeat(24), ITEM = '1'.repeat(24);
export const credentials = {apiKey: 'FAKE_KEY_NOT_A_CREDENTIAL', token: 'FAKE_TOKEN_NOT_A_CREDENTIAL'};
// The fake ACL adapter allows portable transport tests; credentials.test also exercises real OS protection.
export function fixture({realSecurity = false} = {}) {
  const root = fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT || os.tmpdir(), 'trello-'));
  const home = path.join(root, 'home');
  const store = new Store(home, realSecurity ? {} : {security: () => {}});
  setup(store, credentials); configure(store, 'allow', A);
  const state = (enabled = true, access = 'read-only') => fs.writeFileSync(path.join(home, 'shared.json'), JSON.stringify({'custom.plugins': {trello: {enabled, settings: {access}}}}));
  state();
  return {root, home, store, state, cleanup: () => fs.rmSync(root, {recursive: true, force: true})};
}
