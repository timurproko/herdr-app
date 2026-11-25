// Regressions for the three palette-0118 review findings. Disposable homes only.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from '../tools/build.mjs';
import {deploy} from '../tools/deploy.mjs';
import {framePatch} from '../tools/runtime/frame-patch.mjs';
import {retirePalette} from '../tools/runtime/retire-palette.mjs';
import {guardPaletteHome,installPalettePolicy,paletteInstallPlan} from '../tools/runtime/palette-policy.mjs';
import {planBinding,restoreBinding,reconcileBinding,normalizeKeystroke,PALETTE_ACTION} from '../src/features/palette/binding.js';
import {seedPaletteSdk,mockPaletteExecutable,paletteHostFacts,paletteGpui} from './support/palette-host.mjs';
const {output}=build(),temp=fs.mkdtempSync(path.resolve('.artifacts/palette-review-')),restoreHost=mockPaletteExecutable(temp);
const stock='{"global":{"ctrl-shift-p":"app.palette","f9":"app.help"}}';
const native=fs.readFileSync('src/integration/native-patches/palette/original-0.1.18-windows.js');
const put=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
const read=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
const snapshot=home=>Object.fromEntries(fs.readdirSync(home,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath,e.name);return [path.relative(home,file),fs.readFileSync(file).toString('base64')];}));
function staged(name,{sdk=true}={}){
 const home=path.join(temp,name);put(path.join(home,'keys.json'),stock);if(sdk)seedPaletteSdk(home);
 put(path.join(home,'frame/palette/main.js'),native);framePatch('apply',home,output,'palette',{binary:native});
 deploy(output,home,{repair:false});return home;
}
try{
 fs.writeFileSync(process.env.HERDR_APP_BIN,native);
 // (1) Initialized-but-incapable homes never switch routing, ownership or native
 // management, whether called directly or by the real deployment preflight CLI.
 const home=staged('missing-ui'),gpui=path.join(home,'gpui-kit.d.ts');put(gpui,paletteGpui.replace('VirtualListScrollHandle','RemovedScrollHandle'));
 const before=snapshot(home);
 await assert.rejects(installPalettePolicy(home),/GPUI VirtualListScrollHandle/);
 assert.throws(()=>paletteInstallPlan(home),/GPUI VirtualListScrollHandle/);
 assert.throws(()=>deploy(output,home),/VirtualListScrollHandle/);
 assert.deepEqual(snapshot(home),before,'Rejected preflight leaves payload/keys/record/native patch unchanged');
 put(gpui,paletteGpui);await installPalettePolicy(home);put(gpui,paletteGpui.replace('VirtualListScrollHandle','RemovedScrollHandle'));
 const retirementBefore=snapshot(home);assert.throws(()=>retirePalette(home,output),/GPUI VirtualListScrollHandle/);assert.deepEqual(snapshot(home),retirementBefore);
 put(gpui,paletteGpui);
 const declarations=path.join(home,'herdr.d.ts'),sdk=read(declarations);
 put(declarations,sdk.replace('export function writeTextFile(','export function removedWriteTextFile('));
 await assert.rejects(installPalettePolicy(home),/API writeTextFile/);put(declarations,sdk);
 const commands=paletteHostFacts.commands,version=paletteHostFacts.version;
 try{paletteHostFacts.commands=[];await assert.rejects(installPalettePolicy(home),/command mod.open/);
  paletteHostFacts.commands=commands;paletteHostFacts.version='0.1.1';await assert.rejects(installPalettePolicy(home),/requires Herdr/);
 }finally{paletteHostFacts.commands=commands;paletteHostFacts.version=version;}
 const empty=staged('uninitialized',{sdk:false}),emptyBefore=snapshot(empty);
 assert.equal((await installPalettePolicy(empty)).deferred,true);assert.deepEqual(snapshot(empty),emptyBefore);
 // Even an existing migration intent cannot authorize retirement without facts.
 put(path.join(empty,'.customizations/palette-binding.json'),read(path.join(home,'.customizations/palette-binding.json')));
 const emptyRetire=snapshot(empty);assert.equal(retirePalette(empty,output).deferred,true);assert.deepEqual(snapshot(empty),emptyRetire);
 put(path.join(empty,'herdr.d.ts'),sdk);await assert.rejects(installPalettePolicy(empty),/GPUI/,'Only both missing SDKs mean an uninitialized home');
 // (2) Actual GPUI spellings/aliases, including implicit Shift on an ASCII cap.
 const spellings=['shift-ctrl-p','SHIFT-CTRL-p','ctrl-P','shift-secondary-p','secondary-shift-p','ctrl-shift-ctrl-p',' shift-ctrl-p ','\tctrl-P '];
 for(const spelling of spellings){
  assert.equal(normalizeKeystroke(spelling),'ctrl-shift-p');
  for(const scope of ['terminal','mod:editor','global','layout:Custom']){
   const text=JSON.stringify({[scope]:{[spelling]:scope==='terminal'?'terminal':'personal.action'}});
   assert.throws(()=>planBinding(text,null,{install:true}),/conflict/);
   let writes=0;await assert.rejects(reconcileBinding({guard:async()=>{},read:async rel=>rel==='keys.json'?text:null,write:async()=>{writes++;},defaults:()=>({})},{install:true}),/conflict/);assert.equal(writes,0);
  }
  const original=JSON.stringify({'layout:Custom':{[spelling]:'app.palette','f8':'app.help'}}),plan=planBinding(original,null,{install:true});
  const custom=JSON.parse(plan.keys)['layout:Custom'];assert.equal(custom['ctrl-shift-p'],PALETTE_ACTION);assert.equal(Object.keys(custom).filter(k=>normalizeKeystroke(k)==='ctrl-shift-p').length,1);
  assert.deepEqual(JSON.parse(restoreBinding(plan.keys,plan.record)),JSON.parse(original),'Alias baseline is restored, not discarded');
  const duplicate=JSON.stringify({'layout:Custom':{'ctrl-shift-p':PALETTE_ACTION,[spelling]:'personal.action'}});
  if(spelling!=='ctrl-shift-p')assert.throws(()=>planBinding(duplicate,plan.record),/Personal/);
 }
 assert.equal(normalizeKeystroke('secondary-shift-p','macos'),'shift-platform-p');
 assert.equal(normalizeKeystroke('cmd-shift-p'),normalizeKeystroke('win-shift-p'));
 assert.equal(normalizeKeystroke('super-shift-p'),normalizeKeystroke('cmd-shift-p'));
 assert.notEqual(normalizeKeystroke('cmd-shift-p'),'ctrl-shift-p');
 // (3) A non-replaceable log is diagnostic only, including the real child worker
 // path used by full Update. Keys/ownership succeed, then actual #65 is retired.
 const logging=staged('logging'),log=path.join(logging,'.customizations/palette.log');put(log,'existing diagnostic\n');
 const fault=path.join(temp,'log-fault.cjs'),nodeOptions=process.env.NODE_OPTIONS;
 put(fault,`const fs=require('node:fs'),rename=fs.renameSync;fs.renameSync=function(from,to){if(to===${JSON.stringify(log)}){const e=Error('synthetic non-replaceable log');e.code='EACCES';throw e;}return rename(from,to);};`);
 process.env.NODE_OPTIONS=`${nodeOptions} --require ${JSON.stringify(fault.replaceAll('\\','/'))}`;
 try{
  const result=deploy(output,logging);assert.equal(result.palette.ok,true);assert.equal(result.palette.logUnavailable,true);assert.equal(result.patches.frames.palette.status,'retired');
  assert.equal(JSON.parse(read(path.join(logging,'keys.json')))['layout:Custom']['ctrl-shift-p'],PALETTE_ACTION);
  assert.equal(read(path.join(logging,'.customizations/frame-palette.json')),null);assert.deepEqual(fs.readFileSync(path.join(logging,'frame/palette/main.js')),native);assert.equal(read(log),'existing diagnostic\n');
 }finally{process.env.NODE_OPTIONS=nodeOptions;}
 // A directory/unreadable log must also bypass logging's guard/read failures.
 const directory=staged('log-directory');fs.mkdirSync(path.join(directory,'.customizations/palette.log'));
 const logged=await installPalettePolicy(directory);assert.equal(logged.ok,true);assert.equal(logged.logUnavailable,true);assert.equal(guardPaletteHome(directory).ok,true);assert.equal(guardPaletteHome(directory).logUnavailable,true,'Unsafe/unusable logs do not become routing failures');
 console.log('PASS palette review: real install/retirement capability gates, uninitialized deferral, equivalent key spellings/alias rollback, nonfatal logs and actual merged stop-gap Update migration');
}finally{restoreHost();fs.rmSync(temp,{recursive:true,force:true});}
