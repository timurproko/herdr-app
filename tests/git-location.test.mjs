import {githubInvocation} from './support/github-read.mjs';
import assert from 'node:assert/strict';
import {withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root, 'dist/mods/custom-changes');
const home = 'C:/Users/me', repo = 'D:/Git/xrbuild';
const space = {id:'pc2/space', active:true, machine:'pc2', folder:repo, tabs:[{id:'pc2/tab',active:true}]};
const pane = {pane:'pc2/p1', tab:'pc2/tab', terminal:'pc2/t1', cwd:repo, focused:true};
const terminal = {address:'pc2/t1', cwd:repo, foreground:{name:'bash.exe',cwd:repo}, labels:{'custom.cwd':home}};
let focus = {space:space.id, tab:pane.tab, pane:pane.pane, terminal:pane.terminal, cwd:repo};
const pending = [], tasks = [];
let branch = 'fix/active-agent', heldBranch = null;
const branchCalls = [], screenCalls = [];
let screenReply = {code:1,stdout:''};
let rendering = false;
function element(asset) {
  const node = {asset, attrs:{}, kids:[]}; let proxy;
  proxy = new Proxy(node, {get(target,key) {
    if (key in target) return target[key];
    if (key === 'when') return (yes,fn) => yes ? fn(proxy) : proxy;
    if (key === 'child') return child => {node.kids.push(child);return proxy;};
    if (key === 'children') return children => {node.kids.push(...children);return proxy;};
    return (...args) => {node.attrs[key]=args;return proxy;};
  }});
  return proxy;
}
const native = {
  shared:()=>null, setShared(){}, settings:()=>({zoom:1}),
  agents:()=>[], spaces:()=>[space], panes:()=>[pane], terminals:()=>[terminal], focused:()=>focus,
  home:()=>home, theme:()=>({dim:'dim',hover:'hover',foreground:'foreground'}), layout:()=>null, window:()=>({platform:'windows'}), run(){}, openOverlay(){}, props:()=>null, closeOverlay(){}, notify(){}, nextCommand(){},
  hc:args=> { screenCalls.push(args); return Promise.resolve(screenReply); },
  exec:(cmd,args,options)=> {
    ({command:cmd,args,options}=githubInvocation(cmd,args,options));
    if(args[0]==='api'&&args[1]==='user')return Promise.resolve({code:0,stdout:'fixture-user'});
    if (cmd === 'git' && args[0] === 'rev-parse') assert.equal(rendering,false,'Root probes yield even when spawn starts inline in render');
    if (cmd === 'git' && args[0] === 'symbolic-ref') {
      branchCalls.push({args,options});
      if (heldBranch) { const promise = heldBranch; heldBranch = null; return promise; }
      return Promise.resolve({code:branch ? 0 : 1,stdout:branch ?? '',stderr:''});
    }
    return new Promise((resolve,reject)=>pending.push({cmd,args,options,resolve,reject}));
  },
};
const context = vm.createContext({localStorage:{getItem:()=>null,setItem(){}}});
const cache = new Map();
function synthetic(exports) {
  return new vm.SyntheticModule(Object.keys(exports), function() {
    for (const [key,value] of Object.entries(exports)) this.setExport(key,value);
  }, {context});
}
function moduleFor(file) {
  if (!cache.has(file)) cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));
  return cache.get(file);
}
const main = moduleFor(path.join(folder,'main.js'));
await main.link((specifier,referencing) => {
  if (specifier === './ci-fix.js') return synthetic({CIFix:class {sync(){}stop(){}}});
  if (specifier === './notices.js') return synthetic({GitNotices:class {sync(){return null;}stop(){}retryNow(){}}});
  if (specifier === './webhooks.js') return synthetic({GitWebhooks:class {sync(){} stop(){}}});
  if (specifier === './host.js') return synthetic(native);
  if (specifier === './plugins.js') return synthetic({pluginPullContext:()=>null,pluginEvent(){},sidebarPanelEnabled:()=>true,sidebarPanels:()=>[{id:'files',name:'Files',icon:'files.svg'},{id:'changes',name:'Git',icon:'git.svg'}]});
  if (specifier === 'gpui-kit') return synthetic({View:class{},div:element,svg:element,PathBuilder:{}});
  if (specifier === 'gpui-base') return synthetic({h_flex:element,v_flex:element,Toggle:{new:id=>element('toggle').id(id)}});
  if (specifier === './ui.js') return synthetic(withKitUi({U:{control:28,radius:6,icon:16,insetControl:24,insetRadius:4,smallIcon:14},panelTitle:element,headerTools:x=>x,reveal:(x,visible)=>x.opacity(visible?1:0),subtleActionFill:()=>'',itemHover:()=>'',refreshButton:element,emptyState:element,menuSurface:(_t,el)=>el,menuHeading:(_t,text)=>element().child(text),slot:el=>el},element));
  return moduleFor(path.resolve(path.dirname(referencing.identifier),specifier));
});
await main.evaluate();
const location = cache.get(path.join(folder,'location.js')).namespace.location;
assert.equal(location().cwd,home,'Bash prompt report wins over native launch/pane/focus cwd');
assert.equal(location().on,'pc2','Remote machine comes from the actual terminal');
terminal.foreground = {name:'node.exe',cwd:'D:/worktrees/agent'};
assert.equal(location().cwd,'D:/worktrees/agent','Foreground applications override stale prompt reports');
terminal.report = {app:'a1'};
const a1Labels = {'a1.session':'11111111-1111-4111-8111-111111111111','a1.runtime':'22222222-2222-4222-8222-222222222222','a1.at':String(Date.now()),'a1.cwd':'D:/worktrees/attached'};
a1Labels['a1.cwd.binding']=`${a1Labels['a1.runtime']}/${a1Labels['a1.session']}/${a1Labels['a1.at']}`;
Object.assign(terminal.labels,a1Labels);
assert.equal(location().cwd,a1Labels['a1.cwd'],'The active A1 worktree beats Node launch cwd and shell labels');
assert.equal(location().on,'pc2','A1 worktree paths stay on the terminal machine');
terminal.labels['a1.at']=String(Date.now()-90_001);
assert.equal(location().cwd,'D:/worktrees/agent','Expired A1 metadata preserves the foreground fallback');
terminal.labels['a1.at']=String(Date.now()+60_000);
assert.equal(location().cwd,'D:/worktrees/agent','Future A1 metadata cannot reroute Git');
Object.assign(terminal.labels,a1Labels);
terminal.report.app='bash';
assert.equal(location().cwd,'D:/worktrees/agent','Fresh leftover A1 labels cannot override another program');
terminal.report.app='a1';terminal.address='t-local';pane.terminal='t-local';focus={...focus,terminal:'t-local'};
assert.equal(location().cwd,a1Labels['a1.cwd']);assert.equal(location().on,null,'Local A1 does not inherit the remote space machine');
terminal.address='pc2/t1';pane.terminal='pc2/t1';focus={...focus,terminal:'pc2/t1'};
for(const key of Object.keys(a1Labels))delete terminal.labels[key];delete terminal.report;
terminal.foreground = {name:'pwsh.exe',cwd:repo};
assert.equal(location().cwd,home,'PowerShell logical prompt location wins too');
delete terminal.labels['custom.cwd'];
terminal.foreground = {name:'cmd.exe',cwd:'E:/live'};
assert.equal(location().cwd,'E:/live','CMD falls back to its live native directory');
terminal.foreground = {name:'bash.exe',cwd:repo}; terminal.labels['custom.cwd'] = home;
const correctFocus = focus;
const selectedTab = space.tabs[0];
selectedTab.name = '906'; selectedTab.named = true;
assert.equal(location().pullNumber,906,'An explicitly named PR tab links the active agent even when its shell cwd is elsewhere');
for (const name of ['#906','PR #906','PR 906']) {
  selectedTab.name = name; assert.equal(location().pullNumber,906);
}
for (const name of ['0','Work on 906','906 extra','9007199254740992']) {
  selectedTab.name = name; assert.equal(location().pullNumber,null);
}
selectedTab.name = '1'; selectedTab.named = false;
assert.equal(location().pullNumber,null,'Default positional tab numbers are not PR references');
delete selectedTab.named;
assert.equal(location().pullNumber,null,'Missing named metadata must not infer a PR');
selectedTab.name = '906'; selectedTab.named = true;
focus = null;
assert.equal(location().pullNumber,906,'Panel focus keeps the selected terminal PR link');
focus = null; assert.equal(location().cwd,home,'Panel focus falls back to the selected tab');
focus = {space:'other',tab:'other',terminal:'other/t2',cwd:repo};
assert.equal(location().cwd,home,'Stale focus from another space/tab cannot choose the repo');
focus = {...correctFocus,shown:'peek',cwd:'F:/shown'};
assert.equal(location().cwd,'F:/shown'); assert.equal(location().on,null,'A shown local terminal is not routed to the active remote space');
assert.equal(location().pullNumber,null,'Peek/replacement terminals cannot borrow the underlying tab PR');
focus = correctFocus;
pane.mod = 'custom-files'; pane.terminal = null;
focus = {...correctFocus,terminal:null};
assert.equal(location().cwd,null,'A mod pane cannot borrow the space launch folder');
assert.equal(location().pullNumber,null,'A mod pane cannot borrow the tab PR');
delete pane.mod; pane.terminal = correctFocus.terminal; focus = correctFocus;
selectedTab.named = false;

const view = new main.namespace.default();
const cx = {focus_handle(){assert.equal(rendering,false,'No focus allocation from render');return {};},spawn:fn=>tasks.push(fn(cx)),notify:()=>assert.equal(rendering,false,'No synchronous notify from render'),timer:{every(){}}};
const render = () => {rendering=true;try{return view.render(cx);}finally{rendering=false;}};
const tick = async () => {for(let i=0;i<16;i++) await Promise.resolve();};
async function take(cmd,subcommand) {
  await tick();
  const index = pending.findIndex(call=>call.cmd===cmd && (!subcommand || call.args[0]===subcommand));
  assert.ok(index>=0,`Expected pending ${cmd} ${subcommand ?? ''}`);
  return pending.splice(index,1)[0];
}
async function reply(call,stdout='',code=0) {(await call).resolve({stdout,code,stderr:code===128?'fatal: not a git repository (or any of the parent directories): .git':''});await tick();}
function select(cwd) {terminal.labels['custom.cwd']=cwd;render();}
function seedRepo() {
  view.repo={name:'example/xrbuild',owner:'example'};
  view.pulls={open:[{number:1}],closed:[]}; view.counts={open:1,closed:6};
}
view.init({},cx);
let git = await take('git');
assert.equal(git.options.cwd,home); assert.equal(git.options.on,'pc2');
await reply(git,'',128);
assert.equal(view.root,null); assert.equal(view.repo,null); assert.equal(view.error,'Not a git repository');
assert.equal(pending.length,0,'Non-repo home never starts GitHub requests');

// A1 launched from home attaches without process-global chdir: only native
// project labels change. Pending replies from its old worktree cannot restore it.
terminal.foreground={name:'node.exe',cwd:home};terminal.report={app:'a1'};
Object.assign(terminal.labels,a1Labels);
render();const firstWorktree=await take('git');
assert.equal(firstWorktree.options.cwd,a1Labels['a1.cwd']);assert.equal(firstWorktree.options.on,'pc2');
terminal.labels['a1.cwd']='D:/worktrees/second';render();const secondWorktree=await take('git');
await reply(firstWorktree,'D:/worktrees/stale');assert.equal(view.root,null);assert.equal(view.loading,true);
await reply(secondWorktree,'D:/worktrees/second');assert.equal(view.root,'D:/worktrees/second');
assert.equal(branchCalls.at(-1).options.cwd,'D:/worktrees/second');
terminal.labels['a1.cwd']=home;render();await reply(take('git'),'',128);
assert.equal(view.error,'Not a git repository','Detach to nonrepository home clears worktree repository');
for(const key of Object.keys(a1Labels))delete terminal.labels[key];
terminal.report={app:'claude-code'};
Object.assign(terminal.labels,{'custom.claude.session':'fixture-instance','custom.claude.at':String(Date.now()),'custom.claude.cwd':'D:/worktrees/claude'});
render();const claudeRoot=await take('git');
assert.equal(claudeRoot.options.cwd,'D:/worktrees/claude','The same generic resolver accepts Claude session roots over stale Node cwd');
assert.equal(claudeRoot.options.on,'pc2');
await reply(claudeRoot,'D:/worktrees/claude');assert.equal(view.root,'D:/worktrees/claude');
terminal.labels['custom.claude.cwd']='D:/worktrees/claude-next';render();const staleClaude=await take('git');
terminal.labels['custom.claude.at']=String(Date.now()-90_001);render();const expiredClaude=await take('git');
assert.equal(expiredClaude.options.cwd,home,'Expired capabilities retain generic foreground fallback');
await reply(staleClaude,'D:/worktrees/claude-next');assert.equal(view.root,null);await reply(expiredClaude,'',128);
for(const key of ['custom.claude.session','custom.claude.at','custom.claude.cwd'])delete terminal.labels[key];delete terminal.report;
terminal.foreground={name:'bash.exe',cwd:repo};

// A loaded repo is cleared synchronously, before the home check comes back.
select(repo); await reply(take('git'),repo); seedRepo();
assert.equal(view.branch,branch);
assert.equal(branchCalls.at(-1).options.cwd,repo);
assert.equal(branchCalls.at(-1).options.on,'pc2','Branch lookup runs on the terminal machine');
select(home);
assert.equal(view.branch,null,'A context switch clears the selected PR immediately');
assert.equal(view.root,null); assert.equal(view.repo,null); assert.equal(view.counts,null); assert.equal(view.pulls.open,null);
await reply(take('git'),'',128);

// A slow old git request must not block a new location or turn off its spinner.
select(repo); const oldGit = await take('git');
select(home); const newGit = await take('git');
assert.equal(newGit.options.cwd,home);
await reply(oldGit,repo);
assert.equal(view.root,null); assert.equal(view.loading,true);
await reply(newGit,'',128); assert.equal(view.loading,false);

// A -> B -> A must reject the first A even though its string context matches.
select(repo); const firstA = await take('git');
select(home); const b = await take('git');
select(repo); const secondA = await take('git');
await reply(firstA,'D:/stale'); assert.equal(view.root,null); assert.equal(view.branch,null); assert.equal(view.loading,true);
await reply(secondA,repo); await reply(b,'',128); assert.equal(view.root,repo);

// Late repo discovery must not restore the old header or overwrite new busy state.
view.loadPulls('open',cx,true); const oldRepo = await take('gh','repo');
select(home); await reply(take('git'),'',128);
select(repo); await reply(take('git'),repo);
view.loadPulls('open',cx,true); const newRepo = await take('gh','repo');
await reply(oldRepo,JSON.stringify({nameWithOwner:'wrong/old'}));
assert.equal(view.repo,null); assert.equal(view.pullLoading,true);
// Same-folder agents/tabs share an in-flight repository request and its data.
const sharedContext=view.context,sharedRequest=view.pullRequest,beforeBranches=branchCalls.length;
pane.terminal='pc2/t2';terminal.address='pc2/t2';focus={...focus,terminal:'pc2/t2'};
render();
assert.equal(pending.length,0,'An agent switch starts no duplicate Git or GitHub request');
assert.equal(branchCalls.length,beforeBranches,'Same-folder selection does not reread the branch');
assert.equal(view.root,repo);assert.equal(view.context,sharedContext);assert.equal(view.pullRequest,sharedRequest);
assert.equal(view.pullLoading,true,'The shared GitHub request remains active');
await reply(newRepo,JSON.stringify({nameWithOwner:'example/xrbuild'}));
assert.equal(view.repo.name,'example/xrbuild','A shared in-flight reply is accepted after switching agents');
const list = await take('gh','api');
const sharedPulls=view.pulls,sharedPages=view.pages,sharedCounts=view.counts;
view.pages.open={cursor:'page-two',hasMore:true,expanded:true};
selectedTab.name='906';selectedTab.named=true;render();
assert.equal(location().pullNumber,906,'Tab-specific PR selection still follows focus');
assert.equal(view.pulls,sharedPulls);assert.equal(view.pages,sharedPages);assert.equal(view.counts,sharedCounts);
assert.equal(view.pages.open.cursor,'page-two','Switching selection preserves expanded PR pagination');
const secondTab={id:'pc2/tab2',active:true,named:true,name:'#907'};
selectedTab.active=false;space.tabs.push(secondTab);pane.tab=secondTab.id;focus={...focus,tab:secondTab.id};render();
assert.equal(location().pullNumber,907);assert.equal(view.pages,sharedPages);assert.equal(view.pullRequest,sharedRequest);
assert.equal(pending.length,0);assert.equal(branchCalls.length,beforeBranches);
space.tabs.pop();selectedTab.active=true;pane.tab=selectedTab.id;
selectedTab.named=false;pane.terminal='pc2/t1';terminal.address='pc2/t1';focus=correctFocus;render();
// Reject PR results even if the live location changes before the next render.
terminal.labels['custom.cwd'] = home;
await reply(list,JSON.stringify([{number:9,title:'stale'}]));
assert.equal(view.pulls.open,null); assert.equal(pending.length,0,'No stale count query starts');
render(); await reply(take('git'),'',128); assert.equal(view.repo,null);

// Delayed counts/errors/finalizers cannot leak across a context change either.
select(repo); await reply(take('git'),repo); seedRepo();
view.loadPulls('open',cx,true); await reply(take('gh','api'),JSON.stringify({data:{repository:{pullRequests:{nodes:[],totalCount:0,pageInfo:{hasNextPage:false,endCursor:null}}}}})); const counts = await take('gh','api');
select(home); await reply(take('git'),'',128);
await reply(counts,JSON.stringify({data:{repository:{open:{totalCount:99},closed:{totalCount:99}}}}));
assert.equal(view.counts,null); assert.equal(view.repo,null);
select(repo); await reply(take('git'),repo); seedRepo();
view.loadPulls('open',cx,true); const failure = await take('gh','api');
select(home); const homeGit = await take('git');
failure.reject(new Error('old machine offline')); await tick();
assert.equal(view.pullError,null); assert.equal(view.loading,true);
await reply(homeGit,'',128);
// A delayed branch reply cannot restore another terminal's highlight.
select(repo);
let releaseBranch;
heldBranch = new Promise(resolve => { releaseBranch = resolve; });
await reply(take('git'),repo);
select(home); await reply(take('git'),'',128);
releaseBranch({code:0,stdout:'fix/stale'}); await tick();
assert.equal(view.branch,null); assert.equal(view.root,null);

// Same-folder branch changes are picked up by the existing refresh poll.
select(repo); await reply(take('git'),repo);
branch = 'fix/next-agent'; view.refresh(cx); await reply(take('git'),repo);
assert.equal(view.branch,'fix/next-agent');
for(const failure of [{code:0,stdout:'wrong',timed_out:true},{code:128,stdout:'',stderr:'permission denied'},null]){
  heldBranch=Promise.resolve(failure);view.refresh(cx);await reply(take('git'),repo);
  assert.equal(view.branch,'fix/next-agent','An inconclusive branch refresh cannot unpin the loaded branch PR');
  assert.equal(view.error,'Could not read branch; refresh to retry');
}
branch = null; view.refresh(cx); await reply(take('git'),repo);
assert.equal(view.branch,null,'Detached HEAD does not select any PR');
assert.equal(view.root,repo,'No symbolic branch does not lose the repository');
// A1's session footer can report a PR while the shell remains on develop.
pane.app = 'a1';
screenReply = {code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'D:\\repo (fix/session) • #908\n↑67k 13.1%/500k (auto)'})};
const beforeAgentRead=branchCalls.length;render();await tick();
assert.equal(pending.length,0,'Selecting A1 only reads its session footer, not Git/GitHub');
assert.equal(branchCalls.length,beforeAgentRead);
assert.equal(view.agentPull,908);
assert.deepEqual(Array.from(screenCalls.at(-1)),['read','pc2/t1','--json','--lines','0'],'Read only the selected terminal current screen, on its own machine');

// Same-folder A1 switches update only the footer highlight; late old reads lose.
let releaseOldAgent;
screenReply=new Promise(resolve=>{releaseOldAgent=resolve;});
view.refresh(cx);await reply(take('git'),repo);
const agentRows=view.pulls,agentPages=view.pages,agentRepo=view.repo;
pane.terminal='pc2/t2';terminal.address='pc2/t2';focus={...focus,terminal:'pc2/t2'};
screenReply={code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'D:\\repo (fix/other) • #909\n13.1%/500k (auto)'})};
const previousPin=view.agentPull;
render();assert.equal(view.agentPull,previousPin,'Keep the pin steady until the new footer resolves');await tick();
assert.equal(view.agentPull,909);assert.equal(view.pulls,agentRows);assert.equal(view.pages,agentPages);assert.equal(view.repo,agentRepo);
assert.equal(pending.length,0,'Switching A1 sessions does not reload Git/GitHub');
releaseOldAgent({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'D:\\repo (fix/stale) • #906\n13.1%/500k (auto)'})});await tick();
assert.equal(view.agentPull,909,'A stale same-folder footer cannot replace the selected agent PR');
// Identical PRs do not unpin/re-pin while another agent footer is loading.
let releaseSamePr;
pane.terminal='pc2/t3';terminal.address='pc2/t3';focus={...focus,terminal:'pc2/t3'};
screenReply=new Promise(resolve=>{releaseSamePr=resolve;});render();
assert.equal(view.agentPull,909);
releaseSamePr({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'D:\\repo (fix/other) • #909\n13.1%/500k (auto)'})});await tick();
assert.equal(view.agentPull,909);assert.equal(view.pages,agentPages);assert.equal(pending.length,0);
pane.app='bash';render();assert.equal(view.agentPull,null,'Ordinary terminals have no inherited agent PR');
assert.equal(view.pulls,agentRows);assert.equal(view.pages,agentPages);assert.equal(pending.length,0,'Ordinary terminals retain the same Git list');
pane.app='a1';
screenReply={code:1,stdout:''};
pane.terminal='pc2/t1';terminal.address='pc2/t1';focus=correctFocus;render();await tick();

// A slow screen read must not relink a different terminal/location.
let releaseScreen;
screenReply = new Promise(resolve => { releaseScreen = resolve; });
view.refresh(cx); await reply(take('git'),repo);
select(home); await reply(take('git'),'',128);
releaseScreen({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'D:\\repo (fix/stale) • #906\n13.1%/500k (auto)'})});
await tick();
assert.equal(view.agentPull,null,'Late session replies cannot restore the old PR highlight');
// The Git header's context menu replaces the old PR-link tool.
function findId(node,id) {
  if (node?.attrs?.id?.[0] === id) return node;
  for (const child of node?.kids ?? []) { const found = findId(child,id); if (found) return found; }
}
let oldHeaderClick;
const headerMenus=[];
view.showPullMenu=(pr,_cx,header)=>headerMenus.push({url:pr.url,repo:pr.repo,header});
view.root = repo;
for (const url of ['https://github.com/example/xrbuild','https://github.com/example/xrbuild/']) {
  view.repo = {name:'example/xrbuild',url};
  for(const hovered of [false,true]) {
    view.headerHovered=hovered;
    const tree=render(),header=findId(tree,'changes-header');
    assert.equal(findId(tree,'git-actions').attrs.opacity[0],hovered?1:0,'Header controls still reveal together');
    assert.equal(findId(tree,'git-repo'),undefined,'The old PR-link icon has been removed');
    const repoLabel=findId(tree,'git-repo-name');assert.deepEqual(repoLabel.kids.filter(child=>typeof child==='string'),['xrbuild'],'Visible repository text is unchanged; hidden shared measurement nodes are not painted');assert.equal(repoLabel.attrs.tooltip[0],url,'The repository label tooltip is its full GitHub URL');
    assert.ok(repoLabel.attrs.overflow_hidden&&repoLabel.attrs.whitespace_nowrap);assert.equal(repoLabel.attrs.truncate,undefined,'Measured U+2026 presentation replaces native Geist truncation');assert.ok(repoLabel.attrs.max_w_full);assert.equal(findId(tree,'git-repo-slot').attrs.tooltip,undefined,'Only the intrinsic label owns the tooltip, not the tools rail');
    assert.ok(findId(tree,'git-pin'),'Pin replaces the old tool');
    assert.equal(header.attrs.on_mouse_down[0],'right');
    oldHeaderClick=header.attrs.on_mouse_down[1];
    let stopped=false;oldHeaderClick({}, {stop_propagation(){stopped=true;}});
    assert.equal(stopped,true);assert.deepEqual(headerMenus.at(-1),{url:'https://github.com/example/xrbuild/pulls',repo:'example/xrbuild',header:true});
  }
}
view.repo = {name:'example/xrbuild'};
const unlinkedTree = render();
assert.equal(findId(unlinkedTree,'git-repo'),undefined,'No GitHub URL means no PR link tool');
assert.equal(findId(unlinkedTree,'git-location'),undefined,'No fallback folder label or tooltip in the header');
assert.equal(findId(unlinkedTree,'git-repo-slot').kids.length,0,'The header spacer stays empty without GitHub metadata');assert.equal(findId(unlinkedTree,'git-repo-name'),undefined);
view.repo = null;
for (const loading of [true,false]) {
  view.loading = loading; view.pullLoading = loading;
  const fetching = render();
  assert.equal(findId(fetching,'git-location'),undefined,'No transient repository name while Git loads');
  assert.equal(findId(fetching,'git-repo-slot').kids.length,0);
}
view.loading = false; view.pullLoading = false;
view.root = null; view.repo = null;
const menusBefore=headerMenus.length;
const noRepo = render();
assert.equal(findId(noRepo,'git-repo'),undefined);
assert.equal(findId(noRepo,'git-refresh'),undefined,'Refresh hides outside Git repositories');
assert.ok(findId(noRepo,'git-close'),'Close remains available outside Git repositories');
oldHeaderClick({}, {stop_propagation(){}});
findId(noRepo,'changes-header').attrs.on_mouse_down[1]({}, {stop_propagation(){}});
assert.equal(headerMenus.length,menusBefore,'Neither non-repo nor stale header callbacks can expose the old URL');

// A verified robot destination can change worktrees without clearing the
// retained rows. Unrelated location changes above must still clear normally.
select(repo);await reply(take('git'),repo);seedRepo();
const originalShown=view.shown;view.shown=()=>true;
const one={number:1,state:'open'},two={number:2,state:'open'};
view.pulls.open=[one,two];view.pullsAt={open:Date.now(),closed:Date.now()};view.agentPull=1;view.view='open';
const previousRows=view.pulls.open,previousPages=view.pages,worktree='D:/worktrees/related-pr';
view.pinMotion.measureBody({width:300,height:400});
for(const number of [1,2])view.pinMotion.measureRow(number,{width:292,height:60});
view.pinMotion.bodyPointer({bounds:{x:0,y:100,width:300,height:400}});
assert.equal(view.pinMotion.start({context:view.context,state:'open',rows:previousRows,pinned:one},two,
  {bounds:{x:268,y:177,width:24,height:24}},
  {source:pane.terminal,target:'pc2/t2',folder:JSON.stringify([worktree,'pc2']),repo:'example/xrbuild'}),true);
pane.terminal='pc2/t2';terminal.address='pc2/t2';focus={...focus,terminal:'pc2/t2'};
terminal.labels['custom.cwd']=worktree;render();
assert.equal(view.pulls.open,previousRows,'Verified worktree navigation retains rows during Git root discovery');
assert.equal(view.pages,previousPages);assert.equal(view.repo.name,'example/xrbuild');
assert.equal(view.pinMotion.current.phase,'waiting');
screenReply={code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'D:\\worktree (feature) • #2\n13.1%/500k (auto)'})};
await reply(take('git'),worktree);render();
assert.equal(view.root,worktree);assert.equal(view.pulls.open,previousRows);
assert.equal(view.agentPull,2);assert.equal(view.pinMotion.current.phase,'start');
assert.equal(view.pullPresentation.pinned,one,'Resolved facts do not prematurely reparent the old pin');
view.pinMotion.cancel();render();view.shown=originalShown;

// Same-context root failures are uncertainty, not repository removal. Sample
// real row IDs before/during/after reads and preserve native geometry references.
const ids=node=>{const result=[];const walk=n=>{if(/^pr-\d+$/.test(n?.attrs?.id?.[0]??''))result.push(n.attrs.id[0]);for(const child of n?.kids??[])walk(child);};walk(node);return result;};
const kept={root:view.root,repo:view.repo,pulls:view.pulls,pages:view.pages,counts:view.counts,body:view.pinMotion.bodySize,rows:view.pinMotion.sizes};
const rowsBefore=ids(view.renderPulls(native.theme()));
for(const result of [
  Error('spawn failed'),{code:0,stdout:worktree,timed_out:true},
  {code:128,stderr:'fatal: not a git repository: .git',signal:'SIGTERM'},
  {code:3221225794,stderr:''},{code:-1073741502,stderr:''},
  {code:128,stderr:'fatal: cannot chdir: Permission denied'},
  {code:0,stdout:''},
]){
  view.refresh(cx);assert.deepEqual(ids(view.renderPulls(native.theme())),rowsBefore,'Pending root lookup keeps rows');
  const request=await take('git');
  if(result instanceof Error)request.reject(result);else request.resolve({stdout:'',stderr:'',...result});
  await tick();
  assert.equal(view.root,kept.root);assert.equal(view.repo,kept.repo);assert.equal(view.pulls,kept.pulls);assert.equal(view.pages,kept.pages);assert.equal(view.counts,kept.counts);
  assert.equal(view.pinMotion.bodySize,kept.body);assert.equal(view.pinMotion.sizes,kept.rows);assert.equal(view.loading,false);
  assert.deepEqual(ids(view.renderPulls(native.theme())),rowsBefore,'A failed root read cannot emit an empty frame');
  assert.equal(findId(view.renderPulls(native.theme()),'git-read-error').kids[0],'Could not read repository; refresh to retry');
}
view.refresh(cx);await reply(take('git'),worktree);
assert.equal(view.error,null);assert.deepEqual(ids(view.renderPulls(native.theme())),rowsBefore);assert.equal(view.pages,kept.pages);
// Only a normal, explicit Git non-repository refusal is affirmative absence.
view.refresh(cx);await reply(take('git'),'',128);
assert.equal(view.root,null);assert.equal(view.repo,null);assert.equal(view.pulls.open,null);assert.equal(view.error,'Not a git repository');
await Promise.all(tasks);
assert.equal(pending.length,0);
console.log('PASS: Git live shell cwd, selected tab/machine, non-repo clearing, pending git/GitHub replies and A-B-A race protection');
