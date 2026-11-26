// Opt-in, disposable native stage-row proof. No real agents, credentials or GitHub.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
assert.ok(process.platform==='win32'&&process.argv.includes('--run'),'Explicit Windows --run required');
const arg=(key,fallback)=>process.argv.includes(key)?process.argv[process.argv.indexOf(key)+1]:fallback;
const output=path.resolve(arg('--output')),zoom=Number(arg('--zoom','1'));
assert.ok(path.relative(project,output).startsWith('..'));assert.ok([1,1.3].includes(zoom));
const appBin=path.resolve(process.env.HERDR_APP_BIN),coreBin=path.join(process.env.LOCALAPPDATA,'Programs/herdr-core/herdr-core.exe');
const archive=path.resolve(appBin,'../../app.tar.gz'),digest=x=>createHash('sha256').update(x).digest('hex');
const archiveSha256='e6e78e1bec1f47bd0d94dbc872a5670f4ac9c8f6740210b62365ab8b28f897c1';
assert.equal(digest(fs.readFileSync(archive)),archiveSha256);
const archived=execFileSync(path.join(process.env.SystemRoot,'System32/tar.exe'),['-xOf',archive,'herdr-app/herdr-app.exe'],{maxBuffer:100*1024*1024});
assert.equal(digest(archived),digest(fs.readFileSync(appBin)),'Executable equals checksum-verified 0.1.18 archive');
fs.mkdirSync(output,{recursive:true});const root=fs.mkdtempSync(path.join(output,`stages-${zoom}-`)),home=path.join(root,'home'),control=path.join(root,'control');
const env={...process.env,HERDR_APP_HOME:home,USERPROFILE:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roam'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`stage-proof-${Date.now()}`,HERDR_APP_ID:'herdr-disposable-pr-stages',HERDR_RELEASES_URL:'http://127.0.0.1:1'};
for(const k of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS','HC_TERMINAL_SOCKET','HC_SCOPE','GH_TOKEN','GITHUB_TOKEN'])delete env[k];
fs.mkdirSync(home,{recursive:true});fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});fs.writeFileSync(control,'ordinary');
const put=(rel,value)=>{const file=path.join(home,rel);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value,null,2));};
deploy(build().output,home,{repair:false});
const version=execFileSync(appBin,['--version'],{encoding:'utf8'}).trim();assert.match(version,/0\.1\.18/);
put('settings.json',{core:coreBin,telemetry:false,zoom});put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'StageProof','frame.welcomed':'skipped','custom.plugins':{git:{enabled:true},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/StageProof.json',{id:'root',type:'row',theme:'Custom',titlebar:'system',children:[{id:'ordinary',type:'block',content:{mod:'custom-stage-ordinary'}},{id:'coordinator',type:'block',content:{mod:'custom-stage-coordinator'}}]});
for(const mode of ['ordinary','coordinator']) {
 const mod=`custom-stage-${mode}`,base=`mods/${mod}`;
 fs.cpSync(path.join(home,'mods/custom-changes'),path.join(home,base),{recursive:true});
 fs.renameSync(path.join(home,base,'main.js'),path.join(home,base,'changes-view.js'));
 fs.renameSync(path.join(home,base,'host.js'),path.join(home,base,'native-host.js'));
 fs.renameSync(path.join(home,base,'plugins.js'),path.join(home,base,'native-plugins.js'));
 put(`${base}/mod.json`,{place:'none'});
 put(`${base}/fixture.js`, `
import {setShared} from './native-host.js';
export const mode=${JSON.stringify(mode)};
export const place={cwd:'/fixture',on:null,terminal:'selection',space:'space',tab:'tab',app:'codex'};
export const specs=[
 {n:1,title:'Initial build without a managed label',labels:[],kind:'ship'},
 {n:2,title:'Plan only, awaiting approval',labels:[],kind:'ship',draft:true},
 {n:3,title:'Return from first review',labels:['Rework'],kind:'fix',round:'1'},
 {n:4,title:'Return from second review',labels:['Build'],kind:'fix',round:'2'},
 {n:5,title:'Reviewer stays on the base branch',labels:['🤖 Review'],kind:'review'},
 {n:6,title:'Approved while checks are pending',labels:['Approved'],kind:'ship'},
 {n:7,title:'Ended build cannot navigate',labels:['Build'],kind:'ship',ended:true},
 {n:8,title:'Disconnected reviewer cannot navigate',labels:['Review'],kind:'review',remote:true}
];
export const terminals=()=>specs.map(s=>({address:(s.remote?'offline/':'')+'worker-'+s.n,state:s.ended?'finished':'live',cwd:'/fixture',labels:{'crew.kind':s.kind,'crew.pr':'https://github.com/fixture/repo/pull/'+s.n,...(s.round?{'crew.round':s.round}:{}),'crew.finding':'Synthetic finding'}}));
export const agents=()=>terminals().map(t=>({address:t.address,space:'space',tab:t.address,app:'codex',title:'Synthetic '+t.address}));
export const panes=()=>terminals().map(t=>({terminal:t.address,pane:t.address,tab:t.address,branch:'main',cwd:'/fixture'}));
export const spaces=()=>[{id:'space',tabs:terminals().map(t=>({id:t.address}))}];
export const context={scope:'synthetic-home',tasks:terminals().map(t=>({id:t.address,terminal:t.address})),links:terminals().map((t,i)=>({url:t.labels['crew.pr'],terminal:t.address,task:t.address}))};
export const run=(command,args)=>{if(command!=='agent.focus')throw Error('No live action permitted');setShared('fixture.stage.click.'+mode,{command,args,at:Date.now()});};
export const forbidden=()=>{throw Error('No transport permitted in native row proof');};
`);
 put(`${base}/host.js`,`export * from './native-host.js';export {run,agents,terminals,panes,spaces} from './fixture.js';export {forbidden as exec,forbidden as hc} from './fixture.js';export const machines=()=>[];`);
 put(`${base}/plugins.js`,`export * from './native-plugins.js';import {context} from './fixture.js';export const pluginPullContext=()=>context;export const pluginEvent=()=>{};`);
 put(`${base}/location.js`,`import {place} from './fixture.js';export const location=()=>place;export const namedPullNumber=()=>null;`);
 put(`${base}/main.js`,`import {div} from 'gpui-kit';import Changes from './changes-view.js';import {AgentLinks} from './agent-links.js';import {AggregatePulls} from './aggregate.js';import {pullRow} from './pulls.js';import {theme,readTextFile,setShared} from './host.js';import {context,mode,specs,place} from './fixture.js';
export default class Fixture extends Changes {
 init(p,cx){this.resetRepository();this.repo={name:'fixture/repo'};this.root='/fixture';this.context=JSON.stringify([place.cwd,place.on]);this.view='open';this.foldedRepositories=new Set();this.agentLinks=new AgentLinks();this.aggregate=new AggregatePulls({shown:()=>true});this.aggregate.context=context;this.rows=specs.map(s=>{const pr=pullRow({number:s.n,title:s.title,url:'https://github.com/fixture/repo/pull/'+s.n,state:'OPEN',isDraft:s.draft,labels:s.labels.map(name=>({name,color:'840479'})),createdAt:'2026-11-26T10:00:00Z',author:{login:'fixture'},body:'- [x] Synthetic proof',statusCheckRollup:[]});pr.checks={state:'pending',label:'2/3'};return mode==='coordinator'?{...pr,key:'fixture/repo#'+s.n,repo:'fixture/repo'}:pr;});
 for(const pr of this.rows)this.aggregate.entries.set(pr.key,{pr,link:{targets:[{terminal:'worker-'+pr.number}]}});
 this.pulls.open=this.rows;this.pulls.closed=[];cx.timer.every(100,cx=>cx.spawn(async view=>{const phase=await readTextFile(${JSON.stringify(control)});if(this.phase!==phase){this.phase=phase;this.agentPull=phase==='pinned'?3:null;view.notify();}setShared('fixture.stage.'+mode,{phase:this.phase,rows:this.rows.length,zoom:${zoom}});}));}
 shown(){return true;}
 openPull(pr){setShared('fixture.stage.open.'+mode,pr.number);}
 render(cx){const t=theme();return div().size_full().bg(t.background).flex().flex_col().child(div().h(38).px(8).text_size(13).child((mode==='coordinator'?'Coordinator':'Ordinary / '+(this.phase??'ordinary'))+' · synthetic PR stage proof · ${zoom*100}%')).child(div().flex_1().min_h(0).flex().flex_col().overflow_y_scrollbar().child(mode==='ordinary'?this.renderPulls(t):this.repositorySection(t,this.taskSections([{repo:'fixture/repo',rows:this.rows}],'synthetic-home').sections[0],'synthetic-home',this.selectedTaskWindow)));}
}`);
}
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const receipt={home,version,zoom,pid:child.pid,archiveSha256,executableSha256:digest(archived),synthetic:true,frames:[]};
const snapshot=()=>{try{return JSON.parse(fs.readFileSync(path.join(home,'shared.json')));}catch{return {};}};
try {
 for(let n=0;n<100;n++){await sleep(200);assert.equal(child.exitCode,null);if(snapshot()['fixture.stage.coordinator'])break;}
 for(const phase of ['ordinary','pinned']){fs.writeFileSync(control,phase);await sleep(750);const file=path.join(root,phase+'.png');app(['shot',file]);receipt.frames.push(file);}
 receipt.status=JSON.parse(app(['status']));assert.deepEqual(receipt.status.errors,[]);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'app.log'),'utf8'),/render failed|previous render did not complete|FIXTURE_RENDER_ERROR/);
}finally {
 try{app(['do','app.quit']);}catch{}await sleep(600);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop=e.status;}
 fs.closeSync(log);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);assert.equal(JSON.parse(receipt.coreStop).stopped,true,'Disposable Core stopped');
}
console.log(JSON.stringify(receipt,null,2));
