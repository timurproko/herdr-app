'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const cp = require('node:child_process');
const crypto = require('node:crypto');
const {fail, TrelloError} = require('./errors.cjs');
const homePath = explicit => path.resolve(explicit || process.env.HERDR_APP_HOME || path.join(os.homedir(), '.config/herdr-app'));
const object = v => v !== null && typeof v === 'object' && !Array.isArray(v);
const exact = (v, keys) => object(v) && [Object.prototype, null].includes(Object.getPrototypeOf(v)) && Object.keys(v).every(k => keys.includes(k));
const id = v => typeof v === 'string' && /^[a-f0-9]{24}$/.test(v);
function storageError(error) {
  if (error instanceof TrelloError) throw error;
  fail(error?.code === 'ENOENT' ? 'STORE_MISSING' : 'STORE_IO');
}
function stat(file) {
  try { return fs.lstatSync(file); } catch (e) { if (e.code === 'ENOENT') return null; storageError(e); }
}
function validate(name, v) {
  let ok = false;
  if (name === 'credentials') ok = exact(v, ['version', 'apiKey', 'token']) && v.version === 1 &&
    [v.apiKey, v.token].every(s => typeof s === 'string' && /^[A-Za-z0-9_-]{16,512}$/.test(s));
  if (name === 'policy') ok = exact(v, ['version', 'boards', 'allowWrites', 'authority']) && v.version === 1 && (v.authority === undefined || v.authority === 'managed') && typeof v.allowWrites === 'boolean' &&
    Array.isArray(v.boards) && v.boards.length <= 100 && v.boards.every(id) && new Set(v.boards).size === v.boards.length;
  if (name === 'cooldown') ok = exact(v, ['version', 'retryAt']) && v.version === 1 && Number.isSafeInteger(v.retryAt) && v.retryAt >= 0;
  if (name === 'display') {
    const text = (s, max) => typeof s === 'string' && s.length > 0 && s.length <= max && !/[\u0000-\u001f\u007f]/.test(s);
    ok = exact(v, ['version', 'credentialTag', 'account', 'boards']) && v.version === 1 && /^[a-f0-9]{64}$/.test(v.credentialTag) &&
      (v.account === null || exact(v.account, ['id', 'username', 'name']) && id(v.account.id) && text(v.account.username, 256) && text(v.account.name, 256)) &&
      Array.isArray(v.boards) && v.boards.length <= 100 && v.boards.every(b => exact(b, ['id', 'label']) && id(b.id) && text(b.label, 1024)) && new Set(v.boards.map(b => b.id)).size === v.boards.length;
  }
  const binding = b => exact(b, ['id', 'session', 'principal', 'home']) && typeof b.id === 'string' && typeof b.session === 'string' && /^[a-zA-Z0-9._:-]{1,256}$/.test(b.id) && /^[a-zA-Z0-9_-]{1,64}$/.test(b.session) && [b.principal,b.home].every(s => /^[a-f0-9]{64}$/.test(s));
  if (name === 'control') ok = exact(v, ['version','controller','binding','enabled','access','intent']) && v.version === 1 && /^[a-f0-9]{64}$/.test(v.controller) && binding(v.binding) && typeof v.enabled === 'boolean' && ['read-only','read-write'].includes(v.access) && /^[a-f0-9]{64}$/.test(v.intent);
  if (name === 'controller') ok = exact(v, ['version','id','access','intent','hosts','pending']) && v.version === 1 && [v.id,v.intent].every(s => /^[a-f0-9]{64}$/.test(s)) && ['read-only','read-write'].includes(v.access) && Array.isArray(v.hosts) && v.hosts.length <= 256 && v.hosts.every(h => exact(h,['machine','binding','access','intent']) && (h.machine === null || typeof h.machine === 'string' && h.machine.length <= 256) && binding(h.binding) && ['read-only','read-write'].includes(h.access) && /^[a-f0-9]{64}$/.test(h.intent)) && Array.isArray(v.pending) && v.pending.length <= 256 && v.pending.every(s => typeof s === 'string' && s.length <= 256 && !/[\u0000-\u001f\u007f]/.test(s));
  if (!ok) fail('STORE_MALFORMED');
  return v;
}
function safePath(file) {
  try {
    let current = path.resolve(file);
    for (;;) {
      const s = stat(current);
      if (s) {
        if (s.isSymbolicLink()) fail('STORE_UNSAFE_PATH');
        if (s.isDirectory() && stat(path.join(current, '.git'))) fail('STORE_IN_CHECKOUT');
        if (process.platform === 'win32' && fs.realpathSync.native(current).toLowerCase() !== current.toLowerCase()) fail('STORE_UNSAFE_PATH');
      }
      const parent = path.dirname(current); if (parent === current) return; current = parent;
    }
  } catch (e) { storageError(e); }
}
// Only the child loses PS7's module search path. No secret contents enter argv/env.
function aclEnvironment(env, file) {
  return {...Object.fromEntries(Object.entries(env).filter(([k]) => k.toLowerCase() !== 'psmodulepath' && k.toLowerCase() !== 'trello_private_path')), TRELLO_PRIVATE_PATH: file};
}
function windowsSecurity(file, create, directory, {execute = cp.execFileSync, env = process.env, budget} = {}) {
  budget?.check();
  const script = `try { $ErrorActionPreference='Stop'; $p=$env:TRELLO_PRIVATE_PATH; $sid=[System.Security.Principal.WindowsIdentity]::GetCurrent().User; ` +
    (create ? `$a=New-Object System.Security.AccessControl.${directory ? 'DirectorySecurity' : 'FileSecurity'}; $a.SetOwner($sid); $a.SetAccessRuleProtection($true,$false); $r=New-Object System.Security.AccessControl.FileSystemAccessRule($sid,'FullControl',${directory ? "'ContainerInherit,ObjectInherit','None'," : ''}'Allow'); $a.AddAccessRule($r); Set-Acl -LiteralPath $p -AclObject $a; ` : '') +
    `$a=Get-Acl -LiteralPath $p; $owner=$a.GetOwner([System.Security.Principal.SecurityIdentifier]).Value; if($owner -ne $sid.Value){exit 21}; $ok=@($sid.Value,'S-1-5-18','S-1-5-32-544'); foreach($r in $a.Access){if($r.AccessControlType -eq 'Allow' -and $r.IdentityReference.Translate([System.Security.Principal.SecurityIdentifier]).Value -notin $ok){exit 21}}; exit 0 } catch { exit 22 }`;
  const systemRoot = Object.entries(env).find(([k]) => k.toLowerCase() === 'systemroot')?.[1];
  if (!systemRoot || !path.win32.isAbsolute(systemRoot)) fail('STORE_PERMISSION_CHECK');
  try {
    execute(path.win32.join(systemRoot, 'System32/WindowsPowerShell/v1.0/powershell.exe'), ['-NoProfile', '-NonInteractive', '-EncodedCommand', Buffer.from(script, 'utf16le').toString('base64')],
      {env: aclEnvironment(env, file), stdio: 'ignore', timeout: budget ? budget.timeout(10000) : 10000, killSignal: 'SIGKILL', windowsHide: true});
    budget?.check();
  } catch (e) { budget?.check(); if (e instanceof TrelloError) throw e; fail(e?.status === 21 ? 'STORE_PERMISSIONS' : 'STORE_PERMISSION_CHECK'); }
}
function security(file, create = false, directory = false, {budget} = {}) {
  budget?.check();
  if (process.platform === 'win32') return windowsSecurity(file, create, directory, {budget});
  try {
    if (create) fs.chmodSync(file, directory ? 0o700 : 0o600);
    const s = fs.lstatSync(file);
    if (s.uid !== process.getuid() || (s.mode & 0o077) !== 0) fail('STORE_PERMISSIONS');
    budget?.check();
  } catch (e) { if (e instanceof TrelloError) throw e; fail('STORE_PERMISSION_CHECK'); }
}
class Store {
  constructor(home, options = {}) { this.home = homePath(home); this.dir = path.join(this.home, '.customizations', 'trello'); this.security = options.security || security; this.beforeCommit = options.beforeCommit || (() => {}); }
  // A per-invocation view avoids changing a caller's store or caching authority.
  withBudget(budget) { return Object.assign(Object.create(this), {budget}); }
  secure(file, create = false, directory = false) {
    this.budget?.check();
    this.security(file, create, directory, {budget: this.budget});
    this.budget?.check();
  }
  file(name) { this.budget?.check(); if (!['credentials', 'policy', 'cooldown', 'display', 'control', 'controller'].includes(name)) fail('INPUT'); return path.join(this.dir, name + '.json'); }
  directory(create = false) {
    try {
      this.budget?.check(); safePath(this.dir);
      if (!stat(this.dir)) {
        if (!create) fail('STORE_MISSING');
        fs.mkdirSync(this.dir, {recursive: true, mode: 0o700}); this.secure(this.dir, true, true);
      }
      if (!stat(this.dir)?.isDirectory()) fail('STORE_UNSAFE_PATH');
      this.secure(this.dir, false, true);
    } catch (e) { storageError(e); }
  }
  read(name, optional = false) {
    let fd;
    try {
      this.directory(); const file = this.file(name); safePath(file);
      const lock = path.join(this.dir, 'config.lock'); safePath(lock);
      if (!this.lockHeld && stat(lock)) fail('STORE_BUSY');
      const s = stat(file);
      if (!s) { if (optional) return null; fail('STORE_MISSING'); }
      if (!s.isFile() || s.nlink !== 1) fail('STORE_UNSAFE_PATH');
      const max = ['display','controller'].includes(name) ? 524288 : 32768;
      if (s.size > max) fail('STORE_MALFORMED');
      this.secure(file);
      fd = fs.openSync(file, fs.constants.O_RDONLY | (fs.constants.O_NOFOLLOW || 0));
      const opened = fs.fstatSync(fd);
      if (!opened.isFile() || opened.nlink !== 1 || opened.dev !== s.dev || opened.ino !== s.ino) fail('STORE_UNSAFE_PATH');
      if (opened.size > max) fail('STORE_MALFORMED');
      let value; try { value = JSON.parse(fs.readFileSync(fd, 'utf8')); } catch (e) { if (e instanceof SyntaxError) fail('STORE_MALFORMED'); throw e; }
      this.budget?.check(); return validate(name, value);
    } catch (e) { storageError(e); } finally { if (fd !== undefined) fs.closeSync(fd); }
  }
  // Locks cover local transitions, never provider/network work.
  withLock(action) {
    if (this.lockHeld) return action();
    this.directory(true);
    const lock = path.join(this.dir, 'config.lock'); safePath(lock);
    let fd;
    try {
      try { fd = fs.openSync(lock, 'wx', 0o600); } catch (e) { if (e.code === 'EEXIST') fail('STORE_BUSY'); throw e; }
      this.lockHeld = true; this.secure(lock, true);
      return action();
    } catch (e) { storageError(e); }
    finally { if (fd !== undefined) { this.lockHeld = false; fs.closeSync(fd); fs.unlinkSync(lock); } }
  }
  write(name, value, expected = null) {
    validate(name, value);
    if (Buffer.byteLength(JSON.stringify(value)) > (['display','controller'].includes(name) ? 524288 : 32768)) fail('STORE_MALFORMED');
    return this.withLock(() => {
      const file = this.file(name), current = this.read(name, true);
      if (JSON.stringify(current) !== JSON.stringify(expected)) fail('CONFLICT');
      let temp = path.join(this.dir, `.write-${crypto.randomBytes(12).toString('hex')}`);
      try {
        const out = fs.openSync(temp, 'wx', 0o600);
        try { this.secure(temp, true); this.budget?.check(); this.beforeCommit(); fs.writeFileSync(out, JSON.stringify(value) + '\n'); fs.fsyncSync(out); } finally { fs.closeSync(out); }
        safePath(file);
        this.budget?.check(); this.beforeCommit(); fs.renameSync(temp, file); temp = null; this.secure(file);
      } finally { if (temp && stat(temp)) fs.unlinkSync(temp); }
    });
  }
  remove(name, expected) {
    return this.withLock(() => {
      const current = this.read(name, true);
      if (JSON.stringify(current) !== JSON.stringify(expected)) fail('CONFLICT');
      if (current !== null) { const file = this.file(name); safePath(file); this.budget?.check(); this.beforeCommit(); fs.unlinkSync(file); }
    });
  }
}
function protectedInput(file) {
  safePath(file);
  const s = stat(file); if (!s) fail('STORE_MISSING');
  if (!s.isFile() || s.nlink !== 1) fail('STORE_UNSAFE_PATH');
  if (s.size > 262144) fail('INPUT');
  security(file);
  try { return fs.readFileSync(file, 'utf8'); } catch (e) { storageError(e); }
}
module.exports = {Store, homePath, validate, id, object, exact, safePath, security, protectedInput, windowsSecurity, aclEnvironment};
