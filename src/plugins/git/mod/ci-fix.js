// Opt-in, agent-neutral CI follow-up through Core's supported non-forced send.
// No A1 control API, raw keys, force, terminal creation or durable delivery queue.
import {exec,hc,agents,terminals,checking,notify} from './host.js';
import {CIFixHistory} from './ci-fix-history.js';
import {readyState,sendArgs,deliveryResult} from './ci-core-send.js';
import {eligiblePull,currentPull,failedRuns,currentRun,failureKey,fixPrompt,validRepository} from './ci-fix-model.js';
import {validCIMessage,CI_MESSAGE_RULES} from './plugins/git/ci-message.js';
import {rawCIState} from './plugins/git/ci-states.js';
import {pluginById,pluginSetting,sidebarPanelEnabled} from './plugins.js';
const app = record => record?.report?.app ?? record?.status?.app;
export function terminalIdentity(record,target) {
  if(!/^(?:[a-z0-9_-]{1,200}\/)?t[a-z0-9]+$/i.test(target.address??'')||record?.address!==target.address
      ||record?.state!=='live'||app(record)!==target.app||!target.app||!Number.isSafeInteger(record.created_ms)
      ||(record.pid!==null&&!Number.isSafeInteger(record.pid)))return null;
  return JSON.stringify([record.address,record.created_ms,record.pid,target.app,
    record.labels?.['a1.session']??null,record.labels?.['a1.runtime']??null]);
}
function targetReady(target,identity,states) {
  const terminal=terminals().find(t=>t.address===target.address);
  return agents().some(a=>a.address===target.address&&a.space===target.space&&a.tab===target.tab&&a.app===target.app)
    && terminalIdentity(terminal,target)===identity && readyState(rawCIState(terminal),states);
}
export class CIFix {
  constructor(enabled=()=>true,history=new CIFixHistory()) {
    this.enabled=()=>!checking()&&sidebarPanelEnabled('changes')&&pluginSetting(pluginById('git'),'autoFixCI')===true
      &&pluginSetting(pluginById('git'),'ciFixEnabled')!==false&&enabled();
    this.history=history;this.serial=0;this.examined=new Set();
  }
  stop() {
    if(this.active)this.serial++;
    this.active=false;this.scope=null;this.job=null;this.examined.clear();
  }
  sync(cx,options) {
    options={...options,template:pluginSetting(pluginById('git'),'ciFixMessage'),states:pluginSetting(pluginById('git'),'ciFixStates')};
    if(checking()||!this.enabled()||!validRepository(options.repo)||!options.links){this.stop();return;}
    const scope=JSON.stringify([options.repo.toLowerCase(),options.on,options.root,options.context,options.states]);
    if(scope!==this.scope){this.stop();this.scope=scope;this.serial++;}
    this.active=true;this.snapshot=options;
    if(this.revision!==options.revision){this.serial++;this.revision=options.revision;this.examined.clear();this.job=null;}
    if(!options.ready||this.job)return;
    if(!validCIMessage(options.template)) {
      if(this.badTemplate!==options.template){this.badTemplate=options.template;notify({title:'CI fix message needs attention',body:`Fix the message in Settings > Plugins > Git > Message. ${CI_MESSAGE_RULES}`,level:'warning'});}
      return;
    }
    this.badTemplate=null;
    for(const pr of options.prs.filter(eligiblePull)) {
      const target=options.links.related(pr,options.repo,options.preferred);
      if(!target)continue;
      const identity=terminalIdentity(terminals().find(t=>t.address===target.address),target);
      if(!identity||!targetReady(target,identity,options.states))continue;
      const key=JSON.stringify([pr.number,pr.headRefOid,target.key]);
      if(this.examined.has(key))continue;
      if(this.examined.size>=512)return;
      this.examined.add(key);
      const serial=this.serial,targetKey=target.key,deadline=Date.now()+60000,job={};this.job=job;
      const current=()=>Date.now()<deadline&&this.active&&this.serial===serial&&this.enabled()&&this.snapshot.ready
        &&this.snapshot.prs.some(p=>eligiblePull(p)&&p.number===pr.number&&p.headRefOid===pr.headRefOid)
        &&options.links.related(pr,options.repo,options.preferred)?.key===targetKey;
      cx.spawn(async cx=>{
        await Promise.resolve();
        try {await this.request(options,pr,target,identity,current);}
        catch {if(current())notify({title:'CI fix request skipped',body:'Could not verify CI, the linked agent, or local delivery history. No automatic retry until another CI update or Refresh.',level:'warning'});}
        finally {
          if(current()&&!targetReady(target,identity,options.states))this.examined.delete(key);
          if(this.job===job)this.job=null;cx.notify();
        }
      });
      break; // One preparation/delivery at a time; never flood a linked agent.
    }
  }
  async request(options,pr,target,identity,current) {
    const states=options.states??pluginSetting(pluginById('git'),'ciFixStates');
    const live=()=>current()&&JSON.stringify(pluginSetting(pluginById('git'),'ciFixStates'))===JSON.stringify(states)
      &&targetReady(target,identity,states);
    const gh=async endpoint=>{
      if(!live())return null;
      const result=await exec('gh',['api',endpoint],{cwd:options.root,on:options.on,timeout:15000});
      if(!live())return null;
      if(result.code!==0)throw Error('GitHub verification failed.');
      return result.stdout;
    };
    const prefix=`repos/${options.repo}`,pull=`${prefix}/pulls/${pr.number}`;
    const initial=await gh(pull);
    if(initial===null||!currentPull(initial,pr,options.repo))return;
    const listing=await gh(`${prefix}/actions/runs?head_sha=${pr.headRefOid}&per_page=100`);
    if(listing===null)return;
    const candidates=failedRuns(listing,pr,options.repo),runs=[];
    for(const run of candidates) {
      const verified=await gh(`${prefix}/actions/runs/${run.id}`);
      if(verified===null)return;
      if(currentRun(verified,run,options.repo))runs.push(run);
    }
    if(!runs.length||!live())return;
    // The robot link is a UI cache. Re-read the target's repo/footer/tab/branch
    // before an action; never substitute the currently focused terminal.
    if(!await options.links.confirm(target,pr,options.repo,live)||!live())return;
    const latest=await gh(pull);
    if(latest===null||!currentPull(latest,pr,options.repo))return;
    const record=await hc(['get',target.address,'--json']);
    if(!live()||record.code!==0)return;
    const terminal=JSON.parse(record.stdout),word=rawCIState(terminal);
    if(terminalIdentity(terminal,target)!==identity||!readyState(word,states))return;
    const fresh=await this.history.claim(runs.map(run=>failureKey(options.repo,pr,run)),live);
    if(!fresh.length)return;
    let submitted=false;
    try {
      if(!live())return;
      const selected=runs.filter(run=>fresh.includes(failureKey(options.repo,pr,run)));
      const message=fixPrompt(options.repo,pr,selected,options.template);
      // Claiming can await another writer: re-read the raw state and current
      // selection immediately before sending. Never force or inject raw keys.
      const final=await hc(['get',target.address,'--json']);
      let ready;try{ready=JSON.parse(final.stdout);}catch{}
      const state=rawCIState(ready);
      if(!live()||final.code!==0||terminalIdentity(ready,target)!==identity||!readyState(state,states))return;
      const args=sendArgs(target.address,message,state,states);
      let result;submitted=true;
      try{result=deliveryResult(await exec('hc',args,{timeout:15000}));}
      catch{result=deliveryResult(null);} // timeout/disconnect is unknown, never a safe retry
      let recorded=false;try{recorded=await this.history.finish(fresh,result.outcome);}catch{}
      if(!current())return;
      if(result.outcome==='delivered')notify({title:result.title,body:`${options.repo} #${pr.number} → ${target.app}`,level:result.started?'info':'warning'});
      else notify({title:result.title,body:result.reason+(result.outcome==='refused'&&!recorded?' Delivery history could not be released safely; check the agent before retrying.':''),level:'warning'});
    } finally {
      // A cancellation/readiness failure before starting Core proves no input.
      // The exact claim handle cannot release a newer request's receipt.
      if(!submitted)try{await this.history.finish(fresh,'refused');}catch{}
    }
  }
}
