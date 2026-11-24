// Separate packaged mods must earn their own action proof; sidebar tokens are not authority.
import assert from 'node:assert/strict';
import {loadMod} from '../tools/plugin-harness.mjs';

const element=()=>{const n={kids:[],attrs:{}};let p;return p=new Proxy(n,{get:(o,k)=>k in o?o[k]:k==='then'?undefined:k==='when'?(yes,fn)=>yes?fn(p):p:k==='child'?c=>{o.kids.push(c);return p;}:k==='children'?cs=>{o.kids.push(...cs);return p;}:(...args)=>{o.attrs[k]=args;return p;}});};
const find=(n,id)=>n?.attrs?.id?.[0]===id?n:(n?.kids??[]).map(c=>find(c,id)).find(Boolean);
const modules={
 'main.js':'src/features/menu/main.js','space-colors.js':'src/features/menu/space-colors.js',
 'space-color-state.js':'src/shared/space-color-state.js','ui.js':'src/ui/ui.js',
 'gpui-kit':{View:class{},div:element,svg:asset=>element().asset(asset)},
 'gpui-base':{v_flex:element,h_flex:element,Popover:{new:element},Input:{new:element}},
 'directory.js':{displaySpace:s=>s},'settings-dialog.js':{openSettings(){assert.fail('Unexpected Settings action');}},
 'tab-moves.js':{inspectTabMove(){assert.fail('Unexpected tab move');},tabMoveDestinations:()=>[],requestTabMove:()=>false},
 'sidebar-footer.js':{footerItems:()=>[]},'customization-updates.js':{customizationUpdateAvailable:()=>false},
 'modal-layout.js':{divider:element,dividerHeight:()=>0},'tab-rename.js':{requestInlineTabRename:()=>false},
 'space-rename.js':{requestInlineSpaceRename:()=>false},'close-space.js':{closeWithConfirmation(){assert.fail('Unexpected close');}},
};
const paletteKeys=['custom.space-colors','space.colors','custom.space-color-auto'];
const tick=async()=>{for(let i=0;i<30;i++)await Promise.resolve();};
async function fixture(machine=null) {
 const id=value=>machine?`${machine}/${value}`:value,parent=id('coordinator'),child=id('fm-crew-home');
 const state={'custom.plugins':{crew:{enabled:true}},'custom.spaces.preferences':{connectFleetToCoordinator:true},
  'custom.space-colors':{[parent]:'ansi2',[child]:'ansi1'},'space.colors':{[parent]:'ansi2',[child]:'ansi1'},'custom.space-color-auto':{[child]:true}};
 const groups=[{id:parent,machine,tabs:[{id:id('c')}]},{id:child,machine,tabs:[{id:id('w')}]}];
 const panes=[{pane:id('cp'),tab:id('c'),terminal:id('t1')},{pane:id('wp'),tab:id('w'),terminal:id('t2')}];
 const terminals=[{address:id('t1'),state:'live',labels:{'custom.crew.home':'1'}},
  {address:id('t2'),state:'live',labels:{'crew.task':'task','crew.home':'home','herdr.space':'fm-crew-home'}}];
 const status={home:'C:/fixture/.crew',owner:{terminal:'t1',live:true},tasks:[{id:'task',terminal:'t2',state:'working',pr:null}]};
 let props={tab:'space',target:{id:child},overlay:'colour-menu'},requests=0,insideInit=false,hold=false,fail=false,now=100000;
 const jobs=[],waiting=[],warnings=[],closed=[];
 const cx={focus_handle:()=>({focus(){}}),notify(){assert.equal(insideInit,false,'No synchronous notification in menu init');},stop_propagation(){},
  spawn(fn){jobs.push(Promise.resolve(fn(cx)));}}; // Native spawn may begin inline.
 const drain=async()=>{while(jobs.length)await Promise.all(jobs.splice(0));};
 const host={shared:k=>state[k],setShared:(k,v)=>{assert.equal(insideInit,false,'Lifecycle must yield before shared writes');state[k]=v;},
  spaces:()=>groups,panes:()=>panes,terminals:()=>terminals,machines:()=>[{name:machine,layout:'ready'}],checking:()=>false,
  props:()=>props,agents:()=>[],keys:()=>[],updates:()=>({app:{ready:null}}),theme:()=>({foreground:'#eeeeee',muted:'#aaaaaa',dim:'#888888',hover:'#333333',border:'#444444',popover:'#222222'}),
  closeOverlay:o=>closed.push(o),openOverlay(){assert.fail('Unexpected overlay');},notify:n=>warnings.push(n),run(){assert.fail('No native command');},
  hc:async args=>{assert.equal(insideInit,false,'Status IO must yield out of menu init');assert.match(args.at(-1),/status '--all' '--json'/);requests++;
   if(hold)await new Promise(resolve=>waiting.push(resolve));if(fail)throw Error('Crew unavailable');
   return {code:0,stdout:JSON.stringify({code:0,stdout:Buffer.from(JSON.stringify(status)).toString('base64'),stderr:'',timed_out:false})};}};
 const load=mod=>loadMod({host,modules,mod,globals:{Date:class extends Date{static now(){return now;}}},
  entry:`export * as registry from './plugins.js';${mod==='custom-menu'?"export {default as Menu} from './main.js';":''}`});
 const sidebar=await load('custom-spaces');
 sidebar.registry.pluginEvent('spaces.refresh',{cx});await drain();
 assert.equal(sidebar.registry.pluginWorkspaceLinks().length,1,'Sidebar freshly verifies its own packaged provider');
 const menu=await load('custom-menu');
 assert.equal(menu.registry.pluginWorkspaceLinks({presentation:true}).length,1,'Shared identity restores the menu presentation');
 assert.equal(menu.registry.pluginWorkspaceLinks().length,0,'Sidebar verification does not authorize a separate menu instance');
 const open=(source=child)=>{props={...props,target:{id:source}};const view=new menu.Menu();insideInit=true;try{view.init({},cx);}finally{insideInit=false;}return view;};
 const palette=()=>JSON.stringify(paletteKeys.map(k=>state[k]));
 return {state,parent,child,status,groups,sidebar,menu,cx,open,drain,palette,warnings,closed,waiting,
  get requests(){return requests;},set hold(v){hold=v;},set fail(v){fail=v;},advance(ms){now+=ms;}};
}

// Mouse and keyboard, explicit colour and Automatic, from either origin, locally/remotely.
for(const machine of [null,'pc2'])for(const origin of ['parent','child'])for(const automatic of [false,true]) {
 const f=await fixture(machine),view=f.open(f[origin]),before=f.palette();
 assert.equal(f.requests,1,'Opening queues verification without synchronous IO');
 view.chooseColor('ansi5',f.cx);assert.equal(f.palette(),before,'A click before menu verification cannot borrow the sidebar proof');
 await f.drain();
 assert.equal(f.requests,2,'A cold menu initiates its own bounded status read through the generic lifecycle');
 assert.equal(f.menu.registry.pluginWorkspaceLinks().length,1,'The calling menu now witnesses fresh verification');
 const tree=view.render(f.cx);
 assert.equal(find(tree,'space-color-2').attrs.border_color[0],'#eeeeee','Palette still reflects the captured coordinator');
 if(automatic) {
  tree.attrs.on_key_down[0]({key:'right'},f.cx); // selected green, index 2
  view.render(f.cx).attrs.on_key_down[0]({key:'left'},f.cx);
  view.render(f.cx).attrs.on_key_down[0]({key:'left'},f.cx);
  view.render(f.cx).attrs.on_key_down[0]({key:'enter'},f.cx);
  assert.equal(f.state['custom.space-colors'][f.parent],undefined);assert.equal(f.state['custom.space-color-auto'][f.parent],true);
 } else {
  find(tree,'space-color-5').attrs.on_click[0]({},f.cx);
  assert.equal(f.state['custom.space-colors'][f.parent],'ansi5');
 }
 assert.equal(f.closed.at(-1),'colour-menu','Verified choice succeeds instead of always refusing');
 assert.equal(f.state['custom.space-colors'][f.child],'ansi1');assert.equal(f.state['custom.space-color-auto'][f.child],true);
 const reopened=f.open(f[origin]);await f.drain();assert.equal(reopened.colorReady(),true);
 assert.equal(f.requests,2,'Reopening within this instance freshness window reuses its witnessed verification');
}

// A menu can witness the sidebar's shared in-flight read without launching a duplicate.
{
 const f=await fixture();f.hold=true;
 f.sidebar.registry.pluginEvent('spaces.refresh',{cx:f.cx,force:true});await tick();assert.equal(f.requests,2);
 const view=f.open();await tick();assert.equal(f.requests,2,'The shared lease coalesces menu/sidebar verification');
 const before=f.palette();view.chooseColor('ansi5',f.cx);assert.equal(f.palette(),before,'An unfinished read is not authority');
 f.waiting.shift()();f.hold=false;await f.drain();
 assert.equal(f.menu.registry.pluginWorkspaceLinks().length,1,'The menu witnesses completion of the joined read');
 view.chooseColor('ansi5',f.cx);assert.equal(f.state['custom.space-colors'][f.parent],'ansi5');
}

// Fresh action permission never bypasses the captured pair or stale/missing/disabled guards.
for(const change of ['home','disable','plugin','missing','failure','expired']) {
 const f=await fixture(),view=f.open();
 if(change==='failure')f.fail=true;
 await f.drain();const before=f.palette();
 if(change==='home') {
  f.status.home='C:/replacement/.crew';f.menu.registry.pluginEvent('workspace.context.refresh',{cx:f.cx,force:true});await f.drain();
  assert.equal(f.menu.registry.pluginWorkspaceLinks().length,1,'Replacement is independently verified but not the captured binding');
 }
 if(change==='disable')f.state['custom.spaces.preferences'].connectFleetToCoordinator=false;
 if(change==='plugin')f.state['custom.plugins'].crew.enabled=false;
 if(change==='missing')f.groups.pop();
 if(change==='expired')f.advance(30001);
 view.chooseColor('ansi5',f.cx);assert.equal(f.palette(),before,`${change}: no stale colour write or fleet fallback`);
 assert.equal(f.warnings.at(-1).title,'Space colour unavailable');assert.equal(f.closed.length,0);
 if(change==='failure') {const retry=f.open();await f.drain();assert.equal(retry.colorReady(),false,'Failed menu verification cannot borrow persisted success');}
}
console.log('PASS separate packaged sidebar/menu verification, deferred init, both-origin local/remote palettes, mouse/keyboard Automatic, in-flight witnessing/coalescing, fleet preference preservation and stale binding guards');
