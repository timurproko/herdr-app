// Narrow installation/inspection boundary; startup key writes use the public CAS API.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {planBinding,restoreBinding,boundedLog} from './palette-binding.js';
import {legacyRecent} from './palette-manifests.mjs';
import {missingPaletteUi} from './palette-capabilities.js';
const hash=v=>crypto.createHash('sha256').update(v).digest('hex');
const read=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
export function safePalettePath(home,rel){
  const file=path.join(home,rel);let current=path.resolve(home);
  if(fs.lstatSync(current).isSymbolicLink())throw Error('Linked palette home refused');
  for(const part of rel.split('/')){if(!part||part==='.'||part==='..')throw Error('Invalid palette path');current=path.join(current,part);try{if(fs.lstatSync(current).isSymbolicLink())throw Error('Linked palette configuration refused');}catch(error){if(error.code!=='ENOENT')throw error;}}
  return file;
}
export function guardPaletteHome(home,{startup=false}={}){
  for(const rel of ['keys.json','.customizations/palette-binding.json','.customizations/palette.log','.customizations/palette-recent.json','.customizations/manifest.json'])safePalettePath(home,rel);
  if(startup&&fs.existsSync(path.join(home,'.customizations/deploy.lock')))throw Error('Palette repair waits for customization installation');
  const state=JSON.parse(read(path.join(home,'.customizations/manifest.json'))??'null');
  if(state?.version!==2||state.id!=='custom')throw Error('Palette installation ownership is unavailable');
  const files=Object.entries(state.files??{}).filter(([rel])=>rel.startsWith('mods/custom-palette/'));
  if(!files.some(([rel])=>rel==='mods/custom-palette/main.js')||!files.some(([rel])=>rel==='mods/custom-palette/mod.json'))throw Error('Owned palette payload is missing');
  for(const [rel,digest]of files){const file=safePalettePath(home,rel);if(!fs.existsSync(file)||hash(fs.readFileSync(file))!==digest)throw Error('Owned palette payload was changed or removed');}
  const meta=JSON.parse(read(path.join(home,'mods/custom-palette/mod.json')));
  if(meta.place!=='none'||meta.overlay?.kind!=='popup'||meta.overlay?.at!=='top'||meta.overlay?.offset!==60)throw Error('Owned palette overlay capability metadata changed');
  if(startup&&missingPaletteUi(read(path.join(home,'gpui-kit.d.ts'))??'').length)throw Error('Owned palette GPUI capabilities are unavailable');
  return {ok:true};
}
function cas(home,rel,text,expected){
  const file=safePalettePath(home,rel);if(read(file)!==expected)throw Error('Concurrent palette configuration edit');
  fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.palette-${process.pid}.tmp`;
  try{fs.writeFileSync(temp,text,{flag:'wx'});if(read(file)!==expected)throw Error('Concurrent palette configuration edit');fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
export function paletteInstallPlan(home){
  for(const rel of ['keys.json','.customizations/palette-binding.json'])safePalettePath(home,rel);
  const keyRaw=read(path.join(home,'keys.json')),recordRaw=read(path.join(home,'.customizations/palette-binding.json'));
  // A not-yet-started desktop has no native defaults to merge. Startup uses keys()'s
  // native fallback listing; installation never invents a release's default keys.
  if(keyRaw===null){const plan=planBinding(null,recordRaw,{install:true,defaults:{}});return {...plan,keys:null,keyRaw,recordRaw,changed:plan.record!==recordRaw,deferred:true};}
  return {...planBinding(keyRaw,recordRaw,{install:true}),keyRaw,recordRaw};
}
export async function installPalettePolicy(home){
  guardPaletteHome(home);const plan=paletteInstallPlan(home);
  if(plan.record!==plan.recordRaw)cas(home,'.customizations/palette-binding.json',plan.record,plan.recordRaw);
  if(!plan.deferred&&plan.keys!==plan.keyRaw)cas(home,'keys.json',plan.keys,plan.keyRaw);
  let history='preserved';
  const seed=safePalettePath(home,'.customizations/palette-recent.json');
  if(read(seed)===null){try{cas(home,'.customizations/palette-recent.json',JSON.stringify({version:1,recent:await legacyRecent(home)})+'\n',null);history='seeded';}catch{history='legacy-history-unavailable';}}
  const status={ok:true,status:plan.deferred?'awaiting-native-keys':plan.status,changed:plan.changed,history,...(plan.deferred?{deferred:true}:{})};
  const file=safePalettePath(home,'.customizations/palette.log'),before=read(file);if(plan.changed||history==='legacy-history-unavailable')cas(home,'.customizations/palette.log',boundedLog(before,status),before);
  return status;
}
export function paletteRemovalPlan(home){
  const recordFile=safePalettePath(home,'.customizations/palette-binding.json'),record=read(recordFile);
  if(record===null)return {removed:false};
  const before=read(safePalettePath(home,'keys.json')),after=restoreBinding(before,record);
  return {removed:true,before,after,record};
}
export function removePalettePolicy(home){
  const plan=paletteRemovalPlan(home);if(!plan.removed)return plan;
  if(plan.after!==plan.before)cas(home,'keys.json',plan.after,plan.before);
  const recordFile=safePalettePath(home,'.customizations/palette-binding.json');
  if(read(recordFile)!==plan.record)throw Error('Concurrent palette ownership edit');fs.unlinkSync(recordFile);return {removed:true};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{const [action,home]=process.argv.slice(2);if(!home)throw Error('App home required');
    const value=action==='preflight'?paletteInstallPlan(home):action==='inspect'?guardPaletteHome(home,{startup:true}):action==='install'?await installPalettePolicy(home):action==='remove-plan'?paletteRemovalPlan(home):action==='remove'?removePalettePolicy(home):(()=>{throw Error('Unknown palette policy operation');})();console.log(JSON.stringify(value));
  }catch(error){console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=1;}
}
