// Client-local disclosure, separate from repository facts and entry snapshots.
export const DISCLOSURE_KEY = 'custom.git.repositories.disclosure';
export const LEGACY_FOLDS_KEY = 'custom.git.task-repositories.folded';
const canonical = repo => typeof repo === 'string' ? repo.trim().toLowerCase() : '';
const repositories = values => new Set(values.filter(value => typeof value === 'string').map(canonical).filter(Boolean));

export class RepositoryDisclosure {
  constructor(storage = globalThis.localStorage) {
    this.storage = storage;
    this.collapsed = false;
    this.exceptions = new Set();
    this.sync();
  }

  // Safe before publication: reads local UI memory only, never writes/notifies.
  // An unchanged/refused store must not erase an unsaved in-memory choice.
  sync() {
    let raw, legacy;
    try {
      raw = this.storage.getItem(DISCLOSURE_KEY);
      legacy = this.storage.getItem(LEGACY_FOLDS_KEY);
    } catch { return false; }
    const source = JSON.stringify([raw, legacy]);
    if (source === this.source) return false;
    this.source = source;
    const before = this.signature();
    let saved;
    try { saved = JSON.parse(raw); } catch {}
    if (saved?.version === 1 && typeof saved.collapsed === 'boolean' && Array.isArray(saved.exceptions)) {
      this.collapsed = saved.collapsed;
      this.exceptions = repositories(saved.exceptions);
    } else {
      this.collapsed = false;
      let folded;
      try { folded = JSON.parse(legacy); } catch {}
      this.exceptions = repositories(Array.isArray(folded) ? folded : []);
    }
    return before !== this.signature();
  }

  signature() { return JSON.stringify([this.collapsed, [...this.exceptions].sort()]); }
  has(repo) { return this.collapsed !== this.exceptions.has(canonical(repo)); }
  // TaskReveal's existing fold fingerprint includes the default, even with no
  // current sections. '*' cannot be a canonical owner/repository identity.
  *[Symbol.iterator]() { if (this.collapsed) yield '*'; yield* this.exceptions; }

  // Set-compatible effective-fold mutations keep the existing section handler.
  add(repo) { this.set(repo, true); return this; }
  delete(repo) { const before = this.has(repo); this.set(repo, false); return before; }
  set(repo, collapsed) {
    const name = canonical(repo);
    if (!name) return;
    collapsed === this.collapsed ? this.exceptions.delete(name) : this.exceptions.add(name);
  }

  toggle(repo) {
    this.sync();
    this.set(repo, !this.has(repo));
    this.save();
  }

  toggleAll() {
    this.sync();
    this.collapsed = !this.collapsed;
    this.exceptions.clear();
    this.save();
  }

  save() {
    const raw = JSON.stringify({version: 1, collapsed: this.collapsed, exceptions: [...this.exceptions].sort()});
    try { this.storage.setItem(DISCLOSURE_KEY, raw); } catch {}
    // sync() observes a successful write next time, or retains the unsaved
    // choice while storage remains unchanged. Legacy memory stays for rollback.
  }
}
