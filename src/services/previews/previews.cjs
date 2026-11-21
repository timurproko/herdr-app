// Node-only helper. No shell interpolation; SSH targets come from hc's machine catalog.
const fs = require('node:fs/promises');
const path = require('node:path');
const net = require('node:net');
const {spawn, execFile} = require('node:child_process');
const {promisify} = require('node:util');
const {createHash} = require('node:crypto');
const execute = promisify(execFile);
const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
const LEASE_MS = 45000;
const hash = value => createHash('sha256').update(value).digest('hex').slice(0, 32);
const ownerDir = (home, owner) => path.join(home, 'data', 'previews', hash(owner));

function previewURL(value) {
  try {
    const url = new URL(value);
    if (!['http:', 'https:'].includes(url.protocol) || url.username || url.password) return null;
    if (!['localhost', '127.0.0.1', '0.0.0.0', '[::1]', '[::]'].includes(url.hostname)) return null;
    return url;
  } catch { return null; }
}
function destination(url) {
  return {host: ['[::]', '[::1]'].includes(url.hostname) ? '::1' : '127.0.0.1', port: Number(url.port || (url.protocol === 'https:' ? 443 : 80))};
}
function tunnelKey(machine, url) {
  const {host, port} = destination(url);
  return hash(JSON.stringify([machine, host, port]));
}
function localURL(url, port) {
  const local = new URL(url.href);
  local.hostname = url.hostname === 'localhost' ? 'localhost' : '127.0.0.1';
  local.port = String(port);
  return local.href;
}
function extractLinks(text) {
  const links = new Map();
  const clean = text.replace(/\x1b\[[0-?]*[ -/]*[@-~]/g, '');
  for (const match of clean.matchAll(/https?:\/\/(?:\[[^\]\s]+\]|[^\s<>"'`()[\]{}])+[^\s<>"'`()[\]{}]*/gi)) {
    const value = match[0].replace(/[.,;:!?]+$/, '');
    const url = previewURL(value);
    if (!url) continue;
    // Agents often expose only their curl health probe. Preview the app, not its JSON ping.
    if (!url.search && !url.hash && /^\/(?:api\/ping|health|healthz|readyz|livez)\/?$/.test(url.pathname)) url.pathname = '/';
    const {host, port} = destination(url), key = `${url.protocol}//${host}:${port}`;
    // The latest mention wins, including its path/query/fragment. Never fetch during discovery.
    links.delete(key);
    links.set(key, {url: url.href, label: `localhost:${port}`});
  }
  return [...links.values()].reverse().slice(0, 3);
}
async function json(file) {
  try { return JSON.parse(await fs.readFile(file, 'utf8')); } catch { return null; }
}
async function publish(file, value) {
  const temp = `${file}.${process.pid}.tmp`;
  await fs.writeFile(temp, JSON.stringify(value), {mode: 0o600});
  await fs.rename(temp, file);
}
async function heartbeat(home, owner, remove = false) {
  const dir = ownerDir(home, owner);
  for (const name of await fs.readdir(dir).catch(() => [])) {
    if (!name.endsWith('.lease')) continue;
    const file = path.join(dir, name);
    if (remove) await fs.rm(file, {force: true});
    else await fs.utimes(file, new Date(), new Date()).catch(() => {});
  }
}
async function freePort(preferred = 0) {
  const server = net.createServer();
  try {
    await new Promise((resolve, reject) => { server.once('error', reject); server.listen(preferred, '127.0.0.1', resolve); });
  } catch (error) {
    if (preferred && ['EADDRINUSE', 'EACCES'].includes(error.code)) return freePort();
    throw error;
  }
  const port = server.address().port;
  await new Promise(resolve => server.close(resolve));
  return port;
}
function sshArgs(target, host, remotePort, localPort) {
  if (typeof target !== 'string' || !target || target.startsWith('-') || /[\s\x00-\x1f]/.test(target)) throw new Error('Invalid configured SSH target');
  const remote = host === '::1' ? '[::1]' : '127.0.0.1';
  return ['-v', '-N', '-T', '-o', 'BatchMode=yes', '-o', 'ExitOnForwardFailure=yes', '-o', 'ConnectTimeout=8',
    '-o', 'ServerAliveInterval=15', '-o', 'ServerAliveCountMax=2', '-L', `127.0.0.1:${localPort}:${remote}:${remotePort}`, '--', target];
}
async function worker(home, owner, encoded) {
  const spec = JSON.parse(Buffer.from(encoded, 'base64url').toString('utf8'));
  const url = previewURL(spec.url);
  if (!url) throw new Error('Not a loopback HTTP URL');
  const dir = ownerDir(home, owner), key = tunnelKey(spec.machine, url);
  const state = path.join(dir, `${key}.json`), lease = path.join(dir, `${key}.lease`), lock = path.join(dir, `${key}.lock`);
  let child, timer, stderr = '', stopping = false;
  try {
    const dest = destination(url), port = await freePort(dest.port);
    child = spawn('ssh', sshArgs(spec.target, dest.host, dest.port, port), {windowsHide: true, stdio: ['ignore', 'ignore', 'pipe']});
    const exited = new Promise(resolve => {
      child.once('error', error => resolve(error.message));
      child.once('close', code => resolve(stopping ? null : `SSH exited (${code}): ${stderr.slice(-1200)}`));
    });
    // -v confirms OUR forward bound successfully, rather than probing a port another process may own.
    let ready = false, writing = Promise.resolve();
    child.stderr.on('data', data => {
      stderr = (stderr + data.toString()).slice(-8192);
      if (!ready && stderr.includes(`Local forwarding listening on 127.0.0.1 port ${port}.`)) {
        ready = true;
        writing = publish(state, {ready: true, port}).catch(() => { child.kill(); });
      }
    });
    timer = setInterval(async () => {
      const stat = await fs.stat(lease).catch(() => null);
      if (!stat || Date.now() - stat.mtimeMs > LEASE_MS) { stopping = true; child.kill(); }
    }, 1000);
    const error = await exited;
    await writing;
    if (error) await publish(state, {error});
    else await fs.rm(state, {force: true});
  } catch (error) {
    await publish(state, {error: error.message});
  } finally {
    clearInterval(timer);
    if (child && child.exitCode === null) child.kill();
    await fs.rm(lease, {force: true});
    await fs.rm(lock, {force: true});
  }
}
async function openPreview(home, owner, machine, value) {
  const url = previewURL(value);
  if (!url) throw new Error('Only localhost HTTP(S) previews can be opened');
  if (!machine) return {url: localURL(url, destination(url).port)};
  const catalog = JSON.parse((await execute('hc', ['machine', 'ls', '--json'], {windowsHide: true, timeout: 10000})).stdout);
  const entry = catalog.machines?.find(m => m.name === machine);
  if (!entry || entry.via || !entry.target || entry.state !== 'connected') throw new Error('This machine needs a connected SSH target (command/via connections are not supported)');
  const dir = ownerDir(home, owner), key = tunnelKey(machine, url);
  await fs.mkdir(dir, {recursive: true, mode: 0o700});
  const state = path.join(dir, `${key}.json`), lease = path.join(dir, `${key}.lease`), lock = path.join(dir, `${key}.lock`);
  const liveLease = await fs.stat(lease).catch(() => null);
  const existing = await json(state);
  if (liveLease && Date.now() - liveLease.mtimeMs < LEASE_MS && existing?.ready) {
    await fs.utimes(lease, new Date(), new Date());
    return {url: localURL(url, existing.port), port: existing.port};
  }
  const handle = await fs.open(lock, 'wx').catch(() => null);
  if (!handle) throw new Error('Preview tunnel is starting or stopping; try again shortly');
  await handle.close();
  await fs.rm(state, {force: true});
  await fs.writeFile(lease, '', {mode: 0o600});
  const encoded = Buffer.from(JSON.stringify({machine, url: url.href, target: entry.target})).toString('base64url');
  let spawnError;
  const child = spawn(process.execPath, [__filename, 'worker', home, owner, encoded], {detached: true, windowsHide: true, stdio: 'ignore'});
  child.on('error', error => { spawnError = error; });
  child.unref();
  for (let i = 0; i < 240; i++) {
    await delay(50);
    if (spawnError) {
      await fs.rm(lease, {force: true});
      await fs.rm(lock, {force: true});
      throw spawnError;
    }
    const result = await json(state);
    if (result?.error) throw new Error(result.error);
    if (result?.ready) return {url: localURL(url, result.port), port: result.port};
  }
  await fs.rm(lease, {force: true});
  throw new Error('SSH preview timed out; check SSH authentication and try again');
}
async function disconnectPreview(home, owner, machine, value) {
  const url = previewURL(value);
  if (!url) throw new Error('Only localhost HTTP(S) previews can be disconnected');
  if (!machine) return {};
  const dir = ownerDir(home, owner), key = tunnelKey(machine, url);
  const lease = path.join(dir, `${key}.lease`), lock = path.join(dir, `${key}.lock`);
  // Request shutdown of this one owned forward; never signal cores, agents, or unrelated SSH.
  await fs.rm(lease, {force: true});
  for (let i = 0; i < 100; i++) {
    const running = await fs.stat(lock).catch(error => {
      if (error.code === 'ENOENT') return null;
      throw error;
    });
    if (!running) {
      await fs.rm(path.join(dir, `${key}.json`), {force: true});
      return {};
    }
    await delay(50);
  }
  throw new Error('Preview tunnel is still stopping; retry Reconnect shortly');
}
async function reconnectPreview(home, owner, machine, value) {
  await disconnectPreview(home, owner, machine, value);
  return openPreview(home, owner, machine, value);
}
function screenReadArgs(terminal) {
  if (!/^(?:[^\s/]+\/)?t[a-z0-9]+$/i.test(terminal)) throw new Error('Invalid terminal address');
  // Never increase this. Nonzero history reads may send scroll input to full-screen agents.
  return ['read', terminal, '--lines', '0', '--json'];
}
async function main([command, home, owner, ...args]) {
  if (!home || !owner) throw new Error('Missing app home or owner');
  if (command === 'worker') return worker(home, owner, args[0]);
  if (command === 'release') { await heartbeat(home, owner, true); return {}; }
  if (command === 'keepalive') { await heartbeat(home, owner); return {}; }
  if (command === 'open') return openPreview(home, owner, args[0], args[1]);
  if (command === 'disconnect') return disconnectPreview(home, owner, args[0], args[1]);
  if (command === 'reconnect') return reconnectPreview(home, owner, args[0], args[1]);
  if (command === 'scan') {
    await heartbeat(home, owner);
    if (!args[0]) return {links: []};
    const result = await execute('hc', screenReadArgs(args[0]), {windowsHide: true, timeout: 5000, maxBuffer: 2 * 1024 * 1024});
    return {links: extractLinks(JSON.parse(result.stdout).text ?? '')};
  }
  throw new Error('Unknown preview command');
}
module.exports = {previewURL, destination, extractLinks, localURL, sshArgs, heartbeat, ownerDir, tunnelKey, openPreview, worker, freePort, screenReadArgs, disconnectPreview, reconnectPreview, LEASE_MS};
if (require.main === module) main(process.argv.slice(2)).then(result => {
  if (result !== undefined) console.log(JSON.stringify(result));
}).catch(error => { console.error(error.message); process.exitCode = 1; });
