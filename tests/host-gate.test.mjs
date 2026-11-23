import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {HOST_CONTRACT, hostProfile, hostVersionStatus} from '../src/integration/herdr/compatibility.js';
import {checkHostApi} from '../tools/check-host-api.mjs';
import {auditHostTabMove} from '../tools/check-tab-move.mjs';
const root=fs.mkdtempSync(path.resolve('.artifacts/host-gate-'));
try {
 const source=path.join(root,'src'); fs.mkdirSync(source);
 fs.writeFileSync(path.join(source,'main.js'),"run('tab.new'); shared('tab.state');");
 const sdk=HOST_CONTRACT.api.map(n=>`export function ${n}(): void;`).join('\n');
 fs.writeFileSync(path.join(root,'herdr.d.ts'),sdk);
 let version='0.1.17', commands=['tab.new'];
 const exec=(_exe,args)=>args[0]==='--version'?`herdr-app ${version}`:JSON.stringify(commands.map(name=>({name})));
 const check=()=>checkHostApi(root,{source,exec});
 for(version of ['0.1.13','0.1.16','0.1.17','0.2.0','0.10.0','1.0.0'])assert.equal(check().ok,true,version);
 version='0.1.17'; assert.equal(hostProfile(version),null); assert.equal(check().reviewed,false);
 assert.match(check().versionStatus.advisory,/newer than last reviewed 0.1.16/);
 for(version of ['0.1.12','0.0.99','garbage','0.1.17-beta','01.1.17',''])assert.equal(check().ok,false,version);
 version='0.1.16'; commands=[]; assert.deepEqual(check().missingCommands,['tab.new']); assert.equal(check().ok,false);
 commands=['tab.new']; fs.writeFileSync(path.join(root,'herdr.d.ts'),sdk.replace('export function run(): void;',''));
 assert.deepEqual(check().missingApi,['run']); assert.equal(check().ok,false);
 fs.writeFileSync(path.join(root,'herdr.d.ts'),sdk); fs.writeFileSync(path.join(source,'main.js'),"import {run} from 'herdr';");
 assert.equal(check().directImports.length,1); assert.equal(check().ok,false);
 fs.writeFileSync(path.join(source,'main.js'),''); version='0.1.17';
 for(const status of ['needs-review','source-unavailable','fixture-failed']) {
  const result=await auditHostTabMove(check(),async()=>({ok:false,status}));
  assert.equal(result.ok,true); assert.equal(result.tabMove.upgradeAudit.status,status);
 }
 assert.equal((await auditHostTabMove(check(),async()=>{throw Error('offline');})).ok,true);
 assert.equal(hostVersionStatus('0.1.16').advisory,null);
 console.log('PASS host gate: newer unreviewed capabilities, minimum, malformed versions, real refusals and advisory tab audits');
} finally {fs.rmSync(root,{recursive:true,force:true});}
