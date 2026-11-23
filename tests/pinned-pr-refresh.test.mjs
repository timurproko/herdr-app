// Regression: webhook invalidations replaced pinned-only ten-second polling.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import {kitModule,withKitUi} from './support/panel-kit.mjs';
import vm from 'node:vm';
import {PinSwap,PIN_SWAP_MS} from '../src/plugins/git/mod/pin-swap.js';
import {loadMod} from '../tools/plugin-harness.mjs';
const pulls=await loadMod({host:{},modules:{'pulls.js':'src/plugins/git/mod/pulls.js'},entry:"export * from './pulls.js';"});
function element() {
  const n={attrs:{},kids:[]};let p;
  return p=new Proxy(n,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?c=>{n.kids.push(c);return p;}:k==='children'?c=>{n.kids.push(...c);return p;}:(...a)=>{n.attrs[k]=a;return p;}});
}
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:n?.kids?.map(c=>find(c,id)).find(Boolean);
const raw=(n,extra={})=>({number:n,title:`PR ${n}`,state:'OPEN',...extra});
const running={statusCheckRollup:[{name:'test',status:'IN_PROGRESS'}]};
const page=(nodes,cursor='cursor',hasMore=false)=>JSON.stringify({data:{repository:{pullRequests:{nodes,pageInfo:{endCursor:cursor,hasNextPage:hasMore},totalCount:nodes.length}}}});
async function harness() {
  let shown=true,enabled=true;
  const place={cwd:'/repo',on:'pc2',terminal:'pc2/t1',app:'a1'},pending=[],tasks=[],timers=[],phases=[],opened=[];
  const context=vm.createContext({localStorage:{getItem:()=>null,setItem(){}}});
  const host={layout:()=>({id:'panel',hidden:!shown,children:[{id:'panel-body',active:'changes'}]}),
    exec:(cmd,args,options)=>new Promise(resolve=>pending.push({cmd,args,options,resolve})),
    settings:()=>({zoom:1}),theme:()=>({dim:'dim'}),run(){},openOverlay:spec=>opened.push(spec),closeOverlay(){},props(){},notify(){},nextCommand(){},window(){},hc:async()=>({code:1})};
  const modules={
    './aggregate.js':{AggregatePulls:class {sync(){return false;}stop(){}}},
    'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},'gpui-base':{h_flex:element,v_flex:element},
    './host.js':host,'./location.js':{location:()=>place},'./pulls.js':pulls,'./pin-swap.js':{PinSwap,PIN_SWAP_MS},
    './ci-fix.js':{CIFix:class {sync(){}stop(){}}},
    './notices.js':{GitNotices:class {sync(){return null;}stop(){}retryNow(){}}},
    './webhooks.js':{GitWebhooks:class {sync(){}stop(){}}},
    './plugins.js':{sidebarPanelEnabled:()=>enabled},'./sidebar-title.js':{sidebarTitle:element},
    './panel-pin.js':{panelPin:(_t,{id})=>element().id(id)},'./panel-state.js':{changePanel(){}},
    './agent-links.js':{AgentLinks:class{}},'./ui.js':{U:{font:13,meta:12,icon:16,gap:8,radius:6},headerTools:x=>x,reveal:x=>x,subtleActionFill(){},refreshButton:element,emptyState:element,menuSurface:(_t,x)=>x,menuHeading:element,slot:x=>x},
  };
  const main=new vm.SourceTextModule(fs.readFileSync(new URL('../src/plugins/git/mod/main.js',import.meta.url),'utf8'),{context});
  const panelKit=kitModule(context);withKitUi(modules['./ui.js'],element);
  await main.link(name=>name==='./settings-dialog.js'?new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/settings-dialog.js',import.meta.url),'utf8'),{context}):name==='./panel-kit.js'?panelKit:new vm.SyntheticModule(Object.keys(modules[name]),function(){for(const [k,v]of Object.entries(modules[name]))this.setExport(k,v);},{context}));
  await main.evaluate();
  const view=new main.namespace.default(),cx={notify(){},stop_propagation(){},spawn:fn=>tasks.push(fn(cx)),timer:{every:(ms,fn)=>timers.push({ms,fn}),after:(ms,fn)=>phases.push({ms,fn})}};
  view.resetRepository();view.view='open';view.root='/repo';view.on=place.on;view.context=JSON.stringify([place.cwd,place.on]);
  view.repo={name:'owner/repo',owner:'owner'};view.agentPull=1;view.selection=JSON.stringify(place);view.agentResolved=JSON.stringify(place);
  view.pulls.open=[pulls.pullRow(raw(1)),pulls.pullRow(raw(2,running))];view.pulls.closed=null;
  const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
  const event=async(repository='owner/repo')=>{view.queueWebhook({repository,event:'check_run'},cx);await tick();};
  const reply=async(stdout,code=0)=>{const c=pending.shift();assert.ok(c,'Expected read');c.resolve({code,stdout,stderr:code?'network failed':''});await tick();return c;};
  // Rendering chrome should not start unrelated agent/repository reads in these tests.
  view.syncAgent=()=>{};view.loadRelatedPull=()=>{};
  return {view,cx,place,pending,tasks,timers,phases,opened,tick,event,reply,render:()=>view.render(cx),hide:()=>{shown=false;},disable:()=>{enabled=false;}};
}
{
  const h=await harness(),v=h.view;
  for(let i=0;i<10;i++)h.render();assert.equal(h.pending.length,0,'Renders and elapsed TTL cannot poll GitHub');
  await h.event('other/repo');assert.equal(h.pending.length,0,'Other repository events are ignored');
  v.agentPull=null;v.branch=null;v.agentResolved=null; // No pin, unresolved agent: CI still updates.
  await h.event();assert.equal(h.pending.length,1);
  assert.equal(h.pending[0].options.on,'pc2');assert.equal(h.pending[0].options.cwd,'/repo');
  assert.ok(h.pending[0].args.some(a=>a.includes('pullRequests(first:10')));
  let tree=h.render();const track=find(tree,`git-ci-track-${v.ciSweep.id}`);
  assert.ok(track,'Unpinned CI animates below the Git header');
  assert.ok(find(find(tree,'git-panel-body'),`git-ci-track-${v.ciSweep.id}`));
  assert.equal(find(find(tree,'active-pull'),'git-ci-line'),undefined);
  assert.equal(track.attrs.top[0],0);assert.equal(track.attrs.h[0],1);
  const line=find(track,'git-ci-line');assert.equal(line.attrs.left[0],-96);
  assert.equal(line.attrs.transition[1].duration,2400);assert.equal(line.attrs.loop,undefined);
  track.attrs.on_size_change[0]({width:400},h.cx);track.attrs.on_size_change[0]({width:400},h.cx);
  assert.equal(h.phases.filter(p=>p.ms===16).length,1);h.phases.find(p=>p.ms===16).fn(h.cx);
  assert.equal(find(h.render(),'git-ci-line').attrs.left[0],400);
  await h.reply(page([raw(1),raw(2,{title:'Unpinned CI completed'})]));
  await h.reply(JSON.stringify({data:{repository:{open:{totalCount:2},closed:{totalCount:0}}}}));
  assert.equal(v.pulls.open[1].title,'Unpinned CI completed');
  h.phases.find(p=>p.ms===2500).fn(h.cx);assert.equal(find(h.render(),'git-ci-line'),undefined);
  assert.equal(h.pending.length,0);assert.equal(h.timers.length,0,'No periodic GitHub or animation timers');
}
{
  const h=await harness(),v=h.view;
  v.agentPull=null;v.pulls.open=Array.from({length:20},(_,i)=>pulls.pullRow(raw(i+1)));
  v.pages.open={cursor:'old-page2',hasMore:true,expanded:true};
  await h.event();await h.event();await h.event();assert.equal(h.pending.length,1,'Burst is single-flight');
  await h.reply(page(Array.from({length:10},(_,i)=>raw(i+1)),'fresh-page1',true));
  assert.ok(h.pending[0].args.includes('after=fresh-page1'));
  await h.reply(page(Array.from({length:10},(_,i)=>raw(i+11)),'fresh-page2',true));
  await h.reply('{}');
  assert.equal(v.pulls.open.length,20);assert.equal(v.pages.open.expanded,true);assert.equal(v.pages.open.cursor,'fresh-page2');
  assert.equal(h.pending.length,1,'Burst coalesces into one trailing catch-up');
  await h.reply(page([raw(1)],'end',false));await h.reply('{}');assert.equal(h.pending.length,0);
}
for(const change of ['folder','machine','hidden','disabled','reset']) {
  const h=await harness(),v=h.view;await h.event();
  if(change==='folder')h.place.cwd='/elsewhere';
  if(change==='machine')h.place.on='pc3';
  if(change==='hidden')h.hide();
  if(change==='disabled')h.disable();
  if(change==='reset')v.resetRepository();
  await h.reply(page([raw(1,{title:'STALE'})]));
  assert.notEqual(v.pulls.open?.[0]?.title,'STALE',change);assert.equal(h.pending.length,0,'No stale follow-up reads');
}
{
  const h=await harness(),v=h.view;v.agentPull=99;v.relatedPull=pulls.pullRow(raw(99,running));
  await h.event();await h.reply(page([raw(1),raw(2)]));
  assert.deepEqual(Array.from(h.pending[0].args.slice(0,3)),['pr','view','99']);
  await h.reply(JSON.stringify(raw(99,{state:'MERGED'})));await h.reply('{}');
  assert.equal(v.relatedPull.state,'merged');assert.equal(v.pulls.open.length,2,'Beyond-page pin lookup does not append pages');
}
{
  const h=await harness(),v=h.view,before=v.pulls.open;
  await h.event();await h.reply('',1);assert.equal(v.pulls.open,before,'Failures preserve good facts');
  for(let i=0;i<20;i++)h.render();assert.equal(h.pending.length,0,'No render-driven failure retries');
  h.hide();h.render();assert.equal(v.ciSweep,null);assert.equal(h.pending.length,0);
}
{
  const h=await harness(),calls=[];
  h.view.refresh=()=>calls.push('local');h.view.init({},h.cx);calls.length=0;
  assert.equal(h.timers.length,1);h.timers[0].fn(h.cx);assert.deepEqual(calls,['local'],'Existing timer only tracks shell/agent context');
}
{
  const h=await harness(),t={ansi1:'red',ansi2:'green',ansi5:'purple',dim:'muted'};
  assert.ok(pulls.PR_FIELDS.includes('mergeable'));
  assert.ok(pulls.pullListArgs('open','owner/repo').some(a=>a.includes('headRefName headRefOid mergeable')));
  for(const mergeable of ['CONFLICTING','MERGEABLE','UNKNOWN',undefined,'BLOCKED']) {
    const pr=pulls.pullRow(raw(1,{mergeable}));
    assert.equal(pr.mergeConflict,mergeable==='CONFLICTING');
    const icon=h.view.pullIcon(t,pr);
    if(pr.mergeConflict){assert.equal(icon.attrs.tooltip[0],'Merge conflicts');assert.equal(icon.attrs.bg,undefined,'The outlined icon has no background-colored overlay');assert.equal(icon.kids[0].attrs.text_color[0],'red');assert.equal(icon.kids[0].attrs.size[0],16);}
    else {assert.equal(icon.attrs.tooltip,undefined);assert.equal(icon.attrs.text_color[0],'green');}
  }
  for(const state of ['MERGED','CLOSED']) {
    const pr=pulls.pullRow(raw(1,{state,mergeable:'CONFLICTING'}));
    assert.equal(pr.mergeConflict,false);assert.equal(h.view.pullIcon(t,pr).attrs.tooltip,undefined,'Closed/merged keep their normal icon');
  }
  const draft=pulls.pullRow(raw(1,{isDraft:true,mergeable:'CONFLICTING'}));assert.equal(draft.mergeConflict,true);
  const asset=fs.readFileSync(new URL('../src/plugins/git/mod/merge-conflict.svg',import.meta.url),'utf8');
  const prAsset=fs.readFileSync(new URL('../src/plugins/git/mod/git-pull-request.svg',import.meta.url),'utf8');
  for(const attr of ['fill','stroke','stroke-width','stroke-linecap','stroke-linejoin'])assert.equal(asset.match(new RegExp(`\\b${attr}="([^"]+)"`))?.[1],prAsset.match(new RegExp(`\\b${attr}="([^"]+)"`))?.[1],`Conflict ${attr} matches PR outline style`);
  assert.match(asset,/fill="none"/);assert.match(asset,/<circle cx="12" cy="12" r="10"\s*\/>/);assert.match(asset,/<path d="m9 9 6 6m0-6-6 6"\s*\/>/);
  assert.doesNotMatch(asset,/fill-rule|#fff|white|<rect|fill="currentColor"/i,'Circle interior and space around the stroked X stay transparent on normal/hover backgrounds');
}
{
  const h=await harness(),v=h.view;
  v.notices={kind:'setup',sync(){return this.kind;}};
  v.webhooks={status:'Live CI: configure webhooks in Settings › Plugins › Git',sync(){},stop(){}};
  const tree=h.render(),body=find(tree,'git-panel-body'),footer=find(tree,'git-live-ci-footer');
  assert.ok(footer);assert.ok(footer.attrs.flex_none);assert.equal(body.kids.at(-1),footer,'The info notice is fixed below the scrolling PR area, not above it');
  assert.equal(footer.attrs.border_t[0],1);assert.ok(find(footer,'git-live-ci-icon'));assert.ok(find(footer,'git-live-ci-info').attrs.rounded);
  assert.deepEqual(find(footer,'git-live-ci-title').kids.flatMap(n=>n.kids),['Set up Git in','Settings']);
  assert.equal(find(footer,'git-live-ci-icon').attrs.size[0],16);assert.equal(find(footer,'git-live-ci-title').attrs.text_size[0],12,'Configuration notice matches the normal empty-state text size');assert.equal(find(footer,'git-live-ci-title').attrs.text_color[0],'dim');assert.ok(find(footer,'git-live-ci-title').attrs.font_normal,'Configuration notice uses regular text, including its Settings link');assert.equal(find(footer,'git-live-ci-title').attrs.font_semibold,undefined);
  const info=find(footer,'git-live-ci-info');assert.equal(info.attrs.px[0],8);assert.equal(info.attrs.py[0],6);assert.equal(info.attrs.gap[0],8);
  assert.equal(find(footer,'git-live-ci-message'),undefined,'The banner contains only the requested Set up Git in Settings phrase');
  const link=find(footer,'git-live-ci-settings');assert.deepEqual(link.kids,['Settings']);assert.ok(link.attrs.underline);
  link.attrs.on_click[0]({},h.cx);assert.equal(h.opened.at(-1).mod,'custom-settings');assert.equal(h.opened.at(-1).props.section,'plugins');assert.equal(h.opened.at(-1).props.plugin,'git');
  for(const state of ['disconnected','connecting']){v.webhooks.state=state;assert.deepEqual(find(h.render(),'git-live-ci-title').kids.flatMap(n=>n.kids),['Set up Git in','Settings']);}
  v.webhooks.status='';assert.ok(find(h.render(),'git-live-ci-footer'),'Socket connection cannot hide missing prerequisites');
  assert.equal(h.opened.at(-1).props.pluginSection,undefined,'Setup keeps Requirements expanded and search empty');
  v.notices.kind='repository';const repositoryTree=h.render();assert.deepEqual(find(repositoryTree,'git-live-ci-title').kids.flatMap(n=>n.kids),['Add this repo in','Settings']);
  const repositoryLink=find(repositoryTree,'git-live-ci-settings');v.repo={name:'owner/other',owner:'owner'};
  repositoryLink.attrs.on_click[0]({},h.cx);
  assert.equal(h.opened.at(-1).props.pluginSection,'repository');assert.equal(h.opened.at(-1).props.pluginSearch,'owner/repo','Deep link captures the rendered repository, not a later agent selection');
  v.notices.kind=null;assert.equal(find(h.render(),'git-live-ci-footer'),undefined,'Configured/enrolled or non-Git context has no notice');
  h.disable();link.attrs.on_click[0]({},h.cx);assert.equal(h.opened.length,2,'A disabled/stale link cannot open Settings');
}
console.log('PASS: webhook-driven all-PR updates, no GitHub polling, header sweep, coalescing, pagination, stale/disabled guards, beyond-page pins and merge-conflict icons/tooltips');
