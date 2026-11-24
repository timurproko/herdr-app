// Complete packaged coordinator rendering; fake host IO only, never the live app.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {element,svg,Popover,find,words,nodes,theme} from './support/choice-menu.mjs';
let rendering=false,reads=0,syncFailure=false,operations=0,peakOperations=0,zoom=1;
function budgetElement(){
 const node={kids:[],attrs:{},mouse:{}};let proxy;
 proxy=new Proxy(node,{get(n,key){
  if(key in n)return n[key];if(key==='then')return undefined;
  return (...args)=>{operations++;
   if(key==='when')return args[0]?args[1](proxy):proxy;
   if(key==='child')n.kids.push(args[0]);
   else if(key==='children')n.kids.push(...args[0]);
   else if(key==='on_mouse_down')n.mouse[args[0]]=args[1];
   else n.attrs[key]=args;
   return proxy;
  };
 }});return proxy;
}
const errors=[],jobs=[],storage=new Map([['custom.git.view','closed']]);
const context={scope:'verified-home',machine:null,links:[]},now=Date.now();
const prs=new Map();
for(let n=1;n<=100;n++){
 const repo=n<=3?'timurproko/crew':'timurproko/herdr-app',url=`https://github.com/${repo}/pull/${n}`;
 context.links.push({url,task:`fixture-${n}`,terminal:n%3===0?'worker':null,historical:n%3!==0});
 prs.set(`${repo}#${n}`,{number:n,url,title:`Fixture ${n}`,state:n%2?'MERGED':'CLOSED',mergedAt:n%2?new Date(now-3600000).toISOString():null,closedAt:new Date(now-3600000).toISOString(),author:{login:'fixture'},body:'- [x] delivered',labels:n===1?Array.from({length:100},(_,i)=>({name:`label-${i}`,color:'d73a4a'})):[],statusCheckRollup:Array.from({length:11},(_,i)=>({name:`CI ${i}`,status:'COMPLETED',conclusion:'SUCCESS'}))});
}
context.links.push({url:'https://github.com/timurproko/crew/pull/36',task:'unread-history',terminal:null,historical:true});
context.links.push({url:'https://github.com/timurproko/crew/pull/37',task:'retryable-history',terminal:null,historical:true});
const cx={focus_handle(){assert.equal(rendering,false);return {};},notify(){assert.equal(rendering,false,'notify must yield out of render');},stop_propagation(){},timer:{every(){},after(){}},spawn(fn){jobs.push(fn(cx));}};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={props:()=>null,theme:()=>theme,settings:()=>({zoom}),window:()=>({platform:'windows'}),layout:()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]}),checking:()=>false,appHome:()=>'/fixture',shared:()=>null,setShared(){assert.equal(rendering,false);},notify(){assert.equal(rendering,false);},closeOverlay(){},openOverlay(){},nextCommand(){},run(){},
 exec:(command,args)=>{if(syncFailure)throw Error('fixture synchronous transport failure');assert.equal(rendering,false,'reads must yield out of render');reads++;
  if(command==='node'&&args[0]==='-e')assert.fail('Missing PRs and timeouts must not start an account-diagnosis child');
  if(command==='node')return Promise.resolve({code:0,stdout:JSON.stringify({setup:'ready',status:'ready'})});
  assert.equal(command,'gh');const key=`${args[args.indexOf('--repo')+1]}#${args[2]}`;
  return Promise.resolve(prs.has(key)?{code:0,stdout:JSON.stringify(prs.get(key))}:key==='timurproko/crew#36'
   ?{code:1,stderr:'GraphQL: Could not resolve to a PullRequest with the number of 36.'}
   :{code:1,stderr:'execution timed out after 30000ms'});
 }};
const {Main}=await loadMod({mod:'custom-changes',host,globals:{console:{...console,error:(...args)=>errors.push(args.join(' '))},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{assert.equal(rendering,false);storage.set(k,v);}}},modules:{
 'main.js':process.env.GIT_PANEL_MAIN??'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','notices.js':process.env.GIT_PANEL_NOTICES??'src/plugins/git/mod/notices.js','label-colors.js':'src/plugins/git/mod/label-colors.js','enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js','choice-menu.js':'src/ui/choice-menu.js','ui.js':'src/ui/ui.js',
 'gpui-kit':{View:class{},div:budgetElement,svg:asset=>budgetElement().asset(asset),PathBuilder:{}},'gpui-base':{h_flex:budgetElement,v_flex:budgetElement,Popover,Input:{}},
 'plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){},pluginById:()=>({}),pluginSetting:(_p,k)=>k==='relay'?'https://relay.example':''},
 'location.js':{location:()=>({space:'coordinator',cwd:'/home',on:null,terminal:'owner'})},'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'webhooks.js':{GitWebhooks:class{sync(){}stop(){}}},'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings(){}},'panel-state.js':{changePanel(){}},'space-color-state.js':{currentSpaceColor:()=>null},'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},
 },entry:'export {default as Main} from "./main.js";'});
const panel=new Main();panel.init({},cx);await drain();
const render=()=>{operations=0;rendering=true;try{return panel.render(cx);}finally{rendering=false;peakOperations=Math.max(peakOperations,operations);assert.ok(operations<10000,`Fixed render operation budget: ${operations}`);}};
let tree=render();await drain();tree=render();await drain();
// Cold 100-row inventory must build only one bounded page. Page controls
// replace it, never append an ever-growing list, and every row stays reachable.
const rowNodes=tree=>nodes(tree).filter(n=>/^pr-timurproko\/(?:crew|herdr-app)#\d+$/.test(n.attrs.id?.[0]??''));
const budget=tree=>{
 const rows=rowNodes(tree);assert.ok(rows.length<=10);
 assert.ok(nodes(tree).length<1200,'Fixed cold render element budget for 100 Closed PRs');
 for(const row of rows)assert.ok(nodes(row).length<125,'Bounded visible + probe elements per PR');
};
budget(tree);
const firstTree=tree,seen=new Set();
while(true){
 budget(tree);for(const row of rowNodes(tree))seen.add(row.attrs.id[0].slice(3));
 const more=find(tree,'task-pulls-more');if(!more)break;
 more.attrs.on_click[0]({},cx);tree=render();
}
assert.deepEqual([...seen].sort(),[...prs.keys()].sort());
// Each tab remembers its own presentation page without changing counts or IO.
const beforePages=reads;panel.view='open';render();panel.view='closed';tree=render();
assert.equal(find(tree,'task-pulls-more'),undefined);assert.equal(reads,beforePages);
// Return to the first page for notice/error attribution checks below.
panel.taskPages.clear();tree=render();
assert.ok(find(tree,'pr-timurproko/crew#1'));
assert.equal(nodes(find(tree,'pr-labels-timurproko/crew#1')).filter(n=>/^pr-label-timurproko\/crew#1-\d+$/.test(n.attrs.id?.[0]??'')).length,3);
assert.ok(find(tree,'pr-meta-timurproko/crew#1').attrs.tooltip[0].includes('label-99'));
const timeProbes=nodes(firstTree).filter(n=>String(n.attrs.id?.[0]).includes('-probe-time-full'));
assert.equal(timeProbes.length,new Set(timeProbes.map(n=>words(n).join(''))).size,'One probe for each distinct time string per snapshot');
// Resolve a measured string once, then reuse it on later rows/pages. Width
// normalization changes cache identity at zoom changes; stale callbacks refuse.
const probe=nodes(tree).find(n=>String(n.attrs.id?.[0]).includes('-probe-number-full'));
assert.ok(probe);probe.attrs.on_size_change[0]({width:18,height:18},cx);
let cached=render();assert.equal(find(cached,probe.attrs.id[0]),undefined);
zoom=2;cached=render();assert.ok(nodes(cached).some(n=>String(n.attrs.id?.[0]).startsWith(probe.attrs.id[0].split('-measure-')[0])),'Zoom changes need a fresh text measurement identity');
const cacheSize=panel.pullTextWidths.size;probe.attrs.on_size_change[0]({width:999,height:18},cx);
assert.equal(panel.pullTextWidths.size,cacheSize,'Late prior-zoom probe cannot poison current geometry');
zoom=1;cached=render();assert.equal(find(cached,probe.attrs.id[0]),undefined,'Returning to a measured zoom reuses its widths');
const changedPr=panel.aggregate.entries.get('timurproko/crew#1').pr;
const originalWhen=changedPr.when;changedPr.when='merged 1 hour earlier';cached=render();
const changedTime=nodes(cached).find(n=>String(n.attrs.id?.[0]).includes('-probe-time-full')&&words(n).join('')===changedPr.when);
assert.ok(changedTime);assert.notEqual(changedTime.attrs.id[0],timeProbes[0].attrs.id[0],'New strings need new native IDs even if their width is unchanged');changedPr.when=originalWhen;
const time=timeProbes[0];time.attrs.on_size_change[0]({width:120,height:18},cx);
find(render(),'task-pulls-more').attrs.on_click[0]({},cx);cached=render();
assert.ok(!nodes(cached).some(n=>String(n.attrs.id?.[0]).includes('-probe-time-full')&&words(n).join('')===words(time).join('')),'Later pages reuse distinct-string measurements');
panel.taskPages.clear();tree=render();

assert.ok(find(tree,'task-error-timurproko/crew'));assert.match(words(tree).join(' '),/Task PR history/);
assert.equal(words(find(tree,'task-error-timurproko/crew')).join(' '),'Task PR history: Could not read pull requests; refresh to retry');
assert.doesNotMatch(words(tree).join(' '),/#36|not found/,'Confirmed missing history has no notice, hint or tooltip');
assert.equal(find(tree,'pr-timurproko/crew#36'),undefined);assert.equal(panel.aggregate.entries.get('timurproko/crew#36').error,null);
assert.doesNotMatch(words(tree).join(' '),/GitHub account/);
assert.ok(find(tree,'pr-agent-timurproko/crew#3'));assert.equal(find(tree,'pr-agent-timurproko/crew#1'),undefined);
assert.equal(errors.length,0,'The screenshot-shaped fixture does not reproduce the native interruption');
// A synchronous transport exception during a new notice generation used to run
// the catch/callback/notify before render returned. Never claim this is the
// screenshot's uncatchable native interruption.
// Invalidate the notice cache and exercise inline spawn with a synchronous throw
// in a separate loader via the actual request method.
let badNotify=false;const badCx={...cx,notify(){if(rendering)badNotify=true;},spawn(fn){jobs.push(fn(badCx));}};
panel.notices.retryNow();syncFailure=true;rendering=true;
try{panel.notices.request(badCx,'notice',null,()=>{});}finally{rendering=false;}
await drain();syncFailure=false;assert.equal(badNotify,false);
// Inject at the actual row renderer; ancestors must not overwrite attribution.
const buildRow=panel.renderPullRow;
panel.renderPullRow=()=>{throw Error('row fixture exception');};
assert.throws(render,/row fixture exception/);
assert.equal(errors.filter(line=>line.includes('row fixture exception')).length,1);
assert.ok(errors[0].includes('pull-row:timurproko/crew#1'));
panel.renderPullRow=buildRow;
// A native interrupt cannot enter JS catch/finally. Simulate its surviving
// marker, not the VM interrupt itself, and require honest next-attempt evidence.
panel.renderAttempt=true;panel.renderComponent='repository-notice:timurproko/crew';render();
assert.ok(errors.some(line=>line.includes('previous render did not complete')&&line.includes('repository-notice:timurproko/crew')));
// Section notices have their own attribution boundary too.
assert.throws(()=>panel.renderPart('repository-notice:timurproko/crew',()=>{throw Error('notice fixture exception');}),/notice fixture exception/);
assert.ok(errors.some(line=>line.includes('repository-notice:timurproko/crew')&&line.includes('notice fixture exception')));
assert.ok(reads>=102);console.log(`Peak fixed render operations: ${peakOperations} / 10000`);console.log('PASS bounded 100-row Closed coordinator pagination, probe cache, real aggregate/notices, inline-spawn guards and component/error diagnostics');
