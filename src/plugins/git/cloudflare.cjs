// Explicit prerequisite actions. No real account calls during build/tests/render.
// Wrangler owns login storage. Tokens/secrets remain inside this Node worker.
const fs=require('node:fs/promises');
const path=require('node:path');
const {spawn}=require('node:child_process');
const {createHash,randomUUID}=require('node:crypto');
const {run:setup,readKeys,verifyRelay}=require('./setup.cjs');
const VERSION='4.162.0';
const PACKAGE={name:'herdr-git-cloudflare-tools',version:'1.0.0',private:true,dependencies:{wrangler:VERSION}};
const API='https://api.cloudflare.com/client/v4';
const hash=text=>createHash('sha256').update(text).digest('hex');
const json=text=>{try{return JSON.parse(text);}catch{return null;}};
const accountID=id=>typeof id==='string'&&/^[a-f0-9]{32}$/.test(id);
const safeName=value=>String(value??'Cloudflare account').replace(/[\x00-\x1f\x7f]/g,'').slice(0,120);
const failure=message=>Object.assign(Error(message),{safe:true});
const fail=message=>{throw failure(message);};
const ENV={WRANGLER_LOG:'error',WRANGLER_SEND_METRICS:'false',WRANGLER_WRITE_LOGS:'false',WRANGLER_LOG_SANITIZE:'true',NO_COLOR:'1',DO_NOT_TRACK:'1'};
async function safeDirectory(root) {
  for(let p=path.resolve(root);;p=path.dirname(p)) {
    try {if((await fs.lstat(p)).isSymbolicLink())fail('Linked setup folders are not supported.');}catch(e){if(e.code!=='ENOENT')throw e;}
    if(path.dirname(p)===p)break;
  }
}
async function execute(command,args,{cwd,input,env={},timeout=120000}={}) {
  return new Promise((resolve,reject)=>{
    const child=spawn(command,args,{cwd,env:{...process.env,...ENV,...env},windowsHide:true,stdio:['pipe','pipe','pipe']});
    let stdout='',stderr='',size=0,expired=false;
    const timer=setTimeout(()=>{expired=true;child.kill();},timeout);
    child.once('error',()=>{clearTimeout(timer);reject(failure('Could not start setup tooling. Check Node.js and npm installation.'));});
    for(const [stream,key]of [[child.stdout,'stdout'],[child.stderr,'stderr']])stream.on('data',b=>{
      size+=b.length;if(size>2**21){child.kill();return;}
      if(key==='stdout')stdout+=b;else stderr+=b;
    });
    child.once('close',code=>{clearTimeout(timer);resolve({code:expired?-1:code,stdout,stderr});});
    child.stdin.on('error',()=>{});child.stdin.end(input);
  });
}
async function npmCLI() {
  const folders=(process.env.PATH??'').split(path.delimiter);
  const candidates=[process.env.npm_execpath,...[path.dirname(process.execPath),...folders].flatMap(p=>[
    path.join(p,'node_modules/npm/bin/npm-cli.js'),path.join(p,'../lib/node_modules/npm/bin/npm-cli.js')])];
  for(const candidate of candidates.filter(Boolean))try{if((await fs.stat(candidate)).isFile()&&/[\\/]npm[\\/]bin[\\/]npm-cli\.js$/.test(candidate))return candidate;}catch{}
  fail('npm was not found. Reinstall Node.js with npm, then press Install again.');
}
function locations(file) {
  const root=path.join(path.dirname(file),'git-cloudflare');
  return {root,tool:path.join(root,'tool'),cli:path.join(root,'tool/node_modules/wrangler/bin/wrangler.js')};
}
async function installed(file) {
  const p=locations(file);await safeDirectory(p.root);
  try{return await fs.readFile(path.join(p.tool,'package.json'),'utf8')===JSON.stringify(PACKAGE,null,2)+'\n'
    &&json(await fs.readFile(path.join(p.tool,'node_modules/wrangler/package.json'),'utf8'))?.version===VERSION
    &&(await fs.stat(p.cli)).isFile();}catch{return false;}
}
async function cli(file,args,io,options={}) {
  if(!await installed(file))fail('Press Install beside Cloudflare tools first.');
  const p=locations(file);
  return (io.execute??execute)(process.execPath,[p.cli,...args],{cwd:p.root,env:{CI:'true',...options.env},...options});
}
async function accounts(file,io={}) {
  if(!await installed(file))return {installed:false,accounts:[]};
  const result=await cli(file,['whoami','--json'],io,{timeout:30000});
  const data=json(result.stdout);
  if(result.code!==0||data?.loggedIn!==true)return {installed:true,accounts:[],loggedIn:false};
  return {installed:true,loggedIn:true,accounts:(Array.isArray(data.accounts)?data.accounts:[])
    .filter(a=>accountID(a.id)).map(a=>({id:a.id,name:safeName(a.name)}))};
}
async function withLock(file,body) {
  const p=locations(file);await safeDirectory(p.root);await fs.mkdir(p.root,{recursive:true});
  const lock=path.join(p.root,'action.lock'),record=JSON.stringify({version:1,pid:process.pid,token:randomUUID()});
  try{await fs.writeFile(lock,record,{flag:'wx',mode:0o600});}catch(e){
    if(e.code!=='EEXIST')throw e;
    const stat=await fs.lstat(lock);if(!stat.isFile()||stat.isSymbolicLink())fail('Unknown setup lock; no files were changed.');
    const previous=await fs.readFile(lock,'utf8'),owner=json(previous);
    if(owner?.version!==1||!Number.isSafeInteger(owner.pid)||owner.pid<=0||!/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{3}-[a-f0-9]{12}$/.test(owner.token??''))fail('Unknown setup lock; no files were changed.');
    try{process.kill(owner.pid,0);fail('Another setup action is already running.');}catch(probe){if(probe.code!=='ESRCH')throw probe;}
    if(await fs.readFile(lock,'utf8')!==previous)fail('Another setup action has started.');
    await fs.unlink(lock);await fs.writeFile(lock,record,{flag:'wx',mode:0o600});
  }
  try{return await body();}finally{if(await fs.readFile(lock,'utf8').catch(()=>null)===record)await fs.unlink(lock);}
}
async function install(file,io) {
  const p=locations(file);await safeDirectory(p.tool);await fs.mkdir(p.tool,{recursive:true});
  const manifest=path.join(p.tool,'package.json'),expected=JSON.stringify(PACKAGE,null,2)+'\n';
  try{await fs.writeFile(manifest,expected,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;if(await fs.readFile(manifest,'utf8')!==expected)fail('The private tooling folder contains unknown changes; installation stopped.');}
  const result=await(io.execute??execute)(process.execPath,[await(io.npmCLI??npmCLI)(),'install','--ignore-scripts','--no-audit','--no-fund','--prefix',p.tool],{cwd:p.tool,timeout:300000,env:ENV});
  if(result.code!==0||!await installed(file))fail('Cloudflare tooling installation did not finish. Check your network, then press Install again.');
  return {status:'ready',detail:`Wrangler ${VERSION} installed privately. Nothing was installed globally.`};
}
async function configuration(file,account,io) {
  if(!accountID(account))fail('Choose a Cloudflare account first.');
  const state=await accounts(file,io);
  if(!state.accounts.some(a=>a.id===account))fail('The chosen account is not available in the current Cloudflare login. Press Login or Check.');
  let keys;
  try{keys=await readKeys(file);}catch(e){
    // Only a genuinely absent file is created; invalid/edited files are protected.
    try{await fs.stat(file);}catch(absent){if(absent.code==='ENOENT'){await setup('create',file);keys=await readKeys(file);}else throw absent;}
    if(!keys)fail('The local credential file is invalid. It was not overwritten.');
  }
  const fingerprint=hash(keys.token),name=`herdr-git-webhooks-${hash(keys.token+account).slice(0,16)}`;
  const authResult=await cli(file,['auth','token','--json'],io,{timeout:30000});
  const auth=json(authResult.stdout); // Never returned, logged or put in argv.
  if(authResult.code!==0||!auth||!['oauth','api_token','api_key'].includes(auth.type))fail('Cloudflare authorization is unavailable. Press Login and try again.');
  const headers=auth.type==='api_key'?{'X-Auth-Key':auth.key,'X-Auth-Email':auth.email}:{Authorization:`Bearer ${auth.token}`};
  if(Object.values(headers).some(v=>typeof v!=='string'||!v||/[\r\n]/.test(v)))fail('Cloudflare authorization is invalid.');
  const request=io.fetch??fetch;
  const api=async(suffix,method='GET',body)=>{
    const r=await request(`${API}/accounts/${account}${suffix}`,{method,headers:{...headers,'Content-Type':'application/json'},
      ...(body===undefined?{}:{body:JSON.stringify(body)}),redirect:'error',signal:AbortSignal.timeout(30000)});
    const data=await r.json();
    if(r.ok&&data.success===true)return data.result;
    const error=failure('Cloudflare refused the operation. Check account permissions and Workers availability, then retry.');
    error.apiCodes=(data.errors??[]).map(e=>Number(e.code));throw error;
  };
  let existing;
  try{existing=await api(`/workers/scripts/${name}/settings`);}catch(e){if(!e.apiCodes?.some(c=>[10007,10090].includes(c)))throw e;}
  if(existing&&!existing.bindings?.some(b=>b.name==='HERDR_RELAY_ID'&&b.type==='plain_text'&&b.text===fingerprint))
    fail('A Worker with this name already exists and is not owned by this setup. Nothing was overwritten.');
  let domain;
  try{domain=await api('/workers/subdomain');}catch(e){if(!e.apiCodes?.includes(10007))throw e;}
  let subdomain=domain?.subdomain;
  if(!subdomain){
    const registered=await api('/workers/subdomain','PUT',{subdomain:`herdr-${hash(account).slice(0,16)}`});
    subdomain=registered?.subdomain;
  }
  if(typeof subdomain!=='string'||!/^[a-z0-9][a-z0-9-]{0,62}$/.test(subdomain))fail('Cloudflare did not provide a usable workers.dev address.');
  const p=locations(file),folder=path.join(p.root,'deploy',account);await safeDirectory(folder);await fs.mkdir(folder,{recursive:true});
  const config={name,account_id:account,main:path.join(__dirname,'relay-worker.js'),compatibility_date:'2026-01-01',workers_dev:true,preview_urls:false,send_metrics:false,
    vars:{HERDR_RELAY_ID:fingerprint},durable_objects:{bindings:[{name:'HUB',class_name:'WebhookHub'}]},migrations:[{tag:'v1',new_sqlite_classes:['WebhookHub']}]};
  const configFile=path.join(folder,'wrangler.json'),output=path.join(folder,`deployment-${randomUUID()}.jsonl`);
  const configText=JSON.stringify(config,null,2)+'\n';
  try{await fs.writeFile(configFile,configText,{flag:'wx'});}catch(e){if(e.code!=='EEXIST')throw e;if(await fs.readFile(configFile,'utf8')!==configText)fail('The private deployment configuration was edited. It was not replaced.');}
  try{
    const deploy=await cli(file,['deploy','--config',configFile,'--keep-vars'],io,{timeout:240000,env:{CI:'true',CLOUDFLARE_ACCOUNT_ID:account,CF_ACCOUNT_ID:account,WRANGLER_OUTPUT_FILE_PATH:output}});
    if(deploy.code!==0)fail('Relay deployment did not finish. Your existing relay URL was left unchanged. Retry Configure after checking Cloudflare permissions and your network.');
    const lines=(await fs.readFile(output,'utf8').catch(()=>'' )).split(/\r?\n/).map(json);
    if(!lines.some(d=>d?.type==='deploy'&&d.version===1&&d.worker_name===name&&d.version_id))fail('Cloudflare did not confirm a deployment. Retry Configure; existing settings were not changed.');
    const secrets=await cli(file,['secret','bulk','--config',configFile],io,{timeout:120000,env:{CI:'true',CLOUDFLARE_ACCOUNT_ID:account,CF_ACCOUNT_ID:account},input:JSON.stringify({CLIENT_TOKEN:keys.token,GITHUB_SECRET:keys.secret})});
    if(secrets.code!==0)fail('The relay was deployed, but its private keys were not uploaded. Press Configure again to finish safely.');
    const relay=`https://${name}.${subdomain}.workers.dev`;
    let verified=false;
    for(let attempt=0;attempt<4;attempt++){
      try{await verifyRelay(relay,keys,request);verified=true;break;}catch{if(attempt<3)await(io.sleep??(ms=>new Promise(r=>setTimeout(r,ms))))(1000*2**attempt);}
    }
    if(!verified)fail('The relay was deployed, but is not ready yet. Press Configure again to finish verification; no keys need copying.');
    return {status:'ready',detail:'Relay configured and verified. Its URL and private keys were handled automatically.',relay,account};
  }finally{await fs.unlink(output).catch(()=>{});}
}
async function run(mode,file,account='',io={}) {
  if(mode!=='status'){
    const [major,minor]=process.versions.node.split('.').map(Number);if(major<22||(major===22&&minor<12))fail('Node.js 22.12 or newer is required for Cloudflare setup.');
  }
  if(mode==='status')return accounts(file,io);
  if(mode==='install')return withLock(file,()=>install(file,io));
  if(mode==='login')return withLock(file,async()=>{
    const result=await cli(file,['login','--browser'],io,{timeout:360000,env:{CI:'false'}});
    if(result.code!==0)fail('Cloudflare login was cancelled or did not finish. Press Login to try again.');
    const state=await accounts(file,io);if(!state.loggedIn)fail('Cloudflare did not confirm the login. Press Login again.');
    return {status:'ready',detail:'Signed in to Cloudflare. Choose an account if more than one is available.'};
  });
  if(mode==='configure')return withLock(file,()=>configuration(file,account,io));
  fail('Unknown Cloudflare setup action.');
}
module.exports={run,VERSION,PACKAGE,ENV,locations,installed,configuration,withLock};
if(require.main===module)run(...process.argv.slice(2)).then(value=>console.log(JSON.stringify(value))).catch(e=>{
  // Error strings are authored above, never raw CLI/provider messages or tokens.
  console.log(JSON.stringify({status:'error',detail:e?.safe===true?e.message:'Setup did not finish. Check Node.js, npm, account permissions and network access, then retry.'}));process.exitCode=1;
});
