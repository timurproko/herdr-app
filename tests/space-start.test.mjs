import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {realUi} from './support/panel-kit.mjs';
function element() {
  const node = { attrs: {}, kids: [] }; let el;
  el = new Proxy(node, { get(o, k) {
    if (k in o) return o[k];
    if (k === 'when') return (yes, fn) => yes ? fn(el) : el;
    if (k === 'child') return v => { o.kids.push(v); return el; };
    if (k === 'children') return v => { o.kids.push(...v); return el; };
    return (...args) => { o.attrs[k] = args; return el; };
  } }); return el;
}
function find(node, id) { return node?.attrs?.id?.[0] === id ? node : node?.kids?.map(k => find(k, id)).find(Boolean); }
const calls = [], overlays = [], state = {}, tasks = [], timers = [];
let redraws = 0, crewOn = false;
let world = [{ id: 'pc2/project', active: true, machine: 'pc2', tabs: [{ id: 'pc2/start', active: true }] }];
let items = [
  { key: 'terminal', name: 'Bash', run: ['bash', '--login'], show: true, available: true },
  { key: 'a1', name: 'A1', command: 'a1', run: ['/resolved/a1'], configuredArgs: ['--test'], show: true, available: true },
  { key: 'hidden', name: 'Hidden', show: false, available: true },
  { key: 'missing', name: 'Missing', show: true, available: false },
];
const mocks = {
  'gpui-kit': { View: class {}, div: element, svg: asset => element().asset(asset), image: asset => element().asset(asset) },
  'gpui-base': { v_flex: element, h_flex: element },
  './host.js': {
    spaces: () => world, props: () => ({ spaceId: 'pc2/project' }), theme: () => ({ foreground: 'foreground', dim: 'dim', border: 'border' }),
    panes: () => [{ tab: 'pc2/start', mod: 'custom-space-start' }], window: () => ({ active: true }),
    openOverlay: p => overlays.push(p), run: (...args) => calls.push(args),
    keys: () => [{ section: 'global', keys: 'ctrl-shift-t', action: 'tab.new' }], nextCommand: async () => null,
    shared: key => state[key], setShared: (key, value) => { state[key] = value; }, readTextFile: async () => null,
  },
  './ui.js': { hotkey: v => String(v ?? ''), menuRow: realUi(element).menuRow, rolePillButton: realUi(element).rolePillButton, U: { row: 28, rowGap: 2, icon: 16, gap: 8, font: 12.5 }, slot: icon => element().child(icon), menuHeading: (_t, text) => element().child(text), ROLE_LABELS: { firstmate: 'Crew' }, ROLE_ACTIONS: { firstmate: 'Start Crew' } },
  './profiles.js': { cachedProfiles: () => items, composeProfiles: () => items, warmProfiles: async () => items, PROFILE_ROLES: ['firstmate'],
    launchList: (list, roles = []) => list.filter(p => p.show || (p.key !== 'terminal' && roles.includes(p.role))), plainProfile: p => p.role ? { ...p, role: null } : p },
  './plugins.js': { pluginGateReady: name => { assert.equal(name, 'profile.role.firstmate'); return crewOn; } },
  './directory.js': { spaceStartFolder: s => { assert.equal(s.id, 'pc2/project'); return 'D:/Work/a project'; }, warmSpaceStartFolder: async s => { assert.equal(s.id, 'pc2/project'); } },
};
const context = vm.createContext({}), cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const file = name === 'start' ? 'src/features/space-start/main.js' : name === 'settings' ? 'src/features/settings/spaces-ui.js' : 'src/shared/' + name.slice(2);
  const module = mocks[name] ? new vm.SyntheticModule(Object.keys(mocks[name]), function() { for (const [key, value] of Object.entries(mocks[name])) this.setExport(key, value); }, { context })
    : new vm.SourceTextModule(fs.readFileSync(new URL('../' + file, import.meta.url), 'utf8'), { context });
  cache.set(name, module); await module.link(load); return module;
}
let focused = 0;
const cx = { focus_handle: () => ({ focus() { focused++; } }), spawn: fn => tasks.push(fn(cx)), notify() { redraws++; }, timer: { every: (ms, fn) => { assert.equal(ms, 500); timers.push(fn); } } };
const start = await load('start'); await start.evaluate();
const view = new start.namespace.default(); view.init({}, cx); await Promise.all(tasks);
let tree = view.render();
assert.ok(focused > 0, 'The Start page takes the keyboard so number keys work');
assert.ok(tree.attrs.track_focus && tree.attrs.on_key_down, 'The Start page handles keys');
const card = find(tree, 'space-start-content');
assert.equal(card.attrs.border_color[0], 'border');
assert.ok(card.attrs.border_1);
assert.equal(card.attrs.bg[0], 'foreground03', 'Only the card background is softly tinted; text is never dimmed');
assert.equal(card.attrs.rounded[0], 8, 'Same corner as the + menu surface');
assert.equal(card.attrs.p[0], 4, 'Same padding as the + menu surface');
assert.equal(card.attrs.max_w[0], 308, 'Card padding preserves the existing 300px row area');
assert.ok(find(tree, 'space-start-terminal'));
assert.ok(find(tree, 'space-start-profile-a1'));
assert.equal(find(tree, 'space-start-profile-hidden'), undefined);
assert.equal(find(tree, 'space-start-profile-missing').attrs.text_color[0], 'foreground', 'Inactive choices keep their normal text color');
find(tree, 'space-start-profile-missing').attrs.on_click[0]();
assert.equal(calls.length, 0, 'Unavailable exposed profiles ignore clicks without dimming');
assert.equal(find(tree, 'space-start-terminal').attrs.h[0], 28, 'Terminal is the same compact icon row as profiles, not a large CTA');
assert.equal(find(tree, 'space-start-flag'), undefined, 'The racing flag belongs only in the pane header');
assert.ok(!JSON.stringify(tree).includes('Start something new'), 'No large heading in content');
assert.equal(find(tree, 'space-start-edit-profiles'), undefined, 'The Start page only offers things to start: no Edit profiles');
assert.equal(find(tree, 'space-start-firstmate-heading'), undefined, 'No Crew heading without crew profiles');
const beforeRedraws = redraws; timers[0](cx); assert.equal(redraws, beforeRedraws, 'Unchanged catalog does not redraw');
items.push({ key: 'claude', name: 'Claude Code', icon: 'icons/claude.svg', tint: false, show: true, available: true });
timers[0](cx); assert.equal(redraws, beforeRedraws + 1, 'The visible page follows newly exposed menu profiles without extra discovery');
tree = view.render(); assert.ok(find(tree, 'space-start-profile-claude'));
assert.equal(find(tree, 'space-start-profiles').attrs.h[0], 88, 'All three exposed profile rows fit; a max-height-only native viewport clips later rows');
assert.equal(calls.length, 0, 'Rendering/warming the Start page starts nothing');
find(tree, 'space-start-terminal').attrs.on_click[0]();
assert.equal(calls.at(-1)[0], 'tab.new');
assert.equal(JSON.stringify(calls.at(-1)[1]), JSON.stringify({ folder: 'D:/Work/a project', space: 'pc2/project', argv: ['bash', '--login'] }));
const layoutIds = node => [node?.attrs?.id?.[0], ...(node?.kids ?? []).flatMap(layoutIds)].filter(Boolean);
const beforeLaunchLayout = layoutIds(tree);
assert.ok(JSON.stringify(find(tree, 'space-start-profile-a1')).includes('"1"'), 'Profile rows show their number key');
assert.ok(JSON.stringify(find(tree, 'space-start-profile-claude')).includes('"2"'), 'Second available profile shows 2');
let keyStopped = false; const keyCx = { stop_propagation() { keyStopped = true; } };
tree.attrs.on_key_down[0]({ key: '2', modifiers: { control: true } }, keyCx);
assert.ok(!keyStopped && !state['custom.profile-launches']?.length, 'Modified digits are not profile shortcuts');
tree.attrs.on_key_down[0]({ key: '2', modifiers: {} }, keyCx);
assert.ok(keyStopped, 'Number key is consumed');
assert.equal(state['custom.profile-launches'].at(-1).profile, 'claude', 'Number 2 starts the second profile');
state['custom.profile-launches'] = []; tree = view.render();
find(tree, 'space-start-profile-a1').attrs.on_click[0]();
const pendingTree = view.render();
assert.deepEqual(layoutIds(pendingTree), beforeLaunchLayout, 'Profile startup adds no status row or layout shift');
assert.ok(!JSON.stringify(pendingTree).includes('Opening '), 'No Opening message in the content area');
const pendingRow = find(pendingTree, 'space-start-profile-a1');
assert.equal(pendingRow.attrs.text_color[0], 'foreground');
assert.equal(pendingRow.attrs.opacity, undefined);
assert.equal(pendingRow.attrs.disabled, undefined, 'Do not use native disabled styling that can gray out rows');
const pendingJobs = state['custom.profile-launches'].length;
pendingRow.attrs.on_click[0]();
assert.equal(state['custom.profile-launches'].length, pendingJobs, 'Pending choices ignore repeated clicks without changing appearance');
const job = state['custom.profile-launches'][0];
assert.equal(job.space, 'pc2/project'); assert.equal(job.machine, 'pc2'); assert.equal(job.originTab, 'pc2/start');
assert.equal(JSON.stringify(job.argv), JSON.stringify(['a1', '--test']));
assert.equal(JSON.stringify(job.shell), JSON.stringify(['bash', '--login']));
assert.equal(overlays.length, 0, 'Launching from the Start page opens no settings overlay');
// Crew: one row per profile; a profile in Crew's list carries a Crew pill. The row starts it as
// itself, the pill starts it as the crew coordinator. Listed even when hidden from + (the pill
// is reached from the row), and only while the Crew plugin is on.
items.push({ key: 'crewcc', name: 'Claude Code', command: 'claude', configuredArgs: [], show: false, available: true, role: 'firstmate' });
assert.equal(find(view.render(), 'space-start-profile-crewcc'), undefined, 'Crew plugin off: a hidden crew profile stays hidden');
state['custom.profile-launches'] = []; // nothing pending, so the rows are live
crewOn = true; tree = view.render();
assert.equal(find(tree, 'space-start-firstmate-heading'), undefined, 'No separate Crew heading or duplicate rows');
let crewRow = find(tree, 'space-start-profile-crewcc'); assert.ok(crewRow, 'Listed under Profiles even when hidden from +');
assert.equal(find(crewRow, 'space-start-firstmate-crewcc'), undefined, 'The Crew pill stays hidden until the row is hovered');
crewRow.attrs.on_hover[0](true, cx); tree = view.render(); crewRow = find(tree, 'space-start-profile-crewcc');
const pill = find(crewRow, 'space-start-firstmate-crewcc'); assert.ok(pill, 'The row carries the Crew pill');
assert.ok(pill.kids.includes('Start Crew'), 'The pill reads Start Crew');
let stopped = false;
pill.attrs.on_click[0]({}, { stop_propagation() { stopped = true; } });
assert.equal(state['custom.profile-launches'].at(-1).role, 'firstmate', 'The pill starts it as the crew coordinator'); assert.ok(stopped, 'The pill’s click is its own');
state['custom.profile-launches'] = []; tree = view.render();
assert.ok(find(find(tree, 'space-start-profile-crewcc'), 'space-start-firstmate-crewcc'), 'The pill stays while hovered');
find(tree, 'space-start-profile-crewcc').attrs.on_click[0]();
assert.equal(state['custom.profile-launches'].at(-1).role, null, 'The row starts it as itself');
assert.equal(find(find(tree, 'space-start-profile-a1'), 'space-start-firstmate-a1'), undefined, 'No pill on a profile outside Crew');
find(tree, 'space-start-profile-crewcc').attrs.on_hover[0](false, cx); tree = view.render();
assert.equal(find(find(tree, 'space-start-profile-crewcc'), 'space-start-firstmate-crewcc'), undefined, 'Leaving the row hides the pill');
items.pop(); crewOn = false; tree = view.render();
const before = calls.length, queued = state['custom.profile-launches'].length;
world[0].active = false;
find(tree, 'space-start-terminal').attrs.on_click[0](); find(tree, 'space-start-profile-a1').attrs.on_click[0]();
assert.equal(calls.length, before); assert.equal(state['custom.profile-launches'].length, queued, 'A stale page cannot launch into new focus');
items = [{ key: 'terminal', available: false, show: true }];
const unavailable = find(view.render(), 'space-start-terminal');
assert.equal(unavailable.attrs.text_color[0], 'foreground');
unavailable.attrs.on_click[0]();
assert.equal(calls.length, before, 'Unavailable configured shells never fall back to a different launcher');
// Real Spaces page toggles persist independent choices.
const settings = await load('settings'); await settings.evaluate();
const owner = { heading: element, row: (_t, title, about, control) => element().id(title).child(about).child(control),
  toggle: (_t, id, on, click) => element().id(id).on_click(click).value(on) };
tree = settings.namespace.spacesPage(owner, {});
assert.equal(find(tree, 'st-spaces-confirm').attrs.value[0], false);
assert.equal(find(tree, 'st-spaces-close').attrs.value[0], true);
find(tree, 'st-spaces-confirm').attrs.on_click[0]({}, cx);
find(tree, 'st-spaces-close').attrs.on_click[0]({}, cx);
assert.equal(state['custom.spaces.preferences'].confirmLastTab, true);
assert.equal(state['custom.spaces.preferences'].closeOnLastTab, false);
console.log('PASS: Spaces page toggle actions, deferred Start UI, enabled/available profiles, configured terminal/profile launch reuse, remote scope, stale-focus rejection and zero automatic launches');
