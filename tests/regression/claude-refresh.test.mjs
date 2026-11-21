import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import {createRequire} from 'node:module';
const api=createRequire(import.meta.url)('../mods/custom-usage/bridge.cjs');
const now=Date.parse('2030-01-01T00:00:00Z');
const root=await fs.mkdtemp(path.join(os.tmpdir(),'claude-refresh-test-'));
let count=0;
async function fixture({harness='claude',expires=now-1}={}) {
  const home=path.join(root,String(++count)),file=path.join(home,harness==='claude'?'.claude/.credentials.json':harness==='pi'?'.pi/agent/auth.json':'.local/share/opencode/auth.json');
  await fs.mkdir(path.dirname(file),{recursive:true});
  const auth=harness==='claude'?{accessToken:'old-access-secret',refreshToken:'old-refresh-secret',expiresAt:expires,subscriptionType:'team',scopes:['user:profile'],extra:'keep'}:{type:'oauth',access:'old-access-secret',refresh:'old-refresh-secret',expires,extra:'keep'};
  const raw=harness==='claude'?{claudeAiOauth:auth,unrelated:{keep:true}}:{anthropic:auth,unrelated:{keep:true}};
  await fs.writeFile(file,JSON.stringify(raw),{mode:0o600});
  const options={home,env:{},platform:process.platform,now,preserveAcl:async()=>{}};
  const candidate=(await api.discover(options)).find(c=>c.provider==='claude');
  return {home,file,raw,options,candidate,read:async()=>JSON.parse(await fs.readFile(file,'utf8')),write:async value=>fs.writeFile(file,JSON.stringify(value))};
}
const tokenReply={status:200,body:{access_token:'new-access-secret',refresh_token:'new-refresh-secret',expires_in:28800}};
function mock(requests,{first=200,second=200,refresh=tokenReply,onToken}={}) {
  let gets=0;
  return async(url,headers,request)=>{
    requests.push({url,headers,request});
    if(url===api.ENDPOINTS.claudeToken){assert.equal(request.method,'POST');assert.equal(request.body.grant_type,'refresh_token');assert.equal(request.body.client_id,api.CLAUDE_CLIENT_ID);await onToken?.();return refresh;}
    assert.equal(url,api.ENDPOINTS.claude);assert.equal(headers['anthropic-beta'],'oauth-2025-04-20');
    const status=++gets===1?first:second;
    return {status,body:status===200?{five_hour:{utilization:23}}:{access_token:'never-return-provider-body-secret'}};
  };
}
const report=result=>result.reports.find(e=>e.sourceId==='claude').report;
const safe=result=>assert.doesNotMatch(JSON.stringify(result),/old-access-secret|new-access-secret|old-refresh-secret|new-refresh-secret|never-return-provider-body-secret/);
try {
  for(const harness of ['claude','pi','opencode']) {
    const f=await fixture({harness}),requests=[];
    const result=await api.collect({}, {...f.options,requestJson:mock(requests)});safe(result);
    assert.equal(report(result).status,'available');assert.equal(requests.length,2);assert.equal(requests[0].url,api.ENDPOINTS.claudeToken);assert.equal(requests[1].headers.Authorization,'Bearer new-access-secret');
    const saved=await f.read(),auth=saved[harness==='claude'?'claudeAiOauth':'anthropic'];
    assert.deepEqual(saved.unrelated,{keep:true});assert.equal(auth.extra,'keep');assert.equal(auth[harness==='claude'?'refreshToken':'refresh'],'new-refresh-secret');assert.equal(auth[harness==='claude'?'expiresAt':'expires'],now+28800000);
    if(harness==='claude'){assert.equal(auth.subscriptionType,'team');assert.deepEqual(auth.scopes,['user:profile']);}
    assert.deepEqual((await fs.readdir(path.dirname(f.file))).sort(),[path.basename(f.file)]);
    const later=[];const pickedUp=await api.collect({}, {...f.options,requestJson:mock(later)});safe(pickedUp);assert.equal(report(pickedUp).status,'available');assert.equal(later.length,1,'Later checks reuse the persisted token without another refresh');assert.equal(later[0].headers.Authorization,'Bearer new-access-secret');
  }
  // A successful quota check never refreshes or rewrites a valid login.
  {
    const f=await fixture({expires:now+100000}),before=await fs.readFile(f.file,'utf8'),requests=[];
    const result=await api.collect({}, {...f.options,requestJson:mock(requests)});safe(result);assert.equal(report(result).status,'available');assert.equal(requests.length,1);assert.equal(await fs.readFile(f.file,'utf8'),before);
  }
  for(const status of [401,403]) {
    const f=await fixture({expires:now+100000}),requests=[];
    const result=await api.collect({}, {...f.options,requestJson:mock(requests,{first:status})});safe(result);assert.equal(report(result).status,'available');assert.deepEqual(requests.map(r=>r.url),[api.ENDPOINTS.claude,api.ENDPOINTS.claudeToken,api.ENDPOINTS.claude]);
  }
  // An organization that forbids OAuth is not a stale login: no refresh, and the code is kept.
  {
    const f=await fixture({expires:now+100000}),requests=[],before=await fs.readFile(f.file,'utf8');
    const blocked=async(url,headers,request)=>{requests.push({url});return {status:403,body:{type:'error',error:{type:'permission_error',message:'never-return-provider-body-secret',details:{error_visibility:'user_facing',error_code:'oauth_not_allowed_for_organization'}}}};};
    const result=await api.collect({}, {...f.options,requestJson:blocked});safe(result);
    assert.deepEqual(requests.map(r=>r.url),[api.ENDPOINTS.claude],'No refresh is spent on a provider block');assert.equal(await fs.readFile(f.file,'utf8'),before);
    assert.equal(report(result).problem.kind,'rejected');assert.equal(report(result).problem.code,'oauth_not_allowed_for_organization');assert.equal(report(result).problem.refreshAttempted,false);
  }
  // A still-rejected login cannot trigger a refresh loop.
  {
    const f=await fixture({expires:now+100000}),requests=[];
    const result=await api.collect({}, {...f.options,requestJson:mock(requests,{first:401,second:401})});safe(result);assert.equal(report(result).problem.kind,'rejected');assert.equal(report(result).problem.refreshAttempted,true);assert.equal(requests.length,3);
  }
  for(const status of [429,500]) {
    const f=await fixture({expires:now+100000}),requests=[];
    await api.collect({}, {...f.options,requestJson:mock(requests,{first:status})});assert.equal(requests.length,1,'Non-auth failures do not rotate credentials');
  }
  for(const refresh of [{status:400,body:{error:'old-refresh-secret'}},{status:200,body:{access_token:'new-access-secret',expires_in:-1}},{status:200,body:{access_token:'',expires_in:100}}]) {
    const f=await fixture(),before=await fs.readFile(f.file,'utf8'),requests=[];
    const result=await api.collect({}, {...f.options,requestJson:mock(requests,{refresh})});safe(result);assert.equal(report(result).problem.kind,'refresh_failed');assert.equal(await fs.readFile(f.file,'utf8'),before);assert.equal(requests.length,1);assert.deepEqual(await fs.readdir(path.dirname(f.file)),[path.basename(f.file)]);
  }
  {
    const f=await fixture(),before=await fs.readFile(f.file,'utf8');
    const result=await api.collect({}, {...f.options,requestJson:async()=>{throw Error('old-refresh-secret');}});safe(result);assert.equal(report(result).problem.reason,'network');assert.equal(await fs.readFile(f.file,'utf8'),before);
  }
  // Re-read the source: reuse an already-renewed token instead of refreshing twice.
  {
    const f=await fixture(),newer=structuredClone(f.raw);newer.claudeAiOauth.accessToken='another-cli-access';newer.claudeAiOauth.expiresAt=now+100000;await f.write(newer);
    const result=await api.renewClaude(f.candidate,{...f.options,requestJson:async()=>{throw Error('Should not request');}});assert.equal(result.token,'another-cli-access');
  }
  // Two collectors serialize on the same store; only the first rotates the token.
  {
    const f=await fixture();let requests=0;
    const options={...f.options,requestJson:async()=>{requests++;await new Promise(r=>setTimeout(r,100));return tokenReply;}};
    const both=await Promise.all([api.renewClaude(f.candidate,options),api.renewClaude(f.candidate,options)]);assert.equal(requests,1);assert.equal(both[0].token,both[1].token);
  }
  // Never overwrite a concurrent CLI login, including after an invalid_grant response.
  for(const refresh of [tokenReply,{status:400,body:{error:'invalid_grant'}}]) {
    const f=await fixture(),newer=structuredClone(f.raw);newer.claudeAiOauth.accessToken='another-cli-access';newer.claudeAiOauth.refreshToken='another-cli-refresh';newer.claudeAiOauth.expiresAt=now+100000;
    const requests=[],result=await api.renewClaude(f.candidate,{...f.options,requestJson:mock(requests,{refresh,onToken:()=>f.write(newer)})});assert.equal(result.token,'another-cli-access');assert.deepEqual(await f.read(),newer);
  }
  {
    const f=await fixture(),updated=structuredClone(f.raw);updated.unrelated.concurrent=true;
    const requests=[];await api.renewClaude(f.candidate,{...f.options,requestJson:mock(requests,{onToken:()=>f.write(updated)})});assert.equal((await f.read()).unrelated.concurrent,true);
  }
  {
    const f=await fixture();let requests=0;
    const result=await api.collect({}, {...f.options,preserveAcl:async()=>{throw Error('Denied');},requestJson:async()=>{requests++;return tokenReply;}});assert.equal(report(result).problem.kind,'refresh_failed');assert.equal(requests,0,'Storage must be safe before requesting token rotation');assert.deepEqual(await f.read(),f.raw);
  }
  // A real native ACL-preserving save, not just the injected test hook.
  {
    const f=await fixture(),requests=[];const {preserveAcl,...options}=f.options;
    await api.renewClaude(f.candidate,{...options,requestJson:mock(requests)});assert.equal((await f.read()).claudeAiOauth.accessToken,'new-access-secret');
    if(process.platform!=='win32')assert.equal((await fs.stat(f.file)).mode&0o777,0o600);
  }
  {
    const f=await fixture(),alias=f.file+'.alias';await fs.link(f.file,alias);let requests=0;
    await assert.rejects(api.renewClaude(f.candidate,{...f.options,requestJson:async()=>{requests++;return tokenReply;}}));assert.equal(requests,0);assert.deepEqual(await f.read(),f.raw);
  }
  await assert.rejects(api.requestJson(api.ENDPOINTS.claudeToken,{}),/Unapproved/);
  await assert.rejects(api.requestJson(api.ENDPOINTS.claudeToken,{}, {method:'POST',body:{grant_type:'authorization_code',client_id:api.CLAUDE_CLIENT_ID,refresh_token:'fixture'}}),/Unapproved/);
  await assert.rejects(api.requestJson(api.ENDPOINTS.claude,{}, {method:'POST',body:{}}),/Unapproved/);
  console.log('PASS: Claude expiry/auth-failure renewal, one retry, native/Pi/OpenCode stores, rotation, concurrency guards, ACL preservation and secret filtering');
} finally {await fs.rm(root,{recursive:true,force:true});}
