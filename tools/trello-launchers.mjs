// Exact-name user-bin ownership only; never a generic outside-home installer.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {digest, put, contained} from './files.mjs';
export const launcherNames = ['herdr-trello', 'herdr-trello.cmd', 'herdr-trello.ps1'];
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
  if(![1,2].includes(r.version)||r.home!==path.resolve(home)||typeof r.bin!=='string'||path.resolve(r.bin)!==r.bin||!r.files||
    Object.keys(r.files).sort().join()!==[...launcherNames].sort().join()||Object.entries(r.files).some(([name,h])=>!(r.version===2&&name==='herdr-trello.ps1'&&h===null)&&!/^[a-f0-9]{64}$/.test(h))||r.version===2&&r.files['herdr-trello.ps1']!==null)throw Error('Invalid Trello launcher ownership.');
  return r;
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
    // PowerShell resolves the CMD shim without script-policy bypass. The null
    // slot journals removal of only the old, hash-matching owned script.
    'herdr-trello.ps1':null,
  };
}
export function planLaunchers(home,bin=defaultTrelloBin(),envPath=process.env.PATH||'') {
  bin=safe(bin);home=path.resolve(home);safe(home);
  const old=record(home);if(old&&old.bin!==bin)throw Error('Trello launcher bin changed; remove the owned launchers before relocating.');
  const texts=content(home),jobs=[];
  for(const name of launcherNames) {
    const file=safe(path.join(bin,name)),before=bytesAt(file),after=texts[name]===null?null:Buffer.from(texts[name]);
    if(old?digest(before)!==old.files[name]:before!==null)throw Error(`Personal or other-home Trello launcher conflict: ${name}`);
    jobs.push({name,file,before:before?.toString('base64')??null,after:after?.toString('base64')??null});
  }
  const file=recordPath(home),before=bytesAt(file),next={version:2,home,bin,files:Object.fromEntries(jobs.map(j=>[j.name,j.after===null?null:digest(Buffer.from(j.after,'base64'))]))};
  jobs.push({file,before:before?.toString('base64')??null,after:Buffer.from(JSON.stringify(next)+'\n').toString('base64')});
  return {version:2,home,bin,jobs,changed:jobs.some(j=>j.before!==j.after)};
}
function validPlan(home,p) {
  if(![1,2].includes(p?.version)||p.home!==path.resolve(home)||typeof p.bin!=='string'||!Array.isArray(p.jobs)||p.jobs.length!==4)throw Error('Invalid Trello launcher journal.');
  const targets=[...launcherNames.map(n=>path.join(p.bin,n)),recordPath(home)];
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
  for(const name of launcherNames)if(digest(bytesAt(safe(path.join(r.bin,name))))!==r.files[name])throw Error('Trello launcher ownership conflict.');
  return safe(r.bin);
}
export function removalLaunchers(home) {
  const r=record(home);if(!r)return null;
  const jobs=launcherNames.map(name=>{const file=safe(path.join(r.bin,name)),after=bytesAt(file);if(digest(after)!==r.files[name])throw Error('Modified Trello launcher; removal refused.');return {name,file,before:null,after:after?.toString('base64')??null};});
  jobs.push({file:recordPath(home),before:null,after:bytesAt(recordPath(home)).toString('base64')});
  return {version:2,home:path.resolve(home),bin:r.bin,jobs};
}
