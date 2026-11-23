import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import path from 'node:path';
import { syncPreferences } from '../tools/runtime/preferences.mjs';
const state = {}, context = vm.createContext({}), cache = new Map();
const element = () => {const target={children:[]};let proxy;proxy=new Proxy(target,{get(o,k){if(k==='child')return x=>{o.children.push(x);return proxy;};return k in o?o[k]:(...args)=>{o[k+'Value']=args;return proxy;};}});return proxy;};
async function load(name) {
  if(cache.has(name)) return cache.get(name);
  const values = name === './host.js' ? {shared:k=>state[k],setShared:(k,v)=>state[k]=v} : name === 'gpui-base' ? {v_flex:element} : null;
  const file = name === './spaces-ui.js' ? 'features/settings/spaces-ui.js' : 'shared/space-preferences.js';
  const mod = values ? new vm.SyntheticModule(Object.keys(values),function(){for(const [k,v]of Object.entries(values))this.setExport(k,v);},{context}) : new vm.SourceTextModule(fs.readFileSync('src/'+file,'utf8'),{context});
  cache.set(name,mod);await mod.link(load);return mod;
}
const m=await load('./spaces-ui.js');await m.evaluate();const prefs=cache.get('./space-preferences.js').namespace;
assert.equal(prefs.spacePreferences().connectFleetToCoordinator,false);
let click;const owner={heading:()=>element(),row:(_t,label,about,toggle)=>({label,about,toggle}),toggle:(_t,id,value,fn)=>{if(id==='st-spaces-fleet')click=fn;return element().value(value);}};
let tree=m.namespace.spacesPage(owner,{});assert.equal(tree.children[3].label,'Connect fleet space to coordinator');assert.deepEqual(tree.children[3].toggle.accessibility_labelValue,['Connect fleet space to coordinator']);
click(null,{notify(){}});assert.equal(prefs.spacePreferences().connectFleetToCoordinator,true);
tree=m.namespace.spacesPage(owner,{});assert.deepEqual(tree.children[3].toggle.valueValue,[true]);click(null,{notify(){}});assert.equal(prefs.spacePreferences().connectFleetToCoordinator,false);
const home=fs.mkdtempSync(path.resolve('.artifacts/fleet-prefs-'));
const put=(rel,v)=>{fs.mkdirSync(path.dirname(path.join(home,rel)),{recursive:true});fs.writeFileSync(path.join(home,rel),JSON.stringify(v));};
const get=rel=>JSON.parse(fs.readFileSync(path.join(home,rel),'utf8'));
const options={hostname:'fixture',isDesktopOpen:()=>false};
try {
 for(const flag of [undefined,true,false]) {
  const value={version:1,confirmLastTab:false,closeOnLastTab:true,...(flag===undefined?{}:{connectFleetToCoordinator:flag})};
  put('shared.json',{'custom.spaces.preferences':value,'custom.fleet.links':{private:'not exported'},unrelated:123});syncPreferences('export',home,options);
  assert.deepEqual(get('preferences/fixture.json').shared,{'custom.spaces.preferences':value});
  put('shared.json',{unrelated:123});syncPreferences('import',home,options);assert.deepEqual(get('shared.json'),{unrelated:123,'custom.spaces.preferences':value});
 }
 put('shared.json',{'custom.spaces.preferences':{version:1,confirmLastTab:false,closeOnLastTab:true,connectFleetToCoordinator:'yes'}});assert.throws(()=>syncPreferences('export',home,options),/Invalid spaces/);
} finally {fs.rmSync(home,{recursive:true,force:true});}
console.log('PASS fleet preference, Settings live toggle, legacy snapshot and safe round trips');
