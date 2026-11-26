import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {fixture, credentials, A, B} from './testing.test.mjs';
const require=createRequire(import.meta.url),{execute}=require('./owner.cjs'),{Store}=require('./credentials.cjs'),{setup}=require('./setup.cjs');
const f=fixture();let calls=0;
const transport=async url=>{calls++;return Response.json(new URL(url).pathname.endsWith('/boards')?[{id:A,name:'Проект 🐑',closed:false},{id:B,name:'Dormant board',closed:true}]:{id:A,username:'fake-owner',fullName:'Владелец 🐑'});};
const run=async(action,more={})=>{const current=await execute({action:'status'},{store:f.store,transport});assert.equal(current.ok,true);return execute({action,...(action==='status'?{}:{expected:current.data.revision}),...more},{store:f.store,transport});};
try{
 assert.equal((await run('status')).data.namesMissing,true,'Legacy setup has no invented names');assert.equal(calls,0);
 const checked=await run('verify');assert.equal(checked.data.account.name,'Владелец 🐑');assert.equal(checked.data.namedBoards[0].label,'Проект 🐑');assert.equal(calls,2);
 const reopened=await execute({action:'status'},{store:new Store(f.home,{security:()=>{}}),transport:()=>assert.fail('Opening cannot contact Trello')});
 assert.equal(reopened.data.account.name,'Владелец 🐑');assert.equal(reopened.data.namedBoards[0].label,'Проект 🐑');assert.equal(reopened.data.namesMissing,false);
 await run('policy',{add:[B]});assert.deepEqual((await run('status')).data.namedBoards.map(b=>b.label),['Проект 🐑','Dormant board']);
 await run('policy',{remove:[A]});assert.deepEqual((await run('status')).data.namedBoards.map(b=>b.id),[B]);
 assert.equal(fs.readFileSync(f.store.file('display'),'utf8').includes(credentials.token),false);
 const old=f.store.read('display');fs.writeFileSync(f.store.file('display'),'{broken');
 const bad=await execute({action:'status'},{store:f.store,transport});assert.equal(bad.error.code,'STORE_MALFORMED');assert.equal(fs.readFileSync(f.store.file('display'),'utf8'),'{broken');
 fs.writeFileSync(f.store.file('display'),JSON.stringify(old));
 setup(f.store,{...credentials,token:'FAKE_SECOND_ACCOUNT_TOKEN_1234'},true);
 const rotated=await run('status');assert.equal(rotated.data.account,undefined);assert.equal(rotated.data.namedBoards.length,0);assert.equal(rotated.data.allowedBoards,0);assert.equal(rotated.data.localWrites,false);
 const verified=await run('verify');assert.equal(verified.ok,true);
 await run('remove');assert.equal(fs.existsSync(f.store.file('display')),false);assert.equal((await run('status')).data.namesMissing,false);
 // Metadata never grants a board and cannot follow a different credential copy.
 assert.equal((await run('save',credentials)).ok,true);const policy=f.store.read('policy');
 const display=f.store.read('display');f.store.write('display',{...display,boards:[{id:A,label:'Hint only'}]},display);
 const hintOnly=await run('status');assert.equal(hintOnly.data.namedBoards.length,0);assert.deepEqual(f.store.read('policy'),policy);
 f.store.write('credentials',{...f.store.read('credentials'),token:'FAKE_UNRELATED_TOKEN_987654321'},f.store.read('credentials'));
 assert.equal((await run('status')).data.account,undefined);
 console.log('PASS: protected Unicode names survive reopen without requests, explicit legacy hydration, scoped hints, rotation/removal and malformed metadata refusal');
}finally{f.cleanup();}
