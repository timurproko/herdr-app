import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const KEY='custom.panel.tabs';
async function harness() {
  let phase='event',now=100000,delayed=false;
  const panel={id:'panel',hidden:false},body={id:'panel-body',active:'files'};
  const root={id:'root',children:[panel,body]},values=new Map([['layout','Custom']]),calls=[],jobs=[],pending=[];
  const spaces=[{id:'pc2/s1',active:true,tabs:[{id:'pc2/a',active:true},{id:'pc2/b'},{id:'pc2/c'}]},
    {id:'local',tabs:[{id:'a'}]}];
  function apply(name,args) {
    if(name==='layout.select')body.active=args.child;
    else if(name==='layout.show')panel.hidden=false;
    else if(name==='layout.hide')panel.hidden=true;
    else throw Error(`Unexpected command ${name}`);
  }
  const host={spaces:()=>spaces,layout:()=>root,shared:key=>values.has(key)?JSON.parse(JSON.stringify(values.get(key))):null,
    setShared:(key,value)=>{assert.notEqual(phase,'render','No shared-state writes during render');values.set(key,JSON.parse(JSON.stringify(value)));},
    run:(name,args)=>{assert.notEqual(phase,'render','Projection must yield out of render');calls.push([name,JSON.parse(JSON.stringify(args))]);if(delayed)pending.push([name,args]);else apply(name,args);}};
  const context=vm.createContext({Date:class extends Date {static now(){return now;}}});
  const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/panel-state.js',import.meta.url),'utf8'),{context});
  const panels=[{id:'files'},{id:'changes'}], disabled=new Set();
  const plugins={sidebarPanels:({enabled=true}={})=>panels.filter(p=>!enabled||!disabled.has(p.id))};
  await mod.link(name=>{const values=name==='./plugins.js'?plugins:host;return new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});});await mod.evaluate();
  const api=mod.namespace,owner={},cx={sleep:async()=>{},notify(){assert.notEqual(phase,'render');},spawn:fn=>jobs.push(fn(cx))};
  const sync=()=>{phase='render';try{api.syncPanelState(owner,cx);}finally{phase='event';}};
  const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
  const switchTo=id=>{for(const s of spaces){s.active=s.tabs.some(t=>t.id===id);for(const t of s.tabs)t.active=t.id===id;}};
  return {api,owner,cx,values,calls,jobs,pending,panel,body,root,spaces,sync,drain,switchTo,disabled,
    state:()=>values.get(KEY),snapshot:()=>JSON.parse(JSON.stringify(api.panelSnapshot())),delay:()=>{delayed=true;},
    acknowledge:()=>{const next=pending.shift();if(next)apply(...next);},advance:()=>{now+=3000;}};
}
{
  const h=await harness();h.sync();await h.drain();h.switchTo('pc2/b');h.sync();await h.drain();
  assert.equal(h.state(),undefined);assert.deepEqual(h.calls,[],'Without pins, navigation keeps existing native global behavior');
  h.api.togglePanelPin();assert.equal(h.api.panelPinned(),true);assert.deepEqual(h.state().default,{open:true,view:'files'});
  h.api.changePanel({view:'changes',open:true});assert.equal(h.state().pins['pc2/b'].view,'changes');
  assert.equal(h.state().default.view,'files','Pinned choices do not contaminate other tabs');
  h.sync();await h.drain();h.switchTo('pc2/a');h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'files'});
  h.api.changePanel({open:false});assert.deepEqual(h.state().default,{open:false,view:'files'});
  h.sync();await h.drain();h.switchTo('pc2/b');h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'changes'},'Returning restores the pinned open Git panel');
  h.switchTo('pc2/a');h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:false,view:'files'},'Unpinned tabs retain their normal closed state');
  h.api.changePanel({view:'files',open:true});h.api.togglePanelPin();h.sync();await h.drain();
  h.api.changePanel({open:false});h.sync();await h.drain();assert.equal(h.state().pins['pc2/a'].open,false);
  h.switchTo('pc2/b');h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'changes'});
  h.switchTo('pc2/a');h.sync();await h.drain();assert.equal(h.panel.hidden,true,'Pins remember closed state too');
  h.api.togglePanelPin();h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'files'},'Unpin returns to the shared sidebar choice');
  assert.equal(h.api.panelPinned(),false);
}
{
  const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});h.sync();await h.drain();
  const old=h.api.panelTab();h.switchTo('a');h.sync();await h.drain();assert.equal(h.api.panelPinned(),false,'Qualified tab IDs isolate machines/spaces');
  assert.equal(h.api.changePanel({view:'changes',open:true},old),false,'A popup cannot retarget a different tab');
  assert.equal(h.api.togglePanelPin(old),false);assert.equal(h.body.active,'files');
  h.switchTo('pc2/a');h.sync();h.switchTo('pc2/b');await h.drain();assert.equal(h.body.active,'files','Late projection cannot affect a newly selected tab');
  h.sync();await h.drain();assert.equal(h.body.active,'files');
}
{
  const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});h.sync();await h.drain();
  h.switchTo('pc2/b');h.sync();h.api.changePanel({view:'changes',open:false});await h.drain();
  assert.equal(h.panel.hidden,true);assert.equal(h.state().default.view,'changes','A newer explicit choice wins over queued tab restoration');
}
{
  const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});h.sync();await h.drain();
  h.switchTo('pc2/b');h.sync();await h.drain();h.sync();await h.drain();
  h.panel.hidden=true;h.sync();await h.drain();assert.equal(h.state().default.open,false,'Native layout changes update the shared choice only on the settled current tab');
  h.switchTo('pc2/a');h.sync();await h.drain();assert.equal(h.panel.hidden,false);assert.equal(h.body.active,'changes');
}
{
  const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});h.sync();await h.drain();
  h.switchTo('pc2/b');h.sync();await h.drain();h.api.changePanel({open:false});h.sync();await h.drain();
  h.delay();h.switchTo('pc2/a');h.sync();await h.drain();const state=JSON.stringify(h.state()),count=h.calls.length;
  h.sync();await h.drain();assert.equal(h.calls.length,count,'Pending native acknowledgement never creates a command loop');
  h.acknowledge();h.sync();await h.drain();assert.equal(JSON.stringify(h.state()),state,'Intermediate stack/visibility frames cannot overwrite pins');
  h.acknowledge();h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'changes'});
  assert.equal(h.pending.length,0);assert.equal(h.owner.panelApplying,null);
}
{
  const h=await harness();h.values.set(KEY,{version:9,default:{open:true,view:'files'},pins:{}});
  const before=JSON.stringify(h.state());assert.equal(h.api.togglePanelPin(),false);h.sync();await h.drain();
  assert.equal(JSON.stringify(h.state()),before,'Unknown future state versions are preserved');assert.deepEqual(h.calls,[]);
}
{
  const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});
  h.switchTo('pc2/b');h.sync();await h.drain();assert.equal(h.body.active,'files','A newly mounted controller restores the unpinned default, not the last pinned layout');
  h.values.set('layout','main');h.switchTo('pc2/a');h.sync();await h.drain();assert.equal(h.body.active,'files','Other layouts are never changed');
}
{
  const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});h.sync();await h.drain();
  const moved=h.spaces[0].tabs.shift();h.spaces.push({id:'pc2/moved',tabs:[moved]});
  h.switchTo('pc2/b');h.sync();await h.drain();h.switchTo('pc2/a');h.sync();await h.drain();
  assert.equal(h.api.panelPinned(),true);assert.equal(h.body.active,'changes','A pin follows its stable tab ID when moved to another space');
}
{
  const h=await harness();assert.equal(h.api.panelPinned(),false,'A tab is unpinned by default');
  h.api.togglePanelPin(undefined,true);const pinned=JSON.stringify(h.state());
  h.api.togglePanelPin(undefined,true);assert.equal(JSON.stringify(h.state()),pinned,'Repeated pressed=true events never flip an already-pinned tab');
  h.api.togglePanelPin(undefined,false);const unpinned=JSON.stringify(h.state());
  h.api.togglePanelPin(undefined,false);assert.equal(JSON.stringify(h.state()),unpinned);assert.equal(h.api.panelPinned(),false);
}
for (const disabled of [[],['files'],['changes'],['files','changes']]) {
  const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});
  const saved=JSON.stringify(h.state());disabled.forEach(id=>h.disabled.add(id));
  h.sync();await h.drain();
  assert.equal(h.panel.hidden,disabled.length===2);
  assert.equal(h.body.active,disabled.includes('changes')&&!disabled.includes('files')?'files':'changes');
  assert.equal(JSON.stringify(h.state()),saved,'Disabling projects the UI without rewriting stored pins/defaults');
  h.disabled.clear();h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'changes'});
}
{
 const h=await harness();h.disabled.add('files');h.disabled.add('changes');h.sync();await h.drain();
 assert.equal(h.panel.hidden,true);assert.deepEqual(h.state().default,{open:true,view:'files'},'A masked global choice is captured before hiding');
 h.disabled.delete('changes');h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'changes'});
 assert.equal(h.api.changePanel({view:'files',open:true}),false,'Stale commands cannot select disabled views');
 h.disabled.clear();h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'files'});
}
{
 const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});h.disabled.add('changes');h.sync();
 h.disabled.clear();await h.drain();assert.equal(h.body.active,'changes','Queued disabled-view projections are discarded after a newer toggle');
}
{
 const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:true});h.disabled.add('changes');h.sync();await h.drain();
 h.api.changePanel({open:false});h.sync();await h.drain();
 assert.equal(h.state().pins['pc2/a'].view,'changes','Visibility toggles preserve a disabled preferred view');
 h.api.changePanel({open:true});h.sync();await h.drain();
 h.body.active='changes';h.sync();await h.drain();assert.equal(h.body.active,'files','Native commands cannot leave a disabled panel visible');
 h.disabled.clear();h.sync();await h.drain();assert.equal(h.body.active,'changes');
}
console.log('PASS: plugin availability combinations, preserved pins/global choices, stale toggles and per-tab sidebar pins, unpinned default/desired-state events, isolated shared default, Files/Git/open/closed restoration, native/agent navigation, moved tabs and pending-ack/stale guards');
