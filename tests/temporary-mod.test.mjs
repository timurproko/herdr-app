import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {installTemporaryHostFacade} from '../tools/temporary-mod.mjs';
import {project} from '../tools/build.mjs';
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'custom temporary facade '));
try{
 installTemporaryHostFacade(dir);
 for(const name of ['host.js','compatibility.js'])assert.equal(fs.readFileSync(path.join(dir,name),'utf8'),fs.readFileSync(path.join(project,'src/integration/herdr',name),'utf8'));
 const host=path.join(dir,'host.js'),before=fs.statSync(host,{bigint:true}).mtimeNs;
 installTemporaryHostFacade(dir);assert.equal(fs.statSync(host,{bigint:true}).mtimeNs,before,'Repeated install preserves identical files');
 fs.writeFileSync(host,'// personal edit');assert.throws(()=>installTemporaryHostFacade(dir),/conflict/);assert.equal(fs.readFileSync(host,'utf8'),'// personal edit');
 console.log('PASS: temporary mods share the canonical facade, install quietly and refuse personal conflicts');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
