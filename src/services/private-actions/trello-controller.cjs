'use strict';
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const fingerprint=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const fail=code=>{throw Object.assign(Error(code),{code});};
const label=machine=>machine??'This computer';
const sameBinding=(a,b)=>a&&b&&['id','session','principal','home'].every(k=>a[k]===b[k]);
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
 const hosts=[...record.hosts.filter(h=>!sameBinding(h.binding,binding)),{machine,binding,access:control.access,intent:control.intent}];
 const next={...record,hosts};store.write('controller',next,record);return publicGlobal(next);
}
async function apply(home,input,{runtime,storeOptions,listMachines,dispatch,isCurrent=()=>true,onApply=()=>{}}){
 const {store,record}=read(home,{runtime,storeOptions});
 if(!['read-only','read-write'].includes(input.access)||typeof input.expected!=='string'||input.expected!==fingerprint(record))fail('CONFLICT');
 const current=record??fresh(),names=new Set([null,...current.hosts.map(h=>h.machine)]),configured=new Set([null]);let inventoryFailed=false;
 try {for(const m of await listMachines())if(typeof m.name==='string'&&m.name.length<=256){names.add(m.name);configured.add(m.name);}}catch{inventoryFailed=true;}
 // Retry unfinished hosts first, retaining progress rather than replaying acknowledged grants.
 const rank=machine=>{const i=current.pending.indexOf(label(machine));return i<0?256:i;};
 const ordered=[...names].sort((a,b)=>rank(a)-rank(b)),todo=new Set(ordered);
 const next={...current,access:input.access,intent:current.access===input.access?current.intent:crypto.randomBytes(32).toString('hex'),pending:[...(inventoryFailed?['Machines']:[]),...ordered.map(label)]};
 store.write('controller',next,record); // Explicit nonportable consent and unfinished membership precede grants.
 const confirmed=new Map(),resolved=new Set(),unmatched=new Set(),failed=new Set();
 const scope=b=>fingerprint(['id','session','principal','home'].map(k=>b[k]));
 const knownScopes=new Map(current.hosts.map(h=>[scope(h.binding),h]));let published=next;
 const checkpoint=()=>{
  const unresolved=machine=>[...knownScopes.values()].filter(h=>h.machine===machine).some(h=>!resolved.has(scope(h.binding)));
  const pending=[...(inventoryFailed?['Machines']:[]),...[...todo].map(label)];
  for(const machine of unmatched)if(unresolved(machine))pending.push(label(machine));
  for(const machine of failed)if(configured.has(machine)||unresolved(machine))pending.push(label(machine));
  const retained=[...knownScopes.values()].filter(h=>!resolved.has(scope(h.binding)));
  const update={...next,hosts:[...retained,...confirmed.values()],pending:[...new Set(pending)]};
  store.write('controller',update,published);published=update;
 };
 for(const machine of ordered){
  if(!isCurrent())fail('STALE');
  const known=[...knownScopes.values()].filter(h=>h.machine===machine),saved=await dispatch(home,{machine},{action:'status'});
  if(!saved.ok){failed.add(machine);todo.delete(machine);checkpoint();continue;}
  const binding=saved.data.destination;
  if(!binding)fail('MACHINE_CHANGED');
  const previous=known.filter(h=>!sameBinding(h.binding,binding));
  if(previous.length)unmatched.add(machine); // A replacement peer cannot acknowledge the old execution scope.
  if(!saved.data.configured){resolved.add(scope(binding));todo.delete(machine);checkpoint();continue;}
  if(fingerprint(read(home,{runtime,storeOptions}).record)!==fingerprint(published))fail('CONFLICT');
  const acknowledged=saved.data.control;
  if(acknowledged?.controller===next.id&&acknowledged.intent===next.intent&&acknowledged.enabled===true&&acknowledged.access===next.access&&['id','session','principal','home'].every(k=>acknowledged.binding?.[k]===binding[k])&&saved.data.localWrites===(next.access==='read-write')){
   confirmed.set(scope(binding),{machine,binding,access:next.access,intent:next.intent});resolved.add(scope(binding));todo.delete(machine);checkpoint();continue;
  }
  if(!knownScopes.has(scope(binding))){
   knownScopes.set(scope(binding),{machine,binding,access:saved.data.control?.access??(saved.data.localWrites?'read-write':'read-only'),intent:saved.data.control?.intent??'0'.repeat(64)});
   checkpoint(); // A possible grant cannot outlive knowledge of its exact execution scope.
  }
  const control={version:1,controller:next.id,binding,enabled:true,access:next.access,intent:next.intent};
  onApply();
  const result=await dispatch(home,{machine,binding},{action:'control',expected:saved.data.revision,control});
  if(result.ok){confirmed.set(scope(binding),{machine,binding,access:next.access,intent:next.intent});resolved.add(scope(binding));}
  else failed.add(machine);
  todo.delete(machine);checkpoint();
 }
 return publicGlobal(published);
}
module.exports={read,fresh,status,initial,register,apply,publicGlobal,fingerprint};
