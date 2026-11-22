// Explicitly enroll ALREADY installed local/SSH monitors through supported native preference APIs.
// This is a live configuration action, never a test/deploy step; it may enable CI delivery.
import fs from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';
import {app,defaultHome} from './deploy.mjs';
import {temporaryMod,installTemporaryHostFacade} from './temporary-mod.mjs';
const hosts=process.argv.slice(2).map(s=>s==='local'?null:s);
if(!hosts.length||hosts.some(s=>s!==null&&!/^[A-Za-z0-9_-]{1,100}$/.test(s)))throw Error('Use enroll-core-ci.mjs local [ssh-machine ...]');
const home=defaultHome(),name='custom-ci-monitor-enrollment',dir=path.join(home,'mods',name),nonce=crypto.randomUUID();
if(fs.existsSync(dir))throw Error('Enrollment helper already exists; preserve it.');
const file=path.join(home,'.customizations/core-ci-enrollment.json');
const source=`import {View,div} from 'gpui-kit';
import {shared,setShared,appHome,writeTextFile,readTextFile,closeOverlay,props,checking} from './host.js';
import {pluginById,pluginContext,pluginEnabled,setPluginSetting} from './plugins.js';
import {syncMonitors} from './plugins/git/monitor-actions.js';
export default class Enroll extends View {
 init(_p,cx){if(checking())return;cx.spawn(async()=>{let result;try{
 const plugin=pluginById('git'),cx={...pluginContext(plugin),enabled:()=>pluginEnabled(plugin)};
 if(!cx.setting('ciMonitorRepositories'))setPluginSetting(plugin,'ciMonitorRepositories',cx.setting('repository')||'');
 const prior=shared('custom.git.monitor-hosts');
 if(prior&&prior.version!==1)throw Error('Unknown managed-host registry');
 setShared('custom.git.monitor-hosts',{version:1,hosts:[...new Set([...(prior?.hosts??[]),...${JSON.stringify(hosts)}])]});
 const replies=await syncMonitors(cx);result={ok:true,hosts:${JSON.stringify(hosts)},replies};
 }catch{result={ok:false,error:'Enrollment/configuration failed; inspect worker status before retrying.'};}
 const file=appHome()+'/.customizations/core-ci-enrollment.json';await writeTextFile(file,JSON.stringify({nonce:${JSON.stringify(nonce)},...result}),await readTextFile(file));closeOverlay(props()?.overlay);});}
 render(){return div().child('Applying Core-side CI settings…');}
}`;
const dispose=temporaryMod(home,name,()=>!fs.existsSync(path.join(dir,'main.js'))||fs.readFileSync(path.join(dir,'main.js'),'utf8')===source);
try{
 installTemporaryHostFacade(dir);
 for(const file of ['plugins.js','space-color-state.js'])fs.copyFileSync(path.join(home,'mods/custom-settings',file),path.join(dir,file));
 fs.cpSync(path.join(home,'mods/custom-settings/plugins'),path.join(dir,'plugins'),{recursive:true});
 fs.writeFileSync(path.join(dir,'mod.json'),'{"place":"none","overlay":{"width":420,"height":90}}');fs.writeFileSync(path.join(dir,'main.js'),source);
 app(['check',dir],home);
 for(let i=0;;i++){try{app(['do','mod.open','--name',name],home);break;}catch(e){if(i===30)throw e;await new Promise(r=>setTimeout(r,150));}}
 let result;for(let i=0;i<1800;i++){await new Promise(r=>setTimeout(r,100));if(fs.existsSync(file)){const value=JSON.parse(fs.readFileSync(file,'utf8'));if(value.nonce===nonce){result=value;break;}}}
 if(!result?.ok)throw Error(result?.error||'Enrollment timed out; inspect monitor status.');console.log(JSON.stringify(result,null,2));
}finally{dispose();}
