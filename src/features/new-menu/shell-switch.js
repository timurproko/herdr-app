// Open a new shell tab through Herdr's public command. Never replace the source pane.
import { div, svg } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { panes, spaces, terminals, machines, closeOverlay, theme, run, readTextFile } from './host.js';
import { U, menuSurface, menuHeading, menuRow, emptyState } from './ui.js';
import { cachedTerminalShells, warmTerminalShells, composeTerminals } from './profiles.js';
import { paneStartFolder, warmPaneStartFolder } from './directory.js';
import { divider } from './modal-layout.js';
import { openSettings } from './settings-dialog.js';

export function shellTarget(pane, terminal, allPanes, allSpaces, allTerminals) {
  const p = allPanes.find(p => p.pane === pane && p.terminal === terminal);
  if (!p || p.mod || !p.program?.shell || p.program?.agent || p.status) return null;
  const live = allTerminals.find(t => t.address === terminal && t.state === 'live');
  if (!live || allTerminals.some(t => t.parent === terminal && t.state === 'live')) return null;
  if (live.foreground?.name && !/^(?:bash|sh|zsh|fish|dash|ksh|pwsh|powershell|cmd|nu)(?:\.exe)?$/i.test(live.foreground.name.split(/[\\/]/).pop())) return null;
  const space = allSpaces.find(s => s.tabs.some(t => t.id === p.tab));
  return space ? { pane: p, space, terminal: live } : null;
}

export function shellTabArgs(target, choice, cwd) {
  // Public app commands require machine-qualified IDs; do not strip the prefix.
  return { space: target.space.id, ...(cwd ? { folder: cwd } : {}), argv: [...(choice.run ?? [])] };
}

export class ShellSwitch {
  init(p, cx) {
    this.pane = p.switchPane;
    this.terminal = p.switchTerminal;
    this.overlay = p.overlay;
    this.at = 0;
    this.choices = [];
    this.loading = true;
    this.handle = cx.focus_handle();
    this.handle.focus();
    const target = this.target();
    if (!target) { this.loading = false; this.error = 'This terminal is no longer an idle shell.'; return; }
    this.machine = target.space.machine ?? null;
    this.space = target.space.id;
    this.tab = target.pane.tab;
    // A worker copy's primary checkout is read in the background while the menu is open.
    warmPaneStartFolder(target.pane, readTextFile).catch(() => {});
    const choices = installed => composeTerminals(this.machine,installed).filter(p=>p.show&&p.run);
    // Snapshot terminal visibility/order/launch settings for this popup lifetime.
    const installed=cachedTerminalShells(this.machine);
    this.choices = choices(installed);
    this.loading = installed.length === 0 && this.choices.length === 0;
    this.rows = this.loading ? 3 : this.choices.length || 2;
    if (!this.loading) return;
    cx.spawn(async cx => {
      try {
        this.choices = choices(await warmTerminalShells(this.machine));
        if (!this.choices.length) this.empty = 'No terminals enabled. Open Settings → Terminals to show them.';
      } catch { this.error = 'Could not load shell profiles.'; }
      finally { this.loading = false; cx.notify(); }
    });
  }

  target() {
    const target = shellTarget(this.pane, this.terminal, panes(), spaces(), terminals());
    if (!target) return null;
    if (this.space && (target.space.id !== this.space || target.pane.tab !== this.tab || (target.space.machine ?? null) !== this.machine)) return null;
    return machines().some(m => m.name === (target.space.machine ?? null) && m.layout === 'ready') ? target : null;
  }

  choose(choice, cx) {
    if (!choice || this.busy || this.loading) return;
    const target = this.target();
    if (!target) { this.error = 'The original terminal changed. Reopen the shell menu.'; cx.notify(); return; }
    const current=composeTerminals(this.machine,cachedTerminalShells(this.machine)).find(p=>p.key===choice.key&&p.show);
    if(!current||JSON.stringify(current.run)!==JSON.stringify(choice.run)){this.error='Terminal settings changed. Reopen the shell menu.';cx.notify();return;}
    this.busy = true; // Guard double-click/Enter before the popup closes.
    run('tab.new', shellTabArgs(target, choice, paneStartFolder(target.pane)));
    closeOverlay(this.overlay);
  }

  editTerminals() {
    if (this.busy || this.machine === undefined) return;
    closeOverlay(this.overlay);
    openSettings({section:'terminals',terminalsMachine:this.machine},{height:620});
  }

  render() {
    const t = theme(), count = this.choices.length + (this.machine === undefined ? 0 : 1);
    return menuSurface(t, v_flex()).id('shell-switch').w_full().min_h(0).max_h(360)
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (this.busy) { cx.stop_propagation(); return; }
        if (e.key === 'escape') closeOverlay(this.overlay);
        else if (e.key === 'down' && count) this.at = (this.at + 1) % count;
        else if (e.key === 'up' && count) this.at = (this.at + count - 1) % count;
        else if (e.key === 'enter') {
          if (this.at === this.choices.length) this.editTerminals();
          else this.choose(this.choices[this.at], cx);
        }
        else return;
        cx.stop_propagation(); cx.notify();
      })
      .child(menuHeading(t, 'Open tab').id('shell-tab-heading').px(8).pt(4).pb(6))
      .child(v_flex().id('shell-choices')
        .h(Math.min(252, (this.rows ?? 3) * U.row)).flex_none().min_h(0).overflow_y_scrollbar()
        .when(!this.loading&&!this.choices.length,el=>el.child(emptyState(t,{id:'shell-switch-empty',title:'No terminals enabled',icon:'mods/custom-workspace-chrome/terminal.svg'}).h(112).tooltip(this.empty??'Open Settings → Terminals to show terminals')))
        .children(this.choices.map((p, i) =>
        menuRow(t, { id: `shell-choice-${i}`, icon: 'icons/shell.svg', label: p.name, highlighted: this.at === i, enabled: !this.busy, onClick: (_e, cx) => this.choose(p, cx) }).text_color(t.foreground))))
      .when(Boolean(this.error), el => el.child(div().px(8).py(6).text_size(11).text_color(t.blocked).child(this.error)))
      .child(divider(t,{id:'shell-edit-divider',compact:true,inset:4}))
      .child(menuRow(t, { id: 'edit-terminals', icon: 'mods/custom-settings/pencil.svg', label: 'Edit terminals', enabled: !this.busy && this.machine !== undefined,
        highlighted: this.at === this.choices.length && this.machine !== undefined, onClick: () => this.editTerminals() }).text_color(t.foreground));
  }
}
