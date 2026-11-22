// Core-only and full coexistence, real shared machinery with disposable homes.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {build,project} from '../tools/build.mjs';
import {deploy,shellPaths,shellRevisionPath} from '../tools/deploy.mjs';
import {rollback} from '../tools/rollback.mjs';
import {digest,json,put} from '../tools/files.mjs';
const scratch=path.join(project,'.artifacts');fs.mkdirSync(scratch,{recursive:true});
const temp=fs.mkdtempSync(path.join(scratch,'shell-only-'));
const text=file=>fs.readFileSync(file,'utf8');
const snapshot=root=>Object.fromEntries(fs.readdirSync(root,{recursive:true}).filter(rel=>fs.statSync(path.join(root,rel)).isFile()&&!rel.startsWith('.customizations'+path.sep+'backups')).map(rel=>[rel,fs.readFileSync(path.join(root,rel)).toString('base64')]));
try {
 const {output}=build(),home=path.join(temp,'core only'),env={...process.env,HERDR_APP_HOME:home,HERDR_APP_BIN:path.join(temp,'no-app')};
 const cli=(tool,args,fail=null)=>{
  const result=cp.spawnSync(process.execPath,[path.join(project,'tools',tool),...args],{env,cwd:project,encoding:'utf8',timeout:30000});
  assert.ifError(result.error);assert.equal(result.status,fail?1:0,result.stderr);if(fail)assert.match(result.stderr,fail);else return JSON.parse(result.stdout);
 };
 const first=cli('deploy.mjs',['deploy-shell']);assert.equal(first.changed,4);assert.equal(first.scope,'shell');
 const stateFile=path.join(home,'.customizations/manifest.json'),firstState=text(stateFile);
 assert.deepEqual(Object.keys(json(stateFile).files),shellPaths);assert.ok(!json(stateFile).layoutBase);
 for(const name of ['mods','layouts','themes','preferences','.customizations/layout-preferences.json','.customizations/runtime/package.json'])assert.ok(!fs.existsSync(path.join(home,name)),name);
 assert.equal(cli('deploy.mjs',['deploy-shell',home]).changed,0);
 const candidate=path.join(temp,'bundle');fs.cpSync(output,candidate,{recursive:true});
 const manifest=json(path.join(candidate,'bundle.json'));
 for(const rel of [shellPaths[1],shellRevisionPath]){
  const file=path.join(candidate,manifest.files[rel].from);fs.appendFileSync(file,rel===shellRevisionPath?'next\n':'\n# next\n');manifest.files[rel].hash=digest(fs.readFileSync(file));
 }
 put(path.join(candidate,'bundle.json'),JSON.stringify(manifest));
 const next=deploy(candidate,home,{shellOnly:true});assert.equal(next.changed,2);
 const journal=path.join(home,`.customizations/backups/${next.backup}/rollback.json`),journalRaw=text(journal);
 const writes=[],rename=fs.renameSync;
 try {fs.renameSync=(from,to)=>{writes.push(to);return rename(from,to);};rollback(home,next.backup,{shellOnly:true});}finally{fs.renameSync=rename;}
 assert.ok(writes.indexOf(path.join(home,shellPaths[1]))<writes.indexOf(path.join(home,shellRevisionPath)));
 assert.equal(text(stateFile),firstState);
 // Repeated recovery is quiet and never calls the absent Desktop.
 cli('rollback.mjs',['--shell-only',next.backup]);
 for(const mutate of [r=>{r.scope='full';},r=>{r.files['layouts/Custom.json']=null;r.after['layouts/Custom.json']='x';},r=>{const after=JSON.parse(r.afterState);after.layoutBase={unexpected:true};r.afterState=JSON.stringify(after);r.afterManifest=digest(r.afterState);},r=>{r.afterPreferences='unexpected';}]){
  const r=JSON.parse(journalRaw);mutate(r);put(journal,JSON.stringify(r));const before=snapshot(home);
  cli('rollback.mjs',['--shell-only',next.backup],/verified shell-only/);assert.deepEqual(snapshot(home),before);
 }
 put(journal,journalRaw);
 const update=deploy(candidate,home,{shellOnly:true});
 const file=path.join(home,shellPaths[1]),owned=text(file);fs.appendFileSync(file,'personal');
 assert.throws(()=>deploy(output,home,{shellOnly:true}),/Personal file conflict/);
 cli('rollback.mjs',['--shell-only',update.backup],/Personal edit/);put(file,owned);
 const current=text(stateFile);put(stateFile,current+' ');cli('rollback.mjs',['--shell-only',update.backup],/Newer deployment/);put(stateFile,current);
 cli('rollback.mjs',['--shell-only',update.backup]);
 // Initial recovery deletes only the installed shell files and ownership.
 cli('rollback.mjs',['--shell-only',first.backup]);assert.ok(!fs.existsSync(stateFile));
 for(const rel of shellPaths)assert.ok(!fs.existsSync(path.join(home,rel)));
 assert.throws(()=>rollback(home,'not-a-backup',{shellOnly:true}),/backup ID/);
 cli('deploy.mjs',['deploy-shell','--source','src/integration/shell/'],/Use deploy/);
 // Upgrade from shell to full, then update only shells around unrelated edits.
 deploy(output,home,{shellOnly:true});const full=deploy(output,home,{repair:false});
 assert.ok(json(stateFile).layoutBase);const fullState=json(stateFile);
 const fullBundle=json(path.join(output,'bundle.json'));
 for(const rel of shellPaths)assert.equal(fullState.files[rel],fullBundle.files[rel].hash);
 const untouched=path.join(home,'mods/custom-tabs/main.js');fs.appendFileSync(untouched,'\n// keep my edit');
 const prefsFile=path.join(home,'.customizations/layout-preferences.json');put(prefsFile,'unparsed personal sidecar\n');
 const before=snapshot(home),beforeState=text(stateFile);
 const shell=deploy(candidate,home,{shellOnly:true});assert.equal(shell.removed,0);assert.equal(shell.patches,null);
 const after=snapshot(home);
 for(const [rel,bytes]of Object.entries(before))if(!shellPaths.includes(rel.replaceAll('\\','/'))&&rel!=='.customizations'+path.sep+'manifest.json')assert.equal(after[rel],bytes,rel);
 const strip=value=>({...value,files:Object.fromEntries(Object.entries(value.files).filter(([rel])=>!shellPaths.includes(rel)))});
 assert.deepEqual(strip(json(stateFile)),strip(JSON.parse(beforeState)));
 cli('rollback.mjs',['--shell-only',shell.backup]);assert.deepEqual(snapshot(home),before);
 cli('rollback.mjs',['--shell-only',full.backup],/verified shell-only/);
 // Preferences changed after shell deployment must not be overwritten.
 const last=deploy(candidate,home,{shellOnly:true});put(prefsFile,'later personal sidecar\n');
 cli('rollback.mjs',['--shell-only',last.backup],/Newer deployment\/preference/);
 assert.equal(json(path.join(project,'package.json')).scripts['deploy:shell'],'node tools/build.mjs && node tools/deploy.mjs deploy-shell');
 assert.equal(json(path.join(project,'package.json')).scripts['rollback:shell'],'node tools/rollback.mjs --shell-only');
 console.log('PASS: Core-only install/update/rollback, strict shell journal guards, no Desktop, full coexistence and non-shell preservation.');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
