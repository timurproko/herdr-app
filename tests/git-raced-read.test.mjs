import assert from 'node:assert/strict';
import {rowHarness,find,words,rowGeometry,t} from './support/git-row.mjs';
const tick=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
for(const field of ['head','state','draft'])for(const zoom of [1,1.3]) {
 let raced=true;const calls=[],timers=[];
 const h=await rowHarness({host:{exec:async(_cmd,args)=>{
  const query=args.find(x=>x.startsWith('query='));calls.push(query);
  if(query.includes('pullRequests(first:'))return {code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:0},pullRequests:{nodes:[{number:1,title:'Replacement',state:'OPEN',isDraft:false,headRefOid:'old',url:'https://github.com/owner/repo/pull/1',commits:{nodes:[{commit:{statusCheckRollup:{state:'PENDING'}}}]}}],pageInfo:{endCursor:null,hasNextPage:false}}}}})};
  const rollup={state:'PENDING',contexts:{nodes:[{context:'build',state:'PENDING'}],pageInfo:{hasNextPage:false}}};
  const pr={number:1,state:raced&&field==='state'?'MERGED':'OPEN',isDraft:raced&&field==='draft',headRefOid:raced&&field==='head'?'new':'old',commits:{nodes:[{commit:{statusCheckRollup:rollup}}]}};
  return {code:0,stdout:JSON.stringify({data:{repository:{pr1:pr}}})};
 }},modules:{'panel-kit.js':'src/ui/panel-kit.js'}}),p=h.panel;h.setZoom(zoom);p.shown=()=>true;p.sectionEntry=true;
 h.cx.timer={after:(delay,fn)=>{timers.push({delay,fn});return {cancel(){}};}};
 p.pulls.open=[h.facts.pullRow({number:1,title:'Last good row',state:'OPEN',headRefOid:'old',statusCheckRollup:[{context:'build',state:'PENDING'}]})];p.counts={open:1,closed:0};p.commitRepository();
 const sample=()=>{const tree=h.render(()=>p.renderPulls(t)),g=rowGeometry(tree,390,zoom,600);assert.doesNotMatch(words(tree).join(' '),/changed during|superseded|obsolete|raced/i);return {tree,y:g.get(find(tree,'pr-1')).y};};
 const before=sample();p.loadPulls('open',h.cx,true);const pending=sample();assert.equal(pending.y,before.y);await tick();
 const after=sample();assert.equal(p.pullError,null);assert.equal(p.pageError,null);assert.equal(p.pulls.open[0].title,'Last good row');assert.equal(after.y,before.y);assert.equal(calls.length,2,'No immediate retry loop');assert.equal(timers.length,1);assert.ok(timers[0].delay>0&&timers[0].delay<=10000);
 const count=calls.length;p.loadPulls('open',h.cx);await tick();assert.equal(calls.length,count,'Existing scheduled retry suppresses render-driven rereads');
 raced=false;timers[0].fn(h.cx);await tick();assert.equal(p.pulls.open[0].title,'Replacement');assert.equal(sample().y,before.y);assert.equal(p.pullError,null);assert.equal(calls.length,4);
}
console.log('PASS head/state/draft detail races keep last-good rows, no notice or y shift at 100/130%, one bounded later retry');
