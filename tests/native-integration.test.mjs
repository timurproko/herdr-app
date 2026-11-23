import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {build,project} from '../tools/build.mjs';
import {deploy,doctor,remove} from '../tools/deploy.mjs';
import {framePatch,inspectFramePatch} from '../tools/runtime/frame-patch.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
import {seedNativeSDK,fileSnapshot} from './frame-fixture.mjs';
import {nativeRecoveryInventory} from '../tools/runtime/native-recovery.mjs';
import {referenceInputChange} from './native-mutations.mjs';
const {output}=build(),temp=fs.mkdtempSync(path.join(project,'.artifacts/native-integration-'));
const home=path.join(temp,'home'),exe=path.join(temp,'fixture-host.exe');const oldBin=process.env.HERDR_APP_BIN;process.env.HERDR_APP_BIN=exe;
const put=(file,b)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,b);};
const registry=JSON.parse(fs.readFileSync(path.join(output,'frame-patches/registry.json'))).patches;
const sources=v=>Object.fromEntries(registry.map(p=>[p.id,fs.readFileSync(path.join(project,'tests/fixtures/native-stock',v,p.id+'.js'),'utf8')]));
const binary=stock=>Buffer.from(registry.map(p=>`${p.id}/main.js${stock[p.id]}${p.id}/mod.json{}`).join('\0'));
try {
 const stock16=sources('0.1.16'),stock17=sources('0.1.17');put(exe,binary(stock16));fs.mkdirSync(home);deploy(output,home);seedNativeSDK(home,registry);
 const runtime=path.join(home,'.customizations/runtime');
 assert.deepEqual(restoreStartupFrames(home,runtime),{ok:true,frames:{}});
 for(const p of registry){put(path.join(home,p.target,'main.js'),stock16[p.id]);framePatch('apply',home,runtime,p.id);assert.equal(inspectFramePatch(home,runtime,p.id).active,true);}
 assert.equal(doctor(home).ok,true);
 // Owned output masks a new native original; source discovery must rebase from the binary.
 put(exe,binary(stock17));const refreshed=restoreStartupFrames(home,runtime);assert.equal(refreshed.ok,true);
 for(const p of registry){const record=JSON.parse(fs.readFileSync(path.join(home,`.customizations/frame-${p.id}.json`)));assert.equal(Buffer.from(record.original['main.js'],'base64').toString(),stock17[p.id]);}
 const before=Object.fromEntries(registry.map(p=>[p.id,fileSnapshot(path.join(home,p.target))]));assert.equal(restoreStartupFrames(home,runtime).ok,true);for(const p of registry)assert.deepEqual(fileSnapshot(path.join(home,p.target)),before[p.id]);
 // Actual installed worker and parser import closure work without using source files.
 const cli=cp.spawnSync(process.execPath,[path.join(runtime,'scripts/frame-patch.mjs'),'inspect','palette',home],{encoding:'utf8',env:{...process.env,HERDR_APP_HOME:home},timeout:30000});assert.equal(cli.status,0,cli.stderr);assert.equal(JSON.parse(cli.stdout).active,true);
 // Exact native startup reset removes entire generations. Prior opt-ins alone repair.
 for(const p of registry){fs.rmSync(path.join(home,p.target),{recursive:true});put(path.join(home,p.target,'main.js'),stock17[p.id]);}
 assert.equal(deploy(output,home).patches.ok,true);assert.equal(doctor(home).ok,true);
 // Compatible future additions, including source formatting, do not require review membership.
 const future={palette:stock17.palette.replace('const NAMED = [','const NAMED = [\n["app.future", {}, "App", "Future", "future"],'),feedback:stock17.feedback.replace('.child(this.shots_row(t))','.child(this.shots_row(t)).child(div().id("future-action").on_click(() => this.future = true))')};put(exe,binary(future));assert.equal(restoreStartupFrames(home,runtime).ok,true);
 assert.match(fs.readFileSync(path.join(home,'frame/palette/main.js'),'utf8'),/app.future/);assert.match(fs.readFileSync(path.join(home,'frame/feedback/main.js'),'utf8'),/future-action/);
 // An actually missing anchor skips only that patch, with complete bytes unchanged.
 const incompatible={...future,palette:future.palette.replace('go(e) {','activate(e) {')};put(exe,binary(incompatible));const paletteBefore=fileSnapshot(path.join(home,'frame/palette')),recordBefore=fs.readFileSync(path.join(home,'.customizations/frame-palette.json'));
 const skipped=restoreStartupFrames(home,runtime);assert.equal(skipped.ok,true);assert.match(skipped.frames.palette.advisory,/method go/);assert.equal(skipped.frames.feedback.ok,true);assert.deepEqual(fileSnapshot(path.join(home,'frame/palette')),paletteBefore);assert.deepEqual(fs.readFileSync(path.join(home,'.customizations/frame-palette.json')),recordBefore);const diag=doctor(home);assert.equal(diag.ok,true);assert.match(diag.advisories[0],/method go/);
 // A descendant shots_row match does not authorize deleting its new native wrapper/sibling.
 const wrapped={...future,feedback:future.feedback.replace('.child(this.shots_row(t))','.child(h_flex().child(this.shots_row(t)).child(div().id("native-extra").on_click(() => this.nativeExtra = true).child("Native action")))')};
 put(exe,binary(wrapped));const feedbackBefore=fileSnapshot(path.join(home,'frame/feedback')),feedbackRecord=fs.readFileSync(path.join(home,'.customizations/frame-feedback.json'));
 const refused=restoreStartupFrames(home,runtime);assert.equal(refused.ok,true);assert.equal(refused.frames.feedback.status,'skipped');assert.match(refused.frames.feedback.advisory,/feedback attachments: surrounding wrapper\/sibling/);
 assert.deepEqual(fileSnapshot(path.join(home,'frame/feedback')),feedbackBefore);assert.deepEqual(fs.readFileSync(path.join(home,'.customizations/frame-feedback.json')),feedbackRecord);assert.match(doctor(home).advisories[0],/attachments: surrounding/);
 // Valid helpers of another generation never mask personal edits to active dependencies.
 const state=JSON.parse(fs.readFileSync(path.join(home,'.customizations/frame-feedback.json')));const dep=path.join(home,'frame/feedback',state.generation,'custom-ui.js'),owned=fs.readFileSync(dep);put(dep,'personal');assert.equal(restoreStartupFrames(home,runtime).ok,false);assert.equal(doctor(home).ok,false);put(dep,owned);
 // Restore on changed stock uses latest proven raw source, not the 0.1.16 backup.
 put(exe,binary(future));for(const p of registry){framePatch('restore',home,runtime,p.id);assert.equal(fs.readFileSync(path.join(home,p.target,'main.js'),'utf8'),future[p.id]);assert.equal(fs.existsSync(path.join(home,`.customizations/frame-${p.id}.json`)),false);}
 // Disk journals, not opt-in records, drive recovery and read-only doctor discovery.
 const crash=(stage,file)=>{if(stage==='after-write'&&file.endsWith('/main.js')){const e=Error('initial apply crash');e.crash=true;throw e;}};
 for(const p of registry) {
  const stateFile=path.join(home,`.customizations/frame-${p.id}.json`),journal=path.join(home,`.customizations/native-${p.id}.journal.json`),main=path.join(home,p.target,'main.js');
  assert.throws(()=>framePatch('apply',home,runtime,p.id,{fault:crash}),/initial apply crash/);assert.equal(fs.existsSync(stateFile),false);
  assert.equal(doctor(home).patches.find(x=>x.id===p.id).status,'recovery-required');assert.equal(doctor(home).ok,false);
  const registryFile=path.join(runtime,'frame-patches/registry.json'),registryBytes=fs.readFileSync(registryFile);fs.unlinkSync(registryFile);
  try{assert.equal(doctor(home).patches.find(x=>x.id===p.id).status,'recovery-required','Disk-first reporting does not require the runtime registry');}finally{put(registryFile,registryBytes);}
  const recovered=restoreStartupFrames(home,runtime);assert.equal(recovered.ok,true);assert.equal(recovered.frames[p.id].recovered,true);assert.equal(fs.existsSync(stateFile),false);assert.equal(fs.existsSync(journal),false);assert.equal(fs.readFileSync(main,'utf8'),future[p.id]);
  assert.deepEqual(restoreStartupFrames(home,runtime),{ok:true,frames:{}},'Retired recovery backups never create an opt-in');
  framePatch('apply',home,runtime,p.id);
  assert.throws(()=>framePatch('restore',home,runtime,p.id,{fault:(stage,file)=>{if(stage==='after-write'&&file===`.customizations/frame-${p.id}.json`){const e=Error('restore after record deletion');e.crash=true;throw e;}}}),/restore after record deletion/);
  assert.equal(fs.existsSync(stateFile),false);assert.equal(doctor(home).patches.find(x=>x.id===p.id).status,'recovery-required');
  if(p.id==='feedback'){const legacyJournal=JSON.parse(fs.readFileSync(journal));delete legacyJournal.operation;put(journal,JSON.stringify(legacyJournal));}
  const completed=restoreStartupFrames(home,runtime);assert.equal(completed.ok,true);assert.match(completed.frames[p.id].message,/completed interrupted restore/);assert.equal(fs.existsSync(stateFile),false);assert.equal(fs.existsSync(journal),false);assert.equal(fs.readFileSync(main,'utf8'),future[p.id]);
  assert.ok(doctor(home).recoveryBackups.some(x=>x.id===p.id));
 }
 const bare=path.join(temp,'bare-recovery');seedNativeSDK(bare,registry);put(path.join(bare,'frame/palette/main.js'),future.palette);
 assert.throws(()=>framePatch('apply',bare,runtime,'palette',{fault:crash}),/initial apply crash/);assert.equal(doctor(bare).patches[0].status,'recovery-required','Doctor discovers journals even without a deployment manifest');
 assert.equal(restoreStartupFrames(bare,runtime).frames.palette.recovered,true);assert.equal(fs.existsSync(path.join(bare,'.customizations/frame-palette.json')),false);assert.ok(doctor(bare).recoveryBackups.length>0);
 // The harmless extracted change callback is a clear optional incompatibility.
 framePatch('apply',home,runtime,'palette');const refactored={...future,palette:referenceInputChange(future.palette)};put(exe,binary(refactored));put(path.join(home,'frame/palette/main.js'),refactored.palette);
 const beforeRefactor=fileSnapshot(path.join(home,'frame/palette')),beforeRecord=fs.readFileSync(path.join(home,'.customizations/frame-palette.json')),beforeBackups=nativeRecoveryInventory(home).backups;
 const inspection=inspectFramePatch(home,runtime,'palette');assert.equal(inspection.status,'skipped');assert.match(inspection.advisory,/palette input-change callback/);
 assert.equal(restoreStartupFrames(home,runtime).frames.palette.status,'skipped');assert.equal(deploy(output,home).patches.ok,true);assert.match(doctor(home).advisories[0],/input-change callback/);
 assert.deepEqual(fileSnapshot(path.join(home,'frame/palette')),beforeRefactor);assert.deepEqual(fs.readFileSync(path.join(home,'.customizations/frame-palette.json')),beforeRecord);assert.deepEqual(nativeRecoveryInventory(home).backups,beforeBackups);
 framePatch('restore',home,runtime,'palette');put(exe,binary(future));put(path.join(home,'frame/palette/main.js'),future.palette);
 // Removal must settle recordless pending work before deleting its runtime worker.
 assert.throws(()=>framePatch('apply',home,runtime,'palette',{fault:crash}),/initial apply crash/);const execute=cp.execFileSync;
 cp.execFileSync=(command,args,options)=>command===exe&&args[0]==='status'?'{}':execute(command,args,options);
 try{remove(home);}finally{cp.execFileSync=execute;}
 assert.equal(fs.existsSync(path.join(home,'.customizations/native-palette.journal.json')),false);assert.equal(fs.existsSync(path.join(home,'.customizations/frame-palette.json')),false);assert.ok(doctor(home).recoveryBackups.length>0,'Removal retains original recovery evidence');
 console.log('PASS recordless initial-apply/restore recovery, disk-first doctor/removal and callback-refactor advisory composition');
 console.log('PASS full/scoped runtime composition: offline installed workers, upgrades/reset, future actions, concrete advisories, doctor conflicts and current-stock restore');
}finally{if(oldBin===undefined)delete process.env.HERDR_APP_BIN;else process.env.HERDR_APP_BIN=oldBin;fs.rmSync(temp,{recursive:true,force:true});}
