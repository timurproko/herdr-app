import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import {withKitUi} from './support/panel-kit.mjs';
import {createRequire} from 'node:module';
import {build} from '../tools/build.mjs';
const {operate} = createRequire(import.meta.url)(`${build().output}/mods/custom-tabs/move-tab.cjs`);
const states = {}, calls = [], notices = [], executions = [], tasks = [];
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
}
reset();
const cx = {spawn: fn => tasks.push(fn), sleep: async () => {}, notify() {}};
const lifecycle = {isStartTab: t => t.id === 'start', ensureSpaceStart: id => {
  const s = world.find(s => s.id === id); if (!s.tabs.some(t => t.id === 'start')) s.tabs.push({id: 'start'}); return true;
}};
const host = {
  spaces: () => world, panes: () => [], machines: () => [{name: null, layout: 'ready'},{name:'remote',layout:'ready'}], focused: () => focus,
  run: (...args) => calls.push(args), appHome: () => 'C:/fixture', hostVersion: () => '0.1.16',
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
  './ui.js': {U: {row:28,gap:8,radius:6,smallIcon:14}, slot: x => x, menuSurface: (_t,x) => x, hotkey: x => x,
    menuHeading: (_t,text,el=element()) => el.child(text),
    badge: (label,fill) => {colors.push([label,fill]);return element();}, spaceBadgeColor: (_t,s,c) => c[s.id]},
  './directory.js': {displaySpace: x => x}, './sidebar-footer.js': {footerItems: () => []}, './modal-layout.js': {divider: element, dividerHeight: () => 17},
  './space-colors.js': {spaceColorPicker: element,setSpaceColor(){},selectedColorIndex:()=>0,colorAt:()=>0,COLOR_COUNT:6},
  './plugins.js': {pluginMenuItems:()=>menuActions},
  './customization-updates.js': {customizationUpdateAvailable:()=>false},
  './agent-rename.js': {requestInlineAgentRename:()=>true},
  './tab-rename.js': {requestInlineTabRename:()=>true}, './space-rename.js': {requestInlineSpaceRename:()=>true}, './close-space.js': {closeWithConfirmation(...args){legacyActions.push(args);}},
  './tab-moves.js': {inspectTabMove:target=>menuInspect(target),tabMoveDestinations:()=>menuSpaces.filter(s=>s.id!=='s1'),requestTabMove:(...args)=>{selected.push(args);return integratedMenu ? api.requestTabMove(...args) : true;}},
  './host.js': {updates:()=>({app:{}}),run(){},props:()=>p,closeOverlay:id=>closed.push(id),openOverlay:spec=>opened.push(spec),theme:()=>({}),keys:()=>[],terminals:()=>[],spaces:()=>menuSpaces,panes:()=>[],exec:async()=>({}),agents:()=>[],shared:()=>({s2:'#abcdef'}),notify(){}},
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
{const all=n=>n&&typeof n==='object'?[n,...(n.kids??[]).flatMap(all)]:[];assert.ok(all(tree.kids[0].kids[2]).some(n=>n.asset==='mods/custom-workspace-chrome/layers.svg'),'Move to uses the Spaces icon');}
tree.events.on_key_down({key:'right'},mcx);
assert.equal(menu.moveTo,true);tree=menu.render(mcx);
const keyboardRows=tree.kids[0].kids.map(group=>group.kids.at(-1));
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
reset(); p.tab='tab'; p.target=target; menuSpaces=world; menuInspect=api.inspectTabMove; integratedMenu=true;
const rawTab = id => ({id,name:'Work',root:{id,type:'row',children:[{id:'pane-'+id,type:'block',content:{mod:'custom-files',props:{path:'/fixture'}}}]}});
const snapshot = {version:7,value:{spaces:[{id:'s1',name:'Source',folder:'/source',tabs:[rawTab('tb1')]},{id:'s2',name:'Target',folder:'/target',tabs:[rawTab('tb2')]}]}};
for (const coreVersion of ['0.1.22','0.1.23']) {
  const rpcCalls=[];
  const rpc=async method=>{
    rpcCalls.push(method);
    if(method==='hello') return {version:coreVersion,generation:1,core:{id:'fixture-core'},methods:['doc.get','doc.set','terminal.get','terminal.list','terminal.label']};
    if(method==='doc.get') return structuredClone(snapshot);
    if(method==='terminal.list') return {terminals:[]};
    assert.fail('Preflight must never mutate: '+method);
  };
  inspectWorker=request=>operate(request,rpc,{appVersion:()=> '0.1.16'});
  const instance=new menuModule.namespace.default();instance.init({},mcx);
  await preflights.shift()(mcx);instance.choose(2,mcx);
  const before=calls.length, beforeClosed=closed.length;
  if(coreVersion==='0.1.22') {
    assert.equal(instance.moveCapability.ok,true);
    assert.equal(instance.list()[1][1],'custom.move-tab');
    instance.choose(1,mcx);
    assert.equal(calls.length,before+1,'Verified destination hands off one fresh domain request');
    const handedOff=JSON.parse(calls.at(-1)[0].split('tab-move:')[1]);
    assert.equal(handedOff.appVersion,'0.1.16');assert.equal(handedOff.destinationSpaceId,'s2');
    assert.equal(handedOff.coreId,'fixture-core');assert.match(handedOff.fingerprint,/^[a-f0-9]{64}$/);
  } else {
    assert.equal(instance.moveCapability.ok,false);
    assert.equal(instance.list()[1][1],'custom.move-empty');
    assert.match(instance.list()[1][0],/Detected App: 0\.1\.16; Core: 0\.1\.23/);
    instance.choose(1,mcx);instance.at=1;instance.render(mcx).events.on_key_down({key:'enter'},mcx);
    assert.equal(calls.length,before);assert.equal(closed.length,beforeClosed,'Unsupported row is inert');
    assert.deepEqual(rpcCalls,['hello'],'Unknown Core fails before reading or writing documents');
  }
  assert.ok(!rpcCalls.includes('doc.set')&&!rpcCalls.includes('terminal.label'));
}
inspectWorker=null;
console.log('PASS: stable first-frame worktree and plugin-owned agent menu actions, preserved Pin/Close; same-machine moves, keyboard navigation, expiry, unknown outcomes and repair (no live Core)');
