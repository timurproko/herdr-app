// Disk-first recovery evidence. Backups are immutable private data, never opt-ins.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export class NativePatchSafetyError extends Error {}
export const isNativeSafetyError = error => error instanceof NativePatchSafetyError || typeof error?.syscall === 'string';
export function nativeRead(file) {
  try {const bytes=fs.readFileSync(file);if(bytes.length>16*1024*1024)throw new NativePatchSafetyError('Patch file exceeds 16 MiB');return bytes;}
  catch(error){if(error.code==='ENOENT')return null;throw error;}
}
export function nativePath(home,relative) {
  const file=path.resolve(home,relative),base=path.resolve(home);
  if(!file.startsWith(base+path.sep))throw new NativePatchSafetyError('Patch path escapes home');
  let p=file;
  while(p!==base){if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw new NativePatchSafetyError(`Patch symlink refused: ${relative}`);p=path.dirname(p);}
  if(fs.lstatSync(base).isSymbolicLink())throw new NativePatchSafetyError('Patch home symlink refused');
  return file;
}
export function nativeAtomic(file,bytes) {
  if(bytes===null){if(fs.existsSync(file))fs.unlinkSync(file);return;}
  fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.custom-${process.pid}.tmp`;
  let fd,created=false;
  try{fd=fs.openSync(temp,'wx');created=true;fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,file);}
  finally{if(fd!==undefined)fs.closeSync(fd);if(created&&fs.existsSync(temp))fs.unlinkSync(temp);}
}
const same=(a,b)=>a!==null&&b!==null&&a.equals(b);
export function retainNativeBackup(home,id,raw,kind='journal') {
  if(!/^[a-z][a-z0-9-]*$/.test(id)||!['journal','record'].includes(kind)||!Buffer.isBuffer(raw)||raw.length>16*1024*1024)throw new NativePatchSafetyError('Invalid native recovery backup');
  const hash=crypto.createHash('sha256').update(raw).digest('hex');
  const relative=`.customizations/recovery/native-${id}-${hash}.${kind}.json`,file=nativePath(home,relative),existing=nativeRead(file);
  if(existing!==null&&!same(existing,raw))throw new NativePatchSafetyError('Native recovery backup conflict; evidence retained');
  if(existing===null)nativeAtomic(file,raw);
  if(!same(nativeRead(file),raw))throw new NativePatchSafetyError('Native recovery backup readback failed; evidence retained');
  return relative;
}
export function retireNativeJournal(home,id,file,raw) {
  if(!same(nativeRead(file),raw))throw new NativePatchSafetyError('Native journal changed before retirement; evidence retained');
  const backup=retainNativeBackup(home,id,raw);
  if(!same(nativeRead(file),raw))throw new NativePatchSafetyError('Native journal changed during retirement; evidence retained');
  fs.unlinkSync(file);return backup;
}
export function nativeRecoveryInventory(home) {
  const journals=[],backups=[],owner=nativePath(home,'.customizations');
  if(!fs.existsSync(owner))return {journals,backups};
  for(const entry of fs.readdirSync(owner,{withFileTypes:true})) {
    const match=/^native-(palette|feedback)\.journal\.json$/.exec(entry.name);
    if(match){nativePath(home,`.customizations/${entry.name}`);journals.push({id:match[1],file:`.customizations/${entry.name}`});}
  }
  const recovery=nativePath(home,'.customizations/recovery');
  if(fs.existsSync(recovery))for(const entry of fs.readdirSync(recovery,{withFileTypes:true})) {
    const match=/^native-([a-z][a-z0-9-]*)-[a-f0-9]{64}\.(journal|record)\.json$/.exec(entry.name);
    if(match){nativePath(home,`.customizations/recovery/${entry.name}`);backups.push({id:match[1],kind:match[2],file:`.customizations/recovery/${entry.name}`});}
  }
  return {journals,backups};
}
