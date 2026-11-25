// Field-aware policy shared by the installer and public-API startup repair.
export const PALETTE_SCOPE='layout:Custom',PALETTE_KEY='ctrl-shift-p',PALETTE_ACTION='mod.open:custom-palette';
const object=v=>v!==null&&typeof v==='object'&&!Array.isArray(v);
const equal=(a,b)=>JSON.stringify(a)===JSON.stringify(b);
const native=v=>v==='app.palette'||(object(v)&&v.command==='app.palette'&&(!v.args||!Object.keys(v.args).length));
const owned=v=>v===PALETTE_ACTION||(object(v)&&v.command==='mod.open'&&object(v.args)&&Object.keys(v.args).length===1&&v.args.name==='custom-palette');
// GPUI Keystroke::parse: modifier order/case is immaterial, uppercase ASCII
// letters imply Shift, secondary is Ctrl except on macOS, cmd/super/win alias.
export function normalizeKeystroke(source,platform='windows'){
  if(typeof source!=='string')return null;
  const text=source.trim();if(!text||/\s/.test(text))return null;
  const parts=text.split('-'),key=parts.pop();if(!key)return null;
  const modifiers=new Set();
  for(const part of parts){const p=part.toLowerCase();if(['ctrl','alt','shift','fn'].includes(p))modifiers.add(p);
    else if(p==='secondary')modifiers.add(platform==='macos'?'platform':'ctrl');
    else if(['cmd','super','win'].includes(p))modifiers.add('platform');else return null;
  }
  if(/^[A-Z]$/.test(key))modifiers.add('shift');
  return [...['ctrl','alt','shift','platform','fn'].filter(p=>modifiers.has(p)),key.toLowerCase()].join('-');
}
export const isPaletteKey=(keys,platform='windows')=>normalizeKeystroke(keys,platform)===PALETTE_KEY;
const matching=(section,platform)=>Object.entries(section??{}).filter(([key])=>isPaletteKey(key,platform));
export function bindingRecord(raw){
  if(raw===null)return null;
  let r;try{r=JSON.parse(raw);}catch{throw Error('Unrecognized palette binding ownership record');}
  if(!object(r)||r.version!==1||r.enabled!==true||r.scope!==PALETTE_SCOPE||r.key!==PALETTE_KEY||r.action!==PALETTE_ACTION||typeof r.hadBinding!=='boolean'||(r.hadBinding&&typeof r.original!=='string'&&!object(r.original)))throw Error('Unrecognized palette binding ownership record');
  if(r.platform!==undefined&&!['windows','linux','macos'].includes(r.platform))throw Error('Unrecognized palette binding ownership record');
  if(r.originalBindings!==undefined&&(!object(r.originalBindings)||Object.entries(r.originalBindings).some(([key,value])=>!isPaletteKey(key,r.platform)||!native(value))))throw Error('Unrecognized palette binding ownership record');
  return r;
}
export function planBinding(keysRaw,recordRaw,{install=false,defaults=null,platform='windows'}={}){
  let record=bindingRecord(recordRaw);
  if(!record&&!install)return {status:'not-installed',keys:keysRaw,record:recordRaw,changed:false};
  let keys;try{keys=keysRaw===null?defaults:JSON.parse(keysRaw);}catch{throw Error('Palette keys unavailable or malformed; native defaults must be readable');}
  if(!object(keys))throw Error('Palette keys unavailable or malformed; native defaults must be readable');
  for(const [scope,values]of Object.entries(keys)){
    if(!object(values))throw Error('Malformed key binding section');
    if((scope==='terminal'||scope.startsWith('mod:'))&&matching(values,platform).length)throw Error('Higher-priority personal palette binding conflicts');
  }
  const section=keys[PALETTE_SCOPE]??{},matches=matching(section,platform),owns=matches.some(([,v])=>owned(v));
  if(matches.some(([,v])=>!owned(v)&&!native(v)))throw Error('Personal palette shortcut conflict; refusing overwrite');
  if(!owns&&matching(keys.global,platform).some(([,v])=>!owned(v)&&!native(v)))throw Error('Personal palette shortcut conflict in global keys; refusing override');
  if(!record){
    const originals=Object.fromEntries(matches.filter(([,v])=>!owned(v))),first=Object.values(originals)[0];
    record={version:1,enabled:true,scope:PALETTE_SCOPE,key:PALETTE_KEY,action:PALETTE_ACTION,hadBinding:first!==undefined,original:first??null,originalBindings:originals,platform};
  }
  const nextRecord=recordRaw??JSON.stringify(record,null,2)+'\n';
  if(matches.length===1&&matches[0][0]===PALETTE_KEY&&matches[0][1]===PALETTE_ACTION)return {status:recordRaw===null?'installed':'already-current',keys:keysRaw,record:nextRecord,changed:recordRaw===null};
  const next={...section};for(const [key]of matches)delete next[key];next[PALETTE_KEY]=PALETTE_ACTION;keys[PALETTE_SCOPE]=next;
  return {status:recordRaw===null?'installed':'repaired',keys:JSON.stringify(keys,null,2)+'\n',record:nextRecord,changed:true};
}
export function restoreBinding(keysRaw,recordRaw){
  const r=bindingRecord(recordRaw);if(!r)return keysRaw;
  if(keysRaw===null)throw Error('Keys missing; palette binding restore refused');
  let keys;try{keys=JSON.parse(keysRaw);}catch{throw Error('Keys changed; palette binding restore refused');}if(!object(keys)||!object(keys[PALETTE_SCOPE]))throw Error('Keys changed; palette binding restore refused');
  const original=r.originalBindings??(r.hadBinding?{[PALETTE_KEY]:r.original}:{}),section=keys[PALETTE_SCOPE],matches=matching(section,r.platform??'windows');
  if(matches.some(([key,value])=>!owned(value)&&!native(value)&&!equal(value,original[key])))throw Error('Personal palette shortcut edit; restore refused');
  if(!matches.some(([,value])=>owned(value)))return keysRaw;
  for(const [key,value]of matches)if(owned(value))delete section[key];
  for(const [key,value]of Object.entries(original))section[key]=value;
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
    const plan=planBinding(keyRaw,recordRaw,{install,defaults:keyRaw===null?await io.defaults():null,platform:io.platform?.()??'windows'});
    if(plan.status==='not-installed')return {ok:false,status:plan.status,error:'Palette binding has not been installed'};
    try{
      // Durable intent precedes key update: interrupted installation is repairable.
      if(plan.record!==recordRaw)await io.write('.customizations/palette-binding.json',plan.record,recordRaw);
      if(plan.keys!==keyRaw)await io.write('keys.json',plan.keys,keyRaw);
      return {ok:true,status:plan.status,changed:plan.changed};
    }catch(error){if(attempt)throw error;}
  }
}
function utf8Size(text){let size=0;for(const ch of text){const c=ch.codePointAt(0);size+=c<128?1:c<2048?2:c<65536?3:4;}return size;}
export function boundedLog(raw,status,now=Date.now()){
  const line=JSON.stringify({at:new Date(now).toISOString(),ok:status.ok===true,status:String(status.status??'error').slice(0,80),reason:status.ok?'':String(status.error??'Palette repair failed').replace(/[\r\n]/g,' ').slice(0,240)});
  const lines=(raw??'').split('\n').filter(Boolean);if(lines.at(-1)===line)return raw;
  lines.push(line);while(lines.length>128||utf8Size(lines.join('\n'))>65000)lines.shift();return lines.join('\n')+'\n';
}
