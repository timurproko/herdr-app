// Disposable fixtures only. No GitHub login, real keys or remote mutations.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {createHash} from 'node:crypto';
import setup from '../src/plugins/git/setup.cjs';import cloudflare from '../src/plugins/git/cloudflare.cjs';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'herdr-repository-checkboxes-'));
const token='a'.repeat(64),secret='b'.repeat(64),base='https://relay.example',file=path.join(root,'keys.json');
const events=['check_run','check_suite','status','workflow_run','pull_request','push'];
try{
 await fs.writeFile(file,JSON.stringify({token,secret}));
 const stores=new Map([['owner/one',[{id:1,active:true,events,config:{url:'https://other.example/github',content_type:'json'}}]],['owner/two',[]]]),calls=[];
 const ids={'owner/one':101,'owner/two':102},actualIds={...ids};
 let login='fixture-user',fail=false,next=10;
 const io={fetch:async()=>({ok:true,json:async()=>({protocol:1,secretHash:createHash('sha256').update(secret).digest('hex')})}),gh:async(args,input)=>{
  calls.push({args,input});
  if(args[1]==='user')return login;
  if(args[1].startsWith('user/repos?')){assert.ok(args.includes('--paginate'));assert.ok(!args.includes('--slurp'),'gh forbids combining --slurp with --jq');assert.match(args.at(-1),/@json$/);assert.match(args.at(-1),/permissions.admin/);assert.match(args.at(-1),/archived/);return JSON.stringify([{name:'owner/two',id:102},{name:'owner/one',id:101},{name:'owner/one',id:101}]);}
  if(/^repos\/owner\/(one|two)$/.test(args[1]))return String(actualIds[args[1].slice(6)]);
  const m=/^repos\/(owner\/(?:one|two))\/hooks(?:\/(\d+))?$/.exec(args[1]);assert.ok(m,args[1]);
  const name=m[1],id=Number(m[2]),hooks=stores.get(name),method=args[args.indexOf('--method')+1];
  if(!args.includes('--method'))return JSON.stringify([hooks]);
  if(fail&&name==='owner/two')throw Error(secret); // Raw failures must never reach UI.
  if(method==='POST')hooks.push({id:next++,...input});
  else if(method==='PATCH'){const hook=hooks.find(h=>h.id===id);assert.equal(hook.config.url,`${base}/github`);Object.assign(hook,input);}
  else if(method==='DELETE'){const i=hooks.findIndex(h=>h.id===id);assert.equal(hooks[i].config.url,`${base}/github`);hooks.splice(i,1);}
  else assert.fail(method);
  return '{}';
 }};
 const read=()=>setup.run('repositories',file,base,'',io),set=(names,enabled,account='fixture-user')=>setup.run('set-repositories',file,base,JSON.stringify({names,enabled,account,ids:Object.fromEntries(names.map(name=>[name,ids[name]??1000]))}),io);
 assert.equal((await setup.run('notice',file,base,'',io)).setup,'ready');
 assert.equal((await setup.run('notice',path.join(root,'absent.json'),base,'',io)).setup,'missing');
 assert.equal((await setup.run('notice',file,base,'',{...io,fetch:async()=>{throw Error('network unavailable');}})).setup,'unknown');
 assert.equal((await setup.run('notice',file,base,'',{...io,fetch:async()=>({ok:false,status:401})})).setup,'missing');
 const initial=await read();assert.equal(initial.account,login);assert.deepEqual(initial.repositories.map(r=>[r.name,r.checked]),[['owner/one',false],['owner/two',false]]);
 assert.ok(!calls.some(c=>c.args.includes('--method')),'Listing is read-only');
 await set(['owner/one','owner/two'],true);assert.ok((await read()).repositories.every(r=>r.checked));
 assert.equal(stores.get('owner/one')[0].config.url,'https://other.example/github','Unrelated hooks are preserved');
 const post=calls.find(c=>c.args.includes('POST'));assert.equal(post.input.config.secret,secret);assert.ok(!calls.some(c=>c.args.join(' ').includes(token)||c.args.join(' ').includes(secret)));
 const before=stores.get('owner/one').length+stores.get('owner/two').length;await set(['owner/one','owner/two'],true);assert.equal(stores.get('owner/one').length+stores.get('owner/two').length,before,'Re-enabling updates existing hooks without creating duplicates');assert.ok(calls.some(c=>c.args.includes('PATCH')),'Explicit enable reapplies the verified receiver secret, which GitHub does not reveal on reads');
 await set(['owner/one'],false);assert.equal(stores.get('owner/one').length,1);assert.equal(stores.get('owner/one')[0].id,1,'Unchecking removes only this receiver’s webhook');
 fail=true;const partial=await set(['owner/one','owner/two'],false);assert.equal(Object.keys(partial.errors).length,1);assert.ok(partial.errors['owner/two']);assert.ok(!JSON.stringify(partial).includes(secret));fail=false;
 actualIds['owner/one']=999;const snapshot=await set(['owner/one'],true);assert.match(snapshot.errors['owner/one'],/identity changed/);actualIds['owner/one']=101;
 login='different-user';const writes=calls.filter(c=>c.args.includes('--method')).length;await assert.rejects(set(['owner/two'],false),/account changed/);assert.equal(calls.filter(c=>c.args.includes('--method')).length,writes);login='fixture-user';
 for(const names of [['owner/..'],['owner/one','OWNER/ONE'],Array.from({length:51},(_,i)=>`owner/repo${i}`)])await assert.rejects(set(names,true),/Invalid/);
 stores.get('owner/two').push({...stores.get('owner/two')[0],id:999});const duplicates=await read();assert.equal(duplicates.repositories.find(r=>r.name==='owner/two').checked,null);assert.equal(duplicates.repositories.find(r=>r.name==='owner/two').disabled,true);
 const result=await set(['owner/two'],false);assert.ok(result.errors['owner/two']);assert.equal(stores.get('owner/two').length,2,'Duplicate/unknown hook identities are never silently deleted');
 let release,started;const active=new Promise(resolve=>started=resolve),held=cloudflare.withLock(file,()=>{started();return new Promise(resolve=>release=resolve);});await active;
 await assert.rejects(set(['owner/one'],true),/already running/);release();await held;
 await assert.rejects(setup.run('set-repositories',file,base,JSON.stringify({names:['owner/one'],enabled:true,account:login,ids:{'owner/one':101}}),{...io,fetch:async()=>({ok:false})}),/unavailable/);
 console.log('PASS: paginated GitHub admin inventory, explicit checkboxes, scoped removal, idempotence, partial failures, account binding, bounded batches and secret isolation');
}finally{await fs.rm(root,{recursive:true,force:true});}
