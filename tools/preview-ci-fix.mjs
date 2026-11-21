// Read-only native preview of candidate Git settings. Dummy prerequisites/state;
// no Core messages, credentials, network, preference writes or terminal input.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import {build} from './build.mjs';
import {app,defaultHome} from './deploy.mjs';
const home=defaultHome(),name='custom-ci-fix-preview',dir=path.join(home,'mods',name);
const before=JSON.parse(app(['status'],home));
if(before.overlays?.length)throw Error('Close overlays before preview; no UI was changed.');
if(fs.existsSync(dir))throw Error('Preview directory already exists; preserve it.');
const statesOpen=process.argv.includes('--states-open');
const image=path.join(os.tmpdir(),statesOpen?'herdr-ci-fix-states.png':'herdr-ci-fix-settings.png');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
try {
  const {output}=build();fs.cpSync(path.join(output,'mods/custom-settings'),dir,{recursive:true});
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  fs.renameSync(path.join(dir,'main.js'),path.join(dir,'settings-view.js'));
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const shared=()=>null;export const setShared=()=>{};
export const spaces=()=>[];export const panes=()=>[];export const terminals=()=>[];export const focused=()=>null;
export const exec=()=>{throw Error('Preview cannot run commands');};export const hc=exec;export const readTextFile=exec;export const writeTextFile=exec;
`);
  fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:860,height:520}}));
  fs.writeFileSync(path.join(dir,'main.js'),`import Settings from './settings-view.js';
import {v_flex} from 'gpui-base';import {theme} from './host.js';
import {initPlugins,pluginsPage} from './plugins-ui.js';import {pluginById} from './plugins.js';
export default class Preview extends Settings {
 init(_p,cx){initPlugins(this,cx,'git');this.pluginOpen['git-requirements']=false;this.pluginOpen['git-repository']=false;this.pluginOpen['git-settings']=true;this.pluginOpen['git-ciFixStates-multi']=${statesOpen};this.pluginChecks.git={loading:false,items:pluginById('git').prerequisites.map(p=>({...p,status:'ready'}))};}
 toggle(t,id,on){return super.toggle(t,id,on,()=>{});}
 render(){const t=theme();return v_flex().size_full().p(20).overflow_y_scroll().bg(t.background).text_color(t.foreground).child(pluginsPage(this,t));}
}
`);
  app(['check',dir],home);
  for(let i=0;;i++){try{app(['do','mod.open','--name',name],home);break;}catch(error){if(i===20)throw error;await wait(100);}}
  await wait(800);app(['shot',image],home);console.log(image);
} finally {
  try {const status=JSON.parse(app(['status'],home));if(status.overlays?.includes(name))app(['do','overlay.close','--id',name],home);}
  finally {fs.rmSync(dir,{recursive:true,force:true});}
}
