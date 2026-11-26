'use strict';
// ws 8.23.0 (MIT), vendored verbatim. No optional native addons are loaded.
process.env.WS_NO_BUFFER_UTIL = '1';
process.env.WS_NO_UTF_8_VALIDATE = '1';
const {WebSocketServer} = require('./vendor/ws/index.js');
const http = require('node:http');
const crypto = require('node:crypto');
const path = require('node:path');
const {spawn, fork} = require('node:child_process');
const LIMIT = 262144;
const FAILURE = {version: 1, ok: false, error: {code: 'TRANSPORT', message: 'Private setup did not finish. Check local status before trying again.'}};
const TARGETS = Object.freeze({trello: path.join(__dirname, '../trello/owner.cjs')});
function worker(home, target, payload, register, destination = {machine: null}, options = {}) {
  if (destination.machine !== null || destination.binding || ['runtime.install', 'runtime.probe', 'global.status', 'global.apply'].includes(payload.action))
    return require('./trello-transport.cjs').dispatch(home, destination, payload, register, options);
  return new Promise(resolve => {
    const child = spawn(process.execPath, [TARGETS[target], home], {stdio: ['pipe', 'pipe', 'pipe'], windowsHide: true});
    register(child); const chunks = []; let size = 0, bad = false;
    child.on('error', () => resolve(FAILURE)); child.stdin.on('error', () => {});
    child.stderr.resume(); // Never echo provider/child diagnostics.
    child.stdout.on('data', chunk => { size += chunk.length; if (size > 2097152) { bad = true; child.kill(); } else chunks.push(chunk); });
    child.on('close', () => {
      try {
        if (bad) throw Error();
        const output = Buffer.concat(chunks).toString('utf8'), result = JSON.parse(output);
        if (result.version !== 1 || typeof result.ok !== 'boolean') throw Error();
        // Defense in depth against accidental worker echoes. Public projection is
        // owned by the fixed worker, never an arbitrary command provided by UI.
        for (const secret of [payload?.apiKey, payload?.token].filter(v => typeof v === 'string' && v)) if (output.includes(secret)) throw Error();
        resolve(result);
      } catch { resolve(FAILURE); }
    });
    child.stdin.end(JSON.stringify(payload));
  });
}
async function serve({home, target, destination = {machine: null}, lifetime = 60000, dispatch = worker} = {}) {
  if (!Object.hasOwn(TARGETS, target)) throw Error('Unsupported private action');
  const session = crypto.randomBytes(32).toString('hex');
  const server = http.createServer((_req, res) => { res.writeHead(403); res.end(); });
  const ws = new WebSocketServer({noServer: true, perMessageDeflate: false, maxPayload: LIMIT});
  const deadline = performance.now() + Math.min(lifetime, 60000);
  const sockets = new Set(); let consumed = false, stopped = false, child = null;
  let resolveClosed; const closed = new Promise(resolve => { resolveClosed = resolve; });
  const stop = () => {
    if (stopped) return closed;
    stopped = true; clearTimeout(timer);
    child?.kill(); child = null;
    for (const socket of sockets) socket.terminate();
    ws.close(); server.close(() => resolveClosed()); server.closeAllConnections();
    return closed;
  };
  const timer = setTimeout(stop, Math.min(Math.max(lifetime, 1), 60000));
  server.on('upgrade', (req, socket, head) => {
    if (stopped || consumed || sockets.size >= 4 || req.url !== '/' || req.headers.origin || req.headers['sec-websocket-protocol'] || !['127.0.0.1', '::ffff:127.0.0.1'].includes(socket.remoteAddress)) { socket.destroy(); return; }
    ws.handleUpgrade(req, socket, head, client => ws.emit('connection', client));
  });
  ws.on('connection', socket => {
    sockets.add(socket); let authenticated = false;
    const idle = setTimeout(() => socket.terminate(), 3000);
    socket.on('error', () => {});
    socket.on('close', () => { clearTimeout(idle); sockets.delete(socket); if (authenticated) stop(); });
    socket.once('message', async (bytes, binary) => {
      let request;
      try {
        if (binary || bytes.length > LIMIT || consumed || stopped) throw Error();
        request = JSON.parse(bytes.toString('utf8'));
        if (request.session !== session || !request.payload || typeof request.payload !== 'object' || Array.isArray(request.payload) || Object.keys(request).some(k => !['session', 'payload'].includes(k))) throw Error();
      } catch { socket.terminate(); return; }
      consumed = true; authenticated = true; clearTimeout(idle);
      // A replay on this connection is a protocol refusal, not another dispatch.
      socket.on('message', () => stop());
      let result;
      try { result = await dispatch(home, target, request.payload, value => { child = value; }, destination, {deadline}); }
      catch { result = FAILURE; }
      finally { request.payload = null; }
      if (!stopped && socket.readyState === 1) socket.send(JSON.stringify(result), () => stop());
      else stop();
    });
  });
  try { await new Promise((resolve, reject) => { server.once('error', reject); server.listen(0, '127.0.0.1', resolve); }); }
  catch { clearTimeout(timer); throw Error('Private action unavailable'); }
  return {address: {port: server.address().port, session, expires: Date.now() + Math.min(lifetime, 60000)}, stop, closed};
}
if (require.main === module) {
  const [mode, home, target, route] = process.argv.slice(2);
  let destination; try { destination = route === undefined ? {machine: null} : JSON.parse(route); } catch {}
  if (!destination || destination.machine !== null && typeof destination.machine !== 'string') process.exit(2);
  if (!Object.hasOwn(TARGETS, target) || !path.isAbsolute(home || '') || !['--start', '--serve'].includes(mode)) process.exitCode = 2;
  else if (mode === '--serve') {
    serve({home, target, destination}).then(server => { process.send?.(server.address); process.disconnect?.(); }).catch(() => { process.exitCode = 1; process.disconnect?.(); });
  } else {
    const child = fork(__filename, ['--serve', home, target, JSON.stringify(destination)], {detached: true, windowsHide: true, stdio: ['ignore', 'ignore', 'ignore', 'ipc']});
    const timer = setTimeout(() => { child.kill(); process.exitCode = 1; }, 5000);
    child.once('error', () => { clearTimeout(timer); process.exitCode = 1; });
    child.once('message', address => { clearTimeout(timer); process.stdout.write(JSON.stringify(address) + '\n'); child.unref(); });
  }
}
module.exports = {serve, worker, FAILURE};
