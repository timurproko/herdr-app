import assert from 'node:assert/strict';
import {rowHarness,find,nodes,t} from './support/git-row.mjs';

let now=0,held,requests=[];
const factsByKey=new Map(),context={scope:'paged-home',machine:null,links:[]};
const jobs=[],timers=[];
const cx={notify(){},stop_propagation(){},spawn(fn){jobs.push(fn(cx));},timer:{after(ms,fn){timers.push({at:now+ms,fn});}}};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const tick=async()=>{for(let i=0;i<60;i++)await Promise.resolve();};
const h=await rowHarness({host:{exec:async(command,args,options)=>{
  assert.equal(command,'gh');assert.equal(args[0],'api');
  const query=args.find(arg=>arg.startsWith('query='));assert.ok(query);
  const repo=options.env?.GH_REPO;assert.ok(['owner/a','owner/b'].includes(repo),'Probes use the actual per-call repository transport');
  assert.equal(query.includes('contexts('),false,'Unchanged settled rows stay thin');
  const numbers=Array.from(query.matchAll(/pr(\d+):pullRequest/g),match=>Number(match[1]));
  requests.push({repo,numbers});
  const repository={};
  for(const number of numbers){const pr=factsByKey.get(`${repo}#${number}`);repository[`pr${number}`]={number,state:pr.state,isDraft:pr.isDraft,headRefOid:pr.headRefOid,mergedAt:pr.mergedAt,closedAt:pr.closedAt,commits:{nodes:[{commit:{statusCheckRollup:{state:'SUCCESS'}}}]}};}
  const stdout=JSON.stringify({data:{repository}});
  if(held){const hold=held;held=null;await new Promise(resolve=>hold.release=resolve);}
  return {code:0,stdout};
}},modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){}}}});
const {panel,facts,AggregatePulls}=h;
panel.shown=()=>true;panel.context='tasks:paged-home';panel.aggregate=new AggregatePulls({shown:()=>true});panel.aggregate.context=context;
panel.notices={active:true,members:new Map(),sync(){return null;},presentation(){return null;}};
panel.enrollmentPicker={render(){return null;},stop(){}};
for(const number of [...Array.from({length:25},(_,i)=>i+1),101,102,103,104,105]) {
  const repo=number<=12||number>100?'owner/a':'owner/b',closed=number>100;
  const value={number,title:`PR ${number}`,url:`https://github.com/${repo}/pull/${number}`,state:closed?'CLOSED':'OPEN',isDraft:false,headRefOid:`head-${number}`,createdAt:new Date(1700000000000+number*1000).toISOString(),closedAt:closed?new Date(Date.now()-1000).toISOString():null,mergedAt:null,statusCheckRollup:[{name:'CI',status:'COMPLETED',conclusion:'SUCCESS'}]};
  factsByKey.set(`${repo}#${number}`,value);context.links.push({url:value.url,historical:true,terminal:null});
  const pr={...facts.pullRow(value,'owner'),key:`${repo}#${number}`,repo};
  panel.aggregate.entries.set(pr.key,{pr,dirty:false,completedAt:Date.parse(pr.closedAt),link:{key:pr.key,repo,number,targets:[{historical:true,terminal:null}]}});
}
panel.checksFallback=new facts.ChecksFallback({now:()=>now,snapshot:()=>panel.fallbackSnapshot(),read:(...args)=>panel.readPendingChecks(...args)});
const render=()=>panel.renderAggregate(cx,t);
const advance=async ms=>{const end=now+ms;while(true){timers.sort((a,b)=>a.at-b.at);if(!timers.length||timers[0].at>end)break;const timer=timers.shift();now=timer.at;timer.fn(cx);await tick();}now=end;await tick();};
const visible=tree=>nodes(tree).filter(node=>/^pr-owner\/[ab]#\d+$/.test(node.attrs.id?.[0]??'')).map(node=>node.attrs.id[0].slice(3));
const selected=()=>Array.from(panel.fallbackSnapshot().repositories).flatMap(repo=>Array.from(repo.rows,pr=>pr.key));
let tree=render();assert.equal(visible(tree).length,9,'The first page includes its repository header');
assert.deepEqual(selected(),visible(tree),'Only the actual presentation page is safety-eligible');
assert.deepEqual({...panel.aggregate.counts()},{open:25,closed:5});
const merged=factsByKey.get('owner/a#1');merged.state='MERGED';merged.mergedAt=merged.closedAt=new Date(Date.now()-1000).toISOString();
await advance(45000);await drain();
assert.deepEqual(requests,[{repo:'owner/a',numbers:[1,2,3,4,5,6,7,8,9]}]);
assert.deepEqual({...panel.aggregate.counts()},{open:24,closed:6});
assert.equal(panel.aggregate.rows('open').some(pr=>pr.key==='owner/a#1'),false);
assert.equal(panel.aggregate.rows('closed').find(pr=>pr.key==='owner/a#1')?.state,'merged');
tree=render();const beforePage=requests.length;
find(tree,'task-pulls-more').attrs.on_click[0]({},cx);tree=render();
assert.equal(requests.length,beforePage,'Show more itself starts no read');
assert.deepEqual(selected(),visible(tree),'Continuation headers and a cross-repository page share the same selection');
const pageOne=selected(),target=pageOne[0],value=factsByKey.get(target);value.state='CLOSED';value.closedAt=new Date(Date.now()-1000).toISOString();
const hold=held={};await advance(45000);assert.equal(typeof hold.release,'function');
find(tree,'task-pulls-previous').attrs.on_click[0]({},cx);tree=render();hold.release();await drain();
assert.equal(panel.aggregate.entries.get(target).pr.state,'open','Switching pages rejects the previous page\'s held reply');
assert.deepEqual({...panel.aggregate.counts()},{open:24,closed:6});
// Return to that page: normal cadence, no full inventory poll or count loss.
find(tree,'task-pulls-more').attrs.on_click[0]({},cx);tree=render();await advance(45000);await drain();tree=render();
assert.equal(panel.aggregate.entries.get(target).pr.state,'closed');assert.deepEqual({...panel.aggregate.counts()},{open:23,closed:7});
// Folded rows and off-page repositories stay out, without losing full tab totals.
panel.taskPages.clear();panel.foldedRepositories.add('owner/a');tree=render();
assert.ok(selected().every(key=>key.startsWith('owner/b#')));assert.deepEqual({...panel.aggregate.counts()},{open:23,closed:7});
panel.notices.members.set('owner/a',true);panel.notices.members.set('owner/b',true);tree=render();
const beforeEnrolled=requests.length;await advance(119999);assert.equal(requests.length,beforeEnrolled);
await advance(1);await drain();assert.equal(requests.length,beforeEnrolled+1,'Enrolled page keeps its 120-second missed-event safety net');
assert.equal(requests.at(-1).repo,'owner/b');assert.deepEqual(requests.at(-1).numbers,visible(tree).map(key=>Number(key.split('#')[1])));
console.log('PASS combined coordinator paging and safety: visible-page selection, merge/close totals, previous/show-more stale guards, folded inventory, 45/120s cadence and per-call GH_REPO');
