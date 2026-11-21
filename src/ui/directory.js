// One directory contract. No prompt scraping, process execution or persistent renames.
import { panes, terminals, focused, home, shared, setShared } from './host.js';
import { reportedLabels } from './terminal-labels.js';
import { agentProjectDirectory } from './integration/agent-context/context.js';
const valid = p => typeof p === 'string' && p.length <= 4096 && !/[\x00-\x1f\x7f]/.test(p) && /^(?:[A-Za-z]:[\\/]|\/|\\\\)/.test(p);
const normalize = p => { const value=p.replace(/\\/g,'/'); return /^[A-Za-z]:\/+$/u.test(value) ? value.slice(0,2)+'/' : value.replace(/\/+$/,'') || '/'; };
const same = (a,b) => /^[A-Za-z]:|^\/\//.test(a) ? a.toLowerCase() === b.toLowerCase() : a === b;
const shell = name => /^(?:bash|sh|zsh|fish|dash|ksh|pwsh|powershell|cmd|nu)(?:\.exe)?$/i.test((name??'').split(/[\\/]/).pop());
export function directoryName(cwd, userHome = null) {
 if (!valid(cwd)) return '';
 const path = normalize(cwd);
 if (valid(userHome) && same(path,normalize(userHome))) return '~';
 return path.split('/').pop() || path;
}
export function paneDirectory(p, list = terminals(), focus = focused()) {
 if (!p?.terminal || p.mod) return {cwd:null,name:''};
 const terminal = list.find(t => t.address === p.terminal);
 // Prompt reports win for logical shell locations (PowerShell/MSYS can leave
 // Win32 cwd at launch). Native CMD's live process cwd is a useful fallback;
 // foreground applications still take precedence over a shell's last prompt.
 const foreground = !shell(terminal?.foreground?.name) && terminal?.foreground?.cwd;
 const nativeShell=/^(?:cmd|powershell|pwsh)(?:\.exe)?$/i.test((terminal?.foreground?.name??'').split(/[\\/]/).pop());
 const focusedCwd=focus?.terminal===p.terminal?focus.cwd:null;
 const labels = reportedLabels(terminal?.labels);
 // The capability boundary handles agent-specific protocols; this resolver
 // only ranks the normalized active project above generic native/shell fallbacks.
 const project = agentProjectDirectory({ terminal, pane: p })?.cwd;
 const reported = [project,foreground,labels.cwd,nativeShell&&terminal?.foreground?.cwd,focusedCwd,p.cwd,terminal?.cwd].find(valid);
 const cwd = reported ? normalize(reported) : null;
 const userHome = valid(labels.home) ? labels.home : p.terminal.includes('/') ? null : home();
 return {cwd,name:directoryName(cwd,userHome)};
}
// --- Where a new terminal starts ---------------------------------------------------
// A folder inherited from the selected tab may be a crew worker's private copy (a linked
// git worktree). A terminal started from it goes to that repository's primary checkout
// instead, else to home, so the person's tabs never hold a worker's copy. Only for an
// inherited folder: explicit choices (New/Open worktree…, a picked folder) are untouched,
// and paneDirectory/spaceDirectory keep reporting the real folder for every display.
// Copies are recognised by path, on any machine: under <home>/.treehouse/ (a pool slot is
// .treehouse/<repo>-<hash>/<n>/<repo>), under <home>/.crew/.worktrees/<id>, or below a
// `.worktrees` folder inside a repository (whose primary checkout is that repository).
// For the first two the primary checkout is read from the slot's `.git` file (local only,
// in the background); without it, home. Another machine's home, when its terminal did not
// report one, is the part of the path before .treehouse or .crew.
const windowsPath = p => /^[A-Za-z]:|^\/\//.test(p);
const segmentsOf = p => p.split('/');
const sameSegment = (path, a, b) => windowsPath(path) ? a.toLowerCase() === b.toLowerCase() : a === b;
export function workerCopy(cwd, userHome = null) {
 if (!valid(cwd)) return null;
 const path = normalize(cwd), parts = segmentsOf(path), home = valid(userHome) ? normalize(userHome) : null;
 const at = (i, name) => i >= 1 && i < parts.length && sameSegment(path, parts[i], name);
 // Inside a home's pool: the base before the marker must be that home when it is known.
 const pooled = (i, depth) => {
  const base = parts.slice(0, i).join('/') || '/';
  if (home && !same(base, home)) return null;
  return { home: home ?? base, root: parts.length >= i + 1 + depth ? parts.slice(0, i + 1 + depth).join('/') : null, primary: null };
 };
 for (let i = 1; i < parts.length; i++) {
  if (at(i, '.treehouse')) { const copy = pooled(i, 3); if (copy) return copy; }
  if (at(i, '.crew') && at(i + 1, '.worktrees')) { const copy = pooled(i, 2); if (copy) return copy; }
 }
 for (let i = 1; i < parts.length - 1; i++) {
  if (at(i, '.worktrees') && !(i > 1 && sameSegment(path, parts[i - 1], '.crew'))) {
   const primary = parts.slice(0, i).join('/');
   if (valid(primary) || /^[A-Za-z]:$/.test(primary)) return { home, root: parts.slice(0, i + 2).join('/'), primary: /^[A-Za-z]:$/.test(primary) ? `${primary}/` : primary };
  }
 }
 return null;
}
// root (lower-cased) -> primary checkout, read from the copy's .git file ("gitdir: <repo>/.git/worktrees/<name>").
const primaries = new Map();
const rootKey = root => root.toLowerCase();
export function primaryFromGitFile(text) {
 const gitdir = /^gitdir:\s*(.+?)\s*$/m.exec(String(text ?? ''))?.[1];
 if (!valid(gitdir)) return null;
 const m = /^(.*)\/\.git\/worktrees\/[^/]+$/i.exec(normalize(gitdir));
 return m && (valid(m[1]) || /^[A-Za-z]:$/.test(m[1])) ? (/^[A-Za-z]:$/.test(m[1]) ? `${m[1]}/` : m[1]) : null;
}
// The folder a new terminal started from `cwd` should use; `remote` means `cwd` is a path
// on another machine (never read here). Returns cwd itself when it is not a worker's copy.
export function startFolder(cwd, { userHome = null, remote = false } = {}) {
 if (!valid(cwd)) return null;
 const copy = workerCopy(cwd, userHome);
 if (!copy) return normalize(cwd);
 if (copy.primary) return copy.primary;
 const known = !remote && copy.root ? primaries.get(rootKey(copy.root)) : null;
 return known ?? copy.home ?? (valid(userHome) ? normalize(userHome) : null);
}
// Fills the primary-checkout cache for `cwd` in the background (local copies only).
// `read(path)` is the host's readTextFile; callers pass it so this module needs no file access.
export async function warmStartFolder(cwd, { remote = false, userHome = null } = {}, read) {
 if (remote || typeof read !== 'function') return;
 const copy = workerCopy(cwd, userHome);
 if (!copy?.root || copy.primary || primaries.has(rootKey(copy.root))) return;
 try { const primary = primaryFromGitFile(await read(`${copy.root}/.git`)); if (primary) primaries.set(rootKey(copy.root), primary); } catch {}
}
const paneHome = p => { const labels = reportedLabels(terminals().find(t => t.address === p?.terminal)?.labels); return valid(labels.home) ? labels.home : p?.terminal?.includes('/') ? null : home(); };
const paneScope = p => ({ remote: Boolean(p?.terminal?.includes('/')), userHome: p?.terminal ? paneHome(p) : null });
const spaceScope = space => ({ remote: Boolean(space?.machine), userHome: space?.machine ? null : home() });
// A new terminal from a pane's folder / from a space's current folder (the + menu, Start page).
export function paneStartFolder(p, list = terminals(), focus = focused()) { return startFolder(paneDirectory(p, list, focus).cwd, paneScope(p)); }
export function spaceStartFolder(space, all = panes(), list = terminals(), focus = focused()) { return startFolder(spaceDirectory(space, all, list, focus).cwd, spaceScope(space)); }
export function warmPaneStartFolder(p, read) { return warmStartFolder(paneDirectory(p).cwd, paneScope(p), read); }
export function warmSpaceStartFolder(space, read) { return space ? warmStartFolder(spaceDirectory(space).cwd, spaceScope(space), read) : Promise.resolve(); }
export function tabDirectory(tab, all = panes(), list = terminals()) {
 const mine = all.filter(p => p.tab === tab && p.terminal && !p.mod);
 return paneDirectory(mine.find(p => p.focused) ?? mine[0],list);
}
const SPACE_DIRECTORIES = 'custom.spaces.last-directory';
function savedSpaceDirectory(space) {
 const value = shared(SPACE_DIRECTORIES)?.[space.id];
 return value && value.machine === (space.machine ?? null) && valid(value.cwd)
  ? {cwd:normalize(value.cwd),name:typeof value.name==='string'?value.name:directoryName(value.cwd,space.machine?null:home())} : null;
}
// Capture live reports before the final pane disappears. This is local runtime
// metadata, never a portable preference or a native space/document mutation.
export function rememberSpaceDirectory(space, all = panes(), list = terminals(), focus = focused()) {
 const tabs = new Set((space.tabs??[]).map(t=>t.id));
 if (!all.some(p=>tabs.has(p.tab)&&p.terminal&&!p.mod)) return;
 const result = spaceDirectory(space,all,list,focus,false);
 if (!result.cwd) return;
 const before = savedSpaceDirectory(space);
 if (before?.cwd===result.cwd && before?.name===result.name) return;
 const history = {...shared(SPACE_DIRECTORIES)};
 history[space.id]={machine:space.machine??null,cwd:result.cwd,name:result.name};
 // Bound local runtime history without exporting session/space identifiers.
 const ids=Object.keys(history);for(const id of ids.slice(0,Math.max(0,ids.length-1000)))delete history[id];
 setShared(SPACE_DIRECTORIES,history);
}
export function spaceDirectory(space, all = panes(), list = terminals(), focus = focused(), allowFallback = true) {
 const tabs = new Set((space.tabs??[]).map(t => t.id));
 const mine = all.filter(p => tabs.has(p.tab) && p.terminal && !p.mod);
 const key = `custom.cwd.focus:${space.id}`;
 let remembered = null;
 try { remembered = sessionStorage.getItem(key); } catch {}
 const current = focus?.space === space.id ? mine.find(p => p.terminal === focus.terminal || p.pane === focus.pane) : null;
 const activeTab=(space.tabs??[]).find(t=>t.active)?.id;
 const rememberedPane=mine.find(p=>p.terminal===remembered);
 const chosen = current ?? (focus?.space&&focus.space!==space.id?null:mine.find(p=>p.focused))
   ?? (activeTab?(rememberedPane?.tab===activeTab?rememberedPane:mine.find(p=>p.tab===activeTab)):rememberedPane) ?? rememberedPane ?? mine[0];
 if (current && remembered !== current.terminal) { try { sessionStorage.setItem(key,current.terminal); } catch {} }
 const result = paneDirectory(chosen,list,focus);
 if (result.cwd) return result;
 if (!allowFallback) return {cwd:null,name:''};
 if (!mine.length) { const saved=savedSpaceDirectory(space);if(saved)return saved; }
 return valid(space.folder) ? {cwd:normalize(space.folder),name:directoryName(space.folder,space.machine?null:home())} : {cwd:null,name:''};
}
export function displaySpace(space, all = panes(), list = terminals(), focus = focused()) {
 // Missing named metadata is not permission to overwrite an existing title.
 if (space.named !== false) return space;
 const directory = spaceDirectory(space,all,list,focus);
 return directory.name ? {...space,name:directory.name,directory:directory.cwd} : space;
}
