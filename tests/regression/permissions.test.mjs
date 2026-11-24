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
const hint=()=>p.coreChangeNotice(owner,{}).kids[0];
const restartHint='Apply restarts core with all agents.';
const footerShape=()=>{const footer=p.coreEditorActions(owner,{});return JSON.stringify([footer.style,...footer.kids.map(n=>({id:n.style.id,w:n.style.w,h:n.style.h,flex:n.style.flex_1,min:n.style.min_w}))]);};
const cleanFooter=()=>{assert.equal(hint(),'');for(const id of ['st-core-discard','st-core-apply'])assert.equal(action(id).style.disabled[0],true);};
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
assert.equal(p.coreHasChanges(owner),false);assert.equal(p.coreNeedsRelaunch(owner),false);cleanFooter();assert.equal(mode(),'Standard user');
const idleFooterShape=footerShape();
assert.equal(page().kids.find(e=>e.kids[0]==='Permissions').kids[1],null,'Permissions has no current-value description');
p.reloadPermissions(owner,cx);assert.equal(label(),'Checking','Refreshing must not present cached Running as ready');assert.equal(page().kids.length,6);assert.equal(byId('st-core-power').style.disabled[0],true);await run();
const reopened={...owner,terminalPermissions:undefined};p.initPermissions(reopened,cx);p.reloadPermissions(reopened,cx);
assert.equal(reopened.terminalPermissions.get('pc2').result.running,true);
assert.equal(nodes(p.corePage(reopened,{})).find(n=>n.style.id?.[0]==='st-core-power').style.disabled[0],true,'Cached values cannot drive actions');
respond=()=>reply({...facts,savedMode:'standard',elevated:true});await run();
assert.equal(p.coreHasChanges(reopened),false,'Fresh facts replace an untouched cached draft');
assert.equal(nodes(p.corePage(reopened,{})).find(n=>n.style.id?.[0]==='st-permission-mode').kids[0].kids[0],'Administrator','Actual running permissions win over stale saved Standard');
respond=()=>reply(facts);
const beforeEdit=calls.length;
byId('st-permission-mode-administrator').events.click({},cx);assert.equal(p.coreHasChanges(owner),true);assert.equal(p.coreNeedsRelaunch(owner),true);assert.equal(p.coreChangeNotice(owner,{}).kids[0],'Apply restarts core with all agents.');
assert.equal(calls.length,beforeEdit,'Selecting permissions only edits a draft');assert.equal(footerShape(),idleFooterShape);assert.ok(action('st-core-discard'));for(const id of ['st-core-discard','st-core-apply']){assert.equal(action(id).style.w[0],88);assert.equal(action(id).style.h[0],32);}
action('st-core-discard').events.click({},cx);assert.equal(mode(),'Standard user');cleanFooter();assert.equal(calls.length,beforeEdit,'Discard never invokes a worker');
byId('st-permission-mode-administrator').events.click({},cx);byId('st-permission-remember').events.click({},cx);
const submitted=[];let releaseSave;
respond=input=>{submitted.push(input.request);return input.request.action==='autostart'?new Promise(resolve=>{releaseSave=()=>resolve(reply({configured:true,request:input.request.request}));}):reply({queued:true,request:input.request.request});};
action('st-core-apply').events.click({},cx);p.coreAction(owner,'apply',cx);assert.equal(jobs.length,1,'No duplicate Apply');
assert.equal(hint(),restartHint,'Preparing preserves the pending hint');assert.equal(footerShape(),idleFooterShape);
assert.equal(action('st-core-apply').style.disabled[0],true);assert.equal(action('st-core-discard').style.disabled[0],true);
const saving=jobs.shift()(cx);await Promise.resolve();
assert.equal(owner.permissionApplying,true);assert.equal(hint(),restartHint,'In-flight settings save retains the captured hint');
assert.equal(footerShape(),idleFooterShape);releaseSave();await saving;await run();
assert.equal(hint(),restartHint,'Queued restart never duplicates Status in the footer');
state.set(k,{...state.get(k),state:'restarting'});assert.equal(hint(),restartHint);assert.equal(label(),'Restarting');
assert.deepEqual(submitted.map(r=>r.action),['autostart','apply'],'Apply saves startup settings then queues the permission restart');assert.notEqual(submitted[0].request,submitted[1].request);assert.equal(submitted[0].remember,true);assert.equal(submitted[1].mode,'administrator');assert.equal(state.get(k).operation,'apply');assert.equal(label(),'Restarting');assert.equal(byId('st-core-power').style.disabled[0],true);
let job=state.get(k);
respond=input=>input.request.action==='status'?reply({request:job.request,state:'complete'}):reply({...facts,elevated:true,savedMode:'administrator',remember:true,autostartMode:'administrator'});
p.pollPermissionRelaunch(owner,cx,true);await run();assert.equal(mode(),'Administrator');assert.equal(p.coreHasChanges(owner),false);cleanFooter();assert.equal(footerShape(),idleFooterShape);
const main=fs.readFileSync(new URL('../mods/custom-settings/main.js',import.meta.url),'utf8');assert.doesNotMatch(main,/tools\.child\(coreHeaderStatus|coreNeedsRelaunch/,'No manual restart-required footer');
assert.match(main,/\.when\(this\.section==='core'\|\|[^\n]+\n\s*modalFooter/,'Core footer is reserved even when clean');
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
action('st-core-apply').events.click({},cx);assert.equal(hint(),'Unapplied changes','Sign-in-only saves retain their own hint');await run();assert.deepEqual(saveOnly,['autostart','inspect']);assert.equal(p.coreHasChanges(owner),false);cleanFooter();
// Rejected setup never restarts or falsely clears the pending edit.
byId('st-permission-mode-administrator').events.click({},cx);const rejected=[];
respond=input=>{rejected.push(input.request.action);return{code:1,stdout:JSON.stringify({error:'Cancelled',rejected:true})};};
action('st-core-apply').events.click({},cx);await run();assert.deepEqual(rejected,['autostart','inspect']);assert.equal(state.get(k).state,'failed');assert.equal(owner.permissionDrafts.get('pc2').mode,'administrator');
assert.equal(byId('st-permission-result').kids[0],'Cancelled','Failure stays in the existing page error area');assert.doesNotMatch(hint(),/Applying|Restarting|Cancelled/);
// An uncertain save is never replayed; neither progress nor errors replace its hint.
respond=()=>reply({...facts,remember:true});p.reloadPermissions(owner,cx);await run();
respond=input=>input.request.action==='autostart'?{code:1,stdout:JSON.stringify({error:'Transport timed out'})}:reply({...facts,remember:true});
action('st-core-apply').events.click({},cx);await run();
assert.equal(state.get(k).state,'unknown');assert.equal(hint(),restartHint);assert.equal(byId('st-permission-result').kids[0],'Transport timed out');
assert.equal(action('st-core-apply').style.disabled[0],true);const uncertainCalls=calls.length;p.coreAction(owner,'apply',cx);await run();assert.equal(calls.length,uncertainCalls);
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
// Intermediate renders matter: draining every job at once hid the screenshot-04 defect.
{
  state.clear();respond=()=>reply(facts);
  const o={...owner,profileMachine:'pc2',terminalPermissions:undefined,permissionApplying:false};p.initPermissions(o,cx);p.reloadPermissions(o,cx);await run();
  const get=id=>nodes(p.corePage(o,{})).find(n=>n.style.id?.[0]===id);
  const footer=()=>p.coreEditorActions(o,{}),notice=()=>p.coreChangeNotice(o,{}).kids[0];
  const status=()=>get('st-terminal-permissions').kids[0];
  const controls=disabled=>{
    for(const id of ['st-permission-mode','st-core-power','st-core-reboot'])assert.equal(get(id).style.disabled[0],disabled,id);
    const toggleParent=nodes(p.corePage(o,{})).find(n=>n.style.disabled && nodes(n).some(k=>k.style.id?.[0]==='st-permission-remember'));
    assert.equal(toggleParent.style.disabled[0],disabled,'Sign-in toggle');
  };
  const buttons=disabled=>{for(const id of ['st-core-discard','st-core-apply'])assert.equal(nodes(footer()).find(n=>n.style.id?.[0]===id).style.disabled[0],disabled,id);};
  const ack=input=>reply(input.request.action==='autostart'?{configured:true,request:input.request.request}:{queued:true,request:input.request.request});
  const start=async mode=>{get(`st-permission-mode-${mode}`).events.click({},cx);o.permissionDrafts.get('pc2').remember=false;respond=ack;p.coreAction(o,'apply',cx);await run();};
  const complete=async()=>{const job=state.get(k);respond=input=>input.request.action==='status'?reply({request:job.request,state:'complete'}):assert.fail('Inspection must remain queued');p.pollPermissionRelaunch(o,cx,true);assert.equal(jobs.length,1);await jobs.shift()(cx);};
  const deferred=()=>{let resolve;const promise=new Promise(r=>{resolve=r;});return{promise,resolve};};
  const admin={...facts,elevated:true,savedMode:'administrator'};
  controls(false);buttons(true);await start('administrator');assert.equal(status(),'Restarting');
  await complete();
  assert.equal(state.get(k).state,'complete');assert.equal(o.terminalPermissions.get('pc2').loading,true);
  assert.equal(status(),'Restarting','Completion acknowledgement is not verified Running');assert.equal(notice(),restartHint);controls(true);buttons(true);
  const fresh=deferred();respond=()=>fresh.promise;const inspecting=jobs.shift()(cx);await Promise.resolve();
  assert.equal(status(),'Restarting');assert.equal(notice(),restartHint);
  fresh.resolve(reply(admin));await inspecting;
  assert.equal(status(),'Running');controls(false);buttons(true);assert.equal(notice(),'');assert.equal(p.coreHasChanges(o),false);
  // A later manual refresh cannot resurrect the old operation's captured hint.
  respond=()=>reply(admin);p.reloadPermissions(o,cx);assert.equal(status(),'Checking');assert.equal(notice(),'');await run();controls(false);
  // Save-only completion also keeps its hint after the draft is cleared, until facts settle.
  get('st-permission-remember').events.click({},cx);respond=ack;p.coreAction(o,'apply',cx);await jobs.shift()(cx);
  assert.equal(notice(),'Unapplied changes');assert.equal(status(),'Checking');controls(true);
  respond=()=>reply({...admin,remember:true});await run();assert.equal(notice(),'');controls(false);buttons(true);
  // A failed final inspection releases busy state but never enables unverified controls.
  await start('standard');await complete();respond=()=>({code:1,stdout:JSON.stringify({error:'Could not verify runtime'})});await run();
  assert.equal(status(),'Unknown');assert.equal(get('st-permission-result').kids[0],'Could not verify runtime');
  assert.equal(o.terminalPermissions.get('pc2').loading,false);assert.equal(o.permissionApplying,false);controls(true);buttons(true);
  respond=()=>reply(facts);p.reloadPermissions(o,cx);await run();assert.equal(status(),'Running');controls(false);assert.equal(notice(),'');
  // Completion supersedes a read begun before restart; its late failure cannot wipe fresh facts.
  await start('administrator');const stale=deferred();respond=()=>stale.promise;p.reloadPermissions(o,cx);const oldRead=jobs.shift()(cx);
  await complete();respond=()=>reply(admin);await run();assert.equal(status(),'Running');controls(false);
  stale.resolve({code:1,stdout:JSON.stringify({error:'Old read failed'})});await oldRead;
  assert.equal(status(),'Running');assert.equal(get('st-permission-result'),undefined);controls(false);
  // A delayed inspection updates only its captured machine, not the newly selected one.
  await start('standard');await complete();const pc2Read=deferred();respond=()=>pc2Read.promise;const readingPc2=jobs.shift()(cx);
  o.profileMachine='pc3';respond=()=>reply(admin);p.reloadPermissions(o,cx);await run();assert.equal(status(),'Running');controls(false);
  pc2Read.resolve(reply(facts));await readingPc2;assert.equal(get('st-permission-mode').kids[0].kids[0],'Administrator');controls(false);assert.equal(notice(),'');
  // A superseded status reply cannot publish completion or schedule inspection for a newer request.
  o.profileMachine='pc2';await start('administrator');const oldJob=state.get(k),lateStatus=deferred();respond=()=>lateStatus.promise;
  p.pollPermissionRelaunch(o,cx,true);const polling=jobs.shift()(cx);const replacement={...oldJob,request:`${oldJob.request}-new`,state:'queued'};state.set(k,replacement);
  lateStatus.resolve(reply({request:oldJob.request,state:'complete'}));await polling;
  assert.equal(state.get(k),replacement);assert.equal(jobs.length,0);assert.equal(status(),'Restarting');controls(true);
  // Existing offline and unknown-token guards still win over displayed/cached facts.
  state.clear();o.profileMachine='unreachable';assert.equal(status(),'Unreachable');controls(true);
  o.profileMachine='pc2';respond=()=>reply({...facts,elevated:null});p.reloadPermissions(o,cx);await run();
  assert.equal(get('st-permission-mode').style.disabled[0],true);assert.equal(get('st-core-power').style.disabled[0],true);buttons(true);
}
console.log('PASS: quiet stable Core footer across idle/pending/saving/restarting/done/failed, verified control recovery, deferred inspections, stale replies, machine isolation and safety guards');
