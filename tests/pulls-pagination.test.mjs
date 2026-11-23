import assert from 'node:assert/strict';
import {kitModule,withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
import {PinSwap,PIN_SWAP_MS} from '../src/plugins/git/mod/pin-swap.js';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
function element() {
  const node = {attrs:{},kids:[]}; let proxy;
  proxy = new Proxy(node,{get(target,key) {
    if (key in target) return target[key];
    if (key === 'when') return (yes,fn)=>yes ? fn(proxy) : proxy;
    if (key === 'child') return child=>{node.kids.push(child);return proxy;};
    if (key === 'children') return children=>{node.kids.push(...children);return proxy;};
    return (...args)=>{node.attrs[key]=args;return proxy;};
  }});
  return proxy;
}
function find(node,id) {
  if (!node || typeof node !== 'object') return null;
  if (node.attrs?.id?.[0] === id) return node;
  return node.kids?.map(child=>find(child,id)).find(Boolean);
}
const page = (start,count,cursor,hasMore=true,labels=[]) => JSON.stringify({data:{repository:{pullRequests:{
  totalCount:100,nodes:Array.from({length:count},(_,i)=>({number:start+i,title:`PR ${start+i}`,state:'OPEN',labels:{nodes:labels}})),
  pageInfo:{endCursor:cursor,hasNextPage:hasMore},
}}}});
async function harness(state) {
  const context = vm.createContext({localStorage:{getItem:()=>null,setItem(){}}});
  const place = {cwd:'/repo',on:'pc2',terminal:'pc2/t1',space:'pc2/s1',tab:'pc2/tab'};
  const pending = [], tasks = [], calls = [];
  const host = {settings:()=>({zoom:1}),theme:()=>({}),layout:()=>({id:'panel',children:[{id:'panel-body',active:'changes'}]}),
    window:()=>({platform:'windows'}),hc:async()=>({code:1}),run(){},openOverlay(){},props:()=>null,closeOverlay(){},notify(){},nextCommand(){},
    exec:(cmd,args,options)=>new Promise((resolve,reject)=>{const call={cmd,args,options,resolve,reject};pending.push(call);calls.push(call);}),
  };
  const modules = {
    './aggregate.js':{AggregatePulls:class {sync(){return false;}stop(){}}},
    './ci-fix.js':{CIFix:class {sync(){}stop(){}}},
    './notices.js':{GitNotices:class {sync(){return null;}stop(){}retryNow(){}}},
    './webhooks.js':{GitWebhooks:class {sync(){} stop(){}}},
    'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},
    'gpui-base':{h_flex:element,v_flex:element},
    './host.js':host,'./location.js':{location:()=>place},
    './agent-links.js':{AgentLinks:class { related(){return null;} refresh(){} }},
    './pin-swap.js':{PinSwap,PIN_SWAP_MS},
    './plugins.js':{sidebarPanelEnabled:()=>true},'./sidebar-title.js':{sidebarTitle:element},
    './panel-pin.js':{panelPin:(_t,{id})=>element().id(id)},'./panel-state.js':{changePanel(){}},

    './ui.js':{U:{},panelTitle:element,headerTools:x=>x,reveal:x=>x,subtleActionFill:()=>'',refreshButton:element,emptyState:element,menuSurface:(_t,el)=>el,menuHeading:(_t,text)=>element().child(text),slot:el=>el},
  };
  const main = new vm.SourceTextModule(fs.readFileSync(path.join(root,'src/plugins/git/mod/main.js'),'utf8'),{context});
  const panelKit=kitModule(context);withKitUi(modules['./ui.js'],element);
  await main.link(specifier=> {
    if(specifier==='./panel-kit.js')return panelKit;
    if(specifier==='./settings-dialog.js')return new vm.SourceTextModule(fs.readFileSync(path.join(root,'src/ui/settings-dialog.js'),'utf8'),{context});
    if (modules[specifier]) return new vm.SyntheticModule(Object.keys(modules[specifier]),function(){
      for(const [key,value] of Object.entries(modules[specifier]))this.setExport(key,value);
    },{context});
    if(specifier==='./plugins/git/ci-footer.js')return new vm.SourceTextModule(fs.readFileSync(path.join(root,'src/plugins/git/ci-footer.js'),'utf8'),{context});
    assert.equal(specifier,'./pulls.js');
    return new vm.SourceTextModule(fs.readFileSync(path.join(root,'src/plugins/git/mod/pulls.js'),'utf8'),{context});
  });
  await main.evaluate();
  const view = new main.namespace.default();
  view.resetRepository();view.view=state;view.root='/repo';view.on='pc2';view.context=JSON.stringify([place.cwd,place.on]);
  view.repo={name:'owner/repo',owner:'owner'};
  const cx = {notify(){},spawn:fn=>tasks.push(fn(cx))};
  const tick = async()=>{for(let i=0;i<16;i++)await Promise.resolve();};
  const take = ()=>{assert.ok(pending.length,'Expected one request');return pending.shift();};
  async function reply(stdout,code=0) {const call=take();call.resolve({code,stdout,stderr:code?'network failed':''});await tick();return call;}
  const render = ()=>view.renderPulls({hover:'hover',border:'border'});
  const scroll = (bottom,delta=-40,kind='wheel')=>{
    const tree=render(),content=find(tree,'pulls-content'),frame=find(tree,'pulls-scroll-frame');
    const event={position:{x:10,y:500},delta:{y:delta},bounds:{y:bottom-1000,height:1000}};
    const method=kind==='wheel'?'on_scroll_wheel':'on_mouse_move';
    content.attrs[method][0](event,cx);
    frame.attrs[method][0]({...event,bounds:{y:0,height:600}},cx);
  };
  return {view,cx,pending,tasks,calls,place,take,reply,tick,render,scroll};
}

for(const state of ['open','closed']) {
  const h=await harness(state),v=h.view;
  v.loadPulls(state,h.cx,true);
  assert.equal(h.pending.length,1);
  assert.ok(h.pending[0].args.some(a=>a.includes('first:10')));
  assert.ok(h.pending[0].args.some(a=>a.includes(state==='open'?'states:[OPEN]':'states:[CLOSED,MERGED]')));
  assert.equal(h.pending[0].options.on,'pc2');
  assert.equal(h.pending[0].options.cwd,'/repo');
  await h.reply(page(1,10,'page-1'));
  await h.reply(JSON.stringify({data:{repository:{open:{totalCount:100},closed:{totalCount:200}}}}));
  assert.equal(v.pulls[state].length,10);
  assert.equal(v.pages[state].cursor,'page-1');
  assert.equal(v.pullLoading,false);
  h.render();h.render();
  assert.equal(h.pending.length,0,'Rendering must not fetch extra pages');
  h.scroll(1200);assert.equal(h.pending.length,0,'No fetch near the top');
  h.scroll(650,40);assert.equal(h.pending.length,0,'Scrolling upwards never fetches');
  v.agentPull=5;
  assert.ok(find(find(h.render(),'active-pull'),'pr-5'),'The active PR remains outside the scrolling content');
  const pin=find(h.render(),'active-pull-content-5');
  assert.equal(pin.attrs.opacity[0],0.75,'Only a changed pin gets a subtle fade');
  assert.equal(pin.attrs.transition[0],'opacity');assert.equal(pin.attrs.transition[1].duration,120);
  pin.attrs.on_size_change[0]({},h.cx);
  assert.equal(find(h.render(),'active-pull-content-5').attrs.opacity[0],1);
  v.agentPull=5;h.render();
  assert.equal(find(h.render(),'active-pull-content-5').attrs.opacity[0],1,'An unchanged pin never animates again');
  h.scroll(650);
  assert.equal(h.pending.length,1,'Scrolling near the bottom fetches exactly one page');
  assert.ok(h.pending[0].args.includes('after=page-1'));
  assert.equal(find(h.render(),'pulls-more').attrs.disabled[0],true);
  h.scroll(650);v.morePulls(state,h.cx);
  assert.equal(h.pending.length,1,'Wheel bursts and clicks are single-flight');
  await h.reply(page(11,10,'page-2'));
  assert.equal(v.pulls[state].length,20);
  assert.equal(v.pages[state].expanded,true);
  assert.equal(h.pending.length,0,'Appending does not refetch counts or previous pages');
  v.pullsAt[state]=0;
  assert.equal(v.pullsDue(state),false,'Background TTL refresh must not discard expanded rows/scroll position');

  // Errors preserve cursor and all loaded rows; retry is explicit, not an
  // automatic retry loop from mouse movement at the end of the list.
  h.scroll(650);await h.reply('',1);
  assert.equal(v.pulls[state].length,20);assert.equal(v.pages[state].cursor,'page-2');
  assert.equal(v.pageError.state,state);
  h.scroll(650);assert.equal(h.pending.length,0);
  find(h.render(),'pulls-more').attrs.on_click[0]({},h.cx);
  assert.ok(h.pending[0].args.includes('after=page-2'));
  await h.reply(page(20,2,'page-3',false));
  assert.equal(v.pulls[state].length,21,'Overlapping pages deduplicate PR numbers');
  assert.equal(v.pages[state].hasMore,false);
  assert.equal(find(h.render(),'pulls-more'),undefined);
  h.scroll(650);assert.equal(h.pending.length,0,'End of list stops pagination');

  // The other tab starts at its own first page and keeps an independent cursor.
  const other=state==='open'?'closed':'open';v.view=other;
  v.loadPulls(other,h.cx,true);
  assert.ok(!h.pending[0].args.some(a=>a.startsWith('after=')));
  await h.reply(page(100,10,'other-1'));
  await h.reply('{}');
  assert.equal(v.pages[state].cursor,'page-3');
  assert.equal(v.pages[other].cursor,'other-1');
  assert.equal(v.pulls[state].length,21);
  v.view=state;v.morePulls(other,h.cx);assert.equal(h.pending.length,0,'Hidden tabs cannot page from old callbacks');

  // Manual refresh restarts at 10 and replaces stale pages only on success.
  v.loadPulls(state,h.cx,true);
  assert.ok(!h.pending[0].args.some(a=>a.startsWith('after=')));
  assert.equal(v.pulls[state].length,21);
  await h.reply(page(200,10,'new-1'));await h.reply('{}');
  assert.equal(v.pulls[state].length,10);assert.equal(v.pages[state].expanded,false);
  assert.equal(v.pulls[state][0].number,200);

  // A linked PR beyond page 1 is fetched once, pinned without loading older
  // list pages, filtered to this tab, and never duplicated when paged in.
  v.agentPull=908;v.loadRelatedPull(h.cx);
  assert.deepEqual(Array.from(h.pending[0].args.slice(0,3)),['pr','view','908']);
  assert.ok(h.pending[0].args.at(-1).split(',').includes('labels'));
  await h.reply(JSON.stringify({number:908,title:'Older active PR',state:state==='open'?'OPEN':'MERGED',labels:[{name:'🤖 Under review',color:'840479'}]}));
  assert.equal(v.relatedPull.labels[0].name,'🤖 Under review');
  assert.ok(find(find(h.render(),'active-pull'),'pr-908'));
  assert.equal(v.pulls[state].length,10);assert.equal(v.pages[state].cursor,'new-1');
  v.loadRelatedPull(h.cx);assert.equal(h.pending.length,0,'Related lookups are cached');
  v.pulls[state].push(v.relatedPull);
  const linked=h.render();
  assert.ok(find(find(linked,'active-pull'),'pr-908'));
  assert.equal(find(find(linked,`pulls-list-${state}`),'pr-908'),undefined);
  v.pulls[state].pop();
  v.relatedPull.state=state==='open'?'merged':'open';
  assert.equal(find(h.render(),'active-pull'),undefined,'A related PR in the other state cannot pin into this tab');
  v.relatedPull.state=state==='open'?'open':'merged';

  // Label events use the same snapshot: both loaded tabs + older active PR,
  // never a request for each row. Bursts coalesce behind the in-flight read.
  const labels=[{name:'🤖 Under review',color:'840479'}];
  for (const [cycle,assigned] of [[0,labels],[1,labels],[2,[]]]) {
    const before=h.calls.length;
    if(cycle!==1)v.queueWebhook({repository:'owner/repo',event:'pull_request',action:cycle===2?'unlabeled':'labeled'},h.cx);
    await h.tick();
    if(cycle===0){v.queueWebhook({repository:'owner/repo',event:'pull_request'},h.cx);v.queueWebhook({repository:'owner/repo',event:'pull_request'},h.cx);}
    await h.reply(page(200,10,'refresh-open',true,assigned));
    await h.reply(page(100,10,'refresh-closed',true,assigned));
    const targeted=h.pending[0];assert.equal(targeted.args[0],'pr');assert.ok(targeted.args.at(-1).includes('labels'));
    await h.reply(JSON.stringify({number:908,state:state==='open'?'OPEN':'MERGED',labels:assigned}));
    await h.reply('{}');
    assert.equal(v.pulls.open[0].labels.length,assigned.length);
    assert.equal(v.pulls.closed[0].labels.length,assigned.length);
    assert.equal(v.relatedPull.labels.length,assigned.length);
    assert.equal(h.calls.length-before,cycle===0?5:cycle===1?3:4,'Only loaded pages, older PR and counts are read; burst has one follow-up');
  }

  // A pending page cannot restore a repository after focus/location changes.
  v.morePulls(state,h.cx);const old=h.take();
  h.place.cwd='/elsewhere';v.refresh(h.cx);
  assert.equal(v.pulls[state],null);assert.equal(v.pages[state].cursor,null);
  old.resolve({code:0,stdout:page(210,10,'stale')});await h.tick();
  assert.equal(v.pulls[state],null);assert.equal(v.pages[state].cursor,null);
  await h.reply('',128);await Promise.all(h.tasks);
}
console.log('PASS: Open/Closed cursor pages of 10, near-bottom loading, pinning, single-flight, deduplication, independent tabs, retry, end-of-list, refresh and stale-page guards');
