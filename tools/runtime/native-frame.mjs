// Current-stock provenance and journaled single-entrypoint activation. No version gate.
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import { Incompatible, tree, one, checkGraph } from './native-ast.mjs';
export const digest = b => b === null ? null : crypto.createHash('sha256').update(b).digest('hex');
const read = file => { try { const b=fs.readFileSync(file); if(b.length>16*1024*1024)throw Error('Patch file exceeds 16 MiB');return b; } catch(e) { if(e.code==='ENOENT')return null;throw e; } };
const encode = b => b === null ? null : b.toString('base64');
const decode = s => { if(s===null)return null;if(typeof s!=='string'||s.length>24*1024*1024||! /^(?:[A-Za-z0-9+/]{4})*(?:[A-Za-z0-9+/]{2}==|[A-Za-z0-9+/]{3}=)?$/.test(s))throw Error('Corrupt patch backup');return Buffer.from(s,'base64'); };
const equal = (a,b) => a===null ? b===null : b!==null && a.equals(b);
const validName = n => typeof n==='string' && /^(?:custom-[a-f0-9]{24}\/)?[a-zA-Z0-9][a-zA-Z0-9._-]*$/.test(n) && !['.','..'].includes(n);
function safe(home, relative) {
  const file=path.resolve(home,relative),base=path.resolve(home);
  if(!file.startsWith(base+path.sep))throw Error('Patch path escapes home');
  let p=file;
  while(p!==base) { if(fs.existsSync(p)&&fs.lstatSync(p).isSymbolicLink())throw Error(`Patch symlink refused: ${relative}`);p=path.dirname(p); }
  if(fs.lstatSync(base).isSymbolicLink())throw Error('Patch home symlink refused');
  return file;
}
function atomic(file,bytes) {
  if(bytes===null){if(fs.existsSync(file))fs.unlinkSync(file);return;}
  fs.mkdirSync(path.dirname(file),{recursive:true});const temp=`${file}.custom-${process.pid}.tmp`;
  let fd;try {fd=fs.openSync(temp,'wx');fs.writeFileSync(fd,bytes);fs.fsyncSync(fd);fs.closeSync(fd);fd=undefined;fs.renameSync(temp,file);}finally{if(fd!==undefined)fs.closeSync(fd);if(fs.existsSync(temp))fs.unlinkSync(temp);}
}
function record(home,id) {
  const raw=read(safe(home,`.customizations/frame-${id}.json`));if(!raw)return {raw,state:null};
  let state;try{state=JSON.parse(raw);}catch{throw Error(`Corrupt ${id} patch record`);}
  if(![1,2].includes(state.version)||!state.original||!state.installed||typeof state.original!=='object'||Array.isArray(state.original)||Array.isArray(state.installed))throw Error(`Unrecognized ${id} patch record`);
  for(const [n,h] of Object.entries(state.installed))if(!validName(n)||! /^(?:[a-f0-9]{64})$/.test(h))throw Error(`Corrupt ${id} installed hash`);
  for(const [n,b] of Object.entries(state.original)) {
    if(!validName(n)||(b!==null&&typeof b!=='string'))throw Error(`Corrupt ${id} original`);
    if(state.version===2)decode(b);
  }
  if(!state.installed['main.js']||!Object.hasOwn(state.original,'main.js'))throw Error(`Corrupt ${id} main record`);
  if(state.previousInstalled)for(const [n,h]of Object.entries(state.previousInstalled))if(!validName(n)||(h!==null&&!/^[a-f0-9]{64}$/.test(h)))throw Error(`Corrupt ${id} previous hash`);
  return {raw,state};
}
const original = (state,n) => state?.version===2 ? decode(state.original[n]??null) : state?.original[n]==null ? null : Buffer.from(state.original[n]);
function binary(options) {
  if(Object.hasOwn(options,'binary'))return options.binary;
  const exe=process.env.HERDR_APP_BIN||path.join(process.env.LOCALAPPDATA??'','Programs/herdr-app/herdr-app.exe');
  try{return fs.readFileSync(exe);}catch{return null;}
}
function unique(binary,bytes) {const i=bytes?.length ? binary?.indexOf(bytes) : -1;return i>=0 && binary.indexOf(bytes,i+1)<0;}
export function stockSource(id,current,saved,bin) {
  if(!Buffer.isBuffer(bin))throw new Incompatible('current executable source unavailable');
  if(unique(bin,current))return current;
  if(unique(bin,saved))return saved;
  const begin=Buffer.from(`${id}/main.js`),end=Buffer.from(`${id}/mod.json`),i=bin.indexOf(begin);
  if(i<0||bin.indexOf(begin,i+1)>=0)throw new Incompatible(`stock ${id}/main.js boundary missing/ambiguous`);
  const start=i+begin.length,j=bin.indexOf(end,start);
  if(j<0||bin.indexOf(end,j+1)>=0||j-start>1024*1024)throw new Incompatible(`stock ${id}/mod.json boundary missing/ambiguous`);
  const source=bin.subarray(start,j);const ast=tree(new TextDecoder('utf-8',{fatal:true}).decode(source));
  const klass=one(ast.body.filter(n=>n.type==='ExportDefaultDeclaration'&&n.declaration.type==='ClassDeclaration'),'native default view').declaration;
  if(klass.id?.name.toLowerCase()!==id)throw new Incompatible('embedded frame identity mismatch');
  return source;
}
function context(home,root,patch,options) {
  if(!['palette','feedback'].includes(patch.id)||patch.target!==`frame/${patch.id}`)throw Error('Structural transforms are limited to palette and feedback');
  const dir=`frame/${patch.id}`,stateFile=`.customizations/frame-${patch.id}.json`,journalFile=`.customizations/native-${patch.id}.journal.json`;
  const {state,raw}=record(home,patch.id),main=read(safe(home,`${dir}/main.js`));
  const bin=binary(options);
  const recognized=(n,b)=>state && [state.installed[n],state.previousInstalled?.[n],digest(original(state,n))].includes(digest(b));
  // Check all retained dependencies before incompatibility skips, including legacy v1 helpers.
  for(const n of Object.keys(state?.installed??{}).filter(n=>n!=='main.js')) {
    const b=read(safe(home,`${dir}/${n}`));if(b!==null&&!recognized(n,b))throw Error(`Personal ${patch.id} dependency conflict: ${n}`);
  }
  const owned=Boolean(recognized('main.js',main));
  if(state && !owned && !unique(bin,main))throw Error(`Personal ${patch.id} target conflict; nothing changed`);
  return {dir,stateFile,journalFile,state,raw,main,bin,owned};
}
function prepare(home,root,patch,transform,options) {
  const c=context(home,root,patch,options);
  const source=stockSource(patch.id,c.main,original(c.state,'main.js'),c.bin);
  if(!c.owned && !equal(c.main,source))throw new Incompatible('target is not proven current stock; unknown bytes untouched');
  const text=new TextDecoder('utf-8',{fatal:true}).decode(source);tree(text);
  if(patch.capabilities?.length) {
    const declared=options.apis ?? [...(read(safe(home,'herdr.d.ts'))?.toString().matchAll(/export function (\w+)\s*\(/g)??[])].map(m=>m[1]);
    const missing=patch.capabilities.filter(n=>!declared.includes(n));
    if(missing.length)throw new Incompatible(`missing host API: ${missing.join(', ')}`);
  }
  const payload={};for(const [n,src]of Object.entries(patch.files).filter(([n])=>n!=='main.js')) {
    if(!validName(n)||n.includes('/'))throw Error('Invalid helper mapping');
    const b=read(path.join(root,src));if(b===null)throw Error(`Missing patch dependency: ${src}`);payload[n]=b.toString('utf8');
  }
  // Transform revision participates via the generated source, not a mutable version label.
  const sample=transform(text,'./custom-GENERATION',options);
  const gen=`custom-${digest(JSON.stringify({payload,sample})).slice(0,24)}`;
  const output=transform(text,`./${gen}`,options),files=Object.fromEntries(Object.entries(payload).map(([n,b])=>[`${gen}/${n}`,b]));
  checkGraph(output,files);
  c.source=source;c.files=Object.fromEntries(Object.entries(files).map(([n,b])=>[n,Buffer.from(b)]));c.output=Buffer.from(output);c.gen=gen;c.binaryDigest=digest(c.bin);
  return c;
}
export function inspectNative(home,root,patch,transform,options={}) {
  const journal=safe(home,`.customizations/native-${patch.id}.journal.json`);
  if(fs.existsSync(journal))return {ok:false,status:'recovery-required',active:false,error:`${patch.id}: interrupted transaction; recovery required before mutation`};
  try {
    const c=prepare(home,root,patch,transform,options);
    const active=Boolean(c.state?.version===2&&equal(c.main,c.output)&&Object.entries(c.files).every(([n,b])=>equal(read(safe(home,`${c.dir}/${n}`)),b)));
    return {ok:true,status:'ready',active,phase:active?'active':'repair-needed',source:digest(c.source)};
  }catch(e){if(!(e instanceof Incompatible))throw e;return {ok:true,status:'skipped',active:false,retained:Boolean(record(home,patch.id).state),advisory:`Optional ${patch.id} patch skipped: ${e.message}; bytes and opt-in unchanged.`};}
}
function lock(home,fn) {
  const file=safe(home,'.customizations/native-patches.lock');fs.mkdirSync(path.dirname(file),{recursive:true});let fd;
  try{fd=fs.openSync(file,'wx');}catch(e){if(e.code!=='EEXIST')throw e;
    const pid=Number(read(file)?.toString());if(Number.isSafeInteger(pid)&&pid>0){try{process.kill(pid,0);}catch(p){if(p.code==='ESRCH'){fs.unlinkSync(file);throw Error('Stale native-patch lock removed; retry explicitly');}}}
    throw Error('Native patch mutation lock busy');
  }
  try{fs.writeFileSync(fd,String(process.pid));return fn();}finally{fs.closeSync(fd);fs.unlinkSync(file);}
}
function allowedJournalPath(p,c) {return p===c.stateFile||p.startsWith(c.dir+'/')&&validName(p.slice(c.dir.length+1));}
export function recoverNative(home,patch) {
  const c={dir:patch.target,stateFile:`.customizations/frame-${patch.id}.json`,journalFile:`.customizations/native-${patch.id}.journal.json`};
  const file=safe(home,c.journalFile),raw=read(file);if(!raw)return;
  const j=JSON.parse(raw);if(j.version!==1||j.id!==patch.id||!Array.isArray(j.changes)||j.changes.length>256)throw Error('Corrupt native transaction journal');
  for(const e of j.changes){if(!allowedJournalPath(e.file,c))throw Error('Unsafe native transaction path');decode(e.before);decode(e.after);}
  // Preflight the entire rollback before its first write.
  for(const e of j.changes){const b=read(safe(home,e.file));if(!equal(b,decode(e.before))&&!equal(b,decode(e.after)))throw Error(`Recovery required: external edit at ${e.file}; backups retained`);}
  const order=[...j.changes].sort((a,b)=>(a.file.endsWith('/main.js')?-2:a.file===c.stateFile?-1:0)-(b.file.endsWith('/main.js')?-2:b.file===c.stateFile?-1:0));
  for(const e of order)if(!equal(read(safe(home,e.file)),decode(e.before)))atomic(safe(home,e.file),decode(e.before));
  fs.unlinkSync(file);
}
function transact(home,patch,c,changes,options) {
  const journal=safe(home,c.journalFile),j={version:1,id:patch.id,changes:changes.map(e=>({file:e.file,before:encode(e.before),after:encode(e.after)}))};
  atomic(journal,Buffer.from(JSON.stringify(j)));
  try {
    for(const [i,e]of changes.entries()) {
      options.fault?.('before-write',e.file,i);
      if(!equal(read(safe(home,e.file)),e.before))throw Error(`File changed during apply: ${e.file}`);
      if(e.file===`${c.dir}/main.js`&&c.binaryDigest!==digest(binary(options)))throw Error('Executable changed during apply');
      atomic(safe(home,e.file),e.after);options.fault?.('after-write',e.file,i);
      if(!equal(read(safe(home,e.file)),e.after))throw Error(`Readback failed: ${e.file}`);
    }
    options.fault?.('before-commit',c.journalFile);
    fs.unlinkSync(journal);
  } catch(e) {
    if(e.crash)throw e; // Fixture seam: a killed process likewise leaves the journal.
    try{recoverNative(home,patch);}catch(recovery){throw Error(`${e.message}; recovery required: ${recovery.message}`);}
    throw Error(`${e.message}; previous graph restored`);
  }
}
export function mutateNative(action,home,root,patch,transform,options={}) {
  return lock(home,()=>{
    recoverNative(home,patch);
    if(action==='restore') {
      const c=context(home,root,patch,options);if(!c.state)return `No ${patch.id} frame patch is installed.`;
      let stock;try{stock=stockSource(patch.id,c.main,original(c.state,'main.js'),c.bin);}catch(e){throw Error(`Restore refused: ${e.message}`);}
      // Never replace unknown newer stock; context already refuses unknown edits.
      const changes=[];
      if(!equal(c.main,stock))changes.push({file:`${c.dir}/main.js`,before:c.main,after:stock});
      for(const n of Object.keys(c.state.installed).filter(n=>n!=='main.js')) {
        const before=read(safe(home,`${c.dir}/${n}`)),after=original(c.state,n);
        if(before!==null&&!equal(before,after))changes.push({file:`${c.dir}/${n}`,before,after});
      }
      changes.push({file:c.stateFile,before:c.raw,after:null});c.binaryDigest=digest(c.bin);transact(home,patch,c,changes,options);
      return `${patch.id} frame restored; personal settings and shortcuts unchanged.`;
    }
    const c=prepare(home,root,patch,transform,options);
    const changes=[];
    const installed={...c.state?.installed},saved={};
    for(const n of Object.keys(c.state?.original??{}))saved[n]=encode(original(c.state,n));
    for(const [n,b]of Object.entries(c.files)) {
      const before=read(safe(home,`${c.dir}/${n}`));
      if(before!==null&&!equal(before,b))throw Error(`Personal ${patch.id} dependency conflict: ${n}`);
      if(!Object.hasOwn(saved,n))saved[n]=encode(before);installed[n]=digest(b);
      if(!equal(before,b))changes.push({file:`${c.dir}/${n}`,before,after:b});
    }
    saved['main.js']=encode(c.source);installed['main.js']=digest(c.output);
    const next={version:2,original:saved,installed,source:digest(c.source),executable:c.binaryDigest,generation:c.gen};
    const nextRaw=Buffer.from(JSON.stringify(next,null,2)+'\n');
    if(!equal(c.main,c.output))changes.push({file:`${c.dir}/main.js`,before:c.main,after:c.output});
    if(!equal(c.raw,nextRaw))changes.push({file:c.stateFile,before:c.raw,after:nextRaw});
    if(!changes.length)return `Custom ${patch.id} frame already current.`;
    transact(home,patch,c,changes,options);
    return `Custom ${patch.id} frame applied (other layouts retain stock styling).`;
  });
}
