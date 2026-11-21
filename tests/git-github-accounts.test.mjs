// Named GitHub accounts: fake credentials, private child env, no real gh/network.
import assert from 'node:assert/strict';import fs from 'node:fs/promises';import path from 'node:path';import os from 'node:os';import {createHash} from 'node:crypto';
import github from '../src/plugins/git/github.cjs';import setup from '../src/plugins/git/setup.cjs';
const secret='fixture-private-gh-token',calls=[],ambient={GH_TOKEN:'ambient-private',GITHUB_TOKEN:'other-private',GH_DEBUG:'api',HOME:'/fixture'};
const execute=async(args,input,env)=>{
 calls.push({args,input,env});assert.ok(!args.some(arg=>arg.includes(secret)||arg.includes('ambient-private')),'No credential in argv');
 if(args[0]==='auth'){
  assert.equal(env.GH_TOKEN,undefined);assert.equal(env.GITHUB_TOKEN,undefined);assert.equal(env.GH_DEBUG,undefined);
  if(args[1]==='status')return JSON.stringify([{login:'work-user',active:true,state:'success',token:secret},{login:'personal-user',active:false,state:'success'},{login:'signed-out',active:false,state:'failed'}]);
  assert.deepEqual(args,['auth','token','--hostname','github.com','--user','personal-user']);return secret;
 }
 assert.equal(args[0],'api');assert.equal(env.GH_TOKEN,secret);assert.equal(env.GITHUB_TOKEN,undefined);assert.equal(args.at(-1),'github.com');
 if(args[1]==='user')return 'personal-user';
 if(args[1].startsWith('user/repos?'))return JSON.stringify([{name:'owner/repo',id:101}]);
 if(args[1]==='repos/owner/repo')return '101';
 if(args.includes('--method'))return '{}';return '[[]]';
};
const io={execute,env:ambient};const accounts=await github.accounts(io);assert.equal(accounts.active,'work-user');assert.deepEqual(accounts.accounts,[{login:'work-user',active:true},{login:'personal-user',active:false}]);assert.ok(!JSON.stringify(accounts).includes(secret));
const api=await github.forAccount('personal-user',io);await api(['api','repos/owner/repo/hooks','--paginate','--slurp']);const count=calls.length;
for(const args of [['api','https://untrusted.example/usage'],['auth','switch'],['api','user','--hostname','untrusted.example']])assert.throws(()=>api(args),/Unsupported/);assert.equal(calls.length,count,'Forbidden requests never receive credentials');
await assert.rejects(github.forAccount('../invalid',io),/Choose/);
await assert.rejects(github.forAccount('personal-user',{execute:async()=>{throw Error(secret);}}),e=>e.safe&&!e.message.includes(secret));
for(const token of ['',secret+'\nInjected: header','x'.repeat(8193)])await assert.rejects(github.forAccount('personal-user',{execute:async()=>token}),/login is unavailable/);
await assert.rejects(github.forAccount('personal-user',{execute:async args=>args[0]==='auth'?secret:'wrong-user'}),/identity changed/);
assert.equal((await github.accounts({execute:async()=>'{invalid'})).status,'missing');assert.deepEqual((await github.accounts({execute:async()=> '[]'})).accounts,[]);
const dir=await fs.mkdtemp(path.join(os.tmpdir(),'herdr-github-accounts-')),file=path.join(dir,'keys.json'),keys={token:'a'.repeat(64),secret:'b'.repeat(64)};
try{
 await fs.writeFile(file,JSON.stringify(keys));const bridge={github:io,fetch:async()=>({ok:true,json:async()=>({protocol:1,secretHash:createHash('sha256').update(keys.secret).digest('hex')})})};
 const before=calls.length,list=await setup.run('repositories',file,'https://relay.fixture','',bridge,'personal-user');assert.equal(list.account,'personal-user');assert.equal(list.repositories.length,1);assert.ok(!calls.slice(before).some(c=>c.args.includes('--method')),'Account selection/inventory is read-only');
 const payload=JSON.stringify({names:['owner/repo'],ids:{'owner/repo':101},enabled:true,account:'personal-user'});await setup.run('set-repositories',file,'https://relay.fixture',payload,bridge);
 const write=calls.find(c=>c.args.includes('--method'));assert.equal(write.env.GH_TOKEN,secret);assert.equal(write.input.config.secret,keys.secret,'Webhook secret only enters stdin');assert.ok(!write.args.join(' ').includes(keys.secret));assert.ok(!calls.some(c=>c.args.includes('switch')),'Global gh login is never changed');
}finally{await fs.rm(dir,{recursive:true,force:true});}
// Repository accounts: an account administering no active repository is hidden; a
// failed probe keeps it; pages stop at the first administered repository.
{
 const pages={'admin-user':[[0,100],[1,40]],'reader-user':[[0,100],[0,3]],'broken-user':null},seen=[];
 const probe=async(args,_input,env)=>{
  if(args[0]==='auth'&&args[1]==='status')return JSON.stringify(Object.keys(pages).map((login,i)=>({login,active:i===0,state:'success'})));
  if(args[0]==='auth')return `token-${args.at(-1)}`;
  const login=env.GH_TOKEN.slice(6);
  if(args[1]==='user')return login;
  const page=Number(/[?&]page=(\d+)/.exec(args[1])[1]);seen.push([login,page]);
  assert.ok(args[1].startsWith('user/repos?per_page=100&page='));assert.ok(!args.includes('--paginate'),'Probes fetch one page at a time');
  if(!pages[login])throw Error('rate limited');return JSON.stringify(pages[login][page-1]);
 };
 const found=await github.repositoryAccounts({execute:probe,env:{}});
 assert.deepEqual(found.accounts.map(a=>[a.login,a.administers]),[['admin-user',true],['reader-user',false],['broken-user',null]]);
 assert.deepEqual(seen.filter(([l])=>l==='admin-user').map(([,p])=>p),[1,2],'Stops at the first page with an administered repository');
 assert.equal(found.active,'admin-user');assert.ok(!JSON.stringify(found).includes('token-'),'No credential in the result');
}
console.log('PASS: public GitHub account choices, named private-env API requests, identity/endpoint validation, isolated inventory/Apply and no global login switch or credential output');
