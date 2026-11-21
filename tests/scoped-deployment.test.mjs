import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from '../tools/build.mjs';
import {deploy} from '../tools/deploy.mjs';
import {rollback} from '../tools/rollback.mjs';
import {digest,json,put} from '../tools/files.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'herdr-source-deploy-'));
try {
  const {output}=build(),home=path.join(temp,'home'),other=path.join(temp,'other-branch'),candidate=path.join(temp,'candidate');
  fs.cpSync(output,other,{recursive:true});fs.cpSync(output,candidate,{recursive:true});
  const change=(root,rel,comment)=>{
    fs.appendFileSync(path.join(root,rel),`\n// ${comment}\n`);
    const manifest=json(path.join(root,'bundle.json'));manifest.files[rel].hash=digest(fs.readFileSync(path.join(root,rel)));put(path.join(root,'bundle.json'),JSON.stringify(manifest));
  };
  for(const rel of ['mods/custom-settings/main.js','mods/custom-settings/plugins/crew/plugin.js','mods/custom-tabs/ui.js'])change(other,rel,'Other branch work that MUST survive');
  deploy(other,home,{repair:false});put(path.join(home,'.migration-fixture'),'fixture');
  const plugin='mods/custom-settings/plugins/git/plugin.js',entry='mods/custom-settings/main.js';
  change(candidate,plugin,'Requested Git update');
  const before=json(path.join(home,'.customizations/manifest.json')),baseBytes=fs.readFileSync(path.join(home,'layouts/Custom.json'));
  const prefs=path.join(home,'.customizations/layout-preferences.json');const prefsBytes=Buffer.from('{ "version": 1, "overrides": {} }\n');put(prefs,prefsBytes);
  const entryBytes=fs.readFileSync(path.join(home,entry));fs.utimesSync(path.join(home,entry),1,1);
  const result=deploy(candidate,home,{sources:['src/plugins/git/plugin.js'],repair:false});
  assert.ok(result.changed>0);assert.equal(result.removed,0);assert.ok(result.preserved>0);assert.ok(result.backup);
  assert.deepEqual(fs.readFileSync(path.join(home,entry)),entryBytes,'Dependency reload preserves the other branch entrypoint, not the build version');
  assert.ok(fs.statSync(path.join(home,entry)).mtimeMs>1000,'Dependency-only deployment reloads the existing mod');
  assert.deepEqual(fs.readFileSync(path.join(home,'layouts/Custom.json')),baseBytes);assert.deepEqual(fs.readFileSync(prefs),prefsBytes,'No layout/prefs rewrite during source-scoped deployment');
  const after=json(path.join(home,'.customizations/manifest.json'));
  for(const rel of Object.keys(before.files)) {
    const source=json(path.join(candidate,'bundle.json')).files[rel]?.source;
    if(source!=='src/plugins/git/plugin.js')assert.equal(after.files[rel],before.files[rel],`Preserved ownership: ${rel}`);
  }
  const stamp=fs.statSync(path.join(home,entry),{bigint:true}).mtimeNs;
  assert.equal(deploy(candidate,home,{sources:['src/plugins/git/plugin.js'],repair:false}).changed,0);
  assert.equal(fs.statSync(path.join(home,entry),{bigint:true}).mtimeNs,stamp,'No-op partial installs do not reload');
  // Rollback handles the preserved layout/preferences and restores only selected bytes.
  rollback(home,result.backup,{fixture:true});assert.equal(digest(fs.readFileSync(path.join(home,plugin))),before.files[plugin]);
  assert.deepEqual(fs.readFileSync(prefs),prefsBytes);assert.deepEqual(fs.readFileSync(path.join(home,entry)),entryBytes);
  const manifestBefore=fs.readFileSync(path.join(home,'.customizations/manifest.json'));
  fs.appendFileSync(path.join(home,entry),'\n// Personal edit');
  assert.throws(()=>deploy(candidate,home,{sources:['src/plugins/git/plugin.js'],repair:false}),/Personal entrypoint conflict/);
  assert.deepEqual(fs.readFileSync(path.join(home,'.customizations/manifest.json')),manifestBefore,'All reloads preflight before writes');
  assert.equal(digest(fs.readFileSync(path.join(home,plugin))),before.files[plugin]);
  fs.writeFileSync(path.join(home,entry),entryBytes);
  fs.appendFileSync(path.join(home,plugin),'\n// Personal dependency edit');
  assert.throws(()=>deploy(candidate,home,{sources:['src/plugins/git/'],repair:false}),/Personal file conflict/);
  for(const sources of [[],['../src/'],['src/../tools'],['src/not-packaged/'],['src/appearance/layouts/Custom.json']])assert.throws(()=>deploy(candidate,home,{sources,repair:false}));
  assert.throws(()=>deploy(candidate,path.join(temp,'fresh'),{sources:['src/plugins/git/'],repair:false}),/existing owned installation/);
  console.log('PASS: source-scoped deployment preserves other branches, layouts/preferences/ownership, reloads exact installed entrypoints, handles no-op/rollback and refuses conflicts before writes');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
