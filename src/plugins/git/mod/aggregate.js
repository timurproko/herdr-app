// Explicit task context, never a fake Git working directory. No CI polling.
import { exec, run } from './host.js';
import { pluginPullContext, pluginEvent, sidebarPanelEnabled } from './plugins.js';
import { location } from './location.js';
import { PR_FIELDS, pullRow, pullError } from './pulls.js';
export function taskPullLink(url) {
  const match=/^https:\/\/github\.com\/([A-Za-z0-9_.-]+\/[A-Za-z0-9_.-]+)\/pull\/([1-9]\d*)\/?$/.exec(url??'');
  const number=Number(match?.[2]);
  return match && !match[1].split('/').some(part=>part==='.' || part==='..') && Number.isSafeInteger(number) ? {repo:match[1].toLowerCase(),number,key:`${match[1].toLowerCase()}#${number}`,url:`https://github.com/${match[1]}/pull/${number}`} : null;
}
export class AggregatePulls {
  constructor({shown,onUpdate}) {this.shown=shown;this.onUpdate=onUpdate;this.entries=new Map();this.pending=new Map();this.serial=0;}
  currentContext() {return sidebarPanelEnabled('changes') ? pluginPullContext(location().space) : null;}
  sync(cx) {
    if(this.shown()) pluginEvent('workspace.context.refresh',{cx});
    const context=this.currentContext();
    if(context?.scope!==this.context?.scope) {this.serial++;this.entries.clear();this.pending.clear();}
    this.context=context;
    if(!context) return false;
    const links=new Map();
    for(const source of context.links) {const link=taskPullLink(source.url);if(!link)continue;const entry=links.get(link.key)??{...link,targets:[]};entry.targets.push({terminal:source.terminal,task:source.task});links.set(link.key,entry);}
    for(const key of this.entries.keys()) if(!links.has(key)) {this.entries.delete(key);this.pending.delete(key);}
    for(const [key,link]of links) {const old=this.entries.get(key);if(old)old.link=link;else this.entries.set(key,{link,dirty:true,pr:null,error:null});}
    if(!this.shown()) {this.serial++;this.pending.clear();for(const e of this.entries.values())e.dirty=true;}
    else this.pump(cx);
    return true;
  }
  stop() {this.serial++;this.context=null;this.entries.clear();this.pending.clear();}
  get busy() {return this.pending.size>0;}
  rows(state) {return [...this.entries.values()].flatMap(e=>e.pr && (state==='open'?['open','draft']:['closed','merged']).includes(e.pr.state)?[e.pr]:[]);}
  counts() {return {open:this.rows('open').length,closed:this.rows('closed').length};}
  invalidate(repository=null) {for(const e of this.entries.values())if(!repository || e.link.repo===repository.toLowerCase())e.dirty=true;}
  refresh(cx) {pluginEvent('workspace.context.refresh',{cx,force:true});this.invalidate();this.pump(cx);}
  pump(cx) {
    if(!this.context || !this.shown() || this.currentContext()?.scope!==this.context.scope)return;
    const context=this.context,serial=this.serial;
    for(const [key,entry]of this.entries) {
      if(this.pending.size>=3)break;
      if(!entry.dirty || this.pending.has(key))continue;
      entry.dirty=false;const token={};this.pending.set(key,token);
      const current=()=>this.serial===serial && this.shown() && this.currentContext()?.scope===context.scope && this.pending.get(key)===token && this.entries.get(key)===entry
        && this.currentContext()?.links.some(l=>taskPullLink(l.url)?.key===key);
      cx.spawn(async view=>{
        try {
          await Promise.resolve();if(!current())return;
          const result=await exec('gh',['pr','view',String(entry.link.number),'--repo',entry.link.repo,'--json',PR_FIELDS],{on:context.machine,timeout:30000});
          if(!current())return;
          if(result.code!==0)throw Error(pullError('',result.stderr));
          const value=JSON.parse(result.stdout);
          if(value.number!==entry.link.number || taskPullLink(value.url)?.key!==key)throw Error('Pull request identity mismatch');
          entry.pr={...pullRow(value,entry.link.repo.split('/')[0]),key,repo:entry.link.repo};entry.error=null;this.onUpdate?.(view);
        }catch(e){if(current())entry.error=pullError(e);}
        finally {
          if(this.pending.get(key)===token)this.pending.delete(key);
          if(this.serial===serial && this.shown())this.pump(view);
          view.notify();
        }
      });
    }
  }
  target(pr) {
    const context=this.currentContext();if(context?.scope!==this.context?.scope)return null;
    const matches=context.links.filter(l=>taskPullLink(l.url)?.key===pr.key);
    return matches.find(l=>l.terminal===location().terminal)??matches[0]??null;
  }
  focus(pr,target,scope) {
    if(!this.shown() || this.currentContext()?.scope!==scope)return;
    if(this.currentContext().links.some(l=>l.terminal===target.terminal && l.task===target.task && taskPullLink(l.url)?.key===pr.key))run('agent.focus',{terminal:target.terminal});
  }
}
