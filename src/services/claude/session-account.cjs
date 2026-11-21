// Explicit account-picker actions only. Credential writes belong to the companion helper; never send terminal input.
'use strict';
const fs = require('node:fs/promises');
const path = require('node:path');
const os = require('node:os');
const {execFile} = require('node:child_process');
const {promisify} = require('node:util');
const runFile = promisify(execFile);
const clean = value => typeof value === 'string' && value.length <= 320 && !/[\x00-\x1f\x7f]/.test(value);
const identity = account => ({email:account.email, account:account.oauthAccount?.accountUuid ?? '', organization:account.oauthAccount?.organizationUuid ?? ''});
const same = (a,b) => a?.email === b?.email && (a?.account ?? '') === (b?.account ?? '') && (a?.organization ?? '') === (b?.organization ?? '');
async function accounts(home) {
  const dir = path.join(home,'.claude/account-switcher/accounts'), out = [];
  for (const entry of await fs.readdir(dir,{withFileTypes:true}).catch(()=>[])) {
    if (!entry.isFile() || !entry.name.endsWith('.json')) continue;
    try {
      const value = JSON.parse(await fs.readFile(path.join(dir,entry.name),'utf8'));
      if (!value.credentials?.claudeAiOauth?.accessToken || !value.credentials?.claudeAiOauth?.refreshToken) continue;
      const item = identity(value);
      if (clean(item.email) && item.email && clean(item.account) && clean(item.organization)) out.push(item);
    } catch { /* A login being updated is unavailable until the next explicit open. */ }
  }
  return out.sort((a,b)=>a.email.localeCompare(b.email));
}
async function action(request,{home=os.homedir(),now=Date.now,switchShared=async message=>{
  await runFile(process.execPath,[path.join(home,'.claude/plugins-local/account-switcher/bin/session-dir.js'),'switch-shared',JSON.stringify(message)],{timeout:100000,windowsHide:true,maxBuffer:65536});
},run=async args=>{
  const result=await runFile('hc',args,{timeout:5000,windowsHide:true,maxBuffer:4*1024*1024});
  return JSON.parse(result.stdout);
}}={}) {
  if (!/^t[a-z0-9]+$/i.test(request.terminal??'') || !/^[a-z0-9-]{16,100}$/i.test(request.session??'')) throw Error('Invalid Claude session.');
  const terminal=await run(['get',request.terminal,'--json']), labels=terminal.labels??{};
  const at=Number(labels['custom.claude.at']);
  const scope=labels['custom.claude.control']==='1'?'isolated':!labels['custom.claude.control']?'shared':null;
  if (terminal.state!=='live' || !scope || scope!==request.scope || labels['custom.claude.session']!==request.session ||
      !Number.isFinite(at) || now()-at>90000 || at>now()+5000 || labels['custom.claude.state']==='switching') throw Error('Claude session changed or is switching. Reopen the account menu.');
  const current={email:labels['custom.claude.email'],account:labels['custom.claude.account'],organization:labels['custom.claude.organization']};
  if (!same(current,request.current)) throw Error('Claude account changed. Reopen the account menu.');
  const saved=await accounts(home);
  if (request.action==='list') return {accounts:saved};
  if (request.action!=='switch' || !/^[a-z0-9-]{16,100}$/i.test(request.id??'')) throw Error('Invalid account action.');
  const target=saved.find(item=>same(item,request.target));
  if (!target) throw Error('Saved account changed or is unavailable. Reopen the account menu.');
  const message={v:1,id:request.id,session:request.session,at:now(),current,target};
  if(scope==='shared') {
    if(request.confirmShared!==true)throw Error('Confirm that this changes other shared Claude sessions too.');
    await switchShared({current,target,confirmShared:true});
    return {applied:'shared',nextRequest:true};
  }
  await run(['label',request.terminal,`custom.claude.request=${JSON.stringify(message)}`,'--json']);
  return {queued:true}; // Only the plugin can acknowledge and verify the switch.
}
module.exports={action,accounts};
if(require.main===module || !module.parent) action(JSON.parse(process.argv[require.main?2:1]??'{}')).then(
  value=>console.log(JSON.stringify(value)),
  ()=>{console.log(JSON.stringify({error:'Cannot change this Claude account. Reopen the menu and try again; the account-switcher helper must be installed on that machine.'}));process.exitCode=1;}
);
