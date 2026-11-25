import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {rowHarness} from './support/git-row.mjs';
const jobs=[],events=[];
const state={scope:'relay',ready:1,status:'connected',repositories:{'owner/a':{revision:1},'owner/b':{revision:1}}};
const cx={notify(){},spawn(fn){jobs.push(fn(cx));},timer:{after(){assert.fail('Main event delivery has no debounce timer');}}};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const f=await loadMod({host:{checking:()=>false,shared:()=>state,setShared(){}},globals:{URL},modules:{'webhooks.js':'src/plugins/git/mod/webhooks.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginById:()=>({}),pluginSetting:()=> 'https://relay.example'}},entry:'export {GitWebhooks} from "./webhooks.js";'});
const reader=new f.GitWebhooks();
let names=['owner/a','owner/b'];
const sync=()=>reader.sync(cx,{enabled:true,scope:JSON.stringify(['home',names]),repositories:names,onChange:event=>events.push(event.repository)});
sync();await drain();assert.deepEqual(events,['owner/a','owner/b'],'Main initial consumer synchronization is retained');events.length=0;
for(let i=0;i<3;i++){state.repositories['owner/a'].revision++;sync();await drain();}
assert.deepEqual(events,['owner/a','owner/a','owner/a'],'Three separately dispatched events produce three immediate repository reads, without a two-second window');
names=['owner/a'];sync();await drain();assert.equal(events.at(-1),'owner/a','Membership changes use main scope catch-up rather than pending-demand transfer');
assert.equal(typeof reader.hasPending,'undefined');
for(const active of [false,true]) {
 let reads=0;const h=await rowHarness({host:{window:()=>({active}),exec:async()=>{reads++;return {code:1,stderr:'unexpected'};}}});
 h.panel.loadPulls('open',h.cx,true);for(let i=0;i<30;i++)await Promise.resolve();
 assert.equal(reads,1,'Window activity does not gate reads, matching main');
}
// A refused Closed page/append must not survive as hidden-tab retry demand.
// Test both cold and already-expanded Open destinations with the real reader.
for(const warm of [false,true])for(const append of [false,true]) {
 let clock=1000;const calls=[],wakeups=[],pending=[];
 const h=await rowHarness({globals:{Date:class extends Date{static now(){return clock;}}},host:{exec:async(_command,args)=>{
  const query=args.find(arg=>arg.startsWith('query='));calls.push({query,args});
  if(calls.length===1)return {code:1,stderr:'GraphQL: API rate limit exceeded'};
  assert.ok(query.includes('after:$after,states:[OPEN]'),'Recovery only reads the currently selected Open tab');
  const after=Number(args.find(arg=>arg.startsWith('after='))?.slice(6)??0),size=warm?10:1;
  return {code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:warm?20:1},closed:{totalCount:10},pullRequests:{
   nodes:Array.from({length:size},(_,i)=>({number:after+i+1,state:'OPEN',isDraft:false,title:'Current demand',url:`https://github.com/owner/repo/pull/${after+i+1}`,commits:{nodes:[]}})),
   pageInfo:{endCursor:String(after+size),hasNextPage:warm&&after===0},
  }}}})};
 }}});
 const cx={...h.cx,timer:{after:(ms,fn)=>wakeups.push({at:clock+ms,fn})},spawn:fn=>pending.push(fn(cx))};
 const settle=async()=>{for(let pass=0;pass<3;pass++){while(pending.length)await Promise.all(pending.splice(0));for(let i=0;i<30;i++)await Promise.resolve();}};
 const panel=h.panel;panel.aggregate=null;panel.view='closed';
 if(warm) {
  panel.pulls.open=Array.from({length:20},(_,i)=>h.facts.pullRow({number:i+1,state:'OPEN',url:`https://github.com/owner/repo/pull/${i+1}`,statusCheckRollup:[]}));
  panel.pullDepth.open=2;panel.pages.open={cursor:'20',hasMore:false,expanded:true};
 }
 if(append) {panel.pulls.closed=[h.facts.pullRow({number:90,state:'CLOSED',url:'https://github.com/owner/repo/pull/90',statusCheckRollup:[]})];panel.pages.closed={cursor:'10',hasMore:true,expanded:true};}
 const closed=panel.pulls.closed;
 panel.loadPulls('closed',cx,true,true,append);await settle();
 assert.equal(calls.length,1);assert.equal(panel.pullError,null);assert.equal(panel.pageError,null);
 const retry=wakeups.find(wake=>wake.at>=clock+900000);assert.ok(retry,'The refusal keeps a cooldown retry');
 panel.setView('open',cx);panel.loadPulls('open',cx);panel.flushWebhook(cx);await settle();
 assert.equal(calls.length,1,'Selection cannot bypass the shared cooldown');
 const retained=panel.pulls.open;clock=retry.at;retry.fn(cx);
 assert.equal(panel.pulls.open,retained,'Recovery retains current rows until the complete selected snapshot succeeds');
 await settle();
 assert.equal(calls.length,warm?3:2,'Recovery reads only the demanded Open page depth, never hidden Closed metadata/checks');
 assert.ok(calls.slice(1).every(call=>call.query.includes('after:$after,states:[OPEN]')));
 if(closed===null)assert.equal(panel.pulls.closed,null,'The refused hidden tab stays unloaded');
 else {assert.equal(panel.pulls.closed.length,closed.length);assert.ok(panel.pulls.closed.every((row,i)=>row===closed[i]),'Hidden row facts are retained without rereads');assert.equal(panel.pages.closed.cursor,'10');}
 assert.equal(panel.pulls.open.length,warm?20:1,'The selected tab recovers without another render or manual read');
 assert.equal(panel.pages.open.expanded,warm);assert.equal(panel.pullDepth.open,warm?2:1);
 assert.equal(panel.pullError,null);assert.equal(panel.readWake,null);
}
console.log('PASS main immediate event/window behavior, per-repository event identity and selected-demand cooldown recovery with retained expanded depth');
