import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import assert from 'node:assert/strict';
import {terminalInput} from './terminal-input.mjs';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'terminal-input-'));
try {
  const keys=JSON.stringify({global:{'alt-t':'tab.new'},terminal:{'ctrl-shift-c':'terminal.copy','ctrl-v':'terminal.paste_image','ctrl-r':'terminal'}});
  const settings=JSON.stringify({zoom:1.3,minimum_contrast:1,colors:{accent:'#123456'}});
  fs.writeFileSync(path.join(home,'keys.json'),keys);fs.writeFileSync(path.join(home,'settings.json'),settings);
  terminalInput('apply',home);terminalInput('check',home);
  const configured=JSON.parse(fs.readFileSync(path.join(home,'keys.json'),'utf8'));
  assert.equal(configured.terminal['ctrl-c'],'custom-workspace-status.copy');assert.equal(configured.terminal['ctrl-v'],'terminal.paste');assert.equal(configured.terminal['ctrl-c ctrl-c'],'send:\u0003\u0003');
  assert.equal(configured.terminal['ctrl-shift-c'],'terminal.copy');assert.equal(configured.terminal['ctrl-r'],'terminal');assert.deepEqual(configured.global,JSON.parse(keys).global);
  assert.equal(fs.readFileSync(path.join(home,'settings.json'),'utf8'),settings,'Default opt-in does not change colors');
  terminalInput('apply',home,{selection:true});terminalInput('check',home);
  const adjusted=JSON.parse(fs.readFileSync(path.join(home,'settings.json'),'utf8'));assert.equal(adjusted.zoom,1.3);assert.equal(adjusted.colors.accent,'#123456');assert.equal(adjusted.colors.selection,'#ffffff');assert.equal(adjusted.minimum_contrast,4.5);
  fs.writeFileSync(path.join(home,'keys.json'),'personal later edit');assert.throws(()=>terminalInput('restore',home),/Personal conflict/);assert.equal(JSON.parse(fs.readFileSync(path.join(home,'settings.json'),'utf8')).minimum_contrast,4.5,'Restore preflights all files');
  const record=JSON.parse(fs.readFileSync(path.join(home,'.customizations/terminal-input.json'),'utf8'));fs.writeFileSync(path.join(home,'keys.json'),record.files['keys.json'].installed);
  terminalInput('restore',home);assert.equal(fs.readFileSync(path.join(home,'keys.json'),'utf8'),keys);assert.equal(fs.readFileSync(path.join(home,'settings.json'),'utf8'),settings);
  console.log('PASS: explicit terminal clipboard/double-interrupt preferences, unrelated bindings/settings preserved, backups, conflicts and exact restoration');
} finally {fs.rmSync(home,{recursive:true,force:true});}
