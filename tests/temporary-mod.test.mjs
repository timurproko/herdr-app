import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawnSync} from 'node:child_process';
import {temporaryMod,installTemporaryHostFacade} from '../tools/temporary-mod.mjs';
import {project} from '../tools/build.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'custom temporary facade '));
try{
 installTemporaryHostFacade(dir);
 for(const name of ['host.js','compatibility.js'])assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),fs.readFileSync(path.join(project,'src/integration/herdr',name),'utf8'));
 const host=path.join(dir,'host.js'),before=fs.statSync(host,{bigint:true}).mtimeNs;
 installTemporaryHostFacade(dir);assert.equal(fs.statSync(host,{bigint:true}).mtimeNs,before,'Repeated install preserves identical files');
 fs.writeFileSync(host,'// personal edit');assert.throws(()=>installTemporaryHostFacade(dir),/conflict/);assert.equal(fs.readFileSync(host,'utf8'),'// personal edit');
 console.log('PASS: temporary mods share the canonical facade, install quietly and refuse personal conflicts');
}finally{fs.rmSync(dir,{recursive:true,force:true});}

// All lifecycle checks use a disposable home, never Herdr or its real home.
const fixtures = path.join(project, '.artifacts');
fs.mkdirSync(fixtures, {recursive:true});
const home = fs.mkdtempSync(path.join(fixtures, 'temporary-mod-'));
try {
 for (const name of ['stock', 'custom-installed', 'custom-other-preview']) {
  for (const area of ['mods', 'data']) {
   fs.mkdirSync(path.join(home, area, name), {recursive:true});
   fs.writeFileSync(path.join(home, area, name, 'keep'), name);
  }
 }
 for (const mode of ['success', 'throw', 'already-removed', 'cleanup-error']) {
  const name = `custom-test-${mode}`, mod = path.join(home,'mods',name), data = path.join(home,'data',name);
  const dispose = temporaryMod(home,name);
  const work = () => {
   try {
    fs.writeFileSync(path.join(mod,'main.js'),'fixture');
    fs.mkdirSync(data,{recursive:true});fs.writeFileSync(path.join(data,'state'),'fixture');
    if (mode === 'already-removed') fs.rmSync(mod,{recursive:true});
    if (mode === 'throw') throw Error('fixture error');
   } finally {
    try { if (mode === 'cleanup-error') throw Error('overlay error'); }
    finally { dispose(); }
   }
  };
  if (mode === 'throw' || mode === 'cleanup-error') assert.throws(work,/error/); else work();
  dispose();
  assert.equal(fs.existsSync(mod),false,mode);assert.equal(fs.existsSync(data),false,mode);
 }
 for (const name of ['stock', 'custom-installed', 'custom-other-preview']) {
  assert.throws(()=>temporaryMod(home,name),/Invalid|already exists/);
  for (const area of ['mods','data']) assert.equal(fs.readFileSync(path.join(home,area,name,'keep'),'utf8'),name);
 }
 assert.throws(()=>temporaryMod(home,'../stock'),/Invalid/);
 const stale = path.join(home,'data/custom-stale');fs.mkdirSync(stale);
 assert.throws(()=>temporaryMod(home,'custom-stale'),/already exists/);assert.ok(fs.existsSync(stale));
 const changed = temporaryMod(home,'custom-changed',()=>false);
 fs.mkdirSync(path.join(home,'data/custom-changed'));
 assert.throws(changed,/changed; preserve/);assert.ok(fs.existsSync(path.join(home,'mods/custom-changed')));assert.ok(fs.existsSync(path.join(home,'data/custom-changed')));
 const helper = new URL('../tools/temporary-mod.mjs',import.meta.url).href;
 for (const mode of ['exit','SIGINT','SIGTERM']) {
  const name = `custom-child-${mode.toLowerCase()}`;
  const script = `import {temporaryMod} from ${JSON.stringify(helper)};import fs from 'node:fs';import path from 'node:path';
   temporaryMod(${JSON.stringify(home)},${JSON.stringify(name)});
   fs.mkdirSync(path.join(${JSON.stringify(home)},'data',${JSON.stringify(name)}),{recursive:true});
   ${mode === 'exit' ? 'process.exit(0)' : `process.emit('${mode}')`};`;
  const child = spawnSync(process.execPath,['--input-type=module','-e',script],{encoding:'utf8'});
  assert.equal(child.status,mode==='exit'?0:mode==='SIGINT'?130:143,child.stderr);
  for (const area of ['mods','data']) assert.equal(fs.existsSync(path.join(home,area,name)),false,mode);
 }
 console.log('PASS: exact temporary mod/data cleanup on success, error, exit and interruption preserves unrelated state');
} finally { fs.rmSync(home,{recursive:true,force:true}); }
