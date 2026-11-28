import assert from 'node:assert/strict';import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
const require=createRequire(import.meta.url),{Store}=require('../src/plugins/trello/credentials.cjs'),{execute}=require('../src/plugins/trello/owner.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-remote-settings-'));
const local=new Store(path.join(root,'local'),{security:()=>{}}),remote=new Store(path.join(root,'remote'),{security:()=>{}}),A='a'.repeat(24);
const key='FAKE_SSH_UI_KEY_NOT_REAL',token='FAKE_SSH_UI_TOKEN_NOT_REAL';let installed=false,route,payload,provider=0;
const binding={id:'fake-remote-core',session:'test',principal:'e'.repeat(64),home:'f'.repeat(64)},localBinding={...binding,id:'local',session:'local'};
const B='b'.repeat(24);
const transport=async url=>{provider++;return Response.json(new URL(url).pathname.endsWith('/boards')?[{id:A,name:'Remote design',closed:false},{id:B,name:'Archive design',closed:true}]:{id:A,username:'remote-user',fullName:'Remote owner'});};
const host={checking:()=>false,appHome:()=>local.home,exec:async(_p,args)=>{
 if(args.includes('--discovery-all'))return {code:0,stdout:JSON.stringify({ok:true,data:{pending:[]}})};
 assert.ok(!JSON.stringify(args).includes(key));assert.ok(!JSON.stringify(args).includes(token));
 if(args.includes('--start')){route=JSON.parse(args.at(-1));return {code:0,stdout:JSON.stringify({port:12345,session:'f'.repeat(64),expires:Date.now()+59000})};}
 const machine=JSON.parse(args.at(-1)),destination=machine?binding:localBinding;
 const result=args.includes('--probe')?{version:1,ok:true,data:{runtime:machine&&!installed?'missing':'ready',destination}}:machine&&!installed?{version:1,ok:false,error:{code:'RUNTIME_MISSING'}}:await execute({action:'status'},{store:machine?remote:local,transport});
 if(result.ok)result.data.destination=destination;
 return {code:result.ok?0:3,stdout:JSON.stringify(result)};
}};
const socket={WebSocket:{connect:async()=>({write:async text=>payload=JSON.parse(text).payload,read:async()=>{
 assert.equal(route.machine,'pc2');assert.equal(route.binding.id,binding.id);
 let result;if(payload.action==='runtime.install'){installed=true;result={version:1,ok:true,data:{runtime:'ready',installed:true,destination:binding}};}else{result=await execute(payload,{store:remote,transport});if(result.ok)result.data.destination=binding;}
 return JSON.stringify(result);
},close:async()=>{payload=null;}})}};
try{
 const h=await formsHarness(host,null,{websocket:socket}),p=h.registry.pluginById('trello');h.registry.setPluginEnabled(p,true);h.view.settingsMachine='pc2';h.ui.initPlugins(h.view,h.cx,'trello');h.view.pluginOpen['trello-requirements']=true;h.view.pluginOpen['trello-boards']=true;
 h.ui.reloadPlugins(h.view,h.cx,'trello');await h.flush();assert.equal(provider,0);assert.ok(find(h.render(),'st-plugin-fix-trello-runtime'));assert.ok(!find(h.render(),'st-plugin-form-trello-local-setup-save'));assert.ok(!find(h.render(),'st-plugin-list-trello-boards-add'));
 h.click('st-plugin-fix-trello-runtime');await h.flush();assert.equal(installed,true);assert.equal(fs.existsSync(remote.dir),false,'Install never provisions credentials');
 const form=()=>h.view.pluginForms['trello:local-setup'];form().fields.apiKey.set_value(key);form().fields.token.set_value(token);h.click('st-plugin-form-trello-local-setup-save');await h.flush();assert.equal(remote.read('credentials').token,token);assert.equal(fs.existsSync(local.dir),false);
 h.click('st-plugin-trello-recheck');await h.flush();assert.ok(words(h.render()).join(' ').includes('Remote owner'));
 find(h.render(),'st-plugin-list-trello-boards-add-popup').attrs.on_open_change[0](true,h.cx);await h.flush();assert.ok(words(h.render()).includes('Remote design'));assert.ok(!words(h.render()).includes('Archive design'));h.click('st-plugin-list-trello-boards-tab-inactive');assert.ok(words(h.render()).includes('Archive design'));assert.ok(!words(h.render()).includes('Remote design'));assert.ok(!words(h.render()).includes('Closed board'));h.view.pluginSearches['trello:boards'].set_value('Remote');assert.ok(words(h.render()).includes('No results'));h.view.pluginSearches['trello:boards'].set_value('Archive');h.click('st-plugin-list-trello-boards-item-1');h.click('st-plugin-list-trello-boards-choose');await h.flush();assert.deepEqual(remote.read('policy').boards,[B]);assert.equal(fs.existsSync(local.dir),false);
 const rowId='st-plugin-list-trello-boards-row-0';assert.ok(find(h.render(),rowId));assert.ok(words(h.render()).includes('1 added'));find(h.render(),rowId).attrs.on_hover[0](true,h.cx);h.click('st-plugin-list-trello-boards-remove-0');await h.flush();assert.deepEqual(remote.read('policy').boards,[]);
 h.view.pluginRowHover='st-plugin-saved-trello-local-setup-row-0';h.click('st-plugin-saved-trello-local-setup-remove-0');assert.ok(words(h.render()).join(' ').includes('pc2'));h.click('st-plugin-confirm-trello-accept');await h.flush();assert.equal(fs.existsSync(remote.file('credentials')),false);assert.equal(fs.existsSync(local.dir),false);assert.ok(find(h.render(),'st-plugin-form-trello-local-setup-save'));
 assert.ok(!JSON.stringify(h.writes).includes(token));assert.ok(!JSON.stringify(h.writes).includes(key));
 console.log('PASS: SSH-selected card runtime fix, masked account lifecycle, explicit verification and board selection use only injected remote private setup');
}finally{fs.rmSync(root,{recursive:true,force:true});}
