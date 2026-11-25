import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import path from 'node:path';
import {createHash} from 'node:crypto';
import setup from '../src/plugins/git/setup.cjs';
const dir=await fs.mkdtemp(path.resolve('.artifacts/git-members-')),file=path.join(dir,'keys.json');
try {
 const keys={token:'a'.repeat(64),secret:'b'.repeat(64)};await fs.writeFile(file,JSON.stringify(keys));
 const calls=[];
 const io={fetch:async()=>({ok:true,json:async()=>({protocol:1,noticeVersion:2,secretHash:createHash('sha256').update(keys.secret).digest('hex')})}),github:{execute:async args=>{
  if(args[0]==='auth')return 'fixture-token';
  calls.push(args);if(args[1]==='user')return 'fixture-user';
  assert.match(args[1],/^repos\/owner\/(a|b)\/hooks$/);return '[[]]';
 }}};
 for(const repo of ['owner/a','owner/b'])await setup.run('notice-repository',file,'https://relay.example',repo,io,'fixture-user');
 const before=calls.length;calls.length=0;
 const results=[];for(const repo of ['owner/a','owner/b'])results.push(await setup.run('notice-repository',file,'https://relay.example',repo,io,'fixture-user'));
 assert.equal(before,4);assert.equal(calls.length,4);assert.deepEqual(results,[{status:'missing'},{status:'missing'}]);
 assert.equal(calls.filter(args=>args[1]==='user').length,2);assert.ok(!calls.some(args=>args.includes('switch')));
 console.log('PASS measured named-account enrollment REST operations: 4 before, 4 after; unchanged main per-repository checks, no account switch');
} finally {await fs.rm(dir,{recursive:true,force:true});}
