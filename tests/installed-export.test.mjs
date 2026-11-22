// Complete installed exporter CLI, disposable source/home, no desktop or credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {build,project} from '../tools/build.mjs';
import {deploy} from '../tools/deploy.mjs';
import {json,put} from '../tools/files.mjs';
const scratch=path.join(project,'.artifacts');fs.mkdirSync(scratch,{recursive:true});
const temp=fs.mkdtempSync(path.join(scratch,'installed-export-'));
const write=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
const save=(file,value)=>write(file,JSON.stringify(value,null,2)+'\n');
const tree=root=>Object.fromEntries(fs.readdirSync(root,{recursive:true}).filter(rel=>fs.statSync(path.join(root,rel)).isFile()).map(rel=>[rel,fs.readFileSync(path.join(root,rel)).toString('base64')]));
try {
  const {output}=build(),home=path.join(temp,'selected home'),other=path.join(temp,'environment home'),checkout=path.join(temp,'checkout');
  const env={...process.env,HERDR_APP_HOME:other,HERDR_APP_BIN:path.join(temp,'no-desktop')};
  deploy(output,home,{repair:false});
  const state=path.join(home,'.customizations/manifest.json'),sidecar=path.join(home,'.customizations/layout-preferences.json');
  const layout=json(path.join(home,'layouts/Custom.json'));layout.terminal_padding=[8,8];save(path.join(home,'layouts/Custom.json'),layout);
  const theme='{"colors":{"accent":"#123456"}}\n';
  const palette={version:1,palette:{accent:'#123456',background:'#181818',sidebar:'#141414',surface:'#1e1e1e',border:'#282828',foreground:'#fafafa',muted:'#a3a3a3'}};
  const shared={'sidebar.collapsed':false,'custom.profiles:null':{version:1,overrides:{},custom:[],order:[]},unrelated:{session:'excluded'}};
  save(path.join(home,'shared.json'),shared);write(path.join(home,'themes/custom-palette.json'),theme);
  save(path.join(home,'.customizations/palette.json'),{customization:palette,theme});
  const before=tree(home);
  for(const file of ['package.json','tools/preferences.mjs','tools/preferences-export.mjs','tools/layout-preferences.mjs','tools/runtime/preferences.mjs','tools/runtime/settings-sections.js','tools/build.mjs','tools/deploy.mjs','tools/files.mjs','tools/plugins.mjs','src/ui/settings-sections.js','src/integration/herdr/compatibility.js','src/appearance/layouts/Custom.json'])write(path.join(checkout,file),fs.readFileSync(path.join(project,file)));
  const preload=path.join(temp,'isolate.mjs');
  write(preload,`import os from 'node:os'; import cp from 'node:child_process'; import {syncBuiltinESMExports} from 'node:module'; os.hostname=()=>'Fixture-HOST'; cp.execFileSync=()=>{throw Error('No external process allowed');}; syncBuiltinESMExports();`);
  const installed=path.join(home,'.customizations/runtime/scripts/export-preferences.mjs');
  const run=(entry,args,fail=null)=>{
    const result=cp.spawnSync(process.execPath,['--import',pathToFileURL(preload).href,entry,...args],{cwd:temp,env,encoding:'utf8',timeout:15000});
    assert.ifError(result.error);assert.equal(result.status,fail?1:0,result.stderr);if(fail)assert.match(result.stderr,fail);return result;
  };
  run(path.join(checkout,'tools/preferences.mjs'),['export',home]);
  const prefs=path.join(home,'preferences'),expected=tree(prefs);assert.equal(Object.keys(expected).length,4);
  assert.deepEqual(json(path.join(prefs,'layout.json')),{version:1,overrides:{terminal_padding:[8,8]}});
  assert.deepEqual(json(path.join(prefs,'fixture-host.json')),{version:1,shared:{'custom.profiles:null':shared['custom.profiles:null'],'sidebar.collapsed':false}});
  // With source absent, only installed imports can possibly work.
  fs.rmSync(checkout,{recursive:true,force:true});fs.rmSync(prefs,{recursive:true,force:true});
  run(installed,['export',home]);assert.deepEqual(tree(prefs),expected);assert.ok(!fs.existsSync(other));
  const stamp=fs.statSync(path.join(prefs,'layout.json')).mtimeMs;run(installed,['export',home]);assert.equal(fs.statSync(path.join(prefs,'layout.json')).mtimeMs,stamp);
  fs.rmSync(prefs,{recursive:true,force:true});assert.deepEqual(tree(home),before,'Export only writes private snapshots.');
  for(const args of [[],['export'],['import',home],['export',home,'extra']]){run(installed,args,/export-only/);assert.deepEqual(tree(home),before);}
  const refusal=(mutate,match)=>{
    mutate();const current=tree(home);run(installed,['export',home],match);assert.deepEqual(tree(home),current);
    for(const [rel,bytes]of Object.entries(before))write(path.join(home,rel),Buffer.from(bytes,'base64'));
  };
  refusal(()=>save(sidecar,{version:1,overrides:{terminal_padding:[100,100]}}),/padding/);
  refusal(()=>{const value=json(state);delete value.layoutBase;save(state,value);},/recorded deployment layout base/);
  refusal(()=>write(path.join(home,'themes/custom-palette.json'),'conflict'),/externally edited/);
  refusal(()=>save(path.join(home,'shared.json'),{'custom.profiles:null':{version:1,overrides:{},custom:[{key:'fixture',command:'a1',args:'--token secret'}]}}),/credential/);
  const bare=path.join(temp,'bare');save(path.join(bare,'shared.json'),shared);run(installed,['export',bare]);
  assert.deepEqual(Object.keys(tree(path.join(bare,'preferences'))),['fixture-host.json']);
  const scripts=path.join(home,'.customizations/runtime/scripts');
  assert.ok(!fs.existsSync(path.join(scripts,'build.mjs')));
  for(const rel of ['export-preferences.mjs','runtime/preferences.mjs','runtime/settings-sections.js','layout-preferences.mjs','files.mjs'])assert.doesNotMatch(fs.readFileSync(path.join(scripts,rel),'utf8'),/from\s+['"][^'"]*(?:\/src\/|build\.mjs)/);
  console.log('PASS: installed full export parity, source absent, explicit home, no-op, unsupported actions, safety refusals and unchanged live state.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
