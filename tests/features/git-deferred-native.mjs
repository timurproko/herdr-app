// Explicit disposable native proof. No production app, terminals, real Crew,
// GitHub, accounts or monitors are touched. Only the GitHub transport/context
// and cooldown clock are synthetic; the packaged aggregate, reader and UI run.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
import {deferredFleet} from '../fixtures/deferred-fleet.mjs';
if(!process.argv.includes('--run')||process.platform!=='win32')throw Error('Explicit Windows opt-in required: --run --output <outside-checkout-directory>');
const outputAt=process.argv.indexOf('--output');assert.ok(outputAt>=0);
const output=path.resolve(process.argv[outputAt+1]);assert.ok(path.relative(project,output).startsWith('..'),'Final proof must be outside the checkout');
fs.mkdirSync(output,{recursive:true});
const root=fs.mkdtempSync(path.join(output,'pd-')),home=path.join(root,'a'),control=path.join(root,'recover');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const appBin=process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
const env={...process.env,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-git-deferred-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-git-deferred',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});fs.writeFileSync(control,'');
const {output:built}=build();deploy(built,home,{repair:false});
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json',{core:coreBin,telemetry:false,zoom:1.3});
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).match(/\d+\.\d+\.\d+/)[0];
put('update-notes.json',{last_run:version,presented:[version]});
put('shared.json',{layout:'DeferredFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/DeferredFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'body',type:'block',content:{mod:'custom-proof-note'}},{id:'sidebar',type:'block',size:{px:390},content:{mod:'custom-changes'}}]});
put('mods/custom-proof-note/mod.json',{place:'none'});
put('mods/custom-proof-note/main.js',`import {View,div} from 'gpui-kit';export default class Note extends View{render(){return div().size_full().p(24).text_size(16).child('Disposable Git fixture · 130% zoom · simulated first-read refusal');}}`);
const dir=path.join(home,'mods/custom-changes'),fixture=deferredFleet();
put('mods/custom-changes/fixture.js',`export const context=${JSON.stringify({scope:'fixture',machine:null,links:fixture.status.tasks.map(t=>({url:t.pr,terminal:t.terminal,task:t.id,historical:t.state==='closed'}))})};
const rows=${JSON.stringify(fixture.rows)};let rejectFirst,offset=0,refused=false;export let wake=null;
export const now=()=>Date.now()+offset;
export const keepWake=(fn,cx)=>{wake={fn,cx};};
export function releaseRefusal(){rejectFirst?.({code:1,stderr:'You have exceeded a secondary rate limit'});}
export function recover(){offset+=900001;const saved=wake;wake=null;saved?.fn(saved.cx);}
export async function github(_cmd,args){if(args[0]!=='-e'||!args[1].includes('GH_REPO:repo'))throw Error('Fixture forbids real subprocesses');
 const repo=args[2],argv=JSON.parse(args[3]),query=argv.find(a=>a.startsWith('query='));if(!query)throw Error('Only synthetic GraphQL');
 if(repo==='timurproko/herdr-app'&&!refused){refused=true;return new Promise(resolve=>rejectFirst=resolve);}
 const numbers=[...query.matchAll(/pr(\\d+):pullRequest/g)].map(m=>Number(m[1]));
 return {code:0,stdout:JSON.stringify({data:{repository:Object.fromEntries(rows.filter(r=>r.url.toLowerCase().includes('/'+repo.toLowerCase()+'/')&&numbers.includes(r.number)).map(r=>['pr'+r.number,r]))}})};}
`);
fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
put('mods/custom-changes/host.js',`export * from './native-host.js';export {github as exec} from './fixture.js';export const hc=()=>{throw Error('Fixture forbids Core reads');};export const run=()=>{throw Error('Fixture forbids navigation');};`);
fs.renameSync(path.join(dir,'plugins.js'),path.join(dir,'native-plugins.js'));
put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';import {context} from './fixture.js';export const pluginPullContext=()=>context;export const pluginEvent=()=>{};`);
// Test-only clock injection; the production scheduler and 15-minute floor stay
// unchanged. Hold its real absolute-deadline wake until the proof driver advances.
put('mods/custom-changes/pulls.js',`import {now as fixtureNow} from './fixture.js';\n`+fs.readFileSync(path.join(dir,'pulls.js'),'utf8').replaceAll('Date.now()','fixtureNow()'));
fs.renameSync(path.join(dir,'main.js'),path.join(dir,'changes-view.js'));
put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {AggregatePulls} from './aggregate.js';import {theme,setShared,readTextFile} from './host.js';import {releaseRefusal,recover,keepWake,wake} from './fixture.js';
export default class Fixture extends Changes {
 init(_p,cx){this.resetRepository();this.foldedRepositories=new Set();this.view='open';this.context='tasks:fixture';this.enrollmentFocus=cx.focus_handle();this.enableReadDiagnostics();
 this.notices={sync(){},presentation(){}};this.syncChecksFallback=()=>{};
 const wrap=view=>({notify:()=>view.notify(),spawn:fn=>view.spawn(next=>fn(wrap(next))),timer:{after:(ms,fn)=>ms>=600000?keepWake(fn,wrap(view)):view.timer.after(ms,next=>fn(wrap(next)))}});
 this.aggregate=new AggregatePulls({shown:()=>true,onUpdate:view=>view.notify()});this.aggregate.target=()=>null;this.aggregate.sync(wrap(cx));
 cx.timer.after(600,()=>releaseRefusal());
 cx.timer.every(250,cx=>{cx.spawn(async view=>{if(!this.recovered&&wake){const signal=await readTextFile(${JSON.stringify(control)});if(signal){this.recovered=true;recover();}}
 setShared('fixture.snapshot',{phase:this.recovered&&!this.aggregate.waiting?'recovered':this.aggregate.readWake?'loading':'starting',counts:this.aggregate.counts(),rows:this.aggregate.rows('open').map(pr=>pr.key),retryAt:this.aggregate.readWake?.due??null});});});}
 shown(){return true;}
 render(cx){const start=Date.now(),tree=this.renderAggregate(cx,theme());console.error('DEFERRED_RENDER_MS '+(Date.now()-start));return tree;}
}
`);
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:15000});
const result={home,session:env.HC_SESSION,pid:child.pid,zoom:1.3,synthetic:true};
const wait=async phase=>{for(let i=0;i<120;i++){await sleep(250);assert.equal(child.exitCode,null);try{const state=JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'));if(state['fixture.snapshot']?.phase===phase)return state;}catch{}}throw Error(`Timed out waiting for ${phase}`);};
try {
 const loading=await wait('loading');await sleep(600);result.loading=loading['fixture.snapshot'];assert.deepEqual(result.loading.counts,{open:null,closed:null});assert.equal(result.loading.rows.length,2);
 app(['shot',path.join(output,'loading-130.png')]);
 fs.writeFileSync(control,'recover');const recovered=await wait('recovered');await sleep(600);result.recovered=recovered['fixture.snapshot'];assert.deepEqual(result.recovered.counts,{open:4,closed:5});assert.equal(result.recovered.rows.length,4);
 app(['shot',path.join(output,'recovered-130.png')]);result.diagnostics=recovered['custom.git.read-diagnostics'];
 result.status=JSON.parse(app(['status']));assert.equal(result.status.zoom,1.3);assert.deepEqual(result.status.errors,[]);
} finally {
 try{app(['do','app.quit']);}catch{}
 await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}result.stopped=child.exitCode!==null||child.signalCode!==null;
 assert.ok(env.HC_SESSION.startsWith('test-git-deferred-'));
 try{execFileSync(coreBin,['server','stop'],{env,timeout:10000,stdio:'pipe'});}catch{}
 fs.closeSync(log);result.renderBuildMilliseconds=[...fs.readFileSync(path.join(root,'app.log'),'utf8').matchAll(/DEFERRED_RENDER_MS (\d+)/g)].map(m=>Number(m[1]));
 fs.writeFileSync(path.join(output,'native-proof.json'),JSON.stringify(result,null,2));assert.equal(result.stopped,true,'Disposable process must be stopped before reporting');
}
console.log(JSON.stringify(result,null,2));
