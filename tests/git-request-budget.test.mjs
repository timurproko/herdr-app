// Deterministic transport measurement: real before/after controllers, synthetic
// GitHub responses. Counts are HTTP operations represented by each CLI command,
// not production latency or live hourly charges. No real credentials/network.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {execFileSync} from 'node:child_process';
import {loadMod} from '../tools/plugin-harness.mjs';
import {githubInvocation} from './support/github-read.mjs';
fs.mkdirSync('.artifacts/git-budget',{recursive:true});
for(const name of ['pulls','aggregate'])fs.writeFileSync(`.artifacts/git-budget/before-${name}.js`,execFileSync('git',['show',`386fcc4:src/plugins/git/mod/${name}.js`],{encoding:'utf8'}));
const urls=[],raw=new Map();
for(let number=1;number<=35;number++) {
 const repo=number<=18?'example/a':'example/b',open=number<=3||number===19||number===20,url=`https://github.com/${repo}/pull/${number}`;
 urls.push({url,terminal:open?'worker':null,historical:!open});
 raw.set(`${repo}#${number}`,{number,url,title:`Fixture ${number}`,state:open?'OPEN':'MERGED',isDraft:false,headRefOid:'head',createdAt:'2026-01-01',mergedAt:open?null:new Date(Date.now()-3600000).toISOString(),statusCheckRollup:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}],labels:[]});
}
async function measure(before) {
 const calls=[],jobs=[],timers=[],context={scope:'home',machine:null,links:urls};
 let active=true;
 const exec=async(command,args,options)=>{
  const call=githubInvocation(command,args,options);args=call.args;calls.push(args);
  if(args[0]==='pr')return {code:0,stdout:JSON.stringify(raw.get(`${args[args.indexOf('--repo')+1]}#${args[2]}`))};
  assert.equal(args[0],'api');assert.equal(args[1],'graphql');
  const repository=call.options.env.GH_REPO,query=args.find(a=>a.startsWith('query=')),numbers=[...query.matchAll(/pr(\d+):pullRequest/g)].map(m=>+m[1]),details=query.includes('contexts(');
  const values=Object.fromEntries(numbers.map(number=>{
   const pr=raw.get(`${repository}#${number}`);
   return [`pr${number}`,{...pr,statusCheckRollup:undefined,commits:{nodes:[{commit:{statusCheckRollup:{state:'SUCCESS',...(details?{contexts:{nodes:pr.statusCheckRollup,pageInfo:{hasNextPage:false}}}:{})}}}]}}];
  }));
  return {code:0,stdout:JSON.stringify({data:{repository:values}})};
 };
 const m=await loadMod({host:{exec,run(){}},modules:{'pulls.js':before?'.artifacts/git-budget/before-pulls.js':'src/plugins/git/mod/pulls.js','aggregate.js':before?'.artifacts/git-budget/before-aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}},'location.js':{location:()=>({})}},entry:'export {AggregatePulls} from "./aggregate.js";'});
 const cx={notify(){},spawn(fn){jobs.push(fn(cx));},timer:{after(ms,fn){timers.push({ms,fn});}}};
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
 const panel=new m.AggregatePulls({shown:()=>active});panel.sync(cx);await drain();
 assert.deepEqual({...panel.counts()},{open:5,closed:30});
 const measured={cold:calls.length};calls.length=0;
 panel.refresh(cx);await drain();measured.refresh=calls.length;calls.length=0;
 panel.invalidate('example/a');panel.pump(cx);await drain();measured.oneRepository=calls.length;calls.length=0;
 panel.rows('open');panel.rows('closed');measured.tabs=calls.length;
 active=false;panel.invalidate();panel.pump(cx);await drain();measured.hidden=calls.length;
 return measured;
}
const before=await measure(true),after=await measure(false);
assert.deepEqual(before,{cold:35,refresh:35,oneRepository:18,tabs:0,hidden:0});
assert.deepEqual(after,{cold:4,refresh:2,oneRepository:1,tabs:0,hidden:0});
fs.writeFileSync('.artifacts/git-budget/measured.json',JSON.stringify({before,after},null,2)+'\n');
console.log(JSON.stringify({before,after}));
console.log('PASS measured real-controller before/after 2 repositories, 5 Open / 30 Closed request budgets; final rows cached and tabs/hidden reads stay zero');
