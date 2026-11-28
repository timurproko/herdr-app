import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import cp from 'node:child_process';
import {build} from '../tools/build.mjs';
import {runStartupFrames,stepFailure,STARTUP_FRAMES_BUSY} from '../tools/deploy.mjs';
const {output}=build();
const temp=fs.mkdtempSync(path.join(os.tmpdir(),'herdr-startup-busy-')),home=path.join(temp,'home');
const worker=path.join(output,'scripts/startup-frames.mjs'),lock=path.join(home,'.customizations/startup-frames.lock');
const failure=(status,stderr='',stdout='')=>Object.assign(Error(`Command failed: ${process.execPath} ${worker} ${home}`),{status,stderr,stdout,spawnargs:[process.execPath,worker,home]});
try {
 fs.mkdirSync(path.dirname(lock),{recursive:true});
 fs.writeFileSync(path.join(home,'.customizations/frame-feedback.json'),'{}');
 // Cause: a repair worker killed by its timeout leaves a lock with a dead PID.
 // The next worker clears it but still exits busy, so a single-shot install
 // step failed on the first Update and passed on the second.
 const dead=cp.spawnSync(process.execPath,['-e','console.log(process.pid)'],{encoding:'utf8'}).stdout.trim();
 fs.writeFileSync(lock,dead);
 const single=cp.spawnSync(process.execPath,[worker,home],{encoding:'utf8'});
 assert.equal(single.status,STARTUP_FRAMES_BUSY,'the worker reports a stale lock as busy once');
 fs.writeFileSync(lock,dead);
 const patches=runStartupFrames(worker,home,{interval:50});
 assert.ok(patches.frames&&'feedback' in patches.frames,'the install step waits out the stale lock and refreshes on its first attempt');
 assert.equal(fs.existsSync(lock),false);
 // The running App's own mount-time repair holds the lock with a live PID.
 const holder=cp.spawn(process.execPath,['-e','setTimeout(()=>{try{require("fs").unlinkSync(process.argv[1])}catch{}},800);setTimeout(()=>{},5000)',lock],{stdio:'ignore'});
 try {
  fs.writeFileSync(lock,String(holder.pid));
  const started=Date.now(),waited=runStartupFrames(worker,home,{interval:100});
  assert.ok(waited.frames&&Date.now()-started>=500,'a live repair is waited for, not reported as an install failure');
 } finally {holder.kill();}
 // Busy beyond the bound fails with the real cause, not the command line.
 let clock=0,calls=0;
 assert.throws(()=>runStartupFrames(worker,home,{budget:2000,interval:500,now:()=>clock,sleep:ms=>{clock+=ms;},exec:()=>{calls++;throw failure(STARTUP_FRAMES_BUSY,'','{"busy":true}\n');}}),
  error=>/stayed busy for 2s after 4 attempts: another startup repair holds \.customizations\/startup-frames\.lock/.test(error.message)&&!/Command failed/.test(error.message));
 assert.equal(calls,4);
 // Other failures are not retried and carry the step's own diagnostic.
 calls=0;
 assert.throws(()=>runStartupFrames(worker,home,{exec:()=>{calls++;throw failure(1,'Unrecognized frame record.\n');}}),/^Error: Native patch refresh failed: Unrecognized frame record\.$/);
 assert.equal(calls,1);
 assert.equal(stepFailure(failure(1)),'exited with code 1');
 assert.equal(stepFailure(Object.assign(failure(null),{code:'ETIMEDOUT'})),'timed out');
 const real=(()=>{try{cp.execFileSync(process.execPath,['-e','console.error("real cause");process.exit(2)'],{encoding:'utf8',stdio:'pipe'});}catch(error){return error;}})();
 assert.match(real.message,/Command failed/);assert.equal(stepFailure(real),'real cause');
 console.log('PASS startup frames busy: stale and live locks are waited for within a bound; failures show the step diagnostic');
} finally {fs.rmSync(temp,{recursive:true,force:true});}
