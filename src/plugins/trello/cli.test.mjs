import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {createRequire} from 'node:module';
import {fileURLToPath, pathToFileURL} from 'node:url';
import {fixture, fakeTransport, A, B, C, L, CHECK, ITEM, credentials, configure} from './testing.test.mjs';
import {syncPreferences} from '../../../tools/runtime/preferences.mjs';
const require=createRequire(import.meta.url),{execute}=require('./cli.cjs'),{run}=require('./operations.cjs'),{retryTime}=require('./client.cjs');
const f=fixture();
try {
 const input=JSON.stringify(credentials);
 const freshHome=path.join(f.root,'fresh'),fresh=new (require('./credentials.cjs').Store)(freshHome,{security:()=>{}});
 const setup=await execute(['setup'],{store:fresh,input});assert.equal(setup.exit,0);assert.ok(!JSON.stringify(setup).includes(credentials.token));
 assert.equal(fresh.read('policy').boards.length,0);assert.equal(fresh.read('policy').allowWrites,false);
 const fake=fakeTransport();const off=await execute(['boards','list'],{store:fresh,...fake});assert.equal(off.result.error.code,'DISABLED');assert.equal(fake.calls.length,0);
 assert.equal((await execute(['policy','allow',A],{store:fresh})).exit,0);
 assert.equal((await execute(['policy','writes','on'],{store:fresh})).exit,0);
 assert.equal((await execute(['policy','allow','*'],{store:fresh})).exit,2);
 configure(f.store,'writes','off');f.state(true,'read-write');
 const privateBefore=['credentials','policy'].map(n=>fs.readFileSync(f.store.file(n),'utf8'));
 const originalRead=fs.readFileSync;
 try {
  fs.readFileSync=(file,...args)=>{assert.ok(!['credentials','policy'].some(n=>String(file)===f.store.file(n)),'Preferences must not read private Trello files');return originalRead(file,...args);};
  syncPreferences('export',f.home,{hostname:'trello-fixture'});
  const snapshot=fs.readFileSync(path.join(f.home,'preferences/trello-fixture.json'),'utf8');
  assert.ok(!snapshot.includes(credentials.apiKey));assert.ok(!snapshot.includes(credentials.token));assert.ok(!snapshot.includes(A));
  const imported=JSON.parse(snapshot);imported.shared['custom.plugins'].trello.settings.boards=[B];imported.shared['custom.plugins'].trello.settings.allowWrites=true;
  fs.writeFileSync(path.join(f.home,'preferences/trello-fixture.json'),JSON.stringify(imported));
  syncPreferences('import',f.home,{hostname:'trello-fixture',isDesktopOpen:()=>false});
 }finally{fs.readFileSync=originalRead;}
 assert.deepEqual(['credentials','policy'].map(n=>fs.readFileSync(f.store.file(n),'utf8')),privateBefore);
 await assert.rejects(run(f.store,'comments.add',{board:A,card:C,text:'hello'},fake),{code:'READ_ONLY'});
 await assert.rejects(run(f.store,'cards.get',{board:B,card:C},fake),{code:'SCOPE'});
 assert.equal(fake.calls.length,0);
 configure(f.store,'writes','on');f.state(true,'read-write');
 const poison=await execute(['cards','create'],{store:f.store,...fake,input:`{"__proto__":{"board":"${A}","list":"${L}","name":"no"}}`});
 assert.equal(poison.exit,2);assert.equal(fake.calls.length,0);
 for(const text of ['[]','null','x',' '.repeat(262145)])assert.equal((await execute(['comments','add','--board',A,'--card',C],{store:f.store,...fake,input:text})).exit,2);
 const now=Date.now();assert.ok(retryTime(new Headers({'Retry-After':new Date(now+180000).toUTCString()}),now)>now+179000);
 assert.ok(retryTime(new Headers({'x-rate-limit-api-token-interval-ms':'360000'}),now)>=now+360000);
 const historical=fakeTransport(route=>route===`/cards/${C}/actions`?Response.json([{id:ITEM,type:'commentCard',data:{card:{id:C},board:{id:B},text:'comment from before move'}}]):undefined);
 assert.equal((await run(f.store,'cards.get',{board:A,card:C},historical)).comments.items[0].text,'comment from before move');
 const oldPolicy=f.store.read('policy'),boards=Array.from({length:21},(_,i)=>(i+16).toString(16).padStart(24,'0'));
 f.store.write('policy',{...oldPolicy,boards},oldPolicy);
 const many=fakeTransport(route=>Response.json({id:route.split('/').at(-1),name:'Allowed'}));
 const first=await run(f.store,'boards.list',{},many);assert.equal(first.items.length,20);assert.equal(first.complete,false);
 const second=await run(f.store,'boards.list',{before:first.nextBefore},many);assert.equal(second.items.length,1);assert.equal(second.complete,true);
 f.store.write('policy',oldPolicy,f.store.read('policy'));
 const wrongChecklist=fakeTransport(route=>route===`/cards/${C}/checklists`?Response.json([{id:CHECK,idCard:B,idBoard:A,checkItems:[]}]):undefined);
 await assert.rejects(run(f.store,'checklists.list',{board:A,card:C},wrongChecklist),{code:'SCOPE'});
 // An actual CLI subprocess gets a test-only injected transport, with no real fetch fallback.
 const preload=path.join(f.root,'offline.mjs'),cli=fileURLToPath(new URL('./cli.cjs',import.meta.url));
 fs.writeFileSync(preload,`import {createRequire} from 'node:module';import {fakeTransport,A,C,ITEM} from ${JSON.stringify(new URL('./testing.test.mjs',import.meta.url).href)};
 const require=createRequire(import.meta.url),c=require(${JSON.stringify(fileURLToPath(new URL('./credentials.cjs',import.meta.url)))}),Base=c.Store;c.Store=class extends Base{constructor(home){super(home,{security:()=>{}})}};
 const fake=fakeTransport((r,o)=>{if(o.method!=='GET'){if(process.env.FAKE_UNKNOWN_WRITE)throw Error('fake private transport error');return Response.json({id:ITEM,data:{card:{id:C},board:{id:A}}});}});globalThis.fetch=fake.transport;
 `);
 const child=(args,input)=>{const r=cp.spawnSync(process.execPath,['--import',pathToFileURL(preload).href,cli,...args],{env:{...process.env,NODE_OPTIONS:'',HERDR_APP_HOME:f.home},input,encoding:'utf8',timeout:15000});assert.ok(!r.error);assert.ok(!r.stderr.includes(credentials.token));assert.ok(!r.stdout.includes(credentials.token));return {...r,value:JSON.parse(r.stdout)};};
 assert.equal(child(['cards','get',C,'--board',A]).value.data.card.id,C);
 assert.equal(child(['comments','add','--card',C,'--board',A],'{"text":"subprocess comment"}').value.data.applied,true);
 const old=process.env.FAKE_UNKNOWN_WRITE;process.env.FAKE_UNKNOWN_WRITE='1';
 try {const out=child(['comments','add','--card',C,'--board',A],'{"text":"uncertain"}');assert.equal(out.status,4);assert.equal(out.value.error.outcome,'unknown');}
 finally{if(old===undefined)delete process.env.FAKE_UNKNOWN_WRITE;else process.env.FAKE_UNKNOWN_WRITE=old;}
 f.state(false);assert.equal(child(['boards','list']).value.error.code,'DISABLED');
 console.log('PASS: offline CLI subprocess contracts, local setup, preference privacy, scope/write caps, hostile JSON and historical comments');
}finally{f.cleanup();}
