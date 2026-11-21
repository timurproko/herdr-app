// Restore an owned customization deployment, refusing later personal edits.
import fs from 'node:fs';
import path from 'node:path';
import cp from 'node:child_process';
import {pathToFileURL} from 'node:url';
import {defaultHome,allowedPath,app} from './deploy.mjs';
import {json,read,digest,put,contained} from './files.mjs';
export function rollback(home,id,{fixture=false}={}) {
 if(!/^\d+-\d+$/.test(id))throw Error('Use a deployment backup ID reported by deploy (not a migration archive).');
 if(fixture&&!fs.existsSync(path.join(home,'.migration-fixture')))throw Error('Not a fixture.');
 if(!fixture&&JSON.parse(app(['status'],home)).layout==='Custom')throw Error('Switch to Herdr/main before rollback; terminals keep running.');
 const owner=contained(home,'.customizations'),lock=path.join(owner,'deploy.lock');let fd;
 try{fd=fs.openSync(lock,'wx');fs.writeFileSync(fd,String(process.pid));}catch{throw Error('Deployment is locked.');}
 try {
  const record=json(contained(home,`.customizations/backups/${id}/rollback.json`));if(record?.version!==1||!record.after)throw Error('Unsupported rollback record.');
  const jobs=[];
  for(const [rel,base64]of Object.entries(record.files)){
   allowedPath(rel);const file=contained(home,rel),before=base64===null?null:Buffer.from(base64,'base64'),actual=fs.existsSync(file)?fs.readFileSync(file):null;
   if(![digest(before),record.after[rel]].includes(digest(actual)))throw Error(`Personal edit after deployment: ${rel}`);
   jobs.push({file,before,actual});
  }
  for(const [name,value,after]of [['manifest.json',record.manifest,record.afterManifest],['layout-preferences.json',record.preferences,record.afterPreferences]]){
   const file=path.join(owner,name),actual=read(file);if(![digest(value),after].includes(digest(actual)))throw Error(`Newer deployment/preference change: ${name}`);jobs.push({file,before:value===null?null:Buffer.from(value),actual:actual===null?null:Buffer.from(actual)});
  }
  // Restore native exceptions before removing their runtime support on first-install rollback.
  if(record.manifest===null){const runtime=path.join(owner,'runtime');for(const patch of json(path.join(runtime,'frame-patches/registry.json'))?.patches??[])if(fs.existsSync(path.join(owner,`frame-${patch.id}.json`)))cp.execFileSync(process.execPath,[path.join(runtime,'scripts/frame-patch.mjs'),'restore',patch.id,home],{encoding:'utf8',timeout:30000});}
  for(const job of jobs){if(job.before===null){if(fs.existsSync(job.file))fs.unlinkSync(job.file);}else put(job.file,job.before,digest(job.actual));}
  const worker=path.join(owner,'runtime/scripts/startup-frames.mjs');let patches=null;
  if(fs.existsSync(worker))patches=JSON.parse(cp.execFileSync(process.execPath,[worker,home],{encoding:'utf8',timeout:30000}));
  return {restored:jobs.length,patches};
 }finally{fs.closeSync(fd);fs.unlinkSync(lock);}
}
if(process.argv[1]&&import.meta.url===pathToFileURL(path.resolve(process.argv[1])).href){try{console.log(JSON.stringify(rollback(process.argv[3]??defaultHome(),process.argv[2]),null,2));}catch(e){console.error(e.message);process.exitCode=1;}}
