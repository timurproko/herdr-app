// Synthetic native-list layout/event passes: no app command, input, clipboard or network I/O.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let inLayout=false;
function element(kind='div') {
  const node={kind,kids:[],style:{},events:{}};let proxy;
  proxy=new Proxy(node,{get(o,k){
    if(k in o)return o[k];if(k==='then')return undefined;
    if(k==='when')return(yes,fn)=>yes?fn(proxy):proxy;
    if(['child','content','trigger'].includes(k))return child=>{if(child!=null)o.kids.push(child);return proxy;};
    if(k==='children')return children=>{o.kids.push(...children.filter(x=>x!=null));return proxy;};
    if(k==='hover')return fn=>{fn(element('hover'));return proxy;};
    if(String(k).startsWith('on_'))return(...args)=>{assert.equal(inLayout,false,'No event registration from a native row layout callback');o.events[k]=args.at(-1);return proxy;};
    return(...args)=>{o.style[k]=args;return proxy;};
  }});return proxy;
}
function nodes(n,out=[]){if(n&&typeof n==='object'){out.push(n);for(const kid of n.kids??[])nodes(kid,out);}return out;}
const byId=(v,id)=>nodes(v).find(n=>n.style?.id?.[0]===id);
const text=v=>nodes(v).flatMap(n=>(n.kids??[]).filter(k=>typeof k==='string')).join('\n');
const timers=[],scrollCalls=[],calls=[],closed=[],storage=new Map();let notices=0,skin=true;
const cx={notify(){assert.equal(inLayout,false,'No notify from native layout');notices++;},stop_propagation(){},focus_handle:()=>({}),timer:{after(){},every(ms,fn){const timer={ms,fn,cancelled:false};timers.push(timer);return{cancel(){timer.cancelled=true;}};}}};
function state(options={}){let value=options.value??'';const events={};return{options,events,value:()=>value,set_value:v=>{value=v;},focus(){},on:(n,fn)=>{events[n]=fn;}};}
const kit={View:class{},div:()=>element(),svg:p=>element('svg').asset(p)};
const base={h_flex:()=>element('hflex'),v_flex:()=>element('vflex'),InputState:{new:state},Input:{new:()=>element('input')},Popover:{},
  VirtualListScrollHandle:{new:()=>({scroll_to_item:(...args)=>scrollCalls.push(args),scroll_to_bottom(){},release(){}})},
  Scrollbar:{vertical:id=>element('scrollbar').target(id)},
  v_virtual_list:(id,count,sizes,key,render)=>{
    const list=element('list').id(id);list.count=count;list.sizes=sizes;list.key=key;
    list.layout=range=>{inLayout=true;try{const result=render(range);assert.equal(result.length,Math.min(range.end,count)-range.start);return result;}finally{inLayout=false;}};
    return list;
  },
};
const t={foreground:'#fafafa',muted:'#aaa',dim:'#888',border:'#333',raised:'#252525',popover:'#202020',hover:'#303030',selected:'#444',accent:'#55aaff',input:'#555'};
const api={commands:()=>[],layouts:()=>['main'],themes:()=>[],settings:()=>({dark:true}),keys:()=>[],theme:()=>t,shared:()=>skin?'Custom':'main',window:()=>({platform:'windows'}),props:()=>({overlay:'owned-test'}),run:(...args)=>calls.push(args),closeOverlay:id=>closed.push(id),openOverlay(){}};
const context=vm.createContext({console,localStorage:{getItem:k=>storage.get(k)??null,setItem:(k,v)=>storage.set(k,v)}}),cache=new Map();
const synthetic=(name,values)=>new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context,identifier:name});
async function load(file){if(cache.has(file))return cache.get(file);const mod=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,mod);await mod.link((name,ref)=>{
  if(name==='gpui-kit')return synthetic(name,kit);if(name==='gpui-base')return synthetic(name,base);if(name==='./host.js')return synthetic(name,api);
  if(name==='./custom-look.js')return synthetic(name,{isCustom:()=>skin,liveTheme:()=>t,ensureNativeSelection(){}});
  if(name==='./palette-ui.js')return load(path.join(root,'frame-patches/palette/palette-ui.js'));
  if(name==='./custom-ui.js')return load(path.join(root,'lib/ui.js'));
  if(name==='./custom-routing.js')return load(path.join(root,'frame-patches/palette/routing.js'));
  if(name==='./custom-scroll-fade.js')return synthetic(name,{bottomFade:(_state,id,color,options)=>element('fade').id(`${id}-more-below`).color(color).insets(options)});
  throw Error(`Unexpected import ${name} in ${ref.identifier}`);
});return mod;}
const mod=await load(path.join(root,'frame-patches/palette/main.js'));await mod.evaluate();
const {default:Palette,paletteItems,paletteHeading}=mod.namespace;
const row=(id,head='Tab')=>({e:{id,name:'fixture.action',args:{id},title:`Command ${id}`,group:head},head,hits:[]});
const fixture=[row('tab-a'),row('tab-b'),row('pane-a','Pane'),row('pane-b','Pane'),row('space-a','Space')];
const items=paletteItems(fixture,false);
assert.equal(items.length,8);assert.equal(items[0].head,'Tab');assert.equal(items[3].head,'Pane');assert.equal(items[3].gap,8);
assert.equal(paletteHeading(items,2),'Tab');assert.equal(paletteHeading(items,3),'Pane');assert.equal(paletteHeading(items,5),'Pane');assert.equal(paletteHeading(items,999),'Space');assert.equal(paletteHeading([],0),null);
const palette=new Palette();palette.init({},cx);palette.rows=()=>fixture;
assert.equal(timers.length,1);assert.equal(timers[0].ms,32);
function railOnTop(view){const frame=byId(view,'palette-list-frame'),rail=frame.kids.find(n=>n.kind==='scrollbar');assert.ok(rail);assert.equal(frame.kids.at(-1),rail,'Native rail paints/hit-tests above the sticky heading');assert.ok(frame.kids.indexOf(byId(view,'palette-pinned-heading'))<frame.kids.indexOf(rail));}
let view=palette.render();railOnTop(view);
assert.equal(byId(view,'palette-list-frame').style.top[0]+byId(view,'palette-list-frame').style.my[0],65);assert.equal(byId(view,'palette-list-frame').style.ml[0],8);assert.equal(byId(view,'palette-list-frame').style.mr[0],0);assert.equal(byId(view,'palette-search-header').style.top[0],0);
assert.equal(byId(view,'palette-list-frame').style.mb[0],0,'The list/fade reaches the bottom edge instead of clipping at an inset.');
assert.equal(byId(view,'palette-list-more-below'),undefined,'Fitting lists never show a continuation fade.');
assert.equal(text(byId(view,'palette-pinned-heading')),'Tab');assert.equal(byId(view,'palette-pinned-heading').style.top[0],0);assert.equal(byId(view,'palette-pinned-heading').style.right[0],8);
let list=byId(view,'palette-native-rows');assert.equal(list.count,8);assert.equal(list.sizes[3],34);assert.ok(nodes(view).some(n=>n.kind==='scrollbar'&&n.style.target[0]==='palette-native-rows'));
const entryRow=list.layout({start:1,end:2})[0];assert.equal(entryRow.style.mr[0],8,'Every modal list reserves the same scrollbar gutter');assert.equal(entryRow.style.px[0],8);assert.equal(entryRow.style.ml,undefined);
// Emulate the representative layout pass followed by the real scrolled range.
list.layout({start:0,end:1});list.layout({start:4,end:7});const beforeTick=notices;timers[0].fn(cx);assert.equal(notices,beforeTick+1);
view=palette.render();railOnTop(view);assert.equal(text(byId(view,'palette-pinned-heading')),'Pane');timers[0].fn(cx);assert.equal(notices,beforeTick+1,'No redraw while the active heading is unchanged');
let stops=0;byId(view,'palette-pinned-heading').events.on_click({},{stop_propagation:()=>stops++});assert.equal(stops,1);assert.equal(calls.length,0,'A pinned heading is not a command');
// Native scrollbar/layout changes update the pinned group without wheel handlers.
list=byId(view,'palette-native-rows');list.layout({start:7,end:8});timers[0].fn(cx);view=palette.render();assert.equal(text(byId(view,'palette-pinned-heading')),'Space');
// Filtering uses real command counts, never including headings themselves.
let results=Array.from({length:12},(_,i)=>row(`result-${i}`,i%2?'App':'Window'));
palette.rows=()=>results;palette.input.set_value('match');palette.input.events.change({},cx);view=palette.render();list=byId(view,'palette-native-rows');
railOnTop(view);
const fade=byId(view,'palette-list-more-below');assert.ok(fade,'Overflow has the same passive bottom fade as Jump/sidebar');assert.equal(fade.style.color[0],t.popover);assert.equal(fade.style.insets[0].right,8,'The fade leaves the rail clear');
const rail=nodes(view).find(n=>n.kind==='scrollbar');assert.equal(rail.style.scroll_size[1],list.sizes.reduce((a,b)=>a+b,0));assert.ok(rail.style.viewport_from_layout);
assert.equal(text(byId(view,'palette-pinned-heading')),'12 items');assert.equal(list.count,13);assert.equal(list.key(0),'head:results');assert.equal(list.sizes[0],26);assert.equal(list.key(1),'result-0');
list.layout({start:8,end:13});timers[0].fn(cx);view=palette.render();assert.equal(text(byId(view,'palette-pinned-heading')),'12 items');
assert.equal(byId(view,'palette-list-more-below'),undefined,'The last visible rows clear the hint without notifying during layout.');
list.layout({start:2,end:8});timers[0].fn(cx);view=palette.render();assert.ok(byId(view,'palette-list-more-below'),'Scrolling back up restores the fade even when the pinned heading is unchanged');
const stable=notices;timers[0].fn(cx);assert.equal(notices,stable,'Unchanged heading/fade does not redraw');
list.events.on_item_click('head:results',cx);assert.equal(calls.length,0);
results=[row('only')];palette.input.events.change({},cx);view=palette.render();assert.equal(text(byId(view,'palette-pinned-heading')),'1 item');
list.events.on_item_click('result-11',cx);assert.equal(calls.length,0,'Queued stale command keys are ignored after filtering');
// Empty queries have no count heading; existing No results presentation stays terse.
results=[];palette.input.events.change({},cx);view=palette.render();assert.equal(text(byId(view,'palette-empty')),'No results');assert.equal(byId(view,'palette-pinned-heading'),undefined);
for(const key of ['up','down','pageup','pagedown'])view.events.on_key_down({key},cx);assert.equal(palette.at,0,'Empty keyboard navigation never produces -1/NaN');
// Clear returns to grouped entries and resets both native scrolling and header state.
palette.rows=()=>fixture;view=palette.render();byId(view,'palette-search-clear').events.on_click({},cx);view=palette.render();assert.equal(palette.query,'');assert.equal(text(byId(view,'palette-pinned-heading')),'Tab');assert.equal(scrollCalls.at(-1)[0],0);
// Stock layouts gain neither the new header nor a synchronization task.
skin=false;const timerCount=timers.length;const stock=new Palette();stock.init({},cx);stock.rows=()=>fixture;view=stock.render();assert.equal(timers.length,timerCount);assert.equal(byId(view,'palette-pinned-heading'),undefined);
const unchanged=notices;palette.pendingHead='Outside scope';timers[0].fn(cx);assert.equal(notices,unchanged);palette.close();assert.equal(timers[0].cancelled,true,'Header synchronization is cancelled on close');assert.equal(closed.at(-1),'owned-test');
console.log('PASS: pinned command-group/count headings, scrollbar above sticky headers, native list retention, layout-safe sync, plural counts, clear/stale/empty-key guards and stock scope (synthetic UI)');
