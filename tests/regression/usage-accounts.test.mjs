// Disposable login fixtures and mocked transport only. Never touches real logins.
import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import vm from 'node:vm';
import {createRequire} from 'node:module';
import {execFileSync} from 'node:child_process';
const api=createRequire(import.meta.url)('../mods/custom-usage/bridge.cjs');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'usage-accounts-'));
const now=Date.parse('2030-01-01T00:00:00Z');
const options={home:root,env:{},now,platform:'win32',preserveAcl:async()=>{}};
const put=async(file,value)=>{await fs.mkdir(path.dirname(file),{recursive:true});await fs.writeFile(file,JSON.stringify(value));};
const account=(email,id,org,expires=now+3600000)=>({email,oauthAccount:{accountUuid:id,organizationUuid:org,emailAddress:email},credentials:{claudeAiOauth:{accessToken:`secret-access-${id}`,refreshToken:`secret-refresh-${id}`,expiresAt:expires,subscriptionType:id==='one'?'max':'team'}},history:[`secret-old-${id}`]});
const dir=path.join(root,'.claude/account-switcher/accounts');
let one=account('one@example.test','one','org-one'),two=account('two@example.test','two','org-two');
const oneFile=path.join(dir,'one@example.test.json'),twoFile=path.join(dir,'two@example.test.json');
let network=[],rotations=[];
const transport=async(url,headers)=>{network.push({url,headers});assert.equal(url,api.ENDPOINTS.claude,'Managed accounts never call the token endpoint directly');return {status:200,body:{five_hour:{utilization:headers.Authorization.includes('one')?10:70}}};};
const safe=value=>assert.doesNotMatch(JSON.stringify(value),/secret-|credentials|refreshToken|history/);
try {
  await put(oneFile,one);await put(twoFile,two);
  // A stale shared profile must not mislabel a token known to the switcher.
  await put(path.join(root,'.claude/.credentials.json'),{claudeAiOauth:{...one.credentials.claudeAiOauth,accessToken:'old-access',refreshToken:'secret-old-one'}});
  await put(path.join(root,'.claude.json'),{oauthAccount:two.oauthAccount});
  await put(path.join(root,'.pi/agent/auth.json'),{anthropic:{type:'oauth',access:one.credentials.claudeAiOauth.accessToken,refresh:one.credentials.claudeAiOauth.refreshToken}});
  const discovered=await api.discover(options);assert.equal(discovered.length,2,'Shared and Pi copies of managed tokens are not independent refresh sources');
  assert.ok(discovered.every(c=>c.harness==='account-switcher'));
  const sharedFile=path.join(root,'.claude/.credentials.json'),sharedBefore=await fs.readFile(sharedFile,'utf8');
  await put(sharedFile,{claudeAiOauth:{accessToken:'unknown-new-token',refreshToken:'unknown-new-refresh',expiresAt:now-1}});
  assert.equal((await api.discover(options)).length,2,'A fresh CLI login naming a managed account cannot use an independent refresh lock');
  await fs.writeFile(sharedFile,sharedBefore);
  let result=await api.collect({}, {...options,requestJson:transport});safe(result);
  assert.equal(result.reports.length,2);assert.deepEqual(result.reports.map(e=>e.account.email).sort(),['one@example.test','two@example.test']);
  assert.equal(result.reports.find(e=>e.account.id==='one').report.windows[0].usedPct,10);
  const ids=result.reports.map(e=>e.id);
  await fs.rename(oneFile,path.join(dir,'renamed.json'));
  result=await api.collect({}, {...options,requestJson:transport});assert.deepEqual(result.reports.map(e=>e.id).sort(),ids.sort(),'Report identity is independent of filename and token rotation');
  await fs.rename(path.join(dir,'renamed.json'),oneFile);
  network=[];result=await api.collect({reportId:ids[0]}, {...options,requestJson:transport});assert.equal(network.length,1);assert.equal(result.reports.length,1,'Explicit report-id filtering remains account-scoped');
  const codexFile=path.join(root,'.codex/auth.json');await put(codexFile,{tokens:{access_token:'secret-unrelated-codex',account_id:'codex-unrelated'}});
  network=[];result=await api.collect({sourceId:'claude',refresh:true},{...options,requestJson:transport});safe(result);assert.equal(network.length,2);assert.deepEqual(result.reports.map(e=>e.id).sort(),ids.sort(),'Claude provider refresh includes both accounts and excludes other providers');
  network=[];result=await api.collect({sourceId:'claude',refresh:true,hold:{[ids[0]]:now+60000}},{...options,requestJson:transport});assert.equal(network.length,1,'Provider refresh still respects each account Retry-After');assert.equal(result.reports.find(e=>e.id===ids[0]).report.retryAt,now+60000);await fs.unlink(codexFile);
  // Separate organizations of the same Claude account keep separate quotas.
  const otherOrg={...one,oauthAccount:{...one.oauthAccount,organizationUuid:'other-org'}};
  await put(path.join(dir,'other-org.json'),otherOrg);
  result=await api.collect({}, {...options,requestJson:transport});assert.equal(result.reports.length,3);assert.equal(new Set(result.reports.map(e=>e.id)).size,3);
  await fs.unlink(path.join(dir,'other-org.json'));
  // Expired inactive accounts can renew via the switcher's lock/lineage helper.
  one={...one,credentials:{claudeAiOauth:{...one.credentials.claudeAiOauth,expiresAt:now-1}}};await put(oneFile,one);
  const refreshSwitcher=async(email,force)=>{rotations.push({email,force});one.history.push(one.credentials.claudeAiOauth.refreshToken);one.credentials.claudeAiOauth={...one.credentials.claudeAiOauth,accessToken:'secret-access-one-new',refreshToken:'secret-refresh-one-new',expiresAt:now+3600000};await put(oneFile,one);return {state:'refreshed'};};
  result=await api.collect({}, {...options,refreshSwitcher,requestJson:transport});safe(result);assert.deepEqual(rotations,[{email:'one@example.test',force:false}]);assert.ok(result.reports.every(e=>e.report.status==='available'));
  assert.equal((await fs.readFile(path.join(root,'.claude/.credentials.json'),'utf8')).includes('old-access'),true,'The collector itself never rewrites a session or shared login');
  // One rejected access token -> coordinated forced renewal -> one retry.
  let rejected=false;rotations=[];
  result=await api.collect({}, {...options,refreshSwitcher,requestJson:async(url,headers)=>{
    if(headers.Authorization.includes('one')&&!rejected){rejected=true;return {status:401};}return transport(url,headers);
  }});safe(result);assert.deepEqual(rotations,[{email:'one@example.test',force:true}]);
  for(const state of ['busy','failed']) {
    one.credentials.claudeAiOauth.expiresAt=now-1;await put(oneFile,one);network=[];
    result=await api.collect({}, {...options,refreshSwitcher:async()=>({state,error:'secret-server-error'}),requestJson:transport});safe(result);
    assert.equal(result.reports.find(e=>e.account.id==='one').report.problem.kind,'refresh_failed');assert.equal(network.length,1,'Only the other, healthy account is queried');
    assert.equal(result.reports.find(e=>e.account.id==='one').report.problem.reason,state==='busy'?'busy':'rejected');
  }
  one.credentials.claudeAiOauth.expiresAt=now-1;await put(oneFile,one);
  result=await api.collect({}, {...options,refreshSwitcher:async()=>({state:'failed',transient:true}),requestJson:transport});
  assert.equal(result.reports.find(e=>e.account.id==='one').report.problem.reason,'network','An unreachable token endpoint is not a dead login');
  // Sign-in goes through the helper only; its answer carries identities, never tokens.
  // Limit resets: grouped like claude.ai, paused/spent grants left out, ineligible accounts show none.
  let grantNo=0;
  const grant=(label,clears,ends,extra={})=>({id:`grant-${++grantNo}`,label,clears,resets_left:1,ends_at:ends,paused:false,gives_back_weekly:false,usable_now:true,...extra});
  const resets=api.claudeReport({five_hour:{utilization:1},cedar_ember:{eligible:true,grants:[
    grant('One full limit reset (November 2026)',['five_hour','seven_day'],'2026-12-10T22:00:00Z',{usable_now:false,use_requires_limit:true}),
    grant('New model launch: one Fable reset',['five_hour'],'2027-03-09T07:59:00Z',{gives_back_weekly:true}),
    grant('New model launch: one more Fable reset',['five_hour'],'2027-03-01T07:59:00Z',{gives_back_weekly:true}),
    grant('Paused',['five_hour'],'2027-01-01T00:00:00Z',{paused:true}),grant('Spent',['five_hour'],'2027-01-01T00:00:00Z',{resets_left:0})]}},'max').claudeResets;
  assert.equal(resets.groups[0].grants.length,1);assert.deepEqual(resets.groups[0].covers,['session','weekly']);
  assert.deepEqual(resets.groups[1].covers,[],'Model labels alone grant no automatic authority');
  assert.deepEqual({...resets,groups:resets.groups.map(({typeId,covers,grants,...group})=>group)},{available:3,groups:[
    {name:'Full reset',left:1,endsAt:'2026-12-10T22:00:00.000Z',grantId:'grant-1',usable:false,needsLimit:true,cooldownUntil:null,reason:null},
    {name:'Fable reset',left:2,endsAt:'2027-03-01T07:59:00.000Z',grantId:'grant-3',usable:true,needsLimit:false,cooldownUntil:null,reason:null}]},'The soonest-expiring usable grant is the one claimed');
  // Claiming: exactly the shown account, one fixed POST shape, answers mapped; no other writes.
  {
    const posts=[],org='12345678-1234-1234-1234-123456789abc';
    const reset=async(request,reply)=>api.claudeReset({accountId:'one',organizationId:org,grantId:'grant-3',requestId:'herdr-x1',...request},
      {...options,now:now-7200000,requestJson:async(url,headers,req)=>{posts.push({url,auth:headers.Authorization,ua:headers['User-Agent'],req});return reply;}});
    one.oauthAccount.organizationUuid=org;await put(oneFile,one);
    assert.deepEqual(await reset({},{status:200,body:{result:'reset',resets_left:1,cleared:['five_hour']}}),{result:'reset',resetsLeft:1,cleared:['five_hour']});
    assert.equal(posts[0].url,`https://api.anthropic.com/api/organizations/${org}/reset_rate_limits`);assert.match(posts[0].auth,/secret-access-one/);assert.match(posts[0].ua,/^claude-cli\//);
    assert.deepEqual(posts[0].req,{method:'POST',body:{program:'cedar_ember',grant_id:'grant-3',request_id:'herdr-x1'},timeout:25000});
    assert.deepEqual(await reset({},{status:200,body:{result:'weird'}}),{result:'unavailable',resetsLeft:null,cleared:[]});
    assert.match((await reset({},{status:401})).error,/Login required/);
    assert.equal((await reset({accountId:'nobody'},{status:200})).error,'This Claude account is not signed in on this machine.');
    for(const bad of [{grantId:'../x'},{organizationId:'org-one'},{requestId:'a b'}])assert.equal((await reset(bad,{status:200})).error,'Invalid reset request.');
    assert.equal(posts.length,3,'Invalid or unknown requests never reach the network');
    await assert.rejects(api.requestJson(`https://api.anthropic.com/api/organizations/${org}/reset_rate_limits`,{},{method:'POST',body:{program:'other',grant_id:'g',request_id:'r'}}),/Unapproved/);
    one.oauthAccount.organizationUuid='org-one';await put(oneFile,one);
  }
  assert.equal(api.claudeReport({five_hour:{utilization:1},cedar_ember:{eligible:false,grants:[]}},'team').claudeResets,undefined);
  assert.match(api.ENDPOINTS.claude,/\?cedar_ember=1$/);
  const helper=path.join(root,'.claude/plugins-local/account-switcher/bin/session-dir.js'),loginCalls=[];
  const runLogin=async args=>{loginCalls.push(args);return {state:'logged-in',email:'one@example.test',accessToken:'secret-access-x'};};
  assert.deepEqual(await api.login({email:'one@example.test'},{home:root,runLogin}),{error:'Sign in again with the Claude CLI on this machine.'},'No helper: no sign-in');
  await put(helper,{});
  assert.deepEqual(await api.login({email:'one@example.test'},{home:root,runLogin}),{login:{email:'one@example.test'}});
  assert.deepEqual(loginCalls,[[helper,'login','one@example.test']]);
  await api.login({email:'--force x'},{home:root,runLogin});assert.deepEqual(loginCalls.at(-1),[helper,'login'],'Only a plain email reaches the helper');
  assert.deepEqual(await api.login({},{home:root,runLogin:async()=>({state:'failed',error:'Sign-in was not finished in time'})}),{error:'Sign-in was not finished in time'});
  // The compressed worker must retain node -e CLI dispatch, not just require().
  const packed=await fs.readFile(new URL('../mods/custom-usage/bridge.cjs',import.meta.url),'utf8');
  const cli=JSON.parse(execFileSync(process.execPath,['--input-type=commonjs','-e',packed,'--',JSON.stringify({action:'executables'})],{encoding:'utf8',env:{...process.env,HOME:root,USERPROFILE:root,LOCALAPPDATA:root,PATH:''},windowsHide:true}));
  assert.equal(typeof cli.executables,'object');assert.equal(cli.error,undefined,'Executable discovery never reads credentials or starts agents');
  // Exercise the real child-process adapter against a disposable helper (no OAuth).
  {
    const candidate=(await api.discover(options)).find(c=>c.accountId==='one'),receipt=path.join(root,'helper-argv.json');
    await fs.mkdir(path.dirname(candidate.helper),{recursive:true});
    await fs.writeFile(candidate.helper,`const fs=require('node:fs');fs.writeFileSync(${JSON.stringify(receipt)},JSON.stringify(process.argv.slice(2)));console.log(JSON.stringify({state:'not-due'}));`);
    await api.renewClaude(candidate,options);assert.deepEqual(JSON.parse(await fs.readFile(receipt,'utf8')),['refresh','one@example.test']);
    await api.renewClaude(candidate,{...options,force:true});assert.deepEqual(JSON.parse(await fs.readFile(receipt,'utf8')),['refresh','one@example.test','--force'],'The usage helper never receives --into or a default/switch command');
  }
  // A concurrent account replacement cannot be returned as the requested account.
  const candidate=(await api.discover(options)).find(c=>c.accountId==='one');
  await assert.rejects(api.renewClaude(candidate,{...options,refreshSwitcher:async()=>{await put(oneFile,two);return {state:'refreshed'};}}));
  await put(oneFile,one);
  // Custom config profiles are read beside that config, not from shared home.
  const config=path.join(root,'isolated');await put(path.join(config,'.credentials.json'),{claudeAiOauth:{accessToken:'different-unmanaged',expiresAt:now+1}});await put(path.join(config,'.claude.json'),{oauthAccount:{accountUuid:'isolated',emailAddress:'isolated@example.test'}});
  const custom=await api.discover({...options,env:{CLAUDE_CONFIG_DIR:config}});assert.equal(custom.find(c=>c.accountId==='isolated').email,'isolated@example.test');
  // Malformed/mid-write files and temporary backups are ignored.
  await fs.writeFile(path.join(dir,'partial.json'),'{');await put(path.join(dir,'ignored.json.tmp'),two);
  assert.equal((await api.discover(options)).filter(c=>c.harness==='account-switcher').length,2);
  // Pure display selection + current-terminal metadata (no process or network).
  let focus={terminal:'t1'},terminals=[{address:'t1',program:{key:'claude'},labels:{'custom.claude.email':'two@example.test','custom.claude.account':'two','custom.claude.organization':'org-two','custom.claude.at':String(now),'custom.claude.state':'ok'}}];
  const values=new Map();const sandbox=vm.createContext({pluginIsEnabled:()=>true,focused:()=>focus,terminals:()=>terminals,shared:key=>values.get(key),setShared:(key,value)=>values.set(key,value),machineKey:m=>m==null?'local':`remote:${m}`});
  const displaySource=(await fs.readFile(new URL('../mods/custom-usage/claude-context.js',import.meta.url),'utf8'))+'\n'+(await fs.readFile(new URL('../mods/custom-usage/accounts.js',import.meta.url),'utf8'));
  const source=displaySource.replace(/^import .*;\r?\n/gm,'').replace(/^export \{[^\n]+\r?\n/gm,'').replace(/export /g,'');
  vm.runInContext(source+'\nglobalThis.api={claudeSelection,selectClaude,usageOpeningContext,claudeContext,claudeView};',sandbox);
  const display=sandbox.api;
  const reports=[{id:'a',sourceId:'claude',account:{id:'one',organizationId:'org-one',email:'one@example.test'}},{id:'b',sourceId:'claude',account:{id:'two',organizationId:'org-two',email:'two@example.test'}},{id:'c',sourceId:'codex'}];
  assert.equal(display.claudeSelection(null),'auto');const opening=display.usageOpeningContext();focus=null;
  let context=display.claudeContext(opening,null,now);assert.equal(context.email,'two@example.test','Opening context survives dialog focus');
  let shown=display.claudeView(reports,'auto',context);assert.equal(shown.chosen.id,'b');assert.equal(shown.reports.length,2,'Non-Claude providers stay visible');
  assert.equal(display.claudeView(reports,'a',context).chosen.id,'a','Manual selection does not follow another account');
  assert.equal(display.claudeView(reports,'all',context).reports.length,2,'Legacy all-accounts selections now show a single account');
  const organizations=[...reports,{...reports[1],id:'b-other',account:{...reports[1].account,organizationId:'other-org'}}];
  assert.equal(display.claudeView(organizations,'auto',{...context,organizationId:'missing-org'}).current,null,'A mismatched organization is never claimed as the current session' );
  assert.equal(display.claudeView(organizations,'auto',{email:context.email}).current,null,'Email-only session identity must be unambiguous' );
  assert.equal(display.claudeView(organizations,'auto',context).chosen.id,'b');
  display.selectClaude(null,'a');assert.equal(display.claudeSelection(null),'a');assert.equal(display.claudeSelection('pc2'),'auto','Machine preferences are isolated');
  for(const invalid of [display.claudeContext(opening,null,now+90001),display.claudeContext(opening,'pc2',now),{reason:'Unknown'},{}]) {
    shown=display.claudeView(reports,'auto',invalid,'b');assert.equal(shown.current,null);assert.equal(shown.chosen.id,'b');assert.equal(shown.reports.length,2,'Unknown context shows the remembered email without claiming it is the session account');
  }
  assert.equal(display.claudeView(reports,'removed',context).chosen.id,'a','Removed selections fall back to one saved account');
  assert.equal(display.claudeView([], 'auto', context).chosen,null);
  assert.equal(display.claudeView([reports[0]],'auto',{}).reports.length,1,'A single login stays a plain single-account view');
  terminals[0].labels['custom.claude.state']='switching';assert.match(display.claudeContext(opening,null,now).reason,/switching/);
  terminals[0].labels['custom.claude.state']='ok';terminals[0].labels['custom.claude.email']='one@example.test';terminals[0].labels['custom.claude.account']='one';terminals[0].labels['custom.claude.organization']='org-one';
  assert.equal(display.claudeView(reports,'auto',display.claudeContext(opening,null,now)).chosen.id,'a','Automatic follows live account switches in the captured session');
  terminals[0].program.key='shell';assert.match(display.claudeContext(opening,null,now).reason,/not Claude/);
  terminals=[{...terminals[0],address:'pc2/t1',program:{key:'claude'}}];assert.equal(display.claudeContext({address:'pc2/t1'},'pc2',now).email,'one@example.test');
  console.log('PASS: multi-account Claude discovery, safe coordinated refresh, deduplication, stable identities, current-session selection, stale metadata and machine isolation');
} finally {await fs.rm(root,{recursive:true,force:true});}
