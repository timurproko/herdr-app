// Custom skin: presentation-only clone of Herdr App 0.1.13's menu.
// Context menus (Herdr's items). Opened as a popup with
// props { tab: "pane" | "tab" | "space" | "global", target }.
// ↑/↓ move, Enter runs, Esc closes. An item is [label, command, args];
// a command "worktree" opens the worktree dialog instead.

import { View, div, svg } from "gpui-kit";
import { v_flex, h_flex } from "gpui-base";
import { U, slot, menuSurface, menuRow, hotkey, badge, spaceBadgeColor, menuHeading } from "./ui.js";
import { displaySpace } from './directory.js';
import { inspectTabMove, tabMoveDestinations, requestTabMove } from './tab-moves.js';
import { footerItems } from './sidebar-footer.js';
import { divider, dividerHeight } from './modal-layout.js';
import { spaceColorPicker, setSpaceColor, selectedColorIndex, colorAt as colorValueAt, COLOR_COUNT } from './space-colors.js';
import { requestInlineTabRename } from './tab-rename.js';
import { requestInlineSpaceRename } from './space-rename.js';
import { closeWithConfirmation } from './close-space.js';
import { pluginMenuItems } from './plugins.js';
import { run, props, closeOverlay, openOverlay, theme, keys, terminals, spaces, panes, agents, shared, notify } from "./host.js";

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
      return footerItems().map(item => [item.label, item.action.command, item.action.args, item.icon]);
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
  if (command === 'custom.move-menu') return 'mods/custom-workspace-chrome/layers.svg';
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
    setSpaceColor(p.target?.id, color);
    closeOverlay(p.overlay);
    cx.notify();
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
    if (it[1] === "custom.settings") openOverlay({ mod: "custom-settings", kind: "dialog", frame: "none", width: 900, props: it[2] });
    else if (it[1] === "worktree") openOverlay({ mod: "custom-worktree", kind: "dialog", frame: "none", ...(it[2].action === "open" ? { width: 560, height: 480 } : { width: 440, height: 300 }), props: it[2] });
    else if (it[1] === 'tab.rename' && requestInlineTabRename({ command: { name: it[1], args: it[2] } })) return;
    else if (it[1] === 'space.rename' && requestInlineSpaceRename({ command: { name: it[1], args: it[2] } })) return;
    else closeWithConfirmation(it[1], it[2]);
  }

  render(cx) {
    if (props()?.tab === "pane") return div();
    const t = theme();
    const list = this.list();
    // An overflow container has zero min-content height. Give the popup an
    // explicit measured row budget, rather than letting fit-content collapse it.
    const showSpacesHeading = this.moveTo && (!this.moveCapability || (this.moveCapability.ok && !this.moveCapability.repairNeeded));
    const listHeight = Math.min(320, list.length * U.row + list.filter((it, i) => separates(it, i, list)).length * dividerHeight(true) + (showSpacesHeading ? 24 : 0));
    const colorSpace = props()?.tab === 'space' && spaces().find(s => s.id === props().target?.id);
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
            .child(menuRow(t, { id: this.moveTo ? `move-mi-${i}` : `mi-${i}`, label: it[0], highlighted: this.keyboard && i === this.at, pointer: !this.keyboard,
              icon: it[4] ? badge(String(it[4].index ?? spaces().findIndex(s => s.id === it[4].id) + 1), spaceBadgeColor(t, it[4], shared('space.colors') ?? {}))
                : svg(it[3] ?? menuIcon(it[1], it[2])).size(U.smallIcon).text_color(t.muted),
              hint: it[1] === 'custom.move-menu' ? '›' : shortcut(it[1], it[2]),
              onHover: (hovered, cx) => { if (hovered) { if (!this.keyboard) { this.at = -1;this.colorAt = -1; } if (it[1] === 'custom.move-menu') this.checkMove(cx); } cx.notify(); },
              onClick: (_e, cx) => this.choose(i, cx) })
              .text_color(this.unavailable(it) ? t.dim : t.foreground)
              .on_mouse_move((_e, cx) => {
                if (this.keyboard || this.at >= 0 || this.colorAt >= 0) { this.keyboard = false; this.at = -1; this.colorAt = -1; cx.notify(); }
              })),
        ),
      ));
  }
}
