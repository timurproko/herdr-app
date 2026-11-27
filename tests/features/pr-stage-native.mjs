// Opt-in, disposable native stage-row proof. No real agents, credentials or GitHub.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {createHash} from 'node:crypto';
import {spawn,execFileSync} from 'node:child_process';
import {build,project} from '../../tools/build.mjs';
import {deploy} from '../../tools/deploy.mjs';
import {temporaryMod} from '../../tools/temporary-mod.mjs';
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
const disposers=[];
try {
for(const mode of ['ordinary','coordinator']) {
 const mod=`custom-stage-${mode}`,base=`mods/${mod}`;
 disposers.push(temporaryMod(home,mod));
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
 {n:3,title:'Return from first review',labels:['Rework'],kind:'fix',round:'2'},
 {n:4,title:'Return from second review',labels:['Build'],kind:'fix',round:'3'},
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
 init(p,cx){this.resetRepository();this.repo={name:'fixture/repo'};this.root='/fixture';this.context=mode==='coordinator'?'tasks:synthetic-home':JSON.stringify([place.cwd,place.on]);this.view='open';this.foldedRepositories=new Set();this.agentLinks=new AgentLinks();this.aggregate=new AggregatePulls({shown:()=>true});this.aggregate.context=context;this.rows=specs.map(s=>{const pr=pullRow({number:s.n,title:s.title,url:'https://github.com/fixture/repo/pull/'+s.n,state:'OPEN',isDraft:s.draft,labels:s.labels.map(name=>({name,color:'840479'})),createdAt:'2026-11-26T10:00:00Z',author:{login:'fixture'},body:'- [x] Synthetic proof',statusCheckRollup:[]});pr.checks={state:'pending',label:'2/3'};return mode==='coordinator'?{...pr,key:'fixture/repo#'+s.n,repo:'fixture/repo'}:pr;});
 this.mixedRows=this.rows.filter(pr=>pr.number===5).map(pr=>({...pr,labels:[...pr.labels,...Array.from({length:5},(_,i)=>({name:'Other '+i+' with a long label name',color:'#123456'}))]}));
 for(const pr of this.rows)this.aggregate.entries.set(pr.key,{pr,link:{targets:[{terminal:'worker-'+pr.number}]}});
 this.pulls.open=this.rows;this.pulls.closed=[];cx.timer.every(100,cx=>cx.spawn(async view=>{const phase=await readTextFile(${JSON.stringify(control)});if(this.phase!==phase){this.phase=phase;this.agentPull=phase==='pinned'?1:null;this.visibleRows=phase==='mixed'?this.mixedRows:phase==='unavailable'?this.rows.slice(-2):this.rows;this.pulls.open=this.visibleRows;view.notify();}setShared('fixture.stage.'+mode,{phase:this.phase,rows:this.rows.length,zoom:${zoom}});}));}
 shown(){return true;}
 labelPill(t,label,id){return super.labelPill(t,label,id).on_mouse_move(()=>setShared('fixture.labels.hover.'+mode,label.name));}
 stageChip(t,pr,...args){const node=super.stageChip(t,pr,...args);return node?.on_mouse_move(event=>setShared('fixture.stage.hover.'+mode,{number:pr.number,bounds:event.bounds}));}
 openPull(pr){setShared('fixture.stage.open.'+mode,pr.number);}
 render(cx){const t=theme();return div().size_full().bg(t.background).flex().flex_col().child(div().h(38).px(8).text_size(13).child((mode==='coordinator'?'Coordinator':'Ordinary / '+(this.phase??'ordinary'))+' · synthetic PR stage proof · ${zoom*100}%')).child(div().flex_1().min_h(0).flex().flex_col().overflow_y_scrollbar().when(this.phase==='mixed',el=>el.w(390)).child(mode==='ordinary'?this.renderPulls(t):this.repositorySection(t,this.taskSections([{repo:'fixture/repo',rows:this.visibleRows??this.rows}],'synthetic-home').sections[0],'synthetic-home',this.selectedTaskWindow)));}
}`);
}
const app=args=>execFileSync(appBin,args,{env,encoding:'utf8',timeout:20000}),sleep=ms=>new Promise(r=>setTimeout(r,ms));
const log=fs.openSync(path.join(root,'app.log'),'w'),child=spawn(appBin,[],{env,stdio:['ignore',log,log]});
const receipt={home,version,zoom,pid:child.pid,archiveSha256,executableSha256:digest(archived),synthetic:true,frames:[]};
const snapshot=()=>{try{return JSON.parse(fs.readFileSync(path.join(home,'shared.json')));}catch{return {};}};
try {
 for(let n=0;n<100;n++){await sleep(200);assert.equal(child.exitCode,null);if(snapshot()['fixture.stage.coordinator'])break;}
 for(const phase of ['ordinary','pinned','unavailable','mixed']){fs.writeFileSync(control,phase);await sleep(750);const file=path.join(root,phase+'.png');app(['shot',file]);receipt.frames.push(file);}
 if(process.argv.includes('--pointer')) {
  // Only this PID's disposable window; confirm the actual stage hit before clicking.
  const pointer=path.join(root,'pointer.ps1');
  fs.writeFileSync(pointer,`param([int]$AppPid,[double]$X,[double]$Y,[string]$Shot,[string]$Action)\nAdd-Type @'\nusing System;using System.Runtime.InteropServices;public class StagePointer{[DllImport("user32.dll")]public static extern bool SetProcessDPIAware();[StructLayout(LayoutKind.Sequential)]public struct R{public int L,T,Rt,B;}[StructLayout(LayoutKind.Sequential)]public struct P{public int X,Y;}[DllImport("user32.dll")]public static extern bool GetWindowRect(IntPtr h,out R r);[DllImport("user32.dll")]public static extern bool SetForegroundWindow(IntPtr h);[DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);[DllImport("user32.dll")]public static extern bool GetCursorPos(out P p);[DllImport("user32.dll")]public static extern bool ScreenToClient(IntPtr h,ref P p);[DllImport("user32.dll")]public static extern bool PostMessage(IntPtr h,uint m,IntPtr w,IntPtr l);}\n'@\n[void][StagePointer]::SetProcessDPIAware();Add-Type -AssemblyName System.Drawing;$im=[System.Drawing.Image]::FromFile($Shot);$w=(Get-Process -Id $AppPid).MainWindowHandle;if(!$w){throw 'Disposable window missing'};$r=New-Object StagePointer+R;$p=New-Object StagePointer+P;[void][StagePointer]::GetWindowRect($w,[ref]$r);[void][StagePointer]::GetCursorPos([ref]$p);$tx=$r.L+[int]($X*($r.Rt-$r.L)/$im.Width);$ty=$r.T+[int]($Y*($r.B-$r.T)/$im.Height);$im.Dispose();[void][StagePointer]::SetForegroundWindow($w);[void][StagePointer]::SetCursorPos($tx,$ty);$cp=New-Object StagePointer+P;$cp.X=$tx;$cp.Y=$ty;[void][StagePointer]::ScreenToClient($w,[ref]$cp);$lp=[IntPtr](($cp.Y -shl 16) -bor ($cp.X -band 65535));[void][StagePointer]::PostMessage($w,0x0200,[IntPtr]0,$lp);if($Action -eq 'click'){[void][StagePointer]::PostMessage($w,0x0201,[IntPtr]1,$lp);[void][StagePointer]::PostMessage($w,0x0202,[IntPtr]0,$lp)};@{x=$p.X;y=$p.Y;targetX=$tx;targetY=$ty}|ConvertTo-Json -Compress`);
  fs.writeFileSync(control,'ordinary');await sleep(650);
  for(const [mode,number]of [['ordinary',1],['coordinator',1],['coordinator',2],['coordinator',5],['coordinator',6],['coordinator',7],['coordinator',8]]) {
   if(number===7){fs.writeFileSync(control,'unavailable');await sleep(650);}
   const slot=number>=7?number-7:number-1;
   const x=(mode==='ordinary'?1280:2560)-60*zoom,y=(mode==='ordinary'?133:159)*2*zoom+slot*76*2*zoom;
   const invoke=action=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',pointer,'-AppPid',String(child.pid),'-X',String(x),'-Y',String(y),'-Shot',path.join(root,'ordinary.png'),'-Action',action],{encoding:'utf8'}));
   const original=invoke('hover');receipt.pointerOrigin??=original;await sleep(850);
   const file=path.join(root,`hover-${mode}-${number}.png`);app(['shot',file]);receipt.frames.push(file);
   assert.equal(snapshot()['fixture.stage.hover.'+mode]?.number,number,'Pointer is over the intended synthetic stage');
   const before=snapshot();invoke('click');await sleep(250);
   if(number>=7){assert.deepEqual(snapshot()['fixture.stage.click.'+mode],before['fixture.stage.click.'+mode]);assert.equal(snapshot()['fixture.stage.open.'+mode],before['fixture.stage.open.'+mode],'Disabled stage consumes the click without opening the PR');}
   else if(number===6)assert.equal(snapshot()['fixture.stage.open.'+mode],6);else assert.equal(snapshot()['fixture.stage.click.'+mode]?.args.terminal,'worker-'+number);
   receipt.clicks??=[];receipt.clicks.push({mode,number,focus:snapshot()['fixture.stage.click.'+mode],opened:snapshot()['fixture.stage.open.'+mode]});
  }
  fs.writeFileSync(control,'mixed');await sleep(650);
  for(const mode of ['ordinary','coordinator'])for(const target of ['stage','unrelated']) {
   const x=(mode==='ordinary'?0:1280)+(390-(target==='stage'?30:100))*zoom*2,y=(mode==='ordinary'?133:159)*2*zoom;
   const invoke=action=>JSON.parse(execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-File',pointer,'-AppPid',String(child.pid),'-X',String(x),'-Y',String(y),'-Shot',path.join(root,'ordinary.png'),'-Action',action],{encoding:'utf8'}));
   invoke('hover');await sleep(850);const file=path.join(root,`hover-mixed-${mode}-${target}.png`);app(['shot',file]);receipt.frames.push(file);
   if(target==='stage'){assert.equal(snapshot()['fixture.stage.hover.'+mode]?.number,5);invoke('click');await sleep(200);assert.equal(snapshot()['fixture.stage.click.'+mode]?.args.terminal,'worker-5');}
   else assert.match(snapshot()['fixture.labels.hover.'+mode]??'',/^Other /,'The unrelated-label hover region remains reachable beside the stage');
   receipt.mixed??=[];receipt.mixed.push({mode,target,stage:snapshot()['fixture.stage.hover.'+mode],label:snapshot()['fixture.labels.hover.'+mode]});
  }
 }
 receipt.status=JSON.parse(app(['status']));assert.deepEqual(receipt.status.errors,[]);
 assert.doesNotMatch(fs.readFileSync(path.join(root,'app.log'),'utf8'),/render failed|previous render did not complete|FIXTURE_RENDER_ERROR/);
}finally {
 try{if(receipt.pointerOrigin)execFileSync('powershell.exe',['-NoProfile','-NonInteractive','-Command',`Add-Type '[System.Runtime.InteropServices.DllImport("user32.dll")]public static extern bool SetCursorPos(int x,int y);[System.Runtime.InteropServices.DllImport("user32.dll")]public static extern bool SetProcessDPIAware();' -Name RestoreStagePointer -Namespace Native;[void][Native.RestoreStagePointer]::SetProcessDPIAware();[void][Native.RestoreStagePointer]::SetCursorPos(${receipt.pointerOrigin.x},${receipt.pointerOrigin.y})`]);}catch(error){receipt.pointerRestoreError=String(error);}
 try{app(['do','app.quit']);}catch{}await sleep(600);if(child.exitCode===null){child.kill();await sleep(500);}receipt.stopped=child.exitCode!==null||child.signalCode!==null;
 try{receipt.coreStop=execFileSync(coreBin,['server','stop'],{env,encoding:'utf8',timeout:10000}).trim();}catch(e){receipt.coreStop=e.status;}
 fs.closeSync(log);fs.writeFileSync(path.join(root,'receipt.json'),JSON.stringify(receipt,null,2));assert.ok(receipt.stopped);assert.equal(JSON.parse(receipt.coreStop).stopped,true,'Disposable Core stopped');
}
console.log(JSON.stringify(receipt,null,2));
} finally {
 for(const dispose of disposers.reverse()) {
  try { /* App/Core shutdown above precedes exact mod/data disposal. */ }
  finally { dispose(); }
 }
 const removed=['ordinary','coordinator'].every(mode=>['mods','data'].every(area=>!fs.existsSync(path.join(home,area,'custom-stage-'+mode))));
 fs.writeFileSync(path.join(root,'cleanup.json'),JSON.stringify({temporaryModsAndDataRemoved:removed}));
 assert.ok(removed,'Shared disposal removed only the claimed fixture mods and their data');
}
