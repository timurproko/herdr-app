import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build} from '../tools/build.mjs';
import {seedPaletteSdk,mockPaletteExecutable} from './support/palette-host.mjs';
import {deploy} from '../tools/deploy.mjs';
import {installPalettePolicy} from '../tools/runtime/palette-policy.mjs';
import {retirePalette} from '../tools/runtime/retire-palette.mjs';
import {framePatch} from '../tools/runtime/frame-patch.mjs';
import {restoreStartupFrames} from '../tools/runtime/startup-frames.mjs';
const {output}=build(),temp=fs.mkdtempSync(path.resolve('.artifacts/palette-retirement-'));
const restoreHost=mockPaletteExecutable(temp);
const put=(file,value)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,value);};
const raw=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
const snapshot=dir=>Object.fromEntries(fs.readdirSync(dir,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath,e.name);return [path.relative(dir,file),raw(file)];}));
try{
 const root=output;
 // Actual merged #65 payload/originals, not a synthetic future replacement.
 const registry=JSON.parse(raw(path.join(root,'frame-patches/registry.json'))),palette=registry.patches.find(p=>p.id==='palette');
 const futureMain='frame-patches/palette/main-0.1.18.js';
 for(const version of ['0.1.17','0.1.17-windows','0.1.18','0.1.18-windows'])for(const reset of [false,true]){
  const home=path.join(temp,`${version}-${reset}`),native=fs.readFileSync(`src/integration/native-patches/palette/original-${version}.js`);
  const main=path.join(home,'frame/palette/main.js'),record=path.join(home,'.customizations/frame-palette.json');
  put(main,native);framePatch('apply',home,root,'palette',{binary:native});const legacy=raw(record);
  const feedback=fs.readFileSync('src/integration/native-patches/feedback/original.js');put(path.join(home,'frame/feedback/main.js'),feedback);framePatch('apply',home,root,'feedback',{binary:feedback});
  const feedbackBefore=snapshot(path.join(home,'frame/feedback')),feedbackRecord=raw(path.join(home,'.customizations/frame-feedback.json'));
  seedPaletteSdk(home,version.replace('-windows',''));put(path.join(home,'keys.json'),'{"global":{"ctrl-shift-p":"app.palette"}}');
  fs.writeFileSync(process.env.HERDR_APP_BIN,Buffer.concat([native,feedback]));
  if(reset)put(main,native);
  const installed=deploy(output,home);
  assert.equal(installed.palette.ok,true);assert.equal(installed.patches.frames.palette.status,'retired','Normal full Update migrates the actual merged stop-gap');
  const result=retirePalette(home,root,{binary:native});assert.equal(result.ok,true);assert.equal(raw(record),null);assert.deepEqual(fs.readFileSync(main),native,'retirement restores current release, never old backup');
  assert.deepEqual(snapshot(path.join(home,'frame/feedback')),feedbackBefore);assert.equal(raw(path.join(home,'.customizations/frame-feedback.json')),feedbackRecord);
  assert.equal(retirePalette(home,root,{binary:native}).ok,true);
  assert.throws(()=>framePatch('apply',home,root,'palette',{binary:native}),/retired/);
  // A late pre-retirement package/record is tolerated and retired again.
  put(record,legacy);for(const [name,source]of Object.entries(palette.files))put(path.join(home,palette.target,name),fs.readFileSync(path.join(root,name==='main.js'?(version.startsWith('0.1.18')?futureMain:'frame-patches/palette/main-0.1.17.js'):source)));
  assert.equal(retirePalette(home,root,{binary:native}).ok,true);assert.deepEqual(fs.readFileSync(main),native);
 }
 const setup=async name=>{
  const home=path.join(temp,name),native=fs.readFileSync('src/integration/native-patches/palette/original-0.1.17.js');put(path.join(home,'frame/palette/main.js'),native);framePatch('apply',home,output,'palette',{binary:native});seedPaletteSdk(home);put(path.join(home,'keys.json'),'{"global":{"ctrl-shift-p":"app.palette"}}');deploy(output,home,{repair:false});await installPalettePolicy(home);return {home,native};
 };
 const {home,native}=await setup('unknown-stock');put(path.join(home,'frame/palette/main.js'),'// unknown newer stock OR personal target');const before=snapshot(path.join(home,'frame/palette'));
 const preserved=retirePalette(home,output,{binary:Buffer.from('unknown')});assert.equal(preserved.preservedNativeFiles,true);assert.deepEqual(snapshot(path.join(home,'frame/palette')),before);assert.equal(raw(path.join(home,'.customizations/frame-palette.json')),null);
 const masked=await setup('masked-unknown');const maskedBefore=snapshot(path.join(masked.home,'frame/palette'));
 const deferred=retirePalette(masked.home,output,{binary:Buffer.from('unknown')});assert.equal(deferred.ok,false);assert.equal(deferred.status,'retirement-deferred');assert.deepEqual(snapshot(path.join(masked.home,'frame/palette')),maskedBefore);
 // Automatic startup never reapplies a palette once owned intent exists, even
 // when retirement is deferred by native provenance. Feedback remains independent.
 const startup=restoreStartupFrames(masked.home,output,{binary:Buffer.from('unknown')});assert.equal(startup.frames.palette.status,'retirement-deferred');assert.deepEqual(snapshot(path.join(masked.home,'frame/palette')),maskedBefore);
 const conflict=await setup('helper-conflict');put(path.join(conflict.home,'frame/palette/custom-ui.js'),'personal');const conflictBefore=snapshot(conflict.home);assert.throws(()=>retirePalette(conflict.home,output,{binary:conflict.native}),/conflict|edit/);assert.deepEqual(snapshot(conflict.home),conflictBefore);
 const corrupt=await setup('corrupt');put(path.join(corrupt.home,'.customizations/frame-palette.json'),'{"version":99}');const corruptBefore=snapshot(corrupt.home);assert.throws(()=>retirePalette(corrupt.home,output,{binary:corrupt.native}),/Unrecognized/);assert.deepEqual(snapshot(corrupt.home),corruptBefore);
 console.log('PASS retirement: real 0.1.17/18 stock, both landing orders, masked/reset originals, late legacy replay, exact restore, feedback preservation, unknown-target archives and fail-closed conflicts/provenance');
}finally{restoreHost();fs.rmSync(temp,{recursive:true,force:true});}
