import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import crypto from 'node:crypto';
import { createRequire } from 'node:module';
import { spawnSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const { validateRequest, psLiteral, encoded, WORKER, MANAGER, INSPECT } = require('../mods/custom-settings/permission-launcher.cjs');
assert.equal(psLiteral("C:/a'b"), "'C:/a''b'");assert.equal(Buffer.from(encoded('hello'), 'base64').toString('utf16le'), 'hello');
for (const bad of [null, {}, { action: 'stop' }, { action: 'apply', mode: 'root', remember: true, request: 'relaunch-123456' }, { action: 'status', request: '../file' }, { action: 'autostart', mode: 'standard', remember: 'yes', request: 'relaunch-123456' }, { action: 'inspect', session: 'not-the-current-session' }]) assert.throws(() => validateRequest(bad));
assert.ok(validateRequest({ action: 'reboot', request: 'reboot-123456' }),'Reboot needs only a request id');
assert.ok(validateRequest({ action: 'apply', mode: 'standard', remember: true, request: 'relaunch-123456' }));
assert.match(MANAGER, /-UserId \$sid -LogonType Interactive -RunLevel \$level/);
assert.match(MANAGER, /-Verb RunAs/);assert.match(MANAGER, /SessionId -eq 0/);assert.match(MANAGER, /Description -ne \$o.marker/);
assert.match(MANAGER, /Task-Action \$false/);assert.match(WORKER, /if\(\$o.restart\)/);
assert.doesNotMatch(MANAGER + WORKER, /-Password|LogonType (Password|S4U|ServiceAccount)|UserId ['"]?SYSTEM|Stop-Process|taskkill|Set-ExecutionPolicy/);
assert.ok(WORKER.indexOf('Windows did not supply the requested user token') < WORKER.indexOf("@('server','stop')"));
assert.ok(WORKER.indexOf('Old terminal holders are still running') < WORKER.indexOf("@('server','start')"));
assert.match(WORKER, /proof\.stdout\.Trim\(\) -ne \$o.mode/);
// powershell.exe started directly by Task Scheduler flashes a console window at sign-in; tasks go through a headless conhost.
assert.match(MANAGER, /New-ScheduledTaskAction -Execute \$o.conhost -WorkingDirectory \$profileHome -Argument \('--headless "'\+\$o.powershell\+'" /);
assert.doesNotMatch(MANAGER, /New-ScheduledTaskAction[^\n]*WindowStyle/);
assert.match(WORKER, /GetFolderPath\('UserProfile'\)/);
assert.match(WORKER, /Set-Location -LiteralPath \$profileHome/);
assert.match(WORKER, /\[Environment\]::CurrentDirectory=\$profileHome/);
assert.match(WORKER, /\$s.WorkingDirectory=\$profileHome/);
assert.ok(WORKER.indexOf('The Windows user home folder is unavailable') < WORKER.indexOf("@('server','stop')"));
const source = fs.readFileSync(new URL('../mods/custom-settings/permission-launcher.cjs', import.meta.url), 'utf8');
const memory = new Map(), calls = [], writes = [];
let info = { platform: 'win32', elevated: true, running: true, supported: true, desktop: true, sid: 'S-1-5-21-test', session: 'default' }, fail = false;
const context = { Buffer, module: { exports: {}, id: 'test' }, process: { platform: 'win32', env: { LOCALAPPDATA: '/user', HC_SESSION: 'default' }, argv: [] }, require(name) {
  if (name === 'node:path') return path;
  if (name === 'node:crypto') return crypto;
  if (name === 'node:fs') return { mkdirSync: p => writes.push(['mkdir',p]), existsSync: p => memory.has(p), writeFileSync: (p,s) => { writes.push([p,s]);memory.set(p,s); }, readFileSync: p => memory.get(p), rmSync: p => memory.delete(p) };
  if (name === 'node:child_process') return { spawnSync(exe, args) { calls.push([exe,args]);if (!args.includes('-File')) return {status:0,stdout:JSON.stringify(info)};const file=args.at(-1),script=memory.get(file);assert.match(script,/New-ScheduledTaskPrincipal/);const text=script.match(/\$o='((?:[^']|'')*)'\|ConvertFrom-Json/)[1].replaceAll("''", "'");const o=JSON.parse(text);memory.set(o.ack,JSON.stringify(fail?{error:'Cancelled',rejected:true}:o.operation==='autostart'?{configured:true,request:o.request,remember:o.remember}:{queued:true}));return{status:fail?1:0,stdout:''}; } };
  throw Error(name);
} };
vm.runInNewContext(source, context);const api = context.module.exports;
api.main({action:'inspect'});assert.equal(writes.length,0,'Inspection is strictly read-only');assert.equal(calls.length,1);
info.desktop=false;assert.throws(()=>api.main({action:'apply',mode:'standard',remember:true,request:'relaunch-123456'}),/signed in/);assert.equal(writes.length,0,'No-desktop preflight makes no changes');info.desktop=true;
const result=api.main({action:'apply',mode:'standard',remember:true,request:'relaunch-123456'});assert.equal(result.queued,true);assert.equal(result.mode,'standard');assert.throws(()=>api.main({action:'apply',mode:'standard',remember:true,request:'relaunch-123456'}),/already submitted/);
const configured=api.main({action:'autostart',mode:'standard',remember:true,request:'autostart-123456'});assert.equal(configured.configured,true);
assert.equal(api.main({action:'status',request:'autostart-123456'}).state,'complete');
assert.equal(api.main({action:'start',mode:'standard',request:'start-123456'}).queued,true);
assert.equal(api.main({action:'stop',mode:'administrator',request:'stop-123456'}).queued,true);
assert.ok(WORKER.indexOf('if($o.stopOnly)') < WORKER.indexOf("@('server','start')"),'Stop-only workers return before any start');
assert.match(MANAGER,/\$restart=\$o.operation -in @\('apply','stop'\)/);
const startupBranch=MANAGER.slice(MANAGER.indexOf("if($o.operation -eq 'autostart')"),MANAGER.indexOf('$handoff='));assert.match(startupBranch,/return/);assert.doesNotMatch(startupBranch,/Start-ScheduledTask|server.*stop|server.*start/);
// Standard autostart on an admin-capable account: the sign-in task is an elevated guard that
// only replaces an ELEVATED core (one an SSH reconnect started before sign-in), then hands
// the start to a LIMITED task; a standard core already running is kept.
assert.match(startupBranch,/if\(\$guarded\)/);
assert.match(startupBranch,/-RunLevel Highest/);
assert.match(startupBranch,/Task-Action \$true \$o.startupResult \$null \$startTask \$true/);
assert.match(startupBranch,/Register-ScheduledTask -TaskName \$startTask/);
assert.match(MANAGER,/\$guarded=\$o.operation -eq 'autostart' -and \$o.remember -and \$o.mode -eq 'standard' -and \$adminCapable/);
assert.match(MANAGER,/-or \$guarded -or/,'Registering the elevated guard needs administrator approval');
assert.match(MANAGER,/S-1-5-32-544/);
assert.ok(WORKER.indexOf("$probe.stdout.Trim() -eq 'standard'") < WORKER.indexOf("@('server','stop')"),'A standard core is kept before anything is stopped');
assert.match(WORKER,/if\(-not \$o.stopElevatedOnly\) \{ Start-Sleep/);
assert.match(INSPECT,/\$guarded=\$owned -and \$guardStart/,'A guarded standard sign-in still reads as standard');
assert.match(INSPECT,/@\('server','status'\)/);assert.doesNotMatch(INSPECT,/@\('server','start'\)|Register-ScheduledTask/);
fail=true;assert.throws(()=>api.main({action:'apply',mode:'administrator',remember:false,request:'relaunch-cancelled'}),/Cancelled/);
if(process.platform==='win32') {
  // Parse the exact generated manager and worker, without registering tasks or
  // invoking their code. Live tests must use a separate HC_SESSION.
  for(const script of [WORKER, INSPECT, ...writes.filter(([p])=>p.endsWith('.ps1')).map(([,s])=>s)]) {
    const check=`$text=[Text.Encoding]::UTF8.GetString([Convert]::FromBase64String('${Buffer.from(script).toString('base64')}')); $errors=$null; [void][Management.Automation.Language.Parser]::ParseInput($text,[ref]$null,[ref]$errors); if($errors.Count){$errors|ForEach-Object {$_.Message};exit 1}`;
    const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command','-'],{encoding:'utf8',input:check+'\n'});assert.equal(r.status,0,String(r.error||'')+r.stdout+r.stderr);
  }
}
console.log('PASS: permission-launcher input validation, read-only inspect, same-user task ownership/UAC/no-headless-fallback guards, stopped-holder and token verification, task receipts and PowerShell syntax');
