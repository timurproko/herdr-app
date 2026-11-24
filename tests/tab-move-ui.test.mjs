import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withKitUi} from './support/panel-kit.mjs';
import {createRequire} from 'node:module';
import {build} from '../tools/build.mjs';
const {operate} = createRequire(import.meta.url)(`${build().output}/mods/custom-tabs/move-tab.cjs`);
const states = {}, calls = [], notices = [], executions = [], tasks = [];
const requiredCommands=['tab.new','tab.move','tab.settle','tab.select','pane.focus'];
let availableCommands=requiredCommands, appVersion='0.1.16';
let world, focus, keepSource = false, replyStatus = 'moved', navigate = false, acknowledge = true, inspectWorker = null;
const capability = {ok: true, coreId: 'core-one', fingerprint: 'a'.repeat(64)};
function reset() {
  world = [
    {id: 's1', machine: null, active: true, tabs: [{id: 'tb1', active: true}, {id: 'tbOther'}]},
    {id: 's2', machine: null, tabs: [{id: 'tb2', active: true}]},
    {id: 'remote/s3', machine: 'remote', tabs: []},
  ];
  focus = {space: 's1', tab: 'tb1', pane: 'p1', cwd: 'DO NOT TRANSPORT THIS'};
  for (const k of Object.keys(states)) delete states[k];
  calls.length = notices.length = executions.length = tasks.length = 0;
  keepSource = false; replyStatus = 'moved'; navigate = false; acknowledge = true;
  availableCommands=requiredCommands; appVersion='0.1.16';
}
reset();
const cx = {spawn: fn => tasks.push(fn), sleep: async () => {}, notify() {}};
const lifecycle = {isStartTab: t => t.id === 'start', ensureSpaceStart: id => {
  const s = world.find(s => s.id === id); if (!s.tabs.some(t => t.id === 'start')) s.tabs.push({id: 'start'}); return true;
}};
const host = {
  spaces: () => world, panes: () => [], machines: () => [{name: null, layout: 'ready'},{name:'remote',layout:'ready'}], focused: () => focus,
  run: (...args) => calls.push(args), commands:()=>availableCommands.map(name=>({name})), appHome: () => 'C:/fixture', hostVersion: () => appVersion,
  window: () => ({active: true}), shared: key => states[key], setShared: (key, value) => states[key] = value,
  notify: n => notices.push(n),
  exec: async (_command, args) => {
    const request = JSON.parse(args[1]); executions.push(request);
    assert.equal(args[0], 'C:/fixture/mods/custom-tabs/move-tab.cjs', 'Run a packaged file, never source-checkout code');
    if (request.action === 'inspect') return {code: 0, stdout: JSON.stringify(inspectWorker ? await inspectWorker(request) : capability)};
    if (acknowledge && request.action === 'move' && ['moved', 'partial'].includes(replyStatus)) {
      const s = world.find(s => s.id === request.sourceSpaceId), t = s.tabs.find(t => t.id === request.tabId);
      s.tabs = s.tabs.filter(candidate => candidate !== t); if (!s.tabs.length) world = world.filter(w => w !== s);
      const d = world.find(s => s.id === request.destinationSpaceId); d.tabs.push({...t, active: false});
      if (s.tabs.length) s.tabs[0].active = true;
      focus = navigate ? {space: 's2', tab: 'tb2', pane: 'p2'} : {space: 's1', tab: s.tabs[0]?.id, pane: 'fallback'};
      for (const w of world) w.active = w.id === focus.space;
    }
    return {code: 0, stdout: JSON.stringify({ok: replyStatus === 'moved' || replyStatus === 'repaired', status: replyStatus, message: 'fixture reply'})};
  },
};
const context = vm.createContext({console});
async function loadController() {
  const exports = {'./host.js': host, './space-lifecycle.js': lifecycle, './space-preferences.js': {spacePreferences: () => ({closeOnLastTab: !keepSource})}};
  const m = new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/tab-moves.js', import.meta.url), 'utf8'), {context});
  await m.link(name => new vm.SyntheticModule(Object.keys(exports[name]), function() { for (const [k,v] of Object.entries(exports[name])) this.setExport(k,v); }, {context}));
  await m.evaluate(); return m.namespace;
}
const api = await loadController();
const flush = async () => { while (tasks.length) await tasks.shift()(cx); };
const target = {space: 's1', id: 'tb1'};
assert.deepEqual([...api.tabMoveDestinations('s1')].map(s => s.id), ['s2']);
assert.equal(api.tabMoveDestinations('remote/s3').length, 0);
assert.equal((await api.inspectTabMove(target)).ok, true);
assert.equal(api.requestTabMove(target, 's2', capability), true);
let command = calls.at(-1)[0].slice('custom-tabs.'.length), request = JSON.parse(command.slice('tab-move:'.length));
assert.equal(request.origin, undefined, 'Moving has no automatic-follow request');
assert.deepEqual(Object.keys(states), [], 'No persisted mutation requests');
assert.equal(api.routeTabMove(command, cx), true); await flush();
assert.equal(executions.filter(r => r.action === 'move').length, 1);
assert.equal(calls.some(([name]) => name === 'tab.select'), false, 'Never open the moved tab or switch to its space');
assert.equal(world.find(s => s.active)?.id, 's1');
assert.equal(states['custom.tab-move.busy'], null);
const arrivals = () => calls.filter(([name]) => name.startsWith('custom-spaces.tab-arrived:'));
assert.equal(arrivals().length, 1, 'One ephemeral sidebar animation after acknowledgement');
const arrival = JSON.parse(arrivals()[0][0].slice('custom-spaces.tab-arrived:'.length));
assert.equal(arrival.spaceId, 's2'); assert.equal(arrival.tabId, 'tb1'); assert.equal(arrival.requestId, request.requestId);
assert.ok(arrival.expiresAt > Date.now() && arrival.expiresAt <= Date.now() + 3000);
reset(); replyStatus = 'partial';
api.requestTabMove(target, 's2', capability); api.routeTabMove(calls.at(-1)[0].slice('custom-tabs.'.length), cx); await flush();
assert.equal(arrivals().length, 1, 'Committed moves still animate when adoption-label repair is needed');
assert.equal(notices.length, 1);
reset(); acknowledge = false;
api.requestTabMove(target, 's2', capability); api.routeTabMove(calls.at(-1)[0].slice('custom-tabs.'.length), cx); await flush();
assert.equal(arrivals().length, 0, 'A missing window acknowledgement never claims arrival');
assert.equal(notices.length, 1);
reset(); navigate = true;
api.requestTabMove(target, 's2', capability); api.routeTabMove(calls.at(-1)[0].slice('custom-tabs.'.length), cx); await flush();
assert.equal(calls.some(([name]) => name === 'tab.select'), false, 'Do not follow after observable navigation elsewhere');
reset(); keepSource = false; world[0].tabs = [world[0].tabs[0]];
api.requestTabMove(target, 's2', capability); api.routeTabMove(calls.at(-1)[0].slice('custom-tabs.'.length), cx); await flush();
assert.equal(world[0].tabs[0].id, 'start', 'A final-tab move retains its source even with ordinary auto-close enabled');
reset(); replyStatus = 'unknown';
api.requestTabMove(target, 's2', capability); api.routeTabMove(calls.at(-1)[0].slice('custom-tabs.'.length), cx); await flush();
assert.equal(notices.length, 1); assert.equal(calls.some(([name]) => name === 'tab.select'), false);
assert.equal(arrivals().length, 0, 'Unknown/failed moves do not animate success');
reset(); replyStatus = 'repaired';
api.requestTabMove(target, undefined, capability, 'repair'); api.routeTabMove(calls.at(-1)[0].slice('custom-tabs.'.length), cx); await flush();
assert.equal(executions[0].action, 'repair'); assert.equal(calls.some(([n]) => n === 'tab.select'), false);
assert.equal(arrivals().length, 0, 'Metadata repair is not a tab arrival');
reset();
assert.equal(api.requestTabMove(target, 'remote/s3', capability), false);
world.push({id:'remote/s4',machine:'remote',tabs:[]});
assert.deepEqual([...api.tabMoveDestinations('remote/s3')].map(s=>s.id),['remote/s4'],'A remote tab lists only spaces on that same machine');
world[2].tabs.push({id:'remote/tb3'});
assert.equal(api.requestTabMove({space:'remote/s3',id:'remote/tb3'},'s2',capability),false,'Never cross machines');
assert.equal(api.requestTabMove({space:'remote/s3',id:'remote/tb3'},'remote/s4',capability),true);
const remoteRequest=JSON.parse(calls.at(-1)[0].split('tab-move:')[1]);
assert.equal(remoteRequest.machine,'remote');assert.equal(remoteRequest.tabId,'remote/tb3','Keep qualified IDs until the adapter scopes them');
assert.equal(api.requestTabMove(target, 's2', {ok: false}), false);
api.routeTabMove('tab-move:' + JSON.stringify({...request, expiresAt: 1}), cx); await flush();
assert.equal(executions.length, 0, 'Expired buffered commands never replay writes');
assert.equal(api.routeTabMove('rename-tab', cx), false);
api.routeTabMove('tab-move:{bad JSON', cx); await flush();
assert.equal(executions.length, 0);
// Menu's deferred state and interaction are tested without any real Core/UI.
function element(asset) {
  const n = {asset, kids: [], events: {}, style: {}}; let proxy;
  proxy = new Proxy(n, {get(o,k) {
    if (k in o) return o[k]; if (k === 'when') return (yes, fn) => yes ? fn(proxy) : proxy;
    if (k === 'child') return x => { if (x != null) o.kids.push(x); return proxy; };
    if (k === 'children') return xs => { o.kids.push(...xs); return proxy; };
    if (String(k).startsWith('on_')) return (...args) => { o.events[k] = args.at(-1); return proxy; };
    if (k === 'hover') return fn => {o.hoverStyle=element();fn(o.hoverStyle); return proxy;}; if (k === 'then') return undefined;
    return (...args) => {o.style[k] = args; return proxy;};
  }}); return proxy;
}
let menuSpaces = [{id: 's1', index: 1, name: 'Source', machine: null, tabs:[{id:'tb1'}]}, {id: 's2', index: 2, name: 'Target', machine: null, tabs:[]}];
const closed = [], selected = [], colors = [], opened = [], legacyActions = [], p = {tab: 'tab', target, overlay: 'menu'};
let menuActions = [], menuInspect = async () => capability, integratedMenu = false;
const menuContext = vm.createContext({});
const modules = {
  'gpui-kit': {View: class {}, div: element, svg: element}, 'gpui-base': {v_flex: element, h_flex: element},
  './ui.js': {U: {row:28,gap:8,radius:6,smallIcon:14}, menuSurface: (_t,x) => x, hotkey: x => x,
    menuHeading: (_t,text,el=element()) => el.child(text),
    badge: (label,fill) => {colors.push([label,fill]);return element();}, spaceBadgeColor: (_t,s,c) => c[s.id]},
  './directory.js': {displaySpace: x => x}, './sidebar-footer.js': {footerItems: () => []}, './modal-layout.js': {divider: element, dividerHeight: () => 17},
  './space-colors.js': {spaceColorPicker: element,setSpaceColor(){},selectedColorIndex:()=>0,colorAt:()=>0,COLOR_COUNT:6},
  './plugins.js': {pluginAllows:()=>false,pluginEvent(){},pluginMenuItems:()=>menuActions,pluginWorkspaceLinks:()=>[]},
  './customization-updates.js': {customizationUpdateAvailable:()=>false},
  './agent-rename.js': {requestInlineAgentRename:()=>true},
  './tab-rename.js': {requestInlineTabRename:()=>true}, './space-rename.js': {requestInlineSpaceRename:()=>true}, './close-space.js': {closeWithConfirmation(...args){legacyActions.push(args);}},
  './tab-moves.js': {inspectTabMove:target=>menuInspect(target),tabMoveDestinations:()=>menuSpaces.filter(s=>s.id!=='s1'),requestTabMove:(...args)=>{selected.push(args);return integratedMenu ? api.requestTabMove(...args) : true;}},
  './host.js': {updates:()=>({app:{}}),run(){},props:()=>p,closeOverlay:id=>closed.push(id),openOverlay:spec=>opened.push(spec),theme:()=>({muted:'#aaaaaa',dim:'#777777',foreground:'#eeeeee'}),keys:()=>[],terminals:()=>[],spaces:()=>menuSpaces,panes:()=>[],exec:async()=>({}),agents:()=>[],shared:()=>({s2:'#abcdef'}),notify(){}},
};
withKitUi(modules['./ui.js'],element);
const menuModule = new vm.SourceTextModule(fs.readFileSync(new URL('../src/features/menu/main.js',import.meta.url),'utf8'),{context:menuContext});
await menuModule.link(name => name==='./settings-dialog.js'?new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/settings-dialog.js',import.meta.url),'utf8'),{context:menuContext}):new vm.SyntheticModule(Object.keys(modules[name]),function(){for(const [k,v]of Object.entries(modules[name]))this.setExport(k,v);},{context:menuContext}));
await menuModule.evaluate();const menu = new menuModule.namespace.default();
const preflights=[];
const mcx = {spawn:fn=>preflights.push(fn),focus_handle:()=>({focus(){}}),notify(){},stop_propagation(){}};menu.init({},mcx);
assert.equal(preflights.length,1,'Preflight starts on opening the parent tab context menu');
menu.moveTo = true; assert.equal(menu.list()[1][0],'Target','Spaces appear immediately from the existing snapshot, before the probe finishes');
assert.equal(menu.unavailable(menu.list()[1]), true, 'Unverified destinations cannot write'); menu.moveTo = false;
await preflights.shift()(mcx);assert.equal(menu.moveCapability.ok,true);menu.at = 2;
let tree = menu.render(mcx);
const nodes=n=>n&&typeof n==='object'?[n,...(n.kids??[]).flatMap(nodes)]:[];
const moveParent=tree.kids[0].kids[2].kids.at(-1), moveIcon=moveParent.kids[0].kids[0];
assert.equal(moveIcon.asset,'mods/custom-workspace-chrome/chevron-right.svg');
assert.equal(moveIcon.style.size[0],14);assert.equal(moveIcon.style.text_color[0],'#aaaaaa');
assert.equal(moveParent.kids[0].style.size[0],16,'Leading chevron uses the shared icon column');
assert.equal(moveParent.kids.length,2,'No duplicate trailing hint');
assert.ok(!nodes(moveParent).some(n=>n.asset?.endsWith('layers.svg')||n.kids.includes('›')));
tree.events.on_key_down({key:'right'},mcx);
assert.equal(menu.moveTo,true);tree=menu.render(mcx);
const keyboardRows=tree.kids[0].kids.map(group=>group.kids.at(-1));
const back=keyboardRows[0],backIcon=back.kids[0].kids[0];
assert.equal(backIcon.asset,'mods/custom-workspace-chrome/chevron-left.svg');
assert.equal(backIcon.style.size[0],moveIcon.style.size[0]);
assert.equal(backIcon.style.text_color[0],moveIcon.style.text_color[0]);
for(const property of ['size','flex_none','items_center','justify_center']) assert.deepEqual(back.kids[0].style[property],moveParent.kids[0].style[property]);
for(const property of ['px','gap','items_center']) assert.deepEqual(back.style[property],moveParent.style[property]);
assert.ok(!nodes(keyboardRows[1]).some(n=>n.asset?.endsWith('chevron-right.svg')),'Real destinations retain colored badges, not navigation arrows');
assert.equal(tree.kids[0].kids[1].kids.length,3,'A divider and heading separate Back from destination spaces');
const heading=tree.kids[0].kids[1].kids[1];
assert.equal(heading.style.id[0],'move-spaces-heading');assert.equal(heading.kids[0],'Available spaces');
assert.equal(heading.events.on_click,undefined,'The section header is not a keyboard/click action');
assert.equal(keyboardRows.filter(row=>row.style.bg).length,1,'Keyboard has one selected row');
assert.ok(keyboardRows.every(row=>!row.hoverStyle.style.bg),'Keyboard selection suppresses a second pointer hover');
assert.ok(keyboardRows.every(row=>row.style.id[0].startsWith('move-mi-')),'Submenu rows do not inherit parent-menu retained hover state');
assert.equal(tree.kids[0].style.h[0],97,'A fit-content popup includes rows, Back divider and spaces heading');
assert.equal(colors.at(-1)[0],'2');assert.equal(colors.at(-1)[1],'#abcdef','Destination uses the sidebar badge color');
assert.equal(menu.list()[1][0],'Target');tree.events.on_key_down({key:'escape'},mcx);assert.equal(menu.moveTo,false);assert.equal(closed.length,0);
menu.choose(2,mcx);assert.equal(menu.at,-1,'Mouse-open does not highlight the first destination');
assert.equal(menu.keyboard,false);menu.choose(1,mcx);assert.equal(selected[0][1],'s2');assert.equal(closed[0],'menu');
menu.moveTo=false;menu.moveCapability={...capability,repairNeeded:true};assert.ok(menu.list().some(it=>it[1]==='custom.repair-tab'));menu.moveTo=true;assert.equal(menu.list()[1][1],'custom.repair-tab');menu.moveTo=false;
menuSpaces=[menuSpaces[0]];menu.moveCapability=capability;menu.moveTo=true;assert.equal(menu.list()[1][0],'No other spaces on this machine');assert.equal(menu.unavailable(menu.list()[1]),true);
// Explanations use intrinsic wrapping height inside a bounded scroll viewport.
const longMessage='Core is missing doc.set; tab moving is unavailable. Detected App: 0.1.17; Core: 0.1.23; generation: 1. '.repeat(8);
menu.moveCapability={ok:false,message:longMessage}; menu.moveTo=true;
let messageTree=menu.render(mcx),viewport=messageTree.kids[0];
const noteOf=tree=>nodes(tree).find(n=>n.style.id?.[0]==='move-explanation-1');
let note=noteOf(messageTree),textNode=note.kids[1];
assert.equal(viewport.style.h[0],320,'First frame reserves room for an unmeasured note');
assert.ok(viewport.style.overflow_y_scrollbar,'Long content remains scrollable');
assert.ok(note.style.h_auto);assert.ok(note.style.flex_none);assert.equal(note.style.h,undefined,'No fixed row height clips wrapped content');
assert.ok(viewport.kids[1].style.flex_none,'The group cannot shrink a tall note to the viewport');
assert.equal(note.style.role[0],'note');assert.equal(note.events.on_click,undefined);
assert.equal(note.style.accessibility_label[0],longMessage);assert.equal(note.style.text_color[0],'#aaaaaa');
assert.ok(textNode.style.whitespace_normal);assert.equal(textNode.style.truncate,undefined);assert.equal(textNode.kids[0],longMessage);
assert.equal(note.kids[0].kids[0].asset,'mods/custom-workspace-chrome/chevron-right.svg');
assert.equal(note.kids[0].style.size[0],16,'Explanation aligns with Back and Move to');
const beforeInert=selected.length;
menu.at=1;messageTree.events.on_key_down({key:'enter'},mcx);menu.choose(1,mcx);
assert.equal(selected.length,beforeInert,'An explanation cannot submit a move');
note.events.on_size_change({width:220,height:126},mcx);
assert.equal(menu.render(mcx).kids[0].style.h[0],28+17+126,'Logical measured height replaces the single-row budget');
note.events.on_size_change({width:140,height:700},mcx);
assert.equal(menu.render(mcx).kids[0].style.h[0],320,'Narrow/long notes overflow by scrolling, not by shortening their content');
assert.equal(noteOf(menu.render(mcx)).kids[1].kids[0],longMessage);
menu.moveCapability={ok:false,message:'Different explanation'};
note.events.on_size_change({width:220,height:24},mcx);
assert.equal(menu.moveExplanationHeight,700,'A late callback for old text is ignored');
note=noteOf(menu.render(mcx));note.events.on_size_change({width:220,height:48},mcx);
assert.equal(menu.render(mcx).kids[0].style.h[0],28+17+48,'A shorter replacement releases excess height');
for(const key of ['left','escape']) {menu.moveTo=true;menu.render(mcx).events.on_key_down({key},mcx);assert.equal(menu.moveTo,false);}
menu.moveTo=true;menu.choose(0,mcx);assert.equal(menu.moveTo,false,'Back remains clickable');
menu.moveCapability=capability;menu.moveTo=true;
messageTree=menu.render(mcx);note=noteOf(messageTree);
assert.equal(note.kids[1].kids[0],'No other spaces on this machine');
assert.ok(note.kids[1].style.whitespace_normal,'Empty-destination explanations also wrap');
assert.ok(messageTree.kids[0].kids[0].kids[0].kids[1].style.truncate,'Ordinary Back/destination labels keep the shared compact row behavior');
assert.ok(!fs.readFileSync(new URL('../src/features/menu/main.js',import.meta.url),'utf8').includes('.tooltip('),'Menu items have no hover tooltips');
assert.ok(!fs.readFileSync(new URL('../src/features/menu/main.js',import.meta.url),'utf8').includes('Checking move compatibility'),'No loading text in the destination list');
// Space menu rows are complete in the first frame, with no deferred Git work.
const labels = menu => Array.from(menu.list(), it => it[0]);
p.tab = 'space'; p.target = {id:'s1', folder:'/captured/repo', checkout:'main'};
const spaceMenu = new menuModule.namespace.default(); spaceMenu.init({}, mcx);
assert.equal(preflights.length, 0, 'Opening a space menu never waits on local or remote Git');
const mainLabels = ['Rename','New worktree','Open worktree','Close'];
assert.deepEqual(labels(spaceMenu), mainLabels);
spaceMenu.at = 2; spaceMenu.keyboard = true;
const firstFrame = spaceMenu.render(mcx), firstHeight = firstFrame.kids[2].style.h[0];
menuSpaces[0].folder = '/changed/after/open'; p.target.checkout = 'linked';
assert.deepEqual(labels(spaceMenu), mainLabels, 'Later discovery cannot insert Remove above Close');
assert.equal(spaceMenu.render(mcx).kids[2].style.h[0], firstHeight, 'Popup height never changes after discovery');
firstFrame.events.on_key_down({key:'enter'}, mcx);
assert.equal(opened.at(-1).mod, 'custom-worktree');
assert.equal(opened.at(-1).props.action, 'open', 'An unchanged keyboard index still opens the expected action');
assert.equal(opened.at(-1).props.folder, '/captured/repo');
const linkedMenu = new menuModule.namespace.default(); linkedMenu.init({}, mcx);
assert.deepEqual(labels(linkedMenu), ['Rename','New worktree','Open worktree','Remove worktree','Close']);
for (const checkout of ['unknown', undefined, null]) {
  p.target = {id:'s1', checkout};
  const instance = new menuModule.namespace.default(); instance.init({}, mcx);
  assert.deepEqual(labels(instance), checkout === null ? ['Rename','Close'] : mainLabels,
    'Pending/legacy snapshots offer New/Open immediately; known non-repos omit them');
  assert.equal(preflights.length, 0, 'Even uncached menus start no Git probes');
}
p.tab='agent';p.target={terminal:'pc2/t1'};
let renamed=0;menuActions=[{label:'Rename',icon:'pencil.svg',run:()=>renamed++}];
const agentMenu=new menuModule.namespace.default();agentMenu.init({},mcx);
assert.deepEqual(labels(agentMenu),['Pin to the top','Rename','Close']);
menuActions=[];assert.deepEqual(labels(agentMenu),['Pin to the top','Rename','Close'],'Async eligibility cannot shift frozen agent menu indices');
agentMenu.choose(1,mcx);assert.equal(renamed,1);
agentMenu.choose(0,mcx);assert.equal(legacyActions.at(-1)[0],'terminal.pin');assert.equal(legacyActions.at(-1)[1].terminal,'pc2/t1');
agentMenu.choose(2,mcx);assert.equal(legacyActions.at(-1)[0],'terminal.kill');assert.equal(legacyActions.at(-1)[1].terminal,'pc2/t1');
const ordinary=new menuModule.namespace.default();ordinary.init({},mcx);assert.deepEqual(labels(ordinary),['Pin to the top','Close']);
// Real menu -> domain bridge -> worker -> profile, with synthetic RPC only.
reset(); appVersion='0.1.17'; p.tab='tab'; p.target=target; menuSpaces=world; menuInspect=api.inspectTabMove; integratedMenu=true;
const rawTab = id => ({id,name:'Work',root:{id,type:'row',children:[{id:'pane-'+id,type:'block',content:{mod:'custom-files',props:{path:'/fixture'}}}]}});
const snapshot = {version:7,value:{spaces:[{id:'s1',name:'Source',folder:'/source',tabs:[rawTab('tb1')]},{id:'s2',name:'Target',folder:'/target',tabs:[rawTab('tb2')]}]}};
for (const scenario of [{core:'0.1.22'},{core:'0.1.23'},{core:'0.1.23',missingMethod:'doc.set'},...requiredCommands.map(missingCommand=>({core:'0.1.23',missingCommand}))]) {
  const coreVersion=scenario.core, rpcCalls=[];
  availableCommands=requiredCommands.filter(name=>name!==scenario.missingCommand);
  const rpc=async method=>{
    rpcCalls.push(method);
    if(method==='hello') return {version:coreVersion,generation:1,core:{id:'fixture-core'},methods:['doc.get','doc.set','terminal.get','terminal.list','terminal.label'].filter(name=>name!==scenario.missingMethod)};
    if(method==='doc.get') return structuredClone(snapshot);
    if(method==='terminal.list') return {terminals:[]};
    assert.fail('Preflight must never mutate: '+method);
  };
  inspectWorker=request=>operate(request,rpc,{appVersion:()=> appVersion});
  const instance=new menuModule.namespace.default();instance.init({},mcx);
  await preflights.shift()(mcx);instance.choose(2,mcx);
  const before=calls.length, beforeClosed=closed.length;
  if(!scenario.missingMethod&&!scenario.missingCommand) {
    assert.equal(instance.moveCapability.ok,true);
    assert.equal(instance.list()[1][1],'custom.move-tab');
    instance.choose(1,mcx);
    assert.equal(calls.length,before+1,'Verified destination hands off one fresh domain request');
    const handedOff=JSON.parse(calls.at(-1)[0].split('tab-move:')[1]);
    assert.equal(handedOff.appVersion,'0.1.17');assert.equal(handedOff.destinationSpaceId,'s2');
    assert.equal(handedOff.coreId,'fixture-core');assert.match(handedOff.fingerprint,/^[a-f0-9]{64}$/);
  } else {
    assert.equal(instance.moveCapability.ok,false);
    assert.equal(instance.list()[1][1],'custom.move-empty');
    assert.ok(instance.list()[1][0].includes(`missing ${scenario.missingMethod??scenario.missingCommand}`));
    const refusal=noteOf(instance.render(mcx));
    assert.equal(refusal.kids[1].kids[0],instance.moveCapability.message,'The actual worker diagnostic reaches the complete wrapping label');
    assert.equal(refusal.kids[1].style.truncate,undefined);
    instance.choose(1,mcx);instance.at=1;instance.render(mcx).events.on_key_down({key:'enter'},mcx);
    assert.equal(calls.length,before);assert.equal(closed.length,beforeClosed,'Unsupported row is inert');
    assert.deepEqual(rpcCalls,scenario.missingCommand?[]:['hello'],'Actual incompatibility refuses before reading or writing documents');
  }
  assert.ok(!rpcCalls.includes('doc.set')&&!rpcCalls.includes('terminal.label'));
}
// Recheck commands when the mounted Tabs owner consumes an already-verified request.
const pending=calls.at(-1)[0].slice('custom-tabs.'.length),beforeExecution=executions.length;
availableCommands=requiredCommands.filter(name=>name!=='tab.new');
assert.equal(api.routeTabMove(pending,cx),true);await flush();
assert.equal(executions.length,beforeExecution,'Removed command stops the handoff before worker mutation');
assert.match(notices.at(-1).body,/App is missing tab.new/);
assert.equal(world[0].tabs.some(tab=>tab.id==='start'),false,'Do not prepare a Start page after losing a command');
inspectWorker=null;
console.log('PASS: stable first-frame worktree and plugin-owned agent menu actions, preserved Pin/Close; same-machine moves, keyboard navigation, expiry, unknown outcomes and repair (no live Core)');
