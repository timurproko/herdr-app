import assert from 'node:assert/strict';
import {rowHarness,find,t,words} from './support/git-row.mjs';
import {RepositoryDisclosure,DISCLOSURE_KEY} from '../src/plugins/git/mod/repository-disclosure.js';

const storage=()=>{const data=new Map();return {getItem:key=>data.get(key)??null,setItem:(key,value)=>data.set(key,value)};};
const raw=(number,repo='owner/repo',state='OPEN')=>({number,title:`PR ${number}`,url:`https://github.com/${repo}/pull/${number}`,state,isDraft:false,
  author:{login:'author'},createdAt:new Date(1700000000000+number*1000).toISOString(),closedAt:state==='OPEN'?null:new Date().toISOString(),
  headRefName:`branch-${number}`,headRefOid:`head-${number}`,body:'- [x] done\n- [ ] later',labels:{nodes:[{name:'🤖 Review',color:'840479'}]},
  commits:{nodes:[{commit:{statusCheckRollup:{state:'PENDING',contexts:{nodes:[{name:'CI',status:'IN_PROGRESS'}],pageInfo:{hasNextPage:false}}}}}]}});

async function fixture({collapsed=false,coordinator=false}={}) {
  const saved=storage(),folds=new RepositoryDisclosure(saved);if(collapsed)folds.toggleAll();
  const calls=[],data=new Map([1,2,3,4].map(n=>[n,raw(n)])),jobs=[],timers=[];
  let hold=null,enabled=true,shown=true;
  const context={scope:'quiet',parent:'parent',machine:null,links:[]};
  const h=await rowHarness({globals:{localStorage:saved},host:{exec:async(command,args,options)=>{
    if(command==='git')return {code:0,stdout:args[0]==='rev-parse'?'/repo':'branch-1'};
    const query=args.find(arg=>arg.startsWith('query='))??'',repo=options.env?.GH_REPO??'owner/repo';
    const call={args,query,repo};calls.push(call);
    if(hold?.when(call)){const gate=hold;hold=null;await new Promise(resolve=>gate.release=resolve);}
    if(args[0]==='repo')return {code:0,stdout:JSON.stringify({nameWithOwner:repo})};
    const repository={open:{totalCount:4},closed:{totalCount:0}};
    if(query.includes('pullRequests(first:'))repository.pullRequests={nodes:[...data.values()],totalCount:4,pageInfo:{hasNextPage:false,endCursor:null}};
    else for(const [,number]of query.matchAll(/pr(\d+):pullRequest/g))repository[`pr${number}`]=data.get(Number(number));
    return {code:0,stdout:JSON.stringify({data:{repository}})};
  }},modules:{...(coordinator?{'aggregate.js':'src/plugins/git/mod/aggregate.js'}:{}),
    'plugins.js':{sidebarPanelEnabled:()=>enabled,pluginPullContext:()=>coordinator?context:null,pluginEvent(){}}}});
  const {panel:p}=h;
  const cx={notify(){},stop_propagation(){},spawn(fn){const job=Promise.resolve().then(()=>fn(cx));jobs.push(job);return {is_done:()=>false};},timer:{after(ms,fn){timers.push({ms,fn});return {cancel(){}};},every(){}}};
  const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
  Object.assign(p,{foldedRepositories:folds,sectionEntry:true,shown:()=>shown&&enabled,agentPull:null});
  p.agentLinks.refresh=()=>{};p.notices={sync(){},stop(){}};
  const rows=[1,2,3,4].map(n=>h.facts.pullRow(data.get(n),'owner'));
  p.pulls={open:rows,closed:[]};p.counts={open:4,closed:0};
  const fold=repo=>{folds.toggle(repo);p.invalidateDisclosure();};
  return {...h,p,cx,calls,data,rows,context,folds,saved,fold,drain,timers,hold:when=>{const gate={when};hold=gate;return gate;},setShown:value=>shown=value,setEnabled:value=>enabled=value};
}

// Real ordinary controllers: no panel PR work without a pin, under either tab.
for(const view of ['open','closed']) {
  const f=await fixture({collapsed:true}),{p,cx,calls}=f;p.view=view;
  p.loadPulls(view,cx,true);p.morePulls(view,cx);p.queueWebhook({repository:'owner/repo'},cx);
  await p.readPendingChecks({name:'owner/repo',rows:f.rows},cx,()=>true);await f.drain();
  assert.equal(calls.length,0);assert.equal(p.pullsDue(view),false);
  assert.equal(p.fallbackSnapshot().repositories[0].rows.length,0);
}
console.log('PASS ordinary collapsed Open/Closed manual, append, events and safety start no group reads');

for(const view of ['open','closed']) {
  const f=await fixture({collapsed:true}),{p,cx,calls,data}=f;p.agentPull=1;p.view=view;
  const counts=p.counts,pages=p.pages,siblings=p.pulls.open;
  data.set(1,{...raw(1),body:'- [x] done\n- [x] later',labels:{nodes:[{name:'🤖 Approved',color:'008000'}]}});
  p.queueWebhook({repository:'owner/repo'},cx);await f.drain();
  assert.ok(calls.length>0);assert.ok(calls.every(c=>!c.query.includes('pullRequests(')&&[...c.query.matchAll(/pr(\d+):pullRequest/g)].every(m=>m[1]==='1')));
  assert.equal(p.relatedPull.tasks.done,2);assert.equal(p.relatedPull.stage,'approved');assert.equal(p.relatedPull.checks.state,'pending');
  assert.equal(p.counts,counts);assert.equal(p.pages,pages);assert.equal(p.pulls.open,siblings);
  p.view='open';assert.equal(p.pullSelection().active,p.relatedPull);
  assert.deepEqual(Array.from(p.fallbackSnapshot().repositories[0].rows,pr=>pr.number),[1]);
  const header=f.render(()=>p.renderPulls(t));assert.equal(words(find(header,'task-repo-count-owner/repo')).join(''),'3');
  calls.length=0;
  data.set(1,raw(1,'owner/repo','MERGED'));
  await p.readPendingChecks({name:'owner/repo',rows:f.rows},cx,()=>true);await f.drain();
  assert.ok(calls.every(c=>!c.query.includes('pullRequests(')&&!c.query.includes('pr2:')));
  assert.equal(p.counts,counts);assert.equal(p.pulls.open,siblings);
  assert.equal(p.pullSelection().liveRows.some(pr=>pr.number===1),false);
  p.view='closed';assert.equal(p.pullSelection().active.state,'merged');
  // A new explicit older PR does not download intervening pages.
  p.agentPull=99;data.set(99,raw(99));p.loadRelatedPull(cx);await f.drain();assert.equal(p.relatedPull.number,99);
  assert.ok(calls.every(c=>!c.query.includes('pullRequests(')));
}
console.log('PASS collapsed pin-only events/safety, tasks/checks/stage/state, frozen siblings/counts/cursors and older pin');

for(const expandAgain of [false,true]) {
  const f=await fixture(),{p,cx,calls}=f;
  const held=f.hold(c=>c.query.includes('pullRequests(first:'));
  p.loadPulls('open',cx,true);for(let i=0;i<30&&!held.release;i++)await Promise.resolve();assert.ok(held.release);
  f.fold('owner/repo');if(expandAgain)f.fold('owner/repo');
  held.release();await f.drain();
  assert.equal(calls.length,1,'Retired metadata starts no detail/count/account read even after collapse-expand');
  assert.equal(p.pulls.open,f.rows,'Retired response never replaces the frozen snapshot');
}
console.log('PASS collapse during ordinary metadata and collapse-expand retire follow-ups/publication');

// A stale selected agent cannot publish its held targeted response.
{
  const f=await fixture({collapsed:true}),{p,cx}=f;p.agentPull=1;
  const held=f.hold(c=>c.query.includes('pr1:'));p.loadRelatedPull(cx,true);
  for(let i=0;i<30&&!held.release;i++)await Promise.resolve();assert.ok(held.release);
  p.agentPull=2;held.release();await f.drain();assert.notEqual(p.relatedPull?.number,1);
}
console.log('PASS obsolete pin replies cannot overwrite another selected PR');

async function coordinatorFixture(options={}) {
  const f=await fixture({coordinator:true,...options}),{p,context,data,cx}=f;
  data.set(101,raw(101,'other/repo'));
  context.links=[...data.values()].map(pr=>({url:pr.url,terminal:'worker'}));
  p.context='tasks:quiet';
  const aggregate=p.aggregate=new f.AggregatePulls({shown:()=>p.shown(),readToken:repo=>p.groupReadToken(repo)});
  aggregate.sync(cx);return {...f,aggregate};
}

for(const view of ['open','closed']) {
  const f=await coordinatorFixture({collapsed:true}),{p,aggregate:a,cx,calls}=f;p.view=view;
  a.refresh(cx);a.invalidate();a.pump(cx);await f.drain();
  assert.equal(calls.length,0);assert.equal(a.waiting,false);assert.equal(a.updating,false);assert.equal(a.busy,false);
  assert.equal(a.deferredUnknown,true);assert.equal(a.presentationRows(view).length,0);
  assert.equal(a.counts().open,null,'Unread folded identities do not invent totals');
  // An expanded exception loads while the other unknown folded repository is deferred.
  f.fold('other/repo');a.pump(cx);await f.drain();
  assert.ok(calls.length>0);assert.ok(calls.every(c=>c.repo==='other/repo'));
  assert.equal(a.waiting,false);assert.equal(a.presentationRows('open').length,1);
  assert.equal(a.presentationRows('open')[0].repo,'other/repo');
}
console.log('PASS coordinator saved folds, filter-hidden groups and cold mixed publication without blocked siblings');

{
  const f=await coordinatorFixture(),{p,aggregate:a,cx,calls,context,data}=f;await f.drain();
  assert.equal(a.presentationRows('open').length,5);
  f.fold('owner/repo');a.pump(cx);calls.length=0;
  const before=Array.from(a.presentationRows('open').filter(pr=>pr.repo==='owner/repo'),pr=>pr.number);
  context.links=context.links.filter(link=>!link.url.endsWith('/1'));
  data.set(5,raw(5));context.links.push({url:data.get(5).url,terminal:'worker'});
  a.sync(cx);a.refresh(cx);a.invalidate('owner/repo');a.pump(cx);await f.drain();
  assert.ok(calls.every(c=>c.repo==='other/repo'));
  assert.deepEqual(Array.from(a.presentationRows('open').filter(pr=>pr.repo==='owner/repo'),pr=>pr.number),before);
  assert.equal(a.entries.has('owner/repo#1'),false,'Frozen presentation does not restore removed action membership');
  const sections=p.repositorySections();assert.equal(sections.find(s=>s.repo==='owner/repo').rows.length,4);
  assert.equal(a.dirty,false);assert.equal(a.updating,false);
  // A new group hidden by the selected filter still obeys the global choice.
  f.folds.toggleAll();p.invalidateDisclosure();a.pump(cx);await f.drain();calls.length=0;
  data.set(201,raw(201,'hidden/repo','CLOSED'));context.links.push({url:data.get(201).url,historical:true});
  p.view='open';a.sync(cx);await f.drain();assert.equal(calls.length,0);
  a.invalidate();a.pump(cx);await f.drain();assert.equal(calls.length,0);
}
console.log('PASS coordinator frozen counts/membership presentation, independent siblings and hidden new links');

for(const expandAgain of [false,true]) {
  const f=await fixture({coordinator:true}),{p,cx,calls,context}=f;
  context.links=[{url:raw(1).url,terminal:'worker'},{url:raw(2).url,terminal:'worker'}];p.context='tasks:quiet';
  const a=p.aggregate=new f.AggregatePulls({shown:()=>p.shown(),readToken:repo=>p.groupReadToken(repo)});
  const held=f.hold(c=>c.query.includes('title'));a.sync(cx);
  for(let i=0;i<60&&!held.release;i++)await Promise.resolve();assert.ok(held.release);
  f.fold('owner/repo');if(expandAgain)f.fold('owner/repo');
  held.release();await f.drain();
  if(expandAgain) {
    assert.equal(calls.filter(c=>c.query.includes('title')).length,2,'Expansion needs a current metadata read');
    assert.equal(a.presentationRows('open').length,2);
  } else {assert.equal(calls.length,1,'Collapsed aliases cannot start details/diagnosis');assert.equal(a.waiting,false);}
}
console.log('PASS coordinator held metadata, collapsed follow-up retirement and collapse-expand generation');

{
  const f=await coordinatorFixture(),{aggregate:a,cx,calls}=f;await f.drain();
  const entry=a.entries.get('owner/repo#4');entry.pr={...entry.pr,state:'merged',closedAt:new Date().toISOString()};entry.link.targets=[{historical:true}];entry.completedAt=Date.now();
  a.rememberCounts();f.fold('owner/repo');a.pump(cx);const frozen=a.presentationRows('closed').length;
  entry.completedAt-=25*60*60*1000;a.sync(cx);await f.drain();assert.equal(a.presentationRows('closed').length,frozen);
  for(const retire of [()=>f.setShown(false),()=>f.setEnabled(false),()=>{f.context.stale=true;}]) {
    retire();calls.length=0;a.invalidate();a.pump(cx);await f.drain();assert.equal(calls.length,0);
  }
}
console.log('PASS folded history presentation ages quietly and hidden/disabled/unverified scopes do no new reads');
