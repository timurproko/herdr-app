import { div } from 'gpui-kit';
import { h_flex, v_flex } from 'gpui-base';
import { pluginUpdateSnapshot, pluginUpdateRows, pluginUpdateAvailable, updatePlugins } from './plugins-updates.js';
import { updateSentence } from './customization-update-model.js';

export function pluginUpdateSection(owner, t) {
  const snapshot = pluginUpdateSnapshot(), rows = pluginUpdateRows();
  const busy = snapshot.batch?.running === true;
  const pending = pluginUpdateAvailable();
  return v_flex().id('st-plugin-updates').w_full().pt(20)
    .child(h_flex().items_center().gap(16).pb(12)
      .child(owner.heading(t, 'Plugins').pt(0).pb(0).flex_1())
      .when(pending || busy, el => el.child(owner.button(t, 'st-update-plugins', busy ? 'Updating…' : 'Update',
        (_e, cx) => updatePlugins(owner, cx), { primary: true, enabled: pending && !busy && !snapshot.scan && !owner.pluginFixing }))))
    .children(rows.map((row, index) => {
      const status = row.error ? updateSentence(row.error)
        : row.outcome === 'updated' ? 'Up to date.'
        : row.outcome === 'running' ? 'Updating.'
        : row.outcome === 'checking' ? 'Checking…'
        : row.outcome === 'queued' ? 'Waiting.' : 'Update available.';
      return owner.row(t, `${row.name} · ${row.machine ?? 'This computer'}`, status, div(), index === rows.length - 1);
    }));
}
