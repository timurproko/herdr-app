import assert from 'node:assert/strict';
import {rowHarness,find,t} from './support/git-row.mjs';

const iso=ago=>new Date(Date.now()-ago).toISOString();
const raw=(number,state='OPEN',isDraft=false)=>({number,title:`PR ${number}`,url:`https://github.com/owner/repo/pull/${number}`,state,isDraft,author:{login:'author'},createdAt:new Date(1700000000000+number*1000).toISOString(),closedAt:state==='OPEN'?null:iso(1000),mergedAt:state==='MERGED'?iso(1000):null,headRefName:`branch-${number}`,headRefOid:`sha-${number}`,body:'- [x] done',labels:[{name:'keep',color:'abcdef'}],reviewDecision:'APPROVED',statusCheckRollup:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}]});
const graph=pr=>({...pr,commits:{nodes:[{commit:{statusCheckRollup:{state:'SUCCESS',contexts:{nodes:pr.statusCheckRollup}}}}]}});
for(const coordinator of [false,true])for(const via of ['safety','event']) {
  const data=new Map([6,5,4,3,2,1].map(number=>[number,raw(number,number<3?'CLOSED':'OPEN')]));
  let held,fail=false,reads=0;
  const context={scope:'home',machine:null,links:[...data.values()].map(pr=>({url:pr.url,terminal:pr.number===5?null:'t1',historical:pr.number===5}))};
  const jobs=[];
  const cx={notify(){},spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));},timer:{after(){}},stop_propagation(){}};
  const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
  const h=await rowHarness({host:{exec:async(_cmd,args,options)=>{
    reads++;let result;
    if(args[0]==='pr')result=data.get(Number(args[2]));
    else {
      assert.equal(options.env?.GH_REPO,'owner/repo','Thin and event GraphQL reads share repository-scoped routing');
      const query=args.find(a=>a.startsWith('query='));
      const repository={open:{totalCount:[...data.values()].filter(pr=>pr.state==='OPEN').length},closed:{totalCount:[...data.values()].filter(pr=>pr.state!=='OPEN').length}};
      if(/pr\d+:pullRequest/.test(query)) {
        for(const [,number]of query.matchAll(/pr(\d+):pullRequest/g))repository[`pr${number}`]=graph(data.get(Number(number)));
      } else if(query.includes('pullRequests(first:')) {
        const state=query.includes('states:[OPEN]')?'OPEN':'CLOSED';
        const nodes=[...data.values()].filter(pr=>(pr.state==='OPEN')===(state==='OPEN')).map(graph);
        repository.pullRequests={nodes,totalCount:nodes.length,pageInfo:{hasNextPage:false,endCursor:'end'}};
      }
      result={data:{repository}};
    }
    const stdout=JSON.stringify(result);
    if(held && (!coordinator || via==='safety' || args.some(a=>a.includes('pr5:pullRequest')))){const hold=held;held=null;await new Promise(resolve=>hold.release=resolve);}
    return {code:fail?1:0,stdout,stderr:fail?'connection refused':''};
  }},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
  const {panel,facts}=h;panel.agentPull=5;panel.aggregate=null;panel.repo.owner='owner';
  panel.pulls.open=[6,5,4,3].map(n=>facts.pullRow(data.get(n),'owner'));panel.pulls.closed=[2,1].map(n=>facts.pullRow(data.get(n),'owner'));panel.counts={open:4,closed:2};
  if(coordinator) {
    panel.context='tasks:home';panel.aggregate=new h.AggregatePulls({shown:()=>true});panel.aggregate.context=context;
    for(const pr of [...panel.pulls.open,...panel.pulls.closed]) {
      pr.key=`owner/repo#${pr.number}`;pr.repo='owner/repo';
      panel.aggregate.entries.set(pr.key,{pr,completedAt:Date.parse(pr.closedAt),dirty:false,link:{repo:pr.repo,number:pr.number,key:pr.key,targets:[{terminal:pr.number===5?null:'t1',historical:pr.number===5}]}});
    }
  }
  const rows=state=>coordinator?panel.aggregate.rows(state):panel.pulls[state];
  const counts=()=>coordinator?panel.aggregate.counts():panel.counts;
  const snapshot=()=>({open:rows('open').map(pr=>[pr.number,pr.state]),closed:rows('closed').map(pr=>[pr.number,pr.state]),counts:{...counts()}});
  const refresh=async()=>{
    if(via==='event') {
      if(coordinator){panel.aggregate.invalidate();panel.aggregate.pump(cx);}else panel.queueWebhook({repository:'owner/repo'},cx);
      await drain();
    } else {
      // Include the current selected tab and active older pin, exactly as the scheduler does.
      const state=panel.view;const selection=rows(state);
      await panel.readPendingChecks({name:'owner/repo',rows:selection},cx,()=>true);await drain();
    }
  };
  const before=snapshot(),hold=held={};data.set(5,raw(5,'MERGED'));
  const pending=refresh();for(let i=0;i<40;i++)await Promise.resolve();
  assert.equal(typeof hold.release,'function');assert.deepEqual(snapshot(),before,'No clear-to-empty while replacement facts are pending');
  hold.release();await pending;
  assert.equal(rows('open').some(pr=>pr.number===5),false,`${coordinator}/${via}: a settled merged PR must leave Open`);
  assert.equal(rows('closed').find(pr=>pr.number===5)?.state,'merged');
  assert.deepEqual({...counts()},{open:3,closed:3});
  assert.deepEqual(Array.from(rows('open'),pr=>pr.number),[6,4,3]);
  assert.deepEqual(Array.from(rows('closed'),pr=>pr.number),[5,2,1]);
  let row=rows('closed').find(pr=>pr.number===5);
  assert.match(row.when,/^merged /);assert.equal(row.labels[0].name,'keep');assert.equal(row.tasks.done,1);assert.equal(row.review,'approved');
  if(coordinator)assert.equal(panel.aggregate.target(row),null,'Historical rows do not acquire a robot');

  // Inject contradictory authoritative evidence for this final fact; generic
  // events alone intentionally reuse final session history.
  panel.view=via==='safety'?'closed':'open';data.set(5,raw(5));facts.gitReads(h.transport).facts.clear();
  if(coordinator)panel.aggregate.entries.get('owner/repo#5').dirty=true;
  await refresh();
  assert.deepEqual({...counts()},{open:4,closed:2});assert.deepEqual(Array.from(rows('open'),pr=>pr.number),[6,5,4,3]);
  panel.view='open';data.set(5,raw(5,'OPEN',true));await refresh();
  assert.equal(rows('open').find(pr=>pr.number===5)?.state,'draft');assert.deepEqual({...counts()},{open:4,closed:2});
  data.set(5,raw(5,'CLOSED'));await refresh();
  assert.equal(rows('closed').find(pr=>pr.number===5)?.state,'closed');assert.deepEqual({...counts()},{open:3,closed:3});
  const last=snapshot();fail=true;await refresh();assert.deepEqual(snapshot(),last,'Failures retain coherent rows and counts');fail=false;
  // All row states share the same renderer, including a retained historical row.
  row=rows('closed').find(pr=>pr.number===5);assert.ok(find(panel.pullRow(t,row),`pr-${row.key??5}`));
  assert.ok(reads>0);
}
console.log('PASS ordinary/coordinator event+safety merge/close/reopen/draft transitions, coherent totals, history timestamps, retained render/order and metadata (fake GitHub)');
