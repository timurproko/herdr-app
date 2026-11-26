import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import {loadMod} from '../tools/plugin-harness.mjs';
import {syncPreferences} from '../tools/runtime/preferences.mjs';
import {element,find,words} from './support/choice-menu.mjs';
const key='custom.crew.worker-space', setting='separateProjectSpaces';
let state={'custom.plugins':{crew:{enabled:true}}}, rendering=false;
const host={shared:k=>state[k],setShared:(k,v)=>{assert.equal(rendering,false);state[k]=v;},notify(){}};
const modules={'space-color-state.js':'src/shared/space-color-state.js','space-preferences.js':'src/shared/space-preferences.js','fleet-display.js':'src/shared/fleet-display.js','spaces-ui.js':'src/features/settings/spaces-ui.js','gpui-kit':{div:element},'gpui-base':{v_flex:element,h_flex:element},'settings-kit.js':{badge:(_t,s,label)=>element().child(label)}};
const load=()=>loadMod({host,modules,entry:'export * as r from "./plugins.js";export {spacesPage} from "./spaces-ui.js";'});
let api=await load(), crew=api.r.pluginById('crew');
const owner={heading:()=>element(),row:(_t,title,about,control,last,detail)=>element().id(title).child(about).child(control).child(detail).last(last),toggle:(_t,id,on,fn)=>element().id(id).on_click(fn).value(on)};
const draw=()=>{rendering=true;try{return api.spacesPage(owner,{});}finally{rendering=false;}};
assert.equal(api.r.pluginSetting(crew,setting),false);
let tree=draw(), toggle=find(tree,'st-crew-separateProjectSpaces');
assert.ok(words(tree).join(' ').includes('Give each project its own space'));
assert.deepEqual(tree.kids.slice(1).map(n=>n.attrs.id[0]),['Confirm before closing the last tab','Close space when the last tab closes','Connect fleet space to coordinator','Separate space per project']);
assert.deepEqual(toggle.attrs.disabled,[true]);toggle.attrs.on_click[0](null,{notify(){}});assert.equal(api.r.pluginSetting(crew,setting),false);
state[key]={available:true,statuses:[]};tree=draw();toggle=find(tree,'st-crew-separateProjectSpaces');
assert.deepEqual(toggle.attrs.accessibility_label,['Separate space per project']);
toggle.attrs.on_click[0](null,{notify(){}});assert.equal(api.r.pluginSetting(crew,setting),true);
// A stale enabled control cannot save after support or plugin enablement changes.
state[key].available=false;toggle.attrs.on_click[0](null,{notify(){}});assert.equal(api.r.pluginSetting(crew,setting),true);
state[key].statuses=[{machine:'pc2',detail:'Crew refused this home',label:'Refused',status:'error'}];assert.ok(words(draw()).join(' ').includes('pc2 · Crew refused this home'));
api.r.setPluginSetting(crew,'machine','pc2');assert.equal(api.r.pluginSetting(crew,setting),true,'Checklist selection never scopes global intent');
state[key].available=true;api=await load();crew=api.r.pluginById('crew');assert.equal(api.r.pluginSetting(crew,setting),true);
const home=fs.mkdtempSync(path.resolve('.artifacts/worker-space-prefs-'));
try {
 fs.writeFileSync(path.join(home,'shared.json'),JSON.stringify(state));syncPreferences('export',home,{hostname:'fixture'});
 const snapshot=JSON.parse(fs.readFileSync(path.join(home,'preferences/fixture.json')));
 assert.equal(snapshot.shared['custom.plugins'].crew.settings[setting],true);assert.equal(snapshot.shared[key],undefined);
 fs.writeFileSync(path.join(home,'shared.json'),'{}');syncPreferences('import',home,{hostname:'fixture',isDesktopOpen:()=>false});
 state=JSON.parse(fs.readFileSync(path.join(home,'shared.json')));api=await load();crew=api.r.pluginById('crew');assert.equal(api.r.pluginSetting(crew,setting),true);
 state[key]={available:true,statuses:[]};find(draw(),'st-crew-separateProjectSpaces').attrs.on_click[0](null,{notify(){}});assert.equal(api.r.pluginSetting(crew,setting),false);
 api.r.setPluginEnabled(crew,false);assert.equal(api.r.pluginSettingsRows('spaces').length,0);
}finally{fs.rmSync(home,{recursive:true,force:true});}
console.log('PASS worker-space global row, on/off, disabled callbacks and restart preference round trip');
