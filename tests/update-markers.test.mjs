// Actual publication/controller and renderers, separate sandbox contexts, with
// Herdr 0.1.16's changed-setShared => queued refresh of every loaded root.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import { loadMod } from '../tools/plugin-harness.mjs';
import { RELAY_STATE } from '../src/plugins/git/relay-state.js';
const read = file => fs.readFileSync(file, 'utf8');
const KEY = 'custom.customization-update';
function element(asset) {
  const node = { asset, attrs: {}, kids: [] }; let el;
  el = new Proxy(node, { get(o, key) {
    if (key in o) return o[key];
    if (key === 'then') return undefined;
    if (key === 'when') return (yes, fn) => yes ? fn(el) : el;
    if (key === 'child') return child => { o.kids.push(child); return el; };
    if (key === 'children') return children => { o.kids.push(...children); return el; };
    return (...args) => { o.attrs[key] = args; return el; };
  } }); return el;
}
const nodes = el => el && typeof el === 'object' && el.kids ? [el, ...el.kids.flatMap(nodes)] : [];
const find = (tree, id) => nodes(tree).find(el => el.attrs.id?.[0] === id);
const marker = (tree, size) => nodes(tree).find(el => el.attrs.bg?.[0] === '#8844cc' && (el.attrs.size?.[0] === size || el.attrs.w?.[0] === size));
const signature = node => JSON.stringify(node?.attrs);
const store = new Map(), copies = [], refreshes = new Set(), jobs = [], calls = [];
const subscription = await loadMod({host:{shared:key=>store.get(key),checking:()=>false},globals:{URL},
  modules:{'space-color-state.js':{currentSpaceColor:()=>null}},entry:"export {watchUpdates} from './plugins/git/relay-client.js';"});
let rendering = false;
const duringRender = fn => { const before=rendering; rendering=true; try{return fn();}finally{rendering=before;} };
let width = 248, nativeReady = false, coreReady = false, managed = false, failExec = false, transport = null;
let clock = Date.now();
class Clock extends Date { static now() { return clock; } }
let next = { revision: 'a'.repeat(40), check: { checked: 1000, available: false } };
const theme = Object.fromEntries(['accent', 'chrome', 'muted', 'foreground', 'dim', 'border', 'selected', 'solid', 'solid_foreground'].map((key, i) => [key, i === 0 ? '#8844cc' : `#${String(i).repeat(6)}`]));
const realFiles = {
  './ui.js': 'src/ui/ui.js', './reorder.js': 'src/ui/reorder.js',
  './sidebar-footer.js': 'src/ui/sidebar-footer.js', './settings-sections.js': 'src/ui/settings-sections.js',
  './settings-back.js': 'src/ui/settings-back.js',
  './settings-dialog.js': 'src/ui/settings-dialog.js',
  './customization-updates.js': 'src/shared/customization-updates.js',
  './customization-update-model.js': 'src/shared/customization-update-model.js',
  './customization-update-row.js': 'src/features/settings/customization-update-row.js',
  './update-check-feedback.js': 'src/features/settings/update-check-feedback.js',
};
async function mount(kind, props) {
  const context = vm.createContext({ Date: Clock, console }), cache = new Map(), requested = new Map();
  const copy = { kind, props, renders: 0, timers: [], afters:[], openings: [] };
  const clone = value => value === undefined ? undefined : vm.runInContext(`JSON.parse(${JSON.stringify(JSON.stringify(value))})`, context);
  const noop = () => null;
  const host = {
    props: () => clone(copy.props), theme: () => clone(theme), updates: () => clone({ app: { ready: nativeReady, updates: true }, core: { ready: coreReady, managed }, checks: true }),
    window: () => clone({ platform: 'windows' }), layout: () => clone({ id: 'sidebar', size: { px: width } }),
    appHome: () => '/fixture', checking: () => false, shared: key => clone(store.get(key)),
    setShared(key, value) {
      assert.equal(rendering,false,'No shared publication from Settings/chrome/menu render');
      const encoded = JSON.stringify(value);
      if (encoded === JSON.stringify(store.get(key))) return;
      store.set(key, JSON.parse(encoded));
      for (const root of copies) refreshes.add(root);
    },
    exec: async (_command, args) => { assert.equal(rendering,false,'No worker request during render'); const request = JSON.parse(args[1]); calls.push({ kind, ...request }); if (failExec) throw Error('fixture transport unavailable'); return transport ? transport(request) : { code: 0, stdout: JSON.stringify(next) }; },
    keys: () => [], spaces: () => [], terminals: () => [], panes: () => [], agents: () => [],
    readTextFile: async () => null,
    run: noop, openOverlay: spec => { copy.openings.push(clone(spec)); return 'o1'; },
    closeOverlay: id => calls.push({ kind, action: 'closeOverlay', id }),
  };
  const primitives = { View: class {}, div: element, svg: element, image: element, h_flex: element, v_flex: element,
    Input: {}, InputState: { new: () => ({ on() {}, value: () => '' }) }, Popover: {}, Scrollbar: { vertical: element }, ScrollHandle: { new: () => ({ scroll_to_item() {} }) },
    Popup: { new: (id, trigger) => element().id(id).child(trigger) } };
  const values = { liveTheme: host.theme, pluginIsEnabled: () => true, pluginTextOpen: () => false,
    pluginEvent(name,context){if(name==='updates.watch')subscription.watchUpdates({...context,enabled:true,setting:()=> 'https://relay.test'});},
    M: { bodyInset: 16 }, sectionRow: (_t, el) => el, sectionStack: (_t, el) => el, divider: () => element(), dividerHeight: () => 1 };
  function source(name, file) {
    const text = read(file);
    for (const match of text.matchAll(/import\s*\{([^}]+)\}\s*from\s*['"]([^'"]+)['"]/g)) {
      const names = requested.get(match[2]) ?? new Set();
      for (const binding of match[1].split(',')) names.add(binding.trim().split(/\s+as\s+/)[0]);
      requested.set(match[2], names);
    }
    return new vm.SourceTextModule(text, { context, identifier: name });
  }
  async function load(name) {
    if (cache.has(name)) return cache.get(name);
    const file = name === './main.js' ? `src/features/${kind}/main.js` : realFiles[name];
    let mod;
    if (file) mod = source(name, file);
    else {
      const exports = name === './host.js' ? { ...Object.fromEntries([...(requested.get(name) ?? [])].map(key => [key, () => { throw Error(`Unexpected host call: ${key}`); }])), ...host } : name.startsWith('gpui-') ? primitives
        : Object.fromEntries([...(requested.get(name) ?? [])].map(key => [key, values[key] ?? noop]));
      mod = new vm.SyntheticModule(Object.keys(exports), function() { for (const [key, value] of Object.entries(exports)) this.setExport(key, value); }, { context });
    }
    cache.set(name, mod); return mod;
  }
  const main = await load('./main.js'); await main.link(load); await main.evaluate();
  copy.view = new main.namespace.default();
  copy.cx = { notify: () => {assert.equal(rendering,false,'No synchronous notify from Settings/chrome/menu render');refreshes.add(copy);}, stop_propagation() {}, focus_handle: () => ({ focus() {} }),
    spawn: fn => jobs.push(fn(copy.cx)), timer: { every: (ms, fn) => copy.timers.push({ ms, fn }), after: (ms,fn)=>copy.afters.push({at:clock+ms,fn}) } };
  copy.render = () => duringRender(() => { copy.tree = copy.view.render(copy.cx); copy.renders++; });
  copies.push(copy);
  if (kind === 'settings') {
    // Only unrelated page bodies are stubbed, not Settings init/navigation,
    // Updates, the controller or the shared-state publication path.
    copy.view.look = copy.view.privacy = () => element();
    copy.view.init({}, copy.cx);
  } else copy.view.init({}, copy.cx);
  copy.api = cache.get('./customization-updates.js')?.namespace;
  copy.render(); return copy;
}
async function settle() {
  while (jobs.length || refreshes.size) {
    while (jobs.length) await Promise.all(jobs.splice(0));
    const dirty = [...refreshes]; refreshes.clear();
    for (const copy of dirty) copy.render();
  }
}
const openingA = 'settings-first-opening-123456789';
const settings = await mount('settings', { overlay: 'o1', section: 'look', settingsOpening: openingA });
assert.equal(settings.view.section, 'look');
find(settings.tree, 'st-s-updates').attrs.on_click[0]({}, settings.cx);
const header = await mount('workspace-chrome', {});
const footer = await mount('workspace-chrome', { footer: true });
const compact = await mount('workspace-chrome', { footer: true });
const menu = await mount('menu', { tab: 'footer' });
await settle();
// Different live layout widths for the two footer roots, as two windows could use.
compact.render = () => duringRender(() => { const before = width; width = 44; compact.tree = compact.view.render(compact.cx); compact.renders++; width = before; });
compact.render();
const settingsEntry = () => {
  const index = menu.view.list().findIndex(it => it[7] === 'settings');
  return find(menu.tree, `mi-${index}`);
};
const surfaces = () => [find(footer.tree, 'settings'), find(compact.tree, 'footer-menu'), settingsEntry(), find(settings.tree, 'st-s-updates')];
const markers = () => surfaces().map((tree, i) => marker(tree, i === 3 ? 7 : 6));
assert.deepEqual(markers().map(Boolean), [false, false, false, false]);
assert.equal(footer.timers.length, 0, 'Footer reader has no polling/controller');
assert.ok(header.afters.some(timer => timer.at === clock+120000));
// Review regression: a failed manual check followed immediately by Updates
// navigation must not turn the unchanged cached success into confirmation.
// A frozen clock makes this exactly within the native three-second window.
const cachedCheck = JSON.stringify(store.get(KEY).check);
failExec = true;
find(settings.tree, 'st-check-customizations').attrs.on_click[0](null, settings.cx);
await settle();
assert.ok(find(settings.tree, 'st-check-customizations').kids.includes('Check now'));
failExec = false;
find(settings.tree, 'st-s-updates').attrs.on_click[0]({}, settings.cx);
await settle();
assert.equal(calls.at(-1).action, 'status', 'actual Updates navigation performs a status request');
assert.equal(JSON.stringify(store.get(KEY).check), cachedCheck, 'status restored the unchanged cached current result');
assert.ok(find(settings.tree, 'st-check-customizations').kids.includes('Check now'), 'failed check cannot be revived as success feedback by cached status');
assert.equal(settings.view.customUpdateAsked, null);
const before = copies.map(copy => copy.renders);
// This is the real rendered row callback, not a test-only publication or render.
next = { ...next, check: { checked: 2000, available: true } };
find(settings.tree, 'st-check-customizations').attrs.on_click[0](null, settings.cx);
await settle();
assert.equal(store.get(KEY).check.available, true);
assert.equal(calls.at(-1).kind, 'settings'); assert.equal(calls.at(-1).action, 'check');
assert.equal(calls.at(-1).force, true);
assert.deepEqual(markers().map(Boolean), [true, true, true, true], 'manual publication refreshes all already-mounted marker roots');
assert.ok(copies.every((copy, i) => copy.renders > before[i]));
const customSignatures = markers().map(signature);
assert.deepEqual(find(footer.tree, 'settings').attrs.relative, []);
assert.deepEqual(markers()[0].attrs.top, [2]); assert.deepEqual(markers()[0].attrs.right, [2]);
assert.deepEqual(markers()[0].attrs.rounded_full, []);
assert.deepEqual(markers()[3].attrs.h, [7]); assert.deepEqual(markers()[3].attrs.rounded, [4]);
// Status publications let us exercise current clearing without a new custom UI
// confirmation or a manually forced render; native changes use the host's refresh.
for (const native of [false, true]) for (const custom of [false, true]) {
  nativeReady = native;
  for (const copy of copies) refreshes.add(copy); // native update-status changed
  next = { ...next, check: { checked: 3000, available: custom } };
  settings.api.refreshCustomizationUpdates(settings.view, settings.cx);
  await settle();
  assert.deepEqual(markers().map(Boolean), Array(4).fill(native || custom), `native=${native}, custom=${custom}`);
  if (native && !custom) assert.deepEqual(markers().map(signature), customSignatures, 'native-only and custom-only markers have identical markup');
}
nativeReady = false; coreReady = true;
next = { ...next, check: { checked: 4000, available: false } };
settings.api.refreshCustomizationUpdates(settings.view, settings.cx); await settle();
assert.deepEqual(markers().map(Boolean), [false, false, false, true], 'Core-only readiness retains the native nav predicate');
managed = true; for (const copy of copies) refreshes.add(copy); await settle();
assert.deepEqual(markers().map(Boolean), [false, false, false, false], 'managed Core does not light navigation');
assert.equal(find(footer.tree, 'settings').attrs.accessibility_label[0], 'Settings');
assert.ok(!markers().some(Boolean));
// Real Git update subscriber -> real chrome controller -> every mounted marker.
const relay = {scope:'marker-relay',owner:'live',ready:1,repositories:{'timurproko/herdr-app':{revision:1,main:1}}};
store.set(RELAY_STATE,relay); for(const copy of copies)refreshes.add(copy);
const beforeHint=calls.length;
next={...next,check:{attempted:clock+300,checked:clock+300,available:true,nextAttempt:clock+150000}};
await settle(); assert.equal(calls.length,beforeHint,'merge hint does not claim a badge or dispatch before debounce');
clock+=300;
for(const copy of copies)for(const timer of copy.afters.splice(0)){if(timer.at<=clock)timer.fn(copy.cx);else copy.afters.push(timer);}
await settle();
assert.equal(calls.length,beforeHint+1);assert.equal(calls.at(-1).kind,'workspace-chrome');
assert.equal(calls.at(-1).action,'check');assert.equal(calls.at(-1).force,false);assert.equal(calls.at(-1).invalidate,true);
assert.deepEqual(markers().map(Boolean),[true,true,true,true],'merge hints update existing markers without Check now');
relay.repositories['other/repo']={revision:2,main:2};for(const copy of copies)refreshes.add(copy);await settle();
assert.equal(calls.length,beforeHint+1,'unrelated repository does not check');
assert.ok(calls.slice(beforeHint).every(call=>call.action!=='launch'));
store.delete(RELAY_STATE);next={...next,check:{checked:clock,available:false}};
settings.api.refreshCustomizationUpdates(settings.view,settings.cx);await settle();
assert.ok(!markers().some(Boolean));
// A fresh module graph/owner, original overlay props and shared host store model
// host replacement. Removed generations no longer have timers or redraws.
function retire(copy) {
  copy.view.close();
  copy.timers.length = 0;
  copies.splice(copies.indexOf(copy), 1); refreshes.delete(copy);
}
const navKey = 'custom.settings.navigation'; // ignored legacy runtime records
const closes = () => calls.filter(call => call.action === 'closeOverlay').length;
const beforeReplacement = closes();
retire(settings); // native/backdrop dismissal or shutdown: no dismiss() call
store.set(navKey, { version: 1, dialogs: [{ overlay: 'o1', section: 'updates' }] });
for (const section of [undefined, 'privacy']) {
  const reused = await mount('settings', { overlay: 'o1', section }); await settle();
  assert.equal(reused.view.section, section || 'look', 'persisted native o1 must not override a new opening'); retire(reused);
}
const replacement = await mount('settings', settings.props); await settle();
assert.equal(replacement.view.section, 'look', 'ordinary section navigation is not persisted, even for the same opening');
assert.equal(closes(), beforeReplacement, 'lifecycle teardown does not close/reopen a retained overlay');
retire(replacement);
const directed = await mount('settings', { overlay: 'o1', section: 'updates' }); await settle();
assert.equal(directed.view.section, 'updates', 'explicit Updates entry remains supported without an opening identity'); retire(directed);
// The actual opener supplies a fresh nonce at the event, not when a menu is
// built. Frozen time and a new VM still cannot reuse the process-local o1 id.
footer.view.openFooter('settings'); footer.view.openFooter('settings');
const firstOpen = footer.openings.at(-2), secondOpen = footer.openings.at(-1);
assert.notEqual(firstOpen.props.settingsOpening, secondOpen.props.settingsOpening);
const restartedFooter = await mount('workspace-chrome', { footer: true }); await settle();
restartedFooter.view.openFooter('settings');
const restartProps = restartedFooter.openings.at(-1).props;
assert.notEqual(firstOpen.props.settingsOpening, restartProps.settingsOpening, 'opening identity survives neither native dismissal nor a desktop restart');
// Actual Settings + row callbacks survive an update's replacement, including
// the interval before the old launch call has delivered its receipt.
const available = { revision: 'a'.repeat(40), check: { attempted: clock - 10, checked: clock - 10, available: true } };
store.set(KEY, available); next = available;
const initiating = await mount('settings', settings.props); await settle();
assert.equal(initiating.view.section, 'look');
find(initiating.tree, 'st-s-updates').attrs.on_click[0]({}, initiating.cx); await settle();
let resolveLaunch;
const launchReceipt = new Promise(resolve => { resolveLaunch = resolve; });
transport = request => request.action === 'launch' ? launchReceipt : { code: 0, stdout: JSON.stringify(next) };
find(initiating.tree, 'st-check-customizations').attrs.on_click[0](null, initiating.cx);
const discardedJobs = jobs.splice(0); retire(initiating);
const replacing = await mount('settings', settings.props); await settle();
const rowButton = copy => find(copy.tree, 'st-check-customizations');
const text = copy => nodes(copy.tree).flatMap(node => node.kids).filter(value => typeof value === 'string').join(' ');
assert.equal(replacing.view.section, 'updates');
assert.ok(rowButton(replacing).kids.includes('Updating…'));
assert.equal(rowButton(replacing).attrs.disabled[0], true);
const launchCount = calls.filter(call => call.action === 'launch').length;
rowButton(replacing).attrs.on_click[0](null, replacing.cx); await settle();
assert.equal(calls.filter(call => call.action === 'launch').length, launchCount);
const running = { ...available, locked: true, job: { token: 'settings-update', started: clock, state: 'running', deadline: clock + 1800000 } };
next = running; resolveLaunch({ code: 0, stdout: JSON.stringify(running) }); await Promise.all(discardedJobs);
replacing.timers.find(timer => timer.ms === 1000).fn(replacing.cx); await settle();
assert.ok(rowButton(replacing).kids.includes('Updating…'));
retire(replacing);
const during = await mount('settings', settings.props); await settle();
assert.equal(during.view.section, 'updates'); assert.ok(rowButton(during).kids.includes('Updating…'));
const resume = store.get(KEY).resume;
assert.equal(resume.opening, openingA);
retire(during); // host/native dismissal leaves the durable hint, not a live view
// Native dismissal leaves the resume hint behind; another opening, even after
// restarting Desktop with a reused o1 while the old runner is active, cannot use it.
for (const destination of [undefined, 'privacy']) {
  const newOpening = await mount('settings', { ...restartProps, overlay: 'o1', section: destination }); await settle();
  assert.equal(newOpening.view.section, destination || 'look', 'active job belongs to its original opening, not reused o1'); retire(newOpening);
  const unqualified = await mount('settings', { overlay: 'o1', section: destination }); await settle();
  assert.equal(unqualified.view.section, destination || 'look', 'missing identity fails closed even with an active old job'); retire(unqualified);
}
const final = { revision: 'b'.repeat(40), job: { ...running.job, state: 'complete', finished: clock }, check: { attempted: clock + 1, checked: clock + 1, available: false } };
next = final;
const completing = await mount('settings', settings.props); await settle();
assert.equal(completing.view.section, 'updates');
assert.match(text(completing), /herdr-app-custom bbbbbbb/); assert.match(text(completing), /Up to date\. Checked at/);
retire(completing);
const justFinished = await mount('settings', settings.props); await settle();
assert.equal(justFinished.view.section, 'updates'); assert.match(text(justFinished), /herdr-app-custom bbbbbbb/);
assert.match(text(justFinished), /Up to date/); retire(justFinished);
for (const destination of [undefined, 'privacy']) {
  const reopened = await mount('settings', { ...restartProps, overlay: 'o1', section: destination }); await settle();
  assert.equal(reopened.view.section, destination || 'look', 'a recent result cannot retarget a new opening'); retire(reopened);
}
for (const [state, expected] of [['partial', /some machines skipped or failed/], ['failed', /Update failed.*documented rollback/], ['unknown', /outcome unknown/]]) {
  store.set(KEY, { ...running, resume }); next = { ...final, job: { ...final.job, state, error: 'fixture result' } };
  const result = await mount('settings', settings.props);
  assert.equal(result.view.section, 'updates'); assert.ok(rowButton(result).kids.includes('Updating…'));
  await settle(); assert.match(text(result), expected); assert.ok(!text(result).includes('Up to date'));
  retire(result);
}
store.set(KEY, { ...running, resume }); next = running;
const navigating = await mount('settings', settings.props); await settle();
assert.equal(navigating.view.section, 'updates');
find(navigating.tree, 'st-s-privacy').attrs.on_click[0]({}, navigating.cx); await settle();
assert.equal(store.get(KEY).resume, null, 'deliberate navigation disarms update restoration'); retire(navigating);
const navigated = await mount('settings', settings.props); await settle();
assert.equal(navigated.view.section, 'look'); retire(navigated);
store.set(KEY, { ...running, resume });
const dismissing = await mount('settings', settings.props); await settle();
dismissing.tree.attrs.on_key_down[0]({ key: 'escape' }, dismissing.cx); retire(dismissing);
assert.equal(store.get(KEY).resume, null, 'explicit dismissal disarms the resume hint');
assert.equal(closes(), beforeReplacement + 1, 'only the explicit user dismissal closes an overlay');
store.set(KEY, { ...final, resume }); next = final;
clock += 120000;
const boundary = await mount('settings', settings.props); await settle();
assert.equal(boundary.view.section, 'updates', 'completion resume lasts at most two minutes'); retire(boundary);
clock++;
const expired = await mount('settings', settings.props); await settle();
assert.equal(expired.view.section, 'look', 'finished-job restoration ends after two minutes'); retire(expired);
for (const badResume of [null, { opening: openingA, started: 'invalid' }, { opening: 'different-opening', started: clock }]) {
  store.set(KEY, { ...running, resume: badResume }); next = running;
  const invalid = await mount('settings', settings.props); await settle();
  assert.equal(invalid.view.section, 'look', 'invalid/mismatching resume hints never choose a section'); retire(invalid);
}
transport = null;
const beforeTeardown=calls.length;header.view.close();
assert.equal(header.view.customUpdateClosed,true);assert.equal(header.view.customAutoTimer,null);
for(const timer of header.afters.splice(0))timer.fn(header.cx);await settle();
assert.equal(calls.length,beforeTeardown,'actual chrome teardown cancels automatic timer callbacks');
console.log('PASS: real Settings init/row/controller replacement; per-opening update-only resume, reused o1 native dismissal/restart, expiry/destination guards and marker parity. No native UI exercised.');
