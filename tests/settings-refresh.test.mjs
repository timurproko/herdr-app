// Real Settings refresh controllers + shared feedback UI, with cached/read-only fixtures.
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {fileURLToPath} from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
function element(){const node={attrs:{},kids:[]};let el;el=new Proxy(node,{get:(o,k)=>k in o?o[k]:k==='when'?(yes,fn)=>yes?fn(el):el:k==='child'?v=>{o.kids.push(v);return el;}:(...args)=>{o.attrs[k]=args;return el;}});return el;}
const shell={key:'bash',name:'Bash',run:['bash']};
const facts={platform:'windows',running:true,elevated:false,supported:true,savedMode:'standard',remember:false};
const context=vm.createContext({}),cache=new Map();
const noop=()=>{};
const profiles={applyProfileVisibility:(_machine,items)=>items,cachedProfiles:()=>[],composeProfiles:()=>[],loadProfiles:async()=>[{key:'a1',available:true}],
  cachedTerminalShells:()=>[shell],warmTerminalShells:async()=>[shell],loadTerminalShells:async()=>[shell]};
for(const name of ['updateProfile','addProfile','removeProfile','moveProfile','validateProfile','composeTerminals','selectedTerminal','updateTerminal','moveTerminal','validateTerminal','profileConfig','selectTerminalShell'])profiles[name]=noop;
const mocks={
  'gpui-kit':{div:element,svg:element,image:element},
  'gpui-base':{h_flex:element,v_flex:element,Input:{},InputState:{},Popup:{},Popover:{},Scrollbar:{vertical:element}},
  './host.js':{settings:()=>({}),machines:()=>[],openOverlay:()=>assert.fail('Refresh opens no dialogs'),appHome:()=>'/fixture',shared:()=>null,setShared:()=>assert.fail('Refresh is read-only'),
    exec:async(_command,args)=>{assert.equal(JSON.parse(args.at(-1)).request.action,'inspect');return{code:0,stdout:JSON.stringify(facts)};}},
  './profiles.js':profiles,
  './profile-drag.js':Object.fromEntries(['cancelProfileDrag','startProfileDrag','overProfileDrag','finishProfileDrag'].map(name=>[name,noop])),
  './terminal-drag.js':Object.fromEntries(['cancelTerminalDrag','terminalDragValid','startTerminalDrag','overTerminalDrag','finishTerminalDrag'].map(name=>[name,noop])),
  './modal-layout.js':{M:{bodyInset:16},...Object.fromEntries(['sectionAction','sectionRow','sectionStack','editorActionButton'].map(name=>[name,noop]))},
  './plugins.js':{pluginById:()=>null,pluginIsEnabled:()=>false,pluginSetting:()=>null},
};
function moduleFor(file){if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));return cache.get(file);}
const main=new vm.SourceTextModule('import * as p from "./profiles-ui.js"; import * as t from "./terminals-ui.js"; import * as c from "./permissions.js"; import * as ui from "./ui.js"; export {p,t,c,ui};',{context});
await main.link(name=>{
  if(mocks[name]){const key=`mock:${name}`;if(!cache.has(key))cache.set(key,new vm.SyntheticModule(Object.keys(mocks[name]),function(){for(const[k,v]of Object.entries(mocks[name]))this.setExport(k,v);},{context}));return cache.get(key);}
  return moduleFor(name==='./ui.js'?path.join(root,'src/ui/ui.js'):path.join(root,'src/features/settings',name));
});
await main.evaluate();
const {p,t,c,ui}=main.namespace;
for(const [section,id,reload]of [['profiles','st-profile-refresh',p.reloadProfiles],['terminals','st-terminal-refresh',t.reloadTerminals],['core','st-core-refresh',c.reloadPermissions]]){
  const owner={section,profileMachine:null,profileSerial:0,profileShells:[shell],profileShellMachine:null,profileShellLoading:false,permissionDrafts:new Map(),permissionPolls:new Set()};
  let clock=0;const timers=[],jobs=[];
  const cx={notify(){},stop_propagation(){},spawn:fn=>jobs.push(fn),timer:{after:(ms,fn)=>{assert.equal(ms,600);const timer={at:clock+ms,fn,cancelled:false};timers.push(timer);return{cancel:()=>{timer.cancelled=true;}};}}};
  const advance=ms=>{clock+=ms;for(let i=0;i<timers.length;){if(timers[i].at<=clock){const timer=timers.splice(i,1)[0];if(!timer.cancelled)timer.fn(cx);}else i++;}};
  const drain=async()=>{while(jobs.length)await jobs.shift()(cx);};
  const busy=()=>Boolean(section==='profiles'?owner.profileLoading:section==='terminals'?owner.profileShellLoading:owner.terminalPermissions?.get(owner.profileMachine)?.loading);
  const button=()=>ui.refreshButton({}, {id,icon:'refresh.svg',owner,scope:JSON.stringify([section,owner.profileMachine]),busy:busy(),onClick:()=>reload(owner,cx)});
  const check=expected=>{assert.equal(button().attrs.tooltip,undefined);assert.ok(button().attrs.accessibility_label[0]);assert.equal(button().attrs.disabled[0],expected,section);assert.equal(button().kids[0].attrs.spin?.[0],expected?900:undefined,section);};

  // Initial entry, including warm terminal caches which never set the real loading flag.
  reload(owner,cx);check(true);await drain();assert.equal(busy(),false);check(true);
  if(section==='profiles')assert.equal(owner.profileItems[0].available,true,'Fresh profiles are applied immediately');
  if(section==='terminals')assert.equal(owner.profileShells[0],shell,'Warm cached terminals remain visible');
  if(section==='core')assert.equal(owner.terminalPermissions.get(null).result.running,true,'Core facts update without a fake delay');
  advance(599);check(true);advance(1);check(false);

  // Leaving and returning to this already-loaded section restarts feedback.
  owner.section='look';advance(50);owner.section=section;reload(owner,cx);await drain();check(true);
  advance(300);owner.section='look';owner.section=section;reload(owner,cx);await drain();
  advance(300);check(true); // The first entry's original deadline must not clear this hold.
  advance(299);check(true);advance(1);check(false);

  // Explicit header refresh keeps duplicate-click protection and the same minimum.
  const original=button();original.attrs.on_click[0]({},cx);const count=jobs.length;
  original.attrs.on_click[0]({},cx);assert.equal(jobs.length,count);await drain();check(true);
  advance(600);check(false);

  // A different machine does not inherit old feedback, but its own reload gets 600ms.
  reload(owner,cx);await drain();advance(300);owner.profileMachine='pc2';check(false);
  reload(owner,cx);await drain();advance(300);check(true);advance(300);check(false);
  const scheduled=timers.length;button();button();assert.equal(timers.length,scheduled,'Rendering never schedules a feedback timer');
}
console.log('PASS: Profiles/Terminals/Core initial entry, cached re-entry, rapid section switching, machine changes, manual clicks and immediate real results');
