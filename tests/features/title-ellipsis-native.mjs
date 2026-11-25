// Opt-in pixel/performance fixture: its own app home/window; no Core, network,
// credentials, terminals, deployment or interaction with the person's app.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {spawn,spawnSync,execFileSync} from 'node:child_process';
import {build} from '../../tools/build.mjs';
if(!process.argv.includes('--run')||process.platform!=='win32')throw Error('Explicit Windows opt-in required: --run [--baseline revision]');
const baseline=process.argv.includes('--baseline')?process.argv[process.argv.indexOf('--baseline')+1]:null;
const label=baseline?'before':'after',exe=process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const {output}=build();fs.mkdirSync('.artifacts',{recursive:true});
const root=fs.mkdtempSync(path.resolve('.artifacts/te-')),home=path.join(root,'a'),dir=path.join(home,'mods/custom-changes');
assert.ok(Buffer.byteLength(path.join(home,'herdr-app.sock'))<104,'Disposable socket path must fit');
const env={...process.env,HERDR_APP_HOME:home,USERPROFILE:home,LOCALAPPDATA:path.join(root,'local'),APPDATA:path.join(root,'roaming'),XDG_STATE_HOME:path.join(root,'state'),XDG_CONFIG_HOME:path.join(root,'config'),HC_SESSION:`test-title-ellipsis-${Date.now()}`,HERDR_RELEASES_URL:'http://127.0.0.1:1',HERDR_APP_ID:'herdr-disposable-title-ellipsis'};
for(const key of ['HC_TERMINAL_ID','HC_PARENT','HC_ADDRESS'])delete env[key];
fs.mkdirSync(env.LOCALAPPDATA,{recursive:true});
const put=(name,value)=>{const file=path.join(home,name);fs.mkdirSync(path.dirname(file),{recursive:true});fs.writeFileSync(file,typeof value==='string'?value:JSON.stringify(value));};
fs.cpSync(path.join(output,'mods/custom-changes'),dir,{recursive:true});
fs.cpSync(path.join(output,'mods/custom-workspace-chrome'),path.join(home,'mods/custom-workspace-chrome'),{recursive:true});
fs.renameSync(path.join(dir,'main.js'),path.join(dir,'changes-view.js'));
if(baseline)fs.writeFileSync(path.join(dir,'changes-view.js'),execFileSync('git',['show',`${baseline}:src/plugins/git/mod/main.js`],{encoding:'utf8'}));
put('mods/custom-changes/mod.json',{place:'none'});
put('themes/Custom.json',fs.readFileSync(path.join(output,'themes/Custom.json'),'utf8'));
put('update-notes.json',{last_run:'0.1.18',presented:['0.1.18']});
put('shared.json',{layout:'EllipsisFixture','frame.welcomed':'skipped','custom.plugins':{git:{enabled:false},files:{enabled:false},usage:{enabled:false},crew:{enabled:false}}});
put('layouts/EllipsisFixture.json',{id:'root',theme:'Custom',type:'column',titlebar:'system',children:[{id:'fixture',type:'block',content:{mod:'custom-changes'}}]});
const common=`import Changes from './changes-view.js';import {div} from 'gpui-kit';import {v_flex,h_flex} from 'gpui-base';import {theme} from './host.js';
const titles=['fix(crew): diagnose and recover fleet verification failure','feature(status): add bounded fleet status inventory','fix(git): quiet rate limits and reduce repeated requests','style(git): lower metadata icons on fixed lines'];
const repo='timurproko/a-very-long-repository-section-header-with-overflow';
const rows=Array.from({length:100},(_,i)=>({number:i+1,title:titles[i%4],state:'open',login:'fixture',when:'opened 4 hours ago',compactWhen:'4h ago',meta:'#'+(i+1)+' · fixture · opened 4 hours ago',tasks:{done:2,total:2,label:'2 tasks done'},checks:{state:'success',label:'11/11'}}));
export default class Fixture extends Changes {
init(){this.resetRepository();this.context='fixture';this.foldedRepositories=new Set();this.aggregate={currentContext:()=>({scope:'fixture'}),repositories:()=>[repo],entries:new Map()};}
shown(){return true;}agentButton(){return null;}
`;
const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms)),results={baseline,screenshots:[],cold100:{}};
// Seven separate native VMs per mode: all 100 row trees are mounted, NOT a
// 100-row inventory reduced to a ten-item coordinator page. No warm-up/cache.
for(const mode of ['ordinary','coordinator']){
 put('mods/custom-changes/main.js',common+`render(){this.context=${JSON.stringify(mode==='coordinator'?'tasks:fixture':'fixture')};const t=theme(),start=Date.now();const tree=v_flex().w(300).children(rows.map(pr=>this.pullRow(t,${mode==='coordinator'?"{...pr,key:repo+'#'+pr.number}":'pr'})));console.error('COLD100 '+(Date.now()-start));return tree;}}`);
 const samples=[];
 for(let i=0;i<7;i++){
  const r=spawnSync(exe,['check',dir],{env,encoding:'utf8',timeout:30000,windowsHide:true});
  fs.writeFileSync(path.join(root,`${mode}-${i}.log`),r.stdout+'\n'+r.stderr);
  assert.equal(r.status,0,r.stdout+r.stderr);samples.push(Number((r.stdout+r.stderr).match(/COLD100 (\d+)/)[1]));
 }
 results.cold100[mode]=samples;
}
for(const zoom of [1,1.3]){
 put('settings.json',{core:path.join(root,'unavailable-core.exe'),telemetry:false,zoom});
 put('mods/custom-changes/main.js',common+`render(){const t=theme();return v_flex().size_full().p(16).gap(10).bg(t.background).text_color(t.foreground).text_size(13)
.child(div().child('Disposable native ellipsis — zoom ${zoom}'))
.child(h_flex().gap(20).items_start()
.child(v_flex().w(300).flex_none().gap(2).child('Ordinary').children(rows.slice(0,4).map(pr=>this.pullRow(t,pr))))
.child(v_flex().w(300).flex_none().gap(2).child('Coordinator').child(this.repositorySection(t,{repo,rows:rows.slice(0,4).map(pr=>({...pr,key:repo+'#'+pr.number})),error:null},'fixture'))))
.child(div().child('Controls: literal U+2026 / three periods; same 20px line box'))
.children(['Geist','.SystemUIFont','Arial'].map(font=>h_flex().gap(10).child(div().w(150).child(font))
.child(div().font_family(font).font_semibold().h(20).line_height('20px').child('baseline … ...'))
.child(div().w(200).h(20).line_height('20px').font_family(font).font_semibold().truncate().child(titles[0]))));}}
`);
 const log=fs.openSync(path.join(root,`app-${zoom}.log`),'w'),child=spawn(exe,[],{env,stdio:['ignore',log,log]});
 try{
  let status;
  for(let i=0;i<60;i++){
   await sleep(500);assert.equal(child.exitCode,null,'Own app must remain alive');
   try{status=JSON.parse(execFileSync(exe,['status'],{env,encoding:'utf8',timeout:2000,windowsHide:true}));if(status.layout==='EllipsisFixture')break;}catch{}
  }
  assert.equal(status?.layout,'EllipsisFixture');assert.deepEqual(status.errors,[]);assert.deepEqual(status.overlays,[]);assert.equal(status.zoom,zoom);
  await sleep(2000);const image=path.join(root,`${label}-${zoom}.png`);
  execFileSync(exe,['shot',image],{env,timeout:15000});results.screenshots.push(image);
  fs.writeFileSync(path.join(root,`status-${zoom}.json`),JSON.stringify(status,null,2));
 }finally{
  try{execFileSync(exe,['do','app.quit'],{env,timeout:5000});}catch{}
  await sleep(500);if(child.exitCode===null)child.kill();fs.closeSync(log);
 }
}
fs.writeFileSync(path.join(root,'results.json'),JSON.stringify(results,null,2)+'\n');
console.log(JSON.stringify({root,...results},null,2));
