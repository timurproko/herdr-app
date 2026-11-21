// Custom skin: presentation-only clone of Herdr App 0.1.13's pane.
// A pane's header, for layouts that frame their panes:
//   { "tab": "active", "pane": { "header": { "content": { "mod": "pane" } } } }
// Shows the program's icon (the app's program table), the agent's name or
// the terminal's title, the folder, and the agent's status; buttons split, zoom and close
// this pane. Props from the app: { pane, terminal }. Click: focus the pane.

import { View, div, svg, image } from "gpui-kit";
import { h_flex } from "gpui-base";
import { U, slot, subtleActionFill, reveal, headerTools, refreshButton, rolePill, iconButton, panelTitle, tag, statusBulb } from "./ui.js";
import { spaces, panes, terminals, props, run, hc, theme, openOverlay } from "./host.js";

import { fileIconAsset } from './file-icons.js';
import { fileHeader, requestFileReload, fileReloadPending } from './file-header.js';
import { programIcon } from './program-icon.js';
import { paneDirectory, spaceDirectory } from './directory.js';
import { closeWithConfirmation } from './close-space.js';

// What a terminal is in a crew session, from its labels: the coordinator (labelled by the
// Crew plugin's launch) or a worker and its kind (labelled by the crew tool). null otherwise.
const CREW_KINDS = Object.freeze({ scout: 'Scout', ship: 'Ship', review: 'Review', fix: 'Fix' });
function crewRole(labels) {
  if (!labels || typeof labels !== 'object') return null;
  if (labels['custom.crew.home'] === '1') return 'Crew';
  if (typeof labels['crew.task'] !== 'string' || !labels['crew.task']) return null;
  return Object.hasOwn(CREW_KINDS, labels['crew.kind']) ? CREW_KINDS[labels['crew.kind']] : 'Worker';
}

export default class Pane extends View {
  init(_props, cx) {
    this.hovered = false;
    const pane = props()?.pane;
    if (!pane || panes().find(p => p.pane === pane)?.mod) return;
    // Headers can exist before core has finished spawning the terminal. Wait for
    // a live address and set the documented label directly: transient failures
    // retry silently instead of producing app-command error toasts.
    cx.spawn(async cx => {
      for (let attempt = 0; attempt < 60; attempt++) {
        const current = panes().find(p => p.pane === pane);
        if (current?.mod) return;
        const terminal = current?.terminal ?? props()?.terminal;
        const live = terminal && terminals().find(t => t.address === terminal && t.state === "live");
        if (live?.labels?.["herdr.right-click"] === "menu") return;
        if (live) {
          try { if ((await hc(["label", terminal, "herdr.right-click=menu", "--json"]))?.code === 0) return; } catch {}
        }
        await cx.sleep(500);
      }
    });
  }

  button(t, id, icon, command, args, enabled = true, action = null) {
    return iconButton(t, { id, icon: icon.includes('/') ? icon : `mods/custom-pane/${icon}.svg`, label: ({ 'split-right': 'Split right', 'split-down': 'Split down', zoom: 'Zoom', unzoom: 'Unzoom', close: 'Close pane' })[icon] ?? icon, enabled: this.hovered, available: enabled,
      iconSize: icon === 'mods/custom-files/refresh.svg' ? U.tinyIcon : U.smallIcon,
      onClick: () => { if (action) action(); else run(command, args); } });
  }

  render(cx) {
    const t = theme();
    const all = panes();
    const p = all.find(p => p.pane === props()?.pane);
    if (!p) return div();
    const canZoom = p.zoomed || all.filter(other => other.tab === p.tab).length > 1;
    const file = p.mod === 'custom-files', start = p.mod === 'custom-space-start';
    const space = file || start ? spaces().find(s => s.tabs.some(tab => tab.id === p.tab)) : null;
    const fileName = file ? fileHeader(p.tab, space?.tabs.find(tab => tab.id === p.tab)?.name ?? 'File') : null;
    const directory = start && space ? spaceDirectory(space) : paneDirectory(p);
    const name = start ? 'Start' : fileName || ((p.program?.agent || p.program?.shell) && p.program.name) || p.title || p.program?.name || "shell";
    const pic = file ? slot(image(fileIconAsset(fileName)).size(U.icon)).text_size(U.font)
      : programIcon(start ? { icon: 'mods/custom-pane/racing-flag.svg', tint: true } : p.program, t.foreground);
    const st = p.status;
    const canSwitchShell = !p.mod && p.program?.shell && !p.program?.agent && !st;
    const pane = p.pane;
    const role = p.terminal ? crewRole(terminals().find(t => t.address === p.terminal)?.labels) : null;
    const reloading = file && fileReloadPending(space?.id, fileName);
    const actionWidth = U.insetControl * (file ? 5 : 4) + 4 * (file ? 4 : 3);
    return h_flex()
      .id(`pane-head-${pane}`)
      .relative().size_full().overflow_hidden()
      .pl(canSwitchShell ? 2 : 10).pr(U.gutter)
      .gap(U.gap)
      .items_center()
      .bg(t.surface)
      .border_b(1)
      .border_color(t.border)
      .text_size(U.meta)
      .on_hover((hovered, cx) => { this.hovered = hovered; cx.notify(); })
      .on_click(() => run("pane.focus", { pane }))
      .when(!canSwitchShell, el=>el.child(pic))
      .child(canSwitchShell
        ? panelTitle(t, { id: 'pane-title-slot', icon: pic, label: name, labelId: 'pane-name', labelColor: p.focused ? t.foreground : t.muted, medium: false, shrink: true, menuLabel: 'Open tab' },
            () => openOverlay({mod:'custom-new-menu',kind:'popup',frame:'none',width:200,height:360,props:{switchPane:pane,switchTerminal:p.terminal}})).max_w(200)
        : h_flex().id('pane-title-slot').min_w(0).items_center()
          .when(file, el=>el.flex_1().pr(actionWidth + 16 - U.gutter))
          .when(!file, el=>el.max_w(200))
          .child(div().id('pane-name').min_w(0).max_w_full().flex_shrink(1).truncate()
            .when(file, el=>el.tooltip(name))
            .text_color(p.focused ? t.foreground : t.muted).child(name)))
      .when(st === "blocked", el => el.child(tag(t, `pane-needs-you-${pane}`, "Needs you", { tone: t.blocked })))
      .when(st === "done", el => el.child(statusBulb(t, "done")))
      .when(!file, el=>el.child(h_flex().id('pane-folder-slot').flex_1().min_w(0).items_center().pr(actionWidth + 16 - U.gutter)
        // Shell titles already have 8px trailing button padding; match that gap for agents/programs.
        .when(!canSwitchShell, el=>el.pl(U.gap))
        .child(div().id('pane-folder').min_w(0).max_w_full().flex_shrink(1).truncate().text_color(t.muted)
          .when(Boolean(directory.cwd), e=>e.tooltip(directory.cwd)).child(directory.name))))
      // The crew role sits in the middle of the header, over the row and outside its flow, so
      // the title and folder keep their places. It has no handlers: clicks pass to the header.
      .when(Boolean(role), el => el.child(div().absolute().inset_0().flex().items_center().justify_center()
        .child(rolePill(t, role, { status: true }))))
      // Keep tools absolute; the file path's intrinsic tooltip box stops before their rail.
      .child(reveal(headerTools(h_flex()).id("pane-actions")
        .w(actionWidth).rounded(U.radius).bg(t.surface), this.hovered)
        .when(file, el=>el.child(refreshButton(t, { id: `ph-refresh-${pane}`, icon: 'mods/custom-files/refresh.svg', label: 'Reload file', owner: this, scope: JSON.stringify([space?.id,fileName]),
          enabled: this.hovered, busy: reloading, size: U.insetControl, iconSize: U.tinyIcon, radius: U.insetRadius,
          color: t.dim, hover: subtleActionFill(t), onClick: ()=>requestFileReload(space?.id, fileName) })))
        .child(this.button(t, `ph-r-${pane}`, "split-right", "pane.split", { direction: "right", pane }))
        .child(this.button(t, `ph-d-${pane}`, "split-down", "pane.split", { direction: "down", pane }))
        .child(this.button(t, `ph-z-${pane}`, p.zoomed ? "unzoom" : "zoom", "pane.zoom", { pane }, canZoom))
        .child(this.button(t, `ph-x-${pane}`, "close", "pane.close", { pane }, true,
          () => closeWithConfirmation('pane.close', { pane }))));
  }
}
