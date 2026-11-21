export const TTL = 600000;
export const REFRESH_INTERVAL = 60000;
export const REFRESH_TIMEOUT = 135000;
export function sidebarUsageVisible(preferences) {
  return preferences?.summary !== false && Array.isArray(preferences?.pins)
    && preferences.pins.some(pin => typeof pin === 'string' && Boolean(pin));
}
export const machineKey = machine => machine == null ? 'local' : `remote:${machine}`;
export const windowKey = (report, window) => JSON.stringify([report, window]);
export function prefs(value) {
  return { enabled:value?.enabled!==false, summary:value?.summary!==false, remaining:value?.remaining!==false, claudeAutomatic:value?.claudeAutomatic!==false,
    pins:Array.isArray(value?.pins)?value.pins.filter(x=>typeof x==='string'):[],
    // Card order in the Usage dialog, by provider (claude, codex, copilot); dragged by the user.
    order:Array.isArray(value?.order)?[...new Set(value.order.filter(x=>typeof x==='string'&&x.length<=64))]:[] };
}
// A card's place in the user's order: one per provider, so Claude keeps its
// spot whichever saved account the card shows.
export const orderKey = entry => String(entry?.sourceId ?? entry?.id ?? '');
// Stable: known providers in the saved order, the rest after them as reported.
export function orderReports(reports, order=[]) {
  const rank=key=>{const i=order.indexOf(key);return i<0?order.length:i;};
  return (reports??[]).map((entry,i)=>({entry,i})).sort((a,b)=>rank(orderKey(a.entry))-rank(orderKey(b.entry))||a.i-b.i).map(x=>x.entry);
}
// Moves `source` onto `target`'s place among the shown keys; null when nothing moves.
export function percentage(window, remaining) {
  const direct=remaining?window.remainingPct:window.usedPct;
  if(typeof direct==='number'&&Number.isFinite(direct)) return direct;
  const other=remaining?window.usedPct:window.remainingPct;
  return typeof other==='number'&&Number.isFinite(other)?100-other:null;
}
// A refusal that refreshing cannot fix: the card names it instead of offering Refresh.
const BLOCKED={oauth_not_allowed_for_organization:'Anthropic does not allow OAuth sign-in for this account’s organization, so its usage cannot be read.'};
export function providerBlock(report) {
  return report?.status==='unavailable'&&report.problem?.kind==='rejected'?BLOCKED[report.problem.code]??null:null;
}
// A Claude login no refresh can renew (its refresh token was refused, or it has
// none left): the card offers a browser sign-in instead of Refresh.
export function loginRequired(entry) {
  const report=entry?.report,p=report?.status==='unavailable'?report.problem:null;
  if(entry?.sourceId!=='claude'||!p||providerBlock(report))return false;
  return (p.kind==='refresh_failed'&&['rejected','missing'].includes(p.reason))||(p.kind==='rejected'&&Boolean(p.refreshAttempted))||p.kind==='expired';
}
export function problem(report) {
  if(providerBlock(report))return providerBlock(report);
  if(report?.status==='error') {
    const retry=report.retryAt>Date.now()?resetInfo(report.retryAt):null;
    return retry?`Usage requests are rate limited. Next check after ${retry.at.split(' at ').pop()}.`:report.error || 'Usage request failed.';
  }
  const p=report?.problem;
  if(p?.kind==='refresh_failed') return ['rejected','missing'].includes(p.reason)?'Claude login could not be renewed. Sign in again with the CLI on this machine.':p.reason==='unsupported'?'This Claude login store cannot be renewed automatically. Refresh its login with the CLI.':'Claude login refresh could not finish safely. Try again later.';
  if(p?.kind==='rejected'&&p.refreshAttempted) return 'Claude quota access was rejected after refreshing its login. Sign in again with the CLI on this machine.';
  if(p?.kind==='expired') return `Login expired. ${p.refreshedBy ? `Run ${p.refreshedBy} to refresh it.` : 'Sign in again in the agent CLI.'}`;
  if(p?.kind==='rejected') return `Login rejected${p.status?` (${p.status})`:''}. ${p.refreshedBy?`Run ${p.refreshedBy} to refresh it.`:'Sign in again in the agent CLI.'}`;
  return p?.detail || 'Usage is unavailable for this account.';
}
export function togglePin(preferences,key,on) {
  return on?[...new Set([...preferences.pins,key])]:preferences.pins.filter(pin=>pin!==key);
}
export function reportFresh(entry, now=Date.now()) {
  const at=Number.isFinite(entry?.checkedAt)?entry.checkedAt:Date.parse(entry?.fetchedAt);
  return entry?.report?.status==='available'&&Number.isFinite(at)&&at<=now&&now-at<TTL;
}
// Collection freshness is stricter than presentation: keep good numbers through
// the next timer tick and an active refresh, but never hide a failure or hang.
export function reportDisplayable(entry, data={}, now=Date.now()) {
  const at=Number.isFinite(entry?.checkedAt)?entry.checkedAt:Date.parse(entry?.fetchedAt);
  if(data.error||entry?.report?.status!=='available'||!Number.isFinite(at)||at>now)return false;
  if(data.loading)return Number.isFinite(data.started)&&data.started<=now&&now-data.started<REFRESH_TIMEOUT;
  return now-at<=TTL+REFRESH_INTERVAL;
}
export function summaryWindows(reports, preferences, now=Date.now(), data={}) {
  const choices=new Map((reports??[]).flatMap(entry=>((entry.report?.status==='available'?entry.report:entry.lastSuccessful?.report)?.windows??[]).map(window=>[windowKey(entry.id,window.id),{entry,window}])));
  const pins=[...new Set(preferences.pins.filter(Boolean))].map(key=>{
    const choice=choices.get(key);
    if(choice)return {...choice,key,available:reportDisplayable(choice.entry,data,now)&&percentage(choice.window,preferences.remaining)!==null};
    let id;try{[id]=JSON.parse(key);}catch{}
    return {key,id,entry:(reports??[]).find(entry=>entry.id===id),window:null,available:false};
  });
  // The sidebar follows the Usage dialog's card order (by provider); pins of
  // one provider keep the order they were pinned in.
  const order=preferences.order??[],rank=choice=>{
    const key=choice.entry?orderKey(choice.entry):String(choice.id??'').split(':')[0],i=order.indexOf(key);
    return i<0?order.length:i;
  };
  return pins.map((choice,i)=>({choice,i})).sort((a,b)=>rank(a.choice)-rank(b.choice)||a.i-b.i).map(({choice:{id,...rest}})=>rest);
}
export function summaryWindow(reports, preferences) {
  return summaryWindows(reports,preferences).find(choice=>choice.available)??null;
}
export function resetInfo(value, now=Date.now()) {
  const dateOnly=typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value),parts=dateOnly?value.split('-').map(Number):null;
  const date=parts?new Date(parts[0],parts[1]-1,parts[2]):new Date(value),difference=date.getTime()-now;
  if(!value||!Number.isFinite(date.getTime())||(parts&&(date.getFullYear()!==parts[0]||date.getMonth()!==parts[1]-1||date.getDate()!==parts[2])))return null;
  const mins=Math.max(0,Math.ceil(difference/60000)),days=Math.floor(mins/1440),hours=Math.floor(mins%1440/60);
  const duration=days?`${days}d ${hours}h`:hours?`${hours}h ${mins%60}m`:`${mins}m`;
  const weekday=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  const month=['January','February','March','April','May','June','July','August','September','October','November','December'][date.getMonth()];
  const hour=date.getHours(),time=`${hour%12||12}:${String(date.getMinutes()).padStart(2,'0')}${hour<12?'AM':'PM'}`;
  if(dateOnly) {
    // A billing date is not a supplied midnight timestamp. Do not invent a time.
    const today=new Date(now),count=Math.max(0,Math.round((Date.UTC(date.getFullYear(),date.getMonth(),date.getDate())-Date.UTC(today.getFullYear(),today.getMonth(),today.getDate()))/86400000));
    return {relative:count?`Resets in ${count}d`:'Resets today',at:`${weekday.slice(0,3)}, ${month.slice(0,3)} ${date.getDate()}`,full:`${weekday}, ${month} ${date.getDate()}, ${date.getFullYear()}`};
  }
  return {relative:`Resets in ${duration}`,at:`${weekday.slice(0,3)} at ${time}`,full:`${weekday}, ${month} ${date.getDate()}, ${date.getFullYear()} at ${time}`};
}
// When the last good numbers were fetched, in the same shape as resetInfo:
// "2h 24m ago" · "Today at 7:31AM" (Yesterday, a weekday within a week, else a date).
export function fetchedInfo(value, now=Date.now()) {
  const date=new Date(value),difference=now-date.getTime();
  if(!value||!Number.isFinite(date.getTime()))return null;
  const mins=Math.max(0,Math.floor(difference/60000)),days=Math.floor(mins/1440),hours=Math.floor(mins%1440/60);
  const duration=mins<1?'just now':`${days?`${days}d ${hours}h`:hours?`${hours}h ${mins%60}m`:`${mins}m`} ago`;
  const weekday=['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][date.getDay()];
  const month=['January','February','March','April','May','June','July','August','September','October','November','December'][date.getMonth()];
  const hour=date.getHours(),time=`${hour%12||12}:${String(date.getMinutes()).padStart(2,'0')}${hour<12?'AM':'PM'}`;
  const today=new Date(now),back=Math.round((Date.UTC(today.getFullYear(),today.getMonth(),today.getDate())-Date.UTC(date.getFullYear(),date.getMonth(),date.getDate()))/86400000);
  const day=back<=0?'Today':back===1?'Yesterday':back<7?weekday.slice(0,3):`${month.slice(0,3)} ${date.getDate()}`;
  return {relative:duration,at:`${day} at ${time}`,full:`${weekday}, ${month} ${date.getDate()}, ${date.getFullYear()} at ${time}`};
}
export function resetLabel(value, now=Date.now()) {
  const reset=resetInfo(value,now);return reset?`${reset.relative} · ${reset.at}`:'';
}
