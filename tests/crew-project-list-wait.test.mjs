import assert from 'node:assert/strict';
import {formsHarness,words} from './support/plugin-forms.mjs';
import {requestQueue} from '../src/shared/settings-requests.js';
const tick=()=>new Promise(resolve=>setImmediate(resolve));
const cap={capability:'project-kinds',version:1,listJson:true,setKind:true,explicitHome:true,expectedPath:true,kinds:['workflow','plain','gate']};
const ran=(stdout,code=0,timedOut=false)=>({code:0,stdout:JSON.stringify({code,timed_out:timedOut,stdout:Buffer.from(typeof stdout==='string'?stdout:JSON.stringify(stdout)).toString('base64'),stderr:''})});

async function fixture(supported,machine=null){
  let clock=0,latency=20000,version=1,failure=false;
  const waiting=[],calls=[],leases=[],commands=requestQueue(4);
  const h=await formsHarness({window:()=>({platform:'windows'}),hc:async args=>{
    if(args[0]==='machine')return {code:0,stdout:JSON.stringify({machines:[{name:'fixture-ssh',state:'connected'}]})};
    assert.equal(args[0],'exec');const script=args.at(-1),seconds=Number(args[args.indexOf('--timeout')+1]);
    calls.push({script,seconds,machine:args.includes('--on')?args[args.indexOf('--on')+1]:null});
    if(script.includes('$tools = @{}'))return ran({platform:{windows:true,arch:'AMD64'},tools:{},hooks:[]});
    if(script.includes("project '--capabilities'"))return ran(supported?cap:'Usage: crew project');
    if(!script.includes("project 'list'"))return ran('root=C:/fixture/.crew\ntool=C:/fixture/core\nhome=1\n');
    assert.equal(script.includes("'--json'"),supported,'JSON/legacy listing stays capability-gated');
    const name='project-'+version;
    const reply=failure?ran('refused',3):ran(supported?{capability:'project-kinds',version:1,ok:true,home:'C:/fixture/.crew',projects:[{name,path:'D:/Git/'+name,kind:'plain'}]}:`${name}\tD:/Git/${name}`);
    return new Promise(resolve=>waiting.push({due:clock+Math.min(latency,seconds*1000),resolve,reply:latency>seconds*1000?ran('',null,true):reply}));
  }},null,{'settings-requests.js':{
    settingsGroups:requestQueue(2),settingsCommands:(work,options)=>{leases.push(options.timeout);return commands(work,options);},
  }});
  h.cx.sleep=tick;h.view.settingsMachine=machine;h.ui.initPlugins(h.view,h.cx,'crew');
  const plugin=h.registry.PLUGINS.find(p=>p.id==='crew');h.registry.setPluginEnabled(plugin,true);h.registry.setPluginSetting(plugin,'machine',machine);h.view.pluginOpen['crew-projects']=true;
  const item=()=>h.view.pluginChecks.crew.items.find(i=>i.id==='projects');
  const busy=()=>h.view.pluginChecks.crew.groups.projects.loading;
  const start=async()=>{
    h.ui.reloadPlugins(h.view,h.cx,'crew','projects');const job=h.jobs.shift()(h.cx);
    for(let i=0;i<100&&!waiting.length;i++)await tick();
    assert.equal(waiting.length,1,'Only one list read is dispatched');return {job};
  };
  const advance=async ms=>{clock+=ms;for(const entry of [...waiting])if(entry.due<=clock){waiting.splice(waiting.indexOf(entry),1);entry.resolve(entry.reply);}await tick();};
  return {h,plugin,waiting,calls,leases,item,busy,start,advance,set:options=>{if(options.latency!==undefined)latency=options.latency;if(options.version!==undefined)version=options.version;if(options.failure!==undefined)failure=options.failure;}};
}

for(const [supported,machine]of [[true,null],[false,'fixture-ssh']]){
  const f=await fixture(supported,machine),{h}=f;
  let {job}=await f.start();
  assert.equal(f.busy(),true);assert.ok(words(h.render()).includes('Checking'),'Cold read uses existing pending feedback');
  await f.advance(15001);
  assert.equal(f.busy(),true);assert.equal(f.item().status,null);
  assert.ok(!words(h.render()).some(w=>/Could not read Crew projects/.test(w)),'No premature error after old deadline');
  await f.advance(4999);await job;
  assert.equal(f.busy(),false);assert.equal(f.item().status,'ready');assert.equal(f.item().rows[0].id,'project-1');
  const confirmed=f.item().rows;f.set({version:2});({job}=await f.start());
  await f.advance(15001);
  assert.equal(f.item().rows,confirmed,'Warm read retains the exact confirmed rows');
  assert.ok(words(h.render()).some(w=>w.includes('project-1')),'Confirmed project stays mounted while refreshing');
  assert.equal(f.busy(),true);assert.ok(!words(h.render()).some(w=>/Could not read Crew projects/.test(w)));
  await f.advance(4999);await job;
  assert.equal(f.item().rows[0].id,'project-2');assert.equal(f.item().status,'ready');
  assert.ok(!words(h.render()).some(w=>w.includes('project-1')),'New successful list replaces old rows');
  const latest=f.item().rows;f.set({latency:61000});({job}=await f.start());
  await f.advance(59999);assert.equal(f.busy(),true);assert.equal(f.item().rows,latest);
  await f.advance(1);await job;
  assert.equal(f.busy(),false);assert.equal(f.item().status,'error');assert.equal(f.item().usable,false);assert.equal(f.item().rows,latest);
  assert.match(f.item().detail,/Could not read Crew projects/);
  f.set({latency:1,failure:true});({job}=await f.start());await f.advance(1);await job;
  assert.equal(f.item().status,'error');assert.equal(f.item().rows,latest,'Genuine refusals retain confirmed rows');
  const lists=f.calls.filter(c=>c.script.includes("project 'list'"));
  assert.equal(lists.length,4,'Timeouts and refusals do not replay a list');
  assert.ok(lists.every(c=>c.seconds===60&&c.machine===machine));
  assert.ok(f.calls.filter(c=>c.script.includes("project '--capabilities'")).every(c=>c.seconds===15),'Capabilities keep ordinary probe limit');
  assert.ok(f.leases.includes(62000),'Settings command admission follows list deadline plus transport slack');
  assert.ok(f.leases.includes(17000),'Ordinary probe admission stays short');
}
// Late results cannot publish after any UI context retirement.
for(const retire of ['machine','closed','disabled','superseded']){
  const f=await fixture(true);f.set({latency:1});let {job}=await f.start();await f.advance(1);await job;
  const confirmed=f.item().rows;f.set({latency:20000,version:2});({job}=await f.start());
  if(retire==='machine')f.h.view.settingsMachine='fixture-ssh';
  if(retire==='closed')f.h.view.pluginClosed=true;
  if(retire==='disabled')f.h.click('st-plugin-crew-enabled');
  if(retire==='superseded')f.h.ui.reloadPlugins(f.h.view,f.h.cx,'crew','projects');
  await f.advance(20000);await job;
  if(retire==='disabled')assert.equal(f.h.view.pluginChecks.crew,undefined);
  else assert.equal(f.item().rows,confirmed,retire+' rejects the obsolete response');
  assert.equal(f.calls.filter(c=>c.script.includes("project 'list'")).length,2,'Retirement starts no follow-up reads');
}
console.log('PASS actual Crew Projects: cold/warm twenty-second JSON and legacy reads, retained rows, 60s timeout/62s admission, short probes, failures/no replay and four retired contexts');
