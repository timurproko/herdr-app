import assert from 'node:assert/strict';
import {RepositoryDisclosure, DISCLOSURE_KEY, LEGACY_FOLDS_KEY} from '../src/plugins/git/mod/repository-disclosure.js';

function storage(entries = {}) {
  const data = new Map(Object.entries(entries));
  return {data, writes: 0, getItem: key => data.get(key) ?? null,
    setItem(key, value) { this.writes++; data.set(key, value); }};
}
const saved = storage(), folds = new RepositoryDisclosure(saved);
assert.equal(folds.collapsed, false);
assert.equal(folds.has('owner/repo'), false);
folds.toggle('OWNER/Repo');
assert.equal(folds.has('owner/repo'), true);
assert.equal(folds.has('another/repo'), false);
assert.equal(folds.collapsed, false, 'Individual folds do not change the chosen global default');
folds.toggle('owner/repo');assert.equal(folds.exceptions.size, 0);
folds.toggle('hidden/repo');folds.toggleAll();
assert.equal(folds.collapsed, true);assert.equal(folds.exceptions.size, 0);
assert.equal(folds.has('unseen/repo'), true, 'The default covers future repositories, not only a visible set');
folds.toggle('owner/repo');assert.equal(folds.has('owner/repo'), false);
assert.equal(folds.has('hidden/repo'), true);assert.equal(folds.collapsed, true);
let restarted = new RepositoryDisclosure(saved);
assert.equal(restarted.collapsed, true);assert.equal(restarted.has('OWNER/REPO'), false);
assert.equal(restarted.has('unseen/repo'), true);
restarted.toggleAll();assert.equal(restarted.collapsed, false);
assert.equal(restarted.has('owner/repo'), false);assert.equal(restarted.has('hidden/repo'), false);
assert.equal(folds.sync(), true, 'Retained views reconcile newer persisted choices');
assert.equal(folds.collapsed, false);assert.equal(folds.sync(), false);
assert.equal(new RepositoryDisclosure(saved).exceptions.size, 0);
console.log('PASS global default, canonical individual exceptions, hidden/unseen repositories, bulk reset, retained views and restart');

for (const raw of [null, '{broken', JSON.stringify({version: 9, collapsed: true, exceptions: []}), JSON.stringify({version: 1, collapsed: 'yes', exceptions: []})]) {
  const old = storage({[LEGACY_FOLDS_KEY]: JSON.stringify(['OWNER/Repo', null, 12, '']), ...(raw === null ? {} : {[DISCLOSURE_KEY]: raw})});
  const migrated = new RepositoryDisclosure(old);
  assert.equal(migrated.collapsed, false);assert.equal(migrated.has('owner/repo'), true);
  assert.equal(migrated.has('other/repo'), false);assert.equal(old.writes, 0, 'Restoration never rewrites malformed or future-version data');
  assert.equal(old.getItem(DISCLOSURE_KEY), raw);
  migrated.toggleAll();migrated.toggleAll();
  assert.equal(new RepositoryDisclosure(old).has('owner/repo'), false, 'Legacy folds cannot reappear after an explicit new-format save');
  assert.equal(old.getItem(LEGACY_FOLDS_KEY), JSON.stringify(['OWNER/Repo', null, 12, '']));
}
for (const legacy of ['{broken', '{}', 'null']) assert.equal(new RepositoryDisclosure(storage({[LEGACY_FOLDS_KEY]: legacy})).has('owner/repo'), false);
const refused = storage();refused.setItem = () => { throw Error('refused'); };
const memory = new RepositoryDisclosure(refused);memory.toggleAll();memory.sync();memory.toggle('owner/repo');memory.sync();
assert.equal(memory.collapsed, true);assert.equal(memory.has('owner/repo'), false);assert.equal(memory.has('new/repo'), true);
assert.equal(new RepositoryDisclosure(refused).collapsed, false, 'Restart persistence requires writable local storage');
const inaccessible = new RepositoryDisclosure({getItem() { throw Error('refused'); }, setItem() { throw Error('refused'); }});
inaccessible.toggleAll();inaccessible.sync();assert.equal(inaccessible.has('new/repo'), true);
const stale = new RepositoryDisclosure(saved), latest = new RepositoryDisclosure(saved);
latest.toggleAll();stale.toggle('one/repo');
assert.equal(stale.collapsed, true, 'A stale writer first adopts the current default');
assert.equal(stale.has('one/repo'), false);assert.equal(stale.has('new/repo'), true);
console.log('PASS legacy migration, malformed/unknown versions, read/write refusal, unsaved memory and stale writer reconciliation');
