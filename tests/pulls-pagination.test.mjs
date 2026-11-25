// Real ordinary controller and new GraphQL transport, not per-PR CLI mocks.
// Covers cursor paging, both tabs, final-cache hydration, pins, errors, obsolete
// replies and scoped totals. Native scrolling/motion have separate fixtures.
import assert from 'node:assert/strict';
import {rowHarness,find,t} from './support/git-row.mjs';
import {ordinaryContent} from './support/git-scroll.mjs';
const raw=(n,state='OPEN')=>({number:n,url:`https://github.com/owner/repo/pull/${n}`,title:`PR ${n}`,state,isDraft:false,headRefOid:`sha-${n}`,createdAt:new Date(1700000000000+n*1000).toISOString(),mergedAt:state==='MERGED'?new Date().toISOString():null,closedAt:state==='OPEN'?null:new Date().toISOString(),labels:{nodes:[{name:'label',color:'840479'}]},author:{login:'fixture'},body:'- [x] done'});
async function harness() {
 const data=new Map([...Array.from({length:50},(_,i)=>raw(i+1)),...Array.from({length:30},(_,i)=>raw(i+51,'MERGED')),raw(908)].map(pr=>[pr.number,pr]));
 const calls=[],jobs=[],timers=[];let hold=null,failed=false,shown=true,enabled=true;
 const h=await rowHarness({host:{layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),exec:async(_cmd,args,options)=>{
  assert.equal(options.env.GH_REPO,'owner/repo');const query=args.find(a=>a.startsWith('query='));calls.push(args);
  const failure=typeof failed==='function'?failed(query):failed?{code:1,stderr:'connection refused'}:null;
  if(failure)return failure;
  const repository={open:{totalCount:[...data.values()].filter(pr=>pr.state==='OPEN').length},closed:{totalCount:[...data.values()].filter(pr=>pr.state!=='OPEN').length}};
  const value=pr=>({...pr,commits:{nodes:[{commit:{statusCheckRollup:{state:'SUCCESS',...(query.includes('contexts(')?{contexts:{nodes:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}],pageInfo:{hasNextPage:false}}}:{})}}}]}});
  if(query.includes('pullRequests(first:')) {
   const closed=query.includes('after:$after,states:[CLOSED,MERGED]'),after=Number(args.find(a=>a.startsWith('after='))?.slice(6)??0),all=[...data.values()].filter(pr=>pr.number!==908 && (pr.state!=='OPEN')===closed),slice=all.slice(after,after+10);
   repository.pullRequests={totalCount:all.length,nodes:slice.map(pr=>closed?{number:pr.number}:value(pr)),pageInfo:{endCursor:String(after+slice.length),hasNextPage:after+slice.length<all.length}};
   if(closed)assert.ok(!query.includes(' title ')&&!query.includes('contexts('),'Closed page asks only membership, never unchanged row details');
  } else for(const [,n]of query.matchAll(/pr(\d+):pullRequest/g))repository[`pr${n}`]=value(data.get(+n));
  const stdout=JSON.stringify({data:{repository}});
  if(hold) {const pending=hold;hold=null;await new Promise(resolve=>pending.release=resolve);}
  return {code:0,stdout};
 }},modules:{'plugins.js':{sidebarPanelEnabled:()=>enabled}}});
 const cx={...h.cx,timer:{after:(ms,fn)=>timers.push({ms,fn})},spawn(fn){jobs.push(fn(cx));}};
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));for(let i=0;i<30;i++)await Promise.resolve();};
 h.panel.aggregate=null;h.panel.repo.owner='owner';
 return {...h,cx,data,calls,timers,drain,hold(){return hold={};},fail(value){failed=value;},hide(){shown=false;},disable(){enabled=false;}};
}
for(const state of ['open','closed']) {
 const h=await harness(),v=h.panel;v.view=state;
 v.loadPulls(state,h.cx,true);await h.drain();
 assert.equal(v.pulls[state].length,10);assert.equal(v.pages[state].cursor,'10');assert.equal(v.pages[state].hasMore,true);assert.equal(v.pullLoading,false);
 assert.equal(v.counts.open,51);assert.equal(v.counts.closed,30);
 assert.ok(v.pulls[state].every(pr=>pr.labels[0].name==='label' && pr.checks.label==='1/1'));
 const loaded=v.pulls[state];
 h.fail(true);v.morePulls(state,h.cx);await h.drain();assert.equal(v.pulls[state],loaded);assert.ok(v.pageError);assert.equal(v.pages[state].cursor,'10');
 h.fail(false);v.morePulls(state,h.cx);v.morePulls(state,h.cx);await h.drain();
 assert.equal(v.pulls[state].length,20);assert.equal(v.pages[state].cursor,'20');assert.equal(v.pages[state].expanded,true);
 v.agentPull=state==='open'?5:55;
 assert.ok(find(v.renderPulls(t),'active-pull'),'Pin stays outside the scroller');
 const before=h.calls.length;v.loadPulls(state,h.cx,true);assert.equal(v.pulls[state].length,20,'Pending manual refresh retains loaded depth');await h.drain();assert.equal(v.pulls[state].length,10);
 if(state==='closed')assert.equal(h.calls.length-before,1,'Warm Closed manual refresh only reconciles membership; all final details are cached');
 v.morePulls(state,h.cx);await h.drain();v.morePulls(state,h.cx);await h.drain();
 if(state==='closed') {assert.equal(v.pages[state].hasMore,false);const done=h.calls.length;v.morePulls(state,h.cx);await h.drain();assert.equal(h.calls.length,done);}
 assert.ok(h.calls.every(args=>!args.some(a=>a.startsWith('query=')&&a.includes('totalCount')&&!a.includes('pullRequests(first:'))),'Complete page totals do not start separate count reads');
}
{
 const h=await harness(),v=h.panel;v.view='closed';v.loadPulls('closed',h.cx,true);await h.drain();
 v.view='open';v.loadPulls('open',h.cx,true);await h.drain();const closed=v.pulls.closed,at=h.calls.length;
 v.queueWebhook({repository:'owner/repo'},h.cx);await h.drain();
 assert.ok(v.pulls.closed.every((pr,i)=>pr===closed[i]),'Hidden Closed row facts retain identity');assert.ok(h.calls.slice(at).every(args=>!args.some(a=>a.includes('after:$after,states:[CLOSED,MERGED]'))),'Open refresh never rereads hidden Closed pages');
 assert.equal(h.calls.length-at,1,'Unchanged Open head/summary reuses checks');
 v.agentPull=908;v.relatedKey=null;v.loadRelatedPull(h.cx);await h.drain();assert.equal(v.relatedPull.number,908);assert.equal(v.pulls.open.length,10,'Older lookup never loads intermediate pages');
 h.data.set(908,raw(908,'MERGED'));v.queueWebhook({repository:'owner/repo'},h.cx);await h.drain();assert.equal(v.relatedPull.state,'merged');
 const final=h.calls.length;v.relatedKey=null;v.loadRelatedPull(h.cx);await h.drain();assert.equal(h.calls.length,final,'Final older pin uses the session cache');
 // A formerly Open row leaving the new Open page gets a narrow transition
 // read, not a Closed-tab refresh, and moves coherently into loaded Closed.
 h.data.set(5,raw(5,'MERGED'));v.agentPull=5;v.queueWebhook({repository:'owner/repo'},h.cx);await h.drain();
 assert.equal(v.pulls.open.some(pr=>pr.number===5),false);assert.equal(v.pulls.closed.find(pr=>pr.number===5)?.state,'merged');assert.equal(v.counts.closed,32);
}
for(const state of ['open','closed']) {
 const h=await harness(),v=h.panel;v.view=state;v.loadPulls(state,h.cx,true);await h.drain();
 const scroll=(bottom,delta=-40)=>{
  const tree=h.render(()=>v.renderPulls(t)),content=ordinaryContent(tree),frame=find(tree,'pulls-scroll-frame');
  const event={position:{x:10,y:500},delta:{y:delta},bounds:{y:bottom-1000,height:1000}};
  content.attrs.on_scroll_wheel[0](event,h.cx);frame.attrs.on_scroll_wheel[0]({...event,bounds:{y:0,height:600}},h.cx);
 };
 const before=h.calls.length;scroll(1200);scroll(650,40);await h.drain();assert.equal(h.calls.length,before,'Top/upward scroll never fetches');
 scroll(650);scroll(650);v.morePulls(state,h.cx);await h.drain();assert.equal(v.pulls[state].length,20,'Bottom wheel bursts and clicks share one page');
 assert.equal(v.pullsDue(state),false,'Context TTL cannot discard expanded rows');
 const cursor=v.pages[state].cursor;v.view=state==='open'?'closed':'open';v.morePulls(state,h.cx);await h.drain();assert.equal(v.pages[state].cursor,cursor,'Hidden-tab callbacks cannot page');
}
{
 const h=await harness(),v=h.panel;v.loadPulls('open',h.cx,true);await h.drain();v.agentPull=5;
 const rows=v.pulls.open,counts=v.counts,pages=v.pages.open;
 h.data.set(5,{...h.data.get(5),headRefOid:'changed'});
 h.fail(query=>query.includes('contexts(')?{code:1,stderr:'GraphQL: API rate limit exceeded'}:null);
 v.queueWebhook({repository:'owner/repo'},h.cx);await h.drain();
 assert.equal(v.pulls.open,rows);assert.equal(v.counts,counts);assert.equal(v.pages.open,pages);assert.equal(v.pullError,null,'Refused detail preserves the complete previous snapshot, not a partial replacement');
 assert.ok(find(h.render(()=>v.renderPulls(t)),'active-pull'),'The refused replacement never unmounts the pin');
 h.fail(()=>({code:1,stderr:'secondary rate limit'}));v.manualRead={remaining:1};v.readWake=null;
 const before=h.calls.length;v.loadPulls('open',h.cx,true);await h.drain();
 assert.equal(h.calls.length-before,1,'Manual Refresh during cooldown attempts exactly one API read when refused');assert.equal(v.pullError,null);assert.equal(v.pulls.open,rows);
}
for(const refusal of ['HTTP 404: Not Found','HTTP 403: Resource not accessible by integration'])for(const change of ['hidden','disabled','folder','repository','repository-name','machine']) {
 const h=await harness(),v=h.panel;h.fail(()=>({code:1,stderr:refusal}));
 // Queue behind another repository operation, then retire the captured context
 // before dispatch. Neither the refused snapshot nor an account probe may start.
 const reads=h.facts.gitReads(h.transport);let release;
 const ahead=reads.read('held','owner/repo',{},()=>new Promise(resolve=>release=resolve));
 v.loadPulls('open',h.cx,true);for(let i=0;i<20;i++)await Promise.resolve();
 if(change==='hidden')h.hide();if(change==='disabled')h.disable();if(change==='folder')h.place.cwd='/other';if(change==='repository')v.repo={name:'other/repo'};if(change==='repository-name')v.repo.name='other/repo';if(change==='machine')h.place.on='peer';
 release({code:0});await ahead;await h.drain();assert.equal(h.calls.length,0);assert.equal(v.pullError,null);
}
for(const change of ['hidden','disabled','folder','repository','machine']) {
 const h=await harness(),v=h.panel;v.pulls.open=[];const held=h.hold();v.loadPulls('open',h.cx,true);for(let i=0;i<20;i++)await Promise.resolve();assert.equal(typeof held.release,'function');
 if(change==='hidden')h.hide();if(change==='disabled')h.disable();if(change==='folder')h.place.cwd='/other';if(change==='repository')v.repo={name:'other/repo'};if(change==='machine')h.place.on='peer';
 held.release();await h.drain();assert.equal(v.pulls.open.length,0);assert.equal(h.calls.length,1,'An obsolete snapshot starts no detail/account follow-up');assert.equal(v.pullError,null);
}
console.log('PASS real GraphQL Open/Closed paging, final membership hydration, totals, retained page errors, no hidden Closed rereads, older pins, transitions and obsolete follow-up guards');
