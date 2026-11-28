import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import net from 'node:net';import {PassThrough} from 'node:stream';import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),b=require('../src/services/private-actions/trello-bootstrap.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||os.tmpdir(),'trello-proof-'));
const machine={id:'fixture-core',session:'named'},execution={user:'fixture',uid:-1,userHome:root,home:path.join(root,'home'),sid:'S-1-5-21-123-1000'};
const installer=fs.readFileSync(new URL('../src/services/private-actions/trello-install.cjs',import.meta.url),'utf8');
let facts={...execution,profile:root,elevated:false},identity=machine.id,hellos=0,changeAfterHello=false,calls=[];
const fake=()=>({current:()=>true,close(){},async call(method,params){calls.push({method,params});if(method==='hello')return {generation:1,core:{id:changeAfterHello&&++hellos>1?'replacement':identity}};return {code:0,stdout:Buffer.from(JSON.stringify(facts)).toString('base64')};}});
let server;
const old=process.env.LOCALAPPDATA;
try{
 await b.proveCore(fake(),machine,execution);assert.equal(calls[1].method,'machine.exec');assert.ok(!calls[1].params.on);assert.equal(calls[1].params.timeout,5);
 assert.ok(calls.every(c=>!JSON.stringify(c).includes('FAKE_SECRET_SENTINEL')));
 for(const [change,code] of [[{sid:'S-1-5-21-OTHER'},'MACHINE_IDENTITY'],[{userHome:root+'other'},'MACHINE_IDENTITY'],[{profile:root+'other'},'MACHINE_IDENTITY'],[{home:root+'other'},'MACHINE_IDENTITY'],[{elevated:true},'CORE_ELEVATED'],[{elevated:null},'MACHINE_IDENTITY']]){
  facts={...execution,profile:root,elevated:false,...change};await assert.rejects(b.proveCore(fake(),machine,execution),{code});
 }
 facts={...execution,profile:root,elevated:false};identity='changed';await assert.rejects(b.proveCore(fake(),machine,execution),{code:'MACHINE_CHANGED'});identity=machine.id;
 changeAfterHello=true;hellos=0;await assert.rejects(b.proveCore(fake(),machine,execution),{code:'MACHINE_CHANGED'});changeAfterHello=false;
 await assert.rejects(b.proveCore({call:async()=>{throw Object.assign(Error(),{code:'MACHINE_UNAVAILABLE'});}},machine,execution),{code:'MACHINE_UNAVAILABLE'});
 assert.throws(()=>b.privateHome({user:{uid:0},platform:'linux'}),{code:'MACHINE_ELEVATED'});
 // Elevated SSH is not rejected for its token: metadata ownership is still enforced.
 for(const elevated of [true,false])b.windowsUser('named',{env:{LOCALAPPDATA:root,SystemRoot:'C:/Windows'},execute(_file,args,options){const script=Buffer.from(args.at(-1),'base64').toString('utf16le');assert.ok(!script.includes('exit 31'));assert.ok(script.includes('$o -ne $i.User.Value'));assert.equal(options.env.HC_SESSION,'named');assert.equal(typeof elevated,'boolean');}});
 process.env.LOCALAPPDATA=root;const metadata=path.join(root,'herdr-core/named/core.json');fs.mkdirSync(path.dirname(metadata),{recursive:true});
 async function boot({beforeReady,afterReady,verify=b.proveCore,source=installer,kind='probe',current=()=>true,prepare,windowsCheck=()=>{}}={}){
  fs.writeFileSync(metadata,JSON.stringify({id:machine.id}));prepare?.(metadata);const input=new PassThrough(),output=new PassThrough();let text='',sent=false;
  output.on('data',chunk=>{text+=chunk;if(!sent&&text.includes('"phase":"ready"')){sent=true;afterReady?.();input.write(JSON.stringify({version:1,kind,payload:{action:'runtime.probe'}})+'\n');}});
  let verifications=0;
  const done=b.main({version:1,machine,expected:{}},require('node:crypto').createHash('sha256').update(source).digest('hex'),{platform:'win32',input,output,executionHome:()=>({...execution}),checkWindows:windowsCheck,getWindowsFacts:()=>({sid:execution.sid,profile:root,elevated:true}),connectCore:()=>({...fake(),current}),verifyCore:async(...args)=>{await verify(...args);if(++verifications===1)beforeReady?.();}});
  input.write(JSON.stringify({phase:'bootstrap',source})+'\n');await done;
  return text.trim().split('\n').map(JSON.parse);
 }
 let frames=await boot();assert.equal(frames[0].phase,'ready');assert.equal(frames.at(-1).result.ok,true);
 frames=await boot({beforeReady:()=>fs.writeFileSync(metadata,JSON.stringify({id:'replaced'}))});assert.equal(frames.length,1);assert.equal(frames[0].result.error.code,'MACHINE_CHANGED');
 frames=await boot({afterReady:()=>fs.writeFileSync(metadata,JSON.stringify({id:'replaced'}))});assert.equal(frames.at(-1).result.error.code,'MACHINE_CHANGED');
 frames=await boot({prepare:file=>fs.unlinkSync(file)});assert.equal(frames[0].result.error.code,'MACHINE_UNAVAILABLE');
 frames=await boot({windowsCheck:()=>{throw Object.assign(Error(),{code:'MACHINE_IDENTITY'});}});assert.equal(frames.length,1);assert.equal(frames[0].result.error.code,'MACHINE_IDENTITY');
 const linked=path.join(root,'hardlink');frames=await boot({prepare:file=>fs.linkSync(file,linked)});assert.equal(frames[0].result.error.code,'MACHINE_IDENTITY');fs.unlinkSync(linked);
 if(process.platform==='win32'){
  const actual=path.join(root,'actual-session');fs.renameSync(path.dirname(metadata),actual);fs.symlinkSync(actual,path.dirname(metadata),'junction');
  try{frames=await boot();assert.equal(frames[0].result.error.code,'MACHINE_IDENTITY');}finally{fs.unlinkSync(path.dirname(metadata));fs.renameSync(actual,path.dirname(metadata));}
 }
 let guards=0;frames=await boot({kind:'install',source:`module.exports={probe:()=>({runtime:'missing'}),validate(){},async install(home,p,{beforeCommit}){beforeCommit();throw Error('Must refuse at commit');}};`,current:()=>++guards<3});assert.equal(frames.at(-1).result.error.code,'MACHINE_CHANGED');assert.equal(guards,3);
 facts={...facts,elevated:true};frames=await boot();assert.equal(frames.length,1);assert.equal(frames[0].result.error.code,'CORE_ELEVATED');facts.elevated=false;
 // Real public RPC IO, injected endpoint only: no hc subprocess or Core startup.
 const address=process.platform==='win32'?`\\\\.\\pipe\\trello-fixture-${process.pid}`:path.join(root,'rpc.sock');
 server=net.createServer(socket=>{let text='';socket.on('data',bytes=>{text+=bytes;let i;while((i=text.indexOf('\n'))>=0){const request=JSON.parse(text.slice(0,i));text=text.slice(i+1);socket.write(JSON.stringify({jsonrpc:'2.0',id:request.id,result:{generation:1,core:{id:machine.id}}})+'\n');}});});
 await new Promise(resolve=>server.listen(address,resolve));const connection=b.coreConnection('named',{connect:()=>net.createConnection(address)});assert.equal((await connection.call('hello',{generation:1})).core.id,machine.id);connection.close();assert.equal(connection.current(),false);
 console.log('PASS: same-user/Core token/home proof, named-session binding, root/elevated-Core refusal, metadata races before/after READY, existing-only public RPC');
}finally{if(old===undefined)delete process.env.LOCALAPPDATA;else process.env.LOCALAPPDATA=old;if(server)await new Promise(resolve=>server.close(resolve));fs.rmSync(root,{recursive:true,force:true});}
