'use strict';
// Fixed Trello-only installer. Payload comes from installed desktop files, never UI.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const hash=bytes=>bytes===null?null:crypto.createHash('sha256').update(bytes).digest('hex');
const reject=code=>{throw Object.assign(Error(code),{code});};
const names=['cli','client','credentials','errors','help','operations','owner','policy','setup'];
const paths=[...names.map(n=>`lib/trello/${n}.cjs`),'lib/trello/TRELLO.txt','scripts/trello-launchers.mjs','scripts/files.mjs','package.json'];
function safe(file){for(let p=path.resolve(file);;p=path.dirname(p)){try{if(fs.lstatSync(p).isSymbolicLink())reject('RUNTIME_CONFLICT');}catch(e){if(e.code!=='ENOENT')throw e;}if(path.dirname(p)===p)break;}return file;}
function bytes(file){safe(file);try{const s=fs.statSync(file);if(!s.isFile()||s.size>2097152)reject('RUNTIME_CONFLICT');return fs.readFileSync(file);}catch(e){if(e.code==='ENOENT')return null;throw e;}}
function json(file){const b=bytes(file);return b===null?null:JSON.parse(b);}
function revision(files){return hash(Buffer.from(JSON.stringify(Object.entries(files).sort(([a],[b])=>a.localeCompare(b)).map(([name,value])=>[name,hash(Buffer.from(value,'base64'))]))));}
function payload(runtime){
 const files=Object.fromEntries(paths.map(rel=>{const value=bytes(path.join(runtime,rel));if(!value)reject('RUNTIME_MISSING');return [rel,value.toString('base64')];}));
 return {version:1,files,revision:revision(files)};
}
function validate(p){
 if(p?.version!==1||!p.files||Object.keys(p.files).sort().join()!==[...paths].sort().join()||Object.values(p.files).some(v=>typeof v!=='string'||v.length>1048576||Buffer.from(v,'base64').toString('base64')!==v)||p.revision!==revision(p.files))reject('RUNTIME_INVALID');
 if(Buffer.from(p.files['package.json'],'base64').toString().trim()!=='{"type":"module"}')reject('RUNTIME_INVALID');
 return p;
}
function probe(runtime,expected){
 try{return {runtime:paths.every(rel=>hash(bytes(path.join(runtime,rel)))===expected[rel])?'ready':bytes(path.join(runtime,'lib/trello/cli.cjs'))?'outdated':'missing'};}
 catch{return {runtime:'blocked'};}
}
async function launcherModule(p){
 // Reuse the canonical installer/ownership implementation without staging any code.
 const url=source=>'data:text/javascript;base64,'+Buffer.from(source).toString('base64');
 const files=url(Buffer.from(p.files['scripts/files.mjs'],'base64').toString());
 const source=Buffer.from(p.files['scripts/trello-launchers.mjs'],'base64').toString().replace("'./files.mjs'",JSON.stringify(files));
 return import(url(source));
}
async function install(home,p,{bin=process.env.HERDR_TRELLO_BIN||path.join(require('node:os').homedir(),'.local/bin'),envPath=process.env.PATH||'',beforeCommit=()=>{}}={}){
 validate(p);home=path.resolve(home);safe(home);
 const runtime=path.join(home,'.customizations/runtime'),record=path.join(home,'.customizations/trello-runtime.json'),journal=path.join(home,'.customizations/trello-runtime-backup.json');
 const oldRecord=json(record),fullFile=path.join(home,'.customizations/manifest.json'),fullRaw=bytes(fullFile),full=fullRaw?JSON.parse(fullRaw):null;
 if(oldRecord&&(oldRecord.version!==1||oldRecord.home!==home||!oldRecord.files)||full&&(full.version!==2||full.id!=='custom'||!full.files))reject('RUNTIME_CONFLICT');
 const oldHashes={...oldRecord?.files,...full?.files};
 const jobs=paths.map(rel=>{
  const file=path.join(runtime,rel),before=bytes(file),after=Buffer.from(p.files[rel],'base64'),key='.customizations/runtime/'+rel;
  if(before!==null&&hash(before)!==oldHashes[key])reject('RUNTIME_CONFLICT');
  return {key,file,before,after};
 });
 const launchers=await launcherModule(p);let plan;
 try{plan=launchers.planLaunchers(home,bin,envPath);}catch(e){reject(/PATH/.test(e.message??'')?'RUNTIME_PATH':'RUNTIME_CONFLICT');}
 const nextHashes=Object.fromEntries(jobs.map(j=>[j.key,hash(j.after)]));
 jobs.push({file:record,before:bytes(record),after:Buffer.from(JSON.stringify({version:1,home,revision:p.revision,files:nextHashes})+'\n')});
 if(full)jobs.push({file:fullFile,before:fullRaw,after:Buffer.from(JSON.stringify({...full,files:{...full.files,...nextHashes}},null,2)+'\n')});
 const oldJournal=bytes(journal);
 const backup={version:1,home,files:jobs.map(j=>({file:j.file,before:j.before?.toString('base64')??null,after:hash(j.after)})),launchers:plan};
 const commit=()=>{
  safe(journal);fs.mkdirSync(path.dirname(journal),{recursive:true});fs.writeFileSync(journal,JSON.stringify(backup)+'\n');
  const written=[];
  try{
   beforeCommit();
   for(const j of jobs){if(hash(bytes(j.file))!==hash(j.before))reject('RUNTIME_CONFLICT');fs.mkdirSync(path.dirname(j.file),{recursive:true});const temp=j.file+'.trello-install-'+process.pid;safe(temp);fs.writeFileSync(temp,j.after,{flag:'wx'});try{fs.renameSync(temp,j.file);}finally{if(fs.existsSync(temp))fs.unlinkSync(temp);}written.push(j);}
   return written;
  }catch(e){
   for(const j of written.reverse())if(hash(bytes(j.file))===hash(j.after)){if(j.before===null)fs.unlinkSync(j.file);else fs.writeFileSync(j.file,j.before);}
   if(oldJournal===null)fs.unlinkSync(journal);else fs.writeFileSync(journal,oldJournal);
   throw e;
  }
 };
 let written;
 try{launchers.withLauncherLock(home,plan,false,apply=>{written=commit();try{apply();}catch(e){for(const j of written.reverse())if(hash(bytes(j.file))===hash(j.after)){if(j.before===null)fs.unlinkSync(j.file);else fs.writeFileSync(j.file,j.before);}throw e;}});}
 catch(e){if(e.code==='EEXIST')reject('RUNTIME_BUSY');if(e.code?.startsWith('RUNTIME_'))throw e;if(/PATH/.test(e.message??''))reject('RUNTIME_PATH');reject('RUNTIME_CONFLICT');}
 return {runtime:'ready',installed:true,revision:p.revision};
}
async function rollback(home) {
 home=path.resolve(home);const journal=path.join(home,'.customizations/trello-runtime-backup.json'),saved=json(journal);
 const targets=[...paths.map(rel=>path.join(home,'.customizations/runtime',rel)),path.join(home,'.customizations/trello-runtime.json'),path.join(home,'.customizations/manifest.json')];
 if(saved?.version!==1||saved.home!==home||!Array.isArray(saved.files)||saved.files.some(j=>!targets.includes(j.file)||j.before!==null&&typeof j.before!=='string'||! /^[a-f0-9]{64}$/.test(j.after)))reject('RUNTIME_CONFLICT');
 for(const j of saved.files)if(hash(bytes(j.file))!==j.after)reject('RUNTIME_CONFLICT');
 const p=payload(path.join(home,'.customizations/runtime')),launchers=await launcherModule(p);
 launchers.withLauncherLock(home,saved.launchers,true,apply=>{
  for(const j of saved.files)if(hash(bytes(j.file))!==j.after)reject('RUNTIME_CONFLICT');
  apply();
  for(const j of [...saved.files].reverse()){if(j.before===null)fs.unlinkSync(j.file);else fs.writeFileSync(j.file,Buffer.from(j.before,'base64'));}
  fs.unlinkSync(journal);
 });
 return {rolledBack:true};
}
module.exports={paths,hash,payload,validate,revision,probe,install,rollback};
