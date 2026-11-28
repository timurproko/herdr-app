import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { createRequire } from 'node:module';
import { machineKey,prefs,percentage,summaryWindow,summaryWindows,windowKey,togglePin,resetLabel,resetInfo,fetchedInfo,problem,reportFresh,TTL,orderKey,orderReports } from '../mods/custom-usage/model.js';
const collector=createRequire(import.meta.url)('../mods/custom-usage/bridge.cjs');
assert.notEqual(machineKey(null),machineKey('local'));
assert.deepEqual(prefs(null),{enabled:true,summary:true,remaining:true,claudeAutomatic:true,automaticReset:false,resetSelections:[],pins:[],order:[]});
// Card order: by provider, stable, unknown providers after the saved ones; bad values dropped.
assert.deepEqual(prefs({order:['claude',3,'claude','codex']}).order,['claude','codex']);
const cards=[{id:'a',sourceId:'codex'},{id:'b',sourceId:'copilot'},{id:'c',sourceId:'claude'}];
assert.deepEqual(orderReports(cards,['claude','codex']).map(orderKey),['claude','codex','copilot']);
assert.deepEqual(orderReports(cards,[]).map(orderKey),['codex','copilot','claude'],'No saved order keeps the reported order');
{
  const w=id=>({id,label:id,usedPct:10}),codex={id:'codex:1',sourceId:'codex',checkedAt:Date.now(),report:{status:'available',windows:[w('weekly')]}},claude={id:'claude:2',sourceId:'claude',checkedAt:Date.now(),report:{status:'available',windows:[w('session'),w('weekly')]}};
  const pins=[windowKey('codex:1','weekly'),windowKey('claude:2','weekly'),windowKey('copilot:9','monthly'),windowKey('claude:2','session')];
  const keys=o=>summaryWindows([codex,claude],prefs({pins,order:o})).map(c=>c.key);
  assert.deepEqual(keys([]),pins,'No card order keeps the pin order');
  assert.deepEqual(keys(['claude','copilot','codex']),[pins[1],pins[3],pins[2],pins[0]],'The widget follows the card order; a provider keeps its own pin order, missing reports included');
}
assert.equal(prefs({claudeAutomatic:false}).claudeAutomatic,false,'Automatic selection is enabled by default and can be disabled in Usage settings');
assert.equal(percentage({usedPct:18},true),82);assert.equal(percentage({},true),null);assert.equal(percentage({usedPct:NaN},false),null);
const entry={id:'report',sourceLabel:'Codex',checkedAt:Date.now(),report:{status:'available',windows:[{id:'weekly',label:'Weekly',summary:true,usedPct:18}]}};
assert.equal(summaryWindow([entry],prefs(null)),null,'No pin means no automatic provider fallback');
assert.equal(summaryWindow([entry],prefs({pins:[windowKey('report','weekly')]})).entry.id,'report');
assert.equal(summaryWindow([entry],prefs({pins:['missing']})),null);
assert.equal(summaryWindow([{...entry,report:{status:'unavailable'}}],prefs({pins:[windowKey('report','weekly')]})),null);
const scoped={id:'claude',sourceLabel:'Claude',checkedAt:Date.now(),report:{status:'available',windows:[{id:'session',usedPct:0},{id:'model:fable',label:'Fable · Weekly',usedPct:35}]}};
const legacy=prefs({pins:[windowKey('report','weekly'),windowKey('claude','model:fable')]});const priorPins=[...legacy.pins];
const allPins=summaryWindows([entry,scoped],legacy);assert.deepEqual(allPins.map(p=>p.key),priorPins);assert.equal(allPins[1].window.id,'model:fable','All pinned windows are selected, including model-specific quotas');assert.deepEqual(legacy.pins,priorPins,'Legacy preferences are not rewritten on read');
const partlyMissing=summaryWindows([entry,scoped],prefs({pins:[windowKey('report','weekly'),'missing']}));assert.equal(partlyMissing.length,2);assert.equal(partlyMissing[0].available,true);assert.equal(partlyMissing[1].available,false,'Unavailable pins retain their own position, not an unpinned fallback');
assert.deepEqual(togglePin(legacy,'new',true),[...priorPins,'new']);assert.deepEqual(togglePin(legacy,priorPins[0],false),[priorPins[1]]);assert.deepEqual(togglePin(legacy,priorPins[0],true),priorPins,'Pin updates preserve other selections and avoid duplicates');
assert.equal(summaryWindow([entry,scoped],prefs({remaining:false,pins:[windowKey('claude','session')]})).window.usedPct,0,'Zero usage is still a valid pinned quota');
assert.match(resetLabel('2030-01-02T00:00:00Z',Date.parse('2030-01-01T00:00:00Z')),/1d 0h/);
const afternoon=new Date(2030,0,2,13,0,49);assert.equal(resetInfo(afternoon.toISOString()).at,'Wed at 1:00PM');assert.equal(resetInfo(afternoon.toISOString()).full,'Wednesday, January 2, 2030 at 1:00PM');
assert.match(resetInfo(new Date(2030,0,2,0,5,59).toISOString()).at,/12:05AM$/);assert.match(resetInfo(new Date(2030,0,2,12,0,59).toISOString()).at,/12:00PM$/);assert.equal(resetInfo('invalid'),null);assert.equal(resetLabel(null),'');
const billing=resetInfo('2026-12-01',new Date(2026,10,8,23,30).getTime());assert.equal(billing.relative,'Resets in 23d');assert.equal(billing.at,'Tue, Dec 1');assert.equal(billing.full,'Tuesday, December 1, 2026');assert.doesNotMatch(billing.at,/AM|PM|:/);assert.equal(resetInfo('2026-02-31'),null);
assert.match(problem({status:'unavailable',problem:{kind:'expired',refreshedBy:'claude'}}),/Run claude/);
const home=path.join(os.tmpdir(),'fake-usage-home'),now=Date.parse('2030-01-01T00:00:00Z');
const stores=new Map([
  [path.join(home,'.codex/auth.json'),{tokens:{access_token:'fixture-secret-codex',account_id:'fixture-account'}}],
  [path.join(home,'.claude/.credentials.json'),{claudeAiOauth:{accessToken:'fixture-secret-claude',expiresAt:now+100000,subscriptionType:'Team'}}],
  [path.join(home,'.claude.json'),{oauthAccount:{accountUuid:'claude-account',emailAddress:'fixture@example.test'}}],
]);
let calls=[];
const options={home,env:{},platform:'win32',now,readJson:async file=>stores.get(file)??null,
  readJsonc:async()=>({lastLoggedInUser:{host:'https://github.com',login:'fixture'}}),ghToken:async()=> 'fixture-secret-github',
  requestJson:async(url,headers)=>{
    assert.ok(Object.values(collector.ENDPOINTS).includes(url)||collector.isBillingUrl(url));assert.ok(url.startsWith('https://'));calls.push(url);
    if(collector.isBillingUrl(url))return {status:404};
    if(url===collector.ENDPOINTS.claude)return {status:200,body:{five_hour:{utilization:20,resets_at:'2030-01-01T05:00:00Z'},seven_day:{utilization:30},limits:[{kind:'weekly_scoped',percent:40,scope:{model:{id:'model',display_name:'Model'}}}]}};
    if(url===collector.ENDPOINTS.codexResets)return {status:200,body:{available_count:2,credits:[
      {id:'RateLimitResetCredit_b',status:'available',is_supported_by_plan:true,expires_at:'2030-01-12T00:00:00Z',title:'Full reset'},
      {id:'RateLimitResetCredit_a',status:'available',is_supported_by_plan:true,expires_at:'2030-01-02T00:00:00Z',title:'Full reset'},
      {id:'RateLimitResetCredit_used',status:'redeemed',expires_at:'2030-01-03T00:00:00Z',title:'Full reset'}]}};
    if(url===collector.ENDPOINTS.githubUser)return {status:200,body:{login:'fixture',email:'public@example.test',privateField:'must-not-leave'}};
    if(url===collector.ENDPOINTS.codex)return {status:200,body:{plan_type:'Pro',rate_limit:{secondary_window:{used_percent:18,limit_window_seconds:604800}},credits:{balance:0},rate_limit_reset_credits:{available_count:1,applicable_available_count:0,privateField:'must-not-leave'},accessToken:'must-not-leave'}};
    return {status:200,body:{copilot_plan:'business',quota_reset_date:'2030-02-01',quota_snapshots:{premium_interactions:{entitlement:300,remaining:150,percent_remaining:50,unlimited:false}}}};
  }};
const result=await collector.collect({},options);
// Codex resets: one line per available credit, soonest first; spent ones left out.
{
  const codexEntry=result.reports.find(e=>e.sourceId==='codex');
  assert.deepEqual(codexEntry.report.codexResets.groups.map(g=>[g.grantId,g.endsAt]),[['RateLimitResetCredit_a','2030-01-02T00:00:00.000Z'],['RateLimitResetCredit_b','2030-01-12T00:00:00.000Z']]);
  const posts=[],consume=reply=>collector.codexReset({accountId:'fixture-account',grantId:'RateLimitResetCredit_a',requestId:'herdr-x'},
    {...options,requestJson:async(url,headers,req)=>{posts.push({url,headers,req});return reply;}});
  assert.deepEqual(await consume({status:200,body:{}}),{result:'reset'});
  assert.equal(posts[0].url,'https://chatgpt.com/backend-api/wham/rate-limit-reset-credits/consume');
  assert.deepEqual(posts[0].req,{method:'POST',body:{credit_id:'RateLimitResetCredit_a',redeem_request_id:'herdr-x'},timeout:25000});
  assert.equal(posts[0].headers['ChatGPT-Account-Id'],'fixture-account');assert.equal(posts[0].headers['x-openai-codex-luna-reserve'],'1');
  assert.deepEqual(await consume({status:409}),{result:'already_used'});
  assert.match((await consume({status:401})).error,/Login required/);
  assert.equal((await collector.codexReset({accountId:'someone-else',grantId:'RateLimitResetCredit_a',requestId:'r'},{...options,requestJson:async()=>{throw Error('no network');}})).error,'This Codex account is not signed in on this machine.');
  assert.equal((await collector.codexReset({accountId:'fixture-account',grantId:'../x',requestId:'r'},options)).error,'Invalid reset request.');
  await assert.rejects(collector.requestJson('https://chatgpt.com/backend-api/wham/rate-limit-reset-credits/consume',{},{method:'POST',body:{credit_id:'x',redeem_request_id:'y',extra:1}}),/Unapproved/);
}
// 5: Codex reports a reset, so its reset list is read too.
assert.equal(result.reports.length,3);assert.equal(calls.length,5);assert.ok(!calls.includes(collector.ENDPOINTS.githubUser),'Known Copilot usernames require no identity/email API calls');
assert.equal(result.reports.find(e=>e.sourceId==='codex').report.windows[0].remainingPct,82);
assert.deepEqual(result.reports.find(e=>e.sourceId==='codex').report.resetCredits,{available:1,applicable:0},'Consumable reset counts are separate from automatic quota timestamps');
assert.equal(result.reports.find(e=>e.sourceId==='claude').report.windows.length,3);
assert.equal(result.reports.find(e=>e.sourceId==='copilot').report.windows[0].remainingPct,50);
assert.equal(result.reports.find(e=>e.sourceId==='copilot').account.login,'fixture');assert.equal(result.reports.find(e=>e.sourceId==='copilot').account.email,undefined);assert.equal(result.reports.find(e=>e.sourceId==='copilot').report.windows[0].resetsAt,'2030-02-01','Calendar-only reset dates retain their precision');
const envIdentity={...options,env:{GH_TOKEN:'fixture-secret-github'},readJsonc:async()=>null};
const resolved=await collector.collect({},envIdentity);assert.equal(resolved.reports.find(e=>e.sourceId==='copilot').account.login,'fixture');assert.ok(!JSON.stringify(resolved).includes('public@example.test'));
const denied=await collector.collect({}, {...envIdentity,requestJson:async(url,...args)=>url===collector.ENDPOINTS.githubUser?{status:403,body:{message:'fixture-secret-denied'}}:options.requestJson(url,...args)});
assert.equal(denied.reports.find(e=>e.sourceId==='copilot').report.status,'available');assert.ok(!JSON.stringify(denied).includes('fixture-secret')); 
await assert.rejects(collector.requestJson('https://api.github.com/user/emails',{}),/Unapproved/);
assert.ok(!JSON.stringify(result).includes('fixture-secret'));assert.ok(!JSON.stringify(result).includes('must-not-leave'));
const unknown=collector.codexReport({rate_limit:{primary_window:{used_percent:10}}});assert.equal(unknown.windows[0].id,'unknown_primary');
assert.equal(collector.codexReport({}).resetCredits,undefined,'Older responses do not imply zero resets');
for(const value of [null,-1,1.5,NaN,Infinity,true,'1',Number.MAX_SAFE_INTEGER+1]) {
  assert.equal(collector.codexReport({rate_limit_reset_credits:{available_count:value,applicable_available_count:value}}).resetCredits,undefined,'Malformed counts cannot fabricate availability');
}
assert.deepEqual(collector.codexReport({rate_limit_reset_credits:{available_count:0,applicable_available_count:0}}).resetCredits,{available:0,applicable:0});
assert.deepEqual(collector.codexReport({rate_limit_reset_credits:{available_count:2}}).resetCredits,{available:2,applicable:undefined},'Missing applicability is not fabricated');
assert.deepEqual(collector.codexReport({rate_limit_reset_credits:{applicable_available_count:1}}).resetCredits,{available:undefined,applicable:1});
const modern=collector.copilotReport({token_based_billing:true,quota_reset_date:'2026-12-01',quota_snapshots:{chat:{unlimited:true},completions:{unlimited:true},premium_interactions:{unlimited:true,remaining:0,entitlement:0,percent_remaining:100,credits_used:2157}}});
assert.equal(modern.windows.length,0,'Unlimited legacy placeholders cannot fabricate a remaining percentage');
assert.equal(modern.balances[0].used,2157);assert.equal(modern.balances[0].remaining,undefined);assert.deepEqual(modern.details,[],'Unlimited chat/completions/credits do not produce three explanatory rows');assert.equal(modern.resetsAt,'2026-12-01');
const billingBody={usageItems:[{model:'Model A',product:'Copilot',unitType:'requests',grossQuantity:100.25,discountQuantity:90,netQuantity:10.25},{model:'Model A',grossQuantity:'10.5',discountQuantity:'5',netQuantity:'5.5'},{model:'Model B',gross_quantity:20,discount_quantity:10,net_quantity:10}],secret:'must-not-leave'};
const detailed=collector.copilotPremiumReport(billingBody);assert.equal(detailed.used,130.75);assert.equal(detailed.byModel.length,2);assert.equal(detailed.byModel[0].used,110.75);assert.equal(detailed.byModel[0].discounted,95);assert.equal(detailed.byModel[0].billed,15.75);assert.equal(detailed.limit,undefined);assert.equal(detailed.percent,undefined,'Discounted usage is not an invented allowance');
assert.equal(collector.copilotPremiumReport({}),null);assert.equal(collector.copilotPremiumReport({usageItems:[{grossQuantity:true}]}),null);assert.equal(collector.copilotPremiumReport({usageItems:[{grossQuantity:-1}]}),null);
assert.equal(collector.copilotPremiumReport({usage_items:[{model:'Only',gross_quantity:0.25}]}).byModel[0].discounted,undefined,'Missing discount data is not fabricated as zero');
assert.equal(collector.copilotPremiumReport({usageItems:[{product:'Spark',grossQuantity:999},{unit_type:'credits',grossQuantity:999},{model:'Only',grossQuantity:0.5}]}).used,0.5,'Other products and credit units are not counted as Copilot requests');
const billingUrl=collector.copilotBillingUrl('fixture',now);assert.equal(billingUrl,'https://api.github.com/users/fixture/settings/billing/premium_request/usage?year=2030&month=1');assert.ok(collector.isBillingUrl(billingUrl));assert.equal(collector.copilotBillingUrl('../bad',now),null);
for(const url of [billingUrl.replace('api.github.com','untrusted.example'),billingUrl+'&extra=1',billingUrl.replace('month=1','month=13'),billingUrl.replace('/fixture/','/fixture%2Fbad/')])assert.equal(collector.isBillingUrl(url),false);
await assert.rejects(collector.requestJson(billingUrl,{}, {method:'POST'}),/Unapproved/);
const enriched=await collector.collect({}, {...options,requestJson:async(url,...args)=>collector.isBillingUrl(url)?{status:200,body:billingBody}:options.requestJson(url,...args)});assert.equal(enriched.reports.find(e=>e.sourceId==='copilot').report.premiumUsage.used,130.75);assert.ok(!JSON.stringify(enriched).includes('must-not-leave'));
for(const status of [401,403,404,429,500]) {const deniedBilling=await collector.collect({}, {...options,requestJson:async(url,...args)=>collector.isBillingUrl(url)?{status,body:{secret:'must-not-leave'}}:options.requestJson(url,...args)});assert.equal(deniedBilling.reports.find(e=>e.sourceId==='copilot').report.status,'available');assert.equal(deniedBilling.reports.find(e=>e.sourceId==='copilot').report.premiumUsage,undefined);}
const claudeId=result.reports.find(e=>e.sourceId==='claude').id;calls=[];
const heldBack=await collector.collect({hold:{[claudeId]:now+900000},reuse:[result.reports.find(e=>e.sourceId==='codex').id]},options);
assert.equal(heldBack.reports.find(e=>e.sourceId==='claude').report.retryAt,now+900000);assert.equal(heldBack.reports.find(e=>e.sourceId==='codex').report.status,'reused');
assert.ok(!calls.includes(collector.ENDPOINTS.claude)&&!calls.includes(collector.ENDPOINTS.codex)&&calls.includes(collector.ENDPOINTS.copilot),'Held and reused accounts are not requested; others still are');
calls=[];await collector.collect({hold:{[claudeId]:now-1}},options);assert.ok(calls.includes(collector.ENDPOINTS.claude),'An elapsed back-off is requested again');
const expiredStores=new Map(stores);expiredStores.set(path.join(home,'.claude/.credentials.json'),{claudeAiOauth:{accessToken:'expired-secret',expiresAt:now-1}});
calls=[];const expired=await collector.collect({}, {...options,readJson:async file=>expiredStores.get(file)??null});
assert.equal(expired.reports.find(e=>e.sourceId==='claude').report.problem.kind,'expired');assert.ok(!calls.includes(collector.ENDPOINTS.claude));
const enterprise=await collector.discover({...options,env:{COPILOT_GH_HOST:'example.ghe.com'},ghToken:async()=>{throw Error('Must not read a public-host credential for Enterprise');}});
assert.equal(enterprise.find(e=>e.provider==='copilot').noQuota,true);
await assert.rejects(collector.requestJson('https://untrusted.example/usage',{}),/Unapproved endpoint/);
// A desktop collector has no agent-specific environment. The fresh A1 default
// login must recover the same account whose Codex/old Pi copies have expired.
const jwt=(exp,account='fixture-account')=>'fixture.'+Buffer.from(JSON.stringify({exp,'https://api.openai.com/auth':{chatgpt_account_id:account}})).toString('base64url')+'.signature';
const freshToken=jwt(now/1000+3600),expiredToken=jwt(now/1000-3600);let codexFetches=0;
const a1Options={...options,env:{},readJson:async file=>file===path.join(home,'.a1/agent/auth.json')?{'openai-codex':{type:'oauth',access:freshToken,expires:now+3600000,accountId:'fixture-account'}}:file===path.join(home,'.codex/auth.json')?{tokens:{access_token:expiredToken,account_id:'fixture-account'}}:options.readJson(file),requestJson:async(url,headers,...rest)=>{assert.equal(url,collector.ENDPOINTS.codex,'Provider retry never queries another provider');assert.equal(headers.Authorization,`Bearer ${freshToken}`);codexFetches++;return options.requestJson(url,headers,...rest);}};
const codexId=result.reports.find(e=>e.sourceId==='codex').id,recovered=await collector.collect({reportId:codexId,refresh:true},a1Options);
assert.equal(codexFetches,1);assert.equal(recovered.reports.length,1);assert.equal(recovered.reports[0].id,codexId,'The recovered login preserves pinned account identity');assert.equal(recovered.reports[0].report.status,'available');assert.ok(!JSON.stringify(recovered).includes(freshToken));
const fallback=await collector.discover(a1Options);assert.equal(fallback.filter(c=>c.provider==='codex'&&c.harness==='a1').length,1);assert.equal((await collector.discover({...a1Options,env:{PI_CODING_AGENT_DIR:path.join(home,'.a1/agent')}})).filter(c=>c.provider==='codex'&&c.file===path.join(home,'.a1/agent/auth.json')).length,1,'Default A1 path and inherited environment never duplicate an account login');
let foreignFetches=0;const otherAccount=await collector.collect({reportId:codexId,refresh:true},{...a1Options,readJson:async file=>file===path.join(home,'.a1/agent/auth.json')?{'openai-codex':{type:'oauth',access:jwt(now/1000+3600,'different-account'),expires:now+3600000,accountId:'different-account'}}:a1Options.readJson(file),requestJson:async()=>{foreignFetches++;throw Error('Do not borrow a different account');}});assert.equal(foreignFetches,0);assert.equal(otherAccount.reports[0].report.problem.kind,'expired','A provider retry never steals a different account identity');
const historical=summaryWindows([{...entry,report:{status:'unavailable'},lastSuccessful:{report:entry.report}}],prefs({pins:[windowKey(entry.id,'weekly')]}))[0];assert.equal(historical.window.label,'Weekly');assert.equal(historical.available,false,'Historical pin metadata never makes stale percentages available');
assert.equal(reportFresh(entry,entry.checkedAt+TTL-1),true);assert.equal(reportFresh(entry,entry.checkedAt+TTL),false);assert.equal(reportFresh({...entry,checkedAt:undefined}),false);assert.equal(reportFresh({...entry,checkedAt:Infinity}),false);assert.equal(reportFresh(entry,entry.checkedAt-1),false);
assert.equal(summaryWindows([entry],prefs({pins:[windowKey(entry.id,'weekly')]}),entry.checkedAt+TTL)[0].available,true,'Collection expiry alone does not interrupt the displayed quota');
assert.equal(summaryWindows([entry],prefs({pins:[windowKey(entry.id,'weekly')]}),entry.checkedAt+TTL+60001)[0].available,false,'A missed automatic refresh eventually needs attention');
const temporary=fs.mkdtempSync(path.join(os.tmpdir(),'cli-discovery-'));
try {
  fs.mkdirSync(path.join(temporary,'.local/bin'),{recursive:true});fs.writeFileSync(path.join(temporary,'.local/bin/claude.exe'),'fixture');
  const found=await collector.discoverExecutables({home:temporary,env:{PATH:''},platform:'win32'});
  assert.equal(found.claude,path.join(temporary,'.local/bin/claude.exe'),'Native installation is found without shell PATH');
} finally {fs.rmSync(temporary,{recursive:true,force:true});}
assert.ok(!fs.readFileSync(new URL('../mods/custom-usage/bridge.cjs',import.meta.url),'utf8').includes('Custom.exe'));
// Last known usage reads like the reset captions: how long ago, then day at time.
{
  const now=new Date(2026,10,18,9,55).getTime();
  const at=(d,h,m)=>new Date(2026,10,d,h,m).toISOString();
  assert.deepEqual(JSON.parse(JSON.stringify(fetchedInfo(at(18,7,31),now))),{relative:'2h 24m ago',at:'Today at 7:31AM',full:'Wednesday, November 18, 2026 at 7:31AM'});
  assert.equal(fetchedInfo(at(17,22,5),now).at,'Yesterday at 10:05PM');
  assert.equal(fetchedInfo(at(14,13,0),now).at,'Sat at 1:00PM');
  assert.equal(fetchedInfo(at(2,13,0),now).at,'Nov 2 at 1:00PM');
  assert.equal(fetchedInfo(at(16,9,0),now).relative,'2d 0h ago');
  assert.equal(fetchedInfo(new Date(now-20000).toISOString(),now).relative,'just now');
  assert.equal(fetchedInfo(at(18,9,50),now).relative,'5m ago');
  for(const bad of [undefined,'','not a date'])assert.equal(fetchedInfo(bad,now),null);
}
console.log('PASS: standalone Claude/Codex/Copilot quotas, credit billing, expired auth, endpoint restrictions, secret filtering and PATH-independent CLI discovery');
