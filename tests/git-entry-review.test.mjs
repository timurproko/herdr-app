import assert from 'node:assert/strict';
import {rowHarness,rowGeometry,find,t} from './support/git-row.mjs';
import {loadMod} from '../tools/plugin-harness.mjs';

const tick=async()=>{for(let i=0;i<80;i++)await Promise.resolve();};
async function cachedHarness() {
  const calls=[];
  const h=await rowHarness({host:{shared:()=>0,spaces:()=>[],exec:(cmd,args,options)=>new Promise(resolve=>calls.push({cmd,args,options,resolve}))},
    modules:{'aggregate.js':'src/plugins/git/mod/aggregate.js','panel-kit.js':'src/ui/panel-kit.js',
      'plugins.js':{sidebarPanelEnabled:()=>true,pluginPullContext:()=>null,pluginEvent(){}}}});
  const p=h.panel;h.cx.timer={after:()=>({cancel(){}})};
  p.aggregate=new h.AggregatePulls({shown:()=>p.shown()});
  p.aggregate.presentationGeneration=JSON.stringify([0,0]);p.repositoryGeneration=p.aggregate.presentationGeneration;
  p.agentLinks={cachedRepository:()=> 'owner/repo',cachedAssociation:()=>({number:null,branch:null}),related:()=>null,refresh(){},invalidate(){}};
  p.notices={sync(){},stop(){},retryNow(){}};p.webhooks={sync(){},stop(){},retryNow(){}};
  p.syncChecksFallback=()=>{};p.enrollmentPicker={stop(){}};p.on=null;
  p.pulls={open:[h.facts.pullRow({number:1,title:'Cached A',state:'OPEN',url:'https://github.com/owner/repo/pull/1'},'owner')],closed:[]};
  p.counts={open:1,closed:0};p.commitRepository();
  return {...h,calls};
}
async function enterWarm(h) {
  Object.assign(h.place,{cwd:'/new-worktree',space:'worker-b',terminal:'b',app:'codex'});
  const tree=h.render(()=>h.panel.renderPanel(h.cx));await tick();
  assert.ok(find(tree,'pr-1'),'cached rows paint before destination verification');
  return tree;
}
async function resolveRoot(h) {
  const root=h.calls.shift();assert.deepEqual([root.cmd,root.args[0],root.options.cwd],['git','rev-parse','/new-worktree']);
  root.resolve({code:0,stdout:'/new-worktree'});await tick();
  const branch=h.calls.shift();assert.equal(branch.args[0],'symbolic-ref');assert.equal(branch.options.cwd,'/new-worktree');
  branch.resolve({code:0,stdout:'main'});await tick();
}
const cases=[
  ['repository-return',async()=>{
    const h=await cachedHarness(),p=h.panel;
    p.agentLinks.cachedRepository=target=>target.cwd==='/repo'?'owner/repo':'owner/other';
    // Both destinations are already mapped; B even has its own warm section.
    const other=h.facts.pullRow({number:2,title:'Cached B',state:'OPEN',url:'https://github.com/owner/other/pull/2'},'owner');
    p.aggregate.presentations.set(JSON.stringify(['repository',null,'owner/other']),{
      ...p.repositorySnapshot(),root:'/other',repo:{name:'owner/other'},pulls:{open:[other],closed:[]},counts:{open:1,closed:0},
    });
    Object.assign(h.place,{cwd:'/other',space:'worker-b',terminal:'b',app:'codex'});
    const b=h.render(()=>p.renderPanel(h.cx));
    assert.ok(p.aggregate.presentations.repository(null,'owner/repo'),'departing A must be remembered before B mapping is compared');
    assert.ok(find(b,'pr-2'));assert.equal(find(b,'pr-1'),undefined);await tick();
    Object.assign(h.place,{cwd:'/repo',space:'worker-a',terminal:'a'});
    const a=h.render(()=>p.renderPanel(h.cx));
    assert.ok(find(a,'pr-1'),'return to A restores its loaded rows in the first frame');
    assert.equal(find(a,'pr-2'),undefined);assert.deepEqual({...p.counts},{open:1,closed:0});
    assert.equal(find(a,'git-empty'),undefined,'no Loading frame on warm return');
    assert.equal(find(a,'active-pull'),undefined);assert.equal(p.pinMotion.current,null);
    await tick();
    const obsolete=h.calls.shift();assert.equal(obsolete.options.cwd,'/other');
    obsolete.resolve({code:0,stdout:'/obsolete-other'});await tick();
    assert.notEqual(p.root,'/obsolete-other','departed B root cannot replace restored A');
  }],
  ['manual-identity-retry',async()=>{
    const h=await cachedHarness(),p=h.panel;
    await enterWarm(h);await resolveRoot(h);
    h.render(()=>p.renderPanel(h.cx));await tick();
    const failed=h.calls.shift();assert.equal(failed.args[0],'repo');
    failed.resolve({code:1,stderr:'local command failed'});await tick();
    let tree=h.render(()=>p.renderPanel(h.cx));
    assert.equal(p.entryVerify,true);assert.equal(p.entryAttempted,true);assert.equal(p.entryRefreshing,false);
    assert.equal(h.calls.length,0,'failed identity does not retry on render');assert.ok(find(tree,'pr-1'));
    find(tree,'changes-header').attrs.on_hover[0](true,h.cx);tree=h.render(()=>p.renderPanel(h.cx));
    find(tree,'git-refresh').attrs.on_click[0]({},h.cx);await tick();
    await resolveRoot(h);h.render(()=>p.renderPanel(h.cx));await tick();
    const identity=h.calls.shift();assert.ok(identity,'manual Refresh queues identity retry after the root completes');
    assert.equal(identity.args[0],'repo');assert.equal(identity.options.cwd,'/new-worktree');
    identity.resolve({code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo',url:'https://github.com/owner/repo'})});await tick();
    const page=h.calls.shift();assert.equal(page.cmd,'gh');assert.equal(page.options.cwd,'/new-worktree');
    page.resolve({code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:19},closed:{totalCount:9},pullRequests:{
      nodes:[{number:7,title:'Fresh 7',state:'OPEN',url:'https://github.com/owner/repo/pull/7',commits:{nodes:[]}}],
      pageInfo:{endCursor:null,hasNextPage:false},
    }}}})});await tick();
    tree=h.render(()=>p.renderPanel(h.cx));
    assert.ok(find(tree,'pr-7'));assert.equal(find(tree,'pr-1'),undefined);assert.deepEqual({...p.counts},{open:19,closed:9});
    assert.equal(p.entryVerify,false);assert.equal(p.entryRefreshing,false);assert.equal(p.pullError,null);
  }],
  ['click-footer-mismatch',async()=>{
    for(const control of ['chip','robot']) {
      let releaseFooter;
      const h=await rowHarness({host:{hc:args=>{
        assert.deepEqual(Array.from(args).slice(0,2),['read','b']);
        return new Promise(resolve=>{releaseFooter=resolve;});
      }}}),p=h.panel;
      h.cx.timer={after:()=>({cancel(){}})};
      Object.assign(h.place,{space:'worker-a',terminal:'a',app:'a1'});p.sectionEntry=true;p.on=null;
      const facts=n=>h.facts.pullRow({number:n,title:`PR ${n}`,url:`https://github.com/owner/repo/pull/${n}`,state:'OPEN',headRefName:`work-${n}`,
        labels:control==='chip'?[{name:'Build',color:'aaaa00'}]:[]},'owner');
      p.pulls={open:[facts(1),facts(2)],closed:[]};p.agentPull=1;p.agentResolved=JSON.stringify(h.place);p.commitRepository();
      const agent={address:'b',key:'target-b',cwd:h.place.cwd,on:null,availability:'live',crew:{},displayName:'Worker B'};
      p.agentLinks={related:pr=>pr.number===2?agent:null,confirm:async()=>true,pullNumber:()=>null};
      let tree=h.render(()=>p.renderPulls(t));const geometry=rowGeometry(tree,320,1,500),body=geometry.get(tree);
      tree.attrs.on_size_change[0]({width:body.width,height:body.height},h.cx);
      for(const n of [1,2]){const node=find(tree,`pr-${n}`),box=geometry.get(node);node.attrs.on_size_change[0]({width:box.width,height:box.height},h.cx);}
      const row=find(tree,'pr-2'),box=geometry.get(row),button=find(tree,control==='chip'?'pr-stage-2':'pr-agent-2'),bounds=geometry.get(button);
      const event={bounds,position:{x:bounds.x+2,y:bounds.y+2}};
      tree.attrs.on_mouse_move[0]({bounds:body,position:event.position});row.attrs.on_mouse_move[0]({bounds:box,position:event.position});
      button.mouse.left(event,h.cx);button.attrs.on_click[0]({},h.cx);await tick();
      assert.equal(p.pinMotion.current.phase,'waiting');assert.equal(h.focus.length,1);
      Object.assign(h.place,{space:'worker-b',terminal:'b'});p.syncAgent(h.cx);await tick();
      h.render(()=>p.renderPulls(t));assert.equal(p.pinMotion.current.phase,'waiting','unresolved footer keeps waiting');
      releaseFooter({code:0,stdout:JSON.stringify({how:'screen',complete:true,text:'/repo (work-1) • #1\n13.1%/500k (auto)'})});await tick();
      tree=h.render(()=>p.renderPulls(t));
      assert.equal(p.agentPull,1,'fresh destination footer independently identifies PR 1');
      assert.equal(p.pinMotion.current,null,`${control}: conflicting verified PR cancels motion for clicked PR 2`);
      assert.equal(p.clickPin,undefined);assert.ok(find(find(tree,'active-pull'),'pr-1'),'Footer mismatch cancels the clicked pin; only the independently resolved selected PR pins');
      assert.equal(h.focus.length,1,'cancellation does not undo navigation or focus again');
    }
  }],
  ['warm-root-routing',async()=>{
    const h=await cachedHarness(),p=h.panel;
    await enterWarm(h);const root=h.calls.shift();assert.equal(root.options.cwd,'/new-worktree');
    root.resolve({code:1,timed_out:true,stderr:'failed'});await tick();
    for(let i=0;i<3;i++){h.render(()=>p.renderPanel(h.cx));await tick();}
    assert.equal(h.calls.length,0,'failed B root must never start identity/pages through cached A root');
    assert.equal(p.entryRootReady,false);assert.equal(p.entryVerify,true);assert.equal(p.pullsDue('open'),false);
    p.loadPulls('open',h.cx,true);p.agentPull=99;p.loadRelatedPull(h.cx);await tick();
    assert.equal(h.calls.length,0,'forced list and related reads cannot bypass destination-root verification');
    p.agentPull=null; // Restore this fixture's known no-PR association after the forced-read probe.
    const tree=h.render(()=>p.renderPanel(h.cx));assert.ok(find(tree,'pr-1'));assert.deepEqual({...p.counts},{open:1,closed:0});
    assert.ok(find(tree,'git-read-error'),'failed root retains cached presentation and actionable error');
  }],
  ['canonical-identity-replacement',async()=>{
    const h=await cachedHarness(),p=h.panel,linkCalls=[];let forgot=0;
    const {AgentLinks}=await loadMod({host:{agents:()=>[],panes:()=>[],spaces:()=>[],terminals:()=>[],
      exec:(cmd,args,options)=>new Promise(resolve=>linkCalls.push({cmd,args,options,resolve}))},
      modules:{'agent-links.js':'src/plugins/git/mod/agent-links.js','location.js':{namedPullNumber:()=>null},'directory.js':{paneDirectory:()=>({cwd:'/new-worktree'})},
        'pulls.js':{agentPullNumber:()=>null,REPO_ARGS:['repo','view'],repositoryRead:(exec,args,_repo,options)=>exec('gh',args,options)}},
      entry:'export {AgentLinks} from "./agent-links.js";'});
    const links=p.agentLinks=new AgentLinks();
    links.repositories.set(JSON.stringify([null,'/new-worktree']),{repo:'owner/repo',fingerprint:'old'});
    // Isolate folder evidence from the live-target inventory; invalidation and
    // the older in-flight repository lookup use the real AgentLinks methods.
    links.cachedRepository=target=>links.repositories.get(JSON.stringify([target.on??null,target.cwd]))?.repo??null;
    links.cachedAssociation=()=>({number:null,branch:null}); // This identity-only fixture has a known unpinned selection.
    const forget=links.forgetRepository.bind(links);
    links.forgetRepository=target=>{assert.equal(target.cwd,'/new-worktree');assert.equal(target.on,null);forgot++;forget(target);};
    const obsolete=links.repository({on:null,cwd:'/new-worktree'});await tick();
    linkCalls.shift().resolve({code:0,stdout:'changed config'});await tick();
    const obsoleteIdentity=linkCalls.shift();assert.equal(obsoleteIdentity.cmd,'gh');
    await enterWarm(h);await resolveRoot(h);h.render(()=>p.renderPanel(h.cx));await tick();
    h.calls.shift().resolve({code:0,stdout:JSON.stringify({nameWithOwner:'owner/other',url:'https://github.com/owner/other'})});await tick();
    h.calls.shift().resolve({code:0,stdout:JSON.stringify({data:{repository:{open:{totalCount:1},closed:{totalCount:0},pullRequests:{
      nodes:[{number:7,title:'New repository row',state:'OPEN',url:'https://github.com/owner/other/pull/7',commits:{nodes:[]}}],
      pageInfo:{endCursor:null,hasNextPage:false},
    }}}})});await tick();
    assert.equal(p.repo.name,'owner/other','canonical identity and page are accepted before rendering');
    obsoleteIdentity.resolve({code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo'})});
    assert.equal(await obsolete,null,'superseded in-flight agent lookup cannot repopulate the old mapping');
    for(let i=0;i<3;i++){
      const tree=h.render(()=>p.renderPanel(h.cx));
      assert.equal(p.repo.name,'owner/other','superseded agent mapping cannot reverse accepted identity');
      assert.ok(find(tree,'pr-7'));assert.equal(find(tree,'pr-1'),undefined);
    }
    assert.equal(forgot,1,'superseded folder/agent mapping is explicitly invalidated');
    assert.equal(p.aggregate.presentations.name('/new-worktree',null),'owner/other');
    Object.assign(h.place,{cwd:'/repo',space:'worker-a',terminal:'a'});h.render(()=>p.renderPanel(h.cx));
    Object.assign(h.place,{cwd:'/new-worktree',space:'worker-b',terminal:'b'});
    const returned=h.render(()=>p.renderPanel(h.cx));
    assert.equal(p.repo.name,'owner/other');assert.ok(find(returned,'pr-7'));assert.equal(find(returned,'pr-1'),undefined);
    await tick();
  }],
  ['canonical-cache-repaint',async()=>{
    const h=await cachedHarness(),p=h.panel;let notifications=0;
    const notify=h.cx.notify;h.cx.notify=()=>{notifications++;notify();};
    p.agentLinks.cachedRepository=()=>null;
    Object.assign(h.place,{cwd:'/new-worktree',space:'worker-b',terminal:'b',app:'codex'});
    h.render(()=>p.renderPanel(h.cx));await tick();await resolveRoot(h);
    const cold=h.render(()=>p.renderPanel(h.cx));await tick();
    assert.equal(find(cold,'pr-1'),undefined,'unmapped worktree is initially cold');
    const before=notifications;
    h.calls.shift().resolve({code:0,stdout:JSON.stringify({nameWithOwner:'owner/repo',url:'https://github.com/owner/repo'})});await tick();
    assert.equal(p.pulls.open.length,1,'canonical identity adopts the already-cached repository');
    assert.equal(h.calls.length,1,'page remains held');assert.equal(p.pullLoading,true);
    assert.ok(notifications>before,'asynchronous cache adoption must schedule a repaint before the page completes');
    const warm=h.render(()=>p.renderPanel(h.cx));
    assert.ok(find(warm,'pr-1'));assert.equal(find(warm,'git-empty'),undefined);assert.deepEqual({...p.counts},{open:1,closed:0});
    assert.equal(p.root,'/new-worktree','cache adoption retains the verified destination root');
    assert.equal(find(warm,'active-pull'),undefined);assert.equal(p.pinMotion.current,null);
  }],
];
for(const [name,run]of cases)if(!process.argv[2]||process.argv[2]===name){await run();console.log(`PASS ${name}`);}
