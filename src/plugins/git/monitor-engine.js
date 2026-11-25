// Core-side logic: no desktop, sockets, credentials, timers or durable jobs here.
import {agentPullNumber} from './ci-footer.js';
import {validRepository,validHead,currentPull,failedRuns,workflowStillRunning,currentRun,failureKey,fixPrompt,conflictingPull,conflictKey,conflictFiles,conflictPrompt,mergedPull,mergedKey,mergedPrompt} from './ci-evidence.js';
import {rawCIState} from './ci-states.js';
import {sendArgs,deliveryResult} from './ci-delivery.js';
import {validateConfig,localIdentity,targetReady,targetKey,ciMessagesOn,conflictMessagesOn,mergedMessagesOn} from './monitor-policy.js';
// Where the agent works, ranked like the panel's paneDirectory: Core's cwd is where the
// launching shell started (often home), not the agent's project. Prefer the agent's own
// fresh project report, then the shell-reported folder. Paths are hints for git/gh only.
const folder = value => typeof value === 'string' && value.length <= 4096 && !/[\x00-\x1f\x7f-\x9f\u2028\u2029]/u.test(value)
  && /^(?:[A-Za-z]:[\\/]|\/|\\\\[^\\]+\\[^\\]+)/u.test(value) ? value : null;
const fresh = (value, now) => typeof value === 'string' && /^\d{1,16}$/.test(value) && now - Number(value) >= -5000 && now - Number(value) < 90000;
export function projectFolder(terminal, app, now) {
  const labels = terminal?.labels ?? {};
  const session = labels['custom.claude.session'];
  const claude = ['claude-code','claude'].includes(app) && typeof session === 'string' && session.length > 0 && session.length <= 256
    && !/[\x00-\x20\x7f-\x9f\u2028\u2029]/u.test(session) && fresh(labels['custom.claude.at'], now) ? folder(labels['custom.claude.cwd']) : null;
  return claude ?? folder(labels['custom.cwd']) ?? folder(terminal?.cwd);
}
// Several agents can show the same PR (a helper opened later to test it). The oldest one
// claiming it owns it: that's the agent that has been working on the PR.
// The PR an agent was last seen on, kept as labels on its terminal (see lookup).
export const LINK_REPOSITORY='custom.ci.link.repository',LINK_PR='custom.ci.link.pr';
export function prOwners(targets) {
  const owners=new Map();
  for(const t of targets){
    const key=targetKey(t),best=owners.get(key),age=x=>x.terminal.created_ms;
    if(!best||age(t)<age(best)||(age(t)===age(best)&&t.address<best.address))owners.set(key,t);
  }
  return owners;
}
// The owner is remembered (repo#pr -> {address, created}) so it keeps the PR while it lives,
// even when its footer can't be read for a moment: a later agent never takes over. Ownership
// moves on only when the owner is gone, is no longer an agent, or now shows another PR.
export const OWNER_LIMIT=64;
export function validOwners(value){
  const out={};
  if(!value||typeof value!=='object'||Array.isArray(value))return out;
  for(const [key,o] of Object.entries(value).slice(-OWNER_LIMIT))
    if(/^[\w.-]+\/[\w.-]+#[1-9]\d{0,9}$/.test(key)&&/^t[a-z0-9]+$/i.test(o?.address??'')&&Number.isSafeInteger(o.created))out[key]={address:o.address,created:o.created};
  return out;
}
export function memoryOwners(){let value={};return {read:()=>value,write:v=>{value=v;}};}
export class CoreCIMonitor {
  constructor({run,config,journal,owners=memoryOwners(),report=()=>{},now=Date.now}){Object.assign(this,{run,config,journal,owners,report,now});this.verificationFailures=0;}
  emit(event){try{this.report(event);}catch{/* Diagnostic sinks cannot change delivery. */}}
  decision(target,reason,kind='ci',event='suppressed'){
    this.lastDecision={event,reason};
    this.emit({event,reason,kind,address:target?.address??null,repository:target?.repo??null,pr:target?.number??null});
    return false;
  }
  async alive(c,kept){
    try{
      const t=JSON.parse(await this.core(c,['get',kept.address,'--json']));
      return t?.state==='live'&&t.created_ms===kept.created&&Boolean(t.report?.app??t.status?.app);
    }catch{return false;}
  }
  // repo#pr -> the target to send to, or null while the remembered owner lives but can't be read.
  async resolveOwners(c,targets){
    const memory=validOwners(await this.owners.read()),next={},result=new Map(),oldest=prOwners(targets);
    const same=kept=>t=>t.address===kept.address&&t.terminal.created_ms===kept.created;
    for(const key of new Set([...Object.keys(memory),...oldest.keys()])){
      const kept=memory[key];
      if(kept){
        const found=targets.find(same(kept));
        if(found&&targetKey(found)===key){result.set(key,found);next[key]=kept;continue;}
        if(!found&&await this.alive(c,kept)){result.set(key,null);next[key]=kept;continue;}
      }
      const o=oldest.get(key);
      if(o){result.set(key,o);next[key]={address:o.address,created:o.terminal.created_ms};}
    }
    if(JSON.stringify(next)!==JSON.stringify(memory))await this.owners.write(validOwners(next));
    return result;
  }
  async command(c,command,args,cwd){const r=await this.run(c.commands[command],args,{cwd,timeout:15000});if(r.code!==0)throw Error('Command unavailable');return r.stdout;}
  async core(c,args){return this.command(c,'hc',args);}
  async gh(c,args,cwd){return this.command(c,'gh',args,cwd);}
  async lookup(c,address) {
    const terminal=JSON.parse(await this.core(c,['get',address,'--json'])),identity=localIdentity(terminal);
    if(!identity)return null;
    const app=terminal.report?.app??terminal.status?.app,cwd=projectFolder(terminal,app,this.now());
    if(!cwd)return null;
    const checkout=await this.run(c.commands.git,['rev-parse','--is-inside-work-tree'],{cwd,timeout:5000});
    if(checkout.code!==0||checkout.stdout.trim()!=='true')return null;
    const repo=JSON.parse(await this.gh(c,['repo','view','--json','nameWithOwner'],cwd))?.nameWithOwner;
    if(!validRepository(repo)||!c.repositories.some(r=>r.toLowerCase()===repo.toLowerCase()))return null;
    const labels=terminal.labels??{},explicit=labels['custom.ci.pr'];let number=null,branch=null;
    // The PR this agent was last seen on: once its footer or branch stops naming it (merged,
    // branch deleted), the same agent is still reached for that PR's last message.
    const linked=/^[1-9]\d{0,9}$/.test(labels[LINK_PR]??'')&&labels[LINK_REPOSITORY]?.toLowerCase()===repo.toLowerCase()?Number(labels[LINK_PR]):null;
    if(explicit!==undefined){
      if(!/^[1-9]\d{0,9}$/.test(explicit)||labels['custom.ci.repository']?.toLowerCase()!==repo.toLowerCase())return null;
      number=Number(explicit);
    } else if(['a1','claude-code'].includes(app)) {
      number=agentPullNumber(await this.core(c,['read',address,'--json','--lines','0']),app);
      // Session worktrees can differ from their parent shell. No shell-branch
      // fallback when a session-owned footer cannot prove its PR.
      if(!number&&!linked)return null;
    } else {
      branch=(await this.command(c,'git',['branch','--show-current'],cwd)).trim();
      if(branch&&!['main','master','develop'].includes(branch)&&!/[\u0000-\u001f]/.test(branch)&&branch.length<=200){
        const prs=JSON.parse(await this.gh(c,['pr','list','--repo',repo,'--state','open','--head',branch,'--limit','2','--json','number'],cwd));
        if(Array.isArray(prs)&&prs.length===1&&Number.isSafeInteger(prs[0].number)&&prs[0].number>0)number=prs[0].number;
      }
      if(!number&&!linked)return null;
      if(!number)branch=null;
    }
    if(!number)number=linked;
    else if(explicit===undefined&&number!==linked)await this.link(c,address,repo,number);
    return {address,identity,repo,number,cwd,branch,terminal,binding:JSON.stringify([identity,repo.toLowerCase(),number,branch])};
  }
  // Remember on the agent's own terminal which PR it works on (gone with the terminal).
  async link(c,address,repo,number){
    try{await this.core(c,['label',address,`${LINK_REPOSITORY}=${repo}`,`${LINK_PR}=${number}`]);}
    catch{this.emit({event:'link-failed',address});}
  }
  async inventory(c) {
    const listed=JSON.parse(await this.core(c,['ls','--json']));
    if(!Array.isArray(listed.terminals))throw Error('Incomplete Core inventory');
    const locals=listed.terminals.filter(t=>/^t[a-z0-9]+$/i.test(t.address??'')&&t.state==='live'&&t.status);
    if(locals.length>64)throw Error('Core inventory limit exceeded');
    const targets=[];
    for(const t of locals){try{const found=await this.lookup(c,t.address);if(found)targets.push(found);}catch{this.verificationFailures++;this.emit({event:'agent-unverified',reason:'verification-failed',address:t.address});}}
    // Unrelated/unreadable agents cannot authorize a send, but must not prevent
    // a separately verified target from receiving its own PR's deduplicated request.
    return targets;
  }
  async cycle({send=true}={}) {
    const c=validateConfig(await this.config());
    const status=JSON.parse(await this.core(c,['server','status','--json']));
    if(status.core?.id!==c.coreId)throw Error('Core identity changed');
    this.verificationFailures=0;
    if(!c.enabled)return {enabled:false,targets:0,attempts:0,health:'paused',reason:'disabled'};
    if(!c.repositories.length){this.decision(null,'no-monitored-repositories');return {enabled:true,targets:0,attempts:0,health:'suppressed',reason:'no-monitored-repositories'};}
    const targets=await this.inventory(c),owners=await this.resolveOwners(c,targets);
    let attempts=0,delivered=0,unknown=0,suppressed=0;const reasons={};
    for(const target of targets){
      this.lastDecision=null;
      if(owners.get(targetKey(target))!==target)this.decision(target,'not-owner');
      else if(!targetReady(target.terminal,c))this.decision(target,'agent-state-not-selected');
      else try{
        if(await this.request(c,target,send))attempts++;
        if(!this.lastDecision)this.decision(target,'no-action');
      }catch{this.verificationFailures++;this.decision(target,'verification-failed','ci','verification-failed');}
      const d=this.lastDecision;
      if(d.event==='delivered')delivered++;else if(d.event==='unknown')unknown++;else suppressed++;
      reasons[d.reason]=(reasons[d.reason]??0)+1;
    }
    if(!targets.length){this.decision(null,'no-verified-targets');reasons['no-verified-targets']=1;}
    const health=this.verificationFailures?'unavailable':unknown?'uncertain':delivered?'ready':'suppressed';
    const reason=this.verificationFailures?'verification-failed':unknown?'unknown':delivered?'delivered':Object.keys(reasons).length===1?Object.keys(reasons)[0]:'all-candidates-skipped';
    return {enabled:true,targets:targets.length,attempts,delivered,unknown,suppressed,health,reason,reasons};
  }
  async stillOwner(c,target,live,kind='ci'){
    const owner=(await this.resolveOwners(c,await this.inventory(c))).get(targetKey(target));
    if(!owner||owner.address!==target.address||owner.binding!==target.binding)return this.decision(target,'target-changed',kind);
    if(!targetReady(owner.terminal,c))return this.decision(target,'agent-state-not-selected',kind);
    if(!await live())return this.decision(target,'target-changed',kind);
    return true;
  }
  async request(c,target,send) {
    const deadline=this.now()+90000;
    const live=async()=>{const next=validateConfig(await this.config());return this.now()<deadline&&next.enabled&&next.revision===c.revision;};
    const api=async suffix=>{if(!await live())throw Error('Configuration changed');return this.gh(c,['api',`repos/${target.repo}/${suffix}`],target.cwd);};
    const raw=JSON.parse(await api(`pulls/${target.number}`));
    if(mergedPull(raw,target.repo))return mergedMessagesOn(c)?(await this.merged(c,target,send,raw,live,api))===true:false;
    if(raw.state!=='open'||!validHead(raw.head?.sha))return false;
    // Conflicts first: CI on a branch that can't merge is rarely the thing to fix, and one
    // message per cycle keeps the agent from getting two requests back to back.
    // Already asked about these conflicts (null): CI is checked as usual.
    if(conflictMessagesOn(c)&&conflictingPull(raw,target.repo)){const sent=await this.conflict(c,target,send,raw,live,api);if(sent!==null)return sent;}
    if(!ciMessagesOn(c))return false;
    const pr={number:target.number,state:raw.draft?'draft':'open',headRefOid:raw.head.sha,checks:{bad:1}};
    if(!currentPull(JSON.stringify(raw),pr,target.repo))return false;
    const endpoint=`actions/runs?head_sha=${pr.headRefOid}&per_page=100`;
    const evidence=await api(endpoint),runs=failedRuns(evidence,pr,target.repo);
    if(!runs.length)return this.decision(target,workflowStillRunning(evidence,pr,target.repo)?'workflow-still-running':'no-failed-workflows');
    for(const run of runs)if(!currentRun(await api(`actions/runs/${run.id}`),run,target.repo))return false;
    if(!await this.stillOwner(c,target,live))return false;
    if(!currentPull(await api(`pulls/${pr.number}`),pr,target.repo))return false;
    const latest=failedRuns(await api(endpoint),pr,target.repo);
    if(JSON.stringify(latest)!==JSON.stringify(runs)||!await live())return false;
    if(!send)return this.decision(target,'dry-run','ci','would-request');
    return this.deliver(c,target,live,runs.map(run=>failureKey(target.repo,pr,run)),
      keys=>fixPrompt(target.repo,pr,runs.filter(run=>keys.includes(failureKey(target.repo,pr,run))),c.template));
  }
  // The agent's PR can't merge: list the conflicting files in its own checkout (objects only:
  // no ref, index or working-tree change), recheck everything, then send once per head/base.
  async conflict(c,target,send,raw,live,api) {
    const head=raw.head.sha.toLowerCase(),branch=raw.base.ref;
    const base=JSON.parse(await api(`git/ref/heads/${branch}`))?.object?.sha;
    if(!validHead(base))return false;
    const key=conflictKey(target.repo,target.number,head,base);
    if(this.journal.has&&await this.journal.has(key)){this.decision(target,'already-sent','conflict');return null;} // Recorded, not necessarily acknowledged: skip the git work
    let files=null;
    const fetched=await this.run(c.commands.git,['fetch','--quiet','--no-tags','--no-write-fetch-head','origin',base,head],{cwd:target.cwd,timeout:45000});
    if(fetched.code===0){
      const merged=await this.run(c.commands.git,['merge-tree','--write-tree','--name-only','--no-messages',base,head],{cwd:target.cwd,timeout:20000});
      if(merged.code===0)return false; // merges cleanly here: GitHub's answer is stale
      if(merged.code===1)files=conflictFiles(merged.stdout);
    }
    if(!await this.stillOwner(c,target,live,'conflict'))return false;
    const again=JSON.parse(await api(`pulls/${target.number}`));
    if(!conflictingPull(again,target.repo)||again.head.sha.toLowerCase()!==head||again.base.ref!==branch||!await live())return false;
    if(!send)return this.decision(target,'dry-run','conflict','would-request');
    return this.deliver(c,target,live,[key],()=>conflictPrompt(target.repo,target.number,{head,base:branch,files},c.conflictTemplate),'conflict');
  }
  // The agent's PR was merged: tell it once, so it cleans up its worktree.
  async merged(c,target,send,raw,live,api) {
    const key=mergedKey(target.repo,target.number);
    if(this.journal.has&&await this.journal.has(key)){this.decision(target,'already-sent','merged');return null;}
    if(!await this.stillOwner(c,target,live,'merged'))return false;
    if(!send)return this.decision(target,'dry-run','merged','would-request');
    return this.deliver(c,target,live,[key],()=>mergedPrompt(target.repo,target.number,{base:raw.base.ref,branch:raw.head?.ref},c.mergedTemplate),'merged');
  }
  // Claim the keys, re-read the agent right before typing, send without force, record the outcome.
  async deliver(c,target,live,keys,message,kind='ci') {
    const claim=await this.journal.claim(keys);
    if(!claim.keys.length){this.decision(target,'already-sent',kind);return null;} // Recorded receipts also include attempted/unknown submissions
    let submitted=false;
    try{
      const final=JSON.parse(await this.core(c,['get',target.address,'--json']));
      if(localIdentity(final)!==target.identity||!await live())return this.decision(target,'target-changed',kind);
      if(!targetReady(final,c))return this.decision(target,'agent-state-not-selected',kind);
      const args=sendArgs(target.address,message(claim.keys),rawCIState(final),c.states);
      submitted=true;let result;
      try{result=deliveryResult(await this.run(c.commands.hc,args,{timeout:15000}));}catch{result=deliveryResult(null);}
      await this.journal.finish(claim,result.outcome);
      this.decision(target,result.outcome,kind,result.outcome);return true;
    }finally{if(!submitted)await this.journal.finish(claim,'refused');}
  }
}
