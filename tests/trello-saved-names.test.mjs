import assert from 'node:assert/strict';
import fs from 'node:fs';import os from 'node:os';import path from 'node:path';import {createRequire} from 'node:module';
import {formsHarness,words} from './support/plugin-forms.mjs';
const require=createRequire(import.meta.url),{Store}=require('../src/plugins/trello/credentials.cjs'),{execute}=require('../src/plugins/trello/owner.cjs'),{setup,configure}=require('../src/plugins/trello/setup.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-saved-names-')),store=new Store(path.join(root,'home'),{security:()=>{}});
const A='a'.repeat(24),credentials={apiKey:'FAKE_NAME_KEY_NOT_REAL',token:'FAKE_NAME_TOKEN_NOT_REAL'};let calls=0,payload;
const transport=async url=>{calls++;return Response.json(new URL(url).pathname.endsWith('/boards')?[{id:A,name:'Saved board 🐑',closed:false}]:{id:A,username:'fake-user',fullName:'Saved owner 🐑'});};
async function open(){
 const h=await formsHarness({checking:()=>false,appHome:()=>store.home,exec:async(_p,args)=>args.includes('--status')?{code:0,stdout:JSON.stringify(await execute({action:'status'},{store,transport}))}:{code:0,stdout:JSON.stringify({port:12345,session:'f'.repeat(64),expires:Date.now()+59000})}},null,{websocket:{WebSocket:{connect:async()=>({write:async text=>payload=JSON.parse(text).payload,read:async()=>JSON.stringify(await execute(payload,{store,transport})),close:async()=>{payload=null;}})}}});
 const p=h.registry.pluginById('trello');h.registry.setPluginEnabled(p,true);h.ui.initPlugins(h.view,h.cx,'trello');h.view.pluginOpen['trello-requirements']=true;h.view.pluginOpen['trello-boards']=true;h.ui.reloadPlugins(h.view,h.cx,'trello');await h.flush();return h;
}
try{
 setup(store,credentials);configure(store,'allow',A);
 const first=await open();assert.equal(calls,0);assert.ok(words(first.render()).includes('Check to load name'));
 first.click('st-plugin-trello-recheck');await first.flush();assert.equal(calls,2);assert.ok(words(first.render()).includes('Saved board 🐑'));
 const before=calls,second=await open();assert.equal(calls,before);const text=words(second.render()).join(' ');assert.match(text,/Saved owner 🐑/);assert.match(text,/Saved board 🐑/);assert.doesNotMatch(text,/Saved board a{24}/);
 console.log('PASS: explicit Requirements Check hydrates legacy names; new packaged views show stored names with zero provider calls');
}finally{fs.rmSync(root,{recursive:true,force:true});}
