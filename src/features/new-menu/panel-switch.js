// Switch the right panel between Files and Git through native layout commands.
// Same popup as the pane header's shell menu; opened from a panel's title button.
import { div, svg } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { closeOverlay, theme } from './host.js';
import { panelTab, changePanel } from './panel-state.js';
import { sidebarPanels } from './plugins.js';
import { U, menuSurface, menuHeading, menuRow } from './ui.js';

// Stack children of `panel-body` in the Custom layout; ids stay stock, labels are ours.
export const PANELS = Object.freeze(sidebarPanels({enabled:false}));
export const PANEL_MENU_HEIGHT = 8 + 24 + PANELS.length * U.row;

export function panelCommands(id) {
  return [['layout.select', { stack: 'panel-body', child: id }], ['layout.show', { id: 'panel' }]];
}

export class PanelSwitch {
  init(p, cx) {
    this.overlay = p.overlay;
    this.target = panelTab();
    const panels = sidebarPanels();
    this.current = panels.some(x => x.id === p.panelSwitch) ? p.panelSwitch : panels[0]?.id;
    this.at = Math.max(0, panels.findIndex(x => x.id === this.current));
    this.handle = cx.focus_handle();
    this.handle.focus();
  }

  choose(panel) {
    if (!panel || this.busy || !sidebarPanels().some(p => p.id === panel.id)) return;
    this.busy = true; // Guard double-click/Enter before the popup closes.
    changePanel({view:panel.id,open:true},this.target);
    closeOverlay(this.overlay);
  }

  render() {
    const t = theme(), panels = sidebarPanels(), count = panels.length;
    this.at = Math.min(this.at, Math.max(0,count - 1));
    return menuSurface(t, v_flex()).id('panel-switch').w_full().min_h(0)
      .track_focus(this.handle)
      .on_key_down((e, cx) => {
        if (this.busy) { cx.stop_propagation(); return; }
        if (e.key === 'escape') closeOverlay(this.overlay);
        else if (e.key === 'down' && count) this.at = (this.at + 1) % count;
        else if (e.key === 'up' && count) this.at = (this.at + count - 1) % count;
        else if (e.key === 'enter' && count) this.choose(panels[this.at]);
        else return;
        cx.stop_propagation(); cx.notify();
      })
      .child(menuHeading(t, 'Show').id('panel-switch-heading').px(8).pt(4).pb(6))
      .children(panels.map((p, i) =>
        menuRow(t, { id: `panel-choice-${p.id}`, icon: p.icon, label: p.name, highlighted: this.at === i, enabled: !this.busy, onClick: () => this.choose(p),
          trailing: p.id === this.current ? svg('mods/custom-workspace-chrome/check.svg').size(U.smallIcon).flex_none().text_color(t.foreground) : null }).text_color(t.foreground)));
  }
}
