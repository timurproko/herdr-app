// Custom skin: presentation-only clone of Herdr App 0.1.13's spaces.
// Workspace spaces: aligned colored avatars and user-controlled ordering,
// with worktrees marked by a trailing Git icon,
// grouped by machine when more than one is known. After a space's name, the repo
// its selected terminal is in now, with ahead/behind counts. Branch names stay in the status bar. Agent state lives in the agents list, not here. Click to
// switch, right-click for its menu, drag to reorder.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex, Input, ScrollHandle } from "gpui-base";
import { U, slot, itemHover, interactionFill, subtleActionFill, iconButton, badge, spaceBadgeColor, sidebarSectionHeader, rolePill, menuSurface, menuHeading, menuRow } from "./ui.js";
import { spaceTitle } from './space-title.js';
import { sidebarScroll } from './sidebar-scroll.js';
import { startTabArrivals, tabArrivalMotion } from './tab-arrival.js';
import { reorder } from './reorder.js';
import { beginSpaceRename, cancelSpaceRename, saveSpaceRename, syncSpaceRename } from './space-rename.js';
import { displaySpace, spaceDirectory } from './directory.js';
import { reconcileSpaceColors } from './space-color-state.js';
import { pluginEvent, pluginSpaceTags, pluginWorkspaceLinks } from './plugins.js';
import { projectLinkedRows, captureSpaceBlock, blockTarget, planBlockDrop, SpaceBlockCommit } from './workspace-links.js';
import { spaces, machines, panes, run, openOverlay, exec, hc, theme, shared, setShared, props, watchFolder, window, layout, settings, notify } from "./host.js";

// What the sidebar shows, chosen in the Spaces header's ⋯ menu. Kept in shared state like the
// Agents sort; everything is shown until it is switched off.
export const SPACE_OPTIONS = Object.freeze([
  { key: "spaces.show.machineStatus", label: "Machine status", icon: "monitor" },
  { key: "spaces.show.worktree", label: "Worktree icon", icon: "branch" },
]);
export const shows = key => shared(key) !== false;
const displayLinks = () => pluginWorkspaceLinks({presentation:true});

function find(node, id) {
  if (node?.id === id) return node;
  for (const child of node?.children ?? []) {
    const found = find(child, id);
    if (found) return found;
  }
  return null;
}

// The sidebar's rail goes by its width, not a flag: dragging its edge narrows it too.
const narrow = () => (find(layout(), "sidebar")?.size?.px ?? Infinity) < 160;

// Where a space is now: its selected terminal's reported folder, else its origin.
// `ps`: panes(), read once by the caller (each read copies every pane).
function place(s, ps) { return spaceDirectory(s,ps).cwd || s.folder; }
const rowHeight = () => U.row;
const where = (s, ps) => JSON.stringify([s.machine ?? null, place(s, ps)]);
const base = (path) => path.replace(/\/+$/, "").split("/").pop();
// Changes made outside Herdr (an editor's save, a commit in another app): looked
// for this often, in repos the list shows, while the window is in front.
const FALLBACK = 60000;

// A space speaks up only when something in it needs you.
export function glyph(status) {
  return status === "blocked" || status === "done" ? "●" : "·";
}

export function tone(t, status) {
  return t[status] ?? t.unknown;
}

export default class Spaces extends View {
  init(_props, cx) {
    if (props()?.optionsMenu) return; // the ⋯ popup: no sidebar work
    pluginEvent('spaces.refresh', { owner: this, cx }); // e.g. A1 colors follows space colors
    this.git = {}; // where() -> { name, branch, ahead, behind, repo, linked }, null: not a repo
    this.checked = {}; // where() -> when it was last looked at
    this.unsure = new Set(); // where()s git couldn't answer for (a machine away)
    this.pending = new Set(); // where()s to look at next
    this.busy = {}; // pane -> an agent working or a program in front of its shell
    this.ready = {}; // machine -> its layout was readable at the last look
    this.at = {}; // space -> its where() at the last look
    this.watching = new Set(); // local repos' git folders
    // Spaces made while this runs wait (at most a moment) for their git, so a
    // worktree appears under its repo instead of jumping there.
    this.shown = new Set(spaces().map((s) => s.id));
    this.born = {};
    this.listScroll = ScrollHandle.new(); // drag auto-scroll at the list edges
    this.rename = null;
    this.spaceRenameLabel = s => displaySpace(s).name;
    this.addHovered = null;
    this.machines = [];
    this.reconnecting = JSON.parse(localStorage.getItem("machines.reconnecting") ?? "{}");
    for (const state of Object.values(this.reconnecting)) state.busy = false;
    this.folded = new Set(JSON.parse(localStorage.getItem("machines.folded") ?? "[]"));
    startTabArrivals(this, cx);
    this.refreshMachines(cx);
    cx.timer.every(15000, cx => this.refreshMachines(cx));
    // `git status` walks the whole tree, on another machine a process there:
    // only when its answer could have changed (see `due`).
    cx.timer.every(250, (cx) => this.checkNew(cx));
  }

  close() { cancelSpaceRename(this, null); }

  renameField(w, t) {
    const edit = this.rename;
    const stop = (_e, cx) => cx.stop_propagation();
    const action = (name, asset, click) => iconButton(t, { id: `space-rename-${name}-${w.id}`, icon: asset, color: t.muted, onClick: click,
      label: name === 'apply' ? 'Apply space rename' : 'Cancel space rename', tooltip: name === 'apply' ? 'Apply rename (Enter)' : 'Cancel rename (Escape)' });
    return h_flex().id(`space-rename-${w.id}`).h(U.insetControl).flex_1().min_w(0).gap(4).items_center()
      .track_focus(edit.handle).key_context('CustomSpaceRename')
      .on_action('custom-space-rename.ignore', stop)
      .on_mouse_down('left', stop).on_mouse_down('right', stop).on_mouse_up('left', stop)
      .on_mouse_down_out((_e, cx) => cancelSpaceRename(this, cx, edit))
      .on_key_down((e, cx) => {
        if (e.key === 'f2') { cx.stop_propagation();return; }
        if (e.key === 'escape') { cx.stop_propagation();cancelSpaceRename(this, cx, edit, true); }
      })
      .child(h_flex().id(`space-rename-field-${w.id}`).h(U.insetControl).flex_1().min_w(0).px(6).items_center()
        .rounded(U.insetRadius).border_1().border_color(t.input).bg(t.background).text_color(t.foreground).cursor_text()
        .child(Input.new(edit.input).id(`space-rename-input-${w.id}`).flex_1().min_w(0).h_full().text_size(U.font).accessibility_label(`Rename space ${w.name}`)))
      .child(h_flex().id(`space-rename-actions-${w.id}`).gap(2).items_center().flex_none()
        .child(action('apply', 'mods/custom-workspace-chrome/check.svg', (_e, cx) => { cx.stop_propagation();saveSpaceRename(this, cx, edit); }))
        .child(action('cancel', 'mods/custom-pane/close.svg', (_e, cx) => { cx.stop_propagation();cancelSpaceRename(this, cx, edit, true); })));
  }

  checkNew(cx) {
    pluginEvent('spaces.refresh', { owner: this, cx });
    this.blockCommit?.observe();
    const now = Date.now();
    const sp = spaces();
    for (const s of sp) if (!this.shown.has(s.id)) this.born[s.id] ??= now;
    const due = this.due(now, sp, panes());
    if (due.size) this.refreshGit(due, cx);
    if (sp.some((s) => !this.shown.has(s.id))) cx.notify();
  }

  // Places whose git could have changed: new ones (a new space, a cd), where a
  // command or an agent's turn just ended (a checkout, a commit, edits), those on
  // a machine that is back, and repos in view whose fallback is due.
  due(now, sp, ps) {
    // Moved there: what it knew of that place may be old.
    const at = {};
    for (const s of sp) at[s.id] = where(s, ps);
    const keys = new Set(Object.values(at).filter((k) => JSON.parse(k)[1]));
    const due = new Set([...keys].filter((k) => !(k in this.git)));
    for (const [id, k] of Object.entries(at)) if (this.at[id] && this.at[id] !== k && keys.has(k)) due.add(k);
    this.at = at;
    const spaceOf = {};
    for (const s of sp) for (const t of s.tabs ?? []) spaceOf[t.id] = s;
    const busy = {};
    for (const p of ps) {
      if (!p.terminal || !spaceOf[p.tab]) continue;
      busy[p.pane] = p.status === "working" || !(p.program?.shell || p.program?.agent);
      if (this.busy[p.pane] && !busy[p.pane]) this.sameRepo(at[spaceOf[p.tab].id], keys).forEach((k) => due.add(k));
    }
    this.busy = busy;
    for (const m of machines()) {
      const ready = m.layout === "ready";
      if (ready && this.ready[m.name] === false) for (const k of keys) if (JSON.parse(k)[0] === m.name) due.add(k);
      this.ready[m.name] = ready;
    }
    if (window().active) {
      for (const k of keys) {
        const asks = this.git[k] || this.unsure.has(k);
        if (asks && !this.folded.has(JSON.parse(k)[0]) && now - (this.checked[k] ?? 0) > FALLBACK) due.add(k);
      }
    }
    return due;
  }

  // `key` and the other places in its repo (a commit there moves their ahead/behind).
  sameRepo(key, keys) {
    const repo = this.git[key]?.repo;
    return [key, ...(repo ? [...keys].filter((k) => this.git[k]?.repo === repo) : [])];
  }

  refreshMachines(cx) {
    cx.spawn(async cx => {
      try { const r = await hc(["machine", "ls", "--json"]); if (r.code === 0) this.machines = (JSON.parse(r.stdout).machines ?? []).filter((m) => !m.temporary); } catch {}
      cx.notify();
    });
  }

  rebuilt(machine) {
    return machine?.state === "unreachable" && /^a different core answers there \("[^"]+"\)$/.test(machine.why ?? "");
  }

  reconnect(machine, cx) {
    const name = machine.name;
    if (this.reconnecting[name]?.busy) return;
    const state = this.reconnecting[name] ??= { machine, removed: false };
    state.busy = true;
    state.error = null;
    localStorage.setItem("machines.reconnecting", JSON.stringify(this.reconnecting));
    cx.notify();
    cx.spawn(async cx => {
      try {
        const ask = async args => {
          const r = await hc([...args, "--json"]);
          if (r.code !== 0) {
            let error;
            try { error = JSON.parse(r.stdout || r.stderr).error?.message; } catch {}
            throw new Error(error || r.stderr || r.stdout || "Couldn't connect.");
          }
        };
        if (!state.removed) {
          await ask(["machine", "rm", name]);
          state.removed = true;
          localStorage.setItem("machines.reconnecting", JSON.stringify(this.reconnecting));
        }
        const args = ["machine", "add"];
        if (machine.via) args.push("--via", machine.target);
        else args.push(machine.target);
        args.push("--name", name);
        if (machine.session) args.push("--session", machine.session);
        if (machine.temporary) args.push("--temp");
        await ask(args);
        this.folded.delete(name);
        localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
        delete this.reconnecting[name];
      } catch (e) {
        state.error = String(e.message ?? e);
        state.busy = false;
      }
      localStorage.setItem("machines.reconnecting", JSON.stringify(this.reconnecting));
      this.refreshMachines(cx);
      cx.notify();
    });
  }

  // One look at a time, each place once however often it was asked for meanwhile.
  refreshGit(keys, cx) {
    for (const k of keys) this.pending.add(k);
    if (this.refreshing) return;
    this.refreshing = true;
    cx.spawn(async (cx) => {
      while (this.pending.size) {
        const keys = [...this.pending];
        this.pending.clear();
        for (const key of keys) await this.check(key, cx);
      }
      const used = new Set(Object.values(this.git).filter(Boolean).map((g) => JSON.parse(g.repo)).filter(([on]) => !on).map(([, repo]) => repo));
      for (const repo of this.watching) if (!used.has(repo)) this.watching.delete(repo);
      this.refreshing = false;
      cx.notify();
    });
  }

  // One place's git: branch, ahead/behind, its repo.
  async check(key, cx) {
    const [on, cwd] = JSON.parse(key);
    this.checked[key] = Date.now();
    this.unsure.delete(key);
    try {
      // No optional locks: a status that touched the index would wake the watch again.
      // Writes nothing under .git (index lock, fsmonitor cookie): watch() would wake on it.
      const r = await exec("git", ["--no-optional-locks", "-c", "core.fsmonitor=false", "status", "--porcelain=v2", "--branch"], { cwd, on });
      if (r.code !== 0) {
        // Only git's own "no" is remembered as no repo; anything else is asked again.
        if (!/not a git repository/i.test(r.stderr)) { this.unsure.add(key); this.git[key] ??= null; }
        else this.git[key] = null;
        return;
      }
      // The repo's own .git folder names it; a worktree's top differs from it.
      const top = await exec("git", ["rev-parse", "--show-toplevel"], { cwd, on });
      const common = await exec("git", ["rev-parse", "--path-format=absolute", "--git-common-dir"], { cwd, on });
      const repo = common.stdout.trim();
      const name = repo.endsWith("/.git") ? base(repo.slice(0, -5)) : base(repo).replace(/\.git$/, "");
      const info = { name, branch: null, ahead: 0, behind: 0, repo: JSON.stringify([on, repo]), linked: repo !== `${top.stdout.trim()}/.git` };
      for (const line of r.stdout.split("\n")) {
        if (line.startsWith("# branch.head ")) info.branch = line.slice(14);
        else if (line.startsWith("# branch.ab ")) {
          const [a, b] = line.slice(12).split(" ");
          info.ahead = Math.abs(parseInt(a, 10)) || 0;
          info.behind = Math.abs(parseInt(b, 10)) || 0;
        }
      }
      this.git[key] = info;
      if (!on) this.watch(repo, cx);
    } catch {
      // Couldn't ask (the machine is away): keep what it showed, look again later.
      this.git[key] ??= null;
      this.unsure.add(key);
    }
  }

  watch(repo, cx) {
    if (this.watching.has(repo)) return;
    this.watching.add(repo);
    cx.spawn(async (cx) => {
      try {
        while (this.watching.has(repo)) {
          await watchFolder(repo);
          const mine = JSON.stringify([null, repo]);
          if (this.watching.has(repo)) this.refreshGit(Object.keys(this.git).filter((k) => this.git[k]?.repo === mine), cx);
        }
      } catch { this.watching.delete(repo); }
    });
  }

  menu(w) {
    // A popup is as tall as its items; height is only the most.
    const folder = place(w, panes());
    const g = this.git[JSON.stringify([w.machine ?? null, folder])];
    const checkout = g ? (g.linked ? "linked" : "main") : g === null ? null : "unknown";
    openOverlay({ mod: "custom-menu", kind: "popup", frame: "none", width: 200, height: 260, props: { tab: "space", target: { id: w.id, folder, checkout } } });
  }

  // Core owns the user's order. Git metadata decorates rows, never moves them.
  ordered() {
    const ps = panes(), sp = spaces().map(s=>displaySpace(s,ps));
    const ready = (w) => this.shown.has(w.id) || where(w, ps) in this.git || Date.now() - (this.born[w.id] ??= Date.now()) > 1500;
    for (const w of sp) if (!this.shown.has(w.id) && ready(w)) this.shown.add(w.id);
    return projectLinkedRows(sp.map((w, i) => {
      const g = this.git[where(w, ps)] ?? null;
      return { w, i, g, tree: g?.linked ? true : null };
    }).filter(r => this.shown.has(r.w.id)), displayLinks());
  }

  // The rows, under a header per machine once one isn't this computer.
  grouped(t, collapsed) {
    const rows = this.ordered();
    const draw = (r) => (collapsed ? this.compact(r, t) : this.row(r, t));
    const remote = [...new Set([...rows.map(r => r.w.machine).filter(Boolean), ...this.machines.map(m => m.name), ...Object.keys(this.reconnecting)])].sort();
    const loading = m => {
      const layout = machines().find(k => k.name === m)?.layout;
      return layout === "loading" || (!layout && this.machines.some(k => k.name === m && k.state === "connected"))
        || spaces().some(s => (s.machine ?? null) === m && !this.shown.has(s.id));
    };
    const loadingRow = m => div().id(`machine-loading-${m ?? "local"}`).h(U.control).flex_none().px(collapsed ? 0 : 8).text_size(12).text_color(t.dim)
      .when(collapsed, el => el.w(U.control).self_center().flex().items_center().justify_center()).child(collapsed ? "…" : "Loading…");
    // Each machine's space rows, as [first, last] indexes into the result:
    // how far drag auto-scroll may go (spaces don't change machine).
    this.spans = {};
    if (!remote.length) {
      if (rows.length) this.spans.null = [0, rows.length - 1];
      return loading(null) && !rows.length ? [loadingRow(null)] : rows.map(draw);
    }
    const machineNames = [null, ...remote];
    let at = 0;
    return machineNames.flatMap((m) => {
      const out = this.groupRows(m, rows, collapsed, t, draw, loading, loadingRow);
      if (out.length > 1 && rows.some(r => (r.w.machine ?? null) === m)) this.spans[m] = [at + 1, at + out.length - 1];
      at += out.length;
      return out;
    });
  }

  // One machine's header and rows (or its loading/empty row).
  groupRows(m, rows, collapsed, t, draw, loading, loadingRow) {
      const mine = rows.filter((r) => (r.w.machine ?? null) === m);
      const repair = this.reconnecting[m];
      const machine = this.machines.find(k => k.name === m) ?? repair?.machine;
      const connected = !m || machine?.state === "connected";
      const ready = machines().find(k => k.name === m)?.layout === "ready";
      const rebuilt = this.rebuilt(machine) || !!repair;
      const folded = this.folded.has(m);
      // The dot alone tells the state: the core's own word ("unreachable") can lag a
      // ready connection, so it is only a tooltip.
      const status = () => div().id(`machine-status-${m ?? "local"}`).size(U.statusSize).rounded_full().flex_none().bg(ready ? t.done : t.dim)
        .when(!collapsed, el => el.tooltip(ready ? "Connected" : (machine?.state ?? "Not connected").replace(/_/g, " ")));
      const children = collapsed ? [slot(svg(`mods/custom-workspace-chrome/${m ? "server" : "monitor"}.svg`).size(m ? U.smallIcon : U.icon))
        .when(folded && this.tabArrival?.machine === m, icon => tabArrivalMotion(this, icon))] : [
        div().flex_1().min_w(0).truncate().child(m ?? "This computer")
          .when(folded && this.tabArrival?.machine === m, label => tabArrivalMotion(this, label)),
        ...(rebuilt ? [h_flex().flex_none().gap(3).items_center()
          .child(div().max_w(140).truncate().child(repair?.error || "rebuilt ·"))
          .child(this.drag.control(div().id(`machine-connect-${m}`).text_color(repair?.error ? t.blocked : t.muted),
            {hover: s => s.text_color(t.foreground), tooltip: repair?.error || 'This machine was rebuilt or replaced. Click to connect to the new one.'})
            .on_click(this.drag.guard((_e, cx) => { cx.stop_propagation(); this.reconnect(machine, cx); }))
            .child(repair?.busy ? "Connecting…" : "Connect"))] : []),
        // The status dot, then +, then the shared fold chevron. Preserve the
        // plus button's visual midpoint without moving the dot or chevron.
        h_flex().id(`machine-actions-${m ?? "local"}`).flex_none().gap(3).items_center()
          .when(shows("spaces.show.machineStatus"), el => el.child(status()))
          .when(connected, el => el.child(iconButton(t, { id: `machine-add-${m ?? "local"}`, icon: "mods/custom-workspace-chrome/plus.svg", label: "New space", color: t.muted,
            enabled: !this.drag.active, onClick: this.drag.guard(() => run("space.new", { machine: m ?? "" })) })
            .ml(5).mr(-5)
            .on_hover(this.drag.guard((hovered, cx) => { this.addHovered = hovered ? (m ?? "local") : null; cx.notify(); })))),
      ];
      const head = this.drag.control(sidebarSectionHeader(t, {id:`machine-${m ?? "local"}`, label:m ?? 'This computer', open:!folded, compact:collapsed, children}),
        {hover: s => s.bg(t.selected), cursor: true, tooltip: collapsed ? m ?? 'This computer' : null})
        .when(!this.drag.active && this.addHovered === (m ?? "local"), el => el.bg(t.selected))
        .on_click(this.drag.guard((_e, cx) => {
          folded ? this.folded.delete(m) : this.folded.add(m);
          localStorage.setItem("machines.folded", JSON.stringify([...this.folded]));
          cx.notify();
        }));
      const empty = this.drag.control(h_flex().id(`machine-new-${m ?? "local"}`).h(28).flex_none().px(collapsed ? 0 : 8).gap(7).items_center().rounded(U.radius)
        .when(collapsed, el => el.w(U.control).self_center().justify_center())
        .text_size(12).text_color(t.dim), {hover: s => s.bg(t.hover).text_color(t.foreground)})
        .on_click(this.drag.guard(() => run("space.new", { machine: m ?? "" })))
        .child(svg("mods/custom-workspace-chrome/plus.svg").size(12)).when(!collapsed, el => el.child("New space"));
      if (!collapsed && rebuilt) return [head];
      return [head, ...(folded ? [] : mine.length ? mine.map(draw) : [loading(m) ? loadingRow(m) : empty])];
  }

  // Keep repository metadata here; the status bar shows the selected branch.
  gitTail(g, tree, name, t, named = false) {
    const repo = named || tree || g.name?.toLowerCase() === name.toLowerCase() ? '' : g.name;
    return h_flex()
      .flex_1()
      .min_w(0)
      .gap(4)
      .justify_end()
      .items_center()
      .text_size(U.meta)
      .text_color(t.muted)
      .when(Boolean(repo), (el) => el.child(div().min_w(0).truncate().text_color(t.dim).child(repo)))
      .when(g.ahead > 0, (el) => el.child(div().flex_none().text_color(t.ansi2).child(`\u2191${g.ahead}`)))
      .when(g.behind > 0, (el) => el.child(div().flex_none().text_color(t.ansi1).child(`\u2193${g.behind}`)));
  }

  get drag() { return reorder(this, 'list'); }
  cancelDrag(cx) { this.drag.reset(cx); }

  drop(at, cx) {
    const result = this.drag.take(at, cx);
    if (!result) return;
    const all = spaces(), source = all.find(s => s.id === result.id);
    if (!source) return;
    if (this.blockCommit?.pending) return;
    const links = pluginWorkspaceLinks();
    // A retained visual pair must never fall through to a one-space move while
    // live verification is unavailable. Click selection still works normally.
    if (result.kind === 'drop' && displayLinks().some(link =>
      [link.parent,link.child].some(id=>id===result.id || id===result.target) &&
      !links.some(l=>l.parent===link.parent && l.child===link.child && l.binding===link.binding))) return;
    if (result.kind === 'drop' && (result.meta?.sources?.length > 1 || links.length)) {
      const captured = result.meta;
      const wanted = planBlockDrop(all, links, result.id, result.target, captured);
      this.blockCommit ??= new SpaceBlockCommit({read: spaces, links: pluginWorkspaceLinks,
        move: (id,index) => run('space.move',{id,index}),
        fail: body => notify({title:'Spaces could not finish reordering',body,level:'warning'})});
      this.blockCommit.start(result.id,captured,wanted);
    } else if (result.kind === 'drop' && result.target !== result.id) {
      const index = all.findIndex(s => s.id === result.target);
      if (index !== -1 && (all[index].machine ?? null) === (source.machine ?? null)) run('space.move', {id: result.id, index: index + 1});
    } else if (result.kind === 'click') run('space.select', {id: result.id});
  }

  dragPreview(t) {
    const all = spaces(), d = this.drag.view, block = d?.meta?.sources;
    if (!all.some(s => s.id === d?.id)) return null;
    // Both sources still dim/move together; only the chip represents the parent.
    const id = block?.length > 1 ? block[0] : d.id;
    const i = all.findIndex(s => s.id === id);
    if (i === -1) return null;
    const w = displaySpace(all[i], panes());
    return this.drag.preview('space-drag', t, {
      icon: badge(String(i + 1), spaceBadgeColor(t, w, shared('space.colors') ?? {})), label: w.name});
  }

  // Match the numbered badge's box so fleet names share the normal text anchor.
  fleetBadge(t) {
    return svg('mods/custom-spaces/link.svg').size(U.icon).flex_none().text_color(t.muted);
  }

  row({ w, i, g, tree, linked = false, position = i }, t) {
    const on = w.active;
    const edit = this.rename?.id === w.id ? this.rename : null;
    const drag = this.drag, d = drag.view;
    const fromIndex = d ? this.ordered().findIndex(r => r.w.id === d.id) : -1;
    const fill = spaceBadgeColor(t, w, shared("space.colors") ?? {});
    const worktree = !edit && Boolean(g?.linked || tree) && shows("spaces.show.worktree");
    return drag.item(v_flex()
      .relative()
      .id(`space-${w.id}`)
      .px(8)
      .h(rowHeight({ tree }))
      .flex_none()
      .justify_center()
      .rounded(U.radius)
      .when(on, (el) => el.bg(t.selected)), w.id, {hover: s => s.bg(itemHover(t, on))})
      // The dragged row's highlight is its own layer behind the content, always
      // present (transparent unless dragged), so ending a drag eases it away
      // instead of snapping the row back to its own (e.g. selected) background.
      .child(drag.sourceLayer(div().id(`space-drag-bg-${w.id}`).absolute().inset_0().rounded(U.radius).bg(itemHover(t, on)), w.id))
      .when(Boolean(d) && d.target === w.id && !(d.meta?.sources ?? [d.id]).includes(w.id), el => el.child(
        drag.marker(`space-drop-line-${w.id}`, t.accent, {edge: fromIndex < position ? 'after' : 'before'})))
      .on_mouse_down("left", (e, cx) => {
        if (this.blockCommit?.pending) { cx.stop_propagation();return; }
        if (this.rename?.id === w.id) { cx.stop_propagation();return; }
        if (e?.click_count === 2) { cx.stop_propagation();beginSpaceRename(this, w.id, cx);return; }
        drag.begin(w.id, e, cx, {scale: settings()?.zoom, scrollOffset: this.sidebarScroll?.offset ?? 0,
          meta: captureSpaceBlock(spaces(), displayLinks(), w.id)});
      })
      .on_mouse_move((e, cx) => {
        if (this.rename) return;
        // Spaces can't change machine: over another machine's rows the line
        // clamps to its own group's last (below) or first (above) space.
        const all = spaces();
        const from = all.findIndex(s => s.id === drag.current?.id);
        if (from === -1) return;
        const machine = all[from].machine ?? null;
        let over = w.id;
        if ((w.machine ?? null) !== machine) {
          const mine = all.filter(s => (s.machine ?? null) === machine);
          over = (i > from ? mine.at(-1) : mine[0])?.id ?? null;
        }
        drag.over(e, blockTarget(all, displayLinks(), drag.current?.id, over), cx);
      })
      .on_mouse_up("left", (_e, cx) => {
        if (this.rename) { this.cancelDrag();cx.stop_propagation();return; }
        this.drop(w.id, cx);
        cx.stop_propagation();
      })
      .on_mouse_down("right", drag.guard(() => { if (!this.rename) this.menu(w); }))
      .child(
        h_flex()
          .id(`space-content-${w.id}`)
          .min_w(0)
          .gap(U.gap)
          .items_center()
          .when(this.tabArrival?.spaceId === w.id && !edit, el => tabArrivalMotion(this, el))
          .child(linked ? this.fleetBadge(t) : badge(String(i + 1), fill))
          .when(Boolean(edit), el => el.child(this.renameField(w, t)))
          .when(!edit, el => el
            .child(spaceTitle(t,w).when(linked, el => el.text_color(t.muted)).min_w(0).max_w(150).truncate().child(w.name))
            .child(g ? this.gitTail(g, tree, w.name, t, w.named === true) : div().flex_1()))
          // Keep tags to the left of the fixed trailing icon. Without an icon,
          // retain the tag-only row's existing right edge beside the Agents pills.
          .when(!edit, el => el.children(pluginSpaceTags(w).map((tag, k, all) =>
            rolePill(t, tag.label, { status: true }).id(`space-tag-${w.id}-${tag.plugin}-${k}`)
              .when(!worktree && k === all.length - 1, e => e.mr(-5))
              .when(Boolean(tag.tooltip), e => e.tooltip(tag.tooltip)))))
          // 8px row padding minus 4px puts this 16px slot on the machine
          // chevron's axis (4px right inset), independent of child indentation.
          .when(worktree, el => el.child(slot(svg("mods/custom-workspace-chrome/branch.svg").size(U.smallIcon).text_color(t.muted))
            .id(`space-worktree-${w.id}`).mr(-4).tooltip('Git worktree'))),
      );
  }

  compact({ w, i, linked = false }, t) {
    const fill = spaceBadgeColor(t, w, shared("space.colors") ?? {});
    return this.drag.control(h_flex().relative()
      .id(`space-${w.id}`)
      .w(U.control).h(U.control).self_center()
      .flex_none()
      .items_center()
      .justify_center()
      .gap(2)
      .rounded(U.radius)
      .when(w.active, (el) => el.bg(t.selected)), {hover: s => s.bg(itemHover(t, w.active)), tooltip: w.directory || w.name})
      .on_click(this.drag.guard(() => run("space.select", { id: w.id })))
      .on_mouse_down("right", this.drag.guard((_e, cx) => { cx.stop_propagation(); this.menu(w); }))
      .child((linked ? this.fleetBadge(t) : badge(String(i + 1), fill)).id(`space-badge-${w.id}`)
        .when(this.tabArrival?.spaceId === w.id, el => tabArrivalMotion(this, el)));
  }

  // The ⋯ popup: a tick per thing the sidebar can show; it stays open so several can change.
  optionsMenu(t) {
    return menuSurface(t, v_flex()).id("spaces-options-menu").w_full()
      .child(menuHeading(t, "Show icons").px(8).pt(4).pb(6))
      .children(SPACE_OPTIONS.map(o => menuRow(t, { id: `spaces-option-${o.key}`, icon: `mods/custom-workspace-chrome/${o.icon}.svg`, label: o.label,
        trailing: shows(o.key) ? svg("mods/custom-workspace-chrome/check.svg").size(14).flex_none().text_color(t.foreground) : null,
        onClick: (_e, cx) => { setShared(o.key, !shows(o.key)); cx?.notify(); } }).text_color(t.foreground)));
  }
  optionsButton(t) {
    return this.drag.control(div().id("spaces-options").size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius).text_color(t.dim)
      .role("button").accessibility_label("Spaces options"),
      {hover: s => s.bg(interactionFill(t)).text_color(t.foreground), tooltip: "Show icons"})
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click(this.drag.guard((_e, cx) => { cx?.stop_propagation(); openOverlay({ mod: "custom-spaces", kind: "popup", frame: "none", width: 200, height: 40 + SPACE_OPTIONS.length * (U.row + 2) + 8, props: { optionsMenu: true } }); }))
      .child(svg("mods/custom-workspace-chrome/more.svg").size(14));
  }

  render(cx) {
    const t = theme();
    if (props()?.optionsMenu) return this.optionsMenu(t);
    syncSpaceRename(this, cx);
    const collapsed = narrow();
    const sp = spaces();
    reconcileSpaceColors(sp);
    if (this.drag.current && !sp.some(s => s.id === this.drag.current.id)) this.drag.reset();
    if (this.drag.view?.meta && JSON.stringify(this.drag.view.meta) !== JSON.stringify(captureSpaceBlock(sp,displayLinks(),this.drag.view.id))) this.drag.reset();
    const preview = this.dragPreview(t);
    return this.drag.surface(v_flex().id("spaces-panel").relative().size_full().min_h(0).bg(t.chrome).text_size(U.font),
      {release: (id, cx) => this.drop(id, cx), enabled: () => !this.rename, scrollOffset: () => this.sidebarScroll?.offset ?? 0})
      .child(h_flex().id("spaces-header").h(U.section).flex_none().pl(collapsed ? 0 : 16).pr(collapsed ? 0 : 6).items_center().text_size(U.font).font_semibold().text_color(t.foreground)
        .when(collapsed, el => el.justify_center())
        .when(!collapsed, el => el.justify_between())
        .when(!collapsed, el => el.child("Spaces"))
        // Expanded: the ⋯ options; each machine has its own + below. The narrow rail has no
        // machine +, so it keeps this one.
        .when(!collapsed, el => el.child(this.optionsButton(t)))
        .when(collapsed, el => el.child(this.drag.control(div().id("space-new").size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius).text_color(t.dim),
          {hover: s => s.bg(interactionFill(t)).text_color(t.foreground)})
          .on_click(this.drag.guard(() => run("space.new"))).child(svg("mods/custom-workspace-chrome/plus.svg").size(14)))))
      .child(sidebarScroll(this, 'spaces-list', t, this.grouped(t, collapsed), {
        bottomPadding: 12,
        onMouseUp: (_e, cx) => this.drop(null, cx),
        dragging: () => this.drag.active && !this.rename,
        scroll: this.listScroll,
        range: () => {
          const s = spaces().find(x => x.id === this.drag.current?.id);
          return s ? this.spans?.[s.machine ?? null] ?? null : null;
        },
      }))
      .when(Boolean(preview), el => el.child(preview));
  }
}
