// Exercise the REAL gh parser/JQ/pagination against localhost, never GitHub.
// Isolated config/home and fake auth; the server refuses all mutations.
import assert from 'node:assert/strict';
import http from 'node:http';import {execFile} from 'node:child_process';import {promisify} from 'node:util';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';
import repositories from '../src/plugins/git/repositories.cjs';
const exec=promisify(execFile),home=await fs.mkdtemp(path.join(os.tmpdir(),'herdr-gh-cli-')),env={...process.env};
for(const key of Object.keys(env))if(/^(?:GH_|GITHUB_)/.test(key)||/_proxy$/i.test(key))delete env[key];
Object.assign(env,{GH_TOKEN:'fixture-not-real',GH_CONFIG_DIR:home,GH_NO_UPDATE_NOTIFIER:'1',GH_NO_EXTENSION_UPDATE_NOTIFIER:'1',GH_PROMPT_DISABLED:'1',HOME:home,USERPROFILE:home,XDG_CONFIG_HOME:home,APPDATA:home,LOCALAPPDATA:home,NO_PROXY:'127.0.0.1,localhost'});
const requests=[];
const record=(name,id,extra={})=>({full_name:name,id,permissions:{admin:true},archived:false,disabled:false,...extra});
const server=http.createServer((req,res)=>{
 requests.push({method:req.method,url:req.url});res.setHeader('Content-Type','application/json');
 if(req.method!=='GET'){res.statusCode=405;res.end('{}');return;}
 const url=new URL(req.url,`http://127.0.0.1:${server.address().port}`);
 if(url.pathname==='/user'){res.end(JSON.stringify({login:'fixture-user'}));return;}
 if(url.pathname==='/user/repos'){
  const page=Number(url.searchParams.get('page')??1);
  if(page<3){url.searchParams.set('page',String(page+1));res.setHeader('Link',`<${url.href}>; rel="next"`);}
  res.end(JSON.stringify(page===1?[record('owner/one',101),record('owner/not-admin',102,{permissions:{admin:false}})]:page===2?[record('owner/two',103),record('owner/archived',104,{archived:true}),record('owner/one',101)]:[]));return;
 }
 if(/^\/repos\/owner\/(one|two)\/hooks$/.test(url.pathname)){res.end('[]');return;}
 res.statusCode=404;res.end('{}');
});
try{
 let available=true;try{await exec('gh',['--version'],{env,cwd:home,timeout:10000});}catch(error){if(error.code==='ENOENT')available=false;else throw error;}
 if(!available)console.log('SKIP: real gh fixture (CLI unavailable); mocked repository tests still run');
 else{
  await new Promise(resolve=>server.listen(0,'127.0.0.1',resolve));
  const base=`http://127.0.0.1:${server.address().port}`;
  const execute=async args=>{
   assert.equal(args[0],'api');assert.ok(!args.includes('--method'));assert.ok(!(args.includes('--slurp')&&args.includes('--jq')));
   const result=await exec('gh',['api',`${base}/${args[1]}`,...args.slice(2)],{env,cwd:home,timeout:10000});return result.stdout;
  };
  const result=await repositories.inventory(execute,'https://receiver.fixture',[]);
  assert.equal(result.status,'ready');assert.equal(result.account,'fixture-user');assert.equal(result.detail,'0 of 2 enabled');assert.deepEqual(result.repositories.map(r=>[r.name,r.repositoryId,r.checked]),[['owner/one',101,false],['owner/two',103,false]]);
  assert.equal(requests.filter(r=>r.url.startsWith('/user/repos?')).length,3,'Every page, including an empty last page, is processed');assert.ok(requests.every(r=>r.method==='GET'));
  console.log('PASS: actual gh CLI flags, JQ filtering, three-page JSON output, deduplication and webhook reads; isolated localhost only');
 }
 const empty=await repositories.inventory(async args=>args[1]==='user'?'work-user':'[]','https://receiver.fixture',[]);assert.equal(empty.status,'recommended');assert.equal(empty.statusLabel,null);assert.equal(empty.detail,'Choose another GitHub account or check repository access.');assert.doesNotMatch(empty.detail,/fixture-private/);
 await assert.rejects(repositories.inventory(async()=>{throw Error('fixture-private-output');},'https://receiver.fixture',[]),error=>error.safe===true&&/GitHub account/.test(error.message)&&!error.message.includes('fixture-private'));
 await assert.rejects(repositories.inventory(async args=>args[1]==='user'?'fixture-user':'not-json','https://receiver.fixture',[]),error=>error.safe===true&&/repository-list format/.test(error.message));
}finally{if(server.listening)await new Promise(resolve=>server.close(resolve));await fs.rm(home,{recursive:true,force:true});}
