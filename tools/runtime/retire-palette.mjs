// Guarded retirement after owned routing is staged; explicit rollback recovers
// prior opt-in intent through refresh, never by replaying an old native image.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {guardPaletteHome,safePalettePath} from './palette-policy.mjs';
import {planBinding} from './palette-binding.js';
import {loadFrameRegistry} from './frame-registry.mjs';
import {inspectFramePatch} from './frame-patch.mjs';
import {capturePaletteRetirement,recordPaletteRetirement} from './palette-recovery.mjs';
const bundle=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
const hash=v=>v===null?null:crypto.createHash('sha256').update(v).digest('hex');
const read=file=>fs.existsSync(file)?fs.readFileSync(file,'utf8'):null;
function write(home,rel,text,expected){
  const file=safePalettePath(home,rel);if(read(file)!==expected)throw Error('Concurrent palette retirement edit');
  fs.mkdirSync(path.dirname(file),{recursive:true});
  if(text===null){if(expected!==null)fs.unlinkSync(file);return;}
  const tmp=`${file}.retire-${process.pid}.tmp`;
  try{fs.writeFileSync(tmp,text,{flag:'wx'});if(read(file)!==expected)throw Error('Concurrent palette retirement edit');fs.renameSync(tmp,file);}finally{if(fs.existsSync(tmp))fs.unlinkSync(tmp);}
}
export function paletteIntent(home){return fs.existsSync(path.join(home,'.customizations/palette-binding.json'));}
export function retirePalette(home,root=bundle,options={}){
  if(!paletteIntent(home))return {ok:true,status:'not-migrated'};
  const capabilities=guardPaletteHome(home,options);
  if(capabilities.deferred)return {ok:true,status:capabilities.status,deferred:true};
  const keys=read(safePalettePath(home,'keys.json')),policy=read(safePalettePath(home,'.customizations/palette-binding.json'));
  if(keys===null)return {ok:true,status:'awaiting-native-keys',deferred:true};
  const plan=planBinding(keys,policy,{platform:process.platform==='darwin'?'macos':process.platform==='win32'?'windows':'linux'});
  if(plan.changed||plan.status!=='already-current')return {ok:false,status:'retirement-deferred',error:'Owned palette binding must be reconciled before patch retirement'};
  const recordRel='.customizations/frame-palette.json',recordRaw=read(safePalettePath(home,recordRel)),markerRel='.customizations/palette-retired.json';
  if(recordRaw===null){
    const before=read(safePalettePath(home,markerRel));
    if(before===null)write(home,markerRel,JSON.stringify({version:1,retired:true,status:'no-native-patch'})+'\n',null);
    return {ok:true,status:'retired'};
  }
  // Inspection validates record shape and all helper conflicts before any write.
  const inspection=inspectFramePatch(home,root,'palette',options),patch=loadFrameRegistry(root).find(p=>p.id==='palette');
  const state=JSON.parse(recordRaw),current={};
  for(const n of Object.keys(patch.files))current[n]=read(safePalettePath(home,`${patch.target}/${n}`));
  const recognized=n=>[state.installed[n],state.previousInstalled?.[n],hash(state.original[n]??null)].includes(hash(current[n]));
  for(const n of Object.keys(patch.files).filter(n=>n!=='main.js'))if(current[n]!==null&&!recognized(n))throw Error('Personal palette helper edit; retirement refused');
  const originals=patch.originals.map(rel=>read(path.join(root,rel))),stock=originals.includes(current['main.js']);
  const unknown=!stock&&!recognized('main.js');
  if(!stock&&!unknown&&inspection.status!=='ready')return {ok:false,status:'retirement-deferred',error:'Owned native palette masks unreviewed current stock; retirement preserved pending provenance'};
  let native=stock?current['main.js']:unknown?null:read(path.join(root,inspection.original));
  if(!unknown&&native===null)throw Error('Reviewed native palette restore source unavailable');
  // Installed original snapshots remain ownership-checked, not merely whatever a
  // personally modified runtime registry now calls an original.
  if(path.resolve(root)===path.resolve(home,'.customizations/runtime')){
    const manifest=JSON.parse(read(path.join(home,'.customizations/manifest.json')));
    for(const rel of ['frame-patches/registry.json',...patch.originals]){
      const bytes=read(safePalettePath(home,`.customizations/runtime/${rel}`));
      if(hash(bytes)!==manifest.files?.[`.customizations/runtime/${rel}`])throw Error('Native palette restore provenance was modified');
    }
  }
  const recovery=capturePaletteRetirement(home);
  if(recovery?.record!==recordRaw||Object.entries(current).some(([n,value])=>(recovery.frames[`${patch.target}/${n}`]??null)!==hash(value)))throw Error('Concurrent palette retirement ownership edit');
  const archiveRel=`.customizations/recovery/palette-retirement/${hash(recordRaw)}.json`,prior=read(safePalettePath(home,archiveRel));
  const markerText=JSON.stringify({version:1,retired:true,status:unknown?'preserved-unknown-target':'restored-current-stock',archive:archiveRel,preservedNativeFiles:unknown})+'\n';
  const after={...recovery.frames};
  if(!unknown)for(const n of Object.keys(patch.files))after[`${patch.target}/${n}`]=hash(n==='main.js'?native:state.original[n]??null);
  // Prepared before native mutation, bound to this deployment and exact frame
  // hashes. Rollback can recognize partial retirement without trusting old main bytes.
  recordPaletteRetirement(home,recovery,hash(read(safePalettePath(home,'.customizations/manifest.json'))),after,markerText);
  if(prior!==null&&prior!==recordRaw)throw Error('Palette recovery archive conflict');
  if(prior===null)write(home,archiveRel,recordRaw,null);
  if(!unknown){
    // Native main first, then helpers. Never put an old record's main over new stock.
    if(current['main.js']!==native)write(home,`${patch.target}/main.js`,native,current['main.js']);
    for(const n of Object.keys(patch.files).filter(n=>n!=='main.js')){
      const original=state.original[n]??null;if(current[n]!==original)write(home,`${patch.target}/${n}`,original,current[n]);
    }
  }
  // Unknown entrypoint may be newer stock OR a personal edit. Preserve the entire
  // frame tree, explicitly report it, and archive management rather than guess.
  write(home,recordRel,null,recordRaw);
  write(home,markerRel,markerText,recovery.marker);
  return {ok:true,status:unknown?'retired-with-preserved-target':'retired',preservedNativeFiles:unknown};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
  try{if(!process.argv[2])throw Error('App home required');console.log(JSON.stringify(retirePalette(process.argv[2])));}
  catch(error){console.error(JSON.stringify({ok:false,error:error.message}));process.exitCode=1;}
}
