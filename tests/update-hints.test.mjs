// Actual update controller + worker with fake time, fixed-main Git replies and a disposable home.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { createHash } from 'node:crypto';
const worker = createRequire(import.meta.url)('../src/services/updates/update-worker.cjs');
fs.mkdirSync('.artifacts', { recursive: true });
const home = fs.mkdtempSync(path.resolve('.artifacts/update-hints-')), p = worker.files(home);
let clock = 1000000, target = 'a'.repeat(40), fail = false, eager = false, enabled = true, reads = 0, held = null, holdNext = false;
class Clock extends Date { static now() { return clock; } }
const KEY = 'custom.customization-update', EVENTS = 'custom.git.webhook-events';
const store = new Map(), calls = [], jobs = [], timers = [], periodics = [];
const source = { version: 1, generation: 'fixture-generation', active: true, connected: false, ready: 0, repositories: {} };
const options = { now: () => clock, run(program, args) {
  reads++; assert.equal(program, 'git'); assert.deepEqual(args, ['ls-remote', '--', worker.REPOSITORY, 'refs/heads/main']);
  return { code: fail ? 1 : 0, stdout: `${target}\trefs/heads/main\n` };
} };
const host = { appHome: () => home, checking: () => eager,
  shared: key => key === 'custom.plugins' ? { git: { enabled } } : store.get(key),
  setShared: (key, value) => store.set(key, JSON.parse(JSON.stringify(value))),
  exec: async (program, args) => {
    assert.equal(program, 'node'); const request = JSON.parse(args[1]); calls.push(request);
    assert.ok(['status', 'check'].includes(request.action), 'A hint can never launch an update or deployment');
    const value = request.action === 'check' ? worker.checkMain(home, { ...options, force: request.force, reason: request.reason }) : worker.inspect(home, options);
    const reply = { code: 0, stdout: JSON.stringify(value) };
    if (holdNext) { holdNext = false; return new Promise(resolve => { held = () => { resolve(reply); held = null; }; }); }
    return reply;
  } };
const context = vm.createContext({ Date: Clock, console });
const modules = new Map();
const load = name => {
  if (!modules.has(name)) modules.set(name, name === './host.js'
    ? new vm.SyntheticModule(Object.keys(host), function() { for (const [key, value] of Object.entries(host)) this.setExport(key, value); }, { context })
    : new vm.SourceTextModule(fs.readFileSync(`src/shared/${name.slice(2)}`, 'utf8'), { context, identifier: name }));
  return modules.get(name);
};
const main = load('./customization-updates.js'); await main.link(load); await main.evaluate(); const api = main.namespace;
const cx = { notify() {}, spawn(fn) { jobs.push(fn(cx)); }, timer: {
  after(ms, fn) { timers.push({ at: clock + ms, fn }); }, every(ms, fn) { periodics.push({ ms, fn }); },
} };
const tick = async () => { for (let i = 0; i < 100; i++) await Promise.resolve(); };
const owner = {};
const sync = () => { store.set(EVENTS, JSON.parse(JSON.stringify(source))); api.syncCustomizationUpdateHints(owner, cx, { enabled }); };
async function advance(ms) {
  clock += ms;
  for (;;) { const index = timers.findIndex(timer => timer.at <= clock); if (index < 0) break; const [timer] = timers.splice(index, 1); timer.fn(cx); await tick(); }
}
function push() {
  const previous = source.repositories['timurproko/herdr-app']?.push || 0;
  source.repositories['timurproko/herdr-app'] = { sequence: previous + 1, push: previous + 1 };
  sync();
}
try {
  const manifest = JSON.stringify({ version: 2, id: 'custom', files: {} });
  worker.atomic(p.manifest, manifest);
  worker.atomic(p.result, { complete: true, desktop: { commit: target, verified: true, manifest: createHash('sha256').update(manifest).digest('hex') }, results: [{ machine: 'local', action: 'deployed' }] });
  sync(); api.initCustomizationUpdates(owner, cx, 'custom-workspace-chrome', { chrome: true }); await tick();
  assert.equal(reads, 1); assert.equal(store.get(KEY).check.available, false); assert.equal(periodics[0].ms, worker.HOUR);
  source.connected = true; source.ready++; sync(); target = 'b'.repeat(40);
  await advance(999); assert.equal(reads, 1); await advance(1); assert.equal(reads, 1, 'Ready hint respects the recent mount attempt');
  assert.equal(calls.at(-1).reason, 'webhook'); await advance(9000);
  assert.equal(reads, 2); assert.equal(store.get(KEY).check.available, true, 'Real worker availability reaches the existing publication key');
  assert.equal(owner.customUpdateAsked, null, 'Automatic hints do not arm manual confirmation');
  const unrelated = reads;
  source.repositories['other/repo'] = { sequence: 100, push: 100 }; sync();
  source.repositories['timurproko/herdr-app'] = { sequence: 100, push: 0 }; sync(); // non-push CI, no prior target push
  await advance(5000); assert.equal(reads, unrelated, 'Other repositories and non-push notices are ignored');
  await advance(5000); push(); await advance(500); push(); sync(); await advance(500); push();
  await advance(999); assert.equal(reads, unrelated); await advance(1);
  assert.equal(reads, unrelated + 1, 'Several push/duplicate renders produce one trailing-debounced check');
  const burst = reads;
  for (let i = 0; i < 10; i++) { push(); await advance(300); }
  await advance(7000); assert.equal(reads, burst + 1, 'Continuous notices have bounded latency and a persisted ten-second rate gate');
  const leaseStart = reads; await advance(10000);
  worker.atomic(p.checkLock, { token: 'another-view', until: clock + 20000 });
  push(); await advance(1000); assert.equal(reads, leaseStart, 'Held check lease prevents another Git read');
  assert.equal(store.get(KEY).checking, true); await advance(19001);
  assert.equal(reads, leaseStart + 1, 'One deferred check follows the expired lease'); assert.equal(store.get(KEY).checking, false);
  await advance(10000); holdNext = true; push(); await advance(1000); assert.ok(held);
  const inFlight = reads; push(); await advance(5000); assert.equal(reads, inFlight, 'A busy owner retains one dirty signal without concurrent requests');
  held(); await tick(); await advance(1); await advance(5000);
  assert.equal(reads, inFlight + 1, 'A newer in-flight hint receives one rate-bounded follow-up');
  const reconnect = reads;
  for (let i = 0; i < 4; i++) { source.connected = false; sync(); source.connected = true; source.ready++; sync(); await advance(500); }
  await advance(8000); assert.equal(reads, reconnect + 1, 'Repeated reconnect ready signals coalesce behind the same durable rate bound');
  await advance(10000); fail = true; push(); await advance(1000); const failed = reads;
  assert.equal(store.get(KEY).check.available, true, 'Failed hint check preserves confirmed availability');
  assert.match(store.get(KEY).check.error, /Check failed/); await advance(30000); sync(); await advance(1000);
  assert.equal(reads, failed, 'A failed hint does not retry without a new signal'); fail = false;
  push(); enabled = false; sync(); await advance(10000); assert.equal(reads, failed, 'Disabling cancels pending hint callbacks');
  const fallback = periodics.find(timer => timer.ms === worker.HOUR); clock += worker.HOUR;
  fallback.fn(cx); await tick(); assert.equal(reads, failed + 1, 'Hourly fallback still runs with Git disabled');
  assert.equal(calls.at(-1).reason, undefined); assert.equal(calls.at(-1).force, false);
  const second = {}; clock += worker.HOUR;
  api.initCustomizationUpdates(second, cx, 'custom-workspace-chrome', { chrome: true }); await tick();
  assert.equal(reads, failed + 2, 'Mount fallback still runs without the relay');
  enabled = true; sync(); await advance(10000); assert.equal(reads, failed + 2, 'Re-enabling does not replay an old shared snapshot');
  source.generation = 'new-generation'; source.ready = 0; source.connected = false; sync();
  source.ready = 1; source.connected = true; sync(); await advance(1000); const generationReads = reads;
  assert.equal(generationReads, failed + 3, 'Fresh authenticated generation catches up');
  // Queue then replace the generation; the old callback cannot dispatch.
  push(); source.generation = 'replacement'; source.ready = 0; source.connected = false; sync();
  await advance(10000); assert.equal(reads, generationReads);
  source.ready = 1; source.connected = true; sync(); owner.customUpdateClosed = true; await advance(1000);
  assert.equal(reads, generationReads, 'Closed-owner callbacks cannot dispatch'); owner.customUpdateClosed = false;
  eager = true; push(); api.refreshCustomizationUpdates(owner, cx, 'check', true); await advance(10000);
  assert.equal(reads, generationReads, 'Eager checking starts neither hints nor fallbacks'); eager = false;
  // Existing manual force is unchanged and bypasses both caches, not the lease.
  api.refreshCustomizationUpdates(owner, cx, 'check', true); await tick();
  assert.equal(reads, generationReads + 1); assert.equal(calls.at(-1).force, true); assert.equal(calls.at(-1).reason, undefined);
  api.refreshCustomizationUpdates(owner, cx, 'check', true); await tick(); assert.equal(reads, generationReads + 2);
  assert.ok(calls.every(call => call.home === home && call.action !== 'launch'));
  await Promise.all(jobs);
  console.log('PASS: real fixed-main worker publication, debounce/rate/lease and in-flight races, reconnect/generation guards, silent disabled fallbacks and unchanged forced manual checks; zero deployment');
} finally { fs.rmSync(home, { recursive: true, force: true }); }
