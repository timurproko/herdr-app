// Private desktop-side reset admission. No credentials, provider IO or timer.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const identity=value=>typeof value==='string'&&/^[0-9a-f]{8}(?:-[0-9a-f]{4}){3}-[0-9a-f]{12}$/i.test(value)?value.toLowerCase():value;
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const windows=value=>Array.isArray(value)&&value.length<=64&&value.every(w=>typeof w.id==='string'&&w.id.length<=200&&(w.remaining===null||finite(w.remaining))&&(w.end===null||finite(w.end)));
const LOCK_GRACE_MS=10000;
async function acquire(dir,lock) {
  try {
    const stat=await fs.lstat(lock);
    if(!stat.isDirectory())return {unhealthy:true};
    const files=await fs.readdir(lock),name=files[0];
    if(files.length>1||(name&&!/^(?:owner|owner-[a-f0-9]{32})\.json$/.test(name)))return {unhealthy:true};
    let owner,modified=stat.mtimeMs;
    if(name) {
      try {modified=Math.max(modified,(await fs.stat(path.join(lock,name))).mtimeMs);owner=JSON.parse(await fs.readFile(path.join(lock,name),'utf8'));}
      catch(error){if(error.code==='ENOENT')return {blocked:true};if(!(error instanceof SyntaxError))throw error;}
    }
    if(Number.isSafeInteger(owner?.pid)&&owner.pid>0) {
      try{process.kill(owner.pid,0);return {blocked:true};}catch(error){if(error.code!=='ESRCH')return {blocked:true};}
    } else if(Date.now()-modified<LOCK_GRACE_MS)return {blocked:true};
    // Legacy ownerless/truncated locks recover after their complete exec budget.
    // Delete only the captured owner name; a new published lock is never empty.
    try{if(name)await fs.unlink(path.join(lock,name));await fs.rmdir(lock);}
    catch(error){if(['ENOENT','ENOTEMPTY','EEXIST','ENOTDIR'].includes(error.code))return {blocked:true};throw error;}
  } catch(error){if(error.code!=='ENOENT')throw error;}
  const prepared=await fs.mkdtemp(path.join(dir,'admission-owner-'));
  const ownerName=`owner-${crypto.randomBytes(16).toString('hex')}.json`;let published=false;
  try {
    const handle=await fs.open(path.join(prepared,ownerName),'wx',0o600);
    try{await handle.writeFile(JSON.stringify({pid:process.pid}));await handle.sync();}finally{await handle.close();}
    // Publish the nonempty directory only after the complete owner is synced.
    // A killed writer before this rename owns no lock and cannot strand callers.
    try{await fs.rename(prepared,lock);}catch(error){
      if(['EEXIST','ENOTEMPTY','EPERM','EACCES'].includes(error.code)) {
        try{if((await fs.lstat(lock)).isDirectory())return {blocked:true};}catch{}
      }
      throw error;
    }
    published=true;return {ownerName};
  } finally {if(!published)await fs.rm(prepared,{recursive:true,force:true}).catch(()=>{});}
}
async function transact(request) {
  if(!path.isAbsolute(request.root??'')||!['observe','reserve','finish'].includes(request.action)||!['claude','codex'].includes(request.provider)||typeof request.accountId!=='string'||!request.accountId||request.accountId.length>200||!windows(request.windows??[]))throw Error('Invalid admission request');
  const dir=path.join(request.root,'.customizations/usage'),lock=path.join(dir,'admission.lock'),file=path.join(dir,'admission.json'),now=Date.now();
  await fs.mkdir(dir,{recursive:true,mode:0o700});
  const acquired=await acquire(dir,lock);if(!acquired.ownerName)return acquired;
  let temp;
  try {
    let state;try{const bytes=await fs.readFile(file,'utf8');if(bytes.length>262144)throw Error('Journal too large');state=JSON.parse(bytes);}catch(error){if(error.code!=='ENOENT')throw error;state={version:1,accounts:{}};}
    if(state?.version!==1||!state.accounts||typeof state.accounts!=='object'||Array.isArray(state.accounts)||Object.keys(state.accounts).length>256||Object.entries(state.accounts).some(([k,v])=>!(/^[a-f0-9]{64}$/.test(k))||!v||typeof v!=='object'||(v.pending&&(!finite(v.pending.at)||typeof v.pending.id!=='string'))||(v.episode&&(!finite(v.episode.at)||!windows(v.episode.windows)))))throw Error('Unsupported admission state');
    const key=digest([request.provider,identity(request.accountId),identity(request.organizationId??null)]);
    if(!state.accounts[key]&&request.action==='observe')return {observed:true};
    if(!state.accounts[key]&&Object.keys(state.accounts).length>=256)throw Error('Admission capacity reached');
    const record=state.accounts[key]??={};
    const observed=finite(request.startedAt)&&request.startedAt<=now&&now-request.startedAt<135000;
    if(observed) {
      const finished=record.pending?.finishedAt&&request.startedAt>record.pending.finishedAt;
      const abandoned=record.pending?.until&&request.startedAt>record.pending.until;
      if(finished&&!record.episode) {const low=request.windows.filter(w=>finite(w.remaining)&&w.remaining>=0&&w.remaining<=1);
        if(low.length)record.episode={at:record.pending.at,windows:low.map(({id,end})=>({id,end,remaining:null}))};}
      let recovered=Boolean(abandoned&&!record.episode&&request.windows.length&&request.windows.every(w=>finite(w.remaining)&&w.remaining>1&&w.remaining<=100));
      if(record.episode&&request.startedAt>record.episode.at) {
        recovered=record.episode.windows.length>0&&record.episode.windows.every(old=>{
          const current=request.windows.find(w=>w.id===old.id);
          return current&&((finite(current.remaining)&&current.remaining>1&&current.remaining<=100)||
            (finite(old.end)&&old.end<=request.startedAt&&finite(current.end)&&current.end>old.end));
        });
        if(recovered&&(!record.pending||finished||abandoned))delete record.episode;
      }
      // Timeout alone never releases a crashed claim: it also needs a later recovery read.
      if(finished||(abandoned&&recovered))delete record.pending;
    }
    let reply={observed:true};
    if(request.action==='reserve') {
      if(record.pending||(request.automatic&&record.episode))return {blocked:true};
      if(request.automatic&&(!observed||!request.windows.some(w=>finite(w.remaining)&&w.remaining>=0&&w.remaining<=1)))return {blocked:true};
      const id='herdr-'+crypto.randomBytes(20).toString('hex');record.pending={id,at:now,until:now+300000};
      // Manual resets also inhibit automatic use until the same depleted quotas recover.
      const depleted=request.windows.filter(w=>finite(w.remaining)&&w.remaining>=0&&w.remaining<=1);
      if(depleted.length)record.episode={at:now,windows:depleted.map(({id,end})=>({id,end,remaining:null}))};
      reply={requestId:id};
    } else if(request.action==='finish') {
      if(record.pending?.id!==request.requestId)return {blocked:true};
      record.pending.finishedAt=now;
      record.pending.outcome=request.outcome==='reset'?'reset':'unknown';
      reply={finished:true};
    }
    temp=path.join(dir,`admission-${crypto.randomBytes(12).toString('hex')}.tmp`);
    const handle=await fs.open(temp,'wx',0o600);try{await handle.writeFile(JSON.stringify(state));await handle.sync();}finally{await handle.close();}
    await fs.rename(temp,file);temp=null;return reply;
  } finally {if(temp)await fs.unlink(temp).catch(()=>{});await fs.unlink(path.join(lock,acquired.ownerName)).catch(()=>{});await fs.rmdir(lock).catch(()=>{});}
}
module.exports={transact};
if(require.main===module||process.argv[1]?.startsWith('{')){let request;try{request=JSON.parse(process.argv[1]?.startsWith('{')?process.argv[1]:process.argv[2]);}catch{request={};}transact(request).then(result=>console.log(JSON.stringify(result))).catch(()=>console.log(JSON.stringify({unhealthy:true})));}
