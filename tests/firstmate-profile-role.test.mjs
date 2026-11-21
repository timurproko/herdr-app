// "Run as crew coordinator" (role id `firstmate`): a profile role bound to the profile key, and the fail-closed launch
// gate behind it. Everything is a fixture: fake shared state, a fake hc table, a fake Core.
// No agent, terminal, core, Firstmate script or machine is touched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';
import { loadMod } from '../tools/plugin-harness.mjs';
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..'), require = createRequire(import.meta.url);
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m);
const synthetic = (values, context) => new vm.SyntheticModule(Object.keys(values), function () { for (const [k, v] of Object.entries(values)) this.setExport(k, v); }, { context });
async function load(file, deps, context) {
  const mod = new vm.SourceTextModule(fs.readFileSync(path.join(root, file), 'utf8'), { context, identifier: file });
  await mod.link(s => { const d = deps[s]; if (!d) throw Error(`Unexpected import ${s} from ${file}`); return typeof d === 'string' ? load(d, deps, context) : synthetic(d, context); });
  await mod.evaluate();
  return mod.namespace;
}

// --- 1. Model: the role is saved by key and survives rename/reorder/uncheck -------------
{
  const shared = new Map(), ctx = vm.createContext({ sessionStorage: { getItem: () => null, setItem() {} } });
  const host = { shared: k => shared.get(k), setShared: (k, v) => shared.set(k, v), knownAgents: async () => [], readTextFile: async () => '', appHome: () => 'C:/x', exec: async () => ({ code: 1, stdout: '' }) };
  const p = await load('src/shared/profiles.js', { './host.js': host }, ctx);
  const native = [{ key: 'claude', name: 'Claude Code', run: ['claude'], installed: true }];
  // Default off: nothing existing becomes a coordinator, and the Terminal row has no role.
  assert.ok(p.composeProfiles(null, native).every(x => x.role === null));
  assert.equal(p.validateProfile('A1', 'a1', '[]', null).firstmate, undefined, 'Without the editor offering the role nothing is saved');
  assert.equal(p.validateProfile('Shell', 'bash', '[]', 'terminal', { firstmate: true }).firstmate, undefined, 'The Terminal row never carries a role');
  const value = p.validateProfile('A1 — Firstmate', 'a1', '[]', null, { firstmate: true });
  same(value, { name: 'A1 — Firstmate', command: 'a1', args: [], firstmate: true });
  const key = p.addProfile(null, value);
  let items = p.composeProfiles(null, native);
  assert.equal(items.find(x => x.key === key).role, 'firstmate');
  assert.equal(items.find(x => x.key === 'claude').role, null, 'Other profiles are unaffected');
  // Rename and reorder keep the role; the key is the identity, not the name.
  p.updateProfile(null, key, p.validateProfile('Renamed', 'a1', '["--session","x"]', key, { firstmate: true }));
  p.moveProfile(null, key, -1, p.composeProfiles(null, native));
  items = p.composeProfiles(null, native);
  assert.equal(items.find(x => x.key === key).role, 'firstmate');
  assert.equal(items.find(x => x.key === key).name, 'Renamed');
  // Marking an existing built-in profile works through its override.
  p.updateProfile(null, 'claude', p.validateProfile('Claude Code', 'claude', '[]', 'claude', { firstmate: true }));
  assert.equal(p.composeProfiles(null, native).find(x => x.key === 'claude').role, 'firstmate');
  // Unchecking wins over the stored custom entry; visibility is independent of the role.
  p.updateProfile(null, key, p.validateProfile('Renamed', 'a1', '[]', key, { firstmate: false }));
  p.updateProfile(null, key, { show: false });
  items = p.composeProfiles(null, native);
  assert.equal(items.find(x => x.key === key).role, null);
  assert.equal(items.find(x => x.key === key).show, false);
  p.updateProfile(null, key, { firstmate: true });
  assert.equal(p.composeProfiles(null, native).find(x => x.key === key).role, 'firstmate');
  // Machine scoped: pc2's copy of the same key has no role.
  assert.ok(p.composeProfiles('pc2', native).every(x => x.role === null));
  // Garbage in the stored field never becomes a role.
  p.updateProfile(null, 'claude', { firstmate: 'yes' });
  assert.equal(p.composeProfiles(null, native).find(x => x.key === 'claude').role, null);
  // Re-reading persisted state (an app restart) yields the same role.
  const again = await load('src/shared/profiles.js', { './host.js': host }, vm.createContext({ sessionStorage: { getItem: () => null, setItem() {} } }));
  assert.equal(again.composeProfiles(null, native).find(x => x.key === key).role, 'firstmate');
}

// --- 1b. Role lists: profiles join the Crew list by key; old crew-only copies fold into their twins ---
{
  const shared = new Map(), ctx = vm.createContext({ sessionStorage: { getItem: () => null, setItem() {} } });
  const host = { shared: k => shared.get(k), setShared: (k, v) => shared.set(k, v), knownAgents: async () => [], readTextFile: async () => '', appHome: () => 'C:/x', exec: async () => ({ code: 1, stdout: '' }) };
  const p = await load('src/shared/profiles.js', { './host.js': host }, ctx);
  const native = [{ key: 'claude', name: 'Claude Code', run: ['claude'], installed: true }];
  // The shape the app saved before role lists: "a1" and "Claude Code" each had a crew copy,
  // and one crew copy ("solo") had no ordinary twin.
  shared.set(p.profileKey(null), { version: 1, overrides: { claude: { show: true } }, order: ['terminal', 'plain-a1', 'claude', 'copy-a1', 'copy-cc', 'solo'], custom: [
    { key: 'plain-a1', name: 'a1', command: 'a1', args: [] },
    { key: 'copy-a1', name: 'a1', command: 'a1', args: [], firstmate: true },
    { key: 'copy-cc', name: 'Claude Code', command: 'claude', args: [], firstmate: true },
    { key: 'solo', name: 'Solo', command: 'pi', args: ['--x'], firstmate: true },
  ] });
  assert.equal(p.mergeRoleCopies(null, p.composeProfiles(null, native)), true);
  let items = p.composeProfiles(null, native);
  same(items.map(x => x.key), ['terminal', 'plain-a1', 'claude', 'solo'], 'Copies with a twin are gone; order of the rest is kept');
  same(p.roleProfiles(items, 'firstmate').map(x => x.key), ['plain-a1', 'claude', 'solo'], 'The role moved to the twins; a copy without a twin keeps it');
  assert.equal(items.find(x => x.key === 'claude').show, true, 'Visibility of the twin is untouched');
  assert.equal(p.mergeRoleCopies(null, items), false, 'Runs once: nothing left to fold');
  // The role's own order: kept apart from the Profiles order, applied to its list.
  same(p.roleOrder(null, 'firstmate'), []);
  p.setRoleOrder(null, 'firstmate', ['solo', 'claude', 'solo', 'bad\nkey']);
  same(p.roleOrder(null, 'firstmate'), ['solo', 'claude'], 'Deduplicated, unsafe keys dropped');
  same(p.roleProfiles(p.composeProfiles(null, native), 'firstmate', p.roleOrder(null, 'firstmate')).map(x => x.key), ['solo', 'claude', 'plain-a1'], 'Ordered ones first, the rest after in their usual order');
  same(p.composeProfiles(null, native).map(x => x.key), ['terminal', 'plain-a1', 'claude', 'solo'], 'The Profiles order is untouched');
  assert.throws(() => p.setRoleOrder(null, 'admin', []), /Invalid profile role/);
  // Add and remove by key; the profile itself stays an ordinary profile.
  p.setProfileRole(null, 'plain-a1', 'firstmate', false);
  items = p.composeProfiles(null, native);
  same(p.roleProfiles(items, 'firstmate').map(x => x.key), ['claude', 'solo']);
  assert.ok(items.some(x => x.key === 'plain-a1'), 'Removing from the role list keeps the profile');
  p.setProfileRole(null, 'plain-a1', 'firstmate', true);
  assert.equal(p.composeProfiles(null, native).find(x => x.key === 'plain-a1').role, 'firstmate');
  assert.throws(() => p.setProfileRole(null, 'terminal', 'firstmate', true), /Invalid profile role/);
  assert.throws(() => p.setProfileRole(null, 'claude', 'admin', true), /Invalid profile role/);
  // Editing a profile in Settings (no role offered) keeps its place in the role list.
  p.updateProfile(null, 'claude', p.validateProfile('Claude', 'claude', '["--x"]', 'claude'));
  assert.equal(p.composeProfiles(null, native).find(x => x.key === 'claude').role, 'firstmate');
  // One launch list: shown profiles, plus crew ones hidden from + while Crew is on (their pill is on the row).
  {
    const list = [{ key: 'terminal', show: true }, { key: 'a', show: true }, { key: 'b', show: false, role: 'firstmate' }, { key: 'c', show: false }];
    same(p.launchList(list, ['firstmate']).map(x => x.key), ['terminal', 'a', 'b']);
    same(p.launchList(list, []).map(x => x.key), ['terminal', 'a'], 'Crew off: only what + shows');
  }
  // Launching from Profiles is plain; the same object under Crew keeps its role.
  const crew = p.composeProfiles(null, native).find(x => x.key === 'claude');
  assert.equal(p.plainProfile(crew).role, null); assert.equal(crew.role, 'firstmate');
}

// --- 2. Queued launch: the click captures role/machine/space; one role job at a time --------
{
  const shared = new Map(); let world;
  const ctx = vm.createContext({});
  const host = { spaces: () => world, run() { throw Error('tab.new is for shells only'); }, shared: k => shared.get(k), setShared: (k, v) => shared.set(k, v) };
  const deps = { './host.js': host, './profiles.js': { composeProfiles: () => [{ key: 'terminal', run: ['bash'] }] }, './directory.js': { spaceStartFolder: () => 'D:/somewhere/else' } };
  const a = await load('src/shared/profile-actions.js', deps, ctx);
  world = [{ id: 'pc2/space', machine: 'pc2', active: true, tabs: [{ id: 'pc2/tab', active: true }] }];
  const coordinator = { key: 'custom-fm', name: 'A1 — Firstmate', command: 'a1', configuredArgs: [], available: true, role: 'firstmate' };
  const other = { key: 'custom-fm2', name: 'Second', command: 'a1', configuredArgs: [], available: true, role: 'firstmate' };
  const plain = { key: 'custom-a1', name: 'a1', command: 'a1', configuredArgs: [], available: true, role: null };
  a.launchSpaceProfile(coordinator, 'pc2/space', 'pc2');
  let jobs = shared.get('custom.profile-launches');
  assert.equal(jobs.length, 1);
  same({ machine: jobs[0].machine, space: jobs[0].space, role: jobs[0].role, profile: jobs[0].profile, argv: jobs[0].argv, cwd: jobs[0].cwd },
    { machine: 'pc2', space: 'pc2/space', role: 'firstmate', profile: 'custom-fm', argv: ['a1'], cwd: 'D:/somewhere/else' }, 'The click captures the exact machine/space/profile; cwd is only the space folder until the gate resolves the home');
  a.launchSpaceProfile(coordinator, 'pc2/space', 'pc2');
  a.launchSpaceProfile(other, 'pc2/space', 'pc2');
  assert.equal(shared.get('custom.profile-launches').length, 1, 'Repeated clicks and a second marked profile cannot queue another coordinator while one is pending');
  a.launchSpaceProfile(plain, 'pc2/space', 'pc2');
  jobs = shared.get('custom.profile-launches');
  assert.equal(jobs.length, 2, 'Ordinary profiles are not blocked by the role lease');
  assert.equal(jobs[1].role, null);
  // The coordinator profile launched plainly (from Profiles) is a different launch from its Crew one.
  a.launchSpaceProfile({ ...coordinator, role: null }, 'pc2/space', 'pc2');
  jobs = shared.get('custom.profile-launches');
  assert.equal(jobs.length, 3, 'Plain launch of a crew profile is not taken for a repeated Crew click');
  assert.equal(jobs[2].role, null); assert.equal(jobs[2].profile, 'custom-fm');
  shared.set('custom.profile-launches', jobs.slice(0, 2));
  // Focus moved to another space after the click: the queued job still names the original.
  world = [{ id: 'pc2/other', machine: 'pc2', active: true, tabs: [] }, { id: 'pc2/space', machine: 'pc2', active: false, tabs: [] }];
  assert.equal(shared.get('custom.profile-launches')[0].space, 'pc2/space');
  a.launchSpaceProfile(coordinator, 'pc2/space', 'pc2');
  assert.equal(shared.get('custom.profile-launches').length, 2, 'An inactive captured space cannot be launched into');
  // Done jobs release the lease.
  shared.set('custom.profile-launches', shared.get('custom.profile-launches').map(j => ({ ...j, phase: 'done' })));
  world = [{ id: 'pc2/space', machine: 'pc2', active: true, tabs: [] }];
  a.launchSpaceProfile(coordinator, 'pc2/space', 'pc2');
  assert.equal(shared.get('custom.profile-launches').filter(j => j.phase === 'queued').length, 1);
}

// --- 3. Mounted launch controller: the gate runs first and a refusal ends the job --------
{
  let state, world, execs, notifications, gateCalls, gateResult;
  const api = {
    pluginTransform: async (_n, argv) => [argv[0], '--session-color', 'cyan', ...argv.slice(1)],
    pluginGate: async (name, context) => { gateCalls.push([name, context]); return gateResult; },
    shared: k => state.get(k), setShared: (k, v) => state.set(k, v), spaces: () => world, machines: () => [{ name: 'pc2', layout: 'ready' }],
    readTextFile: async () => 'fixture worker', appHome: () => 'C:/app', run() {}, notify: x => notifications.push(x),
    exec: async (...x) => { execs.push(x); world[0].tabs.push({ id: 'pc2/new-tab' }); return { code: 0, stdout: JSON.stringify({ ok: true, address: 'new', space: 'space', tab: 'new-tab' }) }; },
  };
  const context = vm.createContext(api);
  const source = fs.readFileSync(path.join(root, 'src/features/tabs/profile-launches.js'), 'utf8').replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
  vm.runInContext(source + '\nglobalThis.start=startProfileLaunches;globalThis.roleLaunch=roleLaunch;', context);
  const cx = { spawn: fn => jobs.push(fn), sleep: async () => {} }; let jobs = [];
  const setup = role => { state = new Map([['custom.profile-launches', [{ token: 't', phase: 'queued', expiresAt: Date.now() + 60000, machine: 'pc2', space: 'pc2/space', originTab: 'pc2/tab', name: 'A1 — Firstmate', profile: 'custom-fm', role, shell: ['bash'], argv: ['a1'], cwd: 'D:/space-folder' }]]]); world = [{ id: 'pc2/space', machine: 'pc2', active: true, tabs: [{ id: 'pc2/tab', active: true }] }]; execs = []; notifications = []; gateCalls = []; jobs = []; };
  const drain = async () => { while (jobs.length) await jobs.shift()(cx); };
  const payload = () => JSON.parse(execs[0][1].at(-1));

  // Refused: nothing starts, no ordinary-agent fallback, the reason is shown.
  setup('firstmate'); gateResult = { ok: false, plugin: 'firstmate', reason: 'Firstmate is turned off.' };
  context.start({}, cx); await drain();
  assert.equal(execs.length, 0, 'A refused role launch never reaches the launch worker');
  assert.equal(state.get('custom.profile-launches')[0].phase, 'failed');
  assert.equal(notifications.length, 1); assert.match(notifications[0].title, /as crew coordinator/); assert.match(notifications[0].body, /turned off/);
  same(gateCalls[0][0], 'profile.role.firstmate');
  same({ machine: gateCalls[0][1].machine, space: gateCalls[0][1].space, profile: gateCalls[0][1].profile, argv: gateCalls[0][1].argv }, { machine: 'pc2', space: 'pc2/space', profile: 'custom-fm', argv: ['a1'] }, 'The gate sees the captured request, not the current focus');

  // Prepared: home folder becomes cwd, labels travel, argv stays literal (color transform still applies after the gate).
  setup('firstmate'); gateResult = { ok: true, plugin: 'firstmate', value: { cwd: 'D:\\Git\\firstmate', labels: { 'custom.firstmate.home': 'abcd1234', 'custom.firstmate.revision': 'f'.repeat(40) }, env: { PATH: 'C:\\shim;C:\\Windows', FM_BACKEND: 'hc' }, argv: ['something-else'] } };
  context.start({}, cx); await drain();
  assert.equal(execs.length, 1); assert.equal(execs[0][2].on, 'pc2');
  const sent = payload();
  assert.equal(sent.cwd, 'D:\\Git\\firstmate', 'The coordinator starts in its home, never in the space folder with a cd afterwards');
  assert.equal(sent.role, 'firstmate'); same(sent.labels, { 'custom.firstmate.home': 'abcd1234', 'custom.firstmate.revision': 'f'.repeat(40) });
  same(sent.env, { PATH: 'C:\\shim;C:\\Windows', FM_BACKEND: 'hc' }, 'The scoped environment reaches the worker');
  same(sent.argv, ['a1', '--session-color', 'cyan'], 'A gate cannot replace the literal command; optional transforms remain independent');
  assert.equal(state.get('custom.profile-launches')[0].phase, 'done');

  // Malformed gate output is a refusal too.
  for (const value of [{ cwd: '' }, { cwd: 'D:/x', labels: { 'herdr.space': 'hijack' } }, { cwd: 'D:/x', labels: { 'custom.firstmate.home': 'bad\nvalue' } }, { cwd: 'D:/x', env: { HOME: 'C:/elsewhere' } }, { cwd: 'D:/x', env: { PATH: 'a\nb' } }, null]) {
    setup('firstmate'); gateResult = { ok: true, plugin: 'firstmate', value };
    context.start({}, cx); await drain();
    assert.equal(execs.length, 0, `Rejected gate output: ${JSON.stringify(value)}`); assert.equal(state.get('custom.profile-launches')[0].phase, 'failed');
  }
  assert.throws(() => context.roleLaunch({ cwd: 'D:/x', labels: { 'custom.firstmate.home': 'x'.repeat(401) } }), /invalid label/);

  // Ordinary profiles: no gate call, byte-identical request shape to before.
  setup(null); gateResult = { ok: false, reason: 'must not be consulted' };
  context.start({}, cx); await drain();
  assert.equal(gateCalls.length, 0, 'Plain profiles never consult a role gate');
  assert.equal(execs.length, 1); const plain = payload();
  same(Object.keys(plain).sort(), ['argv', 'cwd', 'profile', 'shell', 'space', 'stage']); assert.equal(plain.cwd, 'D:/space-folder');

  // Two mounted copies (two windows / a remounted view) cannot replay one role job, and done jobs never relaunch.
  setup('firstmate'); gateResult = { ok: true, plugin: 'firstmate', value: { cwd: 'D:/fm', labels: {} } };
  context.start({}, cx); context.start({}, cx); await drain();
  assert.equal(execs.length, 1, 'One launch for one token across copies');
  context.start({}, cx); await drain(); assert.equal(execs.length, 1, 'A done job is never replayed');
}

// --- 4. Registry gate + the crew plugin gate, loaded as packaged -------------------------------
{
  const state = {}, hcCalls = [], scripts = [];
  let machines = [{ name: 'pc2', target: 'pc2', state: 'connected', version: '0.1.19' }], terminals = [];
  const crew = { tool: 'C:\\Users\\u\\.crew\\tool\\crew\\bin', version: '0.1.0', revision: '6c6b3f77abcd', home: true, path: 'C:\\Windows\\system32;C:\\npm', windows: true, initFails: null };
  const b64 = t => Buffer.from(t, 'utf8').toString('base64');
  const ran = (stdout = '', code = 0, stderr = '') => ({ code: 0, stdout: JSON.stringify({ code, ms: 1, signal: null, stderr: b64(stderr), stdout: b64(stdout), timed_out: false, truncated: false }), stderr: '' });
  const notFound = name => ({ code: 1, stdout: '', stderr: JSON.stringify({ error: { kind: 'spawn_failed', message: `cannot start ${name}` } }) });
  const fakeHc = async args => {
    hcCalls.push(args);
    if (args[0] === 'machine') return { code: 0, stdout: JSON.stringify({ machines }), stderr: '' };
    if (args[0] === 'ls') { assert.ok(args.includes('--label'), 'Only label-filtered listing'); return { code: 0, stdout: JSON.stringify({ terminals }), stderr: '' }; }
    assert.equal(args[0], 'exec', `Unexpected hc command: ${args.join(' ')}`);
    const argv = args.slice(args.indexOf('--') + 1);
    assert.equal(argv[0], 'powershell', `The gate asks the machine only through PowerShell: ${argv[0]}`);
    const script = argv.at(-1);
    if (/PROCESSOR_ARCHITECTURE/.test(script)) return crew.windows ? ran('AMD64') : notFound('powershell');
    if (/& node \$main home --ensure/.test(script)) {
      scripts.push('init');
      if (crew.initFails) return ran('', 1, crew.initFails);
      if (crew.oldTool) return ran('crew 0.5.2 - a small crew tool on Herdr Core', 2); // no `home` command yet: usage, exit 2
      crew.home = true;
      return ran('C:/Users/u/.crew/crew\r\n', 0, 'crew: the home moved to C:/Users/u/.crew/crew');
    }
    if (/'root=' \+ \$root/.test(script)) {
      scripts.push('probe'); assert.ok(!/ls-remote|clone|pull/.test(script), 'A launch never touches the network or installs');
      return ran([`root=C:\\Users\\u\\.crew`, `tool=${crew.tool}`, `version=${crew.version}`, `revision=${crew.revision}`, 'latest=', `home=${crew.home ? '1' : ''}`, `legacy=${crew.legacy ? '1' : ''}`, `old=${crew.legacy ? crew.old ?? 'home' : ''}`, `path=${crew.path}`].join('\r\n'));
    }
    if (/session-dir\.js/.test(script)) { scripts.push('accounts'); return ran(crew.accounts); }
    assert.fail('The gate never runs installers: ' + script.slice(0, 60));
  };
  const host = { shared: k => state[k], setShared: (k, v) => { state[k] = v; }, notify: () => {}, spaces: () => [], exec: async () => { throw Error('exec is never used by the gate'); }, hc: fakeHc };
  const { r, f } = await loadMod({ host, mod: 'custom-tabs', modules: { 'space-color-state.js': 'src/shared/space-color-state.js' },
    entry: 'import * as r from "./plugins.js"; import * as f from "./plugins/crew/plugin.js"; export {r,f};' });
  const plugin = r.pluginById('crew');
  assert.equal(typeof plugin.gates['profile.role.firstmate'], 'function');
  const request = (over = {}) => ({ machine: 'pc2', space: 'pc2/space', profile: 'custom-fm', argv: ['a1'], cwd: 'D:/space', token: 't', ...over });
  const gate = over => r.pluginGate('profile.role.firstmate', request(over));

  let g = await r.pluginGate('profile.role.nothing', request());
  assert.equal(g.ok, false); assert.match(g.reason, /No plugin provides/);
  g = await gate();
  assert.equal(g.ok, false); assert.equal(g.plugin, 'crew'); assert.match(g.reason, /turned off/, 'Disabled plugin: the saved role is kept and the launch refused with the action to take');
  r.setPluginEnabled(plugin, true);
  // The coordinator runs on the profile's own machine, whatever machine Settings shows:
  // that setting only chooses whose checklist is looked at.
  const asksOn = () => hcCalls.filter(a => a[0] === 'exec').map(a => a[1] === '--on' ? a[2] : null);
  hcCalls.length = 0; g = await gate(); assert.equal(g.ok, true, g.reason);
  assert.ok(asksOn().length > 0 && asksOn().every(m => m === 'pc2'), 'Settings on this computer; profile on pc2: crew is checked and started on pc2');
  r.setPluginSetting(plugin, 'machine', 'pc2');
  hcCalls.length = 0; g = await gate({ machine: null }); assert.equal(g.ok, true, g.reason);
  assert.ok(asksOn().length > 0 && asksOn().every(m => m === null), 'Settings on pc2; profile on this computer: crew is checked and started here');
  assert.equal(r.pluginSetting(plugin, 'machine'), 'pc2', 'A launch never changes the setting');
  // Agent-agnostic, but only for commands the tool knows; wrappers are not supported by ticking a box.
  for (const argv of [['vim'], ['C:\\tools\\wrapper.cmd', 'a1'], ['bash', '-c', 'a1']]) { g = await gate({ argv }); assert.equal(g.ok, false); assert.match(g.reason, /a1, pi and claude commands/, argv.join(' ')); }
  machines = [{ name: 'pc2', state: 'disconnected' }];
  g = await gate(); assert.equal(g.ok, false); assert.match(g.reason, /disconnected/);
  machines = [{ name: 'pc2', state: 'connected', version: '0.1.19' }];
  crew.windows = false; g = await gate(); assert.equal(g.ok, false); assert.match(g.reason, /Windows machines only/); crew.windows = true;
  const tool = crew.tool; crew.tool = '';
  g = await gate(); assert.equal(g.ok, false); assert.match(g.reason, /not installed on pc2\. Install it in Settings/, 'A missing tool is a setup action, never an install at launch');
  crew.tool = tool;
  terminals = [{ address: 'pc2/t9', state: 'live', labels: { 'custom.crew.home': '1' } }];
  g = await gate(); assert.equal(g.ok, false); assert.match(g.reason, /already running on pc2 \(pc2\/t9\)/, 'An existing coordinator is offered, not replaced');
  terminals = [{ address: 't9', state: 'live', labels: { 'custom.crew.home': '1' } }, { address: 'pc2/t3', state: 'finished' }];
  scripts.length = 0;
  for (const argv of [['a1'], ['pi'], ['claude'], ['C:\\Users\\u\\AppData\\Roaming\\npm\\a1.cmd', '--session-color', 'cyan']]) {
    g = await gate({ argv }); assert.equal(g.ok, true, `A coordinator on another machine or a finished one does not block: ${argv[0]}`);
  }
  // The coordinator starts in the folder the tool names: ~/.crew/crew, so its space is called crew.
  same(g.value, { cwd: 'C:\\Users\\u\\.crew\\crew', labels: { 'custom.crew.home': '1', 'custom.crew.version': '0.1.0+6c6b3f77abcd', 'custom.crew.profile': 'custom-fm' }, env: { PATH: crew.tool + ';' + crew.path } });
  assert.ok(scripts.includes('init'), 'The tool is asked for its home at every launch; creating or moving it is the tool\'s decision');
  // A tool from before `crew home` cannot answer: its existing home is used where it is.
  crew.oldTool = true; crew.legacy = true;
  g = await gate(); assert.equal(g.ok, true); assert.equal(g.value.cwd, 'C:\\Users\\u\\.crew\\home');
  crew.old = 'crew';
  g = await gate(); assert.equal(g.value.cwd, 'C:\\Users\\u\\.crew\\crew');
  crew.legacy = false; delete crew.old;
  crew.home = false;
  g = await gate(); assert.equal(g.ok, false); assert.match(g.reason, /Update the crew tool/, 'No home and a tool that cannot make one: say what to do');
  crew.oldTool = false; crew.home = true;
  // The Claude account travels to the tool as CREW_CLAUDE_ACCOUNT: the chosen one while it is
  // still saved on that machine, otherwise the first saved one; never a value that is not in
  // the machine's own list, and nothing when the machine has no account switcher.
  crew.accounts = 'helper=1\r\n1. me@example.com  (Team, team)\r\n2. other@example.org  (Org, max)\r\n';
  g = await gate(); assert.equal(g.ok, true); same(g.value.env, { PATH: crew.tool + ';' + crew.path, CREW_CLAUDE_ACCOUNT: 'me@example.com' }, 'Nothing chosen: the first saved account');
  r.setPluginSetting(plugin, 'claudeAccount', 'other@example.org');
  g = await gate(); assert.equal(g.value.env.CREW_CLAUDE_ACCOUNT, 'other@example.org');
  r.setPluginSetting(plugin, 'claudeAccount', "x'; rm -rf ~");
  g = await gate(); assert.equal(g.ok, true); assert.equal(g.value.env.CREW_CLAUDE_ACCOUNT, 'me@example.com', 'A stored value that is not a saved account never reaches a shell');
  r.setPluginSetting(plugin, 'claudeAccount', '');
  crew.accounts = 'helper=\r\n';
  g = await gate(); assert.equal(g.ok, true); same(Object.keys(g.value.env), ['PATH']);
  // The home is created at the first launch, and a failure to create it refuses the launch.
  crew.home = false; crew.initFails = 'disk full';
  g = await gate(); assert.equal(g.ok, false); assert.match(g.reason, /Could not create the crew home on pc2: disk full/);
  crew.initFails = null; scripts.length = 0;
  g = await gate(); assert.equal(g.ok, true); assert.equal(scripts.filter(s => s === 'init').length, 1); assert.equal(crew.home, true);
  assert.ok(hcCalls.every(a => a[0] === 'machine' || a[0] === 'ls' || a[0] === 'exec' && a.includes('powershell')), 'The gate asks only: machine list, labelled terminals, and PowerShell probes on that machine');
}

// --- 4b. Crew: its profiles are a Settings page (not a section); gate readiness; space tags -------
{
  const state = {};
  let hostPanes = [], hostTerminals = [];
  const host = { shared: k => state[k], setShared: (k, v) => { state[k] = v; }, notify: () => {}, spaces: () => [], exec: async () => { throw Error('no exec'); }, hc: async () => { throw Error('no hc'); },
    panes: () => hostPanes, terminals: () => hostTerminals };
  const { r } = await loadMod({ host, mod: 'custom-tabs', modules: { 'space-color-state.js': 'src/shared/space-color-state.js' },
    entry: 'import * as r from "./plugins.js"; export {r};' });
  const plugin = r.pluginById('crew');
  assert.equal(plugin.prerequisites.some(x => x.id === 'profiles'), false, 'No Profiles section');
  const def = plugin.settings.find(s => s.key === 'profiles');
  same({ type: def?.type, role: def?.role, label: def?.label }, { type: 'profiles', role: 'firstmate', label: 'Profiles' }, 'A Profiles setting that opens the role’s page');
  assert.equal(typeof plugin.gates['profile.role.firstmate'], 'function', 'Crew owns the role it lists');
  // The menus offer the Crew section only while exactly one enabled plugin claims the role.
  assert.equal(r.pluginGateReady('profile.role.firstmate'), false, 'Crew off');
  r.setPluginEnabled(plugin, true);
  assert.equal(r.pluginGateReady('profile.role.firstmate'), true, 'Crew on');
  assert.equal(r.pluginGateReady('profile.role.nothing'), false);
  // The Spaces sidebar's Crew tag: the space whose tab runs a live coordinator, only while Crew is on.
  const space = { id: 'coord', tabs: [{ id: 'a' }, { id: 'b' }] };
  hostPanes = [{ tab: 'b', terminal: 't9' }, { tab: 'other', terminal: 't1' }];
  const tags = () => JSON.parse(JSON.stringify(r.pluginSpaceTags(space)));
  hostTerminals = [{ address: 't9', state: 'live', labels: { 'custom.crew.home': '1' } }];
  same(tags(), [{ plugin: 'crew', label: 'Crew', tooltip: 'Crew coordinator' }], 'A live coordinator in any of its tabs');
  hostTerminals = [{ address: 't1', state: 'live', labels: { 'custom.crew.home': '1' } }];
  same(tags(), [], 'Another space’s coordinator does not count');
  hostTerminals = [{ address: 't9', state: 'live', labels: { 'crew.task': 'a1-launch-crash', 'crew.kind': 'ship' } }];
  same(tags(), [{ plugin: 'crew', label: 'Crew', tooltip: 'Crew worker' }], 'A space where a crew worker runs is tagged too');
  hostTerminals = [{ address: 't9', state: 'live', labels: { 'crew.task': 'x' } }, { address: 't9', state: 'live', labels: { 'custom.crew.home': '1' } }];
  same(tags(), [{ plugin: 'crew', label: 'Crew', tooltip: 'Crew coordinator' }], 'One tag; the coordinator wins');
  hostTerminals = [{ address: 't9', state: 'live', labels: { 'crew.task': '' } }];
  same(tags(), [], 'An empty task label is not a worker');
  hostTerminals = [{ address: 't9', state: 'finished', labels: { 'custom.crew.home': '1' } }, { address: 't9', state: 'finished', labels: { 'crew.task': 'x' } }];
  same(tags(), [], 'Finished terminals do not count');
  hostTerminals = [{ address: 't9', state: 'live', labels: { 'custom.crew.home': '1' } }];
  r.setPluginEnabled(plugin, false);
  same(tags(), [], 'Crew off: no tag');
  r.setPluginEnabled(plugin, true);
}

// --- 5. Launch worker: role cwd/labels against a fake Core --------------------------------------
{
  const { launchProfile, roleLabels, roleEnvironment } = require('../src/services/terminals/profile-launch.cjs');
  same(roleLabels({}), {});
  same(roleLabels({ role: 'firstmate', cwd: 'D:/fm', labels: { 'custom.firstmate.home': 'x' } }), { 'custom.profile.role': 'firstmate', 'custom.firstmate.home': 'x' });
  assert.throws(() => roleLabels({ role: 'firstmate', cwd: '' }), /home folder/);
  assert.throws(() => roleLabels({ role: 'firstmate', cwd: 'D:/fm', labels: { 'herdr.tab': 'x' } }), /Invalid role label/);
  assert.throws(() => roleLabels({ role: 'Bad Role', cwd: 'D:/fm' }), /Unsupported profile role/);
  const calls = [];
  const rpc = async (method, p) => { calls.push([method, p]); if (method === 'doc.get') return { value: { spaces: [{ id: 'space' }] } }; if (method === 'terminal.run') return { address: 'new', state: 'live', argv: p.argv }; return {}; };
  const bash = ['C:\\Program Files\\Git\\bin\\bash.exe', '--login', '-i'];
  let reply = await launchProfile({ space: 'space', shell: bash, argv: ['a1'], cwd: 'D:\\Git\\firstmate', role: 'firstmate', labels: { 'custom.firstmate.home': 'abcd1234', 'custom.firstmate.revision': 'f'.repeat(40) }, env: { PATH: 'C:\\shim;C:\\Windows' } }, rpc);
  assert.equal(reply.ok, true);
  const run = calls.find(c => c[0] === 'terminal.run')[1];
  assert.equal(run.cwd, 'D:\\Git\\firstmate');
  same(run.argv, [...bash, '-c', "'a1'; exec 'C:/Program Files/Git/bin/bash.exe' '--login' '-i'"], 'Literal command, unchanged by the role');
  same(run.labels, { 'herdr.space': 'space', 'herdr.tab': reply.tab, 'herdr.right-click': 'menu', 'custom.profile.role': 'firstmate', 'custom.firstmate.home': 'abcd1234', 'custom.firstmate.revision': 'f'.repeat(40) });
  same(run.env, { PATH: 'C:\\shim;C:\\Windows' }, 'Only the allow-listed scoped environment reaches terminal.run');
  assert.throws(() => roleEnvironment({ role: 'firstmate', env: { USERPROFILE: 'C:/x' } }), /Invalid role environment/);
  same(roleEnvironment({}), {});
  assert.ok(!calls.some(c => ['terminal.send', 'terminal.keys'].includes(c[0])), 'No startup instructions are typed into the terminal');
  calls.length = 0;
  reply = await launchProfile({ space: 'space', shell: bash, argv: ['a1'], cwd: '', role: 'firstmate', labels: {} }, rpc);
  assert.equal(reply.ok, false); assert.equal(calls.filter(c => c[0] === 'terminal.run').length, 0, 'A role launch without its home never starts an ordinary agent');
}

console.log('PASS: Firstmate profile role: key-bound persistence through rename/reorder/uncheck, captured one-at-a-time launch jobs, fail-closed gate (disabled plugin, other machine, non-A1 command, missing clone, live owner, unreadable revision), prepared home cwd/labels with literal argv, unchanged ordinary launches, no replay across mounted copies, worker-side validation (no agents, cores or machines)');
