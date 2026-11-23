// Real Files + location helpers: no filesystem/network/session operations are executed.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist/mods/custom-files');
function element(asset){const node={asset,attrs:{},kids:[]};let el;el=new Proxy(node,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(el):el:k==='child'?v=>{o.kids.push(v);return el;}:k==='children'?v=>{o.kids.push(...v);return el;}:(...args)=>{o.attrs[k]=args;return el;}});return el;}
const find=(node,id)=>node&&typeof node==='object'?(node.attrs?.id?.[0]===id?node:node.kids?.map(child=>find(child,id)).find(Boolean)):undefined;
const files={id:'files',content:{mod:'custom-files'}},git={id:'changes',content:{mod:'custom-changes'}};
const stack={id:'panel-body',type:'stack',active:'files',children:[files,git]};
const panel={id:'panel',type:'column',hidden:true,children:[stack]};
const tree={id:'root',type:'row',children:[panel]};
const space={id:'space',active:true,machine:null,tabs:[{id:'tab1',active:true},{id:'tab2',active:false}]};
const panes=[{pane:'p1',tab:'tab1',terminal:'agent1',cwd:'/repo'},{pane:'p2',tab:'tab2',terminal:'agent2',cwd:'/repo'}];
const terminals=panes.map(p=>({address:p.terminal,foreground:{name:'node',cwd:p.cwd},labels:{}}));
let focus={space:'space',tab:'tab1',pane:'p1',terminal:'agent1',cwd:'/repo'},revision=1,gate=null,rendering=false;
const calls=[],jobs=[],timers=[];
const listing=()=>({code:0,stdout:`d1\0src\0f\0snapshot-${revision}.txt\0`});
const native={
  spaces:()=>[space],panes:()=>panes,terminals:()=>terminals,focused:()=>focus,props:()=>({}),layout:()=>tree,
  home:()=>'/home',theme:()=>({}),settings:()=>({}),window:()=>({platform:'linux'}),shared:()=>null,setShared(){},
  run(){},openOverlay(){},readTextFile:async()=>'',watchFolder:()=>assert.fail('Files must not register a folder watcher'),
  exec:(cmd,args,options)=>{
    calls.push({cmd,args,options});
    // Several folders arrive as one batch: each answer starts with an "@ ok" record.
    const folders=cmd==='sh'?args.slice(3):[],batch=reply=>folders.length<2?reply:{...reply,stdout:folders.map(()=>`@\0ok\0${reply.stdout}`).join('')};
    if(cmd==='sh'){if(gate){const current=gate;gate=null;return current.promise.then(batch);}return Promise.resolve(batch(listing()));}
    return Promise.resolve({code:0,stdout:args.includes('--show-toplevel')?`${options.cwd}\n`:''});
  },
};
const context=vm.createContext({}),cache=new Map();
function synthetic(values){return new vm.SyntheticModule(Object.keys(values),function(){for(const[k,v]of Object.entries(values))this.setExport(k,v);},{context});}
function moduleFor(file){if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));return cache.get(file);}
const main=moduleFor(path.join(root,'main.js'));
await main.link((name,ref)=>name==='websocket'?synthetic({WebSocket:{connect:()=>assert.fail('Files cannot open relay transport')}}):name==='herdr'?synthetic(native):name==='gpui-kit'?synthetic({View:class{},div:()=>element(),svg:asset=>element(asset),image:asset=>element(asset)}):name==='gpui-base'?synthetic({h_flex:()=>element(),v_flex:()=>element(),Editor:{},EditorState:{},Popover:{},Input:{},Toggle:{new:id=>element('toggle').id(id)}}):moduleFor(path.resolve(path.dirname(ref.identifier),name)));
await main.evaluate();
const view=new main.namespace.default();
const cx={spawn:fn=>jobs.push(fn(cx)),stop_propagation(){},notify:()=>assert.equal(rendering,false,'Render must not notify synchronously'),
  timer:{every:()=>assert.fail('The Files explorer must not poll'),after:(ms,fn)=>timers.push({ms,fn})}};
const render=()=>{rendering=true;try{return view.render(cx);}finally{rendering=false;}};
const drain=async()=>{while(jobs.length)await jobs.shift();};
const count=()=>calls.filter(c=>c.cmd==='sh'&&c.args.includes('/repo')).length;
const names=()=>view.entries.get('').map(entry=>entry.name);
const hold=()=>{let resolve;const promise=new Promise(yes=>{resolve=yes;});gate={promise};return resolve;};
view.init({},cx);render();assert.equal(calls.length,0,'Hidden panel does not list files or inspect Git');
panel.hidden=false;stack.active='changes';render();assert.equal(calls.length,0,'An inactive Files stack child stays quiet');
stack.active='files';
const loadingView=render(),text=node=>node&&typeof node==='object'?(node.kids??[]).flatMap(child=>typeof child==='string'?[child]:text(child)):[];
assert.ok(text(loadingView).includes('Loading')&&!text(loadingView).includes('Loading…'),'Files matches the Git loading label: no ellipsis');
assert.ok(!text(loadingView).includes('Loading files…'));
await drain();assert.equal(count(),1);assert.ok(names().includes('snapshot-1.txt'));

// Ordinary snapshots, file changes and agent status updates do not refresh a settled tree.
const settled=calls.length;revision=2;
for(let i=0;i<100;i++){terminals[0].status=i%2?'working':'idle';render();}
assert.equal(calls.length,settled);assert.ok(names().includes('snapshot-1.txt'));
assert.equal(timers.length,0,'Only explicit refresh feedback may create a one-shot timer');
view.headerHovered=true;
find(render(),'files-refresh').attrs.on_click[0]({},cx);await drain();
assert.equal(count(),2);assert.ok(names().includes('snapshot-2.txt'),'Manual Refresh updates the tree');
assert.equal(find(render(),'files-refresh').attrs.disabled[0],true,'Manual feedback retains the 600ms minimum');
for(const timer of timers.splice(0)){assert.equal(timer.ms,600);timer.fn(cx);}
assert.equal(find(render(),'files-refresh').attrs.disabled[0],false);

// Reopening or switching back from Git refreshes once, not on every render.
panel.hidden=true;render();revision=3;const closed=calls.length;render();assert.equal(calls.length,closed);
panel.hidden=false;render();await drain();assert.equal(count(),3);assert.ok(names().includes('snapshot-3.txt'));
stack.active='changes';render();revision=4;stack.active='files';render();await drain();assert.equal(count(),4);

// Agent/tab identity does not invalidate data in the same machine/folder.
view.folders.add('src');
const entries=view.entries,loadedAt=view.loadedAt,marks=view.marks,contextBefore=view.context;
const beforeSwitch=calls.length;
space.tabs[0].active=false;space.tabs[1].active=true;
focus={space:'space',tab:'tab2',pane:'p2',terminal:'agent2',cwd:'/repo'};
render();await drain();assert.equal(count(),4,'Switching agents in the same folder does not refresh');
assert.equal(calls.length,beforeSwitch,'Same-folder selection starts no directory or Git requests');
assert.equal(view.entries,entries);assert.equal(view.loadedAt,loadedAt);assert.equal(view.marks,marks);
assert.equal(view.context,contextBefore,'In-flight reads keep the same context owner');
assert.equal(view.context.tab,'tab2','File actions still use the selected tab/space metadata');
assert.equal(view.folders.has('src'),true,'Folder expansion is preserved across same-folder agents');
const sameAgent=calls.length;render();render();assert.equal(calls.length,sameAgent);
stack.active='changes';render();
space.tabs[0].active=true;space.tabs[1].active=false;focus={space:'space',tab:'tab1',pane:'p1',terminal:'agent1',cwd:'/repo'};
render();assert.equal(calls.length,sameAgent,'Agent switches while hidden perform no IO');
stack.active='files';render();await drain();assert.equal(count(),5,'Reopening still refreshes once even after an agent switch');

// A pending listing remains valid when focus moves between same-folder agents.
const finishSameFolder=hold();view.refresh(cx);const inFlight=jobs.shift(),pendingContext=view.context;
space.tabs[0].active=false;space.tabs[1].active=true;
focus={space:'space',tab:'tab2',pane:'p2',terminal:'agent2',cwd:'/repo'};
const duringSwitch=calls.length;render();assert.equal(calls.length,duringSwitch);
assert.equal(view.context,pendingContext);assert.equal(view.loading,true);
finishSameFolder({code:0,stdout:'f\0shared-result.txt\0'});await inFlight;await drain();
assert.ok(names().includes('shared-result.txt'),'The shared in-flight reply is applied');
space.tabs[0].active=true;space.tabs[1].active=false;
focus={space:'space',tab:'tab1',pane:'p1',terminal:'agent1',cwd:'/repo'};render();

// Hidden/stale reads cannot continue into Git scans or overwrite a reopened panel.
panel.hidden=true;render();const old=hold();panel.hidden=false;render();
panel.hidden=true;render();const beforeReply=calls.length;
old(listing());await drain();assert.equal(calls.length,beforeReply,'A hidden read does not continue traversing/scanning Git');
const first=hold();panel.hidden=false;render();const firstJob=jobs.shift();
panel.hidden=true;render();const second=hold();panel.hidden=false;render();const secondJob=jobs.shift();
first({code:0,stdout:'f\0stale.txt\0'});await firstJob;
assert.equal(view.loading,true,'An old completion cannot clear the reopened request');
revision=5;second(listing());await secondJob;await drain();
assert.ok(names().includes('snapshot-5.txt'));assert.ok(!names().includes('stale.txt'));

// Folder and remote-machine changes still route the refresh to the selected agent.
focus.cwd='/other';panes[0].cwd='/other';terminals[0].foreground.cwd='/other';render();await drain();assert.equal(view.root,'/other');
space.machine='pc2';panes[0].terminal='pc2/agent1';terminals[0].address='pc2/agent1';focus.terminal='pc2/agent1';render();await drain();
assert.equal(view.on,'pc2');assert.equal(calls.filter(c=>c.cmd==='sh').at(-1).options.on,'pc2');

// Coming back to the panel re-reads stale shown folders: one batched request, then
// nothing again while they are fresh. Folders read just now are skipped.
const listings=()=>calls.filter(c=>c.cmd==='sh').length;
view.folders.add('src');for(const key of ['', 'src'])view.loadedAt.set(key,0);view.freshenedAt=0;
let before=listings();find(render(),'files').attrs.on_hover[0](true,cx);await drain();
assert.equal(listings(),before+1,'Hover re-reads every stale folder in one request');
const batch=calls.filter(c=>c.cmd==='sh').at(-1);
assert.ok(batch.args.includes('/other')&&batch.args.includes('/other/src'),'The batch names the root and the open folder');
assert.equal(batch.options.on,'pc2','Batched reads run on the space machine');
before=listings();find(render(),'files').attrs.on_hover[0](true,cx);await drain();
assert.equal(listings(),before,'A second hover within seconds does no IO');
before=listings();view.toggle('src',cx);await drain();
assert.equal(listings(),before,'Collapsing right after a read skips the fresh parent');
for(let i=0;i<100;i++)render();
assert.equal(listings(),before,'Rendering never triggers reads');
console.log('PASS: Files refresh on open/folder changes and explicit freshness actions; same-folder agents reuse entries and in-flight reads; expansion retention, hidden/stale guards and remote routing');
