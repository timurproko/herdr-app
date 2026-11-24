// Explicit Windows integration benchmark: real Core -> Windows PowerShell ->
// fake legacy Crew CLI (pretty multiline JSON) -> projection -> hc Base64 ->
// actual native decoder/provider/Settings/Spaces. Only Crew's data is synthetic.
// Own app/home/Core session and seven inert workers; never the person's app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {build} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import {prettyFleetStatus} from '../support/fleet-status.mjs';
if(!process.argv.includes('--run')||process.platform!=='win32')throw Error('Explicit Windows opt-in required: --run [--app <binary>]');
const preview=process.argv.includes('--git-preview');
const at=process.argv.indexOf('--app');
const appBin=at<0?(process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe')):path.resolve(process.argv[at+1]);
const coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
fs.mkdirSync('.artifacts',{recursive:true});
const root=fs.mkdtempSync(path.resolve('.artifacts/fs-')),home=path.join(root,'a');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104,'Use a shorter task checkout');
const env={...process.env,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-fleet-transport-${Date.now()}`,HERDR_RELEASES_URL:'http://127.0.0.1:1',HERDR_APP_ID:'herdr-disposable-fleet-transport'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});
const {output}=build();deploy(output,home,{repair:false});
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json',{core:coreBin,telemetry:false,zoom:1});
const appVersion=execFileSync(appBin,['--version'],{encoding:'utf8',timeout:10000}).match(/\d+\.\d+\.\d+/)?.[0];assert.ok(appVersion);
put('update-notes.json',{last_run:appVersion,presented:[appVersion]});
put('shared.json',{layout:'FleetFixture','frame.welcomed':'skipped','custom.plugins':{crew:{enabled:true},git:{enabled:preview},files:{enabled:false},usage:{enabled:false}},'custom.spaces.preferences':{connectFleetToCoordinator:true},'space.colors':{coordinator:'#22aa44','fm-crew-home':'#cc8833'}});
put('layouts/FleetFixture.json',{id:'root',theme:'Custom',type:'row',titlebar:'system',children:[{id:'sidebar',type:'block',size:{px:300},content:{mod:'custom-spaces'}},{id:'body',type:'column',children:[{id:'driver',type:'block',size:{px:48},content:{mod:'custom-fleet-driver'}},{id:'work',type:'row',children:[{id:'main',type:'block',content:{tab:'active',pane:{gap:8,radius:8,background:'background'}}},...(preview?[{id:'panel',type:'block',size:{px:420},content:{mod:'custom-changes'}}]:[])]}]}]});
put('fixture/placeholder','');
put('.crew/core/crew.mjs',`import fs from 'node:fs';\n${prettyFleetStatus.toString()}\nif(process.argv[2]==='--help'){console.log('crew status [--all] [--json] [--discover-prs]');}else{if(!process.argv.includes('--all'))throw Error('Legacy history lost');const config=JSON.parse(process.env.FLEET_STATUS_FIXTURE);const r=prettyFleetStatus(config);fs.appendFileSync(${JSON.stringify(path.join(home,'fixture/child-events.jsonl'))},JSON.stringify({caseId:config.caseId,at:Date.now(),bytes:r.bytes,lines:r.lines,tasks:r.tasks})+'\\n');if(config.delay)await new Promise(resolve=>setTimeout(resolve,config.delay));process.stdout.write(r.text);}`);
const fixtureMods=['custom-settings','custom-spaces',...(preview?['custom-changes']:[])];
for(const mod of fixtureMods) {
 const dir=path.join(home,'mods',mod);fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
 fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';import * as native from './native-host.js';
export const run=name=>{throw Error('Fixture mod cannot mutate native state: '+name);};
export const exec=(command)=>{if(${JSON.stringify(mod)}==='custom-changes'&&command==='git')return Promise.resolve({code:128,stdout:'',stderr:'fatal: not a git repository'});throw Error('No GitHub/unknown exec in fixture');};
export const setShared=(key,value)=>{native.setShared(key,value);if(key==='custom.fleet.display'&&value?.entries?.null)native.setShared('fixture.attached',{caseId:native.shared('fixture.case')?.caseId,at:Date.now(),generation:native.shared('custom.fleet.generation')});};
export async function hc(args){if(args[0]==='machine')return native.hc(args);
 if(!args.at(-1).includes("status '--all' '--json' '--discover-prs'"))throw Error('Unexpected Core call');
 const live=native.terminals(),owner=live.find(t=>t.labels?.['custom.crew.home']==='1'),spec=native.shared('fixture.case')??{caseId:'warm',bytes:10240,count:40};
 const data=JSON.stringify({...spec,owner:owner?.address??'t1',live:live.filter(t=>t.labels?.['crew.task']).map(t=>({id:t.labels['crew.task'],terminal:t.address}))});
 // Core exec constructs its own environment: pin the fixture profile IN the
 // child PowerShell, not merely on the app process. Guard the selected CLI too.
 const command=[...args],body=command.at(-1).replace("$main = Join-Path $tool 'crew.mjs'","$main = Join-Path $tool 'crew.mjs'; if ($main -ne "+${JSON.stringify("'"+path.join(home,'.crew/core/crew.mjs').replaceAll('/','\\').replaceAll("'","''")+"'")}+") { throw 'Not the disposable Crew fixture' }");
 command[command.length-1]=${JSON.stringify("$env:USERPROFILE = '"+home.replaceAll("'","''")+"';\n")}+"$env:FLEET_STATUS_FIXTURE = '"+data.replaceAll("'","''")+"';\\n"+body;
 const started=Date.now();const result=await native.hc(command);const ended=Date.now();
 if(result.code!==0){native.setShared('fixture.transportError',{code:result.code,stdout:result.stdout,stderr:result.stderr});return result;}
 const transport=JSON.parse(result.stdout),b64=transport.stdout??'';
 native.setShared('fixture.transports',[...(native.shared('fixture.transports')??[]),{caseId:spec.caseId,generation:native.shared('custom.fleet.generation'),started,ended,milliseconds:ended-started,bytes:b64.length*3/4-(b64.endsWith('==')?2:b64.endsWith('=')?1:0),hcCode:result.code,code:transport.code}]);
 return result;}
`);
 const decoder=path.join(dir,'plugins/crew/plugin.js');let source=fs.readFileSync(decoder,'utf8');
 const begin="  const parts = [];\n  if (!current()) throw fleetError('obsolete-generation');",pause="if (!piece.last) { await yieldTurn(); if (!current())",end="  return parts.join('');\n}\n\nconst json";
 assert.ok([begin,pause,end].every(text=>source.includes(text)));
 // Time entire decoder turns, including initial cleanup/buffer allocation and
 // the final concatenation, not merely the inner quartet loop. Exclude waits.
 source=source.replace(begin,"  let turnStarted=Date.now();const sample=()=>setShared('fixture.pieces',[...(shared('fixture.pieces')??[]).slice(-512),{caseId:shared('fixture.case')?.caseId,ms:Date.now()-turnStarted}]);\n"+begin);
 source=source.replace(pause,"if (!piece.last) { sample(); await yieldTurn(); turnStarted=Date.now(); if (!current())");
 source=source.replace(end,"  const result=parts.join('');sample();return result;\n}\n\nconst json");
 fs.writeFileSync(decoder,source);
}
const settings=path.join(home,'mods/custom-settings');fs.renameSync(path.join(settings,'main.js'),path.join(settings,'settings-view.js'));
put('mods/custom-settings/main.js',`import Settings from './settings-view.js';import {shared,setShared} from './host.js';export default class FixtureSettings extends Settings{init(p,cx){super.init(p,cx);this.request=0;cx.timer.every(50,cx=>{const n=shared('fixture.flip');if(n&&n!==this.request&&this.flip){this.request=n;const on=!shared('custom.spaces.preferences')?.connectFleetToCoordinator,at=Date.now();this.flip({},cx);if(on)setShared('fixture.onStart',{caseId:shared('fixture.case')?.caseId,at,generation:shared('custom.fleet.generation')});setShared('fixture.ack',n);}});}toggle(t,id,on,fn){if(id==='st-spaces-fleet')this.flip=fn;return super.toggle(t,id,on,fn);}}`);
const dispose=temporaryMod(home,'custom-fleet-driver');put('mods/custom-fleet-driver/mod.json',{place:'none'});
put('mods/custom-fleet-driver/main.js',`import {View,div} from 'gpui-kit';import {shared,setShared,openOverlay,closeOverlay,checking,hc,run,terminals,spaces,focused} from 'herdr';
const cases=[{caseId:'10KiB',bytes:10240,count:40},{caseId:'400KiB',bytes:409600,count:237},{caseId:'1MiB',bytes:1048576,count:4096}];
export default class Driver extends View{init(p,cx){if(checking())return;this.started=Date.now();this.step=0;this.index=0;this.flips=0;this.results=[];
 cx.spawn(async cx=>{for(let i=0;i<8;i++)await hc(['run','--bg','--no-parent','--no-notify','--cwd',${JSON.stringify(root)},'--name','fixture-'+i,'--label','herdr.space='+(i===0?'coordinator':'fm-crew-home'),'--label','herdr.tab=fixture-tab-'+i,...(i===0?['--label','custom.crew.home=1']:['--label','crew.task=task'+i,'--label','crew.home=home']),'--',${JSON.stringify(process.execPath)},'-e','setInterval(()=>{},10000)']);this.prepared=true;});
 cx.timer.every(50,cx=>{if(this.opened||!this.prepared)return;const fleet=spaces().find(s=>s.id==='fm-crew-home'),worker=terminals().find(t=>t.labels?.['crew.task']==='task1');if(fleet?.tabs?.length!==7)return;if(focused()?.terminal!==worker?.address){run('space.select',{id:fleet.id});run('pane.focus',{terminal:worker.address});return;}this.opened=true;this.overlay=openOverlay({mod:'custom-settings',props:{section:'spaces'},width:1000,height:720});});
 cx.timer.every(50,cx=>{if(this.step===4)return;const now=Date.now(),attached=Boolean(shared('custom.fleet.display')?.entries?.null),ack=shared('fixture.ack');
 if(this.step===0&&this.opened&&attached){setShared('fixture.case',cases[this.index]);this.step=1;setShared('fixture.flip',++this.flips);}
 else if(this.step===1&&ack===this.flips&&!attached){this.step=2;this.at=now;setShared('fixture.flip',++this.flips);}
 else if(this.step===2&&ack===this.flips&&attached){const start=shared('fixture.onStart'),end=shared('fixture.attached');if(end?.caseId!==cases[this.index].caseId)return;this.results.push({...cases[this.index],milliseconds:end.at-start.at,generation:end.generation,started:start.at,attached:end.at});this.index++;if(this.index===cases.length){if(${preview}){setShared('fixture.case',{...cases[0],caseId:'preview',delay:3000});const owner=terminals().find(t=>t.labels?.['custom.crew.home']==='1');run('space.select',{id:'coordinator'});run('pane.focus',{terminal:owner.address});this.step=3;setShared('fixture.flip',++this.flips);}else{this.step=4;setShared('fixture.result',{done:true,results:this.results});}}else this.step=0;}
 else if(this.step===3&&ack===this.flips&&!attached){this.step=5;setShared('fixture.flip',++this.flips);}
 else if(this.step===5&&ack===this.flips&&!attached){closeOverlay(this.overlay);this.previewAt=now;this.step=6;}
 else if(this.step===6&&now-this.previewAt>=500&&!attached){this.step=4;setShared('fixture.result',{done:true,preview:true,results:this.results});}
 if(shared('fixture.transportError')||now-this.started>90000){this.step=4;setShared('fixture.result',{done:false,step:this.step,index:this.index,results:this.results,diagnostics:shared('custom.fleet.diagnostics')});}
 });}render(){return div().size_full().p(12).child('Real Windows PowerShell fleet transport benchmark; only CLI data is synthetic');}}
`);
for(const mod of fixtureMods)execFileSync(appBin,['check',path.join(home,'mods',mod)],{env,timeout:30000,stdio:'pipe'});
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
fs.writeFileSync(path.join(root,'session.json'),JSON.stringify({pid:child.pid,session:env.HC_SESSION,home,appBin}));console.log(`Disposable native PID ${child.pid}; evidence ${root}`);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
 let state;for(let i=0;i<600;i++){assert.equal(child.exitCode,null);await sleep(200);try{state=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'));}catch{continue;}if(state['fixture.result'])break;}
 const result={...state?.['fixture.result'],transports:state?.['fixture.transports'],pieces:state?.['fixture.pieces'],diagnostics:state?.['custom.fleet.diagnostics']};
 fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(result,null,2));assert.equal(result.done,true,'Full native transport must attach every fixture');
 const events=fs.readFileSync(path.join(home,'fixture/child-events.jsonl'),'utf8').trim().split('\n').map(JSON.parse);
 const table=result.results.map(row=>{const command=result.transports.find(t=>t.caseId===row.caseId&&t.generation===row.generation);assert.equal(command.hcCode,0);assert.equal(command.code,0);const input=events.find(e=>e.caseId===row.caseId);assert.equal(input.bytes,row.bytes);return {caseId:row.caseId,inputBytes:input.bytes,lines:input.lines,tasks:input.tasks,commandMs:command.milliseconds,nativeBytes:command.bytes,maxDecoderTurnMs:Math.max(...result.pieces.filter(p=>p.caseId===row.caseId).map(p=>p.ms)),attachedMs:row.milliseconds};});
 assert.ok(table[2].nativeBytes<table[2].inputBytes/2,'Real PowerShell projection must run before native decoding');
 assert.ok(table.every(r=>r.commandMs<25000&&r.maxDecoderTurnMs<500&&r.attachedMs<5000));
 const status=JSON.parse(execFileSync(appBin,['status'],{env,encoding:'utf8',timeout:15000}));assert.deepEqual(status.errors,[]);assert.equal(status.overlays.includes('custom-settings'),!preview);if(preview)assert.deepEqual(status.overlays,[],'No overlay may cover the loading-state screenshot');
 execFileSync(appBin,['shot',path.join(root,'result.png')],{env,timeout:15000});fs.writeFileSync(path.join(root,'table.json'),JSON.stringify(table,null,2));console.log(JSON.stringify({table,evidence:root},null,2));
}finally{
 try{execFileSync(appBin,['do','app.quit'],{env,timeout:10000});}catch{}await sleep(1000);if(child.exitCode===null)child.kill();
 assert.ok(env.HC_SESSION.startsWith('test-fleet-transport-'));try{execFileSync(coreBin,['server','stop'],{env,timeout:10000,stdio:'pipe'});}finally{try{dispose();}finally{fs.closeSync(log);}}
}
