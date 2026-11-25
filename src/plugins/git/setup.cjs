// Explicit Settings actions only; never run by the Git panel's refresh loop.
const fs = require('node:fs/promises');
const path = require('node:path');
const { randomBytes, createHash } = require('node:crypto');
const { spawn } = require('node:child_process');
const {inventory,setRepositories,matchingHooks,hookReady,changeWebhook,validRepository}=require('./repositories.cjs');
const {gh,forAccount,validLogin}=require('./github.cjs');
const EVENTS = ['check_run', 'check_suite', 'status', 'workflow_run', 'pull_request', 'push'];
function baseURL(text) {
  const u = new URL(text);
  if (u.protocol !== 'https:' || u.username || u.password || u.search || u.hash || u.pathname !== '/') throw Error('Enter an HTTPS relay origin, without a path or credentials.');
  return u.origin;
}
async function readKeys(file) {
  const keys = JSON.parse(await fs.readFile(file, 'utf8'));
  if (!/^[a-f0-9]{64}$/.test(keys.token) || !/^[a-f0-9]{64}$/.test(keys.secret)) throw Error('Invalid local credential file.');
  return keys;
}
async function verifyRelay(base, keys, request = fetch) {
  const r = await request(`${base}/configuration`, {headers:{Authorization:`Bearer ${keys.token}`}, redirect:'error', signal:AbortSignal.timeout(10000)});
  if (!r.ok) throw Object.assign(Error('Relay is unavailable or its client token does not match.'),{setupMissing:[401,403,404].includes(r.status)});
  const data = await r.json();
  if (data.protocol !== 1 || data.secretHash !== createHash('sha256').update(keys.secret).digest('hex')) throw Object.assign(Error('Relay webhook secret does not match the local credentials.'),{setupMissing:true});
  return data.noticeVersion === 2 ? 2 : 1;
}
async function run(mode, file, relay, repository, io = {}, githubAccount = '') {
  if (mode === 'guide') {
    const guide=path.join(__dirname,'setup-guide.txt');
    const [command,args]=process.platform==='win32' ? ['notepad.exe',[guide]] : process.platform==='darwin' ? ['open',[guide]] : ['xdg-open',[guide]];
    await new Promise((resolve,reject)=>{const child=spawn(command,args,{stdio:'ignore',detached:true,windowsHide:true});child.once('spawn',()=>{child.unref();resolve();});child.once('error',reject);});
    return {status:'ready',detail:'Opened the webhook setup guide.'};
  }
  if(mode==='notice'){
    try{const result=await run('relay',file,relay,'',io);return {setup:result.status==='ready'?'ready':'missing'};}
    catch(error){return {setup:error?.setupMissing?'missing':'unknown'};} // connectivity is not missing setup
  }
  if (mode === 'create') {
    await fs.mkdir(path.dirname(file), {recursive:true});
    // wx refuses to overwrite existing credentials, including malformed/user-edited ones.
    await fs.writeFile(file, JSON.stringify({token:randomBytes(32).toString('hex'),secret:randomBytes(32).toString('hex')}) + '\n', {flag:'wx',mode:0o600});
    return {status:'ready',detail:'Local credentials created. Use Configure to finish relay setup automatically.'};
  }
  let keys;
  try { keys = await readKeys(file); } catch {
    const exists=await fs.stat(file).then(()=>true,()=>false);
    return {status:'missing',detail:exists?'The local credential file is invalid and was not overwritten.':'Configure will create local credentials automatically. Create is optional.',...(exists||mode!=='credentials'?{fix:null}:{})};
  }
  if (mode === 'credentials') return {status:'ready',detail:'Local credentials available; never exported with preferences.',fix:null};
  let base;
  try { base = baseURL(relay); } catch { return {status:'missing',detail:'Enter the HTTPS relay URL after deploying your private relay.',fix:null}; }
  const noticeVersion = await verifyRelay(base, keys, io.fetch);
  if (mode === 'relay') return {status:'ready',noticeVersion,detail:'Relay reachable; client token and webhook secret match.'};
  const selected=githubAccount||(mode==='set-repositories'?JSON.parse(repository).account:'');
  if(selected&&!validLogin(selected))throw Object.assign(Error('Choose a signed-in GitHub account.'),{safe:true});
  const execute=io.gh??(selected?await forAccount(selected,io.github):gh);
  if(mode==='repositories'){
    const result=await inventory(execute,base,EVENTS);
    if(selected&&result.account.toLowerCase()!==selected.toLowerCase())throw Object.assign(Error('GitHub account changed. Check again before updating repositories.'),{safe:true});
    return result;
  }
  if(mode==='set-repositories')return require('./cloudflare.cjs').withLock(file,()=>setRepositories(execute,base,keys,repository,EVENTS));
  if (!validRepository(repository)) return {status:'missing',detail:'Choose a repository to check its webhook.',fix:null};
  if (mode === 'connect'||mode==='disconnect') {
    await require('./cloudflare.cjs').withLock(file,()=>changeWebhook(execute,base,keys,repository,mode==='connect',EVENTS));
    return {status:'ready',detail:mode==='connect'?'Repository webhook connected.':'Repository webhook disconnected.'};
  }
  const ours=await matchingHooks(execute,base,repository);
  if(ours.length>1)throw Error('Several matching webhooks exist. Resolve duplicates in GitHub repository settings first.');
  if(mode==='notice-repository')return {status:ours[0]?.active?'ready':'missing'};
  const ready = hookReady(ours[0],EVENTS);
  return {status:ready ? 'ready' : 'missing',detail:ready ? 'Webhook active with all CI/PR events. Delivery success is verified by GitHub, not this configuration check.' : 'Connect this repository to the relay (requires webhook administration permission).',...(ready ? {fix:null} : {})};
}
module.exports = {run, verifyRelay, baseURL, readKeys};
if (require.main === module) run(...process.argv.slice(2,6),{},process.argv[6]??'').then(value => console.log(JSON.stringify(value))).catch(error => {
  console.log(JSON.stringify({status:'error',...(error?.rateLimited?{rateLimited:true,retryAfter:error.retryAfter??0}:{}),detail:error?.safe===true?error.message:'Setup check failed. Check the relay deployment, matching credentials, gh login and webhook administration permission.'}));
  process.exitCode = 1;
});
