// Shell menu opens native tabs; never replaces/kills the existing terminal.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import nodeFs from 'node:fs';
// The real ui.js basics (this mod's ui.js) on this test's element: shared rows as shipped.
const uiReal=(el,svgEl=el)=>{const src=nodeFs.readFileSync(new URL('./ui.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/gm,'');const names=[...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);return vm.runInNewContext(src.replace(/^export /gm,'')+`\n({${names.join(',')}})`,{div:el,svg:svgEl,Popover:{new:el},Input:{new:el}});};
const plain=v=>JSON.parse(JSON.stringify(v));
const source=fs.readFileSync(new URL('./shell-switch.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nglobalThis.api={ShellSwitch,shellTabArgs};';
function element(){let e;const n={kids:[],style:{}};e=new Proxy(n,{get(o,k){if(k in o)return o[k];if(k==='when')return(v,f)=>v?f(e):e;if(k==='child')return v=>{o.kids.push(v);return e;};if(k==='children')return v=>{o.kids.push(...v);return e;};return(...v)=>{o.style[k]=v;return e;};}});return e;}
const nodes=e=>e&&typeof e==='object'?[e,...e.kids.flatMap(nodes)]:[];
function fixture(machine=null){
 const prefix=machine?machine+'/':'',pane={pane:prefix+'p1',terminal:prefix+'t1',tab:prefix+'tab1',program:{shell:true,name:'Bash'}},space={id:prefix+'sp1',machine,tabs:[{id:pane.tab}]};
 const choices=[{key:'bash',name:'Git Bash',run:['C:/shell with spaces/bash.exe','--login','-i'],show:true},{key:'pwsh',name:'PowerShell',run:['pwsh','-NoLogo'],show:true}];
 const state={panes:[pane],spaces:[space],terminals:[{address:pane.terminal,state:'live',foreground:{name:'bash.exe'}}],machines:[{name:machine,layout:'ready'}],choices,cwd:'D:/work folder'};
 const calls=[],closed=[],overlays=[],tasks=[];
 const context={div:element,svg:element,h_flex:element,v_flex:element,slot:v=>v,menuSurface:(_t,v)=>v,menuHeading:(_t,text)=>element().child(text),divider:element,U:{row:28,meta:12},theme:()=>({}),
  panes:()=>state.panes,spaces:()=>state.spaces,terminals:()=>state.terminals,machines:()=>state.machines,
  paneDirectory:()=>({cwd:state.cwd}),paneStartFolder:()=>state.cwd,warmPaneStartFolder:async()=>{},readTextFile:async()=>null,cachedTerminalShells:()=>choices,composeTerminals:()=>state.choices,warmTerminalShells:async()=>choices,
  run:(...args)=>calls.push(plain(args)),closeOverlay:id=>closed.push(id),openOverlay:s=>overlays.push(plain(s)),
  shared:()=>({phase:'queued',expiresAt:Date.now()+60000}),setShared:()=>{throw Error('No shell replacement state allowed');},exec:()=>{throw Error('No replacement worker allowed');}};
 {const real=uiReal(element);for(const name of ['menuRow','menuSeparator','iconButton'])if(!(name in context))context[name]=real[name];}
 const opening=fs.readFileSync(new URL('./settings-dialog.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'');
 vm.runInNewContext(opening+'\n'+source,context);
 const cx={focus_handle:()=>({focus(){}}),notify(){},stop_propagation(){},spawn:fn=>tasks.push(fn)};
 const menu=new context.api.ShellSwitch();menu.init({switchPane:pane.pane,switchTerminal:pane.terminal,overlay:'menu'},cx);
 return {state,pane,space,choices,calls,closed,overlays,tasks,menu,cx,context};
}
for(const machine of [null,'pc2']){
 const f=fixture(machine),before=plain(f.state);
 const view=f.menu.render();assert.equal(nodes(view).find(n=>n.style.id?.[0]==='shell-tab-heading').kids[0],'Open tab');
 f.menu.choose(f.choices[0],f.cx);f.menu.choose(f.choices[0],f.cx);
 assert.deepEqual(f.calls,[['tab.new',{space:f.space.id,folder:'D:/work folder',argv:f.choices[0].run}]],'One public native command with qualified target and literal argv');
 assert.deepEqual(f.closed,['menu']);assert.deepEqual(plain(f.state),before,'Source terminal, tab and topology are not modified');assert.equal(f.tasks.length,0);
 const edit=fixture(machine);edit.menu.editTerminals();assert.equal(edit.overlays[0].props.terminalsMachine,machine);assert.match(edit.overlays[0].props.settingsOpening,/^settings-/);
}
for(const mutate of [f=>f.state.panes=[],f=>f.state.spaces=[],f=>f.state.machines[0].layout='unavailable',f=>f.pane.terminal='other',f=>f.pane.tab='other',f=>f.pane.program.agent=true,f=>f.pane.status='working',f=>f.state.choices=[],f=>f.state.choices=[{...f.choices[0],run:['different']}],f=>f.state.terminals.push({address:'child',parent:f.pane.terminal,state:'live'})]){
 const f=fixture();mutate(f);f.menu.choose(f.choices[0],f.cx);assert.equal(f.calls.length,0,'Stale targets/settings cannot launch elsewhere');assert.ok(f.menu.error);
}
const noCwd=fixture();noCwd.state.cwd=null;noCwd.menu.choose(noCwd.choices[0],noCwd.cx);assert.equal(Object.hasOwn(noCwd.calls[0][1],'folder'),false);
const keyboard=fixture();keyboard.menu.render().style.on_key_down[0]({key:'down'},keyboard.cx);keyboard.menu.render().style.on_key_down[0]({key:'enter'},keyboard.cx);assert.deepEqual(keyboard.calls[0][1].argv,keyboard.choices[1].run);
console.log('PASS: Open new tab in header, native tab.new, local/remote qualified targets, cwd/argv, no source mutation or replacement jobs, stale guards, keyboard and double-click protection');
