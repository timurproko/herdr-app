import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {workerSpaceScript,supportedCapability,setterResult} from '../src/plugins/crew/worker-space-command.js';
const capability={capability:'worker-space-local-set',version:1,modes:['combined','per-project'],explicitHome:true};
assert.equal(supportedCapability(capability),true);
assert.throws(()=>workerSpaceScript([],{kind:'set',home:'relative',mode:'combined'}));
if(process.platform==='win32') {
 const dir=fs.mkdtempSync(path.resolve('.artifacts/worker-command-')),main=path.join(dir,'fake-crew.cjs'),home=dir.replace(/\\/g,'/');
 fs.writeFileSync(main,`const a=process.argv.slice(2),cap=${JSON.stringify(capability)};if(a.includes('--capabilities'))console.log(JSON.stringify(cap));else if(a[0]==='status')console.log(JSON.stringify({home:process.env.USERPROFILE}));else if(a.includes('--set-local'))console.log(JSON.stringify({...cap,ok:true,home:a[a.indexOf('--home')+1],mode:a[a.indexOf('--set-local')+1],changed:true}));else console.log('worker-space: combined');`);
 const quote=s=>"'"+s.replace(/'/g,"''")+"'";
 const run=request=>{const r=spawnSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',workerSpaceScript([`$main=${quote(main)}`],request)],{cwd:dir,encoding:'utf8',timeout:15000,env:{...process.env,USERPROFILE:dir,HOME:dir,CREW_HOME:dir}});assert.equal(r.status,0,r.stderr);return r.stdout.trim();};
 try {
  const probe=JSON.parse(run({kind:'capability'}));assert.equal(probe.code,0);assert.equal(supportedCapability(JSON.parse(probe.stdout)),true);
  assert.equal(JSON.parse(run({kind:'capability',cached:probe})).identity,probe.identity);
  assert.equal(JSON.parse(run({kind:'discover'})).home,dir);
  assert.equal(run({kind:'read',home}),'worker-space: combined');
  for(const mode of ['per-project','combined'])assert.equal(setterResult({code:0,stdout:run({kind:'set',home,mode})},home,mode).status,'accepted');
 }finally{fs.rmSync(dir,{recursive:true,force:true});}
}
console.log('PASS worker-space fixed command grammar and fake CLI transport'+(process.platform==='win32'?'':' (PowerShell execution Windows-only)'));
