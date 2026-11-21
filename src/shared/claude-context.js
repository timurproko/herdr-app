// Read-only Claude session identity, shared by account controls and optional Usage.
import { terminals } from './host.js';
export function claudeContext(opening,machine,now=Date.now()) {
  const address=opening?.address;
  if(!address)return {reason:'No Claude terminal selected.'};
  const slash=address.indexOf('/'),host=slash<0?null:address.slice(0,slash);
  if(host!==(machine??null))return {reason:'The selected terminal is on another machine.'};
  const terminal=terminals().find(t=>t.address===address),labels=terminal?.labels??{};
  const app=terminal?.report?.app??terminal?.reported?.app??terminal?.app??terminal?.program?.key;
  if(!/claude/i.test(String(app??'')))return {reason:'The selected terminal is not Claude Code.'};
  const at=Number(labels['custom.claude.at']);
  if(!Number.isFinite(at)||now-at>90000||at>now+5000)return {reason:'Current session account is not reported yet. New Claude sessions load the account integration.'};
  if(labels['custom.claude.state']==='switching')return {reason:'Claude is switching accounts…'};
  const email=labels['custom.claude.email'],id=labels['custom.claude.account'],organizationId=labels['custom.claude.organization'];
  return email?{email,id,organizationId,address}:{reason:'This Claude session is not signed in.'};
}
