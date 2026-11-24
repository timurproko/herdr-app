// Opt-in Windows native regression. Starts ONLY its own app/Core session and
// eight inert Node terminals in a disposable checkout home. No real Crew,
// GitHub, user preferences, agent input, installation or running app is used.
// Synthetic status transport exercises the REAL packaged Settings, Spaces,
// provider, native topology/scheduler and generation/lease logic.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {build} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
import {temporaryMod} from '../../tools/temporary-mod.mjs';
if(!process.argv.includes('--run') || process.platform!=='win32')throw Error('Explicit Windows opt-in required: --run [--app <binary>]');
const appAt=process.argv.indexOf('--app');
const appBin=appAt<0?(process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe')):path.resolve(process.argv[appAt+1]);
const coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
fs.mkdirSync('.artifacts',{recursive:true});
const root=fs.mkdtempSync(path.resolve('.artifacts/ft-')),home=path.join(root,'a');
if(Buffer.byteLength(path.join(home,'herdr-app.sock'))>=104)throw Error('Native control socket path is too long; use a shorter task checkout');
const env={...process.env,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-fleet-toggle-${Date.now()}`,HERDR_RELEASES_URL:'http://127.0.0.1:1',HERDR_APP_ID:'herdr-disposable-fleet-toggle'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});
const {output}=build();deploy(output,home,{repair:false});
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json',{core:coreBin,telemetry:false,zoom:1});
put('shared.json',{layout:'FleetFixture','frame.welcomed':'skipped','custom.plugins':{crew:{enabled:true},git:{enabled:false},files:{enabled:false},usage:{enabled:false}},'custom.spaces.preferences':{connectFleetToCoordinator:true},'space.colors':{coordinator:'#22aa44','fm-crew-home':'#cc8833'},'custom.space-colors':{coordinator:'#22aa44','fm-crew-home':'#cc8833'}});
put('layouts/FleetFixture.json',{id:'root',type:'row',titlebar:'system',children:[{id:'sidebar',type:'block',size:{px:300},content:{mod:'custom-spaces'}},{id:'body',type:'column',children:[{id:'driver',type:'block',size:{px:48},content:{mod:'custom-fleet-driver'}},{id:'main',type:'block',content:{tab:'active',pane:{gap:8,radius:8,background:'background'}}}]}]});
const history=path.join(root,'history.json');
fs.writeFileSync(history,JSON.stringify(Array.from({length:4089},(_,i)=>({id:`history-${i}`,state:'closed',terminal:null,pr:null}))));
for(const mod of ['custom-settings','custom-spaces']) {
 const dir=path.join(home,'mods',mod);fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
 fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';import * as native from './native-host.js';
export const run=(name)=>{throw Error('Fixture mod cannot mutate native state: '+name);};
export const exec=()=>{throw Error('No Git/unknown exec in fixture');};
export const setShared=(key,value)=>{const prior=native.shared(key);native.setShared(key,value);if(key==='custom.fleet.reads'){for(const read of Object.values(value??{}))if(read.phase==='processing'&&Object.values(prior??{}).every(old=>old.token!==read.token||old.phase!=='processing'))native.setShared('fixture.receipts',[...(native.shared('fixture.receipts')??[]),{token:read.token,at:Date.now(),generation:read.generation}]);}};
export async function hc(args){if(args[0]==='machine')return {code:0,stdout:'{"machines":[]}'};
 if(!args.at(-1).includes("status '--all' '--json' '--discover-prs'"))throw Error('Unexpected Core call');
 const live=native.terminals(),owner=live.find(t=>t.labels?.['custom.crew.home']==='1');
 const report={home:'fixture/.crew',owner:owner?{terminal:owner.address,live:owner.state==='live'}:null,tasks:live.filter(t=>t.labels?.['crew.task']).map(t=>({id:t.labels['crew.task'],terminal:t.address,state:'working',pr:null}))};
 const delay=native.shared('fixture.delay')??750,large=native.shared('fixture.large'),max=native.shared('fixture.maxTasks');
 native.setShared('fixture.reads',[...(native.shared('fixture.reads')??[]),{at:Date.now(),generation:native.shared('custom.fleet.generation')??0,reader:${JSON.stringify(mod)},delay,tasks:report.tasks.length,focused:native.focused()}]);
 const program='const r='+JSON.stringify(report)+';'+(large?'r.tasks.push(...JSON.parse(require("node:fs").readFileSync('+JSON.stringify(${JSON.stringify(history)})+',"utf8")).slice(0,'+(max?4089:227)+'));r.padding="";r.padding="x".repeat(1048576-Buffer.byteLength(JSON.stringify(r)));':'')+'setTimeout(()=>process.stdout.write(JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(r)).toString("base64"),stderr:""})),'+delay+')';
 return native.exec(${JSON.stringify(process.execPath)},['-e',program]);}
`);
 // Instrument ONLY the disposable copies. The deliberate uncatchable turn
 // interruption below proves that recovery cannot rely on catch/finally.
 const decoder=path.join(dir,'plugins/crew/plugin.js');let source=fs.readFileSync(decoder,'utf8');
 source=source.replace('function* base64Pieces(text) {',`function* base64Pieces(text) {if(shared('fixture.inject')&&!shared('fixture.injected')&&text?.length>100000&&shared('custom.fleet.generation')===2){setShared('fixture.injected',true);while(true){}}`);
 source=source.replace('    let count = carry;','    const pieceStarted=Date.now();let count = carry;');
 source=source.replace("    yield {text:parts.join(''),last};","    const decoded=parts.join('');setShared('fixture.pieces',[...(shared('fixture.pieces')??[]).slice(-512),{bytes:decoded.length,ms:Date.now()-pieceStarted}]);yield {text:decoded,last};");
 fs.writeFileSync(decoder,source);
 const parser=path.join(dir,'plugins/crew/fleet.js');let parse=fs.readFileSync(parser,'utf8');
 parse=parse.replace('export function recordedSource(stdout) {','export function recordedSource(stdout) {const parseStarted=Date.now();');
 parse=parse.replace('  return {home:value.home,owner:',"  setShared('fixture.parses',[...(shared('fixture.parses')??[]).slice(-64),{bytes:stdout.length,tasks:tasks.length,ms:Date.now()-parseStarted}]);\n  return {home:value.home,owner:");fs.writeFileSync(parser,parse);
}
const settings=path.join(home,'mods/custom-settings');fs.renameSync(path.join(settings,'main.js'),path.join(settings,'settings-view.js'));
fs.writeFileSync(path.join(settings,'main.js'),`import Settings from './settings-view.js';import {shared,setShared} from './host.js';export default class FixtureSettings extends Settings{init(p,cx){super.init(p,cx);this.request=0;cx.timer.every(50,cx=>{const n=shared('fixture.flip');if(n&&n!==this.request&&this.flip){this.request=n;this.flip({},cx);setShared('fixture.ack',n);}});}toggle(t,id,on,fn){if(id==='st-spaces-fleet')this.flip=fn;return super.toggle(t,id,on,fn);}}`);
const sidebar=path.join(home,'mods/custom-spaces');fs.renameSync(path.join(sidebar,'main.js'),path.join(sidebar,'spaces-view.js'));
fs.writeFileSync(path.join(sidebar,'main.js'),`import Spaces from './spaces-view.js';import {shared} from './host.js';import {pluginEvent} from './plugins.js';export default class FixtureSpaces extends Spaces{init(p,cx){super.init(p,cx);this.request=0;cx.timer.every(50,cx=>{const n=shared('fixture.preRead');if(n&&n!==this.request){this.request=n;pluginEvent('workspace.context.refresh',{cx,force:true});}});}}`);
const dispose=temporaryMod(home,'custom-fleet-driver');
put('mods/custom-fleet-driver/mod.json',{place:'none'});
put('mods/custom-fleet-driver/main.js',`import {View,div} from 'gpui-kit';import {shared,setShared,openOverlay,checking,hc,run,terminals,spaces,focused} from 'herdr';
export default class Driver extends View{init(p,cx){if(checking())return;this.started=Date.now();this.step=0;this.cycle=0;this.flips=0;this.results=[];
 cx.spawn(async cx=>{for(let i=0;i<8;i++)await hc(['run','--bg','--no-parent','--no-notify','--cwd',${JSON.stringify(root)},'--name','fixture-'+i,'--label','herdr.space='+(i===0?'coordinator':'fm-crew-home'),'--label','herdr.tab=fixture-tab-'+i,...(i===0?['--label','custom.crew.home=1']:['--label','crew.task=task'+i,'--label','crew.home=home']),'--',${JSON.stringify(process.execPath)},'-e','setInterval(()=>{},10000)']);this.prepared=true;});
 cx.timer.every(50,cx=>{if(this.opened||!this.prepared)return;const fleet=spaces().find(s=>s.id==='fm-crew-home'),worker=terminals().find(t=>t.labels?.['crew.task']==='task1');if(fleet?.tabs?.length!==7)return;if(focused()?.terminal!==worker?.address){run('space.select',{id:fleet.id});run('pane.focus',{terminal:worker.address});return;}this.opened=true;this.started=Date.now();setShared('fixture.initialFocus',focused());openOverlay({mod:'custom-settings',props:{section:'spaces'},width:1000,height:720});});
 cx.timer.every(50,cx=>{const now=Date.now(),attached=Boolean(shared('custom.fleet.display')?.entries?.null),ack=shared('fixture.ack'),generation=shared('custom.fleet.generation')??0;
 if(this.step===0&&this.opened&&attached&&now-this.started>2000){this.step=6;this.before=(shared('fixture.reads')??[]).length;setShared('fixture.large',true);setShared('fixture.inject',true);setShared('fixture.delay',3500);setShared('fixture.preRead',this.cycle+1);}
 else if(this.step===6&&(shared('fixture.reads')??[]).length>this.before&&shared('custom.fleet.reads')?.local){this.step=1;setShared('fixture.flip',++this.flips);}
 else if(this.step===1&&ack===this.flips&&!attached){this.results.push({phase:'off',cycle:this.cycle,at:now,generation});this.step=2;this.at=now;}
 else if(this.step===2&&now-this.at>=[0,1000,15000][Math.floor(this.cycle/3)]){this.at=now;this.step=3;setShared('fixture.delay',750);setShared('fixture.maxTasks',this.cycle>=3);setShared('fixture.flip',++this.flips);}
 else if(this.step===3&&ack===this.flips&&attached){this.results.push({phase:'on',cycle:this.cycle,elapsed:now-this.at,at:now,generation});this.cycle++;if(this.cycle===9){this.step=4;setShared('fixture.result',{done:true,results:this.results});}else{this.step=7;this.at=now;}}
 else if(this.step===7&&now-this.at>4000){this.step=6;this.before=(shared('fixture.reads')??[]).length;setShared('fixture.delay',3500);setShared('fixture.preRead',this.cycle+1);}
 if((this.step===0&&now-this.started>20000)||(this.step===3&&now-this.at>10000)){setShared('fixture.result',{done:false,step:this.step,cycle:this.cycle,results:this.results,diagnostics:shared('custom.fleet.diagnostics')});this.step=5;}
 });}render(){return div().size_full().p(12).child('Disposable native fleet diagnostic: 7 inert worker tabs, one-MiB replies, no real Crew');}}
`);
for(const mod of ['custom-settings','custom-spaces'])execFileSync(appBin,['check',path.join(home,'mods',mod)],{env,timeout:30000,stdio:'pipe'});
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
fs.writeFileSync(path.join(root,'session.json'),JSON.stringify({pid:child.pid,session:env.HC_SESSION,home,appBin}));
console.log(`Disposable native PID ${child.pid}; evidence ${root}`);
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
 let state;
 for(let i=0;i<900;i++){
  assert.equal(child.exitCode,null,'Own native app must remain alive');await sleep(200);
  try{state=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'));}catch{continue;}
  if(state['fixture.result'])break;
 }
 assert.ok(state?.['fixture.result'],'Native regression timed out');
 const result={...state['fixture.result'],focus:state['fixture.initialFocus'],reads:state['fixture.reads'],receipts:state['fixture.receipts'],pieces:state['fixture.pieces'],parses:state['fixture.parses'],diagnostics:state['custom.fleet.diagnostics']};
 fs.writeFileSync(path.join(root,'result.json'),JSON.stringify(result,null,2));
 execFileSync(appBin,['shot',path.join(root,'result.png')],{env,timeout:15000});
 const status=JSON.parse(execFileSync(appBin,['status'],{env,encoding:'utf8',timeout:15000}));assert.deepEqual(status.errors,[]);assert.ok(status.overlays.includes('custom-settings'));
 assert.equal(result.done,true);assert.equal(result.focus.space,'fm-crew-home');assert.equal(result.focus.terminal,'t2');
 const on=result.results.filter(r=>r.phase==='on');assert.equal(on.length,9);
 for(const row of on.slice(1))assert.ok(row.elapsed<2000,`Cycle ${row.cycle}: one verification reattaches in ${row.elapsed} ms`);
 const received=result.receipts.find(r=>r.generation===2),replacement=result.reads.find(r=>r.generation===2&&r.at>received.at);
 assert.ok(replacement.at-received.at>=2000&&replacement.at-received.at<=2500,'Interrupted response is replaced by the existing tick after two seconds, not the 45-second transport TTL');
 assert.ok(result.parses.some(r=>r.bytes===1048576&&r.tasks===4096));
 console.log(JSON.stringify({done:true,onMilliseconds:on.map(r=>r.elapsed),interruptedReplyRetryMs:replacement.at-received.at,maxPieceMs:Math.max(...result.pieces.map(r=>r.ms)),maxParseMs:Math.max(...result.parses.map(r=>r.ms)),evidence:root},null,2));
}finally{
 try{execFileSync(appBin,['do','app.quit'],{env,timeout:10000});}catch{}
 await sleep(1000);if(child.exitCode===null)child.kill();
 // Never address the person's default Core; only our generated isolated session.
 assert.ok(env.HC_SESSION.startsWith('test-fleet-toggle-'));
 try{execFileSync(coreBin,['server','stop'],{env,timeout:10000,stdio:'pipe'});}finally{try{dispose();}finally{fs.closeSync(log);}}
}
