// Deferred header/menu descriptions with synthetic host snapshots in a scratch
// home. No real layout commands, network, terminals, pin state or focus changes.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
export function checkPanelPinStates(home,app) {
  let checked=0;
  for(const feature of ['files','changes']) {
    const dir=path.join(home,`mods/custom-${feature}-pin-fixture`);
    const dispose=temporaryMod(home,path.basename(dir));
    try {
    fs.cpSync(path.join(home,`mods/custom-${feature}`),dir,{recursive:true});
    fs.renameSync(path.join(dir,'main.js'),path.join(dir,'feature-view.js'));
    fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
    fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const spaces=()=>[{id:'fixture-space',active:true,machine:null,tabs:[{id:'fixture-tab',active:true}]}];
export const panes=()=>[];export const terminals=()=>[];export const focused=()=>null;
export const props=()=>null;
export const shared=key=>key==='layout'?'Custom':key==='custom.panel.tabs'?{version:2,default:{open:true,view:'files'}}:null;
export const layout=()=>({id:'panel',children:[{id:'panel-body',active:'${feature}'}]});
export const run=()=>{throw Error('Fixture cannot change real layout');};
export const setShared=()=>{throw Error('Fixture cannot save real state');};
export const exec=()=>{throw Error('Fixture cannot run processes');};
export const hc=()=>{throw Error('Fixture cannot read agents');};
`);
      // Visual states only: do not read or write the session's actual held source.
      fs.writeFileSync(path.join(dir,'panel-state.js'),`export const panelTab=()=>({id:'fixture-tab',space:'fixture-space'});
export const panelPinned=()=>globalThis.fixturePinned;export const panelSource=()=>null;
export const togglePanelPin=()=>{throw Error('Fixture cannot change pin state');};
export const changePanel=()=>{throw Error('Fixture cannot change panel state');};`);
      for(const pinned of [false,true]) {
        fs.writeFileSync(path.join(dir,'main.js'),`import Feature from './feature-view.js';
export default class Fixture extends Feature {
 init(){globalThis.fixturePinned=${pinned};this.headerHovered=true;this.root='C:/fixture';
 ${feature==='files'?"this.context={key:'fixture',cwd:this.root,on:null};this.entries=new Map();this.folders=new Set();this.marks={};":
 "this.resetRepository();this.root='C:/fixture';this.context=JSON.stringify([null,null]);this.repo={name:'owner/repo',url:'https://github.com/owner/repo'};this.view='open';this.pulls={open:[],closed:[]};this.pullsAt={open:Date.now(),closed:Date.now()};this.agentLinks={refresh(){}};"}}
 sync(){} refresh(){} syncAgent(){} loadPulls(){} loadRelatedPull(){} loadPinnedPull(){} shown(){return true;}
}
`);
        app(['check',dir],home);checked++;
      }
      if(feature==='changes') {
        fs.writeFileSync(path.join(dir,'main.js'),`import Feature from './feature-view.js';
export default class Fixture extends Feature {
 init(_p,cx){this.pullMenu={url:'https://github.com/owner/repo/pulls',header:true,repo:'owner/repo',codeUrl:'https://github.com/owner/repo',actionsUrl:'https://github.com/owner/repo/actions'};this.menuHandle=cx.focus_handle();this.menuHandle.focus();}
}
`);
        app(['check',dir],home);checked++;
      }
    } finally {dispose();}
  }
  return checked;
}
