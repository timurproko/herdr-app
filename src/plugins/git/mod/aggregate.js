// Explicit task context, never a fake Git working directory. The panel's bounded
// state/check safety reads share this queue, including settled/enrolled open rows.
import { exec, run } from './host.js';
import { pluginPullContext, pluginEvent, sidebarPanelEnabled } from './plugins.js';
import { location } from './location.js';
import { pullFailure, repositoryFailure, readTargetPulls, finalPull, retimePull, quietRead, retryRead, PullFactsOrder } from './pulls.js';
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
    if(this.shown()) pluginEvent('workspace.context.refresh',{cx,space:location().space});
    const context=this.currentContext({presentation:true}), previous=this.context;
    if(context?.scope!==previous?.scope) {this.readWake=null;this.manualRead=null;this.serial++;this.factOrder.reset();this.entries.clear();this.pending.clear();this.diagnostics.clear();}
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
      if(entry.pr)entry.pr=retimePull(entry.pr);
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
  get waiting() {return [...this.entries.values()].some(e=>!e.pr && e.dirty && !e.error);}
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
  invalidate(repository=null) {this.diagnostics.clear();for(const e of this.entries.values())if((!repository || e.link.repo===repository.toLowerCase()) && !finalPull(e.pr))e.dirty=true;}
  refresh(cx) {pluginEvent('workspace.context.refresh',{cx,space:location().space,force:true});this.manualRead={remaining:1,expires:Date.now()+30000};this.readWake=null;this.invalidate();this.pump(cx);}
  pump(cx) {
    if(this.fallbackBusy || this.readWake?.due>Date.now())return;
    if(!this.context || this.context.stale || !this.shown() || this.currentContext()?.scope!==this.context.scope) {this.manualRead=null;return;}
    const context=this.context,scope=context.scope,serial=this.serial,groups=new Map();
    for(const [key,entry]of this.entries) {
      if(!entry.dirty || this.pending.has(key))continue;
      const missingAt=missingPulls.get(key);
      if(missingAt!==undefined && (!liveLink(entry.link) || Date.now()-missingAt<MISSING_LIVE_MS)) {
        entry.pr=null;entry.error=null;entry.missing=true;entry.dirty=false;continue;
      }
      const group=groups.get(entry.link.repo)??[];group.push(entry);groups.set(entry.link.repo,group);
    }
    for(const [repository,entries]of groups)for(let at=0;at<entries.length;at+=20) {
      if([...this.pending.keys()].some(key=>this.entries.get(key)?.link.repo===repository))break;
      if(new Set(this.pending.values()).size>=3)return;
      const batch=entries.slice(at,at+20),token={},read=this.factOrder.begin();
      for(const entry of batch) {entry.dirty=false;this.pending.set(entry.link.key,token);}
      const current=()=>this.serial===serial && this.shown() && this.currentContext()?.scope===scope;
      const member=entry=>current() && this.pending.get(entry.link.key)===token && this.entries.get(entry.link.key)===entry
        && this.currentContext()?.links.some(l=>taskPullLink(l.url)?.key===entry.link.key);
      cx.spawn(async view=>{
        let updated=false;
        const failed=async(entry,error)=>{
          if(!member(entry))return;
          if(quietRead(error)) {entry.dirty=true;retryRead(this,view,error,next=>this.pump(next));return;}
          if(missingTaskPull(error,entry.link.number)) {
            const published=this.factOrder.publish(read,entry.link.key,()=>null);
            if(published.accepted)rememberMissing(entry);else entry.dirty=true;
          } else {
            const failure=await repositoryFailure(exec,error,repository,{on:context.machine,current:()=>member(entry)},this.diagnostics);
            if(member(entry)) {missingPulls.delete(entry.link.key);entry.missing=false;entry.error=failure;}
          }
        };
        try {
          await Promise.resolve();if(!current())return;
          const results=await readTargetPulls(exec,batch.map(e=>e.link.number),repository,{on:context.machine,timeout:30000,current,manual:this.manualRead});
          for(const entry of batch) {
            if(!member(entry))continue;
            const result=results.get(entry.link.number);if(result.error) {await failed(entry,result.error);continue;}
            const value=result.row,key=entry.link.key;
            const published=this.factOrder.publish(read,key,()=>({...value,key,repo:repository}));
            if(!published.accepted) {entry.dirty=true;continue;}
            missingPulls.delete(key);entry.missing=false;entry.pr=published.value;
            const completedAt=Date.parse(value.mergedAt??value.closedAt??'');
            entry.completedAt=completedAt<=Date.now()?completedAt:NaN;entry.error=null;updated=true;
          }
        }catch(error){for(const entry of batch)await failed(entry,error);}
        finally {
          for(const entry of batch)if(this.pending.get(entry.link.key)===token)this.pending.delete(entry.link.key);
          if(this.serial===serial && this.shown())this.pump(view);
          if(!this.pending.size && ![...this.entries.values()].some(e=>e.dirty)) {this.diagnostics.clear();this.manualRead=null;}
          view.notify();
        }
        if(updated && current())this.onUpdate?.(view);
      });
    }
    if(!this.pending.size && ![...this.entries.values()].some(e=>e.dirty))this.manualRead=null;
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
