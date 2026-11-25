// Opt-in cold native JS/element construction, using main's #56 mounted model.
// Disposable app homes/checker only: no desktop/Core, credentials or deployment.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';
import {build} from './build.mjs';import {temporaryMod} from './temporary-mod.mjs';
import {mountedRows} from '../tests/support/git-row-budget.mjs';
if(!process.argv.includes('--run')||process.platform!=='win32')throw Error('Explicit Windows opt-in required: --run');
const executable=process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const revision=cp.execFileSync('git',['rev-parse','origin/main'],{encoding:'utf8'}).trim();
const baseline=Object.fromEntries(['main.js','row-presentation.js'].map(file=>[file,cp.execFileSync('git',['show',`${revision}:src/plugins/git/mod/${file}`],{encoding:'utf8'})]));
const {output}=build(),root=path.resolve('.artifacts/git-row-render-budget');fs.mkdirSync(root,{recursive:true});const results=[];
for(const mode of ['ordinary','coordinator'])for(const count of [30,60])for(let sample=0;sample<5;sample++)for(const variant of sample%2?['current','main']:['main','current']) {
  const home=fs.mkdtempSync(path.join(root,'run-')),dir=path.join(home,'mods/custom-changes'),dispose=temporaryMod(home,'custom-changes');
  try {
    fs.cpSync(path.join(output,'mods/custom-changes'),dir,{recursive:true});
    if(variant==='main')for(const [file,source]of Object.entries(baseline))fs.writeFileSync(path.join(dir,file),source);
    fs.renameSync(path.join(dir,'main.js'),path.join(dir,'changes-view.js'));
    const coordinator=mode==='coordinator',rows=mountedRows(count,coordinator,'closed');
    fs.writeFileSync(path.join(dir,'main.js'),`import Changes from './changes-view.js';import {theme} from './host.js';
export default class Fixture extends Changes {
 init(_p,cx){this.resetRepository();this.context='${coordinator?'tasks:fixture':'ordinary'}';this.root='/fixture';this.repo={name:'owner/repo'};this.view='closed';this.agentPull=-1;this.foldedRepositories=new Set();this.enrollmentFocus=cx.focus_handle();
 this.rows=${JSON.stringify(rows)};this.pulls.closed=this.rows;this.agentLinks={related:()=>null};
 this.aggregate={context:{scope:'fixture'},entries:new Map(this.rows.map(pr=>[pr.key,{pr}])),counts:()=>({open:0,closed:${count}}),repositories:()=>['owner/a','owner/b'],rows:()=>this.rows,currentContext:()=>({scope:'fixture'}),readNotice:()=>null,target:()=>null};
 this.notices={sync(){},presentation(){}};this.enrollmentPicker={render(){}};this.syncChecksFallback=()=>{};
 ${coordinator?`const sections=this.aggregate.repositories().map(repo=>({repo,rows:this.rows.filter(pr=>pr.repo===repo)}));const w=this.taskSections(sections,'fixture').window;this.taskMeasure(w,'fixture','viewport',{width:390,height:400},cx);while(w.revealMore()){}this.loaded=w.range().revealedRows.length;`:`this.loaded=this.rows.length;`}
 const row=this.pullRow;this.pullRow=(...args)=>{this.mounted++;return row.apply(this,args);};}
 shown(){return true;}
 render(cx){this.mounted=0;const started=Date.now(),t=theme();const tree=${coordinator?'this.renderAggregate(cx,t)':'this.renderPulls(t)'};
 console.error('PROFILE '+JSON.stringify({mode:'${mode}',variant:'${variant}',count:${count},sample:${sample},mounted:this.mounted,loaded:this.loaded,total:Date.now()-started,baseline:'${revision}'}));return tree;}
}
`);
    const check=cp.spawnSync(executable,['check',dir],{encoding:'utf8',timeout:30000,windowsHide:true,env:{...process.env,HERDR_APP_HOME:home}});
    const log=[check.stdout,check.stderr].filter(Boolean).join('\n');fs.writeFileSync(path.join(root,`${mode}-${variant}-${count}-${sample}.log`),log);
    const match=log.match(/PROFILE (\{[^\n]+\})/),record=match?{...JSON.parse(match[1]),exit:check.status}:{mode,variant,count,sample,exit:check.status,interrupted:/interrupted/i.test(log)};
    results.push(record);console.log(JSON.stringify(record));
  } finally {dispose();fs.rmSync(home,{recursive:true,force:true});}
}
fs.writeFileSync(path.join(root,'main-mounted-results.json'),JSON.stringify(results,null,2)+'\n');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
for(const mode of ['ordinary','coordinator'])for(const count of [30,60]) {
  const select=variant=>results.filter(r=>r.mode===mode&&r.variant===variant&&r.count===count),before=select('main'),after=select('current');
  assert.ok([...before,...after].every(r=>r.exit===0&&Number.isFinite(r.total)&&r.mounted===count&&r.loaded===count),`${mode}/${count}: every cold check completes with every requested row mounted`);
  for(const row of after)assert.ok(row.total<=before.find(b=>b.sample===row.sample).total+2,`${mode}/${count}/${row.sample}: paired cold build exceeds current main +2ms`);
  assert.ok(median(after.map(r=>r.total))<=median(before.map(r=>r.total))+2,`${mode}/${count}: median cold build exceeds current main +2ms`);
}
console.log('PASS cold fully mounted ordinary/coordinator 30/60 rows: every sample completes, paired and median build <= current main +2ms; '+root);
