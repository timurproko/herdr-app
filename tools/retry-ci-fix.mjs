// Explicit, exact-attempt manual retry. Reuses the INSTALLED Git controller;
// no raw keys, force, focus change, automatic retry loop, or broad journal reset.
import {temporaryMod} from './temporary-mod.mjs';
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {app,defaultHome} from './deploy.mjs';
const job=JSON.parse(process.argv[2]??'{}');
if(job.confirm!==true||!/^\w[\w.-]*\/[\w.-]+$/.test(job.repository??'')||!/^([a-z0-9_-]+\/)?t[a-z0-9]+$/i.test(job.terminal??'')
    ||!/^([a-f0-9]{40})$/i.test(job.head??'')||![job.pr,job.run,job.attempt,job.createdMs,job.receiptAt].every(n=>Number.isSafeInteger(n)&&n>0))
  throw Error('An explicitly confirmed exact PR/head/run/attempt/terminal/receipt is required.');
const home=defaultHome(),nonce=crypto.randomUUID(),name='custom-ci-retry-'+nonce.slice(0,8),dir=path.join(home,'mods',name);
const resultPath=path.join(home,'.customizations',`ci-retry-${nonce}.json`);
const before=JSON.parse(app(['status'],home));
if(before.overlays?.length)throw Error('Close existing overlays before retry; no state was changed.');
if(fs.existsSync(dir)||fs.existsSync(resultPath))throw Error('Retry artifacts already exist; preserve them.');
const installed=path.join(home,'mods/custom-changes');
if(!fs.existsSync(path.join(installed,'ci-core-send.js')))throw Error('Install the reviewed done-state fix first.');
const wait=ms=>new Promise(resolve=>setTimeout(resolve,ms));
let result;
const dispose=temporaryMod(home,name);
try {
  fs.cpSync(installed,dir,{recursive:true});
  fs.writeFileSync(path.join(dir,'mod.json'),JSON.stringify({place:'none',overlay:{width:420,height:90}}));
  fs.writeFileSync(path.join(dir,'main.js'),`import {View,div} from 'gpui-kit';
import {checking,props,closeOverlay,appHome,readTextFile,writeTextFile,hc,exec} from './host.js';
import {CIFix,terminalIdentity} from './ci-fix.js';import {CIFixHistory,parseHistory} from './ci-fix-history.js';
import {AgentLinks,agentTargets} from './agent-links.js';import {currentPull} from './ci-fix-model.js';
import {pluginById,pluginSetting,sidebarPanelEnabled} from './plugins.js';
const job=${JSON.stringify(job)},nonce=${JSON.stringify(nonce)},resultFile=${JSON.stringify(resultPath)};
export default class Retry extends View {
 init(_p,cx){if(checking())return;const overlay=props()?.overlay??${JSON.stringify(name)},deadline=Date.now()+90000;
 cx.spawn(async cx=>{let reset=false,output;
 try{
  const target=agentTargets().find(t=>t.address===job.terminal);
  if(!target)throw Error('Target is no longer a mapped live agent.');
  const current=()=>Date.now()<deadline&&sidebarPanelEnabled('changes')&&pluginSetting(pluginById('git'),'autoFixCI')===true&&agentTargets().some(t=>t.key===target.key);
  if(!current())throw Error('Git CI automation is disabled or the target changed.');
  const raw=await hc(['get',target.address,'--json']);if(raw.code!==0)throw Error('Cannot verify target.');
  const terminal=JSON.parse(raw.stdout),identity=terminalIdentity(terminal,target);
  if(!identity||terminal.created_ms!==job.createdMs||!['idle','done'].includes(terminal.status?.state))throw Error('Target is not the exact ready agent.');
  const lookup=await exec('gh',['api','repos/'+job.repository+'/pulls/'+job.pr],{on:target.on,cwd:target.cwd,timeout:15000});
  const rest=JSON.parse(lookup.stdout),pr={number:job.pr,state:'open',headRefOid:job.head,headRefName:rest.head?.ref,checks:{bad:1}};
  if(lookup.code!==0||!currentPull(lookup.stdout,pr,job.repository))throw Error('PR head or state changed.');
  const key=JSON.stringify([job.repository.toLowerCase(),job.pr,job.head.toLowerCase(),job.run,job.attempt]);
  const file=appHome()+'/.customizations/git-ci-fix-history.json',history=new CIFixHistory(),claim=history.claim.bind(history);
  history.claim=async(keys,live)=>{
   if(!live()||!keys.includes(key))return [];
   const text=await readTextFile(file),data=parseHistory(text),old=data.entries.find(e=>e.key===key);
   if(!old||old.at!==job.receiptAt||old.token!==undefined||old.outcome!==undefined)throw Error('The approved legacy receipt changed; fresh confirmation is required.');
   if(!live())return [];
   await writeTextFile(file,JSON.stringify({...data,entries:data.entries.filter(e=>e!==old)}),text);reset=true;
   return claim([key],live); // CAS ownership prevents another window from also sending it.
  };
  const links=new AgentLinks(current),controller=new CIFix(current,history);
  await controller.request({repo:job.repository,root:target.cwd,on:target.on,links,template:pluginSetting(pluginById('git'),'ciFixMessage')},pr,target,identity,current);
  const receipt=parseHistory(await readTextFile(file)).entries.find(e=>e.key===key);
  const after=await hc(['get',target.address,'--json']);let facts;try{facts=JSON.parse(after.stdout);}catch{}
  output={ok:receipt?.outcome==='delivered',reset,outcome:receipt?.outcome??'not-confirmed',beforeTurn:terminal.turn,afterTurn:facts?.turn,status:facts?.status?.state};
 }catch{output={ok:false,reset,outcome:'not-confirmed',error:'Retry could not be confirmed. No automatic repeat; inspect the agent and journal.'};}
 try{await writeTextFile(resultFile,JSON.stringify({nonce,...output}),null);}finally{closeOverlay(overlay);}
 });}
 render(){return div().p(16).text_size(13).child('Retrying the confirmed CI message for PR #'+job.pr+'…');}
}
`);
  app(['check',dir],home); // checking() guarantees this never executes a retry.
  for(let i=0;;i++){try{app(['do','mod.open','--name',name],home);break;}catch(error){if(i===20)throw error;await wait(100);}}
  for(let i=0;i<1000;i++){
    if(fs.existsSync(resultPath)){
      const value=JSON.parse(fs.readFileSync(resultPath,'utf8'));
      if(value.nonce!==nonce)throw Error('Mismatched retry receipt.');result=value;break;
    }
    await wait(100);
  }
  if(!result)throw Error('Retry outcome is unknown; do not run this command again blindly.');
  console.log(JSON.stringify(result,null,2));if(!result.ok)process.exitCode=1;
} finally {
  try{const status=JSON.parse(app(['status'],home));if(status.overlays?.includes(name))app(['do','overlay.close','--id',name],home);}
  finally{dispose();if(result)fs.rmSync(resultPath,{force:true});}
}
