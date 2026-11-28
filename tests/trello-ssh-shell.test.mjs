import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import crypto from 'node:crypto';
import cp from 'node:child_process';
import {PassThrough} from 'node:stream';
import {createRequire} from 'node:module';
import {build} from '../tools/build.mjs';

const require=createRequire(import.meta.url);
const transport=require('../src/services/private-actions/trello-transport.cjs');
const installer=require('../src/services/private-actions/trello-install.cjs');
const bootstrap=require('../src/services/private-actions/trello-bootstrap.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-shell-'));
try {
  const {output}=build(),runtime=path.join(root,'runtime');
  fs.mkdirSync(runtime);
  for(const folder of ['lib','scripts'])fs.cpSync(path.join(output,folder),path.join(runtime,folder),{recursive:true});
  // The runtime installer requires exactly its reviewed module package.
  fs.writeFileSync(path.join(runtime,'package.json'),'{"type":"module"}\n');
  const payload=installer.payload(runtime);
  const expected=Object.fromEntries(Object.entries(payload.files).map(([name,bytes])=>[name,installer.hash(Buffer.from(bytes,'base64'))]));
  const bootstrapFile=path.join(runtime,'lib/private-actions/trello-bootstrap.cjs');
  const installerSource=fs.readFileSync(path.join(runtime,'lib/private-actions/trello-install.cjs'),'utf8');
  const preload=path.join(root,'public-shell-fixture.cjs');
  // Execute the EXACT production command through the real shell/Node decoder and
  // compile the real bootstrap. Replace only its entry call, never contact Core,
  // SSH or Trello, and never run identity checks against the real user's home.
  fs.writeFileSync(preload,`
const fs=require('node:fs'),assert=require('node:assert/strict'),cp=require('node:child_process'),crypto=require('node:crypto');
for(const name of ['spawn','spawnSync','execFileSync'])cp[name]=()=>{throw Error('No external processes in shell fixture');};
const source=fs.readFileSync(${JSON.stringify(bootstrapFile)},'utf8');
global.Function=new Proxy(Function,{construct(target,parameters){
  const initialise=Reflect.construct(target,parameters);
  if(parameters.length!==4||parameters[3]!==source)return initialise;
  return function(...args){
    Reflect.apply(initialise,this,args);
    assert.equal(typeof args[1].exports.main,'function');
    args[1].exports.main=(config,installer)=>process.stdout.write(JSON.stringify({config,installerHash:crypto.createHash('sha256').update(installer).digest('hex')}));
  };
}});
`);
  const env={...process.env,NODE_OPTIONS:'--require '+JSON.stringify(preload.replaceAll('\\','/')),PATH:path.dirname(process.execPath)+path.delimiter+process.env.PATH};
  const shapes=[
    {id:crypto.randomUUID(),session:'default'},
    {id:crypto.randomBytes(192).toString('base64url'),session:crypto.randomBytes(48).toString('base64url')},
  ];
  const actions=['runtime.probe','runtime.install','status','save','verify','replace','remove','discover','policy','control'];
  assert.ok(transport.COMMAND_LIMIT<=8191-512,'Keep real CMD shell overhead margin');
  let maximum=0,shellRuns=0;
  for(const machine of shapes)for(const bound of [false,true]){
    const binding=bound?{...machine,principal:crypto.randomBytes(32).toString('hex'),home:crypto.randomBytes(32).toString('hex')}:null;
    let previous;
    for(const action of actions){
      // Action/credential data intentionally cannot affect the public command.
      const command=transport.commandFor(machine,binding,expected,runtime);
      assert.ok(command.length<=transport.COMMAND_LIMIT,`${action}: ${command.length} exceeds safe CMD budget`);
      maximum=Math.max(maximum,command.length);
      if(previous!==undefined)assert.equal(command,previous,'All actions use the same fixed public bootstrap');
      previous=command;
      const shell=process.platform==='win32'?path.join(process.env.SystemRoot,'System32/cmd.exe'):'/bin/sh';
      const args=process.platform==='win32'?['/d','/s','/c',command]:['-c',command];
      const result=cp.spawnSync(shell,args,{env,encoding:'utf8',timeout:15000,windowsHide:true,windowsVerbatimArguments:process.platform==='win32'});
      assert.equal(result.error,undefined,`${action}: shell failed to start`);
      assert.equal(result.status,0,`${action} (${command.length} chars): ${result.stderr}`);
      assert.deepEqual(JSON.parse(result.stdout),{config:{version:1,machine,binding,expected:payload.revision},installerHash:installer.hash(Buffer.from(installerSource))});
      shellRuns++;
    }
  }
  // Exercise the production installer + bootstrap with a fake Core/home only.
  // Installation no longer mistakes installer PATH for the agent environment.
  const home=path.join(root,'offpath-home'),bin=path.join(root,'offpath-bin');
  assert.equal((await installer.install(home,payload,{bin,envPath:''})).runtime,'ready');
  const oldPath=process.env.PATH,oldBin=process.env.HERDR_TRELLO_BIN;
  let frames;
  try {
    process.env.PATH='';process.env.HERDR_TRELLO_BIN=bin;
    const input=new PassThrough(),output=new PassThrough();let text='',sent=false;
    output.on('data',chunk=>{text+=chunk;if(!sent&&text.includes('"phase":"ready"')){sent=true;input.write(JSON.stringify({version:1,kind:'install',payload})+'\n');}});
    const machine=shapes[0];
    await bootstrap.main({version:1,machine,expected},installerSource,{
      input,output,getHello:async()=>({generation:1,core:{id:machine.id}}),
      executionHome:()=>({home,user:'fake-user',uid:1000,userHome:root}),checkWindows:()=>{},
    });
    frames=text.trim().split('\n').map(JSON.parse);
  } finally {
    if(oldPath===undefined)delete process.env.PATH;else process.env.PATH=oldPath;
    if(oldBin===undefined)delete process.env.HERDR_TRELLO_BIN;else process.env.HERDR_TRELLO_BIN=oldBin;
  }
  assert.equal(frames[0].phase,'ready');
  assert.equal(frames.at(-1).result.ok,true);
  assert.ok(fs.existsSync(path.join(bin,'herdr-trello.cmd')),'An empty installer PATH does not block owned installation');
  // Fail closed before SSH if future public source grows beyond this budget.
  fs.appendFileSync(bootstrapFile,'\n// '+crypto.randomBytes(16384).toString('hex'));
  assert.throws(()=>transport.commandFor(shapes[0],null,expected,runtime),{code:'RUNTIME_INVALID'});
  let spawned=false;
  const refused=await transport.dispatch(path.join(root,'local'),{machine:'fixture'},{action:'status'},()=>{},{runtime,
    spawn(){spawned=true;throw Error('Must not spawn');},
    spawnSync:()=>({status:0,stdout:JSON.stringify({machines:[{name:'fixture',...shapes[0],target:'fixture-host'}]})}),
  });
  assert.equal(refused.error.code,'RUNTIME_INVALID');assert.equal(spawned,false);
  console.log(`PASS: ${shellRuns} actual ${process.platform==='win32'?'cmd.exe':'POSIX shell'} executions; public commands <= ${maximum}/${transport.COMMAND_LIMIT} chars; bootstrap supports off-PATH installation without changing global PATH`);
} finally {fs.rmSync(root,{recursive:true,force:true});}
