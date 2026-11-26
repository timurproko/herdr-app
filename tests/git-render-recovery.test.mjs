import assert from 'node:assert/strict';
import {rowHarness,element,find,nodes,words,t} from './support/git-row.mjs';
const h=await rowHarness(),p=h.panel,logs=[],jobs=[],timers=[];let notifications=0,captured;
const cx={spawn(fn){jobs.push(Promise.resolve().then(()=>fn(cx)));},timer:{after(ms,fn){timers.push({ms,fn});return {cancel(){}};}},notify(){notifications++;}};
const flush=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const rows=[1,2,3].map(number=>h.facts.pullRow({number,title:`Row ${number}`,state:'OPEN'}));
p.renderPanel=()=>{captured=p.renderAttempt;return element().children(rows.map(pr=>p.pullRow(t,pr)));};
let tree=p.render(cx);await flush();assert.equal(p.renderAttempt,null);assert.equal(timers.length,0,'Successful frames allocate no retry timer');assert.equal(notifications,0,'Successful frames need no extra render');
// Model the surviving marker of an uncatchable native abort, not a JS throw.
p.renderAttempt=captured;cx.timer.after(64,()=>{});timers.length=0;
p.renderPanel=()=>{captured=p.renderAttempt;return element().children(rows.map(pr=>p.pullRow(t,pr)));};
p.render(cx);p.renderAttempt=captured;await flush();const retry=timers.shift();assert.equal(retry.ms,64);retry.fn(cx);assert.equal(notifications,1);assert.equal(p.renderRetryPending,true);
p.render(cx);await flush();assert.equal(captured.retry,true);assert.equal(timers.length,0,'The retry cannot schedule another retry');p.renderAttempt=captured;
assert.equal(timers.length,0,'A repeatedly aborted frame cannot create a retry loop');
// An external change can render cleanly and clear the host's last-frame error.
p.renderAttempt=null;p.renderRetryPending=false;
let remove=true;const renderRow=p.renderPullRow;
p.renderPullRow=function(theme,pr,ghost){if(remove&&pr.number===1){remove=false;rows.splice(1,1);}return renderRow.call(this,theme,pr,ghost);};
tree=p.render(cx);await flush();assert.ok(find(tree,'pr-1'));assert.ok(find(tree,'pr-3'));assert.equal(find(tree,'pr-2'),undefined);assert.equal(p.renderAttempt,null);
p.renderPullRow=function(theme,pr,ghost){if(pr.number===1)throw Error('Fixture row failure');return renderRow.call(this,theme,pr,ghost);};
tree=p.render(cx);assert.ok(words(find(tree,'pr-1')).join(' ').includes('Row unavailable'));assert.ok(find(tree,'pr-3'));assert.equal(find(tree,'pr-1').attrs.h[0],74);
p.renderPullRow=renderRow;
// Removal while waiting/moving cancels obsolete pin geometry, never focus.
for(const phase of ['waiting','moving']) {
 const [a,b]=rows;p.pulls.open=[a,b];p.agentPull=null;h.place.terminal='source';p.agentResolved=JSON.stringify(h.place);
 p.pinMotion.measureBody({width:320,height:400});p.pinMotion.bodyPointer({bounds:{x:0,y:0,width:320,height:400}});
 for(const pr of rows)p.pinMotion.measureRow(pr.number,{width:300,height:74});
 assert.ok(p.pinMotion.start({context:p.context,state:'open',rows:[a,b],pinned:null},b,{position:{x:300,y:90},bounds:{x:290,y:80,width:24,height:24}},{source:'source',target:'target'},cx));
 p.pinMotion.current.phase=phase;p.pulls.open=[a];h.place.terminal='target';p.agentResolved=JSON.stringify(h.place);
 tree=p.renderPulls(t);assert.equal(p.pinMotion.current,null);assert.equal(find(tree,`pr-${b.number}`),undefined);assert.equal(nodes(tree).some(n=>String(n.attrs?.id?.[0]).startsWith('pin-swap-')),false);assert.equal(h.focus.length,0);
}
// A queued incomplete-frame check cannot notify a closed panel.
p.renderPanel=()=>{captured=p.renderAttempt;return element();};p.render(cx);p.renderAttempt=captured;await flush();p.aggregate=null;p.close();for(const timer of timers)if(timer.ms===64)timer.fn(cx);assert.equal(notifications,1);
console.log('PASS row-local fallback, publication removal during build, pin removal in waiting/moving, one deferred native-abort-marker retry and closed-panel isolation (native deadline separately exercised)');
