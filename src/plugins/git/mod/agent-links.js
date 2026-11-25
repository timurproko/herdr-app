// Live, read-only PR -> agent links. No transcripts, terminal input or saved IDs.
import { agents, panes, spaces, terminals, exec, hc } from './host.js';
import { paneDirectory } from './directory.js';
import { agentPullNumber, REPO_ARGS, repositoryRead } from './pulls.js';
import { namedPullNumber } from './location.js';

const TTL = 10000;
const repoKey = value => String(value ?? '').toLowerCase();
export function repositoryName(stdout) {
  try {
    const repo = JSON.parse(stdout);
    return /^[\w.-]+\/[\w.-]+$/.test(repo?.nameWithOwner ?? '') ? repoKey(repo.nameWithOwner) : null;
  } catch { return null; }
}

export function agentTargets() {
  const all = panes(), list = terminals(), groups = spaces();
  return agents().flatMap(agent => {
    const pane = all.find(p => p.terminal === agent.address && p.tab === agent.tab && !p.mod);
    const space = groups.find(s => s.id === agent.space);
    const tab = space?.tabs?.find(t => t.id === agent.tab);
    const {cwd} = paneDirectory(pane, list, null);
    if (!pane || !tab || !cwd) return [];
    const on = agent.address.includes('/') ? agent.address.split('/')[0] : null;
    const target = {address:agent.address, pane:pane.pane, space:agent.space, tab:agent.tab,
      app:agent.app, cwd, on, branch:pane.branch ?? null, number:namedPullNumber(tab)};
    return [{...target, key:JSON.stringify(target)}];
  });
}

export class AgentLinks {
  constructor(enabled = () => true) { this.enabled = enabled; this.entries = new Map(); this.pending = new Map(); this.repositories=new Map(); }

  invalidate() {this.repositories.clear();for(const entry of this.entries.values())entry.at=0;}
  async repository(target) {
    const key=JSON.stringify([target.on,target.cwd]);
    // Effective Git routing is local IO, not a GitHub read. Include gh's
    // default-remote marker (also from inherited config), not just remote URLs.
    const config=await exec('git',['config','--get-regexp','^(remote\\..*\\.(url|pushurl|gh-resolved)|branch\\..*\\.(remote|merge))$'],{cwd:target.cwd,on:target.on,timeout:15000}).catch(()=>null);
    if(!this.enabled())return null;
    const fingerprint=config && [0,1].includes(config.code) && !config.signal && !config.timed_out ? config.stdout : null;
    const cached=this.repositories.get(key);
    if(fingerprint!=null && cached?.fingerprint===fingerprint)return cached.repo;
    const result=await repositoryRead(exec,REPO_ARGS,null,{cwd:target.cwd,on:target.on,timeout:15000,current:()=>this.enabled()});
    const repo=result.code===0?repositoryName(result.stdout):null;
    if(repo && fingerprint!=null)this.repositories.set(key,{fingerprint,repo});
    return repo;
  }

  refresh(cx) {
    if (!this.enabled()) return;
    const targets = agentTargets(), keys = new Map(targets.map(t => [t.address,t.key]));
    for (const [address, entry] of this.entries) if (keys.get(address) !== entry.key) this.entries.delete(address);
    for (const [address, request] of this.pending) if (keys.get(address) !== request.key) this.pending.delete(address);
    const due = targets.filter(t => !this.pending.has(t.address) && Date.now() - (this.entries.get(t.address)?.at ?? 0) >= TTL);
    if (!due.length) return;
    // Use the panel's own canonical GitHub lookup: gh handles SSH host aliases,
    // upstream/fork defaults and worktrees. Parsing origin URLs ourselves misses
    // aliases such as git@github-personal:owner/repo.git. Share one lookup per
    // machine/folder; footer reads remain session-specific, never history.
    const folders = new Map();
    for (const target of due) {
      const request = {key:target.key};
      this.pending.set(target.address,request);
      cx.spawn(async cx => {
        try {
          const folder = JSON.stringify([target.on,target.cwd]);
          if (!folders.has(folder)) folders.set(folder,
            this.repository(target).catch(() => null));
          const repo = await folders.get(folder);
          if (!this.enabled()) return;
          let number = target.number;
          if (repo && ['a1','claude-code'].includes(target.app)) {
            const screen = await hc(['read',target.address,'--json','--lines','0']).catch(() => null);
            number = (screen?.code === 0 ? agentPullNumber(screen.stdout, target.app) : null) ?? number;
          }
          if (!this.enabled() || this.pending.get(target.address) !== request || !agentTargets().some(t => t.key === target.key)) return;
          this.entries.set(target.address,{...target,repo,number,at:Date.now()});
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
    const live=()=>this.enabled()&&current()&&agentTargets().some(t=>t.key===target.key);
    if(!live())return false;
    const result=await repositoryRead(exec,REPO_ARGS,null,{cwd:target.cwd,on:target.on,timeout:15000,current:live}).catch(()=>null);
    if(!live()||!result||result.code!==0||repositoryName(result.stdout)!==repoKey(repo))return false;
    let number=target.number;
    if(['a1','claude-code'].includes(target.app)) {
      const screen=await hc(['read',target.address,'--json','--lines','0']);
      if(!live()||screen.code!==0)return false;
      number=agentPullNumber(screen.stdout,target.app)??number;
    }
    return live()&&(number!=null?number===pr.number:Boolean(pr.headRefName&&target.branch===pr.headRefName));
  }

  related(pr, repo, preferred = null) {
    const matches = agentTargets().flatMap(target => {
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
