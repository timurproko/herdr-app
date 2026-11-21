// Runs on THIS computer, including when the selected remote core is offline.
// SSH is noninteractive, uses the existing machine target/key/known-host trust,
// and sends source on stdin (never through a shell-quoted user command).
const fs = require('node:fs');
const path = require('node:path');
const { spawnSync, spawn } = require('node:child_process');
const { createInterface } = require('node:readline');
const launcher = require('./permission-launcher.cjs');
const hc = process.platform === 'win32' ? 'hc.exe' : 'hc';
function rejected(message) { const error = Error(message);error.rejected = true;return error; }
function sshTarget(target) {
  if (typeof target !== 'string' || !target || target.startsWith('-') || /[\s\0\r\n]/.test(target)) throw rejected('Unsupported SSH target. Use a named SSH-config host.');
  const port = /^(.*):(\d+)$/.exec(target);
  if (port && (!port[1].includes(':') || /^([^@]+@)?\[.*\]$/.test(port[1]))) {
    if (+port[2] < 1 || +port[2] > 65535) throw rejected('Invalid SSH port.');
    return ['-p', port[2], '--', port[1]];
  }
  return ['--', target];
}
function remoteSource(source, machine, request) {
  const session = machine.session || 'default';
  if (!/^[a-zA-Z0-9_-]{1,64}$/.test(session) || typeof machine.id !== 'string' || !machine.id) throw rejected('Missing machine identity or unsupported core session.');
  return `const fs=require('node:fs'),path=require('node:path');
let invoked=false;
try {
  const expected=${JSON.stringify({ id: machine.id, session })};
  if(process.platform!=='win32')throw Error('Remote core management currently supports Windows only.');
  const identity=JSON.parse(fs.readFileSync(path.join(process.env.LOCALAPPDATA,'herdr-core',expected.session,'core.json'),'utf8'));
  if(identity.id!==expected.id)throw Error('The remote core identity changed. Pair this machine again before managing startup.');
  process.env.HC_SESSION=expected.session;delete process.env.HC_SOCKET;delete process.env.HC_TERMINAL_ID;
  const module={exports:{},id:'custom-core-control'};
  new Function('require','module','process',${JSON.stringify(source)})(require,module,process);
  invoked=true;
  console.log(JSON.stringify(module.exports.main(${JSON.stringify(request)})));
} catch(error){console.log(JSON.stringify({error:error.message,rejected:!invoked||error.rejected===true}));process.exitCode=1;}
`;
}
function reconnect(machine) {
  return new Promise(resolve => {
    const child = spawn(hc, ['connect'], { windowsHide: true, stdio: ['pipe', 'pipe', 'pipe'] });
    let done = false;
    const finish = ok => { if (done) return;done = true;clearTimeout(timer);child.stdin.end();child.kill();resolve(ok); };
    const timer = setTimeout(() => finish(false), 15000);
    child.on('error', () => finish(false));child.on('close', () => finish(false));child.stdin.on('error', () => finish(false));child.stderr.resume();
    createInterface({ input: child.stdout }).on('line', line => {
      try { const reply = JSON.parse(line);if (reply.id === 1) finish(!reply.error && reply.result?.state === 'connected'); } catch {}
    });
    child.stdin.write(JSON.stringify({ jsonrpc: '2.0', id: 1, method: 'machine.connect', params: { machine } }) + '\n');
  });
}
async function dispatch(input) {
  if (!input || (input.machine !== null && typeof input.machine !== 'string') || !input.request) throw rejected('Invalid core-control request.');
  const request = input.request;
  let reply;
  if (input.machine === null) reply = launcher.main(request);
  else {
    const list = spawnSync(hc, ['machine', 'ls', '--json'], { encoding: 'utf8', timeout: 10000, windowsHide: true });
    if (list.error || list.status !== 0) throw rejected('Could not read configured machines on this computer.');
    const machine = JSON.parse(list.stdout).machines?.find(m => m.name === input.machine && !m.temporary);
    if (!machine) throw rejected('The selected machine is no longer configured.');
    if (machine.via) throw rejected('Direct SSH core management is unavailable for custom --via connections.');
    if (request.session !== undefined && request.session !== (machine.session || 'default')) throw rejected('The configured core session changed. Refresh Settings.');
    const source = fs.readFileSync(path.join(__dirname, 'permission-launcher.cjs'), 'utf8');
    const script = remoteSource(source, machine, request);
    const result = spawnSync('ssh', ['-T', '-o', 'BatchMode=yes', '-o', 'StrictHostKeyChecking=yes', '-o', 'ConnectTimeout=8', ...sshTarget(machine.target), 'node -'], {
      input: script, encoding: 'utf8', timeout: ['apply', 'start', 'autostart'].includes(request.action) ? 270000 : 40000, maxBuffer: 4 * 1024 * 1024, windowsHide: true,
    });
    if (result.error) {
      // A setup timeout is indeterminate, not permission to submit again.
      return { error: 'SSH operation timed out or could not start. Refresh to check the request before retrying.', rejected: false };
    }
    try { reply = JSON.parse(result.stdout.trim()); }
    catch { return { error: `SSH management failed. Check this machine’s SSH key access, known host and Node installation. ${(result.stderr || '').trim().slice(-1000)}`, rejected: /Permission denied|Host key verification failed|Could not resolve hostname|Connection refused/i.test(result.stderr || '') }; }
    if (result.status !== 0 && !reply.error) return { error: 'SSH management failed. No success is claimed.', rejected: false };
  }
  if (input.machine !== null && input.reconnectOnComplete && reply.state === 'complete' && ['start', 'apply'].includes(reply.operation)) reply.connected = await reconnect(input.machine);
  return reply;
}
module.exports = { sshTarget, remoteSource, dispatch };
if (require.main === module) {
  Promise.resolve().then(() => dispatch(JSON.parse(process.argv[2] || '{}'))).then(value => {
    process.stdout.write(JSON.stringify(value));if (value.error) process.exitCode = 1;
  }).catch(error => { process.stdout.write(JSON.stringify({ error: error.message, rejected: error.rejected === true }));process.exitCode = 1; });
}
