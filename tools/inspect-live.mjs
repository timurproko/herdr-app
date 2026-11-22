// Read host-owned pane identities through the supported mod API, not core documents.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {app,defaultHome} from './deploy.mjs';
import {put,json,read} from './files.mjs';
import {temporaryMod,installTemporaryHostFacade} from './temporary-mod.mjs';
export async function inspectLive(home=defaultHome()) {
 const dir=path.join(home,'mods/custom-inspector');if(fs.existsSync(dir))throw Error('Inspector directory already exists; inspect it before retrying.');
 const nonce=crypto.randomBytes(12).toString('hex'),receipt=path.join(home,'.customizations/inspection.json');
 const source=`import {View,div} from 'gpui-kit';
import {panes,machines,appHome,writeTextFile,readTextFile,closeOverlay,props} from './host.js';
export default class Inspector extends View {
 init(_p,cx){cx.spawn(async()=>{const file=appHome()+'/.customizations/inspection.json';await writeTextFile(file,JSON.stringify({nonce:${JSON.stringify(nonce)},panes:panes().map(p=>({pane:p.pane,mod:p.mod,terminal:p.terminal})),machines:machines().map(m=>({name:m.name,layout:m.layout,temporary:m.temporary}))}),await readTextFile(file));closeOverlay(props()?.overlay);});}
 render(){return div().child('Checking customization references…');}
}\n`;
 const dispose=temporaryMod(home,path.basename(dir),()=>{const current=read(path.join(dir,'main.js'));return current===null||current===source;});
 try{
  installTemporaryHostFacade(dir);
  put(path.join(dir,'mod.json'),'{"place":"none","overlay":{"width":360,"height":90}}\n');put(path.join(dir,'main.js'),source);
  let opened=false;for(let i=0;i<30;i++){try{app(['do','mod.open','--name','custom-inspector'],home);opened=true;break;}catch(e){if(i===29)throw e;await new Promise(r=>setTimeout(r,200));}}
  if(!opened)throw Error('Inspector was not discovered.');
  for(let i=0;i<100;i++){await new Promise(r=>setTimeout(r,100));const result=json(receipt);if(result?.nonce===nonce)return result;}
  throw Error('Native inspection timed out.');
 }finally{dispose();}
}
