// Opt-in real-home read-only transport / captured-real-output replay.
// All app state, fault injection, identity translation and inert terminals are disposable.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {build} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
import {temporaryMod} from '../../tools/temporary-mod.mjs';
if(!process.argv.includes('--run')||process.platform!=='win32')throw Error('Explicit Windows opt-in: --run --real-home <Crew home> [--replay <captured JSON>]');
const arg=name=>{const i=process.argv.indexOf(name);return i<0?null:process.argv[i+1];};
const realHome=arg('--real-home');assert.ok(realHome,'Real home must be explicit, even with replay');
const replay=arg('--replay'),baseline=process.argv.includes('--baseline'),loseSettings=process.argv.includes('--lose-settings'),enrich=process.argv.includes('--discovery'),reloadOwner=process.argv.includes('--reload-owner'),delay=Number(arg('--delay')??0),faults=process.argv.includes('--fail-and-gone');
const appBin=arg('--app')??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
fs.mkdirSync('.artifacts',{recursive:true});
const root=fs.mkdtempSync(path.resolve('.artifacts/fr-')),home=path.join(root,'a');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const env={...process.env,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-fleet-real-${Date.now()}`,HERDR_RELEASES_URL:'http://127.0.0.1:1',HERDR_APP_ID:'herdr-disposable-fleet-real'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});
const {output}=build();deploy(output,home,{repair:false});
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json',{core:coreBin,telemetry:false,zoom:1});
const version=execFileSync(appBin,['--version'],{encoding:'utf8',timeout:10000}).match(/\d+\.\d+\.\d+/)?.[0];assert.ok(version);
put('update-notes.json',{last_run:version,presented:[version]});
put('shared.json',{layout:'FleetFixture','frame.welcomed':'skipped','custom.plugins':{crew:{enabled:true},git:{enabled:enrich},files:{enabled:false},usage:{enabled:false}},'custom.spaces.preferences':{connectFleetToCoordinator:false},'space.colors':{coordinator:'#22aa44','fm-crew-home':'#cc8833'}});
put('layouts/FleetFixture.json',{id:'root',theme:'Custom',type:'row',titlebar:'system',children:[{id:'sidebar',type:'block',size:{px:300},content:{mod:'custom-spaces'}},{id:'body',type:'column',children:[{id:'driver',type:'block',size:{px:48},content:{mod:'custom-fleet-driver'}},...(enrich?[{id:'consumer',type:'block',size:{px:48},content:{mod:'custom-changes'}}]:[]),{id:'main',type:'block',content:{tab:'active',pane:{gap:8,radius:8,background:'background'}}}]}]});
put('fixture/placeholder','');
if(replay){put('fixture/status.json',fs.readFileSync(path.resolve(replay),'utf8'));put('.crew/core/crew.mjs',`import fs from 'node:fs';if(process.argv.includes('--help'))console.log('crew status [--all] [--json] [--discover-prs]');else process.stdout.write(fs.readFileSync(${JSON.stringify(path.join(home,'fixture/status.json'))},'utf8'));`);}
const quote=s=>"'"+s.replaceAll("'","''")+"'";
const realPrelude=`$env:USERPROFILE = ${quote(process.env.USERPROFILE)}; $env:CREW_HOME = ${quote(realHome)}; $env:HC_SESSION = 'default';\n`+['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE'].map(k=>`Remove-Item Env:${k} -ErrorAction SilentlyContinue`).join('; ')+'\n';
for(const mod of ['custom-settings','custom-spaces',...(enrich?['custom-changes']:[])]) {
 const dir=path.join(home,'mods',mod);fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
 // Native calls and the exact production decoder/provider remain in use. Only
 // terminal IDs in the decoded source are translated into disposable topology.
 put(`mods/${mod}/host.js`,`export * from './native-host.js';import * as native from './native-host.js';
const trace=(event,facts={})=>native.setShared('fixture.trace',[...(native.shared('fixture.trace')??[]).slice(-160),{at:Date.now(),mod:${JSON.stringify(mod)},event,...facts}]);
export const run=name=>{throw Error('Fixture mods cannot mutate native state: '+name);};
export const setShared=(key,value)=>{native.setShared(key,value);if(key==='custom.fleet.reads')trace('lease',{reads:value});if(key==='custom.fleet.display'&&value?.entries?.null){trace('attached');native.setShared('fixture.attached',{at:Date.now(),generation:native.shared('custom.fleet.generation')});}};
export async function hc(args){if(args[0]==='machine')return native.hc(args);if(args[0]!=='exec')throw Error('Only read-only exec is allowed');
 const fault=native.shared('fixture.fault');if(fault==='failure'){trace('injected-failure');throw Error('Disposable verification transport failure');}
 const live=native.terminals(),owner=live.find(t=>t.labels?.['custom.crew.home']==='1'),workers=live.filter(t=>t.labels?.['crew.task']).map(t=>({id:t.labels['crew.task'],terminal:t.address}));
 let body=args.at(-1);body=body.replace("$help = InvokeCrew '--help'",'Add-Content -LiteralPath '+${JSON.stringify(quote(path.join(home,'fixture/probes.log')))}+' -Value ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds()); $help = InvokeCrew \\'--help\\'');body=body.replace('$code = $result.code; $raw = $result.stdout','$code = $result.code; $raw = $result.stdout; Add-Content -LiteralPath '+${JSON.stringify(quote(path.join(home,'fixture/command-end.log')))}+' -Value ([DateTimeOffset]::UtcNow.ToUnixTimeMilliseconds())');const marker='  $r = ConvertFrom-Json -InputObject ($raw -join "\x60n") -ErrorAction Stop';
 if(!body.includes(marker))throw Error('Production projection marker missing');
 const mapping=JSON.stringify({owner:owner?.address,workers});
 body=body.replace(marker,marker+'\\n  $fixture = ConvertFrom-Json -InputObject '+${JSON.stringify(quote('MAPPING'))}.replace('MAPPING',mapping.replaceAll("'","''"))+'; $r.owner.terminal = $fixture.owner; $i = 0; foreach ($t in $r.tasks) { if ($t.state -eq "working" -or $t.state -eq "reported") { if ($i -ge $fixture.workers.Count) { throw "Too many real live tasks for disposable topology" }; $t.id = $fixture.workers[$i].id; $t.terminal = $fixture.workers[$i].terminal; $i++ } else { $t.terminal = $null } }');
 if(fault==='gone')body=body.replace('  $owner = $null','  $r.owner = $null; $owner = $null');
 const prefix=${JSON.stringify(replay?`$env:USERPROFILE = ${quote(home)};\n`:realPrelude)};
 const command=[...args];command[command.length-1]=prefix+${JSON.stringify(delay?`Start-Sleep -Milliseconds ${delay};\n`:'')}+body;
 const started=Date.now();trace('hc-start',{generation:native.shared('custom.fleet.generation')});
 const result=await native.hc(command);trace('hc-received',{ms:Date.now()-started,bytes:result.stdout?.length,code:result.code});
 native.setShared('fixture.transports',[...(native.shared('fixture.transports')??[]),{started,ended:Date.now(),ms:Date.now()-started,mod:${JSON.stringify(mod)}}]);return result;}
`);
 const decoder=path.join(dir,'plugins/crew/plugin.js');let source=fs.readFileSync(decoder,'utf8');
 if(baseline){source=execFileSync('git',['show','a46574d:src/plugins/crew/plugin.js'],{encoding:'utf8'});fs.writeFileSync(path.join(dir,'plugins/crew/fleet.js'),execFileSync('git',['show','a46574d:src/plugins/crew/fleet.js'],{encoding:'utf8'}));}
 const begin="  const parts = [];\n  if (!current()) throw fleetError('obsolete-generation');",pause='if (!piece.last) { await yieldTurn(); if (!current())',end="  return parts.join('');\n}\n\nconst json";
 assert.ok([begin,pause,end].every(t=>source.includes(t)));
 source=source.replace(begin,"  let turnStarted=Date.now();const sample=()=>setShared('fixture.pieces',[...(shared('fixture.pieces')??[]).slice(-128),{ms:Date.now()-turnStarted}]);\n"+begin).replace(pause,"if (!piece.last) { sample(); await yieldTurn(); turnStarted=Date.now(); if (!current())").replace(end,"  const result=parts.join('');sample();return result;\n}\n\nconst json");
 fs.writeFileSync(decoder,source);
}
const sidebar=path.join(home,'mods/custom-spaces');fs.renameSync(path.join(sidebar,'main.js'),path.join(sidebar,'spaces-view.js'));
put('mods/custom-spaces/main.js',`export * from './spaces-view.js';import Spaces from './spaces-view.js';import {shared,setShared} from './host.js';import {pluginPullContext} from './plugins.js';export default class FixtureSpaces extends Spaces{init(p,cx){this.paints=[];super.init(p,cx);cx.timer.every(50,()=>{if(this.paints.length)setShared('fixture.paints',this.paints);});}render(cx){const tree=super.render(cx),generation=shared('custom.fleet.generation'),attached=this.ordered().some(r=>r.linked);if(this.paints.at(-1)?.generation!==generation||this.paints.at(-1)?.attached!==attached)this.paints.push({at:Date.now(),generation,attached});return tree;}}`);
if(enrich)put('mods/custom-changes/main.js',`import {View,div} from 'gpui-kit';import {pluginEvent,pluginPullContext} from './plugins.js';export default class Consumer extends View{init(p,cx){cx.timer.every(250,cx=>{pluginEvent('workspace.context.refresh',{cx});cx.notify();});}render(){const c=pluginPullContext('coordinator');return div().child(c?'Verified recorded inventory context available':'Loading');}}`);
const settings=path.join(home,'mods/custom-settings');fs.renameSync(path.join(settings,'main.js'),path.join(settings,'settings-view.js'));
put('mods/custom-settings/main.js',`import Settings from './settings-view.js';import {shared,setShared} from './host.js';export default class FixtureSettings extends Settings{init(p,cx){super.init(p,cx);this.request=0;cx.timer.every(50,cx=>{const n=shared('fixture.flip');if(n&&n!==this.request&&this.flip){this.request=n;const on=!shared('custom.spaces.preferences')?.connectFleetToCoordinator;const at=Date.now();this.flip({},cx);if(on)setShared('fixture.onStart',{at});setShared('fixture.ack',n);}});}toggle(t,id,on,fn){if(id==='st-spaces-fleet')this.flip=fn;return super.toggle(t,id,on,fn);}}`);
const dispose=temporaryMod(home,'custom-fleet-driver');put('mods/custom-fleet-driver/mod.json',{place:'none'});
put('mods/custom-fleet-driver/main.js',`import {View,div} from 'gpui-kit';import {shared,setShared,openOverlay,closeOverlay,checking,hc,run,terminals,spaces,focused} from 'herdr';
export default class Driver extends View{init(p,cx){if(checking())return;this.started=Date.now();this.step=0;this.flips=0;this.results=[];this.fault=fault=>{this.faultAt=Date.now();setShared('fixture.fault',fault);setShared('custom.fleet.request',{id:'fixture-'+this.faultAt,generation:shared('custom.fleet.generation'),at:this.faultAt,force:true,inventory:false});};
 cx.spawn(async cx=>{for(let i=0;i<13;i++)await hc(['run','--bg','--no-parent','--no-notify','--cwd',${JSON.stringify(root)},'--name','fixture-'+i,'--label','herdr.space='+(i===0?'coordinator':'fm-crew-home'),'--label','herdr.tab=fixture-tab-'+i,...(i===0?['--label','custom.crew.home=1']:['--label','crew.task=task'+i,'--label','crew.home=home']),'--',${JSON.stringify(process.execPath)},'-e','setInterval(()=>{},10000)']);this.prepared=true;});
 cx.timer.every(50,cx=>{const now=Date.now();if(this.done){if(this.finishAt&&now-this.finishAt>1000&&!this.closed){this.closed=true;closeOverlay(this.overlay);}return;}
 if(this.step===0&&this.prepared){const fleet=spaces().find(s=>s.id==='fm-crew-home'),worker=terminals().find(t=>t.labels?.['crew.task']==='task1');if(fleet?.tabs?.length!==12)return;if(focused()?.terminal!==worker?.address){run('space.select',{id:fleet.id});run('pane.focus',{terminal:worker.address});return;}this.overlay=openOverlay({mod:'custom-settings',props:{section:'spaces'},width:1000,height:720});this.step=1;setShared('fixture.flip',++this.flips);}
 if(${loseSettings}&&this.step===1&&!this.lost&&shared('fixture.onStart')&&now-shared('fixture.onStart').at>=300){this.lost=now;closeOverlay(this.overlay);setShared('fixture.lostAt',now);}
 if(this.step===1&&shared('fixture.ack')===this.flips&&shared('custom.fleet.links')?.entries?.local?.at>=shared('fixture.onStart')?.at&&shared('custom.fleet.display')?.entries?.null){const start=shared('fixture.onStart'),paint=shared('fixture.paints')?.find(p=>p.generation===shared('custom.fleet.generation')&&p.attached&&p.at>=start.at);if(!paint)return;const entry=shared('custom.fleet.links').entries.local;if(${enrich}&&(!(entry.discoveryAttemptAt>=start.at)||shared('custom.fleet.reads')?.local))return;this.results.push({onToVerifiedMs:entry.at-start.at,onToAttachedMs:paint.at-start.at,discoveryAfterMs:${enrich}?entry.discoveryAttemptAt-start.at:null});if(this.results.length===2||${loseSettings}){if(${faults}){this.step=3;this.fault('failure');}else{this.done=true;this.finishAt=now;setShared('fixture.result',{done:true,results:this.results});}}else{this.step=2;setShared('fixture.flip',++this.flips);}}
 else if(this.step===2&&shared('fixture.ack')===this.flips&&!shared('custom.spaces.preferences')?.connectFleetToCoordinator){this.step=1;setShared('fixture.flip',++this.flips);}
 if(this.step===3&&shared('custom.fleet.diagnostics')?.entries?.local?.lastFailure?.at>=this.faultAt&&!shared('custom.fleet.reads')?.local){this.failureRetained=Boolean(shared('custom.fleet.display')?.entries?.null);this.step=4;this.fault('gone');}
 if(this.step===4&&shared('custom.fleet.links')?.entries?.local?.at>=this.faultAt&&!shared('custom.fleet.links')?.entries?.local?.status?.owner?.live&&!shared('custom.fleet.reads')?.local){this.done=true;this.finishAt=now;setShared('fixture.result',{done:this.failureRetained&&!shared('custom.fleet.display')?.entries?.null,results:this.results,failureRetained:this.failureRetained,goneDetached:!shared('custom.fleet.display')?.entries?.null});}
 if(now-this.started>70000){this.done=true;setShared('fixture.result',{done:false,step:this.step,results:this.results,reads:shared('custom.fleet.reads'),diagnostics:shared('custom.fleet.diagnostics')});}
 });}render(){return div().size_full().p(12).child('Read-only real Crew transport in an isolated native app');}}
`);
for(const mod of ['custom-settings','custom-spaces',...(enrich?['custom-changes']:[])])execFileSync(appBin,['check',path.join(home,'mods',mod)],{env,timeout:30000,stdio:'pipe'});
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
fs.writeFileSync(path.join(root,'session.json'),JSON.stringify({pid:child.pid,session:env.HC_SESSION,home,appBin}));console.log(`Disposable native PID ${child.pid}; evidence ${root}`);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
 let state,reloaded=false;for(let i=0;i<450;i++){assert.equal(child.exitCode,null);await sleep(200);try{state=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'));}catch{continue;}if(reloadOwner&&!reloaded&&state['fixture.trace']?.some(e=>e.event==='hc-start')&&Date.now()-state['fixture.onStart']?.at>=300){reloaded=true;fs.appendFileSync(path.join(sidebar,'main.js'),'\n// replace only the disposable lifecycle owner\n');}if(state['fixture.result'])break;}
 const result={...state?.['fixture.result'],transports:state?.['fixture.transports'],pieces:state?.['fixture.pieces'],trace:state?.['fixture.trace'],paints:state?.['fixture.paints'],version,capabilityProbes:fs.existsSync(path.join(home,'fixture/probes.log'))?fs.readFileSync(path.join(home,'fixture/probes.log'),'utf8').trim().split(/\r?\n/).map(Number):[],commandEnds:fs.existsSync(path.join(home,'fixture/command-end.log'))?fs.readFileSync(path.join(home,'fixture/command-end.log'),'utf8').trim().split(/\r?\n/).map(Number):[]};
 fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(result,null,2));
 const status=JSON.parse(execFileSync(appBin,['status'],{env,encoding:'utf8',timeout:15000}));fs.writeFileSync(path.join(root,'status.json'),JSON.stringify(status,null,2));
 execFileSync(appBin,['shot',path.join(root,'result.png')],{env,timeout:15000});await sleep(1500);execFileSync(appBin,['shot',path.join(root,'attached.png')],{env,timeout:15000});
 console.log(JSON.stringify({done:result.done,results:result.results,transports:result.transports,capabilityProbes:result.capabilityProbes.length,failureRetained:result.failureRetained,goneDetached:result.goneDetached,errors:status.errors,evidence:root},null,2));assert.equal(result.done,true);assert.deepEqual(status.errors,[]);if(!baseline&&!reloadOwner)assert.equal(result.capabilityProbes.length,1,'One help probe across verification, discovery and toggles');
}finally{
 try{execFileSync(appBin,['do','app.quit'],{env,timeout:10000});}catch{}await sleep(1000);if(child.exitCode===null)child.kill();
 assert.ok(env.HC_SESSION.startsWith('test-fleet-real-'));try{execFileSync(coreBin,['server','stop'],{env,timeout:10000,stdio:'pipe'});}finally{try{dispose();}finally{fs.closeSync(log);}}
}
