import assert from 'node:assert/strict';
import {build} from '../tools/build.mjs';
import {loadMod} from '../tools/plugin-harness.mjs';
build();
const state=new Map(),commands=[];
let list=[
  {pane:'p1',tab:'t1',mod:'custom-files'},                       // file-only tab: close the tab
  {pane:'p2',tab:'t2',mod:'custom-files'},{pane:'p3',tab:'t2',mod:'custom-files'}, // two viewers, one tab: close once
  {pane:'p4',tab:'t3',mod:null},{pane:'p5',tab:'t3',mod:'custom-files'},          // split beside a terminal: close the pane
  {pane:'p6',tab:'t4',mod:null},                                  // unrelated tab stays
  {pane:'sidebar',mod:'custom-files'},                            // not in a tab: never touched
];
const host={shared:k=>state.get(k),setShared:(k,v)=>state.set(k,structuredClone(v)),panes:()=>list,spaces:()=>[],
  run:(name,args)=>commands.push([name,args]),notify(){},appHome:()=>'/fixture'};
const {r}=await loadMod({host,modules:{'space-color-state.js':{currentSpaceColor(){}}},entry:'import * as r from "./plugins.js";export {r};'});
const files=r.pluginById('files');
assert.equal(r.pluginEnabled(files),true);
r.setPluginEnabled(files,true);
assert.deepEqual(commands,[],'Turning Files on (unchanged) closes nothing');
r.setPluginEnabled(files,false);
assert.deepEqual(JSON.parse(JSON.stringify(commands)),[['tab.close',{id:'t1'}],['tab.close',{id:'t2'}],['pane.close',{pane:'p5'}]],
  'Turning Files off closes file tabs and lone viewer panes only');
assert.equal(r.sidebarPanelEnabled('files'),false);
commands.length=0;r.setPluginEnabled(files,true);
assert.deepEqual(commands,[],'Turning Files back on opens nothing');
console.log('files plugin tabs: ok');
