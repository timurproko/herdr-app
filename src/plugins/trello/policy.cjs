'use strict';
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const {id, safePath} = require('./credentials.cjs');
const {fail} = require('./errors.cjs');
function state(store) {
  try {
    const file = path.join(store.home, 'shared.json'); safePath(file);
    const s = fs.statSync(file); if (!s.isFile() || s.size > 16777216) fail('PUBLIC_STATE_INVALID');
    const plugin = JSON.parse(fs.readFileSync(file, 'utf8'))['custom.plugins']?.trello;
    if (!plugin) return {enabled: false, access: 'read-only'};
    if (typeof plugin.enabled !== 'boolean') fail('PUBLIC_STATE_INVALID');
    const access = plugin.settings?.access ?? 'read-only';
    if (!['read-only', 'read-write'].includes(access)) fail('PUBLIC_STATE_INVALID');
    return {enabled: plugin.enabled, access};
  } catch { fail('PUBLIC_STATE_INVALID'); }
}
const fingerprint = value => crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
function authority(store, write = false, boards = []) {
  const current = () => {
    const publicState = state(store); if (!publicState.enabled) fail('DISABLED');
    const policy = store.read('policy');
    if (boards.some(board => !id(board) || !policy.boards.includes(board))) fail('SCOPE');
    if (write && (!policy.allowWrites || publicState.access !== 'read-write')) fail('READ_ONLY');
    const credentials = store.read('credentials');
    return {publicState, policy, credentials};
  };
  const initial = current(), key = fingerprint(initial);
  return {...initial, check() {
    let next; try { next = current(); } catch { fail('STALE'); }
    if (fingerprint(next) !== key) fail('STALE');
  }};
}
module.exports = {state, authority};
