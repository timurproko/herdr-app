import assert from 'node:assert/strict';
import {checkRunnerTool,ciTestPlan} from '../scripts/test-ci.mjs';
const timeout=()=>({status:null,error:Object.assign(Error('spawnSync gh ETIMEDOUT'),{code:'ETIMEDOUT'})});
const env={PATH:'fixture-only'};
function probe(replies) {
  const calls=[],warnings=[];
  return {calls,warnings,run:()=>checkRunnerTool('gh',['--version'],env,{
    spawnSync:(command,args,options)=>{calls.push({command,args,options});assert.ok(replies.length,'No unbounded retry');return replies.shift();},
    warn:text=>warnings.push(text),
  })};
}
let p=probe([{status:0}]);p.run();assert.equal(p.calls.length,1);assert.equal(p.warnings.length,0);
p=probe([timeout(),{status:0}]);p.run();assert.deepEqual(p.calls.map(c=>c.options.timeout),[15000,45000]);assert.equal(p.warnings.length,1);assert.match(p.warnings[0],/retrying once/);
for(const c of p.calls){assert.equal(c.command,'gh');assert.deepEqual(c.args,['--version']);assert.equal(c.options.env,env);assert.equal(c.options.encoding,'utf8');}
p=probe([timeout(),timeout()]);assert.throws(p.run,/Required runner tool unavailable.*ETIMEDOUT/);assert.equal(p.calls.length,2);
for(const failure of [{status:1,stderr:'real version command failure'},{status:null,error:Object.assign(Error('missing executable'),{code:'ENOENT'})},{status:null,error:Object.assign(Error('access denied'),{code:'EACCES'})}]){
  p=probe([failure]);assert.throws(p.run,/Required runner tool unavailable/);assert.equal(p.calls.length,1);assert.equal(p.warnings.length,0);
}
p=probe([timeout(),{status:1,stderr:'still broken'}]);assert.throws(p.run,/still broken/);assert.equal(p.calls.length,2);
for(const platform of ['linux','win32'])assert.ok(ciTestPlan(platform).included.some(e=>e.file==='tests/ci-tool-preflight.test.mjs'));
console.log('PASS: bounded timeout-only runner-tool startup retry, immediate real failures and cross-platform CI discovery');
