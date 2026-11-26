'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const fingerprint=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
const label=machine=>machine??'This computer';
function api(runtime){return require(path.join(runtime,'lib/trello/credentials.cjs'));}
function read(home,{runtime,storeOptions}={}) {
 const {Store,safePath}=api(runtime),store=new Store(home,storeOptions);safePath(store.dir);
 return {store,record:fs.existsSync(store.dir)?store.read('controller',true):null};
}
function fresh(){return {version:1,id:crypto.randomBytes(32).toString('hex'),intent:crypto.randomBytes(32).toString('hex'),access:'read-only',hosts:[],pending:[]};}
function publicGlobal(record){
 return {access:record?.access??'read-only',revision:fingerprint(record),pending:[...new Set([...(record?.pending??[]),...(record?.hosts??[]).filter(h=>h.access!==record.access||h.intent!==record.intent).map(h=>label(h.machine))])]};
}
function status(home,options){return publicGlobal(read(home,options).record);}
function ensure(home,options){const {store,record}=read(home,options);if(record)return record;const value=fresh();store.write('controller',value);return value;}
function initial(home,binding,options){const record=ensure(home,options);return {version:1,controller:record.id,binding,enabled:true,access:'read-only',intent:record.intent};}
function register(home,machine,binding,control,options){
 const {store,record}=read(home,options);if(!record||record.id!==control?.controller)fail('CONTROL_CONFLICT');
 const hosts=[...record.hosts.filter(h=>h.machine!==machine),{machine,binding,access:control.access,intent:control.intent}];
 const next={...record,hosts};store.write('controller',next,record);return publicGlobal(next);
}
async function apply(home,input,{runtime,storeOptions,listMachines,dispatch,isCurrent=()=>true}){
 const {store,record}=read(home,{runtime,storeOptions});
 if(!['read-only','read-write'].includes(input.access)||typeof input.expected!=='string'||input.expected!==fingerprint(record))fail('CONFLICT');
 const current=record??fresh(),next={...current,access:input.access,intent:crypto.randomBytes(32).toString('hex'),pending:[]};
 store.write('controller',next,record); // Explicit nonportable consent precedes all grants.
 const names=new Set([null,...current.hosts.map(h=>h.machine)]),pending=[];
 try {for(const m of await listMachines())if(typeof m.name==='string'&&m.name.length<=256)names.add(m.name);}catch{pending.push('Machines');}
 const receipts=[];
 for(const machine of names){
  if(!isCurrent())fail('STALE');
  const saved=await dispatch(home,{machine},{action:'status'});
  if(!saved.ok){pending.push(label(machine));const old=current.hosts.find(h=>h.machine===machine);if(old)receipts.push(old);continue;}
  if(!saved.data.configured)continue;
  const binding=saved.data.destination;
  if(!binding)fail('MACHINE_CHANGED');
  if(read(home,{runtime,storeOptions}).record?.intent!==next.intent)fail('CONFLICT');
  const control={version:1,controller:next.id,binding,enabled:true,access:next.access,intent:next.intent};
  const result=await dispatch(home,{machine,binding},{action:'control',expected:saved.data.revision,control});
  if(result.ok)receipts.push({machine,binding,access:next.access,intent:next.intent});
  else {pending.push(label(machine));const old=current.hosts.find(h=>h.machine===machine);if(old)receipts.push(old);}
 }
 const final={...next,hosts:receipts,pending};
 store.write('controller',final,next);
 return publicGlobal(final);
}
module.exports={read,fresh,status,initial,register,apply,publicGlobal,fingerprint};
