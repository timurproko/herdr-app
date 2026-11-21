// Panel switcher: Files / Git through native layout commands only; never touches the stack file.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import nodeFs from 'node:fs';
// The real ui.js basics (this mod's ui.js) on this test's element: shared rows as shipped.
const uiReal=(el,svgEl=el)=>{const src=nodeFs.readFileSync(new URL('./ui.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/gm,'');const names=[...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);return vm.runInNewContext(src.replace(/^export /gm,'')+`\n({${names.join(',')}})`,{div:el,svg:svgEl,Popover:{new:el},Input:{new:el}});};
const plain=v=>JSON.parse(JSON.stringify(v));
const source=fs.readFileSync(new URL('./panel-switch.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nglobalThis.api={PanelSwitch,PANELS,panelCommands,PANEL_MENU_HEIGHT};';
function element(){let e;const n={kids:[],style:{}};e=new Proxy(n,{get(o,k){if(k in o)return o[k];if(k==='when')return(v,f)=>v?f(e):e;if(k==='child')return v=>{o.kids.push(v);return e;};if(k==='children')return v=>{o.kids.push(...v);return e;};return(...v)=>{o.style[k]=v;return e;};}});return e;}
const nodes=e=>e&&typeof e==='object'&&e.kids?[e,...e.kids.flatMap(nodes)]:[];
function fixture(current='files',enabled=['files','changes']){
 const calls=[],closed=[],shared=[];
 const panels=[{id:'files',name:'Files',icon:'files.svg'},{id:'changes',name:'Git',icon:'git.svg'}];
 const context={sidebarPanels:({enabled:filter=true}={})=>panels.filter(p=>!filter||enabled.includes(p.id)),div:element,svg:element,h_flex:element,v_flex:element,slot:v=>v,menuSurface:(_t,v)=>v,menuHeading:(_t,text)=>element().child(text),divider:element,U:{row:28,meta:12,gap:8,radius:6,smallIcon:14},theme:()=>({}),
  panelTab:()=>({id:'tab',space:'space'}),changePanel:(choice,target)=>{assert.deepEqual(plain(target),{id:'tab',space:'space'});shared.push(['custom.panel.view',choice.view]);calls.push(['layout.select',{stack:'panel-body',child:choice.view}],['layout.show',{id:'panel'}]);},
  run:(...args)=>calls.push(plain(args)),closeOverlay:id=>closed.push(id),setShared:(k,v)=>shared.push([k,v])};
 {const real=uiReal(element);for(const name of ['menuRow','menuSeparator','iconButton'])if(!(name in context))context[name]=real[name];}
 vm.runInNewContext(source,context);
 const cx={focus_handle:()=>({focus(){}}),notify(){},stop_propagation(){}};
 const menu=new context.api.PanelSwitch();menu.init({panelSwitch:current,overlay:'menu'},cx);
 return {calls,closed,shared,menu,cx,api:context.api,enable:ids=>{enabled=ids;}};
}
{
 const f=fixture('files');const view=f.menu.render();
 assert.equal(nodes(view).find(n=>n.style.id?.[0]==='panel-switch-heading').kids[0],'Show');
 assert.deepEqual(plain(f.api.PANELS.map(p=>p.id)),['files','changes'],'Stack child ids stay stock; only labels are ours');
 assert.deepEqual(plain(f.api.PANELS.map(p=>p.name)),['Files','Git']);
 assert.ok(nodes(view).some(n=>n.style.id?.[0]==='panel-choice-files'));assert.ok(nodes(view).some(n=>n.style.id?.[0]==='panel-choice-changes'));
 const git=f.api.PANELS[1];f.menu.choose(git);f.menu.choose(git);
 assert.deepEqual(f.calls,[['layout.select',{stack:'panel-body',child:'changes'}],['layout.show',{id:'panel'}]],'One select + show, guarded against double activation');
 assert.deepEqual(f.closed,['menu']);assert.deepEqual(f.shared,[['custom.panel.view','changes']],'The chosen view is remembered for the tab-bar toggle');
}
{
 const f=fixture('changes');assert.equal(f.menu.at,1,'The menu starts on the current panel');
 f.menu.render().style.on_key_down[0]({key:'up'},f.cx);f.menu.render().style.on_key_down[0]({key:'enter'},f.cx);
 assert.deepEqual(f.calls[0],['layout.select',{stack:'panel-body',child:'files'}]);
 const h=fixture('bogus');assert.equal(h.menu.current,'files','Unknown panel ids fall back to Files');
 assert.ok(Number.isInteger(h.api.PANEL_MENU_HEIGHT)&&h.api.PANEL_MENU_HEIGHT>0);
}
for(const enabled of [[],['files'],['changes'],['files','changes']]) {
 const f=fixture('files',enabled),view=f.menu.render();
 assert.deepEqual(nodes(view).map(n=>n.style.id?.[0]).filter(id=>id?.startsWith('panel-choice-')),enabled.map(id=>`panel-choice-${id}`));
 f.enable([]);f.menu.choose(f.api.PANELS[0]);assert.equal(f.calls.length,0,'Stale popup actions cannot choose disabled panels');
 f.menu.render().style.on_key_down[0]({key:'down'},f.cx);assert.ok(Number.isFinite(f.menu.at),'Empty lists never modulo by zero');
}
console.log('PASS: Panel switcher filters enabled contributions, rejects disabled/stale selections, lists Files/Git, uses layout.select/show, keyboard and double-activation guards');
