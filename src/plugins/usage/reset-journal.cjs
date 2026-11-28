// Private desktop-side reset admission. No credentials, provider IO or timer.
const fs=require('node:fs/promises'),path=require('node:path'),crypto=require('node:crypto');
const digest=value=>crypto.createHash('sha256').update(JSON.stringify(value)).digest('hex');
const finite=value=>typeof value==='number'&&Number.isFinite(value);
const windows=value=>Array.isArray(value)&&value.length<=64&&value.every(w=>typeof w.id==='string'&&w.id.length<=200&&(w.remaining===null||finite(w.remaining))&&(w.end===null||finite(w.end)));
async function transact(request) {
  if(!path.isAbsolute(request.root??'')||!['observe','reserve','finish'].includes(request.action)||!['claude','codex'].includes(request.provider)||typeof request.accountId!=='string'||!request.accountId||request.accountId.length>200||!windows(request.windows??[]))throw Error('Invalid admission request');
  const dir=path.join(request.root,'.customizations/usage'),lock=path.join(dir,'admission.lock'),file=path.join(dir,'admission.json'),now=Date.now();
  await fs.mkdir(dir,{recursive:true,mode:0o700});
  try{await fs.mkdir(lock,{mode:0o700});}catch(error){
    if(error.code!=='EEXIST')throw error;
    // Only a proven dead owner's lock can be reclaimed; never expire a spend receipt.
    const owner=JSON.parse(await fs.readFile(path.join(lock,'owner.json'),'utf8'));
    if(!Number.isSafeInteger(owner.pid)||owner.pid<=0)throw Error('Unknown lock owner');
    try{process.kill(owner.pid,0);return {blocked:true};}catch(dead){if(dead.code!=='ESRCH')return {blocked:true};}
    await fs.unlink(path.join(lock,'owner.json'));await fs.rmdir(lock);
    return {blocked:true}; // A later observation can acquire; do not replay a claim.
  }
  let temp;
  try {
    await fs.writeFile(path.join(lock,'owner.json'),JSON.stringify({pid:process.pid}),{flag:'wx',mode:0o600});
    let state;try{const bytes=await fs.readFile(file,'utf8');if(bytes.length>262144)throw Error('Journal too large');state=JSON.parse(bytes);}catch(error){if(error.code!=='ENOENT')throw error;state={version:1,accounts:{}};}
    if(state?.version!==1||!state.accounts||typeof state.accounts!=='object'||Array.isArray(state.accounts)||Object.keys(state.accounts).length>256||Object.entries(state.accounts).some(([k,v])=>!(/^[a-f0-9]{64}$/.test(k))||!v||typeof v!=='object'||(v.pending&&(!finite(v.pending.at)||typeof v.pending.id!=='string'))||(v.episode&&(!finite(v.episode.at)||!windows(v.episode.windows)))))throw Error('Unsupported admission state');
    const key=digest([request.provider,request.accountId,request.organizationId??null]);
    if(!state.accounts[key]&&Object.keys(state.accounts).length>=256)throw Error('Admission capacity reached');
    const record=state.accounts[key]??={};
    const observed=finite(request.startedAt)&&request.startedAt<=now&&now-request.startedAt<135000;
    if(observed) {
      if(record.pending?.finishedAt&&request.startedAt>record.pending.finishedAt) {
        if(!record.episode) {const low=request.windows.filter(w=>finite(w.remaining)&&w.remaining>=0&&w.remaining<=1);
          if(low.length)record.episode={at:record.pending.at,windows:low.map(({id,end})=>({id,end,remaining:null}))};}
        delete record.pending;
      }
      if(record.episode&&request.startedAt>record.episode.at) {
        const recovered=record.episode.windows.length>0&&record.episode.windows.every(old=>{
          const current=request.windows.find(w=>w.id===old.id);
          return current&&((finite(current.remaining)&&current.remaining>1&&current.remaining<=100)||
            (finite(old.end)&&old.end<=request.startedAt&&finite(current.end)&&current.end>old.end));
        });
        if(recovered)delete record.episode;
      }
    }
    let reply={observed:true};
    if(request.action==='reserve') {
      if(record.pending||(request.automatic&&record.episode))return {blocked:true};
      if(request.automatic&&(!observed||!request.windows.some(w=>finite(w.remaining)&&w.remaining>=0&&w.remaining<=1)))return {blocked:true};
      const id='herdr-'+crypto.randomBytes(20).toString('hex');record.pending={id,at:now};
      // Manual resets also inhibit automatic use until the same depleted quotas recover.
      const depleted=request.windows.filter(w=>finite(w.remaining)&&w.remaining>=0&&w.remaining<=1);
      if(depleted.length)record.episode={at:now,windows:depleted.map(({id,end})=>({id,end,remaining:null}))};
      reply={requestId:id};
    } else if(request.action==='finish') {
      if(record.pending?.id!==request.requestId)return {blocked:true};
      record.pending.finishedAt=now;
      reply={finished:true};
    }
    temp=path.join(dir,`admission-${crypto.randomBytes(12).toString('hex')}.tmp`);
    const handle=await fs.open(temp,'wx',0o600);try{await handle.writeFile(JSON.stringify(state));await handle.sync();}finally{await handle.close();}
    await fs.rename(temp,file);temp=null;return reply;
  } finally {if(temp)await fs.unlink(temp).catch(()=>{});await fs.unlink(path.join(lock,'owner.json')).catch(()=>{});await fs.rmdir(lock).catch(()=>{});}
}
module.exports={transact};
if(require.main===module||process.argv[1]?.startsWith('{')){let request;try{request=JSON.parse(process.argv[1]?.startsWith('{')?process.argv[1]:process.argv[2]);}catch{request={};}transact(request).then(result=>console.log(JSON.stringify(result))).catch(()=>console.log(JSON.stringify({blocked:true})));}
