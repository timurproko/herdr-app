// Development-only, read-only release audit. Never grants runtime permission,
// imports downloaded code, edits a profile, or connects to a Core.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createHash} from 'node:crypto';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
const root = fileURLToPath(new URL('../', import.meta.url));
const require = createRequire(import.meta.url);
const {PROFILE} = require('../src/integration/herdr/documents/tab-move-v1.cjs');
const baseline = JSON.parse(fs.readFileSync(new URL('./contracts/tab-move-0.1.16.json', import.meta.url), 'utf8'));
const sha = /^[a-f0-9]{40}$/;
const versionPattern = /^(0|[1-9]\d*)\.(0|[1-9]\d*)\.(0|[1-9]\d*)$/;
function version(value) {
  if (typeof value !== 'string' || value.length > 40 || !versionPattern.test(value)) throw Error('Expected an exact release version, for example 0.1.16.');
  return value;
}
export function tabMoveVersionStatus(appVersion) {
  const reviewed = PROFILE.apps.includes(appVersion);
  return {reviewed, reviewedApps: [...PROFILE.apps], reviewedCores: [...PROFILE.cores],
    nextCheck: reviewed ? null : 'npm run check:tab-move',
    note: 'App version only; every move still validates the running Core, identity, capabilities and document shape.'};
}
export function inventory(data) {
  if (!data || data.truncated !== false || !Array.isArray(data.tree) || !data.tree.length || data.tree.length > 50000)
    throw Error('Missing, truncated or oversized release tree.');
  const paths = new Set(), entries = [];
  for (const e of data.tree) {
    if (typeof e.path !== 'string' || !e.path || e.path.startsWith('/') || e.path.includes('\\')
        || e.path.split('/').some(p => !p || p === '.' || p === '..') || paths.has(e.path)
        || !sha.test(e.sha ?? '')
        || !({tree: ['040000'], blob: ['100644', '100755', '120000'], commit: ['160000']}[e.type]?.includes(e.mode))) throw Error('Invalid release tree entry.');
    paths.add(e.path);
    if (e.type !== 'tree') entries.push([e.path, e.mode, e.type, e.sha]);
  }
  return entries.sort((a,b) => a[0] < b[0] ? -1 : a[0] > b[0] ? 1 : 0);
}
export const inventoryHash = entries => createHash('sha256').update(JSON.stringify(entries)).digest('hex');
// Fixed public API, no account tokens, redirects, arbitrary origins or remote execution.
export async function githubJson(suffix, signal) {
  const response = await fetch(`https://api.github.com/repos/herdrdev/herdr-app/${suffix}`, {
    signal, redirect: 'error', headers: {Accept: 'application/vnd.github+json', 'User-Agent': 'Custom-tab-move-compatibility'},
  });
  if (!response.ok) throw Error(`GitHub source check failed (HTTP ${response.status}); no compatibility approval was made.`);
  const reader = response.body.getReader(); let size = 0; const chunks = [];
  try {
    for (;;) {
      const {done, value} = await reader.read(); if (done) break;
      size += value.byteLength;
      if (size > 8 * 1024 * 1024) throw Error('Release response exceeds 8 MiB.');
      chunks.push(Buffer.from(value));
    }
    return JSON.parse(Buffer.concat(chunks).toString('utf8'));
  } finally { await reader.cancel(); }
}
async function resolveRelease(appVersion, get) {
  const ref = await get(`git/ref/tags/v${version(appVersion)}`);
  if (ref.ref !== `refs/tags/v${appVersion}`) throw Error('Release tag did not match the requested version.');
  let object = ref.object;
  for (let i = 0; i < 4; i++) {
    if (!sha.test(object?.sha ?? '')) throw Error('Invalid release commit identity.');
    if (object.type === 'commit') return object.sha;
    if (object.type !== 'tag') throw Error('Release tag is not a commit.');
    object = (await get(`git/tags/${object.sha}`)).object;
  }
  throw Error('Release tag nesting exceeds the audit limit.');
}
export async function compareRelease(appVersion, {get = githubJson, contract = baseline} = {}) {
  version(appVersion);
  if (contract.version !== 1 || contract.repository !== 'herdrdev/herdr-app' || !sha.test(contract.commit)
      || !PROFILE.apps.includes(contract.appVersion)) throw Error('Unreviewed release baseline.');
  const signal = AbortSignal.timeout(25000), fetchJson = suffix => get(suffix, signal);
  // The baseline is immutable: never look it up through a movable tag.
  const base = inventory(await fetchJson(`git/trees/${contract.commit}?recursive=1`));
  if (inventoryHash(base) !== contract.inventorySha256) throw Error('Pinned release baseline fingerprint mismatch.');
  const original = new Map(base.map(e => [e[0], e]));
  for (const [file, hash] of Object.entries(contract.criticalFiles))
    if (original.get(file)?.[3] !== hash) throw Error('Pinned tab-move source fingerprint mismatch.');
  const commit = await resolveRelease(appVersion, fetchJson);
  if (appVersion === contract.appVersion && commit !== contract.commit) throw Error('The reviewed release tag changed; its pinned provenance needs review.');
  const target = commit === contract.commit ? base : inventory(await fetchJson(`git/trees/${commit}?recursive=1`));
  const current = new Map(target.map(e => [e[0], e]));
  const changes = [...new Set([...original.keys(), ...current.keys()])].sort().flatMap(file => {
    const before = original.get(file), after = current.get(file);
    return JSON.stringify(before) === JSON.stringify(after) ? [] : [{file,
      change: !before ? 'added' : !after ? 'removed' : 'changed',
      critical: Object.hasOwn(contract.criticalFiles, file)}];
  });
  return {status: changes.length ? 'changed' : 'unchanged', baseline: contract.appVersion,
    baselineCommit: contract.commit, commit,
    compareUrl: `https://github.com/${contract.repository}/compare/${contract.commit}...${commit}`,
    criticalChanges: changes.filter(e => e.critical), changedFiles: changes.length,
    // Include ALL repository paths in comparison, not just today's known dependencies.
    changes: changes.slice(0,100), omittedChanges: Math.max(0, changes.length - 100),
    note: 'Source evidence only, not installed-binary provenance or permission to enable an unknown release.'};
}
export function runRegressions() {
  const tests = ['tests/tab-move.test.mjs', 'tests/tab-move-ui.test.mjs'], results = [];
  for (const test of tests) {
    const result = cp.spawnSync(process.execPath, ['--experimental-vm-modules', test], {
      cwd: root, encoding: 'utf8', timeout: 180000, windowsHide: true, maxBuffer: 2 * 1024 * 1024,
    });
    results.push({test, ok: !result.error && result.status === 0,
      output: (result.stdout ?? '').trim().slice(-8000),
      ...((result.error || result.status !== 0) ? {error: result.error?.message ?? (result.stderr ?? '').trim().slice(-4000)} : {})});
  }
  return {ok: results.every(r => r.ok), tests: results};
}
export async function checkTabMove({appVersion, offline = false, get, contract, regressions = runRegressions} = {}) {
  version(appVersion);
  const profile = tabMoveVersionStatus(appVersion);
  let source = {status: 'not-checked'};
  if (!offline) {
    try { source = await compareRelease(appVersion, {get, contract}); }
    catch (error) { source = {status: 'unavailable', error: error.message}; }
  }
  const fixtures = regressions();
  const ok = profile.reviewed && fixtures.ok && source.status !== 'unavailable';
  return {ok, appVersion, status: !fixtures.ok ? 'regression-failed' : source.status === 'unavailable' ? 'source-unavailable'
    : profile.reviewed ? 'reviewed' : 'needs-review', profile, source, fixtures,
    action: profile.reviewed ? 'Keep runtime preflight checks enabled.'
      : 'Review the pinned release diff and installed-binary provenance, then explicitly update the exact-version profile. No approval was written.',
    limits: 'No live Core/session tests; synthetic fixtures do not prove native two-client continuity.'};
}
export async function auditHostTabMove(report, audit = checkTabMove) {
  const tabMove = tabMoveVersionStatus(report.version);
  if (!tabMove.reviewed) {
    try { tabMove.upgradeAudit = await audit({appVersion: report.version}); }
    catch (error) { tabMove.upgradeAudit = {ok: false, status: 'unavailable', error: error.message}; }
  }
  // Preserve the public API result: a private-feature failure cannot disable Custom.
  return {...report, tabMove};
}
export function parseArgs(args) {
  let appVersion, offline = false;
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--offline' && !offline) offline = true;
    else if (args[i] === '--release' && appVersion === undefined) appVersion = version(args[++i]);
    else throw Error('Usage: npm run check:tab-move -- [--release 0.1.16] [--offline]');
  }
  return {appVersion, offline};
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const options = parseArgs(process.argv.slice(2));
    options.appVersion ??= cp.execFileSync(process.env.HERDR_APP_BIN || 'herdr-app', ['--version'], {
      encoding: 'utf8', windowsHide: true, timeout: 15000,
    }).trim().replace(/^herdr-app\s+/, '');
    const result = await checkTabMove(options);
    console.log(JSON.stringify(result, null, 2)); if (!result.ok) process.exitCode = 1;
  } catch (error) { console.error(JSON.stringify({ok: false, error: error.message})); process.exitCode = 1; }
}
