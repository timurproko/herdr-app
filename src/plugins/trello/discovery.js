import {exec, appHome, checking, shared, setShared, notify} from '../api.js';
const key='custom.trello.discovery';
function nextGeneration(){const clock=key+'.clock',value=Math.max(Date.now(),(shared(clock)??0)+1);setShared(clock,value);return value;}
async function request(mode,machine,enabled){
 const r=await exec('node',[`${appHome()}/.customizations/runtime/lib/private-actions/trello-transport.cjs`,mode,appHome(),JSON.stringify(machine??null),String(enabled),String(nextGeneration())],{timeout:60000});
 let result;try{result=JSON.parse(r.stdout);}catch{}
 if(r.code!==0||result?.ok!==true)throw Error('Trello agent preparation failed. Check skill/launcher ownership and setup on the execution machine in Settings.');
 return result.data;
}
// This public existence/schema probe uses ordinary Core execution, not the
// Trello-only SSH/runtime gate. It reads no credentials and writes nothing.
export const ownershipProbe=`const fs=require('node:fs'),p=require('node:path'),os=require('node:os');const home=process.argv[1]||process.env.HERDR_APP_HOME||p.join(os.homedir(),'.config/herdr-app');const file=p.join(home,'.customizations/trello-announcement.json');let owned=fs.existsSync(p.join(home,'.customizations/trello-announcement.pending.json'));if(fs.existsSync(file)){const s=fs.lstatSync(file);if(s.isSymbolicLink()||!s.isFile()||s.nlink!==1||s.size>65536)owned=true;else{try{const r=JSON.parse(fs.readFileSync(file,'utf8'));owned=owned||!(r?.version===1&&r.enabled===false&&Array.isArray(r.hashes)&&r.hashes.length===2&&r.hashes.every(h=>h===null));}catch{owned=true;}}}process.stdout.write(JSON.stringify({owned}));`;
const hostKey=machine=>JSON.stringify(machine??null);
function rememberHost(machine,owned){const hosts={...(shared(key+'.hosts')??{})},id=hostKey(machine);if(owned)hosts[id]=true;else delete hosts[id];setShared(key+'.hosts',hosts);}
export async function prepareProfile(cx){
 if(checking())return {};
 const enabled=cx.enabled===true;
 if(!enabled){
  let cleanup=shared(key+'.hosts')?.[hostKey(cx.machine)]===true;
  try{
   const probe=await exec('node',['-e',ownershipProbe,cx.machine==null?appHome():''],{on:cx.machine??null,timeout:10000});
   const value=probe.code===0?JSON.parse(probe.stdout):null;
   if(typeof value?.owned==='boolean')cleanup=value.owned;
  }catch{ /* A never-announced disabled plugin cannot become a launch prerequisite. */ }
  if(cx.isCurrent?.()===false)throw Error('Plugin settings changed. Reopen the profile menu.');
  if(!cleanup){rememberHost(cx.machine,false);return {};}
 }
 const result=await request('--prepare',cx.machine,enabled);
 if(cx.isCurrent?.()===false)throw Error('Plugin settings changed. Reopen the profile menu.');
 rememberHost(cx.machine,result.announced===true);
 return result;
}
export async function enabledChanged(enabled){
 if(checking())return;
 // Invalidate pending lifecycle work immediately, even in another mounted copy.
 setShared(key,{enabled,generation:`${Date.now()}-${Math.random()}`,phase:'needed'});
 await synchronize(enabled);
}
async function synchronize(enabled){
 if((shared('custom.plugins')?.trello?.enabled===true)!==enabled)return;
 const old=shared(key),token=`${Date.now()}-${Math.random()}`;
 if(old?.enabled===enabled&&old.phase==='running'&&old.expires>Date.now())return;
 setShared(key,{enabled,generation:token,phase:'running',expires:Date.now()+65000});
 try{
  const result=await request('--discovery-all',null,enabled);
  if(shared(key)?.generation!==token)return;
  for(const machine of result.announced??[])rememberHost(machine,true);
  for(const machine of result.cleaned??[])rememberHost(machine,false);
  setShared(key,{enabled,generation:token,phase:'done',pending:result.pending});
  if(result.pending?.length)notify({title:'Trello agent notes pending',body:`Check ${result.pending.join(', ')} before launching agents there.`,level:'error'});
 }catch(e){if(shared(key)?.generation===token){setShared(key,{enabled,generation:token,phase:'done',pending:true});throw e;}}
}
export function syncLifecycle({owner,cx,enabled}){
 if(checking()||!cx?.spawn)return;
 // A replacement module/window gets one recovery pass, not filesystem polling.
 if(owner.trelloDiscoveryEnabled===enabled)return;
 owner.trelloDiscoveryEnabled=enabled;
 cx.spawn(async task=>{await task.sleep(0);await synchronize(enabled);});
}
