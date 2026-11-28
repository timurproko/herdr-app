import assert from 'node:assert/strict';
import {withKitUi} from './support/panel-kit.mjs';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {build} from '../tools/build.mjs';
import {loadMod} from '../tools/plugin-harness.mjs';
const {output}=build(),state=new Map(),commands=[],closed=[],jobs=[],reads=[],executions=[],timers=[];
let props={summary:true},focuses=0;
const preferences={enabled:true,summary:true,remaining:true,claudeAutomatic:false,pins:['saved-quota']};
state.set('custom.usage.local.preferences',structuredClone(preferences));
state.set('custom.usage.remote:pc2.preferences',structuredClone(preferences));
const widget={id:'sidebar-usage',content:{mod:'custom-usage',props:{summary:true}}};
const host={shared:key=>state.get(key),setShared:(key,value)=>state.set(key,structuredClone(value)),
  layout:()=>({id:'sidebar',children:[widget]}),spaces:()=>[{active:true,machine:null}],machines:()=>[{name:'pc2'}],
  window:()=>({active:true,platform:'windows'}),panes:()=>[],home:()=>null,settings:()=>({zoom:1}),props:()=>props,focused:()=>null,terminals:()=>[],appHome:()=>'/fixture',
  run:(name,args)=>{commands.push([name,args]);widget.hidden=name==='layout.hide';},notify(){},
  closeOverlay:id=>closed.push(id),openOverlay(){throw Error('Disabled Usage must not open anything');},
  readTextFile:()=>new Promise(resolve=>reads.push(resolve)),
  exec:(...args)=>new Promise(resolve=>executions.push({args,resolve})),
};
const {r}=await loadMod({host,modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:'import * as r from "./plugins.js";export {r};'});
const plugin=r.pluginById('usage');assert.equal(r.pluginEnabled(plugin),true,'Usage preserves the enabled default');
function element(){const node={kids:[],attrs:{}};let proxy;return proxy=new Proxy(node,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(proxy):proxy:k==='child'?child=>{n.kids.push(child);return proxy;}:k==='children'?children=>{n.kids.push(...children);return proxy;}:(...args)=>{n.attrs[k]=args;return proxy;}});}
const context=vm.createContext({}),cache=new Map();
const ui={U:{field:32},DIALOG_SCROLL:{},slot:x=>x,control:(_t,el=element())=>el,itemHover(){},
  dialogHeader:element,dialogSurface:(_t,el)=>el,dropdown:element,menuSurface:(_t,el)=>el,dialogScrollFrame:el=>el,dialogScrollbar:el=>el,dialogScrollBody:el=>el,
  emptyState:element,refreshButton:element,refreshFeedbackActive:()=>false,startRefreshFeedback:()=>true,
  // The shared plugin renderer (plugin-pages.js draws declared pages with it) and its kit.
  button:element,chevron:element,spinner:element,description:element,searchField:element,dropdownPlacement:()=>({above:false,height:350})};
withKitUi(ui,element);
const synthetic=values=>new vm.SyntheticModule(Object.keys(values),function(){for(const [key,value]of Object.entries(values))this.setExport(key,value);},{context});
function moduleFor(file){if(!cache.has(file))cache.set(file,new vm.SourceTextModule(fs.readFileSync(file,'utf8'),{context,identifier:file}));return cache.get(file);}
async function load(file){const mod=moduleFor(file);if(mod.status==='unlinked')await mod.link((name,from)=>{
 if(name==='gpui-kit')return synthetic({View:class{},div:element,svg:element,image:element});
 if(name==='gpui-base')return synthetic({h_flex:element,v_flex:element,Textarea:{new:element},TextareaState:{new:o=>{let value=o?.value??'';return {on(){},value:()=>value,set_value:v=>{value=v;}};}},Toggle:{new:element},Popover:{new:element},Popup:{new:element},HoverCard:{new:element},InputState:{new:()=>({on(){},value:()=>'',set_value(){}})},Input:{new:element},Checkbox:{new:element},Scrollbar:{vertical:element},ScrollHandle:{new:()=>({scroll_to_item(){}})}});
 if(name==='./host.js')return synthetic(host);if(name==='./plugins.js')return synthetic(r);
 if(name==='./ui.js')return synthetic(ui);if(name==='./look.js')return synthetic({liveTheme:()=>({})});
 if(name==='./machine-picker.js')return synthetic({machinePicker:element});
 return moduleFor(path.resolve(path.dirname(from.identifier),name));
});await mod.evaluate();return mod.namespace;}
const root=path.join(output,'mods/custom-usage'),store=await load(path.join(root,'store.js'));
const Usage=(await load(path.join(root,'main.js'))).default;
const footer=await load(path.join(output,'mods/custom-workspace-chrome/sidebar-footer.js'));
const pages=await load(path.join(output,'mods/custom-settings/plugin-pages.js'));
const cx={spawn:fn=>jobs.push(fn),sleep:async()=>{},notify(){},focus_handle:()=>({focus(){focuses++;}}),timer:{every:(_ms,fn)=>timers.push(fn)}};
const drain=async()=>{while(jobs.length)await jobs.shift()(cx);};
const tick=async()=>{for(let i=0;i<12;i++)await Promise.resolve();};
const owner={settingsMachine:null,heading:element,row:element,toggle:element};
assert.ok(pages.renderPluginSettings('usage',owner,{}));
// Declared grouped checkboxes use the real common panel, with captured-machine guards.
const choiceKey=JSON.stringify(['codex','fixture',null,'full']);
store.updatePreferences(null,{automaticReset:true});
state.set('custom.usage.local.cache',{version:5,reports:[{id:'codex-fixture',sourceId:'codex',account:{id:'fixture',label:'fixture@example.test'},report:{status:'available',codexResets:{groups:[{name:'Full reset',typeId:'full',covers:['weekly'],grantId:'g',left:1,usable:true}]}}}]});
const flatten=node=>node&&typeof node==='object'?[node,...(node.kids??[]).flatMap(flatten)]:[];
let checks=flatten(pages.renderPluginSettings('usage',owner,{})).filter(n=>n.attrs.accessibility_label?.[0]==='Full reset');
assert.equal(checks.length,1);assert.equal(checks[0].attrs.checked[0],false);
checks[0].attrs.on_change[0](true,cx);assert.deepEqual(Array.from(store.preferences(null).resetSelections),[choiceKey]);
owner.settingsMachine='pc2';checks[0].attrs.on_change[0](false,cx);assert.deepEqual(Array.from(store.preferences(null).resetSelections),[choiceKey],'Old machine checkbox is inert');owner.settingsMachine=null;
store.updatePreferences(null,{automaticReset:false});checks[0].attrs.on_change[0](false,cx);assert.equal(store.preferences(null).resetSelections.length,1,'Off toggle rejects stale checkbox');
assert.equal(flatten(pages.renderPluginSettings('usage',owner,{})).some(n=>n.attrs.accessibility_label?.[0]==='Full reset'),false);
state.set('custom.usage.local.preferences',structuredClone(preferences));state.delete('custom.usage.local.cache');
const pageRefresh=pages.pluginPageRefresh('usage');assert.ok(pageRefresh,'Usage declares a header Refresh for the Settings machine');
assert.equal(pageRefresh.label,'Refresh usage');assert.equal(typeof pageRefresh.run,'function');assert.equal(pages.pluginPageRefresh('look'),null);
r.setPluginEnabled(plugin,false);const saved=JSON.stringify([...state].filter(([key])=>key.endsWith('.preferences')));
assert.equal(footer.footerVisible('usage'),false);assert.ok(!footer.footerItems().some(item=>item.id==='usage'));
assert.equal(pages.renderPluginSettings('usage',owner,{}),null);
assert.equal(pages.pluginPageRefresh('usage'),null,'A disabled plugin offers no header Refresh');
const accountSelection=await load(path.join(root,'accounts.js'));accountSelection.selectClaude(null,'stale-account');
assert.equal(state.has('custom.usage.local.claudeSelection'),false,'Disabled account controls cannot persist stale selections');
const dialog=new Usage();props={overlay:'disabled-usage'};dialog.init({},cx);dialog.render(cx);await drain();
assert.equal(focuses,0,'Disabled dialog cannot steal focus');assert.deepEqual(closed,['disabled-usage']);
props={summary:true};const summary=new Usage();summary.init({},cx);summary.render(cx);for(const tick of timers)tick(cx);await drain();
store.refresh('pc2',cx,{force:true});assert.equal(reads.length,0);assert.equal(executions.length,0,'Disabled collectors never start locally or over SSH');
const before=state.get('custom.usage.local.preferences');store.updatePreferences(null,{pins:[]});assert.deepEqual(state.get('custom.usage.local.preferences'),before,'Stale controls cannot change disabled preferences');
r.pluginEvent('sidebar.sync',{owner:{},cx});await drain();assert.equal(widget.hidden,true,'Disabled summary reclaims its layout slot');
r.setPluginEnabled(plugin,true);r.pluginEvent('sidebar.sync',{owner:{},cx});await drain();assert.equal(widget.hidden,false);assert.equal(footer.footerVisible('usage'),true);
assert.equal(JSON.stringify([...state].filter(([key])=>key.endsWith('.preferences'))),saved,'Toggles preserve every machine’s preferences and pins');
// Disable while reading worker bytes: no new process may start afterward.
store.refresh(null,cx,{force:true});const reading=jobs.shift()(cx);assert.equal(reads.length,1);
r.setPluginEnabled(plugin,false);reads.shift()('fixture worker');await reading;assert.equal(executions.length,0);
// Disable/re-enable during exec: the old result cannot replace a newer generation,
// and its loading flag cannot block a fresh request for two minutes.
r.setPluginEnabled(plugin,true);store.refresh('pc2',cx,{force:true});const old=jobs.shift()(cx);reads.shift()('fixture worker');await tick();
assert.equal(executions.length,1);assert.equal(executions[0].args[2].on,'pc2');
r.setPluginEnabled(plugin,false);r.setPluginEnabled(plugin,true);store.refresh('pc2',cx,{force:true});const fresh=jobs.shift()(cx);reads.shift()('fixture worker');await tick();assert.equal(executions.length,2);
executions[1].resolve({code:0,stdout:JSON.stringify({reports:[{id:'fresh',report:{status:'available'}}]})});await fresh;
executions[0].resolve({code:0,stdout:JSON.stringify({reports:[{id:'stale',report:{status:'available'}}]})});await old;
assert.equal(store.cache('pc2').reports[0].id,'fresh','Only the newest enabled collection can publish');
// Reset continuations must not survive an enable-generation change either.
const reset={provider:'claude',accountId:'fixture',organizationId:'org',grantId:'grant'};
let count=executions.length;
const pendingResetRead=store.claimReset(null,reset);assert.equal(reads.length,1);
r.setPluginEnabled(plugin,false);reads.shift()('fixture worker');
assert.equal((await pendingResetRead).obsolete,true);assert.equal(executions.length,count,'Disabling while loading reset worker bytes prevents a new reset process');
r.setPluginEnabled(plugin,true);
const pendingResetExec=store.claimReset('pc2',reset);reads.shift()('fixture worker');await tick();
assert.equal(executions.length,count+1);assert.equal(executions.at(-1).args[2].on,'pc2');
const cacheBeforeReset=state.get('custom.usage.remote:pc2.cache');
r.setPluginEnabled(plugin,false);r.setPluginEnabled(plugin,true);
executions.at(-1).resolve({code:0,stdout:JSON.stringify({result:'reset'})});
assert.equal((await pendingResetExec).obsolete,true);
assert.equal(state.get('custom.usage.remote:pc2.cache'),cacheBeforeReset,'A reset from an obsolete generation cannot invalidate the newer cache');
// A reset waiting behind a running collector also retains its original epoch.
const epoch=state.get('custom.usage.generation');
state.set('custom.usage.remote:pc2.cache',{version:5,reports:[],at:Date.now(),loading:true,generation:epoch,request:'pre-reset',started:Date.now()});
const resetView=new Usage();resetView.machine='pc2';
resetView.startClaim({id:'fixture',sourceLabel:'Claude',account:{id:'fixture',organizationId:'org'}},{grantId:'grant'},'fixture:grant',cx);
const resetting=jobs.shift()({...cx,sleep:async()=>{r.setPluginEnabled(plugin,false);r.setPluginEnabled(plugin,true);}});
reads.shift()('fixture worker');await tick();
count=executions.length;executions.at(-1).resolve({code:0,stdout:JSON.stringify({result:'reset'})});await resetting;
assert.equal(executions.length,count);assert.equal(jobs.length,0,'Re-enabling while a reset waits cannot queue its old follow-up collection');
assert.equal(resetView.claiming,null);
assert.ok(!fs.existsSync(path.join(output,'mods/custom-workspace-status/accounts.js')),'Session controls no longer depend on optional Usage');
assert.doesNotMatch(fs.readFileSync(new URL('../src/features/settings/main.js',import.meta.url),'utf8'),/st-usage-page|st-usage-enabled/,'Core Settings delegates Usage rendering to its plugin');
console.log('PASS: complete Usage plugin lifecycle, dialog/settings/footer/summary gating, preserved preferences, no disabled IO and stale local/SSH collection generations');
