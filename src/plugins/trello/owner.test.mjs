import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
import {credentials,A,B,Store} from './testing.test.mjs';
const require=createRequire(import.meta.url),{execute}=require('./owner.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-owner-'));
const store=new Store(path.join(root,'home'),{security:()=>{}}),calls=[];
const transport=async(url,options)=>{const u=new URL(url);assert.equal(u.origin,'https://api.trello.com');assert.equal(options.redirect,'manual');assert.equal(u.searchParams.get('key'),credentials.apiKey);assert.equal(u.searchParams.get('token'),credentials.token);calls.push(u.pathname);if(u.pathname==='/1/members/me')return Response.json({id:A,username:'fake-owner',fullName:'Fake Owner'});if(u.pathname==='/1/members/me/boards')return Response.json([{id:A,name:'Allowed by owner',closed:false},{id:B,name:'Other board',closed:false}]);assert.fail('Unexpected route');};
let revision;
const run=async(action,extra={},io={})=>{const result=await execute({action,...(action==='status'?{}:{expected:revision}),...extra},{store,transport,...io});assert.ok(!JSON.stringify(result).includes(credentials.apiKey));assert.ok(!JSON.stringify(result).includes(credentials.token));if(result.ok)revision=result.data.revision;return result;};
try {
 const first=await run('status');assert.equal(first.data.configured,false);assert.equal(fs.existsSync(store.dir),false,'Status creates no private files');
 const original=revision;
 assert.equal((await run('save',{apiKey:'short',token:'short'})).error.code,'INPUT');assert.equal(calls.length,0);
 for(const status of [401,403,404,500,302]){const bad=await run('save',credentials,{transport:async()=>new Response('hostile '+credentials.token,{status})});assert.equal(bad.ok,false);assert.equal(fs.existsSync(store.file('credentials')),false);assert.equal(revision,original);}
 const saved=await run('save',credentials);assert.equal(saved.data.account.username,'fake-owner');assert.equal(saved.data.configured,true);assert.equal(saved.data.allowedBoards,0);assert.deepEqual(store.read('credentials'),{version:1,...credentials});
 assert.equal((await run('verify')).data.account.name,'Fake Owner');
 const discovered=await run('discover');assert.equal(discovered.data.items.length,2);assert.equal(discovered.data.complete,true);assert.deepEqual(store.read('policy').boards,[],'Discovery never grants boards');
 await run('policy',{add:[A],allowWrites:true});assert.deepEqual(store.read('policy').boards,[A]);assert.equal(store.read('policy').allowWrites,true);
 const old=revision;await run('policy',{add:[B]});assert.equal((await execute({action:'policy',expected:old,remove:[A]},{store,transport})).error.code,'CONFLICT');
 // No portable/shared import participates in private policy.
 fs.writeFileSync(path.join(store.home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:true,settings:{access:'read-write',boards:['f'.repeat(24)],token:'ignored'}}}}));
 await run('policy',{allowWrites:false});assert.equal((await run('status')).data.localWrites,false);assert.deepEqual(store.read('policy').boards,[A,B]);
 const before=store.read('credentials'),beforePolicy=store.read('policy');
 assert.equal((await run('replace',credentials,{transport:async()=>new Response(null,{status:401})})).error.code,'AUTH');assert.deepEqual(store.read('credentials'),before);assert.deepEqual(store.read('policy'),beforePolicy);
 // A hostile provider echo is rejected before replacing or returning credentials.
 assert.equal((await run('replace',credentials,{transport:async()=>Response.json({id:A,username:credentials.token,fullName:'Not safe'})})).error.code,'RESPONSE');assert.deepEqual(store.read('policy'),beforePolicy);
 assert.equal((await run('policy',{add:['no-board']})).ok,false);assert.equal((await run('policy',{add:['f'.repeat(24)]})).error.code,'SCOPE');
 const many=Array.from({length:1001},(_,i)=>({id:i.toString(16).padStart(24,'0'),name:'Board '+i,closed:false}));
 const partial=await run('discover',{}, {transport:async()=>Response.json(many)});assert.equal(partial.data.complete,false);assert.equal(partial.data.items.length,1000);assert.deepEqual(store.read('policy').boards,[A,B]);
 const manyAdds=Array.from({length:100},(_,i)=>i.toString(16).padStart(24,'0'));
 assert.equal((await run('policy',{add:manyAdds})).error.code,'STORE_MALFORMED','More than 100 combined grants fails closed');
 await run('replace',credentials);assert.deepEqual(store.read('policy'),{version:1,boards:[],allowWrites:false});
 // Concurrent private changes during a network read reject old credentials/policy.
 const stale=await run('verify',{}, {transport:async()=>{store.write('policy',{version:1,boards:[B],allowWrites:false},store.read('policy'));return Response.json({id:A,username:'fake-owner',fullName:'Fake Owner'});}});assert.equal(stale.error.code,'CONFLICT');await run('status');
 // Interrupted replacement resets authority before touching credentials.
 await run('policy',{allowWrites:true});
 const write=store.write.bind(store),oldCredentials=store.read('credentials');
 store.write=(name,...args)=>{if(name==='credentials')throw Error('synthetic interruption');return write(name,...args);};
 assert.equal((await run('replace',credentials)).error.code,'STORE_IO');store.write=write;
 assert.deepEqual(store.read('credentials'),oldCredentials);assert.deepEqual(store.read('policy'),{version:1,boards:[],allowWrites:false});assert.equal(fs.existsSync(path.join(store.dir,'config.lock')),false);await run('status');
 const removed=await run('remove');assert.equal(removed.data.configured,false);assert.equal(removed.data.removed,true);assert.equal(fs.existsSync(store.file('credentials')),false);assert.deepEqual(store.read('policy'),{version:1,boards:[],allowWrites:false});
 assert.equal((await run('verify')).error.code,'STORE_MISSING');
 // Corrupt existing stores are not repaired, even by explicit Save.
 fs.writeFileSync(store.file('credentials'),'not-json');assert.equal((await run('status')).error.code,'STORE_MALFORMED');assert.equal((await run('save',credentials)).error.code,'STORE_MALFORMED');assert.equal(fs.readFileSync(store.file('credentials'),'utf8'),'not-json');fs.unlinkSync(store.file('credentials'));
 await run('status');
 const rate=await run('save',credentials,{transport:async()=>new Response(null,{status:429,headers:{'Retry-After':'120'}})});assert.equal(rate.error.code,'RATE_LIMIT');let attempted=false;
 assert.equal((await run('save',credentials,{transport:async()=>{attempted=true;throw Error('no');}})).error.code,'RATE_LIMIT');assert.equal(attempted,false);assert.equal(fs.existsSync(store.file('credentials')),false);
 assert.ok(calls.every(route=>route.startsWith('/1/members/me')));
 console.log('PASS: owner verify/save/replace/remove, safe projection, protected CAS/policy reset, owner-only bounded discovery, no imported authority and cooldown');
} finally {fs.rmSync(root,{recursive:true,force:true});}
