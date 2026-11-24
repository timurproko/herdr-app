import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
function element(){let e;const n={kids:[],style:{},events:{}};e=new Proxy(n,{get(o,k){if(k in o)return o[k];if(k==='when')return(v,f)=>v?f(e):e;if(k==='child')return v=>{o.kids.push(v);return e;};if(k==='children')return v=>{o.kids.push(...v);return e;};if(String(k).startsWith('on_'))return(...v)=>{o.events[k]=v.at(-1);return e;};return(...v)=>{o.style[k]=v;return e;};}});return e;}
const colors={'local-space':'ansi6','pc2/space':'ansi4'},automaticFlags={'local-space':true},state=new Map([['space.colors',colors],['custom.space-color-auto',automaticFlags]]),writes=[],runs=[],requests=[],closed=[];
let list=[{id:'local-space',name:'Local',active:true,machine:null,tabs:[]},{id:'pc2/space',name:'Remote',active:false,machine:'pc2',tabs:[]}];
let props={tab:'space',target:{id:'pc2/space'},overlay:'space-menu'};
const theme={foreground:'#eeeeee',muted:'#aaaaaa',dim:'#888888',hover:'#333333',border:'#444444',popover:'#222222'};
let pairLinks=[],freshLinks=null;
const warnings=[];
const context={pluginAllows:(_name,{pair})=>{const fresh=freshLinks??pairLinks;return fresh.length===1&&fresh[0].parent===pair.parent&&fresh[0].child===pair.child&&fresh[0].binding===pair.binding;},pluginEvent(){},pluginWorkspaceLinks:options=>options?.presentation?pairLinks:(freshLinks??pairLinks),notify:spec=>warnings.push(spec),updates:()=>({app:{ready:null}}),pluginIsEnabled:()=>true,console,View:class{},div:element,svg:element,h_flex:element,v_flex:element,shared:k=>state.get(k),setShared:(k,v)=>{state.set(k,structuredClone(v));writes.push(v);},spaces:()=>list,panes:()=>[],terminals:()=>[],agents:()=>[],keys:()=>[],props:()=>props,closeOverlay:id=>closed.push(id),openOverlay:()=>{},theme:()=>theme,run:(...v)=>runs.push(v),requestInlineTabRename:p=>(requests.push(p),true),requestInlineSpaceRename:p=>(requests.push(p),true),exec:async()=>{throw Error('Unexpected execution');}};
const clean=p=>fs.readFileSync(new URL(p,import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
vm.createContext(context);
vm.runInContext(clean('../mods/custom-menu/space-color-state.js')+'\nglobalThis.spaceColorState={savedSpaceColors,reconcileSpaceColors};',context);
vm.runInContext(clean('../mods/custom-menu/ui.js'),context);
vm.runInContext(clean('../mods/custom-menu/modal-layout.js'),context);
vm.runInContext(clean('../mods/custom-menu/space-colors.js')+'\nglobalThis.colorsApi={SPACE_COLORS,COLOR_COUNT,currentSpaceColor,selectedColorIndex,colorAt,setSpaceColor,spaceColorPicker,spaceBadgeColor};',context);
const c=context.colorsApi;context.colorValueAt=i=>c.colorAt(i);
vm.runInContext(clean('../mods/custom-menu/close-space.js'),context);
vm.runInContext(clean('../mods/custom-menu/settings-sections.js'),context);
context.window=()=>({platform:'windows'});
vm.runInContext(clean('../mods/custom-menu/sidebar-footer.js'),context);
vm.runInContext(`(()=>{${clean('../mods/custom-menu/customization-update-model.js')}\n${clean('../mods/custom-menu/customization-updates.js')}\nglobalThis.customizationUpdateAvailable=customizationUpdateAvailable;})();`,context);
vm.runInContext(clean('../mods/custom-menu/main.js').replace('default class Menu','class Menu')+'\nglobalThis.Menu=Menu;',context);
const cx={focus_handle:()=>({focus(){}}),notify(){},stop_propagation(){},spawn(){throw Error('A folderless menu must not execute commands');}};
const nodes=e=>e&&typeof e==='object'?[e,...e.kids.flatMap(nodes)]:[];
const find=(tree,id)=>nodes(tree).find(n=>n.style.id?.[0]===id);
const menu=new context.Menu();menu.init({},cx);let view=menu.render(cx);
assert.ok(find(view,'space-color-picker'));assert.equal(writes.length,0,'Opening/rendering a menu never saves a color');
assert.equal(find(view,'space-color-1').style.border_color[0],theme.foreground,'The actual current color is selected');
assert.equal(c.spaceBadgeColor(theme,{id:'pc2/space'},state.get('space.colors')),'#5b8def');
find(view,'space-color-5').events.on_click({},cx);
assert.equal(state.get('space.colors')['pc2/space'],'ansi5');assert.equal(state.get('custom.space-colors')['pc2/space'],'ansi5','Explicit colors are copied to the durable Custom key');assert.equal(state.get('space.colors')['local-space'],'ansi6');assert.equal(colors['pc2/space'],'ansi4','Never mutate the shared object in place');
const durable=structuredClone(state.get('custom.space-colors'));state.set('space.colors',{});state.set('custom.space-colors',durable);context.spaceColorState.reconcileSpaceColors([]);assert.equal(state.get('space.colors')['pc2/space'],'ansi5','Restart repairs a cleared native color map from durable state');context.spaceColorState.reconcileSpaceColors([list[0]]);assert.equal(state.get('custom.space-colors')['pc2/space'],'ansi5','A partial startup snapshot never deletes colors for spaces not loaded yet');
assert.equal(c.spaceBadgeColor(theme,{id:'pc2/space'},state.get('space.colors')),'#8b7cf6');assert.deepEqual(runs,[],'Coloring a background remote space never selects, renames or relaunches it');assert.deepEqual(closed,['space-menu']);
const count=writes.length;assert.equal(c.setSpaceColor('pc2/space','ansi5'),true);assert.equal(writes.length,count,'Picking the same color is a no-op');
view=menu.render(cx);assert.equal(find(view,'space-color-reset'),undefined,'No separate Reset or header row');assert.equal(find(view,'space-color-0').style.tooltip[0],'Automatic');find(view,'space-color-0').events.on_click({},cx);assert.equal(state.get('space.colors')['pc2/space'],undefined);assert.equal(state.get('space.colors')['local-space'],'ansi6','Reset preserves unrelated spaces');
assert.equal(automaticFlags['pc2/space'],undefined,'Automatic flags are updated immutably');assert.equal(state.get('custom.space-color-auto')['local-space'],true,'Automatic preserves other machines’ preferences');
assert.equal(c.selectedColorIndex('pc2/space'),0);state.set('space.colors',{...state.get('space.colors'),'pc2/space':'ansi3'});assert.equal(c.selectedColorIndex('pc2/space'),0,'Automatic remains selected after the sidebar computes a color');
const automaticWrites=writes.length;assert.equal(c.setSpaceColor('pc2/space',null),true);assert.equal(writes.length,automaticWrites,'Repeated Automatic does not rebalance the computed color');
assert.equal(c.setSpaceColor('pc2/space','ansi3'),true);assert.equal(c.selectedColorIndex('pc2/space'),3,'Choosing the computed color explicitly exits automatic mode');
assert.equal(c.setSpaceColor('missing','ansi1'),false);assert.equal(c.setSpaceColor('pc2/space','not-a-color'),false);
menu.colorAt=-1;menu.at=-1;let key=k=>menu.render(cx).events.on_key_down({key:k},cx);
key('right');assert.equal(menu.colorAt,c.selectedColorIndex('pc2/space'));key('right');const chosen=c.colorAt(menu.colorAt);key('enter');assert.equal(state.get('space.colors')['pc2/space'],chosen);
menu.colorAt=c.SPACE_COLORS.length-1;key('right');assert.equal(menu.colorAt,0);key('enter');assert.equal(state.get('space.colors')['pc2/space'],undefined,'Keyboard can reset to automatic');
menu.colorAt=-1;menu.at=0;key('up');assert.ok(menu.colorAt>=0);key('down');assert.equal(menu.at,0);assert.equal(menu.colorAt,-1);
menu.colorAt=2;view=menu.render(cx);find(view,'mi-0').events.on_mouse_move({},cx);assert.equal(menu.colorAt,-1,'Moving over a normal item cannot leave a hidden color action active');
const beforeStale=writes.length;list=list.filter(s=>s.id!=='pc2/space');menu.chooseColor('ansi1',cx);assert.equal(writes.length,beforeStale,'Closed spaces cannot acquire ghost color preferences');assert.equal(find(menu.render(cx),'space-color-picker'),undefined);
for(const tab of ['tab','agent','footer','global']){props={tab,target:{id:'local-space'},overlay:'other'};assert.equal(find(menu.render(cx),'space-color-picker'),undefined,'Colors are only in a space context menu');}
// Tab menu groups creation above rename, matching the space menu's grouping.
props={tab:'tab',target:{id:'pc2/tab',space:'pc2/space'},overlay:'tab-menu'};
const tabMenu=new context.Menu();tabMenu.init({},cx);view=tabMenu.render(cx);
assert.deepEqual([0,1,2,3].map(i=>find(view,`mi-${i}`).kids[1].kids[0]),['New tab','Rename','Move to…','Close']);
assert.equal(nodes(view).find(n=>n.kids.includes(find(view,'mi-2'))).kids.length,1,'Move shares the Rename group');
for(const i of [0,1,3]){
  const row=find(view,`mi-${i}`),group=nodes(view).find(n=>n.kids.includes(row));
  assert.equal(group.kids.length,i===0?1:2,'Dividers precede Rename and Close, not New tab');
  if(i>0)assert.equal(group.kids[0].kids[0].style.h[0],1);
  row.events.on_click({},cx);
}
assert.deepEqual(structuredClone(runs),[['tab.new',{space:'pc2/space'}],['tab.close',{id:'pc2/tab'}]],'Reordered non-rename actions keep the clicked remote targets');assert.equal(requests[0].command.args.id,'pc2/tab','Rename routes privately without patching Herdr prompt');
assert.deepEqual(closed.slice(-3),['tab-menu','tab-menu','tab-menu']);
key=k=>tabMenu.render(cx).events.on_key_down({key:k},cx);
key('down');assert.equal(tabMenu.at,0);key('enter');assert.equal(runs.at(-1)[0],'tab.new');
key('down');assert.equal(tabMenu.at,1);key('enter');assert.equal(requests.at(-1).command.name,'tab.rename');
key('up');key('up');assert.equal(tabMenu.at,3,'Dividers are not keyboard stops');
assert.equal(c.SPACE_COLORS.length,8);assert.equal(c.SPACE_COLORS[0].value,null);assert.match(fs.readFileSync(new URL('../mods/custom-menu/automatic.svg',import.meta.url),'utf8'),/stroke-dasharray=/,'Automatic is a dashed outline');
assert.equal(c.SPACE_COLORS.length*22+(c.SPACE_COLORS.length-1)+6<=200-10,true,'All swatches fit the existing 200px menu');
// A linked fleet edits the coordinator's palette, never its independent saved colour.
for(const machine of [null,'pc2']) {
 const parent='pair-parent',child='pair-child';
 const reset=()=>{
  list=[{id:parent,name:'coordinator',machine,tabs:[]},{id:child,name:'crew',machine,tabs:[]},{id:'unrelated',machine,tabs:[]}];
  const saved={[parent]:'ansi2',[child]:'ansi1',unrelated:'ansi3'};
  state.set('space.colors',structuredClone(saved));state.set('custom.space-colors',structuredClone(saved));
  state.set('custom.space-color-auto',{[child]:true,unrelated:true});
  pairLinks=[{parent,child,binding:'exact-pair'}];freshLinks=null;
  props={tab:'space',target:{id:child,folder:'/captured',checkout:'linked'},overlay:'pair-menu'};
 };
 const open=()=>{const m=new context.Menu();m.init({},cx);return m;};
 reset();let m=open();const beforeRender=writes.length,tree=m.render(cx);
 assert.equal(writes.length,beforeRender,'Opening/rendering attached palette does no writes');
 assert.equal(find(tree,'space-color-2').style.border_color[0],theme.foreground,'Fleet palette selects the coordinator colour, not its own saved red/Automatic');
 assert.equal(m.colorTarget,parent);assert.equal(m.colorSource.id,child);
 assert.equal(m.list().find(it=>it[1]==='space.rename')[2].id,child);
 assert.equal(m.list().find(it=>it[1]==='space.close')[2].id,child);
 for(const it of m.list().filter(it=>it[1]==='worktree'))assert.equal(it[2].space,child);
 m.choose(m.list().findIndex(it=>it[1]==='space.rename'),cx);assert.equal(requests.at(-1).command.args.id,child,'Rename is not retargeted');
 const oldOverlay=context.openOverlay,worktreeDialogs=[];context.openOverlay=spec=>worktreeDialogs.push(spec);
 m.choose(m.list().findIndex(it=>it[1]==='worktree'),cx);assert.equal(worktreeDialogs[0].props.space,child);assert.equal(worktreeDialogs[0].props.folder,'/captured');context.openOverlay=oldOverlay;
 find(tree,'space-color-5').events.on_click({},cx);
 assert.equal(state.get('custom.space-colors')[parent],'ansi5');assert.equal(state.get('custom.space-colors')[child],'ansi1');
 assert.equal(state.get('custom.space-color-auto')[child],true,'Fleet Automatic flag is untouched');
 m=open();m.render(cx).events.on_key_down({key:'right'},cx);assert.equal(m.colorAt,5,'Keyboard starts on the same coordinator swatch');
 m.render(cx).events.on_key_down({key:'right'},cx);m.render(cx).events.on_key_down({key:'enter'},cx);
 assert.equal(state.get('custom.space-colors')[parent],'ansi6');assert.equal(state.get('custom.space-colors')[child],'ansi1');
 m=open();find(m.render(cx),'space-color-0').events.on_click({},cx);
 assert.equal(state.get('custom.space-colors')[parent],undefined,'Fleet Automatic choice resets only the coordinator');
 assert.equal(state.get('custom.space-color-auto')[parent],true);assert.equal(state.get('custom.space-color-auto')[child],true);
 assert.equal(state.get('custom.space-colors')[child],'ansi1');assert.equal(state.get('custom.space-colors').unrelated,'ansi3');
 // Parent-origin menus follow exactly the same pair guards.
 reset();props.target.id=parent;m=open();m.chooseColor('ansi4',cx);assert.equal(state.get('custom.space-colors')[parent],'ansi4');assert.equal(state.get('custom.space-colors')[child],'ansi1');
 for(const invalidate of [
  ()=>{pairLinks=[];}, // setting/plugin off or confirmed detach
  ()=>{freshLinks=[];}, // retained display is not permission
  ()=>{pairLinks=[{parent,child,binding:'new-binding'}];},
  ()=>{pairLinks=[{parent:'unrelated',child,binding:'replacement'}];},
  ()=>{list=list.filter(s=>s.id!==parent);},
  ()=>{list=list.filter(s=>s.id!==child);},
  ()=>{list.find(s=>s.id===parent).machine=machine===null?'pc2':null;},
  ()=>{pairLinks.push({parent:'unrelated',child,binding:'ambiguous'});},
  ()=>{props.target.id='unrelated';},
 ]) {
  reset();m=open();const saved=JSON.stringify([...state]),count=writes.length;invalidate();m.chooseColor('ansi5',cx);
  assert.equal(writes.length,count,'A stale pair never writes or falls back to the fleet');assert.equal(JSON.stringify([...state]),saved);assert.equal(warnings.at(-1).title,'Space colour unavailable');
 }
 reset();freshLinks=[];m=open();const count=writes.length;m.chooseColor('ansi5',cx);assert.equal(writes.length,count,'Cold retained-only palette also refuses writes');
 reset();pairLinks=[];m=open();find(m.render(cx),'space-color-1').events.on_click({},cx);
 assert.equal(state.get('custom.space-colors')[child],'ansi4','Reopened detached fleet edits its independent colour');assert.equal(state.get('custom.space-colors')[parent],'ansi2');
 reset();pairLinks=[];m=open();pairLinks=[{parent,child,binding:'newly-attached'}];const original=writes.length;m.chooseColor('ansi4',cx);assert.equal(writes.length,original,'An ordinary palette cannot silently become a pair palette');
}
console.log('PASS: captured pair colour palettes, mouse/keyboard and Automatic choices, untouched fleet preferences, stale-pair guards, ordinary action targets; durable restart-safe space colors, partial-startup retention, automatic-first dashed swatch, current selection, local/remote isolation, immutable saved colors, reset, no-op/stale guards, keyboard palette/reset navigation, unchanged session commands and compact menu width');
