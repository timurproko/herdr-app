// Explicit Settings requests only. Read server truth; never persist desired-state
// jobs or touch another relay's webhooks. All inputs/outputs here are public.
const validRepository=name=>typeof name==='string'&&/^[A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+$/.test(name)&&name.split('/').every(p=>p!=='.'&&p!=='..');
const failure='GitHub request failed. Check webhook admin permission, login and API rate limits.';
async function pool(items,count,fn){let next=0;const results=new Array(items.length);await Promise.all(Array.from({length:Math.min(count,items.length)},async()=>{while(next<items.length){const i=next++;results[i]=await fn(items[i]);}}));return results;}
async function matchingHooks(execute,base,name){
  const pages=JSON.parse(await execute(['api',`repos/${name}/hooks`,'--paginate','--slurp']));
  if(!Array.isArray(pages)||!pages.every(Array.isArray))throw Error(failure);
  return pages.flat().filter(h=>h?.config?.url===`${base}/github`);
}
const hookReady=(hook,events)=>Boolean(hook?.active&&hook.config?.content_type==='json'&&String(hook.config?.insecure_ssl??'0')==='0'&&events.every(e=>hook.events?.includes(e)));
async function changeWebhook(execute,base,keys,name,enabled,events){
  if(!validRepository(name))throw Error('Invalid repository.');
  const hooks=await matchingHooks(execute,base,name);
  if(hooks.length>1)throw Error('Several matching webhooks exist. Resolve duplicates in GitHub repository settings first.');
  const hook=hooks[0],endpoint=`repos/${name}/hooks`;
  if(hook&&(!Number.isSafeInteger(hook.id)||hook.id<=0))throw Error('Invalid webhook identity. No changes were made.');
  if(!enabled){if(hook)await execute(['api',`${endpoint}/${hook.id}`,'--method','DELETE']);return;}
  await execute(['api',hook?`${endpoint}/${hook.id}`:endpoint,'--method',hook?'PATCH':'POST','--input','-'],{
    name:'web',active:true,events,config:{url:`${base}/github`,content_type:'json',insecure_ssl:'0',secret:keys.secret},
  });
}
const validAccount=value=>typeof value==='string'&&/^[A-Za-z0-9_.-]{1,100}$/.test(value);
async function readStage(detail,read){try{return await read();}catch{throw Object.assign(Error(detail),{safe:true});}}
async function inventory(execute,base,events){
  const account=await readStage('Could not read the GitHub account. Check GitHub CLI login and network access.',async()=>{
    const login=(await execute(['api','user','--jq','.login'])).trim();if(!validAccount(login))throw Error();return login;
  });
  // This is account inventory, NOT a scan of local folders. Fetch every page;
  // only active repositories this login can administer are offered for changes.
  // gh rejects --slurp combined with --jq. Emit one compact JSON array per
  // page instead; merge these in Node without buffering raw repository metadata.
  const output=await readStage('Could not load the repository list with GitHub CLI. Check GitHub login, repository access, network or API rate limits.',()=>execute(['api','user/repos?per_page=100&sort=full_name&affiliation=owner,collaborator,organization_member','--paginate','--jq','[.[] | select(.permissions.admin == true and .archived == false and .disabled != true) | {name:.full_name,id:.id}] | @json']));
  const names=await readStage('GitHub returned an unexpected repository-list format. Check again.',async()=>{
    const pages=output.trim().split(/\r?\n/).filter(Boolean).map(line=>JSON.parse(line));
    if(!pages.length||!pages.every(Array.isArray))throw Error();
    const rows=pages.flat();if(!rows.every(r=>r&&validRepository(r.name)&&Number.isSafeInteger(r.id)&&r.id>0))throw Error();return rows;
  });
  const byId=new Map(names.map(r=>[r.id,r]));
  const unique=[...new Map([...byId.values()].map(r=>[r.name.toLowerCase(),r])).values()].sort((a,b)=>a.name.localeCompare(b.name));
  const repositories=await pool(unique,4,async({name,id})=>{
    try{const hooks=await matchingHooks(execute,base,name);if(hooks.length>1)throw Error('duplicates');
      return {name,repositoryId:id,checked:Boolean(hooks[0]?.active),...(hooks[0]?.active&&!hookReady(hooks[0],events)?{warning:'Webhook settings incomplete; toggle off and on to repair.'}:{})};
    }catch{return {name,repositoryId:id,checked:null,disabled:true,error:'Could not check this webhook. Check GitHub permissions or rate limits, then press Check.'};}
  });
  return {status:repositories.length?(repositories.some(r=>r.error)?'error':'ready'):'recommended',...(!repositories.length?{statusLabel:null}:{}),account,detail:repositories.length?`${repositories.filter(r=>r.checked).length} of ${repositories.length} enabled`:'Choose another GitHub account or check repository access.',repositories};
}
async function setRepositories(execute,base,keys,payload,events){
  const {names,enabled,account,ids}=JSON.parse(payload);
  // UI chunks large snapshots to keep Windows argv and each request bounded.
  if(!Array.isArray(names)||!names.length||names.length>50||!names.every(validRepository)||new Set(names.map(n=>n.toLowerCase())).size!==names.length||typeof enabled!=='boolean'||!validAccount(account)||!ids||!names.every(name=>Number.isSafeInteger(ids[name])&&ids[name]>0)||new Set(names.map(name=>ids[name])).size!==names.length)throw Error('Invalid repository selection.');
  const actual=(await execute(['api','user','--jq','.login'])).trim();if(actual.toLowerCase()!==account.toLowerCase())throw Error('GitHub account changed. Check again before changing repository updates.');
  const results=await pool(names,2,async name=>{
    try{
      const id=Number((await execute(['api',`repos/${name}`,'--jq','.id'])).trim());
      if(id!==ids[name])return {name,error:'Repository identity changed. Check again before updating.'};
      await changeWebhook(execute,base,keys,name,enabled,events);return {name,checked:enabled};
    }
    catch{return {name,error:failure};}
  });
  return {status:'ready',errors:Object.fromEntries(results.filter(r=>r.error).map(r=>[r.name,r.error]))};
}
module.exports={inventory,setRepositories,matchingHooks,hookReady,changeWebhook,validRepository};
