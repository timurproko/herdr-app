import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import zlib from 'node:zlib';import {createRequire} from 'node:module';import {EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';
import {build} from '../tools/build.mjs';
const require=createRequire(import.meta.url),installer=require('../src/services/private-actions/trello-install.cjs'),transport=require('../src/services/private-actions/trello-transport.cjs'),bootstrap=require('../src/services/private-actions/trello-bootstrap.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-remote-'));
const local=path.join(root,'local'),remote=path.join(root,'remote'),runtime=path.join(root,'runtime'),bin=path.join(root,'bin');
const key='FAKE_REMOTE_KEY_NOT_REAL',token='FAKE_REMOTE_TOKEN_NOT_REAL',A='a'.repeat(24);
const machine={name:'pc2',id:'fake-core',session:'test',target:'fixture-host',state:'connected'};
const binding={id:machine.id,session:machine.session,principal:'e'.repeat(64),home:'f'.repeat(64)};
try{
 const {output}=build();fs.mkdirSync(runtime,{recursive:true});fs.cpSync(path.join(output,'lib'),path.join(runtime,'lib'),{recursive:true});fs.cpSync(path.join(output,'scripts'),path.join(runtime,'scripts'),{recursive:true});fs.writeFileSync(path.join(runtime,'package.json'),'{"type":"module"}\n');
 const p=installer.payload(runtime);assert.ok(JSON.stringify(p).length<262144);assert.ok(!JSON.stringify(p).includes(token));
 fs.mkdirSync(path.join(remote,'.customizations/trello'),{recursive:true});const privateFile=path.join(remote,'.customizations/trello/credentials.json');fs.writeFileSync(privateFile,'private sentinel never read by installer');fs.mkdirSync(bin);
 const read=fs.readFileSync;try{fs.readFileSync=(file,...args)=>{assert.notEqual(String(file),privateFile);return read(file,...args);};await installer.install(remote,p,{bin,envPath:bin});}finally{fs.readFileSync=read;}
 assert.equal(fs.readFileSync(privateFile,'utf8'),'private sentinel never read by installer');
 const expected=Object.fromEntries(Object.entries(p.files).map(([n,v])=>[n,installer.hash(Buffer.from(v,'base64'))]));assert.equal(installer.probe(path.join(remote,'.customizations/runtime'),expected).runtime,'ready');
 const changed=structuredClone(p);changed.files['lib/trello/help.cjs']=Buffer.from(Buffer.from(changed.files['lib/trello/help.cjs'],'base64').toString()+'\n// fake update').toString('base64');changed.revision=installer.revision(changed.files);
 await installer.install(remote,changed,{bin,envPath:bin});await installer.rollback(remote);assert.equal(installer.probe(path.join(remote,'.customizations/runtime'),expected).runtime,'ready');
 fs.appendFileSync(path.join(remote,'.customizations/runtime/lib/trello/help.cjs'),'\n// personal');await assert.rejects(installer.install(remote,p,{bin,envPath:bin}),{code:'RUNTIME_CONFLICT'});fs.writeFileSync(path.join(remote,'.customizations/runtime/lib/trello/help.cjs'),Buffer.from(p.files['lib/trello/help.cjs'],'base64'));
 await assert.rejects(installer.install(path.join(root,'offpath'),p,{bin:path.join(root,'offpath-bin'),envPath:''}),/PATH/);
 const failedHome=path.join(root,'failed');await assert.rejects(installer.install(failedHome,p,{bin:path.join(root,'failed-bin'),envPath:path.join(root,'failed-bin'),beforeCommit(){throw Error('fake failure');}}));assert.ok(!fs.existsSync(path.join(failedHome,'.customizations/runtime/lib/trello/cli.cjs')));
 fs.unlinkSync(privateFile);
 const installedRequire=createRequire(path.join(remote,'.customizations/runtime/lib/trello/owner.cjs')),owner=installedRequire('./owner.cjs'),{Store}=installedRequire('./credentials.cjs'),store=new Store(remote,{security:()=>{}});
 let provider=0;const fakeFetch=async url=>{provider++;return Response.json(new URL(url).pathname.endsWith('/boards')?[{id:A,name:'Remote board',closed:false}]:{id:A,username:'remote-owner',fullName:'Remote owner'});};
 const spawnSync=()=>({status:0,stdout:JSON.stringify({machines:[machine]})});
 let sends=0,starts=0,lastCommand,mode='normal';
 const spawn=(program,args,options)=>{
  starts++;assert.equal(program,'ssh');assert.ok(args.includes('BatchMode=yes'));assert.ok(args.includes('StrictHostKeyChecking=yes'));assert.ok(args.includes('-T'));assert.equal(options.stdio[0],'pipe');
  lastCommand=args.at(-1);assert.ok(lastCommand.length<30000);assert.ok(!JSON.stringify(args).includes(key));assert.ok(!JSON.stringify(args).includes(token));
  const encoded=/Buffer.from\('([^']+)','base64'\)/.exec(lastCommand)[1],publicSource=zlib.gunzipSync(Buffer.from(encoded,'base64')).toString();assert.ok(!publicSource.includes(key));assert.ok(!publicSource.includes(token));
  const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{child.stdin.destroy();child.stdout.destroy();};
  child.stdin.on('data',async bytes=>{
   sends++;const req=JSON.parse(bytes.toString());assert.equal(req.version,1);
   if(mode==='lost'){await owner.execute(req.payload,{store,transport:fakeFetch,binding,initialControl:req.initialControl});queueMicrotask(()=>child.emit('close',1));return;}
   let result;
   if(req.kind==='probe')result={version:1,ok:true,data:{runtime:'ready',destination:binding}};
   else if(req.kind==='install')result={version:1,ok:true,data:{runtime:'ready',installed:true,destination:binding}};
   else{result=await owner.execute(req.payload,{store,transport:fakeFetch,binding,initialControl:req.initialControl});if(result.ok)result.data.destination=binding;}
   child.stdout.write(JSON.stringify({version:1,phase:'result',result})+'\n');
  });
  if(mode!=='hang')queueMicrotask(()=>child.stdout.write(mode==='malformed'?'not a frame\n':JSON.stringify({version:1,phase:'ready',binding:mode==='wrong'?{...binding,id:'wrong-core'}:binding,runtime:'ready'})+'\n'));
  return child;
 };
 const options={runtime,spawn,spawnSync};
 let state=await transport.dispatch(local,{machine:'pc2'},{action:'status'},()=>{},options);assert.equal(state.ok,true);assert.equal(state.data.configured,false);
 const run=async(action,extra={})=>{const r=await transport.dispatch(local,{machine:'pc2',binding},{action,...(action==='status'?{}:{expected:state.data.revision}),...extra},()=>{},options);if(r.ok)state=r;return r;};
 assert.equal((await run('save',{apiKey:key,token})).data.account.name,'Remote owner');assert.equal(fs.existsSync(path.join(local,'.customizations/trello/credentials.json')),false);
 assert.equal((await run('verify')).ok,true);assert.equal((await run('discover')).data.items[0].label,'Remote board');assert.equal((await run('policy',{add:[A]})).data.allowedBoards,1);assert.equal((await run('policy',{remove:[A]})).data.allowedBoards,0);assert.equal((await run('remove')).data.configured,false);assert.equal(fs.existsSync(path.join(local,'.customizations/trello/credentials.json')),false);
 const before=sends;mode='wrong';assert.equal((await run('save',{apiKey:key,token})).error.code,'MACHINE_CHANGED');assert.equal(sends,before,'No credential bytes before valid READY');mode='normal';
 const beforeRefused=starts;
 for(const change of [{temporary:true},{via:'custom'}, {id:'replaced-core'}]){
  const r=await transport.dispatch(local,{machine:'pc2',binding},{action:'save',apiKey:key,token},()=>{},{...options,spawnSync:()=>({status:0,stdout:JSON.stringify({machines:[{...machine,...change}]})})});assert.equal(r.ok,false);assert.ok(['MACHINE_UNSUPPORTED','MACHINE_CHANGED'].includes(r.error.code));
 }
 assert.equal(starts,beforeRefused,'Refused targets cannot spawn SSH');
 mode='lost';const unknown=await run('save',{apiKey:key,token});assert.equal(unknown.error.code,'CONFIG_UNKNOWN');assert.equal(unknown.error.outcome,'unknown');mode='normal';
 assert.ok(!JSON.stringify(unknown).includes(token));assert.equal((await run('status')).data.configured,true,'A lost reply may have committed; status reconciles without replay');
 const beforeHang=sends;mode='hang';assert.equal((await transport.dispatch(local,{machine:'pc2',binding},{action:'save',apiKey:key,token},()=>{},{...options,timeout:10})).error.code,'SSH_UNAVAILABLE');assert.equal(sends,beforeHang);mode='malformed';assert.equal((await run('status')).error.code,'SSH_UNAVAILABLE');assert.equal(sends,beforeHang);mode='normal';
 let checks=0;const replaced=await transport.dispatch(local,{machine:'pc2',binding},{action:'remove',expected:state.data.revision},()=>{},{...options,spawnSync:()=>({status:0,stdout:JSON.stringify({machines:[++checks===1?machine:{...machine,id:'replaced-after-ready'}]})})});assert.equal(replaced.error.code,'MACHINE_CHANGED');assert.equal(sends,beforeHang);
 const oldRevision=state.data.revision;let active=true;const refusedCommit=await owner.execute({action:'replace',expected:oldRevision,apiKey:key,token},{store,isCurrent:()=>active,transport:async()=>{active=false;return Response.json({id:A,username:'late',fullName:'Late owner'});}});assert.equal(refusedCommit.error.code,'STALE');assert.equal((await run('status')).data.account.name,'Remote owner');
 assert.ok(provider>0);assert.ok(starts>0);
 // Exercise the production bootstrap with only identity/Core/IO injected, never real SSH.
 const source=fs.readFileSync(new URL('../src/services/private-actions/trello-install.cjs',import.meta.url),'utf8');
 async function boot(kind,identity={core:{id:machine.id},generation:1}){
  const input=new PassThrough(),out=new PassThrough();let text='',ready;
  out.on('data',chunk=>{text+=chunk;for(const line of text.trim().split('\n')){try{const r=JSON.parse(line);if(r.phase==='ready'&&!ready){ready=r;input.write(JSON.stringify({version:1,kind,payload:{action:'status'}})+'\n');}}catch{}}});
  await bootstrap.main({version:1,machine,expected},source,{input,output:out,getHello:async()=>identity,executionHome:()=>({home:remote,user:'fake-user',uid:1000,userHome:root}),checkWindows:()=>{}});
  return text.trim().split('\n').map(line=>JSON.parse(line));
 }
 const fullHome=path.join(root,'full-home'),fullBin=path.join(root,'full-bin');await installer.install(fullHome,p,{bin:fullBin,envPath:fullBin});const owned=JSON.parse(fs.readFileSync(path.join(fullHome,'.customizations/trello-runtime.json')));const fullManifest=path.join(fullHome,'.customizations/manifest.json');fs.writeFileSync(fullManifest,JSON.stringify({version:2,id:'custom',files:{...owned.files,'unrelated-owned-file':'f'.repeat(64)}}));await installer.install(fullHome,changed,{bin:fullBin,envPath:fullBin});assert.equal(JSON.parse(fs.readFileSync(fullManifest)).files['unrelated-owned-file'],'f'.repeat(64));
 fs.writeFileSync(path.join(fullBin,'.herdr-trello.lock'),'other installer');await assert.rejects(installer.install(fullHome,changed,{bin:fullBin,envPath:fullBin}),{code:'RUNTIME_BUSY'});fs.unlinkSync(path.join(fullBin,'.herdr-trello.lock'));
 const frames=await boot('probe');assert.equal(frames[0].phase,'ready');assert.equal(frames.at(-1).result.data.runtime,'ready');assert.equal((await boot('probe',{core:{id:'wrong-core'},generation:1}))[0].result.error.code,'MACHINE_CHANGED');
 console.log('PASS: injected direct SSH/stdin routing, pre-secret identity refusal, per-host owner lifecycle, unknown outcome, bootstrap proof and conflict-safe Trello-only install/rollback');
}finally{fs.rmSync(root,{recursive:true,force:true});}
