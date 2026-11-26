// Custom skin: presentation-only clone of Herdr App 0.1.13's agents.
// Agents in grouped or priority views; parents take their most urgent sub-agent's place.
// A viewed done agent stays in Done until left.

import { View, div, image, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { U, slot, itemHover, statusBulb, menuSurface, chevron, menuHeading, emptyState, sidebarNumericSlot } from "./ui.js";
import { programIcon } from './program-icon.js';
import { sidebarScroll } from './sidebar-scroll.js';
import { paneDirectory } from './directory.js';
import { pluginMenuItems } from './plugins.js';
import { agents, terminals, panes, focused, spaces, run, theme, shared, setShared, setAgentOrder, openOverlay, closeOverlay, props, window, layout } from "./host.js";

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

// To the rail (on macOS wide enough for the traffic lights), or back to the width it had.
function toggleSidebar() {
  const width = find(layout(), "sidebar")?.size?.px;
  if (!narrow()) setShared("sidebar.width", width);
  // Mods edited before the rail went by width still read the flag.
  setShared("sidebar.collapsed", !narrow());
  run("layout.resize", { id: "sidebar", px: narrow() ? (shared("sidebar.width") ?? 268) : window()?.platform === "macos" ? 76 : 44 });
}

const clean = (s) => (s ?? "").replace(/^[^\p{L}\p{N}]+/u, "").trim();

// Session titles belong to the agent, never to its containing tab.
function title(agent) {
  const prog = agent.program?.name;
  const live = clean(agent.title);
  const telling = live && live !== prog && !/^[~/\\]|^[A-Za-z]:[\\/]/.test(agent.title ?? "") && !live.includes("@") && live.toLowerCase() !== agent.program?.key;
  return telling ? live : prog || "";
}
const RANK = { blocked: 4, done: 3, working: 2, idle: 1 };
// A sub-agent without a pane isn't in agents(): its raw word, error counting as
// blocked. It's never done: it reports to its parent, and the parent's done is the news.
const kidStatus = (k, listed) => {
  const s = listed.get(k.address) ?? k.status;
  return s === "error" ? "blocked" : s === "done" ? "idle" : s;
};
const SORTS = [
  { id: "priority", label: "Priority", icon: "clock" },
  { id: "grouped", label: "Space", icon: "layers" },
];
const sortOf = () => SORTS.find((s) => s.id === shared("agents.sort")) ?? SORTS[0];
const SECTION = { 4: "Needs you", 3: "Done", 2: "Working", 1: "Idle" };
const SECTION_STATUS = { 4: "blocked", 3: "done", 2: "working" };

function duration(ms) {
  const m = Math.floor(ms / 60000);
  if (m < 1) return "<1m";
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  return h < 24 ? `${h}h` : `${Math.floor(h / 24)}d`;
}

// The agent's icon from the app's program table: a one-color glyph or a picture.
export default class Agents extends View {
  init(_props, cx) {
    if (props()?.sortMenu) return;
    this.folded = new Set();
    // Each agent's last state and when it changed (ms), kept across restarts.
    this.changed = JSON.parse(localStorage.getItem("changed") ?? "{}");
    this.pendingPins = JSON.parse(localStorage.getItem("pins") ?? "[]");
    if (!this.pendingPins.length) localStorage.removeItem("pins");
    this.migratingPins = new Set();
    cx.timer.every(30000, (cx) => cx.notify());
  }

  // Stamps agents whose state changed. Done and idle count as one: looking at a
  // finished agent turns done into idle, and looking isn't the agent doing anything.
  track(list, now) {
    let dirty = false;
    for (const a of list) {
      const s = a.status === "done" ? "idle" : a.status;
      if (this.changed[a.address]?.s === s) continue;
      this.changed[a.address] = { s, at: now };
      dirty = true;
    }
    if (!dirty) return;
    // Gone and old: the list alone is empty right after a start.
    const listed = new Set(list.map((a) => a.address));
    for (const [k, c] of Object.entries(this.changed)) if (!listed.has(k) && now - c.at > 30 * 86400000) delete this.changed[k];
    localStorage.setItem("changed", JSON.stringify(this.changed));
  }

  // Keep offline pins until their terminal returns, and keep each pending until
  // core echoes the label so a failed write doesn't erase the old pin.
  migratePins(all) {
    const listed = new Map(all.filter((t) => t.state === "live").map((t) => [t.address, t]));
    const pending = this.pendingPins.filter((address) => {
      const terminal = listed.get(address);
      if (!terminal) return true;
      if (terminal.labels?.["herdr.pinned"]) return false;
      if (!this.migratingPins.has(address)) {
        this.migratingPins.add(address);
        run("terminal.pin", { terminal: address, pinned: true });
      }
      return true;
    });
    if (pending.length === this.pendingPins.length) return;
    this.pendingPins = pending;
    if (pending.length) localStorage.setItem("pins", JSON.stringify(pending));
    else localStorage.removeItem("pins");
  }

  since(a) {
    return this.changed[a.address]?.at ?? 0;
  }

  // Looking at a done agent makes it idle; it stays with Done until you leave
  // it rather than drop away under you. Any other change moves it at once.
  hold(list) {
    const cur = list.find((a) => a.focused);
    const same = cur && cur.address === this.held?.address;
    // Arriving, or any change but done turning idle, sets what it was.
    if (!same || cur.status !== "idle") this.held = cur ? { address: cur.address, rank: RANK[cur.status] ?? 0 } : null;
  }

  rank(a) {
    const sawDone = a.address === this.held?.address && this.held.rank === RANK.done && a.status === "idle";
    return sawDone ? RANK.done : RANK[a.status] ?? 0;
  }

  sortMenu(t) {
    const on = sortOf().id;
    return menuSurface(t, v_flex())
      .w_full()
      .child(menuHeading(t, "Group agents by").px(8).pt(4).pb(6))
      .children(SORTS.map((s) => h_flex()
        .id(`sort-${s.id}`)
        .h(U.row)
        .px(8)
        .gap(U.gap)
        .rounded(U.radius)
        .items_center()
        .text_color(t.foreground)
        .hover((el) => el.bg(t.hover))
        .on_click(() => {
          setShared("agents.sort", s.id);
          closeOverlay(props().overlay);
        })
        .child(svg(`mods/custom-workspace-chrome/${s.icon}.svg`).size(14).flex_none().text_color(t.muted))
        .child(div().flex_1().child(s.label))
        .when(s.id === on, (el) => el.child(svg("mods/custom-workspace-chrome/check.svg").size(14).flex_none().text_color(t.foreground)))));
  }

  // The ⋯ options button, matching the Spaces header; it opens the sort menu.
  sortButton(t, _sort) {
    return div().id("ag-sort").size(U.control).flex_none().flex().items_center().justify_center().rounded(U.radius)
      .text_size(U.meta).text_color(t.dim).cursor_pointer().role("button").accessibility_label("Group agents by")
      .hover(s => s.bg(t.hover).text_color(t.foreground))
      .on_mouse_down("left", (_e, cx) => cx.stop_propagation())
      .on_click((_e, cx) => { cx.stop_propagation(); openOverlay({ mod: "custom-agents", kind: "popup", frame: "none", width: 200, height: 140, props: { sortMenu: true } }); })
      .child(svg("mods/custom-workspace-chrome/more.svg").size(U.smallIcon));
  }

  peek(addr) {
    run("terminal.peek", { terminal: addr });
  }

  menu(a) {
    openOverlay({ mod: "custom-menu", kind: "popup", frame: "none", width: 200, height: 88 + pluginMenuItems('agents.context', { terminal: a.address }).length * U.row,
      props: { tab: "agent", target: { terminal: a.address } } });
  }

  // Live sub-agents of `addr`, depth first, each with the tree lines in front of it.
  tree(all, addr, lead = []) {
    const kids = all.filter((k) => k.parent === addr && k.state === "live");
    return kids.flatMap((k, i) => {
      const last = i === kids.length - 1;
      return [
        { t: k, lines: [...lead, last ? "└" : "├"] },
        ...this.tree(all, k.address, [...lead, last ? "" : "│"]),
      ];
    });
  }

  subRow(t, s, shown, compact) {
    const k = s.t;
    const st = kidStatus(k, this.listed);
    const on = k.address === shown;
    const labelColor = on ? t.foreground : t.muted;
    const pic = programIcon(k.program, t.foreground);
    return h_flex()
      .id(`sub-${k.address}`)
      .pl(40)
      .pr(4)
      .rounded(U.radius)
      .h(U.subrow)
      .flex_none()
      .gap(0)
      .items_center()
      .text_size(U.meta)
      .when(on, (el) => el.bg(t.selected))
      .hover((s) => s.bg(itemHover(t, on)))
      .on_click(() => this.peek(k.address))
      .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.menu({ address: k.address }); })
      .children(s.lines.map(l => div().self_start().mt(-4).w(9).h(17).mr(4).flex_none()
        .when(Boolean(l), el => el.border_l(1.5).border_color(t.input))
        .when(l === "└" || l === "├", el => el.border_b(1.5).rounded_bl(6))))
      .child(pic.mr(U.gap))
      .child(div().flex_1().truncate().text_color(labelColor).child(k.name || k.template || k.program?.name || k.address))
      .child(this.statusSlot(t, { status: st }, compact));
  }

  // compact: a ! for blocked where a header already says "Needs you".
  status(t, a, compact = false) {
    if (a.status === "working") return statusBulb(t, a.status);
    if (a.status === "blocked" && compact) return div().size(14).flex_none().rounded(4).bg(t.blocked + "26").text_size(10.5).font_bold().text_color(t.blocked).flex().items_center().justify_center().child("!");
    if (a.status === "blocked") return div().flex_none().px(6).h(18).rounded(5).bg(t.blocked + "26").text_size(10.5).font_semibold().text_color(t.blocked).flex().items_center().child("Needs you");
    // Once acknowledged, a finished agent becomes idle and uses the neutral bulb.
    return statusBulb(t, a.status).mx(3);
  }

  // Times and counts end under the Spaces rows' + (one column down the sidebar); the
  // status dot and chevron after them keep their column.
  numericSlot(t, id, value) {
    return sidebarNumericSlot(t, id, value);
  }

  statusSlot(t, a, compact) {
    // Ordinary icons share one rail; only an actual labelled badge needs extra width.
    return h_flex().w(!compact && a.status === "blocked" ? 64 : U.icon).h(20).flex_none().items_center().justify_center()
      .child(this.status(t, a, compact));
  }

  render(cx) {
    const t = theme();
    if (props()?.sortMenu) return this.sortMenu(t);
    const collapsed = narrow();
    const sort = sortOf();
    const directoryPanes = panes(), all = terminals(), selection = focused();
    const directorySpaces = new Map(spaces().map(s => [s.id, s]));
    const byPane = new Map(directoryPanes.map(p => [p.pane, p]));
    const byTerminal = new Map(directoryPanes.map(p => [p.terminal, p]));
    let list = agents().map(a => {
      // Resolve this agent, never its space's selected tab. Focus changes must
      // not relabel every sibling or borrow another terminal's folder.
      const space = directorySpaces.get(a.space);
      // A space someone named keeps all its agents under that name, whatever
      // folder each tab is in; only auto-named spaces group by folder.
      if (space?.named === true && space.name) return { ...a, group_name: space.name };
      const directory = paneDirectory(byPane.get(a.pane) ?? byTerminal.get(a.address), all, selection);
      const machine = space?.machine ?? (a.address.split('/').slice(0, -1).join('/') || null);
      const path = directory.cwd;
      // One folder, spelled in different cases on Windows, keeps one heading.
      const folder = path ? JSON.stringify([machine, /^[A-Za-z]:|^\/\//.test(path) ? path.toLowerCase().replace(/[\\/]+$/, '').replace(/\\/g, '/') : path]) : null;
      return { ...a, group_name: directory.name || space?.name || a.space_name, group_folder: folder };
    });
    this.listed = new Map(list.map((a) => [a.address, a.status]));
    this.migratePins(all);
    const shown = selection?.agent;
    const now = Date.now();
    this.track(list, now);
    this.hold(list);
    const byPriority = sort.id === "priority";
    const urgency = new Map(list.map((a) => [a.address, Math.max(this.rank(a), ...this.tree(all, a.address).map((s) => RANK[kidStatus(s.t, this.listed)] ?? 0))]));
    const rankOf = (a) => urgency.get(a.address);
    if (byPriority) list = [...list].sort((x, y) => rankOf(y) - rankOf(x) || this.since(y) - this.since(x) || y.seq - x.seq);
    const pinned = list.filter((a) => a.pinned);
    const rest = list.filter((a) => !a.pinned);
    // Headings with the same shown name are one group, whatever space, folder or
    // machine they come from (rows show the machine). Preserve first-seen order.
    const groups = pinned.length ? [{ id: "pinned", label: "Pinned", status: null, members: pinned }] : [];
    const byGroup = new Map(), folderNames = new Map();
    for (const a of rest) {
      const r = rankOf(a) || RANK.idle;
      let name = a.group_name || a.space_name || "";
      if (a.group_folder) {
        if (folderNames.has(a.group_folder)) name = folderNames.get(a.group_folder);
        else folderNames.set(a.group_folder, name);
      }
      const id = byPriority ? `sec-${r}` : `sp-${name}`;
      let group = byGroup.get(id);
      if (!group) {
        group = { id, label: byPriority ? SECTION[r] : name, status: byPriority ? SECTION_STATUS[r] : null, members: [] };
        byGroup.set(id, group);
        groups.push(group);
      }
      group.members.push(a);
    }
    list = groups.flatMap((g) => g.members);
    setAgentOrder(list.map((a) => a.address));

    const withKids = (a, i) => {
      const subs = collapsed ? [] : this.tree(all, a.address);
      const r = row(a, i, subs);
      if (this.folded.has(a.address)) return [r];
      return [r, ...subs.map((s) => this.subRow(t, s, shown, byPriority))];
    };

    // The fold chevron; folded, the count too, colored by the most urgent one.
    const fold = (a, subs) => {
      const sts = subs.map((s) => kidStatus(s.t, this.listed));
      const top = sts.reduce((m, s) => ((RANK[s] ?? 0) > (RANK[m] ?? 0) ? s : m), null);
      const open = !this.folded.has(a.address);
      return div()
        .id(`fold-${a.address}`)
        .h(20)
        .px(4)
        .gap(4)
        .flex()
        .items_center()
        .rounded(4)
        .text_size(11)
        .text_color(open ? t.dim : (t[top] ?? t.dim))
        .cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click((_e, cx) => {
          cx.stop_propagation();
          open ? this.folded.add(a.address) : this.folded.delete(a.address);
          cx.notify();
        })
        .child(chevron(t, open))
        .when(!open, (el) => el.child(String(subs.length)));
    };

    // Rows show only the session title, in priority, pinned and grouped views.
    // Folder names belong to the optional space group header, not each row.
    const labels = new Map(list.map(a => [a.address, title(a)]));
    const label = (a) => labels.get(a.address);

    const row = (a, i, subs = []) => {
      // Match Spaces: selection, never activity, determines the whole name's tone.
      const labelColor = a.focused ? t.foreground : t.muted;
      const pic = programIcon(a.program, t.foreground);
      // An agent on another machine (`vps/t7`) says which.
      const machine = a.address.includes("/") ? a.address.split("/")[0] : null;
      if (collapsed) {
        return h_flex()
          .id(`ag-${a.address}`)
          .w(U.control).h(U.control).self_center()
          .px(0)
          .flex_none()
          .items_center()
          .justify_center()
          .gap(2)
          .rounded(U.radius)
          .when(a.focused, el => el.bg(t.selected))
          .hover((s) => s.bg(itemHover(t, a.focused)))
          .on_click(() => run("pane.focus", { pane: a.pane }))
          .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.menu(a); })
          .child(div().w(i >= 9 ? 12 : 8).flex_none().whitespace_nowrap().text_center().text_size(i >= 9 ? 10 : U.font).text_color(labelColor).child(String(i + 1)))
          .child(h_flex().w(14).flex_none().items_center().justify_center().child(this.status(t, a, true)));
      }
      const when = this.since(a);
      const isPinned = a.pinned;
      // A generic numeric title falls back to the agent name, never its folder.
      const name = /^\d+$/.test(label(a)) ? a.program?.name || label(a) : label(a);
      return h_flex()
        .id(`ag-${a.address}`)
        .w_full().min_w(0).pl(8).pr(4)
        .h(U.row)
        .flex_none()
        .rounded(U.radius)
        .items_center()
        .gap(U.gap)
        .when(a.focused, (el) => el.bg(t.selected))
        .cursor_pointer()
        .hover((s) => s.bg(itemHover(t, a.focused)))
        .on_click(() => run("pane.focus", { pane: a.pane }))
        .on_mouse_down("right", (_e, cx) => { cx.stop_propagation(); this.menu(a); })
        .child(pic.id(`agent-fold-${a.address}`)
          .when(subs.length > 0, el => el.on_click((_e, cx) => {
            cx.stop_propagation();
            this.folded.has(a.address) ? this.folded.delete(a.address) : this.folded.add(a.address);
            cx.notify();
          })))
        .child(div().id(`agent-name-${a.address}`).flex_1().min_w(0).truncate().text_color(labelColor).child(name))
        .child(h_flex().id(`agent-meta-${a.address}`).flex_none().gap(6).items_center()
          .when(Boolean(machine), el => el.child(div().max_w(48).truncate().text_size(U.meta).text_color(t.dim).child(machine)))
          .when(subs.length > 0, el => el.child(fold(a, subs)))
          .child(this.numericSlot(t, `agent-age-${a.address}`, when ? duration(now - when) : ""))
          .child(this.statusSlot(t, a, byPriority && !isPinned)));
    };

    // A group's header; it folds the group. Folded, it says how many and the most urgent state.
    const header = (g) => {
      const open = !this.folded.has(g.id);
      const top = g.members.reduce((m, a) => ((RANK[a.status] ?? 0) > (RANK[m] ?? 0) ? a.status : m), null);
      return h_flex()
        .id(g.id)
        .w_full().pl(8).pr(4)
        .rounded(U.radius)
        .h(U.row)
        .flex_none()
        .gap(U.gap)
        .items_center()
        .text_size(U.meta)
        .cursor_pointer()
        .hover((s) => s.bg(t.hover).text_color(t.foreground))
        .on_click((_e, cx) => {
          open ? this.folded.add(g.id) : this.folded.delete(g.id);
          cx.notify();
        })
        .child(div().flex_1().min_w(0).truncate().text_color(t.muted).child(g.label))
        .child(h_flex().id(`agent-group-meta-${g.id}`).flex_none().gap(6).items_center()
          // Status styles have different margins (Done versus Working). Centre
          // them in one fixed rail before the three-digit count slot.
          .when(!open && !byPriority && top && top !== "idle", el => el.child(this.statusSlot(t, { status: top }, true).id(`agent-group-status-${g.id}`)))
          .child(this.numericSlot(t, `agent-count-${g.id}`, String(g.members.length)))
          .child(slot(chevron(t, open))));
    };
    const rows = collapsed
      ? list.flatMap(withKids)
      : groups.flatMap((g) => [header(g), ...(this.folded.has(g.id) ? [] : g.members.flatMap(withKids))]);

    return v_flex()
      .size_full()
      .min_h(0)
      .bg(t.chrome)
      .border_t(1)
      .border_color(t.border)
      .text_size(U.font)
      .pt(U.gap)
      .child(h_flex().id("ag-header").pl(collapsed ? 8 : 16).pr(collapsed ? 8 : 6).h(U.section).flex_none().items_center()
        .when(collapsed, el => el.justify_center())
        .when(!collapsed, el => el.justify_between().child(div().text_size(U.font).font_semibold().text_color(t.foreground).child("Agents")))
        .child(this.sortButton(t, sort)))
      .when(list.length === 0 && !collapsed, (el) =>
        el.child(emptyState(t,{id:'agents-empty',title:'No agent status yet',icon:'mods/custom-settings/agent.svg'}).h(112).flex_none().tooltip('Agents appear when they report status. Older versions and agents inside tmux may not report status')),
      )
      .child(sidebarScroll(this, 'ag-list', t, rows))
      // macOS hides the top toggle beneath the traffic lights in rail mode.
      // Only that platform needs a fallback; Windows/Linux use the top icon.
      .when(collapsed && window()?.platform === "macos", (el) =>
        el.child(
          h_flex()
            .h(28)
            .items_center()
            .justify_center()
            .child(
              div()
                .id("collapse")
                .text_size(13)
                .text_color(t.dim)
                .hover((s) => s.text_color(t.foreground))
                .on_click(toggleSidebar)
                .child("»"),
            ),
        ),
      );
  }
}
