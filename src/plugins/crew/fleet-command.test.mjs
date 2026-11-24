import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {execFileSync} from 'node:child_process';
import {fleetStatusScript} from './fleet-command.js';

const script=fleetStatusScript(['$main = "fixture"']);
assert.match(script,/--view\(\?:\\s\+\|=\)fleet/);
assert.match(script,/status '--json' '--view' 'fleet' '--discover-prs'/);
assert.match(script,/status '--all' '--json' '--discover-prs'/);
assert.doesNotMatch(script,/Remove-Item|Set-Content|Start-Process|Invoke-WebRequest/);
assert.doesNotMatch(fleetStatusScript([], {legacy:true}),/--help/,'An exact view refusal uses a forced legacy fallback');
assert.doesNotMatch(fleetStatusScript([], {discover:false}),/'--discover-prs'/);
if(process.platform!=='win32') {
 console.log('PASS fleet projection command contract; actual Windows PowerShell fixture runs on Windows');
} else {
 const root=fs.mkdtempSync(path.resolve('.artifacts/fleet-command-'));
 try {
  const cli=path.join(root,'crew-fixture.mjs'),config=path.join(root,'config.json'),calls=path.join(root,'calls.jsonl');
  fs.writeFileSync(cli,`import fs from 'node:fs';const config=JSON.parse(fs.readFileSync(${JSON.stringify(config)},'utf8')),args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify(args)+'\\n');if(args[0]==='--help'){console.log(config.capable?'crew status --json --view fleet [--discover-prs]':'crew status [--all] [--json] [--discover-prs]');}else{if(!args.includes('--all')&&!args.includes('--view'))throw Error('Legacy history must not disappear');if(!config.capable&&args.includes('--view'))throw Error('Old Crew can silently ignore this flag');if(config.exit){process.stderr.write(config.error??'fixture status failure');process.exit(config.exit);}console.log(JSON.stringify(config.payload));}`);
  const quote=s=>"'"+s.replaceAll("'","''")+"'";
  const run=(payload,capable=false,options={})=>{
   fs.writeFileSync(config,JSON.stringify({payload,capable}));fs.writeFileSync(calls,'');
   const command=fleetStatusScript(["$ErrorActionPreference = 'Stop'","$ProgressPreference = 'SilentlyContinue'",`$main = ${quote(cli)}`],options);
   const stdout=execFileSync('powershell',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{encoding:'utf8',timeout:15000,windowsHide:true,stdio:['ignore','pipe','pipe']});
   return {value:JSON.parse(stdout),calls:fs.readFileSync(calls,'utf8').trim().split('\n').map(JSON.parse),bytes:Buffer.byteLength(stdout)};
  };
  const discovery={status:'known',url:'https://github.com/example/repo/pull/1',source:'recorded',reason:null};
  const payload={home:'fixture/é界🚢',owner:{terminal:'t1',live:true,mine:false,unused:'x'.repeat(5000)},tasks:[
   {id:'working',state:'working',terminal:'t2',pr:null,prDiscovery:{status:'none',url:null,source:null,reason:null},report:'x'.repeat(300000),standby:[{unused:true}]},
   {id:'old-finished-open',state:'closed',terminal:null,pr:discovery.url,prDiscovery:discovery,elapsedSeconds:9999999,report:'unused'},
  ],prDiscovery:{version:1,unused:true},unused:'not needed'};
  const expected={home:payload.home,owner:{terminal:'t1',live:true},tasks:payload.tasks.map(({id,state,terminal,pr,prDiscovery})=>({id,state,terminal,pr,prDiscovery})),prDiscovery:{version:1}};
  for(const capable of [false,true]) {
   const r=run(payload,capable);assert.deepEqual(r.value,expected);assert.ok(r.bytes<1000,'Reports and unused fields never reach native Base64 decoding');
   assert.deepEqual(r.calls,[['--help'],capable?['status','--json','--view','fleet','--discover-prs']:['status','--all','--json','--discover-prs']]);
  }
  assert.deepEqual(run({...payload,owner:null,tasks:[]}).value,{home:payload.home,owner:null,tasks:[],prDiscovery:{version:1}});
  const recorded=run(payload,true,{discover:false});assert.ok(!recorded.calls.at(-1).includes('--discover-prs'));
  assert.deepEqual(run(payload,true,{legacy:true}).calls,[['status','--all','--json','--discover-prs']]);
  for(const malformed of [
   {home:'fixture',tasks:[]}, {home:'fixture',owner:[],tasks:[]}, {home:'fixture',owner:[{terminal:'t1',live:true}],tasks:[]},
   {home:'fixture',owner:null,tasks:null},
   {home:'fixture',owner:null,tasks:[{id:'bad',state:'closed'}]},
  ])assert.deepEqual(run(malformed).value,malformed,'Projection cannot fabricate authoritative missing owner/tasks/terminal facts');
  const malformedDiscovery={...payload,tasks:[{id:'bad',state:'closed',terminal:null,prDiscovery:{status:'none'}}]};
  assert.deepEqual(run(malformedDiscovery).value.tasks[0].prDiscovery,{status:'none'},'Missing discovery fields stay missing for strict rejection');
  fs.writeFileSync(config,JSON.stringify({payload,capable:true,exit:2,error:'crew: Unknown option: --view'}));
  const failed=fleetStatusScript(["$ErrorActionPreference = 'Stop'","$ProgressPreference = 'SilentlyContinue'",`$main = ${quote(cli)}`]);
  assert.throws(()=>execFileSync('powershell',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(failed,'utf16le').toString('base64')],{encoding:'utf8',timeout:15000,windowsHide:true,stdio:['ignore','pipe','pipe']}),error=>error.status===2&&error.stdout.trim()===''&&error.stderr.trim()==='crew: Unknown option: --view','Exact raw refusals and native exit codes survive PowerShell 5');
  console.log('PASS actual PowerShell fleet projection: advertised view, legacy/recorded output, large unused fields, UTF-8, old Open history and malformed-shape preservation');
 } finally {fs.rmSync(root,{recursive:true,force:true});}
}
