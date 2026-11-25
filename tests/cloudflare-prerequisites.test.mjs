// No real npm, browser, Cloudflare account, GitHub webhook or credentials.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createHash} from 'node:crypto';
import cloudflare from '../src/plugins/git/cloudflare.cjs';
import {loadMod} from '../tools/plugin-harness.mjs';
const token='a'.repeat(64),secret='b'.repeat(64),account='c'.repeat(32),other='d'.repeat(32),oauth='fixture-cloudflare-token';
const hash=v=>createHash('sha256').update(v).digest('hex');
const temp=await fs.mkdtemp(path.join(os.tmpdir(),'herdr-cloudflare-'));
try {
  const file=path.join(temp,'.customizations/git-webhook.json'),p=cloudflare.locations(file);
  await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify({token,secret}));
  assert.equal((await cloudflare.run('status',file)).installed,false);
  const calls=[],apiCalls=[];let domain='',foreign=false,apiFailure=false,failSecrets=false;
  const workerName=`herdr-git-webhooks-${hash(token+account).slice(0,16)}`;
  const io={npmCLI:async()=>'/fixture/npm-cli.js',sleep:async()=>{},execute:async(command,args,options)=>{
    calls.push({command,args,options});
    if(args[1]==='install'){
      await fs.mkdir(path.dirname(p.cli),{recursive:true});await fs.writeFile(p.cli,'// fixture, never executed');
      await fs.writeFile(path.join(p.tool,'node_modules/wrangler/package.json'),JSON.stringify({version:cloudflare.VERSION}));
    }
    if(args.includes('whoami'))return {code:0,stdout:JSON.stringify({loggedIn:true,accounts:[{id:account,name:'Personal'},{id:other,name:'Other'}]}),stderr:''};
    if(args.includes('auth'))return {code:0,stdout:JSON.stringify({type:'oauth',token:oauth}),stderr:''};
    if(args.includes('deploy'))await fs.writeFile(options.env.WRANGLER_OUTPUT_FILE_PATH,JSON.stringify({type:'deploy',version:1,worker_name:workerName,version_id:'fixture-version'})+'\n');
    if(args.includes('bulk')&&failSecrets)return {code:1,stdout:'',stderr:secret};
    return {code:0,stdout:'',stderr:''};
  },fetch:async(url,options)=>{
    apiCalls.push({url,options});
    if(url.endsWith('/configuration')){
      assert.equal(options.headers.Authorization,`Bearer ${token}`);
      return {ok:true,json:async()=>({protocol:1,secretHash:hash(secret)})};
    }
    assert.equal(options.headers.Authorization,`Bearer ${oauth}`);assert.ok(url.startsWith(`https://api.cloudflare.com/client/v4/accounts/${account}/`));
    if(apiFailure)return {ok:false,json:async()=>({success:false,errors:[{code:10000,message:oauth}]})};
    if(url.endsWith('/settings'))return foreign?{ok:true,json:async()=>({success:true,result:{bindings:[]}})}:{ok:false,json:async()=>({success:false,errors:[{code:10007}]})};
    if(options.method==='PUT'){domain=JSON.parse(options.body).subdomain;}
    return {ok:true,json:async()=>({success:true,result:{subdomain:domain}})};
  }};
  assert.equal((await cloudflare.run('install',file,'',io)).status,'ready');
  assert.ok(calls[0].args.includes('--ignore-scripts'));assert.ok(calls[0].args.includes('--prefix'));assert.ok(!calls[0].args.includes('-g'));
  assert.equal(cloudflare.ENV.WRANGLER_WRITE_LOGS,'false','Cloudflare token output must not be written to CLI logs');
  const status=await cloudflare.run('status',file,'',io);assert.equal(status.accounts.length,2);assert.ok(!JSON.stringify(status).includes(oauth));
  assert.equal((await cloudflare.run('login',file,'',io)).status,'ready');
  const result=await cloudflare.run('configure',file,account,io);
  assert.equal(result.status,'ready');assert.equal(result.relay,`https://${workerName}.${domain}.workers.dev`);
  const bulk=calls.find(c=>c.args.includes('bulk'));assert.deepEqual(JSON.parse(bulk.options.input),{CLIENT_TOKEN:token,GITHUB_SECRET:secret});
  assert.ok(!calls.some(c=>c.args.join(' ').includes(token)||c.args.join(' ').includes(secret)||c.args.join(' ').includes(oauth)),'Secrets are never argv');
  assert.ok(!JSON.stringify(result).includes(token)&&!JSON.stringify(result).includes(secret)&&!JSON.stringify(result).includes(oauth));
  assert.ok(apiCalls.some(c=>c.options.method==='PUT'),'Missing workers.dev subdomain is registered by Configure');
  apiCalls.length=0;await cloudflare.run('configure',file,account,io);assert.ok(!apiCalls.some(c=>c.options.method==='PUT'),'An existing account subdomain is preserved');
  foreign=true;const before=calls.length;await assert.rejects(cloudflare.run('configure',file,account,io),/not owned/);assert.ok(!calls.slice(before).some(c=>c.args.includes('deploy')),'Unknown Workers are never overwritten');foreign=false;
  apiFailure=true;await assert.rejects(cloudflare.run('configure',file,account,io),/refused/);apiFailure=false;
  await assert.rejects(cloudflare.run('configure',file,'not-an-account',io),/Choose/);
  failSecrets=true;await assert.rejects(cloudflare.run('configure',file,account,io),/private keys were not uploaded/);failSecrets=false;
  await fs.writeFile(file,'personal invalid file');await assert.rejects(cloudflare.run('configure',file,account,io),/not overwritten/);assert.equal(await fs.readFile(file,'utf8'),'personal invalid file');
  // Local setup files are not silently adopted or overwritten either.
  await fs.writeFile(path.join(p.tool,'package.json'),'personal change');await assert.rejects(cloudflare.run('install',file,'',io),/unknown changes/);
} finally {await fs.rm(temp,{recursive:true,force:true});}
// Plugin-side direct Configure, automatic saves and explicit checkbox actions.
{
  const calls=[],settings={relay:'',repository:'',account:'',githubAccount:''};let noticeVersion=1;let rows=[{name:'owner/repo',repositoryId:1,checked:false}],failMutations=false,otherAdministers=null;
  const target={cwd:'/repo',on:'pc2',binding:'captured'};
  const runtime={};const host={shared:key=>runtime[key],setShared:(key,value)=>runtime[key]=value,appHome:()=>'/fixture',exec:async(cmd,args,options)=>{
    calls.push({cmd,args,options});
    if(cmd==='gh')return {code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo'})};
    if(args[0].endsWith('github.cjs'))return {code:0,stdout:JSON.stringify({status:'ready',active:'fixture-user',accounts:[{login:'fixture-user',active:true,...(args[1]==='repository-accounts'?{administers:true}:{})},{login:'other-user',active:false,...(args[1]==='repository-accounts'?{administers:otherAdministers}:{})},...(args[1]==='repository-accounts'?[{login:'reader-user',active:false,administers:false}]:[])]})};
    if(args[0].endsWith('cloudflare.cjs')){
      if(args[1]==='status')return {code:0,stdout:JSON.stringify({installed:true,loggedIn:true,accounts:[{id:account,name:'Personal'}]})};
      return {code:0,stdout:JSON.stringify({status:'ready',relay:'https://managed.example',account})};
    }
    if(args[1]==='relay')return {code:0,stdout:JSON.stringify({status:settings.relay?'ready':'missing',noticeVersion})};
    if(args[1]==='repositories')return {code:0,stdout:JSON.stringify({status:'ready',account:'fixture-user',detail:'0 enabled',repositories:rows})};
    if(args[1]==='set-repositories'){const payload=JSON.parse(args[4]);return {code:0,stdout:JSON.stringify({status:'ready',errors:failMutations?{[payload.names[0]]:'Fixture failure'}:{}})};}
    throw Error('Unexpected mode');
  }};
  const {actions}=await loadMod({host,globals:{URL},modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:"export * as actions from './plugins/git/actions.js';"});
  const context=()=>({setting:k=>settings[k],enabled:()=>true,directory:()=>target,setSetting(k,v,expected){if(settings[k]!==expected)return false;settings[k]=v;return true;}});
  const configure=await actions.configureCheck(context());assert.equal(configure.fix.label,'Configure');assert.equal(configure.fix.confirm,undefined,'Configure is a one-click explicit action');assert.equal(configure.fix.requiresEnabled,true);assert.match(configure.detail,/Personal/);
  assert.ok(!calls.some(c=>c.args[1]==='configure'),'Checking never deploys resources');
  await configure.fix.run(context());assert.equal(settings.relay,'https://managed.example');assert.equal(settings.account,account);
  const beforeUpgrade=calls.filter(c=>c.args[1]==='configure').length;
  const upgrade=await actions.configureCheck(context());assert.equal(upgrade.fix.label,'Configure');assert.equal(upgrade.status,'recommended');
  assert.equal(upgrade.configuredValue,settings.relay);assert.equal(calls.filter(c=>c.args[1]==='configure').length,beforeUpgrade,'Legacy notice detection never redeploys automatically');
  noticeVersion=2;assert.equal((await actions.configureCheck(context())).fix,null,'Current notice protocol needs no redeploy');
  // The section lists added repositories without scanning; only Add's popup enumerates.
  {const empty=await actions.repositoryCheck(context());assert.deepEqual(empty.rows.length,0);assert.equal(empty.statusLabel,'0 added');assert.equal(empty.detail,'No repositories added yet.');assert.equal(empty.usable,true);
    assert.equal(empty.selection.key,'githubAccount');assert.equal(empty.selection.value,'fixture-user');assert.equal(empty.selection.options.length,2);assert.equal(empty.fix,null);
    assert.ok(!calls.some(c=>c.args[1]==='repositories'),'Opening Settings never enumerates GitHub repositories');
    assert.ok(!empty.selection.options.some(([login])=>login==='reader-user'),'Accounts that administer no repository are not offered');assert.ok(empty.selection.options.some(([login])=>login==='other-user'),'An account that could not be probed stays');
    otherAdministers=false;settings.githubAccount='other-user';const fallback=await actions.repositoryCheck(context());assert.equal(fallback.selection.value,'fixture-user','A saved account without access falls back to one with access');assert.equal(fallback.selection.options.length,1);settings.githubAccount='';otherAdministers=null;}
  const picker=await actions.repositoryCandidates(context());assert.deepEqual(JSON.parse(JSON.stringify(picker.items.map(r=>r.id))),['owner/repo']);
  assert.ok(!calls.some(c=>c.args[1]==='set-repositories'),'Listing candidates never changes webhooks');
  const beforeStale=JSON.stringify(runtime),savedRows=rows;rows=[{...rows[0],checked:true}];await actions.repositoryCandidates({...context(),isCurrent:()=>false});rows=savedRows;assert.equal(JSON.stringify(runtime),beforeStale,'Superseded/closed scans cannot publish runtime enrollment facts');
  await picker.add(context(),['owner/repo']);assert.equal(settings.githubAccount,'fixture-user','Confirmed Add saves the displayed default GitHub account');const mutation=calls.find(c=>c.args[1]==='set-repositories');assert.deepEqual(JSON.parse(mutation.args[4]),{names:['owner/repo'],enabled:true,account:'fixture-user',ids:{'owner/repo':1}});
  {const before=calls.length,added=await actions.repositoryCheck(context());
    assert.ok(!calls.slice(before).some(c=>c.args[1]==='repositories'),'The added list needs no repository scan');
    assert.deepEqual(JSON.parse(JSON.stringify(added.rows.map(r=>r.id))),['owner/repo'],'An added repository appears in the list');assert.equal(added.statusLabel,'1 added');
    rows=[{...rows[0],checked:true}];assert.equal((await actions.repositoryCandidates(context())).items.length,0,'Added repositories are not offered again');rows=savedRows;
    await actions.removeRepository(context(),'owner/repo');assert.deepEqual(JSON.parse(calls.at(-1).args[4]),{names:['owner/repo'],enabled:false,account:'fixture-user',ids:{'owner/repo':1}},'Remove keeps the identity check');
    assert.equal((await actions.repositoryCheck(context())).rows.length,0,'A removed repository leaves the list');
    await assert.rejects(actions.removeRepository(context(),'owner/repo'),/Invalid/,'Only listed repositories can be removed');}
  settings.githubAccount='other-user';await assert.rejects(picker.add(context(),['owner/repo']),/Settings changed/);settings.githubAccount='';
  assert.equal(settings.repository,'','Server hook truth, not a single chosen repository preference, drives the list');
  await assert.rejects(picker.add(context(),['unlisted/repo']),/Invalid/);
  await assert.rejects(configure.fix.run({...context(),enabled:()=>false}),/Enable Git/);
  const count=calls.length;assert.equal((await actions.repositoryCheck({...context(),enabled:()=>false})).status,'recommended');await assert.rejects(actions.repositoryCandidates({...context(),enabled:()=>false}),/Enable Git/);assert.equal(calls.length,count,'Disabled Git never enumerates repositories');
  settings.relay='https://different.example';await assert.rejects(picker.add(context(),['owner/repo']),/Settings changed/);
  settings.relay='https://managed.example';rows=Array.from({length:121},(_,i)=>({name:`owner/repo-${i}`,repositoryId:i+1,checked:false}));const bulk=await actions.repositoryCandidates(context());
  const before=calls.length;await bulk.add(context(),rows.map(r=>r.name));assert.deepEqual(calls.slice(before).filter(c=>c.args[1]==='set-repositories').map(c=>JSON.parse(c.args[4]).names.length),[50,50,21],'All uses bounded exact snapshots, not oversized Windows argv');
  assert.equal((await actions.repositoryCheck(context())).rows.length,121);assert.equal(settings.githubAccount,'fixture-user','Default-account binding is saved after all three Add chunks, not mid-batch');
  rows=rows.map(r=>({...r,checked:false}));const again=await actions.repositoryCandidates(context());failMutations=true;const partial=await again.add(context(),rows.map(r=>r.name));assert.ok(partial.errors['owner/repo-0']);assert.match(partial.errors['owner/repo-120'],/Not updated/);
}
console.log('PASS: Install/Login/Configure prerequisites, private pinned tooling, account binding, safe resource ownership, secret stdin, automatic URL saves and checkbox snapshots without background mutations');
