// Opt-in native JS/element-build benchmark, not paint/input timing. No desktop
// connection, Core, terminal, credentials or live home. Every requested row is
// built: ordinary uses real renderPulls; coordinator deliberately bypasses pages.
import assert from 'node:assert/strict';
import fs from 'node:fs';import path from 'node:path';import cp from 'node:child_process';
import {build} from './build.mjs';import {temporaryMod} from './temporary-mod.mjs';
import {mountedRows} from '../tests/support/git-row-budget.mjs';
if(!process.argv.includes('--run')||process.platform!=='win32')throw Error('Explicit Windows opt-in required: --run [--scrolled]');
const executable=process.env.HERDR_APP_BIN??path.join(process.env.LOCALAPPDATA,'Programs/herdr-app/herdr-app.exe');
const baseline=cp.execFileSync('git',['show','fc0dfde:src/plugins/git/mod/main.js'],{encoding:'utf8'});
const current=fs.readFileSync('src/plugins/git/mod/main.js','utf8'),{output}=build();
const root=path.resolve('.artifacts/git-row-render-budget');fs.mkdirSync(root,{recursive:true});
const modes=['ordinary','coordinator',...(process.argv.includes('--scrolled')?['ordinary-scrolled']:[])],results=[];
for(const mode of modes)for(const variant of ['baseline','current'])for(const count of [30,60,100,200])for(let sample=0;sample<3;sample++) {
  const home=fs.mkdtempSync(path.join(root,'run-')),dir=path.join(home,'mods/custom-changes'),dispose=temporaryMod(home,'custom-changes');
  try {
    fs.cpSync(path.join(output,'mods/custom-changes'),dir,{recursive:true});
    fs.writeFileSync(path.join(dir,'changes-view.js'),variant==='baseline'?baseline:current);
    const coordinator=mode==='coordinator',fact=mountedRows(1,coordinator)[0],stem=fact.title.slice(0,-1);
    fs.writeFileSync(path.join(dir,'main.js'),`import Changes from './changes-view.js';import {v_flex} from 'gpui-base';import {theme} from './host.js';
export default class Fixture extends Changes {
 init(){this.resetRepository();this.context='${coordinator?'tasks:fixture':'ordinary'}';this.root='/fixture';this.repo={name:'owner/repo'};this.view='open';this.agentPull=-1;this.aggregate={target:()=>null};this.agentLinks={related:()=>null};
 const fact=${JSON.stringify(fact)};this.rows=Array.from({length:${count}},(_,i)=>({...fact,number:i+1,title:${JSON.stringify(stem)}+i,meta:'#'+(i+1),${coordinator?"key:'owner/repo#'+(i+1),":''}}));this.pulls.open=this.rows;
 ${mode==='ordinary-scrolled'?`this.pullViewport={context:this.context,state:'open',first:${Math.max(0,count-8)},count:8};`:''}
 this.probes=0;if(this.claimPullProbe){const claim=this.claimPullProbe;this.claimPullProbe=(...args)=>{const result=claim.apply(this,args);if(result!=null)this.probes++;return result;};}}
 shown(){return true;}
 render(){const started=Date.now();this.beginPullRender?.();this.pullTextPending??=new Set();const t=theme();
 const tree=${coordinator?'v_flex().w(390).children(this.rows.map(pr=>this.pullRow(t,pr)))':'this.renderPulls(t)'};
 console.error('PROFILE '+JSON.stringify({mode:'${mode}',variant:'${variant}',count:${count},sample:${sample},mounted:this.rows.length,total:Date.now()-started,probes:${variant==='baseline'?'null':'this.probes'}}));return tree;}
}
`);
    const check=cp.spawnSync(executable,['check',dir],{encoding:'utf8',timeout:30000,windowsHide:true,env:{...process.env,HERDR_APP_HOME:home}});
    const log=[check.stdout,check.stderr].filter(Boolean).join('\n');fs.writeFileSync(path.join(root,`${mode}-${variant}-${count}-${sample}.log`),log);
    const match=log.match(/PROFILE (\{[^\n]+\})/),record=match?{...JSON.parse(match[1]),exit:check.status}:{mode,variant,count,sample,exit:check.status,interrupted:/interrupted/.test(log)};
    results.push(record);console.log(JSON.stringify(record));
  } finally {dispose();fs.rmSync(home,{recursive:true,force:true});}
}
fs.writeFileSync(path.join(root,'results.json'),JSON.stringify(results,null,2)+'\n');
const median=values=>[...values].sort((a,b)=>a-b)[Math.floor(values.length/2)];
for(const mode of modes)for(const count of [30,60,100,200]) {
  const before=results.filter(r=>r.mode===mode&&r.variant==='baseline'&&r.count===count),after=results.filter(r=>r.mode===mode&&r.variant==='current'&&r.count===count);
  assert.ok(after.every(r=>r.exit===0&&Number.isFinite(r.total)&&r.mounted===count&&r.probes<=4),`${mode}/${count}: every current native check must complete, with all rows and at most four probes`);
  if(count!==200) {
    assert.ok(before.every(r=>r.exit===0),`${mode}/${count}: baseline must complete`);
    const limit=Math.min(({30:10,60:17,100:26})[count],median(before.map(r=>r.total))+2);
    assert.ok(Math.max(...after.map(r=>r.total))<=limit,`${mode}/${count}: ${after.map(r=>r.total)} exceeds baseline + 2ms / ${limit}ms`);
  }
}
console.log('PASS cold fully mounted native render budget: baseline + 2ms at 30/60/100, 200 completes, four probes total. Results: '+root);
