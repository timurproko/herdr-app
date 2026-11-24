// Explicit task context, never a fake Git working directory. The panel's bounded
// state/check safety reads share this queue, including settled/enrolled open rows.
import { exec, run } from './host.js';
import { pluginPullContext, pluginEvent, sidebarPanelEnabled } from './plugins.js';
import { location } from './location.js';
import { PR_FIELDS, pullRow, pullFailure, repositoryFailure, PullFactsOrder } from './pulls.js';
export function taskPullLink(url) {
  const match=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/([1-9]\d*)\/?$/.exec(url??'');
  const number=Number(match?.[2]);
  return match && !match[1].split('/').some(part=>part==='.' || part==='..') && Number.isSafeInteger(number) ? {repo:match[1].toLowerCase(),number,key:`${match[1].toLowerCase()}#${number}`,url:`https://github.com/${match[1]}/pull/${number}`} : null;
}
const HISTORY_MS = 24 * 60 * 60 * 1000;
const MISSING_LIVE_MS = 5 * 60 * 1000;
// Module-session facts, not coordinator entries or portable preferences. Keep log
// deduplication even when a live miss expires or a later read finds the PR.
const missingPulls = new Map(), loggedMissingPulls = new Set();
function missingTaskPull(result, number) {
  if(pullFailure(result).kind!=='notfound')return false;
  const text=String(result.stderr??'');
  // Repository resolution and arbitrary "not found" text are not PR absence.
  return new RegExp(`Could not resolve to a PullRequest with the number of ${number}\\b`, 'i').test(text)
    || (/\bHTTP 404\b/i.test(text) && !/could not resolve to a Repository/i.test(text));
}
function liveLink(link) {return link.targets.some(t=>!t.historical && typeof t.terminal==='string' && t.terminal);}
function rememberMissing(entry) {
  missingPulls.set(entry.link.key,Date.now());
  entry.pr=null;entry.error=null;entry.missing=true;entry.completedAt=NaN;entry.dirty=false;
  if(!loggedMissingPulls.has(entry.link.key)) {
    loggedMissingPulls.add(entry.link.key);
    try {console.log(`[custom-changes] task PR not found: ${entry.link.repo} #${entry.link.number}`);}catch {}
  }
}
export class AggregatePulls {
  constructor({shown,onUpdate}) {this.shown=shown;this.onUpdate=onUpdate;this.entries=new Map();this.pending=new Map();this.diagnostics=new Map();this.serial=0;this.factOrder=new PullFactsOrder();}
  currentContext({presentation = false} = {}) {
    const context=sidebarPanelEnabled('changes') ? pluginPullContext(location().space,{presentation}) : null;
    return !presentation && context?.stale ? null : context;
  }
  sync(cx) {
    if(this.shown()) pluginEvent('workspace.context.refresh',{cx});
    const context=this.currentContext({presentation:true}), previous=this.context;
    if(context?.scope!==previous?.scope) {this.serial++;this.factOrder.reset();this.entries.clear();this.pending.clear();this.diagnostics.clear();}
    this.context=context;
    if(!context) return false;
    if(context.stale) {
      if(!previous?.stale) {this.serial++;this.factOrder.reset();this.pending.clear();this.diagnostics.clear();for(const entry of this.entries.values())entry.dirty=true;}
      // Retain only already-loaded same-home rows. Empty stale links are not
      // an authoritative deletion, nor permission to read or navigate.
      return true;
    }
    const links=new Map();
    for(const source of context.links) {const link=taskPullLink(source.url);if(!link)continue;const entry=links.get(link.key)??{...link,targets:[]};entry.targets.push({terminal:source.terminal,task:source.task,historical:source.historical===true});links.set(link.key,entry);}
    for(const key of this.entries.keys()) if(!links.has(key)) {this.entries.delete(key);this.pending.delete(key);}
    for(const [key,link]of links) {
      const old=this.entries.get(key);if(old)old.link=link;else this.entries.set(key,{link,dirty:true,pr:null,error:null});
      const entry=this.entries.get(key),missingAt=missingPulls.get(key);
      if(missingAt!==undefined) {
        entry.pr=null;entry.error=null;entry.missing=true;
        // Use the existing shown-panel lifecycle, never a new retry timer.
        if(liveLink(link) && Date.now()-missingAt>=MISSING_LIVE_MS && !this.pending.has(key))entry.dirty=true;
      }
    }
    if(!this.shown()) {this.serial++;this.factOrder.reset();this.pending.clear();this.diagnostics.clear();for(const e of this.entries.values())e.dirty=true;}
    else this.pump(cx);
    return true;
  }
  stop() {this.serial++;this.factOrder.reset();this.context=null;this.entries.clear();this.pending.clear();this.diagnostics.clear();}
  get busy() {return this.pending.size>0 || Boolean(this.fallbackBusy);}
  eligible(entry, now = Date.now()) {
    if(!entry.pr)return false;
    if(['open','draft'].includes(entry.pr.state) || entry.link.targets.some(t=>!t.historical && typeof t.terminal==='string' && t.terminal))return true;
    const age=now-entry.completedAt;
    return Number.isFinite(age) && age>=0 && age<HISTORY_MS;
  }
  rows(state) {const now=Date.now();return [...this.entries.values()].flatMap(e=>this.eligible(e,now) && (state==='open'?['open','draft']:['closed','merged']).includes(e.pr.state)?[e.pr]:[]);}
  readNotice(repository, state) {
    const now=Date.now();
    const failed=[...this.entries.values()].filter(e=>e.link.repo===repository && e.error && (e.pr
      ? this.eligible(e,now) && (state==='open'?['open','draft']:['closed','merged']).includes(e.pr.state)
      // On cold failure there is no GitHub state to invent. Historical-only
      // reads belong to the history notice, never to the live Open list.
      : state==='closed' || e.link.targets.some(t=>!t.historical && t.terminal)));
    if(!failed.length)return null;
    const missing=failed.filter(e=>e.error.kind==='notfound'),other=failed.filter(e=>e.error.kind!=='notfound');
    const missingMessage=missing.length?`${repository} ${[...new Set(missing.map(e=>`#${e.link.number}`))].join(', ')} not found`:null;
    const messages=[...new Set([missingMessage,...other.map(e=>e.error.message)].filter(Boolean))];
    const categories={cli:'GitHub CLI unavailable',transient:'local command failed or timed out',auth:'GitHub sign-in required',repository:'repository unavailable',access:'GitHub account access',rate:'GitHub rate limit',response:'GitHub response error',unreachable:'GitHub connection failed',read:'PR read failed'};
    let message=messages.length===1 ? messages[0] : `Could not read some pull requests (${[...new Set([missingMessage,...other.map(e=>e.error.repository ? e.error.message : categories[e.error.kind])].filter(Boolean))].join('; ')}); refresh to retry`;
    const refused=failed.filter(e=>['access','auth'].includes(e.error.kind)).map(e=>`#${e.link.number}`);
    if(refused.length)message+=` · PR ${[...new Set(refused)].join(', ')}`;
    return failed.every(e=>!e.pr && e.link.targets.every(t=>t.historical)) ? `Task PR history: ${message}` : message;
  }
  repositories() {
    const now=Date.now();
    return [...new Set([...this.entries.values()].filter(e=>!e.missing && (!e.pr || this.eligible(e,now))).map(e=>e.link.repo))].sort();
  }
  counts() {return {open:this.rows('open').length,closed:this.rows('closed').length};}
  invalidate(repository=null) {this.diagnostics.clear();for(const e of this.entries.values())if(!repository || e.link.repo===repository.toLowerCase())e.dirty=true;}
  refresh(cx) {pluginEvent('workspace.context.refresh',{cx,force:true});this.invalidate();this.pump(cx);}
  pump(cx) {
    if(this.fallbackBusy)return;
    if(!this.context || this.context.stale || !this.shown() || this.currentContext()?.scope!==this.context.scope)return;
    const context=this.context,scope=context.scope,serial=this.serial;
    for(const [key,entry]of this.entries) {
      if(this.pending.size>=3)break;
      if(!entry.dirty || this.pending.has(key))continue;
      const missingAt=missingPulls.get(key);
      if(missingAt!==undefined && (!liveLink(entry.link) || Date.now()-missingAt<MISSING_LIVE_MS)) {
        entry.pr=null;entry.error=null;entry.missing=true;entry.dirty=false;continue;
      }
      entry.dirty=false;const token={},read=this.factOrder.begin();this.pending.set(key,token);
      const current=()=>this.serial===serial && this.shown() && this.currentContext()?.scope===scope && this.pending.get(key)===token && this.entries.get(key)===entry
        && this.currentContext()?.links.some(l=>taskPullLink(l.url)?.key===key);
      cx.spawn(async view=>{
        let updated=false;
        try {
          await Promise.resolve();if(!current())return;
          const result=await exec('gh',['pr','view',String(entry.link.number),'--repo',entry.link.repo,'--json',PR_FIELDS],{on:context.machine,timeout:30000});
          if(!current())return;
          if(result.code!==0 || result.timed_out || result.timedOut || result.signal) {
            if(missingTaskPull(result,entry.link.number)) {
              const published=this.factOrder.publish(read,key,()=>null);
              if(published.accepted)rememberMissing(entry);else entry.dirty=true;
              return;
            }
            const failure=await repositoryFailure(exec,result,entry.link.repo,{on:context.machine},this.diagnostics);
            if(current()) {missingPulls.delete(key);entry.missing=false;entry.error=failure;}
            return;
          }
          const value=JSON.parse(result.stdout);
          if(value.number!==entry.link.number || taskPullLink(value.url)?.key!==key)throw Error('Pull request identity mismatch');
          const published=this.factOrder.publish(read,key,()=>({...pullRow(value,entry.link.repo.split('/')[0]),key,repo:entry.link.repo}));
          if(!published.accepted) {entry.dirty=true;return;}
          missingPulls.delete(key);entry.missing=false;entry.pr=published.value;
          const completedAt=Date.parse(value.mergedAt??value.closedAt??'');
          entry.completedAt=completedAt<=Date.now()?completedAt:NaN;entry.error=null;updated=true;
        }catch(e){
          if(current()) {
            const failure=await repositoryFailure(exec,e,entry.link.repo,{on:context.machine},this.diagnostics);
            if(current()) {missingPulls.delete(key);entry.missing=false;entry.error=failure;}
          }
        }
        finally {
          if(this.pending.get(key)===token)this.pending.delete(key);
          if(this.serial===serial && this.shown())this.pump(view);
          // Share one identity read per repository only within this refresh.
          // Never reuse a prior refresh's login after an account change.
          if(!this.pending.size && ![...this.entries.values()].some(e=>e.dirty))this.diagnostics.clear();
          view.notify();
        }
        // Presentation callback failures are not failed GitHub reads.
        if(updated && this.serial===serial && this.shown() && this.currentContext()?.scope===scope)this.onUpdate?.(view);
      });
    }
  }
  target(pr) {
    const context=this.currentContext();if(context?.scope!==this.context?.scope)return null;
    const matches=context.links.filter(l=>!l.historical && typeof l.terminal==='string' && l.terminal && taskPullLink(l.url)?.key===pr.key);
    return matches.find(l=>l.terminal===location().terminal)??matches[0]??null;
  }
  focus(pr,target,scope) {
    if(!this.shown() || !target?.terminal || target.historical || this.currentContext()?.scope!==scope)return;
    if(this.currentContext().links.some(l=>!l.historical && l.terminal===target.terminal && l.task===target.task && taskPullLink(l.url)?.key===pr.key))run('agent.focus',{terminal:target.terminal});
  }
}
