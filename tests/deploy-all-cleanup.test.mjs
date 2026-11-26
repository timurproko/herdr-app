// A finished subprocess can briefly retain its Windows cwd handle after the
// parent has consumed its result. Cleanup must retry, not ignore deletion errors.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {scratch,clean} from './support/deploy-all.mjs';
const cwd=path.join(scratch,'held');fs.mkdirSync(cwd);
const child=spawn(process.execPath,['-e',"process.stdout.write('ready\\n');setTimeout(()=>process.exit(0),600)"],{cwd,stdio:['ignore','pipe','pipe']});
const closed=once(child,'close');
try {
 await once(child.stdout,'data');
 clean();
 assert.equal(fs.existsSync(scratch),false,'Cleanup must actually remove the complete fixture');
}finally {
 if(child.exitCode===null&&child.signalCode===null)child.kill();
 await closed;
 fs.rmSync(scratch,{recursive:true,force:true});
}
console.log('PASS bounded disposable fixture cleanup with a transient subprocess cwd handle');
