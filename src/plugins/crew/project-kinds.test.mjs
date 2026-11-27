import assert from 'node:assert/strict';
import { projectKindCapability, projectKindRows, readProjectKinds } from './project-kinds.js';
const capability = {capability:'project-kinds',version:1,listJson:true,setKind:true,explicitHome:true,expectedPath:true,kinds:['workflow','plain','gate']};
const home = 'C:/Users/fixture/.crew';
const listing = {capability:'project-kinds',version:1,ok:true,home,projects:['workflow','plain','gate'].map((kind,i)=>({name:['myworkflows','site.dev','.hidden'][i],path:`D:/Git/project-${i}`,kind}))};
assert.ok(projectKindCapability(capability));
for (const value of [null,[],{},'help',{...capability,version:2},{...capability,expectedPath:false},{...capability,kinds:['plain']}]) assert.equal(projectKindCapability(value),false);
const rows = projectKindRows(listing);
assert.deepEqual(rows.map(r=>[r.id,r.choice.value]),[['myworkflows','workflow'],['site.dev','plain'],['.hidden','gate']]);
assert.equal(rows[0].path,'D:\\Git\\project-0');assert.equal(rows[0].kindTarget.home,home);
assert.deepEqual(projectKindRows({...listing,projects:[]}),[]);
const changedKind=projectKindRows({...listing,projects:[{...listing.projects[0],kind:'plain'}]})[0];
assert.equal(changedKind.choice.identity,rows[0].choice.identity,'Kind changes retain registration identity for focus');
assert.notEqual(changedKind.choice.revision,rows[0].choice.revision,'Kind changes still invalidate value revisions');
for(const changed of [{...listing,home:'C:/another-home'},...['name','path'].map(key=>({...listing,projects:[{...listing.projects[0],[key]:key==='name'?'other':'D:/other'}]}))])
 assert.notEqual(projectKindRows(changed)[0].choice.identity,rows[0].choice.identity,'Home, name and folder remain separate focus identities');
for (const value of [null,[],{...listing,home:'relative'},{...listing,version:2},{...listing,projects:{}},
 {...listing,projects:[listing.projects[0],listing.projects[0]]},
 ...[{kind:'unknown'},{name:'bad..name'},{name:'Bad'},{path:'relative'},{path:'D:/bad\npath'},{path:'D:/Git/../other'}].map(bad=>({...listing,projects:[{...listing.projects[0],...bad}]}))]) assert.equal(projectKindRows(value),null,JSON.stringify(value));
const reply = (v,code=0,stderr='')=>({code,stdout:typeof v==='string'?v:JSON.stringify(v),stderr});
for (const probe of [reply('Usage: crew project list'),reply('{}'),reply({...capability,version:99}),reply('',2,'unknown option: --capabilities')]) {
 const calls=[];const facts=await readProjectKinds(async args=>{calls.push(args);return args[0]==='list'?reply('old\tD:/Git/old\tworkflow delivery'):probe;},s=>s.split('\n').map(line=>({id:line.split('\t')[0],path:line.split('\t')[1]})));
 assert.deepEqual(calls,[['--capabilities','--json'],['list']]);assert.equal(facts.kindSupported,false);assert.equal(facts.rows[0].choice,undefined);
}
const calls=[];const facts=await readProjectKinds(async args=>{calls.push(args);return reply(args[0]==='list'?listing:capability);},()=>{throw Error('must not parse text');});
assert.equal(facts.kindSupported,true);assert.deepEqual(calls,[['--capabilities','--json'],['list','--json']]);
for (const bad of [{code:null,timedOut:true},{code:null,missing:true},reply('',3,'Permission denied'),reply('bad')]) {
 const calls=[];await assert.rejects(readProjectKinds(async args=>{calls.push(args);return args[0]==='list'?bad:reply(capability);},()=>[]),/Could not read/);
 assert.equal(calls.length,2,'Never falls back to text after an advertised JSON failure');
}
let attempts=0;await assert.rejects(readProjectKinds(async()=>{attempts++;return {timedOut:true};},()=>[]));assert.equal(attempts,1);
console.log('PASS Crew project-kinds strict JSON, all labels, legacy-only paths, invalid/duplicate identities and bounded transport failure');
