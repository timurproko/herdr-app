import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {rowHarness} from './support/git-row.mjs';
let now=0,active=true;const timers=[],jobs=[],events=[];
const state={scope:'relay',ready:1,status:'connected',repositories:{'owner/a':{revision:1},'owner/b':{revision:1}}};
const cx={notify(){},spawn(fn){jobs.push(fn(cx));},timer:{after(ms,fn){timers.push({at:now+ms,fn});}}};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const f=await loadMod({host:{checking:()=>false,shared:()=>state,setShared(){}},globals:{URL},modules:{'webhooks.js':'src/plugins/git/mod/webhooks.js','plugins.js':{sidebarPanelEnabled:()=>true,pluginById:()=>({}),pluginSetting:()=> 'https://relay.example'}},entry:'export {GitWebhooks} from "./webhooks.js";'});
const reader=new f.GitWebhooks();
const sync=(catchup=true)=>reader.sync(cx,{enabled:active,scope:'home',repositories:['owner/a','owner/b'],catchup,isCurrent:()=>active,onChange:event=>events.push(event.repository)});
sync(false);await drain();assert.equal(timers.length,0,'A cold inventory already reading does not get a duplicate initial catch-up');
state.repositories['owner/a'].revision++;sync();await drain();assert.equal(events.length,0);assert.equal(timers.length,1);assert.equal(timers[0].at,2000);
now=1000;state.repositories['owner/a'].revision++;sync();state.repositories['owner/b'].revision++;sync();await drain();assert.equal(timers.length,1,'Burst does not create per-event timers');
now=2000;timers.shift().fn(cx);await drain();assert.deepEqual(events,['owner/a','owner/b'],'One delivery per affected repository in the two-second window');
state.repositories['owner/a'].revision++;sync();await drain();active=false;timers.shift().fn(cx);await drain();assert.equal(events.length,2,'Inactive subscribers start no queued follow-up');
active=true;sync();await drain();assert.equal(timers.length,1,'Return coalesces one catch-up');now+=2000;timers.shift().fn(cx);await drain();assert.deepEqual(events.slice(2),['owner/a','owner/b']);
for(const visible of [false,true]) {
 let reads=0;const h=await rowHarness({host:{window:()=>({active:visible}),exec:async()=>{reads++;return {code:1,stderr:'unexpected'};}}});
 h.panel.loadPulls('open',h.cx,true);for(let i=0;i<30;i++)await Promise.resolve();
 if(!visible)assert.equal(reads,0,'Inactive window gates initial/forced list reads');else assert.equal(reads,1);
}
// Events after Closed was visited must issue no Closed page requests while Open
// is selected. The actual before/after controller fixture counts the full jobs.
const h=await rowHarness();h.panel.view='open';h.panel.pulls.open=[];h.panel.pulls.closed=[];
assert.equal(h.panel.shown(),true,'Unknown activity remains compatible');
let windowActive=false,returnReads=0;
const resumed=await rowHarness({host:{window:()=>({active:windowActive}),exec:async()=>{returnReads++;return {code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:0},closed:{totalCount:0},pullRequests:{nodes:[],pageInfo:{hasNextPage:false,endCursor:null}}}}})};}}});
resumed.panel.aggregate=null;resumed.panel.pulls.open=[];assert.equal(resumed.panel.shown(),false); // Timer gate, no inactive paint.
windowActive=true;resumed.panel.syncWebhooks(resumed.cx);for(let i=0;i<60;i++)await Promise.resolve();assert.equal(returnReads,1);
resumed.panel.syncWebhooks(resumed.cx);for(let i=0;i<30;i++)await Promise.resolve();assert.equal(returnReads,1,'Return catches up once even when a minimized window never painted its inactive state');
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
console.log('PASS two-second repository burst windows, cold-load deduplication, activity cancellation/one catch-up, inactive list gates and selected-demand cooldown recovery with retained expanded depth');
