// Opt-in production Settings/Spaces/Git proof with synthetic membership and IO.
// No real terminals, Crew, GitHub, installed preferences or app are touched.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.argv.includes('--run')&&process.platform==='win32','Explicit Windows --run required');
const arg=(name,fallback)=>{const i=process.argv.indexOf(name);return i<0?fallback:process.argv[i+1];};
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1'));
const reportedEnded=process.argv.includes('--reported-ended'),baseline=arg('--baseline',null);
assert.ok(path.relative(project,output).startsWith('..'));assert.ok([1,1.3].includes(zoom));
const appBin=path.resolve(process.env.HERDR_APP_BIN),binRoot=path.resolve(path.dirname(appBin),'..');
const digest=bytes=>createHash('sha256').update(bytes).digest('hex');
const archive=path.join(binRoot,'app.tar.gz'),expected='e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1';
assert.equal(digest(fs.readFileSync(archive)),expected,'Pinned published Windows 0.1.18 archive');
const archivedExe=execFileSync(path.join(process.env.SystemRoot,'System32/tar.exe'),['-xOf',archive,'herdr-app/herdr-app.exe'],{maxBuffer:100*1024*1024});
assert.equal(digest(fs.readFileSync(appBin)),digest(archivedExe),'Executable must equal verified release archive');
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
const coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,'fc-')),home=path.join(root,'a'),control=path.join(root,'control');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const env={...process.env,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-combined-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-combined',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[key];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});fs.writeFileSync(control,'{}');
const {output:built}=build();deploy(built,home,{repair:false});
if(baseline)for(const mod of ['custom-settings','custom-spaces','custom-changes'])fs.writeFileSync(path.join(home,'mods',mod,'plugins/crew/fleet.js'),execFileSync('git',['show',`${baseline}:src/plugins/crew/fleet.js`],{encoding:'utf8'}));
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json',{core:coreBin,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'CombinedFixture','frame.welcomed':'skipped','custom.plugins':{crew:{enabled:true},git:{enabled:true},files:{enabled:false},usage:{enabled:false}},'custom.spaces.preferences':{connectFleetToCoordinator:false},'fixture.selected':'coordinator','space.colors':{coordinator:'#22aa44','fm-crew-home':'#cc8833','pc2/coordinator':'#11aaaa','pc2/fm-crew-home':'#9955cc'}});
put('layouts/CombinedFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'sidebar',type:'block',size:{px:270},content:{mod:'custom-spaces'}},{id:'body',type:'block',content:{mod:'custom-settings'}},{id:'git',type:'block',size:{px:420},content:{mod:'custom-changes'}}]});
const fixture=`import * as native from './native-host.js';
const machines=[null,'pc2'];const q=(id,m)=>m?m+'/'+id:id;
export const groups=()=>machines.flatMap(m=>[{id:q('coordinator',m),name:'coordinator',named:true,machine:m,active:native.shared('fixture.selected')===q('coordinator',m),tabs:[{id:q('c',m),active:true}]},{id:q('fm-crew-home',m),name:native.shared('fixture.title')??'crew',named:true,machine:m,tabs:[{id:q('a',m)},{id:q('b',m)}]}]);
export const members=()=>machines.flatMap(m=>['c','a','b'].map((tab,i)=>({tab:q(tab,m),pane:q(tab+'p',m),terminal:q('t'+(i+1),m)}))).filter(p=>!${reportedEnded}||!p.terminal.endsWith('t2'));
export const live=()=>machines.flatMap(m=>[{address:q('t1',m),state:'live',labels:{'custom.crew.home':'1'}},...[2,3].map((n,i)=>({address:q('t'+n,m),state:${reportedEnded}&&n===2?'finished':'live',labels:{'crew.home':'home','crew.task':'task'+n,'herdr.space':'fm-crew-home',...(i?{'crew.space.version':'1','crew.space.mode':'combined','crew.space.project':'herdr-app'}:{})}}))]);
export const location=()=>{const space=native.shared('fixture.selected')??'coordinator';return {space,on:space.startsWith('pc2/')?'pc2':null,cwd:'C:/fixture/.crew',terminal:space.startsWith('pc2/')?'pc2/t1':'t1'};};
export const report=m=>({home:(m??'local')+'/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'task2',terminal:'t2',state:'reported',pr:'https://github.com/fixture/crew/pull/1'},{id:'task3',terminal:'t3',state:'working',pr:'https://github.com/fixture/herdr-app/pull/2'},{id:'finished',terminal:null,state:'closed',pr:'https://github.com/fixture/xrbuild/pull/3'}]});
export async function github(cmd,args){if(cmd==='git')return {code:128,stdout:'',stderr:'fatal: not a git repository'};if(cmd!=='node'||!args[1]?.includes('GH_REPO:repo'))throw Error('No real subprocess allowed');const repo=args[2],query=JSON.parse(args[3]).find(a=>a.startsWith('query='));if(!query)throw Error('Only synthetic GraphQL');const numbers=[...query.matchAll(/pr(\\d+):pullRequest/g)].map(m=>Number(m[1]));return {code:0,stdout:JSON.stringify({data:{repository:Object.fromEntries(numbers.map(number=>['pr'+number,{number,title:['','Recorded task PR','Mixed-generation combined fleet','Finished task still open'][number],url:'https://github.com/'+repo+'/pull/'+number,state:'OPEN',author:{login:'fixture'},createdAt:new Date(Date.now()-3600000).toISOString(),body:'',labels:${reportedEnded}?[{name:['','🤖 Rework','🤖 Review','🤖 Approved'][number],color:'840479'}]:[],statusCheckRollup:[]}]))}})};}
`;
for(const mod of ['custom-settings','custom-spaces','custom-changes']) {
 const dir=path.join(home,'mods',mod);fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
 put(`mods/${mod}/fixture.js`,fixture);
 put(`mods/${mod}/host.js`,`export * from './native-host.js';import * as native from './native-host.js';import {groups,members,live,github,report} from './fixture.js';export const spaces=groups,panes=members,terminals=live,exec=github;
export const machines=()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}];export const props=()=>({});export const layout=()=>({id:'sidebar',size:{px:270}});export const focused=()=>({space:native.shared('fixture.selected')??'coordinator'});
export const run=()=>{throw Error('No native model mutation');};export const watchFolder=()=>{throw Error('No watcher');};
export async function hc(args){if(args[0]==='machine')return {code:0,stdout:JSON.stringify({machines:[{name:'pc2',state:'connected'}]})};if(!args.at(-1).includes("status '--all' '--json'"))throw Error('Only synthetic fleet transport');const machine=args.includes('--on')?args[args.indexOf('--on')+1]:null;const key='fixture.reads',before=native.shared(key)??[];native.setShared(key,[...before,{machine,at:Date.now(),generation:native.shared('custom.fleet.generation')}]);
const program='setTimeout(()=>process.stdout.write(JSON.stringify({code:0,stdout:Buffer.from('+JSON.stringify(JSON.stringify(report(machine)))+').toString("base64"),stderr:""})), '+(native.shared('fixture.delay')??0)+')';return native.exec(${JSON.stringify(process.execPath)},['-e',program]);}
`);
}
// Use the actual Settings row/toggle implementations and actual Spaces page callback.
fs.renameSync(path.join(home,'mods/custom-settings/main.js'),path.join(home,'mods/custom-settings/settings-view.js'));
put('mods/custom-settings/main.js',`import Settings from './settings-view.js';import {spacesPage} from './spaces-ui.js';import {v_flex} from 'gpui-base';import {div} from 'gpui-kit';import {theme,readTextFile,shared,setShared} from './host.js';
export default class Fixture extends Settings{init(_p,cx){this.action=0;cx.timer.every(100,cx=>cx.spawn(async view=>{const c=JSON.parse(await readTextFile(${JSON.stringify(control)}));if(!c.id||c.id===this.action)return;this.action=c.id;if(c.selected)setShared('fixture.selected',c.selected);if(c.title)setShared('fixture.title',c.title);if(c.delay!==undefined)setShared('fixture.delay',c.delay);if(c.flip){const at=Date.now();this.flip({},view);setShared('fixture.flips',[...(shared('fixture.flips')??[]),{at,generation:shared('custom.fleet.generation'),enabled:shared('custom.spaces.preferences').connectFleetToCoordinator}]);}setShared('fixture.ack',c.id);view.notify();}));}
toggle(t,id,on,fn){if(id==='st-spaces-fleet')this.flip=fn;return super.toggle(t,id,on,fn);}
render(){const t=theme();return v_flex().size_full().bg(t.background).text_color(t.foreground).p(24).gap(24).child(div().text_size(16).child('Disposable Settings · synthetic local and pc2 fleets')).child(spacesPage(this,t)).child(div().text_size(12).text_color(t.muted).child('Both fleets contain legacy and v1-combined workers. Fleet status omits task projects. No real sessions or GitHub reads.'));}}
`);
fs.renameSync(path.join(home,'mods/custom-changes/location.js'),path.join(home,'mods/custom-changes/native-location.js'));
put('mods/custom-changes/location.js',`export * from './native-location.js';export {location} from './fixture.js';`);
fs.renameSync(path.join(home,'mods/custom-changes/main.js'),path.join(home,'mods/custom-changes/changes-view.js'));
put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {shared,setShared} from './host.js';import {pluginPullContext} from './plugins.js';import {location} from './fixture.js';
export default class Fixture extends Changes{init(_p,cx){this.resetRepository();this.foldedRepositories=new Set();this.view='open';this.enrollmentFocus=cx.focus_handle();this.notices={sync(){},presentation(){}};cx.timer.every(100,cx=>{this.refresh(cx);const c=pluginPullContext(location().space,{presentation:true});const snap={selected:location().space,stale:c?.stale??null,links:c?.links?.length??null,counts:this.aggregate?.counts()??null,rows:this.aggregate?.rows('open').length??0,error:c?null:this.error??null};if(JSON.stringify(shared('fixture.git'))!==JSON.stringify(snap))setShared('fixture.git',snap);});}
shown(){return true;}syncTaskWebhooks(){}syncWebhooks(){}syncChecksFallback(){}}
`);
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000});
const result={version,zoom,reportedEnded,baseline,home,pid:child.pid,session:env.HC_SESSION,archiveSha256:expected,executableSha256:digest(fs.readFileSync(appBin)),synthetic:true,interaction:'Production Settings callback driven by disposable controller; not native pointer/SSH proof',frames:[]};
const state=()=>JSON.parse(fs.readFileSync(path.join(home,'shared.json'),'utf8'));
const wait=async predicate=>{for(let i=0;i<160;i++){await sleep(100);assert.equal(child.exitCode,null);try{const s=state();if(predicate(s))return s;}catch{}}throw Error('Fixture state timed out');};
let id=0;
const command=async c=>{const next=++id;fs.writeFileSync(control,JSON.stringify({...c,id:next}));await wait(s=>s['fixture.ack']===next);};
const capture=async name=>{await sleep(150);const file=path.join(root,name+'.png');app(['shot',file]);result.frames.push({name,file,git:state()['fixture.git']});};
try {
 await wait(s=>s['fixture.git']?.error==='Not a git repository');await capture('off-local');
 if(reportedEnded) {
  await command({flip:true,delay:0});
  const settled=s=>baseline?s['custom.fleet.diagnostics']?.entries.local?.lastFailure?.reason==='membership-incomplete'&&s['fixture.git']?.stale===true:s['fixture.git']?.counts?.open===3&&s['fixture.git']?.stale===false;
  await wait(settled);await capture(baseline?'before-reported-ended-local':'after-reported-ended-local');
  await command({selected:'pc2/coordinator'});
  await wait(s=>s['fixture.git']?.selected==='pc2/coordinator'&&(baseline?s['fixture.git']?.stale===true:s['fixture.git']?.counts?.open===3&&s['fixture.git']?.stale===false));
  await capture(baseline?'before-reported-ended-remote':'after-reported-ended-remote');
 } else {
 await command({flip:true,delay:3500});
 await wait(s=>s['fixture.git']?.stale===true&&(s['fixture.reads']??[]).length>=2);await capture('on-pending-local');
 await wait(s=>s['fixture.git']?.counts?.open===3&&s['fixture.git']?.stale===false);await capture('on-verified-local');
 assert.equal(Object.keys(state()['custom.fleet.display'].entries).length,2);
 await command({selected:'pc2/coordinator',title:'xrbuild',delay:0});
 await wait(s=>s['fixture.git']?.selected==='pc2/coordinator'&&s['fixture.git']?.counts?.open===3);await capture('on-verified-remote');
 await command({flip:true});await wait(s=>s['fixture.git']?.error==='Not a git repository'&&s['fixture.git']?.links===null);await capture('off-remote');
 await command({flip:true,delay:3500});await wait(s=>s['fixture.git']?.stale===true);await capture('restored-pending-remote');
 await wait(s=>s['fixture.git']?.counts?.open===3&&s['fixture.git']?.stale===false);await capture('restored-verified-remote');
 }
 result.status=JSON.parse(app(['status']));assert.deepEqual(result.status.errors,[]);assert.equal(result.status.zoom,zoom);
 result.reads=state()['fixture.reads'];result.display=state()['custom.fleet.display'];
 result.startDelays=state()['fixture.flips'].filter(f=>f.enabled&&!reportedEnded).flatMap(f=>[null,'pc2'].map(machine=>{const read=result.reads.find(r=>r.generation===f.generation&&r.machine===machine);assert.ok(read,'Every on generation must start both machine reads');const ms=read.at-f.at;assert.ok(ms>=0&&ms<1000,'Next ordinary lifecycle tick starts verification without another event');return {generation:f.generation,machine,ms};}));
} finally {
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}result.stopped=child.exitCode!==null||child.signalCode!==null;
 try{result.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){result.coreStop={code:e.status,stderr:String(e.stderr)};}
 fs.closeSync(log);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(result,null,2));assert.ok(result.stopped);
 assert.equal(JSON.parse(result.coreStop).stopped,true,'Disposable Core stopped');
}
console.log(JSON.stringify(result,null,2));
