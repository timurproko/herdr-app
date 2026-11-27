import assert from 'node:assert/strict';
import { setProjectKind } from './project-kind-set.js';
import { sameProjectPath } from './project-kinds.js';
import { loadMod } from '../../../tools/plugin-harness.mjs';
const cap={capability:'project-kinds',version:1,listJson:true,setKind:true,explicitHome:true,expectedPath:true,kinds:['workflow','plain','gate']};
const target={home:'C:/Users/fixture/.crew',name:'.site.dev',path:"D:/Git/it's",kind:'workflow'};
const success={capability:'project-kinds',version:1,ok:true,home:target.home,project:{name:target.name,path:target.path,kind:'plain'},changed:true};
const reply=(value,code=0)=>({code,stdout:JSON.stringify(value),stderr:''});
assert.ok(sameProjectPath('D:\\Git\\Site','d:/git/site'));assert.equal(sameProjectPath('/git/Site','/git/site'),false);
let calls=[];const ask=async args=>{calls.push(args);return reply(args[0]==='set-kind'?success:cap);};
assert.deepEqual(await setProjectKind(ask,target,'plain'),{value:'plain'});
assert.deepEqual(calls,[['--capabilities','--json'],['set-kind',target.name,'--kind','plain','--home',target.home,'--expected-path',target.path,'--json']]);
assert.deepEqual(await setProjectKind(async args=>reply(args[0]==='set-kind'?{...success,owner:'coordinator'}:cap),target,'plain'),{value:'plain'},'A matching success on a coordinator-owned home is normal success');
await assert.rejects(setProjectKind(async args=>reply(args[0]==='set-kind'?{...success,ok:false,error:{code:'home-owned'}}:cap,args[0]==='set-kind'?3:0),target,'plain'),{message:'Delivery kind was not changed. Refresh and try again.'});
calls=[];await setProjectKind(ask,target,'workflow');assert.equal(calls.length,0);
for (const bad of [{...success,version:2},{...success,home:'C:/foreign'},{...success,changed:'yes'},
 ...[{name:'other'},{path:'D:/other'},{kind:'gate'}].map(p=>({...success,project:{...success.project,...p}}))])
 await assert.rejects(setProjectKind(async args=>reply(args[0]==='set-kind'?bad:cap),target,'plain'),e=>e.uncertain===true);
for (const code of ['home-owned','home-missing','project-missing','project-changed','kind-unavailable','registry-busy','internal-error','other'])
 await assert.rejects(setProjectKind(async args=>args[0]==='set-kind'?reply({...success,ok:false,error:{code,message:'Usage: SECRET\nstack'}},3):reply(cap),target,'plain'),e=>!e.uncertain&&!/SECRET|Usage:|stack/.test(e.message));
for (const outcome of [{code:null,timedOut:true},{code:null,missing:true},{code:0,stdout:'Usage: secret'},null])
 await assert.rejects(setProjectKind(async args=>args[0]==='set-kind'?outcome:reply(cap),target,'plain'),e=>e.uncertain===true);
let n=0;await assert.rejects(setProjectKind(async()=>{n++;return reply({...cap,expectedPath:false});},target,'plain'));assert.equal(n,1);
let live=true;n=0;await assert.rejects(setProjectKind(async()=>{n++;live=false;return reply(cap);},target,'plain',()=>live));assert.equal(n,1,'Obsolete probe cannot dispatch the setter');

// Actual packaged provider and local/SSH argv routing; all hc and Crew answers are fake.
const state={},programs=[];let value='workflow',fail=false,owned=false,listBad=false,probeWait=null;
const run=r=>({code:0,stdout:JSON.stringify({...r,stdout:Buffer.from(r.stdout??'').toString('base64'),stderr:Buffer.from(r.stderr??'').toString('base64')}),stderr:''});
const {plugin}=await loadMod({host:{shared:k=>state[k],setShared:(k,v)=>state[k]=v,hc:async args=>{
 if(args[0]==='machine')return {code:0,stdout:JSON.stringify({machines:[{name:'fixture-ssh',state:'connected'}]})};
 const script=args.at(-1),match=/& node \$main project (.*)/.exec(script);
 if(!match)return run({code:0,stdout:script.includes('PROCESSOR_ARCHITECTURE')?'AMD64':`root=${target.home}\ntool=C:/fixture/core\nhome=1\n`});
 const argv=[...match[1].matchAll(/'((?:[^']|'')*)'/g)].map(m=>m[1].replaceAll("''","'"));programs.push({machine:args.includes('--on')?args[args.indexOf('--on')+1]:null,argv,script});
 if(argv[0]==='--capabilities'){if(probeWait)await probeWait;return run(reply(cap));}
 if(argv[0]==='list' && listBad)return run({code:0,stdout:'malformed list'});
 if(argv[0]==='list')return run(reply({capability:'project-kinds',version:1,ok:true,home:target.home,projects:[{name:target.name,path:target.path,kind:value}]}));
 assert.equal(argv[0],'set-kind');assert.ok(script.includes("'D:/Git/it''s'"));
 if(fail)return run({code:0,stdout:'bad acknowledgement'});
 if(owned)return run(reply({...success,ok:false,error:{code:'home-owned'}},3));
 value=argv[3];return run(reply({...success,project:{...success.project,kind:value}}));
}},modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:'export {default as plugin} from "./plugins/crew/plugin.js";'});
const section=plugin.prerequisites.find(p=>p.id==='projects');
for(const machine of [null,'fixture-ssh']) {
 let current;const context=()=>({setting:()=>machine,isCurrent:()=>true,result:()=>current});
 current=await section.check(context());assert.equal(current.kindSupported,true);let row=current.rows[0];
 const other=value==='workflow'?'plain':'workflow';assert.deepEqual(JSON.parse(JSON.stringify(await section.list.rowChoice.set(context(),row,other))),{value:other});
 assert.equal(programs.at(-1).machine,machine);
 current=await section.check(context());row=current.rows[0];owned=true;
 await assert.rejects(section.list.rowChoice.set(context(),row,'gate'),/Delivery kind was not changed/);owned=false;
 fail=true;await assert.rejects(section.list.rowChoice.set(context(),row,'gate'),e=>e.uncertain);fail=false;
 const before=programs.length;await assert.rejects(section.list.rowChoice.set(context(),row,'gate'),/Refresh/);assert.equal(programs.length,before,'Unknown outcome revokes write authority until a fresh list');
 current=await section.check(context());await section.list.rowChoice.set(context(),current.rows[0],'gate');
 current=await section.check(context());const confirmedRows=current.rows;listBad=true;
 current=await section.check(context());assert.equal(current.usable,false);assert.equal(current.rows,confirmedRows,'An invalid list preserves confirmed labels without write authority');listBad=false;
}
let release;probeWait=new Promise(r=>release=r);let obsolete=false,machine=null;
const read=section.check({setting:()=>machine,isCurrent:()=>!obsolete,result:()=>null});
while(programs.at(-1)?.argv[0]!=='--capabilities')await new Promise(r=>setTimeout(r,0));
// Wait for this check's capability rather than a preceding iteration's probe.
await new Promise(r=>setTimeout(r,0));const before=programs.length;obsolete=true;machine='fixture-ssh';release();await read;
assert.equal(programs.length,before,'Retired capability read starts no follow-up list on either machine');
assert.ok(programs.every(p=>!['add','remove'].includes(p.argv[0])),'Kind edits never re-register or remove');
console.log('PASS Crew kind-only setter: captured local/SSH targets, quoting, capability recheck, stored acknowledgement, sanitized refusals and unknown-outcome read barrier');
