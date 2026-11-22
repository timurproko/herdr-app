// Explicit watched deployment, never a daemon or a terminal-based remote command.
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import worker from './deploy-all-worker.cjs';
const directory = path.dirname(fileURLToPath(import.meta.url));
const project = path.resolve(directory, '..');
const MARKER = 'HERDR_DEPLOY_ALL_RESULT=';

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

export function deployAll(args = [], { root = project, log = console.log, ...options } = {}) {
  if (args.length) throw Error('Use npm run deploy:all (options are not yet supported).');
  let source;
  try { source = worker.checkSource(root, options); }
  catch (error) {
    log(`local: refused: ${error.message}; nothing deployed anywhere`);
    return { code: 1, results: [] };
  }
  const results = [];
  let machines = [];
  try { machines = inventory(options.run || worker.runCommand, options.env || process.env); }
  catch (error) { results.push({ machine: '(inventory)', action: 'failed', reason: error.message }); }
  let result;
  try {
    worker.fastForward(root, source.commit, options);
    result = worker.deployCheckout(root, source.commit, 'deploy', { ...options, log });
  } catch (error) { result = { action: 'failed', reason: error.message, commit: source.commit }; }
  results.push({ machine: 'local', ...result });
  for (const machine of machines) {
    log(`${machine.name}: checking existing shell checkout`);
    results.push({ machine: machine.name, ...deployPeer(machine, { ...options, log }) });
  }
  for (const row of results) log(`${row.machine}: ${row.action}${row.reason ? ': ' + row.reason : ''}; source ${row.commit || '-'}; backup ${row.backup || '-'}`);
  return { code: results.some(r => r.action === 'failed') ? 1 : 0, results };
}
if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  try { process.exitCode = deployAll(process.argv.slice(2)).code; }
  catch (error) { console.error(error.message); process.exitCode = 1; }
}
