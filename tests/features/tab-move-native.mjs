// Deferred menu states through the real GPUI checker, with all process APIs denied.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
export function checkTabMoveStates(home, app) {
  const original = path.join(home, 'mods/custom-menu'), dir = path.join(home, 'mods/custom-tab-move-fixture');
  const dispose=temporaryMod(home,path.basename(dir));
  let checked = 0;
  try {
  fs.cpSync(original, dir, {recursive: true});
  const source = fs.readFileSync(path.join(dir, 'main.js'), 'utf8').replace('export default class Menu extends View {', 'class Menu extends View {');
  fs.renameSync(path.join(dir, 'host.js'), path.join(dir, 'native-host.js'));
  fs.writeFileSync(path.join(dir, 'host.js'), `export * from './native-host.js';
export const props=()=>({tab:'tab',target:{space:'source',id:'tab1'},overlay:'fixture'});
export const spaces=()=>[{id:'source',index:1,machine:null,name:'Source',tabs:[{id:'tab1'}]},...(globalThis.emptyDestinations?[]:Array.from({length:24},(_,i)=>({id:'space'+i,index:i+2,machine:null,name:'Destination '+(i+1),tabs:[]})))];
export const exec=()=>{throw Error('Native menu fixture must not execute workers');};
export const hc=()=>{throw Error('Native menu fixture must not contact a Core');};
export const run=()=>{throw Error('Native menu fixture must not issue commands');};
`);
    for (const state of ['menu', 'loading', 'destinations', 'unsupported', 'repair', 'empty']) {
      const capability = state === 'loading' ? null : state === 'unsupported' ? {ok:false,message:'Unreviewed Herdr version; moving is disabled'} : {ok:true,repairNeeded:state==='repair'};
      fs.writeFileSync(path.join(dir, 'main.js'), source + `
export default class Fixture extends Menu {
 checkMove(){} // Fixture states never launch a worker.
 init(p,cx){super.init(p,cx);this.moveTo=${state!=='menu'};this.moveCapability=${JSON.stringify(capability)};globalThis.emptyDestinations=${state==='empty'};}
}
`);
      app(['check', dir], home); checked++;
    }
  } finally { dispose(); }
  return checked;
}

// Render every arrival phase with synthetic spaces; never invoke a move worker.
export function checkTabArrivalStates(home, app) {
  const dir = path.join(home, 'mods/custom-tab-arrival-fixture');
  const dispose=temporaryMod(home,path.basename(dir));
  let checked = 0;
  try {
  fs.cpSync(path.join(home, 'mods/custom-spaces'), dir, {recursive: true});
  fs.renameSync(path.join(dir, 'main.js'), path.join(dir, 'spaces.js'));
  fs.renameSync(path.join(dir, 'host.js'), path.join(dir, 'native-host.js'));
  fs.writeFileSync(path.join(dir, 'host.js'), `export * from './native-host.js';
export const spaces=()=>[{id:'target',name:'Destination',named:true,machine:'remote',folder:'/fixture',tabs:[{id:'tab'}]}];
export const panes=()=>[];
export const machines=()=>[{name:'remote',layout:'ready'}];
export const shared=()=>null;
export const exec=()=>{throw Error('Arrival fixture must not execute workers');};
export const hc=()=>{throw Error('Arrival fixture must not contact a Core');};
export const run=()=>{throw Error('Arrival fixture must not navigate');};
`);
    for (const phase of ['arm', 'hop', 'settle']) for (const mode of ['row', 'compact', 'folded']) {
      fs.writeFileSync(path.join(dir, 'main.js'), `import Spaces from './spaces.js';
import {theme,spaces} from './host.js';
export default class Fixture extends Spaces {
 init(){this.pressed=null;this.machines=[];this.reconnecting={};this.folded=new Set(['remote']);this.tabArrival={spaceId:'target',machine:'remote',phase:${JSON.stringify(phase)}};}
 render(){const w=spaces()[0], t=theme();return ${mode === 'folded' ? "this.groupRows('remote',[{w}],false,t,()=>null,()=>false,()=>null)[0]" : `this.${mode}({w,i:0,g:null,tree:null},t)`};}
}
`);
      app(['check', dir], home); checked++;
    }
  } finally { dispose(); }
  return checked;
}
