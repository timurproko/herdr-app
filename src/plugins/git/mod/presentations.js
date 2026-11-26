// Session-only, pure presentation. Never store native handles, callbacks or
// read/navigation permission here. Both task and folder adapters use the same
// committed snapshot while a replacement is pending.
export class Publication {
  constructor(value = null) { this.value = value; }
  commit(value, pending = false) { if (!pending) this.value = value; return this.value; }
  project(current, pending) { return pending ? this.value : current; }
}
const weight = value => value.entries?.length ?? Object.values(value.pulls ?? {}).reduce((n, rows) => n + (rows?.length ?? 0), 0);
export class PresentationMemory extends Map {
  constructor() { super(); this.folders = new Map(); }
  set(key, value) {
    super.delete(key); super.set(key, value);
    while (this.size > 4 || [...this.values()].reduce((n, s) => n + weight(s), 0) > 4096) this.delete(this.keys().next().value);
    return this;
  }
  clear() { super.clear(); this.folders?.clear(); }
  delete(key) {
    const removed = super.delete(key);
    for (const [folder, target] of this.folders ?? []) if (target === key) this.folders.delete(folder);
    return removed;
  }
  rememberFolder(folder, on, repo) {
    this.folders.set(JSON.stringify([folder, on ?? null]), JSON.stringify(['repository', on ?? null, repo.toLowerCase()]));
    while (this.folders.size > 256) this.folders.delete(this.folders.keys().next().value);
  }
  name(folder, on) {
    const key = this.folders.get(JSON.stringify([folder, on ?? null]));
    return key ? JSON.parse(key)[2] : null;
  }
  repository(on, name, validSource = () => true) {
    name = name?.toLowerCase(); if (!name) return null;
    const full = this.get(JSON.stringify(['repository', on ?? null, name]));
    if (full && (!(full.seed || Object.values(full.seedTabs??{}).some(Boolean)) || validSource(full.source))) return full;
    for (const saved of [...this.values()].reverse()) {
      if (saved.repository || (saved.machine ?? null) !== (on ?? null) || !saved.published || !validSource(saved)) continue;
      const pulls = {open:[], closed:[]},admitted=new Map(saved.entries??saved.published);
      for (const [id,entry] of saved.published) {
        const current=admitted.get(id);
        if (!current || current.missing || entry.link.repo !== name || !entry.pr || entry.missing) continue;
        const state = ['open','draft'].includes(entry.pr.state) ? 'open' : 'closed';
        const live = current.link.targets.some(t => !t.historical && t.terminal);
        const age = Date.now() - entry.completedAt;
        if (state === 'closed' && !live && !(age >= 0 && age < 86400000)) continue;
        const {key, repo, ...facts} = entry.pr;
        pulls[state].push(facts);
      }
      // An empty full task publication is not proof this repository is empty.
      if (!pulls.open.length && !pulls.closed.length) continue;
      return {repository:true, seed:true, on:on ?? null, repo:{name, url:`https://github.com/${name}`}, pulls,
        counts:{open:pulls.open.length, closed:pulls.closed.length}, source:{scope:saved.scope,parent:saved.parent,machine:saved.machine,providerGeneration:saved.providerGeneration}};
    }
    return null;
  }
}
