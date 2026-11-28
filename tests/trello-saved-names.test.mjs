import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
import {formsHarness, words} from './support/plugin-forms.mjs';
const require = createRequire(import.meta.url);
const {Store} = require('../src/plugins/trello/credentials.cjs');
const {execute} = require('../src/plugins/trello/owner.cjs');
const {setup, configure} = require('../src/plugins/trello/setup.cjs');
const root = fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT || process.env.RUNNER_TEMP || os.tmpdir(), 'trello-saved-names-'));
const store = new Store(path.join(root, 'home'), {security: () => {}});
const A = 'a'.repeat(24), B = 'b'.repeat(24);
const credentials = {apiKey: 'FAKE_NAME_KEY_NOT_REAL', token: 'FAKE_NAME_TOKEN_NOT_REAL'};
const binding = {id:'fake-core', session:'fake-session', principal:'a'.repeat(64), home:'b'.repeat(64)};
let boards = [{id:A, name:'ai-factory', closed:false}, {id:B, name:'xrbuild', closed:true}];
let mode = 'normal', held, network = [], actions = [];
const transport = async url => {
  const route = new URL(url).pathname;
  network.push(route);
  if (mode === 'offline') throw Error('fake offline provider');
  if (mode === 'hold' && route.endsWith('/boards')) return new Promise(resolve => { held = resolve; });
  return Response.json(route.endsWith('/boards') ? boards : {id:A, username:'fake-user', fullName:'Saved owner 🐑'});
};
const status = () => execute({action:'status'}, {store, transport});
async function open({expanded = false, settled = true} = {}) {
  const h = await formsHarness({checking:() => false, appHome:() => store.home, exec:async (_p, args) => {
    if(args.includes('--discovery-all'))return {code:0,stdout:JSON.stringify({ok:true,data:{pending:[]}})};
    const result = args.includes('--status') ? await status() : args.includes('--probe')
      ? {ok:true, data:{runtime:'ready', destination:binding}}
      : {port:12345, session:'f'.repeat(64), expires:Date.now()+59000};
    return {code:0, stdout:JSON.stringify(result)};
  }}, null, {websocket:{WebSocket:{connect:async () => {
    let payload;
    return {write:async text => {payload = JSON.parse(text).payload;},
      read:async () => {actions.push(payload.action); return JSON.stringify(await execute(payload, {store, transport}));}, close:async () => {}};
  }}}});
  const p = h.registry.pluginById('trello');
  h.registry.setPluginEnabled(p, true);
  h.ui.initPlugins(h.view, h.cx, 'trello');
  h.view.pluginOpen['trello-requirements'] = true;
  h.view.pluginOpen['trello-boards'] = expanded;
  h.ui.reloadPlugins(h.view, h.cx, 'trello');
  if (settled) await h.flush();
  return h;
}
const labels = h => Array.from(h.view.pluginChecks.trello.items.find(i => i.id === 'boards').rows, r => r.label);
const expectedLabels = () => boards.map(b => b.name);
async function pendingRefresh(h) {
  held = null; mode = 'hold';
  h.click('st-plugin-refresh-trello-boards');
  const job = h.jobs.shift()(h.cx);
  for (let i=0; i<300 && !held; i++) await Promise.resolve();
  assert.ok(held, 'Name request reached the injected provider');
  return {job, release:held};
}
try {
  setup(store, credentials); configure(store, 'allow', A); configure(store, 'allow', B);
  const first = await open();
  assert.equal(network.length, 0, 'Closed card status remains local');
  first.click('st-plugin-trello-recheck'); await first.flush();
  assert.equal(network.length, 2, 'Requirements Check reads account and boards once');
  assert.deepEqual(labels(first), expectedLabels());
  const policyBefore = store.read('policy'), credentialsBefore = store.read('credentials');

  boards = [{id:B, name:'xr', closed:true}, {id:A, name:'ai', closed:false}];
  network = []; actions = [];
  first.click('st-plugin-trello-boards-toggle'); await first.flush();
  assert.deepEqual(labels(first), ['ai','xr'], 'Opening refreshes existing hints by ID, not inventory order');
  assert.deepEqual(network, ['/1/members/me/boards']); assert.deepEqual(actions, ['discover']);
  assert.equal(first.view.pluginChecks.trello.items.find(i => i.id === 'local-setup').revision,
    first.view.pluginChecks.trello.items.find(i => i.id === 'boards').revision, 'Renamed hints refresh account-action revisions without another provider read');
  assert.ok(words(first.render()).includes('Saved owner 🐑'));
  assert.ok(!words(first.render()).includes('ai-factory'));
  assert.equal(first.view.pluginChecks.trello.items.find(i => i.id === 'boards').detail, null);

  network = [];
  first.click('st-plugin-trello-boards-toggle'); await first.flush();
  assert.equal(network.length, 0, 'Collapsing starts no read');
  boards = [{id:A, name:'ai 🐑', closed:false}, {id:B, name:'xr 🐑', closed:true}];
  first.click('st-plugin-refresh-trello-boards'); await first.flush();
  assert.deepEqual(labels(first), expectedLabels(), 'Boards Check refreshes even while collapsed');
  assert.deepEqual(network, ['/1/members/me/boards'], 'Board-only Check does not verify the account');
  first.click('st-plugin-trello-boards-toggle'); await first.flush();

  boards[0].name = 'ai checked'; network = [];
  first.click('st-plugin-trello-recheck'); await first.flush();
  assert.deepEqual(labels(first), expectedLabels());
  assert.deepEqual(network, ['/1/members/me','/1/members/me/boards'], 'Requirements publication does not duplicate discovery');

  boards[0].name = 'ai reopened'; network = [];
  const second = await open({expanded:true});
  assert.deepEqual(labels(second), expectedLabels(), 'Already-open section entry refreshes once');
  assert.deepEqual(network, ['/1/members/me/boards']);
  const confirmed = labels(second);
  held = null; mode = 'hold';
  const cold = await open({expanded:true, settled:false}), coldJob = cold.flush();
  for (let i=0; i<300 && !held; i++) await Promise.resolve();
  assert.ok(held); assert.deepEqual(labels(cold), confirmed, 'A new view publishes saved names before network completion');
  assert.ok(words(cold.render()).includes('ai reopened'));
  mode = 'normal'; held(Response.json(boards)); await coldJob;
  const pending = await pendingRefresh(second);
  assert.deepEqual(labels(second), confirmed);
  assert.ok(words(second.render()).includes('ai reopened'), 'Loaded names remain during a pending refresh');
  mode = 'normal'; pending.release(Response.json(boards)); await pending.job; await second.flush();

  mode = 'offline'; network = [];
  second.click('st-plugin-refresh-trello-boards'); await second.flush();
  assert.deepEqual(labels(second), confirmed);
  const offlineResult = second.view.pluginChecks.trello.items.find(i => i.id === 'boards');
  assert.equal(offlineResult.detail, null); assert.equal(offlineResult.statusLabel, '2 added');
  const third = await open({expanded:true});
  assert.deepEqual(labels(third), confirmed, 'New views retain persisted names when offline');
  assert.equal(third.view.pluginChecks.trello.items.find(i => i.id === 'boards').detail, null);
  assert.deepEqual(network, ['/1/members/me/boards','/1/members/me/boards'], 'No automatic retry loop');

  mode = 'normal'; boards = [{id:A, name:'ai partial', closed:false}];
  third.click('st-plugin-refresh-trello-boards'); await third.flush();
  assert.deepEqual(labels(third), ['ai partial','xr 🐑'], 'Unseen board names and grants survive partial discovery');
  assert.deepEqual(store.read('policy'), policyBefore); assert.deepEqual(store.read('credentials'), credentialsBefore);

  for (const retire of ['machine','disabled','account']) {
    const h = await open({expanded:true});
    const pending = await pendingRefresh(h);
    if (retire === 'machine') {h.view.settingsMachine = 'other-machine'; h.ui.followSettingsMachine(h.view);}
    if (retire === 'disabled') h.registry.setPluginEnabled(h.registry.pluginById('trello'), false);
    if (retire === 'account') setup(store, {...credentials, token:'FAKE_ROTATED_NAME_TOKEN'}, true);
    mode = 'normal'; pending.release(Response.json([{id:A, name:'OBSOLETE', closed:false}]));
    await pending.job; await h.flush();
    assert.ok(!words(h.render()).includes('OBSOLETE'), `${retire} retires old publication`);
    // Already-dispatched metadata work can finish on its original target, but
    // must not publish into a new/disabled view or acquire authority for an account.
    if (retire === 'account') {
      assert.deepEqual((await status()).data.namedBoards, []);
      assert.deepEqual(store.read('policy').boards, [], 'A replaced account cannot inherit old hints/grants');
    }
  }
  console.log('PASS: ID-based rename refresh on open/reopen and both Check paths, silent offline/partial retention, unchanged authority and stale target refusal');
} finally {fs.rmSync(root, {recursive:true, force:true});}
