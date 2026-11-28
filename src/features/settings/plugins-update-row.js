import { div } from 'gpui-kit';
import { machines } from './host.js';
import { pluginUpdateSnapshot, refreshPluginUpdates, updatePlugins } from './plugins-updates.js';
import { pluginUpdateRowState } from './plugins-update-model.js';
import { recentlyAsked, updateCheckSlot } from './update-check-feedback.js';

export function pluginUpdateRow(owner, theme) {
  const state = () => pluginUpdateRowState(pluginUpdateSnapshot(), {
    machines: machines(), fixing: owner.pluginFixing, closed: owner.pluginUpdatesClosed,
  });
  const row = state();
  const slot = updateCheckSlot(owner, theme, {
    id: 'st-update-plugins', slotId: 'st-plugins-slot', key: 'pluginUpdateAsked',
    checking: row.label === 'Checking…', checked: row.current, label: row.label, enabled: row.enabled,
    onClick: (_event, cx) => {
      const current = state();
      if (!current.enabled || current.action !== row.action || (current.current && recentlyAsked(owner, 'pluginUpdateAsked'))) return;
      if (current.action === 'check') {
        owner.pluginUpdateAsked = Date.now();
        refreshPluginUpdates(owner, cx, { force: true });
      } else updatePlugins(owner, cx);
    },
  });
  // Inherit the ordinary row description styling; large inventories cannot turn
  // this status into a separate block or push the action out of its native slot.
  return owner.row(theme, row.title, div().max_h(36).overflow_hidden().child(row.description), slot);
}
