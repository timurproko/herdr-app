import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';

function element() {
  const node={attrs:{},kids:[]};let proxy;
  return proxy=new Proxy(node,{get(target,key){
    if(key in target)return target[key];
    if(key==='then')return undefined;
    if(key==='when')return(yes,fn)=>yes?fn(proxy):proxy;
    if(key==='child')return child=>{node.kids.push(child);return proxy;};
    if(key==='children')return children=>{node.kids.push(...children);return proxy;};
    return(...args)=>{node.attrs[key]=args;return proxy;};
  }});
}
const all=node=>node&&typeof node==='object'?[node,...node.kids.flatMap(all)]:[];
const find=(node,id)=>all(node).find(n=>n.attrs.id?.[0]===id);
const text=node=>typeof node==='string'?node:(node?.kids??[]).map(text).join('');
const U={font:12,meta:11,icon:16,tinyIcon:12,gap:8,radius:6};
const host={props:()=>null,closeOverlay(){},openOverlay(){},nextCommand(){},settings:()=>({zoom:1}),theme:()=>({})};
const modules={
  'main.js':'src/plugins/git/mod/main.js','pulls.js':'src/plugins/git/mod/pulls.js',
  'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},'gpui-base':{h_flex:element,v_flex:element},
  'ui.js':{U,headerTools:e=>e,reveal:e=>e,subtleActionFill:()=>'',refreshButton:element},
  'aggregate.js':{AggregatePulls:class{}},'agent-links.js':{AgentLinks:class{}},'pin-swap.js':{PinSwap:class{},PIN_SWAP_MS:320},
  'webhooks.js':{GitWebhooks:class{}},'notices.js':{GitNotices:class{}},'location.js':{location:()=>({})},
  'panel-pin.js':{panelPin:element},'panel-state.js':{changePanel(){}},'sidebar-title.js':{sidebarTitle:element},
  'settings-dialog.js':{openSettings(){}},'plugins.js':{sidebarPanelEnabled:()=>true},
  'panel-kit.js':{headerTool:element,contextMenu:element,panelMessage:element},
};
const {Main,facts}=await loadMod({host,modules,mod:'custom-changes',entry:'export {default as Main} from "./main.js"; export * as facts from "./pulls.js";'});
const panel=new Main();panel.agentLinks={related:()=>null};
const t={foreground:'#eeeeee',muted:'#999999',dim:'#666666',raised:'#222222',ansi1:'red',ansi2:'green',ansi3:'yellow',ansi5:'purple'};
const labels=[{name:'🤖 Under review',color:'840479'},{name:'🚀 Ready · with a deliberately long label name',color:'ffffff'}];
const source={number:17,title:'Shared row',url:'https://github.com/example/repo/pull/17',author:{login:'owner'},createdAt:'2026-11-20T10:00:00Z',body:'- [x] done',statusCheckRollup:[{name:'CI',conclusion:'SUCCESS',status:'COMPLETED'}],labels,reviewDecision:'APPROVED'};
for(const state of ['OPEN','CLOSED','MERGED'])for(const coordinator of [false,true])for(const ghost of [false,true]) {
  const pr=facts.pullRow({...source,state},'owner');if(coordinator)pr.key='example/repo#17';
  const prefix=ghost?'swap-':'',id=pr.key??17;
  const row=panel.pullRow(t,pr,ghost),meta=find(row,`${prefix}pr-meta-${id}`),byline=find(row,`${prefix}pr-byline-${id}`);
  assert.equal(find(row,`${prefix}pr-owner-${id}`),undefined);assert.ok(!text(row).includes('Owner'));
  assert.equal(text(byline),`#17·${pr.byline}`);assert.equal(byline.attrs.overflow_hidden.length,0);
  assert.deepEqual(meta.kids.filter(n=>n.attrs.id).map(n=>n.attrs.id[0]),['tasks','checks','labels','review'].map(kind=>`${prefix}pr-${kind}-${id}`));
  assert.equal(meta.attrs.h[0],18);assert.equal(meta.attrs.min_w[0],0);assert.equal(meta.attrs.flex_wrap,undefined);assert.ok(meta.attrs.overflow_hidden);
  const strip=find(row,`${prefix}pr-labels-${id}`);assert.equal(strip.attrs.min_w[0],0);assert.equal(strip.attrs.h[0],18);assert.ok(strip.attrs.flex_1);assert.ok(strip.attrs.overflow_hidden);
  assert.equal(strip.attrs.tooltip[0],labels.map(l=>l.name).join('\n'));
  assert.equal(meta.attrs.tooltip[0],strip.attrs.tooltip[0],'Completely clipped strips retain a metadata hover target');
  for(const [index,label] of labels.entries()) {
    const pill=find(row,`${prefix}pr-label-${id}-${index}`);
    assert.equal(text(pill),label.name);assert.equal(pill.attrs.tooltip[0],label.name);assert.equal(pill.attrs.bg[0],`#${label.color}`);
    assert.equal(pill.attrs.text_color[0],index?'#000000':'#ffffff');assert.equal(pill.attrs.h[0],18);
    assert.equal(pill.attrs.min_w[0],0);assert.ok(pill.attrs.max_w_full);assert.ok(pill.attrs.overflow_hidden);assert.ok(pill.kids[0].attrs.truncate);
  }
  assert.equal(text(find(row,`${prefix}pr-review-${id}`)),'Approved');
  assert.equal(Boolean(row.attrs.on_mouse_down),!ghost);assert.equal(Boolean(row.attrs.on_click),!ghost);
  assert.equal(Boolean(row.attrs.on_size_change),!ghost&&!coordinator,'Ordinary measured row callbacks survive');
}
for(const tasks of [false,true])for(const checks of [false,true])for(const assigned of [[],labels]) {
  const pr=facts.pullRow({...source,state:'OPEN',body:tasks?source.body:'',statusCheckRollup:checks?source.statusCheckRollup:[],labels:assigned,reviewDecision:''},'owner');
  const row=panel.pullRow(t,pr),meta=find(row,'pr-meta-17');
  const groups=meta.kids.filter(n=>n.attrs.id);
  assert.deepEqual(groups.map(n=>n.attrs.id[0]),[...(tasks?['pr-tasks-17']:[]),...(checks?['pr-checks-17']:[]),...(assigned.length?['pr-labels-17']:[])]);
  assert.equal(meta.kids.length,groups.length?groups.length*2-1:0,'No leading/trailing or empty separators');
  assert.equal(meta.attrs.h[0],18,'Label add/remove cannot change status height');
  if(groups.length)assert.equal(meta.kids[0],groups[0]);
  for(const group of groups)assert.equal(group.attrs.min_w[0],0,'Groups can shrink in narrow panels');
  if(!assigned.length)assert.equal(find(row,'pr-labels-17'),undefined,'No label placeholder');
}
const fallback=panel.labelPill(t,{name:'Untrusted colour',color:'red;bad'},'fallback');
assert.equal(fallback.attrs.bg[0],t.raised);assert.equal(fallback.attrs.text_color[0],t.foreground);
assert.equal(facts.pullRow({...source,author:null},'owner').byline.startsWith('opened '),true);
console.log('PASS shared ordinary/coordinator Open/Closed/pinned-compatible/ghost PR row structure, no Owner, tasks/checks/labels order, exact emoji colours, contrasting text, bounded-height truncation and complete tooltips (render-tree constraints, not native pixel proof)');
