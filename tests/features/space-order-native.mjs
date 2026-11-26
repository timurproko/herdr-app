// Opt-in terminal-free production Spaces drag/acknowledgement proof. Native pixels,
// synthetic controller gestures and model order; never real Core/space commands.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32'&&process.argv.includes('--run'),'Explicit Windows --run required');
const arg=(key,fallback)=>{const at=process.argv.indexOf(key);return at<0?fallback:process.argv[at+1];};
const withGit=process.argv.includes('--git');
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1'));assert.ok(path.relative(project,output).startsWith('..'));assert.ok([1,1.3].includes(zoom));
const appBin=path.resolve(process.env.HERDR_APP_BIN),binRoot=path.resolve(path.dirname(appBin),'..'),coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
const digest=x=>createHash('sha256').update(x).digest('hex'),expected='e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1',archive=path.join(binRoot,'app.tar.gz');
assert.equal(JSON.parse(fs.readFileSync(path.join(binRoot,'release.json'))).targets['windows-x86_64'].sha256,expected);assert.equal(digest(fs.readFileSync(archive)),expected);
const archived=execFileSync(path.join(process.env.SystemRoot,'System32/tar.exe'),['-xOf',archive,'herdr-app/herdr-app.exe'],{maxBuffer:100*1024*1024});assert.equal(digest(archived),digest(fs.readFileSync(appBin)));
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,'so-')),home=path.join(root,'a'),control=path.join(root,'control');assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104);
const env={...process.env,HOME:home,USERPROFILE:home,HERDR_APP_HOME:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HERDR_APP_ID:'herdr-disposable-order',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const k of Object.keys(env))if(k.startsWith('HC_')||k.startsWith('CREW_')||['GH_TOKEN','GITHUB_TOKEN','NODE_OPTIONS'].includes(k))delete env[k];env.HC_SESSION='test-order-'+Date.now();
for(const dir of [home,env.LOCALAPPDATA,env.APPDATA])fs.mkdirSync(dir,{recursive:true});fs.writeFileSync(control,'{}');
const priorPath=process.env.PATH,fixtureBin=path.join(root,'bin');process.env.PATH=fixtureBin+path.delimiter+priorPath;
try{deploy(build().output,home,{repair:false,trelloBin:fixtureBin});}finally{process.env.PATH=priorPath;}
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
put('settings.json',{core:coreBin,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
const initial=['coordinator','xrbuild','myworkflows','combined','independent','another','foreign'];
put('shared.json',{layout:'OrderFixture','frame.welcomed':'skipped','fixture.order':initial,'custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}},'space.colors':{coordinator:'#228855'}});
put('layouts/OrderFixture.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'spaces',type:'block',size:{px:300},content:{mod:'custom-spaces'}},{id:'note',type:'block',content:{mod:'custom-order-note'}},...(withGit?[{id:'git',type:'block',size:{px:460},content:{mod:'custom-changes'}}]:[])]});
const fixture=`import * as native from './native-host.js';
const names={coordinator:'Coordinator',xrbuild:'xrbuild',myworkflows:'myworkflows',combined:'Combined projects',independent:'Independent space',another:'Another coordinator',foreign:'Another child'};
export const groups=()=>native.shared('fixture.order').map(id=>({id,name:names[id],named:true,machine:null,active:id==='coordinator'}));
export const links=['xrbuild','myworkflows','combined'].map(child=>({parent:'coordinator',child,binding:'fixture-home'})).concat([{parent:'another',child:'foreign',binding:'other-home'}]);
export function run(command,args){if(command!=='space.move')throw Error('No real space/terminal control');const order=[...native.shared('fixture.order')],from=order.indexOf(args.id);if(from<0)throw Error('Unknown fixture space');order.splice(args.index-1,0,...order.splice(from,1));native.setShared('fixture.order',order);native.setShared('fixture.commands',[...(native.shared('fixture.commands')??[]),{command,args}]);}
`;
const dir=path.join(home,'mods/custom-spaces');fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));fs.renameSync(path.join(dir,'main.js'),path.join(dir,'spaces-view.js'));fs.renameSync(path.join(dir,'plugins.js'),path.join(dir,'native-plugins.js'));
put('mods/custom-spaces/fixture.js',fixture);
put('mods/custom-spaces/host.js',`export * from './native-host.js';export {run} from './fixture.js';import {groups} from './fixture.js';import * as native from './native-host.js';export const spaces=groups,panes=()=>[],terminals=()=>[],machines=()=>[];export const focused=()=>({space:'coordinator'});export const shared=k=>k==='layout'?'Custom':native.shared(k);export const layout=()=>({id:'spaces',size:{px:native.shared('fixture.compact')?80:300}});export const exec=()=>{throw Error('No live IO');};export const hc=exec;`);
put('mods/custom-spaces/plugins.js',`export * from './native-plugins.js';import {links} from './fixture.js';export const pluginWorkspaceLinks=()=>links;export const pluginSpaceTags=w=>['coordinator','another'].includes(w.id)?[{plugin:'crew',label:'Crew'}]:[];export const pluginEvent=()=>{};`);
put('mods/custom-spaces/main.js',`import Spaces from './spaces-view.js';import {ScrollHandle} from 'gpui-base';import {readTextFile,setShared,shared,spaces} from './host.js';import {captureSpaceBlock,blockTarget} from './workspace-links.js';import {links} from './fixture.js';
export default class Fixture extends Spaces{init(p,cx){this.git={};this.shown=new Set(spaces().map(s=>s.id));this.born={};this.folded=new Set();this.machines=[];this.reconnecting={};this.rebuilt=()=>false;this.rename=null;this.listScroll=ScrollHandle.new();this.connectedSelection='coordinator';this.drag.cancel=()=>{};
cx.timer.every(100,cx=>cx.spawn(async view=>{this.blockCommit?.observe();const c=JSON.parse(await readTextFile(${JSON.stringify(control)}));if(c.id&&c.id!==this.action){this.action=c.id;if(c.kind==='drag'){const e={position:{x:60,y:100},bounds:{x:8,y:80,width:280,height:32}};this.drag.begin(c.source,e,view,{meta:captureSpaceBlock(spaces(),links,c.source),scale:${zoom}});this.drag.over({position:{x:70,y:150}},blockTarget(spaces(),links,c.source,c.target),view);this.drag.current.point={x:160,y:210};}if(c.kind==='drop')this.drop(null,view);if(c.kind==='compact')setShared('fixture.compact',true);if(c.kind==='expand')setShared('fixture.compact',false);if(c.kind==='fold'){for(const row of this.ordered())if(row.block?.length>1&&!row.linked)this.connectedFolds().add(this.parentKey(row));}setShared('fixture.ack',c.id);}
setShared('fixture.spaces',{order:spaces().map(s=>s.id),visible:this.visibleRows(false).map(r=>r.w.id),pending:Boolean(this.blockCommit?.pending),drag:this.drag.current?{source:this.drag.current.id,target:this.drag.current.target,sources:this.drag.current.meta.sources}:null,rows:this.ordered().map(r=>({id:r.w.id,index:r.i,lastChild:r.lastChild,linked:r.linked}))});view.notify();}));}}
`);
put('mods/custom-order-note/mod.json',{place:'none'});for(const f of ['host.js','compatibility.js'])put('mods/custom-order-note/'+f,fs.readFileSync(path.join(home,'mods/custom-spaces',f==='host.js'?'native-host.js':f),'utf8'));
put('mods/custom-order-note/main.js',`import {View,div} from 'gpui-kit';import {theme} from './host.js';export default class Note extends View{render(){const t=theme();return div().size_full().bg(t.background).p(32).text_color(t.foreground).child('Disposable synthetic child-order proof · production Spaces drag and acknowledged order controller · no real terminals or space commands');}}`);
if(withGit) {
 const dir=path.join(home,'mods/custom-changes');for(const [from,to]of [['host.js','native-host.js'],['plugins.js','native-plugins.js'],['main.js','changes-view.js']])fs.renameSync(path.join(dir,from),path.join(dir,to));
 put('mods/custom-changes/fixture.js',fixture+`
export const repositories=[['xrbuild','xrbuild'],['myworkflows','myworkflows'],['alpha','combined'],['zeta','combined'],['finished',null]];
export const context=()=>({kind:'tasks',scope:'fixture-home',parent:'coordinator',machine:null,children:['xrbuild','myworkflows','combined'].map(child=>({child})),stale:false,loading:false,links:repositories.flatMap(([repo,space])=>[1,2].map(number=>({url:'https://github.com/fixture/'+repo+'/pull/'+number,space,task:repo+number,terminal:space?repo+number:null,historical:!space})))});
`);
 put('mods/custom-changes/host.js',`export * from './native-host.js';import {groups} from './fixture.js';export const spaces=groups,panes=()=>[],terminals=()=>[],machines=()=>[];export const props=()=>({});export const layout=()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]});export const exec=()=>{throw Error('No GitHub/subprocess reads');};export const hc=exec;export const run=exec;`);
 put('mods/custom-changes/plugins.js',`export * from './native-plugins.js';import {context} from './fixture.js';export const pluginPullContext=()=>context();export const pluginEvent=()=>{};`);
 put('mods/custom-changes/location.js',`export const location=()=>({space:'coordinator',cwd:'/fixture',on:null,terminal:'owner'});export const namedPullNumber=()=>null;`);
 put('mods/custom-changes/main.js',`import Changes from './changes-view.js';import {AggregatePulls,taskPullLink} from './aggregate.js';import {pullRow} from './pulls.js';import {context,repositories} from './fixture.js';import {readTextFile,setShared,theme} from './host.js';
export default class Fixture extends Changes{init(p,cx){this.resetRepository();this.foldedRepositories=new Set(['fixture/finished']);this.view='open';this.context='tasks:fixture-home';this.enrollmentFocus=cx.focus_handle();this.notices={sync(){},presentation(){},stop(){}};this.agentLinks={related(){return null;}};this.aggregate=new AggregatePulls({shown:()=>true});const a=this.aggregate;a.context=context();a.presentationGeneration='fixture';
for(const source of context().links){const link=taskPullLink(source.url);link.targets=[source];const pr={...pullRow({number:link.number,title:link.repo.split('/')[1]+' task '+link.number,url:link.url,state:link.number===1?'OPEN':'MERGED',author:{login:'fixture'},createdAt:new Date(Date.now()-3600000).toISOString(),mergedAt:link.number===2?new Date(Date.now()-1000).toISOString():null,body:'',labels:[],statusCheckRollup:[]},'fixture'),repo:link.repo,key:link.key};a.entries.set(link.key,{link,pr,dirty:false,error:null,completedAt:Date.now()-1000});}a.published=new Map(a.entries);a.lastCounts=new Map(a.entries);
cx.timer.every(100,cx=>cx.spawn(async view=>{const c=JSON.parse(await readTextFile(${JSON.stringify(control)}));if(c.gitView)this.view=c.gitView;setShared('fixture.git',{view:this.view,order:a.repositories(),sections:this.repositorySections().map(s=>s.repo),counts:a.counts(),folded:[...this.foldedRepositories]});view.notify();}));}shown(){return true;}render(cx){return this.renderAggregate(cx,theme());}}
`);
}
const sleep=ms=>new Promise(r=>setTimeout(r,ms)),app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000}),state=()=>JSON.parse(fs.readFileSync(path.join(home,'shared.json')));
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const receipt={version,zoom,home,pid:child.pid,session:env.HC_SESSION,archiveSha256:expected,executableSha256:digest(archived),frames:[],synthetic:true,interaction:'Production controller gestures and native pixels; synthetic acknowledged model, not OS pointer or real native-space persistence proof'};
const wait=async fn=>{for(let i=0;i<180;i++){await sleep(100);assert.equal(child.exitCode,null);try{if(fn(state()))return;}catch{}}throw Error('Fixture timed out');};let id=0;
const command=async c=>{fs.writeFileSync(control,JSON.stringify({...c,id:++id}));await wait(s=>s['fixture.ack']===id);};
const capture=async name=>{await sleep(300);const file=path.join(root,name+'.png');app(['shot',file]);receipt.frames.push({name,file,spaces:state()['fixture.spaces'],git:state()['fixture.git']});assert.deepEqual(JSON.parse(app(['status'])).errors,[]);};
try{
 await wait(s=>s['fixture.spaces']&&(!withGit||s['fixture.git']));await capture('before');
 if(withGit){assert.deepEqual(state()['fixture.git'].order,['fixture/xrbuild','fixture/myworkflows','fixture/alpha','fixture/finished','fixture/zeta']);await command({kind:'view',gitView:'closed'});await wait(s=>s['fixture.git'].view==='closed');await capture('before-closed');await command({kind:'view',gitView:'open'});}
 await command({kind:'drag',source:'xrbuild',target:'combined'});await capture('drag-down');await command({kind:'drop'});await wait(s=>!s['fixture.spaces'].pending);assert.deepEqual(state()['fixture.order'].slice(0,4),['coordinator','myworkflows','combined','xrbuild']);await capture('after-down');
 if(withGit){await wait(s=>s['fixture.git'].order[0]==='fixture/myworkflows');assert.deepEqual(state()['fixture.git'].counts,{open:5,closed:5});assert.deepEqual(state()['fixture.git'].folded,['fixture/finished']);await command({kind:'view',gitView:'closed'});await wait(s=>s['fixture.git'].view==='closed');await capture('after-down-closed');await command({kind:'view',gitView:'open'});}
 await command({kind:'drag',source:'xrbuild',target:'myworkflows'});await capture('drag-up');await command({kind:'drop'});await wait(s=>!s['fixture.spaces'].pending);assert.deepEqual(state()['fixture.order'],initial);await capture('after-up');
 await command({kind:'fold'});await command({kind:'drag',source:'coordinator',target:'foreign'});await capture('drag-coordinator-collapsed');await command({kind:'drop'});await wait(s=>!s['fixture.spaces'].pending);assert.deepEqual(state()['fixture.order'],['independent','another','foreign','coordinator','xrbuild','myworkflows','combined']);await capture('after-coordinator');
 await command({kind:'compact'});await capture('compact');receipt.commands=state()['fixture.commands'];receipt.status=JSON.parse(app(['status']));assert.equal(receipt.status.zoom,zoom);
}finally{
 try{app(['do','app.quit']);}catch{}await sleep(700);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop={code:e.status,stderr:String(e.stderr)};}
 fs.closeSync(log);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);assert.equal(JSON.parse(receipt.coreStop).stopped,true);
}
console.log(JSON.stringify(receipt,null,2));
