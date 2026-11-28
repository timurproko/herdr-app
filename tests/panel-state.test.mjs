import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
const KEY='custom.panel.tabs',SESSION='custom.panel.session';
async function harness(values=new Map([['layout','Custom']]),memory=new Map()) {
  let phase='event',now=100000,delayed=false;
  const panel={id:'panel',hidden:false},body={id:'panel-body',active:'files'};
  const root={children:[panel,body]},calls=[],jobs=[],pending=[];
  const spaces=[{id:'pc2/s1',active:true,tabs:[{id:'pc2/a',active:true},{id:'pc2/b'}]},{id:'local',tabs:[{id:'a'}]}];
  let source={space:'pc2/s1',tab:'pc2/a',terminal:'pc2/t1',cwd:'D:/repo',on:'pc2',app:'a1',pullNumber:109};
  function apply(name,args) {if(name==='layout.select')body.active=args.child;else panel.hidden=name==='layout.hide';}
  const host={spaces:()=>spaces,layout:()=>root,shared:key=>values.has(key)?JSON.parse(JSON.stringify(values.get(key))):null,
    setShared:(key,value)=>{assert.notEqual(phase,'render');values.set(key,JSON.parse(JSON.stringify(value)));},
    run:(name,args)=>{assert.notEqual(phase,'render');calls.push([name,args]);if(delayed)pending.push([name,args]);else apply(name,args);}};
  const memoryApi={getItem:key=>memory.get(key)??null,setItem:(key,value)=>{assert.notEqual(phase,'render');memory.set(key,value);},removeItem:key=>{assert.notEqual(phase,'render');memory.delete(key);}};
  const context=vm.createContext({sessionStorage:memoryApi,window:{refresh(){assert.notEqual(phase,'render');}},Date:class extends Date {static now(){return now;}}});
  const helper=new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/panel-context.js',import.meta.url),'utf8'),{context});await helper.link(()=>{});await helper.evaluate();
  helper.namespace.registerPanelSource('files',()=>source);helper.namespace.registerPanelSource('changes',()=>source);
  const mod=new vm.SourceTextModule(fs.readFileSync(new URL('../src/shared/panel-state.js',import.meta.url),'utf8'),{context});
  const disabled=new Set(),plugins={sidebarPanels:({enabled=true}={})=>['files','changes'].filter(id=>!enabled||!disabled.has(id)).map(id=>({id}))};
  await mod.link(name=>{if(name==='./panel-context.js')return helper;const exports=name==='./plugins.js'?plugins:host;return new vm.SyntheticModule(Object.keys(exports),function(){for(const[k,v]of Object.entries(exports))this.setExport(k,v);},{context});});await mod.evaluate();
  const api=mod.namespace,owner={},cx={sleep:async()=>{},notify(){assert.notEqual(phase,'render');},spawn:fn=>jobs.push(fn(cx))};
  const sync=()=>{phase='render';try{api.syncPanelState(owner,cx);}finally{phase='event';}};
  const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
  const switchTo=id=>{for(const s of spaces){s.active=s.tabs.some(t=>t.id===id);for(const t of s.tabs)t.active=t.id===id;}};
  return {api,helper,values,memory,memoryApi,calls,pending,panel,body,spaces,owner,sync,drain,switchTo,disabled,
    source:value=>source=value,state:()=>values.get(KEY),pin:()=>JSON.parse(memory.get(SESSION)??'null'),snapshot:()=>JSON.parse(JSON.stringify(api.panelSnapshot())),delay:()=>delayed=true,
    acknowledge:()=>{const next=pending.shift();if(next)apply(...next);},advance:()=>now+=3000};
}
{
 const h=await harness();h.sync();await h.drain();h.switchTo('pc2/b');h.sync();await h.drain();
 assert.equal(h.state(),undefined);assert.deepEqual(h.calls,[],'Unpinned navigation stays native');
 assert.equal(h.api.togglePanelPin(),true);const original=JSON.stringify(h.api.panelSource());
 assert.deepEqual(h.state(),{version:2,default:{open:true,view:'files'}});assert.equal(h.api.panelPinned(),true);
 h.api.changePanel({view:'changes'});h.sync();await h.drain();h.switchTo('a');h.sync();await h.drain();
 assert.deepEqual(h.snapshot(),{open:true,view:'changes'});assert.equal(h.api.panelPinned(),true);
 assert.equal(JSON.stringify(h.api.panelSource()),original,'Cross-machine navigation retains the whole source');
 h.source({space:'local',tab:'a',terminal:'new',cwd:'/new',on:null});
 h.api.changePanel({view:'files'});assert.equal(JSON.stringify(h.api.panelSource()),original,'View changes do not recapture');
 h.api.changePanel({open:false});h.sync();await h.drain();h.switchTo('pc2/b');h.sync();await h.drain();assert.equal(h.panel.hidden,true);
 h.api.changePanel({open:true});assert.equal(h.api.panelPinned(),true);
 h.api.togglePanelPin(undefined,false);assert.equal(h.api.panelPinned(),false);assert.equal(h.api.panelSource(),null);assert.equal(h.pin(),null);
 assert.deepEqual(h.snapshot(),{open:true,view:'files'});assert.equal(JSON.stringify(h.state()).includes('D:/repo'),false,'No durable source');
}
{
 const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes'});const held=h.pin();
 const copy=await harness(h.values,h.memory);assert.equal(copy.api.panelPinned(),true,'Another mod sees the session hold');
 assert.equal(copy.api.panelSource().terminal,held.source.terminal);
 const restart=await harness(h.values);assert.equal(restart.api.panelPinned(),false);assert.equal(restart.api.panelSource(),null,'App restart has no held context');
 restart.sync();await restart.drain();assert.equal(restart.body.active,'files');
}
{
 const h=await harness();h.values.set(KEY,{version:1,default:{open:false,view:'changes'},pins:{'pc2/a':{space:'pc2/s1',open:true,view:'files'}}});
 assert.equal(h.api.panelPinned(),false);h.sync();await h.drain();assert.deepEqual(h.state(),{version:2,default:{open:false,view:'changes'}});assert.equal(h.panel.hidden,true);
 assert.equal(h.pin(),null,'Legacy per-tab pins never invent a source');
}
{
 const h=await harness();h.api.togglePanelPin();const stale=h.api.panelTab();h.api.changePanel({view:'changes'});
 assert.equal(h.api.togglePanelPin(stale,false),false,'Stale same-tab toggle cannot release a newer hold');
 assert.equal(h.api.changePanel({view:'files'},stale),false);h.switchTo('a');assert.equal(h.api.togglePanelPin(stale,false),false);
 h.sync();h.api.changePanel({open:false});await h.drain();assert.equal(h.panel.hidden,true,'Explicit action supersedes queued restore');
 h.spaces.forEach(s=>s.active=false);assert.equal(h.api.togglePanelPin(undefined,false),true,'Unpin remains available without a tab/source');
}
{
 const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes',open:false});h.sync();await h.drain();
 h.delay();h.switchTo('a');h.body.active='files';h.panel.hidden=false;h.sync();await h.drain();
 const count=h.calls.length,state=JSON.stringify(h.pin());h.sync();await h.drain();assert.equal(h.calls.length,count,'No pending-ack command loop');
 h.acknowledge();h.sync();await h.drain();assert.equal(JSON.stringify(h.pin()),state,'Intermediate native frames cannot corrupt hold');
 h.acknowledge();h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:false,view:'changes'});
}
for(const disabled of [[],['files'],['changes'],['files','changes']]) {
 const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes'});const saved=JSON.stringify(h.pin());disabled.forEach(id=>h.disabled.add(id));
 h.sync();await h.drain();assert.equal(h.panel.hidden,disabled.length===2);assert.equal(JSON.stringify(h.pin()),saved);
 h.disabled.clear();h.sync();await h.drain();assert.deepEqual(h.snapshot(),{open:true,view:'changes'});
}
{
 const h=await harness();h.api.togglePanelPin();h.api.changePanel({view:'changes'});h.disabled.add('changes');h.sync();await h.drain();
 h.api.changePanel({open:false});assert.equal(h.pin().view,'changes','Close does not erase disabled preference');
 h.api.changePanel({view:'files',open:true});h.disabled.clear();h.sync();await h.drain();assert.equal(h.body.active,'files','Deliberate fallback choice wins');
}
{
 const h=await harness();h.disabled.add('files');h.disabled.add('changes');h.sync();await h.drain();assert.equal(h.panel.hidden,true);
 h.disabled.delete('changes');h.sync();await h.drain();assert.equal(h.body.active,'changes');assert.equal(h.api.changePanel({view:'files'}),false);
 h.disabled.clear();h.sync();await h.drain();assert.equal(h.body.active,'files');
}
{
 const h=await harness();h.values.set(KEY,{version:9,default:{open:true,view:'files'}});const original=JSON.stringify(h.state());
 assert.equal(h.api.togglePanelPin(),false);assert.equal(h.api.changePanel({view:'changes'}),false);h.sync();await h.drain();assert.equal(JSON.stringify(h.state()),original);assert.deepEqual(h.calls,[]);
}
{
 const h=await harness();h.source({cwd:'/bad\npath'});assert.equal(h.api.togglePanelPin(),false);
 h.source({cwd:'/valid',extra:'credential'});h.api.togglePanelPin();assert.equal('extra' in h.pin().source,false);
 const before=JSON.stringify(h.pin());h.api.togglePanelPin(undefined,true);assert.equal(JSON.stringify(h.pin()),before,'Desired-state events are idempotent');
 h.values.set('layout','main');assert.equal(h.api.panelSource(),null);h.sync();await h.drain();
}
console.log('PASS: one session-only sidebar source, cross-mod sharing, unpinned restart, legacy migration, stale controls, native acknowledgement and availability guards');
