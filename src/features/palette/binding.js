// Field-aware policy shared by the installer and public-API startup repair.
export const PALETTE_SCOPE='layout:Custom',PALETTE_KEY='ctrl-shift-p',PALETTE_ACTION='mod.open:custom-palette';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const native=v=>v==='app.palette'||(object(v)&&v.command==='app.palette'&&(!v.args||!Object.keys(v.args).length));
export function bindingRecord(raw){
  if(raw===null)return null;
  const r=JSON.parse(raw);
  if(!object(r)||r.version!==1||r.enabled!==true||r.scope!==PALETTE_SCOPE||r.key!==PALETTE_KEY||r.action!==PALETTE_ACTION||typeof r.hadBinding!=='boolean'||(r.hadBinding&&typeof r.original!=='string'&&!object(r.original)))throw Error('Unrecognized palette binding ownership record');
  return r;
}
export function planBinding(keysRaw,recordRaw,{install=false,defaults=null}={}){
  let record=bindingRecord(recordRaw);
  if(!record&&!install)return {status:'not-installed',keys:keysRaw,record:recordRaw,changed:false};
  const keys=keysRaw===null?defaults:JSON.parse(keysRaw);
  if(!object(keys))throw Error('Palette keys unavailable or malformed; native defaults must be readable');
  for(const [scope,values]of Object.entries(keys)){
    if(!object(values))throw Error('Malformed key binding section');
    if((scope==='terminal'||scope.startsWith('mod:'))&&Object.hasOwn(values,PALETTE_KEY))throw Error('Higher-priority personal palette binding conflicts');
  }
  if(keys[PALETTE_SCOPE]!==undefined&&!object(keys[PALETTE_SCOPE]))throw Error('Malformed Custom key section');
  const section=keys[PALETTE_SCOPE]??{},had=Object.hasOwn(section,PALETTE_KEY),current=section[PALETTE_KEY];
  if(had&&current!==PALETTE_ACTION&&!native(current))throw Error('Personal palette shortcut conflict; refusing overwrite');
  if(!record)record={version:1,enabled:true,scope:PALETTE_SCOPE,key:PALETTE_KEY,action:PALETTE_ACTION,hadBinding:had&&current!==PALETTE_ACTION,original:had&&current!==PALETTE_ACTION?current:null};
  const nextRecord=recordRaw??JSON.stringify(record,null,2)+'\n';
  if(current===PALETTE_ACTION)return {status:recordRaw===null?'installed':'already-current',keys:keysRaw,record:nextRecord,changed:recordRaw===null};
  keys[PALETTE_SCOPE]={...section,[PALETTE_KEY]:PALETTE_ACTION};
  return {status:recordRaw===null?'installed':'repaired',keys:JSON.stringify(keys,null,2)+'\n',record:nextRecord,changed:true};
}
export function restoreBinding(keysRaw,recordRaw){
  const r=bindingRecord(recordRaw);if(!r)return keysRaw;
  if(keysRaw===null)throw Error('Keys missing; palette binding restore refused');
  const keys=JSON.parse(keysRaw);if(!object(keys)||!object(keys[PALETTE_SCOPE]))throw Error('Keys changed; palette binding restore refused');
  const actual=keys[PALETTE_SCOPE][PALETTE_KEY];
  if(actual!==PALETTE_ACTION){if(native(actual))return keysRaw;if((!r.hadBinding&&actual===undefined)||(r.hadBinding&&equal(actual,r.original)))return keysRaw;throw Error('Personal palette shortcut edit; restore refused');}
  if(r.hadBinding)keys[PALETTE_SCOPE][PALETTE_KEY]=r.original;else delete keys[PALETTE_SCOPE][PALETTE_KEY];
  if(!Object.keys(keys[PALETTE_SCOPE]).length)delete keys[PALETTE_SCOPE];
  return JSON.stringify(keys,null,2)+'\n';
}
export function defaultsFromBindings(bindings){
  const keys={};for(const b of bindings){
    if(b.keys==='ctrl-alt-shift-escape')continue;
    let action=b.action;if(typeof action==='string'&&action.startsWith('{'))try{action=JSON.parse(action);}catch{}
    (keys[b.section]??={})[b.keys]=action;
  }return keys;
}
// write is expected-value CAS; only one retry after a fresh snapshot, never force.
export async function reconcileBinding(io,{install=false}={}){
  for(let attempt=0;attempt<2;attempt++){
    await io.guard();
    const keyRaw=await io.read('keys.json'),recordRaw=await io.read('.customizations/palette-binding.json');
    const plan=planBinding(keyRaw,recordRaw,{install,defaults:keyRaw===null?await io.defaults():null});
    if(plan.status==='not-installed')return {ok:false,status:plan.status,error:'Palette binding has not been installed'};
    try{
      // Durable intent precedes key update: interrupted installation is repairable.
      if(plan.record!==recordRaw)await io.write('.customizations/palette-binding.json',plan.record,recordRaw);
      if(plan.keys!==keyRaw)await io.write('keys.json',plan.keys,keyRaw);
      return {ok:true,status:plan.status,changed:plan.changed};
    }catch(error){if(attempt)throw error;}
  }
}
export function boundedLog(raw,status,now=Date.now()){
  const line=JSON.stringify({at:new Date(now).toISOString(),ok:status.ok===true,status:String(status.status??'error').slice(0,80),reason:status.ok?'':String(status.error??'Palette repair failed').replace(/[\r\n]/g,' ').slice(0,240)});
  const lines=(raw??'').split('\n').filter(Boolean);if(lines.at(-1)===line)return raw;
  lines.push(line);while(lines.length>128||lines.join('\n').length>65000)lines.shift();return lines.join('\n')+'\n';
}
