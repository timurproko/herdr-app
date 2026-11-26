// Explicit watched deployment, never a daemon or a terminal-based remote command.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { createHash, randomUUID } from 'node:crypto';
import { fileURLToPath, pathToFileURL } from 'node:url';
import worker from './deploy-all-worker.cjs';
import updater from '../src/services/updates/update-worker.cjs';
const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, '..');
const MARKER = 'HERDR_DEPLOY_ALL_RESULT=';
export const RESULT_PROTOCOL = 1;

export function remoteArgs(machine, dryRun = false) {
  const source = fs.readFileSync(path.join(directory, 'deploy-all-worker.cjs'), 'utf8');
  // The outer loader is old-Node syntax; don't parse the worker on unsupported Node.
  const invoke = source + `\nconsole.log(${JSON.stringify(MARKER)} + JSON.stringify(runRemote(${JSON.stringify({ dryRun })})));`;
  const loader = `if (parseInt(process.versions.node,10)<20) { console.log(${JSON.stringify(MARKER)} + JSON.stringify({action:'skipped',reason:'Node 20+ is required'})); } else { eval(${JSON.stringify(invoke)}); }`;
  const code = `eval(Buffer.from('${Buffer.from(loader).toString('base64')}','base64').toString('utf8'))`;
  return ['exec', '--on', machine, '--timeout', '600', '--json', '--', 'node', '-e', code];
}
function inventory(run, env) {
  const r = run('hc', ['machine', 'ls', '--json'], { env, timeout: 15000 });
  if (r.code !== 0) throw Error('cannot list machines with hc machine ls --json');
  const list = JSON.parse(r.stdout).machines;
  if (!Array.isArray(list) || list.some(m => !m || typeof m.name !== 'string' || !m.name)) throw Error('invalid hc machine list');
  return list;
}
export function deployPeer(machine, { run = worker.runCommand, env = process.env, log = console.log, dryRun = false } = {}) {
  if (machine.state !== 'connected') return { action: 'skipped', reason: `offline (${machine.state || 'unknown'})` };
  try {
    const r = run('hc', remoteArgs(machine.name, dryRun), { env, timeout: 615000 });
    let out;
    try { out = JSON.parse(r.stdout || r.stderr); }
    catch { return { action: 'failed', reason: 'remote transport failed; outcome unknown' }; }
    if (out.error?.kind === 'spawn_failed') return { action: 'skipped', reason: 'node is missing or unavailable' };
    const stdout = Buffer.from(out.stdout || '', 'base64').toString('utf8');
    const stderr = Buffer.from(out.stderr || '', 'base64').toString('utf8');
    const lines = stdout.trimEnd().split(/\r?\n/);
    const final = lines.at(-1);
    const result = final?.startsWith(MARKER) ? JSON.parse(final.slice(MARKER.length)) : null;
    const output = result ? lines.slice(0, -1).join('\n') : stdout;
    if (output.trim()) log(output.trim());
    if (stderr.trim()) log(stderr.trim());
    if (r.timedOut || out.timed_out) return { ...result, action: 'failed', reason: 'remote timed out; outcome unknown' };
    if (r.code !== 0 || out.code !== 0 || !result || !['deployed', 'already current', 'skipped', 'failed', 'would deploy'].includes(result.action)) return { ...result, action: 'failed', reason: 'remote execution failed; outcome unknown' };
    return result;
  } catch { return { action: 'failed', reason: 'remote transport failed; outcome unknown' }; }
}

export function parseOptions(args) {
  const options = { dryRun: false, skipLocal: false, only: null };
  for (let i = 0; i < args.length; i++) {
    if (args[i] === '--dry-run') options.dryRun = true;
    else if (args[i] === '--skip-local') options.skipLocal = true;
    else if (args[i] === '--only' && options.only === null && args[i + 1] && !args[i + 1].startsWith('--')) {
      options.only = args[++i].split(',').map(name => name.trim());
      if (options.only.some(name => !name)) throw Error('--only needs comma-separated machine names');
    } else throw Error('Use npm run deploy:all -- [--dry-run] [--only local,machine] [--skip-local]');
  }
  return options;
}
export function printSummary(results, log) {
  const [header, ...rows] = updater.summaryLines(results);
  log('\n' + header);
  for (const row of rows) log(row);
}
// Kept outside runtime/ and the ownership manifest: the row can reattach after
// its own mod is replaced. Dry-run must remain byte-preserving, including here.
export function manifestDigest(home) {
  try {
    const bytes = fs.readFileSync(path.join(home, '.customizations/manifest.json'));
    const value = JSON.parse(bytes);
    if (value.version !== 2 || value.id !== 'custom' || !value.files) return null;
    return createHash('sha256').update(bytes).digest('hex');
  } catch { return null; }
}
export function resultRecorder(env = process.env, dryRun = false, ioOptions = {}) {
  if (dryRun) return () => {};
  const home = env.HERDR_APP_HOME || path.join(os.homedir(), '.config/herdr-app');
  const file = path.join(home, '.customizations/deploy-all-result.json');
  let previous = null, localRecorded = false;
  try { previous = updater.read(file); } catch {}
  const runId = env.HERDR_UPDATE_RUN_ID || randomUUID();
  const started = Date.now(), owner = { pid: process.pid, started, deadline: started + updater.DEADLINE };
  let desktop = previous?.desktop ?? null, target = null;
  const peerName = name => typeof name === 'string' && name !== 'local' && !name.startsWith('(') && name.length <= 200 && name.trim() === name && name.length > 0 && !/[\x00-\x1f\x7f]/.test(name);
  const offline = row => row?.action === 'skipped' && row.outcome !== 'unknown' && /^offline \((?:offline|unreachable|disconnected)\)$/.test(row.reason);
  // An explicit empty set means resolved; only legacy receipts infer from rows.
  const saved = Array.isArray(previous?.deferredPeers) ? previous.deferredPeers
    : (Array.isArray(previous?.results) ? previous.results : []).filter(offline).map(row => row.machine);
  const deferred = new Set(saved.filter(peerName).slice(0, 256));
  return (results, complete = false, error = null, inventoryNames = null, sourceTarget = null) => {
    if (typeof sourceTarget === 'string' && /^(?:[a-f0-9]{40}|[a-f0-9]{64})$/i.test(sourceTarget)) target = sourceTarget;
    for (const row of results) {
      if (!peerName(row.machine)) continue;
      if (['deployed', 'already current'].includes(row.action) || (row.action === 'skipped' && row.reason === 'needs its own full deploy' && row.outcome !== 'unknown')) deferred.delete(row.machine);
      else if (offline(row) && deferred.size < 256) deferred.add(row.machine);
    }
    // Selection omissions and failed/absent inventory are never removal proof.
    if (complete && inventoryNames) for (const name of deferred) if (!inventoryNames.includes(name)) deferred.delete(name);
    const local = results.find(row => row.machine === 'local');
    if (local && ['deployed', 'already current'].includes(local.action) && !localRecorded) {
      const manifest = manifestDigest(home);
      desktop = { commit: local.commit, manifest, verified: Boolean(manifest), at: Date.now() };
      localRecorded = true;
    } else if (local?.action === 'failed' || error) {
      desktop = desktop ? { ...desktop, verified: false } : null;
    }
    const value = { version: 1, runId, owner, token: env.HERDR_UPDATE_RUN_ID || null, at: Date.now(), complete, target, desktop, deferredPeers: [...deferred].sort(), results, error };
    // Publish terminal evidence before the final filesystem replacement. A
    // receipt-publication error must never erase what deployment already did.
    if (complete && ioOptions.log) ioOptions.log(updater.TERMINAL + JSON.stringify(value));
    return updater.atomic(file, value, ioOptions);
  };
}
export function deployAll(args = [], { root = project, log = console.log, hostname = os.hostname(), ...options } = {}) {
  const record = resultRecorder(options.env || process.env, args.includes('--dry-run'), { log });
  let selection;
  try { selection = parseOptions(args); }
  catch (error) { record([], true, error.message); throw error; }
  record([]);
  let source;
  try { source = worker.checkSource(root, options); }
  catch (error) {
    log(`local: refused: ${error.message}; nothing deployed anywhere`);
    record([], true, error.message);
    return { code: 1, results: [] };
  }
  // Publish the fetched source before inventory/install; it may be newer than
  // the supervisor's bootstrap fetch. This is a target, not installed evidence.
  record([], false, null, null, source.commit);
  const results = [];
  let machines = [], inventoryKnown = false;
  try { machines = inventory(options.run || worker.runCommand, options.env || process.env); inventoryKnown = true; }
  catch (error) { results.push({ machine: '(inventory)', action: 'failed', reason: error.message }); }
  const known = new Set(['local', hostname, ...machines.map(machine => machine.name)]);
  const unknown = selection.only?.filter(name => !known.has(name));
  if (unknown?.length) {
    results.push({ machine: '(selection)', action: 'failed', reason: `unknown machine: ${unknown.join(', ')}` });
    printSummary(results, log);
    record(results, true);
    return { code: 1, results };
  }
  const localSelected = !selection.only || selection.only.some(name => name === 'local' || name === hostname);
  log(`Desktop: ${hostname}${selection.dryRun ? ' (dry-run; fetch only)' : ''}`);
  let result;
  if (selection.skipLocal || !localSelected) result = { action: 'skipped', reason: selection.skipLocal ? '--skip-local' : 'not selected' };
  else if (selection.dryRun) result = { action: 'would deploy', reason: source.before === source.commit ? 'full deploy (HEAD unchanged)' : 'fast-forward and full deploy', commit: source.commit };
  else try {
    worker.fastForward(root, source.commit, options);
    result = worker.deployCheckout(root, source.commit, 'deploy', { ...options, log });
  } catch (error) { result = { action: 'failed', reason: error.message, commit: source.commit }; }
  results.push({ machine: 'local', ...result });
  record(results);
  for (const machine of machines) {
    if (selection.only && !selection.only.includes(machine.name)) results.push({ machine: machine.name, action: 'skipped', reason: 'not selected' });
    else {
      log(`${machine.name}: checking existing shell checkout`);
      results.push({ machine: machine.name, ...deployPeer(machine, { ...options, log, dryRun: selection.dryRun }) });
    }
    record(results);
  }
  printSummary(results, log);
  record(results, true, null, inventoryKnown ? machines.map(machine => machine.name) : null);
  return { code: results.some(r => r.action === 'failed') ? 1 : 0, results };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try {
    const args = process.argv.slice(2);
    if (args.length === 1 && args[0] === '--protocol') console.log(JSON.stringify({ resultProtocol: RESULT_PROTOCOL }));
    else process.exitCode = deployAll(args).code;
  }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
