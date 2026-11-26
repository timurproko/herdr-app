import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createRequire} from 'node:module';
import {fixture, credentials, A} from './testing.test.mjs';
const require = createRequire(import.meta.url);
const {Store, windowsSecurity, aclEnvironment, protectedInput} = require('./credentials.cjs');
const {TrelloError, publicError, messages} = require('./errors.cjs');
const {status} = require('./setup.cjs');
const {execute} = require('./cli.cjs');
const owner = require('./owner.cjs');
const {state} = require('./policy.cjs');
const env = {SystemRoot: 'C:\\Windows', PSModulePath: 'PS7-module-path', pSmOdUlEpAtH: 'also-PS7', Keep: 'unchanged'};
const before = {...env}; let calls = 0;
const executeAcl = (exe, args, options) => {
  calls++; assert.equal(exe, 'C:\\Windows\\System32\\WindowsPowerShell\\v1.0\\powershell.exe');
  assert.ok(args.includes('-NoProfile')); assert.ok(args.includes('-NonInteractive'));
  assert.equal(options.timeout, 10000); assert.equal(options.windowsHide, true); assert.equal(options.stdio, 'ignore');
  assert.equal(options.env.TRELLO_PRIVATE_PATH, 'C:\\private\\credentials.json');
  assert.equal(options.env.Keep, 'unchanged'); assert.ok(!Object.keys(options.env).some(k => k.toLowerCase() === 'psmodulepath'));
  const script = Buffer.from(args.at(-1), 'base64').toString('utf16le');
  assert.match(script, /owner -ne \$sid.Value/); assert.match(script, /exit 21/); assert.match(script, /catch \{ exit 22 \}/);
};
windowsSecurity('C:\\private\\credentials.json', false, false, {env, execute: executeAcl});
assert.equal(calls, 1); assert.deepEqual(env, before);
assert.equal(aclEnvironment(env, 'file').TRELLO_PRIVATE_PATH, 'file');
for (const [statusCode, expected] of [[21, 'STORE_PERMISSIONS'], [22, 'STORE_PERMISSION_CHECK'], [1, 'STORE_PERMISSION_CHECK'], [undefined, 'STORE_PERMISSION_CHECK']]) {
  assert.throws(() => windowsSecurity('file', false, false, {env, execute() { throw Object.assign(Error(credentials.token), {status: statusCode}); }}), {code: expected});
}
const f = fixture();
try {
  for (const code of Object.keys(messages)) {
    const result = publicError(new TrelloError(code)); assert.equal(result.code, code); assert.equal(result.message, messages[code]);
    assert.ok(!JSON.stringify(result).includes(credentials.token));
  }
  assert.equal(publicError(Error(credentials.token)).code, 'INTERNAL');
  assert.equal(publicError(new TrelloError('UNKNOWN_WRITE')).outcome, 'unknown');
  assert.equal(publicError(new TrelloError('WRITE_CHANGED')).outcome, 'applied');
  const absent = new Store(path.join(f.root, 'missing'));
  assert.equal(status(absent).storage, 'missing');
  assert.equal((await owner.execute({action: 'status'}, {store: absent})).data.configured, false);
  assert.throws(() => protectedInput(path.join(f.root, 'absent-input')), {code: 'STORE_MISSING'});
  const policyFile=f.store.file('policy'),policyBytes=fs.readFileSync(policyFile);fs.unlinkSync(policyFile);
  assert.equal(status(f.store).configured,true,'Missing policy is not missing credentials');assert.equal(status(f.store).storage,'incomplete');assert.equal(status(f.store).problem.resource,'policy');fs.writeFileSync(policyFile,policyBytes);
  const lock = path.join(f.store.dir, 'config.lock'); fs.writeFileSync(lock, '');
  assert.throws(() => f.store.read('credentials'), {code: 'STORE_BUSY'}); fs.unlinkSync(lock);
  const file = f.store.file('credentials'), original = fs.readFileSync(file, 'utf8');
  for (const broken of ['not JSON '+credentials.token, '{}', 'x'.repeat(32769)]) {
    fs.writeFileSync(file, broken);
    assert.throws(() => status(f.store), {code: 'STORE_MALFORMED'});
    const result = await execute(['status'], {store: f.store});
    assert.equal(result.result.ok, false); assert.equal(result.result.error.code, 'STORE_MALFORMED');
    assert.ok(!JSON.stringify(result).includes(credentials.token));
  }
  fs.writeFileSync(file, original);
  const hardlink = path.join(f.root, 'hardlink'); fs.linkSync(file, hardlink);
  assert.throws(() => f.store.read('credentials'), {code: 'STORE_UNSAFE_PATH'}); fs.unlinkSync(hardlink);
  const blocked = new Store(f.home, {security() { throw new TrelloError('STORE_PERMISSION_CHECK'); }});
  assert.throws(() => status(blocked), {code: 'STORE_PERMISSION_CHECK'});
  assert.equal((await owner.execute({action: 'status'}, {store: blocked})).error.code, 'STORE_PERMISSION_CHECK');
  fs.writeFileSync(path.join(f.home, 'shared.json'), '{'+credentials.token);
  assert.throws(() => state(f.store), {code: 'PUBLIC_STATE_INVALID'});
  fs.writeFileSync(path.join(f.home, 'shared.json'), JSON.stringify({'custom.plugins':{trello:{enabled:false}}}));
  assert.equal(state(f.store).enabled, false);
  // Real PS7 -> Node -> system Windows PowerShell regression. No fetch or real store.
  if (process.platform === 'win32') {
    const pwsh = cp.spawnSync('pwsh', ['-NoProfile', '-NonInteractive', '-Command', '$PSVersionTable.PSVersion.Major'], {encoding:'utf8', windowsHide:true});
    if (!pwsh.error && pwsh.status === 0 && Number(pwsh.stdout.trim()) >= 7) {
      const script = path.join(f.root, 'ps7-regression.cjs'), home = path.join(f.root, 'ps7-home');
      fs.writeFileSync(script, `const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const {Store,security}=require(${JSON.stringify(require.resolve('./credentials.cjs'))});
const {execute}=require(${JSON.stringify(require.resolve('./cli.cjs'))});
const owner=require(${JSON.stringify(require.resolve('./owner.cjs'))});
(async()=>{const home=process.argv[2],store=new Store(home);fs.mkdirSync(home,{recursive:true});
const input=path.join(home,'private-input.json');fs.writeFileSync(input,JSON.stringify(${JSON.stringify(credentials)}));security(input,true);
assert.equal((await execute(['--home',home,'setup','--input',input])).result.ok,true);
assert.equal((await execute(['--home',home,'policy','allow',${JSON.stringify(A)}])).result.ok,true);
assert.equal((await execute(['--home',home,'status'])).result.data.configured,true);
assert.equal((await owner.execute({action:'status'},{store})).data.configured,true);
assert.equal(store.read('credentials').token,${JSON.stringify(credentials.token)});
require('node:child_process').execFileSync('icacls.exe',[store.file('credentials'),'/grant','*S-1-1-0:R'],{stdio:'ignore',windowsHide:true});
assert.equal((await execute(['--home',home,'status'])).result.error.code,'STORE_PERMISSIONS');console.log('PS7_OK');})().catch(()=>process.exitCode=1);`);
      const quote = s => "'"+s.replaceAll("'", "''")+"'";
      const result = cp.spawnSync('pwsh', ['-NoProfile','-NonInteractive','-Command', `& ${quote(process.execPath)} ${quote(script)} ${quote(home)}; exit $LASTEXITCODE`], {encoding:'utf8',timeout:180000,windowsHide:true});
      assert.equal(result.status, 0, 'Fake PS7 setup/read/status/owner/unsafe-ACL regression'); assert.match(result.stdout, /PS7_OK/);
    } else console.log('SKIP: actual PS7 unavailable; injected polluted-environment regression remains mandatory');
  }
} finally { f.cleanup(); }
console.log('PASS: child-only PSModulePath repair, fail-closed tooling, distinct safe store/public errors and PS7 fake-store regression');
