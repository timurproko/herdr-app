'use strict';
const {validate, id, exact} = require('./credentials.cjs');
const {fail, publicError} = require('./errors.cjs');
const defaultPolicy = () => ({version: 1, boards: [], allowWrites: false});
function setup(store, input, rotate = false) {
  if (!exact(input, ['apiKey', 'token'])) fail('INPUT');
  let value; try { value = validate('credentials', {version: 1, ...input}); } catch { fail('INPUT'); }
  store.directory(true);
  const old = store.read('credentials', true);
  if ((old !== null) !== rotate) fail('CONFLICT');
  // Validate existing policy before replacing credentials; never silently repair it.
  const policy = store.read('policy', true), display = store.read('display', true);
  store.withLock(() => {
    if (JSON.stringify(store.read('credentials', true)) !== JSON.stringify(old)) fail('CONFLICT');
    if (rotate || !policy) store.write('policy', defaultPolicy(), policy);
    if (display) store.remove('display', display);
    store.write('credentials', value, old);
  });
  return {configured: true, rotated: rotate};
}
function configure(store, action, value) {
  store.directory(true); const old = store.read('policy', true), next = structuredClone(old || defaultPolicy());
  if (action === 'allow' || action === 'remove') {
    if (!id(value)) fail('INPUT');
    next.boards = action === 'allow' ? [...new Set([...next.boards, value])] : next.boards.filter(b => b !== value);
  } else if (action === 'writes' && ['on', 'off'].includes(value)) next.allowWrites = value === 'on';
  else fail('INPUT');
  store.write('policy', next, old); return next;
}
function status(store) {
  try {
    store.read('credentials'); const p = store.read('policy');
    return {configured: true, storage: 'ready', allowedBoards: p.boards.length, localWrites: p.allowWrites};
  } catch (e) {
    const problem = publicError(e);
    if (problem.code === 'STORE_MISSING') return {configured: false, storage: 'missing', problem};
    throw e; // A check that failed is not absent setup.
  }
}
module.exports = {setup, configure, status};
