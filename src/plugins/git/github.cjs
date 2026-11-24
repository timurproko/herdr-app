// Account-scoped webhook administration. Never switch gh's global login or
// return credentials: named tokens stay in this worker and child environments.
const {spawn}=require('node:child_process');
const validLogin=value=>typeof value==='string'&&/^[A-Za-z0-9][A-Za-z0-9-]{0,38}$/.test(value);
const safe=message=>Object.assign(Error(message),{safe:true});
function environment(source=process.env){
  const env={...source};
  for(const key of Object.keys(env))if(/^(?:GH_TOKEN|GITHUB_TOKEN|GH_ENTERPRISE_TOKEN|GITHUB_ENTERPRISE_TOKEN|GH_DEBUG)$/i.test(key))delete env[key];
  return {...env,GH_HOST:'github.com',GH_PROMPT_DISABLED:'1',GH_NO_UPDATE_NOTIFIER:'1',GH_NO_EXTENSION_UPDATE_NOTIFIER:'1'};
}
function gh(args,input,env=process.env){
  return new Promise((resolve,reject)=>{
    const child=spawn('gh',args[0]==='api'&&!args.includes('--include')?[...args,'--include']:args,{env,windowsHide:true,stdio:['pipe','pipe','pipe']});let out='',err='',size=0,overflow=false,expired=false;
    const timer=setTimeout(()=>{expired=true;child.kill();},15000);
    child.on('error',()=>{clearTimeout(timer);reject(safe('Install GitHub CLI and sign in on this computer.'));});
    child.stdout.on('data',bytes=>{size+=bytes.length;if(size>2**20){overflow=true;child.kill();}else out+=bytes;});
    // Auth/API failures can contain credentials or request bodies. Discard them.
    child.stderr.on('data',bytes=>{if(err.length<8192)err+=bytes;});child.stdin.on('error',()=>{});
    child.on('close',(code,signal)=>{
      clearTimeout(timer);
      // --include works with paginated/slurped JSON too: remove each HTTP
      // header block, never JSON string content (its newlines are escaped).
      const header=/HTTP\/[\d.]+\s+(\d{3})[^\r\n]*\r?\n(?:[^\r\n]+\r?\n)*\r?\n/g;
      const statuses=[...out.matchAll(header)].map(match=>match[1]);
      const body=out.replace(header,'');
      if(code===0&&!signal&&!overflow&&!expired)return resolve(body);
      let message='';try{const data=JSON.parse(body);message=(Array.isArray(data)?data.flat():[data]).map(value=>value?.message??'').join('\n');}catch {}
      const text=err+'\n'+message;
      const error=safe('GitHub request failed. Check the selected GitHub login, permissions and API rate limits.');
      if(!expired&&!overflow&&!signal&&Number.isInteger(code)&&code>=0&&code<0x80000000
          && !statuses.includes('401') && !/HTTP 401|bad credentials|permission denied|resource not accessible|timeout|timed out/i.test(text)
          && (/API rate limit|secondary rate limit|rate limit exceeded|abuse detection mechanism/i.test(text)||statuses.includes('429')||/\bHTTP(?:\/[\d.]+)?\s+429\b/i.test(err))) {
        error.rateLimited=true;
        const retries=[...(out+'\n'+err).matchAll(/^retry-after:\s*([^\r\n]+)/gim)].map(([,retry])=>Number.isFinite(Number(retry))?Math.max(0,Number(retry)*1000):Math.max(0,Date.parse(retry)-Date.now())||0);
        error.retryAfter=Math.max(0,...retries);
      }
      reject(error);
    });
    child.stdin.end(input===undefined?undefined:JSON.stringify(input));
  });
}
async function accounts(io={}){
  const execute=io.execute??gh;
  try{
    const raw=JSON.parse(await execute(['auth','status','--hostname','github.com','--json','hosts','--jq','[.hosts["github.com"][] | {login,active,state}]'],undefined,environment(io.env)));
    if(!Array.isArray(raw)||raw.length>64||!raw.every(a=>a&&validLogin(a.login)&&typeof a.active==='boolean'))throw Error();
    const found=[...new Map(raw.filter(a=>a.state==='success').map(a=>[a.login.toLowerCase(),{login:a.login,active:a.active}])).values()];
    const active=found.find(a=>a.active)?.login??null;
    return {status:found.length?'ready':'missing',accounts:found,active,detail:found.length?'Choose the GitHub account used for repository webhooks.':'Sign in using gh auth login on this computer.'};
  }catch{return {status:'missing',accounts:[],active:null,detail:'Could not read signed-in GitHub accounts. Check GitHub CLI login and network access.'};}
}
async function forAccount(login,io={}){
  if(!validLogin(login))throw safe('Choose a signed-in GitHub account.');
  const execute=io.execute??gh,env=environment(io.env);
  let token;
  try{token=(await execute(['auth','token','--hostname','github.com','--user',login],undefined,env)).trim();}
  catch{throw safe('The selected GitHub login is unavailable. Sign in again or choose another account.');}
  if(!token||token.length>8192||/[\s\x00-\x1f\x7f]/.test(token))throw safe('The selected GitHub login is unavailable. Sign in again or choose another account.');
  const bound={...env,GH_TOKEN:token};
  const api=(args,input)=>{
    // gh accepts absolute API URLs; forbid those before attaching this account.
    if(args[0]!=='api'||typeof args[1]!=='string'||!/^\/?(?:user|repos\/)[A-Za-z0-9_./?=&,-]*$/.test(args[1])||args.some(a=>a==='--hostname'||a.startsWith('--hostname=')))throw safe('Unsupported GitHub request.');
    return execute([...args,'--hostname','github.com'],input,bound);
  };
  const actual=(await api(['api','user','--jq','.login'])).trim();
  if(actual.toLowerCase()!==login.toLowerCase())throw safe('GitHub account identity changed. Choose the account again before updating repositories.');
  return api;
}
// Whether a login can administer at least one active repository (webhooks need admin).
// Pages stop at the first match, so this is usually one request, never the hook scan.
async function administers(api){
  for(let page=1;page<=100;page++){
    const out=await api(['api',`user/repos?per_page=100&page=${page}&affiliation=owner,collaborator,organization_member`,'--jq','[([.[] | select(.permissions.admin == true and .archived == false and .disabled != true)] | length), length] | @json']);
    const [admin,count]=JSON.parse(out.trim());
    if(!Number.isSafeInteger(admin)||!Number.isSafeInteger(count))throw Error();
    if(admin>0)return true;if(count<100)return false;
  }
  return false;
}
// Signed-in accounts for repository webhooks, each with `administers`: false hides it
// from the account choice; null (could not tell) keeps it, so a hiccup never hides one.
async function repositoryAccounts(io={}){
  const state=await accounts(io);if(state.status!=='ready')return state;
  const checked=await Promise.all(state.accounts.map(async a=>{
    try{return {...a,administers:await administers(await forAccount(a.login,io))};}catch{return {...a,administers:null};}
  }));
  return {...state,accounts:checked};
}
module.exports={gh,accounts,repositoryAccounts,forAccount,validLogin};
if(require.main===module){
  (process.argv[2]==='accounts'?accounts():process.argv[2]==='repository-accounts'?repositoryAccounts():Promise.resolve({status:'error',detail:'Unsupported GitHub account action.'})).then(value=>console.log(JSON.stringify(value))).catch(()=>console.log(JSON.stringify({status:'error',detail:'Could not read GitHub accounts.'})));
}
