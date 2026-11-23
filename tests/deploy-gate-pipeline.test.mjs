// Actual source host gate/build/install, deploy:all, managed Update and peer
// shell npm scripts. All host/Core/network facts are synthetic, all homes local.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {build} from '../tools/build.mjs';
import {framePatch} from '../tools/runtime/frame-patch.mjs';
import {HOST_CONTRACT} from '../src/integration/herdr/compatibility.js';
import {fixture,git,clean,project} from './support/deploy-all.mjs';
import worker from '../tools/deploy-all-worker.cjs';
import updates from '../src/services/updates/update-worker.cjs';
import {customizationRowState,updateProjection} from '../src/shared/customization-update-model.js';
const put=(file,text)=>{fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,text);};
try {
 const f=fixture(),home=f.env.HERDR_APP_HOME,userHome=path.join(f.base,'user'),managed=path.join(userHome,'.local/share/herdr-app');
 // The managed clone starts behind fixed published main; Update must bootstrap it.
 fs.mkdirSync(path.dirname(managed),{recursive:true});fs.renameSync(f.root,managed);
 git(managed,'remote','set-url','origin',updates.REPOSITORY);git(managed,'config',`url.${f.origin}.insteadOf`,updates.REPOSITORY);
 for(const name of fs.readdirSync(project).filter(name=>!['.git','.artifacts','dist','node_modules'].includes(name)))fs.cpSync(path.join(project,name),path.join(f.author,name),{recursive:true});
 git(f.author,'add','.');git(f.author,'commit','-m','capable host pipeline');git(f.author,'push');
 const target=git(f.author,'rev-parse','HEAD');assert.notEqual(git(managed,'rev-parse','HEAD'),target);
 const commands=new Set();
 const walk=dir=>{for(const e of fs.readdirSync(dir,{withFileTypes:true})){const p=path.join(dir,e.name);if(e.isDirectory())walk(p);else if(p.endsWith('.js'))for(const m of fs.readFileSync(p,'utf8').matchAll(/["']((?:space|tab|pane|terminal|agent|layout|app|window|mod|overlay)\.[a-zA-Z0-9_.-]+)["']/g))commands.add(m[1]);}};walk(path.join(project,'src'));
 const catalog=path.join(f.base,'commands.json');put(catalog,JSON.stringify([...commands].map(name=>({name}))));
 put(path.join(home,'herdr.d.ts'),HOST_CONTRACT.api.map(n=>`export function ${n}(): void;`).join('\n'));
 const {output}=build();const registry=JSON.parse(fs.readFileSync(path.join(output,'frame-patches/registry.json')));
 for(const p of registry.patches){put(path.join(home,p.target,'main.js'),fs.readFileSync(path.join(output,p.originals[0])));framePatch('apply',home,output,p.id);put(path.join(home,p.target,'main.js'),`new 0.1.17 stock ${p.id}`);}
 const frameBefore=Object.fromEntries(registry.patches.map(p=>[p.id,fs.readFileSync(path.join(home,`.customizations/frame-${p.id}.json`),'utf8')]));
 put(f.env.HERDR_APP_BIN,'synthetic new binary without reviewed native originals');
 const preload=path.join(f.base,'host-fixture.cjs');
 put(preload,`const fs=require('node:fs'),cp=require('node:child_process'),exec=cp.execFileSync,spawn=cp.spawnSync;
 cp.execFileSync=function(c,a,o){if(c===process.env.HERDR_APP_BIN){if(process.env.NO_HOST)throw Error('shell must not probe App');if(a[0]==='--version')return 'herdr-app 0.1.17';if(a[0]==='commands')return fs.readFileSync(${JSON.stringify(catalog)},'utf8');throw Error('unapproved native operation');}return exec(c,a,o);};
 cp.spawnSync=function(c,a,o){if(c==='hc'){if(a.join(' ')==='machine ls --json')return {status:0,stdout:'{"machines":[]}',stderr:''};throw Error('no remote operations allowed');}return spawn(c,a,o);};
 global.fetch=async()=>{throw Error('synthetic offline source audit');};`);
 const env={...f.env,NODE_OPTIONS:`--require ${JSON.stringify(preload.replace(/\\/g,'/'))}`};
 const p=updates.files(home),token='real-pipeline-fixture';updates.atomic(p.lock,{token});updates.atomic(p.status,{token,state:'running',started:Date.now(),pid:process.pid});put(p.log,'fixture Update\n');
 const job=await updates.runUpdate(home,token,{userHome,deadlineMs:150000,
  run:(program,args,options)=>updates.command(program,args,{...options,env:{...options.env,...env}}),
  spawn:(program,args,options)=>cp.spawn(program,args,{...options,env:{...options.env,...env,HERDR_UPDATE_RUN_ID:token}}),
 });
 assert.equal(job.state,'complete',fs.readFileSync(p.log,'utf8'));assert.equal(git(managed,'rev-parse','HEAD'),target);
 const shown=updates.inspect(home);assert.equal(shown.revision,target);assert.equal(shown.job.state,'complete');assert.equal(updateProjection(shown).partial,false);
 assert.match(fs.readFileSync(p.log,'utf8'),/newer than last reviewed/);assert.match(fs.readFileSync(p.log,'utf8'),/source-unavailable/);assert.match(fs.readFileSync(p.log,'utf8'),/Optional palette patch skipped/);assert.match(fs.readFileSync(p.log,'utf8'),/Optional feedback patch skipped/);
 for(const item of registry.patches){assert.equal(fs.readFileSync(path.join(home,item.target,'main.js'),'utf8'),`new 0.1.17 stock ${item.id}`);assert.equal(fs.readFileSync(path.join(home,`.customizations/frame-${item.id}.json`),'utf8'),frameBefore[item.id]);}
 assert.match(customizationRowState(updateProjection(shown)).description,/Updated/);
 const doctor=cp.spawnSync(process.execPath,['tools/deploy.mjs','doctor'],{cwd:managed,env,encoding:'utf8',timeout:30000});assert.equal(doctor.status,0,doctor.stderr);assert.equal(JSON.parse(doctor.stdout).advisories.length,2);
 // The ordinary shell path requires no App evidence or optional patch worker.
 const peerHome=path.join(f.base,'peer'),peerRoot=path.join(peerHome,'.local/share/herdr-app');fs.mkdirSync(path.dirname(peerRoot),{recursive:true});git(f.base,'clone',f.origin,peerRoot);git(peerRoot,'remote','set-url','origin',updates.REPOSITORY);git(peerRoot,'config',`url.${f.origin}.insteadOf`,updates.REPOSITORY);
 const shell=worker.runRemote({},{home:peerHome,env:{...env,NO_HOST:'1'},log(){}});assert.equal(shell.action,'deployed',JSON.stringify(shell));
 const owned=JSON.parse(fs.readFileSync(path.join(peerHome,'.config/herdr-app/.customizations/manifest.json')));assert.deepEqual(Object.keys(owned.files).sort(),[...worker.SHELL_PATHS].sort());
 console.log('PASS actual host gate + npm deploy/build/install + managed Settings Update/deploy:all + peer deploy:shell on capable 0.1.17, skipped native patches, unchanged recovery records, doctor advisories (synthetic hosts only)');
}finally{clean();}
