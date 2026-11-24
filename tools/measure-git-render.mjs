// Synthetic packaged coordinator in a disposable native QuickJS/GPUI check.
// Does not deploy, connect to Core/GitHub or modify/restart the running app.
// Measures JS/native element BUILD inside render, not live paint/input latency.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {build} from './build.mjs';
const {output}=build(),root=path.resolve('.artifacts/git-render-native');
fs.mkdirSync(root,{recursive:true});
const executable=process.env.HERDR_APP_BIN||path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const requested=process.argv.slice(2),variants=requested.length?requested:['current'];
const warm=process.env.GIT_NATIVE_WARM==='1';
const revisions={pre42:'70fd212^',post42:'70fd212',unbounded:'025e191'};
// Remove only tooltip method calls for a differential native cost sample. This
// balanced scanner handles their nested argument expressions and string literals.
function withoutTooltips(source){
 let at;
 while((at=source.indexOf('.tooltip('))>=0){
  let depth=1,i=at+9,quote=null;
  for(;i<source.length&&depth;i++){
   const c=source[i];
   if(quote){if(c==='\\')i++;else if(c===quote)quote=null;continue;}
   if(c==='"'||c==="'"||c==='`')quote=c;
   else if(c==='(')depth++;else if(c===')')depth--;
  }
  if(depth)throw Error('Unbalanced tooltip call');
  source=source.slice(0,at)+source.slice(i);
 }
 return source;
}
const results=[];
for(const variant of variants)for(const count of [30,60,100,200])for(let sample=0;sample<5;sample++) {
 const home=fs.mkdtempSync(path.join(root,`${variant}-${count}-`)),dir=path.join(home,'mods/custom-changes');
 try{
 fs.cpSync(path.join(output,'mods/custom-changes'),dir,{recursive:true});
 const base=variant.replace('-no-tooltips','');
 let source=revisions[base]?cp.execFileSync('git',['show',`${revisions[base]}:src/plugins/git/mod/main.js`],{encoding:'utf8'}):fs.readFileSync('src/plugins/git/mod/main.js','utf8');
 if(variant.endsWith('-no-tooltips'))source=withoutTooltips(source);
 fs.writeFileSync(path.join(dir,'changes-view.js'),source);
 fs.writeFileSync(path.join(dir,'main.js'),`import Changes from './changes-view.js';
import {theme} from './host.js';
export default class Fixture extends Changes {
 init(_p,cx){
 this.resetRepository();this.foldedRepositories=new Set();this.view='closed';this.context='tasks:fixture';this.enrollmentFocus=cx.focus_handle();
 const rows=Array.from({length:${count}},(_,i)=>({key:(i<3?'timurproko/crew':'timurproko/herdr-app')+'#'+(i+1),repo:i<3?'timurproko/crew':'timurproko/herdr-app',number:i+1,title:'Closed coordinator fixture: natural-width metadata '+i,state:i%2?'closed':'merged',login:'timurproko',when:'opened 4 hours ago',compactWhen:'4h ago',meta:'#'+(i+1)+' · timurproko · opened 4 hours ago',tasks:{done:2,total:2,label:'2 tasks done'},checks:{state:'success',label:'11/11'},labels:[{name:'bug',color:'d73a4a'},{name:'UI',color:'0075ca'}],review:'approved'}));
 this.aggregate={context:{scope:'fixture',machine:null},entries:new Map(rows.map(pr=>[pr.key,{pr,link:{repo:pr.repo}}])),counts:()=>({open:5,closed:${count}}),repositories:()=>['timurproko/crew','timurproko/herdr-app'],rows:()=>rows,currentContext:()=>({scope:'fixture'}),readNotice:repo=>repo==='timurproko/crew'?'Task PR history: timurproko/crew #36, #37, #38 not found':null,target:pr=>pr.number%3?null:{address:'fixture-worker'}};
 this.notices={sync(){return null;},presentation(){return null;}};this.syncChecksFallback=()=>{};
 // Benchmark the entire mounted tree, deliberately bypassing the runtime cap.
 // Input/reveal correctness is tested separately without fabricated mouse pairs.
 if(this.taskSections){
   const sections=this.aggregate.repositories().map(repo=>({repo,rows:rows.filter(pr=>pr.repo===repo),error:this.aggregate.readNotice(repo)}));
   const w=this.taskSections(sections,'fixture').window;w.maxRows=Infinity;
   this.taskMeasure(w,'fixture','viewport',{width:390,height:400},cx);
   while(w.revealMore()){}
   w.observe(1e9,400);w.metrics.setMetrics({offset:w.offset,viewport:400,content:w.contentHeight});
   this.fixtureLoaded=w.range().visible.length;this.fixtureOffset=w.offset;
 }
 this.profile={visible:0,probes:0,pills:0,rows:[]};
 const label=this.labelPill;this.labelPill=(...args)=>{const start=Date.now();const r=label.apply(this,args);this.profile.pills+=Date.now()-start;return r;};
 const row=this.pullRow;this.pullRow=(...args)=>{const start=Date.now();const r=row.apply(this,args);this.profile.rows.push(Date.now()-start);return r;};
 if(${warm}){this.renderAggregate(cx,theme());this.profile={visible:0,probes:0,pills:0,rows:[]};}
 }
 shown(){return true;}
 render(cx){const start=Date.now();const tree=this.renderAggregate(cx,theme());console.error('PROFILE '+JSON.stringify({variant:'${variant}',count:${count},sample:${sample},warm:${warm},total:Date.now()-start,loaded:this.fixtureLoaded??${count},offset:this.fixtureOffset??0,...this.profile}));return tree;}
}
`);
 const result=cp.spawnSync(executable,['check',dir],{encoding:'utf8',timeout:30000,windowsHide:true,env:{...process.env,HERDR_APP_HOME:home}});
 const log=[result.stdout,result.stderr].filter(Boolean).join('\n');
 fs.writeFileSync(path.join(root,`${variant}-${warm?'warm':'cold'}-${count}-${sample}.log`),log);
 const match=log.match(/PROFILE (\{[^\n]+\})/);
 if(result.status!==0||!match){
   if(count!==200||!/interrupted/i.test(log))throw Error(`Native check failed: ${log}`);
   const failure={variant,count,sample,warm,total:null,error:/interrupted/i.test(log)?'native interruption':'native check failed'};
   results.push(failure);console.log(JSON.stringify(failure));continue;
 }
 const record=JSON.parse(match[1]);if(record.loaded!==count||record.rows.length!==count)throw Error(`Expected ${count} mounted rows, got ${record.loaded}/${record.rows.length}`);results.push(record);console.log(JSON.stringify(record));
 }finally{fs.rmSync(home,{recursive:true,force:true});}
}
fs.writeFileSync(path.join(root,`mounted-${warm?'warm':'cold'}-results.json`),JSON.stringify(results,null,2)+'\n');
