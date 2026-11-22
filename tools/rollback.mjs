// Restore an owned customization deployment, refusing later personal edits.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {isDeepStrictEqual} from 'node:util';
import {defaultHome,allowedPath,app,shellPaths,shellRevisionPath} from './deploy.mjs';
import {json,read,digest,put,contained} from './files.mjs';
// A flag alone cannot turn a full journal into a Desktop-free rollback.
function validateShellJournal(record) {
 const fail=()=>{throw Error('Not a verified shell-only rollback journal.');};
 if(record.scope!=='shell'||typeof record.afterState!=='string'||digest(record.afterState)!==record.afterManifest)fail();
 const before=record.manifest===null?null:JSON.parse(record.manifest),after=JSON.parse(record.afterState);
 const valid=state=>state?.version===2&&state.id==='custom'&&state.files&&typeof state.files==='object'&&!Array.isArray(state.files);
 if(!valid(after)||(before&&!valid(before)))fail();
 const withoutShell=state=>({...state,files:Object.fromEntries(Object.entries(state.files).filter(([rel])=>!shellPaths.includes(rel)))});
 const initial={version:2,id:'custom',supportedHerdr:after.supportedHerdr,files:{}};
 if(!isDeepStrictEqual(withoutShell(after),before?withoutShell(before):initial))fail();
 const paths=Object.keys(record.files??{});
 if(!paths.length||!isDeepStrictEqual(paths.slice().sort(),Object.keys(record.after).sort())||paths.some(rel=>!shellPaths.includes(rel)))fail();
 for(const rel of paths)if(record.after[rel]!==after.files[rel])fail();
 if(shellPaths.some(rel=>!Object.hasOwn(after.files,rel))||record.afterPreferences!==digest(record.preferences))fail();
}
export function rollback(home,id,{fixture=false,shellOnly=false}={}) {
 if(!/^\d+-\d+$/.test(id))throw Error('Use a deployment backup ID reported by deploy (not a migration archive).');
 if(fixture&&!fs.existsSync(path.join(home,'.migration-fixture')))throw Error('Not a fixture.');
 if(!fixture&&!shellOnly&&JSON.parse(app(['status'],home)).layout==='Custom')throw Error('Switch to Herdr/main before rollback; terminals keep running.');
 const owner=contained(home,'.customizations'),lock=path.join(owner,'deploy.lock');let fd;
 try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));}catch{throw Error('Deployment is locked.');}
 try {
  const record=json(contained(home,`.customizations/backups/${id}/rollback.json`));if(record?.version!==1||!record.after)throw Error('Unsupported rollback record.');
  if(shellOnly)validateShellJournal(record);
  const jobs=[];
  for(const [rel,base64]of Object.entries(record.files)){
   allowedPath(rel);const file=contained(home,rel),before=base64===null?null:Buffer.from(base64,'base64'),actual=fs.existsSync(file)?fs.readFileSync(file):null;
   if(![digest(before),record.after[rel]].includes(digest(actual)))throw Error(`Personal edit after deployment: ${rel}`);
   jobs.push({rel,file,before,actual});
  }
  for(const [name,value,after]of [['manifest.json',record.manifest,record.afterManifest],['layout-preferences.json',record.preferences,record.afterPreferences]]){
   const file=contained(home,`.customizations/${name}`),actual=shellOnly?(fs.existsSync(file)?fs.readFileSync(file,'utf8'):null):read(file);
   if(![digest(value),after].includes(digest(actual)))throw Error(`Newer deployment/preference change: ${name}`);
   // Shell recovery checks preferences but must never rewrite them.
   if(!shellOnly||name!=='layout-preferences.json')jobs.push({file,before:value===null?null:Buffer.from(value),actual:actual===null?null:Buffer.from(actual)});
  }
  // Restore native exceptions before removing their runtime support on first-install rollback.
  if(!shellOnly&&record.manifest===null){const runtime=path.join(owner,'runtime');for(const patch of json(path.join(runtime,'frame-patches/registry.json'))?.patches??[])if(fs.existsSync(path.join(owner,`frame-${patch.id}.json`)))cp.execFileSync(process.execPath,[path.join(runtime,'scripts/frame-patch.mjs'),'restore',patch.id,home],{encoding:'utf8',timeout:30000});}
  // Restore scripts before their revision; bookkeeping follows all payload files.
  jobs.sort((a,b)=>(a.rel===shellRevisionPath?1:a.rel?0:2)-(b.rel===shellRevisionPath?1:b.rel?0:2));
  for(const job of jobs){if(job.before===null){if(fs.existsSync(job.file))fs.unlinkSync(job.file);}else put(job.file,job.before,digest(job.actual));}
  const worker=path.join(owner,'runtime/scripts/startup-frames.mjs');let patches=null;
  if(!shellOnly&&fs.existsSync(worker))patches=JSON.parse(cp.execFileSync(process.execPath,[worker,home],{encoding:'utf8',timeout:30000}));
  return {restored:jobs.length,patches};
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){
 try {
  const args=process.argv.slice(2),shellOnly=args[0]==='--shell-only';if(shellOnly)args.shift();
  if(args.length<1||args.length>2||args.some(arg=>arg.startsWith('--')))throw Error('Use [--shell-only] <backup-id> [home].');
  console.log(JSON.stringify(rollback(args[1]??defaultHome(),args[0],{shellOnly}),null,2));
 }catch(e){console.error(e.message);process.exitCode=1;}
}
