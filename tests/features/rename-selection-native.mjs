// Actual native InputState replacement in a disposable home. No real session,
// terminal input, rename command, dialog or user focus is involved.
import fs from 'node:fs';
import path from 'node:path';
export function checkRenameSelection(home,app) {
  const dir=path.join(home,'mods/custom-rename-selection-fixture');
  fs.cpSync(path.join(home,'mods/custom-tabs'),dir,{recursive:true});
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const shared=key=>key==='layout'?'Custom':null;
export const spaces=()=>[{id:'fixture-space',machine:null,name:'Build 🛠️ tools',named:true,active:true,tabs:[{id:'fixture-tab',name:'Build 🛠️ tools',named:true,active:true}]}];
export const focused=()=>({space:'fixture-space',tab:'fixture-tab',pane:null});
export const layout=()=>({id:'sidebar',size:{px:248}});
export const run=()=>{throw Error('Fixture cannot issue real commands');};
`);
  let checked=0;
  try {
    for(const kind of ['Tab','Space']) {
      fs.writeFileSync(path.join(dir,'main.js'),`import {View,div} from 'gpui-kit';
import {begin${kind}Rename,cancel${kind}Rename} from './${kind.toLowerCase()}-rename.js';
export default class Fixture extends View {
 init(_p,cx){const owner={folded:new Set(),shown:new Set()};
 if(!begin${kind}Rename(owner,${JSON.stringify(kind==='Tab'?'fixture-tab':'fixture-space')},cx))throw Error('Rename did not start');
 owner.rename.input.replace('Replacement');
 if(owner.rename.input.value()!=='Replacement')throw Error('Native selection did not replace the whole name: '+owner.rename.input.value());
 cancel${kind}Rename(owner,cx);}
 render(){return div().child('Native ${kind.toLowerCase()} selection replaced the whole Unicode name');}
}
`);
      app(['check',dir],home);checked++;
    }
    return checked;
  } finally {fs.rmSync(dir,{recursive:true});}
}
