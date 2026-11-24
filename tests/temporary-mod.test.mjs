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

 // Imported fixture functions receive a fake checker and a synthetic home. No
 // generated UI is evaluated and no native command is ever executed.
 const cases = [
  ['claude-account-native.mjs','checkClaudeAccountStates'],
  ['file-delete-native.mjs','checkFileDeleteStates'],
  ['panel-pin-native.mjs','checkPanelPinStates'],
  ['pinned-pr-native.mjs','checkPinnedPullStates'],
  ['rename-selection-native.mjs','checkRenameSelection'],
  ['reorder-native.mjs','checkReorderStates'],
  ['sidebar-plugins-native.mjs','checkSidebarPluginStates'],
  ['tab-move-native.mjs','checkTabMoveStates'],
  ['tab-move-native.mjs','checkTabArrivalStates'],
  ['usage-plugin-native.mjs','checkUsagePluginStates']
 ];
 const fakeHome=path.join(home,'callers'), sources=['workspace-status','files','changes','tabs','spaces','workspace-chrome','settings','menu','usage'];
 for (const feature of sources) {
  const source=path.join(fakeHome,'mods',`custom-${feature}`);fs.mkdirSync(source,{recursive:true});
  fs.writeFileSync(path.join(source,'main.js'),'export default class Menu extends View {}');fs.writeFileSync(path.join(source,'host.js'),'// fake host');
 }
 for (const [file,fn] of cases) {
  const fixture=await import(new URL(`./features/${file}`,import.meta.url));
  for (const fail of [false,true]) {
   const seen=[];
   const checker=([command,mod])=>{
    assert.equal(command,'check');const name=path.basename(mod);seen.push(name);
    fs.mkdirSync(path.join(fakeHome,'data',name),{recursive:true});
    if(fail)throw Error('fake checker failed');
   };
   if(fail)assert.throws(()=>fixture[fn](fakeHome,checker),/fake checker failed/);else assert.ok(fixture[fn](fakeHome,checker)>0);
   for (const name of seen) for (const area of ['mods','data']) assert.equal(fs.existsSync(path.join(fakeHome,area,name)),false,`${fn}: ${area}/${name}`);
  }
  const missingHome=path.join(home,`missing-${fn}`);
  assert.throws(()=>fixture[fn](missingHome,()=>assert.fail('Missing source must fail before the checker')),/ENOENT/);
  assert.deepEqual(fs.readdirSync(path.join(missingHome,'mods')),[],`${fn}: partial setup cleanup`);
 }
 for (const feature of sources) assert.equal(fs.readFileSync(path.join(fakeHome,'mods',`custom-${feature}`,'host.js'),'utf8'),'// fake host');
 // Guard the hand-written entrypoints without importing their live top levels.
 const callers=[...fs.readdirSync(path.join(project,'tests/features')).filter(f=>f.endsWith('.mjs')).map(f=>`tests/features/${f}`),
  ...['enroll-core-ci','inspect-live','inspect-pr-links','preview-ci-fix','preview-tab-move','retry-ci-fix'].map(f=>`tools/${f}.mjs`)];
 let adopted=0;
 for(const file of callers){
  const source=fs.readFileSync(path.join(project,file),'utf8');
  if(!/fs\.cpSync|installTemporaryHostFacade\(dir/.test(source))continue;
  assert.match(source,/import \{[^}]*temporaryMod[^}]*\} from .*temporary-mod\.mjs/,file);
  assert.match(source,/temporaryMod\(home,/,file);assert.match(source,/finally\s*\{\s*dispose\(\)/,file);
  assert.doesNotMatch(source,/fs\.rmSync\(dir\s*[,)]/,file);adopted++;
 }
 assert.equal(adopted,27);
 console.log('PASS: 10 caller functions clean synthetic mod/data on completion and checker/setup failure; 27 entrypoints use shared disposal');
} finally { fs.rmSync(home,{recursive:true,force:true}); }
