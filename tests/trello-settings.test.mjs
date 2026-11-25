import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
import {formsHarness,find,words} from './support/plugin-forms.mjs';
const require=createRequire(import.meta.url),{Store}=require('../src/plugins/trello/credentials.cjs'),{execute}=require('../src/plugins/trello/owner.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-settings-')),store=new Store(path.join(root,'home'),{security:()=>{}});
const key='FAKE_UI_API_KEY_NOT_REAL',token='FAKE_UI_TOKEN_NOT_REAL',A='a'.repeat(24),B='b'.repeat(24);let network=0,executions=0,dispatches=0,pendingPayload,mode='normal';
const transport=async url=>{network++;if(mode==='error')return new Response(null,{status:401});if(mode==='empty'&&new URL(url).pathname.endsWith('/boards'))return Response.json([]);return Response.json(new URL(url).pathname.endsWith('/boards')?[{id:A,name:'Design board',closed:false},{id:B,name:'Engineering board',closed:false}]:{id:A,username:'fake-user',fullName:'Fake Owner'});};
const host={checking:()=>false,appHome:()=>store.home,exec:async(program,args)=>{executions++;assert.equal(program,'node');assert.ok(!JSON.stringify(args).includes(token));assert.ok(!JSON.stringify(args).includes(key));if(args.includes('--status'))return {code:0,stdout:JSON.stringify(await execute({action:'status'},{store,transport}))};assert.ok(args.includes('--start'));return {code:0,stdout:JSON.stringify({port:12345,session:'f'.repeat(64),expires:Date.now()+59000})};}};
const socket={WebSocket:{connect:async()=>({write:async text=>{pendingPayload=JSON.parse(text).payload;},read:async()=>{dispatches++;return JSON.stringify(await execute(pendingPayload,{store,transport}));},close:async()=>{pendingPayload=null;}})}};
try {
 const h=await formsHarness(host,null,{websocket:socket}),{ui,registry,view,cx,render,click,flush,writes,shared}=h;
 const plugin=registry.pluginById('trello');registry.setPluginEnabled(plugin,true);ui.initPlugins(view,cx,'trello');view.pluginOpen['trello-requirements']=true;view.pluginOpen['trello-boards']=true;view.pluginOpen['trello-settings']=true;
 const refresh=async()=>{ui.reloadPlugins(view,cx,'trello');await flush();};await refresh();assert.equal(network,0,'Opening/checking the card never contacts Trello');
 const form=()=>view.pluginForms['trello:local-setup'],id='st-plugin-form-trello-local-setup';
 const enter=()=>{form().fields.apiKey.set_value(key);form().fields.token.set_value(token);assert.equal(form().fields.token.masked,true);};
 enter();click(id+'-save');await flush();assert.equal(store.read('credentials').token,token);assert.equal(form().fields.token.value(),'');assert.ok(words(render()).join(' ').includes('Fake Owner'));assert.equal(view.pluginChecks.trello.items.find(i=>i.id==='local-setup').status,'missing');
 assert.ok(find(render(),id+'-verify'));assert.ok(find(render(),id+'-replace'));assert.ok(find(render(),id+'-remove'));
 const before=network;click(id+'-verify');await flush();assert.equal(network,before+1);assert.equal(form().fields.token.value(),'');
 const open=()=>find(render(),'st-plugin-list-trello-boards-add-popup').attrs.on_open_change[0](true,cx);
 open();await flush();assert.ok(words(render()).includes('Design board'));click('st-plugin-list-trello-boards-item-0');click('st-plugin-list-trello-boards-cancel');assert.deepEqual(store.read('policy').boards,[],'Tick+Cancel grants nothing');
 open();await flush();click('st-plugin-list-trello-boards-item-0');click('st-plugin-list-trello-boards-choose');await flush();assert.deepEqual(store.read('policy').boards,[A]);assert.equal(view.pluginChecks.trello.items.find(i=>i.id==='local-setup').status,'ready');assert.ok(words(render()).includes('Design board'));
 // Imported public Access never calls the live setter or changes local policy.
 registry.setPluginSetting(plugin,'access','read-write');assert.equal(store.read('policy').allowWrites,false);assert.equal(plugin.settings[0].live.state({machine:null,result:()=>view.pluginChecks.trello.items.find(i=>i.id==='local-setup'),setting:k=>registry.pluginSetting(plugin,k)}).value,'read-only');
 const setting=plugin.settings[0],context={machine:null,session:view.pluginSessions.trello,isCurrent:()=>true,enabled:()=>true,setting:k=>registry.pluginSetting(plugin,k),setSetting:()=>false,result:id=>view.pluginChecks.trello.items.find(i=>i.id===id)};
 await assert.rejects(setting.live.set(context,'read-write',setting.live.state(context)),/public Access setting changed/);assert.equal(store.read('policy').allowWrites,false,'A public preference failure rolls back the new private write grant');await refresh();
 click('st-plugin-trello-access-read-write');await flush();assert.equal(store.read('policy').allowWrites,true);assert.equal(registry.pluginSetting(plugin,'access'),'read-write');
 click('st-plugin-trello-access-read-only');await flush();assert.equal(store.read('policy').allowWrites,false);
 // Empty/error discovery preserves grants; stale selections cannot authorize a new board.
 mode='empty';open();await flush();assert.ok(words(render()).includes('Nothing left to add'));click('st-plugin-list-trello-boards-cancel');assert.deepEqual(store.read('policy').boards,[A]);
 mode='error';open();await flush();assert.match(view.listPicker.error,/rejected the API key/);click('st-plugin-list-trello-boards-cancel');mode='normal';
 open();await flush();click('st-plugin-list-trello-boards-item-0');store.write('policy',{...store.read('policy'),allowWrites:true},store.read('policy'));click('st-plugin-list-trello-boards-choose');await flush();assert.deepEqual(store.read('policy').boards,[A]);assert.match(view.pluginFixError['trello:boards'],/configuration changed/);await refresh();click('st-plugin-trello-access-read-only');await flush();
 // Replacing is explicit, verified and clears all old grants.
 enter();click(id+'-replace');assert.equal(store.read('policy').boards.length,1);click(id+'-confirm');await flush();assert.deepEqual(store.read('policy').boards,[]);assert.equal(store.read('policy').allowWrites,false);assert.equal(form().fields.token.value(),'');
 // Remote selection refuses before even local process/status IO.
 const stale=find(render(),id+'-verify'),beforeExec=executions,beforeDispatch=dispatches;enter();view.settingsMachine='ssh-fixture';ui.followSettingsMachine(view);await refresh();assert.equal(form().fields.token.value(),'');assert.equal(executions,beforeExec);assert.equal(dispatches,beforeDispatch);assert.ok(words(render()).join(' ').includes('no local store was accessed'));assert.ok(!find(render(),'st-plugin-trello-access-read-write'));stale.attrs.on_click[0]({},cx);await flush();assert.equal(executions,beforeExec);
 view.settingsMachine=null;ui.followSettingsMachine(view);await refresh();
 click(id+'-remove');click(id+'-cancel');assert.equal(fs.existsSync(store.file('credentials')),true);click(id+'-remove');click(id+'-confirm');await flush();assert.equal(fs.existsSync(store.file('credentials')),false);assert.ok(words(render()).join(' ').includes('does not revoke'));
 assert.ok(!JSON.stringify(writes).includes(token));assert.ok(!JSON.stringify(writes).includes(key));assert.ok(!JSON.stringify(shared).includes('boards'));assert.ok(!words(render()).join(' ').includes(token));
 console.log('PASS: complete declarative Trello card with fake stdin transport, verified credential lifecycle, named board selection, local write switch, imported-authority refusal and remote zero-IO isolation');
} finally {fs.rmSync(root,{recursive:true,force:true});}
