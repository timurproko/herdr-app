// Sidebar naming is retired; the shared external naming API remains usable.
import assert from 'node:assert/strict';
import {createRequire} from 'node:module';
import {loadMod} from '../../../tools/plugin-harness.mjs';
const require=createRequire(import.meta.url),{createA1Client}=require('../api.cjs');
const session='11111111-1111-1111-1111-111111111111',runtime='22222222-2222-2222-2222-222222222222';
const target={scope:'session',sessionId:session,runtimeId:runtime},revision='a'.repeat(64);
let patch=null;
const client=createA1Client({id:()=> 'names',resolveCommand:async()=>['fake-a1'],execute:async(cmd,args)=>{
 assert.equal(cmd,'fake-a1');assert.equal(args[0],'api');const request=JSON.parse(args[1]);
 assert.deepEqual(request.target,target);
 const writing=request.type==='session.rename';
 const response={version:1,id:request.id,type:'response',command:request.type,success:true,
  data:{target:request.target,name:writing?request.name:'Native name',nameRevision:revision,...(writing?{status:'applied'}:{})}};
 if(patch)patch(response);
 return {code:response.success?0:1,stdout:JSON.stringify(response)+'\n'};
}});
assert.equal((await client.request('session.get',{target})).name,'Native name');
assert.equal((await client.request('session.rename',{target,name:'External',expectedNameRevision:revision})).name,'External');
for(const mutate of [r=>r.id='wrong',r=>r.data.target.runtimeId=session,r=>r.data.name='wrong',r=>r.data.status='queued',r=>r.data.nameRevision='path']){
 patch=mutate;await assert.rejects(client.request('session.rename',{target,name:'External',expectedNameRevision:revision}));
}
patch=r=>{r.success=false;delete r.data;r.error={code:'name-conflict',message:'Read the newer name.'};};
await assert.rejects(client.request('session.rename',{target,name:'External',expectedNameRevision:revision}),error=>error.code==='name-conflict');

const state=new Map(),calls=[];
const {r}=await loadMod({host:{shared:k=>state.get(k),setShared:(k,v)=>state.set(k,v),checking:()=>false,
 terminals:()=>['t1','pc2/t1'].map(address=>({address,state:'live',report:{app:'a1'},labels:{'a1.session':session,'a1.runtime':runtime,'a1.at':String(Date.now())}})),
 exec:()=>{throw Error('Retired sidebar actions must not execute anything');},notify:n=>calls.push(n),spaces:()=>[]},
 modules:{'space-color-state.js':'src/shared/space-color-state.js'},entry:'export * as r from "./plugins.js";'});
const plugin=r.pluginById('a1-colors');
assert.deepEqual(Array.from(plugin.settings,s=>s.key),['matchSpaceColor']);
for(const enabled of [false,true])for(const renameSession of [false,true]){
 state.set('custom.plugins',{'a1-colors':{enabled,settings:{matchSpaceColor:true,renameSession}}});
 assert.equal(r.pluginSetting(plugin,'renameSession'),undefined,'Legacy values cannot expose a removed setting');
 for(const terminal of ['t1','pc2/t1'])assert.equal(r.pluginMenuItems('agents.context',{terminal}).length,0);
 assert.equal(r.pluginAllows('sidebar.rename',{target}),false);
 for(const moment of ['sidebar.rename.read','sidebar.rename.write'])assert.equal((await r.pluginGate(moment,{target})).ok,false);
}
assert.equal(calls.length,0,'Retired gates have no reporting or native name effects');
console.log('PASS: no sidebar action/setting/guard/gate for any old preference; shared external name API and acknowledgement guards retained');
