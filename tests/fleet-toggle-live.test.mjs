// Separate mounted Settings/Spaces sandboxes, real registry/Crew discovery and
// production row rendering. No Core, user preferences or native input is used.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';

function element(asset) {
 const n={asset,attrs:{},kids:[]};let e;
 return e=new Proxy(n,{get(o,k){
  if(k in o)return o[k];if(k==='then')return undefined;
  if(k==='when')return(yes,fn)=>yes?fn(e):e;
  if(k==='child')return child=>{if(child!=null)o.kids.push(child);return e;};
  if(k==='children')return children=>{o.kids.push(...children);return e;};
  return(...args)=>{o.attrs[k]=args;return e;};
 }});
}
const nodes=e=>e?.kids?[e,...e.kids.flatMap(nodes)]:[];
const find=(tree,id)=>nodes(tree).find(e=>e.attrs.id?.[0]===id);
const plain=value=>JSON.parse(JSON.stringify(value));
const theme={foreground:'#eeeeee',muted:'#aaaaaa',dim:'#888888',chrome:'#111111',background:'#222222',border:'#444444',selected:'#333333',hover:'#333333',ansi2:'#22aa44',ansi3:'#cc8833',ansi6:'#11aaaa'};

async function mounted() {
 const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:false}},copies=[],refreshes=new Set(),jobs=[],requests=[];
 let rendering=false,dialogOpen=true,mode='success';
 const pending=[];
 const groups=[],panes=[],terminals=[];
 for(const machine of [null,'pc2']) {
  const q=id=>machine?`${machine}/${id}`:id;
  groups.push({id:q('coordinator'),name:'coordinator',machine,tabs:[{id:q('c')}]},{id:q('other'),name:'other',machine,tabs:[]},{id:q('fm-crew-home'),name:'fleet',machine,tabs:[{id:q('w')}]});
  panes.push({tab:q('c'),pane:q('cp'),terminal:q('t1')},{tab:q('w'),pane:q('wp'),terminal:q('t2')});
  terminals.push({address:q('t1'),state:'live',labels:{'custom.crew.home':'1'}},{address:q('t2'),state:'live',labels:{'crew.task':'task','crew.home':'home','herdr.space':'fm-crew-home'}});
 }
 const colors=Object.fromEntries(groups.map(s=>[s.id,s.name==='coordinator'?theme.ansi2:s.name==='fleet'?theme.ansi3:theme.ansi6]));
 state['space.colors']={...colors};state['custom.space-colors']={...colors};
 const topology=JSON.stringify({groups,panes,terminals,colors});
 const assertEvent=()=>assert.equal(rendering,false,'No render-time effects');
 const host={shared:k=>state[k],setShared(k,v){assertEvent();if(JSON.stringify(state[k])===JSON.stringify(v))return;state[k]=plain(v);for(const copy of copies)refreshes.add(copy);},
  spaces:()=>groups,panes:()=>panes,terminals:()=>terminals,machines:()=>[{name:null,layout:'ready'},{name:'pc2',layout:'ready'}],checking:()=>false,
  props:()=>({}),theme:()=>theme,layout:()=>({id:'sidebar',size:{px:248}}),window:()=>({active:true}),settings:()=>({zoom:1}),
  notify(){assert.fail('No toast');},run(){assert.fail('No native mutation');},openOverlay(){assert.fail('No overlay replacement');},closeOverlay(){dialogOpen=false;assert.fail('The dialog must stay open');},
  exec(){assert.fail('No Git probe');},watchFolder(){assert.fail('No watcher');},
  async hc(args){assertEvent();if(args[0]==='machine')return {code:0,stdout:'{"machines":[]}'};
   assert.match(args.at(-1),/status '--all' '--json' '--discover-prs'/);
   const machine=args.includes('--on')?args[args.indexOf('--on')+1]:null;
   requests.push(machine);
   const result={home:`${machine??'local'}/.crew`,owner:{terminal:'t1',live:true},tasks:[{id:'task',terminal:'t2',state:'working',pr:null}]};
   const reply=type=>{
    if(type==='error')throw Error('Verification transport failed');
    const output=type==='ambiguous'?{...result,owner:null}:result;
    return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(output)).toString('base64'),stderr:''})};
   };
   if(mode==='defer')return new Promise((resolve,reject)=>pending.push(type=>{try{resolve(reply(type));}catch(error){reject(error);}}));
   return reply(mode);
  }};
 const common={
  'gpui-kit':{View:class{},div:element,svg:element,PathBuilder:{}},
  'gpui-base':{v_flex:element,h_flex:element,Input:{},Popover:{},Popup:{},ScrollHandle:{new:()=>({})}},
  'ui.js':'src/ui/ui.js','reorder.js':'src/ui/reorder.js',
  'space-color-state.js':'src/shared/space-color-state.js','space-preferences.js':'src/shared/space-preferences.js',
  'workspace-links.js':'src/shared/workspace-links.js','space-title.js':'src/ui/space-title.js',
  'directory.js':{displaySpace:s=>s,spaceDirectory:()=>({cwd:null})},
  'sidebar-scroll.js':{sidebarScroll:(_o,id,_t,rows)=>element().id(id).children(rows)},
  'space-rename.js':{beginSpaceRename(){},cancelSpaceRename(){},saveSpaceRename(){},syncSpaceRename(){}},
  'tab-arrival.js':{startTabArrivals(){},tabArrivalMotion:(_o,e)=>e},
 };
 const mount=async(kind)=>{
  const timers=[],copy={};
  const cx={notify(){assertEvent();refreshes.add(copy);},focus_handle(){assertEvent();return{focus(){assertEvent();}};},
   spawn(fn){const job=Promise.resolve(fn(cx));jobs.push(job);return job;},timer:{every(ms,fn){timers.push({ms,fn});},after(){}},stop_propagation(){}};
  const api=await loadMod({host,mod:`custom-${kind}`,globals:{localStorage:{getItem:()=>null,setItem(){}}},
   modules:{...common,'main.js':'src/features/spaces/main.js','spaces-ui.js':'src/features/settings/spaces-ui.js'},
   entry:kind==='settings'?'export {spacesPage} from "./spaces-ui.js";export * as r from "./plugins.js";':'export {default as Spaces} from "./main.js";export * as r from "./plugins.js";'});
  Object.assign(copy,{cx,api,timers});
  if(kind==='spaces'){
   copy.view=new api.Spaces();copy.view.init({},cx);copy.render=()=>copy.tree=copy.view.render(cx);
  }else{
   copy.owner={heading:(_t,title)=>element().child(title),row:(_t,label,_about,toggle)=>element().child(label).child(toggle),
    toggle:(_t,id,value,fn)=>element().id(id).checked(value).on_click(fn)};
   copy.render=()=>copy.tree=api.spacesPage(copy.owner,theme);
  }
  copies.push(copy);refreshes.add(copy);return copy;
 };
 const settings=await mount('settings'),sidebar=await mount('spaces');
 const paint=()=>{for(const copy of [...refreshes]){refreshes.delete(copy);rendering=true;try{copy.render();}finally{rendering=false;}}};
 const drain=async()=>{while(jobs.length){await Promise.all(jobs.splice(0));}paint();};
 const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();paint();};
 const release=(count=pending.length,type='success')=>{assert.ok(count<=pending.length);for(let i=0;i<count;i++)pending.shift()(type);};
 const flip=key=>{assert.ok(dialogOpen);find(settings.tree,`st-spaces-${key}`).attrs.on_click[0]({},settings.cx);paint();};
 const rows=machine=>nodes(sidebar.tree).filter(n=>n.attrs.id?.[0]?.startsWith('space-content-')).filter(n=>groups.find(s=>`space-content-${s.id}`===n.attrs.id[0])?.machine===machine);
 const frame=attached=>{
  assert.ok(dialogOpen,'Assertions never close Settings');
  for(const machine of [null,'pc2']){
   const q=id=>machine?`${machine}/${id}`:id;
   assert.deepEqual(rows(machine).map(r=>r.attrs.id[0]),(attached?['coordinator','fm-crew-home','other']:['coordinator','other','fm-crew-home']).map(id=>`space-content-${q(id)}`));
   const parent=find(sidebar.tree,`space-content-${q('coordinator')}`),child=find(sidebar.tree,`space-content-${q('fm-crew-home')}`);
   // Herdr 0.1.17 defaults/keys.json binds Alt+N to space.select:N;
   // window.rs resolves that against model.spaces[N-1], not our projection.
   // Keep every advertised shortcut truthful, including the unrelated row.
   for(const row of rows(machine)){
    const nativeIndex=groups.findIndex(s=>`space-content-${s.id}`===row.attrs.id[0]);
    assert.equal(row.kids[0].kids[0],String(nativeIndex+1),'Expanded badge denotes the native selection index');
   }
   for(const record of sidebar.view.ordered().filter(r=>r.w.machine===machine)){
    const expected=String(groups.findIndex(s=>s.id===record.w.id)+1);
    rendering=true;
    try{
     const rail=sidebar.view.compact(record,theme);
     assert.equal(find(rail,`space-badge-${record.w.id}`).kids[0],expected,'Compact rail advertises the same native shortcut');
     assert.equal(find(rail,`space-link-${record.w.id}`),undefined,'Rail never shows a chain');
     sidebar.view.drag.leaving={id:record.w.id,phase:'arm'};
     const chip=sidebar.view.dragPreview(theme);
     assert.equal(chip.kids[0].kids[0],expected,'Drag chip retains that native number, not the projected position');
     assert.equal(find(chip,`space-link-${record.w.id}`),undefined,'Drag chip never shows a chain');
    }finally{sidebar.view.drag.leaving=null;rendering=false;}
   }
   assert.equal(child.kids[0].attrs.bg[0],attached?theme.ansi2:theme.ansi3);
   for(const id of ['coordinator','fm-crew-home']){
    const row=find(sidebar.tree,`space-content-${q(id)}`),chain=find(sidebar.tree,`space-link-${q(id)}`);
    assert.equal(Boolean(chain),attached,'Both expanded-row chains follow the live preference and verified pair');
    if(attached){
     assert.equal(row.kids.at(-2),chain,'Each chain immediately precedes Crew');
     assert.equal(row.kids.at(-1).attrs.id[0],`space-tag-${q(id)}-crew-0`);
     assert.equal(chain.attrs.size[0],16);assert.equal(chain.kids[0].attrs.size[0],14);
     assert.equal(chain.kids[0].attrs.text_color[0],theme.muted);
    }
   }
  }
  assert.equal(JSON.stringify({groups,panes,terminals,colors}),topology,'No native order, terminal, focus or saved colour mutation');
 };
 await drain();frame(false);
 return{state,settings,sidebar,requests,flip,drain,tick,paint,frame,release,setMode:value=>mode=value};
}

const m=await mounted();
m.flip('fleet');
assert.equal(m.state['custom.spaces.preferences'].connectFleetToCoordinator,true,'The preference is written with Settings open');
await m.drain();
assert.equal(m.requests.length,2,'The toggle itself starts verification for local and remote machines, without the next Spaces timer or a close event');
m.frame(true);
m.flip('fleet');await m.drain();m.frame(false);
m.flip('fleet');await m.drain();m.frame(true);
// The sibling switches already save synchronously and do not start fleet reads.
const reads=m.requests.length;
for(const [id,key,value]of [['confirm','confirmLastTab',true],['close','closeOnLastTab',false]]){
 m.flip(id);assert.equal(m.state['custom.spaces.preferences'][key],value);await m.drain();m.frame(true);
}
assert.equal(m.requests.length,reads);
// No completed read: shared invalidations must not fabricate the pair while
// the switch already shows on. Inline spawn is intentional (the native runtime
// may enter a task immediately); rendering always guards focus and notify.
m.flip('fleet');await m.drain();m.frame(false);
m.setMode('defer');m.flip('fleet');await m.tick();m.frame(false);
assert.equal(m.requests.length,reads+2);
m.release();await m.drain();m.frame(true);
// Disabling while reads are pending revokes the generation immediately. An old
// success cannot resurrect attachment, even if the user has enabled again.
m.flip('fleet');await m.drain();m.frame(false);
m.flip('fleet');await m.tick();m.frame(false);
const beforeReversal=m.requests.length;
m.flip('fleet');m.frame(false);
m.flip('fleet');await m.tick();m.frame(false);
assert.equal(m.requests.length,beforeReversal+2,'A new generation starts its own verification');
m.release(2);await m.tick();m.frame(false);
m.release();await m.drain();m.frame(true);
// Both failed transport and completed no-owner evidence leave a cold enable
// independent; neither invents inherited colour or a chain.
for(const failure of ['error','ambiguous']){
 m.flip('fleet');await m.drain();m.frame(false);
 m.setMode(failure);m.flip('fleet');await m.drain();m.frame(false);
 m.flip('fleet');await m.drain();m.frame(false);
 m.setMode('success');m.flip('fleet');await m.drain();m.frame(true);
}
console.log('PASS mounted Settings local/remote fleet toggles: immediate lifecycle, pending/failure/reversal guards, no close event or render effects, sibling synchronous writes');
