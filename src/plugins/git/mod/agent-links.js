// Live, read-only PR -> agent links. No transcripts, terminal input or saved IDs.
import { agents, panes, spaces, terminals, exec, hc } from './host.js';
import * as host from './host.js';
import { paneDirectory } from './directory.js';
import { agentPullNumber, REPO_ARGS, repositoryRead } from './pulls.js';
import { namedPullNumber } from './location.js';

const TTL = 10000;
const repoKey = value => String(value ?? '').toLowerCase();
const displayName=agent=>typeof agent?.title==='string'&&agent.title.trim()?agent.title.trim():agent?.program?.name??null;
export function repositoryName(stdout) {
  try {
    const repo = JSON.parse(stdout);
    return /^[\w.-]+\/[\w.-]+$/.test(repo?.nameWithOwner ?? '') ? repoKey(repo.nameWithOwner) : null;
  } catch { return null; }
}

const machineOf=address=>address.includes('/')?address.split('/')[0]:null;
const connected=(on,snapshot)=>!on || Boolean((snapshot?.hosts??host.machines?.())?.some(m=>m.name===on && m.layout==='ready'));
export function crewMetadata(labels={}) {
  labels??={};
  const text=value=>typeof value==='string'?value.replace(/[\x00-\x1f\x7f]/g,' ').trim().slice(0,512):'';
  const round=typeof labels['crew.round']==='string' && /^[1-9]\d*$/.test(labels['crew.round'])?Number(labels['crew.round']):null;
  return {kind:labels['crew.kind'],pr:labels['crew.pr']??null,
    round:Number.isSafeInteger(round)&&round<Number.MAX_SAFE_INTEGER?round:null,
    finding:text(labels['crew.finding'])||null,
    approved:/^[a-f\d]{40,64}$/i.test(labels['crew.approved']??'')?labels['crew.approved']:null};
}
export function crewPull(url) {
  const match=/^https:\/\/github\.com\/([\w.-]+\/[\w.-]+)\/pull\/([1-9]\d*)\/?$/.exec(url??'');
  const number=Number(match?.[2]);
  return match && !match[1].split('/').some(p=>p==='.'||p==='..') && Number.isSafeInteger(number)?{repo:repoKey(match[1]),number}:null;
}

export function agentTargets(snapshot,select=()=>true) {
  const all = snapshot?.all??panes(), list = snapshot?.list??terminals(), groups = snapshot?.groups??spaces();
  return (snapshot?.liveAgents??agents()).flatMap(agent => {
    if(!select(agent.address))return [];
    const pane = all.find(p => p.terminal === agent.address && p.tab === agent.tab && !p.mod);
    const space = groups.find(s => s.id === agent.space);
    const tab = space?.tabs?.find(t => t.id === agent.tab);
    const {cwd} = paneDirectory(pane, list, null);
    const terminal=list.find(t=>t.address===agent.address);
    if (!pane || !tab || !cwd || (terminal?.state && terminal.state!=='live') || !connected(machineOf(agent.address),snapshot)) return [];
    const on = agent.address.includes('/') ? agent.address.split('/')[0] : null;
    const target = {address:agent.address, pane:pane.pane, space:agent.space, tab:agent.tab,
      app:agent.app, cwd, on, branch:pane.branch ?? null, number:namedPullNumber(tab),crewPr:crewPull(terminal?.labels?.['crew.pr'])};
    return [{...target, key:JSON.stringify(target), displayName:displayName(agent)}];
  });
}

export class AgentLinks {
  constructor(enabled = () => true) { this.enabled = enabled; this.entries = new Map(); this.pending = new Map(); this.repositories=new Map(); this.branchPresentations=new Map(); }

  presentationSnapshot() {
    return {all:panes(),list:terminals(),groups:spaces(),liveAgents:agents(),hosts:host.machines?.()??[]};
  }

  invalidate() {this.repositories.clear();for(const entry of this.entries.values())entry.at=0;}
  async repository(target, current=()=>true) {
    const key=JSON.stringify([target.on,target.cwd]),cached=this.repositories.get(key);
    const live=()=>this.enabled() && current() && this.repositories.get(key)===cached;
    // Effective Git routing is local IO, not a GitHub read. Include gh's
    // default-remote marker (also from inherited config), not just remote URLs.
    const config=await exec('git',['config','--get-regexp','^(remote\\..*\\.(url|pushurl|gh-resolved)|branch\\..*\\.(remote|merge))$'],{cwd:target.cwd,on:target.on,timeout:15000}).catch(()=>null);
    if(!live())return null;
    const fingerprint=config && [0,1].includes(config.code) && !config.signal && !config.timed_out ? config.stdout : null;
    if(fingerprint!=null && cached?.fingerprint===fingerprint)return cached.repo;
    const result=await repositoryRead(exec,REPO_ARGS,null,{cwd:target.cwd,on:target.on,timeout:15000,current:live});
    if(!live())return null;
    const repo=result.code===0?repositoryName(result.stdout):null;
    if(repo && fingerprint!=null)this.repositories.set(key,{fingerprint,repo});
    return repo;
  }

  // A full task URL identifies a PR, not the terminal's current directory.
  // Only an exact live target with a canonical folder lookup can seed entry.
  cachedRepository(place) {
    const target=agentTargets(undefined,address=>address===place.terminal).find(t=>t.cwd===place.cwd && (t.on??null)===(place.on??null));
    const entry=target && this.entries.get(target.address);
    const folder=target && this.repositories.get(JSON.stringify([target.on,target.cwd]));
    return entry && target && entry.key===target.key && folder?.repo===entry.canonicalRepo ? entry.canonicalRepo??null : null;
  }

  cachedAssociation(place,repo) {
    if(this.cachedRepository(place)!==repoKey(repo))return null;
    const target=agentTargets(undefined,address=>address===place.terminal).find(t=>t.cwd===place.cwd&&(t.on??null)===(place.on??null));
    const entry=target&&this.entries.get(target.address);
    return entry&&target&&entry.key===target.key&&Date.now()-entry.at<TTL?{number:entry.number??null,branch:entry.branch??null}:null;
  }

  forgetRepository(place) {
    // Replace the slot so an older in-flight lookup cannot repopulate it.
    this.repositories.set(JSON.stringify([place.on??null,place.cwd]),{});
    for(const entry of this.entries.values())if(entry.cwd===place.cwd && (entry.on??null)===(place.on??null))entry.canonicalRepo=null;
  }

  displayName(address,snapshot) {return displayName((snapshot?.liveAgents??agents()).find(agent=>agent.address===address));}

  liveTarget(address) {return agentTargets(undefined,value=>value===address)[0]??null;}

  pullNumber(address,repo) {
    const terminal=terminals().find(t=>t.address===address),crew=crewMetadata(terminal?.labels),link=crewPull(crew.pr);
    return terminal?.state==='live' && connected(machineOf(address)) && ['ship','fix','review'].includes(crew.kind)
      && link?.repo===repoKey(repo)?link.number:null;
  }

  rememberBranch(entry,snapshot) {
    const crew=crewMetadata((snapshot?.list??terminals()).find(t=>t.address===entry.address)?.labels);
    if(!entry.repo || !entry.branch || crew.pr!==null || !['ship','fix'].includes(crew.kind))return;
    // Bounded session-only explanation, never a replacement for live entries.
    this.branchPresentations.delete(entry.address);
    this.branchPresentations.set(entry.address,{key:entry.key,repo:entry.repo,branch:entry.branch,cwd:entry.cwd,
      pane:entry.pane,tab:entry.tab,space:entry.space,kind:crew.kind});
    while(this.branchPresentations.size>256)this.branchPresentations.delete(this.branchPresentations.keys().next().value);
  }

  refresh(cx, admit=()=>true, {snapshot, select=admit}={}) {
    if (!this.enabled()) return;
    // Enumeration may use this frame's pure membership projection. Every
    // continuation still calls fresh `admit` after yielding, never `select`.
    const targets = agentTargets(snapshot,select), keys = new Map(targets.map(t => [t.address,t.key]));
    for (const [address, entry] of this.entries) {
      if(keys.get(address)===entry.key)this.rememberBranch(entry,snapshot);
      else this.entries.delete(address);
    }
    for (const [address, request] of this.pending) if (keys.get(address) !== request.key) this.pending.delete(address);
    const due = targets.filter(t => !this.pending.has(t.address) && Date.now() - (this.entries.get(t.address)?.at ?? 0) >= TTL);
    if (!due.length) return;
    // Use the panel's own canonical GitHub lookup: gh handles SSH host aliases,
    // upstream/fork defaults and worktrees. Parsing origin URLs ourselves misses
    // aliases such as git@github-personal:owner/repo.git. Share one lookup per
    // machine/folder; footer reads remain session-specific, never history.
    const folders = new Map();
    for (const target of due) {
      const liveTarget=()=>agentTargets(undefined,address=>address===target.address).some(t=>t.key===target.key);
      const request = {key:target.key};
      this.pending.set(target.address,request);
      cx.spawn(async cx => {
        try {
          await Promise.resolve();
          if(!this.enabled() || !admit(target.address))return;
          if(target.crewPr) {
            const canonicalRepo=await this.repository(target,()=>admit(target.address)&&liveTarget()).catch(()=>null);
            if(this.enabled() && admit(target.address) && this.pending.get(target.address)===request && liveTarget())this.entries.set(target.address,{...target,repo:target.crewPr.repo,canonicalRepo,number:target.crewPr.number,at:Date.now()});
            return;
          }
          const folder = JSON.stringify([target.on,target.cwd]);
          if (!folders.has(folder)) folders.set(folder,
            this.repository(target,()=>admit(target.address)&&liveTarget()).catch(() => null));
          const repo = await folders.get(folder);
          if (!this.enabled() || !admit(target.address) || !liveTarget()) return;
          let number = target.number;
          if (repo && ['a1','claude-code'].includes(target.app)) {
            const screen = await hc(['read',target.address,'--json','--lines','0']).catch(() => null);
            number = (screen?.code === 0 ? agentPullNumber(screen.stdout, target.app) : null) ?? number;
          }
          if (!this.enabled() || !admit(target.address) || this.pending.get(target.address) !== request || !liveTarget()) return;
          const entry={...target,repo,canonicalRepo:repo,number,at:Date.now()};
          this.entries.set(target.address,entry);this.rememberBranch(entry);
        } finally {
          if (this.pending.get(target.address) === request) this.pending.delete(target.address);
          cx.notify();
        }
      });
    }
  }

  // Fresh action-time verification. Matching stays identical to the robot link,
  // including non-A1 agents linked through explicit tab names or live branches.
  async confirm(target, pr, repo, current = () => true) {
    const live=()=>this.enabled()&&current()&&agentTargets(undefined,address=>address===target.address).some(t=>t.key===target.key);
    if(!live())return false;
    const result=await repositoryRead(exec,REPO_ARGS,null,{cwd:target.cwd,on:target.on,timeout:15000,current:live}).catch(()=>null);
    if(!live()||!result||result.code!==0||repositoryName(result.stdout)!==repoKey(repo))return false;
    if(target.crewPr)return live() && target.crewPr.repo===repoKey(repo) && target.crewPr.number===pr.number;
    let number=target.number;
    if(['a1','claude-code'].includes(target.app)) {
      const screen=await hc(['read',target.address,'--json','--lines','0']);
      if(!live()||screen.code!==0)return false;
      number=agentPullNumber(screen.stdout,target.app)??number;
    }
    return live()&&(number!=null?number===pr.number:Boolean(pr.headRefName&&target.branch===pr.headRefName));
  }

  // Role links use terminal labels directly, including an ended terminal's
  // labels for explanation only. No IO, history, saved IDs or inferred reviewer
  // branch/footer links. `admit` lets the verified aggregate constrain membership.
  roleMatches(pr, repo, preferred, role, admit=()=>true, snapshot) {
    if(!this.enabled() || !['build','review'].includes(role))return [];
    const all=snapshot?.all??panes(),groups=snapshot?.groups??spaces(),liveAgents=snapshot?.liveAgents??agents(),list=snapshot?.list??terminals();let generic;
    if(snapshot && !snapshot.roles) {
      snapshot.crews??=new Map();
      const exact=new Map(),unlinked=[];
      for(const terminal of list) {
        const value=terminal.labels?.['crew.kind'],kind=value==='review'?'review':['ship','fix'].includes(value)?'build':null;
        if(!kind)continue;
        const crew=crewMetadata(terminal.labels);snapshot.crews.set(terminal,crew);
        const link=crewPull(crew.pr);
        if(link) {const key=`${kind}:${link.repo}#${link.number}`,bucket=exact.get(key)??[];bucket.push(terminal);exact.set(key,bucket);}
        else if(kind==='build' && crew.pr===null)unlinked.push(terminal);
      }
      snapshot.roles={exact,unlinked};
    }
    const candidates=snapshot?[...(snapshot.roles.exact.get(`${role}:${repoKey(repo)}#${pr.number}`)??[]),...(role==='build'?snapshot.roles.unlinked:[])]:list;
    const matches=candidates.flatMap(terminal=>{
      if(!admit(terminal.address))return [];
      const crew=snapshot?(snapshot.crews??=new Map(list.map(t=>[t,crewMetadata(t.labels)]))).get(terminal):crewMetadata(terminal.labels);
      if(!(role==='review'?crew.kind==='review':['ship','fix'].includes(crew.kind)))return [];
      const explicit=crew.pr!==null,link=crewPull(crew.pr),entry=this.entries.get(terminal.address);
      const exact=Boolean(link && link.repo===repoKey(repo) && link.number===pr.number);
      if(explicit&&!exact || role==='review'&&!explicit)return [];
      const agent=liveAgents.find(a=>a.address===terminal.address),pane=all.find(p=>p.terminal===terminal.address&&!p.mod&&(!agent||p.tab===agent.tab));
      const space=groups.find(s=>s.tabs?.some(t=>t.id===pane?.tab)),tab=space?.tabs?.find(t=>t.id===pane?.tab);
      // Explicit role links need no folder resolution or all-agent directory
      // scan. Only an unlabelled build branch needs the legacy repository cache.
      const current=!explicit&&role==='build'?(generic??=(snapshot?(snapshot.targetMap??=new Map(agentTargets(snapshot).map(t=>[t.address,t]))):new Map(agentTargets().map(t=>[t.address,t])))).get(terminal.address):null;
      const on=machineOf(terminal.address),availability=!connected(on,snapshot)?'disconnected':terminal.state && terminal.state!=='live'?'ended':agent&&pane&&tab&&agent.space===space.id?'live':'unavailable';
      const saved=this.branchPresentations.get(terminal.address);
      // Only an ended/offline terminal may borrow its verified old branch for
      // disabled presentation. A live/reconnected or moved target must earn a
      // fresh live entry; explicit PR labels and review roles never borrow it.
      const remembered=!current && ['ended','disconnected'].includes(availability) && saved?.kind===crew.kind
        && (!pane || pane.pane===saved.pane && pane.tab===saved.tab && pane.branch===saved.branch)
        && (!space || space.id===saved.space) && (!pane || paneDirectory(pane,list,null).cwd===saved.cwd)?saved:null;
      const branchEntry=current && entry?.key===current.key?entry:remembered;
      if(explicit?!exact:role==='review'||!branchEntry||branchEntry.repo!==repoKey(repo)||!pr.headRefName||branchEntry.branch!==pr.headRefName)return [];
      const target={address:terminal.address,on,pane:pane?.pane??null,tab:tab?.id??null,space:space?.id??null,
        cwd:current?.cwd??paneDirectory(pane,list,null).cwd,branch:pane?.branch??null,crew};
      return [{...target,key:JSON.stringify(target),exact,availability,displayName:displayName(agent)}];
    });
    matches.sort((a,b)=>Number(b.availability==='live')-Number(a.availability==='live') || Number(b.exact)-Number(a.exact) || Number(b.address===preferred)-Number(a.address===preferred));
    return matches;
  }

  related(pr, repo, preferred = null, role = null, admit, snapshot) {
    if(role)return this.roleMatches(pr,repo,preferred,role,admit,snapshot)[0]??null;
    const matches = (snapshot?(snapshot.targets??=agentTargets(snapshot)):agentTargets()).flatMap(target => {
      const entry = this.entries.get(target.address);
      if (!entry || entry.key !== target.key || !entry.repo || entry.repo !== repoKey(repo)) return [];
      // Explicit session/tab links outrank the parent shell's branch. A stale
      // develop branch must never attach this agent to a different PR as well.
      const exact = entry.number != null;
      if (!(exact ? entry.number === pr.number : Boolean(pr.headRefName && entry.branch === pr.headRefName))) return [];
      return [{...target,exact}];
    });
    matches.sort((a,b) => Number(b.exact)-Number(a.exact) || Number(b.address === preferred)-Number(a.address === preferred));
    return matches[0] ?? null;
  }
}
