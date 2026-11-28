import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import fs from 'node:fs';import path from 'node:path';import os from 'node:os';import {createRequire} from 'node:module';
import {build} from '../tools/build.mjs';
const require=createRequire(import.meta.url),transport=require('../src/services/private-actions/trello-transport.cjs');
const root=fs.mkdtempSync(path.join(process.env.TRELLO_TEST_ROOT||process.env.RUNNER_TEMP||os.tmpdir(),'trello-launch-'));
try{
 const store=new Map(),calls=[],notices=[];let reject=false;
 const host={checking:()=>false,shared:k=>store.get(k),setShared:(k,v)=>store.set(k,v),appHome:()=>'/fixture',notify:n=>notices.push(n),exec:async(...args)=>{calls.push(args);return reject?{code:3,stdout:JSON.stringify({ok:false,error:{message:'Owned skill conflict'}})}:{code:0,stdout:JSON.stringify({ok:true,data:args[1].includes('--discovery-all')?{pending:[]}:{announced:true}})};}};
 const {r,p}=await loadMod({host,entry:'import * as r from "./plugins.js"; import p from "./plugins/trello/plugin.js"; export {r,p};'});
 // Disabled preparation still participates, so persisted owned notes are removed.
 await r.pluginPrepareProfile({machine:'pc2',profile:'a1',argv:['a1']});assert.ok(calls.at(-1)[1].includes('--prepare'));assert.equal(calls.at(-1)[1].at(-1),'false');assert.equal(calls.at(-1)[1].at(-2),'"pc2"');
 store.set('custom.plugins',{trello:{enabled:true}});
 for(const [profile,argv,role] of [['a1',['a1'],null],['claude',['claude','--','literal --prompt'],null],['custom',['C:/agent/codex.exe'],null],['a1',['a1'],'firstmate']]){await r.pluginPrepareProfile({machine:null,profile,argv,role});assert.equal(calls.at(-1)[1].at(-1),'true');}
 reject=true;await assert.rejects(r.pluginPrepareProfile({machine:null}),/Owned skill conflict/);reject=false;
 await assert.rejects(r.pluginPrepareProfile({machine:null,isCurrent:()=>false}),/Plugin settings changed/);
 const owner={},jobs=[],cx={spawn:fn=>jobs.push(fn)};p.lifecycle['sidebar.sync']({owner,cx,enabled:true});p.lifecycle['sidebar.sync']({owner,cx,enabled:true});assert.equal(jobs.length,1);await jobs.shift()({sleep:async()=>{}});assert.ok(calls.at(-1)[1].includes('--discovery-all'));assert.equal(notices.length,0);
 p.lifecycle['sidebar.sync']({owner,cx,enabled:false});await jobs.shift()({sleep:async()=>{}});assert.equal(calls.at(-1)[1].at(-1),'false');
 // Execute the real installed service with fake homes, not the person's skills.
 const {output}=build(),runtime=path.join(output),home=path.join(root,'app'),userHome=path.join(root,'user');fs.mkdirSync(home);fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify({'custom.plugins':{trello:{enabled:true}}}));
 const options={runtime,discoveryOptions:{userHome}};
 const prepared=await transport.dispatch(home,{machine:null},{action:'discovery.prepare',enabled:true},()=>{},options);assert.equal(prepared.ok,true);assert.equal(prepared.data.announced,true);assert.ok(fs.existsSync(path.join(userHome,'.agents/skills/herdr-trello/SKILL.md')));
 const removed=await transport.dispatch(home,{machine:null},{action:'discovery.prepare',enabled:false},()=>{},options);assert.equal(removed.ok,true);assert.ok(!fs.existsSync(path.join(userHome,'.claude/skills/herdr-trello/SKILL.md')));
 assert.equal((await transport.dispatch(home,{machine:null},{action:'discovery.prepare',enabled:true,token:'forbidden'},()=>{},options)).error.code,'INPUT');
 const {Store}=require('../src/plugins/trello/credentials.cjs'),controller=require('../src/services/private-actions/trello-controller.cjs');
 const privateStore=new Store(home,{security:()=>{}}),record=controller.fresh();record.hosts.push({machine:'offline',binding:{id:'remote',session:'default',principal:'a'.repeat(64),home:'b'.repeat(64)},access:'read-only',intent:record.intent});privateStore.write('controller',record);
 const all=await transport.dispatch(home,{machine:null},{action:'discovery.all',enabled:false},()=>{},{...options,storeOptions:{security:()=>{}},spawnSync:()=>({status:0,stdout:JSON.stringify({machines:[]})})});
 assert.deepEqual(all.data.pending,['offline']);assert.ok(!fs.existsSync(path.join(userHome,'.agents/skills/herdr-trello/SKILL.md')),'Offline peer cannot substitute local skills');
 // The existing shared +/Start queue has one agent startup boundary.
 const source=fs.readFileSync(new URL('../src/features/tabs/profile-launches.js',import.meta.url),'utf8');assert.ok(source.indexOf('await pluginPrepareProfile')<source.indexOf('const source = await readTextFile'));
 console.log('PASS: disabled/enabled preparation, ordinary/role/explicit profiles, awaited refusal, lifecycle coalescing and real fake-home note publication; no agents or model calls');
}finally{fs.rmSync(root,{recursive:true,force:true});}
