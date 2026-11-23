// Real CLI -> npm scripts -> existing installer, all inside a disposable checkout/home.
// hc is intercepted before CLI import; the fixture has no native/remote dependencies.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { project, fixture, git, clean } from './support/deploy-all.mjs';
import worker from '../tools/deploy-all-worker.cjs';
import updater from '../src/services/updates/update-worker.cjs';
import { customizationRowState, updateProjection } from '../src/shared/customization-update-model.js';
const write = (file,text) => {fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
const snapshot = dir => !fs.existsSync(dir) ? null : Object.fromEntries(fs.readdirSync(dir,{recursive:true}).filter(rel=>fs.statSync(path.join(dir,rel)).isFile()).sort().map(rel=>[rel,fs.readFileSync(path.join(dir,rel)).toString('base64')]));
try {
  const f = fixture();
  for (const name of ['deploy-all.mjs','deploy-all-worker.cjs']) write(path.join(f.author,'tools',name),fs.readFileSync(path.join(project,'tools',name)));
  write(path.join(f.author,'.gitignore'),'dist/\n');
  write(path.join(f.author,'package.json'),JSON.stringify({type:'module',scripts:{
    deploy:'node tools/check-host-api.mjs && node tools/build.mjs && node tools/deploy.mjs deploy',
    'deploy:shell':'node tools/build.mjs && node tools/deploy.mjs deploy-shell',
    'deploy:all':'node tools/deploy-all.mjs',
  }}));
  write(path.join(f.author,'tools/check-host-api.mjs'),`import fs from 'node:fs'; fs.mkdirSync('dist',{recursive:true}); fs.writeFileSync('dist/stages','check\\n');`);
  write(path.join(f.author,'tools/build.mjs'),`
    import fs from 'node:fs'; import {createHash} from 'node:crypto';
    fs.mkdirSync('dist',{recursive:true}); fs.appendFileSync('dist/stages','build\\n');
    const text=fs.readFileSync('source.txt','utf8'), files={};
    for(const name of ['bash-cwd-loader.sh','bash-cwd.sh','powershell-cwd.ps1','revision'])files['.customizations/runtime/shell/'+name]={text,hash:createHash('sha256').update(text).digest('hex')};
    fs.mkdirSync('dist/layouts',{recursive:true}); fs.writeFileSync('dist/layouts/Custom.json','{}');
    files['layouts/Custom.json']={text:'{}',hash:createHash('sha256').update('{}').digest('hex')};
    fs.writeFileSync('dist/bundle.json',JSON.stringify({version:2,id:'custom',files}));
  `);
  write(path.join(f.author,'tools/deploy.mjs'),`
    import fs from 'node:fs'; import {deploy} from ${JSON.stringify(pathToFileURL(path.join(project,'tools/deploy.mjs')).href)};
    fs.appendFileSync('dist/stages','deploy\\n');
    try {console.log(JSON.stringify(deploy('dist',process.env.HERDR_APP_HOME,{repair:false,shellOnly:process.argv[2]==='deploy-shell'})));}
    catch(e){console.error(e.message);process.exitCode=1;}
  `);
  git(f.author,'add','.');git(f.author,'commit','-m','fixture pipeline');git(f.author,'push');
  git(f.root,'pull','--ff-only');
  git(f.root,'remote','set-url','origin','https://github.com/timurproko/herdr-app.git');
  git(f.root,'config',`url.${f.origin}.insteadOf`,'https://github.com/timurproko/herdr-app.git');
  const preload=path.join(f.base,'mock-hc.cjs');
  write(preload,`const cp=require('node:child_process'),real=cp.spawnSync; cp.spawnSync=function(c,a,o){if(c==='hc'){if(a.join(' ')==='machine ls --json')return {status:0,stdout:JSON.stringify({machines:process.env.HERDR_FIXTURE_OFFLINE_PEER?[{name:'offline-fixture',state:'offline'}]:[]}),stderr:''};throw Error('No remote transport permitted');}if(process.env.HERDR_FIXTURE_INSTALLER_MODE&&(c==='npm'&&a[0]==='run'&&a[1]==='deploy'||c==='cmd.exe'&&a.includes('npm run deploy'))){const timeout=process.env.HERDR_FIXTURE_INSTALLER_MODE==='timeout';return {status:timeout?null:1,stdout:'',stderr:'fixture installer failure',...(timeout?{error:{code:'ETIMEDOUT'}}:{})};}return real(c,a,o);};`);
  const cli = (args,extra={}) => cp.spawnSync(process.execPath,['--require',preload,path.join(f.root,'tools/deploy-all.mjs'),...args],{cwd:f.root,env:{...f.env,HERDR_UPDATE_RUN_ID:'',...extra},encoding:'utf8',timeout:60000});
  const protocol=cli(['--protocol']); assert.equal(protocol.status,0,protocol.stderr); assert.deepEqual(JSON.parse(protocol.stdout),{resultProtocol:1});
  assert.equal(fs.existsSync(f.env.HERDR_APP_HOME),false,'protocol probe performs no deployment/status writes');
  const target = f.advance();
  let r=cli([]);assert.equal(r.status,0,r.stderr+'\n'+r.stdout);assert.match(r.stdout,/local \| deployed/);assert.ok(r.stdout.includes(target));
  assert.equal(git(f.root,'rev-parse','HEAD'),target);
  const home=f.env.HERDR_APP_HOME,manifest=path.join(home,'.customizations/manifest.json');
  assert.equal(Object.keys(JSON.parse(fs.readFileSync(manifest)).files).length,5);
  const ids=fs.readdirSync(path.join(home,'.customizations/backups'));assert.equal(ids.length,1);assert.ok(r.stdout.includes(ids[0]));
  assert.equal(fs.readFileSync(path.join(f.root,'dist/stages'),'utf8'),'check\nbuild\ndeploy\n');
  r=cli([]);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/local \| already current/);assert.equal(fs.readdirSync(path.join(home,'.customizations/backups')).length,1);
  // The documented npm bootstrap keeps offline skips in its durable result,
  // without a warning/details pointer once the desktop's check reconciles.
  const [npmProgram,npmArgs]=worker.npmCommand('deploy:all');
  const bootstrap=cp.spawnSync(npmProgram,npmArgs,{cwd:f.root,env:{...f.env,HERDR_FIXTURE_OFFLINE_PEER:'1',NODE_OPTIONS:`--require ${JSON.stringify(preload.replace(/\\/g,'/'))}`},encoding:'utf8',timeout:60000});
  assert.equal(bootstrap.status,0,bootstrap.stderr+'\n'+bootstrap.stdout); assert.match(bootstrap.stdout,/offline-fixture \| skipped/);
  const updatePaths=updater.files(home);
  assert.equal(fs.existsSync(updatePaths.log),false);
  let shown=updater.checkMain(home,{force:true,run:()=>({code:0,stdout:`${target}\trefs/heads/main\n`})}),row=customizationRowState(updateProjection(shown));
  assert.equal(shown.details.kind,'result'); assert.equal(shown.details.path,updatePaths.result); assert.ok(fs.existsSync(shown.details.path));
  assert.match(row.description,/^Up to date\./); assert.doesNotMatch(row.description,/Details:|Log:|skipped or failed/);
  assert.equal(shown.lastRun.state,'complete');
  updater.atomic(updatePaths.status,{token:'older-settings-run',state:'partial',started:0,finished:1});
  fs.writeFileSync(updatePaths.log,'unrelated old Settings output');
  shown=updater.inspect(home); row=customizationRowState(updateProjection(shown));
  assert.equal(shown.job,null,'new CLI result supersedes completed Settings presentation');
  assert.equal(shown.details.path,updatePaths.result); assert.ok(!row.description.includes(updatePaths.log));
  assert.equal(JSON.parse(fs.readFileSync(updatePaths.result)).results.at(-1).machine,'offline-fixture');
  const beforeHome=snapshot(home),beforeDist=snapshot(path.join(f.root,'dist')),beforeHead=git(f.root,'rev-parse','HEAD');
  const next=f.advance(); r=cli(['--dry-run']);assert.equal(r.status,0,r.stderr);assert.match(r.stdout,/would deploy/);
  assert.equal(git(f.root,'rev-parse','HEAD'),beforeHead);assert.equal(git(f.root,'rev-parse','origin/main'),next);
  assert.deepEqual(snapshot(home),beforeHome);assert.deepEqual(snapshot(path.join(f.root,'dist')),beforeDist);
  // The real shell-only script also stays entirely in the peer's disposable default home.
  const remoteHome=path.join(f.base,'peer home'),remoteRoot=path.join(remoteHome,'.local/share/herdr-app');
  fs.mkdirSync(path.dirname(remoteRoot),{recursive:true});git(f.base,'clone',f.origin,remoteRoot);
  git(remoteRoot,'remote','set-url','origin','https://github.com/timurproko/herdr-app.git');
  git(remoteRoot,'config',`url.${f.origin}.insteadOf`,'https://github.com/timurproko/herdr-app.git');
  const peerOptions={home:remoteHome,env:f.env,log(){}};
  const remoteTarget=f.advance(),remoteBefore=git(remoteRoot,'rev-parse','HEAD');
  const preview=worker.runRemote({dryRun:true},peerOptions);
  assert.equal(preview.action,'would deploy');assert.equal(preview.commit,remoteTarget);
  assert.equal(git(remoteRoot,'rev-parse','HEAD'),remoteBefore);
  assert.ok(!fs.existsSync(path.join(remoteRoot,'dist')));assert.ok(!fs.existsSync(path.join(remoteHome,'.config')));
  const shell=worker.runRemote({},peerOptions);assert.equal(shell.action,'deployed',JSON.stringify(shell));
  assert.equal(shell.commit,remoteTarget);assert.ok(shell.backup);
  const remoteApp=path.join(remoteHome,'.config/herdr-app');
  const owned=JSON.parse(fs.readFileSync(path.join(remoteApp,'.customizations/manifest.json')));
  assert.deepEqual(Object.keys(owned.files),worker.SHELL_PATHS);assert.ok(!owned.layoutBase);
  assert.ok(!fs.existsSync(path.join(remoteApp,'layouts')));
  assert.equal(fs.readFileSync(path.join(remoteRoot,'dist/stages'),'utf8'),'build\ndeploy\n');
  assert.equal(worker.runRemote({},peerOptions).action,'already current');
  assert.deepEqual(snapshot(home),beforeHome,'remote default selection never touches desktop home');
  // Real installer conflicts propagate non-zero and do not hide the attempted SHA.
  fs.appendFileSync(path.join(home,'.customizations/runtime/shell/bash-cwd.sh'),'personal');
  r=cli([]);assert.equal(r.status,1,r.stderr);assert.match(r.stdout,/Personal file conflict/);assert.match(r.stdout,/\(attempted\)/);
  assert.equal(fs.readdirSync(path.join(home,'.customizations/backups')).length,1);
  for(const mode of ['failed','timeout']) {
    r=cli([],{HERDR_FIXTURE_INSTALLER_MODE:mode}); assert.equal(r.status,1,r.stderr);
    const receipt=JSON.parse(fs.readFileSync(updatePaths.result)); assert.equal(receipt.token,null); assert.equal(receipt.desktop.verified,false);
    const commit=git(f.root,'rev-parse','HEAD');
    const inspected=updater.checkMain(home,{force:true,now:()=>receipt.at+100,run:()=>({code:0,stdout:`${commit}\trefs/heads/main\n`})});
    const shown=customizationRowState(updateProjection(inspected),{now:receipt.at+100});
    assert.equal(inspected.check.available,true);
    assert.ok(shown.description.includes(updatePaths.result));
    if(mode==='failed') { assert.match(shown.description,/Update failed:.*documented rollback/); assert.equal(shown.action,'launch','definite failure allows explicit retry only after fresh Check, without hiding failure'); }
    else {
      assert.equal(receipt.results[0].outcome,'unknown'); assert.match(shown.description,/Update outcome unknown: deployment timed out/); assert.equal(shown.action,'check');
      let dispatched=0; await updater.launch(home,{spawn(){dispatched++;throw Error('must not launch');}}); assert.equal(dispatched,0,'tokenless CLI timeout cannot dispatch another Settings deployment');
    }
  }
  console.log('PASS: disposable CLI/npm/full installer, backups/no-op/conflict, tokenless failed/unknown presentation and launch blocking, and byte-preserving dry-run; hc/install timeouts mocked.');
} finally {clean();}
