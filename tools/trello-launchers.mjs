// Exact-name user-bin ownership only; never a generic outside-home installer.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {execFileSync} from 'node:child_process';
import {digest, put, contained} from './files.mjs';
const legacyNames = ['herdr-trello', 'herdr-trello.cmd', 'herdr-trello.ps1'];
export const launcherNames = [...legacyNames, 'herdr-trello.exe'];
export const defaultTrelloBin = () => process.env.HERDR_TRELLO_BIN || path.join(os.homedir(), '.local/bin');
const recordPath = home => contained(home, '.customizations/trello-launchers.json');
const bytesAt = file => { try { return fs.readFileSync(file); } catch(e) { if(e.code==='ENOENT')return null;throw e; } };
function safe(file) {
  for(let p=path.resolve(file);;p=path.dirname(p)) {
    try { if(fs.lstatSync(p).isSymbolicLink())throw Error('Linked Trello launcher path refused.'); } catch(e) { if(e.code!=='ENOENT')throw e; }
    if(path.dirname(p)===p)break;
  }
  return path.resolve(file);
}
function record(home) {
  const file=safe(recordPath(home)),raw=bytesAt(file); if(raw===null)return null;
  const r=JSON.parse(raw);
  if(!r||![1,2,3].includes(r.version)||r.home!==path.resolve(home)||typeof r.bin!=='string'||path.resolve(r.bin)!==r.bin||!r.files||
    Object.keys(r.files).sort().join()!==[...(r.version===3?launcherNames:legacyNames)].sort().join()||Object.entries(r.files).some(([name,h])=>!(r.version>=2&&name==='herdr-trello.ps1'&&h===null)&&!(r.version===3&&name==='herdr-trello.exe'&&h===null)&&!/^[a-f0-9]{64}$/.test(h))||r.version>=2&&r.files['herdr-trello.ps1']!==null||r.version===3&&!/^[a-f0-9]{64}$/.test(r.recipe??''))throw Error('Invalid Trello launcher ownership.');
  return {...r,files:{'herdr-trello.exe':null,...r.files}};
}
// In-box .NET Framework builds this tiny owned console launcher at installation.
// It calls Node directly, never cmd.exe/PowerShell, and requires no script-policy
// exception, downloaded compiler, committed binary or native Herdr modification.
function nativeSource(js) {
  const encoded=Buffer.from(js).toString('base64'),node=Buffer.from(process.execPath).toString('base64');
  return String.raw`using System;
using System.Text;
using System.Diagnostics;
internal static class TrelloLauncher {
  static string Q(string value) {
    var b = new StringBuilder("\""); int slashes = 0;
    foreach (char c in value) {
      if (c == '\\') { slashes++; continue; }
      if (c == '"') b.Append('\\', slashes * 2 + 1).Append('"');
      else b.Append('\\', slashes).Append(c);
      slashes = 0;
    }
    return b.Append('\\', slashes * 2).Append('"').ToString();
  }
  static int Main(string[] args) {
    try {
      string script = Encoding.UTF8.GetString(Convert.FromBase64String("${encoded}"));
      string node = Encoding.UTF8.GetString(Convert.FromBase64String("${node}"));
      var command = new StringBuilder(Q("-e") + " " + Q(script) + " --");
      foreach (string arg in args) command.Append(' ').Append(Q(arg));
      var start = new ProcessStartInfo(node, command.ToString());
      start.UseShellExecute = false;
      using (var child = Process.Start(start)) { child.WaitForExit(); return child.ExitCode; }
    } catch { Console.Error.WriteLine("Trello launcher could not start Node. Check installation."); return 3; }
  }
}
`;
}
function compileNative(source) {
  const system=process.env.SystemRoot||'C:\\Windows';
  const compiler=['Framework64','Framework'].map(dir=>path.join(system,'Microsoft.NET',dir,'v4.0.30319/csc.exe')).find(file=>fs.existsSync(file));
  if(!compiler)throw Error('The Windows Trello launcher requires the in-box .NET Framework compiler.');
  const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||os.tmpdir(),'trello-native-'));
  try {
    const input=path.join(root,'launcher.cs'),output=path.join(root,'herdr-trello.exe');
    fs.writeFileSync(input,source);
    try { execFileSync(compiler,['/nologo','/target:exe','/optimize+','/out:'+output,input],{timeout:20000,windowsHide:true,stdio:'pipe',env:{...process.env,TEMP:root,TMP:root}}); }
    catch { throw Error('Could not build the Windows Trello launcher with the in-box .NET Framework compiler.'); }
    return fs.readFileSync(output);
  } finally { fs.rmSync(root,{recursive:true,force:true}); }
}
function content(home) {
  const entry=path.join(path.resolve(home),'.customizations/runtime/lib/trello/cli.cjs');
  const quote=s=>"'"+s.replaceAll("'","'\\''")+"'";
  const encoded=Buffer.from(JSON.stringify({entry,home:path.resolve(home)})).toString('base64');
  const js=`const c=JSON.parse(Buffer.from('${encoded}','base64'));require(c.entry).execute(['--home',c.home,...process.argv.slice(1)]).then(o=>{process.stdout.write(o.help||JSON.stringify(o.result)+'\\n');process.exitCode=o.exit;}).catch(()=>{process.stdout.write(JSON.stringify({version:1,ok:false})+'\\n');process.exitCode=3;});`;
  // ASCII launchers avoid the Windows console code page for installed Unicode paths.
  return {
    'herdr-trello':`#!/bin/sh\nexec node ${quote(entry)} --home ${quote(path.resolve(home))} "$@"\n`,
    'herdr-trello.cmd':`@echo off\r\nnode -e "${js}" -- %*\r\nexit /b %errorlevel%\r\n`,
    // Retire only the owned policy-sensitive script. Windows resolves the native
    // console shim ahead of CMD, preserving percent strings without cmd.exe.
    'herdr-trello.ps1':null,
    'herdr-trello.exe':null,
    nativeSource:nativeSource(js),
  };
}
export function planLaunchers(home,bin=defaultTrelloBin(),envPath=process.env.PATH||'') {
  bin=safe(bin);home=path.resolve(home);safe(home);
  const old=record(home);if(old&&old.bin!==bin)throw Error('Trello launcher bin changed; remove the owned launchers before relocating.');
  const texts=content(home),recipe=digest(texts.nativeSource),jobs=[];
  const current=Object.fromEntries(launcherNames.map(name=>{const before=bytesAt(safe(path.join(bin,name)));if(old?digest(before)!==old.files[name]:before!==null)throw Error(`Personal or other-home Trello launcher conflict: ${name}`);return [name,before];}));
  if(process.platform==='win32')texts['herdr-trello.exe']=old?.recipe===recipe&&current['herdr-trello.exe']?current['herdr-trello.exe']:compileNative(texts.nativeSource);
  for(const name of launcherNames) {
    const file=path.join(bin,name),before=current[name],after=texts[name]===null?null:Buffer.from(texts[name]);
    jobs.push({name,file,before:before?.toString('base64')??null,after:after?.toString('base64')??null});
  }
  const file=recordPath(home),before=bytesAt(file),next={version:3,home,bin,recipe,files:Object.fromEntries(jobs.map(j=>[j.name,j.after===null?null:digest(Buffer.from(j.after,'base64'))]))};
  jobs.push({file,before:before?.toString('base64')??null,after:Buffer.from(JSON.stringify(next)+'\n').toString('base64')});
  return {version:3,home,bin,jobs,changed:jobs.some(j=>j.before!==j.after)};
}
function validPlan(home,p) {
  if(![1,2,3].includes(p?.version)||p.home!==path.resolve(home)||typeof p.bin!=='string'||!Array.isArray(p.jobs)||p.jobs.length!==(p.version===3?5:4))throw Error('Invalid Trello launcher journal.');
  const targets=[...(p.version===3?launcherNames:legacyNames).map(n=>path.join(p.bin,n)),recordPath(home)];
  if(p.jobs.some((j,i)=>j.file!==targets[i]||j.before!==null&&typeof j.before!=='string'||j.after!==null&&typeof j.after!=='string'))throw Error('Invalid Trello launcher targets.');
  return p;
}
export function checkLaunchers(home,plan,restore=false) {
  validPlan(home,plan);
  // Preflight every target before touching any of them, and recheck at commit.
  for(const j of plan.jobs) {
    safe(j.file);const current=bytesAt(j.file)?.toString('base64')??null;
    if(restore?![j.after,j.before].includes(current):current!==j.before)throw Error('Trello launcher changed after deployment.');
  }
}
// Hold the user-bin lock around the caller's whole synchronous transaction, not
// just launcher writes. Full deployment must acquire it before any payload IO.
export function withLauncherLock(home,plan,restore,fn) {
  validPlan(home,plan);
  fs.mkdirSync(safe(plan.bin),{recursive:true});
  const lock=path.join(plan.bin,'.herdr-trello.lock');let fd,active=false;
  try {
    fd=fs.openSync(safe(lock),'wx');active=true;
    checkLaunchers(home,plan,restore);
    return fn(()=>{
      if(!active)throw Error('Trello launcher lock is no longer held.');
      checkLaunchers(home,plan,restore);
      for(const j of plan.jobs) {
        safe(j.file);const actual=bytesAt(j.file),value=restore?j.before:j.after;
        const expected=restore?[j.after,j.before]:[j.before];
        if(!expected.includes(actual?.toString('base64')??null))throw Error('Concurrent Trello launcher edit.');
        if(value===null){if(actual!==null)fs.unlinkSync(j.file);}else {put(j.file,Buffer.from(value,'base64'),digest(actual));if(j.name==='herdr-trello')fs.chmodSync(j.file,0o755);}
      }
    });
  }finally{active=false;if(fd!==undefined){fs.closeSync(fd);fs.unlinkSync(lock);}}
}
export function applyLaunchers(home,plan,restore=false) {
  return withLauncherLock(home,plan,restore,apply=>apply());
}
export function installedBin(home) {
  const r=record(home);if(!r)throw Error('Trello launcher ownership is missing. Install Trello in Settings.');
  if(process.platform==='win32'&&!r.files['herdr-trello.exe'])throw Error('Update Trello to install its literal-argument Windows launcher.');
  for(const name of launcherNames)if(digest(bytesAt(safe(path.join(r.bin,name))))!==r.files[name])throw Error('Trello launcher ownership conflict.');
  return safe(r.bin);
}
export function removalLaunchers(home) {
  const r=record(home);if(!r)return null;
  const jobs=launcherNames.map(name=>{const file=safe(path.join(r.bin,name)),after=bytesAt(file);if(digest(after)!==r.files[name])throw Error('Modified Trello launcher; removal refused.');return {name,file,before:null,after:after?.toString('base64')??null};});
  jobs.push({file:recordPath(home),before:null,after:bytesAt(recordPath(home)).toString('base64')});
  return {version:3,home:path.resolve(home),bin:r.bin,jobs};
}
