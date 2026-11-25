// Real reviewed #65 palette, managed old payload, migration -> rollback -> reinstall.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {build} from '../tools/build.mjs';
import {deploy} from '../tools/deploy.mjs';
import {rollback} from '../tools/rollback.mjs';
import {digest} from '../tools/files.mjs';
import {framePatch,inspectFramePatch} from '../tools/runtime/frame-patch.mjs';
import {paletteReceiptPath} from '../tools/palette-recovery.mjs';
import {seedPaletteSdk,mockPaletteExecutable} from './support/palette-host.mjs';
const {output}=build(),temp=fs.mkdtempSync(path.resolve('.artifacts/palette-rollback-')),restoreHost=mockPaletteExecutable(temp);
const put=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
const raw=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
const stockKeys='{"global":{"ctrl-shift-p":"app.palette","f9":"app.help"},"layout:Custom":{"ctrl-shift-w":"custom-tabs.close-tab"}}\n';
try{
 // Previous managed fixture: actual #65 openers/startup worker and native patch;
 // current unrelated/shared files are retained, not claimed a full historical build.
 const previous=path.join(temp,'previous');fs.cpSync(output,previous,{recursive:true});
 const manifest=JSON.parse(raw(path.join(previous,'bundle.json')));
 const legacyHashes={'chrome.js':'3295bb7e41aae5d74fb183356d588cac3a83a90c2979d36ca983d01bef80f465','status.js':'fea79bee121f0ffffbb04653f2aaa66c12d6ff417d664cd14667dc46c2b21f06','startup-frames.mjs':'b89d27a9d83a807abcd996b26059020d01b53c9c0c41b0964dc93bb0055cfd8a'};
 for(const rel of Object.keys(manifest.files))if(rel.startsWith('mods/custom-palette/')||/^mods\/custom-workspace-chrome\/palette-/.test(rel))delete manifest.files[rel];
 for(const [rel,name]of [['mods/custom-workspace-chrome/main.js','chrome.js'],['mods/custom-workspace-status/main.js','status.js'],['.customizations/runtime/scripts/startup-frames.mjs','startup-frames.mjs']]){
  const entry=manifest.files[rel],bytes=fs.readFileSync(`tests/fixtures/palette/legacy-0.1.18/${name}`);assert.equal(digest(bytes),legacyHashes[name]);put(path.join(previous,entry.from??rel),bytes);entry.hash=digest(bytes);
 }
 put(path.join(previous,'bundle.json'),JSON.stringify(manifest,null,2)+'\n');
 function oldInstall(label,version='0.1.18-windows'){
  const home=path.join(temp,label),native=fs.readFileSync(`src/integration/native-patches/palette/original-${version}.js`),feedback=fs.readFileSync('src/integration/native-patches/feedback/original.js');
  seedPaletteSdk(home,version.replace('-windows',''));put(path.join(home,'keys.json'),stockKeys);put(path.join(home,'.migration-fixture'),'1');
  fs.writeFileSync(process.env.HERDR_APP_BIN,Buffer.concat([native,feedback]));deploy(previous,home);
  put(path.join(home,'frame/palette/main.js'),native);framePatch('apply',home,previous,'palette',{binary:native});
  put(path.join(home,'frame/feedback/main.js'),feedback);framePatch('apply',home,previous,'feedback',{binary:feedback});
  return {home,native,feedbackRecord:raw(path.join(home,'.customizations/frame-feedback.json'))};
 }
 const assertNative=(home,native)=>{assert.ok(raw(path.join(home,'.customizations/frame-palette.json')));const result=inspectFramePatch(home,path.join(home,'.customizations/runtime'),'palette',{binary:native});assert.equal(result.status,'ready');assert.equal(result.active,true);};
 function assertPrevious({home,native,feedbackRecord}){
  assert.equal(raw(path.join(home,'keys.json')),stockKeys);assert.equal(raw(path.join(home,'.customizations/palette-binding.json')),null);
  assert.equal(fs.existsSync(path.join(home,'mods/custom-palette/main.js')),false);assert.equal(raw(path.join(home,'.customizations/palette-retired.json')),null);
  assert.match(raw(path.join(home,'mods/custom-workspace-status/main.js')),/run\("app\.palette"\)/);
  assert.doesNotMatch(raw(path.join(home,'mods/custom-workspace-chrome/main.js')),/initPalettePolicy/);
  assertNative(home,native);assert.equal(raw(path.join(home,'.customizations/frame-feedback.json')),feedbackRecord);
 }
 for(const version of ['0.1.17','0.1.18','0.1.18-windows']){
  const old=oldInstall(version,version),{home,native}=old,recordBefore=raw(path.join(home,'.customizations/frame-palette.json'));
  const installed=deploy(output,home);assert.ok(installed.backup);assert.equal(installed.patches.frames.palette.status,'retired');
  assert.equal(JSON.parse(raw(path.join(home,'keys.json')))['layout:Custom']['ctrl-shift-p'],'mod.open:custom-palette');
  assert.equal(raw(path.join(home,'.customizations/frame-palette.json')),null);assert.deepEqual(fs.readFileSync(path.join(home,'frame/palette/main.js')),native);
  const journal=JSON.parse(raw(path.join(home,`.customizations/backups/${installed.backup}/rollback.json`)));
  assert.equal(journal.paletteRetirement.record,recordBefore);assert.ok(fs.existsSync(path.join(home,paletteReceiptPath(journal.paletteRetirement,journal.afterManifest))));
  const result=rollback(home,installed.backup,{fixture:true});assert.equal(result.paletteRecovery.refreshed,true);assertPrevious(old);
  // A host restart rewrites the frame; restored old chrome/worker must still
  // refresh the prior opt-in rather than silently reverting to vanilla.
  fs.rmSync(path.join(home,'frame/palette'),{recursive:true,force:true});put(path.join(home,'frame/palette/main.js'),native);
  const startup=JSON.parse(cp.execFileSync(process.execPath,[path.join(home,'.customizations/runtime/scripts/startup-frames.mjs'),home],{encoding:'utf8'}));assert.equal(startup.frames.palette.ok,true);assertNative(home,native);
  const reinstalled=deploy(output,home);assert.equal(reinstalled.palette.ok,true);assert.equal(reinstalled.patches.frames.palette.status,'retired');assert.ok(fs.existsSync(path.join(home,'mods/custom-palette/main.js')));
  assert.equal(JSON.parse(raw(path.join(home,'keys.json')))['layout:Custom']['ctrl-shift-p'],'mod.open:custom-palette');assert.equal(raw(path.join(home,'.customizations/frame-palette.json')),null);
  assert.equal(raw(path.join(home,'.customizations/frame-feedback.json')),old.feedbackRecord);
 }
 // A prior explicit opt-in without a managed payload uses the current guarded
 // worker before first-install rollback removes that worker's runtime files.
 const unmanaged=path.join(temp,'unmanaged'),unmanagedNative=fs.readFileSync('src/integration/native-patches/palette/original-0.1.18-windows.js');
 seedPaletteSdk(unmanaged);put(path.join(unmanaged,'keys.json'),stockKeys);put(path.join(unmanaged,'.migration-fixture'),'1');fs.writeFileSync(process.env.HERDR_APP_BIN,unmanagedNative);
 put(path.join(unmanaged,'frame/palette/main.js'),unmanagedNative);framePatch('apply',unmanaged,output,'palette',{binary:unmanagedNative});
 const first=deploy(output,unmanaged);assert.equal(rollback(unmanaged,first.backup,{fixture:true}).paletteRecovery.refreshed,true);
 assert.equal(raw(path.join(unmanaged,'keys.json')),stockKeys);assert.equal(raw(path.join(unmanaged,'.customizations/manifest.json')),null);
 assert.equal(inspectFramePatch(unmanaged,output,'palette',{binary:unmanagedNative}).active,true);
 // Later personal edits refuse before changing installed payload, binding or intent.
 const personal=oldInstall('personal'),installed=deploy(output,personal.home),main=path.join(personal.home,'frame/palette/main.js');
 put(main,'// personal or newer unknown stock');const before={keys:raw(path.join(personal.home,'keys.json')),manifest:raw(path.join(personal.home,'.customizations/manifest.json'))};
 assert.throws(()=>rollback(personal.home,installed.backup,{fixture:true}),/palette edit/);assert.equal(raw(main),'// personal or newer unknown stock');assert.equal(raw(path.join(personal.home,'keys.json')),before.keys);assert.equal(raw(path.join(personal.home,'.customizations/manifest.json')),before.manifest);
 put(main,personal.native);const marker=path.join(personal.home,'.customizations/palette-retired.json'),markerBefore=raw(marker);put(marker,'personal marker');
 assert.throws(()=>rollback(personal.home,installed.backup,{fixture:true}),/ownership changed/);assert.equal(raw(marker),'personal marker');put(marker,markerBefore);
 assert.equal(rollback(personal.home,installed.backup,{fixture:true}).paletteRecovery.refreshed,true);assertPrevious(personal);
 // A partially completed retirement (opt-in removed, marker write fails) remains
 // recoverable from its prepared receipt without replaying an old native image.
 const partial=oldInstall('interrupted'),fault=path.join(temp,'marker-fault.cjs'),options=process.env.NODE_OPTIONS;
 put(fault,`const fs=require('node:fs'),rename=fs.renameSync;fs.renameSync=function(a,b){if(b===${JSON.stringify(path.join(partial.home,'.customizations/palette-retired.json'))})throw Error('synthetic marker failure');return rename(a,b);};`);
 let partialInstall;process.env.NODE_OPTIONS=`${options} --require ${JSON.stringify(fault.replaceAll('\\','/'))}`;
 try{partialInstall=deploy(output,partial.home);}finally{process.env.NODE_OPTIONS=options;}
 assert.equal(partialInstall.patches.frames.palette.ok,false);assert.equal(raw(path.join(partial.home,'.customizations/frame-palette.json')),null);
 assert.equal(rollback(partial.home,partialInstall.backup,{fixture:true}).paletteRecovery.refreshed,true);assertPrevious(partial);
 console.log('PASS migration rollback: actual #65 palette/legacy openers, 0.1.17/18 LF/Windows, guarded opt-in recovery, restart continuity, reinstall, personal-edit refusal and interrupted retirement');
}finally{restoreHost();fs.rmSync(temp,{recursive:true,force:true});}
