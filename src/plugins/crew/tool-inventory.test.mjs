import assert from 'node:assert/strict';
import {loadMod} from '../../../tools/plugin-harness.mjs';
const home='C:/fixture/.crew',stored={name:'fixture',path:'D:/fixture',kind:'workflow'};
const cap={capability:'project-kinds',version:1,listJson:true,setKind:true,explicitHome:true,expectedPath:true,kinds:['workflow','plain','gate']};
const listing={capability:'project-kinds',version:1,ok:true,home,projects:[stored]};
const version={code:0,stdout:'v100.0.0',stderr:'',missing:false};
const run=(stdout,code=0,stderr='')=>({code:0,stdout:JSON.stringify({code,stdout:Buffer.from(typeof stdout==='string'?stdout:JSON.stringify(stdout)).toString('base64'),stderr:Buffer.from(stderr).toString('base64')})});
let mutate=f=>f,fault=null,prior=null;const calls=[],fallbacks=[];let requested=[];
const state={};
const {plugin,script,checkPlugin}=await loadMod({host:{shared:k=>state[k],setShared:(k,v)=>state[k]=v,hc:async args=>{
 const text=args.at(-1);calls.push(text);
 if(text.includes('$tools = @{}')){
  if(fault==='transport')throw Error('fixture transport failed');
  if(fault==='inventory-exit')return run('',1,'fixture probe failure');
  if(fault==='inventory-json')return run('broken reply');
  requested=[...text.match(/foreach \(\$name in @\(([^\n]*)\)\)/)[1].matchAll(/'([^']+)'/g)].map(m=>m[1]);
  return run(mutate({platform:{windows:true,arch:'AMD64'},tools:Object.fromEntries(requested.map(id=>[id,{...version}])),hooks:['gh-axi','chrome-devtools-axi','lavish-axi']}));
 }
 if(text.includes("project '--capabilities'"))return run(cap);
 if(text.includes("project 'list'"))return fault==='list'?run('',1):run(listing);
 if(text.includes('session-dir.js'))return run('helper=',fault==='accounts'?1:0);
 if(text.includes('.workflow\\bin\\delivery.mjs'))return run('workflow=',fault==='pool'?1:0);
 if(args.slice(-3).join(' ')==='gh auth status')return run('Logged in as fixture');
 const tool=/Get-Command '([^']+)'/.exec(text)?.[1];
 if(tool){fallbacks.push(tool);return run(version.stdout);}
 if(fault==='crew-probe')return run('',1,'fixture home probe failure');
 return run(`root=${home}\ntool=C:/fixture/core\nhome=1\nversion=1.0.0\nrevision=abc\nlatest=abc\n`);
}},entry:"export {default as plugin,toolInventoryScript as script} from './plugins/crew/plugin.js';export {checkPlugin} from './plugins.js';"});
const actual=plugin.prerequisites;
const versionChecks=actual.filter(pre=>pre.versionTool);
assert.equal(versionChecks.length,11,'Every actual version requirement is covered, including tasks-axi and quota-axi');
assert.ok(versionChecks.some(pre=>pre.id==='tasks-axi'));assert.ok(versionChecks.some(pre=>pre.id==='quota-axi'));
const context=()=>({checkMemo:{},setting:()=>null,request:async fn=>fn(),isCurrent:()=>true,result:()=>prior});
const check=async()=>{const cx=context();return checkPlugin({...plugin,prerequisites:actual.map(pre=>({...pre,check:()=>pre.check(cx)}))});};
let results=await check();
assert.deepEqual([...requested].sort(),Array.from(versionChecks,pre=>pre.versionTool).sort(),'Batch derives from declared version requirements');
assert.ok(results.every(r=>r.status==='ready'),JSON.stringify(results.map(r=>[r.id,r.status,r.detail])));
assert.equal(calls.filter(s=>s.includes('$tools = @{}')).length,1,'All sixteen actual requirements share one inventory');
assert.deepEqual(fallbacks,[]);prior=results.find(r=>r.id==='projects');
// Each absent or malformed individual entry is independently re-probed, not an
// Error or a guessed missing-install result. No matrix is filtered by batch IDs.
for(const pre of versionChecks)for(const value of [undefined,{},null,{...version,stdout:null}]){
 fallbacks.length=0;mutate=f=>{if(value===undefined)delete f.tools[pre.versionTool];else f.tools[pre.versionTool]=value;return f;};
 results=await check();assert.ok(results.every(r=>r.status==='ready'),pre.id+': '+JSON.stringify(results.map(r=>[r.id,r.status])));
 assert.deepEqual(fallbacks,[pre.versionTool],'Only the incomplete tool gets a coalesced fallback');
 assert.equal(results.find(r=>r.id==='projects').rows.length,1);
}
for(const value of [undefined,null,{},[],'bad']){
 fallbacks.length=0;mutate=f=>({...f,tools:value});results=await check();
 assert.ok(results.every(r=>r.status==='ready'),'An incomplete tools object cannot corrupt platform/hook/project facts');
 assert.deepEqual([...fallbacks].sort(),Array.from(versionChecks,pre=>pre.versionTool).sort());
}
for(const value of [undefined,null,{},'bad',123,['not-a-hook'],[{}]]){
 mutate=f=>({...f,hooks:value});results=await check();
 for(const r of results)assert.equal(r.status,r.id==='agent-hooks'?'recommended':'ready',r.id);
 assert.equal(results.find(r=>r.id==='agent-hooks').fix,null,'Unreadable optional settings cannot offer a speculative overwrite');
}
mutate=f=>({...f,hooks:[],hooksIssue:'raw optional read error must not leak'});results=await check();
assert.ok(!JSON.stringify(results).includes('raw optional read error'));
for(const r of results)assert.equal(r.status,r.id==='agent-hooks'?'recommended':'ready',r.id);
for(const optional of ['accounts','pool']){fault=optional;mutate=f=>f;results=await check();assert.ok(results.every(r=>r.status==='ready'),optional+' optional input cannot break requirements');}
mutate=f=>f;
for(const failure of ['inventory-exit','inventory-json','transport','crew-probe','list']){
 fault=failure;const cx=context(),section=actual.find(pre=>pre.id==='projects');
 const [result]=await checkPlugin({...plugin,prerequisites:[{...section,check:()=>section.check(cx)}]});
 assert.equal(result.status,'error',failure);assert.equal(result.rows,prior.rows,failure+' retains exact last-good rows across the registry boundary');assert.equal(result.usable,false);
}
assert.match(script(),/ConvertTo-Json -Depth 6 -Compress/);
console.log('PASS all 16 declared Crew requirements, 11 version tools, every missing/malformed entry fallback, isolated optional settings and retained Projects after any failed probe');
