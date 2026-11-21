import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {build,project} from '../tools/build.mjs';
import {deploy,doctor,allowedPath,layoutOverrides,projectLayout} from '../tools/deploy.mjs';
import {rollback} from '../tools/rollback.mjs';
import {digest,json,put} from '../tools/files.mjs';
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'herdr-custom-deploy-')),home=path.join(temp,'home');
const {output}=build();
const hash=p=>digest(fs.readFileSync(p));
try {
 fs.mkdirSync(home);put(path.join(home,'.migration-fixture'),'fixture');
 put(path.join(home,'settings.json'),'{"zoom":1.3}');put(path.join(home,'shared.json'),'{"unrelated":"keep"}');put(path.join(home,'mods/stock/main.js'),'stock');
 const first=deploy(output,home);assert.ok(first.changed>250);assert.ok(doctor(home).ok);
 const file=path.join(home,'mods/custom-tabs/main.js'),stamp=fs.statSync(file,{bigint:true}).mtimeNs;
 const second=deploy(output,home);assert.equal(second.changed,0);assert.equal(fs.statSync(file,{bigint:true}).mtimeNs,stamp);
 assert.equal(fs.readFileSync(path.join(home,'mods/stock/main.js'),'utf8'),'stock');assert.equal(fs.readFileSync(path.join(home,'settings.json'),'utf8'),'{"zoom":1.3}');assert.equal(fs.readFileSync(path.join(home,'shared.json'),'utf8'),'{"unrelated":"keep"}');
 const layoutFile=path.join(home,'layouts/Custom.json'),layout=json(layoutFile);layout.terminal_padding=[7,7];put(layoutFile,JSON.stringify(layout,null,2)+'\n');
 assert.ok(doctor(home).ok,'Permitted personal look values are not ownership drift');
 deploy(output,home);assert.deepEqual(json(layoutFile).terminal_padding,[7,7]);assert.deepEqual(json(path.join(home,'.customizations/layout-preferences.json')).overrides.terminal_padding,[7,7]);
 const original=fs.readFileSync(file);fs.appendFileSync(file,'\n// personal edit');const before=hash(layoutFile);
 assert.throws(()=>deploy(output,home),/Personal file conflict/);assert.equal(hash(layoutFile),before,'Conflict aborts before unrelated writes');assert.ok(!doctor(home).ok);
 fs.writeFileSync(file,original);
 const structure=json(layoutFile);structure.children.reverse();put(layoutFile,JSON.stringify(structure));assert.throws(()=>deploy(output,home),/structure conflict/);put(layoutFile,JSON.stringify(layout,null,2)+'\n');
 for(const rel of ['../keys.json','mods/stock/main.js','keys.json','C:/outside.js','.customizations/../../settings.json','mods/custom-tabs/../../keys.json'])assert.throws(()=>allowedPath(rel));
 assert.throws(()=>projectLayout(layout,{'__proto__.hidden':true}),/Invalid/);
 assert.throws(()=>projectLayout(layout,{terminal_padding:[Infinity,7]}),/padding/);
 // Runtime workers function with no source checkout; a reset is repaired only for prior opt-ins.
 const runtime=path.join(home,'.customizations/runtime');const {framePatch}=await import(new URL('../dist/scripts/frame-patch.mjs',import.meta.url));
 const patch=json(path.join(runtime,'frame-patches/registry.json')).patches[0];const stock=fs.readFileSync(path.join(runtime,patch.originals[0]),'utf8');const main=path.join(home,patch.target,'main.js');put(main,stock);
 framePatch('apply',home,runtime,patch.id);put(main,stock);assert.ok(!doctor(home).ok);assert.equal(deploy(output,home).patches.ok,true);assert.ok(doctor(home).ok);
 put(main,'unknown newer upstream');const unsupported=deploy(output,home);assert.equal(unsupported.patches.ok,false);assert.equal(fs.readFileSync(main,'utf8'),'unknown newer upstream');
 framePatch('restore',home,runtime,patch.id);assert.equal(fs.readFileSync(main,'utf8'),'unknown newer upstream','Restore must not downgrade new stock');
 // Update a disposable bundle, then roll it back without removing preferences.
 const bundle=path.join(temp,'bundle');fs.cpSync(output,bundle,{recursive:true});const rel='mods/custom-tabs/main.js';fs.appendFileSync(path.join(bundle,rel),'\n// fixture update\n');
 const manifest=json(path.join(bundle,'bundle.json'));manifest.files[rel].hash=hash(path.join(bundle,rel));put(path.join(bundle,'bundle.json'),JSON.stringify(manifest));
 const update=deploy(bundle,home);assert.ok(update.backup);assert.notEqual(hash(file),digest(original));
 rollback(home,update.backup,{fixture:true});assert.equal(hash(file),digest(original));assert.deepEqual(json(layoutFile).terminal_padding,[7,7]);
 const update2=deploy(bundle,home);fs.appendFileSync(file,'\n// later personal edit');assert.throws(()=>rollback(home,update2.backup,{fixture:true}),/Personal edit/);
 console.log('PASS: deployment isolation, no-op timestamps, preferences, conflict preflight, paths, opt-in update repair, unknown-stock refusal, independent workers and guarded rollback');
}finally{fs.rmSync(temp,{recursive:true,force:true});}
