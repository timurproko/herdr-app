import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import {build,project} from '../tools/build.mjs';
import {digest} from '../tools/files.mjs';
import {deploy,shellPaths} from '../tools/deploy.mjs';
import {rollback} from '../tools/rollback.mjs';
import {planLaunchers,applyLaunchers,withLauncherLock,removalLaunchers,installedBin} from '../tools/trello-launchers.mjs';
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-deploy-'));
const home=path.join(root,'home with spaces-é'),bin=path.join(root,'user bin-é');
const saved={PATH:process.env.PATH,HERDR_APP_BIN:process.env.HERDR_APP_BIN};
const snapshot=dir=>Object.fromEntries(fs.readdirSync(dir,{recursive:true,withFileTypes:true}).filter(e=>e.isFile()).map(e=>{const file=path.join(e.parentPath,e.name);return [path.relative(dir,file),digest(fs.readFileSync(file))];}));
try {
 fs.mkdirSync(bin);fs.mkdirSync(path.join(home,'.customizations/trello'),{recursive:true});
 process.env.PATH=bin+path.delimiter+saved.PATH;process.env.HERDR_APP_BIN=path.join(root,'unavailable-native-app');
 const privateFiles=['credentials','policy'].map(n=>path.join(home,`.customizations/trello/${n}.json`));
 privateFiles.forEach(f=>fs.writeFileSync(f,'fake-private-bytes-do-not-read'));fs.writeFileSync(path.join(home,'.migration-fixture'),'fixture');
 const {output}=build(),manifest=JSON.parse(fs.readFileSync(path.join(output,'bundle.json')));
 for(const name of ['attachments','download','cli','help','client','credentials','discovery','errors','operations','policy','setup'])assert.ok(manifest.files[`.customizations/runtime/lib/trello/${name}.cjs`]);
 assert.ok(manifest.files['.customizations/runtime/lib/trello/TRELLO.txt']);
 const binLock=path.join(bin,'.herdr-trello.lock'),beforeFirst=snapshot(home);
 fs.writeFileSync(binLock,'another installer');
 try {
  assert.throws(()=>deploy(output,home,{repair:false,trelloBin:bin}),{code:'EEXIST'});
  assert.ok(!fs.existsSync(path.join(home,'.customizations/runtime/lib/trello/cli.cjs')),'lock refusal must precede runtime writes');
  assert.ok(!fs.existsSync(path.join(home,'mods/custom-settings/main.js')),'lock refusal must precede mod writes');
  assert.deepEqual(snapshot(home),beforeFirst,'a refused first installation preserves every existing file');
  assert.equal(fs.readFileSync(binLock,'utf8'),'another installer');
 }finally{fs.unlinkSync(binLock);}
 const read=fs.readFileSync,rename=fs.renameSync,heldAt=new Set();let first;
 try {
  fs.readFileSync=(file,...args)=>{assert.ok(!privateFiles.includes(String(file)),'Build/deploy must not read private Trello files');return read(file,...args);};
  fs.renameSync=(from,to)=>{
   const rel=path.relative(home,to).replaceAll('\\','/');
   if(['mods/custom-settings/main.js','.customizations/runtime/lib/trello/cli.cjs','.customizations/manifest.json'].includes(rel)) {
    assert.ok(fs.existsSync(binLock),'the user-bin lock is held through payload and manifest commit');
    assert.throws(()=>fs.openSync(binLock,'wx'),{code:'EEXIST'});heldAt.add(rel);
   }
   return rename(from,to);
  };
  first=deploy(output,home,{repair:false,trelloBin:bin});
 }finally{fs.readFileSync=read;fs.renameSync=rename;}
 assert.equal(heldAt.size,3);assert.ok(!fs.existsSync(binLock),'successful installation releases its bin lock');
 const candidate=path.join(root,'candidate');fs.cpSync(output,candidate,{recursive:true});
 const updated=JSON.parse(fs.readFileSync(path.join(candidate,'bundle.json')));
 for(const rel of ['mods/custom-settings/main.js','.customizations/runtime/lib/trello/cli.cjs']) {
  const entry=updated.files[rel],file=path.join(candidate,entry.from??rel);fs.appendFileSync(file,'\n// fixture update\n');entry.hash=digest(fs.readFileSync(file));
 }
 fs.writeFileSync(path.join(candidate,'bundle.json'),JSON.stringify(updated));
 const beforeUpdate=snapshot(home);fs.writeFileSync(binLock,'another update');
 try {
  assert.throws(()=>deploy(candidate,home,{repair:false,trelloBin:bin}),{code:'EEXIST'});
  assert.deepEqual(snapshot(home),beforeUpdate,'a locked upgrade preserves payload, preferences, journals and ownership even when launchers are unchanged');
  assert.equal(fs.readFileSync(binLock,'utf8'),'another update');
 }finally{fs.unlinkSync(binLock);}
 assert.equal(first.trelloCLI.installed,true);assert.ok(first.backup);
 assert.equal(deploy(output,home,{repair:false,trelloBin:bin}).backup,null);
 const env={...process.env,HERDR_APP_HOME:path.join(root,'wrong-home')};
 const run=(program,args)=>{const r=cp.spawnSync(program,args,{env,cwd:root,encoding:'utf8',timeout:30000,windowsVerbatimArguments:program==='cmd.exe'});assert.equal(r.status,0,`${program}: ${r.stderr}\n${r.stdout}`);return r.stdout;};
 const entry=path.join(home,'.customizations/runtime/lib/trello/cli.cjs');
 assert.match(run(process.execPath,[entry,'--help']),/herdr-trello/);
 const help=run(process.execPath,[entry,'help','commands']);
 for(const term of ['attachments get','--preview-width','--allow-other-types','20 MiB','data.path'])assert.ok(help.includes(term),term);
 assert.equal(run(process.execPath,['-e',`const r=require(${JSON.stringify(entry.replace(/cli\.cjs$/,'download.cjs'))});console.log(r.MAX_BYTES)`]).trim(),String(20*1024*1024));
 const statusResult=cp.spawnSync(process.execPath,[entry,'--home',home,'status'],{env,cwd:root,encoding:'utf8',timeout:30000});
 assert.equal(statusResult.status,3);assert.match(JSON.parse(statusResult.stdout).error.code,/^STORE_/,'Corrupt preserved setup must not masquerade as missing');
 for(const topic of ['setup','commands','errors','security','docs']) assert.ok(run(process.execPath,[entry,'--home',home,'help',topic]).length>200);
 const doc=path.join(home,'.customizations/runtime/lib/trello/TRELLO.txt'),docBytes=fs.readFileSync(doc);
 assert.equal(docBytes.toString(),fs.readFileSync(path.join(project,'docs/TRELLO.md'),'utf8'));
 assert.equal(run(process.execPath,[entry,'help','docs']),docBytes.toString());
 fs.unlinkSync(doc);assert.match(run(process.execPath,[entry,'help','docs']),/UNKNOWN_WRITE/);fs.writeFileSync(doc,docBytes);
 if(process.platform==='win32') {
  assert.match(run('cmd.exe',['/d','/s','/c',`""${path.join(bin,'herdr-trello.cmd')}" --help"`]),/herdr-trello/);
  assert.match(run('cmd.exe',['/d','/s','/c',`""${path.join(bin,'herdr-trello.cmd')}" help errors"`]),/STORE_PERMISSION_CHECK/);
  assert.ok(!fs.existsSync(path.join(bin,'herdr-trello.ps1')));
  assert.match(run('cmd.exe',['/d','/s','/c','herdr-trello --help']),/herdr-trello/);
  assert.match(run('powershell.exe',['-NoProfile','-NonInteractive','-Command','herdr-trello help security']),/untrusted data/);
  const pwsh=cp.spawnSync('pwsh',['-NoProfile','-Command','$PSVersionTable.PSVersion.Major'],{encoding:'utf8',windowsHide:true});
  if(!pwsh.error&&pwsh.status===0)assert.match(run('pwsh',['-NoProfile','-NonInteractive','-Command','herdr-trello help setup']),/PowerShell|Read-only/);
 }
 const bash=process.platform==='win32'?path.join(process.env.ProgramFiles||'C:/Program Files','Git/bin/bash.exe'):'/bin/bash';
 assert.match(run(bash,['-c','herdr-trello --help']),/herdr-trello/);
 assert.match(run(bash,['-c','herdr-trello help commands']),/cards get/);
 assert.match(run(bash,['-c','herdr-trello help docs']),/Trello for shell agents/);
 assert.equal(planLaunchers(home,bin,'').bin,bin,'Installer PATH is not agent reachability evidence');
 assert.equal(installedBin(home),bin);
 assert.throws(()=>planLaunchers(path.join(root,'another-home'),bin),/conflict/);
 const original=fs.readFileSync(path.join(bin,'herdr-trello'));
 fs.appendFileSync(path.join(bin,'herdr-trello'),'personal');
 assert.throws(()=>deploy(output,home,{repair:false,trelloBin:bin}),/conflict/);
 assert.throws(()=>rollback(home,first.backup,{fixture:true}),/launcher changed/);
 fs.writeFileSync(path.join(bin,'herdr-trello'),original);
 const shellHome=path.join(root,'shell-only');deploy(output,shellHome,{shellOnly:true,trelloBin:bin});
 assert.deepEqual(Object.keys(JSON.parse(fs.readFileSync(path.join(shellHome,'.customizations/manifest.json'))).files).sort(),[...shellPaths].sort());
 assert.ok(!fs.existsSync(path.join(shellHome,'.customizations/trello-launchers.json')));
 assert.ok(!fs.existsSync(path.join(home,'.customizations/trello-announcement.json')),'Deployment never enables or publishes a skill by itself');
 rollback(home,first.backup,{fixture:true});
 assert.ok(!fs.existsSync(path.join(bin,'herdr-trello')));
 assert.ok(!fs.existsSync(path.join(home,'.customizations/trello-launchers.json')));
 privateFiles.forEach(f=>assert.equal(fs.readFileSync(f,'utf8'),'fake-private-bytes-do-not-read'));
 const plan=planLaunchers(home,bin);
 assert.throws(()=>withLauncherLock(home,plan,false,()=>{assert.ok(fs.existsSync(binLock));throw Error('fixture transaction failure');}),/fixture transaction failure/);
 assert.ok(!fs.existsSync(binLock),'failed transactions release their own bin lock');
 applyLaunchers(home,plan);
 const removal=removalLaunchers(home);applyLaunchers(home,removal,true);assert.ok(!fs.existsSync(path.join(bin,'herdr-trello.cmd')));
 // Exercise the launcher's argv boundary independently of operation parsing.
 const probeHome=path.join(root,"probe's home-é"),probeBin=path.join(root,'probe bin');fs.mkdirSync(probeBin);
 const probeEntry=path.join(probeHome,'.customizations/runtime/lib/trello/cli.cjs');fs.mkdirSync(path.dirname(probeEntry),{recursive:true});
 fs.writeFileSync(probeEntry,"exports.execute=async args=>{let stdin;if(args.includes('stdin-check')){stdin='';process.stdin.setEncoding('utf8');for await(const chunk of process.stdin)stdin+=chunk;}return {result:{args,...(stdin===undefined?{}:{stdin})},exit:args.includes('exit-seven')?7:0};};if(require.main===module)exports.execute(process.argv.slice(2)).then(o=>process.stdout.write(JSON.stringify(o.result)));\n");
 const probePath=probeBin+path.delimiter+process.env.PATH;applyLaunchers(probeHome,planLaunchers(probeHome,probeBin,probePath));env.PATH=probePath;
 const input=path.join(root,"body & quote's-é.json"),expected=['--home',probeHome,'status','--input',input];
 assert.deepEqual(JSON.parse(run(bash,['-c','herdr-trello status --input "$1"','fixture',input])).args,expected);
 if(process.platform==='win32') {
  assert.deepEqual(JSON.parse(run('cmd.exe',['/d','/s','/c',`""${path.join(probeBin,'herdr-trello.cmd')}" status --input "${input}""`])).args,expected);
  assert.deepEqual(JSON.parse(run('powershell.exe',['-NoProfile','-NonInteractive','-Command',`herdr-trello status --input '${input.replaceAll("'","''")}'`])).args,expected);
 }
 if(process.platform==='win32'){
  env.USERNAME='FAKE_NAME_MUST_NOT_EXPAND';env.HERDR_LITERAL_TEST='FAKE_VALUE_MUST_NOT_EXPAND';
  const literal=['%USERNAME%','%HERDR_LITERAL_TEST%','%UNDEFINED_TRELLO_ENV%','100%literal%','two words',"apostrophe's-é"];
  const command='herdr-trello status '+literal.map(v=>"'"+v.replaceAll("'","''")+"'").join(' ');
  const pwsh=cp.spawnSync('pwsh',['-NoProfile','-Command','$PSHOME'],{encoding:'utf8'});
  for(const shell of ['powershell.exe',...(pwsh.status===0?[path.join(pwsh.stdout.trim(),'pwsh.exe')]:[])]){
   assert.match(run(shell,['-NoProfile','-NonInteractive','-Command','(Get-Command herdr-trello).Source']),/herdr-trello\.exe\s*$/i);
   assert.deepEqual(JSON.parse(run(shell,['-NoProfile','-NonInteractive','-Command',command])).args,['--home',probeHome,'status',...literal],'PowerShell percent strings never pass through cmd.exe');
   const failed=cp.spawnSync(shell,['-NoProfile','-NonInteractive','-Command','herdr-trello exit-seven; exit $LASTEXITCODE'],{env,cwd:root,encoding:'utf8',timeout:30000});assert.equal(failed.status,7);
  }
  const native=path.join(probeBin,'herdr-trello.exe');
  const nativeArgs=['','two words','say "hi"','trailing\\',String.raw`slashes\\\"quote`,'%USERNAME%','literal & | > ;','é'];
  assert.deepEqual(JSON.parse(run(native,['status',...nativeArgs])).args,['--home',probeHome,'status',...nativeArgs],'Native launcher preserves the complete argv it receives');
  const piped=cp.spawnSync(native,['stdin-check'],{env,cwd:root,input:'literal %USERNAME% é stdin',encoding:'utf8',timeout:30000});assert.equal(piped.status,0);assert.equal(JSON.parse(piped.stdout).stdin,'literal %USERNAME% é stdin');
  const bytes=fs.readFileSync(native);fs.appendFileSync(native,'personal');assert.throws(()=>planLaunchers(probeHome,probeBin,''),/conflict/);fs.writeFileSync(native,bytes);
 }
 // Migrate a real legacy ownership record and roll back only still-owned bytes.
 const legacyScript=path.join(probeBin,'herdr-trello.ps1'),recordFile=path.join(probeHome,'.customizations/trello-launchers.json');
 fs.writeFileSync(legacyScript,'# owned legacy script\n');const legacy=JSON.parse(fs.readFileSync(recordFile));legacy.version=1;delete legacy.recipe;delete legacy.files['herdr-trello.exe'];if(fs.existsSync(path.join(probeBin,'herdr-trello.exe')))fs.unlinkSync(path.join(probeBin,'herdr-trello.exe'));legacy.files['herdr-trello.ps1']=digest(fs.readFileSync(legacyScript));fs.writeFileSync(recordFile,JSON.stringify(legacy)+'\n');
 const upgrade=planLaunchers(probeHome,probeBin,'');applyLaunchers(probeHome,upgrade);assert.ok(!fs.existsSync(legacyScript));assert.equal(JSON.parse(fs.readFileSync(recordFile)).version,3);
 applyLaunchers(probeHome,upgrade,true);assert.equal(fs.readFileSync(legacyScript,'utf8'),'# owned legacy script\n');
 fs.appendFileSync(legacyScript,'personal');assert.throws(()=>planLaunchers(probeHome,probeBin,''),/conflict/);fs.writeFileSync(legacyScript,'# owned legacy script\n');applyLaunchers(probeHome,planLaunchers(probeHome,probeBin,''));
 const v2=JSON.parse(fs.readFileSync(recordFile));v2.version=2;delete v2.recipe;delete v2.files['herdr-trello.exe'];if(fs.existsSync(path.join(probeBin,'herdr-trello.exe')))fs.unlinkSync(path.join(probeBin,'herdr-trello.exe'));fs.writeFileSync(recordFile,JSON.stringify(v2)+'\n');
 const upgrade2=planLaunchers(probeHome,probeBin,'');applyLaunchers(probeHome,upgrade2);assert.equal(JSON.parse(fs.readFileSync(recordFile)).version,3);applyLaunchers(probeHome,upgrade2,true);assert.equal(JSON.parse(fs.readFileSync(recordFile)).version,2);applyLaunchers(probeHome,planLaunchers(probeHome,probeBin,''));
 const conflict=path.join(root,'conflict');fs.mkdirSync(conflict);fs.writeFileSync(path.join(bin,'herdr-trello'),'personal');
 assert.throws(()=>deploy(output,conflict,{repair:false,trelloBin:bin}),/conflict/);assert.ok(!fs.existsSync(path.join(conflict,'.customizations/runtime/lib/trello/cli.cjs')));
 console.log('PASS: Trello runtime closure, Bash/CMD/PowerShell discovery, Unicode paths, ownership, rollback, removal and private-store/shell-only preservation');
}finally{
 for(const [key,v]of Object.entries(saved))if(v===undefined)delete process.env[key];else process.env[key]=v;
 fs.rmSync(root,{recursive:true,force:true});
}
