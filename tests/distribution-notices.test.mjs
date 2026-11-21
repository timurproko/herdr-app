// Build and temporary-root library fixtures only; no native app or operational CLI.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {build} from '../tools/build.mjs';
import {deploy} from '../tools/deploy.mjs';
const {output}=build(); // Must fail while a held gradient is absent; never hide a missing asset.
const bundle=JSON.parse(fs.readFileSync(path.join(output,'bundle.json'),'utf8'));
assert.ok(!Object.values(bundle.files).some(e=>e.source==='preferences/pc.json'));
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'custom-notices-'));
try {
 deploy(output,temp,{repair:false});
 for(const name of ['THIRD-PARTY.txt','Project-MIT.txt','Apache-2.0.txt','Lucide-ISC.txt','Feather-MIT.txt','Herdr-Lucide.txt','ASSET-PROVENANCE.json']){
  const rel=`.customizations/runtime/licenses/${name}`;
  assert.ok(bundle.files[rel],rel);
  assert.deepEqual(fs.readFileSync(path.join(temp,rel)),fs.readFileSync(path.join(output,'licenses',name)));
 }
 for(const name of fs.readdirSync(path.join(output,'mods')))assert.ok(fs.existsSync(path.join(temp,'mods',name,'NOTICE.txt')));
 const notice=path.join(temp,'.customizations/runtime/licenses/THIRD-PARTY.txt');
 fs.appendFileSync(notice,'\npersonal edit');
 assert.throws(()=>deploy(output,temp,{repair:false}),/Personal file conflict/);
} finally {fs.rmSync(temp,{recursive:true,force:true});}
console.log('PASS: complete license/provenance distribution and conflict-safe notice ownership without a personal snapshot');
