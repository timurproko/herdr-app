// Explicit, read-only diagnostic against real host agents. No navigation/input.
import {temporaryMod} from './temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {app,defaultHome} from './deploy.mjs';
const home=defaultHome(),name='custom-pr-link-inspector',dir=path.join(home,'mods',name);
const nonce=crypto.randomUUID(),receipt=path.join(home,'.customizations',`pr-link-inspection-${nonce}.json`);
if(fs.existsSync(dir))throw Error('Inspector already exists; preserve and inspect it before retrying.');
const dispose=temporaryMod(home,name);
try {
  fs.cpSync(path.join(home,'mods/custom-changes'),dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:320,height:72}}));
  fs.writeFileSync(path.join(dir,'main.js'),`import {View,div} from 'gpui-kit';
import {writeTextFile,props,closeOverlay} from './host.js';
import {AgentLinks,agentTargets} from './agent-links.js';
export default class Inspector extends View {
 init(_p,cx){cx.spawn(async cx=>{
  const links=new AgentLinks(),jobs=[];
  links.refresh({spawn:fn=>jobs.push(fn(cx)),notify(){}});
  await Promise.all(jobs);
  await writeTextFile(${JSON.stringify(receipt)},JSON.stringify({nonce:${JSON.stringify(nonce)},targets:agentTargets(),entries:[...links.entries.values()],matches:[920,922,923].map(number=>({number,agent:links.related({number},'timurproko/a1')}))}),null);
  closeOverlay(props().overlay);
 });}
 render(){return div().p(12).child('Checking live PR-agent links…');}
}
`);
  app(['check',dir],home);
  for(let i=0;;i++) {
    try{app(['do','mod.open','--name',name],home);break;}
    catch(error){if(i===20)throw error;await new Promise(r=>setTimeout(r,150));}
  }
  for(let i=0;i<300;i++) {
    if(fs.existsSync(receipt)) {
      const result=JSON.parse(fs.readFileSync(receipt,'utf8'));
      if(result.nonce!==nonce)throw Error('Inspector receipt mismatch');
      console.log(JSON.stringify(result,null,2));break;
    }
    if(i===299)throw Error('Live PR inspection timed out');
    await new Promise(r=>setTimeout(r,150));
  }
} finally {
  try {
    const status=JSON.parse(app(['status'],home));
    if(status.overlays?.includes(name))app(['do','mod.open','--name',name],home);
  } finally {dispose();fs.rmSync(receipt,{force:true});}
}
