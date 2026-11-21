// Custom skin: presentation-only clone of Herdr App 0.1.13's picker.
// Go to a tab. Drops from the Terminals layout's space chip (popup, at: "top"). Spaces with
// something that needs you come first, quiet spaces (no agent running)
// fold into "earlier". Type to filter, ↑/↓ and Enter to go, ctrl+d to close
// a tab, Esc to leave. Last rows: new work (a tab here, a space on this
// computer or on each connected machine).

import { View, div, svg, image } from "gpui-kit";
import { v_flex, h_flex, InputState, Input, v_virtual_list, VirtualListScrollHandle, Scrollbar } from "gpui-base";
import { U, slot, itemHover, statusBulb, badge, spaceBadgeColor, dialogHeader, dialogSurface, searchHeader, emptyState, DIALOG_SCROLL, dialogScrollFrame, dialogScrollbar, dialogScrollRow } from "./ui.js";
import { agents, spaces, terminals, panes, run, props, closeOverlay, openOverlay, machines as knownMachines } from "./host.js";
import { liveTheme as theme, ensureNativeSelection } from "./look.js";
import { fileIconAsset } from './file-icons.js';
import { divider, dividerHeight } from './modal-layout.js';
import { spaceTitle } from './space-title.js';
import { bottomFade } from './scroll-fade.js';
import { displaySpace, tabDirectory } from './directory.js';
import { reconcileSpaceColors } from './space-color-state.js';
import { closeWithConfirmation } from './close-space.js';
import { isStartTab, workTabs } from './space-lifecycle.js';
// Absorb the old bottom inset into the viewport: rows and the fade now reach
// the dialog edge without changing the overlay's reserved height.
const LIST_HEIGHT = 320 + DIALOG_SCROLL.inset;
// Presentation only: title-case labels, preserving familiar product spellings.
function jumpProgramLabel(value) {
  const text = String(value ?? '').trim();
  const brand = { __proto__: null, powershell: 'PowerShell', pwsh: 'PowerShell', a1: 'A1', wsl: 'WSL', ssh: 'SSH' };
  return text.split(/\s+/u).map(word => brand[word.toLowerCase()] ?? word.replace(/^\p{L}/u, ch => ch.toUpperCase())).join(' ');
}
// Use the opening snapshot for terminal names, just as for agent names.
function tabProgramNames(tab, agents, panes, terminals) {
  if (agents.length) return agents.map(a => jumpProgramLabel(a.program?.name ?? "Agent")).join(" · ");
  return panes.filter(p => p.tab === tab && p.terminal && !p.mod).map(p => {
    const terminal = terminals.find(t => t.address === p.terminal);
    return jumpProgramLabel(p.program?.name ?? terminal?.program?.name ?? terminal?.name ?? "Terminal");
  }).join(" · ");
}

// Presentation-only labels from current host facts; never rename native tabs.
function jumpTabName(tab, mine, listed, directory) {
  const agentPanes = mine.filter(p => p.terminal && !p.mod && (p.program?.agent || listed.some(a => a.address === p.terminal)));
  const lead = agentPanes.find(p => p.focused) ?? agentPanes[0];
  const agent = listed.find(a => a.address === lead?.terminal) ?? listed[0];
  if (agent || lead) {
    const programs = [agent?.program?.name, agent?.program?.key, agent?.app, lead?.program?.name, lead?.program?.key, 'agent', 'terminal', 'shell']
      .filter(s => typeof s === 'string').map(s => s.toLowerCase());
    const meaningful = value => {
      if (typeof value !== 'string') return '';
      const text = value.trim().replace(/^[^\p{L}\p{N}]+/u, '').trim();
      const path = /^(?:[A-Za-z]:[\\/]|[\\/]|~(?:[\\/]|$))/u;
      return !text || /^\d+$/u.test(text) || path.test(value.trim()) || path.test(text) || programs.includes(text.toLowerCase()) ? '' : text;
    };
    return (tab.named !== false && meaningful(tab.name)) || meaningful(agent?.title) || meaningful(lead?.title) || 'New session';
  }
  if (mine.some(p => p.terminal && !p.mod)) return directory?.cwd || (tab.named ? tab.name : 'Terminal');
  return tab.name;
}

function jumpTabLabels(tab, allPanes, allAgents, allTerminals) {
  const directory = tabDirectory(tab.id, allPanes, allTerminals);
  const mine = allPanes.filter(p => p.tab === tab.id), listed = allAgents.filter(a => a.tab === tab.id);
  return { directory: directory.cwd ?? '', source_name: tab.name, name: jumpTabName(tab, mine, listed, directory) };
}

export default class Picker extends View {
  init(_props, cx) {
    // Freeze membership at opening: late host/status refreshes must not reveal new rows.
    const allPanes=panes(),allTerminals=terminals(),allAgents=agents(),nativeSpaces=spaces();
    const allSpaces=nativeSpaces.map(s=>({...displaySpace(s,allPanes,allTerminals),tabs:s.tabs.map(tab=>{
      return {...tab,...jumpTabLabels(tab,allPanes,allAgents,allTerminals)};
    })}));
    this.world = JSON.parse(JSON.stringify({ spaces: allSpaces, agents: allAgents, terminals: allTerminals, panes: allPanes }));
    this.colors = { ...reconcileSpaceColors(nativeSpaces) };
    this.filter = "";
    this.inputFocused = true;
    ensureNativeSelection(cx);
    this.input = InputState.new({ placeholder: "Search for a tab, space or agent…" });
    this.input.on("focus", (_e, cx) => { this.inputFocused = true; ensureNativeSelection(cx); cx.notify(); });
    this.input.on("blur", (_e, cx) => { this.inputFocused = false; cx.notify(); });
    this.input.on("change", (_e, cx) => { this.filter = this.input.value(); this.at = 0; this.visibleRange = null; this.moreBelow = true; this.listScroll.scroll_to_item(0); this.syncScrollHint(cx); cx.notify(); });
    this.input.on("submit", () => this.go(this.rows().filter(r => r.kind === "ctx" || r.kind === "new" || r.kind === "space")[this.at]));
    this.input.focus();
    this.at = null;
    this.visibleRange = null;
    this.listScroll = VirtualListScrollHandle.new();
    this.showEarlier = false;
    this.machines = knownMachines().filter(m => m.name && m.layout === "ready").map(m => m.name).sort();
    this.handle = cx.focus_handle();
    const rows = this.rows(), current = rows.findIndex(r => r.kind === 'ctx' && r.w.active && r.ctx.active);
    if (current >= 0) this.listScroll.scroll_to_item(current, 'center');
    this.syncScrollHint(cx);
  }

  // The virtual renderer reports its range during layout, where notify is forbidden.
  // Coalesce input/resize events into one post-frame read, never a polling loop.
  syncScrollHint(cx) {
    if (this.hintPending) return;
    this.hintPending = true;
    cx.spawn(async task => {
      await task.sleep(32);
      this.hintPending = false;
      const more = this.visibleRange ? this.visibleRange.end < this.rows().length : true;
      if (more !== this.moreBelow) { this.moreBelow = more; task.notify(); }
    });
  }

  close() {
    closeOverlay(props().overlay);
  }

  rows() {
    const f = this.filter.trim().toLowerCase();
    const all = this.world.agents;
    const live = this.world.terminals.filter((x) => x.state === "live");
    const teamOf = (addrs) => {
      let n = 0;
      const walk = (a) => live.filter((x) => x.parent === a).forEach((k) => (n++, walk(k.address)));
      addrs.forEach(walk);
      return n;
    };
    // Keep opening IDs, order and status stable, but resolve names/search text on
    // every host redraw. Hidden retention placeholders are not navigation targets.
    const currentSpaces = spaces(), currentPanes = panes(), currentAgents = agents(), currentTerminals = terminals();
    const groups = this.world.spaces.map((snapshot) => {
      const current = currentSpaces.find(w => w.id === snapshot.id);
      const visiblePanes = current ? currentPanes : this.world.panes;
      const hasWork = workTabs(current ?? snapshot, visiblePanes).length > 0;
      const w = current ? { ...snapshot, name: displaySpace(current, currentPanes, currentTerminals).name } : snapshot;
      const ctxs = w.tabs
        .filter(ctx => {
          const exists = current?.tabs.some(tab => tab.id === ctx.id);
          const start = isStartTab(ctx, exists ? currentPanes : this.world.panes);
          return !start || (exists && !hasWork);
        })
        .map((original) => {
          const latest = current?.tabs.find(tab => tab.id === original.id);
          const ctx = latest ? { ...original, ...jumpTabLabels(latest, currentPanes, currentAgents, currentTerminals) } : original;
          const mine = all.filter((a) => a.tab === ctx.id);
          const who = tabProgramNames(ctx.id, mine, this.world.panes, this.world.terminals);
          return { w, ctx, mine, who, team: teamOf(mine.map((a) => a.address)) };
        })
        .filter((c) => !f || [w.name, c.ctx.name, c.ctx.source_name, c.ctx.directory, c.who].join(" ").toLowerCase().includes(f));
      return { w, ctxs };
    });
    const busy = groups.filter((p) => (p.w.active || p.w.status) && p.ctxs.length);
    const quiet = groups.filter((p) => !p.w.active && !p.w.status && p.ctxs.length);
    busy.sort((a, b) => (b.w.status === "blocked") - (a.w.status === "blocked"));
    const out = [];
    const add = (p) => {
      out.push({ kind: "head", w: p.w });
      for (const c of p.ctxs) out.push({ kind: "ctx", ...c });
    };
    busy.forEach(add);
    if (quiet.length) {
      out.push({ kind: "earlier", count: quiet.length });
      if (this.showEarlier || f) quiet.forEach(add);
    }
    if (!f) {
      if (out.length) out.push({ kind: 'divider', id: 'pk-commands-divider' });
      out.push({ kind: "new" });
      out.push({ kind: "space", machine: null });
      for (const m of this.machines) out.push({ kind: "space", machine: m });
    }
    return out;
  }

  go(r) {
    if (!r || !['ctx','new','space'].includes(r.kind)) return;
    this.close();
    if (r.kind === "ctx" && spaces().some(w => w.tabs.some(tab => tab.id === r.ctx.id))) run("tab.select", { id: r.ctx.id });
    else if (r.kind === "new") run("tab.new");
    else if (r.kind === "space") run("space.new", { machine: r.machine ?? "" });
  }

  activate(r, cx) {
    if (r?.kind === 'earlier') { this.showEarlier = !this.showEarlier; this.visibleRange = null; this.moreBelow = true; this.syncScrollHint(cx); cx.notify(); }
    else this.go(r);
  }

  revealSelected(rows, selected) {
    const index = rows.indexOf(selected), range = this.visibleRange;
    if (index >= 0 && (!range || index <= range.start + 1 || index >= range.end - 1))
      this.listScroll.scroll_to_item(index, 'center');
  }

  glyph(t, st) {
    return slot(statusBulb(t, st));
  }

  render() {
    const t = theme();
    const rows = this.rows();
    const pickable = rows.filter((r) => r.kind === "ctx" || r.kind === "new" || r.kind === "space");
    // Opens on where you are.
    if (this.at === null) this.at = Math.max(0, pickable.findIndex((r) => r.kind === "ctx" && r.w.active && r.ctx.active));
    this.at = Math.min(this.at, Math.max(0, pickable.length - 1));
    const sel = pickable[this.at];
    const H = { head: 32, earlier: 32, divider: dividerHeight(), new: 32, ctx: 32, space: 32 };
    const sizes = rows.map(r => H[r.kind] ?? 32), total = sizes.reduce((sum, h) => sum + h, 0);
    const height = Math.min(LIST_HEIGHT, this.listHeight ?? LIST_HEIGHT);
    // Keep truly fitting lists static, including fractional layout rounding.
    const fixed = total - height > 1;
    const rowKey = r => r.kind === 'ctx' ? `ctx:${r.ctx.id}` : r.kind === 'head' ? `head:${r.w.id}` : r.kind === 'space' ? `space:${r.machine ?? ''}` : r.kind;

    const row = (r) => {
      if (r.kind === 'divider') return divider(t,{id:r.id,inset:8});
      if (r.kind === "head") {
        return h_flex().id(`pk-head-${r.w.id}`)
          .px(8)
          .h(32)
          .gap(U.gap)
          .items_center()
          .child(badge(String(this.world.spaces.findIndex(w => w.id === r.w.id) + 1), spaceBadgeColor(t, r.w, this.colors)))
          .child(spaceTitle(t,r.w).child(r.w.name));
      }
      if (r.kind === "earlier") {
        return h_flex()
          .id("pk-earlier")
          .h(32).flex_none().items_center()
          .px(10)
          .text_size(12)
          .text_color(t.dim)
          .cursor_pointer()
          .hover((s) => s.text_color(t.foreground))
          .child(`${r.count} quiet space${r.count > 1 ? "s" : ""} ${this.showEarlier ? "▴" : "▾"}`);
      }
      const on = r === sel;
      if (r.kind === "new" || r.kind === "space") {
        const label = r.kind === "new" ? "New tab" : r.machine ? `New space on ${r.machine}` : "New space";
        return h_flex()
          .id(r.kind === "new" ? "pk-new" : `pk-space-${r.machine ?? "here"}`)
          .px(8)
          .h(30).mb(U.rowGap)
          .items_center()
          .rounded(U.radius)
          .gap(U.gap)
          .text_color(t.muted)
          .cursor_pointer()
          .when(on, (el) => el.bg(t.selected))
          .hover((s) => s.bg(itemHover(t, on)))
          .child(slot(svg("mods/custom-workspace-chrome/plus.svg").size(U.smallIcon)))
          .child(label);
      }
      const status = r.ctx.status ?? ["blocked", "done", "working", "idle"].find(st => r.mine.some(a => a.status === st));
      // Recognize real file panes, not agent tabs that happen to have file-like names.
      // Mixed tabs keep their agent status; pane kinds are frozen with the opening snapshot.
      const file = !r.mine.length && this.world.panes?.some(p => p.tab === r.ctx.id && p.mod === 'custom-files');
      const who = r.who;
      const here = r.w.active && r.ctx.active;
      return h_flex()
        .id(`pk-${r.ctx.id}`)
        .px(8)
        .h(30).mb(U.rowGap)
        .rounded(U.radius)
        .gap(U.gap)
        .items_center()
        .cursor_pointer()
        .when(on, (el) => el.bg(t.selected))
        .hover((s) => s.bg(itemHover(t, on)))
        .child(file ? slot(image(fileIconAsset(r.ctx.name)).size(U.icon)) : this.glyph(t, status))
        .child(h_flex().flex_1().min_w(0).items_center()
          .child(div().id(`pk-title-${r.ctx.id}`).min_w(0).max_w_full().flex_shrink(1).truncate()
            .tooltip(r.ctx.name).text_color(t.foreground).when(here, (d) => d.font_medium()).child(r.ctx.name)))
        .when(status === "blocked", (el) => el.child(div().text_size(11).text_color(t.blocked).child("needs you")))
        .child(div().text_size(11).text_color(t.dim).child(who + (r.team ? `  +${r.team}` : "")));
    };

    return dialogSurface(t, v_flex())
      .id("picker")
      .overflow_hidden()
      .track_focus(this.handle)
      .w_full()
      .min_h(0)
      .on_key_down((e, cx) => {
        const k = e.key;
        if (k === "escape") return this.close();
        if (!pickable.length && (k === 'down' || k === 'up')) { cx.stop_propagation(); return; }
        if (k === "down") this.at = (this.at + 1) % pickable.length;
        else if (k === "up") this.at = (this.at + pickable.length - 1) % pickable.length;
        else if (k === "d" && e.modifiers.control) {
          if (sel?.kind === "ctx") {
            this.close();
            closeWithConfirmation("tab.close", { id: sel.ctx.id });
          }
        } else return;
        if (fixed && (k === 'down' || k === 'up')) this.revealSelected(rows, pickable[this.at]);
        this.syncScrollHint(cx);
        cx.stop_propagation();
        cx.notify();
      })
      .child(dialogHeader(t, "Jump", () => this.close()))
      .child(searchHeader(t, this.input, { id: "picker-search-header", fieldId: "picker-search", focused: this.inputFocused, onClear: () => { this.filter = ''; this.at = null; this.visibleRange = null; this.moreBelow = true; this.listScroll.scroll_to_item(0); } }))
      .child(
        dialogScrollFrame(v_flex())
          .id("pk-list")
          .on_size_change((size, cx) => {
            // on_size_change already reports logical pixels, including at zoom > 1.
            if (size.height > 0 && Math.abs(size.height - (this.listHeight ?? -1)) > 0.5) {
              this.listHeight = size.height;
              this.syncScrollHint(cx);
              cx.notify();
            }
          })
          // A definite viewport prevents async host/size updates from moving the centered dialog.
          .h(LIST_HEIGHT)
          .mb(0)
          .flex_none()
          .min_h(0)
          .overflow_hidden()
          .on_scroll_wheel((_e, cx) => { this.syncScrollHint(cx); cx.stop_propagation(); })
          .on_mouse_move((_e, cx) => this.syncScrollHint(cx))
          .when(!fixed, el => el.children(rows.map(r => dialogScrollRow(row(r))
            .when(['ctx', 'new', 'space', 'earlier'].includes(r.kind), item => item.on_click((_e, cx) => this.activate(r, cx))))))
          .when(fixed, el => el
            .child(v_virtual_list('pk-native-rows', rows.length, sizes,
              i => rowKey(rows[i]),
              range => { this.visibleRange = range; return rows.slice(range.start, range.end).map(r => dialogScrollRow(row(r))); })
              .size_full().track_scroll(this.listScroll)
              .on_item_click((key, cx) => { const current = this.rows().find(r => rowKey(r) === key); this.activate(current, cx); }))
            .when(this.moreBelow !== false, frame => frame.child(bottomFade(this, 'pk-list', t.background, { left: 0, right: 8 })))
            .child(dialogScrollbar(Scrollbar.vertical('pk-native-rows').scroll_size(0, total).viewport_from_layout())))
          .when(!rows.length, el=>el.child(emptyState(t, { id: 'picker-empty' }))),
      );
  }
}
