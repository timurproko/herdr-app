// Optional coordinated fixture: actual candidate CLI + disposable A1 runtimes.
// Set A1_API_CANDIDATE_ROOT to the built A1 checkout. Never targets installed agents.
import assert from 'node:assert/strict';
import {fork,execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {randomUUID} from 'node:crypto';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const candidate=process.env.A1_API_CANDIDATE_ROOT;
if(!candidate)console.log('SKIP: actual A1 wire fixtures need A1_API_CANDIDATE_ROOT');
else {
 const require=createRequire(import.meta.url),{createA1Client}=require('../src/plugins/api.cjs'),{collect}=require('../src/plugins/a1-colors/session-color.cjs');
 const root=await fs.mkdtemp(path.join(os.tmpdir(),'herdr-a1-wire-')),children=[],execute=promisify(execFile);
 const environment={...process.env,A1_RUNTIME_DIR:path.join(root,'runtime'),A1_PROFILE_HOME:root};
 const receive=child=>new Promise((resolve,reject)=>{const timer=setTimeout(()=>{cleanup();reject(Error('Fixture host timeout'));},10000);const message=value=>{cleanup();resolve(value);};const exit=()=>{cleanup();reject(Error('Fixture host exited'));};function cleanup(){clearTimeout(timer);child.off('message',message);child.off('exit',exit);}child.once('message',message);child.once('exit',exit);});
 async function host(){const session=randomUUID(),runtime=randomUUID();const child=fork(path.join(candidate,'test/composition/fixtures/session-color-host.ts'),[root,session,runtime],{cwd:candidate,env:environment,execArgv:['--import','tsx'],stdio:['ignore','ignore','inherit','ipc']});children.push(child);assert.deepEqual(await receive(child),{ready:true});return{session,runtime,child};}
 const api=()=>createA1Client({resolveCommand:async()=>[process.execPath,path.join(candidate,'bin/cli.js')],execute:async(command,args)=>{try{return{code:0,...await execute(command,args,{env:environment,cwd:root,timeout:10000,maxBuffer:16384})};}catch(error){return{code:error.code,stdout:error.stdout,stderr:error.stderr};}}});
 try {
  const one=await host(),two=await host(),client=api();
  const caps=await client.request('capabilities');assert.ok(caps.operations.includes('settings.update'));
  const settings=await client.request('settings.list');assert.deepEqual(settings.settings.find(s=>s.id==='accentColor').choices,['blue','green','orange','pink','purple','cyan','grey']);
  const scope=agent=>({scope:'session',sessionId:agent.session,runtimeId:agent.runtime});
  assert.deepEqual((await client.request('session.get',{target:scope(one)})).target,scope(one));
  const target={terminal:'t1',space:'fixture',tab:'tb',session:one.session,runtime:one.runtime,color:'pink'};
  const terminal=()=>({address:'t1',state:'live',status:{app:'a1'},labels:{'a1.session':one.session,'a1.runtime':one.runtime,'a1.at':String(Date.now()),'herdr.space':'fixture','herdr.tab':'tb'}});
  const result=await collect({expiresAt:Date.now()+10000,targets:[target]},{getTerminal:async()=>terminal(),clientFor:()=>client});
  assert.equal(result.colors.length,1);assert.deepEqual(result.errors,[]);
  assert.equal((await client.request('settings.get',{target:scope(one),setting:'accentColor'})).effectiveValue,'pink');
  assert.equal((await client.request('settings.get',{target:scope(two),setting:'accentColor'})).effectiveValue,'blue');
  await assert.rejects(client.request('settings.update',{target:{...scope(one),runtimeId:two.runtime},setting:'accentColor',value:'green'}),{code:'session-unavailable'});
  const next=randomUUID(),reply=receive(one.child);one.child.send({action:'replace',sessionId:next});await reply;
  await assert.rejects(client.request('settings.get',{target:scope(one),setting:'accentColor'}),{code:'session-unavailable'});
  assert.equal((await client.request('settings.get',{target:{...scope(one),sessionId:next},setting:'accentColor'})).effectiveValue,'blue');
  console.log('PASS: canonical Herdr client/color policy against actual A1 CLI, exact live runtime, two-session isolation and stale replacement refusal');
 } finally {
  await Promise.all(children.map(child=>child.exitCode===null?new Promise(resolve=>{child.once('exit',resolve);child.kill();}):Promise.resolve()));
  await fs.rm(root,{recursive:true,force:true});
 }
}
