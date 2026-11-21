import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
export const digest = value => value === null ? null : crypto.createHash('sha256').update(value).digest('hex');
export const read = file => fs.existsSync(file) ? fs.readFileSync(file, 'utf8').replace(/^\uFEFF/,'') : null;
export function safeRelative(value) {
  if(typeof value!=='string'||!value||value.includes('\\')||value.includes(':')||value.startsWith('/')||value.split('/').some(p=>!p||p==='.'||p==='..'))throw Error(`Unsafe relative path: ${value}`);
  return value;
}
export function contained(home, rel) {
  safeRelative(rel);const file=path.resolve(home,rel);
  // Refuse junctions/symlinks at every existing component (including target).
  let current=path.resolve(home);
  for(const part of ['',...rel.split('/')]){if(part)current=path.join(current,part);if(fs.existsSync(current)&&fs.lstatSync(current).isSymbolicLink())throw Error(`Linked deployment path refused: ${current}`);}
  return file;
}
export function put(file, value, expected = undefined) {
  const bytes=Buffer.isBuffer(value)?value:Buffer.from(value);
  const current=fs.existsSync(file)?fs.readFileSync(file):null;
  if(expected!==undefined&&digest(current)!==expected)throw Error(`Concurrent file edit: ${file}`);
  if(current?.equals(bytes))return false;
  fs.mkdirSync(path.dirname(file),{recursive:true});
  const temp=file+`.custom-${process.pid}-${crypto.randomBytes(4).toString('hex')}.tmp`;
  try{fs.writeFileSync(temp,bytes,{flag:'wx'});fs.renameSync(temp,file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}
  return true;
}
export function json(file) {const raw=read(file);return raw===null?null:JSON.parse(raw);}
