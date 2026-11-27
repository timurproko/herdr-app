import assert from 'node:assert/strict';
import { loadMod } from '../../../tools/plugin-harness.mjs';

// Crew plugin (id firstmate): the machine setting, the context passed to checks/fixes, the hc exec
// helper, version rules, status mapping and the install scripts. A fake `hc` answers
// from a table; nothing reaches the network, a core or a real machine.
const state = {}, hcCalls = [];
let machines = [{ name: 'pc2', target: 'pc2', state: 'connected', version: '0.1.19' }];
const same = (a, b, m) => assert.equal(JSON.stringify(a), JSON.stringify(b), m); // values cross the vm realm
const b64 = text => Buffer.from(text, 'utf8').toString('base64');
const ran = (stdout = '', code = 0, stderr = '') => ({ code: 0, stdout: JSON.stringify({ code, ms: 5, signal: null, stderr: b64(stderr), stdout: b64(stdout), timed_out: false, truncated: false }), stderr: '' });
// hc 0.1.21 writes its own errors to stderr and exits 1; 0.1.19 printed them on stdout.
const notFound = name => ({ code: 1, stdout: '', stderr: JSON.stringify({ error: { hint: '', kind: 'spawn_failed', message: `cannot start ${name}: program not found` } }) });

// Answers keyed by the program argv after `--`; PowerShell commands by a matching rule.
let table = {}, psRules = [];
async function fakeHc(args) {
  hcCalls.push(args);
  if (args[0] === 'machine') return { code: 0, stdout: JSON.stringify({ machines }), stderr: '' };
  if (args[0] === 'ls') return { code: 0, stdout: '{"terminals":[]}', stderr: '' };
  const argv = program(args);
  if (argv[0] === 'powershell') {
    const script = argv.at(-1);
    const rule = psRules.find(([match]) => match.test(script));
    return rule ? rule[1](script) : notFound('powershell');
  }
  return table[argv.join(' ')] ?? notFound(argv[0]);
}
function program(argv) {
  const i = argv.indexOf('--');
  return argv.slice(i + 1);
}
const impl = {
  shared: key => state[key], setShared: (key, value) => { state[key] = value; }, notify: () => {}, spaces: () => [],
  window: () => ({ platform: 'windows' }), exec: async () => ({ code: 0, stdout: '', stderr: '' }),
  hc: args => fakeHc(args),
};
const host = { ...impl, hc: (...a) => impl.hc(...a), exec: (...a) => impl.exec(...a) };
// Loaded as packaged: registry, plugin API and every plugin folder.
const { r, f } = await loadMod({ host, modules: { 'space-color-state.js': 'src/shared/space-color-state.js' },
  entry: 'import * as r from "./plugins.js"; import * as f from "./plugins/crew/plugin.js"; export {r,f};' });
const plugin = r.pluginById('crew');
assert.ok(plugin, 'Registered');
assert.equal(r.pluginEnabled(plugin), false, 'Off by default');

// Registry: a machine setting holds a name or null, never a number or an empty name.
assert.equal(r.pluginSetting(plugin, 'machine'), null);
r.setPluginSetting(plugin, 'machine', 'pc2');
assert.equal(r.pluginSetting(plugin, 'machine'), 'pc2');
r.setPluginSetting(plugin, 'machine', 42);
r.setPluginSetting(plugin, 'machine', '  ');
assert.equal(r.pluginSetting(plugin, 'machine'), 'pc2', 'Numbers and blank names are refused');
r.setPluginSetting(plugin, 'machine', null);
assert.equal(r.pluginSetting(plugin, 'machine'), null);
state['custom.plugins'].crew.settings.machine = 7;
assert.equal(r.pluginSetting(plugin, 'machine'), null, 'A bad stored value falls back to the default');

// Registry: check() and fix.run() receive the plugin's settings.
let seen = null;
const probe = { id: 'probe', settings: [{ key: 'machine', type: 'machine', default: null }],
  prerequisites: [{ id: 'p', label: 'p', async check(cx) { seen = cx.setting('machine'); return { status: 'ready' }; } }] };
assert.equal((await r.checkPlugin(probe))[0].status, 'ready');
assert.equal(seen, null);
assert.equal(r.pluginContext(plugin).setting('machine'), null);

// on(): --on only for another machine; base64 decoded; spawn_failed means not installed.
table = { 'git --version': ran('git version 2.56.0.windows.2\n') };
hcCalls.length = 0;
let res = await f.on(null, ['git', '--version'], { timeout: 15 });
same(hcCalls[0], ['exec', '--timeout', '15', '--json', '--', 'git', '--version']);
assert.equal(res.stdout, 'git version 2.56.0.windows.2\n');
await f.on('pc2', ['git', '--version']);
same(hcCalls[1], ['exec', '--on', 'pc2', '--timeout', '60', '--json', '--', 'git', '--version']);
res = await f.on('pc2', ['jq', '--version']);
assert.equal(res.missing, true);
impl.hc = async () => ({ code: 0, stdout: JSON.stringify({ error: { kind: 'spawn_failed', message: 'x' } }), stderr: '' });
assert.equal((await f.on('pc2', ['jq'])).missing, true, 'Older hc prints the error on stdout');
impl.hc = async () => ({ code: 1, stdout: '', stderr: JSON.stringify({ error: { kind: 'machine_unreachable', message: 'pc2 is offline' } }) });
await assert.rejects(f.on('pc2', ['jq']), /pc2 is offline/);
assert.equal(f.decodeBase64(b64('héllo ✓ 🚀')), 'héllo ✓ 🚀', 'UTF-8 survives decoding');

// Versions: numeric per component, tolerant of prefixes and trailing text.
assert.equal(f.compareVersions('0.1.9', '0.1.29'), -1);
assert.equal(f.compareVersions('v1.106.1', '1.46.0'), 1);
assert.equal(f.compareVersions('jq-1.8.2', '1.8.2'), 0);
assert.equal(f.compareVersions('hc 0.1.19 (abc)', '0.1.14'), 1);
assert.equal(f.compareVersions('garbage', '1.0.0'), null);

// Restore the table-driven fake.
impl.hc = fakeHc;

// --- the crew tool on a machine ---------------------------------------------------
// The probe is one read-only script; its answer is plain lines.
same(f.parseCrewProbe('root=C:\\Users\\u\\.crew\r\ntool=C:\\Users\\u\\.crew\\core\\bin\r\nversion=0.1.0\r\nrevision=6c6b3f77abcd\r\nlatest=\r\nhome=1\r\npath=C:\\Windows;C:\\Git\r\n'),
  { root: 'C:\\Users\\u\\.crew', tool: 'C:\\Users\\u\\.crew\\core\\bin', version: '0.1.0', revision: '6c6b3f77abcd', latest: '', home: true, legacy: false, old: '', path: 'C:\\Windows;C:\\Git' });
same(f.parseCrewProbe('noise'), { root: '', tool: '', version: '', revision: '', latest: '', home: false, legacy: false, old: '', path: '' });
same([f.parseCrewProbe('home=1\r\nlegacy=1\r\nold=crew\r\n').legacy, f.parseCrewProbe('home=1\r\nlegacy=1\r\nold=crew\r\n').old], [true, 'crew'], 'A home still packed in an old folder is known as such, by name');
assert.ok(f.crewProbeScript().includes("(Join-Path $root 'crew.json')") && f.crewProbeScript().includes("foreach ($name in 'crew', 'home')"), 'The home and both old places are looked at');
// The clone is ~/.crew/core; one still at ~/.crew/tool is used where it is, and renamed only
// by an install that was told nobody is using it.
for (const script of [f.crewProbeScript(), f.crewInitScript(), f.crewProjectScript(['list']), f.crewInstallScript()]) {
  assert.ok(script.includes("$tool = Join-Path $root 'core'; if (-not (Test-Path -LiteralPath $tool))") && script.includes("Join-Path $root 'tool'"), 'core first, tool as the fallback');
}
assert.ok(!f.crewInstallScript().includes('Rename-Item') && f.crewInstallScript({ move: true }).includes("Rename-Item -LiteralPath $tool -NewName 'core'"), 'The old folder is renamed only when asked');
for (const script of [f.crewProbeScript(), f.crewProbeScript({ remote: true })]) {
  assert.ok(!/Remove-Item|Set-Content|New-Item|clone|pull|reset|Invoke-WebRequest/.test(script), 'The probe only reads');
}
assert.ok(!f.crewProbeScript().includes('ls-remote') && f.crewProbeScript({ remote: true }).includes("ls-remote origin 'refs/heads/main'"), 'Only the settings page asks the network');
// Install: a clone of the repository or a fast-forward of it; nothing is stashed or deleted.
// The only reset is for a clean copy: after a rewritten history whose files were published,
// or for a copy from before crew moved to a repository of its own (tool still in crew/).
const install = f.crewInstallScript();
assert.ok(install.includes(`clone --quiet --depth 1 --branch 'main' '${f.CREW_SOURCE.url}'`) && install.includes("fetch --quiet origin 'main'") && install.includes('merge --ff-only --quiet FETCH_HEAD'));
assert.ok(!/stash|clean|Remove-Item|-Force -Recurse|checkout/.test(install), 'The installer never discards anything');
const resetAt = install.indexOf('reset --hard'), guardAt = install.indexOf('if ("$dirty"'), guard = install.slice(guardAt, resetAt);
assert.ok(resetAt > 0 && guardAt > 0 && guardAt < resetAt && guard.includes('$published -contains') && guard.includes('Fail'), 'Reset only after the clean, published-files guard');
assert.equal(install.match(/reset/g).length, 1, 'One guarded reset, nothing else');
// The tool is at the root of the clone: crew.mjs and bin/. A clean copy that still has it in
// crew/ is moved to the source's history only when the source has crew.mjs at its root.
assert.ok(f.crewProbeScript().includes("$main = Join-Path $tool 'crew.mjs'") && f.crewProbeScript().includes("$bin = Join-Path $tool 'bin'"), 'The probe looks at the root of the clone');
const beforeAt = install.indexOf('$before = ');
assert.ok(beforeAt > 0 && beforeAt < guardAt && install.includes("$before = (Test-Path -LiteralPath (Join-Path $tool 'crew\\crew.mjs') -PathType Leaf)") && install.includes('ls-tree --name-only FETCH_HEAD crew.mjs')
  && guard.includes('"$dirty".Trim() -or -not ($before -or'), 'An old-layout copy moves only when clean and the source has the root layout');
assert.ok(/\$ErrorActionPreference = 'Continue'\n\s*& git -C \$tool fetch/.test(install) && /\$ErrorActionPreference = 'Continue'\n\s*& git clone/.test(install), 'Git stderr never becomes a NativeCommandError');
assert.match(install, /is not a clone of/); assert.match(install, /cannot fast-forward; it was left alone/);
assert.ok(f.crewInitScript().includes("$main = Join-Path $tool 'crew.mjs'") && f.crewInitScript().includes('& node $main home --ensure'), 'The tool itself creates or moves its home');

// Pooled working copies: the shared delivery workflow's setting, read and changed through its command.
same(f.parsePooledCopies('workflow=1\r\nstate={"enabled":true,"installed":true,"version":"v3.1.8","active":true}\r\n'), { workflow: true, installed: true, enabled: true });
same(f.parsePooledCopies('workflow=1\r\nstate={"enabled":false,"installed":true,"version":"v3.1.8","active":false}\r\n'), { workflow: true, installed: true, enabled: false });
same(f.parsePooledCopies('workflow=1\r\nstate={"enabled":true,"installed":false,"version":null,"active":false}\r\n'), { workflow: true, installed: false, enabled: true }, 'Without treehouse there is nothing to switch');
for (const text of ['workflow=\r\n', 'workflow=1\r\nstate=not json\r\n', 'workflow=1\r\nstate=\r\n', 'noise']) {
  same(f.parsePooledCopies(text), { workflow: false, installed: false, enabled: false }, 'A machine without the shared workflow, or an unreadable answer, has nothing to switch');
}
assert.ok(f.pooledCopiesScript().includes("'.workflow\\bin\\delivery.mjs'") && f.pooledCopiesScript().includes('& node $main pool --json') && !/pool (on|off)/.test(f.pooledCopiesScript()), 'Reading changes nothing');
assert.ok(f.pooledCopiesScript(true).includes('& node $main pool on --json') && f.pooledCopiesScript(false).includes('& node $main pool off --json'), 'The setting is changed only through the command of the workflow');
assert.ok(f.pooledCopiesScript(false).indexOf('pool off') < f.pooledCopiesScript(false).lastIndexOf('pool --json'), 'The real state is read back after a change');
assert.equal(f.knownPooledCopies('nowhere'), null, 'Nothing is shown before the first check of a machine');

// Requirements on a machine like pc2. PowerShell answers come from one rule per script.
let crew = { tool: '', version: '', revision: '', latest: '', home: false, arch: 'AMD64', path: 'C:\\Windows;C:\\Git\\cmd' };
const ran2 = [];
const probeText = () => [`root=C:\\Users\\u\\.crew`, `tool=${crew.tool}`, `version=${crew.version}`, `revision=${crew.revision}`, `latest=${crew.latest}`, `home=${crew.home ? '1' : ''}`, `legacy=${crew.legacy ? '1' : ''}`, `old=${crew.legacy ? 'crew' : ''}`, `path=${crew.path}`].join('\r\n');
psRules = [
  [/^\$env:PROCESSOR_ARCHITECTURE$/, () => crew.arch === null ? notFound('powershell') : ran(`${crew.arch}\r\n`)],
  [/git clone|merge --ff-only/, script => { ran2.push('install'); if (crew.installFails) return ran('', 1, crew.installFails); Object.assign(crew, { tool: 'C:\\Users\\u\\.crew\\core\\bin', version: '0.1.0', revision: 'aaaaaaaaaaaa', latest: 'aaaaaaaaaaaa' }); return ran('0.1.0\r\n'); }],
  [/& node \$main home --ensure/, () => { ran2.push('init'); if (!crew.tool) return ran('', 1, 'The crew tool is not installed.'); crew.home = true; return ran('C:/Users/u/.crew/crew\r\n'); }],
  [/'root=' \+ \$root/, () => { ran2.push('probe'); return ran(probeText()); }],
  [/session-dir\.js/, () => accountsOut === null ? ran('', 1, 'node is broken') : ran(accountsOut)],
];
let accountsOut = 'helper=\r\n';
table = { 'git --version': ran('git version 2.56.0.windows.2\n'), 'node --version': ran('v24.22.0\n'), 'hc --version': ran('hc 0.1.19\n') };
const statuses = async () => Object.fromEntries((await r.checkPlugin(plugin)).map(c => [c.id, c]));
const fix = id => plugin.prerequisites.find(p => p.id === id).fix.run(r.pluginContext(plugin));

r.setPluginSetting(plugin, 'machine', 'pc2');
same(plugin.prerequisites.map(p => p.id), ['git', 'node', 'hc', 'crew', 'home',
  'gh', 'jq', 'treehouse', 'no-mistakes', 'gh-axi', 'tasks-axi', 'quota-axi', 'chrome-devtools-axi', 'lavish-axi', 'agent-hooks', 'projects'], 'Crew itself first, then the tools Firstmate works with, then the Projects section');

// --- the tools Firstmate works with: optional, checked and installed on that machine -------
{
  const toolIds = ['gh', 'jq', 'treehouse', 'no-mistakes', 'gh-axi', 'tasks-axi', 'quota-axi', 'chrome-devtools-axi', 'lavish-axi', 'agent-hooks'];
  const saved = { table, psRules };
  const npm = {}; let settingsFile = null; const did = []; const offPath = {};
  psRules = [
    [/^\$env:PROCESSOR_ARCHITECTURE$/, () => ran('AMD64\r\n')],
    // Off-PATH lookup in .local\bin: nothing there unless a case puts it there.
    [/'present=0'/, script => { const exe = /Join-Path \$bin '([a-z-]+)\.exe'/.exec(script)[1]; return ran(offPath[exe] ?? 'present=0\r\n'); }],
    [/^(?![\s\S]*Invoke-WebRequest)[\s\S]*SetValue\('Path'/, () => { did.push('add-path'); return ran(''); }],
    [/npm install -g '([a-z-]+)'/, script => { const id = /npm install -g '([a-z-]+)'/.exec(script)[1]; did.push(`npm ${id}`); npm[id] = '9.9.9'; return ran('added 1 package\r\n'); }],
    [/Get-Command '([a-z-]+)'[\s\S]*'setup' 'hooks'/, script => { const id = /Get-Command '([a-z-]+)'/.exec(script)[1]; did.push(`hooks ${id}`); const s = JSON.parse(settingsFile ?? '{"hooks":{"SessionStart":[]}}'); s.hooks.SessionStart.push({ matcher: '', hooks: [{ type: 'command', command: `C:\\npm\\${id}\\hook.js`, timeout: 10 }] }); settingsFile = JSON.stringify(s); return ran('ok\r\n'); }],
    [/Get-Command '([a-z-]+)'[\s\S]*'--version'/, script => { const id = /Get-Command '([a-z-]+)'/.exec(script)[1]; return npm[id] ? ran(`${npm[id]}\r\n`) : ran('', 127); }],
    [/\.claude\\settings\.json/, () => ran(settingsFile === null ? 'absent\r\n' : `present\r\n${settingsFile}`)],
    [/Invoke-WebRequest/, script => { const id = /Checksum mismatch for ([a-z-]+) /.exec(script)[1]; did.push(`pinned ${id}`); table[`${id} --version`] = ran(`${f.PINNED[id].version}\n`); return ran(''); }],
    [/'root=' \+ \$root|session-dir\.js/, () => ran('helper=\r\n')],
  ];
  table = { 'git --version': ran('git version 2.56.0\n'), 'node --version': ran('v24.22.0\n'), 'hc --version': ran('hc 0.1.19\n') };
  let t = await statuses();
  // Nothing installed: every tool is a recommendation with an Install button, never a fault.
  for (const id of toolIds) assert.equal(t[id].status, 'recommended', id);
  same([t.jq.detail, t['gh-axi'].detail, t.gh.detail], ['Not installed.', 'Not installed.', 'Install the GitHub CLI.']);
  same([t['agent-hooks'].fix, t['agent-hooks'].detail], [null, 'Install gh-axi, chrome-devtools-axi or lavish-axi first']);
  // gh: installed but signed out, then signed in (the account line is shown).
  table['gh auth status'] = ran('', 1, 'You are not logged into any GitHub hosts.');
  assert.equal((await statuses()).gh.detail, 'Run `gh auth login` on that machine.');
  table['gh auth status'] = ran('github.com\n  ✓ Logged in to github.com account someone (keyring)\n');
  same([(await statuses()).gh.status, (await statuses()).gh.detail], ['ready', 'Logged in to github.com account someone (keyring)']);
  // Pinned exes: downloaded, checksum-verified, placed in .local\bin; an old one is named.
  for (const [tool, pin] of Object.entries(f.PINNED)) {
    const script = f.pinnedInstallScript(tool);
    assert.ok(script.includes(pin.url) && script.includes(pin.sha256) && script.includes(`'${pin.exe}'`), tool);
    assert.ok(script.indexOf('Get-FileHash') < script.indexOf('Move-Item'), `${tool}: verified before it is installed`);
    assert.match(script, /\.local\\bin/);
  }
  // Install puts .local\bin on the user's saved PATH, raw (other %VARS% stay unexpanded),
  // instead of failing because herdr-core's own PATH lacks it.
  for (const tool of Object.keys(f.PINNED)) {
    const script = f.pinnedInstallScript(tool);
    assert.ok(script.includes(f.ADD_BIN_TO_PATH) && script.indexOf('Move-Item') < script.indexOf(f.ADD_BIN_TO_PATH), `${tool}: PATH after the exe is in place`);
    assert.doesNotMatch(script, /exit 4|not on PATH for herdr-core/, `${tool}: no refusal over herdr-core's PATH`);
  }
  assert.match(f.ADD_BIN_TO_PATH, /DoNotExpandEnvironmentNames/); assert.match(f.ADD_BIN_TO_PATH, /RegistryValueKind\]::ExpandString/);
  assert.doesNotMatch(f.ADD_BIN_TO_PATH, /SetEnvironmentVariable/, 'Never the API that expands and flattens PATH');
  // Installed in .local\bin but not on PATH for herdr-core: never "Not installed".
  offPath['jq'] = 'present=1\r\nuserPath=1\r\nversion=jq-1.8.2\r\n';
  t = await statuses();
  same([t.jq.status, t.jq.fix, t.jq.detail], ['recommended', null, 'jq-1.8.2 is in %USERPROFILE%\\.local\\bin. Restart herdr-core (Settings › Core) so programs find it.']);
  offPath['jq'] = 'present=1\r\nuserPath=0\r\nversion=jq-1.8.2\r\n';
  t = await statuses();
  same([t.jq.detail, t.jq.fix.label], ['jq-1.8.2 is in %USERPROFILE%\\.local\\bin, which is not on PATH.', 'Fix PATH']);
  await t.jq.fix.run(r.pluginContext(plugin)); assert.equal(did.at(-1), 'add-path', 'Fix PATH only edits PATH, no download');
  offPath['no-mistakes'] = 'present=1\r\nuserPath=1\r\nversion=no-mistakes version v1.20.0 (abc)\r\n';
  assert.match((await statuses())['no-mistakes'].detail, /Not installed/, 'An old off-PATH copy is offered Install, which replaces it');
  for (const k of Object.keys(offPath)) delete offPath[k];
  assert.throws(() => f.pinnedInstallScript('curl'), /No pinned release/);
  assert.equal(f.PINNED.jq.sha256, 'a6fc67fedaf9128a3309a1e2ebb8b986aeccf70122ee46d2cb4849e423f0c627');
  assert.equal(f.PINNED.treehouse.sha256, '72e7d61886e80e2befa067f5fab1c7ce2afbb49ba79c654cb7f4fc026cbc6b33');
  assert.equal(f.PINNED['no-mistakes'].sha256, '78e17f98e9d9448368ce126f34101f01ca43f55d5797e3f55f5e11aadd175bef');
  table['no-mistakes --version'] = ran('no-mistakes version v1.20.0 (abc)\n');
  assert.match((await statuses())['no-mistakes'].detail, /needs 1\.46\.0 or newer/);
  for (const id of ['jq', 'treehouse', 'no-mistakes']) await fix(id);
  t = await statuses();
  same(['jq', 'treehouse', 'no-mistakes'].map(id => [t[id].status, t[id].detail]), [['ready', 'jq-1.8.2'], ['ready', 'v3.1.8'], ['ready', 'v1.106.1']]);
  // npm tools: installed globally on that machine; a version floor where Firstmate had one.
  npm['tasks-axi'] = '0.2.1';
  assert.match((await statuses())['tasks-axi'].detail, /0\.2\.1 installed; needs 0\.2\.6 or newer/);
  for (const id of ['gh-axi', 'tasks-axi', 'quota-axi', 'chrome-devtools-axi', 'lavish-axi']) await fix(id);
  t = await statuses();
  for (const id of ['gh-axi', 'tasks-axi', 'quota-axi', 'chrome-devtools-axi', 'lavish-axi']) same([t[id].status, t[id].detail], ['ready', '9.9.9'], id);
  // Agent hooks: only for installed tools that are not hooked yet; the check itself only reads.
  same(f.HOOK_TOOLS, ['gh-axi', 'chrome-devtools-axi', 'lavish-axi']);
  assert.doesNotMatch(f.claudeSettingsScript(), /Set-Content|WriteAll|Out-File|"/, 'The check only reads');
  same([...f.hookedTools('{ not json')], []);
  same([...f.hookedTools(JSON.stringify({ hooks: { SessionStart: [{ hooks: [{ type: 'command', command: 'C:\\x\\gh-axi\\hook.js' }] }] } }))], ['gh-axi']);
  same([t['agent-hooks'].status, t['agent-hooks'].detail], ['recommended', 'Not set up for: gh-axi, chrome-devtools-axi, lavish-axi']);
  settingsFile = JSON.stringify({ hooks: { SessionStart: [{ matcher: '', hooks: [{ type: 'command', command: 'C:\\npm\\gh-axi\\hook.js' }] }] } });
  did.length = 0; await fix('agent-hooks');
  same(did, ['hooks chrome-devtools-axi', 'hooks lavish-axi'], 'A tool that is already hooked is left alone');
  same([(await statuses())['agent-hooks'].status, (await statuses())['agent-hooks'].detail], ['ready', 'Set up for Claude Code']);
  // Every one of these runs on the chosen machine.
  hcCalls.length = 0; await statuses();
  assert.ok(hcCalls.filter(a => a[0] === 'exec').every(a => a[1] === '--on' && a[2] === 'pc2'), 'Checks run on the chosen machine');
  ({ table, psRules } = saved);
}
same(plugin.settings.map(s => [s.key, s.type, s.place ?? 'settings']), [['separateProjectSpaces', 'toggle', 'settings'], ['machine', 'machine', 'requirements'], ['profiles', 'profiles', 'settings'], ['claudeAccount', 'select', 'settings'], ['pooledCopies', 'toggle', 'settings']], 'Complete declaration includes global project-space intent and the unchanged machine-scoped controls');
const projectSpacesSetting = plugin.settings.find(s => s.key === 'separateProjectSpaces');
same([projectSpacesSetting.hidden, projectSpacesSetting.default], [true, false], 'Global intent defaults off and is contributed to Spaces, not duplicated in the Plugins card');
same(plugin.settings.filter(s => !s.hidden).map(s => s.key), ['machine', 'profiles', 'claudeAccount', 'pooledCopies'], 'Visible Crew card settings remain unchanged');
// The switch is live: its value is the machine's, not a saved setting of this plugin.
const pooledSetting = plugin.settings.find(s => s.key === 'pooledCopies');
assert.ok(typeof pooledSetting.live.state === 'function' && typeof pooledSetting.live.set === 'function');
assert.equal(pooledSetting.live.state({ setting: () => 'nowhere' }), null);

// Claude account: a dropdown fed by the account switcher on that machine.
same(f.parseClaudeAccounts('helper=1\r\n1. me@example.com  (My Team, team)\r\n2. other@example.org  (Someone\'s Organization, max)\r\nnoise\r\n3. bad name@x\r\n1. me@example.com  (dup)\r\n'),
  { helper: true, accounts: [{ email: 'me@example.com', label: 'me@example.com' }, { email: 'other@example.org', label: 'other@example.org' }] });
same(f.parseClaudeAccounts('helper=\r\n'), { helper: false, accounts: [] });
assert.ok(!/credentials|launch\.json|accounts[\\/]/.test(f.claudeAccountsScript()), 'The list comes from the switcher\'s own command; no token file is read');
// The Settings list is what the last check of that machine found; other machines keep theirs.
const accountSetting = plugin.settings.find(s => s.key === 'claudeAccount');
same(r.pluginOptions(plugin, accountSetting), [], 'Nothing is offered before the machine was asked');
await statuses();
same(r.pluginOptions(plugin, accountSetting), [], 'No account switcher on that machine: nothing to choose');
accountsOut = 'helper=1\r\n1. me@example.com  (My Team, team)\r\n2. other@example.org  (Org, max)\r\n';
await statuses();
same(r.pluginOptions(plugin, accountSetting), [['me@example.com', 'me@example.com'], ['other@example.org', 'other@example.org']]);
same(f.knownClaudeAccounts(null), [], 'This computer was not asked');
r.setPluginSetting(plugin, 'claudeAccount', 'other@example.org'); assert.equal(r.pluginSetting(plugin, 'claudeAccount'), 'other@example.org');
r.setPluginSetting(plugin, 'claudeAccount', 'bad\nvalue'); assert.equal(r.pluginSetting(plugin, 'claudeAccount'), 'other@example.org', 'A select value is one line of text');
r.setPluginSetting(plugin, 'claudeAccount', '');
same(r.pluginOptions(plugin, { options: () => { throw Error('boom'); } }), [], 'A plugin whose list fails offers nothing');
same(r.pluginOptions(plugin, { options: [['a', 'A'], ['b'], 'x', [1, 'one']] }), [['a', 'A']], 'Only [value, label] text pairs are offered');
accountsOut = 'helper=\r\n';
let s = await statuses();
same([s.git.status, s.node.status, s.hc.status], ['ready', 'ready', 'ready']);
same([s.crew.status, s.crew.detail], ['missing', 'Not installed.']);
same([s.home.status, s.home.detail, s.home.fix], ['missing', 'Install the crew tool first.', null], 'The home waits for the tool');
// Old Node and a missing tool are named, not guessed.
table['node --version'] = ran('v18.19.0\n'); assert.match((await statuses()).node.detail, /needs 20\.0\.0 or newer/);
delete table['node --version']; same([(await statuses()).node.status, (await statuses()).node.detail], ['missing', 'Install Node.js 20 or newer.']);
table['node --version'] = ran('v24.22.0\n');
// Install, then the row shows what is installed; an update is offered, never applied by a check.
crew.installFails = 'Could not clone the crew tool. Check the network and Git sign-in on this machine.';
await assert.rejects(fix('crew'), /Could not clone the crew tool/);
crew.installFails = null; await fix('crew');
s = await statuses();
same([s.crew.status, s.crew.detail], ['ready', '0.1.0 · aaaaaaaaaaaa']);
same([s.home.status, s.home.detail], ['missing', 'Not created yet. It is also created at the first coordinator launch.']);
crew.latest = 'bbbbbbbbbbbb'; s = await statuses();
same([s.crew.status, s.crew.statusLabel, s.crew.detail, s.crew.fix?.label, s.crew.fix?.statusLabel], ['missing', 'Outdated', '0.1.0 · aaaaaaaaaaaa', 'Update', 'Updating'], 'An available update needs attention and keeps the installed description');
// Revision evidence and routing are independent for this computer and each remote.
machines.push({ name: 'peer', target: 'peer', state: 'connected' });
for (const machine of [null, 'pc2', 'peer']) {
  r.setPluginSetting(plugin, 'machine', machine);
  hcCalls.length = 0;
  const outdated = await statuses();
  same([outdated.crew.status, outdated.crew.statusLabel, outdated.crew.fix.label], ['missing', 'Outdated', 'Update']);
  assert.equal(outdated.gh.status, 'recommended', 'Genuinely optional tools stay optional beside an update');
  const probes = hcCalls.filter(a => a[0] === 'exec' && a.at(-1).includes("'root=' + $root"));
  assert.ok(probes.length);
  assert.ok(probes.every(a => machine ? a[1] === '--on' && a[2] === machine : !a.includes('--on')), 'Update evidence is read on the selected machine');
  const revision = crew.revision;
  crew.latest = revision;
  same([(await statuses()).crew.status, (await statuses()).crew.statusLabel], ['ready', undefined], 'Current has no stale update label');
  crew.latest = '';
  same([(await statuses()).crew.status, (await statuses()).crew.statusLabel], ['ready', undefined], 'An unknown or failed latest lookup cannot claim outdated');
  crew.latest = 'bbbbbbbbbbbb'; crew.revision = '';
  assert.equal((await statuses()).crew.status, 'ready', 'Unknown installed revision is not update evidence');
  crew.revision = revision;
}
r.setPluginSetting(plugin, 'machine', 'pc2');
const failedProbe = [/'root=' \+ \$root/, () => ran('', 1, 'Inspection failed')];
psRules.unshift(failedProbe);
same([(await statuses()).crew.status, (await statuses()).crew.statusLabel], ['error', undefined], 'Probe failure is an inspection error, not an update claim');
psRules.shift();
ran2.length = 0; await s.crew.fix.run(r.pluginContext(plugin)); same(ran2, ['install'], 'Update runs the same clone-or-fast-forward script');
crew.latest = 'bbbbbbbbbbbb';
crew.latest = ''; assert.equal((await statuses()).crew.status, 'ready', 'An unreadable remote is not an update');
await fix('home'); s = await statuses();
same([s.home.status, s.home.detail], ['ready', 'C:\\Users\\u\\.crew']);
crew.legacy = true; s = await statuses();
same([s.home.status, s.home.detail], ['ready', 'C:\\Users\\u\\.crew\\crew (unpacked into C:\\Users\\u\\.crew at the next launch)'], 'A home at the old place is fine and says what will happen');
crew.legacy = false;
// The prominent requirement notice does not introduce a revision-age action gate.
crew.latest = 'bbbbbbbbbbbb';
assert.equal((await statuses()).crew.statusLabel, 'Outdated');
for (const machine of [null, 'pc2']) {
  const launch = await f.prepareCoordinatorLaunch({ machine, argv: ['a1'], setting: () => '' });
  assert.equal(launch.labels['custom.crew.home'], '1', 'An otherwise valid old installation can still launch');
}
crew.latest = '';

// --- Projects: the tool's own list on that machine, read and changed through `crew project` ---
{
  same(['D:\\Git\\My App', 'D:/Git/crew/', 'C:\\x\\Unity_Project.2', 'D:\\', 'D:\\Git\\___', `D:\\Git\\${'a'.repeat(60)}`].map(f.projectName),
    ['my-app', 'crew', 'unity-project.2', 'd', '', 'a'.repeat(40)], 'A project is named after its folder, in the form the tool accepts');
  const derived = [
    ['D:/Git/agentnumberone.dev', 'agentnumberone.dev'], ['C:\\Git\\AgentNumberOne.DEV\\', 'agentnumberone.dev'],
    ['/git/.hidden', '.hidden'], ['/git/.xrbuild', '.xrbuild'], ['D:\\Git\\xrbuild\\.xrbuild', '.xrbuild'], ['/git/..x', '.x'], ['/git/.-x', '.x'], ['/git/.', ''], ['/git/.-', ''], ['/git/--..My App...v2..-', 'my-app.v2'], ['/git/a . b', 'a-.-b'],
    ['/git/a', 'a'], ['/git/9', '9'], ['/git/...', ''], ['/git/é___', ''],
    [`/git/${'a'.repeat(40)}`, 'a'.repeat(40)], [`/git/${'a'.repeat(41)}`, 'a'.repeat(40)],
    [`/git/${'a'.repeat(38)}.b-more`, `${'a'.repeat(38)}.b`],
    [`/git/${'a'.repeat(39)}.dev`, 'a'.repeat(39)], [`/git/.${'a'.repeat(45)}`, `.${'a'.repeat(39)}`], [`/git/.${'a'.repeat(38)}.b`, `.${'a'.repeat(38)}`], [`/git/${'a'.repeat(38)}.-dev`, 'a'.repeat(38)],
  ];
  for (const [folder, expected] of derived) assert.equal(f.projectName(folder), expected, folder);
  const validNames = ['a', '0', 'a-', '.a', '.xrbuild', '.0-x.y', `.${'a'.repeat(39)}`, 'agentnumberone.dev', 'a.-.b', 'a'.repeat(40), `${'a'.repeat(38)}.b`];
  const invalidNames = ['', '-a', '.', '..a', '.-a', '.A', `.${'a'.repeat(40)}`, 'a..b', 'a.', 'A.dev', 'a_b', 'é.dev', 'a'.repeat(41), `${'a'.repeat(39)}.`, 'a/b'];
  for (const name of [...validNames, ...invalidNames]) {
    same(f.parseProjects(`${name}\tD:/Git/project\r\n`).map(row => row.id), validNames.includes(name) ? [name] : [], `Listed name policy: ${name}`);
  }
  same(f.parseProjects('fork\tD:/Git/crew\tworkflow delivery\r\napp\tC:/Users/u/app\r\nBad Name\tC:/x\r\n\r\nnote without a tab\r\n'),
    [{ id: 'fork', label: 'D:\\Git\\crew', path: 'D:\\Git\\crew' }, { id: 'app', label: 'C:\\Users\\u\\app', path: 'C:\\Users\\u\\app' }], 'Only lines the tool printed as projects become rows, each one line: its folder alone, whatever setting the tool lists beside it');
  const script = f.crewProjectScript(['add', 'my-app', "D:\\Git\\it's"]);
  assert.ok(script.includes("& node $main project 'add' 'my-app' 'D:\\Git\\it''s'") && script.includes("$main = Join-Path $tool 'crew.mjs'"), 'Arguments reach the installed tool as quoted strings');

  const projects = new Map([['fork', 'D:/Git/crew\ttreehouse']]); let owned = false, refusalOutput = null;
  const olderRefusal = 'Invalid project name: agentnumberone.dev. Use lowercase letters, digits and dashes.';
  const rule = [/& node \$main project /, text => {
    const args = [.../& node \$main project (.*)/.exec(text)[1].matchAll(/'((?:[^']|'')*)'/g)].map(m => m[1].replaceAll("''", "'"));
    if (args[0] === '--capabilities') return ran('Usage: crew project add | remove | list');
    ran2.push(`project ${args.join(' ')}`);
    if (args[0] === 'list') return ran([...projects].map(([name, rest]) => `${name}\t${rest}`).join('\r\n') + '\r\n');
    if (owned) return ran('', 3, 'crew: Read-only: this home is owned by terminal t9. Only that session may change its projects.\n');
    if (args[0] === 'add' && refusalOutput) return refusalOutput === 'stderr' ? ran('', 2, `crew: ${olderRefusal}\n`) : ran(`crew: ${olderRefusal}\n`, 2);
    if (args[0] === 'add') { projects.set(args[1], args[2].replaceAll('\\', '/')); return ran(`project ${args[1]}: ${args[2]}\n`); }
    return projects.delete(args[1]) ? ran(`project ${args[1]} removed\n`) : ran('', 2, `crew: Unknown project: ${args[1]}. See \`crew project list\`.\n`);
  }];
  psRules.unshift(rule);
  const section = plugin.prerequisites.find(p => p.id === 'projects'), cx = () => r.pluginContext(plugin);
  // A declared list section: Settings draws it (the picker's wording is the kit's, not Crew's).
  same([section.section, section.list.scope, section.list.picker, typeof section.fix],
    [true, { label: 'Machine', setting: 'machine' }, { kind: 'folders', label: 'Add project' }, 'undefined'], 'A list on the machine the plugin is set to, added through the folder browser, with no Install button');
  s = await statuses();
  same([s.projects.status, s.projects.statusLabel, s.projects.usable, s.projects.rows], ['ready', '1 added', true, [{ id: 'fork', label: 'D:\\Git\\crew', path: 'D:\\Git\\crew' }]]);
  ran2.length = 0; await section.list.add(cx(), 'D:\\Git\\My App');
  same(ran2, ['project add my-app D:\\Git\\My App'], 'Add registers the chosen folder under its own name');
  s = await statuses(); same([s.projects.statusLabel, s.projects.rows.map(row => row.id)], ['2 added', ['fork', 'my-app']]);
  ran2.length = 0; await assert.rejects(section.list.add(cx(), 'D:\\Git\\___'), e => {
    assert.match(e.message, /cannot be used as a project name/);
    assert.match(e.message, /1–40 lowercase ASCII letters, digits, dashes and dots/);
    assert.match(e.message, /start with a letter, digit or one dot followed by one; no consecutive or trailing dots/);
    return true;
  }); same(ran2, [], 'An unusable name never reaches the machine');
  // Older Crew remains authoritative: neither a hidden refusal nor a dash-only retry.
  for (refusalOutput of ['stderr', 'stdout']) {
    ran2.length = 0;
    await assert.rejects(section.list.add(cx(), 'D:/Git/agentnumberone.dev'), e => e.message === 'Could not add D:/Git/agentnumberone.dev. Crew did not accept the project name agentnumberone.dev; update the Crew tool and try again.');
    same(ran2, ['project add agentnumberone.dev D:/Git/agentnumberone.dev'], 'One exact dotted request, with no alternate-name retry');
    s = await statuses(); same(s.projects.rows.map(row => row.id), ['fork', 'my-app'], 'A refusal never registers or projects a successful add');
  }
  // An observed update affects wording only on that machine, and a changed
  // installed revision invalidates the observation without changing check status.
  crew.latest = 'bbbbbbbbbbbb'; await statuses();
  await assert.rejects(section.list.add(cx(), 'D:/Git/agentnumberone.dev'), e => e.message === 'Could not add D:/Git/agentnumberone.dev. Update the Crew tool on pc2 and try again.');
  r.setPluginSetting(plugin, 'machine', null);
  await assert.rejects(section.list.add(cx(), 'D:/Git/agentnumberone.dev'), e => e.message.includes('Crew did not accept the project name'));
  crew.revision = 'cccccccccccc'; crew.latest = 'aaaaaaaaaaaa'; await statuses();
  await assert.rejects(section.list.add(cx(), 'D:/Git/agentnumberone.dev'), e => e.message === 'Could not add D:/Git/agentnumberone.dev. Update the Crew tool on this computer and try again.');
  crew.revision = 'aaaaaaaaaaaa'; await section.check(cx());
  await assert.rejects(section.list.add(cx(), 'D:/Git/agentnumberone.dev'), e => e.message.includes('Crew did not accept the project name'));
  r.setPluginSetting(plugin, 'machine', 'pc2'); await statuses();
  await assert.rejects(section.list.add(cx(), 'D:/Git/agentnumberone.dev'), e => e.message.includes('Crew did not accept the project name'));
  refusalOutput = null;
  crew.latest = 'bbbbbbbbbbbb';
  assert.equal((await statuses()).crew.statusLabel, 'Outdated');
  ran2.length = 0; await section.list.add(cx(), 'D:/Git/agentnumberone.dev');
  same(ran2, ['project add agentnumberone.dev D:/Git/agentnumberone.dev']);
  s = await statuses();
  same([s.projects.statusLabel, s.projects.rows.at(-1)], ['3 added', { id: 'agentnumberone.dev', label: 'D:\\Git\\agentnumberone.dev', path: 'D:\\Git\\agentnumberone.dev' }], 'A dotted registration from the tool stays visible');
  ran2.length = 0; await section.list.remove(cx(), 'agentnumberone.dev');
  same(ran2, ['project remove agentnumberone.dev'], 'Removal uses the exact registered dotted ID');
  s = await statuses(); same(s.projects.rows.map(row => row.id), ['fork', 'my-app']);
  // A dot folder inside a listed project keeps its dot, so its name is its own.
  projects.set('xrbuild', 'D:/Git/xrbuild'); await statuses();
  ran2.length = 0; await section.list.add(cx(), 'D:/Git/xrbuild/.xrbuild');
  same(ran2, ['project add .xrbuild D:/Git/xrbuild/.xrbuild'], 'A dot folder is registered under its dotted name, not as xrbuild');
  s = await statuses();
  same(s.projects.rows.at(-1), { id: '.xrbuild', label: 'D:\\Git\\xrbuild\\.xrbuild', path: 'D:\\Git\\xrbuild\\.xrbuild' }, 'A leading-dot registration from the tool is listed');
  // A folder already listed, under any name and spelling, is never registered again.
  for (const folder of ['D:/Git/xrbuild/.xrbuild', 'd:\\git\\XRBUILD\\.xrbuild\\']) {
    ran2.length = 0;
    await assert.rejects(section.list.add(cx(), folder), e => e.message === `Could not add ${folder}: it is already added as .xrbuild.`
      && e.folderMessage('X:/f') === 'Could not add X:/f: it is already added as .xrbuild.');
    same(ran2, [], 'An already added folder sends nothing');
  }
  projects.set('xrbuild-private', 'D:/Git/other/.hidden'); await statuses(); ran2.length = 0;
  await assert.rejects(section.list.add(cx(), 'D:\\Git\\other\\.hidden'), e => e.message.endsWith('it is already added as xrbuild-private.'));
  same(ran2, [], 'A folder registered under another name is not registered twice');
  projects.delete('xrbuild-private');
  ran2.length = 0; await section.list.remove(cx(), '.xrbuild');
  same(ran2, ['project remove .xrbuild'], 'Removal uses the exact dotted name');
  s = await statuses(); same(s.projects.rows.map(row => row.id), ['fork', 'my-app', 'xrbuild']);
  // An older Crew refuses the dotted name: one request, the update message, no retry without the dot.
  refusalOutput = 'stderr'; ran2.length = 0;
  await assert.rejects(section.list.add(cx(), 'D:/Git/xrbuild/.xrbuild'), e => [
    'Could not add D:/Git/xrbuild/.xrbuild. Crew did not accept the project name .xrbuild; update the Crew tool and try again.',
    'Could not add D:/Git/xrbuild/.xrbuild. Update the Crew tool on pc2 and try again.'].includes(e.message));
  same(ran2, ['project add .xrbuild D:/Git/xrbuild/.xrbuild'], 'One request, with no retry as xrbuild');
  refusalOutput = null; projects.delete('xrbuild');
  s = await statuses(); same(s.projects.rows.map(row => row.id), ['fork', 'my-app']);
  owned = true;
  ran2.length = 0;
  await assert.rejects(section.list.add(cx(), 'D:/Git/agentnumberone.dev'), e => e.message === 'Could not add D:/Git/agentnumberone.dev: another session owns the Crew home; change its projects from that session.', 'Home ownership also refuses an add, not the selected folder');
  same(ran2, ['project add agentnumberone.dev D:/Git/agentnumberone.dev']);
  assert.equal(projects.has('agentnumberone.dev'), false);
  await assert.rejects(section.list.remove(cx(), 'fork'), e => e.folderMessage('D:/Git/crew') === 'Could not remove D:/Git/crew: another session owns the Crew home; change its projects from that session.', 'A home-owner refusal gets concise guidance with the real removal folder');
  owned = false; await section.list.remove(cx(), 'fork');
  await assert.rejects(section.list.remove(cx(), 'fork'), /^Error: Could not remove fork: Crew no longer has this project; refresh the list\./);
  s = await statuses(); same(s.projects.rows.map(row => row.id), ['my-app']);
  projects.clear(); s = await statuses(); same([s.projects.status, s.projects.statusLabel, s.projects.rows, s.projects.usable], ['ready', '0 added', [], true], 'An empty list is ready to be added to');
  // Without the tool or its home there is no write authority; prior rows, if any, stay visible.
  const had = { tool: crew.tool, home: crew.home }; ran2.length = 0;
  crew.home = false; s = await statuses(); same([s.projects.status, s.projects.detail, s.projects.usable, s.projects.rows], ['missing', 'Create the crew home first (Requirements).', false, []]);
  crew.tool = ''; s = await statuses(); same([s.projects.status, s.projects.detail], ['missing', 'Install the crew tool first (Requirements).']);
  assert.ok(!ran2.some(call => call.startsWith('project')), 'Nothing is asked of a tool that is not there');
  Object.assign(crew, had); crew.latest = ''; psRules.splice(psRules.indexOf(rule), 1);
}
// Unreachable machine: every row says so; nothing is run there.
machines = [{ name: 'pc2', target: 'pc2', state: 'unreachable' }]; ran2.length = 0;
s = await statuses();
for (const id of ['git', 'node', 'hc', 'crew', 'home']) same([s[id].status, s[id].detail, s[id].fix], ['missing', 'Machine not connected.', null], id);
same([s.projects.status, s.projects.detail, s.projects.rows, s.projects.usable], ['missing', 'Machine not connected.', [], false], 'Projects of an unreachable machine have no write authority');
assert.equal(ran2.length, 0);
machines = [{ name: 'pc2', target: 'pc2', state: 'connected', version: '0.1.19' }];
// A machine without PowerShell: setup is not offered rather than attempted.
crew.arch = null; s = await statuses();
same([s.crew.status, s.crew.fix, s.home.status], ['recommended', null, 'recommended']); assert.match(s.crew.detail, /Windows machines/);
crew.arch = 'AMD64';

// The scripts are valid PowerShell, and the probe reads a real folder correctly (Windows only).
if (process.platform === 'win32') {
  const { spawnSync } = await import('node:child_process');
  const fs = await import('node:fs'), os = await import('node:os'), path = await import('node:path');
  const parse = script => spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', '$e = $null; [void][System.Management.Automation.Language.Parser]::ParseInput([Console]::In.ReadToEnd(), [ref]$null, [ref]$e); if ($e.Count) { $e | ForEach-Object { $_.Message }; exit 1 }'], { input: script, encoding: 'utf8' });
  for (const [name, script] of [['probe', f.crewProbeScript({ remote: true })], ['install', f.crewInstallScript()], ['init', f.crewInitScript()], ['project', f.crewProjectScript(['add', 'my-app', "D:\\Git\\it's"])]]) {
    const p = parse(script); assert.equal(p.status, 0, `${name} script does not parse: ${p.stdout}`);
  }
  const user = fs.mkdtempSync(path.join(os.tmpdir(), 'crew-plugin-'));
  try {
    const probe = () => f.parseCrewProbe(spawnSync('powershell.exe', ['-NoProfile', '-NonInteractive', '-Command', f.crewProbeScript()], { encoding: 'utf8', env: { ...process.env, USERPROFILE: user } }).stdout);
    let p = probe();
    same([p.root, p.tool, p.version, p.home], [path.join(user, '.crew'), '', '', false], 'An empty machine reads as not installed');
    assert.ok(p.path.length > 0);
    // A copy from before crew moved (tool in crew/) reads as not installed: Install then moves it.
    fs.mkdirSync(path.join(user, '.crew', 'tool', 'crew', 'bin'), { recursive: true }); fs.mkdirSync(path.join(user, '.crew', 'home'), { recursive: true });
    fs.writeFileSync(path.join(user, '.crew', 'tool', 'crew', 'crew.mjs'), "console.log(process.argv[2] === '--version' ? '8.8.8' : 'x');\n");
    fs.writeFileSync(path.join(user, '.crew', 'home', 'crew.json'), '{}');
    p = probe();
    same([p.tool, p.version, p.home], ['', '', true], 'An old-layout copy is not what the plugin runs');
    // The tool at the root of the clone, as the crew repository has it.
    fs.mkdirSync(path.join(user, '.crew', 'tool', 'bin'), { recursive: true });
    fs.writeFileSync(path.join(user, '.crew', 'tool', 'crew.mjs'), "console.log(process.argv[2] === '--version' ? '9.9.9' : 'x');\n");
    p = probe();
    same([p.tool, p.version, p.home], [path.join(user, '.crew', 'tool', 'bin'), '9.9.9', true]);
  } finally { fs.rmSync(user, { recursive: true, force: true }); }
}
console.log('PASS: Crew plugin machine setting, check/fix context, hc exec helper, versions, tool probe, install and home scripts, requirement statuses');
