// Terminal-free native Profiles preview: fake profiles and in-memory actions only.
// Scroll the list, edit/Cancel, or Remove/Cancel without touching real settings.
import fs from 'node:fs';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {app,defaultHome} from '../../tools/deploy.mjs';
const project=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../..');
const home=defaultHome(),name='custom-profile-workflow-preview',dir=path.join(home,'mods',name);
const scene=process.argv[2]??'list';
if(!['list','edit','remove'].includes(scene))throw Error('Use list, edit or remove.');
if(fs.existsSync(dir))throw Error('Preview already exists; inspect before retrying.');
if(JSON.parse(app(['status'],home)).overlays?.length)throw Error('Dismiss existing dialogs before previewing.');
try{
 fs.cpSync(path.join(project,'dist/mods/custom-settings'),dir,{recursive:true});
 fs.writeFileSync(path.join(dir,'profiles.js'),`
 const items=Array.from({length:24},(_,i)=>({key:'fixture-'+i,name:'Preview profile '+(i+1),command:'a1',configuredArgs:[],custom:true,available:true,show:true}));
 export const cachedProfiles=()=>items,composeProfiles=()=>items,loadProfiles=async()=>items,applyProfileVisibility=(_m,v)=>v;
 export const profileConfig=()=>({order:[]}),reorderProfiles=(_m,v)=>v;
 export const validateProfile=(name,command,args)=>({name,command,args:JSON.parse(args)});
 export const updateProfile=()=>{},addProfile=()=>{},removeProfile=()=>{},moveProfile=()=>{};
 `);
 // Unused by Profiles, but the real Terminals dependency imports its model too.
 fs.writeFileSync(path.join(dir,'terminals-ui.js'),`export const showTerminals=()=>{};`);
 fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:900,height:620,frame:'none'}}));
 fs.writeFileSync(path.join(dir,'main.js'),`
 import {View,div} from 'gpui-kit';
 import {h_flex,v_flex} from 'gpui-base';
 import {theme,closeOverlay,props} from './host.js';
 import {initProfiles,profilesSurface,profileEditorActions,cancelProfileEdit} from './profiles-ui.js';
 import {button,sectionHeading,dialogHeader,dialogSurface} from './ui.js';
 import {modalFooter} from './modal-layout.js';
 export default class Preview extends View {
  init(_p,cx){
   this.section='fixture';this.handle=cx.focus_handle();this.handle.focus();
   initProfiles(this,cx);
   ${scene==='edit'?"this.profileEdit=this.profileItems.at(-1);this.profileName.set_value(this.profileEdit.name);this.profileCommand.set_value('a1');this.profileArgs.set_value('[]');":''}
   ${scene==='remove'?"this.profileDelete=this.profileItems[2].key;":''}
  }
  button(...args){return button(...args);}
  heading(...args){return sectionHeading(...args);}
  toggle(_t,id,on,click){return div().id(id).child(on?'On':'Off').on_click(click);}
  render(cx){const t=theme();return dialogSurface(t,v_flex()).id('profile-workflow-preview').h(620).min_h(0)
   .on_key_down((e,cx)=>{if(e.key==='escape'&&this.profileEdit){cancelProfileEdit(this,cx);cx.stop_propagation();}})
   .child(dialogHeader(t,'Profiles preview',()=>closeOverlay(props()?.overlay)))
   .child(profilesSurface(this,t,cx))
   .when(Boolean(this.profileEdit),el=>el.child(modalFooter(t,h_flex()).id('st-editor-footer').child(profileEditorActions(this,t))));}
 }
 `);
 app(['check',dir],home);
 for(let attempt=0;;attempt++){
  try{app(['do','mod.open','--name',name],home);break;}
  catch(error){if(attempt===20)throw error;await new Promise(r=>setTimeout(r,150));}
 }
 await new Promise(r=>setTimeout(r,650));
 const status=JSON.parse(app(['status'],home));
 if(status.errors.length||!status.overlays?.includes(name))throw Error(JSON.stringify(status));
 const shot=path.join(project,'.work/profile-workflow',`native-${scene}.png`);
 fs.mkdirSync(path.dirname(shot),{recursive:true});app(['shot',shot],home);
 console.log(`PASS: native ${scene} Profiles surface; inspect ${shot}`);
}finally{
 try{if(JSON.parse(app(['status'],home)).overlays?.includes(name))app(['do','mod.open','--name',name],home);}
 finally{fs.rmSync(dir,{recursive:true,force:true});}
}
