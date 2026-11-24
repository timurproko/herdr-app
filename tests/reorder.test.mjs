import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';

function element(asset) {
  const n = {asset, kids: [], style: {}, events: {}, transitions: {}}; let el;
  el = new Proxy(n, {get(o,k) {
    if (k in o) return o[k]; if (k === 'then' || k === 'hoverStyle') return undefined;
    if (k === 'when') return (yes, fn) => yes ? fn(el) : el;
    if (k === 'child') return c => {if (c != null) o.kids.push(c); return el;};
    if (k === 'children') return cs => {o.kids.push(...cs); return el;};
    if (k === 'transition') return (p, policy) => {o.transitions[p] = policy; return el;};
    if (k === 'hover') return fn => {o.hoverStyle = element(); fn(o.hoverStyle); return el;};
    if (String(k).startsWith('on_')) return (...args) => {o.events[typeof args[0] === 'string' && args[0] !== 'left' ? `${String(k)}_${args[0]}` : k] = args.at(-1); return el;};
    return (...args) => {o.style[k] = args; return el;};
  }}); return el;
}
const nodes = el => el && typeof el === 'object' ? [el, ...el.kids.flatMap(nodes)] : [];
const byId = (el,id) => nodes(el).find(n => n.style.id?.[0] === id);
const context = vm.createContext({});
const values = {
  'gpui-kit': {View: class {}, div: element, svg: element, image: element},
  'gpui-base': {h_flex: element, v_flex: element, Popover: {}, Input: {}, Toggle: {new: id=>element().id(id)}, Popup: {new: (id, trigger) => element().id(id).child(trigger)}},
};
const cache = new Map();
async function load(name) {
  if (cache.has(name)) return cache.get(name);
  const exports = values[name];
  const source = name === './tabs.js' ? '../src/features/tabs/main.js' : '../src/ui/' + name.slice(2);
  const m = exports ? new vm.SyntheticModule(Object.keys(exports), function() {for (const [k,v] of Object.entries(exports)) this.setExport(k,v);}, {context})
    : new vm.SourceTextModule(fs.readFileSync(new URL(source, import.meta.url),'utf8'), {context});
  cache.set(name,m); await m.link(load); return m;
}
const mod = await load('./reorder.js'); await mod.evaluate();
const {ReorderDrag, insertionIndex, insertionSlot, groupedInsertion} = mod.namespace;
const timers = [], cx = {notify(){},stop_propagation(){},timer:{after(ms,fn){timers.push({ms,fn});}}};
const press = {position:{x:120,y:140},bounds:{x:110,y:130,width:56,height:56}};
const motion = {position:{x:160,y:180},local_position:{x:60,y:80},bounds:{height:400,width:600}};
const t = {border:'#333333',popover:'#222222',foreground:'#ffffff'};
for (const variant of ['strip','list','icons']) {
  const drag = new ReorderDrag({variant}), clicked = [];
  const action = drag.guard(() => clicked.push('action'));
  drag.begin('a',press,cx,{scale:2,target:0});
  drag.over({position:{x:123,y:140}},1,cx); assert.equal(drag.active,false,'Motion below 5px remains a click');
  assert.ok(drag.control(element(),{hover:s=>s.bg('hover'),tooltip:'tip'}).hoverStyle);
  drag.over(motion,1,cx); drag.track(motion,cx);
  assert.equal(drag.active,true); assert.equal(drag.current.point.x,40,'Preview coordinates are zoom free');
  for (const id of ['a','b','add']) {
    const item = drag.item(element(),id,{hover:s=>s.bg('hover'),tooltip:'tip'});
    assert.equal(item.hoverStyle,undefined); assert.equal(item.style.tooltip,undefined);
    assert.equal(item.style.opacity[0],id==='a' ? variant==='list'?0.5:0.45 : 1);
  }
  action(); assert.equal(clicked.length,0,'Callbacks captured before the drag are guarded too');
  const preview = drag.preview('fixture',t,{icon:element('icon'),label:'Label'});
  assert.equal(preview.style.id[0],'fixture-preview');
  assert.equal(preview.style.content[0].kids.length,variant==='icons'?1:2,'Preview content is a component variant');
  const marker = drag.marker('mark','accent',{edge:'after'});
  assert.ok(variant==='list'?marker.style.h:marker.style.w);
  const result = drag.take('b',cx); assert.equal(result.kind,'drop');assert.equal(result.target,1);
  action();assert.equal(clicked.length,0,'The drop release cannot trigger an adjacent control');
  assert.ok(drag.control(element(),{hover:s=>s.bg('hover')}).hoverStyle,'Hover returns on release');
  drag.begin('a',press,cx); assert.equal(drag.take('a',cx).kind,'click'); action();assert.equal(clicked.length,1);
  drag.begin('a',press,cx);drag.track(motion,cx);drag.cancel(cx);
  assert.equal(drag.current,null);assert.ok(drag.leaving);assert.equal(drag.preview('fixture',t,{icon:element()}).style.id[0],'fixture-return');
  assert.deepEqual(timers.map(x=>x.ms),[16,236,416]);
  const old = timers.splice(0);old[0].fn(cx);assert.equal(drag.leaving.phase,'return');
  old[1].fn(cx);assert.equal(drag.dimmed('a'),false);
  drag.begin('b',press,cx);old[2].fn(cx);assert.equal(drag.current.id,'b');assert.equal(drag.leaving,null,'Old cleanup cannot cancel a new drag');
  drag.cancel(cx);assert.equal(timers.length,0,'A press without a drag has no return animation');
}
for(const grabbed of ['coordinator','fleet']) {
 const blockDrag=new ReorderDrag({variant:'list'}),meta={sources:['coordinator','fleet']};
 blockDrag.begin(grabbed,press,cx,{meta});blockDrag.track(motion,cx);
 for(const id of ['coordinator','fleet','other']) {
  assert.equal(blockDrag.dimmed(id),id!=='other');
  assert.equal(blockDrag.item(element(),id).style.opacity[0],id==='other'?1:0.5,'Both block sources remain dimmed');
  assert.equal(blockDrag.sourceLayer(element(),id).style.opacity[0],id==='other'?0:1);
 }
 const icon=element(`${grabbed}-badge`),label=grabbed==='fleet'?'2 crew':'1 coordinator';
 const chip=blockDrag.preview('pair',t,{icon,label}).style.content[0];
 assert.equal(chip.style.h[0],28);assert.equal(chip.kids.length,2,'One ordinary chip contains only its icon and label');
 assert.equal(chip.kids[0],icon);assert.equal(chip.kids[1].kids[0],label);
 assert.equal(blockDrag.current.id,grabbed);assert.equal(blockDrag.current.meta,meta);
 blockDrag.cancel(cx);
 assert.equal(blockDrag.dimmed('coordinator'),true);assert.equal(blockDrag.dimmed('fleet'),true,'Cancellation still returns both sources');
 const phases=timers.splice(0);assert.deepEqual(phases.map(x=>x.ms),[16,236,416]);
 phases[0].fn(cx);assert.equal(blockDrag.leaving.phase,'return');
 assert.equal(blockDrag.view.id,grabbed);assert.equal(blockDrag.view.meta,meta);
 assert.equal(blockDrag.preview('pair',t,{icon,label}).kids[1].kids[0],label,'Returning chip keeps grabbed-row label');
 phases[1].fn(cx);assert.equal(blockDrag.dimmed('coordinator'),false);assert.equal(blockDrag.dimmed('fleet'),false);
 phases[2].fn(cx);assert.equal(blockDrag.view,null);
}
assert.throws(()=>new ReorderDrag({variant:'unknown'}),/Unknown reorder variant/);
const custom = new ReorderDrag({variant:'icons',threshold:10,cancel:'clear',offset:{x:2,y:3}});
custom.begin('a',press,cx,{scale:2});custom.track(motion,cx);assert.equal(custom.current.point.x,32);custom.cancel(cx);assert.equal(custom.view,null);
for (const [from,slot,want] of [[0,4,4],[3,0,1],[1,3,3],[1,1,null],[1,2,null]]) assert.equal(insertionIndex(from,slot,4),want);
assert.equal(insertionSlot({local_position:{x:60},bounds:{width:100}},2),3);
assert.equal(insertionSlot({local_position:{y:10},bounds:{height:100}},2,'y'),2);
for (const scale of [1,1.3,2]) for (const x of [1,247]) {
  const target=groupedInsertion({local_position:{x:x*scale},bounds:{width:248*scale}},{groups:{left:[],right:[]},unit:28,scale});
  assert.equal(target.side,x===1?'left':'right');assert.equal(target.before,null);
}
let scroll=0;
const list = new ReorderDrag({variant:'list'});
list.surface(element(),{scrollOffset:()=>scroll});list.begin('a',press,cx,{scale:2});list.track(motion,cx);
scroll=200;list.cancel(cx);assert.equal(list.leaving.home.y,list.options.returnInset.top,'Cancellation uses the latest auto-scroll offset and clamps to the visible list');timers.length=0;

// Real tab handlers/rendering use the same component, not a parallel drag path.
const calls=[],overlays=[];
let sidebarEntries=[{id:'files'},{id:'changes'}];
const space={id:'s',active:true,tabs:[{id:'a',name:'One',active:true},{id:'b',name:'Two',active:false,named:false},{id:'c',name:'Three',active:false}]};
const host = {spaces:()=>[space],panes:()=>space.tabs.map(tab=>({tab:tab.id,program:{shell:true}})),
  run:(...args)=>calls.push(args),openOverlay:s=>overlays.push(s),theme:()=>({...t,chrome:'#111111',muted:'#aaaaaa',dim:'#888888',selected:'#242424',hover:'#333333',surface:'#151515'}),
  window:()=>({platform:'windows'}),shared:()=>null,setShared(){},layout:()=>({id:'sidebar',size:{px:248}}),settings:()=>({zoom:2})};
Object.assign(values,{
  './host.js':host,'./file-icons.js':{fileIconAsset:x=>x},'./program-icon.js':{programIcon:element},'./directory.js':{tabDirectory:()=>({cwd:'/fixture'})},
  './panel-state.js':{changePanel(){},syncPanelState(){}},
  './plugins.js':{sidebarPanels:()=>sidebarEntries},
  './profile-warm.js':{startProfileWarm(){}},'./profile-launches.js':{startProfileLaunches(){}},'./rename-keys.js':{startRenameKeys(){}},
  './tab-rename.js':{tabTitle:c=>c.name,beginTabRename(){},cancelTabRename(){},saveTabRename(){},syncTabRename(){}},
  './close-space.js':{closeWithConfirmation:(...args)=>calls.push(args)},'./space-lifecycle.js':{startSpaceLifecycle(){},workTabs:s=>s.tabs},
});
const tabsMod=await load('./tabs.js');await tabsMod.evaluate();const tabs=new tabsMod.namespace.default();tabs.init({},cx);
let tree=tabs.render(cx), oldPlus=byId(tree,'tab-new'), oldClose=byId(tree,'close-a');
byId(tree,'tab-a').events.on_mouse_down({...press,click_count:1},cx);
byId(tree,'tab-b').events.on_mouse_move({...motion,local_position:{x:90,y:10},bounds:{width:100}},cx);
tree.events.on_mouse_move(motion,cx);tree=tabs.render(cx);
for(const id of ['tab-a','tab-b','tab-c','tab-new','close-a','panel-files']){
  const node=byId(tree,id);assert.ok(node,id);assert.equal(node.hoverStyle,undefined,`${id} has no hover style during a tab drag`);assert.equal(node.style.tooltip,undefined);
}
oldPlus.events.on_click({},cx);oldClose.events.on_click({},cx);assert.equal(overlays.length,0);assert.equal(calls.length,0,'New/close controls cannot act during a reorder');
assert.equal(byId(tree,'tab-a').style.opacity[0],0.45);assert.ok(byId(tree,'tab-drop-indicator'));assert.ok(byId(tree,'tab-drag-preview'));
byId(tree,'tab-b').events.on_mouse_up({},cx);assert.equal(calls.at(-1)[0],'tab.move');assert.equal(calls.at(-1)[1].index,2);
tree=tabs.render(cx);assert.ok(byId(tree,'tab-new').hoverStyle);assert.ok(byId(tree,'tab-b').style.tooltip,'Normal tooltips return');
byId(tree,'tab-a').events.on_mouse_down({...press,click_count:1},cx);
byId(tree,'tab-new').events.on_mouse_move(motion,cx);tree.events.on_mouse_move(motion,cx);tree=tabs.render(cx);
assert.equal(byId(tree,'tab-new').hoverStyle,undefined);tree.events.on_mouse_up({},cx);
byId(tree,'tab-new').events.on_click({},cx);assert.equal(overlays.length,0,'Drop over + only reorders; it never opens New');
assert.equal(calls.at(-1)[1].index,3);
tree=tabs.render(cx);byId(tree,'tab-a').events.on_mouse_down({...press,click_count:1},cx);tree.events.on_mouse_move(motion,cx);
const before=calls.length;tree.events.on_hover(false,cx);assert.ok(tabs.drag.leaving);assert.equal(calls.length,before,'Leaving cancels without a tab command');
assert.ok(byId(tabs.render(cx),'tab-drag-return'),'Tabs use the same return preview as lists/icons');
space.id='other';tabs.render(cx);tabs.cancelDrag(cx);
for(const entries of [[],[{id:'files'}],[{id:'changes'}],[{id:'files'},{id:'changes'}]]) {
 sidebarEntries=entries;const rendered=tabs.render(cx);
 assert.equal(Boolean(byId(rendered,'panel-toggle-wrapper')),entries.length>0,'Sidebar icon exists only with an enabled panel');
 assert.equal(byId(rendered,'panel-changes'),undefined,'No separate hard-coded Git button');
}
for (const feature of ['tabs','spaces','workspace-chrome']) {
  const source=fs.readFileSync(new URL(`../src/features/${feature}/main.js`,import.meta.url),'utf8');
  assert.match(source,/from ['"]\.\/reorder\.js['"]/);
  assert.doesNotMatch(source,/Math\.hypot|DRAG_(?:ARM|RETURN|FADE)_MS|Popup\.new|timer\.after/,'Shared gesture/preview/motion logic must not be copied back into a feature');
}
// Cards (Usage's providers, Settings' plugins): one shared interaction and one move rule.
{
  const { movedOrder } = mod.namespace;
  assert.equal(JSON.stringify(movedOrder(['codex','copilot','claude'],'claude','codex')),JSON.stringify(['claude','codex','copilot']),'Dragged up: lands before the target');
  assert.equal(JSON.stringify(movedOrder(['codex','copilot','claude'],'codex','claude')),JSON.stringify(['copilot','claude','codex']),'Dragged down: lands after the target');
  assert.equal(movedOrder(['codex','claude'],'codex','codex'),null);assert.equal(movedOrder(['codex'],'gone','codex'),null);
  const drag = new ReorderDrag({variant:'list'}), keys = ['files','git','crew'], tt = {...t, accent:'#0af'};
  const b = drag.card(element(), 'git', keys, tt, {id:'st-plugin', scale:1.3});
  b.events.on_mouse_down(press, cx);
  assert.equal(drag.current.id, 'git'); assert.equal(drag.current.scale, 1.3, 'Zoom-aware like Usage');
  drag.over(motion, 'crew', cx);
  const target = drag.card(element(), 'crew', keys, tt, {id:'st-plugin'});
  const line = byId(target, 'st-plugin-drop-line-crew'); assert.ok(line, 'The drop line is on the target card');
  assert.equal(line.style.bottom?.[0], -8, 'Moving down: the line is after the target, in the gap');
  assert.equal(byId(drag.card(element(), 'files', keys, tt, {id:'st-plugin'}), 'st-plugin-drop-line-files'), undefined);
  assert.equal(drag.card(element(), 'git', keys, tt, {id:'st-plugin'}).style.opacity[0], 0.5, 'The dragged card is dimmed');
  assert.equal(JSON.stringify(drag.dropOrder(keys, cx)), JSON.stringify(['files','crew','git']), 'Released: the new order');
  assert.equal(drag.current, null);
  drag.card(element(), 'git', keys, tt, {id:'st-plugin'}).events.on_mouse_down(press, cx);
  assert.equal(drag.dropOrder(keys, cx), null, 'A click is not a move');
}
const manifest=JSON.parse(fs.readFileSync(new URL('../customization.json',import.meta.url),'utf8'));
for(const mod of ['custom-tabs','custom-spaces','custom-workspace-chrome','custom-settings']) assert.equal(manifest.files[`mods/${mod}/reorder.js`],'src/ui/reorder.js');
assert.equal(JSON.parse(fs.readFileSync(new URL('../src/plugins/usage/panel.json',import.meta.url),'utf8')).shared['reorder.js'],'src/ui/reorder.js','Usage uses the same file');
console.log('PASS: shared strip/list/icon reorder API, hover/tooltip/action suppression, variants, threshold, slots/groups, zoom/scroll geometry, return phases and actual tabs/+ handlers (no live input/Core)');
