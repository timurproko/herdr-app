// Crew: installs
// the `crew` tool on a machine and stands behind a profile's "Run as crew coordinator". The
// tool is a small Node program from the crew repository (its own repository; it began in a fork of Firstmate) that lets one coordinator agent hand
// work to worker agents through herdr-core; everything of it lives under ~/.crew on that
// machine (tool/, home/, worktrees/). Checks and installs run on the chosen machine through
// `hc exec`. The launch gate prepares the coordinator (crew home as cwd, `crew` on PATH,
// identity labels) or refuses with the reason; the only thing it ever writes is the crew
// home itself, the first time.
import { hc, shared, setShared, panes, terminals, pluginMod } from '../api.js';
import { refreshFleets, fleetContexts, fleetWitnessMachines, fleetPullContext, fleetColorAllowed, fleetLinks, invalidateFleet, knownFleetHomes } from './fleet.js';
import { fleetError } from './fleet-diagnostics.js';
import { fleetStatusScript } from './fleet-command.js';
import { workerSpaceRows, WORKER_SPACE_SETTING } from './worker-space-state.js';
import { refreshWorkerSpaces, invalidateWorkerSpaces, observeWorkerHome } from './worker-space.js';
import { workerSpaceScript } from './worker-space-command.js';
import { PROJECT_KINDS, readProjectKinds } from './project-kinds.js';
import { setProjectKind } from './project-kind-set.js';

const winPath = path => String(path).replace(/\//g, '\\');
const CHECK_TIMEOUT = 15, INSTALL_TIMEOUT = 300;
// Listing can inspect several published repositories; keep ordinary probes short.
const PROJECT_LIST_TIMEOUT = 60;
const NOT_INSTALLED = 127; // what a PowerShell wrapper exits with when the command is absent
const psQuote = text => "'" + String(text).replace(/['‘’‚‛]/g, "$&$&") + "'";

// --- hc exec ---------------------------------------------------------------

const B64 = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';
const B64_VALUES = new Uint8Array(123);
for (let i = 0; i < B64.length; i++) B64_VALUES[B64.charCodeAt(i)] = i;
const BASE64_PIECE = 65536; // at most 48 KiB of bytes per native task turn
// Fixed-size buffers, bulk strings, and up to three carried UTF-8 bytes. The
// fleet reader yields REAL native task turns between pieces, not microtasks
// (which share one watchdog budget). Small setup calls retain the sync helper.
function* base64Pieces(text) {
  const clean = String(text ?? '').replace(/[^A-Za-z0-9+/]/g, '');
  const bytes = new Uint8Array(BASE64_PIECE / 4 * 3 + 3), units = new Uint16Array(4096);
  let carry = 0;
  for (let start = 0; start < clean.length; start += BASE64_PIECE) {
    const end = Math.min(clean.length, start + BASE64_PIECE), last = end === clean.length;
    let count = carry;
    for (let i = start; i < end; i += 4) {
      const v = (B64_VALUES[clean.charCodeAt(i)] << 18) | (B64_VALUES[clean.charCodeAt(i + 1)] << 12) |
        (B64_VALUES[clean.charCodeAt(i + 2)] << 6) | B64_VALUES[clean.charCodeAt(i + 3)];
      bytes[count++] = (v >> 16) & 255;
      if (i + 2 < end) bytes[count++] = (v >> 8) & 255;
      if (i + 3 < end) bytes[count++] = v & 255;
    }
    const parts = [];
    let i = 0, used = 0;
    for (; i < count;) {
      const b = bytes[i];
      const size = b < 0x80 ? 1 : b >= 0xf0 ? 4 : b >= 0xe0 ? 3 : b >= 0xc0 ? 2 : 1;
      if (!last && i + size > count) break;
      let cp = size === 1 ? b : b & (0xff >> (size + 1));
      for (let k = 1; k < size; k++) cp = (cp << 6) | ((i + k < count ? bytes[i + k] : 0) & 63);
      if (cp > 0x10ffff || cp >= 0xd800 && cp <= 0xdfff) cp = 0xfffd;
      if (cp > 0xffff) {
        cp -= 0x10000;
        units[used++] = 0xd800 + (cp >> 10); units[used++] = 0xdc00 + (cp & 1023);
      } else units[used++] = cp;
      i += size;
      if (used >= units.length - 1) { parts.push(String.fromCharCode(...units.subarray(0, used))); used = 0; }
    }
    if (used) parts.push(String.fromCharCode(...units.subarray(0, used)));
    carry = Math.max(0, count - i);
    for (let k = 0; k < carry; k++) bytes[k] = bytes[i + k];
    yield {text:parts.join(''),last};
  }
}
export function decodeBase64(text) {
  return [...base64Pieces(text)].map(piece=>piece.text).join('');
}
export async function decodeBase64Reply(text, {yieldTurn = () => Promise.resolve(), current = () => true} = {}) {
  const parts = [];
  if (!current()) throw fleetError('obsolete-generation');
  for (const piece of base64Pieces(text)) {
    parts.push(piece.text);
    if (!piece.last) { await yieldTurn(); if (!current()) throw fleetError('obsolete-generation'); }
  }
  return parts.join('');
}

const json = text => { try { return JSON.parse(String(text ?? '').trim()); } catch { return null; } };

// Runs one program on the chosen machine (null: this computer) without a terminal.
// { code, stdout, stderr, missing } — missing: the program is not on that machine's PATH.
export async function on(machine, argv, { timeout = 60, received = () => {}, decode = decodeBase64, request } = {}) {
  const args = ['exec', ...(machine ? ['--on', machine] : []), '--timeout', String(timeout), '--json', '--', ...argv];
  let r;
  try { r = await (request ? request(()=>hc(args), {timeout:(timeout+2)*1000}) : hc(args)); }
  catch (error) { throw Object.assign(new Error(String(error?.message ?? error)), { uncertain: true }); }
  // A native watchdog interrupt is uncatchable. Publish receipt before ANY
  // synchronous JSON/Base64 work, so lifecycle recovery does not need finally.
  received();
  // hc reports its own failures as {"error": …}; on stdout or stderr depending on version.
  const out = json(r?.stdout) ?? json(r?.stderr);
  if (out?.error) {
    if (out.error.kind === 'spawn_failed') return { code: null, stdout: '', stderr: String(out.error.message ?? ''), missing: true };
    throw Object.assign(new Error(String(out.error.message || out.error.kind || 'hc exec failed')), { uncertain: true });
  }
  if (!out || typeof out.code !== 'number' && !out.timed_out) throw Object.assign(new Error(String(r?.stderr || r?.stdout || 'hc exec failed').trim().slice(0, 300)), { uncertain: true });
  const stdout = await decode(out.stdout), stderr = await decode(out.stderr);
  if (out.timed_out) return { code: null, stdout, stderr: stderr || `Timed out after ${timeout} s.`, missing: false, timedOut: true };
  return { code: out.code, stdout, stderr, missing: false };
}

// One PowerShell command (npm and its .cmd shims cannot be started directly).
export const powershell = (machine, command, options) =>
  on(machine, ['powershell', '-NoProfile', '-NonInteractive', '-Command', `${command}; exit $LASTEXITCODE`], options);
// A command found through PowerShell's lookup (.cmd/.ps1 shims); absent -> exit 127.
const psTool = (machine, name, args, options) => powershell(machine,
  `if (-not (Get-Command ${psQuote(name)} -ErrorAction SilentlyContinue)) { exit ${NOT_INSTALLED} }; & ${psQuote(name)} ${args.map(psQuote).join(' ')}`, options);

// --- versions --------------------------------------------------------------

// '0.1.29' from 'gh-axi 0.1.29', 'v1.106.1', 'jq-1.8.2'; null if none.
export function parseVersion(text) {
  const m = String(text ?? '').match(/(\d+)\.(\d+)(?:\.(\d+))?/);
  return m ? [m[1], m[2], m[3] ?? '0'].map(Number) : null;
}
// -1 / 0 / 1, or null if either side has no version.
export function compareVersions(a, b) {
  const x = parseVersion(a), y = parseVersion(b);
  if (!x || !y) return null;
  for (let i = 0; i < 3; i++) if (x[i] !== y[i]) return x[i] < y[i] ? -1 : 1;
  return 0;
}
const firstLine = text => String(text ?? '').split(/\r?\n/).map(l => l.trim()).find(Boolean)?.slice(0, 60) ?? '';
const tail = text => { const t = String(text ?? '').trim(); return t.length > 300 ? '…' + t.slice(-299) : t; };


// --- per-check facts, asked once per round of checks ------------------------

const rounds = new WeakMap();
function once(cx, key, fn) {
  const owner=cx.checkMemo??cx;
  let memo = rounds.get(owner);
  if (!memo) rounds.set(owner, memo = new Map());
  if (!memo.has(key)) memo.set(key, fn());
  return memo.get(key);
}
const machineOf = cx => cx?.setting?.('machine') ?? null;

async function machineState(cx) {
  const machine = machineOf(cx);
  if (!machine) return { ready: true, detail: 'This computer' };
  const r = await (cx.request ? cx.request(() => hc(['machine', 'ls']), { timeout: 17000 }) : hc(['machine', 'ls']));
  if (r.code !== 0) throw new Error(r.stderr || 'Cannot list machines');
  const list = json(r.stdout)?.machines;
  const found = Array.isArray(list) ? list.find(m => m.name === machine) : null;
  if (!found) return { ready: false, detail: `No machine named ${machine}. Pick another.` };
  return { ready: found.state === 'connected', detail: `${machine}: ${found.state ?? 'unknown'}${found.version ? ` · hc ${found.version}` : ''}` };
}
const connected = cx => once(cx, 'machine', () => machineState(cx).catch(() => ({ ready: false })));

// { windows, arch } of the chosen machine; non-Windows when PowerShell is absent.
const platform = cx => once(cx, 'platform', async () => {
  if (cx.request && !cx.updateCheck) return (await toolInventory(cx)).platform;
  const r = await on(machineOf(cx), ['powershell', '-NoProfile', '-NonInteractive', '-Command', '$env:PROCESSOR_ARCHITECTURE'], { timeout: CHECK_TIMEOUT, request: cx.request });
  return r.missing ? { windows: false, arch: null } : { windows: true, arch: firstLine(r.stdout).toUpperCase() };
});

function toolStatus(r, { min = null, optional = false, label = '' } = {}) {
  const absent = optional ? 'recommended' : 'missing';
  if (r.missing || r.code === NOT_INSTALLED) return { status: absent, detail: 'Not installed.' };
  if (r.code !== 0) return { status: 'error', detail: tail(r.stderr || r.stdout) || `Exited with ${r.code}.` };
  const line = firstLine(r.stdout || r.stderr);
  if (!min) return { status: 'ready', detail: line || label };
  const cmp = compareVersions(line, min);
  if (cmp === null) return { status: 'error', detail: line ? `Unrecognised version: ${line}` : 'No version printed.' };
  return cmp < 0 ? { status: absent, detail: `${line} installed; needs ${min} or newer.` } : { status: 'ready', detail: line };
}

// --- installs --------------------------------------------------------------

async function mustSucceed(r, what) {
  if (r.missing) throw new Error(`${what}: PowerShell is not available on that machine.`);
  if (r.code !== 0) throw Object.assign(new Error(tail(r.stderr || r.stdout) || `${what} failed (exit ${r.code}).`), { uncertain: Boolean(r.timedOut) });
}

const ps = (cx, script, timeout = CHECK_TIMEOUT) => on(machineOf(cx), ['powershell', '-NoProfile', '-NonInteractive', '-Command', script], { timeout, request:cx.request });
const DISCONNECTED = { status: 'missing', detail: 'Machine not connected.', fix: null };
// Every requirement is checked on the chosen machine, so it waits until that is reachable.
const reachable = check => async cx => (await connected(cx)).ready ? check(cx) : DISCONNECTED;

// --- the tools Firstmate works with ----------------------------------------------
// crew runs without them and uses each one that is installed (`crew tools` on the machine
// says what for), so a missing one is a recommendation with an Install button, not a fault.

// Single-file Windows amd64 releases, pinned and checksum-verified before use.
// A version bump is a one-line edit here.
export const PINNED = Object.freeze({
  jq: Object.freeze({ version: 'jq-1.8.2', exe: 'jq.exe', zip: false,
    url: 'https://github.com/jqlang/jq/releases/download/jq-1.8.2/jq-windows-amd64.exe',
    sha256: 'a6fc67fedaf9128a3309a1e2ebb8b986aeccf70122ee46d2cb4849e423f0c627' }),
  treehouse: Object.freeze({ version: 'v3.1.8', exe: 'treehouse.exe', zip: true,
    url: 'https://github.com/kunchenguid/treehouse/releases/download/v3.1.8/treehouse-v3.1.8-windows-amd64.zip',
    sha256: '72e7d61886e80e2befa067f5fab1c7ce2afbb49ba79c654cb7f4fc026cbc6b33' }),
  'no-mistakes': Object.freeze({ version: 'v1.106.1', exe: 'no-mistakes.exe', zip: true,
    url: 'https://github.com/kunchenguid/no-mistakes/releases/download/v1.106.1/no-mistakes-v1.106.1-windows-amd64.zip',
    sha256: '78e17f98e9d9448368ce126f34101f01ca43f55d5797e3f55f5e11aadd175bef' }),
});

const BIN = "(Join-Path $env:USERPROFILE '.local\\bin')";
// Puts .local\bin on the user's PATH (HKCU\Environment) when it is not there. The value is
// read and written raw, as an expandable string, so other %VARS% entries stay unexpanded.
// Programs see it once herdr-core starts again; the row's check says so.
export const ADD_BIN_TO_PATH = [
  `$bin = ${BIN}`,
  "$key = [Microsoft.Win32.Registry]::CurrentUser.OpenSubKey('Environment', $true)",
  "$raw = [string]$key.GetValue('Path', '', [Microsoft.Win32.RegistryValueOptions]::DoNotExpandEnvironmentNames)",
  "$listed = @($raw -split ';' | Where-Object { $_ } | ForEach-Object { [Environment]::ExpandEnvironmentVariables($_).TrimEnd('\\') })",
  'if (-not ($listed | Where-Object { $_ -ieq $bin })) {',
  "  $key.SetValue('Path', ($(if ($raw) { $raw.TrimEnd(';') + ';' } else { '' }) + $bin), [Microsoft.Win32.RegistryValueKind]::ExpandString)",
  '}',
  '$key.Close()',
].join('\n');
// Where a pinned exe is when PATH has none: present=1 if it is in .local\bin, userPath=1 if
// that folder is on the user's saved PATH (herdr-core sees it after it starts again),
// then its --version output.
export function pinnedLocateScript(tool) {
  const p = PINNED[tool];
  return [
    `$bin = ${BIN}; $exe = Join-Path $bin ${psQuote(p.exe)}`,
    "if (-not (Test-Path -LiteralPath $exe -PathType Leaf)) { 'present=0'; exit 0 }",
    "$raw = [string](Get-ItemProperty -Path 'HKCU:\\Environment' -Name Path -ErrorAction SilentlyContinue).Path",
    "$on = [bool]($raw -split ';' | Where-Object { $_ -and [Environment]::ExpandEnvironmentVariables($_).TrimEnd('\\') -ieq $bin })",
    "'present=1'; 'userPath=' + $(if ($on) { '1' } else { '0' })",
    "'version=' + ((& $exe --version 2>&1 | Select-Object -First 1) -as [string])",
    'exit 0',
  ].join('\n');
}

// PowerShell that downloads one pinned release, verifies it and puts the exe in .local\bin.
export function pinnedInstallScript(tool) {
  const p = PINNED[tool];
  if (!p) throw new Error(`No pinned release for ${tool}`);
  return [
    "$ErrorActionPreference = 'Stop'",
    "$ProgressPreference = 'SilentlyContinue'",
    'try {',
    '  [Net.ServicePointManager]::SecurityProtocol = [Net.ServicePointManager]::SecurityProtocol -bor [Net.SecurityProtocolType]::Tls12',
    `  $bin = ${BIN}`,
    '  New-Item -ItemType Directory -Force -Path $bin | Out-Null',
    "  $tmp = Join-Path ([IO.Path]::GetTempPath()) ('herdr-crew-' + [guid]::NewGuid())",
    '  New-Item -ItemType Directory -Path $tmp | Out-Null',
    '  try {',
    `    $file = Join-Path $tmp ${psQuote(p.zip ? 'download.zip' : p.exe)}`,
    `    Invoke-WebRequest -UseBasicParsing -Uri ${psQuote(p.url)} -OutFile $file`,
    '    $hash = (Get-FileHash -Algorithm SHA256 -LiteralPath $file).Hash',
    `    if ($hash -ne ${psQuote(p.sha256)}) { throw ('Checksum mismatch for ${tool} ${p.version}: got ' + $hash) }`,
    ...(p.zip ? [
      "    Expand-Archive -LiteralPath $file -DestinationPath (Join-Path $tmp 'x') -Force",
      `    $src = Get-ChildItem -LiteralPath (Join-Path $tmp 'x') -Recurse -File -Filter ${psQuote(p.exe)} | Select-Object -First 1 -ExpandProperty FullName`,
      `    if (-not $src) { throw ${psQuote(`${p.exe} is not in the archive.`)} }`,
    ] : ['    $src = $file']),
    `    Move-Item -LiteralPath $src -Destination (Join-Path $bin ${psQuote(p.exe)}) -Force`,
    '  } finally { Remove-Item -LiteralPath $tmp -Recurse -Force -ErrorAction SilentlyContinue }',
    ADD_BIN_TO_PATH,
    '} catch { [Console]::Error.WriteLine($_.Exception.Message); exit 1 }',
    'exit 0',
  ].join('\n');
}

// Fix shown only on Windows (amd64 for the pinned exes); otherwise the row says why not.
async function windowsOnly(cx, result, fix) {
  if (result.status === 'ready') return result;
  const p = await platform(cx);
  if (!p.windows) return { ...result, fix: null, detail: `${result.detail} Automatic install supports Windows machines.` };
  if (fix === 'amd64' && p.arch !== 'AMD64') return { ...result, fix: null, detail: `${result.detail} Automatic install supports amd64 only (this is ${p.arch || 'unknown'}).` };
  return result;
}

const RESTART_CORE = 'Restart herdr-core (Settings › Core) so programs find it.';
// Not on herdr-core's PATH: look in .local\bin itself, so an installed exe is never called
// missing. If its folder is on the saved PATH, only a core restart is left to do; if not,
// Fix PATH puts it there (no new download).
async function pinnedOffPath(cx, id, min) {
  const r = await on(machineOf(cx), ['powershell', '-NoProfile', '-NonInteractive', '-Command', pinnedLocateScript(id)], { timeout: CHECK_TIMEOUT, request:cx.request });
  const field = name => (String(r.stdout ?? '').split(/\r?\n/).find(l => l.startsWith(`${name}=`)) ?? '').slice(name.length + 1).trim();
  if (r.code !== 0 || field('present') !== '1') return null;
  const version = field('version'), old = min && compareVersions(version, min) !== null && compareVersions(version, min) < 0;
  const where = `${version ? `${version} is` : 'Installed'} in %USERPROFILE%\\.local\\bin`;
  if (old) return null; // An old copy: Install replaces it, as for one on PATH.
  if (field('userPath') === '1') return { status: 'recommended', detail: `${where}. ${RESTART_CORE}`, fix: null };
  return { status: 'recommended', detail: `${where}, which is not on PATH.`,
    fix: { label: 'Fix PATH', statusLabel: 'Fixing', async run(cx) {
      await mustSucceed(await ps(cx, ADD_BIN_TO_PATH), 'Adding .local\\bin to PATH');
    } } };
}

function pinned(id, use, min = null) {
  const p = PINNED[id];
  return {
    id, versionTool:id, label: id, about: `${use} ${id} ${p.version}, a single exe placed in %USERPROFILE%\\.local\\bin.`,
    check: reachable(async cx => {
      const r = await checkedTool(cx, id);
      const offPath = (r.missing || r.code === NOT_INSTALLED) && (await platform(cx)).windows ? await pinnedOffPath(cx, id, min) : null;
      return offPath ?? windowsOnly(cx, toolStatus(r, { min, optional: true }), 'amd64');
    }),
    fix: { label: 'Install', statusLabel: 'Installing', async run(cx) {
      await mustSucceed(await on(machineOf(cx), ['powershell', '-NoProfile', '-NonInteractive', '-Command', pinnedInstallScript(id)], { timeout: INSTALL_TIMEOUT, request:cx.request }), `Installing ${id}`);
    } },
  };
}

// One bounded Settings read supplies versions, platform and hook membership for
// the whole tool list. Other consumers retain their existing individual reads.
export function toolInventoryScript() {
  // Derive optional tools from their actual requirements, never a second list.
  const tools=['git','node','hc',...FIRSTMATE_TOOLS.filter(pre=>pre.versionTool).map(pre=>pre.versionTool)];
  return [
    "$ErrorActionPreference = 'Stop'",
    '$tools = @{}',
    `foreach ($name in @(${tools.map(psQuote).join(',')})) {`,
    "  $cmd = Get-Command $name -ErrorAction SilentlyContinue | Select-Object -First 1",
    "  if (-not $cmd) { $tools[$name] = @{code=127;stdout='';stderr='';missing=$true}; continue }",
    "  try { $global:LASTEXITCODE=0; $out=(& $cmd --version 2>&1 | Out-String); $tools[$name]=@{code=[int]$LASTEXITCODE;stdout=$out;stderr='';missing=$false} }",
    "  catch { $tools[$name]=@{code=1;stdout='';stderr='Could not read tool version.';missing=$false} }",
    '}',
    '$hooks=@(); $hooksIssue=$null',
    'try {',
    "  $p=Join-Path $env:USERPROFILE '.claude\\settings.json'",
    "  if (Test-Path -LiteralPath $p -ErrorAction Stop) {",
    '    $s=Get-Content -LiteralPath $p -Raw -ErrorAction Stop | ConvertFrom-Json -ErrorAction Stop; $commands=@()',
    '    if ($s -is [pscustomobject] -and $s.hooks -is [pscustomobject] -and $s.hooks.SessionStart -is [array]) {',
    '      foreach ($group in $s.hooks.SessionStart) { if ($group -is [pscustomobject] -and $group.hooks -is [array]) {',
    '        foreach ($hook in $group.hooks) { if ($hook -is [pscustomobject] -and $hook.command -is [string]) { $commands += $hook.command } }',
    '      } }',
    '    }',
    `    foreach ($name in @(${HOOK_TOOLS.map(psQuote).join(',')})) { if (@($commands | Where-Object { $_.Contains($name) }).Count) { $hooks += $name } }`,
    '  }',
    "} catch { $hooks=@(); $hooksIssue='Could not read Claude Code hook settings. Check that file and retry.' }",
    "@{platform=@{windows=$true;arch=$env:PROCESSOR_ARCHITECTURE};tools=$tools;hooks=@($hooks);hooksIssue=$hooksIssue} | ConvertTo-Json -Depth 6 -Compress",
    'exit 0',
  ].join('\n');
}
const toolInventory = cx => once(cx,'tool-inventory',async()=>{
  const r=await ps(cx,toolInventoryScript(),60);
  if(r.missing)return {platform:{windows:false,arch:null},tools:null};
  if(r.code!==0)throw new Error('Could not check installed tools. Refresh to try again.');
  const result=json(r.stdout);
  if(result?.platform?.windows!==true)throw new Error('Invalid tool inventory. Refresh to try again.');
  // Optional result fields cannot invalidate authoritative platform facts. A
  // missing/malformed individual version result gets one independent probe.
  const tools=result.tools&&typeof result.tools==='object'&&!Array.isArray(result.tools)?result.tools:null;
  const hooksValid=Array.isArray(result.hooks)&&result.hooks.every(id=>typeof id==='string'&&HOOK_TOOLS.includes(id));
  return {...result,tools,hooks:hooksValid?result.hooks:[],hooksIssue:result.hooksIssue!=null||!hooksValid?'Could not read Claude Code hook settings. Check that file and retry.':null};
});
const checkedTool = (cx,id)=>once(cx,`checked-tool:${id}`,async()=>{
  if(cx.request){
    const facts=await toolInventory(cx),r=facts.tools?.[id];
    if(r&&Number.isInteger(r.code)&&typeof r.stdout==='string'&&typeof r.stderr==='string'&&typeof r.missing==='boolean')return r;
    if(facts.platform.windows)return psTool(machineOf(cx),id,['--version'],{timeout:CHECK_TIMEOUT,request:cx.request});
  }
  return on(machineOf(cx),[id,'--version'],{timeout:CHECK_TIMEOUT,request:cx.request});
});

// The npm tools whose `<tool> setup hooks` adds a SessionStart hook for each agent.
export const HOOK_TOOLS = Object.freeze(['gh-axi', 'chrome-devtools-axi', 'lavish-axi']);
// `<tool> --version` on the chosen machine, asked once per round (its row and Agent hooks share it).
const toolVersion = (cx, id) => once(cx, `tool:${id}`, () => cx.request ? checkedTool(cx,id) : psTool(machineOf(cx), id, ['--version'], { timeout: CHECK_TIMEOUT }));

function npmTool(id, use, { min = null } = {}) {
  return {
    id, versionTool:id, label: id, about: `${use} npm package ${id}, installed globally (latest).`,
    check: reachable(async cx => windowsOnly(cx, toolStatus(await toolVersion(cx, id), { min, optional: true }), 'windows')),
    fix: { label: 'Install', statusLabel: 'Installing', async run(cx) {
      await mustSucceed(await powershell(machineOf(cx), `npm install -g ${psQuote(id)}`, { timeout: INSTALL_TIMEOUT, request:cx.request }), `Installing ${id}`);
    } },
  };
}

// ~/.claude/settings.json on the chosen machine, read-only. Prints absent, or present
// and the file. Its home folder is resolved there, never assumed from this computer.
export function claudeSettingsScript() {
  return [
    "$p = Join-Path $env:USERPROFILE '.claude\\settings.json'",
    "if (Test-Path -LiteralPath $p -PathType Leaf) { 'present'; [IO.File]::ReadAllText($p) } else { 'absent' }",
    'exit 0',
  ].join('\n');
}
// The tools with a SessionStart hook in Claude Code settings. `setup hooks` writes
// { matcher: '', hooks: [{ type: 'command', command: <the tool's script path>, timeout: 10 }] }
// and finds its own entry by the command containing the tool name; so does this.
// A missing or unreadable file means nothing is set up.
export function hookedTools(text) {
  let settings;
  try { settings = JSON.parse(String(text ?? '')); } catch { return new Set(); }
  const groups = Array.isArray(settings?.hooks?.SessionStart) ? settings.hooks.SessionStart : [];
  const commands = groups.flatMap(g => Array.isArray(g?.hooks) ? g.hooks : []).filter(h => typeof h?.command === 'string').map(h => h.command);
  return new Set(HOOK_TOOLS.filter(id => commands.some(c => c.includes(id))));
}

// Which installed tools still need their hook: { installed, missing }.
async function hookState(cx) {
  const versions = await Promise.all(HOOK_TOOLS.map(id => toolVersion(cx, id)));
  const installed = HOOK_TOOLS.filter((id, i) => versions[i].code === 0 && !versions[i].missing);
  let hooked,issue=null;
  if(cx.request && (await toolInventory(cx)).platform.windows) {const facts=await toolInventory(cx);hooked=new Set(facts.hooks);issue=facts.hooksIssue;}
  else {
    const r = await ps(cx, claudeSettingsScript());
    if (r.code !== 0) throw new Error(tail(r.stderr) || `Exited with ${r.code}.`);
    const [state, ...rest] = r.stdout.split(/\r?\n/);
    hooked = state.trim() === 'present' ? hookedTools(rest.join('\n')) : new Set();
  }
  return { installed, missing: installed.filter(id => !hooked.has(id)), issue };
}

const agentHooks = {
  id: 'agent-hooks', label: 'Agent hooks',
  about: 'Runs `setup hooks` for each installed axi tool, so agents get its context when a session starts (Claude Code, Codex, OpenCode).',
  check: reachable(async cx => {
    if (!(await platform(cx)).windows) return { status: 'recommended', fix: null, detail: 'Run `<tool> setup hooks` there by hand (automatic checks support Windows machines)' };
    const { installed, missing, issue } = await hookState(cx);
    if (issue) return { status:'recommended', fix:null, detail:issue };
    if (!installed.length) return { status: 'recommended', fix: null, detail: 'Install gh-axi, chrome-devtools-axi or lavish-axi first' };
    if (!missing.length) return { status: 'ready', detail: 'Set up for Claude Code' };
    return { status: 'recommended', detail: `Not set up for: ${missing.join(', ')}` };
  }),
  // One tool at a time; the first failure stops the rest and is shown in the row.
  fix: { label: 'Set up', statusLabel: 'Setting up', async run(cx) {
    const { missing } = await hookState(cx);
    for (const id of missing)
      await mustSucceed(await psTool(machineOf(cx), id, ['setup', 'hooks'], { timeout: 60, request:cx.request }), `Setting up ${id} hooks`);
  } },
};

const githubCli = {
  id: 'gh', label: 'GitHub CLI, signed in', about: '`crew land` opens pull requests with `gh`, signed in to GitHub on that machine.',
  check: reachable(async cx => {
    const r = await on(machineOf(cx), ['gh', 'auth', 'status'], { timeout: CHECK_TIMEOUT, request:cx.request });
    if (r.missing) return { status: 'recommended', detail: 'Install the GitHub CLI.' };
    if (r.code !== 0) return { status: 'recommended', detail: 'Run `gh auth login` on that machine.' };
    const signed = `${r.stdout}\n${r.stderr}`.split(/\r?\n/).map(l => l.replace(/^[\s✓✔-]+/, '').trim()).find(l => /logged in/i.test(l));
    return { status: 'ready', detail: (signed ?? 'Signed in').slice(0, 60) };
  }),
};

// In the order Firstmate's own checklist had them.
export const FIRSTMATE_TOOLS = Object.freeze([
  githubCli,
  pinned('jq', 'Reading JSON in scripts and briefs.'),
  pinned('treehouse', 'The pool reused task copies come from. Installing it turns on pooled working copies; the switch is in Settings below.'),
  pinned('no-mistakes', 'The delivery gate: review, tests, push and pull request.', '1.46.0'),
  npmTool('gh-axi', 'GitHub for agents.', { min: '0.1.29' }),
  npmTool('tasks-axi', 'The backlog behind `crew backlog`.', { min: '0.2.6' }),
  npmTool('quota-axi', 'Which agent account has room before a batch.', { min: '0.1.51' }),
  npmTool('chrome-devtools-axi', 'Web pages and browser checks for agents.'),
  npmTool('lavish-axi', 'Decisions and long reports shown as a page.', { min: '0.1.80' }),
  agentHooks,
]);

// --- the crew tool on a machine ------------------------------------------------

// Where the tool comes from. A plain clone of the crew repository, whose files (crew.mjs, bin/)
// are at its root; nothing is built or installed globally.
export const CREW_SOURCE = Object.freeze({ url: 'https://github.com/timurproko/crew.git', branch: 'main' });
const CREW_ROOT = "(Join-Path $env:USERPROFILE '.crew')";
// The clone is ~/.crew/core; before crew 0.7 it was ~/.crew/tool, which is used where it still is.
const PICK_TOOL = "$tool = Join-Path $root 'core'; if (-not (Test-Path -LiteralPath $tool)) { $before = Join-Path $root 'tool'; if (Test-Path -LiteralPath $before) { $tool = $before } }";

// One read-only probe. Output lines: root=<~/.crew>, tool=<its bin folder, or empty>,
// version=<crew --version>, revision=<short commit>, home=<1 when there is a crew home>,
// legacy=<1 when it is still packed in an old folder>, old=<that folder's name>, then path=<the PATH the core hands to programs>. With `remote`, also latest=<short commit
// of the source branch> (one network call; empty when it cannot be read).
export function crewProbeScript({ remote = false } = {}) {
  return [
    "$ErrorActionPreference = 'Stop'",
    `$root = ${CREW_ROOT}; ${PICK_TOOL}; $main = Join-Path $tool 'crew.mjs'`,
    "$bin = ''; $version = ''; $revision = ''; $latest = ''",
    'if (Test-Path -LiteralPath $main -PathType Leaf) {',
    "  $bin = Join-Path $tool 'bin'",
    '  try { $version = (& node $main --version 2>$null | Select-Object -First 1) } catch { $version = \'\' }',
    '  try { $revision = (& git -C $tool rev-parse --short=12 HEAD 2>$null | Select-Object -First 1) } catch { $revision = \'\' }',
    remote ? `  try { $line = (& git -C $tool ls-remote origin ${psQuote(`refs/heads/${CREW_SOURCE.branch}`)} 2>$null | Select-Object -First 1); if ($line) { $latest = $line.Substring(0, 12) } } catch { $latest = '' }` : '',
    '}',
    "'root=' + $root; 'tool=' + $bin; 'version=' + $version; 'revision=' + $revision; 'latest=' + $latest",
    // The home is ~/.crew itself (its crew.json); `legacy` marks one still packed in an old
    // place, ~/.crew/crew or ~/.crew/home, and `old` names that folder.
    "$now = Test-Path -LiteralPath (Join-Path $root 'crew.json') -PathType Leaf; $old = ''",
    "foreach ($name in 'crew', 'home') { if (-not $old -and (Test-Path -LiteralPath (Join-Path (Join-Path $root $name) 'crew.json') -PathType Leaf)) { $old = $name } }",
    "'home=' + $(if ($now -or $old) { '1' } else { '' }); 'legacy=' + $(if ($old -and -not $now) { '1' } else { '' }); 'old=' + $old",
    "'path=' + $env:PATH",
    'exit 0',
  ].filter(Boolean).join('\n');
}
export function parseCrewProbe(stdout) {
  const field = name => (String(stdout ?? '').split(/\r?\n/).find(l => l.startsWith(`${name}=`)) ?? '').slice(name.length + 1).trim();
  return { root: field('root'), tool: field('tool'), version: field('version'), revision: field('revision'), latest: field('latest'), home: field('home') === '1', legacy: field('legacy') === '1', old: field('old'), path: field('path') };
}

// Clone the repository into ~/.crew/core, or fast-forward an existing clone. A clone still at the
// old place, ~/.crew/tool, is renamed when `move` says nobody is using it (a running
// coordinator has that folder on its PATH); one that will not move is used where it is.
// An existing folder
// that is not a clone of the source, or one that cannot fast-forward, is left alone and
// reported: nothing is stashed or deleted. Two exceptions, both for a clean clone, which
// loses nothing: when the source's history was rewritten (same files, new commit ids) and
// the clone's files equal a published state; and when the clone is from before crew moved
// into a repository of its own (its tool is still in a crew/ subfolder, while the source now
// has crew.mjs at its root). Either is moved to the published history.
// Git runs with ErrorActionPreference Continue: under Windows PowerShell 5.1, Stop turns
// git's stderr into a NativeCommandError and the person sees that instead of our message.
export function crewInstallScript({ move = false } = {}) {
  const url = psQuote(CREW_SOURCE.url), branch = psQuote(CREW_SOURCE.branch);
  return [
    "$ErrorActionPreference = 'Stop'",
    `$root = ${CREW_ROOT}; ${PICK_TOOL}`,
    move ? "if ((Split-Path -Leaf $tool) -eq 'tool') { try { Rename-Item -LiteralPath $tool -NewName 'core' -ErrorAction Stop; $tool = Join-Path $root 'core' } catch { } }" : '',
    'function Fail($m) { [Console]::Error.WriteLine($m); exit 1 }',
    "if (-not (Get-Command git -ErrorAction SilentlyContinue)) { Fail 'Git is not installed on this machine.' }",
    "if (-not (Get-Command node -ErrorAction SilentlyContinue)) { Fail 'Node.js is not installed on this machine.' }",
    'New-Item -ItemType Directory -Force -Path $root | Out-Null',
    'if (Test-Path -LiteralPath $tool) {',
    // The URL as stored: `remote get-url` would apply the machine's insteadOf rewrites
    // (an SSH alias for GitHub, say) and no longer equal the source.
    // No `Select-Object -First 1` here: it ends the pipeline early and leaves $LASTEXITCODE
    // unset, which read as a failure.
    "  $origin = & git -C $tool config --get remote.origin.url 2>$null",
    `  if ($LASTEXITCODE -ne 0 -or "$origin".Trim() -ne ${url}) { Fail ($tool + ' exists but is not a clone of ' + ${url} + '; it was left alone.') }`,
    "  $ErrorActionPreference = 'Continue'",
    `  & git -C $tool fetch --quiet origin ${branch} 2>&1 | Out-Null`,
    "  if ($LASTEXITCODE -ne 0) { Fail 'Could not fetch the crew tool. Check the network and Git sign-in on this machine.' }",
    '  & git -C $tool merge --ff-only --quiet FETCH_HEAD 2>&1 | Out-Null',
    '  if ($LASTEXITCODE -ne 0) {',
    '    $dirty = & git -C $tool status --porcelain 2>&1',
    "    $tree = & git -C $tool rev-parse 'HEAD^{tree}' 2>&1",
    "    $published = @(& git -C $tool log FETCH_HEAD '--format=%T' 2>&1)",
    // A copy from before the move: its tool is in crew/, and the source has crew.mjs at its root.
    "    $before = (Test-Path -LiteralPath (Join-Path $tool 'crew\\crew.mjs') -PathType Leaf) -and (\"$(& git -C $tool ls-tree --name-only FETCH_HEAD crew.mjs 2>$null)\".Trim() -eq 'crew.mjs')",
    '    if ("$dirty".Trim() -or -not ($before -or ($published -contains "$tree".Trim()))) { Fail \'The installed copy has local changes or history that cannot fast-forward; it was left alone.\' }',
    '    & git -C $tool reset --hard --quiet FETCH_HEAD 2>&1 | Out-Null',
    "    if ($LASTEXITCODE -ne 0) { Fail 'Could not move the installed copy to the rewritten history.' }",
    '  }',
    "  $ErrorActionPreference = 'Stop'",
    '} else {',
    "  $ErrorActionPreference = 'Continue'",
    `  & git clone --quiet --depth 1 --branch ${branch} ${url} $tool 2>&1 | Out-Null`,
    "  if ($LASTEXITCODE -ne 0) { Fail 'Could not clone the crew tool. Check the network and Git sign-in on this machine.' }",
    "  $ErrorActionPreference = 'Stop'",
    '}',
    "$main = Join-Path $tool 'crew.mjs'",
    "if (-not (Test-Path -LiteralPath $main -PathType Leaf)) { Fail 'The clone has no crew tool in it.' }",
    '& node $main --version',
    'exit $LASTEXITCODE',
  ].filter(Boolean).join('\n');
}
// Asks the installed tool where its coordinator starts and prints that folder (stdout's last
// line). The tool creates the default home (~/.crew) when there is none, and unpacks a home
// from an old place (~/.crew/crew, ~/.crew/home) into it when nobody is using it; that is
// its decision, not ours. The folder is ~/.crew/coordinator, so Herdr names the space after it.
export const crewInitScript = () => [
  "$ErrorActionPreference = 'Stop'",
  `$root = ${CREW_ROOT}; ${PICK_TOOL}; $main = Join-Path $tool 'crew.mjs'`,
  "if (-not (Test-Path -LiteralPath $main -PathType Leaf)) { [Console]::Error.WriteLine('The crew tool is not installed.'); exit 1 }",
  '& node $main home --ensure',
  'exit $LASTEXITCODE',
].join('\n');
const lastLine = text => String(text ?? '').split(/\r?\n/).map(l => l.trim()).filter(Boolean).at(-1) ?? '';

// Observed revisions are wording evidence only, never requirement or action authority.
const projectToolFacts = new Map();
const crewProbe = (cx, remote) => once(cx, `crew:${remote ? 'remote' : 'local'}`, async () => {
  if (!(await platform(cx)).windows) return { unsupported: true };
  if (cx.isCurrent && !cx.isCurrent()) return { error: 'This check is no longer current.' };
  const r = await ps(cx, crewProbeScript({ remote }), remote ? 30 : CHECK_TIMEOUT);
  if (r.code !== 0) return { error: tail(r.stderr) || `Exited with ${r.code}.` };
  const probe = parseCrewProbe(r.stdout), key = machineOf(cx);
  // An inspected existing root is queued for scoped mode/capability validation,
  // never treated as current application proof. Legacy names are allowlisted.
  if(probe.home && (!probe.legacy || ['crew','home'].includes(probe.old)))
    observeWorkerHome(key, probe.legacy ? `${probe.root}/${probe.old}` : probe.root);
  const previous = projectToolFacts.get(key);
  projectToolFacts.set(key, { revision: probe.revision,
    outdated: Boolean(probe.revision && (remote ? probe.latest && probe.latest !== probe.revision
      : previous?.revision === probe.revision && previous.outdated)) });
  return probe;
});
const UNSUPPORTED = 'Automatic setup supports Windows machines for now.';
// One script installs and updates (clone, or fast-forward); only the button's name differs.
// The clone is renamed from its old folder only when no coordinator is running on that machine.
const installCrew = what => async cx => {
  const move = await liveCoordinators(machineOf(cx)).then(list => list.length === 0, () => false);
  await mustSucceed(await ps(cx, crewInstallScript({ move }), INSTALL_TIMEOUT), what);
};
// statusLabel: the word shown beside the row's spinner while the action runs.
const INSTALL_CREW = Object.freeze({ label: 'Install', statusLabel: 'Installing', run: installCrew('Installing the crew tool') });
const UPDATE_CREW = Object.freeze({ label: 'Update', statusLabel: 'Updating', run: installCrew('Updating the crew tool') });

// --- projects on a machine ---------------------------------------------------------
// The git folders the crew home on that machine knows. The tool owns the list: it is read
// and changed only through `crew project list | add | remove`, so its own rules apply (a
// live coordinator's list is that session's to change; a project with unfinished tasks
// stays).

// One `crew project …` call. Arguments are passed as quoted PowerShell strings.
const crewCommandPrelude = () => [
  "$ErrorActionPreference = 'Stop'",
  `$root = ${CREW_ROOT}; ${PICK_TOOL}; $main = Join-Path $tool 'crew.mjs'`,
  "if (-not (Test-Path -LiteralPath $main -PathType Leaf)) { [Console]::Error.WriteLine('The crew tool is not installed.'); exit 1 }",
];
const crewCommandScript = args => [
  ...crewCommandPrelude(),
  `& node $main ${args[0]} ${args.slice(1).map(psQuote).join(' ')}`,
  'exit $LASTEXITCODE',
].join('\n');
export const crewProjectScript = args => crewCommandScript(['project', ...args]);
export const crewFleetStatusScript = options => fleetStatusScript(crewCommandPrelude(),options);
const DISCOVERY_TIMEOUT = 25, RECORDED_TIMEOUT = 15, TRANSPORT_BUDGET = 40000;
// Shared capability evidence survives duplicate copies/reloads. It is not
// authority: PowerShell rechecks the exact CLI path + mtime on every request.
// Valid unchanged evidence can safely outlive an app session; no repeated help.
const FLEET_CAPABILITIES='custom.fleet.capabilities';
const fleetCapabilities = new Map();
// Only a complete usage refusal for this exact flag is capability evidence.
// Arbitrary stderr, auth failures, timeouts and transport errors are not retries.
const unsupportedDiscovery = result => [1,2].includes(result.code) && !result.timedOut && !result.missing && !result.stdout.trim() &&
  /^(?:crew:\s*)?(?:unknown|unrecognized|unsupported) (?:option|flag|argument):? ['"]?--discover-prs['"]?\.?$/i.test(result.stderr.trim());
const unsupportedFleetView = result => [1,2].includes(result.code) && !result.timedOut && !result.missing && !result.stdout.trim() &&
  /^(?:crew:\s*)?(?:unknown|unrecognized|unsupported) (?:(?:option|flag|argument):? ['"]?--view['"]?(?:[ =]['"]?fleet['"]?)?|view:? ['"]?fleet['"]?)\.?$/i.test(result.stderr.trim());
export const readFleetStatus = async (machine, {current = () => true, progress = () => {}, yieldTurn, discover = false} = {}) => {
  if(!current()) throw fleetError('obsolete-generation');
  const deadline=Date.now()+TRANSPORT_BUDGET;
  let timeout=DISCOVERY_TIMEOUT, legacy=false;
  const received=()=>progress('processing'), decode=text=>decodeBase64Reply(text,{yieldTurn,current});
  const ask=async (discover, allowance)=>{
    if(!current())throw fleetError('obsolete-generation');
    const remaining=deadline-Date.now();
    if(remaining<=0)throw fleetError('status-timeout',{timeout:TRANSPORT_BUDGET/1000});
    timeout=Math.min(allowance,Math.max(1,Math.floor(remaining/1000)));
    progress('transport');
    const key=machine??'local';
    const cached=shared(FLEET_CAPABILITIES)?.[key];
    const saved=typeof cached?.key==='string' && cached.key.length<=4096 && typeof cached.view==='boolean'?cached:undefined;
    // Another mounted copy may already have probed an updated installation.
    // Shared evidence takes precedence over this copy's older in-memory fact.
    const capability=saved??fleetCapabilities.get(key);
    const result=await powershell(machine,crewFleetStatusScript({discover,legacy,capability,reportCapability:true}),{timeout,received,decode});
    const prefix='__HERDR_FLEET_CAPABILITY__',newline=result.stdout.indexOf('\n');
    if(result.stdout.startsWith(prefix) && newline>=0) {
      const fact=json(result.stdout.slice(prefix.length,newline));
      if(current() && typeof fact?.key==='string' && fact.key.length<=4096 && typeof fact.view==='boolean') {
        const value={key:fact.key,view:fact.view};fleetCapabilities.set(key,value);
        if(JSON.stringify(saved)!==JSON.stringify(value)) {
          const cache=shared(FLEET_CAPABILITIES),bounded=cache && typeof cache==='object' && !Array.isArray(cache) && Object.keys(cache).length<256?cache:{};
          setShared(FLEET_CAPABILITIES,{...bounded,[key]:value});
        }
      }
      result.stdout=result.stdout.slice(newline+1);
    }
    return result;
  };
  let result;
  try {
    result=await ask(discover,discover?DISCOVERY_TIMEOUT:RECORDED_TIMEOUT);
    // A stale/incorrect help advertisement can receive an exact view refusal.
    // No auth/transport failure or arbitrary stderr permits another command.
    if(unsupportedFleetView(result) && current()) {legacy=true;result=await ask(discover,discover?DISCOVERY_TIMEOUT:RECORDED_TIMEOUT);}
    if(discover && unsupportedDiscovery(result) && current()) result=await ask(false,RECORDED_TIMEOUT);
  } catch(error) { throw error?.reason?error:fleetError('transport-error'); }
  if(result.timedOut) throw fleetError('status-timeout',{timeout});
  if(result.code!==0) throw fleetError('status-exit',{code:result.code});
  return result.stdout;
};
const FLEET_REQUEST = 'custom.fleet.request';
let fleetLifecycle = null, lastFleetRequest = null, lastFleetGeneration = null, deferredFleetUrgency = [], consumedFleetProof = {};
const discoverFleetStatus = (machine,options) => readFleetStatus(machine,{...options,discover:true});
const refreshFleetContext = ({cx,force}) => {
  if(!cx)return;
  // Reads belong to the recurring Spaces owner, NEVER a transient Settings or
  // Git view. Closing such a view cancels native tasks without settling promises.
  fleetLifecycle=cx;
  return cx.spawn(async view => {
    await Promise.resolve();
    const generation=shared('custom.fleet.generation')??0, request=shared(FLEET_REQUEST), valid=request?.generation===generation;
    const waiting=lastFleetGeneration===generation?deferredFleetUrgency:[];
    if(lastFleetGeneration!==generation)consumedFleetProof={};
    const proof=valid?Object.entries(request.proof??{}).filter(([key,id])=>consumedFleetProof[key]!==id).map(([key])=>key):[];
    const urgent=force===true || valid && request.id!==lastFleetRequest && request.force===true ? true
      : [...new Set([...waiting,...proof])];
    const inventory=valid && request.inventory===true && Date.now()-request.at<1000;
    // Only machines blocked by discovery retain urgency; never force another
    // machine repeatedly while waiting for that lower-priority read.
    deferredFleetUrgency=refreshFleets(view,readFleetStatus,urgent,inventory?discoverFleetStatus:null)??[];
    if(valid)consumedFleetProof={...consumedFleetProof,...request.proof};
    lastFleetRequest=request?.id;lastFleetGeneration=generation;
  });
};
const requestFleetContext = ({cx,force,space}) => {
  // A cold consumer must witness current verification, not a persisted success.
  fleetContexts(); // Witness a shared in-flight read before asking for proof.
  const proof=fleetWitnessMachines(space); // Failed witnessed status obeys its machine's backoff.
  return cx?.spawn(async ()=> {
    await Promise.resolve(); // This transient task only publishes intent, never IO.
    const generation=shared('custom.fleet.generation')??0, at=Date.now(), prior=shared(FLEET_REQUEST);
    const recent=prior?.generation===generation && at-prior.at<1000;
    const inventory=pluginMod==='custom-changes' || recent && prior.inventory===true;
    if(force===true || !recent || proof.some(key=>!prior.proof?.[key]) || inventory&&!prior.inventory) {
      const id=`${at}-${Math.random()}`,requests=recent?{...prior.proof}:{};
      for(const key of proof)requests[key]??=id;
      setShared(FLEET_REQUEST,{id,generation,at,force:force===true || recent && prior.force===true,proof:requests,inventory});
    }
    if(fleetLifecycle)try {refreshFleetContext({cx:fleetLifecycle});}catch {fleetLifecycle=null;}
  });
};
// `crew project list` prints one line per project: name and folder, tab-separated, and
// sometimes a third column with a setting of that project (how it is delivered, say).
export function parseProjects(stdout) {
  return String(stdout ?? '').split(/\r?\n/).map(line => line.split('\t').map(part => part.trim()))
    .filter(([name, folder]) => PROJECT_NAME.test(name ?? '') && Boolean(folder))
    // One line, the folder alone, like the Git plugin's repositories (the name is the
    // folder's). A project's settings are the tool's business and are not shown here, so
    // every row reads the same.
    .map(([name, folder]) => ({ id: name, label: winPath(folder), path: winPath(folder) }));
}
// What the tool accepts as a project name. One leading dot is allowed, so a '.xrbuild'
// folder is not confused with 'xrbuild'.
const PROJECT_NAME = /^(?=.{1,40}$)(?!.*\.\.)(?!.*\.$)\.?[a-z0-9][a-z0-9.-]*$/;
// A project is named after its folder: 'D:\Git\My App' -> 'my-app', 'D:\Git\x\.x' -> '.x'.
// '' when nothing usable is left.
export function projectName(folder) {
  const last = String(folder ?? '').replace(/[\\/]+$/, '').split(/[\\/]/).at(-1) ?? '';
  const rest = last.toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/\.{2,}/g, '.')
    .replace(/^[.-]+|[.-]+$/g, '');
  const name = ((last.startsWith('.') ? '.' : '') + rest).slice(0, 40).replace(/[.-]+$/, '');
  return PROJECT_NAME.test(name) ? name : '';
}
// The projects the last Projects check listed, per machine, so Add can tell a folder that is
// already registered (under any name) without asking the machine again.
const listedProjects = new Map();
const folderKey = path => winPath(path).replace(/\\+$/, '').toLowerCase();
// The tool's own words for a refusal ("crew: Project x already points at …").
const crewSaid = r => (tail(r.stderr || r.stdout) || `Exited with ${r.code}.`).replace(/^crew:\s*/, '');
// A summarized folder error carries its own target-aware wording so Settings can use
// the real folder for Remove (the command itself only receives the registered name).
export function projectFailure(output, { operation, name, folder = name, machine = null, outdated = false }) {
  const line = String(output ?? '').replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '').split(/[\r\n\u2028\u2029]/)
    .map(line => line.trim()).find(Boolean)?.replace(/^crew:\s*/i, '') ?? '';
  const summary = target => {
    const start = `Could not ${operation} ${target}`;
    if (/^(?:Usage:|Invalid project name:)/i.test(line)) return outdated
      ? `${start}. Update the Crew tool on ${machine ?? 'this computer'} and try again.`
      : `${start}. Crew did not accept the project name ${name}; update the Crew tool and try again.`;
    if (/^Read-only: this home is owned by (?:live )?terminal\b/i.test(line))
      return `${start}: another session owns the Crew home; change its projects from that session.`;
    if (/^(?:Project|Folder)\b.*\balready registered\b/i.test(line))
      return `${start}: it is already registered with Crew; use the existing project.`;
    if (/^Project .* already points at /i.test(line) || /^(?:Project(?: name)?|Name) .* (?:is )?(?:already )?(?:taken|in use|exists)\.?$/i.test(line))
      return `${start}: Crew already uses the project name ${name}; choose a folder with a different name.`;
    if (/is not a git repository\.?$/i.test(line))
      return `${start}: it is not a git repository; choose a git repository folder.`;
    if (/(?:folder .*(?:does not exist|not found)|cannot find (?:the )?path|no such file or directory|ENOENT)/i.test(line))
      return `${start}: the folder does not exist; choose an existing git repository folder.`;
    if (/^Unknown project:/i.test(line)) return `${start}: Crew no longer has this project; refresh the list.`;
    if (/^Project .+ is used by unfinished tasks:/i.test(line)) return `${start}: finish its Crew tasks first.`;
    if (/^Project .+ still has working copies of finished tasks to return:/i.test(line))
      return `${start}: close the terminals holding its finished Crew task copies and try again.`;
    // Only a first sentence, never a later usage block, task inventory or stderr tail.
    const first = line.split(/\bUsage:/i)[0].replace(/[\x00-\x1f\x7f]/g, ' ').trim()
      .match(/^.*?(?:[.!?](?=\s|$)|$)/)?.[0].replace(/[.!?]+$/, '').trim().slice(0, 240).trim();
    return `${start}.${first ? ` ${first}.` : ''}`;
  };
  const error = new Error(summary(folder));
  error.folderMessage = summary;
  return error;
}
// A folder Crew already lists: refused here, before Crew is asked, so the text is not
// attributed to Crew (Settings shows folderMessage as it is).
export function alreadyAdded(folder, name) {
  const summary = target => `Could not add ${target}: it is already added as ${name}.`;
  const error = new Error(summary(folder));
  error.folderMessage = summary;
  return error;
}
async function crewProject(cx, args) {
  const [operation, name, folder = name] = args, machine = machineOf(cx);
  let output;
  try {
    const r = await ps(cx, crewProjectScript(args), 30);
    if (!r.missing && r.code === 0) return r;
    output = r.missing ? 'PowerShell is not available on that machine.' : r.stderr.trim() || r.stdout;
  } catch (error) { output = error?.message ?? error; }
  throw projectFailure(output, { operation, name, folder, machine, outdated: projectToolFacts.get(machine)?.outdated });
}
const PROJECTS = Object.freeze({
  id: 'projects', section: true, label: 'Projects',
  about: 'Git folders crew may work in on this machine.',
  // A list section (docs/PLUGIN-UI.md): scoped to the plugin's Machine setting; Add opens
  // the folder browser there, with the projects already added ticked.
  list: Object.freeze({
    scope: Object.freeze({ label: 'Machine', setting: 'machine' }),
    picker: Object.freeze({ kind: 'folders', label: 'Add project' }),
    descriptionHint: Object.freeze({ label: 'Delivery kinds',
      entries: [
        ['Plain', 'The worker codes right away; Crew opens the pull request and reviews it.'],
        ['Delivery', 'The worker plans in a draft pull request and codes after approval; Crew reviews.'],
        ['Gate', 'The gate tool reviews, tests and opens the pull request.'],
      ],
    }),
    rowChoice: Object.freeze({ label: 'Delivery kind', options: PROJECT_KINDS,
      async set(cx, row, value) {
        const machine = machineOf(cx), result = cx.result?.('projects');
        const current = () => (!cx.isCurrent || cx.isCurrent()) && machineOf(cx) === machine &&
          result?.kindSupported === true && result.usable === true && result.rows?.includes(row) && listedProjects.get(machine)?.includes(row);
        if (!current()) throw new Error('The project changed. Refresh before trying again.');
        try { return await setProjectKind(args => on(machine, ['powershell', '-NoProfile', '-NonInteractive', '-Command', crewProjectScript(args)], { timeout: 30, request:cx.request }), row.kindTarget, value, current); }
        catch (error) { if (error.uncertain && current()) listedProjects.delete(machine); throw error; }
      },
    }),
    async add(cx, folder) {
      const name = projectName(folder);
      if (!name) throw projectFailure('That folder’s name cannot be used as a project name (1–40 lowercase ASCII letters, digits, dashes and dots; start with a letter, digit or one dot followed by one; no consecutive or trailing dots).', { operation: 'add', name, folder });
      // Crew would register one folder twice, and a re-add drops the project's settings.
      const known = listedProjects.get(machineOf(cx))?.find(row => folderKey(row.path) === folderKey(folder));
      if (known) throw alreadyAdded(folder, known.id);
      await crewProject(cx, ['add', name, folder]);
    },
    async remove(cx, id) {
      await crewProject(cx, ['remove', id]);
      const machine = machineOf(cx), rows = listedProjects.get(machine);
      if (rows) listedProjects.set(machine, rows.filter(row => row.id !== id));
    },
  }),
  check: async cx => {
    const machine = machineOf(cx), original = cx;
    cx = { ...cx, setting: key => key === 'machine' ? machine : original.setting?.(key) };
    const retained = () => ({ rows: cx.result?.('projects')?.rows ?? [], usable: false });
    const current = () => !cx.isCurrent || cx.isCurrent();
    try {
      if (!(await connected(cx)).ready) return { ...DISCONNECTED, statusLabel: null, ...retained() };
      if (!current()) return { status: 'error', rows: [], usable: false };
      const p = await crewProbe(cx, false);
      if (!current()) return { status: 'error', rows: [], usable: false };
      if (p.unsupported) return { status: 'recommended', statusLabel: null, detail: UNSUPPORTED, ...retained() };
      if (p.error) return { status: 'error', statusLabel: null, detail: 'Could not read Crew projects. Refresh to try again.', ...retained() };
      if (!p.tool) return { status: 'missing', statusLabel: null, detail: 'Install the crew tool first (Requirements).', ...retained() };
      if (!p.home) return { status: 'missing', statusLabel: null, detail: 'Create the crew home first (Requirements).', ...retained() };
      const facts = await readProjectKinds(args => {
        if (!current()) throw new Error('This check is no longer current.');
        return ps(cx, crewProjectScript(args), args[0] === 'list' ? PROJECT_LIST_TIMEOUT : CHECK_TIMEOUT);
      }, parseProjects);
      if (cx.isCurrent && !cx.isCurrent()) return { status: 'error', rows: [], usable: false };
      listedProjects.set(machineOf(cx), facts.rows);
      return { status: 'ready', statusLabel: `${facts.rows.length} added`, ...facts, usable: true };
    } catch {
      if (!current()) return { status: 'error', rows: [], usable: false };
      // Retain confirmed rows, never turn uncertainty into an authoritative empty list.
      // The current view/machine owns result(); legacy callers have no retained UI facts.
      const rows = cx.result?.('projects')?.rows ?? [];
      listedProjects.delete(machineOf(cx));
      return { status: 'error', statusLabel: null, detail: 'Could not read Crew projects. Refresh to try again.', rows, usable: false };
    }
  },
});

// --- Crew profiles ---------------------------------------------------------------
// Which profiles start a coordinator, and in what order, is the `profiles` setting below: a
// page in Settings listing the machine's profiles with a switch and arrows each. They then show
// under Crew in the + menu and on the Start page, and still under Profiles as themselves.

// --- Claude accounts on a machine -------------------------------------------------
// The saved accounts of the account switcher on that machine, read with its own `list`.
// Output: helper=<1 or empty>, then its lines ("1. name@example.com  (Org, plan)").
// Read-only; no token file is opened here.
export const claudeAccountsScript = () => [
  "$ErrorActionPreference = 'Stop'",
  "$helper = Join-Path $env:USERPROFILE '.claude\\plugins-local\\account-switcher\\bin\\session-dir.js'",
  "if (-not (Test-Path -LiteralPath $helper -PathType Leaf)) { 'helper='; exit 0 }",
  "'helper=1'",
  '& node $helper list',
  'exit 0',
].join('\n');
// { helper, accounts: [{ email, label }] } from that output. An account is shown by its email
// alone: the organisation and plan the switcher prints after it are left out.
export function parseClaudeAccounts(stdout) {
  const lines = String(stdout ?? '').split(/\r?\n/).map(l => l.trim());
  const accounts = [];
  for (const line of lines) {
    const m = line.match(/^\d+\.\s+(\S+@\S+)(?:\s+\((.*)\))?$/);
    if (m && CLAUDE_ACCOUNT.test(m[1]) && !accounts.some(a => a.email === m[1])) accounts.push({ email: m[1], label: m[1] });
  }
  return { helper: lines.includes('helper=1'), accounts };
}
// The list is also kept in shared state per machine, so the Settings dropdown can draw it
// without asking the machine on every frame. Names and organisation labels only.
const ACCOUNTS_KEY = 'custom.crew.claude-accounts';
const machineKey = machine => machine ?? '';
export const knownClaudeAccounts = machine => {
  const list = shared(ACCOUNTS_KEY)?.[machineKey(machine)];
  return Array.isArray(list) ? list.filter(o => Array.isArray(o) && CLAUDE_ACCOUNT.test(o[0] ?? '')).map(([email]) => [email, email]) : [];
};
const claudeAccounts = cx => once(cx, 'claude-accounts', async () => {
  if (!(await platform(cx)).windows) return { helper: false, accounts: [] };
  const r = await ps(cx, claudeAccountsScript());
  if (r.code !== 0) return { helper: false, accounts: [], error: tail(r.stderr) || `Exited with ${r.code}.` };
  const list = parseClaudeAccounts(r.stdout);
  setShared(ACCOUNTS_KEY, { ...(shared(ACCOUNTS_KEY) ?? {}), [machineKey(machineOf(cx))]: list.accounts.map(a => [a.email, a.label]) });
  return list;
});

// --- pooled working copies: the shared delivery workflow's one machine setting ------------
// Whether task copies on a machine come from the treehouse pool is decided by the shared
// delivery workflow (`delivery pool`), for crew, a1 and every other agent alike. The switch
// in Settings shows what that command reports and changes it through that command, so the
// two can never disagree. Output lines: workflow=<1 or empty>, state=<the command's JSON>.
export const pooledCopiesScript = (set = null) => [
  "$ErrorActionPreference = 'Stop'",
  "$main = Join-Path $env:USERPROFILE '.workflow\\bin\\delivery.mjs'",
  "if (-not (Test-Path -LiteralPath $main -PathType Leaf)) { 'workflow='; exit 0 }",
  "'workflow=1'",
  set === null ? '' : `& node $main pool ${set ? 'on' : 'off'} --json | Out-Null`,
  set === null ? '' : "if ($LASTEXITCODE -ne 0) { [Console]::Error.WriteLine('The shared delivery workflow did not change the setting.'); exit 1 }",
  "'state=' + ((& node $main pool --json 2>$null | Select-Object -Last 1) -as [string])",
  'exit 0',
].filter(Boolean).join('\n');
// { workflow, installed, enabled } from that output; a machine without the shared workflow,
// or one whose answer cannot be read, has nothing to switch.
export function parsePooledCopies(stdout) {
  const field = name => (String(stdout ?? '').split(/\r?\n/).find(l => l.startsWith(`${name}=`)) ?? '').slice(name.length + 1).trim();
  let state = null;
  try { state = JSON.parse(field('state')); } catch { /* reported as nothing to switch */ }
  const known = field('workflow') === '1' && state !== null && typeof state === 'object';
  return { workflow: known, installed: known && state.installed === true, enabled: known && state.enabled === true };
}
const POOLED_KEY = 'custom.crew.pooled-copies';
// What the last check on that machine saw; the switch is shown only where treehouse is installed.
export const knownPooledCopies = machine => {
  const seen = shared(POOLED_KEY)?.[machineKey(machine)];
  return seen && typeof seen === 'object' ? { shown: seen.workflow === true && seen.installed === true, value: seen.enabled === true } : null;
};
const pooledCopies = cx => once(cx, 'pooled-copies', async () => {
  const seen = (await platform(cx)).windows ? parsePooledCopies((await ps(cx, pooledCopiesScript(), 30)).stdout) : parsePooledCopies('');
  setShared(POOLED_KEY, { ...(shared(POOLED_KEY) ?? {}), [machineKey(machineOf(cx))]: seen });
  return seen;
});

// --- Run as crew coordinator: the profile-role gate -----------------------------

export const ROLE_LABEL = Object.freeze({ home: 'custom.crew.home', profile: 'custom.crew.profile', version: 'custom.crew.version' });
// Agents that can coordinate: anything the tool can also start as a worker.
export const COORDINATORS = /^(?:a1|pi|claude)(?:\.exe|\.cmd|\.bat)?$/i;
// What the account switcher accepts as an account: an email, a prefix of one, or a number.
export const CLAUDE_ACCOUNT = /^[A-Za-z0-9._@+-]{1,100}$/;

// Live terminals on `machine` (null: this computer) already running as a crew coordinator.
// `hc ls` lists every machine; addresses of other machines are prefixed `name/`.
async function liveCoordinators(machine) {
  const r = await hc(['ls', '--json', '--label', `${ROLE_LABEL.home}=1`]);
  if (r.code !== 0) throw new Error(tail(r.stderr || r.stdout) || 'Could not list terminals.');
  const list = json(r.stdout)?.terminals;
  if (!Array.isArray(list)) throw new Error('Could not read the terminal list.');
  return list.filter(t => t.state === 'live' && (machine ? t.address.startsWith(`${machine}/`) : !t.address.includes('/')));
}

// Prepares one "Run as crew coordinator" launch, or throws the reason it must not start.
// Context: { machine, space, profile, argv, cwd, token } captured at the click. Returns
// { cwd, labels, env } for the launch worker. The tool itself keeps the real authority: its
// `crew start` refuses a second owner whatever this guard saw.
export async function prepareCoordinatorLaunch(launch) {
  // The coordinator runs on the profile's own machine, whichever that is: crew is checked
  // there, at this launch. The plugin's Machine setting only chooses whose checklist the
  // Settings page shows; it does not decide where a coordinator may start.
  const machine = launch.machine ?? null, where = machine ?? 'this computer';
  const cx = Object.assign(Object.create(launch), { setting: key => key === 'machine' ? machine : launch.setting?.(key) });
  const command = Array.isArray(cx.argv) ? String(cx.argv[0] ?? '') : '';
  if (!COORDINATORS.test(command.split(/[\\/]/).at(-1) ?? '')) throw new Error('Run as crew coordinator supports the a1, pi and claude commands. Set the profile’s Command to one of them (or its full path), or remove it from Settings › Plugins › Crew › Profiles.');
  const m = await machineState(cx);
  if (!m.ready) throw new Error(m.detail || 'Machine not connected.');
  let probe = await crewProbe(cx, false);
  if (probe.unsupported) throw new Error(`Run as crew coordinator currently supports Windows machines only; ${where} is not one.`);
  if (probe.error) throw new Error(`Could not inspect the crew tool on ${where}: ${probe.error}`);
  if (!probe.tool) throw new Error(`The crew tool is not installed on ${where}. Install it in Settings › Plugins › Crew, then retry.`);
  if (!probe.root || !probe.path) throw new Error(`Could not read the environment the core hands to programs on ${where}.`);
  const owners = await liveCoordinators(machine);
  if (owners.length) throw new Error(`A crew coordinator is already running on ${where} (${owners.map(t => t.address).join(', ')}). Open that tab instead of starting another.`);
  // The tool says where its home is (creating or moving it first when that is due). A tool
  // from before `crew home` existed cannot answer: its existing home is used where it is.
  const asked = await ps(cx, crewInitScript(), 30);
  const answered = asked.code === 0 && /^[A-Za-z]:[\\/]/.test(lastLine(asked.stdout)) ? winPath(lastLine(asked.stdout)) : '';
  if (!answered && !probe.home) throw new Error(`Could not create the crew home on ${where}: ${tail(asked.stderr || asked.stdout) || `exit ${asked.code}`}. Update the crew tool in Settings › Plugins › Crew, then retry.`);
  const homeFolder = answered || `${winPath(probe.root)}\\${probe.legacy ? probe.old || 'home' : 'coordinator'}`;
  const labels = { [ROLE_LABEL.home]: '1', ...(probe.version ? { [ROLE_LABEL.version]: `${probe.version}${probe.revision ? `+${probe.revision}` : ''}`.slice(0, 60) } : {}) };
  if (typeof cx.profile === 'string' && cx.profile) labels[ROLE_LABEL.profile] = cx.profile.slice(0, 100);
  // Windows PATH entries are ';'-separated; the tool's launcher folder goes first so `crew`
  // resolves in this coordinator's shell. Workers get it from the tool itself.
  // CREW_CLAUDE_ACCOUNT reaches the tool through the coordinator's shell; it then starts
  // Claude Code workers through the account switcher's launcher as that account.
  // The chosen one when it is still saved there, else the first saved account (what the
  // Settings list shows when nothing was chosen); none when the machine has no switcher.
  const saved = (await claudeAccounts(cx)).accounts.map(a => a.email);
  const stored = String(cx.setting?.('claudeAccount') ?? '').trim();
  const account = saved.includes(stored) ? stored : saved[0] ?? '';
  // Ask Crew for the actual root from its returned launch folder, rather than
  // guessing it by stripping a cwd suffix. Observation failure cannot authorize
  // anything or change the existing coordinator launch decision.
  try {
    const seen = await powershell(machine, workerSpaceScript(crewCommandPrelude(), {kind:'discover',cwd:homeFolder}), {timeout:CHECK_TIMEOUT});
    if(seen.code===0)observeWorkerHome(machine,json(seen.stdout)?.home);
  } catch { /* A later successful inspection/status can supply the root. */ }
  return { cwd: homeFolder, labels, env: { PATH: `${winPath(probe.tool)};${probe.path}`, ...(account ? { CREW_CLAUDE_ACCOUNT: account } : {}) } };
}

// What crew runs in a space: 'coordinator' when one of its tabs holds a live terminal that a
// coordinator launch labelled (ROLE_LABEL.home), else 'worker' when one holds a live crew worker
// (the tool labels those with their task, `crew.task`), else null. The same labels the pane
// header's role pill reads.
export function crewInSpace(space, all = panes(), list = terminals()) {
  const tabs = new Set((space?.tabs ?? []).map(t => t.id));
  const mine = new Set(all.filter(p => tabs.has(p.tab) && p.terminal).map(p => p.terminal));
  const live = list.filter(t => mine.has(t.address) && t.state !== 'finished');
  if (live.some(t => t.labels?.[ROLE_LABEL.home] === '1')) return 'coordinator';
  if (live.some(t => typeof t.labels?.['crew.task'] === 'string' && t.labels['crew.task'])) return 'worker';
  return null;
}

// --- the plugin --------------------------------------------------------------

export default {
  id: 'crew',
  name: 'Crew',
  category: 'agents',
  version: '0.5.0',
  icon: 'agent',
  description: 'Run a coordinator agent that hands work to worker agents, each in its own terminal and working copy.',
  defaultEnabled: false,
  settingsRows: workerSpaceRows,
  settings: [
    { key:'showSpaceLabel',type:'toggle',default:true,hidden:true },
    { key: WORKER_SPACE_SETTING, type: 'toggle', hidden: true, default: false },
    // Shown at the top of Requirements: it is where everything in that list is checked and installed.
    { key: 'machine', type: 'machine', place: 'requirements', default: null, label: 'Machine' },
    // A dropdown of the accounts saved on that machine (read each time the requirements are
    // checked). Nothing stored means the first one, which is what the list then shows.
    // A page of the machine's profiles: which start a coordinator (role `firstmate`). Settings ›
    // Profiles links to it with `addLabel`.
    { key: 'profiles', type: 'profiles', role: 'firstmate', label: 'Profiles', title: 'Crew profiles', addLabel: 'Add a crew profile',
      about: 'Which profiles can start a crew coordinator: Start Crew on their row in + and on the Start page.' },
    { key: 'claudeAccount', type: 'select', default: '', label: 'Claude account', about: 'The saved account Claude Code workers start as.',
      empty: 'No saved accounts on this machine', options: cx => knownClaudeAccounts(cx.setting('machine') ?? null) },
    // Lives on the machine, not in this plugin's saved settings: shown where treehouse is
    // installed, read with every requirements check and changed through `delivery pool`.
    { key: 'pooledCopies', type: 'toggle', default: false, label: 'Treehouse (pooled working copies)',
      about: 'Reuse working copies from the treehouse pool instead of a new folder per task.',
      live: {
        state: cx => knownPooledCopies(cx.setting('machine') ?? null),
        async set(cx, value) { await mustSucceed(await ps(cx, pooledCopiesScript(value), 60), 'Changing pooled working copies'); },
      } },
  ],
  prerequisites: [
    { id: 'git', versionTool:'git', label: 'Git', about: 'git on the core’s PATH.',
      check: reachable(async cx => {
        const r = await checkedTool(cx, 'git');
        return r.missing ? { status: 'missing', detail: 'Install Git for Windows.' } : toolStatus(r);
      }) },
    { id: 'node', versionTool:'node', label: 'Node.js', about: 'node on the core’s PATH; the crew tool is a Node program.',
      check: reachable(async cx => {
        const r = await checkedTool(cx, 'node');
        return r.missing ? { status: 'missing', detail: 'Install Node.js 20 or newer.' } : toolStatus(r, { min: '20.0.0' });
      }) },
    { id: 'hc', versionTool:'hc', label: 'herdr-core', about: '`hc` 0.1.14 or newer on that machine.',
      check: reachable(async cx => toolStatus(await checkedTool(cx, 'hc'), { min: '0.1.14' })) },
    { id: 'crew', updates: true, label: 'Crew tool', about: `A clone of ${CREW_SOURCE.url} in ~/.crew/core on that machine.`,
      check: reachable(async cx => {
        const p = await crewProbe(cx, true);
        if (!cx.updateCheck) {
          await claudeAccounts(cx).catch(() => null); // refreshes the Settings dropdown
          await pooledCopies(cx).catch(() => null);
        }
        if (p.unsupported) return { status: 'recommended', fix: null, detail: UNSUPPORTED };
        if (p.error) return { status: 'error', detail: p.error };
        if (!p.tool) return { status: 'missing', update: false, detail: 'Not installed.' };
        const installed = `${p.version || 'unknown version'}${p.revision ? ` · ${p.revision}` : ''}`;
        // A confirmed update needs attention, not an optional-tool recommendation.
        // Keep the installed revision and explicit Update action; unknown checks stay quiet.
        if (p.latest && p.revision && p.latest !== p.revision) return { status: 'missing', update: true, statusLabel: 'Outdated', detail: installed, fix: UPDATE_CREW };
        return { status: 'ready', update: p.latest && p.revision ? false : null, detail: installed };
      }),
      fix: INSTALL_CREW },
    { id: 'home', label: 'Crew home', about: '~/.crew on that machine: the registered projects and the task records, with the coordinator’s rules in ~/.crew/coordinator.',
      check: reachable(async cx => {
        const p = await crewProbe(cx, false);
        if (p.unsupported) return { status: 'recommended', fix: null, detail: UNSUPPORTED };
        if (p.error) return { status: 'error', detail: p.error };
        if (p.home) return { status: 'ready', detail: p.legacy ? `${winPath(p.root)}\\${p.old || 'home'} (unpacked into ${winPath(p.root)} at the next launch)` : winPath(p.root) };
        return p.tool ? { status: 'missing', detail: 'Not created yet. It is also created at the first coordinator launch.' }
          : { status: 'missing', fix: null, detail: 'Install the crew tool first.' };
      }),
      fix: { label: 'Create', async run(cx) {
        await mustSucceed(await ps(cx, crewInitScript(), 30), 'Creating the crew home');
      } } },
    ...FIRSTMATE_TOOLS,
    PROJECTS,
  ],
  menus: { 'spaces.icons': () => [{id:'crew-label',label:'Crew label',icon:'icons/agent.svg',setting:'showSpaceLabel'}] },
  hooks: {},
  lifecycle: { 'spaces.refresh': refreshFleetContext,
    'workspace.settings.refresh': context => refreshWorkerSpaces({...context,knownHomes:knownFleetHomes}, (machine, request) =>
      powershell(machine, workerSpaceScript(crewCommandPrelude(), request), {timeout:15})) },
  onSettingChange: key => { if (key === WORKER_SPACE_SETTING) invalidateWorkerSpaces(); },
  events: { 'workspace.context.refresh': requestFleetContext },
  workspaceLinks: ({presentation = false} = {}) => fleetContexts({presentation}).flatMap(fleetLinks),
  guards: { 'spaces.color': ({pair}) => fleetColorAllowed(pair) },
  pullContext: ({space,presentation = false}) => fleetPullContext(space,{presentation}),
  onEnabledChange: () => { invalidateFleet(); invalidateWorkerSpaces(); },
  // Metadata-only grouping of already-running coordinators. No reads or action
  // authority; disabled Crew does not end or unlabel existing sessions.
  agentGroupFirst(group, {terminals:list=[]} = {}) {
    const members=new Set(group.members.map(agent=>agent.address));
    return list.some(terminal=>members.has(terminal.address)&&terminal.state==='live'&&terminal.labels?.[ROLE_LABEL.home]==='1');
  },

  // The Spaces sidebar's tag for a space the coordinator or crew workers run in.
  spaceTags: (space, {surface,setting} = {}) => {
    if(surface==='spaces' && setting?.('showSpaceLabel')===false)return [];
    const display = fleetContexts({presentation:true});
    const kind = display.some(c=>c.parent===space.id) ? 'coordinator'
      : display.some(c=>fleetLinks(c).some(link=>link.child===space.id)) ? 'worker' : crewInSpace(space);
    return kind ? [{ label: 'Crew', tooltip: kind === 'coordinator' ? 'Crew coordinator' : 'Crew worker' }] : [];
  },
  // Required moment behind a profile's role: prepare the launch or refuse. The role id stays
  // `firstmate` (saved profiles carry it); what it starts is a crew coordinator.
  gates: { 'profile.role.firstmate': prepareCoordinatorLaunch },
};
