import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { build } from '../tools/build.mjs';
const state = new Map(), timers = [], jobs = [], calls = [];
let active = true, rendering = false;
const duringRender = fn => { rendering = true; try { return fn(); } finally { rendering = false; } };
let eager = false, next = { revision: 'a'.repeat(40), check: { checked: Date.now(), available: false }, log: '/fixture/update.log' }, reject = false;
const builder = () => {
  const node = { attrs: {}, kids: [] }; let el;
  el = new Proxy(node, { get: (target, key) => key in target ? target[key] : key === 'then' ? undefined
    : key === 'child' ? child => { node.kids.push(child); return el; }
    : (...args) => { node.attrs[key] = args; return el; } });
  return el;
};
let respond = null;
let clock = Date.now();
class Clock extends Date { static now() { return clock; } }
const host = {
  appHome: () => '/fixture/home', checking: () => eager, window: () => ({ active }),
  shared: key => state.get(key), setShared: (key, value) => { assert.equal(rendering,false,'No updater publication during render'); state.set(key,value); },
  exec: async (command, args, options) => {
    assert.equal(rendering,false,'No updater worker request during render');
    assert.equal(command, 'node'); assert.equal(options.on, null); assert.equal(options.timeout, 22000);
    assert.match(args[0], /^\/fixture\/home\/mods\/custom-(settings|workspace-chrome)\/update-worker\.cjs$/);
    const request = JSON.parse(args[1]); assert.equal(request.home, '/fixture/home'); calls.push(request);
    if (reject) throw Error('fixture transport unavailable');
    return respond ? respond(request) : { code: 0, stdout: JSON.stringify(next) };
  },
};
async function modules() {
const context = vm.createContext({ console, Date: Clock, JSON, Error });
const cache = new Map();
function synthetic(name, exports) { return new vm.SyntheticModule(Object.keys(exports), function() { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context, identifier: name }); }
async function link(name) {
  if (cache.has(name)) return cache.get(name);
  let module;
  if (name === './host.js') module = synthetic(name, host);
  else if (name === 'gpui-base') module = synthetic(name, { h_flex: builder });
  else if (name === './ui.js') module = synthetic(name, { U: { field: 30 } });
  else {
    const file = ['./customization-update-row.js', './update-check-feedback.js'].includes(name) ? `src/features/settings/${name.slice(2)}` : `src/shared/${name.slice(2)}`;
    module = new vm.SourceTextModule(fs.readFileSync(file, 'utf8'), { context, identifier: name });
  }
  cache.set(name, module); return module;
}
const main = new vm.SourceTextModule('export * from "./customization-update-model.js"; export * from "./customization-updates.js"; export * from "./customization-update-row.js"; export * from "./update-check-feedback.js";', { context });
await main.link(link); await main.evaluate(); return main.namespace;
}
const api = await modules();
for (const revision of [null, undefined, '', 'a'.repeat(40)]) {
  assert.equal(api.customizationRowState({ revision }).title, revision ? 'herdr-app-custom aaaaaaa' : 'herdr-app-custom');
}
assert.equal(api.customizationRowState(null).title, 'herdr-app-custom');
const cx = { notify() { assert.equal(rendering,false,'No updater notify during render'); }, spawn(fn) { jobs.push(fn(cx)); }, timer: { every(ms, callback) { timers.push({ ms, callback }); }, after(ms, callback) { timers.push({ ms, callback, once: true }); } } };
async function flush() { while (jobs.length) await Promise.all(jobs.splice(0)); }
const owner = { section: 'updates', button(_theme, id, label, callback, options) { this.buttonCalls.push({ id, label, callback, options }); return builder(); }, row(_theme, title, description, control) { return { title, description, control }; }, buttonCalls: [] };
// Titles are presentation only: every real row state retains its controls and
// diagnostics, including missing evidence that must never claim to be current.
const titleCases = [
  { name: 'idle', snapshot: {}, label: 'Check now', action: 'check', enabled: true, description: /^Not checked\.$/ },
  { name: 'current cache', snapshot: { check: { checked: clock, available: false } }, label: 'Check now', action: 'check', enabled: true, current: true },
  { name: 'checking', snapshot: { checking: true }, label: 'Checking…', action: 'check', enabled: false, description: /^Not checked\.$/ },
  { name: 'requested check', snapshot: {}, busy: 'check', label: 'Checking…', action: 'check', enabled: false, description: /^Not checked\.$/ },
  { name: 'quiet peer catch-up', snapshot: { peerPending: true, check: { attempted: clock, checked: clock, available: false } }, label: 'Update', action: 'launch', enabled: true, description: /^(Up to date\. Checked at|Not checked\.)/ },
  { name: 'available', snapshot: { check: { checked: clock, available: true } }, label: 'Update', action: 'launch', enabled: true, description: /^Update available\.$/ },
  { name: 'launching', snapshot: {}, busy: 'launch', label: 'Updating…', action: 'check', enabled: false, description: /^Updating…$/ },
  { name: 'pending receipt', snapshot: { launch: { deadline: clock + 30000 } }, label: 'Updating…', action: 'check', enabled: false, description: /^Updating…$/ },
  { name: 'running', snapshot: { locked: true, job: { state: 'running', deadline: clock + 30000 } }, label: 'Updating…', action: 'check', enabled: false, description: /^Updating…$/ },
  { name: 'failed update', snapshot: { job: { state: 'failed', error: 'fixture refusal', finished: clock } }, label: 'Check now', action: 'check', enabled: true, description: /Update failed: fixture refusal/ },
  { name: 'failed check', snapshot: { check: { error: 'offline' } }, label: 'Check now', action: 'check', enabled: true, description: /^Check failed\. Try again\.$/ },
  { name: 'partial', snapshot: { partial: true }, label: 'Check now', action: 'check', enabled: true, description: /some machines skipped or failed.*fixture/ },
  { name: 'unknown outcome', snapshot: { locked: true, job: { state: 'unknown' } }, label: 'Check now', action: 'check', enabled: true, description: /Update outcome unknown.*fixture/ },
  { name: 'expired run', snapshot: { locked: true, job: { state: 'running', deadline: clock - 1 } }, label: 'Check now', action: 'check', enabled: true, description: /Update outcome unknown.*fixture/ },
];
for (const revision of [null, 'a'.repeat(40)]) {
  for (const test of titleCases) {
    const snapshot = { revision, log: '/fixture/update.log', ...test.snapshot };
    const model = api.customizationRowState(snapshot, { busy: test.busy, now: clock });
    const view = { ...owner, customUpdatePending: test.busy, buttonCalls: [] };
    state.set(api.CUSTOMIZATION_UPDATE_KEY, snapshot);
    const rendered = duringRender(() => api.customizationUpdateRow(view, {}));
    const button = view.buttonCalls.at(-1), context = `${test.name}, revision=${revision}`;
    assert.equal(rendered.title, revision ? 'herdr-app-custom aaaaaaa' : 'herdr-app-custom', context);
    assert.equal(rendered.description, model.description, context);
    assert.equal(model.action, test.action, context);
    assert.equal(model.current, Boolean(test.current && revision), context);
    assert.equal(button.label, test.label, context);
    assert.equal(button.options.enabled, test.enabled, context);
    if (test.current) assert.match(rendered.description, revision ? /^Up to date\. Checked at/ : /^Not checked\.$/, context);
    else assert.match(rendered.description, test.description, context);
    assert.doesNotMatch(`${rendered.title} ${rendered.description} ${button.label}`, /revision unknown/, context);
  }
}
for (const extra of [
  { locked: true }, { peerUnknown: true }, { check: { checked: clock, attempted: clock, available: false, error: 'offline' } },
  { check: null }, { job: { state: 'unknown' } }, { job: { state: 'running', deadline: clock + 1000 } },
  { job: { state: 'failed', finished: clock + 1 } }, { job: { state: 'complete', finished: clock + 1 } },
]) {
  const snapshot = { revision: 'a'.repeat(40), peerPending: true, check: { checked: clock, attempted: clock, available: false }, ...extra };
  assert.equal(api.customizationRowState(snapshot, { now: clock }).action, 'check', 'deferred work cannot bypass check/failure/unknown/lock guards');
}
state.delete(api.CUSTOMIZATION_UPDATE_KEY);
api.initCustomizationUpdates(owner, cx, 'custom-settings'); await flush();
assert.equal(calls[0].action, 'status'); assert.equal(timers[0].ms, 1000);
let row = api.customizationUpdateRow(owner, {});
assert.equal(row.title, 'herdr-app-custom aaaaaaa'); assert.equal(owner.buttonCalls.length, 1); assert.equal(owner.buttonCalls[0].label, 'Check now');
// The real native helper/timer also drives Custom: no completion timeout or
// independently invented confirmation markup. Initial cached success stays idle.
let nativeChecking = false;
api.initUpdateCheckFeedback(owner, cx, [
  { key: 'asked', checking: () => nativeChecking },
  { key: 'customUpdateAsked', checking: () => owner.customUpdatePending === 'check' || api.customizationUpdateSnapshot()?.checking },
]);
const feedbackTick = () => timers.find(timer => timer.ms === 300).callback(cx);
const draw = () => duringRender(() => { const value = api.customizationUpdateRow(owner, {}); return { ...value, button: owner.buttonCalls.at(-1) }; });
const cachedDescription = row.description;
owner.buttonCalls[0].callback(null, cx);
assert.equal(draw().button.label, 'Checking…');
assert.equal(draw().button.options.enabled, false);
clock += 6000; feedbackTick(); // Long check refreshes the original request age.
await flush();
row = draw();
assert.equal(row.button.label, '✓ Up to date'); assert.equal(row.button.options.enabled, false);
assert.equal(row.description, cachedDescription);
const repeatCount = calls.length; row.button.callback(null, cx); await flush(); assert.equal(calls.length, repeatCount, 'confirmation ignores retained callbacks');
const customSlot = row.control;
owner.asked = owner.customUpdateAsked;
const nativeSlot = api.updateCheckSlot(owner, {}, { id: 'native', key: 'asked', checked: true, onClick() {} });
const geometry = slot => Object.fromEntries(Object.entries(slot.attrs).filter(([key]) => key !== 'id'));
assert.deepEqual(geometry(customSlot), geometry(nativeSlot), 'Custom uses the exact native 112px slot markup');
assert.equal(owner.buttonCalls.at(-1).label, '✓ Up to date');
assert.equal(owner.buttonCalls.at(-1).options.enabled, false);
clock += 2999; assert.equal(draw().button.label, '✓ Up to date');
clock++; assert.equal(draw().button.label, 'Check now', 'render expires at exactly 3000 ms, before the next timer tick');
feedbackTick(); assert.equal(owner.customUpdateAsked, null); assert.equal(owner.asked, null);
assert.equal(draw().description, cachedDescription, 'expiry does not erase the check time');
owner.asked = clock; nativeChecking = true; clock += 6000; feedbackTick();
assert.equal(owner.asked, clock); assert.equal(owner.customUpdateAsked, null, 'native checks never arm Custom feedback');
nativeChecking = false; clock += 3000; feedbackTick();
// A failed requested check must not reuse a previous current answer.
reject = true; draw().button.callback(null, cx); await flush();
assert.equal(draw().button.label, 'Check now'); assert.match(draw().description, /Check failed/);
assert.equal(owner.customUpdateAsked, null, 'transport failure cancels the request feedback');
reject = false;
api.refreshCustomizationUpdates(owner, cx); await flush();
assert.equal(draw().description, cachedDescription, 'status can restore a cached current description');
assert.equal(draw().button.label, 'Check now', 'status must not restore feedback for the failed check');
assert.equal(draw().button.options.enabled, true);
// A new explicit successful retry still gets the original native confirmation.
draw().button.callback(null, cx); await flush();
assert.equal(draw().button.label, '✓ Up to date'); assert.equal(draw().button.options.enabled, false);
reject = true; api.refreshCustomizationUpdates(owner, cx); await flush();
assert.equal(owner.customUpdateAsked, null, 'a failed status refresh also cancels existing confirmation');
reject = false; api.refreshCustomizationUpdates(owner, cx); await flush();
assert.equal(draw().button.label, 'Check now', 'status recovery alone cannot rearm confirmation');
// Worker-reported failure, missing/unknown or unfinished results also cancel
// feedback, so a subsequent successful status read cannot resurrect it.
for (const value of [
  { revision: 'a'.repeat(40), check: { checked: clock, available: false, error: 'check failed' } },
  { revision: 'a'.repeat(40), check: null },
  { revision: null, check: { checked: clock, available: false } },
  { revision: 'a'.repeat(40), check: { checked: clock } },
  { revision: 'a'.repeat(40), check: { checked: clock, available: false }, locked: true },
  { revision: 'a'.repeat(40), check: { checked: clock, available: false }, job: { state: 'unknown' } },
  { revision: 'a'.repeat(40), check: { checked: clock, available: false }, checking: true },
]) {
  owner.customUpdateAsked = clock;
  next = value; api.refreshCustomizationUpdates(owner, cx, 'check', true); await flush();
  assert.equal(draw().button.label, value.checking ? 'Checking…' : 'Check now');
  assert.equal(owner.customUpdateAsked, null, 'non-current or unfinished check cancels the feedback timestamp');
  next = { revision: 'a'.repeat(40), check: { checked: clock, available: false } };
  api.refreshCustomizationUpdates(owner, cx); await flush();
  assert.equal(draw().button.label, 'Check now', 'cached current status cannot revive unsuccessful feedback');
  assert.equal(draw().button.options.enabled, true);
}
next = { revision: 'a'.repeat(40), check: { checked: clock, available: false }, log: '/fixture/update.log' };
next = { ...next, check: { ...next.check, available: true, target: 'b'.repeat(40) } };
api.refreshCustomizationUpdates(owner, cx, 'check', true);
assert.equal(owner.customUpdatePending, 'check'); api.refreshCustomizationUpdates(owner, cx, 'launch');
await flush(); assert.equal(calls.at(-1).action, 'check');
api.customizationUpdateRow(owner, {}); const staleButton = owner.buttonCalls.at(-1); assert.equal(staleButton.label, 'Update');
state.set(api.CUSTOMIZATION_UPDATE_KEY, { ...api.customizationUpdateSnapshot(), locked: true, job: { state: 'running', deadline: Date.now() + 30000 } });
const count = calls.length; staleButton.callback(null, cx); await flush(); assert.equal(calls.length, count, 'stale pre-paint nodes cannot launch');
api.customizationUpdateRow(owner, {}); assert.equal(owner.buttonCalls.at(-1).label, 'Updating…'); assert.equal(owner.buttonCalls.at(-1).options.enabled, false);
owner.section = 'look'; timers[0].callback(cx); await flush(); assert.equal(calls.length, count, 'hidden page does not poll');
owner.section = 'updates'; next = { ...next, job: { state: 'running', deadline: Date.now() + 30000 } }; timers[0].callback(cx); await flush(); assert.equal(calls.at(-1).action, 'status');
next = { ...next, job: { state: 'complete', finished: Date.now() }, check: null };
const prior = calls.length; api.refreshCustomizationUpdates(owner, cx); await flush();
assert.deepEqual(calls.slice(prior).map(call => call.action), ['status', 'check'], 'reload forces successful update reconciliation before claiming current');
reject = true; api.refreshCustomizationUpdates(owner, cx, 'launch'); await flush();
assert.equal(api.customizationUpdateSnapshot().job.state, 'unknown'); assert.equal(api.customizationUpdateSnapshot().locked, true);
reject = false; next = { revision: 'a'.repeat(40), check: { checked: Date.now(), available: true }, log: '/fixture/update.log' };
next.check.nextAttempt = clock + 150000;
const chrome = {}; api.initCustomizationUpdates(chrome, cx, 'custom-workspace-chrome', { chrome: true }); await flush();
assert.equal(calls.at(-1).action, 'check'); assert.equal(timers.at(-1).ms, 150000); assert.equal(api.customizationUpdateAvailable(), true);
const scheduled = timers.at(-1), beforeFocus = calls.length;
duringRender(()=>api.observeCustomizationUpdates(chrome, cx)); await flush(); assert.equal(calls.length, beforeFocus, 'render does no I/O');
active = false; duringRender(()=>api.observeCustomizationUpdates(chrome, cx));
clock += 120000; active = true; duringRender(()=>api.observeCustomizationUpdates(chrome, cx)); await flush();
assert.equal(calls.length, beforeFocus, 'focus yields to one debounce timer');
assert.equal(timers.at(-1).ms, 300);
clock += 300; timers.at(-1).callback(cx); await flush();
assert.equal(calls.at(-1).invalidate, true); assert.equal(calls.at(-1).force, false);
assert.equal(chrome.customUpdateAsked, null, 'automatic catch-up never arms requested feedback');
const afterFocus = calls.length; scheduled.callback(cx); await flush(); assert.equal(calls.length, afterFocus, 'superseded timer cannot check');
clock += 400000; timers.at(-1).callback(cx); await flush(); assert.equal(calls.at(-1).invalidate, true, 'delayed sleep timer catches up');
// An invalidation arriving in-flight retains just one follow-up, rate-limited.
let settleCheck;
respond = () => new Promise(resolve => { settleCheck = resolve; });
clock += 180000; timers.at(-1).callback(cx);
api.invalidateCustomizationUpdates(chrome, cx); api.invalidateCustomizationUpdates(chrome, cx);
settleCheck({ code: 0, stdout: JSON.stringify({ ...next, check: { ...next.check, nextAttempt: clock + 150000 } }) }); await flush();
assert.equal(timers.at(-1).ms, 15000);
respond = () => ({ code:0, stdout:JSON.stringify({ ...next, check:{ ...next.check, available:false, nextAttempt:clock+150000 } }) });
const beforeBurst = calls.length;
for (let i=0;i<50;i++) api.invalidateCustomizationUpdates(chrome,cx);
assert.equal(api.customizationUpdateAvailable(),true,'hints never set availability directly');
assert.equal(calls.length,beforeBurst);
clock += 15000; timers.at(-1).callback(cx); await flush();
assert.equal(calls.length,beforeBurst+1,'one bounded dirty follow-up for a burst');
assert.equal(api.customizationUpdateAvailable(),false,'only authoritative check response changes the badge');
respond = () => ({ code:0, stdout:JSON.stringify({ ...next, check:{ ...next.check, error:'offline', nextAttempt:clock+600000 } }) });
api.invalidateCustomizationUpdates(chrome,cx); clock += 15000; timers.at(-1).callback(cx); await flush();
const afterFailure=calls.length, backoffTimer=timers.at(-1);
assert.equal(backoffTimer.ms,600000);
api.invalidateCustomizationUpdates(chrome,cx); api.invalidateCustomizationUpdates(chrome,cx);
assert.equal(calls.length,afterFailure,'hints respect persisted automatic failure backoff');
assert.equal(timers.at(-1),backoffTimer);
let relayEnabled=true;
api.invalidateCustomizationUpdates(chrome,cx,()=>relayEnabled);relayEnabled=false;
clock+=600000;timers.at(-1).callback(cx);await flush();
assert.equal(calls.length,afterFailure,'disabled relay cancels queued hint without disabling periodic fallback');
respond = null;
// Retire this test owner so later replacement fixtures cannot run its timers.
chrome.customUpdateClosed = true;
eager = true; const before = calls.length, timerCount = timers.length;
api.initCustomizationUpdates({}, cx, 'custom-settings'); api.refreshCustomizationUpdates(owner, cx, 'launch'); await flush();
assert.equal(calls.length, before); assert.equal(timers.length, timerCount);
// Replacement is a fresh module graph and owner, not a second init on the old
// object. Only the host store and independent worker receipts survive.
eager = false; reject = false;
const deferred = () => { let resolve; const promise = new Promise(done => { resolve = done; }); return { promise, resolve }; };
const reply = value => ({ code: 0, stdout: JSON.stringify(value) });
function fixture() {
  const tasks = [], ticks = [];
  const localCx = { notify() {}, spawn(fn) { tasks.push(fn(localCx)); }, timer: { every(ms, fn) { ticks.push({ ms, fn }); } } };
  const view = { ...owner, customUpdatePending: null, customUpdateError: null, customUpdateAsked: null, buttonCalls: [] };
  return { view, cx: localCx, ticks, async settle() { while (tasks.length) await Promise.all(tasks.splice(0)); } };
}
const render = (code, f) => { const row = code.customizationUpdateRow(f.view, {}); return { ...row, button: f.view.buttonCalls.at(-1) }; };
const retire = f => { f.view.customUpdateClosed = true; f.ticks.length = 0; };
const tick = f => f.ticks.find(t => t.ms === 1000).fn(f.cx);
const available = { revision: 'a'.repeat(40), check: { attempted: clock - 10, checked: clock - 10, available: true }, log: '/fixture/update.log' };
state.set(api.CUSTOMIZATION_UPDATE_KEY, available);
const receipt = deferred(), old = fixture();
respond = request => request.action === 'launch' ? receipt.promise : reply(available);
render(api, old).button.callback(null, old.cx);
assert.equal(render(api, old).button.label, 'Updating…');
retire(old);
const freshApi = await modules(), fresh = fixture();
freshApi.initCustomizationUpdates(fresh.view, fresh.cx, 'custom-settings');
assert.equal(render(freshApi, fresh).button.label, 'Updating…', 'shared intent survives replacement before launch acknowledgement');
await fresh.settle();
assert.equal(render(freshApi, fresh).button.label, 'Updating…', 'old cached status cannot erase a pending launch');
const launches = calls.filter(call => call.action === 'launch').length;
render(freshApi, fresh).button.callback(null, fresh.cx); await fresh.settle();
assert.equal(calls.filter(call => call.action === 'launch').length, launches, 'replacement cannot repeat the update');
const running = { ...available, locked: true, job: { token: 'replacement-run', started: clock, deadline: clock + 1800000, state: 'running' } };
receipt.resolve(reply(running)); await old.settle();
respond = () => reply(running); tick(fresh); await fresh.settle();
assert.equal(freshApi.customizationUpdateSnapshot().launch, undefined, 'durable job acknowledges provisional feedback');
assert.equal(render(freshApi, fresh).button.label, 'Updating…');
assert.equal(render(freshApi, fresh).button.options.enabled, false);
retire(fresh);
const duringApi = await modules(), during = fixture();
duringApi.initCustomizationUpdates(during.view, during.cx, 'custom-settings'); await during.settle();
assert.equal(render(duringApi, during).description, 'Updating…');
clock += 100;
const complete = { ...available, revision: 'b'.repeat(40), locked: false, job: { ...running.job, state: 'complete', finished: clock } };
const current = { ...complete, check: { attempted: clock + 1, checked: clock + 1, available: false } };
respond = request => reply(request.action === 'check' ? current : complete);
const completionCalls = calls.length; tick(during); await during.settle();
assert.deepEqual(calls.slice(completionCalls).map(call => call.action), ['status', 'check']);
assert.equal(render(duringApi, during).title, 'herdr-app-custom bbbbbbb');
assert.match(render(duringApi, during).description, /^Up to date\. Checked at/);
assert.equal(render(duringApi, during).button.label, 'Check now');
retire(during);
respond = () => reply(current);
const finishedApi = await modules(), finished = fixture();
finishedApi.initCustomizationUpdates(finished.view, finished.cx, 'custom-settings'); await finished.settle();
assert.equal(render(finishedApi, finished).title, 'herdr-app-custom bbbbbbb', 'replacement just after completion keeps the verified result');
assert.match(render(finishedApi, finished).description, /^Up to date/);
retire(finished);
// Pending peer work is runtime projection, not availability; fresh module graphs
// retain the normal current description but expose Update rather than confirmation.
respond = () => reply({ ...current, peerPending: true });
for (let i = 0; i < 2; i++) {
  const code = await modules(), f = fixture();
  code.initCustomizationUpdates(f.view, f.cx, 'custom-settings'); await f.settle();
  const row = render(code, f);
  assert.match(row.description, /^Up to date/); assert.doesNotMatch(row.description, /Log:|Details:|skipped or failed/);
  assert.equal(row.button.label, 'Update'); assert.equal(row.button.options.enabled, true);
  assert.equal(code.customizationUpdateAvailable(), false);
  const saved = code.customizationUpdateSnapshot(), before = calls.length;
  state.set(code.CUSTOMIZATION_UPDATE_KEY, { ...saved, ...(i ? { peerUnknown: true } : { locked: true }) });
  row.button.callback(null, f.cx); await f.settle();
  assert.equal(calls.length, before, 'stale catch-up buttons cannot bypass a new lock/unknown outcome');
  state.set(code.CUSTOMIZATION_UPDATE_KEY, saved); retire(f);
}
for (const [jobState, description] of [['failed', /Update failed.*documented rollback/], ['partial', /some machines skipped or failed/], ['unknown', /outcome unknown/]]) {
  state.set(api.CUSTOMIZATION_UPDATE_KEY, running);
  respond = () => reply({ ...current, job: { ...current.job, state: jobState, error: 'fixture result' } });
  const code = await modules(), f = fixture(); code.initCustomizationUpdates(f.view, f.cx, 'custom-settings');
  assert.equal(render(code, f).button.label, 'Updating…'); await f.settle();
  assert.match(render(code, f).description, description); assert.equal(render(code, f).button.label, 'Check now'); retire(f);
}
// Replies issued before launch, and status observations without its new receipt,
// must not overwrite a newer running/completed generation.
state.set(api.CUSTOMIZATION_UPDATE_KEY, available);
const stale = deferred(), late = fixture(); respond = () => stale.promise;
api.refreshCustomizationUpdates(late.view, late.cx);
const held = deferred(), launching = fixture(); respond = () => held.promise;
api.refreshCustomizationUpdates(launching.view, launching.cx, 'launch');
stale.resolve(reply(available)); await late.settle();
assert.equal(render(api, launching).button.label, 'Updating…');
const preReceipt = deferred(), observing = fixture(); respond = () => preReceipt.promise;
api.refreshCustomizationUpdates(observing.view, observing.cx);
held.resolve(reply(current)); await launching.settle();
preReceipt.resolve(reply(available)); await observing.settle();
assert.equal(api.customizationUpdateSnapshot().revision, current.revision, 'late unacknowledged status cannot replace the final receipt');
assert.match(render(api, observing).description, /^Up to date/);
// A lost launch receipt expires to unknown rather than exposing cached current.
state.set(api.CUSTOMIZATION_UPDATE_KEY, available);
const lost = deferred(), abandoned = fixture(); respond = () => lost.promise;
api.refreshCustomizationUpdates(abandoned.view, abandoned.cx, 'launch'); retire(abandoned);
const timeoutApi = await modules(), timeout = fixture(); respond = () => reply(available);
timeoutApi.initCustomizationUpdates(timeout.view, timeout.cx, 'custom-settings'); await timeout.settle();
clock += 22001; const beforeTimeout = calls.length; tick(timeout); await timeout.settle();
assert.match(render(timeoutApi, timeout).description, /outcome unknown/);
assert.equal(render(timeoutApi, timeout).button.label, 'Check now');
assert.equal(calls.length, beforeTimeout, 'expired provisional feedback does not poll forever or relaunch');
lost.resolve(reply(current)); await abandoned.settle();
assert.ok(timeoutApi.customizationUpdateSnapshot().launch, 'discarded generations cannot publish a late success');
retire(timeout); respond = null;
const settings = fs.readFileSync('src/features/settings/main.js', 'utf8'), chromeSource = fs.readFileSync('src/features/workspace-chrome/main.js', 'utf8');
assert.match(settings, /u\.app\.ready \|\| \(u\.core\.ready && !u\.core\.managed\) \|\| customizationUpdateAvailable\(\)/);
assert.equal((chromeSource.match(/updates\(\)\.app\.ready \|\| customizationUpdateAvailable\(\)/g) || []).length, 2, 'expanded Settings and compact More preserve native predicates');
for (const command of ['app.check_updates', 'app.update', 'app.update_core', 'app.whats_new']) assert.ok(settings.includes(command));
assert.equal((settings.match(/\.child\(customizationUpdateRow\(this, t\)\)/g) || []).length, 1);
const updateExplanation = settings.match(/\.child\("(Herdr [^"\n]*)"\)/)?.[1];
assert.equal(updateExplanation, 'Herdr looks for both every hour and tells you in the corner. herdr-core runs your terminals, so they keep running through its updates.', 'Updates retains the exact short paragraph from before PR 20');
assert.match(settings, /initUpdateCheckFeedback\(this, cx/);
assert.match(settings, /updateCheckSlot\(this, t/);
const { output } = build();
for (const mod of ['custom-menu', 'custom-workspace-chrome', 'custom-new-menu', 'custom-changes'])
  assert.equal(fs.readFileSync(path.join(output, 'mods', mod, 'settings-dialog.js'), 'utf8'), fs.readFileSync('src/ui/settings-dialog.js', 'utf8'));
assert.equal(fs.readFileSync(path.join(output, 'mods/custom-settings/update-check-feedback.js'), 'utf8'), fs.readFileSync('src/features/settings/update-check-feedback.js', 'utf8'));
for (const mod of ['custom-settings', 'custom-workspace-chrome', 'custom-menu']) {
  for (const file of ['customization-updates.js', 'customization-update-model.js']) assert.equal(fs.readFileSync(path.join(output, 'mods', mod, file), 'utf8'), fs.readFileSync(path.join('src/shared', file), 'utf8'));
  if (mod !== 'custom-menu') assert.equal(fs.readFileSync(path.join(output, 'mods', mod, 'update-worker.cjs'), 'utf8'), fs.readFileSync('src/services/updates/update-worker.cjs', 'utf8'));
}
console.log('PASS: real row/controller VM fixtures, one label constant/button, stale click/eager/hidden guards, reload check, dots and package closure; no native UI.');
