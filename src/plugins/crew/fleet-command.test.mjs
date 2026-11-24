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
assert.doesNotMatch(script,/\$(?:stdout|stderr|tasks)\s*\+=/,'Stream and task collection must not recopy growing arrays');
assert.match(script,/\$stdout\.Add\(/);assert.match(script,/\$stderr\.Add\(/);
assert.doesNotMatch(fleetStatusScript([], {legacy:true}),/--help/,'An exact view refusal uses a forced legacy fallback');
assert.doesNotMatch(fleetStatusScript([], {discover:false}),/'--discover-prs'/);
if(process.platform!=='win32') {
 console.log('PASS fleet projection command contract; actual Windows PowerShell fixture runs on Windows');
} else {
 const root=fs.mkdtempSync(path.resolve('.artifacts/fleet-command-'));
 try {
  const cli=path.join(root,'crew-fixture.mjs'),config=path.join(root,'config.json'),calls=path.join(root,'calls.jsonl');
  fs.writeFileSync(cli,`import fs from 'node:fs';const config=JSON.parse(fs.readFileSync(${JSON.stringify(config)},'utf8')),args=process.argv.slice(2);fs.appendFileSync(${JSON.stringify(calls)},JSON.stringify(args)+'\\n');if(args[0]==='--help'){console.log(config.capable?'crew status --json --view fleet [--discover-prs]':'crew status [--all] [--json] [--discover-prs]');}else{if(!args.includes('--all')&&!args.includes('--view'))throw Error('Legacy history must not disappear');if(!config.capable&&args.includes('--view'))throw Error('Old Crew can silently ignore this flag');if(config.exit){process.stderr.write(config.error??'fixture status failure');process.exit(config.exit);}const text=JSON.stringify(config.payload,null,config.pretty?2:undefined);const lines=text.split('\\n').length;console.log(text+'\\n'.repeat(Math.max(0,(config.lines??lines)-lines)));}`);
  const quote=s=>"'"+s.replaceAll("'","''")+"'";
  const run=(payload,capable=false,options={},format={})=>{
   fs.writeFileSync(config,JSON.stringify({payload,capable,...format}));fs.writeFileSync(calls,'');
   const command=fleetStatusScript(["$ErrorActionPreference = 'Stop'","$ProgressPreference = 'SilentlyContinue'",`$main = ${quote(cli)}`],options);
   const started=performance.now();
   const stdout=execFileSync('powershell',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(command,'utf16le').toString('base64')],{encoding:'utf8',timeout:15000,windowsHide:true,stdio:['ignore','pipe','pipe']});
   const prefix='__HERDR_FLEET_CAPABILITY__',lines=stdout.split('\n'),capability=stdout.startsWith(prefix)?JSON.parse(lines.shift().slice(prefix.length)):null;
   return {milliseconds:performance.now()-started,value:JSON.parse(lines.join('\n')),capability,calls:fs.readFileSync(calls,'utf8').trim().split('\n').map(JSON.parse),bytes:Buffer.byteLength(stdout)};
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
  const recorded=run(payload,true,{discover:false,reportCapability:true});assert.ok(!recorded.calls.at(-1).includes('--discover-prs'));
  assert.equal(recorded.capability.view,true);assert.ok(recorded.capability.key.includes('crew-fixture.mjs|'));
  const quoted=run(payload,true,{discover:false,capability:{key:"x’ ; Write-Output 'injected'; '",view:true}});
  assert.deepEqual(quoted.value,expected,'Cached paths use PowerShell literal quoting, including smart quotes');
  const cached=run(payload,true,{discover:false,reportCapability:true,capability:recorded.capability});
  assert.deepEqual(cached.calls,[['status','--json','--view','fleet']],'An unchanged installation never reruns help');
  fs.appendFileSync(cli,'\n// new installation modification time\n');
  const changed=run(payload,true,{discover:false,reportCapability:true,capability:recorded.capability});
  assert.notEqual(changed.capability.key,recorded.capability.key);assert.deepEqual(changed.calls,[['--help'],['status','--json','--view','fleet']],'Changed installation reprobes once');
  assert.deepEqual(run(payload,true,{legacy:true}).calls,[['status','--all','--json','--discover-prs']]);
  for(const malformed of [
   {home:'fixture',tasks:[]}, {home:'fixture',owner:[],tasks:[]}, {home:'fixture',owner:[{terminal:'t1',live:true}],tasks:[]},
   {home:'fixture',owner:null,tasks:null},
   {home:'fixture',owner:null,tasks:[{id:'bad',state:'closed'}]},
  ])assert.deepEqual(run(malformed).value,malformed,'Projection cannot fabricate authoritative missing owner/tasks/terminal facts');
  const malformedDiscovery={...payload,tasks:[{id:'bad',state:'closed',terminal:null,prDiscovery:{status:'none'}}]};
  assert.deepEqual(run(malformedDiscovery).value.tasks[0].prDiscovery,{status:'none'},'Missing discovery fields stay missing for strict rejection');
  // Thousands of valid JSON lines must not turn stdout or projected task
  // collection into quadratic array/string copying. All inputs remain inside
  // the supported one-MiB/4096-task boundary, including pretty legacy output.
  const scaling=[];
  for(const [lines,count] of [[5000,400],[20000,1600],[50000,4096]]) {
   const large={home:'fixture',owner:{terminal:'t1',live:true},tasks:Array.from({length:count},(_,i)=>({id:`task-${i}`,state:i?'closed':'working',terminal:i?null:'t2',pr:null,report:'unused',standby:[{unused:true}]}))};
   const pretty=JSON.stringify(large,null,2);assert.ok(Buffer.byteLength(pretty)<1048576);
   assert.ok(pretty.split('\n').length<=lines);
   const r=run(large,false,{}, {pretty:true,lines});
   assert.equal(r.value.tasks.length,count);assert.ok(!('report' in r.value.tasks[0]));
   scaling.push({lines,tasks:count,rawBytes:Buffer.byteLength(pretty)+lines-pretty.split('\n').length+1,milliseconds:Math.round(r.milliseconds)});
   console.log('PowerShell scaling sample:',JSON.stringify(scaling.at(-1)));
  }
  assert.ok(scaling[2].milliseconds<=scaling[0].milliseconds*10*1.5+250,'50k-line cost must remain near linear relative to 5k lines');
  assert.ok(scaling[2].milliseconds<=scaling[1].milliseconds*2.5*1.8+250,'50k-line cost must remain near linear relative to 20k lines');
  console.log('PowerShell whole-wrapper scaling:',JSON.stringify(scaling));
  fs.writeFileSync(config,JSON.stringify({payload,capable:true,exit:2,error:'crew: Unknown option: --view'}));
  const failed=fleetStatusScript(["$ErrorActionPreference = 'Stop'","$ProgressPreference = 'SilentlyContinue'",`$main = ${quote(cli)}`]);
  assert.throws(()=>execFileSync('powershell',['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(failed,'utf16le').toString('base64')],{encoding:'utf8',timeout:15000,windowsHide:true,stdio:['ignore','pipe','pipe']}),error=>error.status===2&&error.stdout.trim()===''&&error.stderr.trim()==='crew: Unknown option: --view','Exact raw refusals and native exit codes survive PowerShell 5');
  console.log('PASS actual PowerShell fleet projection: advertised view, legacy/recorded output, large unused fields, UTF-8, old Open history and malformed-shape preservation');
 } finally {fs.rmSync(root,{recursive:true,force:true});}
}
