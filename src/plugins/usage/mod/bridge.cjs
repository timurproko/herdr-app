// Standalone account-quota collector. Node built-ins only; no Custom dependency.
// Reads CLI OAuth stores locally and sends access tokens only to fixed official
// HTTPS endpoints. Claude OAuth may be renewed in its existing file-backed store;
// no agent/daemon launch, logout or credential output. A browser login runs
// only on the explicit `login` action, through the account-switcher helper.
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const crypto = require('node:crypto');
const https = require('node:https');
const { execFile } = require('node:child_process');
const ENDPOINTS = Object.freeze({
  // cedar_ember=1: the account's limit resets too (Claude Code's own read). The server
  // answers it only for the Claude Code client, see CLAUDE_USER_AGENT.
  claude:'https://api.anthropic.com/api/oauth/usage?cedar_ember=1',
  profile:'https://api.anthropic.com/api/oauth/profile',
  claudeToken:'https://platform.claude.com/v1/oauth/token',
  codex:'https://chatgpt.com/backend-api/wham/usage',
  // Codex's own list of the account's limit resets (what chatgpt.com Settings › Usage shows).
  codexResets:'https://chatgpt.com/backend-api/wham/rate-limit-reset-credits',
  copilot:'https://api.github.com/copilot_internal/user',
  githubUser:'https://api.github.com/user',
});
const text = (v,max=240) => typeof v==='string'?v.slice(0,max):undefined;
// Provider error codes that no refresh or sign-in on this machine can fix.
const PROVIDER_BLOCKS=new Set(['oauth_not_allowed_for_organization']);
const number = v => v!==null && v!==undefined && v!=='' && Number.isFinite(Number(v))?Number(v):undefined;
const hash = v => crypto.createHash('sha256').update(String(v)).digest('hex').slice(0,24);
const stamp = v => {const n=number(v);return n===undefined?undefined:n<1e11?n*1000:n;};
const iso = v => {const n=typeof v==='number'?v:Date.parse(v);return Number.isFinite(n)?new Date(n).toISOString():undefined;};
function claims(token) {try {return JSON.parse(Buffer.from(token.split('.')[1],'base64url').toString());}catch{return {};}}
async function readJson(file) {try{return JSON.parse(await fs.readFile(file,'utf8'));}catch{return null;}}
async function readJsonc(file) {try {const raw=await fs.readFile(file,'utf8');return JSON.parse(raw.replace(/^\s*\/\/.*$/gm,'').replace(/,\s*([}\]])/g,'$1'));}catch{return null;}}
async function discoverExecutables(options={}) {
  const home=options.home??os.homedir(),env=options.env??process.env,win=(options.platform??process.platform)==='win32';
  const local=env.LOCALAPPDATA??path.join(home,'AppData/Local');
  const known={claude:[path.join(home,'.local/bin',win?'claude.exe':'claude')],copilot:win?[path.join(local,'GitHubCopilotCLI/copilot.exe')]:[]};
  const found={};
  for(const name of ['claude','copilot']) {
    const candidates=[...known[name],...(env.PATH??env.Path??'').split(path.delimiter).filter(Boolean).map(dir=>path.join(dir.replace(/^"|"$/g,''),name+(win?'.exe':'')))];
    for(const candidate of candidates) {try{if(!(await fs.stat(candidate)).isFile())continue;await fs.access(candidate);found[name]=candidate;break;}catch{}}
  }
  return found;
}
async function githubToken(login,options={}) {
  if(options.ghToken) return options.ghToken(login);
  const env=options.env??process.env,command=env.ProgramFiles?path.join(env.ProgramFiles,'GitHub CLI/gh.exe'):'gh';
  const args=['auth','token','--hostname','github.com',...(login?['--user',login]:[])];
  return new Promise(resolve=>execFile(command,args,{timeout:3000,maxBuffer:16384,windowsHide:true},(error,stdout)=>resolve(error?undefined:stdout.trim()||undefined)));
}
function copilotBillingUrl(login,now=Date.now()) {
  if(!/^[A-Za-z0-9][A-Za-z0-9_-]{0,99}$/.test(login??''))return null;
  const date=new Date(now);
  return `https://api.github.com/users/${login}/settings/billing/premium_request/usage?year=${date.getUTCFullYear()}&month=${date.getUTCMonth()+1}`;
}
const isBillingUrl=url=>/^https:\/\/api\.github\.com\/users\/[A-Za-z0-9][A-Za-z0-9_-]{0,99}\/settings\/billing\/premium_request\/usage\?year=20\d{2}&month=(?:[1-9]|1[0-2])$/.test(url);
// Claiming a Claude limit reset: only on the person's click, for one grant of one account.
const RESET_ID=/^[a-z0-9_-]{1,64}$/,REQUEST_ID=/^[A-Za-z0-9_-]{1,64}$/,ORGANIZATION=/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const CODEX_CONSUME='https://chatgpt.com/backend-api/wham/rate-limit-reset-credits/consume',CREDIT_ID=/^[A-Za-z0-9_-]{1,100}$/;
const validConsumeBody=body=>CREDIT_ID.test(body?.credit_id??'')&&REQUEST_ID.test(body?.redeem_request_id??'')&&Object.keys(body).length===2;
const isResetUrl=url=>/^https:\/\/api\.anthropic\.com\/api\/organizations\/[0-9a-f-]{36}\/reset_rate_limits$/i.test(url);
const validResetBody=body=>body?.program==='cedar_ember'&&RESET_ID.test(body.grant_id??'')&&REQUEST_ID.test(body.request_id??'')&&Object.keys(body).length===3;
function requestJson(url,headers,request={}) {
  const tokenRequest=url===ENDPOINTS.claudeToken,consumeRequest=url===CODEX_CONSUME,resetRequest=isResetUrl(url)||consumeRequest,method=request.method??'GET';
  if((!Object.values(ENDPOINTS).includes(url)&&!isBillingUrl(url)&&!resetRequest)||method!==(tokenRequest||resetRequest?'POST':'GET')||
    (resetRequest&&!(consumeRequest?validConsumeBody(request.body):validResetBody(request.body)))||
    (tokenRequest&&(request.body?.grant_type!=='refresh_token'||request.body?.client_id!==CLAUDE_CLIENT_ID||typeof request.body?.refresh_token!=='string'||!request.body.refresh_token))) return Promise.reject(Error('Unapproved endpoint or method'));
  const payload=tokenRequest||resetRequest?JSON.stringify(request.body):undefined;
  return new Promise((resolve,reject)=>{
    const req=https.request(url,{method,headers:{...headers,...(payload?{'Content-Type':'application/json','Content-Length':Buffer.byteLength(payload)}:{})},rejectUnauthorized:true},res=>{
      let size=0,body='';res.setEncoding('utf8');
      res.on('data',chunk=>{size+=Buffer.byteLength(chunk);if(size>1024*1024)req.destroy(Error('Response too large'));else body+=chunk;});
      res.on('error',reject);
      res.on('end',()=>{clearTimeout(deadline);let json=null;try{json=JSON.parse(body);}catch{}resolve({status:res.statusCode,body:json,retryAfter:res.headers['retry-after']});});
    });
    const deadline=setTimeout(()=>req.destroy(Error('Timed out')),Math.max(1,Math.min(7000,number(request.timeout)??7000)));deadline.unref?.();
    req.on('error',()=>{clearTimeout(deadline);reject(Error('Usage service could not be reached. Try again later.'));});req.end(payload);
  });
}
// Saved switcher accounts are authoritative; never rotate one through a CLI
// copy's independent lock. Only the switcher's helper owns their token lineage.
async function switcherAccounts(home,read,options={}) {
  const dir=path.join(home,'.claude/account-switcher/accounts');
  let names;try{names=await (options.readDir??(dir=>fs.readdir(dir,{withFileTypes:true})))(dir);}catch{return [];}
  const accounts=[];
  for(const item of names.slice(0,64)) {
    if(!item.isFile()||!item.name.endsWith('.json'))continue;
    const file=path.join(dir,item.name),raw=await read(file),oauth=raw?.credentials?.claudeAiOauth;
    if(typeof raw?.email!=='string'||!raw.email||!oauth?.accessToken)continue;
    accounts.push({file,raw,oauth});
  }
  return accounts;
}
function switcherOwner(accounts,token,refresh) {
  return accounts.find(a=>(token&&a.oauth.accessToken===token)||(refresh&&(a.oauth.refreshToken===refresh||(Array.isArray(a.raw.history)&&a.raw.history.includes(refresh)))));
}
async function discover(options={}) {
  const home=options.home??os.homedir(),env=options.env??process.env,read=options.readJson??readJson;
  const results=[],seen=new Set();
  const full=p=>p==='~'?home:p?.startsWith('~/')?path.join(home,p.slice(2)):path.resolve(p);
  const add=(provider,file,harness,auth)=>{
    if(!auth)return;
    const token=typeof auth.token==='string'&&auth.token?auth.token:undefined;
    const jwt=token?claims(token):{},idJwt=auth.idToken?claims(auth.idToken):{};
    const openai=jwt['https://api.openai.com/auth']??idJwt['https://api.openai.com/auth']??{};
    const account=auth.accountId??openai.chatgpt_account_id??jwt.chatgpt_account_id;
    const email=auth.email??jwt['https://api.openai.com/profile']?.email??jwt.email??idJwt.email;
    const key=`${provider}:${file}`;if(seen.has(key))return;seen.add(key);
    results.push({provider,file,harness,token,refreshToken:typeof auth.refreshToken==='string'?auth.refreshToken:undefined,accountId:text(account),organizationId:text(auth.organizationId),email:text(email),expires:stamp(auth.expires)??stamp(jwt.exp),plan:text(auth.plan),noQuota:!token,detail:text(auth.detail,500),managedEmail:auth.managedEmail,helper:auth.helper});
  };
  const codexFiles=[env.CODEX_HOME&&path.join(full(env.CODEX_HOME),'auth.json'),path.join(home,'.codex/auth.json')].filter(Boolean);
  for(const file of new Set(codexFiles)) {const raw=await read(file);if(raw)add('codex',file,'codex',{token:raw.tokens?.access_token,idToken:raw.tokens?.id_token,accountId:raw.tokens?.account_id});}
  const managed=await switcherAccounts(home,read,options);
  for(const {file,raw,oauth} of managed)add('claude',file,'account-switcher',{token:oauth.accessToken,refreshToken:oauth.refreshToken,expires:oauth.expiresAt,plan:oauth.subscriptionType,
    email:raw.email,accountId:raw.oauthAccount?.accountUuid,organizationId:raw.oauthAccount?.organizationUuid,managedEmail:raw.email,
    helper:path.join(home,'.claude/plugins-local/account-switcher/bin/session-dir.js')});
  const claudeFiles=[env.CLAUDE_CONFIG_DIR&&path.join(full(env.CLAUDE_CONFIG_DIR),'.credentials.json'),path.join(home,'.claude/.credentials.json')].filter(Boolean);
  const profile=await read(path.join(home,'.claude.json'));
  for(const file of new Set(claudeFiles)) {
    const raw=await read(file),oauth=raw?.claudeAiOauth;
    // A custom config owns its profile too; ~/.claude.json may name a different account.
    const ownProfile=env.CLAUDE_CONFIG_DIR&&file===path.join(full(env.CLAUDE_CONFIG_DIR),'.credentials.json')?await read(path.join(full(env.CLAUDE_CONFIG_DIR),'.claude.json')):profile;
    if(oauth)add('claude',file,'claude',{token:oauth.accessToken,refreshToken:oauth.refreshToken,expires:oauth.expiresAt,plan:oauth.subscriptionType,accountId:ownProfile?.oauthAccount?.accountUuid,organizationId:ownProfile?.oauthAccount?.organizationUuid,email:ownProfile?.oauthAccount?.emailAddress});
  }
  if((options.platform??process.platform)==='darwin' && !results.some(r=>r.provider==='claude')) {
    const keychain=options.keychain??(()=>new Promise(resolve=>execFile('security',['find-generic-password','-s','Claude Code-credentials','-w'],{timeout:2000,maxBuffer:65536},(e,out)=>{try{resolve(e?null:JSON.parse(out));}catch{resolve(null);}})));
    const raw=await keychain(),oauth=raw?.claudeAiOauth;
    if(oauth)add('claude','macOS-keychain','claude',{token:oauth.accessToken,expires:oauth.expiresAt,plan:oauth.subscriptionType,accountId:profile?.oauthAccount?.accountUuid,email:profile?.oauthAccount?.emailAddress});
  }
  // Desktop/SSH collectors do not inherit a running A1 agent's
  // PI_CODING_AGENT_DIR. Its default store may hold the current Codex login
  // while ~/.codex and ~/.pi still contain expired copies of that account.
  const a1File=path.join(home,'.a1/agent/auth.json'),a1=(await read(a1File))?.['openai-codex'];
  if(a1?.type==='oauth')add('codex',a1File,'a1',{token:a1.access,expires:a1.expires,accountId:a1.accountId});
  const stores=[
    {harness:'pi',file:path.join(env.PI_CODING_AGENT_DIR?full(env.PI_CODING_AGENT_DIR):path.join(home,'.pi/agent'),'auth.json'),codex:'openai-codex'},
    {harness:'pi',file:path.join(home,'.pi/agent/auth.json'),codex:'openai-codex'},
    {harness:'opencode',file:path.join(env.XDG_DATA_HOME?full(env.XDG_DATA_HOME):path.join(home,'.local/share'),'opencode/auth.json'),codex:'openai'},
  ];
  for(const store of stores) {
    const raw=await read(store.file);if(!raw)continue;
    for(const [provider,key] of [['claude','anthropic'],['codex',store.codex]]) {const oauth=raw[key];if(oauth?.type==='oauth')add(provider,store.file,store.harness,{token:oauth.access,refreshToken:provider==='claude'?oauth.refresh:undefined,expires:oauth.expires,accountId:oauth.accountId});}
  }
  const copilotFile=path.join(env.COPILOT_HOME?full(env.COPILOT_HOME):path.join(home,'.copilot'),'config.json');
  const copilot=await (options.readJsonc??readJsonc)(copilotFile);
  const logged=copilot?.lastLoggedInUser??copilot?.last_logged_in_user;
  const host=String(env.COPILOT_GH_HOST??env.GH_HOST??logged?.host??'github.com').replace(/^https?:\/\//,'').replace(/\/$/,'').toLowerCase();
  if(host==='github.com') {
    const token=env.COPILOT_GITHUB_TOKEN??env.GH_TOKEN??env.GITHUB_TOKEN??(logged?await githubToken(logged.login,options):undefined);
    if(token)add('copilot',`github.com:${logged?.login??'active'}`,'copilot',{token,accountId:logged?.login,email:logged?.login});
    else if(logged)add('copilot',copilotFile,'copilot',{accountId:logged.login,email:logged.login,detail:'Copilot is installed, but its quota login is not available to the collector. Authenticate GitHub CLI for this same account or provide COPILOT_GITHUB_TOKEN.'});
  } else if(logged)add('copilot',copilotFile,'copilot',{accountId:logged.login,detail:'Usage for GitHub Enterprise hosts is not yet supported. No credential was sent to github.com.'});
  return results.filter(c=>c.harness==='account-switcher'||c.provider!=='claude'||!(switcherOwner(managed,c.token,c.refreshToken)||
    (c.accountId&&managed.some(a=>a.raw.oauthAccount?.accountUuid===c.accountId&&(!c.organizationId||a.raw.oauthAccount?.organizationUuid===c.organizationId)))));
}
// Public Claude OAuth client, also used by the official CLI. Refresh is not login.
const CLAUDE_CLIENT_ID='9d1c250a-e61b-44d9-88ed-5944d1962f5e';
class ClaudeRefreshError extends Error {
  constructor(reason) {super('Claude login could not be renewed.');this.reason=reason;}
}
function storedClaude(candidate,raw) {
  const native=candidate.harness==='claude',auth=native?raw?.claudeAiOauth:raw?.anthropic;
  if(!auth||(!native&&auth.type!=='oauth'))throw new ClaudeRefreshError('storage');
  return {...candidate,token:native?auth.accessToken:auth.access,refreshToken:native?auth.refreshToken:auth.refresh,
    expires:stamp(native?auth.expiresAt:auth.expires),plan:native?auth.subscriptionType:candidate.plan};
}
async function preserveCredentialAcl(original,temporary) {
  if(process.platform!=='win32')return;
  // Copy the original Windows ACL while the temporary file is still empty.
  // Secrets never appear in command arguments, stdout or diagnostic errors.
  const quote=s=>"'"+s.replace(/'/g,"''")+"'";
  const script=`$ErrorActionPreference='Stop'; Set-Acl -LiteralPath ${quote(temporary)} -AclObject (Get-Acl -LiteralPath ${quote(original)})`;
  const command=path.join(process.env.SystemRoot??'C:\\Windows','System32/WindowsPowerShell/v1.0/powershell.exe');
  await new Promise((resolve,reject)=>execFile(command,['-NoProfile','-NonInteractive','-EncodedCommand',Buffer.from(script,'utf16le').toString('base64')],
    {timeout:3000,maxBuffer:4096,windowsHide:true},error=>error?reject(new ClaudeRefreshError('storage')):resolve()));
}
async function refreshLock(file) {
  const lock=file+'.custom-usage-refresh.lock',owner=path.join(lock,'owner.json'),started=Date.now();
  for(;;) {
    try {await fs.mkdir(lock,{mode:0o700});break;}
    catch(e) {
      if(e.code!=='EEXIST')throw new ClaudeRefreshError('storage');
      // Reclaim only our own abandoned lock after its process has exited.
      try {
        const metadata=JSON.parse(await fs.readFile(owner,'utf8'));
        if(metadata.owner==='custom-usage'&&Date.now()-metadata.at>120000&&Number.isInteger(metadata.pid)&&metadata.pid>0) {
          try {process.kill(metadata.pid,0);}catch(dead) {if(dead.code==='ESRCH'){await fs.unlink(owner);await fs.rmdir(lock);continue;}}
        }
      }catch{}
      if(Date.now()-started>1500)throw new ClaudeRefreshError('busy');
      await new Promise(resolve=>setTimeout(resolve,75));
    }
  }
  try {await fs.writeFile(owner,JSON.stringify({owner:'custom-usage',pid:process.pid,at:Date.now()}),{flag:'wx',mode:0o600});}
  catch {await fs.rmdir(lock).catch(()=>{});throw new ClaudeRefreshError('storage');}
  return async()=>{await fs.unlink(owner).catch(()=>{});await fs.rmdir(lock).catch(()=>{});};
}
async function renewSwitcher(candidate,options={}) {
  const run=options.refreshSwitcher??((email,force)=>new Promise((resolve,reject)=>execFile(process.execPath,[candidate.helper,'refresh',email,...(force?['--force']:[])],
    // The helper can wait 45s for its lock and 30s for OAuth. Do not kill
    // a valid shared rotation merely to meet the old collector's 25s budget.
    // A refused rotation exits non-zero but still prints its JSON answer.
    {timeout:90000,maxBuffer:8192,windowsHide:true},(error,stdout)=>{
      let answer;try{answer=JSON.parse(String(stdout).trim().split(/\r?\n/).at(-1));}catch{}
      if(answer&&typeof answer==='object')return resolve(answer);
      reject(new ClaudeRefreshError(error?'storage':'response'));
    })));
  let answer;try{answer=await run(candidate.managedEmail,Boolean(options.force));}catch(e){throw e instanceof ClaudeRefreshError?e:new ClaudeRefreshError('storage');}
  // A transient failure (token endpoint unreachable) is not a dead login.
  if(!['refreshed','not-due','waited'].includes(answer?.state))throw new ClaudeRefreshError(answer?.state==='busy'?'busy':answer?.transient?'network':'rejected');
  const raw=await (options.readJson??readJson)(candidate.file),oauth=raw?.credentials?.claudeAiOauth;
  if(raw?.email?.toLowerCase()!==candidate.managedEmail.toLowerCase()||raw?.oauthAccount?.accountUuid!==candidate.accountId||raw?.oauthAccount?.organizationUuid!==candidate.organizationId||!oauth?.accessToken)throw new ClaudeRefreshError('changed');
  return {...candidate,token:oauth.accessToken,refreshToken:oauth.refreshToken,expires:stamp(oauth.expiresAt),plan:text(oauth.subscriptionType)};
}
async function renewClaude(candidate,options={}) {
  if(candidate.provider==='claude'&&candidate.harness==='account-switcher')return renewSwitcher(candidate,options);
  if(candidate.provider!=='claude'||!['claude','pi','opencode'].includes(candidate.harness)||candidate.file==='macOS-keychain')throw new ClaudeRefreshError('unsupported');
  const now=options.now??Date.now(),get=options.requestJson??requestJson;
  const fresh=c=>typeof c.token==='string'&&c.token&&c.token!==candidate.token&&(c.expires===undefined||c.expires>now);
  let release,temporary,handle;
  try {
    release=await refreshLock(candidate.file);
    const stat=await fs.lstat(candidate.file);
    if(!stat.isFile()||stat.isSymbolicLink()||stat.nlink!==1||stat.size>1024*1024||
      (process.getuid&&stat.uid!==process.getuid()))throw new ClaudeRefreshError('storage');
    await fs.access(candidate.file,require('node:fs').constants.W_OK);
    let snapshot=await fs.readFile(candidate.file,'utf8'),raw=JSON.parse(snapshot),current=storedClaude(candidate,raw);
    if(fresh(current))return current; // A CLI/another collector already renewed it.
    if(typeof current.refreshToken!=='string'||!current.refreshToken)throw new ClaudeRefreshError('missing');
    temporary=candidate.file+`.custom-${process.pid}-${crypto.randomUUID()}.tmp`;
    handle=await fs.open(temporary,'wx',stat.mode&0o600);
    await (options.preserveAcl??preserveCredentialAcl)(candidate.file,temporary);
    let response;
    try {response=await get(ENDPOINTS.claudeToken,{Accept:'application/json'},{method:'POST',body:{grant_type:'refresh_token',client_id:CLAUDE_CLIENT_ID,refresh_token:current.refreshToken}});}
    catch {throw new ClaudeRefreshError('network');}
    if(response.status!==200) {
      const updated=storedClaude(candidate,JSON.parse(await fs.readFile(candidate.file,'utf8')));
      if(fresh(updated))return updated;
      throw new ClaudeRefreshError([400,401,403].includes(response.status)?'rejected':'network');
    }
    const data=response.body,seconds=number(data?.expires_in);
    if(typeof data?.access_token!=='string'||!data.access_token||!seconds||seconds<0||seconds>31536000||
      (data.refresh_token!==undefined&&(typeof data.refresh_token!=='string'||!data.refresh_token)))throw new ClaudeRefreshError('response');
    // Preserve unrelated provider/settings changes; never replace another login.
    const latest=await fs.readFile(candidate.file,'utf8');
    if(latest!==snapshot) {
      const updated=storedClaude(candidate,JSON.parse(latest));
      if(fresh(updated))return updated;
      if(updated.token!==current.token||updated.refreshToken!==current.refreshToken)throw new ClaudeRefreshError('changed');
      snapshot=latest;raw=JSON.parse(latest);
    }
    const native=candidate.harness==='claude',key=native?'claudeAiOauth':'anthropic';
    raw[key]={...raw[key],...(native?{accessToken:data.access_token,refreshToken:data.refresh_token??current.refreshToken,expiresAt:now+seconds*1000}:
      {access:data.access_token,refresh:data.refresh_token??current.refreshToken,expires:now+seconds*1000})};
    await handle.writeFile(JSON.stringify(raw,null,2)+'\n','utf8');await handle.sync();await handle.close();handle=null;
    if(await fs.readFile(candidate.file,'utf8')!==snapshot) {
      const updated=storedClaude(candidate,JSON.parse(await fs.readFile(candidate.file,'utf8')));
      if(fresh(updated))return updated;
      throw new ClaudeRefreshError('changed');
    }
    await fs.rename(temporary,candidate.file);temporary=null;
    return storedClaude(candidate,raw);
  }catch(e) {throw e instanceof ClaudeRefreshError?e:new ClaudeRefreshError('storage');}
  finally {if(handle)await handle.close().catch(()=>{});if(temporary)await fs.unlink(temporary).catch(()=>{});if(release)await release();}
}
const tone = used => used===undefined?'default':used>=90?'danger':used>=75?'warning':'ok';
function window(id,label,used,resets,summary=false,shortLabel) {
  const value=number(used);return {id,label,shortLabel,summary,usedPct:value,remainingPct:value===undefined?undefined:100-value,resetsAt:iso(resets),tone:tone(value)};
}
function duration(seconds,slot) {
  const n=number(seconds);return n===604800?{id:'weekly',label:'Weekly',shortLabel:'wk'}:n===18000?{id:'session',label:'Session',shortLabel:'5h'}:n?{id:`window_${n}`,label:n%86400===0?`${n/86400}-day limit`:n%3600===0?`${n/3600}-hour limit`:`${n}-second limit`,shortLabel:''}:{id:`unknown_${slot}`,label:slot==='primary'?'Primary limit':'Secondary limit',shortLabel:''};
}
function codexReport(body) {
  if(!body||typeof body!=='object'||Array.isArray(body))return {status:'error',error:'Codex returned an unsupported usage response.'};
  const windows=[];
  const add=(limit,prefix='',label='',summary=false)=>{
    for(const [key,slot] of [['primary_window','primary'],['secondary_window','secondary']]) {const w=limit?.[key];if(!w)continue;const period=duration(w.limit_window_seconds,slot);windows.push(window(prefix+period.id,label?`${label} · ${period.label}`:period.label,w.used_percent,number(w.reset_at)===undefined?undefined:Number(w.reset_at)*1000,summary,period.shortLabel));}
  };
  add(body.rate_limit,'','',true);
  for(const limit of Array.isArray(body.additional_rate_limits)?body.additional_rate_limits:[]) {const name=text(limit.metered_feature??limit.limit_name);if(name)add(limit.rate_limit,`scope:${name}:`,text(limit.limit_name)??name);}
  add(body.code_review_rate_limit,'review:','Code review');
  const balance=number(body.credits?.balance);
  const count=value=>Number.isSafeInteger(value)&&value>=0?value:undefined;
  const available=count(body.rate_limit_reset_credits?.available_count),applicable=count(body.rate_limit_reset_credits?.applicable_available_count);
  const resetCredits=available===undefined&&applicable===undefined?undefined:{available,applicable};
  return {status:'available',planLabel:text(body.plan_type),windows,balances:balance===undefined?[]:[{id:'credits',label:'Credits',remaining:balance,unit:'credits'}],resetCredits,details:[]};
}
function claudeReport(body,plan) {
  if(!body||typeof body!=='object'||Array.isArray(body))return {status:'error',error:'Claude returned an unsupported usage response.'};
  const windows=[];
  for(const [field,id,label,shortLabel] of [['five_hour','session','Session','5h'],['seven_day','weekly','Weekly','wk']]) {const w=body[field];if(w)windows.push(window(id,label,w.utilization,w.resets_at,true,shortLabel));}
  const scoped=new Map();
  for(const [key,label] of [['seven_day_opus','Opus'],['seven_day_omelette','Omelette']]) {const w=body[key];if(w)scoped.set(`model:${label.toLowerCase()}`,window(`model:${label.toLowerCase()}`,`${label} · Weekly`,w.utilization,w.resets_at));}
  for(const limit of Array.isArray(body.limits)?body.limits:[]) {
    if(limit.kind!=='weekly_scoped')continue;
    for(const dimension of ['model','surface']) {const scope=limit.scope?.[dimension],name=text(scope?.display_name??scope?.id);if(!name)continue;
      const id=`${dimension}:${String(scope.id??name).toLowerCase()}`,previous=scoped.get(id);
      scoped.set(id,window(id,`${name} · Weekly`,number(limit.percent)??previous?.usedPct,limit.resets_at??previous?.resetsAt));}
  }
  windows.push(...scoped.values());
  const details=typeof body.extra_usage?.is_enabled==='boolean'?[{id:'extra',label:'Extra usage',value:body.extra_usage.is_enabled?'Enabled':'Disabled'}]:[];
  const resets=claudeResets(body.cedar_ember);
  return {status:'available',planLabel:text(plan),windows,balances:[],details,...(resets?{claudeResets:resets}:{})};
}
// These tokens are Claude Code's; its usage read is the one that reports limit resets.
const CLAUDE_USER_AGENT='claude-cli/2.1.328 (external, cli)';
// Limit resets the account holds (read only; claiming one is a separate request never made
// here). Grouped like claude.ai: a full reset, model resets by model. Null when ineligible.
function claudeResets(value) {
  if(!value||typeof value!=='object'||value.eligible!==true||!Array.isArray(value.grants))return null;
  const groups=new Map(),stamp=value=>{const at=Date.parse(value);return Number.isFinite(at)?new Date(at).toISOString():null;};
  for(const g of value.grants.slice(0,32)) {
    const left=number(g?.resets_left);if(!left||left<1||g.paused===true||!RESET_ID.test(g.id??''))continue;
    const clears=Array.isArray(g.clears)?g.clears:[],label=text(g.label,200)??'';
    const model=/\bfable\b/i.test(label)?'Fable':null;
    const name=clears.includes('seven_day')&&!g.gives_back_weekly?'Full reset':model?`${model} reset`:'Limit reset';
    const ends=stamp(g.ends_at),group=groups.get(name)??{name,left:0,endsAt:null,grantId:null,usable:false,needsLimit:false,cooldownUntil:null,reason:null};
    group.left+=left;
    if(ends&&(group.endsAt===null||ends<group.endsAt))group.endsAt=ends;
    // The button claims the grant that expires first among those usable now (as claude.ai does).
    const usable=g.usable_now===true&&!(Array.isArray(g.blocking)&&g.blocking.length);
    const better=!group.grantId||(usable&&!group.usable)||(usable===group.usable&&ends&&(!group.grantEnds||ends<group.grantEnds));
    if(better)Object.assign(group,{grantId:g.id,grantEnds:ends,usable,needsLimit:g.use_requires_limit===true,
      cooldownUntil:stamp(g.cooldown_until??value.cooldown_until),reason:text(g.unavailable_reason,80)??null});
    groups.set(name,group);
  }
  const list=[...groups.values()].map(({grantEnds,...g})=>g);
  return {available:list.reduce((n,g)=>n+g.left,0),groups:list};
}
function copilotReport(body) {
  if(!body||typeof body!=='object'||Array.isArray(body))return {status:'error',error:'Copilot returned an unsupported usage response.'};
  const windows=[],balances=[],details=[];
  for(const [key,quota] of Object.entries(body.quota_snapshots??{})) {
    if(!quota||typeof quota!=='object')continue;
    const creditBilling=quota.token_based_billing===true||body.token_based_billing===true;
    const label=key==='premium_interactions'&&creditBilling?'AI credits':{premium_interactions:'Premium requests',ai_credits:'AI credits',chat:'Chat',completions:'Completions'}[key]??key.replace(/_/g,' ');
    const usedCredits=number(quota.credits_used);
    if(creditBilling&&key==='premium_interactions'&&usedCredits!==undefined) balances.push({id:'ai_credits_used',label:'AI credits',used:usedCredits,unit:'credits'});
    if(quota.unlimited===true)continue;
    const remaining=number(quota.remaining),limit=number(quota.entitlement),reported=number(quota.percent_remaining);
    const left=reported??(remaining!==undefined&&limit>0?remaining/limit*100:undefined);
    const w=window(`monthly:${key}`,label,left===undefined?undefined:100-left,body.quota_reset_date,true,'mo');
    if(/^\d{4}-\d{2}-\d{2}$/.test(body.quota_reset_date??''))w.resetsAt=body.quota_reset_date;
    windows.push(w);
    if(remaining!==undefined)balances.push({id:key,label,remaining,limit,unit:key.includes('credit')?'credits':'requests'});
  }
  return {status:'available',planLabel:text(body.copilot_plan),resetsAt:text(body.quota_reset_date),windows,balances,details};
}
async function copilotAccount(candidate,body,get) {
  let login=text(candidate.accountId)??text(body?.login);
  // The user chose the GitHub username, not additional email permission.
  // Only resolve /user when an environment token has no known CLI account.
  if(!login)try {
    const profile=await get(ENDPOINTS.githubUser,{Authorization:`token ${candidate.token}`,Accept:'application/vnd.github+json','User-Agent':'herdr-customizations','X-GitHub-Api-Version':'2022-11-28'});
    if(profile.status===200)login=text(profile.body?.login);
  }catch{} // Optional identity lookup must not hide successful quotas.
  return {label:login??candidate.email,login};
}
function copilotPremiumReport(body) {
  const items=body?.usageItems??body?.usage_items;if(!Array.isArray(items))return null;
  const quantity=value=>typeof value==='boolean'||value===null||value===undefined||value===''?undefined:number(value);
  const models=new Map();
  for(const item of items) {
    if(!item||typeof item!=='object')return null;
    if(item.product&&!/copilot/i.test(item.product))continue;
    const unit=item.unitType??item.unit_type;if(unit&&!/request/i.test(unit))continue;
    const gross=quantity(item.grossQuantity??item.gross_quantity);if(gross===undefined||gross<0)return null;
    const model=text(item.model,100)?.trim()||'Other models',included=quantity(item.discountQuantity??item.discount_quantity),billed=quantity(item.netQuantity??item.net_quantity);
    const row=models.get(model)??{model,used:0,discounted:0,billed:0};row.used+=gross;if(!Number.isFinite(row.used))return null;
    row.discounted=row.discounted!==undefined&&included!==undefined&&included>=0?row.discounted+included:undefined;
    row.billed=row.billed!==undefined&&billed!==undefined&&billed>=0?row.billed+billed:undefined;models.set(model,row);
  }
  const byModel=[...models.values()].sort((a,b)=>b.used-a.used||a.model.localeCompare(b.model));
  const used=byModel.reduce((sum,row)=>sum+row.used,0);
  return Number.isFinite(used)?{used,byModel}:null; // No guessed cap or percentage.
}
async function copilotPremium(candidate,account,get,now) {
  const url=copilotBillingUrl(account.login??candidate.accountId,now);if(!url)return null;
  try {
    const response=await get(url,{Authorization:`Bearer ${candidate.token}`,Accept:'application/vnd.github+json','User-Agent':'herdr-customizations','X-GitHub-Api-Version':'2022-11-28'});
    return response.status===200?copilotPremiumReport(response.body):null;
  }catch{return null;}
}
const RATE_LIMITED='Usage requests are rate limited. Try again later.';
function unavailable(candidate,kind,extra={}) {return {status:'unavailable',problem:{kind,refreshedBy:candidate.harness,...extra}};}
async function collect(request={},options={}) {
  // The host allows 120s: leave cleanup time after a coordinated rotation
  // (45s account-lock wait + 30s OAuth). Ordinary quota requests still cap at 7s.
  const now=options.now??Date.now(),deadline=Date.now()+105000,transport=options.requestJson??requestJson;
  const get=(url,headers,request={})=>{
    const remaining=deadline-Date.now();if(remaining<=0)return Promise.reject(Error('Usage deadline exceeded'));
    return transport(url,headers,{...request,timeout:Math.min(7000,remaining)});
  };
  const refreshOptions={...options,requestJson:get},candidates=await discover(options);
  const groups=new Map();
  for(const c of candidates) {const identity=`${c.provider}:${c.accountId??c.email??c.file}${c.organizationId?':'+c.organizationId:''}`;if(!groups.has(identity))groups.set(identity,[]);groups.get(identity).push(c);}
  const reports=await Promise.all([...groups].map(async([identity,logins])=>{
    const first=logins[0],id=`${first.provider}:${hash(identity)}`;
    if(request.sourceId?first.provider!==request.sourceId:request.reportId&&request.reportId!==id)return null;
    const previousId=first.provider==='claude'&&first.accountId&&first.organizationId?`claude:${hash(`claude:${first.accountId}`)}`:undefined;
    const entry={id,previousId,sourceId:first.provider,sourceLabel:{claude:'Claude',codex:'Codex',copilot:'Copilot'}[first.provider],account:{label:first.email,email:first.provider==='claude'?first.email:undefined,id:first.accountId,organizationId:first.organizationId},fetchedAt:new Date(now).toISOString()};
    // The UI names accounts not to ask about now: one still inside a provider's
    // Retry-After window, or one another machine reported moments ago.
    const held=number(request.hold?.[id]);
    if(held!==undefined&&held>now)return {...entry,report:{status:'error',error:RATE_LIMITED,retryAt:Math.min(now+3600000,held)}};
    if(Array.isArray(request.reuse)&&request.reuse.includes(id))return {...entry,report:{status:'reused'}};
    const failures=[];
    for(const login of logins) {
      let c=login,renewed=false,report;
      if(c.noQuota)report=unavailable(c,'no_quota',{detail:c.detail??'This CLI login has no OAuth subscription credentials. API-key billing quotas are not available here.'});
      else if(c.expires!==undefined&&c.expires<=now&&(c.provider!=='claude'||!c.refreshToken))report=unavailable(c,'expired',{expiresAt:new Date(c.expires).toISOString()});
      else try {
        if(c.provider==='claude'&&c.expires!==undefined&&c.expires<=now){c=await renewClaude(c,refreshOptions);renewed=true;}
        const fetchUsage=()=>get(ENDPOINTS[c.provider],{Authorization:`${c.provider==='copilot'?'token':'Bearer'} ${c.token}`,Accept:'application/json',...(c.provider==='claude'?{'anthropic-beta':'oauth-2025-04-20','User-Agent':CLAUDE_USER_AGENT}:c.provider==='copilot'?{'User-Agent':'GitHubCopilotChat/0.26.7','Editor-Version':'vscode/1.96.2','Editor-Plugin-Version':'copilot-chat/0.26.7','X-Github-Api-Version':'2025-04-01'}:{'User-Agent':'Mozilla/5.0',...(c.accountId?{'ChatGPT-Account-Id':c.accountId}:{})})});
        let result=await fetchUsage();
        // A refusal the provider marks permanent (e.g. OAuth disabled for the organization)
        // is not a stale login: renewing would spend a single-use refresh token for nothing.
        const blocked=()=>{const code=text(result.body?.error?.details?.error_code,80);return code&&PROVIDER_BLOCKS.has(code)?code:null;};
        if(c.provider==='claude'&&[401,403].includes(result.status)&&c.refreshToken&&!renewed&&!blocked()){c=await renewClaude(c,{...refreshOptions,force:true});renewed=true;result=await fetchUsage();}
        if(result.status===401||result.status===403)report=unavailable(c,'rejected',{status:result.status,refreshAttempted:renewed,...(blocked()?{code:blocked()}:{})});
        else if(result.status===429) {const n=number(result.retryAfter),at=n===undefined?Date.parse(result.retryAfter):now+n*1000;report={status:'error',error:RATE_LIMITED,retryAt:Number.isFinite(at)?Math.min(now+3600000,Math.max(now+5000,at)):now+60000};}
        else if(result.status!==200)report={status:'error',error:`${entry.sourceLabel} usage API returned HTTP ${result.status}.`};
        else {
          report=c.provider==='claude'?claudeReport(result.body,c.plan):c.provider==='copilot'?copilotReport(result.body):codexReport(result.body);
          if(report.status==='available') {
            const account=c.provider==='copilot'?await copilotAccount(c,result.body,get):{...entry.account,label:text(result.body?.email)??c.email};
            if(c.provider==='copilot'){const premium=await copilotPremium(c,account,get,now);if(premium?.byModel.length)report.premiumUsage=premium;}
            if(c.provider==='codex'&&report.resetCredits?.available>0){const list=await codexResetList(c,get);if(list)report.codexResets=list;}
            return {...entry,account,report};
          }
        }
      } catch(e) {report=e instanceof ClaudeRefreshError?unavailable(c,'refresh_failed',{reason:e.reason}):{status:'error',error:`${entry.sourceLabel} usage service could not be reached. Try again later.`};}
      failures.push({harness:c.harness,report});
    }
    return {...entry,report:failures[0]?.report??{status:'error',error:'No usage login is available.'},loginErrors:failures};
  }));
  return {reports:reports.filter(Boolean)};
}
// A Claude login whose refresh token the server refused: sign in again in the
// browser. The account-switcher helper runs `claude auth login` in a throwaway
// config and saves the new tokens; no token passes through this process.
const LOGIN_TIMEOUT=310000;
async function login(request={},options={}) {
  const home=options.home??os.homedir(),helper=path.join(home,'.claude/plugins-local/account-switcher/bin/session-dir.js');
  const email=text(request.email,320),valid=email&&/^[^\s@]+@[^\s@]+$/.test(email)?email:undefined;
  try{await fs.access(helper);}catch{return {error:'Sign in again with the Claude CLI on this machine.'};}
  const run=options.runLogin??(args=>new Promise(resolve=>execFile(process.execPath,args,{timeout:LOGIN_TIMEOUT,maxBuffer:8192,windowsHide:true},
    (_error,stdout)=>{try{resolve(JSON.parse(String(stdout).trim().split(/\r?\n/).at(-1)));}catch{resolve(null);}})));
  const answer=await run([helper,'login',...(valid?[valid]:[])]);
  if(answer?.state!=='logged-in')return {error:text(answer?.error,200)??'Sign-in did not finish.'};
  return {login:{email:text(answer.email,320),...(answer.requested?{requested:text(answer.requested,320)}:{})}};
}
// Claim one Claude limit reset for exactly one account (its id and organization, as the
// card showed them). request_id makes a retry of the same click idempotent server side.
const RESET_RESULTS=['reset','already_used','not_limited','cooldown','ineligible','unavailable'];
async function claudeReset(request={},options={}) {
  const accountId=text(request.accountId,80),organizationId=text(request.organizationId,80),grantId=text(request.grantId,64),requestId=text(request.requestId,64);
  if(!accountId||!ORGANIZATION.test(organizationId??'')||!RESET_ID.test(grantId??'')||!REQUEST_ID.test(requestId??''))return {error:'Invalid reset request.'};
  const now=options.now??Date.now(),get=options.requestJson??requestJson;
  const logins=(await discover(options)).filter(c=>c.provider==='claude'&&c.accountId===accountId&&c.organizationId===organizationId&&c.token);
  // Prefer the saved account (its helper owns token rotation), then any other login of it.
  logins.sort((a,b)=>(b.harness==='account-switcher')-(a.harness==='account-switcher'));
  let c=logins[0];
  if(!c)return {error:'This Claude account is not signed in on this machine.'};
  try{if(c.expires!==undefined&&c.expires<=now+60000)c=await renewClaude(c,options);}
  catch{return {error:'Login required. Sign in again, then reset.'};}
  let response;
  try{response=await get(`https://api.anthropic.com/api/organizations/${organizationId.toLowerCase()}/reset_rate_limits`,
    {Authorization:`Bearer ${c.token}`,Accept:'application/json','anthropic-beta':'oauth-2025-04-20','User-Agent':CLAUDE_USER_AGENT},
    {method:'POST',body:{program:'cedar_ember',grant_id:grantId,request_id:requestId},timeout:25000});}
  catch{return {error:'Claude could not be reached. Nothing was reset.'};}
  if(response.status===429)return {result:'rate_limited'};
  if(response.status===401||response.status===403)return {error:'Login required. Sign in again, then reset.'};
  if(response.status!==200)return {error:`Claude answered HTTP ${response.status}. Nothing was reset.`};
  const body=response.body??{},result=RESET_RESULTS.includes(body.result)?body.result:'unavailable';
  return {result,resetsLeft:number(body.resets_left)??null,cleared:Array.isArray(body.cleared)?body.cleared.map(x=>text(x,40)).filter(Boolean):[]};
}
// Codex's limit resets, one line per credit (as chatgpt.com lists them). Null on any doubt.
const codexHeaders=c=>({Authorization:`Bearer ${c.token}`,Accept:'application/json','User-Agent':'Mozilla/5.0',...(c.accountId?{'ChatGPT-Account-Id':c.accountId}:{})});
async function codexResetList(c,get) {
  let response;try{response=await get(ENDPOINTS.codexResets,codexHeaders(c));}catch{return null;}
  if(response.status!==200||!Array.isArray(response.body?.credits))return null;
  const groups=[];
  for(const credit of response.body.credits.slice(0,32)) {
    if(!CREDIT_ID.test(credit?.id??'')||credit.status!=='available')continue;
    const ends=Date.parse(credit.expires_at);
    groups.push({name:text(credit.title,40)??'Reset',left:1,endsAt:Number.isFinite(ends)?new Date(ends).toISOString():null,grantId:credit.id,
      usable:credit.is_supported_by_plan!==false,needsLimit:false,cooldownUntil:null,reason:credit.is_supported_by_plan===false?'plan':null});
  }
  groups.sort((a,b)=>(a.endsAt??'9')<(b.endsAt??'9')?-1:1);
  return groups.length?{available:groups.length,groups}:null;
}
// Use one Codex reset for exactly one account, as Codex does (redeem_request_id: one click).
async function codexReset(request={},options={}) {
  const accountId=text(request.accountId,80),creditId=text(request.grantId,100),requestId=text(request.requestId,64);
  if(!accountId||!CREDIT_ID.test(creditId??'')||!REQUEST_ID.test(requestId??''))return {error:'Invalid reset request.'};
  const now=options.now??Date.now(),get=options.requestJson??requestJson;
  const c=(await discover(options)).find(x=>x.provider==='codex'&&x.accountId===accountId&&x.token);
  if(!c)return {error:'This Codex account is not signed in on this machine.'};
  if(c.expires!==undefined&&c.expires<=now)return {error:'Login required. Sign in to Codex again, then reset.'};
  let response;
  try{response=await get(CODEX_CONSUME,{...codexHeaders(c),'Content-Type':'application/json','x-openai-codex-luna-reserve':'1'},
    {method:'POST',body:{credit_id:creditId,redeem_request_id:requestId},timeout:25000});}
  catch{return {error:'Codex could not be reached. Nothing was reset.'};}
  if(response.status===429)return {result:'rate_limited'};
  if(response.status===401||response.status===403)return {error:'Login required. Sign in to Codex again, then reset.'};
  if(response.status===409)return {result:'already_used'};
  if(response.status<200||response.status>=300){const why=text(response.body?.detail??response.body?.error?.message??response.body?.message,160);return {error:why?`Codex: ${why}`:`Codex answered HTTP ${response.status}. Nothing was reset.`};}
  return {result:'reset'};
}
module.exports={codexReset,codexResetList,claudeReset,login,discover,discoverExecutables,collect,codexReport,claudeReport,copilotReport,duration,ENDPOINTS,requestJson,renewClaude,CLAUDE_CLIENT_ID,copilotBillingUrl,isBillingUrl,copilotPremiumReport};
if(require.main===module || process.argv[1]?.startsWith('{')) {
  let request={};try{request=JSON.parse(process.argv.at(-1));}catch{}
  (request.action==='executables'?discoverExecutables().then(executables=>({executables})):request.action==='login'?login(request):request.action==='claude-reset'?claudeReset(request):request.action==='codex-reset'?codexReset(request):collect(request)).then(value=>console.log(JSON.stringify(value))).catch(()=>console.log(JSON.stringify({error:'Usage collection failed. Check that the CLI login stores are readable.'})));
}
