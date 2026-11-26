import assert from 'node:assert/strict';import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {EventEmitter} from 'node:events';import {PassThrough} from 'node:stream';import {createRequire} from 'node:module';
import {build} from '../tools/build.mjs';import {formsHarness,find,words} from './support/plugin-forms.mjs';import {fakeTransport,A,C,ITEM,credentials} from '../src/plugins/trello/testing.test.mjs';import {syncPreferences} from '../tools/runtime/preferences.mjs';
const require=createRequire(import.meta.url),service=require('../src/services/private-actions/trello-transport.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-global-')),runtime=path.join(root,'runtime'),home=path.join(root,'desktop');
try{
 const {output}=build();fs.mkdirSync(runtime,{recursive:true});fs.cpSync(path.join(output,'lib'),path.join(runtime,'lib'),{recursive:true});fs.cpSync(path.join(output,'scripts'),path.join(runtime,'scripts'),{recursive:true});fs.writeFileSync(path.join(runtime,'package.json'),'{"type":"module"}\n');
 const localRequire=createRequire(path.join(runtime,'lib/trello/cli.cjs')),{Store}=localRequire('./credentials.cjs'),owner=localRequire('./owner.cjs'),cli=localRequire('./cli.cjs');
 const stores=new Map([[null,new Store(home,{security:()=>{}})],['pc2',new Store(path.join(root,'pc2'),{security:()=>{}})]]);
 const machine=name=>({name,id:'fake-core-'+name,session:'test',target:name,state:'connected'}),binding=name=>({...service.bindingFor(stores.get(name).home),id:'fake-core-'+name,session:'test'});
 const agent=fakeTransport((_route,options)=>options.method!=='GET'?Response.json({id:ITEM,data:{card:{id:C},board:{id:A}}}):undefined),provider=async(url,opts)=>new URL(url).pathname==='/1/members/me'?Response.json({id:A,username:'fake-owner',fullName:'Fake owner'}):new URL(url).pathname==='/1/members/me/boards'?Response.json([{id:A,name:'Granted board',closed:false}]):agent.transport(url,opts);
 let offline=false,sent=0;
 const spawn=(program,args)=>{
  assert.equal(program,'ssh');const name=args.at(-2);if(offline)throw Error('FAKE_SECRET_HOSTILE_ERROR');
  const child=new EventEmitter();child.stdin=new PassThrough();child.stdout=new PassThrough();child.stderr=new PassThrough();child.kill=()=>{child.stdin.destroy();child.stdout.destroy();};
  child.stdin.on('data',async bytes=>{sent++;const request=JSON.parse(bytes);const result=await owner.execute(request.payload,{store:stores.get(name),transport:provider,binding:binding(name),initialControl:request.initialControl});if(result.ok)result.data.destination=binding(name);child.stdout.write(JSON.stringify({version:1,phase:'result',result})+'\n');});
  queueMicrotask(()=>child.stdout.write(JSON.stringify({version:1,phase:'ready',binding:binding(name),runtime:'ready'})+'\n'));return child;
 };
 const options={runtime,spawn,spawnSync:()=>({status:0,stdout:JSON.stringify({machines:[...stores.keys()].filter(Boolean).map(machine)})}),storeOptions:{security:()=>{}},ownerOptions:{store:stores.get(null),transport:provider}};
 const call=(name,payload)=>service.dispatch(home,{machine:name},payload,()=>{},options);
 const status=name=>call(name,{action:'status'});
 const save=async name=>{const state=await status(name);const result=await call(name,{action:'save',expected:state.data.revision,...credentials});assert.equal(result.ok,true,JSON.stringify(result));const state2=await status(name);assert.equal((await call(name,{action:'policy',expected:state2.data.revision,add:[A]})).ok,true);};
 await save(null);await save('pc2');
 fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:true,settings:{access:'read-write'}}}}));
 const write=name=>cli.execute(['comments','add','--board',A,'--card',C],{store:stores.get(name),transport:provider,input:'{"text":"fake write"}'});
 assert.equal((await write(null)).result.error.code,'READ_ONLY');assert.equal((await write('pc2')).result.error.code,'READ_ONLY');
 // Actual preferences cannot read or alter any private authority record.
 const before=fs.readdirSync(stores.get(null).dir).filter(n=>n.endsWith('.json')).map(n=>[n,fs.readFileSync(path.join(stores.get(null).dir,n),'utf8')]);
 const read=fs.readFileSync;try{fs.readFileSync=(file,...args)=>{assert.ok(!String(file).startsWith(stores.get(null).dir+path.sep),'Preference export/import must not inspect private Trello records');return read(file,...args);};syncPreferences('export',home,{hostname:'global-fake'});syncPreferences('import',home,{hostname:'global-fake',isDesktopOpen:()=>false});}finally{fs.readFileSync=read;}
 assert.deepEqual(before,fs.readdirSync(stores.get(null).dir).filter(n=>n.endsWith('.json')).map(n=>[n,fs.readFileSync(path.join(stores.get(null).dir,n),'utf8')]));assert.equal((await write(null)).result.error.code,'READ_ONLY');
 const apply=async value=>{const s=await status(null);return call(null,{action:'global.apply',access:value,expected:s.global.revision});};
 let applied=await apply('read-write');assert.equal(applied.ok,true,JSON.stringify(applied));assert.deepEqual(applied.data.global.pending,[]);assert.equal((await write(null)).result.ok,true);assert.equal((await write('pc2')).result.ok,true);
 // New machines never inherit a previous read-write consent.
 stores.set('pc3',new Store(path.join(root,'pc3'),{security:()=>{}}));await save('pc3');assert.equal((await write('pc3')).result.error.code,'READ_ONLY');assert.ok((await status(null)).global.pending.includes('pc3'));
 applied=await apply('read-write');assert.equal(applied.ok,true);assert.equal((await write('pc3')).result.ok,true);
 // Offline hosts keep their last acknowledged rights; no status/reconnect grants replay.
 offline=true;applied=await apply('read-only');assert.equal(applied.ok,true);assert.ok(applied.data.global.pending.includes('pc2'));assert.equal((await write(null)).result.error.code,'READ_ONLY');assert.equal((await write('pc2')).result.ok,true);
 offline=false;await status('pc2');assert.equal((await write('pc2')).result.ok,true);applied=await apply('read-only');assert.deepEqual(applied.data.global.pending,[]);assert.equal((await write('pc2')).result.error.code,'READ_ONLY');
 // Compose the production card's live setter with the actual controller and injected SSH.
 let route,payload;
 const h=await formsHarness({checking:()=>false,appHome:()=>home,exec:async(_program,args)=>{
  if(args.includes('--start')){route=JSON.parse(args.at(-1));return {code:0,stdout:JSON.stringify({port:12345,session:'f'.repeat(64),expires:Date.now()+59000})};}
  const result=await call(JSON.parse(args.at(-1)),{action:args.includes('--probe')?'runtime.probe':'status'});return {code:result.ok?0:3,stdout:JSON.stringify(result)};
 }},null,{websocket:{WebSocket:{connect:async()=>({write:async text=>payload=JSON.parse(text).payload,read:async()=>JSON.stringify(await service.dispatch(home,route,payload,()=>{},options)),close:async()=>{payload=null;}})}}});
 const plugin=h.registry.pluginById('trello');h.registry.setPluginEnabled(plugin,true);h.ui.initPlugins(h.view,h.cx,'trello');h.view.pluginOpen['trello-settings']=true;h.ui.reloadPlugins(h.view,h.cx,'trello');await h.flush();
 const field=plugin.settings[0],context={machine:null,session:h.view.pluginSessions.trello,isCurrent:()=>true,enabled:()=>true,setting:k=>h.registry.pluginSetting(plugin,k),setSetting:()=>false,result:id=>h.view.pluginChecks.trello.items.find(i=>i.id===id)};
 await assert.rejects(field.live.set(context,'read-write',field.live.state(context)),/public Access setting changed/);assert.equal((await write(null)).result.error.code,'READ_ONLY');assert.equal((await write('pc3')).result.error.code,'READ_ONLY');
 h.ui.reloadPlugins(h.view,h.cx,'trello');await h.flush();h.click('st-plugin-trello-access-read-write');await h.flush();assert.equal((await write('pc3')).result.ok,true);
 h.view.settingsMachine='pc3';h.ui.followSettingsMachine(h.view);h.ui.reloadPlugins(h.view,h.cx,'trello');await h.flush();assert.equal(field.live.state({...context,machine:'pc3',session:h.view.pluginSessions.trello}).value,'read-write');offline=true;h.click('st-plugin-trello-access-read-only');await h.flush();assert.equal((await write(null)).result.error.code,'READ_ONLY');assert.ok(words(h.render()).includes('Pending'));assert.ok(find(h.render(),'st-plugin-trello-access-retry'));
 offline=false;assert.equal((await write('pc3')).result.ok,true,'Reconnect alone does not apply a pending change');h.click('st-plugin-trello-access-retry');await h.flush();assert.equal((await write('pc3')).result.error.code,'READ_ONLY');assert.ok(!find(h.render(),'st-plugin-trello-access-retry'));
 const remote=stores.get('pc2'),control=remote.read('control'),s=await status('pc2');
 const conflict=await owner.execute({action:'control',expected:s.data.revision,control:{...control,controller:'a'.repeat(64)}},{store:remote,binding:binding('pc2')});assert.equal(conflict.error.code,'CONTROL_CONFLICT');
 fs.unlinkSync(remote.file('control'));assert.equal((await write('pc2')).result.error.code,'PUBLIC_STATE_INVALID');fs.writeFileSync(remote.file('control'),JSON.stringify(control));
 await apply('read-write');fs.writeFileSync(path.join(remote.home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:false,settings:{access:'read-write'}}}}));assert.equal((await write('pc2')).result.error.code,'DISABLED');
 assert.ok(sent>0);assert.ok(!JSON.stringify(applied).includes('FAKE_GLOBAL_TOKEN_NOT_REAL'));
 console.log('PASS: one explicit global consent, actual per-host CLI gates, imported-authority refusal, read-only new hosts, offline last-acknowledged rights, explicit retry and local disable precedence');
}finally{fs.rmSync(root,{recursive:true,force:true});}
