import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { build } from '../tools/build.mjs';
const state = new Map(), timers = [], jobs = [], calls = [];
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
  appHome: () => '/fixture/home', checking: () => eager,
  shared: key => state.get(key), setShared: (key, value) => state.set(key, value),
  exec: async (command, args, options) => {
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
const cx = { notify() {}, spawn(fn) { jobs.push(fn(cx)); }, timer: { every(ms, callback) { timers.push({ ms, callback }); } } };
async function flush() { while (jobs.length) await Promise.all(jobs.splice(0)); }
const owner = { section: 'updates', button(_theme, id, label, callback, options) { this.buttonCalls.push({ id, label, callback, options }); return builder(); }, row(_theme, title, description, control) { return { title, description, control }; }, buttonCalls: [] };
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
const draw = () => { const value = api.customizationUpdateRow(owner, {}); return { ...value, button: owner.buttonCalls.at(-1) }; };
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
const chrome = {}; api.initCustomizationUpdates(chrome, cx, 'custom-workspace-chrome', { chrome: true }); await flush();
assert.equal(calls.at(-1).action, 'check'); assert.equal(timers.at(-1).ms, 3600000); assert.equal(api.customizationUpdateAvailable(), true);
timers.at(-1).callback(cx); await flush(); assert.equal(calls.at(-1).force, false);
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
assert.equal(render(duringApi, during).description, 'Updating all machines…');
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
assert.match(settings, /initUpdateCheckFeedback\(this, cx/);
assert.match(settings, /updateCheckSlot\(this, t/);
const { output } = build();
assert.equal(fs.readFileSync(path.join(output, 'mods/custom-settings/update-check-feedback.js'), 'utf8'), fs.readFileSync('src/features/settings/update-check-feedback.js', 'utf8'));
for (const mod of ['custom-settings', 'custom-workspace-chrome', 'custom-menu']) {
  for (const file of ['customization-updates.js', 'customization-update-model.js']) assert.equal(fs.readFileSync(path.join(output, 'mods', mod, file), 'utf8'), fs.readFileSync(path.join('src/shared', file), 'utf8'));
  if (mod !== 'custom-menu') assert.equal(fs.readFileSync(path.join(output, 'mods', mod, 'update-worker.cjs'), 'utf8'), fs.readFileSync('src/services/updates/update-worker.cjs', 'utf8'));
}
console.log('PASS: real row/controller VM fixtures, one label constant/button, stale click/eager/hidden guards, reload check, dots and package closure; no native UI.');
