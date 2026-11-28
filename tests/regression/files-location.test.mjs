import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let focus={space:'local',tab:'home',pane:'p1',terminal:'t1',cwd:'C:/Users/me'};
const spaces=[{id:'local',active:true,machine:null,folder:'C:/unrelated',tabs:[{id:'home',active:true},{id:'repo'}]}];
const panes=[{pane:'p1',tab:'home',terminal:'t1',cwd:'C:/Users/me'}, {pane:'p2',tab:'repo',terminal:'pc2/t2',cwd:'C:/Users/me/Git'}];
const terminals=[{address:'t1',foreground:{name:'bash.exe',cwd:'C:/Users/me'},labels:{'custom.cwd':'D:/active folder/目录'}}, {address:'pc2/t2',foreground:{name:'bash.exe',cwd:'C:/Users/me/Git'},labels:{'custom.cwd':'C:/Users/me/Git/a1'}}];
const tasks=[],pending=[],calls=[],sharedValues=new Map([['layout','Custom']]);
const panelLayout={id:'root',children:[{id:'panel',children:[{id:'panel-body',active:'files',children:[{id:'files'}]}]}]};
function element(){const o={kids:[]};let p;p=new Proxy(o,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?v=>{o.kids.push(v);return p;}:k==='children'?v=>{o.kids.push(...v);return p;}:()=>p});return p;}
const native={focused:()=>focus,spaces:()=>spaces,panes:()=>panes,terminals:()=>terminals,home:()=> 'C:/Users/me',props:()=>({}),shared:key=>sharedValues.get(key)??null,setShared:(key,value)=>sharedValues.set(key,value),settings:()=>({}),theme:()=>({}),layout:()=>panelLayout,window:()=>({platform:'windows'}),run:(...args)=>calls.push(args),readTextFile:async()=>'',watchFolder:()=>new Promise(()=>{}),nextCommand:()=>new Promise(()=>{}),exec:(...args)=>args[0]==='powershell'?new Promise(resolve=>pending.push({args,resolve})):Promise.resolve({code:128,stdout:''})};
const storage=new Map();
const context=vm.createContext({sessionStorage:{getItem:key=>storage.get(key)??null,setItem:(key,value)=>storage.set(key,value),removeItem:key=>storage.delete(key)}}),cache=new Map();
function synthetic(exports){return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});}
function moduleFor(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
async function load(file){const m=moduleFor(file);if(m.status==='unlinked')await m.link((s,r)=>s==='websocket'?synthetic({WebSocket:{connect:()=>assert.fail('Files cannot open relay transport')}}):s==='herdr'?synthetic(native):s==='gpui-kit'?synthetic({View:class{},div:element,svg:element,image:element}):s==='gpui-base'?synthetic({h_flex:element,v_flex:element,Editor:{},EditorState:{},Toggle:{new:()=>element()}}):s==='./ui.js'?synthetic({U:{},slot:v=>v,headerTools:v=>v,reveal:v=>v,panelTitle:element,refreshButton:element,emptyState:element,subtleActionFill:()=>'',itemHover:()=>'',menuSurface:element,dialogSurface:element,dialogHeader:element,dialogBody:element,description:element,button:element,spinner:element,menuHeading:element,dropdown:element,pillTrigger:element,pillMenu:m=>m,iconButton:element,menuRow:element,menuSeparator:element,tag:element}):moduleFor(path.resolve(path.dirname(r.identifier),s)));return m;}
const main=await load(path.join(root,'mods/custom-files/main.js'));await main.evaluate();
const location=cache.get(path.join(root,'mods/custom-files/location.js')).namespace.location;
assert.equal(location().cwd,'D:/active folder/目录','Shell report wins over stale pane/focus/launch cwd');
const view=new main.namespace.default(),cx={spawn:fn=>tasks.push(fn(cx)),notify:()=>{},timer:{every:()=>{}}};view.init({},cx);
assert.equal(view.root,'D:/active folder/目录');assert.equal(pending[0].args[2].on,null);assert.ok(pending[0].args[1].at(-1).includes(view.root));
// Switch before the first directory read returns: neither files nor actions may leak.
spaces[0].tabs[0].active=false;spaces[0].tabs[1].active=true;
focus={space:'local',tab:'repo',pane:'p2',terminal:'pc2/t2',cwd:'C:/Users/me/Git'};
view.openFile('stale.txt');assert.equal(calls.length,0,'Stale tree is not actionable');view.render(cx);
assert.equal(view.root,'C:/Users/me/Git/a1');assert.equal(view.on,'pc2');assert.equal(pending[1].args[2].on,'pc2');
pending[1].resolve({code:0,stdout:'[{"name":"actual.txt","dir":false}]'});await tasks[1];
pending[0].resolve({code:0,stdout:'[{"name":"stale.txt","dir":false}]'});await tasks[0];
assert.equal(view.entries.get('')[0].name,'actual.txt','Late local reply never replaces the active remote tree');
view.openFile('actual.txt');assert.equal(calls[0][1].props.fileRoot,view.root);assert.equal(calls[0][1].props.fileMachine,'pc2');
// Agents/processes override shell reports, including same-pane worktree moves.
terminals[1].foreground={name:'node.exe',cwd:'D:/worktrees/actual-agent'};
assert.equal(location().cwd,'D:/worktrees/actual-agent');
terminals[1].foreground.cwd='D:/worktrees/next';assert.equal(view.current(view.context),false);
// No focus (e.g. panel focus) uses only the selected tab, never the first tab.
focus=null;assert.equal(location().cwd,'D:/worktrees/next');
focus={space:'local',tab:'home',pane:'p1',terminal:'t1'};assert.equal(location().cwd,'D:/worktrees/next','Stale focus from an inactive tab is ignored');
// Native shell fallback, PowerShell logical reporting, and composition terminals.
terminals[1].foreground={name:'cmd.exe',cwd:'E:/native-live'};delete terminals[1].labels['custom.cwd'];assert.equal(location().cwd,'E:/native-live');
terminals[1].foreground={name:'pwsh.exe',cwd:'E:/stale-process'};terminals[1].labels['custom.cwd']='F:/logical';assert.equal(location().cwd,'F:/logical');
focus={space:'local',tab:'repo',pane:null,terminal:'pc2/peek',cwd:'D:/peek'};assert.equal(location().cwd,'D:/peek');assert.equal(location().on,'pc2');
focus={space:'local',tab:'repo',pane:'p2',terminal:'pc2/t2',shown:'pc2/peek',cwd:'D:/shown'};assert.equal(location().cwd,'D:/shown');
// File-only tabs preserve the originating explorer, not an unrelated launch folder.
panes.push({pane:'file-pane',tab:'file-tab',mod:'custom-files'});spaces[0].tabs[1].active=false;spaces[0].tabs.push({id:'file-tab',active:true});focus={space:'local',tab:'file-tab',pane:'file-pane',terminal:null};
assert.equal(location(view.context).cwd,view.root);assert.equal(location(view.context).on,'pc2');assert.equal(location().cwd,null,'Without an origin, do not borrow a background folder');
assert.equal(location({...view.context,space:'other'}).cwd,null);
console.log('PASS: Files live cwd, active-tab fallback, remote routing, worktrees, shell reports, pinned file origins, stale replies and actions');
// A Claude session behind a shell wrapper: the parent bash and its prompt say the launch folder.
terminals[1].foreground={name:'bash.exe',cwd:'D:/Git'};terminals[1].labels['custom.cwd']='D:/Git';
terminals[1].report={app:'claude-code'};terminals[1].labels['custom.claude.session']='fixture-instance';
terminals[1].labels['custom.claude.cwd']='D:/Git/firstmate';terminals[1].labels['custom.claude.at']=String(Date.now());
spaces[0].tabs.pop();spaces[0].tabs[1].active=true;focus={space:'local',tab:'repo',pane:'p2',terminal:'pc2/t2',cwd:'D:/Git'};
assert.equal(location().cwd,'D:/Git/firstmate','Live Claude report beats its wrapper shell');
terminals[1].labels['custom.claude.at']=String(Date.now()-120000);assert.equal(location().cwd,'D:/Git','Quit Claude session falls back to the shell');
console.log('PASS: Files follows a wrapped Claude session folder');

// Real Files controller and resolver: holding retains data and machine across
// navigation, while release retires the old tree/read before loading selection.
const panelState=cache.get(path.join(root,'mods/custom-files/panel-state.js')).namespace;
view.refresh(cx);pending.at(-1).resolve({code:0,stdout:'[{"name":"held.txt","dir":false}]'});await tasks.at(-1);
assert.equal(panelState.togglePanelPin(),true);
const held=JSON.stringify(panelState.panelSource()),entries=view.entries,folder=view.root;
terminals[1].labels['custom.cwd']='E:/source-moved';
spaces[0].active=false;spaces.push({id:'elsewhere',active:true,machine:null,tabs:[{id:'away',active:true}]});
panes.push({pane:'away-pane',tab:'away',terminal:'t1'});focus={space:'elsewhere',tab:'away',pane:'away-pane',terminal:'t1'};
const readsBefore=pending.length;view.render(cx);
assert.equal(view.root,folder);assert.equal(view.entries,entries);assert.equal(pending.length,readsBefore,'Navigation does not scan the new folder');
assert.equal(JSON.stringify(panelState.panelSource()),held);
view.openFile('held.txt');const opened=calls.at(-1);
assert.equal(opened[0],'tab.new');assert.equal(opened[1].space,'elsewhere','Open in the current native space');
assert.equal(opened[1].props.fileMachine,'pc2','Read the file from the held source machine, not the current space');
assert.equal(opened[1].props.fileRoot,folder);
view.refresh(cx);const late=pending.at(-1);assert.equal(late.args[2].on,'pc2');
assert.equal(panelState.togglePanelPin(undefined,false),true);view.render(cx);const fresh=pending.at(-1);
assert.equal(view.root,'D:/active folder/目录');assert.equal(fresh.args[2].on,null);
late.resolve({code:0,stdout:'[{"name":"obsolete.txt","dir":false}]'});await tasks.at(-2);
fresh.resolve({code:0,stdout:'[{"name":"current.txt","dir":false}]'});await tasks.at(-1);
assert.equal(view.entries.get('')[0].name,'current.txt','Held replies cannot overwrite the released current-agent tree');
// Capture the displayed explorer even when native focus is its file-viewer tab.
spaces[1].tabs[0].active=false;spaces[1].tabs.push({id:'viewer',active:true});panes.push({pane:'viewer-pane',tab:'viewer',mod:'custom-files'});
focus={space:'elsewhere',tab:'viewer',pane:'viewer-pane'};location(view.context);
assert.equal(panelState.togglePanelPin(),true);assert.equal(panelState.panelSource().cwd,view.root);
assert.equal(panelState.panelSource().terminal,'t1');
terminals.splice(0,1);assert.equal(location().cwd,view.root,'Disappearing source cannot borrow a different terminal');
assert.equal(panelState.togglePanelPin(undefined,false),true);
assert.equal(JSON.stringify(sharedValues.get('custom.panel.tabs')).includes('terminal'),false,'No held context in durable shared state');
console.log('PASS: Files held source/tree, navigation, captured remote file actions, release races and file-viewer origin capture');
