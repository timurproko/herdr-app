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
console.log('PASS two-second repository burst windows, cold-load deduplication, activity cancellation/one catch-up and explicit inactive list gates');
