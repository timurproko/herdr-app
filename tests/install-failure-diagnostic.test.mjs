import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath} from 'node:url';
import {build} from '../tools/build.mjs';
import {installFailure,childFailure,stepName,stepFailure} from '../tools/deploy.mjs';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const {deploymentFailure}=createRequire(import.meta.url)('../tools/deploy-all-worker.cjs');
build();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'herdr install diagnostic ')),home=path.join(temp,'home'),bin=path.join(temp,'bin');
try {
 fs.mkdirSync(home);fs.mkdirSync(bin);
 // A real install whose palette preflight child exits 1 because the host is unavailable.
 for(const name of ['herdr.d.ts','gpui-kit.d.ts'])fs.writeFileSync(path.join(home,name),'// disposable declaration');
 const run=cp.spawnSync(process.execPath,[path.join(project,'tools/deploy.mjs'),'deploy',home],{encoding:'utf8',timeout:120000,
  env:{...process.env,HERDR_APP_BIN:path.join(temp,'no-host.exe'),HERDR_TRELLO_BIN:bin,PATH:bin+path.delimiter+process.env.PATH}});
 assert.equal(run.status,1,run.stderr);
 const typed=run.stderr.trim().split(/\r?\n/).map(line=>{try{return JSON.parse(line);}catch{return null;}}).findLast(value=>value?.deploymentFailure);
 assert.equal(typed.deploymentFailure.reason,'palette-policy.mjs failed: Owned palette host capability facts are unavailable');
 const row=deploymentFailure(run.stdout,run.stderr,null);
 assert.equal(row,'install failed: palette-policy.mjs failed: Owned palette host capability facts are unavailable');
 assert.doesNotMatch(row,/Command failed|node\.exe|[\\/]home/,'the Settings reason carries the cause, never the child command line');
 // Real execFileSync failures carry no spawnargs; identity comes from the failure itself.
 const thrown=(code,args=[])=>{try{cp.execFileSync(process.execPath,['-e',code,...args],{encoding:'utf8',stdio:'pipe'});}catch(error){return error;}assert.fail('child should fail');};
 const script=path.join(temp,'dir with space','worker.mjs');fs.mkdirSync(path.dirname(script));fs.writeFileSync(script,'throw new TypeError("bad worker input")');
 const crashed=(()=>{try{cp.execFileSync(process.execPath,[script,home],{encoding:'utf8',stdio:'pipe'});}catch(error){return error;}})();
 assert.equal(crashed.spawnargs,undefined);assert.ok(childFailure(crashed));
 assert.equal(installFailure(crashed),'worker.mjs failed: bad worker input');
 assert.equal(stepFailure(thrown('console.error(JSON.stringify({ok:false,reason:"typed reason"}));process.exit(3)')),'typed reason');
 assert.equal(stepFailure(thrown('console.error("plain cause");process.exit(2)')),'plain cause');
 assert.equal(stepFailure(thrown('process.exit(4)')),'exited with code 4');
 assert.equal(stepName(thrown('process.exit(1)')),'child step');
 assert.equal(installFailure(Error('Personal file conflict: mods/custom-tabs/main.js; nothing deployed.')),'Personal file conflict: mods/custom-tabs/main.js; nothing deployed.');
 console.log('PASS install failure diagnostic: real deploy CLI child failures report the step and its own cause, not the command line');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
