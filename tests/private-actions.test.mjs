import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {once} from 'node:events';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {spawn} from 'node:child_process';
import {build} from '../tools/build.mjs';
const require=createRequire(import.meta.url);
const {serve}=require('../src/services/private-actions/bridge.cjs');
const {WebSocket}=require('../src/services/private-actions/vendor/ws/index.js');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'private-actions-'));
const secret='fake-token-never-in-argv-12345';
const connect=async(address,options={})=>{const s=new WebSocket(`ws://127.0.0.1:${address.port}/`,options);await once(s,'open');return s;};
let calls=0;
try {
  const server=await serve({home:root,target:'trello',dispatch:async(_home,_target,payload)=>{calls++;assert.equal(payload.token,secret);return {version:1,ok:true,data:{configured:true}};}});
  try {
    const bad=await connect(server.address);bad.send(JSON.stringify({session:'wrong',payload:{token:secret}}));await once(bad,'close');assert.equal(calls,0);
    const browser=new WebSocket(`ws://127.0.0.1:${server.address.port}/`,{origin:'https://hostile.example'});
    await assert.rejects(once(browser,'open'));assert.equal(calls,0);
    const large=await connect(server.address);large.on('error',()=>{});large.send('x'.repeat(262145));await once(large,'close');assert.equal(calls,0);
    const s=await connect(server.address),reply=once(s,'message');s.send(JSON.stringify({session:server.address.session,payload:{token:secret}}));
    assert.equal(JSON.parse((await reply)[0]).data.configured,true);await server.closed;assert.equal(calls,1);
    const replay=new WebSocket(`ws://127.0.0.1:${server.address.port}/`);await assert.rejects(once(replay,'open'));assert.equal(calls,1);
  } finally {await server.stop();}
  const timeout=await serve({home:root,target:'trello',lifetime:30,dispatch:async()=>{assert.fail('No abandoned dispatch');}});await timeout.closed;
  const abandoned=await serve({home:root,target:'trello',dispatch:async()=>{assert.fail('No cancelled dispatch');}});await abandoned.stop();
  await assert.rejects(serve({home:root,target:'../../arbitrary'}));
  // Exercise the production pipe with a fake child in a copied installed tree.
  const {output}=build(),runtime=path.join(root,'runtime');fs.cpSync(path.join(output,'lib/private-actions'),path.join(runtime,'private-actions'),{recursive:true});
  fs.mkdirSync(path.join(runtime,'trello'));fs.writeFileSync(path.join(runtime,'trello/owner.cjs'),`let text='';process.stdin.on('data',c=>text+=c);process.stdin.on('end',()=>{const p=JSON.parse(text);if(process.argv.join(' ').includes(p.token))process.exit(1);console.log(JSON.stringify({version:1,ok:true,data:{configured:true}}));});`);
  const child=spawn(process.execPath,[path.join(runtime,'private-actions/bridge.cjs'),'--start',root,'trello'],{stdio:['ignore','pipe','pipe']});
  let stdout='',stderr='';child.stdout.on('data',c=>stdout+=c);child.stderr.on('data',c=>stderr+=c);const [code]=await once(child,'close');assert.equal(code,0);assert.equal(stderr,'');assert.ok(!stdout.includes(secret));
  const address=JSON.parse(stdout),s=await connect(address),reply=once(s,'message'),closed=once(s,'close');s.send(JSON.stringify({session:address.session,payload:{token:secret}}));
  assert.equal(JSON.parse((await reply)[0]).data.configured,true);await closed;
  // Child echoing raw input must never return it to the UI.
  fs.writeFileSync(path.join(runtime,'trello/owner.cjs'),`let text='';process.stdin.on('data',c=>text+=c);process.stdin.on('end',()=>console.log(JSON.stringify({version:1,ok:true,data:JSON.parse(text)})));`);
  const {worker}=require(path.join(runtime,'private-actions/bridge.cjs'));const result=await worker(root,'trello',{token:secret},()=>{});assert.equal(result.ok,false);assert.ok(!JSON.stringify(result).includes(secret));
  assert.deepEqual(fs.readdirSync(root).sort(),['runtime'],'No secret-bearing transport or rendezvous files');
  console.log('PASS: private action loopback/session/origin/replay/size/timeout/cancel guards and installed stdin-only worker transport, no credential echo');
} finally {fs.rmSync(root,{recursive:true,force:true});}
