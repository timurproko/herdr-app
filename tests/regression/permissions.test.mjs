import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function el(){let e;const n={kids:[],events:{},style:{}};e=new Proxy(n,{get(o,k){if(k in o)return o[k];if(k==='when')return(v,f)=>v?f(e):e;if(k==='child')return v=>{o.kids.push(v);return e;};if(k==='children')return v=>{o.kids.push(...v);return e;};if(k==='on_click')return f=>{o.events.click=f;return e;};return(...v)=>{o.style[k]=v;return e;};}});return e;}
const state=new Map(),jobs=[],calls=[],overlays=[];
const facts={platform:'win32',running:true,elevated:false,supported:true,desktop:true,session:'default',savedMode:'standard',remember:false,autostartMode:null};
let respond=()=>({code:0,stdout:JSON.stringify(facts)});
// Visual timing is covered by settings-refresh.test.mjs; all privileged operations here are mocked.
const context={Map,Set,Date,Math,startRefreshFeedback(){},div:el,svg:el,h_flex:el,v_flex:el,sectionStack:e=>e,activity:()=>el(),control:(_t,e)=>e,dropdown:(_id,trigger,menu)=>el().child(trigger).child(menu),menuSurface:(_t,e)=>e,description:(_t,s)=>el().child(s),U:{field:32,row:28,statusSize:7,gap:8,font:13,meta:12},shared:k=>state.get(k),setShared:(k,v)=>state.set(k,structuredClone(v)),appHome:()=>"/app",openOverlay:spec=>overlays.push(spec),machines:()=>[{name:'pc2',layout:'ready'},{name:'pc3',layout:'ready'}],exec:async(...a)=>{calls.push(a);return respond(JSON.parse(a[1].at(-1)));}};
const text=fs.readFileSync(new URL('../mods/custom-settings/permissions.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nglobalThis.api={initPermissions,reloadPermissions,pollPermissionRelaunch,corePage,coreAction,coreHasChanges,coreNeedsRelaunch,coreChangeNotice,coreEditorActions};';
const modal=fs.readFileSync(new URL('../mods/custom-settings/modal-layout.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
vm.runInNewContext(modal,context);vm.runInNewContext(text,context);const p=context.api;
const owner={profileMachine:'pc2',section:'look',handle:{focus(){}},heading:(_t,title)=>el().child(title),row:(_t,title,about,control)=>el().child(title).child(about).child(control),button:(_t,id,label,click,options)=>el().id(id).child(label).on_click(click).disabled(options?.enabled===false),toggle:(_t,id,on,click)=>el().id(id).on_click(click)};
const cx={focus_handle:()=>({}),timer:{every(){}},spawn:f=>jobs.push(f),notify(){}};p.initPermissions(owner,cx);
const run=async()=>{while(jobs.length)await jobs.shift()(cx);};
const nodes=e=>e&&typeof e==='object'?[e,...e.kids.flatMap(nodes)]:[];
const page=()=>p.corePage(owner,{}),byId=id=>nodes(page()).find(e=>e.style.id?.[0]===id);
const action=id=>nodes(p.coreEditorActions(owner,{})).find(e=>e.style.id?.[0]===id);
const label=()=>byId('st-terminal-permissions').kids[0];
const mode=()=>byId('st-permission-mode').kids[0].kids[0];
const reply=value=>({code:0,stdout:JSON.stringify(value)});
const k='custom.core-relaunch:"pc2"';
p.reloadPermissions(owner,cx);p.reloadPermissions(owner,cx);assert.equal(jobs.length,1);
assert.equal(page().kids.length,6,'Initial loading reserves heading and all four rows');
assert.equal(label(),undefined,'Cold loading uses a skeleton, not a guessed status');assert.equal(byId('st-terminal-permissions').style.w[0],66);assert.ok(byId('st-core-permission-loading'));assert.ok(byId('st-core-power-loading'));assert.equal(byId('st-core-power').style.disabled[0],true);assert.equal(byId('st-permission-mode').style.disabled[0],true);assert.ok(byId('st-permission-remember'));assert.equal(owner.permissionDrafts.has('pc2'),false,'Loading never creates guessed drafts');
owner.profileMachine=null;assert.equal(label(),'Unknown');await run();assert.equal(label(),'Unknown');owner.profileMachine='pc2';assert.equal(label(),'Running');assert.equal(page().kids.length,6);assert.equal(state.size,0,'Opening settings never writes preferences or starts/stops core');
assert.equal(calls[0][2].on,null);assert.equal(JSON.parse(calls[0][1].at(-1)).machine,'pc2');
assert.equal(byId('st-core-power').kids[0],'Stop');assert.equal(byId('st-core-power').style.w[0],76);
assert.ok(!nodes(byId('st-core-status-row')).some(n=>n.style.id?.[0]==='st-core-power'));
assert.equal(nodes(byId('st-core-control-row')).find(n=>n.style.id?.[0]==='st-core-power').kids[0],'Stop');
assert.equal(byId('st-permission-relaunch'),undefined);
assert.equal(byId('st-permission-mode').style.w[0],byId('st-permission-mode-menu').style.w[0]);
assert.equal(p.coreHasChanges(owner),false);assert.equal(p.coreNeedsRelaunch(owner),false);assert.equal(action('st-core-apply'),undefined);assert.equal(mode(),'Standard user');
assert.equal(page().kids.find(e=>e.kids[0]==='Permissions').kids[1],null,'Permissions has no current-value description');
p.reloadPermissions(owner,cx);assert.equal(label(),'Running');assert.equal(page().kids.length,6);assert.equal(byId('st-core-power').style.disabled[0],true);await run();
const reopened={...owner,terminalPermissions:undefined};p.initPermissions(reopened,cx);p.reloadPermissions(reopened,cx);
assert.equal(reopened.terminalPermissions.get('pc2').result.running,true);
assert.equal(nodes(p.corePage(reopened,{})).find(n=>n.style.id?.[0]==='st-core-power').style.disabled[0],true,'Cached values cannot drive actions');
respond=()=>reply({...facts,savedMode:'standard',elevated:true});await run();
assert.equal(p.coreHasChanges(reopened),false,'Fresh facts replace an untouched cached draft');
assert.equal(nodes(p.corePage(reopened,{})).find(n=>n.style.id?.[0]==='st-permission-mode').kids[0].kids[0],'Administrator','Actual running permissions win over stale saved Standard');
respond=()=>reply(facts);
const beforeEdit=calls.length;
byId('st-permission-mode-administrator').events.click({},cx);assert.equal(p.coreHasChanges(owner),true);assert.equal(p.coreNeedsRelaunch(owner),true);assert.equal(p.coreChangeNotice(owner,{}).kids[0],'Apply restarts core with all agents.');
assert.equal(calls.length,beforeEdit,'Selecting permissions only edits a draft');assert.ok(action('st-core-discard'));for(const id of ['st-core-discard','st-core-apply']){assert.equal(action(id).style.w[0],88);assert.equal(action(id).style.h[0],32);}
action('st-core-discard').events.click({},cx);assert.equal(mode(),'Standard user');assert.equal(action('st-core-apply'),undefined);assert.equal(calls.length,beforeEdit,'Discard never invokes a worker');
byId('st-permission-mode-administrator').events.click({},cx);byId('st-permission-remember').events.click({},cx);
const submitted=[];
respond=input=>{submitted.push(input.request);return reply(input.request.action==='autostart'?{configured:true,request:input.request.request}:{queued:true,request:input.request.request});};
action('st-core-apply').events.click({},cx);p.coreAction(owner,'apply',cx);assert.equal(jobs.length,1,'No duplicate Apply');await run();
assert.deepEqual(submitted.map(r=>r.action),['autostart','apply'],'Apply saves startup settings then queues the permission restart');assert.notEqual(submitted[0].request,submitted[1].request);assert.equal(submitted[0].remember,true);assert.equal(submitted[1].mode,'administrator');assert.equal(state.get(k).operation,'apply');assert.equal(label(),'Restarting');assert.equal(byId('st-core-power').style.disabled[0],true);
let job=state.get(k);
respond=input=>input.request.action==='status'?reply({request:job.request,state:'complete'}):reply({...facts,elevated:true,savedMode:'administrator',remember:true,autostartMode:'administrator'});
p.pollPermissionRelaunch(owner,cx,true);await run();assert.equal(mode(),'Administrator');assert.equal(p.coreHasChanges(owner),false);assert.equal(action('st-core-apply'),undefined);assert.equal(action('st-core-discard'),undefined);assert.equal(p.coreChangeNotice(owner,{}).kids[0],'');
const main=fs.readFileSync(new URL('../mods/custom-settings/main.js',import.meta.url),'utf8');assert.doesNotMatch(main,/tools\.child\(coreHeaderStatus|coreNeedsRelaunch/,'No manual restart-required footer');
owner.terminalEdit={};assert.equal(byId('st-core-power').style.disabled[0],true);owner.terminalEdit=null;
// Separate Stop still uses actual permissions even with a different draft.
byId('st-permission-mode-standard').events.click({},cx);
respond=input=>{submitted.push(input.request);return reply({queued:true,request:input.request.request});};
byId('st-core-power').events.click({},cx);await run();job=state.get(k);assert.equal(job.operation,'stop');assert.equal(job.mode,'administrator');assert.equal(submitted.at(-1).action,'stop');
respond=input=>input.request.action==='status'?reply({request:job.request,state:'complete'}):reply({...facts,running:false,elevated:null,savedMode:'administrator',remember:true,autostartMode:'administrator'});
p.pollPermissionRelaunch(owner,cx,true);await run();assert.equal(label(),'Stopped');assert.equal(page().kids.length,6);assert.equal(byId('st-core-power').kids[0],'Start');assert.equal(byId('st-core-power').style.disabled[0],true,'Unapplied changes do not leak into Start');
action('st-core-discard').events.click({},cx);assert.equal(mode(),'Administrator');
respond=input=>reply({queued:true,request:input.request.request});byId('st-core-power').events.click({},cx);await run();assert.equal(state.get(k).operation,'start');assert.equal(JSON.parse(calls.at(-1)[1].at(-1)).request.mode,'administrator');
// Saving while stopped never implicitly starts core.
state.clear();byId('st-permission-mode-standard').events.click({},cx);const saveOnly=[];
respond=input=>{saveOnly.push(input.request.action);return input.request.action==='autostart'?reply({configured:true,request:input.request.request}):reply({...facts,running:false,elevated:null,savedMode:'standard',remember:true});};
action('st-core-apply').events.click({},cx);await run();assert.deepEqual(saveOnly,['autostart','inspect']);assert.equal(p.coreHasChanges(owner),false);assert.equal(mode(),'Standard user');assert.equal(byId('st-core-power').style.disabled[0],false);
// Remember-only changes do not interrupt a running core.
respond=()=>reply(facts);p.reloadPermissions(owner,cx);await run();byId('st-permission-remember').events.click({},cx);saveOnly.length=0;
respond=input=>{saveOnly.push(input.request.action);return input.request.action==='autostart'?reply({configured:true,request:input.request.request}):reply({...facts,remember:true});};
action('st-core-apply').events.click({},cx);await run();assert.deepEqual(saveOnly,['autostart','inspect']);assert.equal(p.coreHasChanges(owner),false);
// Rejected setup never restarts or falsely clears the pending edit.
byId('st-permission-mode-administrator').events.click({},cx);const rejected=[];
respond=input=>{rejected.push(input.request.action);return{code:1,stdout:JSON.stringify({error:'Cancelled',rejected:true})};};
action('st-core-apply').events.click({},cx);await run();assert.deepEqual(rejected,['autostart','inspect']);assert.equal(state.get(k).state,'failed');assert.equal(owner.permissionDrafts.get('pc2').mode,'administrator');
// Downgrades use Apply too, without a manual stop/start cycle.
state.clear();owner.permissionDrafts.delete('pc2');respond=()=>reply({...facts,elevated:true,savedMode:'standard'});p.reloadPermissions(owner,cx);await run();assert.equal(mode(),'Administrator');assert.equal(p.coreHasChanges(owner),false);
byId('st-permission-mode-standard').events.click({},cx);const downgrade=[];
respond=input=>{downgrade.push(input.request);return reply(input.request.action==='autostart'?{configured:true,request:input.request.request}:{queued:true,request:input.request.request});};
action('st-core-apply').events.click({},cx);await run();assert.deepEqual(downgrade.map(r=>r.action),['autostart','apply']);assert.ok(downgrade.every(r=>r.mode==='standard'));
job=state.get(k);respond=input=>input.request.action==='status'?reply({request:job.request,state:'complete'}):reply(facts);p.pollPermissionRelaunch(owner,cx,true);await run();assert.equal(mode(),'Standard user');assert.equal(p.coreHasChanges(owner),false);
byId('st-permission-mode-administrator').events.click({},cx);
state.clear();respond=()=>reply({...facts,elevated:null});p.reloadPermissions(owner,cx);await run();assert.equal(mode(),'Unavailable');assert.equal(byId('st-permission-mode').style.disabled[0],true,'Unknown running permissions are never guessed');assert.equal(action('st-core-apply').style.disabled[0],true);const unknownCalls=calls.length;p.coreAction(owner,'apply',cx);await run();assert.equal(calls.length,unknownCalls,'Unknown permissions block even a stale Apply handler');
state.clear();respond=()=>({code:1,stdout:'{}'});
const failed={...owner,terminalPermissions:undefined};p.initPermissions(failed,cx);p.reloadPermissions(failed,cx);await run();assert.equal(failed.terminalPermissions.get('pc2').result,null);
const afterFailure={...owner,terminalPermissions:undefined};p.initPermissions(afterFailure,cx);p.reloadPermissions(afterFailure,cx);assert.equal(afterFailure.terminalPermissions.get('pc2').result,null,'Failed checks invalidate the cache');await run();
// Restart machine: the last row; Reboot only opens a confirmation dialog (custom-confirm),
// which sends the restart itself. Disabled until the machine has been reached.
{
  respond=()=>reply(facts);overlays.length=0;
  const o={...owner,profileMachine:'pc3',terminalPermissions:undefined,permissionApplying:false};p.initPermissions(o,cx);
  const rebootOf=()=>nodes(p.corePage(o,{})).find(e=>e.style.id?.[0]==='st-core-reboot');
  p.reloadPermissions(o,cx);assert.equal(rebootOf().style.disabled[0],true,'No reboot before the machine answers');
  await run();assert.equal(rebootOf().style.disabled[0],false);
  assert.equal(p.corePage(o,{}).kids.at(-1).style.id?.[0],'st-core-reboot-row','Restart machine is the last row');
  const before=calls.length;rebootOf().events.click({},cx);
  assert.equal(calls.length,before,'Reboot sends nothing until confirmed');
  assert.equal(overlays.length,1);assert.equal(overlays[0].mod,'custom-confirm');assert.equal(overlays[0].modal,true);
  assert.deepEqual({...overlays[0].props},{action:'reboot',machine:'pc3',label:'pc3'});
}
console.log('PASS: current permission dropdown, description-free row, Apply/Discard, verified restart on Apply, save-only stopped/autostart edits, separate Start/Stop, rejected setup, unknown status, machine-scoped cache and stable loading rows');
