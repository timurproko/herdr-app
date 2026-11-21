// Synthetic Jump snapshots and native-list contracts. No terminals or commands run.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';
const clean = source => source.replace(/^import .*;\r?\n/gm, '').replace(/export /g, '');
const colorSource = clean(readFileSync(new URL('../mods/custom-picker/space-color-state.js', import.meta.url), 'utf8'));
const source = clean(readFileSync(new URL('../mods/custom-picker/main.js', import.meta.url), 'utf8'))
  .replace('default class Picker', 'class Picker') + '\nglobalThis.Picker = Picker;';
let deferred = false;
function element(kind = 'div') {
  const node = { kind, kids: [], style: {}, events: {} }; let el;
  el = new Proxy(node, { get(o,k) {
    if (k in o) return o[k];
    if (k === 'when') return (value, fn) => value ? fn(el) : el;
    if (k === 'child') return child => { if (child != null) o.kids.push(child); return el; };
    if (k === 'children') return children => { o.kids.push(...children); return el; };
    if (String(k).startsWith('on_')) return (...args) => { assert.equal(deferred, false, 'Native deferred rows cannot register handlers.'); o.events[k] = args.at(-1); return el; };
    return (...args) => { o.style[k] = args; return el; };
  } }); return el;
}
const nodes = (n, out = []) => { if (n && typeof n === 'object') { out.push(n); for (const child of n.kids ?? []) nodes(child,out); } return out; };
const byId = (view,id) => nodes(view).find(n => n.style.id?.[0] === id);
const program = { key:'a1', name:'A1', agent:true }, shell = { key:'bash', name:'Bash', shell:true };
const tabs = [
  {id:'named',name:'1',named:false,active:true}, {id:'unnamed',name:'2',named:false},
  {id:'custom',name:'My session',named:true}, {id:'profile',name:'A1',named:true},
  {id:'remote-shell',name:'Work shell',named:true}, {id:'home-shell',name:'~',named:false},
  {id:'file',name:'C:/work/file.json',named:true}, {id:'unreported',name:'8',named:false},
];
const panes = tabs.map(t => ({pane:'p-'+t.id,tab:t.id,terminal:'t-'+t.id,program,title:'A1'}));
panes[0].title='🧠 Fix authentication';panes[2].title='Other live name';panes[3].title='Profile session';
panes[4].program=shell;panes[4].terminal='pc2/shell';panes[5].program=shell;
panes[6].terminal=null;panes[6].mod='custom-files';panes[7].title='';
const agents = panes.filter(p=>p.program.agent&&!p.mod).map(p=>({address:p.terminal,tab:p.tab,title:p.title,program,status:'idle'}));
const hostSpaces=[{id:'space',name:'~',active:true,tabs}];
const directories={'remote-shell':{cwd:'/home/user/projects/a1',name:'a1'},'home-shell':{cwd:'C:/Users/Fixture',name:'~'}};
const calls=[],closed=[],shared=new Map();
const input=()=>{let value='';return{events:{},on(k,fn){this.events[k]=fn;},focus(){},value:()=>value,set_value(v){value=v;}};};
const context={
  View:class{},div:()=>element(),svg:()=>element('svg'),image:()=>element('image'),h_flex:()=>element('hflex'),v_flex:()=>element('vflex'),
  InputState:{new:input},Input:{},U:{rowGap:2,gap:8,icon:16,smallIcon:14,radius:6,font:13,control:28},
  spaces:()=>hostSpaces,panes:()=>panes,agents:()=>agents,terminals:()=>[],knownMachines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],
  shared:k=>shared.get(k),setShared:(k,v)=>shared.set(k,v),props:()=>({overlay:'test'}),closeOverlay:id=>closed.push(id),run:(...args)=>calls.push(args),
  theme:()=>({}),ensureNativeSelection(){},displaySpace:s=>s,tabDirectory:id=>directories[id]??{cwd:null,name:''},
  slot:el=>el,statusBulb:()=>element('bulb'),badge:label=>element('badge').child(label),spaceBadgeColor:()=>'',spaceTitle:()=>element(),itemHover:()=>'',
  dialogSurface:(_,el)=>el,dialogHeader:()=>element(),searchHeader:()=>element(),emptyState:(_t,p)=>element().id(p.id),fileIconAsset:()=>'',
  divider:()=>element('divider'),dividerHeight:()=>24,
  bottomFade:(_state,id,color,options)=>element('fade').id(`${id}-more-below`).color(color).insets(options),
  VirtualListScrollHandle:{new:()=>({calls:[],scroll_to_item(i,strategy){this.calls.push([i,strategy]);}})},
  Scrollbar:{vertical:id=>element('scrollbar').target(id)},
  v_virtual_list:(id,count,sizes,key,render)=>{
    const before=deferred;deferred=true;let children;try{children=render({start:0,end:Math.min(count,10)});}finally{deferred=before;}
    return element('native-list').id(id).count(count).sizes(sizes).keys(Array.from({length:count},(_,i)=>key(i))).children(children);
  },
};
const uiSource=readFileSync(new URL('../lib/ui.js',import.meta.url),'utf8');
vm.runInNewContext(uiSource.slice(uiSource.indexOf('export const DIALOG_SCROLL'),uiSource.indexOf('export function description')).replace(/export /g,''),context);
const lifecycleSource = clean(readFileSync(new URL('../mods/custom-picker/space-lifecycle.js', import.meta.url), 'utf8'));
vm.runInNewContext(lifecycleSource.slice(0, lifecycleSource.indexOf('function pendingRequests')),context);
vm.runInNewContext(colorSource,context);
vm.runInNewContext(source,context);
const tasks=[];let notifications=0;
const cx={focus_handle:()=>({}),notify(){notifications++;},stop_propagation(){},spawn(fn){tasks.push(fn);}};
async function settle(){while(tasks.length)await tasks.shift()({...cx,sleep:async()=>{}});}
const picker=new context.Picker();picker.init({},cx);
const labels=Object.fromEntries(picker.world.spaces[0].tabs.map(t=>[t.id,t.name]));
assert.deepEqual(labels,{named:'Fix authentication',unnamed:'New session',custom:'My session',profile:'Profile session','remote-shell':'/home/user/projects/a1','home-shell':'C:/Users/Fixture',file:'C:/work/file.json',unreported:'New session'});
assert.equal(tabs[0].name,'1','Presentation must not rename native tabs.');assert.deepEqual(calls,[]);
for(const title of ['', '2', 'A1', 'a1', 'C:/Git/a1', '/home/user', '~'])
  assert.equal(context.jumpTabName({name:'3',named:false},[{terminal:'t',program,title}],[],{}),'New session');
for(const [input,expected] of [['powershell','PowerShell'],['bash','Bash'],['a1','A1'],['claude code','Claude Code'],['Claude Code','Claude Code'],['Git Bash','Git Bash'],['wsl','WSL'],['constructor','Constructor']])
  assert.equal(context.jumpProgramLabel(input),expected,'Right-side program names use consistent display casing.');
assert.equal(context.tabProgramNames('fixture',[{program:{name:'a1'}},{program:{name:'claude code'}}],[],[]),'A1 · Claude Code','Every name in a multi-agent label is formatted.');
assert.equal(context.tabProgramNames('fixture',[],[{tab:'fixture',terminal:'t',program:{name:'powershell'}}],[]),'PowerShell');
let view=picker.render();
const list=byId(view,'pk-native-rows'),bar=nodes(view).find(n=>n.kind==='scrollbar');
const viewport=byId(view,'pk-list');
assert.equal(viewport.style.mb[0],0,'The list clips at the dialog bottom, not at the old inset above it.');
assert.equal(viewport.style.h[0],328,'The viewport absorbs the former 8px bottom margin.');
assert.equal(viewport.style.h[0]+viewport.style.my[0]+viewport.style.mb[0],336,'The total list footprint and dialog height stay unchanged.');
assert.ok(viewport.style.flex_none,'Flex shrink must not cut the fixed viewport short.');
assert.ok(view.style.overflow_hidden,'The dialog clips edge-to-edge rows/fade at its rounded boundary.');
assert.ok(list);assert.equal(bar.style.target[0],'pk-native-rows');assert.equal(bar.style.mode[0],'scrolling');
assert.equal(bar.style.scroll_size[1],list.style.sizes[0].reduce((a,b)=>a+b,0),'Scrollbar receives the full virtual content height.');
assert.ok(bar.style.viewport_from_layout,'Scrollbar uses the fixed dialog viewport.');
assert.ok(byId(view,'pk-list-more-below'),'Overflow shows a passive bottom fade before the first layout settles.');
assert.equal(list.style.track_scroll[0],picker.listScroll);assert.ok(list.style.sizes[0].includes(24),'Native list includes the actual divider extent.');
assert.equal(byId(view,'pk-title-home-shell').style.tooltip[0],'C:/Users/Fixture');
assert.equal(byId(view,'pk-title-home-shell').style.flex_1,undefined,'Tooltip hitbox stays on the text.');
assert.equal(byId(view,'pk-named').events.on_click,undefined);assert.equal(byId(view,'pk-named').style.mr[0],8,'Scrollbar has its own gutter, outside row text/background.');
list.events.on_item_click('ctx:named',cx);assert.equal(JSON.stringify(calls.at(-1)),JSON.stringify(['tab.select',{id:'named'}]));
const prior=picker.at;byId(view,'pk-list').events.on_scroll_wheel({delta:{y:-50}},cx);assert.equal(picker.at,prior,'Wheel scrolling does not force the selection back onscreen.');
await settle();
picker.visibleRange={start:5,end:picker.rows().length};
for(let i=0;i<20;i++)byId(view,'pk-list').events.on_scroll_wheel({delta:{y:-50}},cx);
assert.equal(tasks.length,1,'A burst of native scroll events schedules one post-frame check.');
await settle();assert.equal(picker.moreBelow,false,'The fade clears once the last rows are visible.');
view=picker.render();assert.equal(byId(view,'pk-list-more-below'),undefined);
picker.visibleRange={start:0,end:3};byId(view,'pk-list').events.on_mouse_move({},cx);
await settle();assert.equal(picker.moreBelow,true,'Native drag/retained position changes refresh the hint on pointer motion.');
const quiet=notifications;byId(view,'pk-list').events.on_mouse_move({},cx);await settle();assert.equal(notifications,quiet,'No repaint when continuation visibility is unchanged.');
picker.visibleRange={start:0,end:3};view.events.on_key_down({key:'down'},cx);assert.equal(picker.listScroll.calls.at(-1)[1],'center');
const filter=value=>{picker.input.set_value(value);picker.input.events.change({},cx);return picker.rows().filter(r=>r.kind==='ctx');};
assert.equal(filter('work shell')[0].ctx.name,'/home/user/projects/a1','Original custom terminal names remain searchable.');
assert.ok(filter('New session').length===2);
assert.equal(filter('Users/Fixture')[0].ctx.id,'home-shell');view=picker.render();
assert.equal(byId(view,'pk-list-more-below'),undefined,'Fitting filtered results have no fade.');
assert.equal(byId(view,'pk-native-rows'),undefined,'Fitting filtered results need no scroll area/bar.');assert.equal(nodes(view).some(n=>n.kind==='scrollbar'),false);
byId(view,'pk-home-shell').events.on_click({},cx);assert.equal(calls.at(-1)[1].id,'home-shell');
const openingIds=picker.world.spaces[0].tabs.map(t=>t.id);
agents[0].title='Late new name';directories['home-shell'].cwd='D:/late';
assert.equal(filter('Late new name')[0].ctx.id,'named','Agent session renames update search while Jump is open.');
view=picker.render();assert.equal(byId(view,'pk-title-named').kids[0],'Late new name');
assert.equal(byId(view,'pk-title-named').style.tooltip[0],'Late new name','Tooltip follows the live title.');
assert.equal(filter('Fix authentication').length,0,'Old session titles are not stale search matches.');
assert.equal(filter('D:/late')[0].ctx.id,'home-shell','Shell directory labels update without reopening.');
tabs[2].name='Renamed tab';assert.equal(filter('Renamed tab')[0].ctx.id,'custom','Explicit tab renames update live.');
assert.equal(filter('My session').length,0);
hostSpaces[0].name='Renamed space';assert.equal(filter('Renamed space').length,tabs.length,'Space names and search text update live.');
assert.deepEqual(picker.world.spaces[0].tabs.map(t=>t.id),openingIds,'Refreshing names does not change opening membership or order.');
picker.filter='';
// Retained Start pages are visible only in spaces without real work. Classification
// uses panes, never the title or settled flag, and mixed Start/work splits stay work.
const startTab={id:'retained-start',name:'Start',settled:true};
const emptyTab={id:'empty-start',name:'Start',active:true};
const mixedTab={id:'mixed-start',name:'Start'};
const ordinaryTab={id:'ordinary-start',name:'Start'};
tabs.push(startTab,mixedTab,ordinaryTab);
panes.push({tab:startTab.id,mod:'custom-space-start'}, {tab:emptyTab.id,mod:'custom-space-start'},
  {tab:mixedTab.id,mod:'custom-space-start'}, {tab:mixedTab.id,terminal:'mixed-shell'}, {tab:ordinaryTab.id,mod:'custom-files'});
const emptySpace={id:'empty-space',name:'Empty',active:true,machine:'pc2',tabs:[emptyTab]};
hostSpaces.push(emptySpace);
const retained=new context.Picker();retained.init({},cx);
const ids=()=>retained.rows().filter(r=>r.kind==='ctx').map(r=>r.ctx.id);
assert.ok(!ids().includes(startTab.id),'Background retention Start is hidden beside work.');
assert.ok(ids().includes(emptyTab.id),'A genuinely empty remote space keeps its visible Start page.');
assert.ok(ids().includes(mixedTab.id),'A Start pane split with real work is not a placeholder.');
assert.ok(ids().includes(ordinaryTab.id),'An ordinary tab named Start is not hidden.');
retained.filter='Start';assert.ok(!ids().includes(startTab.id),'Search cannot expose a hidden Start page.');retained.filter='';
emptySpace.tabs.push({id:'late-work',name:'Late work'});panes.push({tab:'late-work',terminal:'late-shell'});
assert.ok(!ids().includes(emptyTab.id),'Opening work hides its now-orphaned Start page without reopening Jump.');
assert.ok(!ids().includes('late-work'),'Live metadata does not reveal new rows.');
emptySpace.tabs.pop();panes.pop();assert.ok(ids().includes(emptyTab.id));
emptySpace.tabs=[];assert.ok(!ids().includes(emptyTab.id),'A removed Start page is not kept as a stale navigation target.');
hostSpaces.pop();tabs.splice(-3);panes.splice(-5);
hostSpaces.push({id:'remote',name:'Work',status:'blocked',machine:'pc2',tabs:[{id:'remote-tab',name:'Remote session',active:true}]});
const numbered=new context.Picker();numbered.init({},cx);view=numbered.render();
assert.equal(numbered.rows().find(r=>r.kind==='head').w.id,'remote','Blocked groups may sort ahead of the first sidebar space');
assert.equal(byId(view,'pk-head-remote').kids[0].kids[0],'2','Remote space keeps its sidebar number despite priority sorting');
assert.equal(byId(view,'pk-head-space').kids[0].kids[0],'1','Home space uses its sidebar number, not its name initial');
numbered.filter='Remote session';view=numbered.render();
assert.equal(byId(view,'pk-head-remote').kids[0].kids[0],'2','Filtering never renumbers badges');
console.log('PASS: Jump session names/New session fallback, full local/SSH paths, live/searchable labels, hidden retention Start pages, sidebar badge numbers across sorting/filtering, native scrolling scrollbar, stable row actions and no deferred handlers.');
