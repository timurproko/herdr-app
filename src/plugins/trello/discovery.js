import {exec, appHome, checking, shared, setShared, notify} from '../api.js';
const key='custom.trello.discovery';
async function request(mode,machine,enabled){
 const r=await exec('node',[`${appHome()}/.customizations/runtime/lib/private-actions/trello-transport.cjs`,mode,appHome(),JSON.stringify(machine??null),String(enabled)],{timeout:60000});
 let result;try{result=JSON.parse(r.stdout);}catch{}
 if(r.code!==0||result?.ok!==true)throw Error(result?.error?.message??'Trello agent preparation failed. Check the execution machine in Settings.');
 return result.data;
}
export async function prepareProfile(cx){
 if(checking())return {};
 const enabled=cx.enabled===true;
 const result=await request('--prepare',cx.machine,enabled);
 if(cx.isCurrent?.()===false)throw Error('Plugin settings changed. Reopen the profile menu.');
 return result;
}
export async function enabledChanged(enabled){
 if(checking())return;
 // Invalidate pending lifecycle work immediately, even in another mounted copy.
 setShared(key,{enabled,generation:`${Date.now()}-${Math.random()}`,phase:'needed'});
 await synchronize(enabled);
}
async function synchronize(enabled){
 const old=shared(key),token=`${Date.now()}-${Math.random()}`;
 if(old?.enabled===enabled&&old.phase==='running'&&old.expires>Date.now())return;
 setShared(key,{enabled,generation:token,phase:'running',expires:Date.now()+65000});
 try{
  const result=await request('--discovery-all',null,enabled);
  if(shared(key)?.generation!==token)return;
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
