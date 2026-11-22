// Customization deployment only. Never builds/replaces Herdr or edits core documents.
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import cp from 'node:child_process';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {digest,read,put,json,contained,safeRelative} from './files.mjs';
export const defaultHome=()=>process.env.HERDR_APP_HOME||path.join(os.homedir(),'.config/herdr-app');
export const shellPaths=['bash-cwd-loader.sh','bash-cwd.sh','powershell-cwd.ps1','revision'].map(name=>`.customizations/runtime/shell/${name}`);
export const shellRevisionPath=shellPaths.at(-1);
export function allowedPath(rel) {
  safeRelative(rel);
  if(rel.startsWith('.customizations/runtime/shell/')) {
    if(!shellPaths.includes(rel))throw Error(`Unowned deployment path: ${rel}`);
    return rel;
  }
  if(!/^(?:mods\/custom-[a-z-]+\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:js|cjs|json|svg|txt)|layouts\/(?:Custom\.json|custom\.svg)|themes\/Custom\.json|\.customizations\/runtime\/(?:[a-zA-Z0-9_.-]+\/)*[a-zA-Z0-9_.-]+\.(?:js|mjs|cjs|json|svg))$/.test(rel))throw Error(`Unowned deployment path: ${rel}`);
  return rel;
}
import {layoutOverrides,projectLayout} from './layout-preferences.mjs';
export {layoutOverrides,projectLayout} from './layout-preferences.mjs';
function bundleAt(root) {const manifest=json(path.join(root,'bundle.json'));if(manifest?.version!==2||manifest.id!=='custom'||!manifest.files)throw Error('Build the customization package first.');for(const rel of Object.keys(manifest.files))allowedPath(rel);return manifest;}
export function app(args,home=defaultHome()) {
  const executable=process.env.HERDR_APP_BIN||path.join(process.env.LOCALAPPDATA??'', 'Programs/herdr-app/herdr-app.exe');
  // Native checks can spawn read-only git/core children which inherit stdout.
  // Do not wait on a captured pipe after the checker itself has already exited.
  const output=cp.execFileSync(executable,args,{encoding:'utf8',timeout:30000,windowsHide:true,stdio:args[0]==='check'?['ignore','inherit','inherit']:'pipe',env:{...process.env,HERDR_APP_HOME:home}});
  return (output??'').trim();
}
function withLock(home,fn) {
  const owner=contained(home,'.customizations');fs.mkdirSync(owner,{recursive:true});const file=path.join(owner,'deploy.lock');let fd;
  try{fd=fs.openSync(file,'wx');fs.writeFileSync(fd,String(process.pid));}catch(e){throw Error(`Deployment lock exists or cannot be created (${file}); verify no deployment is running before clearing it.`);}
  try{return fn();}finally{fs.closeSync(fd);fs.unlinkSync(file);}
}
export function deploy(root,home=defaultHome(),{adopt={},repair=true,sources=null,shellOnly=false}={}) {
  return withLock(home,()=>{
    const bundle=bundleAt(root),owner=contained(home,'.customizations'),stateFile=path.join(owner,'manifest.json');
    const old=json(stateFile);if(old&&(old.version!==2||old.id!=='custom'))throw Error('Unrecognized deployment ownership record.');
    for(const rel of Object.keys(old?.files??{}))allowedPath(rel);
    const partial=sources!==null,retained=partial||shellOnly;
    if(shellOnly&&partial)throw Error('Shell-only deployment does not accept source selectors.');
    if(partial && (!old || !Array.isArray(sources) || !sources.length))throw Error('Source-scoped deployment needs an existing owned installation and nonempty source selectors.');
    for(const source of sources??[]) {
      if(typeof source!=='string' || !/^(src|tools)\//.test(source))throw Error('Invalid deployment source selector.');
      safeRelative(source.replace(/\/$/,''));
      if(!Object.values(bundle.files).some(entry=>source.endsWith('/')?entry.source?.startsWith(source):entry.source===source))throw Error(`No packaged source matches: ${source}`);
    }
    let selected=Object.entries(bundle.files).filter(([,entry])=>!partial || sources.some(source=>source.endsWith('/')?entry.source?.startsWith(source):entry.source===source));
    // A revision describes the whole shell package, even for source-scoped updates.
    if(partial && selected.some(([rel])=>shellPaths.includes(rel)))selected=[...selected.filter(([rel])=>!shellPaths.includes(rel)),...shellPaths.map(rel=>{
      if(!bundle.files[rel])throw Error(`Missing shell package file: ${rel}`);
      return [rel,bundle.files[rel]];
    })];
    if(shellOnly)selected=shellPaths.map(rel=>{
      if(!bundle.files[rel])throw Error(`Missing shell package file: ${rel}`);
      return [rel,bundle.files[rel]];
    });
    if(partial && selected.some(([rel])=>!rel.startsWith('mods/')&&!rel.startsWith('.customizations/runtime/')))throw Error('Source-scoped deployment preserves layouts/themes; use a full deployment to change them.');
    const prefsFile=contained(home,'.customizations/layout-preferences.json'),prefsRaw=read(prefsFile),prefs=shellOnly||prefsRaw===null?{version:1,overrides:{}}:JSON.parse(prefsRaw);
    if(prefs.version!==1||!prefs.overrides||Array.isArray(prefs.overrides))throw Error('Unsupported layout preferences.');
    const layoutFile='layouts/Custom.json',base=retained?old?.layoutBase:JSON.parse(read(path.join(root,layoutFile))),currentRaw=retained?null:read(contained(home,layoutFile));
    let overrides={...prefs.overrides};
    if(!retained && currentRaw!==null&&old?.layoutBase)overrides={...layoutOverrides(old.layoutBase,JSON.parse(currentRaw)),...overrides};
    const layout=retained?null:projectLayout(base,overrides),jobs=[],files=retained?{...old?.files}:{};
    for(const [rel,entry]of selected) {
      const file=contained(home,rel),current=fs.existsSync(file)?fs.readFileSync(file):null;
      let bytes=entry.text!==undefined?Buffer.from(entry.text):fs.readFileSync(contained(root,entry.from??rel));
      if(digest(bytes)!==entry.hash)throw Error(`Build output changed: ${rel}`);
      if(rel===layoutFile)bytes=Buffer.from(JSON.stringify(layout,null,2)+'\n');
      const actual=digest(current),next=digest(bytes);
      const owned=old?.files?.[rel]===actual||adopt[rel]===actual;
      if(current!==null&&actual!==next&&!owned&&!(rel===layoutFile&&old?.layoutBase))throw Error(`Personal file conflict: ${rel}; nothing deployed.`);
      files[rel]=next;jobs.push({rel,file,current,bytes,before:actual});
    }
    const stale=Object.entries(old?.files??{}).filter(([rel])=>!Object.hasOwn(files,rel)).map(([rel,hash])=>({rel,file:contained(home,rel),hash}));
    for(const item of stale)if(fs.existsSync(item.file)&&digest(fs.readFileSync(item.file))!==item.hash)throw Error(`Modified obsolete file: ${item.rel}; nothing deployed.`);
    const changed=jobs.filter(j=>j.before!==digest(j.bytes));
    const touchedMods=new Set(changed.map(j=>j.rel.match(/^(mods\/[^/]+)\//)?.[1]).filter(Boolean));
    // A dependency-only partial update still needs its native mod reloaded. Keep
    // the installed entrypoint's exact owned bytes, not this branch's version.
    // Preflight every such reload before performing any writes.
    if(partial)for(const mod of touchedMods) {
      const rel=`${mod}/main.js`;
      if(jobs.some(j=>j.rel===rel))continue;
      const file=contained(home,rel),bytes=fs.existsSync(file)?fs.readFileSync(file):null,before=digest(bytes);
      if(bytes===null || old.files[rel]!==before)throw Error(`Personal entrypoint conflict: ${rel}; nothing deployed.`);
      jobs.push({rel,file,current:bytes,bytes,before});
    }
    const nextManifest=JSON.stringify(shellOnly?{...(old??{version:2,id:'custom',supportedHerdr:bundle.supportedHerdr}),files}:{version:2,id:'custom',supportedHerdr:bundle.supportedHerdr,files,layoutBase:base},null,2)+'\n';
    const nextPrefs=retained?prefsRaw:JSON.stringify({version:1,overrides},null,2)+'\n';
    let backup=null;
    if(changed.length||stale.length) {
      const transaction=path.join(owner,'backups',`${Date.now()}-${process.pid}`);
      fs.mkdirSync(transaction,{recursive:true});
      // Journal original bytes outside synced source. No shared/session documents are included.
      backup=path.basename(transaction);
      const rollback={version:1,files:{},after:{},manifest:read(stateFile),preferences:prefsRaw,afterManifest:digest(nextManifest),afterPreferences:digest(nextPrefs),...(shellOnly?{scope:'shell',afterState:nextManifest}:{})};
      for(const j of [...changed,...stale.map(j=>({...j,current:fs.existsSync(j.file)?fs.readFileSync(j.file):null}))]){
        rollback.files[j.rel]=j.current===null?null:j.current.toString('base64');
        rollback.after[j.rel]=files[j.rel]??null;
      }
      put(path.join(transaction,'rollback.json'),JSON.stringify(rollback,null,2)+'\n');
    }
    // All conflicts checked first. Dependencies precede entrypoints; unchanged installs are quiet.
    const rank=j=>j.rel===shellRevisionPath?4:j.rel.startsWith('themes/')?0:j.rel.startsWith('layouts/')?3:j.rel.endsWith('/main.js')?2:1;
    const order=[...jobs].sort((a,b)=>rank(a)-rank(b));
    for(const j of order){if(j.before!==digest(j.bytes))put(j.file,j.bytes,j.before);else if(j.rel.endsWith('/main.js')&&touchedMods.has(path.posix.dirname(j.rel))) {if(digest(fs.readFileSync(j.file))!==j.before)throw Error(`Concurrent edit: ${j.rel}`);fs.writeFileSync(j.file,j.bytes);}}
    for(const j of stale){if(fs.existsSync(j.file)){if(digest(fs.readFileSync(j.file))!==j.hash)throw Error(`Concurrent obsolete edit: ${j.rel}`);fs.unlinkSync(j.file);}}
    if(!retained)put(prefsFile,nextPrefs,digest(prefsRaw));
    put(stateFile,nextManifest);
    // Native compatibility patches are not regular payload. Refresh only existing opt-ins.
    let patches=null;
    if(repair&&!shellOnly){const worker=path.join(owner,'runtime/scripts/startup-frames.mjs');if(fs.existsSync(worker)){const output=cp.execFileSync(process.execPath,[worker,home],{encoding:'utf8',timeout:30000,windowsHide:true});patches=JSON.parse(output);}}
    return {changed:changed.length,removed:stale.length,patches,backup,...(retained?{...(shellOnly?{scope:'shell'}:{sources}),preserved:Object.keys(old?.files??{}).filter(rel=>!selected.some(([target])=>target===rel)).length}:{})};
  });
}
export function doctor(home=defaultHome()) {
  const state=json(contained(home,'.customizations/manifest.json'));if(state?.version!==2)throw Error('No Custom deployment found.');
  const issues=[];
  for(const [rel,hash]of Object.entries(state.files)){allowedPath(rel);const file=contained(home,rel);if(!fs.existsSync(file))issues.push(`Missing: ${rel}`);else if(digest(fs.readFileSync(file))!==hash){if(rel==='layouts/Custom.json'){try{layoutOverrides(state.layoutBase,JSON.parse(read(file)));}catch(e){issues.push(e.message);}}else issues.push(`Modified: ${rel}`);}}
  const prefs=json(contained(home,'.customizations/layout-preferences.json'));if(prefs)try{projectLayout(state.layoutBase,prefs.overrides);}catch(e){issues.push(e.message);}
  let version=null;try{version=app(['--version'],home).replace(/^herdr-app\s+/,'');}catch{}
  const registry=json(path.join(home,'.customizations/runtime/frame-patches/registry.json'));
  const patches=[];
  for(const patch of registry?.patches??[]) {
    const record=json(path.join(home,`.customizations/frame-${patch.id}.json`));if(!record)continue;
    const inactive=Object.entries(record.installed??{}).filter(([name,hash])=>digest(read(path.join(home,patch.target,name)))!==hash).map(([name])=>name);
    patches.push({id:patch.id,ok:inactive.length===0});if(inactive.length)issues.push(`Compatibility patch ${patch.id} reset/modified: ${inactive.join(', ')}`);
  }
  return {ok:issues.length===0,version,reviewedVersion:state.supportedHerdr?.includes(version)??false,issues,patches,ownedFiles:Object.keys(state.files).length};
}
export function nativeCheck(home=defaultHome()) {
  const state=json(contained(home,'.customizations/manifest.json'));if(!state)throw Error('No Custom deployment.');
  const mods=Object.keys(state.files).filter(p=>/^mods\/custom-[^/]+\/main\.js$/.test(p));
  for(const rel of mods)app(['check',path.dirname(contained(home,rel))],home);
  return {checked:mods.length};
}
export function remove(home=defaultHome()) {
  return withLock(home,()=>{
    const status=JSON.parse(app(['status'],home));if(status.layout==='Custom')throw Error('Switch to Herdr/main before removing Custom. Terminals need not stop.');
    const state=json(contained(home,'.customizations/manifest.json'));if(!state)throw Error('No owned installation.');
    const files=Object.entries(state.files).map(([rel,hash])=>{allowedPath(rel);return{rel,hash,file:contained(home,rel)};});
    // Keep all personal modifications, including projected layout preferences.
    const changed=files.filter(j=>fs.existsSync(j.file)&&digest(fs.readFileSync(j.file))!==j.hash);
    if(changed.some(j=>j.rel!=='layouts/Custom.json'))throw Error('Modified owned files; removal refused. Run doctor.');
    const runtime=path.join(home,'.customizations/runtime');
    const registry=json(path.join(runtime,'frame-patches/registry.json'));
    if(fs.existsSync(path.join(home,'.customizations/terminal-input.json')))cp.execFileSync(process.execPath,[path.join(runtime,'scripts/terminal-input.mjs'),'restore',home],{encoding:'utf8',timeout:30000});
    for(const patch of registry?.patches??[])if(fs.existsSync(path.join(home,`.customizations/frame-${patch.id}.json`)))cp.execFileSync(process.execPath,[path.join(runtime,'scripts/frame-patch.mjs'),'restore',patch.id,home],{encoding:'utf8',timeout:30000});
    for(const j of files)if(fs.existsSync(j.file)&&digest(fs.readFileSync(j.file))===j.hash)fs.unlinkSync(j.file);
    fs.unlinkSync(path.join(home,'.customizations/manifest.json'));
    return {removed:files.length-changed.length,preserved:changed.map(j=>j.rel)};
  });
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href) {
 try {
  const [action='doctor',...args]=process.argv.slice(2),root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'../dist');
  let home=defaultHome(),hasHome=false;const sources=[];
  for(let i=0;i<args.length;i++) {
    if(action==='deploy' && args[i]==='--source' && args[i+1] && !args[i+1].startsWith('--'))sources.push(args[++i]);
    else if(!args[i].startsWith('--') && !hasHome){home=args[i];hasHome=true;}
    else throw Error('Use deploy [home] [--source <canonical-source-or-directory/> ...].');
  }
  let result;
  if(action==='deploy')result=deploy(root,home,{sources:sources.length?sources:null});
  else if(action==='deploy-shell')result=deploy(root,home,{shellOnly:true});
  else if(action==='doctor')result=doctor(home);
  else if(action==='check')result=nativeCheck(home);
  else if(action==='enable')result=app(['do','layout.switch','--name','Custom'],home);
  else if(action==='disable')result=app(['do','layout.switch','--name','main'],home);
  else if(action==='remove')result=remove(home);
  else throw Error('Use deploy, deploy-shell, doctor, check, enable, disable or remove.');
  console.log(typeof result==='string'?result:JSON.stringify(result,null,2));if(result?.ok===false||result?.patches?.ok===false)process.exitCode=1;
 }catch(e){console.error(e.message);process.exitCode=1;}
}
