// Short-lived, unframed Core connection for explicit document-adapter operations.
'use strict';
const {spawn} = require('node:child_process');
function connect({command = 'hc', session} = {}) {
  const child = spawn(command, ['connect', ...(session ? ['--session', session] : [])], {windowsHide: true, stdio: ['pipe', 'pipe', 'pipe']});
  const pending = new Map(); let serial = 0, buffer = '';
  const fail = () => { for (const p of pending.values()) { clearTimeout(p.timer); p.reject(Error('Core connection closed; check the current tab location before retrying.')); } pending.clear(); };
  child.on('error', fail); child.on('exit', fail); child.stdin.on('error', fail); child.stderr.resume();
  child.stdout.setEncoding('utf8');
  child.stdout.on('data', chunk => {
    buffer += chunk;
    if (buffer.length > 4 * 1024 * 1024) { child.kill(); fail(); return; }
    let i;
    while ((i = buffer.indexOf('\n')) !== -1) {
      const line = buffer.slice(0, i); buffer = buffer.slice(i + 1);
      let message; try { message = JSON.parse(line); } catch { continue; }
      const p = pending.get(message.id); if (!p) continue;
      pending.delete(message.id); clearTimeout(p.timer);
      if (message.error) { const e = Error(message.error.message || 'Core request failed.'); e.kind = message.error.data?.kind; p.reject(e); }
      else p.resolve(message.result);
    }
  });
  return {
    call(method, params) { return new Promise((resolve, reject) => {
      const id = ++serial;
      const timer = setTimeout(() => { pending.delete(id); reject(Error('Core request timed out; its write outcome may be unknown.')); }, 5000);
      pending.set(id, {resolve, reject, timer});
      child.stdin.write(JSON.stringify({jsonrpc: '2.0', id, method, params}) + '\n');
    }); },
    close() { child.stdin.end(); child.kill(); fail(); }, // Only our hc connect child, never the Core.
  };
}
module.exports = {connect};
