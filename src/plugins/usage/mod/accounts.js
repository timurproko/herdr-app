// Display selection only: this module never changes a Claude login.
import { focused, shared, setShared } from './host.js';
export { claudeContext } from './claude-context.js';
import { machineKey } from './model.js';
import { pluginIsEnabled } from './plugins.js';
const selectionKey=machine=>`custom.usage.${machineKey(machine)}.claudeSelection`;
export function claudeSelection(machine) {
  const value=shared(selectionKey(machine));
  return typeof value==='string'&&value?value:'auto';
}
export function selectClaude(machine,value) {if(pluginIsEnabled('usage'))setShared(selectionKey(machine),value);}
export function usageOpeningContext() {
  const focus=focused(),address=focus?.shown??focus?.agent??focus?.terminal;
  return address?{address}:null;
}
export function claudeView(reports,selection='auto',context={},remembered=null) {
  const accounts=(reports??[]).filter(e=>e.sourceId==='claude'||e.sourceLabel==='Claude');
  const matches=context.email?accounts.filter(e=>context.id?
    e.account?.id===context.id&&(!context.organizationId||e.account?.organizationId===context.organizationId):
    (e.account?.email??e.account?.label)?.toLowerCase()===context.email.toLowerCase()):[];
  // An email may belong to several organizations. Never fall back from a
  // mismatched verified UUID/organization to the first account with that email.
  const match=matches.length===1?matches[0]:null;
  // With no trustworthy session report, show the last inspected saved account
  // (or the first one), without claiming it is the current session's account.
  // Legacy 'all' selections now use the same compact single-account view.
  const chosen=(selection==='auto'?match:accounts.find(e=>e.id===selection))??accounts.find(e=>e.id===remembered)??accounts[0]??null;
  return {accounts,chosen,current:match??null,
    reports:(reports??[]).filter(e=>!accounts.includes(e)||e.id===chosen?.id)};
}
