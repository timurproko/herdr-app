// Real deployment functions, disposable homes and no native executable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {build,project} from '../tools/build.mjs';
import {deploy,doctor,allowedPath,shellPaths,shellRevisionPath} from '../tools/deploy.mjs';
import {rollback} from '../tools/rollback.mjs';
import {digest,json,put} from '../tools/files.mjs';
const scratch=path.join(project,'.artifacts');fs.mkdirSync(scratch,{recursive:true});
const temp=fs.mkdtempSync(path.join(scratch,'shell-deploy-'));
const saved={HERDR_APP_HOME:process.env.HERDR_APP_HOME,HERDR_APP_BIN:process.env.HERDR_APP_BIN};
try {
  const home=path.join(temp,'home');process.env.HERDR_APP_HOME=home;process.env.HERDR_APP_BIN=path.join(temp,'no-desktop');
  const {output}=build(),bundle=json(path.join(output,'bundle.json'));
  const revision=fs.readFileSync(path.join(output,'shell/revision'),'utf8');assert.match(revision,/^[a-f0-9]{64}\n$/);
  build();assert.equal(fs.readFileSync(path.join(output,'shell/revision'),'utf8'),revision);
  for(const rel of shellPaths){assert.ok(bundle.files[rel]);assert.equal(allowedPath(rel),rel);}
  for(const rel of ['.customizations/runtime/shell/other.sh','.customizations/runtime/shell/other.js','.customizations/runtime/shell/nested/bash-cwd.sh','.customizations/runtime/evil.ps1','../shell/revision'])assert.throws(()=>allowedPath(rel));
  const first=deploy(output,home,{repair:false});assert.ok(first.backup);put(path.join(home,'.migration-fixture'),'fixture');
  assert.ok(doctor(home).ok);
  const stamp=fs.statSync(path.join(home,shellRevisionPath),{bigint:true}).mtimeNs;
  assert.equal(deploy(output,home,{repair:false}).changed,0);assert.equal(fs.statSync(path.join(home,shellRevisionPath),{bigint:true}).mtimeNs,stamp);
  const candidate=path.join(temp,'bundle');fs.cpSync(output,candidate,{recursive:true});
  const changed=json(path.join(candidate,'bundle.json'));
  for(const rel of [shellPaths[1],shellRevisionPath,'mods/custom-tabs/main.js']) {
    const entry=changed.files[rel],file=path.join(candidate,entry.from??rel);
    fs.appendFileSync(file,rel===shellRevisionPath?'updated\n':'\n# fixture update\n');entry.hash=digest(fs.readFileSync(file));
  }
  put(path.join(candidate,'bundle.json'),JSON.stringify(changed));
  const file=path.join(home,shellPaths[1]),before=fs.readFileSync(file),manifestBefore=fs.readFileSync(path.join(home,'.customizations/manifest.json'));
  fs.appendFileSync(file,'personal');
  assert.throws(()=>deploy(candidate,home,{repair:false}),/Personal file conflict/);
  assert.deepEqual(fs.readFileSync(path.join(home,'.customizations/manifest.json')),manifestBefore);
  assert.equal(fs.readFileSync(path.join(home,shellRevisionPath),'utf8'),revision);
  fs.writeFileSync(file,before);
  // Source selection must bring the entire shell group, not unrelated mods.
  const writes=[],rename=fs.renameSync;
  let update;
  try {
    fs.renameSync=(from,to)=>{writes.push(path.relative(home,to).replaceAll('\\','/'));return rename(from,to);};
    update=deploy(candidate,home,{repair:false,sources:['src/integration/shell/bash-cwd.sh']});
  } finally {fs.renameSync=rename;}
  assert.equal(update.changed,2);assert.equal(update.removed,0);
  assert.ok(writes.indexOf(shellPaths[1])<writes.indexOf(shellRevisionPath));
  assert.equal(digest(fs.readFileSync(path.join(home,'mods/custom-tabs/main.js'))),bundle.files['mods/custom-tabs/main.js'].hash);
  rollback(home,update.backup,{fixture:true});assert.deepEqual(fs.readFileSync(file),before);
  const bad=path.join(temp,'bad');fs.cpSync(output,bad,{recursive:true});fs.appendFileSync(path.join(bad,'shell/bash-cwd.sh'),'tampered');
  assert.throws(()=>deploy(bad,home,{repair:false}),/Build output changed/);
  const linkedHome=path.join(temp,'linked-home');fs.mkdirSync(path.join(linkedHome,'.customizations/runtime'),{recursive:true});
  fs.symlinkSync(path.join(home,'.customizations/runtime/shell'),path.join(linkedHome,'.customizations/runtime/shell'),process.platform==='win32'?'junction':'dir');
  assert.throws(()=>deploy(output,linkedHome,{repair:false}),/Linked deployment path/);
  console.log('PASS: owned shell build/deploy, exact paths, no-op, conflict preflight, revision-last, coherent source updates and rollback.');
} finally {
  for(const [key,value]of Object.entries(saved))if(value===undefined)delete process.env[key];else process.env[key]=value;
  fs.rmSync(temp,{recursive:true,force:true});
}
