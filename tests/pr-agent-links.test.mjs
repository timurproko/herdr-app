import assert from 'node:assert/strict';
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
let allAgents=[], allPanes=[], allSpaces=[], allTerminals=[], shown=true;
const calls=[], actions=[], tasks=[], remotes=new Map(), screens=new Map(),configs=new Map();
const place={cwd:'/repo',on:null,terminal:'shell',tab:'shell-tab'};
let heldRemote=null;
const host={
  agents:()=>allAgents,panes:()=>allPanes,spaces:()=>allSpaces,terminals:()=>allTerminals,
  focused:()=>null,home:()=>'/home/test',shared:()=>null,setShared(){},
  settings:()=>({zoom:1}),theme:()=>colors,window:()=>({platform:'linux'}),openOverlay(){},
  props:()=>null,closeOverlay(){},notify(){},nextCommand(){},
  layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),
  run:(...args)=>actions.push(args),
  exec:async(cmd,args,options)=>{
    calls.push({cmd,args,options});
    if(cmd==='git') {
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
  './plugins.js':{pluginPullContext:()=>null,pluginEvent(){},sidebarPanelEnabled:()=>true},'./sidebar-title.js':{sidebarTitle:element},
  './panel-pin.js':{panelPin:(_t,{id})=>element().id(id)},'./panel-state.js':{changePanel(){}},
  './host.js':host,'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},
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
const cx={notify(){},spawn:fn=>tasks.push(fn(cx))};
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
shown=false;const hiddenCalls=calls.length;view.render(cx);await tick();
assert.equal(calls.length,hiddenCalls,'Hidden Git panels start no agent scans');
await Promise.all(tasks);
console.log('PASS: Separate white PR robot links, preserved PR state colors, standard hover/no tooltip, click isolation, remote/background agents, repository scoping, precedence, TTL and stale targets');
