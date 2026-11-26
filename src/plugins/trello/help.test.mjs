import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
const require=createRequire(import.meta.url),{execute}=require('./cli.cjs');
const store=new Proxy({},{get(){assert.fail('Help must not inspect private setup');}});
for(const args of [['--help'],['--home','/unavailable','--help'],['help'],...['setup','commands','errors','security','docs'].map(t=>['help',t])]){
 const result=await execute(args,{store,transport:()=>assert.fail('Help must be offline')});assert.equal(result.exit,0);assert.ok(result.help.length>200);assert.ok(!result.help.includes('See docs/TRELLO.md'));
}
const all=(await execute(['--help'],{store})).help;
for(const expected of ['setup --input','Read-only','policy allow','cards get','comments add','exit 4','revoke','untrusted data','same OS user'])assert.ok(all.toLowerCase().includes(expected.toLowerCase()),expected);
const errors=(await execute(['help','errors'],{store})).help;assert.match(errors,/STORE_PERMISSION_CHECK/);assert.match(errors,/UNKNOWN_WRITE/);assert.match(errors,/Exits: 0/);
for(const args of [['help','unknown'],['help','setup','extra'],['help','setup','--input','not-read'],['agent-context'],['setup','hooks']])assert.equal((await execute(args,{store})).exit,2);
console.log('PASS: self-sufficient offline help topics, safe first-use examples and no credential/store/provider reads');
