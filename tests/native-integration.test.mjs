import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {build,project} from '../tools/build.mjs';
import {deploy,doctor} from '../tools/deploy.mjs';
import {framePatch,inspectFramePatch} from '../tools/runtime/frame-patch.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
import {seedNativeSDK,fileSnapshot} from './frame-fixture.mjs';
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
 // Valid helpers of another generation never mask personal edits to active dependencies.
 const state=JSON.parse(fs.readFileSync(path.join(home,'.customizations/frame-feedback.json')));const dep=path.join(home,'frame/feedback',state.generation,'custom-ui.js'),owned=fs.readFileSync(dep);put(dep,'personal');assert.equal(restoreStartupFrames(home,runtime).ok,false);assert.equal(doctor(home).ok,false);put(dep,owned);
 // Restore on changed stock uses latest proven raw source, not the 0.1.16 backup.
 put(exe,binary(future));for(const p of registry){framePatch('restore',home,runtime,p.id);assert.equal(fs.readFileSync(path.join(home,p.target,'main.js'),'utf8'),future[p.id]);assert.equal(fs.existsSync(path.join(home,`.customizations/frame-${p.id}.json`)),false);}
 console.log('PASS full/scoped runtime composition: offline installed workers, upgrades/reset, future actions, concrete advisories, doctor conflicts and current-stock restore');
}finally{if(oldBin===undefined)delete process.env.HERDR_APP_BIN;else process.env.HERDR_APP_BIN=oldBin;fs.rmSync(temp,{recursive:true,force:true});}
