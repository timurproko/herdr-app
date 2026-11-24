// Complete packaged coordinator rendering; fake host IO only, never the live app.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';
import {element,svg,Popover,find,words,theme} from './support/choice-menu.mjs';
let rendering=false,reads=0,syncFailure=false;
const errors=[],jobs=[],storage=new Map([['custom.git.view','closed']]);
const context={scope:'verified-home',machine:null,links:[]},now=Date.now();
const prs=new Map();
for(let n=1;n<=30;n++){
 const repo=n<=3?'timurproko/crew':'timurproko/herdr-app',url=`https://github.com/${repo}/pull/${n}`;
 context.links.push({url,task:`fixture-${n}`,terminal:n%3===0?'worker':null,historical:n%3!==0});
 prs.set(`${repo}#${n}`,{number:n,url,title:`Fixture ${n}`,state:n%2?'MERGED':'CLOSED',mergedAt:n%2?new Date(now-3600000).toISOString():null,closedAt:new Date(now-3600000).toISOString(),author:{login:'fixture'},body:'- [x] delivered',labels:[],statusCheckRollup:[]});
}
context.links.push({url:'https://github.com/timurproko/crew/pull/36',task:'unread-history',terminal:null,historical:true});
const cx={focus_handle(){assert.equal(rendering,false);return {};},notify(){assert.equal(rendering,false,'notify must yield out of render');},stop_propagation(){},timer:{every(){},after(){}},spawn(fn){jobs.push(fn(cx));}};
const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
const host={props:()=>null,theme:()=>theme,settings:()=>({zoom:1}),window:()=>({platform:'windows'}),layout:()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]}),checking:()=>false,appHome:()=>'/fixture',shared:()=>null,setShared(){assert.equal(rendering,false);},notify(){assert.equal(rendering,false);},closeOverlay(){},openOverlay(){},nextCommand(){},run(){},
 exec:(command,args)=>{if(syncFailure)throw Error('fixture synchronous transport failure');assert.equal(rendering,false,'reads must yield out of render');reads++;
  if(command==='node')return Promise.resolve({code:0,stdout:JSON.stringify({setup:'ready',status:'ready'})});
  assert.equal(command,'gh');const key=`${args[args.indexOf('--repo')+1]}#${args[2]}`;
  return Promise.resolve(prs.has(key)?{code:0,stdout:JSON.stringify(prs.get(key))}:{code:1,stderr:'GraphQL: Could not resolve to a PullRequest with the number of 36.'});
 }};
const {Main}=await loadMod({mod:'custom-changes',host,globals:{console:{...console,error:(...args)=>errors.push(args.join(' '))},localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>{assert.equal(rendering,false);storage.set(k,v);}}},modules:{
 'main.js':process.env.GIT_PANEL_MAIN??'src/plugins/git/mod/main.js','aggregate.js':'src/plugins/git/mod/aggregate.js','pulls.js':'src/plugins/git/mod/pulls.js','notices.js':process.env.GIT_PANEL_NOTICES??'src/plugins/git/mod/notices.js','label-colors.js':'src/plugins/git/mod/label-colors.js','enrollment-picker.js':'src/plugins/git/mod/enrollment-picker.js','choice-menu.js':'src/ui/choice-menu.js','ui.js':'src/ui/ui.js',
 'gpui-kit':{View:class{},div:element,svg,PathBuilder:{}},'gpui-base':{h_flex:element,v_flex:element,Popover,Input:{}},
 'plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>context,pluginEvent(){},pluginById:()=>({}),pluginSetting:(_p,k)=>k==='relay'?'https://relay.example':''},
 'location.js':{location:()=>({space:'coordinator',cwd:'/home',on:null,terminal:'owner'})},'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{cancel(){}},PIN_SWAP_MS:320},'webhooks.js':{GitWebhooks:class{sync(){}stop(){}}},'panel-pin.js':{panelPin:element},'sidebar-title.js':{sidebarTitle:element},'settings-dialog.js':{openSettings(){}},'panel-state.js':{changePanel(){}},'space-color-state.js':{currentSpaceColor:()=>null},'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:(_t,id,o)=>element().id(id).child(o.text)},
 },entry:'export {default as Main} from "./main.js";'});
const panel=new Main();panel.init({},cx);await drain();
const render=()=>{rendering=true;try{return panel.render(cx);}finally{rendering=false;}};
let tree=render();await drain();tree=render();await drain();
for(const [key]of prs)assert.ok(find(tree,`pr-${key}`),key);
assert.ok(find(tree,'task-error-timurproko/crew'));assert.match(words(tree).join(' '),/Task PR history/);
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
assert.ok(reads>=31);console.log('PASS complete 30-row Closed coordinator, real aggregate/notices, inline-spawn guards and component/error diagnostics; native deadline not reproduced');
