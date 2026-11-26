import assert from 'node:assert/strict';
import {scrollModule,Background} from './support/git-scroll-modules.mjs';
import {withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const folder = path.join(root,'src/plugins/git/mod');
function element(asset) {
  const node = {asset,attrs:{},kids:[]}; let proxy;
  proxy = new Proxy(node,{get(target,key) {
    if (key in target) return target[key];
    if (key === 'when') return (yes,fn) => yes ? fn(proxy) : proxy;
    if (key === 'child') return child => {node.kids.push(child);return proxy;};
    if (key === 'children') return children => {node.kids.push(...children);return proxy;};
    return (...args) => {node.attrs[key]=args;return proxy;};
  }});
  return proxy;
}
function find(node,id) {
  if (node?.attrs?.id?.[0] === id) return node;
  return node?.kids?.map(child=>find(child,id)).find(Boolean);
}
function descendants(node) {return [node,...(node?.kids??[]).flatMap(descendants)];}
function pathTo(node,target) {
  if(node===target)return [node];
  for(const child of node?.kids??[]) {const rest=pathTo(child,target);if(rest)return [node,...rest];}
  return null;
}
let allAgents=[], allPanes=[], allSpaces=[], allTerminals=[], shown=true, connected=true,taskContext=null,currentZoom=1;
const calls=[], actions=[], tasks=[], remotes=new Map(), screens=new Map(),configs=new Map();
const place={cwd:'/repo',on:null,terminal:'shell',tab:'shell-tab'};
let heldRemote=null;
const host={
  agents:()=>allAgents,panes:()=>allPanes,spaces:()=>allSpaces,terminals:()=>allTerminals,machines:()=>[{name:'pc2',layout:connected?'ready':'disconnected'}],
  focused:()=>null,home:()=>'/home/test',shared:()=>null,setShared(){},
  settings:()=>({zoom:currentZoom}),theme:()=>colors,window:()=>({platform:'linux'}),openOverlay(){},
  props:()=>null,closeOverlay(){},notify(){},nextCommand(){},
  layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),
  run:(...args)=>actions.push(args),
  exec:async(cmd,args,options)=>{
    calls.push({cmd,args,options});
    if(cmd==='git') {
      if(args[0]==='rev-parse')return {code:0,stdout:options.cwd};
      if(args[0]==='symbolic-ref')return {code:0,stdout:allPanes.find(p=>p.cwd===options.cwd)?.branch??'main'};
      const key=JSON.stringify([options.on,options.cwd]),config=configs.get(key);
      // Apply the real --get-regexp filter so omitting gh-resolved really does
      // hide a marker-only change, rather than letting the mock mask the bug.
      return {code:0,stdout:config==null?remotes.get(key)??'':config.split('\n').filter(line=>new RegExp(args.at(-1)).test(line.split(' ')[0])).join('\n')};
    }
    assert.equal(cmd,'gh'); assert.deepEqual(Array.from(args),['repo','view','--json','nameWithOwner,owner,url']);
    if (heldRemote) {const result=heldRemote;heldRemote=null;return result;}
    return {code:0,stdout:remotes.get(JSON.stringify([options.on,options.cwd]))??''};
  },
  hc:async args=>{calls.push({cmd:'hc',args});return screens.get(args[1])??{code:1};},
};
const colors={foreground:'white',ansi1:'red',ansi2:'green',ansi3:'yellow',ansi5:'purple',dim:'dim',hover:'usual-hover'};
const context=vm.createContext({localStorage:{getItem:()=>null,setItem(){}}});
const cache=new Map();
const modules={
  './enrollment-picker.js':{EnrollmentPicker:class{}},
  './ci-fix.js':{CIFix:class {sync(){}stop(){}}},
  './notices.js':{GitNotices:class {sync(){return null;}stop(){}retryNow(){}}},
  './webhooks.js':{GitWebhooks:class {sync(){} stop(){}}},
  './plugins.js':{pluginPullContext:()=>taskContext,pluginEvent(){},sidebarPanelEnabled:()=>true},'./sidebar-title.js':{sidebarTitle:element},
  './panel-pin.js':{panelPin:(_t,{id})=>element().id(id)},'./panel-state.js':{changePanel(){}},
  './host.js':host,'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{},Background},
  'gpui-base':{h_flex:element,v_flex:element},
  './ui.js':{U:{icon:16,insetControl:24,insetRadius:4},panelTitle:element,headerTools:x=>x,reveal:x=>x,subtleActionFill:()=> 'usual-inset-hover',refreshButton:element,emptyState:element,menuSurface:(_t,el)=>el,menuHeading:(_t,text)=>element().child(text),slot:el=>el},
};
function moduleFor(file) {
  if (!cache.has(file)) cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));
  return cache.get(file);
}
withKitUi(modules['./ui.js'],element);
const main=moduleFor(path.join(folder,'main.js'));
await main.link((specifier,ref)=>{
  const dependency=scrollModule(context,specifier);if(dependency)return dependency;
  if (specifier === './panel-kit.js') return moduleFor(path.join(root,'src/ui/panel-kit.js'));
  if (specifier === './settings-dialog.js') return moduleFor(path.join(root,'src/ui/settings-dialog.js'));
  if (modules[specifier]) return new vm.SyntheticModule(Object.keys(modules[specifier]),function(){
    for(const [key,value] of Object.entries(modules[specifier])) this.setExport(key,value);
  },{context});
  if (specifier === './location.js') return new vm.SyntheticModule(['location','namedPullNumber'],function(){
    this.setExport('location',()=>place);
    this.setExport('namedPullNumber',tab=>tab?.named ? Number(/^#(\d+)$/.exec(tab.name)?.[1])||null : null);
  },{context});
  if(specifier==='./plugins/git/ci-footer.js')return moduleFor(path.join(root,'src/plugins/git/ci-footer.js'));
  if(specifier==='./integration/agent-context/context.js')return moduleFor(path.join(root,'src/integration/agent-context/context.js'));
  const shared=specifier === './directory.js' || specifier === './terminal-labels.js';
  return moduleFor(shared ? path.join(root,specifier === './directory.js'?'src/ui/directory.js':'src/integration/herdr/terminal-labels.js') : path.resolve(path.dirname(ref.identifier),specifier));
});
await main.evaluate();
const {AgentLinks,repositoryName}=cache.get(path.join(folder,'agent-links.js')).namespace;
const cx={notify(){},stop_propagation(){},spawn:fn=>tasks.push(fn(cx))};
const tick=async()=>{for(let i=0;i<24;i++)await Promise.resolve();};
const footer=number=>({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:`/repo (feature) • #${number}\n13.1%/500k (auto)`})});
function add(address,{repo='owner/repo',cwd='/repo',branch='feature',app='a1',name='1',named=false}={}) {
  const on=address.includes('/')?address.split('/')[0]:null,space=`${on??'local'}-space`,tab=`${address}-tab`;
  allAgents.push({address,space,tab,app});
  allPanes.push({terminal:address,pane:`${address}-pane`,tab,cwd,branch});
  let group=allSpaces.find(s=>s.id===space);
  if (!group) {group={id:space,machine:on,tabs:[]};allSpaces.push(group);}
  group.tabs.push({id:tab,name,named});
  allTerminals.push({address,cwd});
  // gh canonicalizes the user's SSH host alias (git@github-timurproko:...)
  // just as it does for the panel, rather than requiring a literal github.com.
  remotes.set(JSON.stringify([on,cwd]),JSON.stringify({nameWithOwner:repo,url:`https://github.com/${repo}`}));
}
assert.equal(repositoryName(JSON.stringify({nameWithOwner:'Owner/Repo'})),'owner/repo');
for (const value of ['not JSON','{}','null','{"nameWithOwner":"owner/repo/extra"}','{"nameWithOwner":""}']) assert.equal(repositoryName(value),null);
add('pc2/t1');add('pc2/t2');add('t3',{cwd:'/other',repo:'other/repo'});
screens.set('pc2/t1',footer(922));screens.set('pc2/t2',footer(923));screens.set('t3',footer(922));
const links=new AgentLinks();links.refresh(cx);links.refresh(cx);await tick();
assert.equal(calls.filter(c=>c.cmd==='gh').length,2,'One canonical repository request per machine/folder and single-flight');
assert.equal(calls.filter(c=>c.cmd==='hc').length,3);
assert.deepEqual(Array.from(calls.find(c=>c.cmd==='hc').args),['read','pc2/t1','--json','--lines','0']);
const pr={number:922,headRefName:'feature',state:'open',url:'https://github.com/owner/repo/pull/922'};
assert.equal(links.related(pr,'owner/repo').address,'pc2/t1','A background remote agent links without selecting its tab');
assert.equal(links.related(pr,'other/repo').address,'t3','The same number in another repository is separate');
assert.equal(links.related({...pr,number:924},'owner/repo'),null,'An explicit footer blocks stale branch matching');
const before=calls.length;links.refresh(cx);await tick();assert.equal(calls.length,before,'Unchanged live data respects TTL');
add('t4',{app:'claude-code',cwd:'/branch',branch:'branch-pr'});
links.refresh(cx);await tick();
assert.equal(links.related({...pr,headRefName:'branch-pr',number:925},'OWNER/REPO').address,'t4');
assert.equal(calls.filter(c=>c.cmd==='hc').length,4,'Claude reads its footer too; a missing footer retains branch fallback');
add('t5',{app:'claude-code',cwd:'/named',branch:'branch-pr',name:'#926',named:true});
links.refresh(cx);await tick();
assert.equal(links.related({...pr,number:926},'owner/repo').address,'t5');
assert.equal(links.related({...pr,number:925,headRefName:'branch-pr'},'owner/repo').address,'t4','Explicit tab overrides its unrelated branch');
add('pc2/t6');screens.set('pc2/t6',footer(922));links.refresh(cx);await tick();
assert.equal(links.related(pr,'owner/repo','pc2/t6').address,'pc2/t6','Selected exact match wins ties');
assert.equal(links.related(pr,'owner/repo').address,'pc2/t1','Otherwise stable model order');
// Recheck after TTL without a parallel retry burst.
for(const entry of links.entries.values())entry.at=0;
const beforeTTL=calls.filter(c=>c.cmd==='gh').length;
screens.set('pc2/t1',footer(930));links.refresh(cx);links.refresh(cx);await tick();
assert.equal(calls.filter(c=>c.cmd==='gh').length,beforeTTL,'Unchanged folder fingerprints need no GitHub reread at the footer TTL');
assert.equal(links.related({...pr,number:930},'owner/repo').address,'pc2/t1');

// Message actions revalidate the same robot mapping instead of trusting its TTL cache.
const actionPr={...pr,number:930},actionTarget=links.related(actionPr,'owner/repo');
assert.equal(await links.confirm(actionTarget,actionPr,'owner/repo'),true);
screens.set('pc2/t1',footer(931));assert.equal(await links.confirm(actionTarget,actionPr,'owner/repo'),false,'Changed footer invalidates an action immediately');screens.set('pc2/t1',footer(930));
assert.equal(await links.confirm(actionTarget,actionPr,'other/repo'),false,'Fresh canonical repo must match');
const beforeCancelled=calls.length;assert.equal(await links.confirm(actionTarget,actionPr,'owner/repo',()=>false),false);assert.equal(calls.length,beforeCancelled);
const view=new main.namespace.default();view.resetRepository();view.agentLinks=links;
// The real panel is measured while Git is still loading. Resolving the root
// resets repository data, but the body keeps its native ID and dimensions:
// GPUI will NOT send another size callback. The original fixture missed this.
view.view='open';
find(view.renderPulls(colors),'pulls-body').attrs.on_size_change[0]({width:300,height:400},cx);
const measuredController=view.pinMotion,measuredBody=view.pinMotion.bodySize;
view.pinMotion.current={phase:'waiting'};
view.resetRepository();
assert.equal(view.pinMotion,measuredController,'Repository resets keep geometry owned by persistent native element IDs');
assert.equal(view.pinMotion.bodySize,measuredBody,'Root resolution must not discard an unchanged body size');
assert.equal(view.pinMotion.current,null,'Repository reset still cancels pending motion');
view.repo={name:'owner/repo'};view.root='/repo';view.context=JSON.stringify([place.cwd,place.on]);
view.view='open';view.pulls={open:[],closed:[]};view.pullsAt={open:Date.now(),closed:Date.now()};
place.terminal='pc2/t6';
for(const [state,color] of [['open','green'],['draft','dim'],['closed','red'],['merged','purple']]) {
  const row=view.pullRow(colors,{...pr,state}),button=find(row,'pr-agent-922');
  assert.ok(button);assert.equal(button.attrs.size[0],24);assert.equal(button.attrs.rounded[0],4);
  assert.equal(button.attrs.text_color[0],'white');assert.equal(button.kids[0].asset,'icons/agent.svg');
  assert.equal(button.kids[0].attrs.text_color[0],'white');
  const original=descendants(row).find(n=>n?.asset?.startsWith('mods/custom-changes/git-'));
  assert.ok(original,'Original PR icon stays beside the separate robot');assert.equal(original.attrs.text_color[0],color);
  assert.ok([...pathTo(row,button),...descendants(button)].every(n=>n?.attrs?.tooltip===undefined),'No tooltip on the robot, its glyph or any ancestor; metadata tooltips stay in sibling rows');
  const hover=element();button.attrs.hover[0](hover);
  assert.equal(hover.attrs.bg[0],'usual-inset-hover');
  assert.notEqual(hover.attrs.bg[0],colors.hover,'Inset icon highlight stays distinct from the parent row hover');
  assert.equal(hover.attrs.text_color,undefined,'Hover preserves white robot color');
  let stopped=0;const eventCx={stop_propagation(){stopped++;}};
  button.attrs.on_mouse_down[1]({},eventCx);button.attrs.on_click[0]({},eventCx);
  assert.equal(stopped,2);assert.equal(actions.at(-1)[0],'agent.focus');assert.equal(actions.at(-1)[1].terminal,'pc2/t6');
}
// Full click -> pinned/list exchange, with real controller and deferred layout.
place.terminal='pc2/t2';place.app='a1';
view.agentPull=923;view.pulls.open=[pr,{...pr,number:923}];
const laidOut=view.renderPulls(colors),bodyBounds={x:0,y:100,width:300,height:400};
// No repeated body size event here: this click must work after the root reset.
for(const number of [922,923])find(laidOut,`pr-${number}`).attrs.on_size_change[0]({width:292,height:60});
const position={x:280,y:183};
find(laidOut,'pr-922').attrs.on_mouse_move[0]({position,bounds:{x:4,y:173,width:292,height:60}});
find(laidOut,'pulls-body').attrs.on_mouse_move[0]({position,bounds:bodyBounds});
const swapTimers=[],swapCx={notify(){},stop_propagation(){},timer:{after:(ms,fn)=>{const timer={ms,fn,cancel(){this.cancelled=true;}};swapTimers.push(timer);return timer;}}};
const beforeSwapNavigation=actions.length;
const click=find(laidOut,'pr-agent-922');click.attrs.on_mouse_down[1]({position,bounds:{x:268,y:177,width:24,height:24}},swapCx);click.attrs.on_click[0]({},swapCx);
assert.equal(actions.length,beforeSwapNavigation+1,'Agent navigation is immediate, never delayed for animation');
assert.equal(view.agentPull,923,'Clicking must not optimistically change the selected PR');
const swap=view.pinMotion.current;assert.ok(swap);assert.equal(swap.phase,'waiting');
assert.ok(find(find(view.renderPulls(colors),'active-pull'),'pr-923'));
let releaseFooter;screens.set('pc2/t6',new Promise(resolve=>{releaseFooter=resolve;}));
place.terminal='pc2/t6';view.syncAgent(cx);await tick();
let waiting=view.renderPulls(colors);
assert.ok(find(find(waiting,'active-pull'),'pr-923'),'Old pin retains its original slot while the new tab footer is pending');
assert.equal(find(waiting,`pin-swap-${swap.id}`),undefined,'No motion before the destination resolves');
view.pulls.open=view.pulls.open.map(row=>({...row,title:`Refreshed PR ${row.number}`}));
waiting=view.renderPulls(colors);
assert.equal(view.pullPresentation.rows[0],pr,'A repository refresh cannot replace the retained presentation during navigation');
releaseFooter(footer(922));await tick();assert.equal(view.agentPull,922);
let swapping=view.renderPulls(colors),overlay=find(swapping,`pin-swap-${swap.id}`);
assert.ok(find(find(swapping,'active-pull'),'pr-923'),'Even after resolution, actual rows retain their old parents until motion settles');
assert.equal(find(swapping,'pr-922').attrs.invisible.length,0);assert.equal(find(swapping,'pr-923').attrs.invisible.length,0);
const ghost=find(overlay,'swap-pr-922');assert.equal(ghost.attrs.on_click,undefined,'Traveling cards cannot open GitHub');
assert.equal(find(ghost,'swap-pr-agent-922').attrs.on_click,undefined,'Traveling robots cannot navigate');
assert.equal(find(overlay,`pin-swap-${swap.id}-922`).attrs.top[0],73);
assert.equal(find(overlay,`pin-swap-${swap.id}-923`).attrs.top[0],4);
overlay.attrs.on_size_change[0]({},swapCx);assert.equal(swapTimers.length,2);
assert.equal(swapTimers[0].cancelled,true,'Footer resolution cancels the waiting timeout');
swapTimers[1].fn(swapCx);swapping=view.renderPulls(colors);overlay=find(swapping,`pin-swap-${swap.id}`);
assert.equal(find(overlay,`pin-swap-${swap.id}-922`).attrs.top[0],4);
assert.equal(find(overlay,`pin-swap-${swap.id}-923`).attrs.top[0],73);
const ids=descendants(swapping).flatMap(n=>n?.attrs?.id??[]);assert.equal(new Set(ids).size,ids.length,'Ghosts and real rows have distinct native identities');
swapTimers[2].fn(swapCx);assert.equal(view.pinMotion.current,null);
assert.equal(actions.length,beforeSwapNavigation+1,'Settling never navigates a second time');
assert.ok(find(find(view.renderPulls(colors),'active-pull'),'pr-922'),'Final layout commits the resolved PR after motion');
assert.equal(find(view.renderPulls(colors),'pr-title-922').kids[0],'Refreshed PR 922','Commit uses the latest refreshed facts, not stale snapshot data');
assert.equal(actions.at(-1)[1].terminal,'pc2/t6');
assert.equal(find(view.renderPulls(colors),'pr-922').attrs.invisible,undefined,'Real rows become interactive again after settling');
const row=view.pullRow(colors,pr),button=find(row,'pr-agent-922');
let opened=null;view.openPull=p=>{opened=p;};row.attrs.on_click[0]();assert.equal(opened,pr,'The rest of the row keeps opening GitHub');
assert.equal(find(view.pullRow(colors,{...pr,number:999,headRefName:'unknown'}),'pr-agent-999'),undefined);
const count=actions.length;
allAgents=allAgents.filter(a=>a.address!=='pc2/t6');button.attrs.on_click[0]({},{stop_propagation(){}});
assert.equal(actions.length,count,'A stale click never substitutes a different related agent');
assert.equal(links.related(pr,'owner/repo'),null,'Removed agents lose links immediately');
allPanes.find(p=>p.terminal==='pc2/t1').cwd='/moved';
assert.equal(links.related({...pr,number:930},'owner/repo'),null,'Moved agents lose cached links before a new read');
// A late response cannot restore a closed/moved terminal's relationship.
add('late',{cwd:'/late'});let release;heldRemote=new Promise(resolve=>{release=resolve;});
links.refresh(cx);allAgents=allAgents.filter(a=>a.address!=='late');
release({code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo'})});await tick();
assert.equal(links.entries.has('late'),false);
// Claude's live footer overrides both its PR-named tab and parent-shell branch.
add('pc2/claude',{app:'claude-code',branch:'develop',name:'#926',named:true});
const claudeFooter=number=>({code:0,stdout:JSON.stringify({how:'screen',complete:true,
  text:`  Fable 5.2 · 166.0k/200.0k 83% · $4.6684\n  ⏵⏵ auto mode on (shift+tab to cycle) · PR #${number}`})});
screens.set('pc2/claude',claudeFooter(933));links.refresh(cx);await tick();
const claudePr={...pr,number:933,headRefName:'fix/contain-overwide-rows'};
assert.equal(links.related(claudePr,'owner/repo').address,'pc2/claude','Background remote Claude links through its footer');
assert.equal(links.related({...pr,number:926},'owner/repo')?.address,'t5','Claude footer supersedes its named tab');
assert.equal(links.related({...pr,number:999,headRefName:'develop'},'owner/repo'),null,'Claude cannot also link through its stale shell branch');
assert.equal(links.related(claudePr,'other/repo'),null,'Claude links stay repository-scoped');
place.terminal='pc2/claude';place.app='claude-code';view.pulls.open=[claudePr];
view.syncAgent(cx);await tick();
assert.equal(view.agentPull,933,'Selected Claude resolves its own PR');
let claudeRow=find(view.renderPulls(colors),'active-pull');
assert.ok(find(claudeRow,'pr-933'),'Claude PR is pinned/highlighted');
assert.ok(find(claudeRow,'pr-agent-933'),'Claude PR has the same robot control');
// Same-terminal refresh picks up changed footers; late reads cannot follow focus.
screens.set('pc2/claude',claudeFooter(934));view.syncAgent(cx,true);await tick();assert.equal(view.agentPull,934);
let releaseClaude;screens.set('pc2/claude',new Promise(resolve=>{releaseClaude=resolve;}));
view.syncAgent(cx,true);place.terminal='shell';place.app=null;view.syncAgent(cx);
releaseClaude(claudeFooter(935));await tick();assert.equal(view.agentPull,null,'Late Claude footer cannot pin the next selection');
const beforeUnsupported=calls.filter(c=>c.cmd==='hc').length;
add('codex',{app:'codex',cwd:'/codex'});links.refresh(cx);await tick();
assert.equal(calls.filter(c=>c.cmd==='hc').length,beforeUnsupported,'Unsupported agents do not read terminal output');
const codexTarget=links.related(pr,'owner/repo','codex');assert.equal(codexTarget.address,'codex');
assert.equal(await links.confirm(codexTarget,pr,'owner/repo'),true,'Other agents use their verified repo and tab/branch mapping');
assert.equal(calls.filter(c=>c.cmd==='hc').length,beforeUnsupported,'Generic confirmation never guesses an unsupported footer format');
add('default-route',{app:'codex',cwd:'/default-route'});
const routingKey=JSON.stringify([null,'/default-route']);
const remoteURLs='remote.origin.url git@github-alias:fork/repo.git\nremote.upstream.url git@github-alias:owner/repo.git\n';
configs.set(routingKey,remoteURLs+'remote.upstream.gh-resolved base');
links.refresh(cx);await tick();assert.equal(links.entries.get('default-route').repo,'owner/repo');
const routedReads=()=>calls.filter(call=>call.cmd==='gh' && call.options.cwd==='/default-route').length;
const beforeRouting=routedReads();
configs.set(routingKey,remoteURLs+'remote.origin.gh-resolved base');
remotes.set(routingKey,JSON.stringify({nameWithOwner:'fork/repo'}));
links.entries.get('default-route').at=0;links.refresh(cx);await tick();
assert.equal(routedReads(),beforeRouting+1,'Changing only gh-resolved rechecks the effective canonical repository at the footer TTL');
assert.equal(links.entries.get('default-route').repo,'fork/repo');
assert.equal(links.related(pr,'owner/repo','default-route')?.address==='default-route',false,'The old default repository immediately loses this robot');
assert.equal(links.related(pr,'fork/repo','default-route').address,'default-route');
links.entries.get('default-route').at=0;links.refresh(cx);await tick();assert.equal(routedReads(),beforeRouting+1,'Unchanged effective routing still avoids repeated GitHub lookups');
const named=allAgents.find(agent=>agent.address==='codex'),nameCalls=calls.length;named.title='Build worker';
assert.equal(links.related(pr,'owner/repo','codex').displayName,'Build worker');
assert.equal(links.related(pr,'owner/repo','codex').key,codexTarget.key,'Display name is not action identity');
assert.equal(links.displayName('codex'),'Build worker');assert.equal(calls.length,nameCalls,'Naming a tooltip adds no transport read');
// Managed stages select terminal roles without borrowing a reviewer's base branch.
const stagePr={...pr,number:1200,headRefName:'stage-head',repo:'owner/repo',key:'owner/repo#1200'};
function roleAgent(address,kind,prURL=stagePr.url.replace('922','1200'),extra={}) {
  add(address,{app:'codex',cwd:`/${address.replace('/','-')}`,branch:kind==='review'?'main':'stage-head'});
  const terminal=allTerminals.at(-1);terminal.state='live';terminal.labels={'crew.kind':kind,...(prURL===null?{}:{'crew.pr':prURL}),...extra};return terminal;
}
const ship=roleAgent('builder','ship',null),fix=roleAgent('fixer','fix'),reviewer=roleAgent('pc2/reviewer','review',undefined,{'crew.round':'1','crew.finding':'first defect\nsecond line','crew.approved':'a'.repeat(40)});
links.refresh(cx);await tick();
assert.equal(links.related(stagePr,'owner/repo',null,'build').address,'fixer','Explicit fix PR beats worker branch');
assert.equal(links.related(stagePr,'owner/repo','builder','build').address,'fixer');
fix.labels['crew.pr']='https://github.com/other/repo/pull/1200';
assert.equal(links.related(stagePr,'owner/repo',null,'build').address,'builder');
assert.equal(links.related(stagePr,'owner/repo',null,'review').address,'pc2/reviewer','Base-branch reviewer uses crew.pr only');
const roleTarget=links.related(stagePr,'owner/repo',null,'review');
assert.equal(roleTarget.availability,'live');assert.equal(roleTarget.crew.round,1);assert.equal(roleTarget.crew.finding,'first defect second line');assert.equal(roleTarget.crew.approved,'a'.repeat(40));
assert.equal(links.related(stagePr,'other/repo',null,'review'),null);
reviewer.labels['crew.pr']='https://github.com/owner/repo/pull/1201';assert.equal(links.related(stagePr,'owner/repo',null,'review'),null);
delete reviewer.labels['crew.pr'];allPanes.find(p=>p.terminal==='pc2/reviewer').branch='stage-head';
assert.equal(links.related(stagePr,'owner/repo',null,'review'),null,'Reviewer branch never substitutes for missing crew.pr');
reviewer.labels['crew.pr']='https://github.com/owner/repo/pull/1200';
for(const value of ['0','-1','1.5','bad','9007199254740991']){reviewer.labels['crew.round']=value;assert.equal(links.related(stagePr,'owner/repo',null,'review').crew.round,null);}
reviewer.labels['crew.round']='1';
reviewer.state='finished';assert.equal(links.related(stagePr,'owner/repo',null,'review').availability,'ended');
connected=false;assert.equal(links.related(stagePr,'owner/repo',null,'review').availability,'disconnected');
const offline=calls.length;links.refresh(cx);await tick();assert.equal(calls.length,offline,'Disconnect starts no remote reads');
connected=true;reviewer.state='live';assert.equal(links.related(stagePr,'owner/repo',null,'review').availability,'live');
assert.notEqual(links.related(stagePr,'owner/repo',null,'review').key,roleTarget.key,'Moved branch invalidates captured identity');
const {AggregatePulls}=cache.get(path.join(folder,'aggregate.js')).namespace;
const aggregate=new AggregatePulls({shown:()=>shown});
taskContext={scope:'role-home',tasks:[{id:'ship',terminal:'builder'},{id:'review',terminal:'pc2/reviewer'}],links:[{url:stagePr.url.replace('922','1200'),terminal:'builder',task:'ship'}]};
aggregate.context=taskContext;aggregate.entries.set(stagePr.key,{pr:stagePr,link:{targets:[{terminal:'builder'}]}});
let scoped=aggregate.stageTarget(stagePr,'review',links);assert.equal(scoped.terminal,'pc2/reviewer','Verified no-PR review task is eligible without adding a PR');
const beforeScoped=actions.length;aggregate.focus(stagePr,scoped,taskContext.scope,links);assert.equal(actions.at(-1)[1].terminal,'pc2/reviewer');assert.equal(actions.length,beforeScoped+1);
taskContext.tasks.pop();aggregate.focus(stagePr,scoped,taskContext.scope,links);assert.equal(actions.length,beforeScoped+1,'Lost home membership refuses captured stage focus');assert.equal(aggregate.stageTarget(stagePr,'review',links),null);
taskContext.tasks.push({id:'review',terminal:'pc2/reviewer'});taskContext={...taskContext,stale:true};aggregate.focus(stagePr,scoped,'role-home',links);assert.equal(actions.length,beforeScoped+1,'Stale coordinator has no role-focus authority');
taskContext=null;
const noContextFocus=actions.length;aggregate.focus(stagePr,{terminal:'pc2/reviewer',task:'review'},undefined);
assert.equal(actions.length,noContextFocus,'An absent aggregate context cannot authorize a fallback robot focus');
// Actual managed chips, their isolated clicks, and existing row/ghost actions.
ship.labels['crew.pr']='https://github.com/owner/repo/pull/1200';
const ordinaryStage={...stagePr,key:undefined};
view.repo={name:'owner/repo'};view.context=JSON.stringify([place.cwd,place.on]);
let chipOpened=null;view.openPull=row=>chipOpened=row;
function chipRow(stage,extra={}) {const row={...ordinaryStage,stage,...extra};view.pulls.open=[row];return view.pullRow(colors,row);}
for(const [stage,caption,color,address]of [['build','Build','yellow','builder'],['review','Review','purple','pc2/reviewer']]) {
  const row=chipRow(stage),chip=find(row,'pr-stage-1200');assert.ok(chip);
  assert.equal(chip.kids[0],caption);assert.equal(chip.attrs.text_color[0],color);assert.equal(chip.attrs.opacity,undefined);assert.equal(chip.attrs.role[0],'button');
  assert.equal(chip.attrs.tooltip,undefined,'Missing metadata and unknown names add no repeat-only tooltip');
  const before=actions.length;let stopped=0;const eventCx={stop_propagation(){stopped++;}};
  chip.attrs.on_mouse_down[1]({},eventCx);chip.attrs.on_click[0]({},eventCx);
  assert.equal(stopped,2);assert.equal(actions.length,before+1);assert.equal(actions.at(-1)[1].terminal,address);assert.equal(chipOpened,null);
  const ghost=view.pullRow(colors,{...ordinaryStage,stage},true),preview=find(ghost,'swap-pr-stage-1200');assert.ok(preview);assert.equal(preview.attrs.on_click,undefined);assert.equal(preview.attrs.role,undefined);
}
ship.labels['crew.round']='1';ship.labels['crew.finding']='fix the guard';ship.labels['crew.approved']='b'.repeat(40);
let stageChip=find(chipRow('build'),'pr-stage-1200');assert.equal(stageChip.kids[0],'Build 2');assert.equal(stageChip.attrs.tooltip[0],'back from review 1: fix the guard');
ship.labels['crew.round']='2';assert.equal(find(chipRow('build'),'pr-stage-1200').kids[0],'Build 3');
delete ship.labels['crew.round'];stageChip=find(chipRow('build'),'pr-stage-1200');assert.equal(stageChip.kids[0],'Build');assert.equal(stageChip.attrs.tooltip,undefined);
for(const state of ['pending','success','failure']) {
  const row=chipRow('approved',{checks:{state,label:'1/2'}}),chip=find(row,'pr-stage-1200');
  assert.equal(chip.kids[0],'Approved');assert.equal(chip.attrs.text_color[0],'green');assert.equal(chip.attrs.on_click,undefined);assert.equal(chip.attrs.role,undefined);assert.equal(chip.attrs.opacity,undefined);
  const before=actions.length;row.attrs.on_click[0]();assert.equal(chipOpened.stage,'approved');assert.equal(actions.length,before,'Approved bubbles to the PR row, never an agent');
  assert.ok(!descendants(row).some(n=>typeof n==='string'&&/CI running|Review.*CI/.test(n)));
}
chipOpened=null;
for(const [stage,terminal,reason]of [['build',ship,'build agent ended - CI failure'],['review',reviewer,'reviewer ended without a verdict']]) {
  terminal.state='finished';const chip=find(chipRow(stage,{checks:{state:'failure',label:'0/1'}}),'pr-stage-1200');
  assert.equal(chip.attrs.opacity[0],0.45);assert.equal(chip.attrs.tooltip[0],reason);assert.equal(chip.attrs.role,undefined);assert.equal(chip.attrs.cursor_pointer,undefined);
  const before=actions.length;chip.attrs.on_click[0]({},cx);assert.equal(actions.length,before);assert.equal(chipOpened,null);terminal.state='live';
}
connected=false;stageChip=find(chipRow('review'),'pr-stage-1200');assert.equal(stageChip.attrs.tooltip[0],'on pc2, not connected');assert.equal(stageChip.attrs.opacity[0],0.45);connected=true;
const capturedChip=find(chipRow('review'),'pr-stage-1200'),beforeStale=actions.length;
reviewer.labels['crew.kind']='ship';capturedChip.attrs.on_click[0]({},cx);assert.equal(actions.length,beforeStale,'Changed role refuses stale chip click');reviewer.labels['crew.kind']='review';
const missing=find(chipRow('review',{number:1209}),'pr-stage-1209');assert.equal(missing.attrs.tooltip[0],'reviewer unavailable');assert.equal(missing.attrs.opacity[0],0.45);
// The coordinator renderer uses the same chip through its guarded aggregate.
taskContext={scope:'role-home',tasks:[{id:'ship',terminal:'builder'},{id:'review',terminal:'pc2/reviewer'}],links:[{url:'https://github.com/owner/repo/pull/1200',terminal:'builder',task:'ship'}]};
aggregate.context=taskContext;view.aggregate=aggregate;aggregate.entries.get(stagePr.key).pr={...stagePr,stage:'review'};
const aggregateChip=find(view.pullRow(colors,{...stagePr,stage:'review'}),'pr-stage-owner/repo#1200');assert.equal(aggregateChip.kids[0],'Review');
aggregateChip.attrs.on_click[0]({},cx);assert.equal(actions.at(-1)[1].terminal,'pc2/reviewer');
aggregate.entries.get(stagePr.key).link.targets=[{terminal:null,historical:true}];
assert.equal(aggregate.stageTarget(stagePr,'review',links),null,'Historical-only row gains no focus from a reviewer label');
aggregate.entries.get(stagePr.key).link.targets=[{terminal:'builder'}];
taskContext={...taskContext,stale:true};const staleChip=find(view.pullRow(colors,{...stagePr,stage:'review'}),'pr-stage-owner/repo#1200');assert.equal(staleChip.attrs.opacity[0],0.45);
const beforeStaleHome=actions.length;aggregateChip.attrs.on_click[0]({},cx);assert.equal(actions.length,beforeStaleHome);
taskContext=null;
// Scope retirement while the repository read is held must not start a footer read.
add('scoped-read',{cwd:'/scoped-read'});let releaseScoped,admitted=true;
heldRemote=new Promise(resolve=>{releaseScoped=resolve;});
const scopedLinks=new AgentLinks();scopedLinks.refresh(cx,address=>admitted&&address==='scoped-read');await tick();
const beforeObsoleteFooter=calls.filter(call=>call.cmd==='hc').length;admitted=false;
releaseScoped({code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo'})});await tick();
assert.equal(calls.filter(call=>call.cmd==='hc').length,beforeObsoleteFooter,'Retired coordinator membership starts no footer follow-up');
assert.equal(scopedLinks.entries.size,0);
// Current Crew's branch-only Build link keeps an explanation after liveness
// disappears, even after refresh prunes the authorizing live-entry cache.
const branchOnly=roleAgent('pc2/branch-only','ship',null);
const branchPane=allPanes.find(p=>p.terminal===branchOnly.address);
branchPane.branch='branch-only-head';
const branchPr={...ordinaryStage,number:1800,headRefName:branchPane.branch,stage:'build',checks:{state:'failure',label:'0/1'}};
const originalLinks=view.agentLinks;
for(const transition of ['ended','disconnected']) {
  const branchLinks=new AgentLinks();view.agentLinks=branchLinks;
  const admit=address=>address===branchOnly.address;
  const renderBranch=()=>{view.pulls.open=[branchPr];return find(view.pullRow(colors,branchPr),'pr-stage-1800');};
  branchLinks.refresh(cx,admit);await tick();
  const live=branchLinks.related(branchPr,'owner/repo',null,'build'),liveChip=renderBranch();
  assert.equal(live.address,branchOnly.address);assert.equal(live.availability,'live');assert.equal(liveChip.attrs.role[0],'button');
  assert.ok(branchLinks.branchPresentations.has(branchOnly.address));
  if(transition==='ended')branchOnly.state='finished';else connected=false;
  const reads=calls.length,focuses=actions.length;
  const reason=transition==='ended'?'build agent ended - CI failure':'on pc2, not connected';
  for(const afterRefresh of [false,true]) {
    if(afterRefresh){branchLinks.refresh(cx,admit);await tick();assert.equal(branchLinks.entries.has(branchOnly.address),false);}
    const target=branchLinks.related(branchPr,'owner/repo',null,'build'),chip=renderBranch();
    assert.equal(target.address,branchOnly.address);assert.equal(target.availability,transition);
    assert.equal(chip.attrs.tooltip[0],reason);assert.equal(chip.attrs.opacity[0],0.45);assert.equal(chip.attrs.role,undefined);assert.equal(chip.attrs.cursor_pointer,undefined);
    chip.attrs.on_click[0]({},cx);liveChip.attrs.on_click[0]({},cx);
    assert.equal(actions.length,focuses,'Neither retained presentation nor a captured live click can focus');
    assert.equal(calls.length,reads,'Disabled branch presentation starts no remote or repository read');
    assert.equal(await branchLinks.confirm(live,branchPr,'owner/repo'),false,'Remembered metadata never confirms a live action');
    assert.equal(branchLinks.related(branchPr,'owner/repo'),null,'Legacy robot never borrows disabled branch history');
    assert.equal(branchLinks.related(branchPr,'other/repo',null,'build'),null);
    assert.equal(branchLinks.related({...branchPr,headRefName:'other-head'},'owner/repo',null,'build'),null);
  }
  const paneIndex=allPanes.indexOf(branchPane),agentIndex=allAgents.findIndex(a=>a.address===branchOnly.address),knownAgent=allAgents[agentIndex];
  allPanes.splice(paneIndex,1);allAgents.splice(agentIndex,1);
  assert.equal(renderBranch().attrs.tooltip[0],reason,'The explanation survives absent live pane/agent records');
  assert.equal(calls.length,reads);assert.equal(actions.length,focuses);
  allPanes.splice(paneIndex,0,branchPane);allAgents.splice(agentIndex,0,knownAgent);
  branchOnly.labels['crew.pr']='https://github.com/owner/repo/pull/1801';
  assert.equal(branchLinks.related(branchPr,'owner/repo',null,'build'),null,'Explicit contradictory PR cannot borrow branch metadata');
  delete branchOnly.labels['crew.pr'];
  const oldBranch=branchPane.branch;branchPane.branch='moved-head';
  assert.equal(branchLinks.related(branchPr,'owner/repo',null,'build'),null,'Changed pane branch cannot borrow the old binding');branchPane.branch=oldBranch;
  branchOnly.state='live';connected=true;
  assert.equal(branchLinks.related(branchPr,'owner/repo',null,'build'),null,'Reconnect cannot authorize focus from remembered presentation');
  assert.equal(renderBranch().attrs.role,undefined);
  branchLinks.refresh(cx,admit);await tick();assert.equal(branchLinks.related(branchPr,'owner/repo',null,'build').availability,'live');
}
view.agentLinks=originalLinks;
// Whole-plugin availability matrix: the shared ordinary/coordinator row in
// both tabs and ghost presentation, every role and current-Crew branch fallback.
let matrixCases=0;
for(const mode of ['ordinary','coordinator'])for(const state of ['open','closed'])for(const ghost of [false,true])for(const remote of [false,true])for(const variant of ['ship-pr','ship-branch','fix-pr','fix-branch','review-pr']) {
  const number=2200+matrixCases++,role=variant.startsWith('review')?'review':'build',address=`${remote?'pc2/':''}matrix-${number}`;
  const url=`https://github.com/owner/repo/pull/${number}`,terminal=roleAgent(address,variant.split('-')[0],variant.endsWith('branch')?null:url);
  const row={...ordinaryStage,number,state,stage:role,url,headRefName:'stage-head',checks:{state:'failure',label:'0/1'},...(mode==='coordinator'?{repo:'owner/repo',key:`owner/repo#${number}`}:{})};
  const panel=new main.namespace.default();panel.resetRepository();panel.repo={name:'owner/repo'};panel.root='/repo';panel.context=JSON.stringify([place.cwd,place.on]);panel.view=state;
  const model=new AgentLinks();panel.agentLinks=model;const admit=a=>a===address;
  const group=new AggregatePulls({shown:()=>shown});panel.aggregate=group;
  const liveContext={scope:`matrix-${number}`,machine:remote?'pc2':null,tasks:[{id:'task',terminal:address}],links:[{url,terminal:address,task:'task'}]};
  taskContext=liveContext;group.context=liveContext;group.entries.set(row.key,{pr:row,link:{targets:[{terminal:address}]}});
  const chip=()=>{panel.pulls[state]=[row];return find(panel.pullRow(colors,row,ghost),`${ghost?'swap-':''}pr-stage-${row.key??number}`);};
  const nonAgentChecks=robot=>{
    const approved=find(panel.pullRow(colors,{...row,stage:'approved'},ghost),`${ghost?'swap-':''}pr-stage-${row.key??number}`);
    assert.equal(approved.kids[0],'Approved');assert.equal(approved.attrs.tooltip,undefined);assert.equal(approved.attrs.opacity,undefined);assert.equal(approved.attrs.on_click,undefined);
    const fallback=find(panel.pullRow(colors,{...row,stage:null},ghost),`${ghost?'swap-':''}pr-agent-${row.key??number}`);
    assert.equal(Boolean(fallback),robot);if(fallback&&ghost)assert.equal(fallback.attrs.on_click,undefined);
  };
  model.refresh(cx,admit);await tick();const liveChip=chip();assert.equal(liveChip.attrs.opacity,undefined);nonAgentChecks(true);
  const focusCount=actions.length;terminal.state='finished';
  if(mode==='coordinator'){taskContext={...liveContext,tasks:[{id:'task',terminal:null,historical:true}],links:[{url,terminal:null,task:'task',historical:true}]};group.context=taskContext;group.entries.get(row.key).link.targets=[{terminal:null,historical:true}];}
  model.refresh(cx,admit);await tick();let reads=calls.length;
  const ended=role==='build'?'build agent ended - CI failure':'reviewer ended without a verdict';
  let disabled=chip();assert.equal(disabled.attrs.tooltip[0],ended);assert.equal(disabled.attrs.opacity[0],0.45);assert.equal(disabled.attrs.role,undefined);
  disabled.attrs.on_click?.[0]({},cx);liveChip.attrs.on_click?.[0]({},cx);nonAgentChecks(false);assert.equal(actions.length,focusCount);assert.equal(calls.length,reads);
  terminal.state='live';connected=false;
  if(remote) {
    if(mode==='coordinator'){taskContext={...liveContext,stale:true};group.context=taskContext;}
    disabled=chip();assert.equal(disabled.attrs.tooltip[0],'on pc2, not connected');assert.equal(disabled.attrs.opacity[0],0.45);assert.equal(disabled.attrs.role,undefined);
    model.refresh(cx,admit);await tick();nonAgentChecks(false);assert.equal(calls.length,reads);liveChip.attrs.on_click?.[0]({},cx);assert.equal(actions.length,focusCount);
    if(mode==='coordinator'){
      taskContext={...liveContext,scope:'different-home',stale:true};group.context=taskContext;
      assert.equal(chip().attrs.tooltip[0],role==='build'?'build agent unavailable':'reviewer unavailable','Another scope cannot borrow a remembered target');
      taskContext={...liveContext,stale:true};group.context=taskContext;
    }
  } else {
    taskContext=liveContext;group.context=liveContext;group.entries.get(row.key).link.targets=[{terminal:address}];
    model.refresh(cx,admit);await tick();assert.equal(chip().attrs.opacity,undefined,'An unrelated remote disconnect never dims a local target');nonAgentChecks(true);
  }
  connected=true;
  if(mode==='coordinator') {
    taskContext={...liveContext,stale:true};group.context=taskContext;disabled=chip();assert.equal(disabled.attrs.opacity[0],0.45);
    assert.equal(disabled.attrs.tooltip[0],role==='build'?'build agent unavailable':'reviewer unavailable','Reconnected but unverified remains non-authorizing');
    liveChip.attrs.on_click?.[0]({},cx);assert.equal(actions.length,focusCount);
  }
  taskContext=liveContext;group.context=liveContext;group.entries.get(row.key).link.targets=[{terminal:address}];model.refresh(cx,admit);await tick();reads=calls.length;
  const restored=chip();assert.equal(restored.kids[0],role==='build'?'Build':'Review');assert.equal(restored.attrs.opacity,undefined);assert.equal(Boolean(restored.attrs.on_click),!ghost);assert.equal(Boolean(restored.attrs.role),!ghost);assert.equal(restored.attrs.tooltip,undefined);nonAgentChecks(true);assert.equal(calls.length,reads);
  if(mode==='coordinator') {
    assert.ok(group.stagePresentations.size>0);group.presentationGeneration='retired';group.shown=()=>false;group.sync(cx);
    assert.equal(group.stagePresentations.size,0,'Enable/provider generation replacement clears remembered target explanations');assert.equal(calls.length,reads);
  }
  console.log(`REASON_MATRIX ${mode}/${state}/${ghost?'ghost':'row'}/${remote?'pc2':'local'}/${variant}: ended=${ended}; disconnected=${remote?'on pc2, not connected':'not applicable to local machine'}; reconnected=${restored.kids[0]}`);
}
taskContext=null;
// Real PinSwap end-to-end for both chips, source view types, tabs and machines.
// A reviewer's base branch/footer must not prevent the destination crew.pr pin.
Object.assign(modules['./ui.js'].U,{control:28,rowGap:2,gap:8,meta:12,font:13,radius:6});
const savedPlace={...place};let animationCases=0;
for(const mode of ['ordinary','coordinator'])for(const role of ['build','review'])for(const state of ['open','closed'])for(const remote of [false,true])for(const zoom of [1,1.3])for(const control of ['chip','robot'])for(const initiallyPinned of mode==='ordinary'?[true,false]:[false]) {
  currentZoom=zoom;
  const number=4000+animationCases++,other=number+100,url=`https://github.com/owner/repo/pull/${number}`;
  const address=`${remote?'pc2/':''}motion-${number}`,terminal=roleAgent(address,role==='review'?'review':'ship',url);
  const sourceAddress=`source-${number}`;roleAgent(sourceAddress,'ship',`https://github.com/owner/repo/pull/${other}`);
  const agentRecord=allAgents.find(a=>a.address===address),targetPane=allPanes.find(p=>p.terminal===address);
  Object.assign(place,{terminal:sourceAddress,cwd:'/repo',on:null,app:'codex',space:'source-space',tab:'source-tab'});
  const panel=new main.namespace.default();panel.resetRepository();panel.view=state;panel.foldedRepositories=new Set();
  panel.repo={name:'owner/repo'};panel.root='/repo';panel.context=JSON.stringify([place.cwd,place.on]);
  const model=new AgentLinks();panel.agentLinks=model;model.refresh(cx,a=>a===address||a===sourceAddress);await tick();
  const plain={...ordinaryStage,number,state,stage:control==='chip'?role:null,url,headRefName:'stage-head'},old={...plain,number:other,url:`https://github.com/owner/repo/pull/${other}`,stage:control==='chip'?'build':null};
  panel.pulls[state]=[old,plain];panel.agentPull=initiallyPinned?other:null;
  let source,from;
  if(mode==='coordinator') {
    const group=new AggregatePulls({shown:()=>shown});panel.aggregate=group;
    taskContext={scope:`motion-${number}`,tasks:[{id:'target',terminal:address},{id:'source',terminal:sourceAddress}],links:[{url,terminal:address,task:'target'},{url:old.url,terminal:sourceAddress,task:'source'}]};group.context=taskContext;
    for(const [row,target]of [[old,sourceAddress],[plain,address]]){const key=`owner/repo#${row.number}`;group.entries.set(key,{pr:{...row,key,repo:'owner/repo'},link:{repo:'owner/repo',key,targets:[{terminal:target}]}});}
    panel.context=`tasks:${taskContext.scope}`;panel.repo=null;panel.root=null;panel.pulls={open:null,closed:null};panel.agentPull=null;
    panel.notices={sync(){return null;},presentation(){return null;},stop(){}};panel.enrollmentPicker={render(){return null;},stop(){}};panel.syncChecksFallback=()=>{};
    source=panel.renderAggregate(cx,colors);const window=panel.selectedTaskWindow;
    panel.taskMeasure(window,taskContext.scope,'viewport',{width:300*zoom,height:400*zoom},cx);
    panel.taskViewportMotion(window,taskContext.scope,{position:{x:280*zoom,y:230*zoom},bounds:{x:0,y:100*zoom,width:300*zoom,height:400*zoom}},'move',cx);
    from=4-window.offset;for(const item of window.range().items){if(item.row?.number===number)break;from+=item.height+item.gap;}
    assert.equal(find(source,'active-pull'),undefined,'Coordinator has no permanent active pin');
  } else {
    source=panel.renderPulls(colors);find(source,'pulls-body').attrs.on_size_change[0]({width:300*zoom,height:400*zoom},cx);
    from=initiallyPinned?87:80;for(const n of [number,other])find(source,`pr-${n}`).attrs.on_size_change[0]({width:286*zoom,height:74*zoom});
    find(source,`pr-${number}`).attrs.on_mouse_move[0]({position:{x:280*zoom,y:(100+from+10)*zoom},bounds:{x:7*zoom,y:(100+from)*zoom,width:286*zoom,height:74*zoom}});
    find(source,'pulls-body').attrs.on_mouse_move[0]({bounds:{x:0,y:100*zoom,width:300*zoom,height:400*zoom}});
  }
  const timers=[],motionCx={...cx,timer:{after:(ms,fn)=>{const timer={ms,fn,cancel(){this.cancelled=true;}};timers.push(timer);return timer;}}};
  const sourceId=mode==='coordinator'?`owner/repo#${number}`:number,kind=control==='chip'?'stage':'agent',button=find(source,`pr-${kind}-${sourceId}`),before=actions.length,offset=control==='chip'?6:4;
  button.attrs.on_mouse_down[1]({position:{x:280*zoom,y:(100+from+10)*zoom},bounds:{x:(control==='chip'?213:269)*zoom,y:(100+from+offset)*zoom,width:(control==='chip'?80:24)*zoom,height:(control==='chip'?20:24)*zoom}},motionCx);button.attrs.on_click[0]({},motionCx);
  assert.equal(actions.length,before+1,'Chip focuses immediately, before animation');assert.equal(actions.at(-1)[1].terminal,address);
  const swap=panel.pinMotion.current;assert.ok(swap,`${mode}/${role}/${state}: pin motion armed`);assert.equal(swap.phase,'waiting');assert.equal(swap.target,address);
  assert.equal(Boolean(swap.snapshot.arrival),mode==='coordinator');assert.ok(Math.abs(swap.cards.find(c=>c.pr.number===number).from-from)<1e-6,'Chip starts at the measured row, not the robot glyph offset');
  if(mode==='ordinary'){assert.equal(panel.agentPull,initiallyPinned?other:null,'No optimistic pin selection');assert.equal(swap.snapshot.pinned?.number??null,initiallyPinned?other:null);}
  // Native focus acknowledgement selects another space and worktree. Use the
  // real retained-refresh/root/branch path before resolving the destination pin.
  taskContext=null;Object.assign(place,{terminal:address,space:agentRecord.space,tab:agentRecord.tab,cwd:terminal.cwd,on:remote?'pc2':null,app:'codex'});
  panel.refresh(motionCx);assert.equal(panel.pinMotion.current,swap,'Correct destination retains the pending motion across a context refresh');
  let waiting=panel.renderPulls(colors);assert.equal(find(waiting,`pin-swap-${swap.id}`),undefined);
  if(mode==='coordinator')assert.ok(find(waiting,`pin-origin-owner/repo#${number}`),'Coordinator body is retained as inert presentation');
  await tick();assert.equal(panel.branch,role==='review'?'main':'stage-head');assert.equal(panel.agentPull,number,'crew.pr pins the reviewer even on its base branch without a footer');
  let moving=panel.renderPulls(colors),overlay=find(moving,`pin-swap-${swap.id}`);assert.ok(overlay);
  const ghost=find(overlay,`swap-pr-${kind}-${number}`);assert.ok(ghost);assert.equal(ghost.attrs.on_click,undefined,'Moving chips cannot navigate');
  assert.ok(Math.abs(find(overlay,`pin-swap-${swap.id}-${number}`).attrs.top[0]-from)<1e-6);
  overlay.attrs.on_size_change[0]({},motionCx);assert.equal(timers.find(t=>t.ms===3000).cancelled,true);
  timers.find(t=>t.ms===16).fn(motionCx);moving=panel.renderPulls(colors);overlay=find(moving,`pin-swap-${swap.id}`);
  assert.equal(find(overlay,`pin-swap-${swap.id}-${number}`).attrs.top[0],4,'The clicked row travels to the normal pinned slot');
  timers.find(t=>t.ms===352).fn(motionCx);const settled=panel.renderPulls(colors);
  assert.equal(panel.pinMotion.current,null);assert.ok(find(find(settled,'active-pull'),`pr-${number}`),'The destination commits the clicked pin after motion');assert.equal(actions.length,before+1,'Motion never delays or repeats focus');
  console.log(`PIN_MATRIX ${mode}/${role}/${state}/${remote?'pc2':'local'}/${zoom}/${control}/${initiallyPinned?'pinned':'unpinned'}: immediate focus; ${from}->4; destination pin committed`);
  await tick();
}
Object.keys(place).forEach(key=>delete place[key]);Object.assign(place,savedPlace);taskContext=null;currentZoom=1;
shown=false;const hiddenCalls=calls.length;view.render(cx);await tick();
assert.equal(calls.length,hiddenCalls,'Hidden Git panels start no agent scans');
await Promise.all(tasks);
console.log('PASS: Separate white PR robot links, preserved PR state colors, standard hover/no tooltip, click isolation, remote/background agents, repository scoping, precedence, TTL and stale targets');
