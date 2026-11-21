import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import {loadMod} from '../../../tools/plugin-harness.mjs';
import {syncPreferences} from '../../../tools/runtime/preferences.mjs';
const state=new Map(),jobs=[],calls=[];
const {r,s,AgentSpaceColors}=await loadMod({host:{shared:k=>state.get(k),setShared:(k,v)=>state.set(k,v),window:()=>({active:true}),spaces:()=>[],panes:()=>[],terminals:()=>[],notify:n=>calls.push(n)},modules:{'space-color-state.js':'src/shared/space-color-state.js'},
 entry:'import * as r from "./plugins.js"; import * as s from "./plugins/a1-colors/state.js"; import {AgentSpaceColors} from "./plugins/a1-colors/session-sync.js"; export {r,s,AgentSpaceColors};'});
const plugin=r.pluginById('a1-colors');
for(const legacy of [false,true]){
 state.clear();state.set(s.MATCH_AGENT_KEY,legacy);
 assert.equal(r.pluginEnabled(plugin),legacy);assert.equal(s.matchAgentSessionColor(),legacy);assert.equal(r.pluginSetting(plugin,'renameSession'),undefined);
 assert.equal(r.pluginSetting(plugin,'matchSpaceColor'),legacy);
}
for(const enabled of [false,true])for(const color of [false,true])for(const rename of [false,true]){
 state.set('custom.plugins',{'a1-colors':{enabled,settings:{matchSpaceColor:color,renameSession:rename}}});
 r.setPluginEnabled(plugin,enabled);r.setPluginSetting(plugin,'matchSpaceColor',color);
 assert.equal(s.matchAgentSessionColor(),enabled&&color);
 assert.equal(r.pluginSetting(plugin,'renameSession'),undefined);
 const sync=new AgentSpaceColors();sync.refresh({spawn:fn=>jobs.push(fn)});assert.equal(jobs.length,0);
}
assert.equal(calls.length,0,'No native reporting/title API is involved');
state.set('custom.plugins',{'a1-colors':{enabled:false,settings:{matchSpaceColor:true,renameSession:false}},other:{enabled:true}});
const dir=fs.mkdtempSync(path.join(os.tmpdir(),'a1-feature-preferences-'));
try{
 fs.writeFileSync(path.join(dir,'shared.json'),JSON.stringify(Object.fromEntries(state)));
 syncPreferences('export',dir,{hostname:'fixture',snapshotDir:path.join(dir,'prefs')});
 const exported=JSON.parse(fs.readFileSync(path.join(dir,'prefs/fixture.json')));
 assert.deepEqual(exported.shared['custom.plugins']['a1-colors'],{enabled:false,settings:{matchSpaceColor:true,renameSession:false}});
 assert.equal(exported.shared[s.AGENT_COLOR_EPOCH_KEY],undefined,'Runtime epochs are never portable');
 syncPreferences('import',dir,{hostname:'fixture',snapshotDir:path.join(dir,'prefs'),isDesktopOpen:()=>false});
 const imported=JSON.parse(fs.readFileSync(path.join(dir,'shared.json')));
 assert.deepEqual(imported['custom.plugins']['a1-colors'],exported.shared['custom.plugins']['a1-colors'],'Retired preferences stay readable without destructive migration');
}finally{fs.rmSync(dir,{recursive:true,force:true});}
console.log('PASS: A1 master/color controls ignore retired rename preferences; legacy continuity and portable import/export retained');
