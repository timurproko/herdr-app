import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { ownershipReport } from '../tools/report-ownership.mjs';
const home=fs.mkdtempSync(path.join(os.tmpdir(),'custom ownership '));
const put=(rel,text='')=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
try{
 put('.customizations/manifest.json',JSON.stringify({version:2,files:{'mods/custom-good/main.js':'hash'}}));
 put('.customizations/runtime/frame-patches/registry.json',JSON.stringify({version:1,patches:[{id:'palette',target:'frame/palette'}]}));
 put('installed.json',JSON.stringify({agents:{'main.js':'host-hash'},'layout:main':{}}));
 put('.customizations/frame-palette.json','{}');put('shared.json',JSON.stringify({'custom.new':true}));put('shared.json.tmp.1.0','');
 for(const name of ['custom-good','custom-stray','agents','personal-panel','confirm-edited-2','retired-panel'])fs.mkdirSync(path.join(home,'mods',name),{recursive:true});
 put('mods/custom-good/main.js','owned');put('mods/custom-good/gpui-kit.d.ts','generated');put('mods/custom-good/unknown.txt','unknown');
 const r=ownershipReport(home);
 assert.deepEqual(r.mods.customOwned,['custom-good']);assert.deepEqual(r.mods.customUnowned,['custom-stray']);assert.deepEqual(r.mods.hostCatalog,['agents']);assert.deepEqual(r.mods.unknown,['personal-panel','retired-panel']);assert.deepEqual(r.mods.recovery,['confirm-edited-2']);
 assert.deepEqual(r.missingMods,[]);assert.deepEqual(r.customFiles.hostGenerated,['mods/custom-good/gpui-kit.d.ts']);assert.deepEqual(r.customFiles.unknown,['mods/custom-good/unknown.txt']);assert.equal(r.nativePatches[0].optedIn,true);assert.deepEqual(r.staleTemps,['shared.json.tmp.1.0']);assert.equal(r.healthy,false);
 console.log('PASS: ownership report distinguishes installed Custom output, host mods/generated declarations, recovery, unknown files and stale temps');
}finally{fs.rmSync(home,{recursive:true,force:true});}
