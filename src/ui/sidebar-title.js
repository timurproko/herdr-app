// Generic sidebar composition. Panels contribute metadata, never peer imports.
import { sidebarPanels } from './plugins.js';
import { openOverlay } from './host.js';
import { panelTitle, U } from './ui.js';
export function sidebarTitle(t, panelId, id) {
  const panels = sidebarPanels(), panel = panels.find(p => p.id === panelId);
  if (!panel) return null;
  const open = panels.length > 1 ? () => {
    const current = sidebarPanels();
    if (current.length > 1 && current.some(p => p.id === panelId)) openOverlay({
      mod: 'custom-new-menu', kind: 'popup', frame: 'none', width: 200,
      height: 8 + 24 + current.length * U.row, props: { panelSwitch: panelId },
    });
  } : null;
  return panelTitle(t, { id, icon: panel.icon, label: panel.name }, open);
}
