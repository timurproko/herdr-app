import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import nodeFs from 'node:fs';
// The real ui.js basics (dist/lib/ui.js) on this test's element: shared rows/buttons as shipped.
const uiReal=(el,svgEl=el)=>{const src=nodeFs.readFileSync(new URL('../lib/ui.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/gm,'');const names=[...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);return vm.runInNewContext(src.replace(/^export /gm,'')+`\n({${names.join(',')}})`,{div:el,svg:svgEl,Popover:{new:el},Input:{new:el}});};
const state=new Map(),plain=v=>JSON.parse(JSON.stringify(v));
const model=fs.readFileSync(new URL('../mods/custom-new-menu/profiles.js',import.meta.url),'utf8')
 .replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')
 +'\nglobalThis.api={terminalConfig,terminalKey,composeTerminals,selectedTerminal,updateTerminal,moveTerminal,reorderTerminals,validateTerminal,selectTerminalShell,composeProfiles,profileConfig,updateProfile};';
const context={shared:key=>state.get(key),setShared:(key,v)=>state.set(key,plain(v)),knownAgents:async()=>[],exec:async()=>({code:0,stdout:'{}'}),readTextFile:async()=>null,appHome:()=>'/app'};
vm.runInNewContext(model,context);const p=context.api;
const native=[
 {key:'installed:powershell',name:'Windows PowerShell',source:'Installed shell',run:['C:/Windows/powershell.exe','-NoLogo']},
 {key:'installed:cmd',name:'Command Prompt',source:'Installed shell',run:['C:/Windows/cmd.exe']},
 {key:'installed:bash',name:'Git Bash',source:'Installed shell',run:['C:/Git/bash.exe','--login','-i']},
];
state.set('custom.shell-catalog:null',{policy:2,items:plain(native),checkedAt:Date.now()});
state.set('custom.shell-catalog:"pc2"',{policy:2,items:plain(native),checkedAt:Date.now()});
let items=p.composeTerminals(null);assert.equal(items.length,3);assert.ok(items.every(x=>x.show));
assert.equal(p.selectedTerminal(null),null);assert.equal(p.composeProfiles(null,[])[0].run,null);
assert.equal(state.has(p.terminalKey(null)),false,'Opening/reading Settings does not persist defaults');
p.updateTerminal(null,'installed:powershell',{show:false});
p.moveTerminal(null,'installed:bash',-1,p.composeTerminals(null));
items=p.composeTerminals(null);assert.deepEqual(plain(items.map(x=>x.key)),['installed:powershell','installed:bash','installed:cmd']);
assert.deepEqual(plain(items.filter(x=>x.show).map(x=>x.key)),['installed:bash','installed:cmd']);
assert.deepEqual(plain(p.composeTerminals('pc2').map(x=>x.key)),native.map(x=>x.key),'Order/visibility never leak across machines');
p.selectTerminalShell(null,items[0]);
assert.equal(p.selectedTerminal(null).key,'installed:powershell');
assert.deepEqual(plain(p.composeProfiles(null,[])[0].run),native[0].run,'A hidden switcher entry can still be the deliberate default for +');
const agentOrder=p.profileConfig(null).order;
let ps=p.composeTerminals(null)[0];
p.updateTerminal(null,ps.key,p.validateTerminal(ps,'Quiet shell',ps.command,'[]',{noLogo:false,loadProfile:true}));
ps=p.composeTerminals(null)[0];assert.equal(ps.name,'Quiet shell');assert.deepEqual(plain(ps.run),[ps.command]);
assert.deepEqual(plain(p.composeProfiles(null,[])[0].run),[ps.command],'Editing a selected terminal updates + without resaving agent profiles');
p.updateTerminal(null,ps.key,{loadProfile:false});
assert.deepEqual(plain(p.composeTerminals(null)[0].run),[ps.command,'-NoProfile']);
let bash=p.composeTerminals(null).find(x=>x.kind==='bash');
p.updateTerminal(null,bash.key,p.validateTerminal(bash,bash.name,bash.command,'["-x"]',{login:false,interactive:true,loadProfile:false}));
bash=p.composeTerminals(null).find(x=>x.kind==='bash');
assert.deepEqual(plain(bash.run),[bash.command,'--noprofile','--norc','-i','-x']);
let cmd=p.composeTerminals(null).find(x=>x.kind==='cmd');
p.updateTerminal(null,cmd.key,{autorun:false,args:['/q']});
assert.deepEqual(plain(p.composeTerminals(null).find(x=>x.kind==='cmd').run),[cmd.command,'/d','/q']);
assert.deepEqual(plain(p.profileConfig(null).order),plain(agentOrder),'Terminal order never changes agent profile order');
assert.throws(()=>p.validateTerminal(ps,'Name',ps.command,'["-NoLogo"]',ps.options),/startup switches/);
assert.throws(()=>p.validateTerminal(ps,'Name',ps.command,'not json',ps.options),/JSON array/);
assert.throws(()=>p.validateTerminal(ps,'Name','"C:/bad.exe"','[]',ps.options),/quotes/);
assert.throws(()=>p.updateTerminal(null,'__proto__',{show:true}),/Invalid terminal/);
// Visibility, ordering and rename-only saves never rewrite explicit legacy argv.
const legacyBash=['C:/Git/bash.exe','--rcfile','D:/native rc','-i'];
p.updateProfile('pc2','terminal',{command:legacyBash[0],args:legacyBash.slice(1),shell_profile:'installed:bash'});
let legacyItem=p.composeTerminals('pc2').find(x=>x.key==='installed:bash');
assert.deepEqual(plain(legacyItem.run),legacyBash);
p.updateTerminal('pc2',legacyItem.key,{show:false});
p.updateTerminal('pc2',legacyItem.key,p.validateTerminal(legacyItem,'Native Bash',legacyItem.command,JSON.stringify(legacyItem.extraArgs),legacyItem.options));
assert.deepEqual(plain(p.composeProfiles('pc2',[])[0].run),legacyBash);
// Legacy explicit custom launchers are retained, never redirected to a detected shell.
p.updateProfile('pc2','terminal',{command:'D:/custom/powershell.exe',args:['-NoExit'],shell_profile:'installed:powershell'});
assert.deepEqual(plain(p.composeProfiles('pc2',[])[0].run),['D:/custom/powershell.exe','-NoExit']);
assert.equal(p.composeTerminals('pc2').filter(x=>x.key==='configured:terminal').length,1);
p.selectTerminalShell('pc2',null);
// Actual popup composition consumes the same settings, while freezing its opening rows.
function el(){let e;e=new Proxy({kids:[]},{get(o,k){if(k in o)return o[k];if(k==='when')return(v,f)=>v?f(e):e;if(k==='child')return v=>{o.kids.push(v);return e;};if(k==='children')return v=>{o.kids.push(...v);return e;};return()=>e;}});return e;}
const closed=[],jobs=[],tabCalls=[];Object.assign(context,{run:(...args)=>tabCalls.push(args)});Object.assign(context,{emptyState:el,div:el,svg:el,h_flex:el,v_flex:el,slot:v=>v,divider:el,menuSurface:(_t,v)=>v,menuHeading:(_t,text)=>el().child(text),U:{row:28,gap:8},theme:()=>({}),
 panes:()=>[{pane:'pane',terminal:'old',tab:'tab',program:{shell:true}}],spaces:()=>[{id:'space',machine:null,tabs:[{id:'tab'}]}],
 terminals:()=>[{address:'old',state:'live',foreground:{name:'bash.exe'}}],machines:()=>[{name:null,layout:'ready'}],
 paneDirectory:()=>({cwd:'D:/work folder'}),paneStartFolder:()=>'D:/work folder',warmPaneStartFolder:async()=>{},readTextFile:async()=>null,closeOverlay:id=>closed.push(id),openOverlay:()=>{}});
{const real=uiReal(el);for(const name of ['menuRow','menuSeparator'])if(!(name in context))context[name]=real[name];}
const popup=fs.readFileSync(new URL('../mods/custom-new-menu/shell-switch.js',import.meta.url),'utf8').replace(/^import .*;\r?\n/gm,'').replace(/export /g,'')+'\nglobalThis.Switch=ShellSwitch;';
vm.runInNewContext(popup,context);
const cx={focus_handle:()=>({focus(){}}),notify(){},spawn(fn){jobs.push(fn);}};
let menu=new context.Switch();menu.init({switchPane:'pane',switchTerminal:'old',overlay:'menu'},cx);
assert.deepEqual(plain(menu.choices.map(x=>x.key)),['installed:bash','installed:cmd']);
p.reorderTerminals(null,p.composeTerminals(null),'installed:cmd',0);
const reordered=new context.Switch();reordered.init({switchPane:'pane',switchTerminal:'old',overlay:'reordered'},cx);
assert.deepEqual(plain(reordered.choices.map(x=>x.key)),['installed:cmd','installed:bash'],'The next shell menu follows Settings drag order, omitting hidden terminals');
assert.deepEqual(plain(menu.choices.map(x=>x.key)),['installed:bash','installed:cmd'],'An already open menu stays frozen');
p.reorderTerminals(null,p.composeTerminals(null),'installed:bash',0);
const snapshot=JSON.stringify(menu.choices);p.updateTerminal(null,'installed:bash',{name:'New label'});
assert.equal(JSON.stringify(menu.choices),snapshot,'Open popup rows remain frozen');
menu.choose(menu.choices[0],cx);assert.deepEqual(closed,['menu']);
const [command,request]=plain(tabCalls[0]);
assert.equal(command,'tab.new');assert.deepEqual(request.argv,plain(bash.run));assert.equal(request.folder,'D:/work folder');assert.equal(request.space,'space');assert.equal(jobs.length,0,'Shell tab selection has no background handoff');
assert.equal(state.get('custom.shell-switch:pane'),undefined,'No replacement job is persisted');
for(const shell of native)p.updateTerminal(null,shell.key,{show:false});
menu=new context.Switch();menu.init({switchPane:'pane',switchTerminal:'old',overlay:'empty'},cx);
assert.equal(menu.loading,false);assert.equal(menu.choices.length,0);assert.ok(menu.render());
assert.ok(!menu.choices.some(x=>x.key==='default'));
console.log('PASS: per-machine terminal visibility/order/default, launch flags/editor validation, custom/legacy preservation, + routing and frozen/empty switch menus');
