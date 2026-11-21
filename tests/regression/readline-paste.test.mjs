import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {readlinePaste} from './readline-paste.mjs';
const root=fs.mkdtempSync(path.join(os.tmpdir(),'custom-readline-')),app=path.join(root,'app'),user=path.join(root,'user');
fs.mkdirSync(user);const file=path.join(user,'.inputrc'),original='set bell-style none';fs.writeFileSync(file,original);
try {
  readlinePaste('apply',app,user);readlinePaste('check',app,user);
  const installed=fs.readFileSync(file,'utf8');assert.ok(installed.startsWith(original+'\n'));assert.match(installed,/set enable-active-region off/);assert.match(installed,/set enable-bracketed-paste on/);assert.ok(!installed.includes('enable-bracketed-paste off'));
  readlinePaste('apply',app,user);assert.equal(fs.readFileSync(file,'utf8'),installed,'Repeated opt-in is idempotent');
  fs.writeFileSync(file,installed+'# personal later edit\n');assert.throws(()=>readlinePaste('restore',app,user),/conflict/);
  fs.writeFileSync(file,installed);readlinePaste('restore',app,user);assert.equal(fs.readFileSync(file,'utf8'),original,'Exact original inputrc is restored');
  fs.unlinkSync(file);readlinePaste('apply',app,user);readlinePaste('restore',app,user);assert.ok(!fs.existsSync(file),'A file created by the profile is removed on restore');
  console.log('PASS: plain Readline paste display, bracketed-paste protection retained, original preferences preserved and safe restoration');
}finally{fs.rmSync(root,{recursive:true,force:true});}
