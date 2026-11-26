// Actual installed owner/bridge subprocesses and private store, injected fetch only.
import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';
import {createRequire} from 'node:module';import {execFileSync} from 'node:child_process';import {once} from 'node:events';
import {build} from '../tools/build.mjs';import {deploy} from '../tools/deploy.mjs';import {syncPreferences} from '../tools/runtime/preferences.mjs';
const require=createRequire(import.meta.url),{WebSocket}=require('../src/services/private-actions/vendor/ws/index.js');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-installed-')),home=path.join(root,'home'),bin=path.join(root,'bin');
const apiKey='FAKE_INSTALLED_API_KEY',token='FAKE_INSTALLED_TOKEN',A='a'.repeat(24),B='b'.repeat(24),M='c'.repeat(24);
const preload=path.join(root,'injected.cjs');
fs.writeFileSync(preload,`globalThis.fetch=async(url,options)=>{const u=new URL(url);if(u.origin!=='https://api.trello.com'||options.method!=='GET')throw Error('No live fetch fallback');if(!u.searchParams.get('key')?.startsWith('FAKE_')||!u.searchParams.get('token')?.startsWith('FAKE_'))throw Error('Bad fake auth');if(u.pathname==='/1/members/me')return Response.json({id:'${M}',username:'fixture',fullName:'Fixture Owner'});if(u.pathname==='/1/members/me/boards')return Response.json([{id:'${A}',name:'Board A 🐑',closed:false},{id:'${B}',name:'Board B',closed:false}]);if(u.pathname==='/1/boards/${A}')return Response.json({id:'${A}',name:'Board A 🐑'});throw Error('Unfaked route');};`);
const env={...process.env,NODE_OPTIONS:`--require=${JSON.stringify(preload)}`,HERDR_APP_HOME:home,HERDR_APP_BIN:path.join(root,'no-desktop')};
const runtime=path.join(home,'.customizations/runtime/lib'),owner=path.join(runtime,'trello/owner.cjs');
const node=(file,args=[])=>execFileSync(process.execPath,[file,...args],{env,encoding:'utf8',timeout:60000});
const status=()=>JSON.parse(node(owner,['--status',home]));
async function action(payload){
 const descriptor=JSON.parse(node(path.join(runtime,'private-actions/bridge.cjs'),['--start',home,'trello']));
 assert.ok(!JSON.stringify(descriptor).includes(apiKey));assert.ok(!JSON.stringify(descriptor).includes(token));
 const socket=new WebSocket(`ws://127.0.0.1:${descriptor.port}/`);let timer;
 try{
  await once(socket,'open');const reply=once(socket,'message');socket.send(JSON.stringify({session:descriptor.session,payload}));
  const [bytes]=await Promise.race([reply,new Promise((_,reject)=>timer=setTimeout(()=>reject(Error('Installed action timeout')),60000))]);const result=JSON.parse(bytes.toString());
  assert.equal(result.ok,true,JSON.stringify(result));assert.ok(!JSON.stringify(result).includes(apiKey));assert.ok(!JSON.stringify(result).includes(token));return result.data;
 }finally{clearTimeout(timer);socket.terminate();}
}
try{
 const previous=process.env.PATH;process.env.PATH=bin+path.delimiter+previous;try{deploy(build().output,home,{repair:false,trelloBin:bin});}finally{process.env.PATH=previous;}
 let state=status().data;assert.equal(state.configured,false);
 state=await action({action:'save',expected:state.revision,apiKey,token});assert.equal(state.account.name,'Fixture Owner');assert.equal(state.configured,true);
 const discovered=await action({action:'discover',expected:state.revision});assert.equal(discovered.items[0].label,'Board A 🐑');assert.equal(discovered.items.length,2);
 state=await action({action:'policy',expected:state.revision,add:[A],allowWrites:true});assert.equal(state.allowedBoards,1);
 // Import can request public Access, but does not populate board grants or local write opt-in.
 fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:true,settings:{access:'read-write'}}},'custom.trello.runtime':{unrelated:'excluded'}}));
 state=await action({action:'policy',expected:state.revision,allowWrites:false});
 syncPreferences('export',home,{hostname:'fixture',isDesktopOpen:()=>false});
 const exported=fs.readFileSync(path.join(home,'preferences/fixture.json'),'utf8');assert.ok(!exported.includes(token));assert.ok(!exported.includes(apiKey));assert.ok(!exported.includes(A));assert.ok(!exported.includes('runtime'));
 const privateBefore=fs.readFileSync(path.join(home,'.customizations/trello/policy.json'),'utf8');syncPreferences('import',home,{hostname:'fixture',isDesktopOpen:()=>false});assert.equal(fs.readFileSync(path.join(home,'.customizations/trello/policy.json'),'utf8'),privateBefore);assert.equal(status().data.localWrites,false);
 // Forged credential-bearing snapshots must be refused, not copied to custom.plugins.
 const snapshotFile=path.join(home,'preferences/fixture.json'),sharedBefore=fs.readFileSync(path.join(home,'shared.json'),'utf8');
 for(const [field,value]of [['token',token],['apiKey',apiKey]]){fs.writeFileSync(snapshotFile,JSON.stringify({version:1,shared:{'custom.plugins':{trello:{enabled:true,settings:{access:'read-write',[field]:value}}}}}));assert.throws(()=>syncPreferences('import',home,{hostname:'fixture',isDesktopOpen:()=>false}),/credential/);assert.equal(fs.readFileSync(path.join(home,'shared.json'),'utf8'),sharedBefore);assert.equal(fs.readFileSync(path.join(home,'.customizations/trello/policy.json'),'utf8'),privateBefore);}
 fs.writeFileSync(snapshotFile,exported);
 const listed=JSON.parse(node(path.join(runtime,'trello/cli.cjs'),['boards','list','--home',home]));assert.equal(listed.ok,true);assert.ok(JSON.stringify(listed).includes('Board A'));assert.ok(!JSON.stringify(listed).includes(B),'Agent listing cannot discover account boards');
 state=await action({action:'remove',expected:state.revision});assert.equal(state.configured,false);assert.equal(fs.existsSync(path.join(home,'.customizations/trello/credentials.json')),false);
 // No source checkout or global package participates in these installed workers.
 assert.ok(fs.existsSync(path.join(runtime,'private-actions/vendor/ws/LICENSE.txt')));
 for(const rel of fs.readdirSync(root,{recursive:true}).filter(rel=>fs.statSync(path.join(root,rel)).isFile())){const bytes=fs.readFileSync(path.join(root,rel));assert.ok(!bytes.includes(Buffer.from(token)),`Secret retained outside removed credential store: ${rel}`);assert.ok(!bytes.includes(Buffer.from(apiKey)),`Key retained outside removed credential store: ${rel}`);}
 for(const file of [owner,path.join(runtime,'private-actions/bridge.cjs')])assert.ok(!fs.readFileSync(file,'utf8').includes('node_modules'));
 console.log('PASS: installed owner/bridge/private ACL flow, Unicode board choices, allowlisted CLI, real preference export/import isolation and removal with injected fetch only');
}finally{fs.rmSync(root,{recursive:true,force:true});}
