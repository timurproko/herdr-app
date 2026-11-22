// All Usage surfaces in a disposable app home, with no credentials or collection.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
export function checkUsagePluginStates(home,app) {
 let checked=0;
 for(const feature of ['usage','settings','workspace-chrome']) {
  const dir=path.join(home,`mods/custom-${feature}-usage-fixture`);
  const dispose=temporaryMod(home,path.basename(dir));
  try {
  fs.cpSync(path.join(home,`mods/custom-${feature}`),dir,{recursive:true});
  fs.renameSync(path.join(dir,'main.js'),path.join(dir,'feature-view.js'));
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
   for(const enabled of [false,true])for(const summary of feature==='usage'?[false,true]:[true])for(const state of feature==='usage'&&enabled?['fresh','stale','unavailable','error','loading','provider-loading']:['fresh']) {
    const properties=feature==='usage'?{summary}:feature==='workspace-chrome'?{footer:true}:{section:'usage'};
    fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const props=()=>(${JSON.stringify(properties)});
export const window=()=>({platform:'windows',active:false});
export const spaces=()=>[{id:'fixture',active:true,machine:null,tabs:[]}];export const machines=()=>[];
export const focused=()=>null;export const terminals=()=>[];
export const layout=()=>({id:'sidebar',size:{px:248}});
export const shared=key=>key==='layout'?'Custom':key==='custom.plugins'?{usage:{enabled:${enabled}}}:key.endsWith('.preferences')?{enabled:true,summary:true,remaining:true,pins:['["fixture","weekly"]']}:key.endsWith('.cache')?{version:5,loading:${state==='loading'||state==='provider-loading'},reportId:${state==='provider-loading'?"'fixture'":'null'},started:Date.now(),error:${state==='error'?"'fixture transport failure'":'null'},reports:[{id:'fixture',sourceLabel:'Codex',checkedAt:Date.now()-${state==='stale'?600001:0},fetchedAt:'2030-01-01T00:00:00Z',report:{status:'${state==='unavailable'?'unavailable':'available'}',windows:[{id:'weekly',label:'Weekly',usedPct:20}]}}]}:null;
export const exec=()=>{throw Error('Usage fixture cannot run collectors');};export const hc=exec;
export const readTextFile=()=>{throw Error('Usage fixture cannot read credentials');};
export const run=()=>{throw Error('Usage fixture cannot change layout');};export const setShared=run;
`);
    if(feature==='settings')fs.writeFileSync(path.join(dir,'main.js'),`import {View,div} from 'gpui-kit';
import {Toggle,h_flex,v_flex} from 'gpui-base';import {theme} from './host.js';import {renderPluginSettings} from './plugin-pages.js';
export default class Fixture extends View {
 init(){this.settingsMachine=null;}
 heading(t,title,about){return v_flex().child(title).child(about);}
 row(t,title,about,control){return h_flex().child(v_flex().child(title).child(about)).child(control);}
 toggle(t,id,on){return Toggle.new(id).pressed(on);}
 render(){return div().child(renderPluginSettings('usage',this,theme())??'Usage disabled');}
}
`);
    else fs.writeFileSync(path.join(dir,'main.js'),"export {default} from './feature-view.js';\n");
    app(['check',dir],home);checked++;
   }
  } finally {dispose();}
 }
 return checked;
}
