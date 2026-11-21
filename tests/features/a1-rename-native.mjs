// Sidebar naming removal previews only: no agent/Core reads, preference writes or submissions.
import fs from 'node:fs';import path from 'node:path';import {randomUUID} from 'node:crypto';
import {app,defaultHome} from '../../tools/deploy.mjs';
const home=defaultHome(),out=path.resolve(process.argv[2]??'.artifacts/a1-native');
if(JSON.parse(app(['status'],home)).overlays?.length)throw Error('Existing overlays preserved; close them before preview.');
fs.mkdirSync(out,{recursive:true});
for(const mode of ['settings','menu','agents']){
 const name=`custom-a1-preview-${randomUUID().slice(0,8)}`,dir=path.join(home,'mods',name);
 if(fs.existsSync(dir))throw Error('Existing preview directory preserved.');
 try{
  const mod=mode==='settings'?'custom-settings':mode==='agents'?'custom-agents':'custom-menu';
  fs.cpSync(path.resolve('dist/mods',mod),dir,{recursive:true});fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  const target={address:'t1',terminal:'t1',machine:null,session:'11111111-1111-1111-1111-111111111111',runtime:'22222222-2222-2222-2222-222222222222',command:'a1',space:'s',tab:'tb'};
  const uiProps=mode==='settings'?{section:'plugins',plugin:'a1-colors'}:mode==='menu'?{tab:'agent',target:{terminal:'t1'}}:{};
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';import {props as nativeProps} from './native-host.js';
export const props=()=>({...nativeProps(),...${JSON.stringify(uiProps)}});
export const shared=key=>key==='layout'?'Custom':key==='custom.plugins'?{'a1-colors':{enabled:true,settings:{matchSpaceColor:true,renameSession:true}}}:key==='custom.match-agent-session-color'?true:null;
export const layout=()=>({id:'sidebar',size:{px:248}});export const spaces=()=>[{id:'s',active:true,name:'Preview',tabs:[{id:'tb',active:true}]}];export const machines=()=>[];export const panes=()=>[];export const focused=()=>null;
export const agents=()=>[{address:'t1',space:'s',space_name:'Preview',pane:'fixture-pane',title:'Fix session naming',status:'idle',seq:1,program:{key:'a1',name:'a1'}}];
export const terminals=()=>[{address:'t1',state:'live',report:{app:'a1'},labels:{'a1.session':'${target.session}','a1.runtime':'${target.runtime}','a1.at':String(Date.now()),'herdr.space':'s','herdr.tab':'tb'}}];
export const checking=()=>true;export const exec=()=>{throw Error('Preview cannot perform external work');};export const hc=exec;export const readTextFile=exec;export const setShared=()=>{throw Error('Preview cannot write preferences');};export const run=exec;export const openOverlay=exec;export const setAgentOrder=()=>{};`);
  fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:mode==='settings'?700:mode==='menu'?240:350,height:mode==='settings'?430:mode==='menu'?125:230}}));
  app(['check',dir],home);app(['do','mod.open','--name',name],home);await new Promise(resolve=>setTimeout(resolve,600));
  const status=JSON.parse(app(['status'],home));
  if(status.errors?.length || status.overlays?.length!==1 || !status.overlays.includes(name))throw Error('Preview changed or failed; capture skipped.');
  const shot=path.join(out,`${mode}.png`);app(['shot',shot],home);console.log(`Native ${mode}: ${shot}`);
 }finally{
  if(JSON.parse(app(['status'],home)).overlays?.includes(name))app(['do','mod.open','--name',name],home);
  fs.rmSync(dir,{recursive:true,force:true});
 }
}
