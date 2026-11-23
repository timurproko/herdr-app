// Explicit task context, never a fake Git working directory. No CI polling.
import { exec, run } from './host.js';
import { pluginPullContext, pluginEvent, sidebarPanelEnabled } from './plugins.js';
import { location } from './location.js';
import { PR_FIELDS, pullRow, pullFailure } from './pulls.js';
export function taskPullLink(url) {
  const match=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/([1-9]\d*)\/?$/.exec(url??'');
  const number=Number(match?.[2]);
  return match && !match[1].split('/').some(part=>part==='.' || part==='..') && Number.isSafeInteger(number) ? {repo:match[1].toLowerCase(),number,key:`${match[1].toLowerCase()}#${number}`,url:`https://github.com/${match[1]}/pull/${number}`} : null;
}
const HISTORY_MS = 24 * 60 * 60 * 1000;
export class AggregatePulls {
  constructor({shown,onUpdate}) {this.shown=shown;this.onUpdate=onUpdate;this.entries=new Map();this.pending=new Map();this.serial=0;}
  currentContext({presentation = false} = {}) {
    const context=sidebarPanelEnabled('changes') ? pluginPullContext(location().space,{presentation}) : null;
    return !presentation && context?.stale ? null : context;
  }
  sync(cx) {
    if(this.shown()) pluginEvent('workspace.context.refresh',{cx});
    const context=this.currentContext({presentation:true}), previous=this.context;
    if(context?.scope!==previous?.scope) {this.serial++;this.entries.clear();this.pending.clear();}
    this.context=context;
    if(!context) return false;
    if(context.stale) {
      if(!previous?.stale) {this.serial++;this.pending.clear();for(const entry of this.entries.values())entry.dirty=true;}
      // Retain only already-loaded same-home rows. Empty stale links are not
      // an authoritative deletion, nor permission to read or navigate.
      return true;
    }
    const links=new Map();
    for(const source of context.links) {const link=taskPullLink(source.url);if(!link)continue;const entry=links.get(link.key)??{...link,targets:[]};entry.targets.push({terminal:source.terminal,task:source.task,historical:source.historical===true});links.set(link.key,entry);}
    for(const key of this.entries.keys()) if(!links.has(key)) {this.entries.delete(key);this.pending.delete(key);}
    for(const [key,link]of links) {const old=this.entries.get(key);if(old)old.link=link;else this.entries.set(key,{link,dirty:true,pr:null,error:null});}
    if(!this.shown()) {this.serial++;this.pending.clear();for(const e of this.entries.values())e.dirty=true;}
    else this.pump(cx);
    return true;
  }
  stop() {this.serial++;this.context=null;this.entries.clear();this.pending.clear();}
  get busy() {return this.pending.size>0;}
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
    const messages=[...new Set(failed.map(e=>e.error.message))];
    const categories={cli:'GitHub CLI unavailable',transient:'local command failed or timed out',auth:'GitHub sign-in required',repository:'repository unavailable',access:'current GitHub account access',rate:'GitHub rate limit',response:'GitHub response error',unreachable:'GitHub connection failed',read:'PR read failed'};
    const message=messages.length===1 ? messages[0] : `Could not read some pull requests (${[...new Set(failed.map(e=>categories[e.error.kind]))].join('; ')}); refresh to retry`;
    return failed.every(e=>!e.pr && e.link.targets.every(t=>t.historical)) ? `Task PR history: ${message}` : message;
  }
  repositories() {
    const now=Date.now();
    return [...new Set([...this.entries.values()].filter(e=>!e.pr || this.eligible(e,now)).map(e=>e.link.repo))].sort();
  }
  counts() {return {open:this.rows('open').length,closed:this.rows('closed').length};}
  invalidate(repository=null) {for(const e of this.entries.values())if(!repository || e.link.repo===repository.toLowerCase())e.dirty=true;}
  refresh(cx) {pluginEvent('workspace.context.refresh',{cx,force:true});this.invalidate();this.pump(cx);}
  pump(cx) {
    if(!this.context || this.context.stale || !this.shown() || this.currentContext()?.scope!==this.context.scope)return;
    const context=this.context,serial=this.serial;
    for(const [key,entry]of this.entries) {
      if(this.pending.size>=3)break;
      if(!entry.dirty || this.pending.has(key))continue;
      entry.dirty=false;const token={};this.pending.set(key,token);
      const current=()=>this.serial===serial && this.shown() && this.currentContext()?.scope===context.scope && this.pending.get(key)===token && this.entries.get(key)===entry
        && this.currentContext()?.links.some(l=>taskPullLink(l.url)?.key===key);
      cx.spawn(async view=>{
        let updated=false;
        try {
          await Promise.resolve();if(!current())return;
          const result=await exec('gh',['pr','view',String(entry.link.number),'--repo',entry.link.repo,'--json',PR_FIELDS],{on:context.machine,timeout:30000});
          if(!current())return;
          if(result.code!==0 || result.timed_out || result.timedOut || result.signal) {entry.error=pullFailure(result);return;}
          const value=JSON.parse(result.stdout);
          if(value.number!==entry.link.number || taskPullLink(value.url)?.key!==key)throw Error('Pull request identity mismatch');
          entry.pr={...pullRow(value,entry.link.repo.split('/')[0]),key,repo:entry.link.repo};
          const completedAt=Date.parse(value.mergedAt??value.closedAt??'');
          entry.completedAt=completedAt<=Date.now()?completedAt:NaN;entry.error=null;updated=true;
        }catch(e){if(current())entry.error=pullFailure(e);}
        finally {
          if(this.pending.get(key)===token)this.pending.delete(key);
          if(this.serial===serial && this.shown())this.pump(view);
          view.notify();
        }
        // Presentation callback failures are not failed GitHub reads.
        if(updated && this.serial===serial && this.shown() && this.currentContext()?.scope===context.scope)this.onUpdate?.(view);
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
