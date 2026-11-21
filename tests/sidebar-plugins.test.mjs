import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';
import {loadMod} from '../tools/plugin-harness.mjs';
import {pluginLayout} from '../tools/plugins.mjs';
import {project} from '../tools/build.mjs';
const values={};
const {r}=await loadMod({host:{shared:key=>values[key],setShared:(key,value)=>{values[key]=value;},notify(){}},
 modules:{'space-color-state.js':{currentSpaceColor:()=>null}},entry:'import * as r from "./plugins.js";export {r};'});
const plain=value=>JSON.parse(JSON.stringify(value));
const files=r.pluginById('files'),git=r.pluginById('git');
assert.equal(r.pluginEnabled(files),true);assert.equal(r.pluginEnabled(git),true,'Existing installations keep both panels by default');
function element(asset) {
 const node={asset,attrs:{},kids:[]};let proxy;
 return proxy=new Proxy(node,{get:(n,k)=>k in n?n[k]:k==='when'?(yes,fn)=>yes?fn(proxy):proxy:k==='child'?child=>{n.kids.push(child);return proxy;}:(...args)=>{n.attrs[k]=args;return proxy;}});
}
const context=vm.createContext({}),overlays=[];
const host={openOverlay:spec=>overlays.push(plain(spec))};
const synthetic=exports=>new vm.SyntheticModule(Object.keys(exports),function(){for(const [key,value]of Object.entries(exports))this.setExport(key,value);},{context});
const ui=new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/ui.js',import.meta.url),'utf8'),{context});
const title=new vm.SourceTextModule(fs.readFileSync(new URL('../src/ui/sidebar-title.js',import.meta.url),'utf8'),{context});
await title.link(name=>name==='./plugins.js'?synthetic({sidebarPanels:r.sidebarPanels}):name==='./host.js'?synthetic(host):name==='./ui.js'?ui:name==='gpui-kit'?synthetic({div:element,svg:element}):synthetic({Popover:{},Input:{}}));
await title.evaluate();
const nodes=n=>n&&typeof n==='object'?[n,...n.kids.flatMap(nodes)]:[];
for(const [fileOn,gitOn,expected]of [[true,true,['files','changes']],[true,false,['files']],[false,true,['changes']],[false,false,[]]]) {
 r.setPluginEnabled(files,fileOn);r.setPluginEnabled(git,gitOn);
 assert.deepEqual(plain(r.sidebarPanels().map(p=>p.id)),expected);
 for(const id of ['files','changes']) {
  const rendered=title.namespace.sidebarTitle({},id,'test-title');
  if(!expected.includes(id)){assert.equal(rendered,null);continue;}
  const all=nodes(rendered),button=all.find(n=>n.attrs.accessibility_label?.[0]==='Switch panel');
  assert.equal(Boolean(button),expected.length>1,'One panel has a static title, not a dropdown');
  assert.equal(all.some(n=>n.asset==='mods/custom-workspace-chrome/chevron-down.svg'),expected.length>1);
  if(button){button.attrs.on_click[0]({}, {stop_propagation(){}});assert.equal(overlays.at(-1).props.panelSwitch,id);}
 }
}
r.setPluginEnabled(files,true);r.setPluginEnabled(git,true);
const control=title.namespace.sidebarTitle({},'files','test-title');r.setPluginEnabled(git,false);
const count=overlays.length;control.attrs.on_click[0]({}, {stop_propagation(){}});assert.equal(overlays.length,count,'A stale dropdown cannot open after disabling its peer');
const config=JSON.parse(fs.readFileSync(path.join(project,'customization.json'),'utf8'));
const packed=pluginLayout(project,config);
for(const id of ['files','git']) {
 const panel=JSON.parse(fs.readFileSync(path.join(project,'src/plugins',id,'panel.json'),'utf8'));
 assert.ok(packed.modFiles.some(f=>f.dest===`mods/${panel.mod}/main.js`&&f.source===`src/plugins/${id}/mod/main.js`));
 assert.ok(!packed.files.some(f=>f.source.startsWith(`src/plugins/${id}/mod/`)),'Peer mods receive metadata, never another panel implementation');
 const source=fs.readFileSync(path.join(project,'src/plugins',id,'mod/main.js'),'utf8');
 assert.doesNotMatch(source,id==='git'?/mods\/custom-files\//:/mods\/custom-changes\//,'Panel implementations do not reference peer assets');
}
assert.ok(!Object.values(config.files).some(source=>/src\/features\/(files|changes)\//.test(source)));
console.log('PASS: independent plugin ownership/packaging, enabled defaults, all four combinations, generic titles/dropdowns and stale-menu guards');
