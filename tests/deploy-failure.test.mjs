import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createRequire} from 'node:module';
import {resultRecorder} from '../tools/deploy-all.mjs';
import {customizationRowState,updateProjection} from '../src/shared/customization-update-model.js';
const require=createRequire(import.meta.url),{deployCheckout,outputObjects}=require('../tools/deploy-all-worker.cjs'),updates=require('../src/services/updates/update-worker.cjs');
const home=fs.mkdtempSync(path.resolve('.artifacts/deploy-failure-'));
const commit='a'.repeat(40),host={ok:false,version:'0.1.17',reviewed:false,missingApi:[],missingCommands:['tab.new'],directImports:[],tabMove:{upgradeAudit:{ok:false,status:'needs-review'}}};
const success={changed:1,removed:0,backup:'backup-id',patches:{ok:true,frames:{palette:{ok:true,status:'skipped',advisory:'unreviewed native bytes'}}}};
try {
 fs.mkdirSync(path.join(home,'.customizations'));fs.writeFileSync(path.join(home,'.customizations/manifest.json'),'{"version":2,"id":"custom","files":{}}');
 assert.deepEqual(outputObjects('banner\n'+JSON.stringify({reason:'braces } { " \\ literal'})+'\ntrailer'),[{reason:'braces } { " \\ literal'}]);
 const cases=[
  {stdout:'npm banner\n'+JSON.stringify(host,null,2),stderr:'',match:/host check refused Herdr 0.1.17: missing command tab.new/},
  {stdout:JSON.stringify({...host,missingCommands:[],missingApi:['run']}),stderr:'',match:/missing API run/},
  {stdout:JSON.stringify({...host,missingCommands:[],directImports:['src/bad.js']}),stderr:'',match:/direct import/},
  {stdout:JSON.stringify({...host,version:'0.1.12',missingCommands:[],versionStatus:{reason:'requires Herdr 0.1.13 or newer'}}),stderr:'',match:/requires Herdr 0.1.13/},
  ...['build','install','host check'].map(stage=>({stdout:'',stderr:JSON.stringify({deploymentFailure:{stage,reason:stage==='install'?'Personal file conflict: mods/custom-tabs/main.js':'fixture failure'}}),match:new RegExp(`${stage} failed:`)})),
  {stdout:JSON.stringify({...success,patches:{ok:false,frames:{palette:{ok:false,error:'Personal dependency conflict'}}}}),stderr:'',match:/native patch refresh failed: palette: Personal dependency conflict/},
  {stdout:'malformed { not json }',stderr:'fixture installer failure',match:/deployment failed: fixture installer failure/},
 ];
 for(const input of cases){
  const local=deployCheckout(home,commit,'deploy',{log(){},run:()=>({code:1,...input})});
  assert.equal(local.action,'failed');assert.match(local.reason,input.match);assert.ok(local.reason.length<=160);
  resultRecorder({HERDR_APP_HOME:home})([{machine:'local',...local}],true);
  const snapshot=updates.inspect(home),row=customizationRowState(updateProjection(snapshot));
  assert.equal(snapshot.lastRun.state,'failed');assert.match(row.description,input.match);assert.match(row.description,/Recovery: documented rollback/);assert.match(row.description,/deploy-all-result.json/);
 }
 const local=deployCheckout(home,commit,'deploy',{log(){},run:()=>({code:0,stdout:'host banner\n'+JSON.stringify({...host,ok:true})+'\n'+JSON.stringify(success),stderr:''})});
 resultRecorder({HERDR_APP_HOME:home})([{machine:'local',...local}],true);
 const good=updates.inspect(home);assert.equal(good.revision,commit);assert.equal(good.lastRun.state,'complete');assert.equal(local.backup,'backup-id');assert.equal(updateProjection(good).partial,false);
 const timeout=deployCheckout(home,commit,'deploy',{log(){},run:()=>({code:null,timedOut:true,stdout:'',stderr:'error'})});assert.equal(timeout.outcome,'unknown');
 const absent=deployCheckout(home,commit,'deploy',{log(){},run:()=>({code:0,stdout:'no result',stderr:''})});assert.equal(absent.outcome,'unknown');
 console.log('PASS actionable failure causes through npm output, durable results, Update worker and Settings; optional skips preserve revision, unknown outcomes stay distinct');
} finally {fs.rmSync(home,{recursive:true,force:true});}
