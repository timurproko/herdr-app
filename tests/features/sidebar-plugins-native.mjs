// Eager native composition for every switch combination; no real state/IO/focus.
import {temporaryMod} from '../../tools/temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
export function checkSidebarPluginStates(home,app) {
 let checked=0;
 for(const feature of ['files','changes','tabs']) {
  const dir=path.join(home,`mods/custom-${feature}-availability-fixture`);
  const dispose=temporaryMod(home,path.basename(dir));
  try {
  fs.cpSync(path.join(home,`mods/custom-${feature}`),dir,{recursive:true});
  fs.renameSync(path.join(dir,'main.js'),path.join(dir,'feature-view.js'));
  fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
   for(const [files,git]of [[true,true],[true,false],[false,true],[false,false]]) {
    fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const shared=key=>key==='layout'?'Custom':key==='custom.plugins'?${JSON.stringify({files:{enabled:files},git:{enabled:git}})}:null;
export const spaces=()=>[];export const panes=()=>[];export const terminals=()=>[];export const agents=()=>[];
export const props=()=>null;
export const layout=()=>({id:'fixture',children:[{id:'panel',children:[{id:'panel-body',active:'${feature}'}]}]});
export const exec=()=>{throw Error('Fixture cannot run a process');};export const hc=exec;
export const run=()=>{throw Error('Fixture cannot change layout');};export const setShared=run;
`);
    const init=feature==='files'?"this.root='C:/fixture';this.entries=new Map();this.folders=new Set();this.marks={};":feature==='changes'?"this.resetRepository();this.context='fixture';this.view='open';this.headerHovered=true;this.agentLinks={refresh(){}};":"this.titleWidths=new Map();this.rename=null;this.actionHovered=null;";
    fs.writeFileSync(path.join(dir,'main.js'),`import Feature from './feature-view.js';
export default class Fixture extends Feature {
 init(){${init}}
 sync(){} refresh(){} syncAgent(){} loadPulls(){} loadRelatedPull(){} loadPinnedPull(){}
}
`);
    app(['check',dir],home);checked++;
   }
  } finally {dispose();}
 }
 // Render the direct Git configuration target with native inputs/disclosures,
 // but never run prerequisite checks, credentials reads or setup actions.
 const dir=path.join(home,'mods/custom-git-settings-fixture');
 const dispose=temporaryMod(home,path.basename(dir));
 try {
 fs.cpSync(path.join(home,'mods/custom-settings'),dir,{recursive:true});
 fs.renameSync(path.join(dir,'host.js'),path.join(dir,'native-host.js'));
  fs.writeFileSync(path.join(dir,'host.js'),`export * from './native-host.js';
export const shared=()=>null;export const spaces=()=>[];export const machines=()=>[];
export const exec=()=>{throw Error('Settings fixture cannot run setup');};export const hc=exec;export const readTextFile=exec;export const setShared=exec;
`);
  // Every state of Git's declared Settings: requirements, the Repositories list section
  // (scope dropdown, Add popup, rows with hover Remove), checks in flight and open popups.
  for(const state of ['steps','accounts','repositories','repository-notes','relay-configured','repo-deep-link','repository-empty','checking','repository-checking','requirements-checking','row-checking','ci-settings','collapsed','picker-loading','picker-items','picker-error','row-hover','updating']) {
   fs.writeFileSync(path.join(dir,'main.js'),`import {View} from 'gpui-kit';import {Toggle,v_flex} from 'gpui-base';
import {theme} from './host.js';import {initPlugins,pluginsPage} from './plugins-ui.js';import {pluginById} from './plugins.js';
const repos=n=>Array.from({length:n},(_,i)=>({id:'owner/repo'+i,label:'owner/repo'+i}));
export default class Fixture extends View {
 init(_p,cx){initPlugins(this,cx,'git'${state==='repo-deep-link'?",{section:'repository',search:'owner/repo1'}":''});const items=pluginById('git').prerequisites.map(p=>({...p,status:'missing'}));
 const relay=items.find(p=>p.id==='relay');relay.fix={...relay.fix,requiresEnabled:true,run(){throw Error('Fixture cannot configure');}};
 const account=items.find(p=>p.id==='cloudflare-login');account.status='ready';account.fix=null;account.selection={key:'account',options:[['a'.repeat(32),'Personal'],['b'.repeat(32),'Work']]};
 const repo=items.find(p=>p.id==='repository');repo.status='ready';repo.statusLabel='20 added';repo.usable=true;repo.rows=repos(20);repo.detail='Repositories that get automatic test updates from this account.';
 repo.selection={key:'githubAccount',label:'GitHub account',value:'work-user',options:[['work-user','work-user'],['personal-user','personal-user']]};
 ${state==='repository-empty'?"repo.rows=[];repo.statusLabel='0 added';repo.detail='No repositories added yet.';":''}
 ${state==='repository-notes'?"repo.rows[1].detail='Webhook settings incomplete; toggle off and on to repair';":''}
 this.pluginChecks.git={loading:${['checking','repository-checking','requirements-checking','row-checking'].includes(state)},groups:{requirements:{loading:${['checking','requirements-checking','row-checking'].includes(state)},target:'${state==='row-checking'?'node':'requirements'}'},repository:{loading:${['checking','repository-checking'].includes(state)},target:'repository'}},items};
 ${state==='checking'?"repo.rows=undefined;repo.selection=undefined;":''}
 ${state==='relay-configured'?"relay.status='ready';relay.fix=null;relay.configuredValue='https://receiver.fixture';":''}
 this.pluginOpen['git-repository']=${state==='collapsed'?'false':'true'};
 ${state==='ci-settings'?"this.pluginOpen['git-settings']=true;":''}
 ${state==='accounts'?"this.pluginOpen['git-requirements']=true;this.pluginOpen['git-cloudflare-login-selection']=true;":''}
 ${state==='picker-loading'?"this.listPicker={key:'git:repository',loading:true,error:null,items:[],add:null,selected:[]};":''}
 ${state==='picker-items'?"this.listPicker={key:'git:repository',loading:false,error:null,items:[...repos(30),{id:'owner/blocked',label:'owner/blocked',disabled:true,detail:'Could not check this webhook'}],add(){throw Error('Fixture cannot add');},selected:['owner/repo1']};":''}
 ${state==='picker-error'?"this.listPicker={key:'git:repository',loading:false,error:'Could not load the repository list with GitHub CLI.',items:[],add:null,selected:[]};":''}
 ${state==='row-hover'?"this.pluginRowHover='st-plugin-list-git-repository-row-1';":''}
 ${state==='updating'?"this.pluginFixing='git:repository';":''}}
 heading(t,title,about){return v_flex().child(title).child(about);}
 toggle(t,id,on){return Toggle.new(id).pressed(on);}
 render(){return v_flex().child(pluginsPage(this,theme()));}
}
`);
   app(['check',dir],home);checked++;
  }
 } finally {dispose();}
 return checked;
}
