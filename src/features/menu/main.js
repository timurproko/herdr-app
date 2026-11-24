// Custom skin: presentation-only clone of Herdr App 0.1.13's menu.
// Context menus (Herdr's items). Opened as a popup with
// props { tab: "pane" | "tab" | "space" | "global", target }.
// ↑/↓ move, Enter runs, Esc closes. An item is [label, command, args];
// a command "worktree" opens the worktree dialog instead.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { U, slot, menuSurface, menuRow, hotkey, badge, spaceBadgeColor, menuHeading } from "./ui.js";
import { displaySpace } from './directory.js';
import { openSettings } from './settings-dialog.js';
import { inspectTabMove, tabMoveDestinations, requestTabMove } from './tab-moves.js';
import { footerItems } from './sidebar-footer.js';
import { customizationUpdateAvailable } from './customization-updates.js';
import { divider, dividerHeight } from './modal-layout.js';
import { spaceColorPicker, setSpaceColor, selectedColorIndex, colorAt as colorValueAt, COLOR_COUNT } from './space-colors.js';
import { requestInlineTabRename } from './tab-rename.js';
import { requestInlineSpaceRename } from './space-rename.js';
import { closeWithConfirmation } from './close-space.js';
import { pluginAllows, pluginEvent, pluginMenuItems, pluginWorkspaceLinks } from './plugins.js';
import { run, props, closeOverlay, openOverlay, theme, keys, terminals, spaces, panes, agents, shared, notify, updates } from "./host.js";

function items(p, git, pluginItems = []) {
  p = p ?? {};
  const tg = p.target ?? {};
  switch (p.tab) {
    case "agent": {
      const agent = agents().find(a => a.address === tg.terminal);
      const terminal = terminals().find(t => t.address === tg.terminal);
      const pinned = agent?.pinned ?? Boolean(terminal?.labels?.["herdr.pinned"]);
      const pane = panes().find(p => p.terminal === tg.terminal);
      return [
        [pinned ? "Unpin" : "Pin to the top", "terminal.pin", { terminal: tg.terminal, pinned: !pinned }],
        ...pluginItems,
        pane ? ["Close", "pane.close", { pane: pane.pane }] : ["Close", "terminal.kill", { terminal: tg.terminal }],
      ];
    }
    case "footer":
      return footerItems().map(item => [item.label, item.action.command, item.action.args, item.icon, null, false, null, item.id]);
    case "pane": {
      // A kept sub-agent can go back under its parent, still running.
      const all = terminals();
      const term = all.find((t) => t.address === tg.terminal);
      const parent = term?.parent && all.find((t) => t.address === term.parent);
      // Once they go to the program, Shift+right-click still opens this menu.
      const toProgram = term?.labels?.["herdr.right-click"] === "program";
      return [
        ["Split right", "pane.split", { direction: "right", pane: tg.pane }],
        ["Split down", "pane.split", { direction: "down", pane: tg.pane }],
        ["Zoom", "pane.zoom", { pane: tg.pane }],
        ...(term
          ? [
              toProgram
                ? ["Use Herdr right-click menu", "terminal.right_click", { terminal: term.address, to: "menu" }]
                : ["Send right-clicks to pane", "terminal.right_click", { terminal: term.address, to: "program" }],
            ]
          : []),
        ...(parent ? [[`Send back to ${parent.name || parent.address}`, "terminal.park", { terminal: term.address }]] : []),
        ["Close pane", "pane.close", { pane: tg.pane }],
      ];
    }
    case "tab":
      return [
        ["New tab", "tab.new", { space: tg.space }],
        ["Rename", "tab.rename", { id: tg.id }],
        ["Move to…", "custom.move-menu", {}],
        ["Close", "tab.close", { id: tg.id }],
      ];
    case "space":
      return [
        ["Rename", "space.rename", { id: tg.id }],
        ...(git ? [["New worktree", "worktree", { space: tg.id, folder: tg.folder, action: "new" }], ["Open worktree", "worktree", { space: tg.id, folder: tg.folder, action: "open" }]] : []),
        ...(git === "linked" ? [["Remove worktree", "worktree", { space: tg.id, folder: tg.folder, action: "remove" }]] : []),
        ["Close", "space.close", { id: tg.id }],
      ];
    default:
      return [
        ["New space", "space.new", {}],
        ["Keybinds", "app.help", {}],
        ["Custom appearance", "custom.settings", { section: "look" }],
      ];
  }
}

function separates(it, i, list) {
  return i > 0 && (list[i - 1][1] === 'custom.move-back' || it[1] === 'tab.rename' || it[1].endsWith('.close') || it[1] === 'terminal.kill' || it[1] === 'app.help'
    || (it[1] === 'app.theme' && list[i - 1][1] !== 'app.theme'));
}

function menuIcon(command, args) {
  if (command === 'custom.move-menu') return 'mods/custom-workspace-chrome/chevron-right.svg';
  if (command === 'custom.move-back') return 'mods/custom-workspace-chrome/chevron-left.svg';
  if (command.startsWith('custom.move') || command === 'custom.repair-tab') return 'mods/custom-workspace-chrome/chevron-right.svg';
  if (command === "terminal.pin") return `mods/custom-workspace-chrome/${args.pinned ? "pin" : "pin-off"}.svg`;
  if (command === "custom.settings") return 'mods/custom-workspace-chrome/settings.svg';
  const name = (command.endsWith(".close") || command === "terminal.kill") ? "x" : command.endsWith(".rename") ? "square-pen" : command.endsWith(".new") ? "plus" : command === "worktree" ? "git-branch" : command === "app.help" ? "terminal" : command === "app.theme" ? "settings" : command === "pane.split" ? "panel-right" : command === "pane.zoom" ? "square" : "terminal";
  return `mods/custom-workspace-chrome/${name}.svg`;
}

// The key bound to a command, for the hint on the right.
function shortcut(name, args) {
  // `pane.split:right` binds pane.split with { direction: "right" }.
  const value = args && Object.values(args)[0];
  const k = keys().find((b) => b.section === "global" && (b.action === name || b.action === `${name}:${value}`));
  return hotkey(k?.keys);
}

export default class Menu extends View {
  init(_props, cx) {
    this.at = -1;
    this.keyboard = false;
    this.colorAt = -1;
    // Freeze the sidebar's checkout snapshot for this popup's whole lifetime.
    // If discovery is pending, offer New/Open now; the dialog validates Git.
    // Never insert rows after opening, especially above the destructive Close.
    const checkout = props()?.target?.checkout;
    this.git = checkout === undefined ? "unknown" : checkout;
    this.moveTo = false;
    this.moveCapability = null;
    this.handle = cx.focus_handle();
    const p = props();
    const source = p?.tab === 'space' && spaces().find(s => s.id === p.target?.id);
    this.colorSource = source ? {id: source.id, machine: source.machine ?? null} : null;
    const links = source ? pluginWorkspaceLinks({presentation:true}).filter(l => l.parent === source.id || l.child === source.id) : [];
    this.colorAmbiguous = links.length > 1;
    this.colorPair = links.length === 1 ? {...links[0]} : null;
    this.colorTarget = this.colorPair?.parent ?? this.colorSource?.id;
    // Each mod must witness verification itself; sidebar proof is display-only here.
    // The generic lifecycle yields before reading or joining a shared in-flight read.
    if (this.colorPair) pluginEvent('workspace.context.refresh', { owner: this, cx });
    this.pluginItems = p?.tab === 'agent' ? pluginMenuItems('agents.context', { terminal: p.target?.terminal })
      .map(action => [action.label, 'custom.plugin-action', {}, action.icon, null, false, action.run]) : [];
    // Do not focus the popup: right-click is a paste gesture, not a menu.
    // Resolve its clicked pane/terminal pair before using the focus-based paste API.
    if (p?.tab === "pane") {
      const target = p.target;
      const clicked = target?.terminal && panes().find(pane => pane.pane === target.pane && pane.terminal === target.terminal);
      closeOverlay(p.overlay);
      if (clicked) {
        run("pane.focus", { pane: target.pane });
        run("terminal.paste");
      }
      return;
    }
    this.handle.focus();
    // Begin the read-only preflight while the parent context menu is visible.
    // The destination list itself comes immediately from Herdr's live snapshot.
    if (p?.tab === 'tab' && spaces().some(s => s.id === p.target?.space && s.tabs?.some(t => t.id === p.target?.id))) this.checkMove(cx);
  }

  chooseColor(color, cx) {
    const p = props();
    if (p?.tab !== 'space') return;
    if (!this.colorReady()) {
      notify({title:'Space colour unavailable', body:'The linked spaces changed or could not be verified. Reopen this menu.', level:'warning'});
      return;
    }
    setSpaceColor(this.colorTarget, color);
    closeOverlay(p.overlay);
    cx.notify();
  }

  colorReady() {
    const source = this.colorSource, all = spaces();
    if (!source || this.colorAmbiguous || props()?.tab !== 'space' || props().target?.id !== source.id
      || !all.some(s => s.id === source.id && (s.machine ?? null) === source.machine)) return false;
    const shown = pluginWorkspaceLinks({presentation:true}).filter(l => l.parent === source.id || l.child === source.id);
    if (!this.colorPair) return shown.length === 0;
    const pair = this.colorPair;
    const same = l => l.parent === pair.parent && l.child === pair.child && l.binding === pair.binding;
    // The provider verifies this displayed binding even when no live workers remain.
    // Retained presentation alone is never permission; live move links are separate.
    return shown.length === 1 && same(shown[0])
      && [pair.parent,pair.child].every(id => all.some(s => s.id === id && (s.machine ?? null) === source.machine))
      && pluginAllows('spaces.color', {pair});
  }

  checkMove(cx) {
    if (this.moveCapability || this.moveChecking) return;
    this.moveChecking = true;
    const target = props().target;
    cx.spawn(async cx => { this.moveCapability = await inspectTabMove(target); this.moveChecking = false; cx.notify(); });
  }

  list() {
    if (this.moveTo) {
      const back = ['Back', 'custom.move-back', {}];
      if (this.moveCapability && !this.moveCapability.ok) return [back, [this.moveCapability.message || 'Moving is unavailable', 'custom.move-empty', {}, null, null, true]];
      if (this.moveCapability?.repairNeeded) return [back, ['Repair move metadata', 'custom.repair-tab', {}]];
      const destinations = tabMoveDestinations(props()?.target?.space);
      return [['Back', 'custom.move-back', {}], ...destinations.map(s => [displaySpace(s).name, 'custom.move-tab', { destination: s.id }, null, s]),
        ...(destinations.length ? [] : [['No other spaces on this machine', 'custom.move-empty', {}, null, null, true]])];
    }
    const list = items(props(), this.git, this.pluginItems);
    if (props()?.tab === 'tab' && this.moveCapability?.repairNeeded) list.splice(list.length - 1, 0, ['Repair move metadata', 'custom.repair-tab', {}]);
    return list;
  }

  unavailable(it) {
    return it[5] || (['custom.move-tab', 'custom.repair-tab'].includes(it[1])
      && (!this.moveCapability?.ok || (it[1] !== 'custom.repair-tab' && this.moveCapability.repairNeeded)));
  }

  choose(i, cx, keyboard = false) {
    const it = this.list()[i];
    if (!it || this.unavailable(it)) return;
    this.keyboard = keyboard;
    if (it[1] === 'custom.move-menu' || it[1] === 'custom.move-back') {
      this.moveTo = it[1] === 'custom.move-menu'; this.at = this.moveTo && keyboard ? 1 : -1;
      if (this.moveTo) this.checkMove(cx);
      cx.notify(); return;
    }
    if (it[1] === 'custom.move-tab' || it[1] === 'custom.repair-tab') {
      if (!requestTabMove(props().target, it[2].destination, this.moveCapability, it[1] === 'custom.repair-tab' ? 'repair' : 'move')) {
        notify({ title: 'Tab move unavailable', body: 'The target changed or another move is running. Reopen this menu.', level: 'warning' });
        return;
      }
      closeOverlay(props()?.overlay); return;
    }
    closeOverlay(props()?.overlay);
    if (it[1] === 'custom.plugin-action') {
      it[6](cx);
      return;
    }
    if (it[1] === "custom.settings") openSettings(it[2]);
    else if (it[1] === "worktree") openOverlay({ mod: "custom-worktree", kind: "dialog", frame: "none", ...(it[2].action === "open" ? { width: 560, height: 480 } : { width: 440, height: 300 }), props: it[2] });
    else if (it[1] === 'tab.rename' && requestInlineTabRename({ command: { name: it[1], args: it[2] } })) return;
    else if (it[1] === 'space.rename' && requestInlineSpaceRename({ command: { name: it[1], args: it[2] } })) return;
    else closeWithConfirmation(it[1], it[2]);
  }

  moveExplanation(t, it, i) {
    const text = it[0];
    // A note, not a disabled action: normal wrapping and intrinsic height keep
    // the reason readable. The non-shrinking row can exceed the scroll viewport.
    return h_flex().id(`move-explanation-${i}`).w_full().h_auto().min_h(U.row).flex_none()
      .px(8).py(6).gap(U.gap).items_start().text_color(t.muted)
      .role('note').accessibility_label(text)
      .child(slot(svg(menuIcon(it[1], it[2])).size(U.smallIcon).text_color(t.muted)))
      .child(div().flex_1().min_w(0).whitespace_normal().line_height(18).child(text))
      .on_size_change((size, cx) => {
        // Native sizes are already logical pixels; do not divide by app zoom.
        // Ignore a late callback from a replaced/closed explanation.
        if (!this.moveTo || this.list()[i]?.[0] !== text || !Number.isFinite(size.height) || size.height <= 0) return;
        const height = Math.max(U.row, Math.ceil(size.height));
        if (height !== this.moveExplanationHeight) { this.moveExplanationHeight = height; cx.notify(); }
      });
  }

  render(cx) {
    if (props()?.tab === "pane") return div();
    const t = theme();
    const list = this.list();
    // An overflow container has zero min-content height. Give the popup an
    // explicit measured row budget, rather than letting fit-content collapse it.
    const showSpacesHeading = this.moveTo && (!this.moveCapability || (this.moveCapability.ok && !this.moveCapability.repairNeeded));
    // Until the note's first native measurement, reserve the full bounded
    // viewport, not one 28px line. Later height changes follow native wrapping.
    const rowsHeight = list.reduce((height, it) => height + (it[1] === 'custom.move-empty' ? (this.moveExplanationHeight ?? 320) : U.row), 0);
    const listHeight = Math.min(320, rowsHeight + list.filter((it, i) => separates(it, i, list)).length * dividerHeight(true) + (showSpacesHeading ? 24 : 0));
    const colorSpace = props()?.tab === 'space' && props().target?.id === this.colorSource?.id
      && spaces().some(s => s.id === this.colorSource.id) && spaces().find(s => s.id === this.colorTarget);
    const focusColors = () => { this.at = -1;this.colorAt = Math.max(0, selectedColorIndex(colorSpace.id)); };
    return menuSurface(t, v_flex())
      .id("menu")
      .track_focus(this.handle)
      .w_full()
      .min_h(0)
      .on_key_down((e, cx) => {
        if (!['left', 'right', 'down', 'up', 'enter', 'escape'].includes(e.key)) return;
        this.keyboard = true;
        if (this.moveTo && (e.key === 'left' || e.key === 'escape')) {
          this.moveTo = false; this.at = -1;
        } else if (e.key === 'right' && list[this.at]?.[1] === 'custom.move-menu') {
          this.choose(this.at, cx, true);
        } else if (colorSpace && (e.key === 'left' || e.key === 'right')) {
          if (this.colorAt < 0) focusColors();
          else this.colorAt = (this.colorAt + (e.key === 'right' ? 1 : -1) + COLOR_COUNT) % COLOR_COUNT;
        } else if (e.key === "down") {
          if (colorSpace && this.colorAt >= 0) { this.colorAt = -1;this.at = 0; }
          else if (colorSpace && this.at === list.length - 1) focusColors();
          else this.at = (this.at + 1) % list.length;
        } else if (e.key === "up") {
          if (colorSpace && this.colorAt >= 0) { this.colorAt = -1;this.at = list.length - 1; }
          else if (colorSpace && this.at === 0) focusColors();
          else this.at = this.at < 0 ? list.length - 1 : (this.at + list.length - 1) % list.length;
        } else if (e.key === "enter") {
          if (colorSpace && this.colorAt >= 0) this.chooseColor(colorValueAt(this.colorAt), cx);
          else this.choose(this.at, cx, true);
        }
        else if (e.key === "escape") closeOverlay(props().overlay);
        else return;
        cx.stop_propagation();cx.notify();
      })
      .when(Boolean(colorSpace), el => el.child(spaceColorPicker(this, t, colorSpace.id)).child(divider(t,{compact:true,inset:8})))
      .child(v_flex().h(listHeight).flex_none().overflow_y_scrollbar().children(
        list.map((it, i) =>
          v_flex().flex_none()
            .when(separates(it, i, list), el => el.child(divider(t,{compact:true,inset:8})))
            .when(showSpacesHeading && i === 1, el => el.child(menuHeading(t, 'Available spaces', h_flex().id('move-spaces-heading').h(24).flex_none().px(8).items_center())))
            // The shared popup-menu row (ui.js); the pointer's highlight waits while the keyboard chooses.
            .child(it[1] === 'custom.move-empty' ? this.moveExplanation(t, it, i) : menuRow(t, { id: this.moveTo ? `move-mi-${i}` : `mi-${i}`, label: it[0], highlighted: this.keyboard && i === this.at, pointer: !this.keyboard,
              icon: it[4] ? badge(String(it[4].index ?? spaces().findIndex(s => s.id === it[4].id) + 1), spaceBadgeColor(t, it[4], shared('space.colors') ?? {}))
                : svg(it[3] ?? menuIcon(it[1], it[2])).size(U.smallIcon).text_color(t.muted),
              hint: shortcut(it[1], it[2]),
              onHover: (hovered, cx) => { if (hovered) { if (!this.keyboard) { this.at = -1;this.colorAt = -1; } if (it[1] === 'custom.move-menu') this.checkMove(cx); } cx.notify(); },
              onClick: (_e, cx) => this.choose(i, cx) })
              .text_color(this.unavailable(it) ? t.dim : t.foreground)
              .when(props()?.tab === 'footer' && it[7] === 'settings' && Boolean(updates().app.ready || customizationUpdateAvailable()),
                el => el.child(div().size(6).rounded_full().bg(t.accent)))
              .on_mouse_move((_e, cx) => {
                if (this.keyboard || this.at >= 0 || this.colorAt >= 0) { this.keyboard = false; this.at = -1; this.colorAt = -1; cx.notify(); }
              })),
        ),
      ));
  }
}
