// Real summary/store/model with synthetic GPUI and collector. No credentials,
// terminals, network, modal windows or real commands are accessed by this test.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const root=new URL('../',import.meta.url);
function element(kind='div'){
  const node={kind,kids:[],style:{},events:{},hoverStyle:null};let el;
  el=new Proxy(node,{get(o,k){
    if(k in o)return o[k];if(k==='then')return undefined;
    if(k==='when')return(yes,fn)=>yes?fn(el):el;
    if(k==='child'||k==='trigger'||k==='content')return child=>{if(child!=null)o.kids.push(child);return el;};
    if(k==='children')return children=>{o.kids.push(...children);return el;};
    if(k==='hover')return fn=>{o.hoverStyle=element('hover');fn(o.hoverStyle);return el;};
    if(String(k).startsWith('on_'))return(...args)=>{o.events[k]=args.at(-1);return el;};
    return(...args)=>{o.style[k]=args;return el;};
  }});return el;
}
const nodes=(n,out=[])=>{if(n&&typeof n==='object'){out.push(n);for(const child of n.kids??[])nodes(child,out);}return out;};
const byId=(view,id)=>nodes(view).find(n=>n.style.id?.[0]===id);
const text=view=>nodes(view).flatMap(n=>n.style.invisible?[]:n.kids.filter(k=>typeof k==='string')).join('\n');
const hasRefresh=view=>nodes(view).some(n=>n.style.asset?.[0]?.endsWith('/refresh.svg'));
let machine=null,width=248,replyReports=[],fail=false,stops=0,summaryMode=true,uiZoom=1,appActive=true,focusSnapshot={terminal:'t1'},terminalSnapshot=[];
const storage=new Map(),jobs=[],executions=[],overlays=[],timers=[];
const context=vm.createContext({
  pluginIsEnabled:()=>true,
  View:class{},div:()=>element(),svg:asset=>element('svg').asset(asset),h_flex:()=>element('hflex'),v_flex:()=>element('vflex'),
  settings:()=>({zoom:uiZoom}),spaces:()=>[{active:true,machine}],layout:()=>({id:'sidebar',size:{px:width}}),props:()=>({summary:summaryMode}),
  machinePicker:()=>element('machine-picker'),Toggle:{new:()=>element('toggle')},Scrollbar:{vertical:()=>element('scrollbar')},Popover:{new:id=>element('popover').id(id)},HoverCard:{new:id=>element('hovercard').id(id)},
  focused:()=>focusSnapshot,terminals:()=>terminalSnapshot,
  theme:()=>({foreground:'#fff',muted:'#aaa',dim:'#888',hover:'#333',done:'#0f0',border:'#444'}),
  shared:k=>storage.get(k),setShared:(k,v)=>storage.set(k,v),appWindow:()=>({active:appActive}),appHome:()=>'/fixture',machines:()=>[{name:null},{name:'pc2'}],
  readTextFile:async()=> 'synthetic collector: never executed',
  exec:async(command,args,options)=>{executions.push({command,args,options});return fail?{code:1}:{code:0,stdout:JSON.stringify({reports:replyReports})};},
  openOverlay:spec=>overlays.push(spec),closeOverlay(){},
});
for(const file of ['lib/ui.js','mods/custom-usage/model.js','mods/custom-usage/store.js','mods/custom-usage/claude-context.js','mods/custom-usage/accounts.js','mods/custom-usage/panel-kit.js','mods/custom-usage/reorder.js','mods/custom-usage/main.js']){
  const source=fs.readFileSync(new URL(file,root),'utf8').replace(/^import .*;\r?\n/gm,'').replace('export default class Usage','class Usage').replace(/^export \{[^\n]+\r?\n/gm,'').replace(/export /g,'');
  vm.runInContext(source,context);
}
vm.runInContext('const uiButton=button;globalThis.UsageView=Usage;',context);
const cx={stop_propagation:()=>stops++,notify(){},sleep:async()=>{},spawn:fn=>jobs.push(fn),timer:{after:(ms,fn)=>timers.push({ms,fn})}};
const finishFeedback=()=>{while(timers.length){const timer=timers.shift();assert.equal(timer.ms,600);timer.fn(cx);}};
const available={id:'report',sourceLabel:'Codex',checkedAt:Date.now(),fetchedAt:new Date().toISOString(),report:{status:'available',windows:[{id:'weekly',label:'Weekly',usedPct:18}]}};
const quota=JSON.stringify(['report','weekly']),missing=JSON.stringify(['missing','session']);
const key=(host,part)=>`custom.usage.${host==null?'local':'remote:'+host}.${part}`;
let viewInstance;
function setup({host=null,sidebar=248,prefs={},reports=[],error=null}={}){
  machine=host;width=sidebar;summaryMode=true;storage.clear();jobs.length=executions.length=overlays.length=timers.length=0;fail=false;stops=0;replyReports=[available];
  storage.set(key(host,'preferences'),{pins:[quota],...prefs});
  // The fresh cache would suppress a normal refresh: button clicks must force it.
  storage.set(key(host,'cache'),{version:5,reports,error,at:Date.now(),loading:false});
  viewInstance=new context.UsageView();viewInstance.machine='not-the-summary-machine';return viewInstance.render();
}
const drain=async({feedback=true}={})=>{while(jobs.length)await jobs.shift()(cx);if(feedback)finishFeedback();};
const unavailable={...available,report:{status:'unavailable',problem:{kind:'expired'}},lastSuccessful:{fetchedAt:available.fetchedAt,report:available.report}};
for(const sidebar of [248,44])for(const host of [null,'pc2']){
  let view=setup({host,sidebar,reports:[unavailable]});const trigger=byId(view,'usage-summary-open');
  assert.equal(hasRefresh(view),false);assert.match(text(view),/---/);assert.doesNotMatch(text(view),/Refresh|--%/);assert.match(trigger.style.accessibility_label[0],/Codex.*---/);
  trigger.events.on_click({},cx);assert.equal(jobs.length,0,'Widget click never starts collection');assert.equal(overlays.at(-1).mod,'custom-usage');assert.equal(overlays.at(-1).props.usageMachine,host);
  summaryMode=false;viewInstance.machine=host;view=viewInstance.render();const retry=byId(view,'usage-refresh-required-report');assert.equal(text(retry),'Refresh required');
  retry.events.on_click({},cx);retry.events.on_click({},cx);assert.equal(jobs.length,1,'Dialog retry is single-flight');view=viewInstance.render();assert.equal(text(byId(view,'usage-refresh-required-report')),'Refreshing…');assert.equal(byId(view,'usage-refresh-required-report').style.disabled[0],true);
  await drain();assert.equal(executions.length,1);assert.equal(executions[0].options.on,host);assert.equal(executions[0].options.timeout,120000);
  const request=JSON.parse(executions[0].args.at(-1));assert.equal(request.refresh,true,'Dialog retry bypasses cache');assert.equal(request.reportId,'report');
  view=viewInstance.render();assert.equal(byId(view,'usage-refresh-required-report'),undefined,'A successful provider fetch clears the stale state');
  summaryMode=true;view=viewInstance.render();assert.equal(hasRefresh(view),false);if(sidebar===248)assert.match(text(view),/82%/);assert.equal(JSON.stringify(storage.get(key(host,'preferences')).pins),JSON.stringify([quota]));
}
// Mixed pins retain live numbers; stale leaves are plain placeholders, not actions.
let view=setup({reports:[available],prefs:{pins:[quota,missing]}});
assert.match(text(view),/82%/);assert.equal(text(byId(view,`usage-summary-value-${missing}`)),'---');assert.equal(byId(view,`usage-summary-value-${missing}`).events.on_click,undefined);assert.equal(hasRefresh(view),false);
byId(view,'usage-summary-open').events.on_click({},cx);assert.equal(jobs.length,0);assert.equal(overlays.at(-1).mod,'custom-usage');
// Natural compact quota widths are measured once and retained only for placeholders.
const codexPin=JSON.stringify(['codex:layout','weekly']),claudeSession=JSON.stringify(['claude:layout','session']),claudeWeek=JSON.stringify(['claude:layout','weekly']);
const layoutReports=[{...available,id:'codex:layout',report:{status:'available',windows:[{id:'weekly',label:'Weekly',shortLabel:'wk',usedPct:1}]}},{...available,id:'claude:layout',sourceLabel:'Claude',report:{status:'available',windows:[{id:'session',label:'Session',shortLabel:'5h',usedPct:0},{id:'weekly',label:'Weekly',shortLabel:'wk',usedPct:99}]}}];
const geometry=v=>({boxes:nodes(v).filter(n=>/^usage-summary-(?:item-|value-|caption$)/.test(n.style.id?.[0]??'')).map(n=>[n.style.id[0],n.style.w?.[0],n.style.min_w?.[0],n.style.max_w?.[0],Boolean(n.style.flex_none)]),icons:nodes(v).map(n=>n.style.asset?.[0]).filter(Boolean),children:byId(v,'usage-summary-open').kids.length});
for(const scale of [1,1.3,1.75])for(const pins of [[codexPin],[codexPin,claudeSession,claudeWeek]]){
 uiZoom=scale;
 view=setup({reports:layoutReports,prefs:{pins}});const caption=byId(view,'usage-summary-caption');
 const measured=new Map(pins.map((pin,i)=>[pin,22+i]));
 if(pins.length>1)for(const pin of pins){const pair=byId(view,`usage-summary-item-${pin}`);assert.ok(pair);assert.equal(nodes(pair).filter(n=>n.kind==='svg').length,1,'Each percentage has its own provider icon');}
 for(const pin of pins){const cell=byId(view,`usage-summary-value-${pin}`);assert.equal(cell.style.w,undefined,'Healthy values retain their original natural widths');assert.equal(cell.style.text_right,undefined,'Do not add padded right alignment');cell.events.on_size_change({width:measured.get(pin)*scale,height:16*scale},cx);}
 assert.equal(caption?.style.w,undefined,'Caption keeps its original intrinsic alignment');
 for(const reports of [layoutReports.map(e=>({...e,report:{...e.report,windows:e.report.windows.map(w=>({...w,usedPct:100}))}})),layoutReports.map(e=>({...e,report:{status:'unavailable'}})),[],layoutReports]){
  storage.set(key(null,'cache'),{version:5,reports,at:Date.now()});view=viewInstance.render();
  for(const pin of pins){const cell=byId(view,`usage-summary-value-${pin}`);if(text(cell)==='---'){assert.ok(Math.abs(cell.style.w[0]-measured.get(pin))<1e-6,'Placeholder retains the native-measured logical width, not an oversized column');assert.equal(cell.kids[1].style.absolute.length,0);}else{assert.equal(cell.style.w,undefined);cell.events.on_size_change({width:measured.get(pin)*scale,height:16*scale},cx);}}
  if(caption)assert.equal(text(byId(view,'usage-summary-caption')),text(caption),'Keep last-known caption when reports disappear');
 }
 view=setup({reports:[],prefs:{pins}});const cold=geometry(view);storage.set(key(null,'cache'),{version:5,reports:layoutReports,at:Date.now()});assert.deepEqual(geometry(viewInstance.render()),cold,'Cold reports keep pin-derived providers/groups and the caption element without forced-width columns');
}
uiZoom=1;
// Missing refreshes, unknown ages, missing values and failures need attention.
for(const reports of [[],[unavailable],[{...available,checkedAt:Date.now()-660001}],[{...available,checkedAt:undefined,fetchedAt:undefined}],[{...available,report:{status:'available',windows:[{id:'weekly',label:'Weekly'}]}}]])for(const sidebar of [248,44]){
  view=setup({sidebar,reports});assert.match(text(view),/---/);assert.doesNotMatch(text(view),/Refresh|82%/);assert.equal(hasRefresh(view),false);byId(view,'usage-summary-open').events.on_click({},cx);assert.equal(jobs.length,0);assert.equal(overlays.at(-1).mod,'custom-usage');
}
view=setup({reports:[available],error:'Synthetic network failure'});assert.match(text(view),/---/);byId(view,'usage-summary-open').events.on_click({},cx);assert.equal(jobs.length,0);summaryMode=false;viewInstance.machine=machine;view=viewInstance.render();byId(view,'usage-refresh-required').events.on_click({},cx);assert.equal(jobs.length,1);fail=true;await drain();view=viewInstance.render();assert.equal(text(byId(view,'usage-refresh-required')),'Refresh required','Failed refresh stays actionable in the dialog');
// Automatic refresh holds current numbers across TTL, then swaps them directly.
// Fake time makes the timer boundary and timeout checks deterministic.
const RealDate=Date;let clock=available.checkedAt;
context.Date=class extends RealDate{static now(){return clock;}};
for(const host of [null,'pc2'])for(const sidebar of [248,44]){
  clock=available.checkedAt;setup({host,sidebar,reports:[available]});storage.get(key(host,'cache')).at=clock;
  clock+=600001;view=viewInstance.render();
  assert.doesNotMatch(text(view),/---/,'Waiting for the next minute tick stays quiet');
  assert.match(byId(view,'usage-summary-open').style.accessibility_label[0],/82%/);
  context.testCx=cx;vm.runInContext('refresh(spaces()[0].machine,testCx)',context);
  assert.equal(jobs.length,1);assert.equal(storage.get(key(host,'cache')).loading,true);
  clock+=120000;view=viewInstance.render();
  assert.match(byId(view,'usage-summary-open').style.accessibility_label[0],/82%/,'Slow automatic collection retains values');
  assert.doesNotMatch(text(view),/---/);
  summaryMode=false;viewInstance.machine=host;view=viewInstance.render();
  assert.equal(byId(view,'usage-refresh-required-report'),undefined,'Automatic collection does not demand a manual refresh');
  replyReports=[{...available,report:{...available.report,windows:[{id:'weekly',label:'Weekly',usedPct:25}]}}];
  await drain();summaryMode=true;view=viewInstance.render();
  assert.match(byId(view,'usage-summary-open').style.accessibility_label[0],/75%/,'Completion swaps directly to the new quota');
  assert.doesNotMatch(text(view),/---/);
}
for(const failure of [false,true]){
  clock=available.checkedAt;setup({reports:[available]});storage.get(key(null,'cache')).at=clock;clock+=600001;
  vm.runInContext('refresh(null,testCx)',context);clock+=135000;
  view=viewInstance.render();assert.match(text(view),/---/,'A hung collector must not leave old values looking healthy');
  summaryMode=false;viewInstance.machine=null;view=viewInstance.render();
  assert.equal(byId(view,'usage-refresh').style.disabled[0],false,'Timeout releases manual recovery controls');
  // Starting recovery must not temporarily claim that the failed cache is healthy.
  byId(view,'usage-refresh').events.on_click({},cx);summaryMode=true;
  assert.match(text(viewInstance.render()),/---/);fail=failure;await drain();
  view=viewInstance.render();assert.equal(text(view).includes('---'),failure,'Only a successful recovery restores numbers');
}
clock=available.checkedAt;setup({reports:[available]});clock+=660001;
assert.match(text(viewInstance.render()),/---/,'A timer that stopped refreshing needs attention');
// A mounted widget recovers on activation/context changes and keeps collecting
// on its minute timer, without a click or a Usage dialog ever being opened.
clock=available.checkedAt;setup({reports:[]});storage.get(key(null,'cache')).at=0;
appActive=false;const periodic=[];
viewInstance.init({}, {...cx,focus_handle:()=>({focus(){throw Error('Summary must not take focus');}}),timer:{...cx.timer,every:(ms,fn)=>periodic.push({ms,fn})}});
viewInstance.render(cx);await drain();assert.equal(executions.length,0,'Inactive windows do not start collectors');
appActive=true;viewInstance.render(cx);assert.equal(executions.length,0,'Activation yields before cache writes');
await drain();assert.equal(executions.length,1,'Returning to the window automatically collects');
assert.equal(periodic[0].ms,60000);clock+=600001;periodic[0].fn(cx);await drain();
assert.equal(executions.length,2,'The widget timer refreshes without opening a dialog');
machine='pc2';viewInstance.render(cx);await drain();assert.equal(executions.at(-1).options.on,'pc2','Switching machines checks immediately, without waiting for a tick');
assert.equal(overlays.length,0);assert.equal(stops,0);
context.Date=RealDate;delete context.testCx;
// A queued widget click opens the machine it represented, without refreshing it.
view=setup({host:'pc2'});machine=null;byId(view,'usage-summary-open').events.on_click({},cx);assert.equal(overlays.at(-1).props.usageMachine,'pc2');assert.equal(executions.length,0);
// Paused collection retains its widget; hidden summaries and no pins have no widget.
for(const sidebar of [248,44])for(const prefs of [{enabled:false},{summary:false}]){
  view=setup({sidebar,prefs});assert.equal(hasRefresh(view),false);
  if(prefs.summary===false){assert.equal(byId(view,'usage-summary-open'),undefined);assert.equal(jobs.length,0);continue;}
  byId(view,'usage-summary-open').events.on_click({},cx);assert.equal(jobs.length,0);assert.equal(overlays.at(-1).mod,'custom-usage');
}
for(const sidebar of [248,44]){view=setup({sidebar,prefs:{pins:[]}});assert.equal(byId(view,'usage-summary-open'),undefined);assert.equal(jobs.length,0);}
// Codex consumable resets use the existing usage cache, never a redemption API.
const cardEntry={id:'resets-fixture',sourceLabel:'Codex',checkedAt:Date.now(),account:{label:'fixture-account'},report:{status:'available',windows:[],resetCredits:{available:1,applicable:0}}};
const card=entry=>viewInstance.card(context.theme(),entry,{remaining:true,pins:[]},{});
// Provider failures stay compact; collector/auth diagnostics never become UI copy.
const technical='Authenticate GitHub CLI or provide COPILOT_GITHUB_TOKEN. HTTP 401: fixture failure';
for(const report of [
  {status:'unavailable',problem:{kind:'unavailable',detail:technical}},
  {status:'error',error:technical},
  {status:'unavailable',problem:{kind:'expired',refreshedBy:'fixture-cli auth refresh'}},
  {status:'unavailable',problem:{kind:'refresh_failed',reason:'unsupported'}},
  {},
])for(const cached of [false,true]) {
  view=card({...cardEntry,sourceLabel:'Copilot',report,...(cached?{lastSuccessful:{fetchedAt:'2030-01-01',report:cardEntry.report}}:{})});
  assert.equal((text(view).match(/Refresh required/g)??[]).length,1,'One quiet status replaces the warning and Unavailable label');
  assert.doesNotMatch(text(view),/Unavailable|Authenticate|TOKEN|HTTP|fixture-cli|renew|login/i);
  assert.equal(text(view).includes('Last known usage'),cached);
  assert.equal(text(view).includes('1 available'),false,'Copilot has no Codex reset-credit row');
  assert.ok(byId(view,'usage-refresh-resets-fixture'),'Provider refresh stays available');
}
assert.doesNotMatch(text(card(cardEntry)),/Refresh required|Try again after/,'Healthy reports have no warning');
// A refused Claude refresh token asks for a browser sign-in, not Refresh.
for(const problem of [{kind:'refresh_failed',reason:'rejected'},{kind:'refresh_failed',reason:'missing'},{kind:'rejected',status:401,refreshAttempted:true}]){
  view=card({...cardEntry,id:'login-fixture',sourceId:'claude',sourceLabel:'Claude',account:{email:'one@example.test'},report:{status:'unavailable',problem},lastSuccessful:{fetchedAt:'2030-01-01',report:cardEntry.report}});
  assert.doesNotMatch(text(view),/Refresh required/);assert.match(text(view),/Login required/);
  assert.ok(byId(view,'usage-login-login-fixture'),'Sign-in button replaces Refresh');assert.equal(byId(view,'usage-refresh-login-fixture'),undefined);
}
for(const problem of [{kind:'refresh_failed',reason:'network'},{kind:'refresh_failed',reason:'busy'}]){
  view=card({...cardEntry,id:'login-fixture',sourceId:'claude',sourceLabel:'Claude',report:{status:'unavailable',problem}});
  assert.match(text(view),/Refresh required/,'A transient failure still offers Refresh');assert.doesNotMatch(text(view),/Login required/);
}
// A provider block says why and does not offer Refresh as the fix.
for(const cached of [false,true]){
  view=card({...cardEntry,sourceLabel:'Claude',report:{status:'unavailable',problem:{kind:'rejected',status:403,code:'oauth_not_allowed_for_organization'}},...(cached?{lastSuccessful:{fetchedAt:'2030-01-01',report:cardEntry.report}}:{})});
  assert.doesNotMatch(text(view),/Refresh required/,'Refresh cannot fix a provider block');assert.match(text(view),/Not allowed/);assert.match(text(view),/does not allow OAuth sign-in for this account’s organization/);
  assert.equal(text(view).includes('Last known usage'),cached);assert.ok(byId(view,'usage-refresh-resets-fixture'),'Provider refresh stays available');
}
view=card({...cardEntry,report:{status:'unavailable',problem:{kind:'rejected',status:403,code:'some_other_code'}}});assert.match(text(view),/Refresh required/,'Unknown codes keep the quiet default');
view=card({...cardEntry,report:{status:'error',error:technical,retryAt:Date.now()+900000}});
assert.match(text(view),/Try again after \d+:\d\d[AP]M\./,'Rate-limit timing remains useful without technical details');
assert.doesNotMatch(text(view),/TOKEN|HTTP|Authenticate/);
for(const retryAt of [1,'invalid'])assert.doesNotMatch(text(card({...cardEntry,report:{status:'error',error:technical,retryAt}})),/Try again after|TOKEN|HTTP/);
setup({reports:[available],error:technical});summaryMode=false;viewInstance.machine=machine;view=viewInstance.render();
assert.ok(text(view).includes('Refresh required'));assert.doesNotMatch(text(view),/TOKEN|HTTP|Authenticate/,'Collector transport errors are also compact');
for(const value of ['Enabled','Disabled',null]) {
  const report={status:'available',windows:[],details:value?[{id:'extra',label:'Extra usage',value}]:[]};
  for(const cached of [false,true]) {
    const entry={...cardEntry,sourceLabel:'Claude',report:cached?{status:'error',error:'Fixture unavailable'}:report,...(cached?{lastSuccessful:{fetchedAt:'2030-01-01',report}}:{})};
    const extraView=card(entry),badge=byId(extraView,'usage-extra-resets-fixture');
    if(value==='Enabled')assert.equal(text(badge),'Extra usage');
    else {assert.equal(badge,undefined);assert.doesNotMatch(text(extraView),/Extra usage/,'Off or missing extra usage has no badge or detail text, including cached quotas');}
  }
}
view=card(cardEntry);
assert.equal(text(byId(view,'usage-resets-count-resets-fixture')),'1 available');
assert.equal(byId(view,'usage-resets-count-resets-fixture').style.text_color,undefined,'Reset counts inherit the same foreground style as credit balances');
assert.ok(!text(view).includes('applicable'),'Applicability is not displayed');
assert.equal(view.kids.at(-1).style.id[0],'usage-account-resets-fixture','Account identity stays last');
const resetLink=byId(view,'usage-resets-link-resets-fixture');assert.equal(resetLink.style.role[0],'link');assert.equal(text(resetLink),'1 available');
const resetCount=byId(view,'usage-resets-count-resets-fixture');
const dashed=byId(view,'usage-resets-dashed-resets-fixture'),solid=byId(view,'usage-resets-solid-resets-fixture');
assert.ok(resetCount.style.relative);assert.ok(dashed.style.border_dashed,'Positive counts have a dashed underline');
for(const stroke of [dashed,solid]){assert.ok(stroke.style.absolute);assert.ok(stroke.style.inset_0);assert.ok(stroke.style.border_b_1);}
assert.equal(solid.style.border_dashed,undefined,'The hover stroke is solid');
assert.equal(solid.style.border_color[0],'#00000000');
assert.deepEqual(Object.keys(solid.hoverStyle.style),['border_color'],'Hover changes only paint, not geometry or font decoration');
assert.equal(solid.hoverStyle.style.border_color[0],dashed.style.border_color[0],'Both strokes occupy the same box with the same color');
assert.ok(nodes(resetCount).every(n=>n.style.underline===undefined),'Never switch to the font underline baseline');
const resetRow=byId(view,'usage-resets-resets-fixture');
assert.equal(text(resetRow.kids[0]),'Resets');assert.equal(resetRow.kids[0].events.on_click,undefined,'The left label is plain text');
assert.ok(nodes(resetRow).every(n=>n.style.tooltip===undefined),'The reset row has no tooltips');
assert.ok(!text(resetRow).includes('↗'),'The arrow is replaced by the underlined count');
assert.equal(resetLink.style.flex_1,undefined,'The click target does not fill the row');
const urls=[],spawned=[],clickCx={stop_propagation:()=>stops++,open_url:url=>urls.push(url),spawn:fn=>spawned.push(fn(clickCx))};
const beforeExec=executions.length,beforeOverlays=overlays.length,beforeStops=stops;
resetLink.events.on_mouse_down({},clickCx);resetLink.events.on_click({},clickCx);await Promise.all(spawned);
// Opened in a private window (several accounts sign in there); only that launcher runs.
assert.deepEqual(urls,[]);assert.equal(stops,beforeStops+2);
const launched=executions.slice(beforeExec);assert.equal(launched.length,1);assert.equal(launched[0].command,'powershell.exe');
assert.ok(launched[0].args.at(-1).includes("Start-Process chrome -ArgumentList '--incognito','https://chatgpt.com/settings/usage?tab=overview'"));
assert.equal(overlays.length,beforeOverlays,'Resets opens only the browser, with no collector or redemption request');
for(const [resetCredits,label] of [[undefined,'Not reported'],[{available:0,applicable:0},'0 available'],[{available:2},'2 available'],[{applicable:1},'Not reported']]) {
  view=card({...cardEntry,report:{...cardEntry.report,resetCredits}});
  const count=byId(view,'usage-resets-count-resets-fixture');assert.equal(text(count),label);
  if(resetCredits?.available>0){assert.ok(byId(view,'usage-resets-dashed-resets-fixture'));assert.ok(byId(view,'usage-resets-solid-resets-fixture').hoverStyle);}
  else {assert.equal(count.kids.length,1,'Zero and missing counts have no underline strokes');assert.equal(count.style.underline,undefined);assert.equal(count.hoverStyle,null,'Zero and missing counts stay plain, including on hover');}
  assert.ok(byId(view,'usage-resets-link-resets-fixture'),'Older servers and zero counts retain the browser fallback');
}
view=card({...cardEntry,report:{status:'error',error:'Fixture unavailable'},lastSuccessful:{fetchedAt:'2030-01-01',report:cardEntry.report}});
assert.ok(text(view).includes('Last known usage'));assert.ok(text(view).includes('1 available'),'Cached counts are identified as last known usage');
for(const sourceLabel of ['Claude','Copilot'])assert.equal(byId(card({...cardEntry,sourceLabel}),'usage-resets-resets-fixture'),undefined,'The reset-credit row is Codex-only');
// Dialog and provider refreshes disable/dim and rotate only active refresh icons.
const claude={id:'claude-report',sourceLabel:'Claude',checkedAt:Date.now(),report:{status:'available',windows:[]}};
for(const reportId of [null,available.id,claude.id])for(const failure of [false,true]) {
  setup({host:'pc2',reports:[available,claude]});replyReports=[available,claude];summaryMode=false;viewInstance.machine=machine;
  view=viewInstance.render();
  const id=reportId?`usage-refresh-${reportId}`:'usage-refresh';
  const action=byId(view,id);
  assert.equal(action.style.disabled[0],false);
  const staleButtons=['usage-refresh',`usage-refresh-${available.id}`,`usage-refresh-${claude.id}`].map(buttonId=>byId(view,buttonId));
  action.events.on_click({},cx);action.events.on_click({},cx);
  for(const button of staleButtons)button.events.on_click({},cx);
  assert.equal(timers.length,1,'Stale pre-paint clicks cannot start feedback on another control');
  assert.equal(jobs.length,1,'All provider buttons share the collector single-flight guard');
  assert.equal(storage.get(key(machine,'cache')).reportId,reportId);
  view=viewInstance.render();
  for(const buttonId of ['usage-refresh',`usage-refresh-${available.id}`,`usage-refresh-${claude.id}`]){
    const button=byId(view,buttonId);
    assert.equal(button.style.disabled[0],true);assert.equal(button.style.opacity[0],0.4);assert.equal(button.style.tooltip,undefined);
    assert.ok(button.style.accessibility_label[0]);
    assert.equal(button.style.cursor_pointer,undefined);assert.equal(button.hoverStyle,null);
    const active=buttonId===id;
    assert.equal(button.kids[0].style.spin?.[0],active?900:undefined,'Only the clicked refresh icon rotates, never the other providers/global icon');
    button.events.on_click({},cx);assert.equal(jobs.length,1,'Disabled callbacks do not refresh');
  }
  assert.equal(byId(view,'usage-options'),undefined,'The dialog has no settings gear');
  assert.equal(byId(view,'usage-header-progress'),undefined,'No moving header line');
  for(const entry of [available,claude])assert.equal(byId(view,`usage-provider-${entry.id}-progress`),undefined);
  fail=failure;await drain({feedback:false});view=viewInstance.render();
  assert.equal(storage.get(key(machine,'cache')).loading,false);assert.equal(byId(view,id).style.disabled[0],true,'Fast refresh feedback lasts 600ms');
  for(const buttonId of ['usage-refresh',`usage-refresh-${available.id}`,`usage-refresh-${claude.id}`]){const button=byId(view,buttonId);assert.equal(button.style.disabled[0],true,'All refresh controls stay locked through the feedback floor');assert.equal(button.kids[0].style.spin?.[0],buttonId===id?900:undefined,'Completed fast requests still animate only the initiating icon');}
  finishFeedback();view=viewInstance.render();
  assert.equal(byId(view,id).style.disabled[0],false);assert.equal(byId(view,id).kids[0].style.spin,undefined,'Success or failure stops rotation');
  assert.equal(executions[0].options.on,'pc2','Refresh stays bound to the selected machine');
}
// A long request outlives minimum feedback; loading still owns one spinner.
for(const reportId of [null,available.id]){
  setup({reports:[available,claude]});replyReports=[available,claude];summaryMode=false;viewInstance.machine=machine;view=viewInstance.render();const id=reportId?`usage-refresh-${reportId}`:'usage-refresh';byId(view,id).events.on_click({},cx);finishFeedback();view=viewInstance.render();
  for(const buttonId of ['usage-refresh',`usage-refresh-${available.id}`,`usage-refresh-${claude.id}`]){const button=byId(view,buttonId);assert.equal(button.style.disabled[0],true);assert.equal(button.kids[0].style.spin?.[0],buttonId===id?900:undefined);}
  await drain();view=viewInstance.render();for(const buttonId of ['usage-refresh',`usage-refresh-${available.id}`,`usage-refresh-${claude.id}`]){assert.equal(byId(view,buttonId).style.disabled[0],false);assert.equal(byId(view,buttonId).kids[0].style.spin,undefined);}
}
// Pre-account-integration caches/errors must not suppress a fresh collection.
setup({reports:[available]});storage.set(key(null,'cache'),{version:4,reports:[available],at:Date.now(),error:'old transport failure'});
view=viewInstance.render();assert.match(byId(view,'usage-summary-open').style.accessibility_label[0],/---/);
assert.equal(vm.runInContext('cache(null).error',context),undefined,'The old transport error is invalidated, not carried into the new dialog');
// Organization-aware Claude IDs retain old pins only when the match is unique.
for(const ambiguous of [false,true]) {
  setup({reports:[available]});
  replyReports=[{...available,id:'new',previousId:'report'},...(ambiguous?[{...available,id:'other',previousId:'report'}]:[])];
  context.testCx=cx;vm.runInContext('refresh(null,testCx,{force:true})',context);await drain();
  assert.equal(storage.get(key(null,'preferences')).pins[0],ambiguous?quota:JSON.stringify(['new','weekly']));
}
// A rate-limited account keeps its last numbers and its Retry-After is passed back
// to the collector, including on manual refreshes.
setup({reports:[available]});
const limited={id:'report',sourceLabel:'Codex',report:{status:'error',error:'Usage requests are rate limited. Try again later.',retryAt:Date.now()+900000}};
replyReports=[limited];vm.runInContext('refresh(null,testCx,{force:true})',context);await drain();
let kept=storage.get(key(null,'cache')).reports[0];
assert.equal(kept.report.status,'error');assert.deepEqual(kept.lastSuccessful.report,available.report,'A failed refresh keeps the last known usage');
assert.match(vm.runInContext('problem(cache(null).reports[0].report)',context),/Next check after \d+:\d\d[AP]M\.$/);
vm.runInContext('refresh(null,testCx,{force:true})',context);await drain();
assert.equal(JSON.parse(executions.at(-1).args.at(-1)).hold.report,limited.report.retryAt,'Refreshes carry the provider back-off to the collector');
assert.deepEqual(storage.get(key(null,'cache')).reports[0].lastSuccessful.report,available.report,'Repeated failures do not discard the last known usage');
// An account another machine fetched within the TTL is not requested again.
setup({host:'pc2',reports:[]});storage.set(key('pc2','cache'),{version:5,reports:[],at:0});
const elsewhere={...available,account:{id:'account',label:'local@example.test'},fetchedAt:'2030-01-01T00:00:00.000Z',checkedAt:Date.now()};
storage.set(key(null,'cache'),{version:5,reports:[elsewhere,{...elsewhere,id:'stale',checkedAt:Date.now()-601000},{...elsewhere,id:'anonymous',account:{}}],at:Date.now()});
replyReports=[{id:'report',sourceLabel:'Codex',account:{id:'account'},fetchedAt:'now',report:{status:'reused'}}];
vm.runInContext("refresh('pc2',testCx)",context);await drain();
assert.deepEqual(JSON.parse(executions.at(-1).args.at(-1)).reuse,['report'],'Only fresh, account-identified reports are reused');
kept=storage.get(key('pc2','cache')).reports[0];
assert.deepEqual(kept.report,available.report);assert.equal(kept.checkedAt,elsewhere.checkedAt,'Reused reports keep their original fetch time');assert.equal(kept.account.label,'local@example.test');
vm.runInContext("refresh('pc2',testCx,{force:true})",context);await drain();
assert.deepEqual(JSON.parse(executions.at(-1).args.at(-1)).reuse,[],'A manual refresh asks the provider itself');
// A recent collection must not extend the age of an older reused quota.
clock=Date.now();context.Date=class extends RealDate{static now(){return clock;}};
const older={...elsewhere,checkedAt:clock-590000},sibling={...elsewhere,id:'sibling',checkedAt:clock};
storage.clear();storage.set(key('pc2','preferences'),{pins:[quota]});
storage.set(key('pc2','cache'),{version:5,reports:[older,sibling],at:clock});
replyReports=[{...older,report:available.report},{...sibling,report:{status:'reused'}}];
clock+=10001;const countBefore=executions.length;
vm.runInContext("refresh('pc2',testCx)",context);await drain();
assert.equal(executions.length,countBefore+1,'Reused quota refreshes at its own expiry, not ten minutes after local reuse');
assert.deepEqual(JSON.parse(executions.at(-1).args.at(-1)).reuse,['sibling'],'The newer sibling is reused rather than queried early');
assert.equal(storage.get(key('pc2','cache')).reports[0].checkedAt,clock);
assert.equal(storage.get(key('pc2','cache')).reports[1].checkedAt,sibling.checkedAt);
vm.runInContext("refresh('pc2',testCx)",context);await drain();assert.equal(executions.length,countBefore+1,'Fresh cache remains single-flight/TTL guarded');
context.Date=RealDate;delete context.testCx;
// Account dropdown defaults to the opening Claude session and only filters UI.
const firstClaude={...claude,id:'claude-one',sourceId:'claude',account:{id:'one',organizationId:'org',email:'one@example.test'}};
const secondClaude={...claude,id:'claude-two',sourceId:'claude',account:{id:'two',organizationId:'org',email:'two@example.test'}};
setup({reports:[available,firstClaude,secondClaude]});summaryMode=false;
focusSnapshot={terminal:'t1'};terminalSnapshot=[{address:'t1',program:{key:'claude'},labels:{'custom.claude.email':'two@example.test','custom.claude.account':'two','custom.claude.organization':'org','custom.claude.at':String(Date.now()),'custom.claude.state':'ok'}}];
viewInstance=new context.UsageView();viewInstance.init({}, {...cx,focus_handle:()=>({focus:()=>{focusSnapshot=null;}}),timer:{...cx.timer,every(){}}});
view=viewInstance.render();assert.ok(byId(view,'usage-report-claude-two'));assert.equal(byId(view,'usage-report-claude-one'),undefined);
assert.equal(text(byId(view,'usage-claude-account')),'two@example.test','Only the original email text appears in the footer');
assert.equal(focusSnapshot,null,'The dialog took focus after capturing the terminal');
const emailTrigger=byId(view,'usage-claude-account');
assert.equal(emailTrigger.hoverStyle.style.bg[0],byId(viewInstance.summary(context.theme()),'usage-summary-open').hoverStyle.style.bg[0],'Email hover matches the sidebar Usage hover');
assert.deepEqual(Object.keys(emailTrigger.hoverStyle.style),['bg'],'Hover changes only the background, not email color');
assert.equal(emailTrigger.style.border_1,undefined);assert.equal(emailTrigger.style.bg,undefined,'No outlined field or idle fill');
assert.equal(emailTrigger.style.h[0],28);assert.equal(emailTrigger.style.rounded[0],6);assert.equal(emailTrigger.style.ml[0],-6,'Email stays at its original text inset');
assert.ok(byId(view,'usage-account-claude-two').style.self_start,'Hitbox is intrinsic, not a full-width form field');
assert.ok(nodes(emailTrigger).some(n=>n.style.asset?.[0]?.endsWith('/chevron-down.svg')));
assert.doesNotMatch(text(view),/Automatic|This session|Viewing usage|Showing all|not reported/,'No extra account annotations in Usage');
byId(view,'usage-claude-account-popup').events.on_open_change(true,cx);view=viewInstance.render();
assert.equal(byId(view,'usage-claude-choice-auto'),undefined);assert.equal(byId(view,'usage-claude-choice-all'),undefined,'The footer menu contains accounts only');
assert.equal(text(byId(view,'usage-claude-choice-claude-one')),'one@example.test');
const beforeSelectionExec=executions.length,beforeSelectionJobs=jobs.length;
byId(view,'usage-claude-choice-claude-one').events.on_click({},cx);view=viewInstance.render();
assert.ok(byId(view,'usage-report-claude-one'));assert.equal(byId(view,'usage-report-claude-two'),undefined);assert.ok(byId(view,'usage-report-report'),'Codex is unaffected');
assert.equal(executions.length,beforeSelectionExec);assert.equal(jobs.length,beforeSelectionJobs,'Choosing an account never launches a helper or switches a login');
assert.equal(vm.runInContext('preferences(null).claudeAutomatic',context),true,'Manual inspection does not disable the Automatic setting');
viewInstance.accountOverride=null;view=viewInstance.render();assert.ok(byId(view,'usage-report-claude-two'),'Opening again in Automatic mode prefers the session over the last inspection');
storage.set(key(null,'preferences'),{pins:[quota],claudeAutomatic:false});view=viewInstance.render();
assert.ok(byId(view,'usage-report-claude-one'));assert.equal(byId(view,'usage-report-claude-two'),undefined,'Automatic off remembers the inspected account');
storage.set('custom.usage.local.claudeSelection','auto');view=viewInstance.render();assert.ok(byId(view,'usage-report-claude-one'));assert.equal(byId(view,'usage-report-claude-two'),undefined,'Automatic off cannot follow a legacy auto selection');
storage.set('custom.usage.local.claudeSelection','claude-one');
storage.set(key(null,'preferences'),{pins:[quota],claudeAutomatic:true});terminalSnapshot[0].labels['custom.claude.at']='1';view=viewInstance.render();
assert.ok(byId(view,'usage-report-claude-one'));assert.equal(byId(view,'usage-report-claude-two'),undefined);assert.doesNotMatch(text(view),/Showing|not reported yet|Viewing|Automatic/,'Unknown context silently retains the remembered email, with no session claim');
storage.set(key(null,'cache'),{version:5,reports:[available,secondClaude],at:Date.now()});view=viewInstance.render();
assert.equal(byId(view,'usage-claude-account-popup'),undefined);assert.equal(byId(view,'usage-claude-account'),undefined);
const singleEmail=byId(view,'usage-account-claude-two');assert.equal(text(singleEmail),'two@example.test');assert.equal(singleEmail.hoverStyle,null);assert.equal(singleEmail.events.on_click,undefined);
assert.equal(singleEmail.style.role,undefined,'A single account is plain text, not a disabled dropdown');
assert.ok(!nodes(singleEmail).some(n=>n.style.asset?.[0]?.endsWith('/chevron-down.svg')),'A single account has no chevron');
// Claude's refresh updates every saved account; only its initiating icon owns feedback.
for(const host of [null,'pc2'])for(const accountFailure of [false,true]){
  const initial=[available,{...firstClaude,report:available.report},{...secondClaude,report:available.report}];
  setup({host,reports:initial,prefs:{pins:[quota,JSON.stringify(['claude-two','weekly'])]}});summaryMode=false;viewInstance.machine=host;viewInstance.accountOverride='claude-one';
  const beforePins=JSON.stringify(storage.get(key(host,'preferences')).pins);
  replyReports=[{...available,report:{status:'available',windows:[]}},
    {...firstClaude,report:{status:'available',windows:[{id:'weekly',usedPct:45}]}},
    {...secondClaude,report:accountFailure?{status:'error',error:'Fixture failure'}:{status:'available',windows:[{id:'weekly',usedPct:70}]}},
    {...firstClaude,id:'claude-new',account:{id:'new',email:'new@example.test'}}];
  byId(viewInstance.render(),'usage-refresh-claude-one').events.on_click({},cx);assert.equal(storage.get(key(host,'cache')).reportId,'claude-one');await drain();
  const request=JSON.parse(executions.at(-1).args.at(-1));assert.equal(request.sourceId,'claude');assert.equal(request.reportId,undefined);assert.equal(executions.at(-1).options.on,host);
  const reports=storage.get(key(host,'cache')).reports;assert.deepEqual(reports.find(e=>e.id==='report'),available,'Other provider data is preserved, even if an overbroad worker reply includes it');assert.equal(reports.find(e=>e.id==='claude-one').report.windows[0].usedPct,45);assert.ok(reports.some(e=>e.id==='claude-new'),'Provider discovery can add an account absent from the old cache');
  const second=reports.find(e=>e.id==='claude-two');if(accountFailure)assert.deepEqual(second.lastSuccessful.report,available.report);else assert.equal(second.report.windows[0].usedPct,70);
  assert.equal(JSON.stringify(storage.get(key(host,'preferences')).pins),beforePins);assert.equal(viewInstance.accountOverride,'claude-one');assert.ok(byId(viewInstance.render(),'usage-report-claude-one'),'Refresh does not change the inspected account');
}
// Pinned quotas of several Claude accounts are told apart by the email's local part.
view=setup({reports:[available,{...firstClaude,report:available.report},{...secondClaude,report:available.report}],prefs:{pins:[quota,JSON.stringify(['claude-one','weekly']),JSON.stringify(['claude-two','weekly'])]}});
assert.equal(byId(view,'usage-summary-open').style.accessibility_label[0],'Codex · Weekly · 82% left\nClaude · Weekly · 82% left (one)\nClaude · Weekly · 82% left (two)');
assert.equal(byId(view,'usage-summary-open').style.tooltip,undefined,'The hover card replaces the one-line native tooltip');
{
  // One left-aligned column per field, so the separators line up across rows.
  const columns=byId(view,'usage-summary-hint').kids[1].kids,cells=i=>columns[i].kids.map(row=>row.kids[0]);
  assert.equal(columns.length,6);
  assert.deepEqual(cells(0),['Codex','Claude','Claude']);assert.deepEqual(cells(3),['·','·','·']);assert.deepEqual(cells(5),['','(one)','(two)']);
}
// Reset buttons use the header label's natural-width box, not its wider column
// or the chevron. Both providers/count widths retain the same slot and hover gate.
for(const sourceLabel of ['Claude','Codex'])for(const available of [2,12]) {
  const field=sourceLabel==='Claude'?'claudeResets':'codexResets';
  const group={name:'Full reset',left:1,grantId:'centre',usable:true};
  const entry={...cardEntry,sourceId:sourceLabel.toLowerCase(),sourceLabel,
    report:{status:'available',windows:[],[field]:{available,groups:[group]}}};
  setup({reports:[entry]});summaryMode=false;viewInstance.machine=null;viewInstance.resetsOpen=new Set([entry.id]);
  const render=()=>card(entry),rid=`usage-claude-reset-line-${entry.id}:centre`,bid=`usage-claude-reset-${entry.id}:centre`;
  assert.equal(byId(render(),bid),undefined,'Button remains hidden off hover');
  byId(render(),rid).events.on_hover(true,cx);
  const tree=render(),slot=byId(tree,`${rid}-slot`),anchor=slot.kids[0],copy=anchor.kids[0],overlay=anchor.kids[1],button=byId(tree,bid);
  assert.equal(text(byId(tree,`usage-claude-resets-count-${entry.id}`)),`${available} available`);
  assert.equal(copy.kids[0],`${available} available`);assert.ok(copy.style.invisible);
  assert.ok(anchor.style.relative);assert.ok(anchor.style.flex_none);assert.equal(anchor.style.w,undefined);
  assert.ok(overlay.style.absolute);assert.ok(overlay.style.inset_0);assert.ok(overlay.style.justify_center);
  assert.equal(slot.style.w[0],80);assert.equal(slot.style.h[0],28);
  assert.equal(byId(tree,rid).kids.at(-1).style.size[0],28,'Same trailing chevron box and gap as the header');
  for(const property of ['w','min_w','max_w'])assert.equal(button.style[property][0],80);
  for(const property of ['h','min_h','max_h'])assert.equal(button.style[property][0],24);
  assert.equal(nodes(anchor).some(n=>n.events.on_size_change),false,'Alignment has no measurement callbacks');
  byId(tree,rid).events.on_hover(false,cx);assert.equal(byId(render(),bid),undefined);
}
// Reset success is silent for every kind/provider. Exercise the actual card,
// claim controller, store refresh and shared collapsible; only transport is fake.
const deferred=()=>{let resolve;const promise=new Promise(r=>resolve=r);return {promise,resolve};};
const originalExec=context.exec;
for(const host of [null,'pc2'])for(const sourceLabel of ['Claude','Codex'])for(const name of ['Full reset','Fable reset','Future reset']){
  const resetField=sourceLabel==='Claude'?'claudeResets':'codexResets';
  const group={name,left:2,endsAt:'2030-01-02T00:00:00Z',grantId:'grant-one',usable:true};
  const entry={...cardEntry,sourceId:sourceLabel.toLowerCase(),sourceLabel,account:{id:'fixture-account',organizationId:'fixture-org'},
    report:{status:'available',windows:[{id:'weekly',label:'Weekly',usedPct:100}],
      [resetField]:{available:2,groups:[group]}}};
  setup({host,reports:[entry]});summaryMode=false;viewInstance.machine=host;viewInstance.resetsOpen=new Set([entry.id]);
  const current=()=>storage.get(key(host,'cache')).reports[0];
  const render=()=>viewInstance.card(context.theme(),current(),{remaining:true,pins:[]},storage.get(key(host,'cache')));
  const prefix=`usage-claude-resets-${entry.id}`,outcome=`usage-claude-reset-outcome-${entry.id}`;
  const clipHeight=tree=>byId(tree,`${prefix}-clip`).style.h[0];
  const before=render(),height=clipHeight(before);
  const quotaKey=JSON.stringify([entry.id,'weekly']);
  byId(before,`usage-track-${quotaKey}`).events.on_size_change({width:200,height:4},cx);
  assert.equal(byId(render(),`usage-fill-${quotaKey}`).style.w[0],0);
  const claimed=deferred(),collected=deferred(),claimStarted=deferred(),collectionStarted=deferred();
  context.exec=async(command,args,options)=>{
    const request=JSON.parse(args.at(-1));
    if(request.action){
      executions.push({command,args,options});claimStarted.resolve();await claimed.promise;
      assert.equal(request.action,sourceLabel==='Claude'?'claude-reset':'codex-reset');
      assert.equal(request.grantId,group.grantId);assert.equal(options.on,host);
      return {code:0,stdout:JSON.stringify({result:'reset'})};
    }
    collectionStarted.resolve();await collected.promise;return originalExec(command,args,options);
  };
  const rid=`usage-claude-reset-line-${entry.id}:${group.grantId}`,bid=`usage-claude-reset-${entry.id}:${group.grantId}`;
  byId(render(),rid).events.on_hover(true,cx);
  byId(render(),bid).events.on_click({},cx);assert.equal(text(byId(render(),bid)),'Confirm');
  byId(render(),bid).events.on_click({},cx);
  const claimJob=jobs.pop();jobs.length=0; // discard only the confirmation-expiry job
  const claimCx={...cx,sleep:async()=>{if(jobs.length)await jobs.shift()(claimCx);}};
  const running=claimJob(claimCx);await claimStarted.promise;
  const busy=()=>{const tree=render();assert.equal(text(byId(tree,bid)),'Resetting…');assert.equal(byId(tree,bid).style.disabled[0],true);assert.equal(byId(tree,outcome),undefined);assert.equal(clipHeight(tree),height);};
  busy();claimed.resolve();await collectionStarted.promise;busy();
  replyReports=[{...entry,report:{...entry.report,windows:[{id:'weekly',label:'Weekly',usedPct:0}],
    [resetField]:{available:1,groups:[{...group,left:1,endsAt:'2030-01-12T00:00:00Z',grantId:'grant-two'}]}}}];
  collected.resolve();await running;
  const after=render();assert.equal(viewInstance.claiming,null);assert.equal(viewInstance.resetOutcome,null);
  assert.equal(byId(after,outcome),undefined,'Success adds no description node');
  assert.doesNotMatch(text(after),/used\. Limits refilled|did not finish/);
  assert.equal(clipHeight(after),height,'Completing a reset adds no section height');
  assert.equal(byId(after,`${prefix}-body`).style.pt[0],byId(before,`${prefix}-body`).style.pt[0]);
  assert.equal(text(byId(after,`usage-claude-resets-count-${entry.id}`)),'1 available');
  assert.match(text(after),/Expires Jan 12/);assert.doesNotMatch(text(after),/All expire/);
  const fill=byId(after,`usage-fill-${quotaKey}`);assert.equal(fill.style.w[0],200);
  assert.equal(fill.style.transition[0],'width');assert.equal(fill.style.transition[1].duration,700);
  assert.equal(fill.style.transition[1].easing,'ease-out');
  const collectRequest=JSON.parse(executions.at(-1).args.at(-1));
  assert.equal(collectRequest.refresh,true);assert.equal(sourceLabel==='Claude'?collectRequest.sourceId:collectRequest.reportId,sourceLabel==='Claude'?'claude':entry.id);
}
// Transport failures and every provider refusal retain the existing message slot.
for(const sourceLabel of ['Claude','Codex'])for(const [reply,message] of [
  [{error:'Fixture reset failed.'},'Fixture reset failed.'],
  [{result:'already_used'},'That reset was already used.'],
  [{result:'not_limited'},'Nothing to reset yet: use it once you hit a limit.'],
  [{result:'cooldown'},'Resets are cooling down. Try again later.'],
  [{result:'ineligible'},'This account can’t use that reset.'],
  [{result:'unavailable'},'That reset isn’t available right now.'],
  [{result:'rate_limited'},'Too many requests. Try again shortly.'],
  [{result:'unknown'},'The reset did not finish.'],
]){
  const group={name:'Full reset',left:1,grantId:'grant-one',usable:true};
  const entry={...cardEntry,sourceId:sourceLabel.toLowerCase(),sourceLabel,report:{status:'available',windows:[],
    [sourceLabel==='Claude'?'claudeResets':'codexResets']:{available:1,groups:[group]}}};
  setup({reports:[entry]});replyReports=[entry];viewInstance.machine=null;viewInstance.resetsOpen=new Set([entry.id]);
  const render=()=>card(storage.get(key(null,'cache')).reports[0]);
  const before=render(),prefix=`usage-claude-resets-${entry.id}`;
  context.exec=async(command,args,options)=>JSON.parse(args.at(-1)).action?{code:0,stdout:JSON.stringify(reply)}:originalExec(command,args,options);
  viewInstance.startClaim(entry,group,`${entry.id}:${group.grantId}`,cx);
  await jobs.shift()({...cx,sleep:async()=>{if(jobs.length)await jobs.shift()(cx);}});
  const after=render(),outcome=byId(after,`usage-claude-reset-outcome-${entry.id}`);
  assert.equal(text(outcome),message);assert.equal(outcome.style.h[0],18);
  assert.equal(byId(after,`${prefix}-clip`).style.h[0],byId(before,`${prefix}-clip`).style.h[0]+20,'Failures retain their original feedback space');
  assert.equal(viewInstance.claiming,null);
  const other=card({...entry,id:'other-account'});assert.equal(byId(other,'usage-claude-reset-outcome-other-account'),undefined,'Failure stays on the initiating card');
}
context.exec=originalExec;
console.log('PASS: stale widget/dialog navigation, provider recovery, reset success silence/stable height/refill/refresh, failure feedback, account context and single-flight refresh');
