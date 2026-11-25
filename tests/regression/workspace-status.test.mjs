import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import nodeFs from 'node:fs';
// The real ui.js basics (dist/lib/ui.js) on this test's element: shared rows/buttons as shipped.
const uiReal=(el,svgEl=el)=>{const src=nodeFs.readFileSync(new URL('../lib/ui.js',import.meta.url),'utf8').replace(/^import [^\n]*\n/gm,'');const names=[...src.matchAll(/^export (?:function|const) (\w+)/gm)].map(m=>m[1]);return vm.runInNewContext(src.replace(/^export /gm,'')+`\n({${names.join(',')}})`,{div:el,svg:svgEl,Popover:{new:el},Input:{new:el}});};
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
let focus={space:'s',tab:'home',pane:'p1',terminal:'t1',cwd:'C:/Users/me'};
const ps=[{pane:'p1',tab:'home',terminal:'t1',cwd:'C:/Users/me',branch:'wrong-background'}, {pane:'p2',tab:'repo',terminal:'pc2/t2',cwd:'C:/Users/me/Git',branch:null}];
const ts=[{address:'t1',cwd:'C:/Users/me'}, {address:'pc2/t2',foreground:{name:'bash.exe',cwd:'C:/Users/me/Git'},labels:{'custom.cwd':'C:/Users/me/Git/a1'}}];
const spaces=[{id:'s',active:true,machine:null,branch:'wrong-space',tabs:[{id:'home',active:true},{id:'repo'}]}];
const pending=[],tasks=[];let notifications=0;
let agentList=[{address:'t1',status:'idle'},{address:'pc2/t2',status:'idle'}];
function element(){const o={kids:[],style:{}};let p;p=new Proxy(o,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?v=>{o.kids.push(v);return p;}:k==='children'?v=>{o.kids.push(...v);return p;}:k==='hover'?()=>p:(...v)=>{o.style[k]=v;return p;}});return p;}
const native={shared:()=>undefined,focused:()=>focus,panes:()=>ps,terminals:()=>ts,spaces:()=>spaces,home:()=> 'C:/Users/me',agents:()=>agentList,theme:()=>({}),run:()=>{},keys:()=>[],nextCommand:()=>new Promise(()=>{}),setShared:()=>{},appHome:()=> 'C:/app',notify:()=>{},props:()=>({}),openOverlay:()=>{},closeOverlay:()=>{},exec:(...args)=>new Promise((resolve,reject)=>pending.push({args,resolve,reject}))};
const context=vm.createContext({}),cache=new Map();
function synthetic(exports){return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});}
function load(file){if(cache.has(file))return cache.get(file);const m=new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file});cache.set(file,m);return m;}
const main=load(path.join(root,'mods/custom-workspace-status/main.js'));
await main.link((s,r)=>s==='herdr'?synthetic(native):s==='gpui-kit'?synthetic({View:class{},div:element,svg:element}):s==='gpui-base'?synthetic({h_flex:element}):s==='./ui.js'?synthetic({menuRow:uiReal(element).menuRow,U:{},slot:v=>v,hotkey:()=>'',menuSurface:()=>element(),dropdown:()=>element(),PILL:{inset:6,menuShift:8},pillTrigger:()=>element(),pillMenu:m=>m}):load(path.resolve(path.dirname(r.identifier),s)));await main.evaluate();
const loc=cache.get(path.join(root,'mods/custom-workspace-status/location.js')).namespace.statusLocation;
const view=new main.namespace.default(),cx={spawn:fn=>tasks.push(fn(cx)),notify:()=>notifications++,timer:{after:()=>({cancel(){}})}};
const strings=n=>typeof n==='string'?[n]:(n?.kids??[]).flatMap(strings);
const draw=()=>strings(view.render(cx));
async function settle(code,stdout=''){const q=pending.shift(),task=tasks.at(-1);assert.ok(q);q.resolve({code,stdout});await task;return q;}
assert.equal(loc().cwd,'C:/Users/me');assert.ok(!draw().includes('wrong-space'));await settle(128);assert.ok(!draw().includes('wrong-background'),'No branch is borrowed outside a repo');
focus={space:'s',tab:'repo',pane:'p2',terminal:'pc2/t2',cwd:'C:/Users/me/Git'};
assert.equal(loc().cwd,'C:/Users/me/Git/a1','Git Bash prompt report overrides stale Win32 cwd');assert.equal(loc().on,'pc2');draw();
let query=pending[0];assert.equal(query.args[0],'git');assert.deepEqual(Array.from(query.args[1]),['--no-optional-locks','-c','core.fsmonitor=false','symbolic-ref','--quiet','--short','HEAD']);assert.equal(query.args[2].on,'pc2');assert.equal(query.args[2].cwd,'C:/Users/me/Git/a1');assert.equal(query.args[2].timeout,3000);
await settle(0,'develop\n');let labels=draw();assert.ok(labels.includes('develop'));assert.ok(labels.indexOf('pc2')<labels.indexOf('develop'),'Branch follows the machine');
const originalAgents=agentList;
for(const count of [0,1,2]){
  agentList=Array.from({length:count},(_,i)=>({address:`pc2/t${i}`,status:'idle'}));
  assert.ok(!draw().some(text=>/^\d+ agents?$/.test(text)),'Agent totals stay hidden');
}
agentList=[{address:'pc2/t2',status:'blocked'}];assert.ok(!draw().includes('1 needs you'),'Blocked-agent counts stay out of the status bar');
agentList=originalAgents;
// Checkout changes at the same location are refreshed without blanking valid metadata.
view.refreshBranch(cx);assert.ok(draw().includes('develop'));await settle(0,'feature/worktree\n');assert.ok(draw().includes('feature/worktree'));
view.refreshBranch(cx);await settle(1);assert.ok(!draw().includes('feature/worktree'),'Detached HEAD hides the branch');
view.refreshBranch(cx);pending.shift().reject(new Error('offline'));await tasks.at(-1);assert.equal(view.branch,null);
// A late remote reply must not appear on the newly selected home terminal.
view.refreshBranch(cx);focus={space:'s',tab:'home',pane:'p1',terminal:'t1',cwd:'C:/Users/me'};assert.ok(!draw().includes('develop'));assert.equal(pending.length,1,'At most one Git read is in flight');await settle(0,'stale-remote\n');assert.equal(pending.length,1,'Latest focus is queried after the stale read completes');assert.ok(!draw().includes('stale-remote'));await settle(128);
// Split panes and composition/peek targets use terminal identity, not space/tab identity.
focus={space:'s',tab:'home',pane:null,terminal:'pc2/peek',cwd:'D:/worktree'};assert.equal(loc().on,'pc2');assert.equal(loc().cwd,'D:/worktree');draw();await settle(0,'peek-branch\n');assert.ok(draw().includes('peek-branch'));
focus={space:'s',tab:'home',pane:'file',terminal:null,cwd:null};assert.equal(loc().cwd,null);assert.ok(!draw().includes('peek-branch'));assert.equal(pending.length,0,'File-only focus never queries a background terminal');
focus={space:'s',tab:'repo',pane:'p2',terminal:'pc2/t2'};ts[1].foreground={name:'node.exe',cwd:'D:/actual-agent-worktree'};assert.equal(loc().cwd,'D:/actual-agent-worktree','Foreground agent cwd wins over an old shell label');draw();await settle(0,'agent-branch\n');assert.ok(draw().includes('agent-branch'));
ts[1].foreground.cwd='D:/other-worktree';assert.ok(!draw().includes('agent-branch'),'Directory changes invalidate old branch immediately');await settle(0,'other-branch\n');assert.ok(draw().includes('other-branch'));
// A folder's first read shows nothing for the branch (no fake value); folders read
// before show their last branch at once while it is re-checked.
const nodes=n=>n&&typeof n==='object'?[n,...(n.kids??[]).flatMap(nodes)]:[];
const loadingBar=()=>nodes(view.render(cx)).some(n=>n.style?.accessibility_label?.[0]==='Loading branch');
ts[1].foreground.cwd='D:/fresh-checkout';assert.ok(!loadingBar(),'First read shows no placeholder value');assert.ok(!draw().includes('other-branch'),'nor the previous folder branch');assert.ok(!draw().includes('other-branch'));
await settle(0,'fresh\n');assert.ok(!loadingBar());assert.ok(draw().includes('fresh'));
ts[1].foreground.cwd='D:/actual-agent-worktree';assert.ok(draw().includes('agent-branch'),'A known folder shows its cached branch at once');assert.ok(!loadingBar());
await settle(0,'renamed\n');assert.ok(draw().includes('renamed'),'The re-check still replaces a changed branch');
ts[1].foreground.cwd='D:/not-a-repo';draw();await settle(128);ts[1].foreground.cwd='D:/fresh-checkout';draw();await settle(0,'fresh\n');
ts[1].foreground.cwd='D:/not-a-repo';assert.ok(!loadingBar(),'A known non-repo shows no bar');assert.ok(!draw().includes('fresh'));await settle(128);
focus=null;spaces[0].tabs[0].active=false;spaces[0].tabs[1].active=true;assert.equal(loc().terminal,'pc2/t2','Without native focus, use the active tab, not the first tab');
await Promise.all(tasks);assert.ok(notifications>0);
console.log('PASS: selected terminal/machine/folder branch, hidden agent totals and blocked-agent counts, machine-before-branch order, remote Git Bash and worktrees, detached/offline/no-repo guards, stale replies, bounded reads and file/peek focus');
