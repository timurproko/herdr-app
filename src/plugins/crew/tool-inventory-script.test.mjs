import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {spawnSync} from 'node:child_process';
import {loadMod} from '../../../tools/plugin-harness.mjs';
const {script,plugin}=await loadMod({host:{},entry:"export {toolInventoryScript as script,default as plugin} from './plugins/crew/plugin.js';"});
const shell=process.platform==='win32'?'powershell.exe':'pwsh';
if(spawnSync(shell,['-NoProfile','-NonInteractive','-Command','exit 0']).status!==0){
 console.log('SKIP real PowerShell inventory fixture: PowerShell unavailable; portable provider/registry matrix still runs');
}else{
 const root=fs.mkdtempSync(path.join(process.env.FLEET_TEST_ROOT||os.tmpdir(),'crew-inventory-'));
 try{
  const settings=path.join(root,'.claude','settings.json');fs.mkdirSync(path.dirname(settings));
  const ids=Array.from(plugin.prerequisites.filter(pre=>pre.versionTool),pre=>pre.versionTool).sort();
  const stubs=["$env:PROCESSOR_ARCHITECTURE='AMD64'",'function FixtureVersion { "v100.0.0" }',
   'function Get-Command { [CmdletBinding()] param([string]$Name) $ExecutionContext.InvokeCommand.GetCommand("FixtureVersion", "Function") }'];
  const scenarios=[['absent',null],['malformed','{broken fixture json'],['empty',''],['null','null'],['scalar','12'],['string','"fixture"'],['array','[]'],
   ['hooks-shape','{"hooks":42}'],['session-shape','{"hooks":{"SessionStart":{}}}'],
   ['groups-shape','{"hooks":{"SessionStart":[null,3,{"hooks":42},{"hooks":[null,{"command":1},{"command":{}}]}]}}'],
   ['valid',JSON.stringify({hooks:{SessionStart:[{hooks:['gh-axi','chrome-devtools-axi','lavish-axi'].map(id=>({command:id+' setup hooks'}))}]}})],
   ['unreadable','{}'],['missing-tool','{}']];
  for(const [name,content]of scenarios){
   if(content===null)fs.rmSync(settings,{force:true});else fs.writeFileSync(settings,content);
   const extra=name==='unreadable'?'function Get-Content { [CmdletBinding()] param([string]$LiteralPath,[switch]$Raw) throw "fixture access denied" }'
    :name==='missing-tool'?'function Get-Command { [CmdletBinding()] param([string]$Name) if($Name -ne "tasks-axi") { $ExecutionContext.InvokeCommand.GetCommand("FixtureVersion", "Function") } }':'';
   const file=path.join(root,'inventory.ps1');fs.writeFileSync(file,[...stubs,extra,script()].join('\n'));
   const child=spawnSync(shell,['-NoProfile','-NonInteractive','-File',file],{env:{...process.env,USERPROFILE:root},encoding:'utf8',timeout:30000});
   assert.equal(child.status,0,name+': '+child.stderr);const result=JSON.parse(child.stdout.replace(/^\uFEFF/,''));
   assert.deepEqual(Object.keys(result.tools).sort(),ids,name+' emits every declared tool');
   assert.equal(result.platform.windows,true);assert.equal(result.platform.arch,'AMD64');
   for(const id of ids){const r=result.tools[id];assert.equal(r.code,name==='missing-tool'&&id==='tasks-axi'?127:0);assert.equal(r.missing,name==='missing-tool'&&id==='tasks-axi');}
   assert.deepEqual(result.hooks,name==='valid'?['gh-axi','chrome-devtools-axi','lavish-axi']:[],name);
   if(name==='malformed'||name==='unreadable')assert.match(result.hooksIssue,/Could not read Claude Code hook settings/);
   assert.ok(!JSON.stringify(result).includes('fixture access denied'),'Raw optional read errors are not exposed');
  }
  console.log('PASS real PowerShell batch in disposable home: malformed/unreadable/absent/empty/scalar/array/schema-varied hook settings and one missing tool cannot fail tool/platform inventory');
 }finally{fs.rmSync(root,{recursive:true,force:true});}
}
